<?php
/**
 * Rabo Engineering ERP - Enterprise MySQL Authentication & Security Service (PHP)
 * سامانه اتوماسیون مهندسی رابو - سرویس احراز هویت امن مبتنی بر MySQL و Bcrypt/JWT
 *
 * ویژگی‌های امنیتی:
 * - کوئری‌های پارامتریک PDO Prepared Statements در برابر SQL Injection
 * - اعتبارسنجی رمز عبور با Bcrypt (password_verify) و پشتیبانی از مدیر ارشد (rabo / 14011555706)
 * - محافظت در برابر حملات Brute-Force (قفل موقت ۱۵ دقیقه‌ای پس از ۵ تلاش ناموفق)
 * - صدور توکن امنیتی امضاشده با HMAC-SHA256 (JWT) و ثبت در جدول MySQL (rabo_sessions)
 * - ثبت کلیه رخدادهای ورود موفق و ناموفق در جدول ممیزی امنیتی (rabo_security_audit_logs)
 */

require_once __DIR__ . '/config.php';

handleCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = trim($_GET['action'] ?? 'login');

if ($method !== 'POST') {
    sendJsonResponse([
        'success' => false,
        'error'   => 'جهت عملیات احراز هویت صرفاً متد امن POST مجاز است.'
    ], 405);
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);
if (!is_array($payload)) {
    $payload = [];
}
$payload = sanitizeInputRecursive($payload);

$pdo = getMySQLConnection();

// -----------------------------------------------------------------------------
// 1. ACTION: LOGIN (ورود امن به سامانه با بررسی MySQL و ضد Brute-Force)
// -----------------------------------------------------------------------------
if ($action === 'login') {
    $username = trim((string)($payload['username'] ?? ''));
    $password = trim((string)($payload['password'] ?? ''));

    if ($username === '' || $password === '') {
        sendJsonResponse([
            'success' => false,
            'error'   => 'نام کاربری و رمز عبور الزامی است.'
        ], 400);
    }

    // بررسی وجود حملات SQL Injection در نام کاربری
    if (detectSqlInjectionPayload($username)) {
        logSecurityAudit('LOGIN_SQLI_ATTEMPT', 'CRITICAL', null, $username, 'SQL Injection pattern detected in login username');
        sendJsonResponse([
            'success' => false,
            'error'   => 'ورودی نامعتبر توسط فایروال امنیتی مسدود شد.'
        ], 403);
    }

    // بررسی محدودیت تلاش ورود ناموفق (Brute-Force Rate Limiter)
    checkLoginRateLimit($username);

    // واکشی کاربر از جدول MySQL (rabo_personnel) با PDO Prepared Statement
    $stmt = $pdo->prepare("SELECT * FROM rabo_personnel WHERE username = :username LIMIT 1");
    $stmt->execute([':username' => $username]);
    $userRow = $stmt->fetch();

    $matchedUser = null;

    if ($userRow) {
        $storedHash = (string)($userRow['password_hash'] ?? '');
        $profile = json_decode($userRow['profile_payload'] ?? '{}', true) ?: [];
        $plainFallback = (string)($profile['password'] ?? '');

        if (
            verifyPasswordSecure($password, $storedHash, $username) ||
            ($plainFallback !== '' && verifyPasswordSecure($password, $plainFallback, $username))
        ) {
            $permissions = json_decode($userRow['permissions_payload'] ?? '{}', true) ?: [];
            $matchedUser = array_merge($profile, [
                'id'          => $userRow['id'],
                'username'    => $userRow['username'],
                'name'        => $userRow['name'],
                'role'        => $userRow['role'],
                'unit'        => $userRow['unit'],
                'isManager'   => !empty($userRow['is_manager']),
                'permissions' => $permissions
            ]);
        }
    } elseif ($username === SUPER_ADMIN_USERNAME && hash_equals(SUPER_ADMIN_PASSWORD, $password)) {
        // تضمین ورود مدیر ارشد اصلی (rabo / 14011555706) و ثبت خودکار در جدول MySQL
        $superAdmin = getDefaultPersonnel()[0];
        upsertPersonInMySQL($pdo, $superAdmin);
        $matchedUser = $superAdmin;
    }

    if (!$matchedUser) {
        recordLoginAttempt($username, false);
        logSecurityAudit('LOGIN_FAILED', 'WARNING', null, $username, 'Invalid username or password');
        sendJsonResponse([
            'success' => false,
            'error'   => 'نام کاربری یا رمز عبور وارد شده نادرست است.'
        ], 401);
    }

    // ثبت ورود موفق و پاک‌سازی شمارنده خطاهای قبلی
    recordLoginAttempt($username, true);

    // بروزرسانی زمان و IP آخرین ورود در جدول MySQL
    $updateStmt = $pdo->prepare("UPDATE rabo_personnel SET last_login_at = :now, last_login_ip = :ip WHERE id = :id");
    $updateStmt->execute([
        ':now' => date('Y-m-d H:i:s'),
        ':ip'  => getClientIpAddress(),
        ':id'  => $matchedUser['id']
    ]);

    // صدور توکن امنیتی JWT امضاشده با HMAC-SHA256
    $jwtToken = generateSecureJwtToken($matchedUser);

    logSecurityAudit('LOGIN_SUCCESS', 'INFO', $matchedUser['id'], $matchedUser['username'], 'User authenticated via MySQL');

    // حذف فیلد حساس رمز عبور از خروجی ارسالی به مرورگر
    unset($matchedUser['password']);
    unset($matchedUser['password_hash']);

    sendJsonResponse([
        'success'  => true,
        'message'  => 'احراز هویت امن از طریق دیتابیس MySQL با موفقیت انجام شد.',
        'security' => [
            'engine'    => 'MySQL InnoDB + PDO Prepared Statements',
            'algorithm' => 'Bcrypt + HMAC-SHA256 JWT'
        ],
        'token'    => $jwtToken,
        'user'     => $matchedUser
    ], 200);
}

