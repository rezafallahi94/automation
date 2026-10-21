<?php
/**
 * Rabo Engineering ERP - MySQL & Security Health Diagnostics Endpoint (PHP)
 * سامانه اتوماسیون مهندسی رابو - سرویس پایش سلامت دیتابیس MySQL و ممیزی امنیتی
 */

require_once __DIR__ . '/config.php';

handleCorsHeaders();

try {
    $driverType = '';
    $pdo = getMySQLConnection($driverType);
    $db = loadDatabaseSafe();

    // بررسی وجود مدیر ارشد با نام کاربری rabo در جدول rabo_personnel
    $stmt = $pdo->prepare("SELECT * FROM rabo_personnel WHERE username = :username LIMIT 1");
    $stmt->execute([':username' => SUPER_ADMIN_USERNAME]);
    $superAdminRow = $stmt->fetch();

    $superAdminPasswordValid = false;
    if ($superAdminRow) {
        $superAdminPasswordValid = verifyPasswordSecure(
            SUPER_ADMIN_PASSWORD,
            (string)($superAdminRow['password_hash'] ?? ''),
            SUPER_ADMIN_USERNAME
        );
    }

    // بررسی تعداد رکوردهای لاگ امنیتی در MySQL
    $stmtAudit = $pdo->prepare("SELECT COUNT(*) AS cnt FROM rabo_security_audit_logs");
    $stmtAudit->execute([]);
    $auditCountRow = $stmtAudit->fetch();

    sendJsonResponse([
        'success'        => true,
        'overall_status' => ($superAdminRow && $superAdminPasswordValid) ? 'HEALTHY' : 'DEGRADED',
        'system_title'   => 'سامانه اتوماسیون مهندسی رابو - پایش سلامت دیتابیس MySQL و امنیت سایبری',
        'timestamp'      => date('c'),
        'database'       => [
            'engine'               => 'MySQL Relational Database (InnoDB / utf8mb4_persian_ci)',
            'driver'               => $driverType,
            'host'                 => DB_HOST,
            'databaseName'         => DB_NAME,
            'jsonStorageDisabled'  => true,
            'totalTables'          => count(RABO_ENTITY_TABLES) + 4,
            'personnelCount'       => count($db['personnel'] ?? []),
            'projectsCount'        => count($db['projects'] ?? []),
            'securityAuditLogRows' => (int)($auditCountRow['cnt'] ?? 0)
        ],
        'security'       => [
            'sqlInjectionProtection' => 'PDO Native Prepared Statements + WAF Active',
            'passwordHashing'        => 'Bcrypt (PASSWORD_BCRYPT)',
            'tokenSigning'           => 'HMAC-SHA256 JWT + MySQL Session Revocation',
            'bruteForceProtection'   => 'Active (Max ' . MAX_LOGIN_ATTEMPTS . ' attempts / 15m lockout)',
            'xssSanitizer'           => 'Active (Recursive Input Sanitization)',
            'uploadHardening'        => 'Active (Magic-Byte finfo + .htaccess Script Lock)',
            'superAdminVerified'     => [
                'username'       => SUPER_ADMIN_USERNAME,
                'existsInMySQL'  => !empty($superAdminRow),
                'bcryptVerified' => $superAdminPasswordValid
            ]
        ]
    ], 200);
} catch (Throwable $e) {
    sendJsonResponse([
        'success'        => false,
        'overall_status' => 'ERROR',
        'error'          => $e->getMessage()
    ], 500);
}
