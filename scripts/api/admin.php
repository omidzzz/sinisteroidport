<?php
// Full admin UI for blog posts with list, edit, delete, duplicate, JSON sync, uploads, and SEO fields.
require_once __DIR__ . '/db.php';
header('Content-Type: text/html; charset=utf-8');

// Load config for admin creds and uploads dir (config.sample.php used when config.php missing)
if (defined('ADMIN_USER')) {
  $ADMIN_USER = ADMIN_USER;
} else {
  $ADMIN_USER = 'admin';
}

if (!defined('UPLOADS_DIR')) {
  define('UPLOADS_DIR', __DIR__ . '/uploads');
}
if (!is_dir(UPLOADS_DIR)) {
  mkdir(UPLOADS_DIR, 0755, true);
}

// SECURITY: never leak PHP errors as HTML to visitors; fatals are turned
// into parseable JSON for the admin UI (see shutdown handler below).
ini_set('display_errors', '0');
error_reporting(E_ALL);

function adminAuthFailure() {
  header('WWW-Authenticate: Basic realm="Blog Admin"');
  header('HTTP/1.0 401 Unauthorized');
  echo 'Authentication required.';
  exit;
}

// SECURITY: refuse to run on a misconfigured deployment. The fallback sample
// credentials (admin / change_me) must never grant admin access.
if (empty($GLOBALS['configLoaded'])) {
  http_response_code(500);
  echo 'Configuration error: api/config.php is missing.';
  exit;
}

// ── Basic auth — hardened ─────────────────────────────────────────────
//  * hash_equals() / password_verify() instead of !== (timing-safe)
//  * ADMIN_PASS_HASH (bcrypt/argon) supported — see config.sample.php
//  * brute-force lockout: 5 failed attempts per IP → 15 minute cooldown
$passOk = false;
if (isset($_SERVER['PHP_AUTH_PW'])) {
  if (defined('ADMIN_PASS_HASH')) {
    $passOk = password_verify((string)$_SERVER['PHP_AUTH_PW'], (string)ADMIN_PASS_HASH);
  } elseif (defined('ADMIN_PASS')) {
    $passOk = hash_equals((string)ADMIN_PASS, (string)$_SERVER['PHP_AUTH_PW']);
  }
}
$userOk = isset($_SERVER['PHP_AUTH_USER']) && hash_equals($ADMIN_USER, (string)$_SERVER['PHP_AUTH_USER']);

$lockFile   = sys_get_temp_dir() . '/sinisteroid-admin-failures.json';
$failIp     = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$failNow    = time();
$failWindow = 900;   // 15 minutes
$failMax    = 5;
$failures   = [];
if (is_file($lockFile)) {
  $failures = json_decode((string)@file_get_contents($lockFile), true);
  if (!is_array($failures)) {
    $failures = [];
  }
}
foreach ($failures as $k => $ts) {
  $failures[$k] = array_values(array_filter((array)$ts, static fn($t) => ($failNow - (int)$t) < $failWindow));
  if (!$failures[$k]) {
    unset($failures[$k]);
  }
}
if (count($failures[$failIp] ?? []) >= $failMax) {
  http_response_code(429);
  header('Retry-After: ' . $failWindow);
  echo 'Too many failed attempts. Try again later.';
  exit;
}
if (!$userOk || !$passOk) {
  $failures[$failIp][] = $failNow;
  @file_put_contents($lockFile, json_encode($failures), LOCK_EX);
  adminAuthFailure();
}
if (isset($failures[$failIp])) {
  unset($failures[$failIp]);
  @file_put_contents($lockFile, json_encode($failures), LOCK_EX);
}

/**
 * Fatal-error guard: if the request dies mid-action (e.g. a missing PHP
 * extension on the host), return a parseable JSON error for AJAX calls
 * instead of the HTML 500 page the admin UI reports as "Invalid JSON".
 */
register_shutdown_function(static function () {
  $err = error_get_last();
  if ($err === null || !in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
    return;
  }
  error_log('[sinisteroid] admin fatal: ' . $err['message'] . ' in ' . $err['file'] . ':' . $err['line']);
  if (!headers_sent()) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
  }
  echo json_encode([
    'error' => 'Server error: ' . $err['message'] . ' (' . basename($err['file']) . ':' . $err['line'] . ')',
  ]);
});

/**
 * CSRF defence for state-changing actions. HTTP Basic-Auth credentials are
 * attached by the browser AUTOMATICALLY, so a malicious third-party page
 * could otherwise fire authenticated mutations (save/delete/upload) while
 * the admin is logged in. Mutating actions therefore require:
 *   1. POST (no more state changes over GET), and
 *   2. a same-origin request — validated via Sec-Fetch-Site, Origin, and
 *      Referer when the browser sends them.
 */
function assertSameOriginMutation() {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    errorResponse('Mutating actions require POST', 405);
  }
  $site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? null;
  if ($site !== null && $site !== 'same-origin' && $site !== 'none') {
    errorResponse('Cross-site request blocked', 403);
  }
  $host = $_SERVER['HTTP_HOST'] ?? '';
  if ($host !== '') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
    if ($origin !== null && $origin !== '') {
      if (strcasecmp((string)parse_url($origin, PHP_URL_HOST), $host) !== 0) {
        errorResponse('Cross-origin request blocked', 403);
      }
    } else {
      $refHost = parse_url($_SERVER['HTTP_REFERER'] ?? '', PHP_URL_HOST);
      if ($refHost !== null && strcasecmp((string)$refHost, $host) !== 0) {
        errorResponse('Cross-origin request blocked', 403);
      }
    }
  }
}

if (!function_exists('jsonResponse')) {
  function jsonResponse($data) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
  }
}

if (!function_exists('errorResponse')) {
  function errorResponse($message, $code = 400) {
    http_response_code($code);
    jsonResponse(['error' => $message]);
  }
}

function sanitizeSlug($slug) {
  return preg_replace('/[^a-z0-9-_]/', '-', strtolower(trim($slug)));
}

function getWebPath($path) {
  $real    = realpath($path);
  $docRoot = realpath($_SERVER['DOCUMENT_ROOT']);
  if ($real && $docRoot && strpos($real, $docRoot) === 0) {
    return str_replace(DIRECTORY_SEPARATOR, '/', substr($real, strlen($docRoot)));
  }
  return '/api/uploads/' . basename($path);
}

function loadPostRow($slug) {
  global $pdo;
  $stmt = $pdo->prepare('SELECT * FROM posts WHERE slug = :slug LIMIT 1');
  $stmt->execute(['slug' => $slug]);
  $row = $stmt->fetch();
  if (!$row) {
    return null;
  }
  return [
    'slug' => $row['slug'],
    'status' => $row['status'] ?? 'draft',
    'title' => $row['title'],
    'date' => $row['date_published'],
    'tags' => $row['tags'] ? explode(',', $row['tags']) : [],
    'featuredImage' => json_decode($row['featured_image'], true) ?: ['src' => '', 'alt' => ['en' => '', 'fa' => '']],
    'translations' => json_decode($row['content_json'], true) ?: [
      'en' => ['title' => '', 'excerpt' => '', 'content' => [], 'faq' => [], 'seo' => []],
      'fa' => ['title' => '', 'excerpt' => '', 'content' => [], 'faq' => [], 'seo' => []],
    ],
  ];
}

function listPosts() {
  global $pdo;
  $stmt = $pdo->query('SELECT slug, status, title, date_published AS date, tags, featured_image FROM posts ORDER BY date_published DESC');
  $rows = $stmt->fetchAll();
  return array_map(function ($row) {
    return [
      'slug' => $row['slug'],
      'status' => $row['status'] ?? 'draft',
      'title' => $row['title'],
      'date' => $row['date'],
      'tags' => $row['tags'] ? explode(',', $row['tags']) : [],
      'featuredImage' => json_decode($row['featured_image'], true) ?: ['src' => ''],
    ];
  }, $rows);
}

