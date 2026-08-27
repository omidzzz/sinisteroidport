<?php
/**
 * Server-side blog post renderer (dynamic, no rebuild needed).
 *
 * Served via .htaccess for /{en|fa}/blog/<slug>/ whenever the static
 * export has no pre-rendered folder for that slug. Loads the article
 * straight from MySQL and outputs COMPLETE HTML — full <head> metadata,
 * Open Graph, hreflang, canonical and JSON-LD — so search engines and
 * social crawlers see the finished article immediately.
 *
 * Posts published through /api/admin.php are therefore live at their
 * final URL the moment they are saved.
 */

require_once __DIR__ . '/db.php';
header('Content-Type: text/html; charset=utf-8');

function esc($s) {
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

/** Custom monoline arrow (matches src/components/icons.tsx). */
function svg_arrow($back = false) {
    $cls = $back ? 'arr-back' : 'arr-fwd';
    return '<svg class="' . $cls . '" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15m0 0-6-6m6 6-6 6"/></svg>';
}

function svg_sun() {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
}

function svg_moon() {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"/></svg>';
}

function abs_url($src) {
    if (!$src) return '';
    return preg_match('#^https?://#', $src) ? $src : 'https://sinisteroid.ir' . $src;
}

function not_found($locale = 'en') {
    http_response_code(404);
    $fa = ($locale === 'fa');
    $title = $fa ? 'نوشته پیدا نشد' : 'Post not found';
    $msg   = $fa ? 'این نوشته وجود ندارد یا حذف شده است.' : 'This post does not exist or has been removed.';
    $back  = $fa ? 'بازگشت به نوشته‌ها' : 'Back to writing';
    echo '<!DOCTYPE html><html lang="' . ($fa ? 'fa" dir="rtl' : 'en" dir="ltr') . '"><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1"><title>' . esc($title) . '</title>'
        . '<style>body{background:#0a0a0b;color:#edece6;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}'
        . 'h1{font-size:2rem}p{color:#7d7d74}a{color:#d9ff3f;text-decoration:none;display:inline-flex;align-items:center;gap:.5rem}</style></head><body>'
        . '<h1>' . esc($title) . '</h1><p>' . esc($msg) . '</p><a href="/' . $locale . '/blog/">' . svg_arrow(true) . esc($back) . '</a></body></html>';
    exit;
}

/* ---------- input ---------- */
$locale = (isset($_GET['locale']) && strtolower(trim($_GET['locale'])) === 'fa') ? 'fa' : 'en';
$slug   = isset($_GET['slug']) ? trim($_GET['slug']) : '';
if ($slug === '' || !preg_match('/^[A-Za-z0-9._~-]{1,120}$/', $slug)) not_found($locale);

/* ---------- load from MySQL ---------- */
try {
    $stmt = $pdo->prepare('SELECT * FROM posts WHERE slug = :slug LIMIT 1');
    $stmt->execute(['slug' => $slug]);
    $row = $stmt->fetch();
} catch (Exception $e) {
    http_response_code(500);
    not_found($locale);
}
if (!$row || strtolower($row['status'] ?? '') === 'draft') not_found($locale);

$translations = json_decode($row['content_json'] ?? '', true);
if (!is_array($translations)) not_found($locale);

$t       = $translations[$locale] ?? $translations['en'] ?? null;
$isFall  = !isset($translations[$locale]) && $locale === 'fa';
if (!is_array($t) || empty($t['content'])) not_found($locale);

$title    = (string)($t['title'] ?? $row['title'] ?? $slug);
$excerpt  = (string)($t['excerpt'] ?? '');
$date     = substr((string)($row['date_published'] ?? ''), 0, 10);
$tagsArr  = array_filter(array_map('trim', explode(',', (string)($row['tags'] ?? ''))));
$feat     = json_decode($row['featured_image'] ?? '', true);
$cover    = is_array($feat) && !empty($feat['src']) ? $feat['src'] : '';
$blocks   = is_array($t['content']) ? $t['content'] : [];
$faq      = (isset($t['faq']) && is_array($t['faq'])) ? $t['faq'] : [];

$url      = "https://sinisteroid.ir/{$locale}/blog/{$slug}/";
$urlEn    = "https://sinisteroid.ir/en/blog/{$slug}/";
$urlFa    = "https://sinisteroid.ir/fa/blog/{$slug}/";
$siteName = 'Sinisteroid';
$fa       = ($locale === 'fa');

/* ---------- block renderer (mirrors src/components/ContentRenderer.tsx) ---------- */

function render_blocks(array $blocks, string $locale): string {
    $html = '';
    $fig = 0;
    foreach ($blocks as $b) {
        if (!is_array($b)) continue;
        $type = $b['type'] ?? '';
        $text = isset($b['text']) ? esc($b['text']) : '';
        switch ($type) {
            case 'heading':
                $lvl = max(2, min(4, (int)($b['level'] ?? 2)));
                if ($lvl === 2) {
                    $html .= '<h2 class="pp-h2"><span class="pp-mk">#</span><span>' . $text . '</span></h2>';
                } elseif ($lvl === 3) {
                    $html .= '<h3 class="pp-h3"><span class="pp-mk2">//</span><span>' . $text . '</span></h3>';
                } else {
                    $html .= '<h4 class="pp-h4"><span class="pp-mk2">—</span><span>' . $text . '</span></h4>';
                }
                break;

            case 'paragraph':
                $cls = (($b['style'] ?? '') === 'lead') ? ' class="pp-lead"' : '';
                $html .= '<p' . $cls . '>' . nl2br($text) . '</p>';
                break;

            case 'list': {
                $items = array_values(array_filter((array)($b['items'] ?? []), 'is_string'));
                if (!$items) break;
                $ordered = ($b['style'] ?? '') === 'ordered';
                $html .= $ordered ? '<ol class="pp-ol">' : '<ul class="pp-ul">';
                foreach ($items as $j => $item) {
                    if ($ordered) {
                        $html .= '<li><span class="pp-olnum" dir="ltr">' . str_pad((string)($j + 1), 2, '0', STR_PAD_LEFT) . '</span><span>' . nl2br(esc($item)) . '</span></li>';
                    } else {
                        $html .= '<li><span class="pp-bullet" aria-hidden="true"></span><span>' . nl2br(esc($item)) . '</span></li>';
                    }
                }
                $html .= $ordered ? '</ol>' : '</ul>';
                break;
            }

            case 'highlight':
                $label = isset($b['label']) ? '<p class="pp-hl-label">[' . esc($b['label']) . ']</p>' : '';
                $html .= '<aside class="pp-hl">' . $label . '<p>' . nl2br($text) . '</p></aside>';
                break;

            case 'quote':
                $author = !empty($b['author']) ? '<footer class="pp-q-author">— ' . esc($b['author']) . '</footer>' : '';
                $html .= '<blockquote class="pp-quote"><span class="pp-q-mark" aria-hidden="true">&ldquo;</span><p>' . nl2br($text) . '</p>' . $author . '</blockquote>';
                break;

            case 'image': {
                $src = (string)($b['src'] ?? '');
                if (!$src) break;
                $fig++;
                $alt = '';
                if (!empty($b['altText'])) {
                    $alt = is_string($b['altText']) ? $b['altText'] : (string)($b['altText']['en'] ?? '');
                }
                $cap = !empty($b['caption'])
                    ? '<figcaption class="pp-cap"><span class="pp-cap-fig" dir="ltr">[FIG.' . $fig . ']</span> ' . esc($b['caption']) . '</figcaption>'
                    : '';
                $html .= '<figure class="pp-fig"><div class="pp-fig-frame"><img src="' . esc($src) . '" alt="' . esc($alt) . '" loading="lazy"></div>' . $cap . '</figure>';
                break;
            }

            case 'cta':
                $btn = !empty($b['buttonUrl'])
                    ? '<a class="pp-btn" href="' . esc($b['buttonUrl']) . '">' . esc($b['buttonText'] ?? 'Read more') . ' <span aria-hidden="true">&rarr;</span></a>'
                    : '';
                $ctaText = !empty($b['text']) ? '<p class="pp-cta-text">' . nl2br($text) . '</p>' : '';
                $html .= '<div class="pp-cta"><h3 class="pp-cta-title">' . (isset($b['title']) ? esc($b['title']) : '') . '</h3>' . $ctaText . $btn . '</div>';
                break;

            case 'stats': {
                $stats = array_values(array_filter((array)($b['items'] ?? []), 'is_array'));
                if (!$stats) break;
                $n = count($stats);
                $cols = $n === 2 ? ' c2' : ($n === 4 ? ' c4' : ' c3');
                $html .= '<div class="pp-stats' . $cols . '">';
                foreach ($stats as $s) {
                    $html .= '<div class="pp-stat"><p class="pp-stat-v" dir="auto">' . esc($s['value'] ?? '') . '</p><p class="pp-stat-l">' . esc($s['label'] ?? '') . '</p></div>';
                }
                $html .= '</div>';
                break;
            }

            case 'alert': {
                $style = $b['alertStyle'] ?? 'info';
                if ($style === 'warning')      { $cls = 'pp-alert-w'; $glyph = '!'; }
                elseif ($style === 'tip')      { $cls = 'pp-alert-t'; $glyph = '&#9670;'; }
                else                           { $cls = 'pp-alert-i'; $glyph = 'i'; }
                $ttl = !empty($b['title'])
                    ? '<p class="pp-alert-ttl"><span class="pp-alert-glyph ' . $cls . '" dir="ltr">' . $glyph . '</span><span class="' . $cls . '">' . esc($b['title']) . '</span></p>'
                    : '';
                $html .= '<aside class="pp-alert ' . $cls . '">' . $ttl . '<p>' . nl2br($text) . '</p></aside>';
                break;
            }

            case 'code':
                $code = isset($b['code']) ? (string)$b['code'] : '';
                $html .= '<div class="pp-code"><div class="pp-code-bar" dir="ltr"><span class="pp-dot pp-d1"></span><span class="pp-dot pp-d2"></span><span class="pp-dot pp-d3"></span><span class="pp-code-sh">sh</span></div><pre dir="ltr"><code>' . esc($code) . '</code></pre></div>';
                break;

            case 'table': {
                $headers = (array)($b['headers'] ?? []);
                $rows    = (array)($b['rows'] ?? []);
                if (!$headers || !$rows) break;
                $html .= '<div class="pp-tablewrap"><table class="pp-table"><thead><tr>';
                foreach ($headers as $h) $html .= '<th>' . esc($h) . '</th>';
                $html .= '</tr></thead><tbody>';
                foreach ($rows as $r) {
                    $html .= '<tr>';
                    foreach ((array)$r as $c) $html .= '<td>' . esc($c) . '</td>';
                    $html .= '</tr>';
                }
                $html .= '</tbody></table></div>';
                break;
            }
        }
    }
    return $html;
}

/* ---------- output ---------- */
$ogImg   = $cover ? abs_url($cover) : '';
$fallbackNote = $isFall ? ($fa ? '— به انگلیسی منتشر شده' : '— published in English') : '';
$backLabel    = $fa ? 'بازگشت به نوشته‌ها' : 'Back to writing';
$faqHeading   = $fa ? '(سؤالات متداول)' : '(Frequently asked questions)';
$homeLabel    = $fa ? 'صفحه اصلی' : 'Home';
?>
<!DOCTYPE html>
<html lang="<?= $locale ?>" dir="<?= $fa ? 'rtl' : 'ltr' ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= esc($title) ?> — <?= $siteName ?></title>
<meta name="description" content="<?= esc(mb_substr($excerpt, 0, 160)) ?>">
<link rel="canonical" href="<?= esc($url) ?>">
<link rel="alternate" hreflang="en" href="<?= esc($urlEn) ?>">
<link rel="alternate" hreflang="fa" href="<?= esc($urlFa) ?>">
<link rel="alternate" hreflang="x-default" href="<?= esc($urlEn) ?>">
<?php if ($ogImg): ?>
<link rel="image_src" href="<?= esc($ogImg) ?>">
<?php endif; ?>
<meta property="og:site_name" content="<?= $siteName ?>">
<meta property="og:type" content="article">
<meta property="og:title" content="<?= esc($title) ?>">
<meta property="og:description" content="<?= esc($excerpt) ?>">
<meta property="og:url" content="<?= esc($url) ?>">
<meta property="og:locale" content="<?= $fa ? 'fa_IR' : 'en_US' ?>">
<?php if ($ogImg): ?>
<meta property="og:image" content="<?= esc($ogImg) ?>">
<?php endif; ?>
<?php if ($date): ?>
<meta property="article:published_time" content="<?= esc($date) ?>">
<?php endif; ?>
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<?= esc($title) ?>">
<meta name="twitter:description" content="<?= esc($excerpt) ?>">
<?php if ($ogImg): ?>
<meta name="twitter:image" content="<?= esc($ogImg) ?>">
<?php endif; ?>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@400..800&family=Noto+Kufi+Arabic:wght@100..900&family=JetBrains+Mono:wght@400;700&family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
<script type="application/ld+json">
<?= json_encode([
    '@context' => 'https://schema.org',
    '@type' => 'Article',
    'headline' => $title,
    'description' => $excerpt,
    'url' => $url,
    'datePublished' => $date ?: null,
    'inLanguage' => $locale,
    'mainEntityOfPage' => $url,
    'image' => $ogImg ?: null,
    'author' => ['@type' => 'Person', 'name' => 'Omid Ghadamgahi', 'url' => 'https://sinisteroid.ir/en/'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
</script>
<style>
:root{--bg:#0a0a0b;--panel:#131315;--line:rgba(237,236,230,.09);--ink:#edece6;--muted:#8b8b82;--accent:#d9ff3f;--warn:#fb923c;--topbar:rgba(10,10,11,.75);--panel40:rgba(19,19,21,.4);--panel60:rgba(19,19,21,.6)}
html[data-theme=light]{--bg:#f4f2ec;--panel:#eae7dd;--line:rgba(22,22,26,.12);--ink:#17171b;--muted:#60605a;--accent:#65a30d;--topbar:rgba(244,242,236,.78);--panel40:rgba(234,231,221,.55);--panel60:rgba(234,231,221,.6);color-scheme:light}
*{box-sizing:border-box;margin:0;padding:0}
html{color-scheme:dark}
body{background:var(--bg);color:var(--ink);font-family:<?= $fa ? "'Vazirmatn',Tahoma,'Space Grotesk'" : "'Space Grotesk'" ?>,ui-sans-serif,system-ui,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
::selection{background:var(--accent);color:var(--bg)}
.mono{font-family:'JetBrains Mono',ui-monospace,monospace}
.wrap{max-width:48rem;margin:0 auto;padding:2.5rem 1rem 4rem}
@media(min-width:640px){.wrap{padding:4rem 1rem 6rem}}
.topbar{position:sticky;top:0;z-index:50;border-bottom:1px solid var(--line);background:var(--topbar);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:transform .3s ease}
body.nav-hidden .topbar{transform:translateY(-100%)}
.topbar-in{max-width:72rem;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:1rem}
.brand{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:.875rem;letter-spacing:-.01em}
.brand b{color:var(--accent);font-weight:400;padding:0 .1em}
.brand-site{margin-inline-start:.5rem;font-family:'JetBrains Mono',monospace;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:400}
@media(max-width:639px){.brand-site{display:none}}
/* ── Desktop nav (identical to the Next.js app navbar) — hidden below md ── */
.dnav{display:none;align-items:center;gap:1.5rem;list-style:none;font-family:'JetBrains Mono',monospace;font-size:.68rem;text-transform:uppercase;letter-spacing:.15em;color:var(--muted)}
.dnav a{transition:color .2s}
.dnav a:hover{color:var(--accent)}
.dnav .idx{color:var(--muted);margin-inline-end:.25rem}
.dnav .lang{margin-inline-start:.5rem;padding-inline-start:1rem;border-inline-start:1px solid var(--line);font-weight:700;color:var(--accent)}
@media(min-width:768px){.topbar-in .dnav{display:flex}.topbar-in .mnav-btn{display:none}}
/* theme toggle (CSS picks the icon from data-theme; no flash, both SVGs in HTML) */
.theme-btn{display:inline-flex;min-width:44px;min-height:44px;align-items:center;justify-content:center;background:none;border:0;color:var(--muted);cursor:pointer;transition:color .2s;padding:0}
.theme-btn:hover{color:var(--accent)}
.theme-btn svg{line-height:0}
.icon-sun,.icon-moon{display:none}
html:not([data-theme=light]) .icon-sun{display:inline-flex}
html[data-theme=light] .icon-moon{display:inline-flex}
/* custom arrows */
.arr-back,.arr-fwd{flex-shrink:0}
.arr-back{transform:rotate(180deg)}
[dir=rtl] .arr-back{transform:none}
[dir=rtl] .arr-fwd{transform:scaleX(-1)}
.navlink{font-family:'JetBrains Mono',monospace;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);transition:color .2s}
.navlink:hover{color:var(--accent)}
/* hamburger (always available while reading a post) */
.mnav-btn{display:flex;min-width:44px;min-height:44px;align-items:center;justify-content:center;gap:.5rem;background:none;border:0;font-family:'JetBrains Mono',monospace;font-size:.68rem;text-transform:uppercase;letter-spacing:.15em;color:var(--muted);cursor:pointer;transition:color .2s}
.mnav-btn:hover{color:var(--accent)}
.burger{position:relative;width:1rem;height:.75rem;flex-shrink:0}
.burger span{position:absolute;left:0;right:0;height:1px;background:currentColor;transition:transform .3s,opacity .2s}
.burger span:nth-child(1){top:0}
.burger span:nth-child(2){top:50%;transform:translateY(-50%)}
.burger span:nth-child(3){bottom:0}
body.menu-open .burger span:nth-child(1){transform:translateY(6px) rotate(45deg)}
body.menu-open .burger span:nth-child(2){opacity:0}
body.menu-open .burger span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
.mpanel{overflow:hidden;max-height:0;opacity:0;border-top-width:0;border-top-style:solid;border-top-color:transparent;transition:max-height .3s ease-out,opacity .3s ease-out,border-top-color .3s,border-top-width .3s}
body.menu-open .mpanel{max-height:60vh;opacity:1;border-top-width:1px;border-top-color:var(--line)}
.mpanel ul{list-style:none;margin:0 auto;max-width:72rem;padding:.75rem 1rem;display:flex;flex-direction:column;font-family:'JetBrains Mono',monospace;font-size:.72rem;text-transform:uppercase;letter-spacing:.15em;color:var(--muted)}
.mpanel a{display:flex;gap:.75rem;padding:.9rem 0;border-bottom:1px solid rgba(237,236,230,.05);color:inherit;transition:color .2s}
.mpanel li:last-child a{border-bottom:0}
.mpanel a:hover{color:var(--accent)}
.mpanel .idx{color:var(--muted)}
.mpanel .lang{color:var(--accent);font-weight:700}
.back{display:inline-flex;align-items:center;gap:.5rem;font-family:'JetBrains Mono',monospace;font-size:.72rem;text-transform:uppercase;letter-spacing:.18em;color:var(--muted);transition:color .2s}
.back:hover{color:var(--accent)}
.date{display:block;margin-top:2rem;font-family:'JetBrains Mono',monospace;font-size:.72rem;letter-spacing:.2em;color:var(--accent)}
h1.title{margin-top:.5rem;font-family:'Syne','Space Grotesk',sans-serif;font-size:clamp(1.875rem,5vw,2.25rem);font-weight:700;line-height:1.15}
[dir=rtl] .title{font-family:'Noto Kufi Arabic','Vazirmatn',Tahoma,sans-serif}
.excerpt{margin-top:1rem;font-size:1.125rem;color:var(--muted);line-height:1.7}
.fallnote{display:inline-block;margin-top:1rem;padding:.25rem .75rem;border:1px solid var(--line);font-family:'JetBrains Mono',monospace;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.tags{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.25rem}
.tag{background:var(--panel);padding:.125rem .75rem;font-family:'JetBrains Mono',monospace;font-size:.75rem;color:var(--muted)}
.cover{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border:1px solid var(--line);margin-top:2rem}
.body{margin-top:2.5rem;display:flex;flex-direction:column;gap:1.25rem}
.body p{color:var(--muted);line-height:1.75}
/* headings */
.pp-h2{display:flex;align-items:baseline;gap:.75rem;margin:3rem 0 1.25rem;padding-bottom:.75rem;border-bottom:1px solid var(--line);font-size:clamp(1.25rem,3vw,1.5rem);font-weight:700;color:var(--ink)}
.pp-h3{display:flex;align-items:baseline;gap:.5rem;margin:2.5rem 0 .75rem;font-size:1.125rem;font-weight:600;color:var(--ink)}
.pp-h4{display:flex;align-items:baseline;gap:.5rem;margin:2rem 0 .5rem;font-weight:600;color:var(--ink)}
.pp-mk,.pp-mk2{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--accent);flex-shrink:0}
.pp-mk{font-size:.875rem}.pp-mk2{font-size:.72rem}
/* lead paragraph */
p.pp-lead{border-inline-start:2px solid var(--accent);padding-inline-start:1.25rem;font-size:1.125rem;color:var(--ink)!important}
@media(min-width:640px){p.pp-lead{font-size:1.25rem}}
/* lists */
ul.pp-ul,ol.pp-ol{list-style:none;margin-bottom:.5rem}
ul.pp-ul li{display:flex;gap:.875rem;margin-bottom:.75rem}
ul.pp-ul li>span:last-child{color:var(--muted);line-height:1.7}
.pp-bullet{flex-shrink:0;margin-top:.55em;width:.375rem;height:.375rem;background:var(--accent);transform:rotate(45deg)}
ol.pp-ol li{display:flex;gap:1rem;margin-bottom:.75rem}
ol.pp-ol li>span:last-child{color:var(--muted);line-height:1.7}
.pp-olnum{flex-shrink:0;padding-top:.125rem;font-family:'JetBrains Mono',monospace;font-size:.72rem;font-weight:700;letter-spacing:.18em;color:var(--accent)}
</style>
<style>
/* highlight / quote / alert / cta */
.pp-hl{margin:1rem 0;padding:1.25rem;border:1px solid rgba(217,255,63,.4);background:var(--panel60);box-shadow:0 0 24px rgba(217,255,63,.08)}
.pp-hl-label{margin-bottom:.5rem;font-family:'JetBrains Mono',monospace;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:var(--accent)}
.pp-hl p{color:var(--ink)!important}
.pp-quote{position:relative;margin:1rem 0;padding:1.25rem 3rem 1.25rem;border-inline-start:2px solid var(--accent);background:var(--panel40);font-style:italic;color:var(--ink)}
[dir=rtl] .pp-quote{padding:1.25rem}
.pp-q-mark{position:absolute;inset-inline-start:1rem;top:.75rem;font-family:'JetBrains Mono',monospace;font-size:2.5rem;line-height:1;color:var(--accent)}
.pp-q-author{margin-top:.75rem;font-family:'JetBrains Mono',monospace;font-size:.72rem;font-style:normal;letter-spacing:.18em;color:var(--muted)}
.pp-alert{margin:1rem 0;padding:1.25rem;border:1px solid var(--line);background:var(--panel60)}
.pp-alert-w{border-color:rgba(251,146,60,.6);background:rgba(251,146,60,.06)}
.pp-alert-t{border-color:rgba(217,255,63,.5);background:rgba(217,255,63,.04)}
.pp-alert-i{border-style:dashed}
.pp-alert-ttl{display:flex;align-items:center;gap:.625rem;margin-bottom:.75rem}
.pp-alert-glyph{display:inline-flex;align-items:center;justify-content:center;width:1.25rem;height:1.25rem;border:1px solid;font-family:'JetBrains Mono',monospace;font-size:.72rem;font-weight:700;flex-shrink:0}
span.pp-alert-ttl span:last-child,span.pp-alert-glyph{font-size:.72rem}
.pp-alert-ttl span:last-child{font-family:'JetBrains Mono',monospace;font-weight:700;text-transform:uppercase;letter-spacing:.18em}
.pp-alert-w .pp-alert-ttl span:last-child,.pp-alert-w.pp-alert-glyph{color:var(--warn)}
.pp-alert-t .pp-alert-ttl span:last-child,.pp-alert-t.pp-alert-glyph{color:var(--accent)}
.pp-alert-i .pp-alert-ttl span:last-child,.pp-alert-i.pp-alert-glyph{color:var(--muted);border-color:var(--muted)}
.pp-cta{position:relative;margin:1rem 0;padding:1.75rem;border:1px dashed rgba(217,255,63,.4);background:var(--panel60);text-align:center}
.pp-cta-title{font-size:1.125rem;font-weight:700;color:var(--ink)}
.pp-cta-text{max-width:42rem;margin:.5rem auto 0!important;font-size:.875rem!important}
.pp-btn{display:inline-flex;align-items:center;gap:.5rem;margin-top:1.25rem;padding:.625rem 1.5rem;border:1px solid var(--accent);font-family:'JetBrains Mono',monospace;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:var(--accent);transition:all .2s}
.pp-btn:hover{background:var(--accent);color:#0a0a0b}
/* figures */
.pp-fig{margin:1rem 0}
.pp-fig-frame{padding:.375rem;border:1px solid var(--line);background:var(--panel)}
.pp-fig-frame img{width:100%;height:auto;display:block}
.pp-cap{margin-top:.75rem;text-align:center;font-family:'JetBrains Mono',monospace;font-size:.72rem;color:var(--muted)}
.pp-cap-fig{color:var(--accent)}
/* code */
.pp-code{overflow:hidden;border:1px solid var(--line);border-radius:.5rem;background:var(--panel);margin:1rem 0}
.pp-code-bar{display:flex;align-items:center;gap:.375rem;padding:.625rem 1rem;border-bottom:1px solid var(--line)}
.pp-dot{width:.625rem;height:.625rem;border-radius:50%}
.pp-d1{background:rgba(251,146,60,.7)}.pp-d2{background:rgba(125,125,116,.4)}.pp-d3{background:rgba(217,255,63,.7)}
.pp-code-sh{margin-inline-start:auto;font-family:'JetBrains Mono',monospace;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.pp-code pre{overflow-x:auto;padding:1rem}
.pp-code code{font-family:'JetBrains Mono',monospace;font-size:.75rem;line-height:1.7;color:var(--muted)}
/* table */
.pp-tablewrap{overflow-x:auto;margin:1rem 0}
.pp-table{width:100%;border-collapse:collapse;font-size:.875rem;border:1px solid var(--line)}
.pp-table th{background:var(--panel);padding:.5rem .75rem;border:1px solid var(--line);text-align:start;font-family:'JetBrains Mono',monospace;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--accent)}
.pp-table td{padding:.5rem .75rem;border:1px solid var(--line);color:var(--muted)}
.pp-table tbody tr:nth-child(odd){background:var(--panel40)}
/* stats */
.pp-stats{display:grid;grid-template-columns:1fr;gap:1px;margin:1rem 0;border:1px solid var(--line);background:var(--line)}
@media(min-width:640px){.pp-stats.c2{grid-template-columns:repeat(2,1fr)}.pp-stats.c4{grid-template-columns:repeat(4,1fr)}.pp-stats.c3{grid-template-columns:repeat(3,1fr)}}
.pp-stat{position:relative;background:var(--panel);padding:1.25rem}
.pp-stat::before{content:'';position:absolute;inset-inline-start:0;top:0;width:2rem;height:2px;background:var(--accent)}
.pp-stat-v{font-family:'JetBrains Mono',monospace;font-size:1.5rem;font-weight:700;color:var(--accent)!important}
.pp-stat-l{margin-top:.5rem!important;font-size:.875rem!important}
/* faq + footer */
.faq{margin-top:4rem;padding-top:2.5rem;border-top:1px solid var(--line)}
.faq h2{font-family:'JetBrains Mono',monospace;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:2rem}
/* dropdown FAQ items (native details/summary) */
.faq-item{border:1px solid var(--line);background:var(--panel40)}
.faq-item+.faq-item{margin-top:.75rem}
.faq-item summary{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem;cursor:pointer;list-style:none;-webkit-user-select:none;user-select:none;font-weight:600;color:var(--accent);transition:color .2s}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item summary:hover{color:var(--ink)}
.faq-x{position:relative;flex-shrink:0;width:.75rem;height:.75rem;margin-top:.15em;transition:transform .3s}
.faq-x::before,.faq-x::after{content:'';position:absolute;background:currentColor}
.faq-x::before{left:0;right:0;top:50%;height:1px;transform:translateY(-50%)}
.faq-x::after{top:0;bottom:0;left:50%;width:1px;transform:translateX(-50%)}
.faq-item[open] .faq-x{transform:rotate(45deg)}
.faq-item>p{margin:0!important;padding:1rem;border-top:1px solid var(--line);color:var(--muted);line-height:1.75;text-align:justify;text-align-last:start}
.pagefoot{display:flex;justify-content:space-between;align-items:center;margin-top:4rem;padding-top:1.5rem;border-top:1px solid var(--line);flex-wrap:wrap;gap:1rem}
/* ---------- Reading comfort ---------- */
strong,b{color:var(--ink);font-weight:600}
h1.title,h2.pp-h2,h3.pp-h3,h2.pp-h2 span:last-child{text-wrap:balance;overflow-wrap:break-word}
.body p{text-wrap:pretty}
/* Justified text at every viewport width */
.body p,.pp-ul li>span:last-child,.pp-ol li>span:last-child,.excerpt{text-align:justify;text-align-last:start;text-justify:inter-word;hyphens:auto;-webkit-hyphens:auto;overflow-wrap:break-word}
/* Inline code chips inside paragraphs */
p code{font-family:'JetBrains Mono',monospace;font-size:.85em;color:var(--accent);background:var(--panel);border:1px solid var(--line);padding:.1em .35em;word-break:break-word}
</style>


</head>
<body>
<header class="topbar" id="topbar">
  <div class="topbar-in">
    <a class="brand" href="/<?= $locale ?>/">O<b>—</b>G<span class="brand-site">/ sinisteroid.ir</span></a>
    <ul class="dnav">
      <?php
      foreach ($navItems = ($fa
        ? ['شروع', 'سوابق', 'مهارت‌ها', 'تحصیلات', 'نمونه‌کارها', 'نوشته‌ها']
        : ['Index', 'Work', 'Skills', 'Education', 'Showcase', 'Writing']) as $ni => $navLabel):
        $navPaths = ['', '/work/', '/skills/', '/education/', '/showcase/', '/blog/'];
        $idx = str_pad((string)($ni + 1), 2, '0', STR_PAD_LEFT);
      ?>
      <li><a href="/<?= $locale . $navPaths[$ni] ?>"><span class="idx"><?= $idx ?></span><?= esc($navLabel) ?></a></li>
      <?php endforeach; ?>
      <li><a class="lang" href="/<?= $fa ? 'en' : 'fa' ?>/"><?= $fa ? 'EN' : 'فا' ?></a></li>
      <li>
        <button type="button" class="theme-btn" id="themeBtn" aria-label="<?= $fa ? 'تغییر حالت روشن/تیره' : 'Toggle light/dark mode' ?>">
          <span class="icon-sun" aria-hidden="true"><?= svg_sun() ?></span>
          <span class="icon-moon" aria-hidden="true"><?= svg_moon() ?></span>
        </button>
      </li>
    </ul>
    <button type="button" class="mnav-btn" id="menuBtn" aria-expanded="false" aria-controls="mobileNav">
      <span class="burger" aria-hidden="true"><span></span><span></span><span></span></span>
      <span class="mlabel" data-open="<?= $fa ? 'منو' : 'Menu' ?>" data-close="<?= $fa ? 'بستن' : 'Close' ?>"><?= $fa ? 'منو' : 'Menu' ?></span>
    </button>
  </div>
  <div class="mpanel" id="mobileNav">
    <ul>
      <?php
      $navItems = $fa
        ? ['شروع', 'سوابق', 'مهارت‌ها', 'تحصیلات', 'نمونه‌کارها', 'نوشته‌ها']
        : ['Index', 'Work', 'Skills', 'Education', 'Showcase', 'Writing'];
      $navPaths = ['', '/work/', '/skills/', '/education/', '/showcase/', '/blog/'];
      foreach ($navItems as $ni => $navLabel):
        $idx = str_pad((string)($ni + 1), 2, '0', STR_PAD_LEFT);
      ?>
      <li><a href="/<?= $locale . $navPaths[$ni] ?>"><span class="idx"><?= $idx ?></span><?= esc($navLabel) ?></a></li>
      <?php endforeach; ?>
      <li><a class="lang" href="/<?= $fa ? 'en' : 'fa' ?>/"><?= $fa ? 'English version' : 'نسخه فارسی' ?></a></li>
    </ul>
  </div>
</header>
<script>
(function(){
  /* mobile menu */
  var btn=document.getElementById('menuBtn'),panel=document.getElementById('mobileNav');
  if(btn&&panel){
    btn.addEventListener('click',function(){
      var open=document.body.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded',open?'true':'false');
      var lbl=btn.querySelector('.mlabel');
      if(lbl)lbl.textContent=open?lbl.getAttribute('data-close'):lbl.getAttribute('data-open');
    });
  }
  /* theme toggle — persists and matches the static site's key */
  var tb=document.getElementById('themeBtn');
  if(tb)tb.addEventListener('click',function(){
    var next=document.documentElement.getAttribute('data-theme')==='light'?'dark':'light';
    document.documentElement.setAttribute('data-theme',next);
    try{localStorage.setItem('theme',next)}catch(e){}
  });
  /* auto-hide: tuck away scrolling down, return scrolling up */
  var lastY=window.scrollY,ticking=false;
  window.addEventListener('scroll',function(){
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(function(){
      ticking=false;
      var y=window.scrollY;
      document.body.classList.toggle('nav-hidden',y>lastY&&y>140&&!document.body.classList.contains('menu-open'));
      lastY=y;
    });
  },{passive:true});
})();
</script>

<main class="wrap">
  <article>
    <a class="back" href="/<?= $locale ?>/blog/"><?= svg_arrow(true) ?><?= esc($backLabel) ?></a>

    <time class="date" datetime="<?= esc($date) ?>" dir="ltr"><?= esc($date) ?></time>
    <h1 class="title"><?= esc($title) ?></h1>
    <p class="excerpt"><?= esc($excerpt) ?></p>

    <?php if ($fallbackNote): ?><p><span class="fallnote"><?= esc($fallbackNote) ?></span></p><?php endif; ?>

    <?php if ($tagsArr): ?>
    <div class="tags">
      <?php foreach ($tagsArr as $tag): ?><span class="tag">#<?= esc($tag) ?></span><?php endforeach; ?>
    </div>
    <?php endif; ?>

    <?php if ($cover): ?>
    <img class="cover" src="<?= esc($cover) ?>" alt="">
    <?php endif; ?>

    <div class="body">
      <?= render_blocks($blocks, $locale) ?>
    </div>

    <?php if ($faq): ?>
    <section class="faq">
      <h2><?= esc($faqHeading) ?></h2>
      <?php foreach ($faq as $item): ?>
      <details class="faq-item">
        <summary>
          <span><?= esc($item['question'] ?? '') ?></span>
          <span class="faq-x" aria-hidden="true"></span>
        </summary>
        <p><?= nl2br(esc($item['answer'] ?? '')) ?></p>
      </details>
      <?php endforeach; ?>
    </section>
    <?php endif; ?>

    <footer class="pagefoot">
      <a class="back" href="/<?= $locale ?>/blog/"><?= svg_arrow(true) ?><?= esc($backLabel) ?></a>
      <a class="navlink" href="/<?= $locale ?>/"><?= $homeLabel ?> <?= svg_arrow() ?></a>
    </footer>
  </article>
</main>
</body>
</html>
