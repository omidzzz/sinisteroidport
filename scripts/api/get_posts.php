<?php

require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $params = [];
    // SECURITY: drafts are only visible to the authenticated admin. The old
    // `?admin=1` query-param shortcut required no auth at all, so ANY visitor
    // could read unpublished posts — it has been removed.
    $statusFilter = isAdminAuthenticated() ? '' : 'WHERE status = :status';
    if ($statusFilter !== '') {
        $params['status'] = 'published';
    }
    // `?limit=N` (clamped 1..50) — the home-page strip renders three cards;
    // without a limit this endpoint shipped every post's full content_json
    // (~475 KiB), and on a cold mobile connection that body landed inside the
    // PSI measurement window, competing with the LCP image for bandwidth.
    // Default (no param) stays "all posts" for the blog index sync.
    $limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 0;
    $stmt = $pdo->prepare(
        "SELECT slug, status, title, date_published AS date, tags, featured_image, content_json FROM posts $statusFilter ORDER BY date_published DESC"
        . ($limit > 0 ? " LIMIT $limit" : "")
    );
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    $posts = array_map(function ($row) {
        return [
            'slug' => $row['slug'],
            'status' => $row['status'] ?? 'draft',
            'title' => $row['title'],
            'date' => $row['date'],
            'tags' => $row['tags'] ? explode(',', $row['tags']) : [],
            'featuredImage' => json_decode($row['featured_image'], true) ?: ['src' => '', 'alt' => ['en' => '', 'fa' => '']],
            'translations' => json_decode($row['content_json'], true) ?: new stdClass(),
        ];
    }, $rows);
    echo json_encode($posts, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    // SECURITY: log details server-side, never echo them to the visitor.
    error_log('[sinisteroid] get_posts query failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Query failed'], JSON_UNESCAPED_UNICODE);
}
