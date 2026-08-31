<?php
// Copy this file to config.php and update values before deploying.
// Place config.php OUTSIDE version control and set strong credentials.
//
// SECURITY NOTES
// --------------
// * ADMIN_PASS: prefer storing only a HASH. Generate one on the server:
//       php -r "echo password_hash('YOUR-STRONG-PASSWORD', PASSWORD_DEFAULT), PHP_EOL;"
//   then define('ADMIN_PASS_HASH', '<the hash>'); and omit ADMIN_PASS
//   entirely. Plain-text ADMIN_PASS still works (legacy) but is discouraged.
// * The MySQL user should have LEAST PRIVILEGE: SELECT/INSERT/UPDATE/DELETE
//   on this one database only — no DROP/ALTER/GRANT, no other databases.
// * Keep automated cPanel backups of this DB: published posts live ONLY in
//   MySQL until the next static export.

// Database
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');

// Admin credentials for Basic Auth (see hash notes above)
define('ADMIN_USER', 'admin');
define('ADMIN_PASS', 'change_me');
// define('ADMIN_PASS_HASH', '$2y$10$...');   // ← preferred over ADMIN_PASS

// Uploads folder (relative to this file)
define('UPLOADS_DIR', __DIR__ . '/uploads');

?>
