<?php
/**
 * Rabo Engineering ERP - MySQL SQL Backup & Restore Engine (PHP)
 * سامانه اتوماسیون مهندسی رابو - سرویس پشتیبان‌گیری و بازیابی دیتابیس MySQL (.sql)
 *
 * Endpoints:
 * - GET  /api/backup.php?action=list                 (لیست نسخه‌های پشتیبان SQL)
 * - GET  /api/backup.php?action=download&file=...    (دانلود فایل پشتیبان .sql)
 * - POST /api/backup.php?action=create               (ایجاد فایل پشتیبان کامل MySQL Dump)
 */

require_once __DIR__ . '/config.php';

handleCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = trim($_GET['action'] ?? 'list');

/**
 * تولید خروجی استاندارد SQL Dump از تمامی جداول دیتابیس MySQL رابو
 */
function generateMySQLDumpContent(): string {
    $db = loadDatabaseSafe();
    $lines = [];
    $lines[] = "-- =============================================================================";
    $lines[] = "-- Rabo Engineering ERP - Official MySQL Database Dump";
    $lines[] = "-- Generated At: " . date('Y-m-d H:i:s');
    $lines[] = "-- Database: `" . DB_NAME . "` | Charset: utf8mb4_persian_ci";
    $lines[] = "-- =============================================================================";
    $lines[] = "SET NAMES utf8mb4;";
    $lines[] = "SET FOREIGN_KEY_CHECKS = 0;";
    $lines[] = "";

    // ۱. جدول rabo_personnel
    $lines[] = "-- Table: `rabo_personnel`";
    $lines[] = "TRUNCATE TABLE `rabo_personnel`;";
    foreach ($db['personnel'] ?? [] as $p) {
        $id = addslashes((string)($p['id'] ?? ''));
        $u = addslashes((string)($p['username'] ?? ''));
        $pass = (string)($p['password'] ?? SUPER_ADMIN_PASSWORD);
        $hash = addslashes(strpos($pass, '$2y$') === 0 ? $pass : hashPasswordSecure($pass));
        $name = addslashes((string)($p['name'] ?? ''));
        $role = addslashes((string)($p['role'] ?? ''));
        $unit = addslashes((string)($p['unit'] ?? ''));
        $isMgr = !empty($p['isManager']) ? 1 : 0;
        $perms = addslashes(json_encode($p['permissions'] ?? [], JSON_UNESCAPED_UNICODE));
        $prof = addslashes(json_encode($p, JSON_UNESCAPED_UNICODE));
        $lines[] = "INSERT INTO `rabo_personnel` (`id`, `username`, `password_hash`, `name`, `role`, `unit`, `is_manager`, `permissions_payload`, `profile_payload`) VALUES ('{$id}', '{$u}', '{$hash}', '{$name}', '{$role}', '{$unit}', {$isMgr}, '{$perms}', '{$prof}');";
    }
    $lines[] = "";

    // ۲. سایر ۱۹ جدول عملیاتی
    foreach (RABO_ENTITY_TABLES as $entityKey => $tableName) {
        if ($entityKey === 'personnel') continue;
        $records = $db[$entityKey] ?? [];
        $lines[] = "-- Table: `{$tableName}` (" . count($records) . " rows)";
        $lines[] = "TRUNCATE TABLE `{$tableName}`;";
        foreach ($records as $idx => $rec) {
            $id = addslashes((string)($rec['id'] ?? ($entityKey . '-' . ($idx + 1))));
            $payload = addslashes(json_encode($rec, JSON_UNESCAPED_UNICODE));
            $lines[] = "INSERT INTO `{$tableName}` (`id`, `record_payload`) VALUES ('{$id}', '{$payload}');";
        }
        $lines[] = "";
    }

    $lines[] = "SET FOREIGN_KEY_CHECKS = 1;";
    return implode("\n", $lines);
}

// 1. GET: LIST OR DOWNLOAD SQL BACKUPS
if ($method === 'GET') {
    if ($action === 'list') {
        $files = @scandir(BACKUP_DIR) ?: [];
        $backups = [];
        foreach ($files as $file) {
            if (strpos($file, 'rabo_mysql_backup_') === 0 && substr($file, -4) === '.sql') {
                $fullPath = BACKUP_DIR . '/' . $file;
                $size = @filesize($fullPath) ?: 0;
                $mtime = @filemtime($fullPath) ?: time();
                $backups[] = [
                    'filename'      => $file,
                    'format'        => 'MySQL Dump (.sql)',
                    'size'          => $size,
                    'sizeFormatted' => round($size / 1024, 2) . ' KB',
                    'createdAt'     => date('Y-m-d H:i:s', $mtime),
                    'timestamp'     => $mtime
                ];
            }
        }
        usort($backups, fn($a, $b) => $b['timestamp'] <=> $a['timestamp']);

        sendJsonResponse([
            'success' => true,
            'engine'  => 'MySQL InnoDB Backup Service',
            'count'   => count($backups),
            'backups' => $backups
        ], 200);
    }

    if ($action === 'download') {
        $requestedFile = basename((string)($_GET['file'] ?? ''));
        if ($requestedFile === '' || $requestedFile === 'rabo_current.sql') {
            $sqlDump = generateMySQLDumpContent();
            header('Content-Type: application/sql; charset=utf-8');
            header('Content-Disposition: attachment; filename="rabo_mysql_dump_' . date('Ymd_His') . '.sql"');
            echo $sqlDump;
            exit(0);
        }

        $targetPath = BACKUP_DIR . '/' . $requestedFile;
        if (!file_exists($targetPath) || substr($requestedFile, -4) !== '.sql') {
            sendJsonResponse([
                'success' => false,
                'error'   => 'فایل پشتیبان SQL مورد نظر یافت نشد.'
            ], 404);
        }

        header('Content-Type: application/sql; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $requestedFile . '"');
        readfile($targetPath);
        exit(0);
    }
}

// 2. POST: CREATE NEW MYSQL BACKUP (.sql)
if ($method === 'POST') {
    if ($action === 'create') {
        $sqlContent = generateMySQLDumpContent();
        $filename = 'rabo_mysql_backup_' . date('Y_m_d_His') . '_' . substr(bin2hex(random_bytes(3)), 0, 6) . '.sql';
        $targetPath = BACKUP_DIR . '/' . $filename;

        if (@file_put_contents($targetPath, $sqlContent, LOCK_EX) === false) {
            sendJsonResponse([
                'success' => false,
                'error'   => 'خطا در ایجاد فایل پشتیبان SQL در سرور.'
            ], 500);
        }

        logSecurityAudit('MYSQL_BACKUP_CREATED', 'INFO', null, null, "Created SQL dump: {$filename}");

        sendJsonResponse([
            'success'   => true,
            'message'   => 'نسخه پشتیبان استاندارد دیتابیس MySQL (.sql) با موفقیت ایجاد شد.',
            'filename'  => $filename,
            'format'    => 'MySQL SQL Dump',
            'size'      => strlen($sqlContent),
            'createdAt' => date('c')
        ], 200);
    }
}

sendJsonResponse([
    'success' => false,
    'error'   => 'عملیات پشتیبان‌گیری درخواستی نامعتبر است.'
], 400);
