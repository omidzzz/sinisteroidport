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
 *      (title, description, canonical, hreflang, Open Graph, Twitter),
 *   3. serves it AT THE ORIGINAL PRETTY URL.
 *
 * The React runtime then boots, BlogPostDynamic reads the slug from the
 * pathname, fetches /api/get_post.php and renders the article through
 * BlogPostLive — the SAME renderer every prerendered post uses. One
 * style, one TOC, one cursor, one navbar. No duplicated chrome here.
 *
 * ── HYDRATION CONSTRAINT ─────────────────────────────────────────────
 * The shell is a prerendered React document whose <head> matches the
 * client-side tree built from its embedded RSC payload. React 19 hydrates
 * <head> strictly: ADDING or REMOVING head elements (as the previous
 * version of this script did) made the served HTML diverge from the
 * client tree, so every DB-published post crashed during hydration with
 * "Minified React error #418 (server rendered HTML didn't match the
 * client)". The swaps below only replace VALUES inside EXISTING head
 * elements — React tolerates that during hydration — so the served head
 * stays structurally identical to the shell's and hydration never
 * regresses. Do NOT add/remove <title>, <meta>, <link> or <script>
 * elements here.
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

/** Replace the value of the first `$attr="…"` inside the first tag
 *  matched by `$tagPattern` — an IN-PLACE swap that never removes or
 *  adds elements (required so React hydration of the shell head stays
 *  structurally consistent). A pattern miss leaves the document as-is. */
function set_attr($html, $tagPattern, $attr, $value) {
    return preg_replace_callback(
        $tagPattern,
        function ($m) use ($attr, $value) {
            return preg_replace(
                '~' . preg_quote($attr, '~') . '="[^"]*"~i',
                $attr . '="' . $value . '"',
                $m[0],
                1
            );
        },
        $html,
        1
    );
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
$feat    = json_decode($row['featured_image'] ?? '', true);
$cover   = is_array($feat) && !empty($feat['src']) ? abs_url($feat['src']) : '';
$fa      = ($locale === 'fa');

$url = "https://sinisteroid.ir/{$locale}/blog/{$slug}/";

/* ---------- load the prerendered React shell ---------- */
$shellPath = dirname(__DIR__) . '/' . $locale . '/blog/live/index.html';
if (!is_file($shellPath)) fail($locale, 500);
$html = file_get_contents($shellPath);
if ($html === false || $html === '') fail($locale, 500);

/* ---------- in-place head metadata swap (NO element add/remove) ---------- */
$dbTitle  = esc($title);
$dbDesc   = esc($excerpt);
$dbUrl    = esc($url);
$dbEnUrl  = 'https://sinisteroid.ir/en/blog/' . esc($slug) . '/';
$dbFaUrl  = 'https://sinisteroid.ir/fa/blog/' . esc($slug) . '/';
$dbImage  = $cover !== '' ? esc($cover) : '';
$dbLocale = $fa ? 'fa_IR' : 'en_US';

/* <title> — replace text inside the existing element */
$html = preg_replace('~<title>.*?</title>~is', '<title>' . $dbTitle . ' — Sinisteroid</title>', $html, 1);

/* name="description" */
$html = set_attr($html, '~<meta\s+[^>]*name="description"[^>]*/?>~i', 'content', esc(mb_substr($excerpt, 0, 160)));

/* rel="canonical" */
$html = set_attr($html, '~<link\s+[^>]*rel="canonical"[^>]*/?>~i', 'href', $dbUrl);

/* hreflang alternates — swap hrefs on the shell's existing three links */
$html = set_attr($html, '~<link\s+[^>]*hrefLang="en"[^>]*/?>~i', 'href', $dbEnUrl);
$html = set_attr($html, '~<link\s+[^>]*hrefLang="fa"[^>]*/?>~i', 'href', $dbFaUrl);
$html = set_attr($html, '~<link\s+[^>]*hrefLang="x-default"[^>]*/?>~i', 'href', $dbEnUrl);

/* Open Graph */
$html = set_attr($html, '~<meta\s+[^>]*property="og:title"[^>]*/?>~i', 'content', $dbTitle);
$html = set_attr($html, '~<meta\s+[^>]*property="og:description"[^>]*/?>~i', 'content', $dbDesc);
$html = set_attr($html, '~<meta\s+[^>]*property="og:url"[^>]*/?>~i', 'content', $dbUrl);
$html = set_attr($html, '~<meta\s+[^>]*property="og:type"[^>]*/?>~i', 'content', 'article');
$html = set_attr($html, '~<meta\s+[^>]*property="og:locale"[^>]*/?>~i', 'content', $dbLocale);
if ($dbImage !== '') {
    $html = set_attr($html, '~<meta\s+[^>]*property="og:image"[^>]*/?>~i', 'content', $dbImage);
}

/* Twitter */
$html = set_attr($html, '~<meta\s+[^>]*name="twitter:title"[^>]*/?>~i', 'content', $dbTitle);
$html = set_attr($html, '~<meta\s+[^>]*name="twitter:description"[^>]*/?>~i', 'content', $dbDesc);
if ($dbImage !== '') {
    $html = set_attr($html, '~<meta\s+[^>]*name="twitter:image"[^>]*/?>~i', 'content', $dbImage);
}

echo $html;