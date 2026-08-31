<?php
// Simple DB connection helper. Reads `config.php` (not checked in) or falls back to sample.
// Note: do not set a global Content-Type here — callers decide their response type.
// SECURITY: no Access-Control-Allow-Origin header on purpose. The frontend is
// same-origin with the API, so CORS is unnecessary — a wildcard header would
// let any third-party website read API responses from a visitor's browser.

// Load config
$configLoaded = false;
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
    $configLoaded = true;
} else {
    // Dev-only fallback: sample credentials never connect to a real DB, and
    // isAdminAuthenticated() refuses to authenticate without a real config.
    require_once __DIR__ . '/config.sample.php';
}

/**
 * Shared helper: is the requester the admin (HTTP Basic Auth against the
 * config.php credentials)? Used by the read endpoints to decide whether
 * draft posts may be exposed. Supports both a plaintext ADMIN_PASS (legacy)
 * and a bcrypt/argon ADMIN_PASS_HASH (preferred — see config.sample.php).
 */
function isAdminAuthenticated(): bool
{
    if (empty($GLOBALS['configLoaded'])) {
        return false; // no real config.php → never treat the caller as admin
    }
    $user = (string)($_SERVER['PHP_AUTH_USER'] ?? '');
    $pass = (string)($_SERVER['PHP_AUTH_PW'] ?? '');
    if (!defined('ADMIN_USER') || $user === '' || $pass === '') {
        return false;
    }
    if (!hash_equals((string)ADMIN_USER, $user)) {
        return false;
    }
    if (defined('ADMIN_PASS_HASH')) {
        return password_verify($pass, (string)ADMIN_PASS_HASH);
    }
    if (!defined('ADMIN_PASS')) {
        return false;
    }
    return hash_equals((string)ADMIN_PASS, $pass);
}

try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_NAME),
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (Exception $e) {
    // SECURITY: log the details server-side only — echoing $e->getMessage()
    // used to expose the DB host/schema to any visitor.
    error_log('[sinisteroid] DB connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed"]);
    exit;
}

// Helper to output JSON and exit
function jsonResponse($data)
{
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

?>
