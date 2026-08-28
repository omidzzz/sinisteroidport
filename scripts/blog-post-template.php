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
 * THEME: PSIONIC ORBIT // ACID RAVE (v7) — mirrors the React site by
 * linking the compiled Next.js CSS bundle (tokens + all component
 * classes) and reusing the exact same markup class names.
 */

require_once __DIR__ . '/db.php';
header('Content-Type: text/html; charset=utf-8');

function esc($s) {
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

/** Custom monoline arrow (matches src/components/icons.tsx). */
function svg_arrow($back = false) {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15m0 0-6-6m6 6-6 6"/></svg>';
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
        . '<style>body{background:#020503;color:#ecffe9;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}'
        . 'h1{font-size:2rem}p{color:#8fa294}a{color:#b8ff00;text-decoration:none;display:inline-flex;align-items:center;gap:.5rem}</style></head><body>'
        . '<h1>' . esc($title) . '</h1><p>' . esc($msg) . '</p><a href="/' . $locale . '/blog/">' . esc($back) . '</a></body></html>';
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

/* Reading time — mirrors the React post components (words / 210). */
$words = 0;
foreach ($blocks as $b) {
    if (!is_array($b)) continue;
    if (isset($b['text']) && is_string($b['text'])) $words += str_word_count(preg_replace('/\s+/u', ' ', $b['text']));
    if (!empty($b['items']) && is_array($b['items']))
        foreach ($b['items'] as $it) if (is_string($it)) $words += str_word_count($it);
    if (!empty($b['code']) && is_string($b['code'])) $words += (int)(str_word_count($b['code']) / 2);
}
$readMinutes = max(2, (int)round($words / 210));
$readLabel   = ($locale === 'fa') ? "دقیقه مطالعه" : "min read";

$url      = "https://sinisteroid.ir/{$locale}/blog/{$slug}/";
$urlEn    = "https://sinisteroid.ir/en/blog/{$slug}/";
$urlFa    = "https://sinisteroid.ir/fa/blog/{$slug}/";
$siteName = 'Sinisteroid';
$fa       = ($locale === 'fa');

/* ---------- compiled CSS bundle (tokens + component classes) ---------- */
$cssLinks = '';
$cssDir   = __DIR__ . '/../_next/static/css';
if (is_dir($cssDir)) {
    foreach (glob($cssDir . '/*.css') as $cssFile) {
        $cssLinks .= '<link rel="stylesheet" href="/_next/static/css/' . basename($cssFile) . '">' . "\n";
    }
}

/* ---------- block renderer (mirrors src/components/ContentRenderer.tsx) ---------- */

function render_blocks(array $blocks, string $locale): string {
    $html = '';
    $fig = 0;
    foreach ($blocks as $bi => $b) {
        if (!is_array($b)) continue;
        $type = $b['type'] ?? '';
        $text = isset($b['text']) ? esc($b['text']) : '';
        switch ($type) {
            case 'heading':
                $lvl = max(2, min(4, (int)($b['level'] ?? 2)));
                if ($lvl === 2) {
                    $html .= '<h2 id="sec-' . $bi . '" class="pp-h2"><span class="pp-mk">#</span><span>' . $text . '</span></h2>';
                } elseif ($lvl === 3) {
                    $html .= '<h3 id="sec-' . $bi . '" class="pp-h3"><span class="pp-mk2">//</span><span>' . $text . '</span></h3>';
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
$toc = [];
foreach ($blocks as $bi => $b) {
    if (!is_array($b)) continue;
    if (($b['type'] ?? '') !== 'heading') continue;
    $lvl = (int)($b['level'] ?? 2);
    if ($lvl < 2 || $lvl > 3) continue;
    $toc[] = ['id' => 'sec-' . $bi, 'text' => (string)($b['text'] ?? ''), 'level' => $lvl];
}
$tocTitle = $fa ? '(فهرست)' : '(Contents)';

$ogImg   = $cover ? abs_url($cover) : '';
$fallbackNote = $isFall ? ($fa ? '— به انگلیسی منتشر شده' : '— published in English') : '';
$backLabel    = $fa ? 'بازگشت به نوشته‌ها' : 'Back to writing';
$faqHeading   = $fa ? '(سؤالات متداول)' : '(Frequently asked questions)';
$homeLabel    = $fa ? 'صفحه اصلی' : 'Home';
?>
<!DOCTYPE html>
<html lang="<?= $locale ?>" dir="<?= $fa ? 'rtl' : 'ltr' ?>" data-theme="dark">
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
<?= $cssLinks ?>
<script>try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
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
    'author' => ['@type' => 'Person', 'name' => 'Omid', 'url' => 'https://sinisteroid.ir/en/'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
</script>
<style>
/* ── PHP-only chrome (everything else comes from the compiled bundle) ── */
.wrap{max-width:48rem;margin:0 auto;padding:2rem 1rem 4rem}

/* ── Restore the next/font variables the compiled bundle expects ── */
:root{
  --font-orbitron-var:"Orbitron","Orbitron Fallback";
  --font-syne:"Syne","Syne Fallback";
  --font-space-grotesk:"Space Grotesk","Space Grotesk Fallback";
  --font-orbitron:var(--font-orbitron-var),var(--font-syne),var(--font-space-grotesk),ui-sans-serif,system-ui,sans-serif;
  --font-display:var(--font-orbitron),var(--font-syne),var(--font-space-grotesk),ui-sans-serif,system-ui,sans-serif;
  --font-unbounded:"Unbounded","Unbounded Fallback";
  --font-logo:var(--font-unbounded),var(--font-space-grotesk),sans-serif;
  --font-kufi:"Noto Kufi Arabic","Noto Kufi Arabic Fallback";
  --font-vazirmatn:"Vazirmatn","Vazirmatn Fallback";
  --font-jetbrains-mono:"JetBrains Mono","JetBrains Mono Fallback";
  --font-mono:var(--font-jetbrains-mono),ui-monospace,sfmono,monospace;
  --font-sans:var(--font-space-grotesk),ui-sans-serif,system-ui,sans-serif;
}
body{font-family:var(--font-vazirmatn),Tahoma,sans-serif;color:var(--color-ink)}
/* soft nebula glow behind the content instead of flat black */
body::before{content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;background:
  radial-gradient(46rem 30rem at 10% -6%,rgba(var(--rgb-acid),.11),transparent 60%),
  radial-gradient(52rem 36rem at 104% 112%,rgba(var(--rgb-accent),.10),transparent 60%),
  radial-gradient(30rem 24rem at 88% 12%,rgba(var(--rgb-acid),.05),transparent 65%)}
/* mini table of contents — mirrors the React sticky TOC */
.post-toc{position:fixed;top:7rem;z-index:20;display:none;width:14rem;inset-inline-start:calc((100vw - 48rem)/2 - 15rem)}
@media(min-width:1280px){.post-toc{display:block}}
.post-toc .toc-list{list-style:none;margin:0;padding:0;padding-inline-start:1rem;border-inline-start:1px solid var(--color-line)}
.post-toc .toc-link{display:block;padding:.16rem 0;font-family:var(--font-mono);font-size:.66rem;line-height:1.5;color:var(--color-muted);text-decoration:none;transition:color .2s,transform .2s}
.post-toc .toc-link:hover{color:var(--color-ink)}
.post-toc .toc-link.is-active{color:var(--color-accent);transform:translateX(.25rem)}
[dir="rtl"] .post-toc .toc-link.is-active{transform:translateX(-.25rem)}
.post-toc .toc-sub{padding-inline-start:.75rem}
@media(min-width:640px){.wrap{padding:3rem 1.5rem 5rem}}
.post-kicker{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem;margin-top:2.5rem}
.title{margin:.75rem 0 0;font-family:var(--font-display);font-weight:800;font-size:clamp(1.9rem,5vw,3.1rem);line-height:1.08;letter-spacing:-.01em;color:var(--color-ink);text-wrap:balance;overflow-wrap:break-word}
.pp-lead{margin-bottom:1.6rem;border-inline-start:2px solid var(--color-acid);padding-inline-start:1.1rem;color:var(--color-ink);font-size:1.05rem;line-height:1.8}
.pp-h2,.pp-h3,.pp-h4{scroll-margin-top:5rem;display:flex;align-items:baseline;gap:.6rem;text-wrap:balance;overflow-wrap:break-word}
.pp-h2{margin:2.6rem 0 .9rem;padding-bottom:.55rem;border-bottom:1px solid var(--color-line);font-size:1.35rem;font-weight:800;color:var(--color-ink)}
.pp-h3{margin:1.9rem 0 .6rem;font-size:1.1rem;font-weight:700;color:var(--color-ink)}
.pp-h4{margin:1.5rem 0 .5rem;font-weight:700;color:var(--color-ink)}
.pp-mk{font-family:var(--font-mono);font-size:.8em;font-weight:700;color:var(--color-accent)}
.pp-mk2{font-family:var(--font-mono);font-size:.75em;font-weight:700;color:var(--color-accent)}
.pp-fig,.pp-code,.pp-cta,.pp-hl,.pp-alert{margin-block:1.5rem}
.pp-fig-frame{position:relative;overflow:hidden;border:1px solid var(--color-line);background:var(--color-panel)}
.pp-fig-frame img{display:block;width:100%;height:auto}
.pp-cap{margin-top:.5rem;font-family:var(--font-mono);font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--color-muted)}
.pp-cap-fig{color:var(--color-acid)}
.pp-code{border:1px solid var(--color-line);border-radius:4px;background:rgba(2,8,6,.6);overflow:hidden}
.pp-code-bar{display:flex;align-items:center;gap:.4rem;padding:.45rem .7rem;border-bottom:1px solid var(--color-line)}
.pp-dot{width:8px;height:8px;border-radius:9999px;background:var(--color-line)}
.pp-d1{background:rgba(var(--rgb-acid),.7)}.pp-d2{background:rgba(var(--rgb-accent),.6)}.pp-d3{background:var(--color-line)}
.pp-code-sh{margin-inline-start:auto;font-family:var(--font-mono);font-size:.56rem;letter-spacing:.18em;text-transform:uppercase;color:var(--color-muted)}
.pp-code pre{margin:0;padding:1rem 1.1rem;overflow-x:auto;font-family:var(--font-mono);font-size:.8rem;line-height:1.6;color:var(--color-ink)}
.pp-quote{margin-block:1.5rem;padding:.9rem 1.2rem;border-inline-start:2px solid var(--color-acid);background:rgba(var(--rgb-acid),.05);color:var(--color-ink);font-size:1.02rem;line-height:1.75;text-align:start}
.pp-q-mark{display:block;font-size:1.6rem;line-height:1;color:var(--color-acid);opacity:.7}
.pp-q-author{margin-top:.5rem;font-family:var(--font-mono);font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;color:var(--color-muted)}
.pp-hl{padding:.9rem 1.1rem;border:1px dashed rgba(var(--rgb-acid),.4);background:rgba(var(--rgb-acid),.05)}
.pp-hl-label{font-family:var(--font-mono);font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:var(--color-acid);margin-bottom:.4rem}
.pp-cta{padding:1.2rem 1.3rem;border:1px solid rgba(var(--rgb-acid),.35);background:linear-gradient(155deg,rgba(var(--rgb-acid),.07),rgba(2,8,6,.4) 60%)}
.pp-cta-title{font-family:var(--font-display);font-weight:800;text-transform:uppercase;font-size:1.15rem;color:var(--color-ink);margin-bottom:.4rem}
.pp-btn{display:inline-flex;align-items:center;gap:.5rem;margin-top:.8rem;padding:.5rem 1.05rem;border-radius:9999px;border:1px solid rgba(var(--rgb-acid),.5);font-family:var(--font-mono);font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:var(--color-acid);transition:background .25s,color .25s}
.pp-btn:hover{background:var(--color-acid);color:#04110a}
.pp-stats{display:grid;gap:.8rem;grid-template-columns:repeat(2,1fr)}
@media(min-width:640px){.pp-stats.c3{grid-template-columns:repeat(3,1fr)}.pp-stats.c4{grid-template-columns:repeat(4,1fr)}}
.pp-stat{padding:.9rem 1rem;border:1px solid var(--color-line);background:rgba(2,8,6,.35)}
.pp-stat-v{font-family:var(--font-display);font-weight:800;font-size:1.5rem;color:var(--color-acid);line-height:1}
.pp-stat-l{margin-top:.35rem;font-family:var(--font-mono);font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:var(--color-muted)}
.pp-alert{padding:.9rem 1.1rem;border:1px solid var(--color-line);background:rgba(2,8,6,.4)}
.pp-alert-ttl{display:flex;align-items:center;gap:.5rem;font-weight:700;margin-bottom:.35rem}
.pp-alert-glyph{display:inline-grid;place-items:center;width:1.2rem;height:1.2rem;border-radius:9999px;font-family:var(--font-mono);font-size:.7rem;border:1px solid currentColor}
.pp-alert-i{color:var(--color-accent)}.pp-alert-t{color:var(--color-acid)}.pp-alert-w{color:var(--warn)}
.pp-tablewrap{overflow-x:auto;margin-block:1.4rem}
.pp-table{width:100%;border-collapse:collapse;font-size:.85rem}
.pp-table th{font-family:var(--font-mono);font-size:.64rem;letter-spacing:.12em;text-transform:uppercase;color:var(--color-acid);text-align:start;padding:.5rem .7rem;border:1px solid var(--color-line)}
.pp-table td{padding:.5rem .7rem;border:1px solid var(--color-line);color:var(--color-muted)}
.pp-ul,.pp-ol{margin-block:1rem;padding-inline-start:1.4rem;color:var(--color-muted)}
.pp-ul{list-style:none}
.pp-ul li{position:relative;margin-bottom:.45rem;display:flex;gap:.6rem}
.pp-bullet{flex-shrink:0;margin-top:.55em;width:6px;height:6px;rotate:45deg;background:var(--color-acid);box-shadow:0 0 6px rgba(var(--rgb-acid),.6)}
.pp-ol{list-style:none;counter-reset:ppol}
.pp-ol li{counter-increment:ppol;margin-bottom:.5rem;display:flex;gap:.6rem}
.pp-olnum{flex-shrink:0;font-family:var(--font-mono);font-size:.7rem;color:var(--color-acid);padding-top:.25em}
.faq{margin-top:3.5rem;border-top:1px solid var(--color-line);padding-top:2rem}
.faq-head{display:flex;align-items:center;gap:.75rem;margin-bottom:1.6rem}
.faq-item{border:1px solid var(--color-line);background:rgba(2,8,6,.4)}
.faq-item+.faq-item{margin-top:.7rem}
.faq-item summary{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.95rem 1.05rem;cursor:pointer;list-style:none;user-select:none;font-weight:600;color:var(--color-acid)}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item summary:hover{color:var(--color-ink)}
.faq-x{position:relative;flex-shrink:0;width:.7rem;height:.7rem;transition:transform .3s}
.faq-x:before,.faq-x:after{content:'';position:absolute;background:currentColor}
.faq-x:before{left:0;right:0;top:50%;height:1px;transform:translateY(-50%)}
.faq-x:after{top:0;bottom:0;left:50%;width:1px;transform:translateX(-50%)}
.faq-item[open] .faq-x{transform:rotate(45deg)}
.faq-item>p{margin:0;padding:.95rem 1.05rem;border-top:1px solid var(--color-line);color:var(--color-muted);line-height:1.75}
.pagefoot{display:flex;justify-content:space-between;align-items:center;margin-top:3.5rem;padding-top:1.4rem;border-top:1px solid var(--color-line);flex-wrap:wrap;gap:1rem}
.footline{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:.8rem;margin-top:4rem;padding:1.2rem 0 0;border-top:1px solid var(--color-line);font-family:var(--font-mono);font-size:.6rem;letter-spacing:.18em;text-transform:uppercase;color:var(--color-muted)}
.footline b{color:var(--color-acid);font-weight:600}
@media (prefers-reduced-motion: reduce){*{transition:none!important;animation:none!important}}
</style>
</head>
<body>
<div class="reading-progress" aria-hidden="true"></div>

<header>
  <div class="chip-corner chip-start">
    <a href="/<?= $locale ?>/" class="brandlink">
      <span class="relative grid place-items-center" aria-hidden="true"><span class="orbit-pip"></span><span class="nav-dot"></span></span>
      <span dir="ltr" class="font-display font-bold text-[0.92rem] tracking-tight text-ink">SINISTER<span class="text-acid">[OID]</span></span>
    </a>
  </div>

  <div class="dock-wrap">
    <nav class="dock" aria-label="Primary">
      <?php
      $navItems = $fa
        ? ['شروع', 'سوابق', 'مهارت‌ها', 'تحصیلات', 'نمونه‌کارها', 'نوشته‌ها']
        : ['Index', 'Work', 'Skills', 'Education', 'Showcase', 'Writing'];
      $navPaths = ['', '/work/', '/skills/', '/education/', '/showcase/', '/blog/'];
      foreach ($navItems as $ni => $navLabel):
        $idx = str_pad((string)($ni + 1), 2, '0', STR_PAD_LEFT);
        $active = ($ni === 5) ? ' is-active' : '';
      ?>
      <a class="dock-link<?= $active ?>" href="/<?= $locale . $navPaths[$ni] ?>"><span class="dock-index"><?= $idx ?></span><?= esc($navLabel) ?></a>
      <?php endforeach; ?>
      <span class="dock-sep" aria-hidden="true"></span>
      <button type="button" class="icon-toggle" id="themeBtn" aria-label="<?= $fa ? 'تغییر حالت روشن/تیره' : 'Toggle light/dark mode' ?>">
        <span class="icon-sun" aria-hidden="true"><?= svg_sun() ?></span>
        <span class="icon-moon" aria-hidden="true"><?= svg_moon() ?></span>
      </button>
      <a class="dock-link langswap" href="/<?= $fa ? 'en' : 'fa' ?>/blog/<?= $slug ?>/"><?= $fa ? 'EN' : 'فا' ?></a>
    </nav>
  </div>

  <div class="mob-dock md">
    <button type="button" class="mob-pill" id="menuBtn" aria-expanded="false" aria-controls="orbital-nav" aria-haspopup="dialog">
      <span class="mob-burger" aria-hidden="true"><i></i><i></i><i></i></span>
      <span><?= $fa ? 'منو' : 'Menu' ?></span>
    </button>
  </div>

  <div class="overlay-veil md" id="orbital-nav" role="dialog" aria-modal="true" aria-label="Menu">
    <div class="overlay-menu">
      <p class="label mb-6">/ sinisteroid.ir</p>
      <?php foreach ($navItems as $ni => $navLabel): ?>
      <a class="overlay-link" data-off="<?= $ni ?>" href="/<?= $locale . $navPaths[$ni] ?>"><span class="overlay-index me-3"><?= str_pad((string)($ni + 1), 2, '0', STR_PAD_LEFT) ?></span><?= esc($navLabel) ?></a>
      <?php endforeach; ?>
      <div class="mt-8 flex items-center gap-4 font-mono text-xs uppercase tracking-widest text-muted">
        <a class="langswap" href="/<?= $fa ? 'en' : 'fa' ?>/blog/<?= $slug ?>/"><?= $fa ? 'EN' : 'فا' ?></a>
        <span class="h-px w-8 bg-line" aria-hidden="true"></span>
        <span><?= $fa ? 'تهران، ایران' : 'Tehran, Iran' ?></span>
<a class="donate-inline" href="https://donatr.ee/sinisteroid/" target="_blank" rel="noopener noreferrer" style="color:var(--color-acid)">♥ <?= $fa ? 'حمایت' : 'donate' ?></a>
      </div>
    </div>
  </div>
</header>

<script>
(function(){
  /* theme toggle — same storage key as the React site */
  var tb=document.getElementById('themeBtn');
  if(tb)tb.addEventListener('click',function(){
    var next=document.documentElement.getAttribute('data-theme')==='light'?'dark':'light';
    document.documentElement.setAttribute('data-theme',next);
    try{localStorage.setItem('theme',next)}catch(e){}
  });
  /* mobile orbital overlay */
  var btn=document.getElementById('menuBtn'),panel=document.getElementById('orbital-nav');
  function close(){panel.classList.remove('is-open');btn.setAttribute('aria-expanded','false');document.documentElement.style.overflow='';}
  if(btn&&panel){
    btn.addEventListener('click',function(){
      var open=!panel.classList.contains('is-open');
      panel.classList.toggle('is-open',open);
      btn.setAttribute('aria-expanded',open?'true':'false');
      document.documentElement.style.overflow=open?'hidden':'';
    });
    window.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
  }
  /* reading progress (rAF fallback; browsers with scroll timelines use CSS) */
  var bar=document.querySelector('.reading-progress');
  if(bar && !(window.CSS&&CSS.supports&&CSS.supports('animation-timeline: scroll()'))){
    var raf=0;
    var upd=function(){raf=0;var max=document.documentElement.scrollHeight-window.innerHeight;bar.style.setProperty('--progress',max>0?String(Math.min(window.scrollY/max,1)):'0');};
    window.addEventListener('scroll',function(){if(!raf)raf=requestAnimationFrame(upd);},{passive:true});
    upd();
  }
/* mini TOC scroll-spy — highlight the heading currently in view */
  var tocLinks=[].slice.call(document.querySelectorAll('.post-toc .toc-link'));
  if(tocLinks.length>=3 && 'IntersectionObserver' in window){
    var tocMap={};
    tocLinks.forEach(function(a){tocMap[a.getAttribute('href').slice(1)]=a});
    var tocObs=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting){
          var id=e.target.id;
          tocLinks.forEach(function(a){a.classList.toggle('is-active',a.getAttribute('href')==='#'+id)});
        }
      });
    },{rootMargin:'-90px 0px -70% 0px'});
    Object.keys(tocMap).forEach(function(id){var el=document.getElementById(id);if(el)tocObs.observe(el);});
  }
})();
</script>

<main class="wrap">
<?php if (count($toc) >= 3): ?>
  <nav class="post-toc" aria-label="<?= esc($tocTitle) ?>" dir="<?= $fa ? 'rtl' : 'ltr' ?>">
    <p class="label mb-3"><?= esc($tocTitle) ?></p>
    <ul class="toc-list">
      <?php foreach ($toc as $h): ?>
      <li><a class="toc-link<?= $h['level'] === 3 ? ' toc-sub' : '' ?>" href="#<?= $h['id'] ?>"><?= esc($h['text']) ?></a></li>
      <?php endforeach; ?>
    </ul>
  </nav>
  <?php endif; ?>
  <article>
    <a class="post-back group" href="/<?= $locale ?>/blog/"><?= svg_arrow(true) ?><?= esc($backLabel) ?></a>

    <div class="post-kicker">
      <span class="live-dot" aria-hidden="true"></span>
      <span class="label"><?= $fa ? '(فرستنده)' : '(Transmission)' ?></span>
      <span class="h-px w-8 bg-line" aria-hidden="true"></span>
      <time class="font-mono text-xs tracking-[0.2em] text-acid" datetime="<?= esc($date) ?>" dir="ltr"><?= esc($date) ?></time>
      <span class="label">· <?= $readMinutes ?> <?= $readLabel ?></span>
    </div>

    <h1 class="title anaglyph-strong"><?= esc($title) ?></h1>

    <?php if ($excerpt): ?>
    <aside class="post-tldr mt-6"><span class="label mb-2 block">(TL;DR)</span><?= nl2br(esc($excerpt)) ?></aside>
    <?php endif; ?>

    <?php if ($fallbackNote): ?><p class="label mt-4 inline-block border border-line px-3 py-1"><?= esc($fallbackNote) ?></p><?php endif; ?>

    <?php if ($tagsArr): ?>
    <div class="mt-5 flex flex-wrap gap-2">
      <?php foreach ($tagsArr as $tag): ?><span class="bento-tag">#<?= esc($tag) ?></span><?php endforeach; ?>
    </div>
    <?php endif; ?>

    <?php if ($cover): ?>
    <div class="post-cover mt-9"><img class="post-cover-img" src="<?= esc($cover) ?>" alt="" loading="lazy" decoding="async"><span aria-hidden="true" class="post-cover-scan"></span></div>
    <?php endif; ?>

    <div class="mt-12 prose-post">
      <?= render_blocks($blocks, $locale) ?>
    </div>

    <?php if ($faq): ?>
    <section class="faq">
      <div class="faq-head">
        <span class="sig-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
        <h2 class="label"><?= esc($faqHeading) ?></h2>
      </div>
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

    <div class="pagefoot">
      <a class="post-back group" href="/<?= $locale ?>/blog/"><?= svg_arrow(true) ?><?= esc($backLabel) ?></a>
      <a class="post-back group" href="/<?= $locale ?>/"><?= esc($homeLabel) ?> <?= svg_arrow() ?></a>
    </div>
  </article>
</main>

<footer>
  <div class="wrap footline">
    <span>© <?= date('Y') ?> <?= $fa ? 'امید — تهران، ایران' : 'Omid — Tehran, Iran' ?></span>
<a class="donate-inline" href="https://donatr.ee/sinisteroid/" target="_blank" rel="noopener noreferrer" style="color:var(--color-acid)">♥ <?= $fa ? 'حمایت' : 'DONATE' ?></a>
    <span dir="ltr"><b>SIG.OK</b> ▸ VOID-FREE</span>
  </div>
</footer>
</body>
</html>