function savePost(array $payload) {
  global $pdo;
  if (empty($payload['slug'])) {
    errorResponse('Missing slug');
  }
  $slug = sanitizeSlug($payload['slug']);
  if (!$slug) {
    errorResponse('Invalid slug');
  }
  $title = trim($payload['title'] ?? '');
  $tags = $payload['tags'] ?? [];
  if (!is_array($tags)) {
    $tags = array_filter(array_map('trim', explode(',', (string)$tags)));
  }
  $featured = $payload['featuredImage'] ?? ['src' => '', 'alt' => ['en' => '', 'fa' => '']];
  $translations = $payload['translations'] ?? [
    'en' => ['title' => '', 'excerpt' => '', 'content' => [], 'faq' => [], 'seo' => []],
    'fa' => ['title' => '', 'excerpt' => '', 'content' => [], 'faq' => [], 'seo' => []],
  ];

  $stmt = $pdo->prepare('SELECT id FROM posts WHERE slug = :slug LIMIT 1');
  $stmt->execute(['slug' => $slug]);
  $exists = $stmt->fetch();

  $status = $payload['status'] ?? 'draft';
  $datePublished = null;
  if ($status === 'published') {
    $datePublished = date('Y-m-d H:i:s');
  }

  if ($exists) {
    $update = $pdo->prepare('UPDATE posts SET status = :status, title = :title, tags = :tags, featured_image = :featured, content_json = :content, date_published = COALESCE(date_published, :datePub), date_updated = NOW() WHERE slug = :slug');
    $update->execute([
      'status' => $status,
      'title' => $title,
      'tags' => implode(',', $tags),
      'featured' => json_encode($featured, JSON_UNESCAPED_UNICODE),
      'content' => json_encode($translations, JSON_UNESCAPED_UNICODE),
      'datePub' => $datePublished,
      'slug' => $slug,
    ]);
  } else {
    $insert = $pdo->prepare('INSERT INTO posts (slug, status, title, tags, featured_image, content_json, date_published) VALUES (:slug, :status, :title, :tags, :featured, :content, :datePub)');
    $insert->execute([
      'slug' => $slug,
      'status' => $status,
      'title' => $title,
      'tags' => implode(',', $tags),
      'featured' => json_encode($featured, JSON_UNESCAPED_UNICODE),
      'content' => json_encode($translations, JSON_UNESCAPED_UNICODE),
      'datePub' => $datePublished,
    ]);
  }
  return ['success' => true, 'slug' => $slug, 'status' => $status];
}

function deletePost($slug) {
  global $pdo;
  $stmt = $pdo->prepare('DELETE FROM posts WHERE slug = :slug');
  $stmt->execute(['slug' => $slug]);
  return ['success' => true];
}

function duplicatePost($slug) {
  $post = loadPostRow($slug);
  if (!$post) {
    errorResponse('Post not found', 404);
  }
  $base = $slug . '-copy';
  $newSlug = $base;
  $i = 1;
  while (loadPostRow($newSlug)) {
    $newSlug = $base . '-' . $i;
    $i++;
  }
  $post['slug'] = $newSlug;
  $post['title'] = $post['title'] . ' (Copy)';
  savePost($post);
  return ['success' => true, 'slug' => $newSlug];
}

function uploadImageFile($fileFieldName) {
  if (empty($_FILES[$fileFieldName]) || !is_uploaded_file($_FILES[$fileFieldName]['tmp_name'])) {
    errorResponse('No file uploaded', 400);
  }
  // SECURITY: whitelist by extension AND by sniffed content (MIME), then
  // store under a random name. The old regex-based rename kept the original
  // extension, so an "image" named shell.php would have been saved as an
  // executable PHP file inside a web-served folder (remote code execution).
  $allowedExt = [
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
    'webp' => 'image/webp',
    'gif'  => 'image/gif',
  ];
  $ext = strtolower(pathinfo($_FILES[$fileFieldName]['name'], PATHINFO_EXTENSION));
  if (!isset($allowedExt[$ext])) {
    errorResponse('Only JPG, PNG, WebP or GIF images are allowed', 415);
  }
  // SECURITY: verify the real content is an image. Uses getimagesize()
  // (PHP core, no extension needed) instead of finfo/Fileinfo, which is
  // disabled on some shared hosts and previously caused a fatal 500.
  $info = @getimagesize($_FILES[$fileFieldName]['tmp_name']);
  if ($info === false || ($info['mime'] ?? '') !== $allowedExt[$ext]) {
    errorResponse('File content does not match a valid image', 415);
  }
  $targetName = date('Ymd-His') . '-' . bin2hex(random_bytes(8)) . '.' . $ext;
  $targetPath = rtrim(UPLOADS_DIR, '/') . '/' . $targetName;
  if (!move_uploaded_file($_FILES[$fileFieldName]['tmp_name'], $targetPath)) {
    errorResponse('Failed to save uploaded file', 500);
  }
  return ['src' => getWebPath($targetPath), 'filename' => $targetName];
}

if (isset($_GET['action'])) {
  $action = $_GET['action'];
  switch ($action) {
    case 'list':
      jsonResponse(listPosts());
      break;
    case 'get':
      $slug = trim($_GET['slug'] ?? '');
      if (!$slug) {
        errorResponse('Missing slug', 400);
      }
      $post = loadPostRow($slug);
      if (!$post) {
        errorResponse('Post not found', 404);
      }
      jsonResponse($post);
      break;
    // SECURITY: `delete` was removed from the GET dispatch — deleting (or
    // any other mutation) over GET is trivially CSRF-able. It now lives in
    // the POST branch below, guarded by assertSameOriginMutation().
    default:
      errorResponse('Unknown action', 400);
  }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
  // All mutations (save / delete / duplicate / uploadImage) share the
  // same-origin + POST requirement.
  assertSameOriginMutation();
  $action = $_POST['action'];
  switch ($action) {
    case 'save':
      $payload = json_decode($_POST['post_json'] ?? '', true);
      if (!is_array($payload)) {
        errorResponse('Invalid JSON payload', 400);
      }
      jsonResponse(savePost($payload));
      break;
    case 'delete':
      $slug = trim($_POST['slug'] ?? '');
      if (!$slug) {
        errorResponse('Missing slug', 400);
      }
      jsonResponse(deletePost($slug));
      break;
    case 'duplicate':
      $slug = trim($_POST['slug'] ?? '');
      if (!$slug) {
        errorResponse('Missing slug', 400);
      }
      jsonResponse(duplicatePost($slug));
      break;
    case 'uploadImage':
      $result = uploadImageFile('image_file');
      jsonResponse($result);
      break;
    default:
      errorResponse('Unknown action', 400);
  }
}

