<?php
/**
 * Rabo Engineering ERP - MySQL Relational Data Persistence Engine (PHP REST API)
 * سامانه اتوماسیون مهندسی رابو - سرویس اصلی همگام‌سازی تراکنشی با دیتابیس MySQL
 *
 * Endpoints:
 * - GET  /api/data.php             (واکشی کلیه جداول از دیتابیس MySQL)
 * - GET  /api/data.php?entity=...  (واکشی یک جدول مشخص با اعتبارسنجی Whitelist)
 * - POST /api/data.php             (ذخیره‌سازی تراکنشی ACID در جداول MySQL با PDO Prepared Statements)
 */

require_once __DIR__ . '/config.php';

handleCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// -----------------------------------------------------------------------------
// GET: واکشی داده‌ها از جداول بیست‌گانه دیتابیس MySQL
// -----------------------------------------------------------------------------
if ($method === 'GET') {
    try {
        $db = loadDatabaseSafe();

        $entity = isset($_GET['entity']) ? trim((string)$_GET['entity']) : '';
        if ($entity !== '') {
            // بررسی سخت‌گیرانه نام جدول در لیست سفید (جلوگیری از SQL Injection)
            if (!array_key_exists($entity, RABO_ENTITY_TABLES)) {
                logSecurityAudit('INVALID_ENTITY_QUERY', 'WARNING', null, null, "Blocked unknown entity: {$entity}");
                sendJsonResponse([
                    'success' => false,
                    'error'   => "جدول درخواستی '{$entity}' در اسکیمای دیتابیس MySQL مجاز نیست."
                ], 404);
            }

            sendJsonResponse([
                'success'     => true,
                'storage'     => 'MySQL InnoDB',
                'table'       => RABO_ENTITY_TABLES[$entity],
                'entity'      => $entity,
                'data'        => $db[$entity] ?? [],
                'lastUpdated' => $db['lastUpdated'] ?? date('c')
            ], 200);
        }

        sendJsonResponse($db, 200);
    } catch (Throwable $e) {
        logSecurityAudit('DB_READ_ERROR', 'CRITICAL', null, null, $e->getMessage());
        sendJsonResponse([
            'success' => false,
            'error'   => 'خطا در واکشی اطلاعات از دیتابیس MySQL',
            'details' => $e->getMessage()
        ], 500);
    }
}

// -----------------------------------------------------------------------------
// POST: ذخیره‌سازی تراکنشی (ACID Transaction) در جداول دیتابیس MySQL
// -----------------------------------------------------------------------------
if ($method === 'POST') {
    try {
        $rawInput = file_get_contents('php://input');
        if (empty($rawInput)) {
            sendJsonResponse([
                'success' => false,
                'error'   => 'بدنه درخواست ارسالی خالی است.'
            ], 400);
        }

        $incomingPayload = json_decode($rawInput, true);
        if (!is_array($incomingPayload)) {
            sendJsonResponse([
                'success'    => false,
                'error'      => 'ساختار داده ارسالی نامعتبر است.',
                'json_error' => json_last_error_msg()
            ], 400);
        }

        // پاک‌سازی کامل داده‌های ورودی در برابر XSS و Null-Byte
        $incomingPayload = sanitizeInputRecursive($incomingPayload);

        $currentDb = loadDatabaseSafe();

        $entity = isset($_GET['entity']) ? trim((string)$_GET['entity']) : '';
        if ($entity !== '') {
            if (!array_key_exists($entity, RABO_ENTITY_TABLES)) {
                sendJsonResponse([
                    'success' => false,
                    'error'   => "جدول '{$entity}' در اسکیمای MySQL تعریف نشده است."
                ], 400);
            }
            $currentDb[$entity] = $incomingPayload;
            $updatedDb = $currentDb;
            $updatedDb['lastUpdated'] = date('c');
        } else {
            $updatedDb = safeMergeDatabase($currentDb, $incomingPayload);
        }

        // ذخیره اتمیک در جداول MySQL با تراکنش PDO
        saveDatabaseAtomicSafe($updatedDb);

        logSecurityAudit('MYSQL_SYNC_SUCCESS', 'INFO', null, null, $entity !== '' ? "Synced entity: {$entity}" : 'Synced full MySQL schema');

        sendJsonResponse([
            'success'   => true,
            'storage'   => 'MySQL InnoDB (PDO Prepared Statements)',
            'message'   => 'اطلاعات با موفقیت در جداول دیتابیس MySQL ذخیره و همگام‌سازی شد.',
            'timestamp' => $updatedDb['lastUpdated']
        ], 200);
    } catch (Throwable $e) {
        logSecurityAudit('MYSQL_SYNC_ERROR', 'CRITICAL', null, null, $e->getMessage());
        sendJsonResponse([
            'success' => false,
            'error'   => 'خطا در تراکنش دیتابیس MySQL',
            'details' => $e->getMessage()
        ], 500);
    }
}

sendJsonResponse([
    'success' => false,
    'error'   => "متد {$method} مجاز نمی‌باشد."
], 405);
