<?php
/**
 * Rabo Engineering ERP - Central PHP + MySQL API Gateway
 * درگاه مرکزی سرویس‌های بک‌اند PHP و دیتابیس MySQL رابو
 */

require_once __DIR__ . '/config.php';

handleCorsHeaders();

$route = trim($_GET['route'] ?? '');

switch ($route) {
    case 'auth':
        require __DIR__ . '/auth.php';
        break;
    case 'data':
    case 'db':
        require __DIR__ . '/data.php';
        break;
    case 'upload':
        require __DIR__ . '/upload.php';
        break;
    case 'backup':
        require __DIR__ . '/backup.php';
        break;
    case 'health':
        require __DIR__ . '/health.php';
        break;
    default:
        sendJsonResponse([
            'success'      => true,
            'service'      => 'Rabo Engineering ERP - PHP 8 & MySQL Relational Backend',
            'database'     => 'MySQL InnoDB (utf8mb4_persian_ci) - PDO Prepared Statements',
            'jsonDisabled' => true,
            'security'     => [
                'authentication'       => 'Bcrypt Password Hashing + HMAC-SHA256 JWT',
                'sqlInjectionFirewall' => 'PDO Native Prepared Statements + Active WAF',
                'bruteForceProtection' => 'MySQL Rate Limiter (5 attempts / 15m lockout)',
                'xssSanitization'      => 'Active Recursive Sanitizer',
                'uploadProtection'     => 'Magic-Byte finfo + .htaccess Script Execution Lock'
            ],
            'endpoints'    => [
                'POST /api/auth.php?action=login'  => 'احراز هویت امن MySQL و دریافت توکن JWT',
                'POST /api/auth.php?action=verify' => 'اعتبارسنجی توکن JWT و نشست فعال MySQL',
                'POST /api/auth.php?action=logout' => 'ابطال نشست در جدول rabo_sessions',
                'GET  /api/data.php'               => 'واکشی جداول از دیتابیس MySQL',
                'POST /api/data.php'               => 'ذخیره‌سازی تراکنشی ACID در دیتابیس MySQL',
                'POST /api/upload.php'             => 'بارگذاری امن فایل با اسکن باینری و ثبت در rabo_uploads_log',
                'GET  /api/backup.php'             => 'دریافت خروجی استاندارد SQL Dump (.sql)',
                'GET  /api/health.php'             => 'پایش سلامت دیتابیس MySQL و ممیزی امنیتی'
            ]
        ], 200);
}