// -----------------------------------------------------------------------------
// 2. ACTION: VERIFY (اعتبارسنجی توکن امنیتی JWT و نشست MySQL)
// -----------------------------------------------------------------------------
if ($action === 'verify') {
    $token = trim((string)($payload['token'] ?? ''));
    if ($token === '') {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
            $token = $matches[1];
        }
    }

    if ($token === '') {
        sendJsonResponse([
            'success'       => false,
            'authenticated' => false,
            'error'         => 'توکن امنیتی ارسال نشده است.'
        ], 401);
    }

    $verifiedPayload = verifySecureJwtToken($token);
    if (!$verifiedPayload || empty($verifiedPayload['userId'])) {
        logSecurityAudit('TOKEN_VERIFY_FAILED', 'WARNING', null, null, 'Invalid, tampered, or expired JWT token');
        sendJsonResponse([
            'success'       => false,
            'authenticated' => false,
            'error'         => 'توکن امنیتی نامعتبر است یا اعتبار آن منقضی شده است.'
        ], 401);
    }

    $userId = (string)$verifiedPayload['userId'];
    $stmt = $pdo->prepare("SELECT * FROM rabo_personnel WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $userId]);
    $userRow = $stmt->fetch();

    if (!$userRow) {
        sendJsonResponse([
            'success'       => false,
            'authenticated' => false,
            'error'         => 'حساب کاربری مرتبط با این نشست در دیتابیس MySQL یافت نشد.'
        ], 404);
    }

    $profile = json_decode($userRow['profile_payload'] ?? '{}', true) ?: [];
    $permissions = json_decode($userRow['permissions_payload'] ?? '{}', true) ?: [];
    $foundUser = array_merge($profile, [
        'id'          => $userRow['id'],
        'username'    => $userRow['username'],
        'name'        => $userRow['name'],
        'role'        => $userRow['role'],
        'unit'        => $userRow['unit'],
        'isManager'   => !empty($userRow['is_manager']),
        'permissions' => $permissions
    ]);
    unset($foundUser['password']);
    unset($foundUser['password_hash']);

    sendJsonResponse([
        'success'       => true,
        'authenticated' => true,
        'user'          => $foundUser,
        'session'       => [
            'issuedAt'  => $verifiedPayload['iat'] ?? null,
            'expiresAt' => $verifiedPayload['exp'] ?? null
        ]
    ], 200);
}

// -----------------------------------------------------------------------------
// 3. ACTION: LOGOUT (ابطال توکن در جدول rabo_sessions دیتابیس MySQL)
// -----------------------------------------------------------------------------
if ($action === 'logout') {
    $token = trim((string)($payload['token'] ?? ''));
    if ($token === '') {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
            $token = $matches[1];
        }
    }

    if ($token !== '') {
        revokeSecureJwtToken($token);
    }

    logSecurityAudit('LOGOUT', 'INFO', null, null, 'Session revoked in MySQL');

    sendJsonResponse([
        'success' => true,
        'message' => 'نشست کاربری با موفقیت در دیتابیس MySQL بسته و ابطال شد.'
    ], 200);
}

sendJsonResponse([
    'success' => false,
    'error'   => 'عملیات درخواستی نامعتبر است.'
], 400);
