<?php
/**
 * local-server.php
 *
 * Router for PHP's built-in server that emulates the production
 * .htaccess rules from scripts/prepare-cpanel.mjs, so the static
 * export in out/ can be previewed locally with correct routing.
 *
 * Usage:  php -S localhost:8000 scripts/local-server.php
 * (run from the project root; it serves the out/ directory)
 *
 * Note: /api/*.php executes for real. Without a local MySQL server +
 * api/config.php those endpoints return errors — pages then simply
 * keep their prerendered content, exactly like a misconfigured host.
 */

$out = __DIR__ . '/../out';
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$query = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY) ?? '';
$path = rawurldecode($uri);

// ── 1. API requests: let PHP execute them normally ──────────────────
if (preg_match('#^/api/#', $path)) {
    return false;
}

// ── 2. Legacy ?lang= parameter → 301 to locale-prefixed URL ─────────
if (preg_match('/^lang=(fa|en)\b/i', $query, $m) && !preg_match('#^/(en|fa)(/|$)#', $path)) {
    $target = '/' . strtolower($m[1]) . ($path === '/' ? '/' : rtrim($path, '/')) . '/';
    header('Location: ' . $target, true, 301);
    exit;
}

// ── 3. Bare section / blog-post URLs → 301 to /en/… ─────────────────
if (preg_match('#^(blog|work|skills|education|showcase)/?$#', ltrim($path, '/'), $m)) {
    header('Location: /en/' . $m[1] . '/', true, 301);
    exit;
}
if (preg_match('#^blog/([^/]+)/?$#', ltrim($path, '/'), $m)) {
    header('Location: /en/blog/' . $m[1] . '/', true, 301);
    exit;
}

// ── 4. Prefixed paths missing trailing slash → 301 with slash ───────
if (preg_match('#^/(?:en|fa)(?:/blog/[^./]+|/(?:blog|work|skills|education|showcase))/?$#', $path)
    && substr($path, -1) !== '/') {
    header('Location: ' . $path . '/', true, 301);
    exit;
}

// ── 5. Root: serve the JS locale redirect page (same as prod) ───────
if ($path === '/') {
    header('Content-Type: text/html; charset=utf-8');
    readfile($out . '/index.html');
    exit;
}

// ── 6. Real files (css/js/images/php/etc): serve directly ───────────
$file = $out . $path;
if (is_file($file)) {
    return false;
}

// ── 7. Directory-style clean URLs: try <path>/index.html ────────────
$index = rtrim($file, '/') . '/index.html';
if (is_file($index)) {
    header('Content-Type: text/html; charset=utf-8');
    echo file_get_contents($index);
    exit;
}

// ── 8. Everything else: 404 page ────────────────────────────────────
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
readfile($out . '/404.html');
exit;
