<?php
/**
 * Dynamic blog-post SHELL server (single-renderer architecture).
 *
 * Served via .htaccess for /{en|fa}/blog/<slug>/ whenever the static
 * export has no pre-rendered folder for that slug. Instead of imitating
 * the React page, this script:
 *
 *   1. loads the PRERENDERED React shell (/en|fa/blog/live/index.html),
 *   2. swaps its generic <head> metadata for the DB post's real SEO
 *      (title, description, canonical, hreflang, Open Graph, Twitter,
 *      JSON-LD Article),
 *   3. serves it AT THE ORIGINAL PRETTY URL.
 *
 * The React runtime then boots, BlogPostDynamic reads the slug from the
 * pathname, fetches /api/get_post.php and renders the article through
 * BlogPostLive — the SAME renderer every prerendered post uses. One
 * style, one TOC, one cursor, one navbar. No duplicated chrome here.
 */

require_once __DIR__ . '/db.php';
header('Content-Type: text/html; charset=utf-8');

function esc($s) {
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

function abs_url($src) {
    $src = trim((string)$src);
    if ($src === '') return '';
    if (preg_match('~^https?://~i', $src)) return $src;
    return 'https://sinisteroid.ir' . ($src[0] === '/' ? $src : '/' . $src);
}

function fail($locale, $code) {
    http_response_code($code);
    $back = $locale === 'fa' ? 'بازگشت به نوشته‌ها' : 'Back to writing';
    echo '<!DOCTYPE html><html lang="' . esc($locale) . '"><head><meta charset="utf-8">'
       . '<meta name="viewport" content="width=device-width, initial-scale=1">'
       . '<meta name="robots" content="noindex"><title>' . ($locale === 'fa' ? 'یافت نشد' : 'Not found') . '</title></head>'
       . '<body style="background:#020503;color:#ecffe9;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center">'
       . '<p style="color:#8fa294">404</p><a style="color:#b8ff00" href="/' . esc($locale) . '/blog/">' . esc($back) . '</a></body></html>';
    exit;
}

/* ---------- input ---------- */
$locale = (isset($_GET['locale']) && strtolower(trim($_GET['locale'])) === 'fa') ? 'fa' : 'en';
$slug   = isset($_GET['slug']) ? trim($_GET['slug']) : '';
if ($slug === '' || !preg_match('/^[A-Za-z0-9._~-]{1,120}$/', $slug)) fail($locale, 404);

/* ---------- load from MySQL ---------- */
try {
    $stmt = $pdo->prepare('SELECT * FROM posts WHERE slug = :slug LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $row = $stmt->fetch();
} catch (Exception $e) {
    fail($locale, 500);
}
if (!$row || strtolower($row['status'] ?? '') === 'draft') fail($locale, 404);

$translations = json_decode($row['content_json'] ?? '', true);
if (!is_array($translations)) fail($locale, 404);

$t = $translations[$locale] ?? $translations['en'] ?? null;
if (!is_array($t) || empty($t['content'])) fail($locale, 404);

$title   = (string)($t['title'] ?? $row['title'] ?? $slug);
$excerpt = (string)($t['excerpt'] ?? '');
$date    = substr((string)($row['date_published'] ?? ''), 0, 10);
$feat    = json_decode($row['featured_image'] ?? '', true);
$cover   = is_array($feat) && !empty($feat['src']) ? abs_url($feat['src']) : '';
$fa      = ($locale === 'fa');

$url      = "https://sinisteroid.ir/{$locale}/blog/{$slug}/";
$urlOther = 'https://sinisteroid.ir/' . ($fa ? 'en' : 'fa') . "/blog/{$slug}/";

/* ---------- load the prerendered React shell ---------- */
$shellPath = dirname(__DIR__) . '/' . $locale . '/blog/live/index.html';
if (!is_file($shellPath)) fail($locale, 500);
$html = file_get_contents($shellPath);
if ($html === false || $html === '') fail($locale, 500);

/* ---------- strip the shell's generic head metadata ---------- */
$html = preg_replace('~<title>.*?</title>~is', '', $html);
$html = preg_replace('~<meta\\s+name="description"[^>]*>~i', '', $html);
$html = preg_replace('~<link\\s+rel="canonical"[^>]*>~i', '', $html);
$html = preg_replace('~<link\\s+rel="alternate"[^>]*>~i', '', $html);
$html = preg_replace('~<meta\\s+property="og:[^"]*"[^>]*>~i', '', $html);
$html = preg_replace('~<meta\\s+property="article:[^"]*"[^>]*>~i', '', $html);
$html = preg_replace('~<meta\\s+name="twitter:[^"]*"[^>]*>~i', '', $html);
$html = preg_replace('~<script\\s+type="application/ld\\+json">.*?</script>~is', '', $html);

/* ---------- build the real metadata ---------- */
$meta  = '<title>' . esc($title) . ' — Sinisteroid</title>' . "\n";
$meta .= '<meta name="description" content="' . esc(mb_substr($excerpt, 0, 160)) . '">' . "\n";
$meta .= '<link rel="canonical" href="' . esc($url) . '">' . "\n";
$meta .= '<link rel="alternate" hreflang="en" href="https://sinisteroid.ir/en/blog/' . esc($slug) . '/">' . "\n";
$meta .= '<link rel="alternate" hreflang="fa" href="https://sinisteroid.ir/fa/blog/' . esc($slug) . '/">' . "\n";
$meta .= '<link rel="alternate" hreflang="x-default" href="https://sinisteroid.ir/en/blog/' . esc($slug) . '/">' . "\n";
$meta .= '<meta property="og:site_name" content="Sinisteroid">' . "\n";
$meta .= '<meta property="og:type" content="article">' . "\n";
$meta .= '<meta property="og:title" content="' . esc($title) . '">' . "\n";
$meta .= '<meta property="og:description" content="' . esc($excerpt) . '">' . "\n";
$meta .= '<meta property="og:url" content="' . esc($url) . '">' . "\n";
$meta .= '<meta property="og:locale" content="' . ($fa ? 'fa_IR' : 'en_US') . '">' . "\n";
if ($cover !== '') $meta .= '<meta property="og:image" content="' . esc($cover) . '">' . "\n";
if ($date !== '')  $meta .= '<meta property="article:published_time" content="' . esc($date) . '">' . "\n";
$meta .= '<meta name="twitter:card" content="summary_large_image">' . "\n";
$meta .= '<meta name="twitter:title" content="' . esc($title) . '">' . "\n";
$meta .= '<meta name="twitter:description" content="' . esc($excerpt) . '">' . "\n";
if ($cover !== '') $meta .= '<meta name="twitter:image" content="' . esc($cover) . '">' . "\n";

$jsonLd = json_encode([
    '@context' => 'https://schema.org',
    '@type' => 'Article',
    'headline' => $title,
    'description' => $excerpt,
    'url' => $url,
    'datePublished' => $date ?: null,
    'inLanguage' => $locale,
    'mainEntityOfPage' => $url,
    'image' => $cover ?: null,
    'author' => ['@type' => 'Person', 'name' => 'Omid', 'url' => 'https://sinisteroid.ir/en/'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$meta .= '<script type="application/ld+json">' . $jsonLd . '</script>' . "\n";

/* ---------- inject before </head> and serve ---------- */
$html = str_replace('</head>', $meta . '</head>', $html);
echo $html;