function getDefaultPost() {
  return [
    'slug' => '',
    'title' => '',
    'date' => '',
    'tags' => [],
    'featuredImage' => ['src' => '', 'alt' => ['en' => '', 'fa' => '']],
    'translations' => [
      'en' => ['title' => '', 'excerpt' => '', 'content' => [], 'faq' => [], 'seo' => ['title' => '', 'metaDescription' => '', 'canonical' => '', 'openGraph' => ['image' => ''], 'twitter' => ['image' => ''], 'keywords' => '', 'focusKeyword' => '']],
      'fa' => ['title' => '', 'excerpt' => '', 'content' => [], 'faq' => [], 'seo' => ['title' => '', 'metaDescription' => '', 'canonical' => '', 'openGraph' => ['image' => ''], 'twitter' => ['image' => ''], 'keywords' => '', 'focusKeyword' => '']],
    ],
  ];
}
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <!-- admin.php v2.2-security — if you can NOT see this comment in the
         page source on the server, the deployed file is out of date. -->
    <title>Blog Admin</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #0b1117;
        color: #e7eef7;
      }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; }
      .page { display: grid; grid-template-columns: 280px 1fr; gap: 14px; padding: 14px; min-height: 100vh; }
      .panel { background: rgba(13, 22, 30, 0.95); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; box-shadow: 0 15px 50px rgba(0,0,0,0.35); padding: 14px; }
      .panel h1, .panel h2, .panel h3 { margin: 0 0 10px; }
      .header { display:flex; align-items:center; justify-content:space-between; gap: 10px; margin-bottom: 10px; }
      .button, button { border: none; border-radius: 999px; padding: 8px 14px; font-weight: 600; cursor: pointer; transition: transform .12s ease, background .12s ease; font-size: 0.9rem; }
      .button:hover { transform: translateY(-1px); }
      .button-primary { background: #da1b4c; color: white; }
      .button-secondary { background: rgba(255,255,255,0.08); color: #eef2f7; }
      .button-ghost { background: transparent; color: #cfd8e8; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08); }
      .button-danger { background: #c42f3f; color: white; }
      .button-sm { font-size: 0.8rem; padding: 5px 10px; }
      .input, textarea, select { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #eef2f7; padding: 8px 10px; border-radius: 10px; outline: none; margin-top: 4px; font-size: 0.88rem; }
      .input:focus, textarea:focus, select:focus { border-color: rgba(218, 0, 55, 0.6); box-shadow: 0 0 0 3px rgba(218,0,55,0.12); }
      textarea { min-height: 60px; resize: vertical; }
      .list-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 10px; margin-bottom: 8px; }
      .section { margin-bottom: 12px; }
      .section-title { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
      .field-row { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .field-row.full { grid-template-columns: 1fr; }
      .field-row > label { display:block; font-size:0.85rem; }
      .field-note { color:#9babcf; font-size:0.82rem; margin-top: 3px; }
      .error { color:#ff6b81; font-weight:600; margin-top:8px; font-size:0.85rem; }
      .muted { color: #9babcf; font-size:0.85rem; }
      .post-list { max-height: calc(100vh - 160px); overflow:auto; margin-top:8px; }
      .post-row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 10px; border-radius:12px; background: rgba(255,255,255,0.03); margin-bottom:6px; }
      .post-row.active { background: rgba(218,0,55,0.18); }
      .post-row .actions { display:flex; gap:4px; }
      .badge { display:inline-flex; align-items:center; gap:4px; background: rgba(255,255,255,0.06); padding:2px 8px; border-radius:999px; font-size:0.75rem; }
      .upload-preview img { max-width: 100%; border-radius: 12px; margin-top: 6px; }
      .json-area { min-height: 300px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.88rem; }
      .flex { display:flex; gap: 8px; }
      .flex-wrap { flex-wrap: wrap; }
      .divider { height:1px; background: rgba(255,255,255,0.08); margin: 10px 0; }
      .drag-handle { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: rgba(255,255,255,0.06); color: #eef2f7; cursor: grab; font-size: 0.8rem; }
      .list-item.drag-over { border-color: rgba(218,0,55,0.6); box-shadow: 0 0 0 2px rgba(218,0,55,0.12); }
      .list-item.dragging { opacity: 0.6; }
      select { color-scheme: dark; }
      select option { background: #0b1117; color: #e7eef7; padding: 6px; }
      select option:checked { background: #da1b4c; color: white; }
      /* Collapsible sections */
      .collapsible-header { display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; padding:6px 0; }
      .collapsible-header:hover { opacity:0.8; }
      .collapsible-header .arrow { transition: transform 0.2s ease; font-size:0.8rem; }
      .collapsible-header.collapsed .arrow { transform: rotate(-90deg); }
      .collapsible-body { overflow:hidden; transition: max-height 0.25s ease, padding 0.25s ease; }
      .collapsible-body.collapsed { max-height: 0 !important; padding: 0 !important; }
      /* Per-block language tabs */
      .lang-tabs { display:flex; gap:4px; margin-bottom:6px; }
      .lang-tab { padding:3px 10px; border-radius:999px; font-size:0.78rem; font-weight:600; cursor:pointer; background:rgba(255,255,255,0.06); color:#9babcf; border:none; transition: all 0.15s ease; }
      .lang-tab.active { background:#da1b4c; color:white; }
      .lang-content { display:none; }
      .lang-content.active { display:block; }
      /* Quick-add block buttons */
      .quick-add { display:flex; gap:6px; flex-wrap:wrap; }
      .quick-add button { font-size:0.78rem; padding:4px 10px; background:rgba(255,255,255,0.06); color:#cfd8e8; border-radius:999px; border:1px solid rgba(255,255,255,0.1); cursor:pointer; transition:all 0.15s ease; }
      .quick-add button:hover { background:rgba(218,0,55,0.2); border-color:rgba(218,0,55,0.4); }
      .block-section { margin-bottom:12px; }
      /* Sticky side nav */
      .side-nav { position:fixed; right:0; top:50%; transform:translateY(-50%); display:flex; flex-direction:column; gap:4px; z-index:100; }
      .side-nav button { writing-mode:vertical-rl; text-orientation:mixed; padding:8px 6px; border:none; border-radius:0; background:rgba(218,0,55,0.15); color:#eef2f7; cursor:pointer; font-size:0.7rem; font-weight:600; letter-spacing:0.1em; transition:background 0.15s ease; backdrop-filter:blur(4px); }
      .side-nav button:hover { background:rgba(218,0,55,0.4); }
      .side-nav button:first-child { border-radius:8px 0 0 0; }
      .side-nav button:last-child { border-radius:0 0 0 8px; }
      /* Global lang toggle at top */
      .global-lang { display:flex; align-items:center; gap:10px; margin-bottom:12px; padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid rgba(255,255,255,0.06); }
      .global-lang label { font-size:0.82rem; font-weight:600; color:#9babcf; }
    </style>
  </head>
  <body>
    <!-- Sticky side nav for quick section jumping -->
    <div class="side-nav" id="side-nav">
      <button data-scroll="general-section" title="General">General</button>
      <button data-scroll="seo-section" title="SEO">SEO</button>
      <button data-scroll="content-section" title="Content">Content</button>
      <button data-scroll="blocks-section" title="Blocks">Blocks</button>
      <button data-scroll="faq-section" title="FAQ">FAQ</button>
    </div>

    <div class="page">
       <aside class="panel">
         <div class="header">
           <div>
             <h1>Blog Admin</h1>
             <p class="muted">Manage posts, SEO, images, structure.</p>
           </div>
           <div class="flex" style="gap:6px;">
             <button id="new-post" class="button button-primary">+ New</button>
             <button id="export-all" class="button button-secondary button-sm">Export All JSON</button>
           </div>
         </div>
         <div class="section">
           <input id="search-posts" class="input" placeholder="Search posts..." />
         </div>
         <div id="post-list" class="post-list"></div>
       </aside>

      <main class="panel">
          <div class="header">
            <div>
              <h2 id="editor-title">Loading...</h2>
              <p id="editor-subtitle" class="muted">Select a post to edit or create a new one.</p>
            </div>
            <div class="flex-wrap">
              <button id="preview-post" class="button button-secondary">Preview</button>
              <button id="save-post" class="button button-primary">Save</button>
              <button id="duplicate-post" class="button button-secondary button-sm">Duplicate</button>
              <button id="delete-post" class="button button-danger button-sm">Delete</button>
            </div>
          </div>

        <div class="tabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
          <div class="tab active" data-view="editor" style="cursor:pointer;padding:7px 12px;border-radius:999px;background:#da1b4c;color:#fff;font-size:0.85rem;font-weight:600;">Editor</div>
          <div class="tab" data-view="json" style="cursor:pointer;padding:7px 12px;border-radius:999px;background:rgba(255,255,255,0.06);color:#eef2f7;font-size:0.85rem;font-weight:600;">JSON</div>
        </div>

        <!-- Global language toggle at the top of editor -->
        <div class="global-lang" id="global-lang-bar">
          <label>Global Language:</label>
          <div style="display:flex;gap:6px;">
            <button class="lang-tab active" data-global-lang="en" style="padding:4px 12px;">English</button>
            <button class="lang-tab" data-global-lang="fa" style="padding:4px 12px;">فارسی</button>
          </div>
        </div>

        <div id="editor-view">
          <div class="section field-row">
            <label>Slug<input id="field-slug" class="input" data-path="slug" /></label>
            <label>Title<input id="field-title" class="input" data-path="title" /></label>
          </div>

          <div class="section field-row full" style="margin-bottom:8px;">
            <label>Status
              <select id="field-status" class="input" data-path="status">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <div class="field-row full" style="margin-bottom:8px;">
            <label>Tags (comma separated)<input id="field-tags" class="input" data-path="tags" /></label>
          </div>

          <!-- Collapsible: Featured Image (General) -->
          <div id="general-section" class="block-section">
            <div class="collapsible-header collapsed" data-collapse="featured">
              <span class="arrow">▼</span><strong>Featured Image</strong>
            </div>
            <div id="collapse-featured" class="collapsible-body collapsed">
              <div class="field-row" style="margin-top:8px;">
                <label>Image URL<input id="field-featured-src" class="input" data-path="featuredImage.src" /></label>
                <label>Upload<input id="upload-featured" class="input" type="file" accept="image/*" /></label>
              </div>
              <div class="field-row">
                <label>Alt (EN)<input id="field-featured-alt-en" class="input" data-path="featuredImage.alt.en" /></label>
                <label>Alt (FA)<input id="field-featured-alt-fa" class="input" data-path="featuredImage.alt.fa" /></label>
              </div>
              <div class="upload-preview" id="featured-preview"></div>
            </div>
          </div>

          <!-- Collapsible: SEO -->
          <div id="seo-section" class="block-section">
            <div class="collapsible-header collapsed" data-collapse="seo">
              <span class="arrow">▼</span><strong>SEO Settings</strong>
            </div>
            <div id="collapse-seo" class="collapsible-body collapsed">
              <div id="seo-lang-tabs" class="lang-tabs" style="margin-top:8px;"></div>
              <div id="seo-en" class="lang-content active"></div>
              <div id="seo-fa" class="lang-content"></div>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Post Title & Excerpt - Per language -->
          <div id="content-section" class="block-section">
            <div class="lang-tabs" id="content-lang-tabs"></div>
            <div id="content-en" class="lang-content active">
              <div class="field-row" style="margin-bottom:8px;">
                <label>Post title<input id="field-title-en" class="input" data-path-lang="en" data-field="title" /></label>
                <label>Excerpt<textarea id="field-excerpt-en" class="input" data-path-lang="en" data-field="excerpt"></textarea></label>
              </div>
            </div>
            <div id="content-fa" class="lang-content">
              <div class="field-row" style="margin-bottom:8px;">
                <label>Post title<input id="field-title-fa" class="input" data-path-lang="fa" data-field="title" /></label>
                <label>Excerpt<textarea id="field-excerpt-fa" class="input" data-path-lang="fa" data-field="excerpt"></textarea></label>
              </div>
            </div>
          </div>

          <!-- Blocks - Per language -->
          <div id="blocks-section" class="block-section">
            <div class="section-title">
              <span><strong>Content Blocks</strong></span>
              <div class="quick-add">
                <button data-add-block="heading">+ Heading</button>
                <button data-add-block="paragraph">+ Paragraph</button>
                <button data-add-block="list">+ List</button>
                <button data-add-block="image">+ Image</button>
              </div>
            </div>
            <div class="lang-tabs" id="blocks-lang-tabs"></div>
            <div id="blocks-en" class="lang-content active"></div>
            <div id="blocks-fa" class="lang-content"></div>
          </div>

          <!-- FAQ - Per language -->
          <div id="faq-section" class="block-section">
            <div class="section-title">
              <span><strong>FAQ</strong></span>
              <button id="add-faq" class="button button-secondary button-sm">+ Add FAQ</button>
            </div>
            <div class="lang-tabs" id="faq-lang-tabs"></div>
            <div id="faq-en" class="lang-content active"></div>
            <div id="faq-fa" class="lang-content"></div>
          </div>
        </div>

        <div id="json-view" style="display:none;">
          <div class="section">
            <div class="section-title">
              <span>Post JSON</span>
              <div style="display: flex; gap: 6px;">
                <button id="export-json" class="button button-secondary button-sm">Download</button>
                <button id="import-json" class="button button-secondary button-sm">Import</button>
                <input id="import-file" type="file" accept=".json" style="display: none;" />
              </div>
            </div>
            <textarea id="json-editor" class="input json-area"></textarea>
            <div id="json-error" class="error"></div>
          </div>
        </div>
      </main>
    </div>

    <!-- Preview Modal -->
    <div id="preview-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);" onclick="if(event.target===this)closePreview()">
      <div style="position:absolute;top:10px;right:10px;display:flex;gap:8px;z-index:10;">
        <button id="preview-lang-en" class="button button-sm" style="background:#da1b4c;color:white;" onclick="previewLang('en')">English</button>
        <button id="preview-lang-fa" class="button button-sm" style="background:rgba(255,255,255,0.08);color:#eef2f7;" onclick="previewLang('fa')">فارسی</button>
        <div style="width:1px;background:rgba(255,255,255,0.15);margin:0 4px;"></div>
        <button id="preview-viewport-desktop" class="button button-sm" style="background:#da1b4c;color:white;" onclick="previewViewport('desktop')">Desktop</button>
        <button id="preview-viewport-mobile" class="button button-sm" style="background:rgba(255,255,255,0.08);color:#eef2f7;" onclick="previewViewport('mobile')">Mobile</button>
        <button class="button button-ghost button-sm" onclick="closePreview()" style="margin-left:8px;">✕ Close</button>
      </div>
      <div id="preview-content" style="width:100%;height:100%;overflow-y:auto;padding:100px 20px 40px;display:flex;justify-content:center;">
        <div id="preview-inner" style="max-width:800px;width:100%;color:#e7eef7;transition:all 0.3s ease;"></div>
      </div>
    </div>

    <script>
      // Preview state
      let previewLangState = 'en';
      let previewViewportState = 'desktop';

      function escapeHtml(v) { return String(v||'').replace(/[&<>"']/g, m => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'})[m]); }

      function renderPreviewContent(data, lang) {
        const tr = data.translations?.[lang] || {};
        const faq = tr.faq || [];
        const content = tr.content || [];
        const featured = data.featuredImage?.src || '';
        const tags = Array.isArray(data.tags) ? data.tags : [];
        const date = data.date || '';

        let html = `<div style="font-family:Inter,system-ui,sans-serif;" dir="${lang==='fa'?'rtl':'ltr'}">`;
        html += `<h1 style="font-size:32px;font-weight:700;margin:0 0 8px;color:#fff;">${escapeHtml(tr.title||'')}</h1>`;
        html += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">`;
        if (date) html += `<span style="font-size:12px;text-transform:uppercase;letter-spacing:0.3em;color:#FFB3C0;">${escapeHtml(date)}</span>`;
        tags.forEach(t => { html += `<span style="font-size:11px;background:rgba(218,0,55,0.15);padding:2px 10px;border-radius:999px;color:#eef2f7;">${escapeHtml(t)}</span>`; });
        html += `</div>`;
        html += `<p style="font-size:16px;line-height:1.6;color:rgba(255,255,255,0.75);margin-bottom:24px;text-align:justify;">${escapeHtml(tr.excerpt||'')}</p>`;
        if (featured) html += `<div style="border-radius:16px;overflow:hidden;margin-bottom:24px;"><img src="${escapeHtml(featured)}" alt="" style="width:100%;max-height:350px;object-fit:cover;border-radius:16px;" /></div>`;

        // Render content blocks (simplified preview)
        content.forEach((block, idx) => {
          if (block.type === 'heading') {
            html += `<h2 style="font-size:22px;font-weight:600;margin:24px 0 8px;color:#fff;">${escapeHtml(block.text||'')}</h2>`;
          } else if (block.type === 'paragraph') {
            const cls = block.style === 'lead' ? 'font-size:18px;font-weight:500;color:#fff;' : '';
            html += `<p style="font-size:15px;line-height:1.7;margin:12px 0;color:rgba(255,255,255,0.85);text-align:justify;${cls}">${escapeHtml(block.text||'')}</p>`;
          } else if (block.type === 'list') {
            const items = block.items||[];
            const tag = block.style === 'ordered' ? 'ol' : 'ul';
            html += `<${tag} style="margin:12px 0 12px 20px;color:rgba(255,255,255,0.85);line-height:1.8;">`;
            items.forEach(item => { html += `<li>${escapeHtml(item)}</li>`; });
            html += `</${tag}>`;
          } else if (block.type === 'image') {
            html += `<div style="margin:20px 0;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);padding:8px;background:rgba(255,255,255,0.03);">`;
            html += `<img src="${escapeHtml(block.src||'')}" alt="${escapeHtml(block.alt||'')}" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;" />`;
            if (block.caption) html += `<p style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:8px;">${escapeHtml(block.caption)}</p>`;
            html += `</div>`;
          } else if (block.type === 'cta') {
            html += `<div style="margin:24px 0;padding:24px;border-radius:16px;background:linear-gradient(135deg,rgba(30,15,20,1),rgba(20,27,34,1));border:1px solid rgba(218,0,55,0.4);text-align:center;">`;
            if (block.title) html += `<h3 style="font-size:20px;color:#fff;margin:0 0 8px;">${escapeHtml(block.title)}</h3>`;
            if (block.text) html += `<p style="color:rgba(255,255,255,0.8);margin:0 0 16px;">${escapeHtml(block.text)}</p>`;
            if (block.buttonText) html += `<a href="${escapeHtml(block.buttonUrl||'#')}" style="display:inline-block;background:#DA0037;color:white;padding:10px 24px;border-radius:999px;font-weight:600;text-decoration:none;">${escapeHtml(block.buttonText)}</a>`;
            html += `</div>`;
          } else if (block.type === 'highlight') {
            html += `<div style="margin:16px 0;padding:16px;border-left:4px solid rgba(218,0,55,0.5);background:rgba(26,21,32,0.8);border-radius:12px;">`;
            if (block.label) html += `<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#DA0037;font-weight:600;">${escapeHtml(block.label)}</span>`;
            html += `<p style="margin:4px 0 0;color:rgba(255,255,255,0.9);">${escapeHtml(block.text)}</p></div>`;
          } else if (block.type === 'quote') {
            html += `<blockquote style="margin:20px 0;padding:16px;border-left:4px solid rgba(52,152,219,0.6);background:rgba(15,20,25,0.8);border-radius:12px;font-style:italic;">`;
            html += `<p style="margin:0;color:rgba(255,255,255,0.9);">${escapeHtml(block.text)}</p>`;
            if (block.author) html += `<footer style="margin-top:8px;font-size:13px;color:rgba(52,152,219,0.7);font-style:normal;">— ${escapeHtml(block.author)}</footer>`;
            html += `</blockquote>`;
          } else if (block.type === 'alert') {
            html += `<div style="margin:16px 0;padding:12px 16px;border-radius:12px;border:1px solid rgba(52,152,219,0.4);background:rgba(52,152,219,0.06);display:flex;gap:10px;align-items:flex-start;">`;
            html += `<span style="font-size:18px;flex-shrink:0;">ℹ</span><div>`;
            if (block.title) html += `<strong style="font-size:13px;display:block;margin-bottom:2px;">${escapeHtml(block.title)}</strong>`;
            html += `<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">${escapeHtml(block.text)}</p></div></div>`;
          } else if (block.type === 'code') {
            html += `<pre style="margin:16px 0;padding:16px;background:#0a0d12;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow-x:auto;font-family:monospace;font-size:13px;color:#e2e8f0;"><code>${escapeHtml(block.code||block.text||'')}</code></pre>`;
          } else if (block.type === 'stats') {
            html += `<div style="margin:20px 0;padding:20px;border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:rgba(15,20,25,0.9);">`;
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:16px;text-align:center;">`;
            (block.items||[]).forEach(s => {
              html += `<div><div style="font-size:28px;font-weight:700;color:#DA0037;">${escapeHtml(s.value||'')}</div>`;
              html += `<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.5);margin-top:4px;">${escapeHtml(s.label||'')}</div></div>`;
            });
            html += `</div></div>`;
          }
        });

        // FAQ section
        if (faq.length > 0) {
          html += `<div style="margin:32px 0;padding:20px;border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:rgba(15,20,25,0.8);">`;
          html += `<h3 style="font-size:18px;color:#fff;margin:0 0 16px;">${lang==='fa'?'پرسش‌های متداول':'Frequently Asked Questions'}</h3>`;
          faq.forEach((item, idx) => {
            html += `<div style="margin-bottom:8px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">`;
            html += `<div style="padding:12px 16px;font-weight:600;color:#fff;background:rgba(255,255,255,0.03);">${escapeHtml(item.question)}</div>`;
            html += `<div style="padding:12px 16px;color:rgba(255,255,255,0.8);font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">${escapeHtml(item.answer)}</div>`;
            html += `</div>`;
          });
          html += `</div>`;
        }

        html += `</div>`;
        return html;
      }

      function closePreview() {
        byId('preview-modal').style.display = 'none';
      }

      function previewLang(lang) {
        previewLangState = lang;
        // Update button styles
        ['en','fa'].forEach(l => {
          const btn = byId('preview-lang-'+l);
          if (btn) {
            btn.style.background = l === lang ? '#da1b4c' : 'rgba(255,255,255,0.08)';
            btn.style.color = l === lang ? 'white' : '#eef2f7';
          }
        });
        byId('preview-inner').innerHTML = renderPreviewContent(state.current, lang);
      }

      function previewViewport(viewport) {
        previewViewportState = viewport;
        const inner = byId('preview-inner');
        ['desktop','mobile'].forEach(v => {
          const btn = byId('preview-viewport-'+v);
          if (btn) {
            btn.style.background = v === viewport ? '#da1b4c' : 'rgba(255,255,255,0.08)';
            btn.style.color = v === viewport ? 'white' : '#eef2f7';
          }
        });
        inner.style.maxWidth = viewport === 'mobile' ? '375px' : '800px';
        inner.style.transition = 'max-width 0.3s ease';
      }

      const LANGUAGES = ['en', 'fa'];
      const apiBase = window.location.pathname;
      const state = {posts: [], current: null, view: 'editor', contentLang: 'en'};

      const defaultPost = () => ({
        slug: '', title: '', date: '', tags: [], status: 'draft',
        featuredImage: {src: '', alt: {en: '', fa: ''}},
        translations: {
          en: {title: '', excerpt: '', content: [], faq: [], seo: {title: '', metaDescription: '', canonical: '', openGraph: {image: ''}, twitter: {image: ''}, keywords: '', focusKeyword: ''}},
          fa: {title: '', excerpt: '', content: [], faq: [], seo: {title: '', metaDescription: '', canonical: '', openGraph: {image: ''}, twitter: {image: ''}, keywords: '', focusKeyword: ''}},
        },
      });

      function byId(id) { return document.getElementById(id); }
      function escapeHtml(v) { return String(v||'').replace(/[&<>"']/g, m => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'})[m]); }

      /**
       * Sync image source across both locales when an image block URL changes.
       * This ensures an image added in EN is mirrored in FA (same src, different alt).
       */
      function syncImageAcrossLocales(path, value) {
        // Example path: "translations.en.content.3.src"
        const parts = path.split('.');
        if (parts.length < 4 || parts[2] !== 'content') return;
        const lang = parts[1]; // "en" or "fa"
        const blockIdx = parseInt(parts[3], 10);
        const otherLang = lang === 'en' ? 'fa' : 'en';
        const otherBlocks = state.current.translations[otherLang]?.content;
        if (!otherBlocks || otherBlocks.length <= blockIdx) return;
        // Only sync if the other locale's block at same index is also an image
        if (otherBlocks[blockIdx]?.type === 'image') {
          otherBlocks[blockIdx].src = value;
        }
      }

      function setField(path, value) {
        const keys = path.split('.');
        let t = state.current;
        while (keys.length > 1) { const k = keys.shift(); if (t[k] === undefined) t[k] = {}; t = t[k]; }
        t[keys[0]] = value;
        if (path === 'tags') state.current.tags = value.split(',').map(v=>v.trim()).filter(Boolean);
      }

      function fetchJson(url, opts={}) {
        return fetch(url, opts).then(async r => { const t = await r.text(); try { return JSON.parse(t); } catch(e) { throw new Error('Invalid JSON'); } });
      }

      function syncToJson() {
        byId('json-editor').value = JSON.stringify(state.current, null, 2);
        byId('json-error').textContent = '';
      }

      function renderLangTabs(containerId, lang, callback) {
        const container = byId(containerId);
        container.innerHTML = LANGUAGES.map(l => `<button class="lang-tab ${l===lang?'active':''}" data-lang="${l}">${l==='en'?'English':'فارسی'}</button>`).join('');
        container.querySelectorAll('.lang-tab').forEach(btn => btn.addEventListener('click', () => {
          container.querySelectorAll('.lang-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          callback(btn.dataset.lang);
        }));
      }

      function renderSeo(lang) {
        const tr = state.current.translations[lang]?.seo || {};
        const container = byId('seo-'+lang);
        container.innerHTML = `
          <div class="field-row"><label>SEO Title<input class="input" data-seo="${lang}.title" value="${escapeHtml(tr.title||'')}" /></label>
          <label>Canonical URL<input class="input" data-seo="${lang}.canonical" value="${escapeHtml(tr.canonical||'')}" /></label></div>
          <div class="field-row full"><label>Meta description<textarea class="input" data-seo="${lang}.metaDescription">${escapeHtml(tr.metaDescription||'')}</textarea></label></div>
          <div class="field-row"><label>OG Image<input class="input" data-seo="${lang}.openGraph.image" value="${escapeHtml(tr.openGraph?.image||'')}" /></label>
          <label>Twitter Image<input class="input" data-seo="${lang}.twitter.image" value="${escapeHtml(tr.twitter?.image||'')}" /></label></div>
          <div class="field-row"><label>Keywords<input class="input" data-seo="${lang}.keywords" value="${escapeHtml(tr.keywords||'')}" /></label>
          <label>Focus Keyword<input class="input" data-seo="${lang}.focusKeyword" value="${escapeHtml(tr.focusKeyword||'')}" /></label></div>
        `;
        container.querySelectorAll('[data-seo]').forEach(el => el.addEventListener('input', () => {
          const [l, ...rest] = el.dataset.seo.split('.');
          setField('translations.'+l+'.seo.'+rest.join('.'), el.value);
        }));
      }

      function renderBlocks(lang) {
        const blocks = state.current.translations[lang]?.content || [];
        const container = byId('blocks-'+lang);
        container.innerHTML = blocks.map((block, i) => {
          const drag = '<span class="drag-handle" title="Drag">☰</span>';
          const allTypes = ['heading','paragraph','list','image','cta','highlight','stats','quote','alert','code'];
          const typeSel = `<select class="input" style="font-size:0.82rem;padding:4px 8px;width:auto;display:inline-block;" data-block-type="${lang}-${i}">`+
            allTypes.map(t => `<option value="${t}" ${block.type===t?'selected':''}>${t}</option>`).join('')+'</select>';
          const rm = `<button class="button button-danger button-sm" data-rm-block="${lang}-${i}">×</button>`;
          let body = '';
          if (block.type === 'heading') {
            const lvl = block.level||2;
            body = `<div class="flex"><label style="flex:1">Level<select class="input" data-path="translations.${lang}.content.${i}.level">
              ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${n===lvl?'selected':''}>H${n}</option>`).join('')}</select></label></div>
              <label>Text<textarea class="input" data-path="translations.${lang}.content.${i}.text" rows="2">${escapeHtml(block.text||'')}</textarea></label>`;
          } else if (block.type === 'paragraph') {
            const style = block.style||'normal';
            body = `<div class="flex"><label style="flex:1">Style<select class="input" data-path="translations.${lang}.content.${i}.style">
              <option value="normal" ${style==='normal'?'selected':''}>Normal</option>
              <option value="lead" ${style==='lead'?'selected':''}>Lead</option>
              <option value="small" ${style==='small'?'selected':''}>Small</option></select></label></div>
              <label>Text<textarea class="input" data-path="translations.${lang}.content.${i}.text" rows="2">${escapeHtml(block.text||'')}</textarea></label>`;
          } else if (block.type === 'list') {
            const items = block.items||[];
            body = `<div class="flex"><label style="flex:1">Type<select class="input" data-path="translations.${lang}.content.${i}.style">
              <option value="bullet" ${(block.style||'bullet')==='bullet'?'selected':''}>Bullet</option>
              <option value="ordered" ${block.style==='ordered'?'selected':''}>Ordered</option></select></label></div>
              ${items.map((item, ii) => `<div class="flex" style="margin:4px 0"><input class="input" style="flex:1" data-path="translations.${lang}.content.${i}.items.${ii}" value="${escapeHtml(item||'')}" />
              <button class="button button-danger button-sm" data-rm-li="${lang}-${i}-${ii}">×</button></div>`).join('')}
              <button class="button button-secondary button-sm" data-add-li="${lang}-${i}" style="margin-top:4px">+ Item</button>`;
          } else if (block.type === 'image') {
            const imgSrc = block.src || '';
            body = `<label>URL<input class="input" data-path="translations.${lang}.content.${i}.src" value="${escapeHtml(imgSrc)}" oninput="syncImageAcrossLocales(this.dataset.path, this.value)" data-path="translations.${lang}.content.${i}.src" /></label>
              ${imgSrc ? `<div style="margin:8px 0;border-radius:8px;overflow:hidden;"><img src="${escapeHtml(imgSrc)}" alt="" style="max-width:100%;max-height:150px;border-radius:8px;object-fit:cover;" /></div>` : ''}
              <div class="flex"><label style="flex:1">Alt text<input class="input" data-path="translations.${lang}.content.${i}.alt" value="${escapeHtml(block.alt||'')}" placeholder="Alternative text for SEO" /></label>
              <label>Upload<input type="file" class="input" accept="image/*" data-upload-img="${lang}-${i}" /></label></div>
              <label>Caption<textarea class="input" data-path="translations.${lang}.content.${i}.caption" rows="1">${escapeHtml(block.caption||'')}</textarea></label>`;
          } else if (block.type === 'cta') {
            body = `<div style="padding:8px;border:1px solid rgba(218,0,55,0.3);border-radius:10px;background:rgba(218,0,55,0.06);">
              <label>Title<input class="input" data-path="translations.${lang}.content.${i}.title" value="${escapeHtml(block.title||'')}" placeholder="Call to action heading" /></label>
              <label>Description<textarea class="input" data-path="translations.${lang}.content.${i}.text" rows="2" placeholder="Supporting text">${escapeHtml(block.text||'')}</textarea></label>
              <div class="flex"><label style="flex:1">Button text<input class="input" data-path="translations.${lang}.content.${i}.buttonText" value="${escapeHtml(block.buttonText||'')}" placeholder="e.g. Get Started" /></label>
              <label style="flex:1">Button URL<input class="input" data-path="translations.${lang}.content.${i}.buttonUrl" value="${escapeHtml(block.buttonUrl||'')}" placeholder="https://..." /></label></div>
            </div>`;
          } else if (block.type === 'highlight') {
            body = `<div style="padding:8px;border-left:4px solid rgba(218,0,55,0.5);border-radius:8px;background:rgba(218,0,55,0.04);">
              <label>Label <span class="muted">(optional)</span><input class="input" data-path="translations.${lang}.content.${i}.label" value="${escapeHtml(block.label||'')}" placeholder="e.g. KEY INSIGHT" /></label>
              <label>Text<textarea class="input" data-path="translations.${lang}.content.${i}.text" rows="3">${escapeHtml(block.text||'')}</textarea></label>
            </div>`;
          } else if (block.type === 'stats') {
            const items = block.items||[{value:'',label:''}];
            body = `<div style="padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
              ${items.map((s, si) => `<div class="flex" style="margin-bottom:4px"><input class="input" style="flex:1" data-path="translations.${lang}.content.${i}.items.${si}.value" value="${escapeHtml(s.value||'')}" placeholder="Value" />
              <input class="input" style="flex:2" data-path="translations.${lang}.content.${i}.items.${si}.label" value="${escapeHtml(s.label||'')}" placeholder="Label" />
              <button class="button button-danger button-sm" data-rm-stat="${lang}-${i}-${si}">×</button></div>`).join('')}
              <button class="button button-secondary button-sm" data-add-stat="${lang}-${i}" style="margin-top:4px">+ Add stat</button>
            </div>`;
          } else if (block.type === 'quote') {
            body = `<div style="padding:8px;border-left:4px solid rgba(52,152,219,0.5);border-radius:8px;background:rgba(52,152,219,0.04);">
              <label>Quote text<textarea class="input" data-path="translations.${lang}.content.${i}.text" rows="3">${escapeHtml(block.text||'')}</textarea></label>
              <label>Author <span class="muted">(optional)</span><input class="input" data-path="translations.${lang}.content.${i}.author" value="${escapeHtml(block.author||'')}" /></label>
            </div>`;
          } else if (block.type === 'alert') {
            const style = block.alertStyle||'info';
            body = `<div style="padding:8px;border:1px solid rgba(52,152,219,0.3);border-radius:10px;background:rgba(52,152,219,0.06);">
              <div class="flex"><label style="flex:1">Style<select class="input" data-path="translations.${lang}.content.${i}.alertStyle">
                <option value="info" ${style==='info'?'selected':''}>Info ℹ</option>
                <option value="warning" ${style==='warning'?'selected':''}>Warning ⚠</option>
                <option value="tip" ${style==='tip'?'selected':''}>Tip 💡</option>
                <option value="danger" ${style==='danger'?'selected':''}>Danger ✕</option></select></label></div>
              <label>Title <span class="muted">(optional)</span><input class="input" data-path="translations.${lang}.content.${i}.title" value="${escapeHtml(block.title||'')}" /></label>
              <label>Text<textarea class="input" data-path="translations.${lang}.content.${i}.text" rows="2">${escapeHtml(block.text||'')}</textarea></label>
            </div>`;
          } else if (block.type === 'code') {
            body = `<div style="padding:8px;background:#0a0d12;border-radius:8px;border:1px solid rgba(255,255,255,0.08);">
              <label>Code<textarea class="input" data-path="translations.${lang}.content.${i}.code" rows="5" style="font-family:monospace;font-size:0.85rem;">${escapeHtml(block.code||'')}</textarea></label>
            </div>`;
          } else {
            body = '<div class="muted">Select a block type above</div>';
          }
          return `<div class="list-item" draggable="true" data-drag="${lang}-${i}">
            <div class="flex" style="align-items:center;margin-bottom:6px">${drag}<strong style="flex:1;font-size:0.85rem">Block ${i+1}</strong>${typeSel}${rm}</div>
            <div class="block-body">${body}</div></div>`;
        }).join('');
        // Bind inputs
        container.querySelectorAll('[data-path]').forEach(el => el.addEventListener('input', () => { setField(el.dataset.path, el.value); }));
        container.querySelectorAll('[data-block-type]').forEach(sel => sel.addEventListener('change', () => {
          const [l, idx] = sel.dataset.blockType.split('-');
          state.current.translations[l].content[Number(idx)].type = sel.value;
          renderBlocks(l);
        }));
        container.querySelectorAll('[data-rm-block]').forEach(btn => btn.addEventListener('click', () => {
          const [l, idx] = btn.dataset.rmBlock.split('-');
          state.current.translations[l].content.splice(Number(idx), 1);
          renderBlocks(l); syncToJson();
        }));
        container.querySelectorAll('[data-rm-li]').forEach(btn => btn.addEventListener('click', () => {
          const [l, bi, ii] = btn.dataset.rmLi.split('-');
          state.current.translations[l].content[Number(bi)].items.splice(Number(ii), 1);
          renderBlocks(l); syncToJson();
        }));
        container.querySelectorAll('[data-add-li]').forEach(btn => btn.addEventListener('click', () => {
          const [l, bi] = btn.dataset.addLi.split('-');
          if (!state.current.translations[l].content[Number(bi)].items) state.current.translations[l].content[Number(bi)].items = [];
          state.current.translations[l].content[Number(bi)].items.push('');
          renderBlocks(l); syncToJson();
        }));
        container.querySelectorAll('[data-rm-stat]').forEach(btn => btn.addEventListener('click', () => {
          const [l, bi, si] = btn.dataset.rmStat.split('-');
          state.current.translations[l].content[Number(bi)].items.splice(Number(si), 1);
          renderBlocks(l); syncToJson();
        }));
        container.querySelectorAll('[data-add-stat]').forEach(btn => btn.addEventListener('click', () => {
          const [l, bi] = btn.dataset.addStat.split('-');
          if (!state.current.translations[l].content[Number(bi)].items) state.current.translations[l].content[Number(bi)].items = [];
          state.current.translations[l].content[Number(bi)].items.push({value:'', label:''});
          renderBlocks(l); syncToJson();
        }));
        container.querySelectorAll('[data-upload-img]').forEach(input => input.addEventListener('change', async () => {
          if (!input.files.length) return;
          const [l, bi] = input.dataset.uploadImg.split('-');
          const fd = new FormData(); fd.append('action','uploadImage'); fd.append('image_file', input.files[0]);
          const result = await fetchJson(apiBase, {method:'POST', body:fd});
          state.current.translations[l].content[Number(bi)].src = result.src;
          renderBlocks(l); syncToJson(); input.value='';
        }));
        // Drag & drop
        container.querySelectorAll('.list-item[draggable]').forEach(item => {
          item.addEventListener('dragstart', e => {
            const [l, i] = item.dataset.drag.split('-');
            e.dataTransfer.setData('text/plain', JSON.stringify({locale:l, index:Number(i)}));
            item.classList.add('dragging');
          });
          item.addEventListener('dragend', () => item.classList.remove('dragging'));
          item.addEventListener('dragover', e => { e.preventDefault(); item.classList.add('drag-over'); });
          item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
          item.addEventListener('drop', e => {
            e.preventDefault(); item.classList.remove('drag-over');
            const src = JSON.parse(e.dataTransfer.getData('text/plain'));
            const tgt = item.dataset.drag.split('-');
            if (src.locale !== tgt[0]) return;
            const blocks = state.current.translations[src.locale].content;
            const [moved] = blocks.splice(src.index, 1);
            const insertAt = Number(tgt[1]) > src.index ? Number(tgt[1]) - 1 : Number(tgt[1]);
            blocks.splice(insertAt, 0, moved);
            renderBlocks(src.locale); syncToJson();
          });
        });
      }

      function renderFaq(lang) {
        const faq = state.current.translations[lang]?.faq || [];
        const container = byId('faq-'+lang);
        container.innerHTML = faq.map((item, i) => `
          <div class="list-item" style="padding:8px">
            <div class="flex" style="align-items:center;margin-bottom:4px">
              <strong style="flex:1;font-size:0.85rem">FAQ ${i+1}</strong>
              <button class="button button-danger button-sm" data-rm-faq="${lang}-${i}">×</button>
            </div>
            <label>Question<input class="input" data-path="translations.${lang}.faq.${i}.question" value="${escapeHtml(item.question||'')}" /></label>
            <label>Answer<textarea class="input" data-path="translations.${lang}.faq.${i}.answer" rows="2">${escapeHtml(item.answer||'')}</textarea></label>
          </div>
        `).join('');
        container.querySelectorAll('[data-path]').forEach(el => el.addEventListener('input', () => setField(el.dataset.path, el.value)));
        container.querySelectorAll('[data-rm-faq]').forEach(btn => btn.addEventListener('click', () => {
          const [l, i] = btn.dataset.rmFaq.split('-');
          state.current.translations[l].faq.splice(Number(i), 1);
          renderFaq(l); syncToJson();
        }));
      }

      function renderAllContent() {
        LANGUAGES.forEach(l => { renderSeo(l); renderBlocks(l); renderFaq(l); });
        // Sync content title/excerpt fields
        LANGUAGES.forEach(l => {
          const tr = state.current.translations[l] || {};
          const titleEl = byId('field-title-'+l);
          const excerptEl = byId('field-excerpt-'+l);
          if (titleEl) titleEl.value = tr.title || '';
          if (excerptEl) excerptEl.value = tr.excerpt || '';
        });
      }

      function render() {
        if (!state.current) state.current = defaultPost();
        byId('editor-title').textContent = state.current.title || 'New post';
        byId('editor-subtitle').textContent = state.current.slug ? state.current.slug : 'Create or select a post.';
        byId('field-slug').value = state.current.slug || '';
        byId('field-title').value = state.current.title || '';
        byId('field-status').value = state.current.status || 'draft';
        byId('field-tags').value = (state.current.tags||[]).join(', ');
        byId('field-featured-src').value = state.current.featuredImage?.src || '';
        byId('field-featured-alt-en').value = state.current.featuredImage?.alt?.en || '';
        byId('field-featured-alt-fa').value = state.current.featuredImage?.alt?.fa || '';
        byId('featured-preview').innerHTML = state.current.featuredImage?.src ? `<img src="${state.current.featuredImage.src}" alt="" style="max-width:100%;border-radius:12px;margin-top:6px;" />` : '';
        renderAllContent();
        syncToJson();
        renderPostList();
      }

      function renderPostList() {
        const term = byId('search-posts').value.toLowerCase();
        byId('post-list').innerHTML = state.posts.filter(p => p.slug.includes(term) || (p.title||'').toLowerCase().includes(term))
          .map(p => {
            const imgSrc = p.featuredImage?.src || '';
            const thumb = imgSrc ? `<img src="${escapeHtml(imgSrc)}" alt="" style="width:36px;height:28px;border-radius:6px;object-fit:cover;flex-shrink:0;" />` : `<div style="width:36px;height:28px;border-radius:6px;background:rgba(255,255,255,0.06);flex-shrink:0;"></div>`;
            const titleText = (p.title||p.slug).length > 30 ? (p.title||p.slug).substring(0,27)+'...' : (p.title||p.slug);
            return `<div class="post-row ${state.current?.slug===p.slug?'active':''}" style="display:flex;align-items:center;gap:6px;">
              <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;">
                ${thumb}
                <div style="min-width:0;flex:1;overflow:hidden;">
                  <div style="width:100%;text-align:left;padding:2px 4px;cursor:pointer;font-size:0.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#eef2f7;font-weight:500;" onclick="(function(slug){document.querySelector('[data-select=\"'+slug+'\"]').click()})('${escapeHtml(p.slug)}')" onmouseover="this.style.color='#da1b4c'" onmouseout="this.style.color='#eef2f7'">${escapeHtml(titleText)}</div>
                  <div class="muted" style="font-size:0.7rem">${escapeHtml(p.date||'')}</div>
                </div>
              </div>
              <div class="actions" style="flex-shrink:0;display:flex;gap:3px;">
                <button class="button button-secondary button-sm" style="font-size:0.7rem;padding:3px 8px;" data-edit="${p.slug}">Edit</button>
                <button class="button button-danger button-sm" style="font-size:0.7rem;padding:3px 8px;" data-del="${p.slug}">Del</button>
              </div>
            </div>`;
          }).join('');
      }

      document.addEventListener('DOMContentLoaded', async () => {
        // Collapsible sections
        document.querySelectorAll('.collapsible-header').forEach(h => h.addEventListener('click', () => {
          const id = h.dataset.collapse;
          const body = byId('collapse-'+id);
          h.classList.toggle('collapsed');
          body.classList.toggle('collapsed');
        }));

        // Content language tabs
        function switchContentLang(lang) {
          state.contentLang = lang;
          document.querySelectorAll('#content-lang-tabs .lang-tab').forEach(b => b.classList.toggle('active', b.dataset.lang===lang));
          document.querySelectorAll('#content-en, #content-fa').forEach(el => el.classList.toggle('active', el.id==='content-'+lang));
          document.querySelectorAll('#blocks-en, #blocks-fa').forEach(el => el.classList.toggle('active', el.id==='blocks-'+lang));
          document.querySelectorAll('#faq-en, #faq-fa').forEach(el => el.classList.toggle('active', el.id==='faq-'+lang));
        }
        renderLangTabs('content-lang-tabs', 'en', switchContentLang);
        renderLangTabs('blocks-lang-tabs', 'en', switchContentLang);
        renderLangTabs('faq-lang-tabs', 'en', switchContentLang);
        renderLangTabs('seo-lang-tabs', 'en', (lang) => {
          document.querySelectorAll('#seo-lang-tabs .lang-tab').forEach(b => b.classList.toggle('active', b.dataset.lang===lang));
          document.querySelectorAll('#seo-en, #seo-fa').forEach(el => el.classList.toggle('active', el.id==='seo-'+lang));
        });

        // Content fields sync
        LANGUAGES.forEach(l => {
          const titleEl = byId('field-title-'+l);
          const excerptEl = byId('field-excerpt-'+l);
          if (titleEl) titleEl.addEventListener('input', () => { setField('translations.'+l+'.title', titleEl.value); });
          if (excerptEl) excerptEl.addEventListener('input', () => { setField('translations.'+l+'.excerpt', excerptEl.value); });
        });

        // Quick-add blocks
        document.querySelectorAll('[data-add-block]').forEach(btn => btn.addEventListener('click', () => {
          const type = btn.dataset.addBlock;
          const lang = state.contentLang;
          state.current.translations[lang].content.push({type, text:''});
          renderBlocks(lang); syncToJson();
        }));

        // FAQ add
        byId('add-faq').addEventListener('click', () => {
          const lang = state.contentLang;
          state.current.translations[lang].faq.push({question:'', answer:''});
          renderFaq(lang); syncToJson();
        });

        // Main field sync
        byId('field-slug').addEventListener('input', () => { setField('slug', byId('field-slug').value); });
        byId('field-title').addEventListener('input', () => { setField('title', byId('field-title').value); });
        byId('field-tags').addEventListener('input', () => { setField('tags', byId('field-tags').value); });
        byId('field-status').addEventListener('change', () => { setField('status', byId('field-status').value); });
        byId('field-featured-src').addEventListener('input', () => { setField('featuredImage.src', byId('field-featured-src').value); render(); });
        byId('field-featured-alt-en').addEventListener('input', () => { setField('featuredImage.alt.en', byId('field-featured-alt-en').value); });
        byId('field-featured-alt-fa').addEventListener('input', () => { setField('featuredImage.alt.fa', byId('field-featured-alt-fa').value); });

        // Preview button
        byId('preview-post').addEventListener('click', () => {
          if (!state.current) return;
          previewLang('en');
          byId('preview-modal').style.display = 'block';
          document.body.style.overflow = 'hidden';
        });

        // Save / Delete / Duplicate / New
        byId('save-post').addEventListener('click', async () => {
          if (!state.current) return;
          const fd = new FormData(); fd.append('action','save'); fd.append('post_json', JSON.stringify(state.current));
          await fetchJson(apiBase, {method:'POST', body:fd});
          await loadPosts();
          alert('Saved.');
        });
        byId('delete-post').addEventListener('click', async () => {
          if (!state.current?.slug || !confirm('Delete?')) return;
          await fetchJson(apiBase, { method: 'POST', body: new URLSearchParams({ action: 'delete', slug: state.current.slug }) });
          state.current = null; render(); await loadPosts();
        });
        byId('duplicate-post').addEventListener('click', async () => {
          if (!state.current?.slug) return;
          const fd = new FormData(); fd.append('action','duplicate'); fd.append('slug', state.current.slug);
          const r = await fetchJson(apiBase, {method:'POST', body:fd});
          if (r?.slug) { await loadPosts(); state.current = null; await loadPost(r.slug); alert('Duplicated.'); }
        });
        byId('new-post').addEventListener('click', () => { state.current = defaultPost(); state.current.slug = 'new-post'; syncToJson(); render(); });

        // Post list actions
        document.body.addEventListener('click', async (e) => {
          const t = e.target;
          if (t.dataset.select || t.dataset.edit) await loadPost(t.dataset.select||t.dataset.edit);
          if (t.dataset.del && confirm('Delete?')) {
            await fetchJson(apiBase, { method: 'POST', body: new URLSearchParams({ action: 'delete', slug: t.dataset.del }) });
            if (state.current?.slug === t.dataset.del) state.current = null;
            render(); await loadPosts();
          }
        });

        // Search
        byId('search-posts').addEventListener('input', renderPostList);

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
          document.querySelectorAll('.tab').forEach(t => { t.style.background = 'rgba(255,255,255,0.06)'; t.style.color = '#eef2f7'; });
          tab.style.background = '#da1b4c'; tab.style.color = '#fff';
          const v = tab.dataset.view;
          byId('editor-view').style.display = v==='editor'?'block':'none';
          byId('json-view').style.display = v==='json'?'block':'none';
        }));

        // Upload featured
        byId('upload-featured').addEventListener('change', async () => {
          if (!byId('upload-featured').files.length) return;
          const fd = new FormData(); fd.append('action','uploadImage'); fd.append('image_file', byId('upload-featured').files[0]);
          const r = await fetchJson(apiBase, {method:'POST', body:fd});
          state.current.featuredImage.src = r.src; syncToJson(); render();
        });

        // JSON editor
        byId('json-editor').addEventListener('input', () => {
          clearTimeout(window._jsonTimer);
          window._jsonTimer = setTimeout(() => {
            try { const p = JSON.parse(byId('json-editor').value); state.current = p; byId('json-error').textContent = ''; render(); }
            catch(e) { byId('json-error').textContent = e.message; }
          }, 500);
        });
        byId('export-json').addEventListener('click', () => {
          const blob = new Blob([JSON.stringify(state.current,null,2)], {type:'application/json'});
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (state.current.slug||'post')+'.json'; a.click();
        });
        byId('export-all').addEventListener('click', async () => {
          if (!confirm('Export all posts as JSON? This will include all posts with their URLs.')) return;
          const allPosts = await fetchJson(apiBase+'?action=list');
          const exportData = allPosts.map(p => ({
            slug: p.slug,
            title: p.title,
            url: window.location.origin + '/blog/' + p.slug,
            date: p.date,
            tags: p.tags,
            featuredImage: p.featuredImage
          }));
          const blob = new Blob([JSON.stringify(exportData, null, 2)], {type:'application/json'});
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'all-posts.json'; a.click();
        });
        byId('import-json').addEventListener('click', () => byId('import-file').click());
        byId('import-file').addEventListener('change', async (e) => {
          const file = e.target.files[0]; if (!file) return;
          try { state.current = JSON.parse(await file.text()); syncToJson(); render(); alert('Imported!'); } catch(err) { byId('json-error').textContent = 'Invalid JSON'; }
        });

        // Side nav — scroll to sections
        document.querySelectorAll('#side-nav button').forEach(btn => btn.addEventListener('click', () => {
          const target = document.getElementById(btn.dataset.scroll);
          if (target) {
            // Expand collapsed section if needed
            const header = target.querySelector('.collapsible-header');
            const body = target.querySelector('.collapsible-body');
            if (header && body && header.classList.contains('collapsed')) {
              header.classList.remove('collapsed');
              body.classList.remove('collapsed');
            }
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }));

        // Global language toggle — switches ALL language tabs at once
        document.querySelectorAll('[data-global-lang]').forEach(btn => btn.addEventListener('click', () => {
          const lang = btn.dataset.globalLang;
          // Update global bar buttons
          document.querySelectorAll('[data-global-lang]').forEach(b => b.classList.toggle('active', b.dataset.globalLang === lang));
          // Trigger all section lang tabs
          document.querySelectorAll('.lang-tab').forEach(tab => {
            if (tab.dataset.lang === lang) {
              tab.click();
            }
          });
          state.contentLang = lang;
        }));

        // Init
        state.current = defaultPost(); render();
        async function loadPosts() { state.posts = await fetchJson(apiBase+'?action=list'); renderPostList(); }
        async function loadPost(slug) { state.current = await fetchJson(apiBase+'?action=get&slug='+encodeURIComponent(slug)); render(); }
        await loadPosts();
      });
    </script>
  </body>
</html>