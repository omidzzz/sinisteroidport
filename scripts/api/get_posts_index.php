<?php

// Lightweight post index for the chat widget — same source of truth as
// get_posts.php (the live `posts` table) but returns ONLY compact metadata
// (~200 bytes/post) so the floating assistant can stay current with
// DB-published posts without downloading full article content.
//
// SECURITY: published-only (admin auth NOT accepted here on purpose — the
// widget never needs drafts; it just needs a cheap fresher-than-build index).

require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $stmt = $pdo->prepare(
        "SELECT slug, title, date_published AS date, tags, content_json
         FROM posts WHERE status = 'published'
         ORDER BY date_published DESC LIMIT 25"
    );
    $stmt->execute();
    $rows = $stmt->fetchAll();
    $items = array_map(function ($row) {
        $content = json_decode($row['content_json'], true) ?: new stdClass();
        $en = $content->en ?? new stdClass();
        $fa = $content->fa ?? new stdClass();
        return [
            'slug' => $row['slug'],
            'date' => $row['date'],
            'title' => $row['title'] ?? '',
            'tags' => $row['tags'] ? explode(',', $row['tags']) : [],
            'faTitle' => $fa->title ?? '',
            'enTitle' => $en->title ?? '',
            'enExcerpt' => $en->excerpt ?? '',
            'faExcerpt' => $fa->excerpt ?? '',
        ];
    }, $rows);
    echo json_encode($items, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    // SECURITY: log details server-side, never echo them to the visitor.
    error_log('[sinisteroid] get_posts_index query failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Query failed'], JSON_UNESCAPED_UNICODE);
}