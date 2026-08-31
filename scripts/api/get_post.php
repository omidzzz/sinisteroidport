<?php

require_once __DIR__ . '/db.php';
// This endpoint returns JSON
header('Content-Type: application/json; charset=utf-8');

// GET parameter: slug
$slug = isset($_GET['slug']) ? trim($_GET['slug']) : '';
if (!$slug) {
    http_response_code(400);
    jsonResponse(["error" => "Missing slug"]);
}

try {
    // SECURITY: only the authenticated admin may read drafts. Anonymous
    // visitors are restricted to published posts.
    $sql = 'SELECT * FROM posts WHERE slug = :slug';
    $params = ['slug' => $slug];
    if (!isAdminAuthenticated()) {
        $sql .= ' AND status = :status';
        $params['status'] = 'published';
    }
    $sql .= ' LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        jsonResponse(["error" => "Post not found"]);
    }

    // Assume content stored as JSON in `content_json` column
    $post = [
        'slug' => $row['slug'],
        'status' => $row['status'] ?? 'draft',
        'title' => $row['title'],
        'date' => $row['date_published'],
        'tags' => $row['tags'] ? explode(',', $row['tags']) : [],
        'featuredImage' => json_decode($row['featured_image'], true) ?: ['src' => '', 'alt' => ['en' => '', 'fa' => '']],
        'translations' => json_decode($row['content_json'], true) ?: new stdClass(),
    ];

    jsonResponse($post);
} catch (Exception $e) {
    // SECURITY: log details server-side, never echo them to the visitor.
    error_log('[sinisteroid] get_post query failed: ' . $e->getMessage());
    http_response_code(500);
    jsonResponse(["error" => "Query failed"]);
}

?>
