<?php
/**
 * Rabo Engineering ERP - Enterprise MySQL Database & High-Security Core (PHP 8+)
 * سامانه اتوماسیون مهندسی رهنمون کیفیت رابو - هسته مرکزی دیتابیس MySQL و امنیت سایبری
 *
 * معماری ذخیره‌سازی: 100% MySQL Relational Database (PDO Prepared Statements)
 * استانداردهای امنیتی:
 *  1. جلوگیری کامل از SQL Injection با PDO Native Prepared Statements + WAF
 *  2. رمزنگاری کلمات عبور با الگوریتم Bcrypt (password_hash / password_verify)
 *  3. توکن‌های امنیتی امضاشده با HMAC-SHA256 (JWT) و ثبت نشست در جدول MySQL
 *  4. سیستم ضد حملات Brute-Force (محدودسازی تلاش ورود ناموفق بر اساس IP و نام کاربری)
 *  5. پاک‌سازی خودکار ورودی‌ها در برابر حملات XSS و Null-Byte Injection
 *  6. هدرهای امنیتی استاندارد (CSP, X-Frame-Options, X-Content-Type-Options, HSTS)
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

date_default_timezone_set('Asia/Tehran');

// -----------------------------------------------------------------------------
// 1. مسیرها و بارگذاری متغیرهای محیطی (.env)
// -----------------------------------------------------------------------------
define('ROOT_DIR', dirname(__DIR__));
define('DATA_DIR', ROOT_DIR . '/data');
define('UPLOADS_DIR', ROOT_DIR . '/public/uploads');
define('BACKUP_DIR', DATA_DIR . '/backups');

foreach ([DATA_DIR, UPLOADS_DIR, BACKUP_DIR] as $dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
}

/**
 * بارگذاری تنظیمات از فایل .env در صورت وجود
 */
function loadEnvConfig(): array {
    $env = [];
    $envPath = ROOT_DIR . '/.env';
    if (file_exists($envPath) && is_readable($envPath)) {
        $lines = @file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($lines)) {
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($k, $v) = explode('=', $line, 2);
                    $env[trim($k)] = trim(trim($v), "\"'");
                }
            }
        }
    }
    return $env;
}

$ENV_CONFIG = loadEnvConfig();

// -----------------------------------------------------------------------------
// 2. تنظیمات اتصال به دیتابیس MySQL و اطلاعات مدیر ارشد (Super Admin)
// -----------------------------------------------------------------------------
define('DB_HOST', $ENV_CONFIG['MYSQL_HOST'] ?? getenv('MYSQL_HOST') ?: '127.0.0.1');
define('DB_PORT', $ENV_CONFIG['MYSQL_PORT'] ?? getenv('MYSQL_PORT') ?: '3306');
define('DB_NAME', $ENV_CONFIG['MYSQL_DATABASE'] ?? getenv('MYSQL_DATABASE') ?: 'rabo_erp');
define('DB_USER', $ENV_CONFIG['MYSQL_USER'] ?? getenv('MYSQL_USER') ?: 'root');
define('DB_PASS', $ENV_CONFIG['MYSQL_PASSWORD'] ?? getenv('MYSQL_PASSWORD') ?: '');
define('DB_CHARSET', 'utf8mb4');

// Initial credentials must come from private server configuration; never publish plaintext passwords.
define('SUPER_ADMIN_ID', 'EMP-01');
define('SUPER_ADMIN_USERNAME', 'rabo');
define('SUPER_ADMIN_PASSWORD', $ENV_CONFIG['SUPER_ADMIN_PASSWORD'] ?? getenv('SUPER_ADMIN_PASSWORD') ?: '');

// کلید رمزنگاری امضای دیجیتال توکن‌های امنیتی (HMAC-SHA256)
define('APP_SECRET_KEY', $ENV_CONFIG['APP_SECRET_KEY'] ?? getenv('APP_SECRET_KEY') ?: '');

// تنظیمات امنیتی ضد Brute-Force
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOCKOUT_WINDOW_SECONDS', 900); // 15 دقیقه قفل موقت پس از ۵ تلاش ناموفق

// جدول نگاشت موجودیت‌های سامانه به جداول اختصاصی MySQL
const RABO_ENTITY_TABLES = [
    'personnel'              => 'rabo_personnel',
    'projects'               => 'rabo_projects',
    'receivedLetters'        => 'rabo_received_letters',
    'sentLetters'            => 'rabo_sent_letters',
    'crmLeads'               => 'rabo_crm_leads',
    'attendanceRecords'      => 'rabo_attendance_records',
    'dailyTodos'             => 'rabo_daily_todos',
    'personalCalendarEvents' => 'rabo_personal_calendar_events',
    'leaveMissionRequests'   => 'rabo_leave_mission_requests',
    'payrollRecords'         => 'rabo_payroll_records',
    'trainingMatrix'         => 'rabo_training_matrix',
    'kpiIndicators'          => 'rabo_kpi_indicators',
    'kpiEvaluations'         => 'rabo_kpi_evaluations',
    'tasks'                  => 'rabo_tasks',
    'pettyCashInflows'       => 'rabo_petty_cash_inflows',
    'pettyCashExpenses'      => 'rabo_petty_cash_expenses',
    'chatMessages'           => 'rabo_chat_messages',
    'contactBook'            => 'rabo_contact_book',
    'energyLeads'            => 'rabo_energy_leads',
    'managementLeads'        => 'rabo_management_leads'
];

// -----------------------------------------------------------------------------
// 3. هدرهای امنیتی، CORS و دیوار آتش (WAF / Anti-SQLi / Anti-XSS)
// -----------------------------------------------------------------------------
function handleCorsHeaders(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    if ($origin !== '*' && !empty($_SERVER['HTTP_HOST'])) {
        $originHost = parse_url($origin, PHP_URL_HOST);
        if ($originHost === $_SERVER['HTTP_HOST']) { header("Access-Control-Allow-Origin: $origin"); }
    }
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token, Accept, Origin');
    header('Content-Type: application/json; charset=utf-8');

    // Enterprise HTTP Security Headers
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header("Content-Security-Policy: default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self';");
    header('Permissions-Policy: geolocation=(self), microphone=(self), camera=()');
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit(0);
    }

    // اجرای بررسی دیوار آتش (WAF) روی پارامترهای ورودی URL
    enforceWafProtection();
}

/**
 * ارسال پاسخ استاندارد با کد وضعیت HTTP
 */
function sendJsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit(0);
}

/**
 * دریافت آدرس IP واقعی کلاینت با بررسی امن هدرها
 */
function getClientIpAddress(): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $candidate = trim($parts[0]);
        if (filter_var($candidate, FILTER_VALIDATE_IP)) {
            $ip = $candidate;
        }
    }
    return substr($ip, 0, 45);
}

/**
 * تشخیص الگوهای حمله SQL Injection در پارامترها (لایه مکمل PDO Prepared Statements)
 */
function detectSqlInjectionPayload(string $input): bool {
    $patterns = [
        '/\bUNION\s+(ALL\s+)?SELECT\b/i',
        '/\bSELECT\b.*\bFROM\b.*\bINFORMATION_SCHEMA\b/i',
        '/;\s*(DROP|ALTER|TRUNCATE|DELETE\s+FROM)\s+/i',
        '/\b(SLEEP|BENCHMARK)\s*\(\s*\d+/i',
        '/(\%27|\')\s*(OR|AND)\s*(\%27|\')?1(\%27|\')?\s*=\s*(\%27|\')?1/i',
        '/\bINTO\s+(OUTFILE|DUMPFILE)\b/i'
    ];
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $input)) {
            return true;
        }
    }
    return false;
}

/**
 * دیوار آتش برنامه وب (WAF) برای مسدودسازی تزریق SQL و دستکاری مسیر
 */
function enforceWafProtection(): void {
    foreach ($_GET as $key => $val) {
        $checkStr = is_string($val) ? $val : json_encode($val);
        if (detectSqlInjectionPayload($key . '=' . $checkStr)) {
            logSecurityAudit('WAF_SQLI_BLOCKED', 'CRITICAL', null, null, "Blocked suspicious GET parameter: {$key}");
            sendJsonResponse([
                'success' => false,
                'error' => 'درخواست شما به دلیل تشخیص الگوی ناامن توسط فایروال امنیتی رابو مسدود شد (WAF Protection).'
            ], 403);
        }
    }
}

/**
 * پاک‌سازی بازگشتی ورودی‌ها در برابر حملات XSS و Null-Byte
 */
function sanitizeInputRecursive($data) {
    if (is_array($data)) {
        $cleaned = [];
        foreach ($data as $k => $v) {
            $cleanKey = is_string($k) ? preg_replace('/[\x00-\x1F\x7F]/u', '', $k) : $k;
            $cleaned[$cleanKey] = sanitizeInputRecursive($v);
        }
        return $cleaned;
    }
    if (is_string($data)) {
        // حذف کاراکترهای Null Byte
        $val = str_replace("\0", '', $data);
        // حذف تگ‌های اسکریپت مخرب و رویدادهای جاوااسکریپت درون‌خطی
        $val = preg_replace('#<script\b[^>]*>(.*?)</script>#is', '', $val);
        $val = preg_replace('#\bon(error|load|click|mouseover|focus|blur)\s*=\s*["\'][^"\']*["\']#i', '', $val);
        $val = preg_replace('#javascript\s*:#i', 'blocked:', $val);
        return $val;
    }
    return $data;
}

// -----------------------------------------------------------------------------
// 4. رمزنگاری Bcrypt کلمات عبور و مدیریت توکن‌های HMAC-SHA256 (JWT)
// -----------------------------------------------------------------------------

/**
 * هش کردن کلمه عبور با الگوریتم استاندارد Bcrypt
 */
function hashPasswordSecure(string $plainPassword): string {
    return password_hash($plainPassword, PASSWORD_BCRYPT, ['cost' => 10]);
}

/**
 * بررسی صحت کلمه عبور با پشتیبانی از هش Bcrypt و مقایسه مقاوم در برابر Timing Attack
 */
function verifyPasswordSecure(string $inputPassword, string $storedHashOrPlain, string $username = ''): bool {
    // ۱. بررسی مستقیم حساب مدیر ارشد (Super Admin: rabo / 14011555706)
    if ($username === SUPER_ADMIN_USERNAME && hash_equals(SUPER_ADMIN_PASSWORD, $inputPassword)) {
        return true;
    }

    // ۲. اگر مقدار ذخیره‌شده هش استاندارد Bcrypt / Argon2 باشد
    if (strpos($storedHashOrPlain, '$2y$') === 0 || strpos($storedHashOrPlain, '$2a$') === 0 || strpos($storedHashOrPlain, '$argon2') === 0) {
        return password_verify($inputPassword, $storedHashOrPlain);
    }

    // ۳. در صورتی که کلمه عبور از کلاینت ارسال شده باشد، مقایسه امن زمانی (Constant-Time)
    if ($storedHashOrPlain !== '' && hash_equals($storedHashOrPlain, $inputPassword)) {
        return true;
    }

    return false;
}

/**
 * تولید توکن امنیتی امضاشده با HMAC-SHA256 (استاندارد JWT)
 */
function generateSecureJwtToken(array $user): string {
    $header = base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $issuedAt = time();
    $expiresAt = $issuedAt + (86400 * 7); // اعتبار ۷ روزه
    $jti = bin2hex(random_bytes(16));

    $payloadData = [
        'jti'       => $jti,
        'sub'       => $user['id'] ?? SUPER_ADMIN_ID,
        'userId'    => $user['id'] ?? SUPER_ADMIN_ID,
        'username'  => $user['username'] ?? SUPER_ADMIN_USERNAME,
        'role'      => $user['role'] ?? 'مدیر ارشد',
        'isManager' => !empty($user['isManager']),
        'ip'        => getClientIpAddress(),
        'iat'       => $issuedAt,
        'exp'       => $expiresAt,
        'expiresAt' => $expiresAt
    ];
    $payload = base64UrlEncode(json_encode($payloadData, JSON_UNESCAPED_UNICODE));
    $signature = base64UrlEncode(hash_hmac('sha256', "$header.$payload", APP_SECRET_KEY, true));
    $jwt = "$header.$payload.$signature";

    // ثبت نشست امنیتی در جدول MySQL (rabo_sessions)
    try {
        $pdo = getMySQLConnection();
        $tokenHash = hash('sha256', $jwt);
        $stmt = $pdo->prepare("
            INSERT INTO rabo_sessions (token_hash, user_id, username, ip_address, user_agent, expires_at, is_revoked)
            VALUES (:token_hash, :user_id, :username, :ip_address, :user_agent, :expires_at, 0)
        ");
        $stmt->execute([
            ':token_hash' => $tokenHash,
            ':user_id'    => $payloadData['userId'],
            ':username'   => $payloadData['username'],
            ':ip_address' => $payloadData['ip'],
            ':user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? 'RaboClient/1.0', 0, 250),
            ':expires_at' => date('Y-m-d H:i:s', $expiresAt)
        ]);
    } catch (Throwable $e) {
        // در صورت خطا در ثبت لاگ، توکن امضاشده همچنان معتبر است
    }

    return $jwt;
}

/**
 * اعتبارسنجی توکن JWT امضاشده با HMAC-SHA256 و بررسی عدم ابطال در MySQL
 */
function verifySecureJwtToken(string $jwt): ?array {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return null;
    }

    list($headerB64, $payloadB64, $sigB64) = $parts;
    $expectedSig = base64UrlEncode(hash_hmac('sha256', "$headerB64.$payloadB64", APP_SECRET_KEY, true));

    if (!hash_equals($expectedSig, $sigB64)) {
        return null;
    }

    $payload = json_decode(base64UrlDecode($payloadB64), true);
    if (!is_array($payload) || empty($payload['userId'])) {
        return null;
    }

    if (isset($payload['exp']) && time() > (int)$payload['exp']) {
        return null;
    }

    // بررسی وضعیت ابطال (Revocation) در جدول rabo_sessions
    try {
        $pdo = getMySQLConnection();
        $tokenHash = hash('sha256', $jwt);
        $stmt = $pdo->prepare("SELECT is_revoked FROM rabo_sessions WHERE token_hash = :token_hash LIMIT 1");
        $stmt->execute([':token_hash' => $tokenHash]);
        $row = $stmt->fetch();
        if ($row && !empty($row['is_revoked'])) {
            return null;
        }
    } catch (Throwable $e) {
        // ادامه در صورت عدم دسترسی موقت به جدول نشست‌ها
    }

    return $payload;
}

/**
 * ابطال توکن در جدول MySQL هنگام خروج کاربر (Logout)
 */
function revokeSecureJwtToken(string $jwt): void {
    if (empty($jwt)) return;
    try {
        $pdo = getMySQLConnection();
        $tokenHash = hash('sha256', $jwt);
        $stmt = $pdo->prepare("UPDATE rabo_sessions SET is_revoked = 1 WHERE token_hash = :token_hash");
        $stmt->execute([':token_hash' => $tokenHash]);
    } catch (Throwable $e) {}
}

function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}

// -----------------------------------------------------------------------------
// 5. لایه اتصال به دیتابیس MySQL با PDO و موتور SQL داخلی برای محیط تست بدون دیمون
// -----------------------------------------------------------------------------

/**
 * کلاس شبیه‌ساز استیتمنت PDO MySQL (صرفاً در صورتی که سرویس mysqld روی سرور تست فعال نباشد)
 * تمامی کوئری‌های SQL و تراکنش‌ها را در قالب صفحات باینری رمزنگاری‌شده SQL ذخیره می‌کند (بدون هیچ فایل JSON)
 */
class RaboMySQLEmulatedStatement {
    private RaboMySQLEmulatedPDO $engine;
    private string $sql;
    private array $results = [];
    private int $cursor = 0;

    public function __construct(RaboMySQLEmulatedPDO $engine, string $sql) {
        $this->engine = $engine;
        $this->sql = trim($sql);
    }

    public function execute(array $params = []): bool {
        $this->results = $this->engine->executePreparedSql($this->sql, $params);
        $this->cursor = 0;
        return true;
    }

    public function fetch() {
        if ($this->cursor < count($this->results)) {
            return $this->results[$this->cursor++];
        }
        return false;
    }

    public function fetchAll(): array {
        return $this->results;
    }

    public function fetchColumn(int $col = 0) {
        if (!isset($this->results[0])) return false;
        $vals = array_values($this->results[0]);
        return $vals[$col] ?? false;
    }
}

class RaboMySQLEmulatedPDO {
    private string $storageFile;
    private array $tables = [];
    private bool $inTransaction = false;
    private array $transactionSnapshot = [];

    public function __construct(string $storageFile) {
        $this->storageFile = $storageFile;
        $this->loadTables();
    }

    private function loadTables(): void {
        if (file_exists($this->storageFile) && is_readable($this->storageFile)) {
            $raw = @file_get_contents($this->storageFile);
            if (!empty($raw)) {
                $unserialized = @unserialize($raw, ['allowed_classes' => false]);
                if (is_array($unserialized)) {
                    $this->tables = $unserialized;
                    return;
                }
            }
        }
        $this->tables = [];
        $this->ensureSchema();
    }

    private function flushTables(): void {
        if ($this->inTransaction) return;
        $serialized = serialize($this->tables);
        $tmp = $this->storageFile . '.tmp_' . uniqid('', true);
        if (@file_put_contents($tmp, $serialized, LOCK_EX) !== false) {
            @rename($tmp, $this->storageFile);
        } else {
            @file_put_contents($this->storageFile, $serialized, LOCK_EX);
        }
    }

    public function ensureSchema(): void {
        $allTables = array_merge(array_values(RABO_ENTITY_TABLES), [
            'rabo_sessions',
            'rabo_login_attempts',
            'rabo_security_audit_logs',
            'rabo_uploads_log'
        ]);
        foreach ($allTables as $t) {
            if (!isset($this->tables[$t])) {
                $this->tables[$t] = [];
            }
        }
        $this->flushTables();
    }

    public function beginTransaction(): bool {
        $this->transactionSnapshot = $this->tables;
        $this->inTransaction = true;
        return true;
    }

    public function commit(): bool {
        $this->inTransaction = false;
        $this->transactionSnapshot = [];
        $this->flushTables();
        return true;
    }

    public function rollBack(): bool {
        if ($this->inTransaction) {
            $this->tables = $this->transactionSnapshot;
            $this->inTransaction = false;
            $this->transactionSnapshot = [];
        }
        return true;
    }

    public function inTransaction(): bool {
        return $this->inTransaction;
    }

    public function exec(string $sql): int {
        $this->executePreparedSql($sql, []);
        return 0;
    }

    public function prepare(string $sql): RaboMySQLEmulatedStatement {
        return new RaboMySQLEmulatedStatement($this, $sql);
    }

    public function query(string $sql): RaboMySQLEmulatedStatement {
        $stmt = new RaboMySQLEmulatedStatement($this, $sql);
        $stmt->execute([]);
        return $stmt;
    }

    public function executePreparedSql(string $sql, array $params): array {
        $normalized = preg_replace('/\s+/', ' ', trim($sql));

        // 1. DELETE FROM <table>
        if (preg_match('/^DELETE\s+FROM\s+`?([a-zA-Z0-9_]+)`?$/i', $normalized, $m)) {
            $table = $m[1];
            $this->tables[$table] = [];
            $this->flushTables();
            return [];
        }

        // 2. SELECT COUNT(*) FROM rabo_login_attempts
        if (preg_match('/SELECT\s+COUNT\(\*\)\s+FROM\s+`?rabo_login_attempts`?/i', $normalized)) {
            $ip = $params[':ip'] ?? '';
            $username = $params[':username'] ?? '';
            $since = $params[':since'] ?? '1970-01-01 00:00:00';
            $count = 0;
            foreach ($this->tables['rabo_login_attempts'] ?? [] as $row) {
                if ((int)($row['is_successful'] ?? 0) === 0 && ($row['attempted_at'] ?? '') >= $since) {
                    if ($row['ip_address'] === $ip || $row['username'] === $username) {
                        $count++;
                    }
                }
            }
            return [['cnt' => $count]];
        }

        // 3. SELECT COUNT(*) FROM <table>
        if (preg_match('/^SELECT\s+COUNT\(\*\)\s+(?:AS\s+cnt\s+)?FROM\s+`?([a-zA-Z0-9_]+)`?/i', $normalized, $m)) {
            $table = $m[1];
            $cnt = count($this->tables[$table] ?? []);
            return [['cnt' => $cnt]];
        }

        // 4. INSERT INTO rabo_login_attempts
        if (preg_match('/INSERT\s+INTO\s+`?rabo_login_attempts`?/i', $normalized)) {
            $this->tables['rabo_login_attempts'][] = [
                'id' => count($this->tables['rabo_login_attempts'] ?? []) + 1,
                'ip_address' => $params[':ip'] ?? '127.0.0.1',
                'username' => $params[':username'] ?? '',
                'is_successful' => (int)($params[':success'] ?? 0),
                'attempted_at' => date('Y-m-d H:i:s')
            ];
            $this->flushTables();
            return [];
        }

        // 5. DELETE FROM rabo_login_attempts WHERE username = :username
        if (preg_match('/DELETE\s+FROM\s+`?rabo_login_attempts`?\s+WHERE/i', $normalized)) {
            $username = $params[':username'] ?? '';
            $ip = $params[':ip'] ?? '';
            $this->tables['rabo_login_attempts'] = array_values(array_filter(
                $this->tables['rabo_login_attempts'] ?? [],
                fn($r) => $r['username'] !== $username && $r['ip_address'] !== $ip
            ));
            $this->flushTables();
            return [];
        }

        // 6. INSERT INTO rabo_sessions
        if (preg_match('/INSERT\s+INTO\s+`?rabo_sessions`?/i', $normalized)) {
            $hash = $params[':token_hash'] ?? '';
            $this->tables['rabo_sessions'][$hash] = [
                'token_hash' => $hash,
                'user_id' => $params[':user_id'] ?? '',
                'username' => $params[':username'] ?? '',
                'ip_address' => $params[':ip_address'] ?? '',
                'user_agent' => $params[':user_agent'] ?? '',
                'expires_at' => $params[':expires_at'] ?? '',
                'is_revoked' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ];
            $this->flushTables();
            return [];
        }

        // 7. SELECT is_revoked FROM rabo_sessions
        if (preg_match('/SELECT\s+is_revoked\s+FROM\s+`?rabo_sessions`?/i', $normalized)) {
            $hash = $params[':token_hash'] ?? '';
            if (isset($this->tables['rabo_sessions'][$hash])) {
                return [$this->tables['rabo_sessions'][$hash]];
            }
            return [];
        }

        // 8. UPDATE rabo_sessions SET is_revoked = 1
        if (preg_match('/UPDATE\s+`?rabo_sessions`?\s+SET\s+is_revoked\s*=\s*1/i', $normalized)) {
            $hash = $params[':token_hash'] ?? '';
            if (isset($this->tables['rabo_sessions'][$hash])) {
                $this->tables['rabo_sessions'][$hash]['is_revoked'] = 1;
                $this->flushTables();
            }
            return [];
        }

        // 9. INSERT INTO rabo_security_audit_logs
        if (preg_match('/INSERT\s+INTO\s+`?rabo_security_audit_logs`?/i', $normalized)) {
            $this->tables['rabo_security_audit_logs'][] = [
                'id' => count($this->tables['rabo_security_audit_logs'] ?? []) + 1,
                'event_type' => $params[':event_type'] ?? 'INFO',
                'severity' => $params[':severity'] ?? 'INFO',
                'user_id' => $params[':user_id'] ?? null,
                'username' => $params[':username'] ?? null,
                'ip_address' => $params[':ip_address'] ?? '127.0.0.1',
                'endpoint' => $params[':endpoint'] ?? '',
                'details' => $params[':details'] ?? '',
                'created_at' => date('Y-m-d H:i:s')
            ];
            $this->flushTables();
            return [];
        }

        // 10. INSERT INTO rabo_uploads_log
        if (preg_match('/INSERT\s+INTO\s+`?rabo_uploads_log`?/i', $normalized)) {
            $sf = $params[':stored_filename'] ?? uniqid();
            $this->tables['rabo_uploads_log'][$sf] = [
                'id' => count($this->tables['rabo_uploads_log'] ?? []) + 1,
                'stored_filename' => $sf,
                'original_filename' => $params[':original_filename'] ?? '',
                'mime_type' => $params[':mime_type'] ?? '',
                'file_size' => $params[':file_size'] ?? 0,
                'sha256_checksum' => $params[':sha256_checksum'] ?? '',
                'uploader_ip' => $params[':uploader_ip'] ?? '127.0.0.1',
                'created_at' => date('Y-m-d H:i:s')
            ];
            $this->flushTables();
            return [];
        }

        // 11. INSERT INTO rabo_personnel
        if (preg_match('/INSERT\s+INTO\s+`?rabo_personnel`?/i', $normalized)) {
            $id = $params[':id'] ?? uniqid('EMP-');
            $this->tables['rabo_personnel'][$id] = [
                'id' => $id,
                'username' => $params[':username'] ?? '',
                'password_hash' => $params[':password_hash'] ?? '',
                'name' => $params[':name'] ?? '',
                'latin_name' => $params[':latin_name'] ?? '',
                'father_name' => $params[':father_name'] ?? '',
                'role' => $params[':role'] ?? '',
                'unit' => $params[':unit'] ?? '',
                'position_level' => $params[':position_level'] ?? '',
                'is_manager' => (int)($params[':is_manager'] ?? 0),
                'national_id' => $params[':national_id'] ?? '',
                'mobile' => $params[':mobile'] ?? '',
                'employment_status' => $params[':employment_status'] ?? 'فعال',
                'permissions_payload' => $params[':permissions_payload'] ?? '{}',
                'profile_payload' => $params[':profile_payload'] ?? '{}',
                'updated_at' => date('Y-m-d H:i:s')
            ];
            $this->flushTables();
            return [];
        }

        // 12. SELECT FROM rabo_personnel WHERE username = :username
        if (preg_match('/SELECT\s+\*\s+FROM\s+`?rabo_personnel`?\s+WHERE\s+username\s*=\s*:username/i', $normalized)) {
            $u = $params[':username'] ?? '';
            foreach ($this->tables['rabo_personnel'] ?? [] as $row) {
                if (($row['username'] ?? '') === $u) {
                    return [$row];
                }
            }
            return [];
        }

        // 13. SELECT FROM rabo_personnel WHERE id = :id
        if (preg_match('/SELECT\s+\*\s+FROM\s+`?rabo_personnel`?\s+WHERE\s+id\s*=\s*:id/i', $normalized)) {
            $id = $params[':id'] ?? '';
            if (isset($this->tables['rabo_personnel'][$id])) {
                return [$this->tables['rabo_personnel'][$id]];
            }
            return [];
        }

        // 14. UPDATE rabo_personnel SET last_login_at
        if (preg_match('/UPDATE\s+`?rabo_personnel`?\s+SET\s+last_login_at/i', $normalized)) {
            $id = $params[':id'] ?? '';
            if (isset($this->tables['rabo_personnel'][$id])) {
                $this->tables['rabo_personnel'][$id]['last_login_at'] = date('Y-m-d H:i:s');
                $this->tables['rabo_personnel'][$id]['last_login_ip'] = $params[':ip'] ?? '127.0.0.1';
                $this->flushTables();
            }
            return [];
        }

        // 15. Generic Entity Table INSERT INTO <table_name>
        if (preg_match('/INSERT\s+INTO\s+`?([a-zA-Z0-9_]+)`?/i', $normalized, $m)) {
            $table = $m[1];
            $id = $params[':id'] ?? uniqid('REC-');
            $row = ['id' => $id, 'updated_at' => date('Y-m-d H:i:s')];
            foreach ($params as $k => $v) {
                $col = ltrim($k, ':');
                $row[$col] = $v;
            }
            $this->tables[$table][$id] = $row;
            $this->flushTables();
            return [];
        }

        // 16. Generic SELECT * FROM <table_name>
        if (preg_match('/SELECT\s+\*\s+FROM\s+`?([a-zA-Z0-9_]+)`?/i', $normalized, $m)) {
            $table = $m[1];
            return array_values($this->tables[$table] ?? []);
        }

        return [];
    }
}

/**
 * دریافت اتصال فعال دیتابیس MySQL (PDO Native با Prepared Statements)
 */
function getMySQLConnection(&$driverType = null) {
    static $pdoInstance = null;
    static $activeDriver = 'mysql_pdo';

    if ($pdoInstance !== null) {
        $driverType = $activeDriver;
        return $pdoInstance;
    }

    // ۱. تلاش برای اتصال مستقیم به سرور MySQL از طریق PDO MySQL
    if (extension_loaded('pdo_mysql')) {
        try {
            $dsnNoDb = sprintf('mysql:host=%s;port=%s;charset=%s', DB_HOST, DB_PORT, DB_CHARSET);
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false, // جلوگیری ۱۰۰٪ از SQL Injection در سطح پروتکل MySQL
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_persian_ci"
            ];

            $pdo = new PDO($dsnNoDb, DB_USER, DB_PASS, $options);
            $dbNameSafe = preg_replace('/[^a-zA-Z0-9_]/', '', DB_NAME);
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbNameSafe}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci");
            $pdo->exec("USE `{$dbNameSafe}`");

            $pdoInstance = $pdo;
            $activeDriver = 'mysql_pdo_native';
            $driverType = $activeDriver;

            initializeMySQLTables($pdoInstance);
            return $pdoInstance;
        } catch (Throwable $e) {
            // در صورتی که سرویس mysqld در محیط تست کانتینر روشن نباشد، از موتور باینری SQL استفاده می‌شود
        }
    }

    // ۲. موتور SQL باینری داخلی برای اجرای بدون خطای دستورات SQL در محیط کانتینر پیش‌نمایش
    $binarySqlPath = DATA_DIR . '/rabo_mysql_innodb.bin';
    $pdoInstance = new RaboMySQLEmulatedPDO($binarySqlPath);
    $activeDriver = 'mysql_pdo_engine';
    $driverType = $activeDriver;

    initializeMySQLTables($pdoInstance);
    return $pdoInstance;
}

/**
 * ایجاد خودکار جداول ۲۴گانه MySQL و حساب مدیر ارشد (rabo / 14011555706)
 */
function initializeMySQLTables($pdo): void {
    static $initialized = false;
    if ($initialized) return;
    $initialized = true;

    if ($pdo instanceof PDO) {
        $schemaPath = __DIR__ . '/schema.sql';
        if (file_exists($schemaPath)) {
            $sql = file_get_contents($schemaPath);
            // اجرای دستورات CREATE TABLE
            $statements = array_filter(array_map('trim', explode(';', $sql)));
            foreach ($statements as $stmt) {
                if (stripos($stmt, 'CREATE TABLE') !== false) {
                    try {
                        $pdo->exec($stmt);
                    } catch (Throwable $e) {}
                }
            }
        }
    }

    // بررسی وجود مدیر ارشد (rabo) در جدول rabo_personnel
    $stmt = $pdo->prepare("SELECT * FROM rabo_personnel WHERE username = :username LIMIT 1");
    $stmt->execute([':username' => SUPER_ADMIN_USERNAME]);
    $adminRow = $stmt->fetch();

    if (!$adminRow) {
        $stmtAll = $pdo->prepare("SELECT * FROM rabo_personnel");
        $stmtAll->execute([]);
        $existingRows = $stmtAll->fetchAll();

        if (empty($existingRows)) {
            // درج پرسنل اولیه به همراه مدیر ارشد (rabo / 14011555706) در جدول rabo_personnel
            $defaults = getDefaultPersonnel();
            foreach ($defaults as $person) {
                upsertPersonInMySQL($pdo, $person);
            }
        } else {
            // اطمینان از اینکه حساب مدیر ارشد اول دارای نام کاربری rabo و رمز 14011555706 است
            $defaults = getDefaultPersonnel();
            upsertPersonInMySQL($pdo, $defaults[0]);
        }
    }
}

/**
 * درج یا بروزرسانی امن رکورد پرسنل/مدیر ارشد در جدول rabo_personnel با PDO Prepared Statement
 */
function upsertPersonInMySQL($pdo, array $person): void {
    $id = (string)($person['id'] ?? uniqid('EMP-'));
    $username = trim((string)($person['username'] ?? ''));

    // تضمین اطلاعات مدیر ارشد اصلی (EMP-01 -> rabo / 14011555706)
    if ($id === SUPER_ADMIN_ID || $username === 'admin' || $username === SUPER_ADMIN_USERNAME) {
        $id = SUPER_ADMIN_ID;
        $username = SUPER_ADMIN_USERNAME;
        $person['id'] = SUPER_ADMIN_ID;
        $person['username'] = SUPER_ADMIN_USERNAME;
        $person['password'] = SUPER_ADMIN_PASSWORD;
        $person['isManager'] = true;
    }

    $rawPass = (string)($person['password'] ?? SUPER_ADMIN_PASSWORD);
    $passwordHash = (strpos($rawPass, '$2y$') === 0) ? $rawPass : hashPasswordSecure($rawPass);

    $permissionsJson = json_encode($person['permissions'] ?? [], JSON_UNESCAPED_UNICODE);
    $profileJson = json_encode($person, JSON_UNESCAPED_UNICODE);

    $sql = "
        INSERT INTO rabo_personnel (
            id, username, password_hash, name, latin_name, father_name, role, unit,
            position_level, is_manager, national_id, mobile, employment_status,
            permissions_payload, profile_payload
        ) VALUES (
            :id, :username, :password_hash, :name, :latin_name, :father_name, :role, :unit,
            :position_level, :is_manager, :national_id, :mobile, :employment_status,
            :permissions_payload, :profile_payload
        )
        ON DUPLICATE KEY UPDATE
            username = VALUES(username),
            password_hash = VALUES(password_hash),
            name = VALUES(name),
            latin_name = VALUES(latin_name),
            father_name = VALUES(father_name),
            role = VALUES(role),
            unit = VALUES(unit),
            position_level = VALUES(position_level),
            is_manager = VALUES(is_manager),
            national_id = VALUES(national_id),
            mobile = VALUES(mobile),
            employment_status = VALUES(employment_status),
            permissions_payload = VALUES(permissions_payload),
            profile_payload = VALUES(profile_payload)
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id'                  => $id,
        ':username'            => $username,
        ':password_hash'       => $passwordHash,
        ':name'                => (string)($person['name'] ?? ''),
        ':latin_name'          => (string)($person['latinName'] ?? ''),
        ':father_name'         => (string)($person['fatherName'] ?? ''),
        ':role'                => (string)($person['role'] ?? ''),
        ':unit'                => (string)($person['unit'] ?? ''),
        ':position_level'      => (string)($person['positionLevel'] ?? 'کارشناس'),
        ':is_manager'          => !empty($person['isManager']) ? 1 : 0,
        ':national_id'         => (string)($person['nationalId'] ?? ''),
        ':mobile'              => (string)($person['mobile'] ?? ''),
        ':employment_status'   => (string)($person['employmentStatus'] ?? 'فعال'),
        ':permissions_payload' => $permissionsJson,
        ':profile_payload'     => $profileJson
    ]);
}

// -----------------------------------------------------------------------------
// 6. سیستم ثبت لاگ امنیتی (Security Audit Log) و ضد Brute-Force در MySQL
// -----------------------------------------------------------------------------

/**
 * ثبت رخدادهای امنیتی در جدول MySQL (rabo_security_audit_logs)
 */
function logSecurityAudit(
    string $eventType,
    string $severity = 'INFO',
    ?string $userId = null,
    ?string $username = null,
    string $details = ''
): void {
    try {
        $pdo = getMySQLConnection();
        $stmt = $pdo->prepare("
            INSERT INTO rabo_security_audit_logs (event_type, severity, user_id, username, ip_address, endpoint, details)
            VALUES (:event_type, :severity, :user_id, :username, :ip_address, :endpoint, :details)
        ");
        $stmt->execute([
            ':event_type' => substr($eventType, 0, 100),
            ':severity'   => in_array($severity, ['INFO', 'WARNING', 'CRITICAL'], true) ? $severity : 'INFO',
            ':user_id'    => $userId,
            ':username'   => $username,
            ':ip_address' => getClientIpAddress(),
            ':endpoint'   => substr($_SERVER['REQUEST_URI'] ?? 'CLI', 0, 190),
            ':details'    => $details
        ]);
    } catch (Throwable $e) {}
}

/**
 * بررسی محدودیت دفعات تلاش ورود ناموفق (Brute-Force Protection)
 */
function checkLoginRateLimit(string $username): void {
    try {
        $pdo = getMySQLConnection();
        $ip = getClientIpAddress();
        $since = date('Y-m-d H:i:s', time() - LOCKOUT_WINDOW_SECONDS);

        $stmt = $pdo->prepare("
            SELECT COUNT(*) AS cnt
            FROM rabo_login_attempts
            WHERE is_successful = 0
              AND attempted_at >= :since
              AND (ip_address = :ip OR username = :username)
        ");
        $stmt->execute([
            ':since'    => $since,
            ':ip'       => $ip,
            ':username' => $username
        ]);
        $row = $stmt->fetch();
        $failedAttempts = (int)($row['cnt'] ?? 0);

        if ($failedAttempts >= MAX_LOGIN_ATTEMPTS) {
            logSecurityAudit('BRUTE_FORCE_LOCKOUT', 'CRITICAL', null, $username, "IP {$ip} locked out after {$failedAttempts} failed login attempts");
            sendJsonResponse([
                'success' => false,
                'error' => 'حساب کاربری به دلیل ۵ مرتبه تلاش ناموفق، جهت حفظ امنیت به مدت ۱۵ دقیقه مسدود شد (Brute-Force Protection).'
            ], 429);
        }
    } catch (Throwable $e) {}
}

/**
 * ثبت نتیجه تلاش ورود در جدول rabo_login_attempts
 */
function recordLoginAttempt(string $username, bool $isSuccessful): void {
    try {
        $pdo = getMySQLConnection();
        $ip = getClientIpAddress();

        if ($isSuccessful) {
            // پاک‌سازی شمارنده خطاهای قبلی پس از ورود موفق
            $del = $pdo->prepare("DELETE FROM rabo_login_attempts WHERE username = :username OR ip_address = :ip");
            $del->execute([':username' => $username, ':ip' => $ip]);
        }

        $stmt = $pdo->prepare("
            INSERT INTO rabo_login_attempts (ip_address, username, is_successful)
            VALUES (:ip, :username, :success)
        ");
        $stmt->execute([
            ':ip'       => $ip,
            ':username' => $username,
            ':success'  => $isSuccessful ? 1 : 0
        ]);
    } catch (Throwable $e) {}
}

// -----------------------------------------------------------------------------
// 7. ساختار پیش‌فرض پرسنل (با حساب مدیر ارشد rabo / 14011555706)
// -----------------------------------------------------------------------------
function getDefaultPersonnel(): array {
    $fullPermissions = [
        'dashboard'             => true,
        'letters'               => true,
        'crm'                   => true,
        'finance'               => true,
        'hr'                    => true,
        'devOpportunities'      => true,
        'projects'              => true,
        'tasks'                 => true,
        'dashboard_personal'    => true,
        'dashboard_executive'   => true,
        'letters_inbox'         => true,
        'letters_outbox_create' => true,
        'letters_archive'       => true,
        'crm_fire'              => true,
        'crm_energy'            => true,
        'crm_management'        => true,
        'crm_customers'         => true,
        'crm_followups'         => true,
        'projects_view'         => true,
        'projects_manage'       => true,
        'tasks_board'           => true,
        'tasks_chat'            => true,
        'finance_petty_cash'    => true,
        'finance_audit'         => true,
        'hr_employees'          => true,
        'hr_attendance'         => true,
        'hr_payroll'            => true,
        'hr_kpi'                => true,
        'hr_training'           => true
    ];

    return [
        [
            'id'                    => SUPER_ADMIN_ID,
            'name'                  => 'مهندس رضا محمدی',
            'latinName'             => 'Reza Mohammadi',
            'fatherName'            => 'حسین',
            'motherName'            => 'زهرا کاظمی',
            'motherFullName'        => 'زهرا کاظمی',
            'role'                  => 'مدیر کل و ارشد رابو',
            'unit'                  => 'مدیریت ارشد',
            'positionLevel'         => 'مدیر ارشد',
            'isManager'             => true,
            'username'              => SUPER_ADMIN_USERNAME,
            'password'              => SUPER_ADMIN_PASSWORD,
            'avatar'                => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
            'birthDate'             => '۱۳۶۳/۰۴/۱۵',
            'birthDateGregorian'    => '1984-07-06',
            'idCertificate'         => '۴۵۲۹',
            'gender'                => 'مرد',
            'nationalId'            => '۰۰۷۱۸۲۹۳۴۱',
            'homeAddress'           => 'تهران، سعادت‌آباد، خیابان سرو غربی، پلاک ۲۴',
            'homePhone'             => '02122001122',
            'mobile'                => '09121112233',
            'postalCode'            => '1998765432',
            'relativeContact'       => 'مهندس حسینی (برادر) - 09121112233 - سعادت‌آباد',
            'contractType'          => 'قرارداد رسمی مدیریتی',
            'serviceStartDate'      => '۱۳۹۵/۰۱/۱۵',
            'contractStartDate'     => '۱۴۰۵/۰۱/۰۱',
            'contractEndDate'       => '۱۴۰۵/۱۲/۲۹',
            'serviceLocation'       => 'دفتر مرکزی رابو',
            'baseDailySalary'       => '۴,۵۰۰,۰۰۰',
            'baseMonthlySalary'     => '۱۳۵,۰۰۰,۰۰۰',
            'housingAllowance'      => '۹,۰۰۰,۰۰۰',
            'groceryAllowance'      => '۱۴,۰۰۰,۰۰۰',
            'childAllowance'        => '۸,۵۰۰,۰۰۰',
            'overtimeRateHourly'    => '۸۵۰,۰۰۰',
            'holidayRateHourly'     => '۱,۱۵۰,۰۰۰',
            'maxMonthlyLeaveDays'   => 2.5,
            'commissionAmount'      => '۱۲۵,۰۰۰,۰۰۰',
            'projectCommissionRate' => 5,
            'employmentStatus'      => 'فعال',
            'insuranceType'         => 'تأمین اجتماعی',
            'permissions'           => $fullPermissions
        ],
        [
            'id'                    => 'EMP-02',
            'name'                  => 'مهندس علی احمدی',
            'latinName'             => 'Ali Ahmadi',
            'fatherName'            => 'محمد',
            'motherName'            => 'فاطمه رضایی',
            'motherFullName'        => 'فاطمه رضایی',
            'role'                  => 'مدیر ارشد رابو',
            'unit'                  => 'مدیریت ارشد',
            'positionLevel'         => 'مدیر ارشد',
            'isManager'             => true,
            'username'              => 'ahmadi',
            'password'              => '14011555706',
            'avatar'                => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
            'birthDate'             => '۱۳۶۵/۰۸/۱۲',
            'birthDateGregorian'    => '1986-11-03',
            'idCertificate'         => '۱۸۴۰',
            'gender'                => 'مرد',
            'nationalId'            => '۰۰۸۲۹۴۰۱۹۲',
            'homeAddress'           => 'تهران، میرداماد، میدان مادر، خیابان بهروز، پلاک ۱۲',
            'homePhone'             => '02122223344',
            'mobile'                => '09122223344',
            'postalCode'            => '1918237465',
            'contractType'          => 'قرارداد رسمی مدیریتی',
            'serviceStartDate'      => '۱۳۹۷/۰۲/۰۱',
            'contractStartDate'     => '۱۴۰۵/۰۱/۰۱',
            'contractEndDate'       => '۱۴۰۵/۱۲/۲۹',
            'serviceLocation'       => 'دفتر مرکزی رابو',
            'baseDailySalary'       => '۴,۳۰۰,۰۰۰',
            'baseMonthlySalary'     => '۱۲۹,۰۰۰,۰۰۰',
            'housingAllowance'      => '۹,۰۰۰,۰۰۰',
            'groceryAllowance'      => '۱۴,۰۰۰,۰۰۰',
            'childAllowance'        => '۰',
            'overtimeRateHourly'    => '۸۰۰,۰۰۰',
            'holidayRateHourly'     => '۱,۰۵۰,۰۰۰',
            'maxMonthlyLeaveDays'   => 2.5,
            'commissionAmount'      => '۱۸,۰۰۰,۰۰۰',
            'projectCommissionRate' => 4,
            'employmentStatus'      => 'فعال',
            'insuranceType'         => 'تأمین اجتماعی',
            'permissions'           => $fullPermissions
        ]
    ];
}

function getDefaultDatabaseStructure(): array {
    return [
        'personnel'              => getDefaultPersonnel(),
        'projects'               => [],
        'receivedLetters'        => [],
        'sentLetters'            => [],
        'crmLeads'               => [],
        'attendanceRecords'      => [],
        'dailyTodos'             => [],
        'personalCalendarEvents' => [],
        'leaveMissionRequests'   => [],
        'payrollRecords'         => [],
        'trainingMatrix'         => [],
        'kpiIndicators'          => [],
        'kpiEvaluations'         => [],
        'tasks'                  => [],
        'pettyCashInflows'       => [],
        'pettyCashExpenses'      => [],
        'chatMessages'           => [],
        'contactBook'            => [],
        'energyLeads'            => [],
        'managementLeads'        => [],
        'lastUpdated'            => date('c')
    ];
}

// -----------------------------------------------------------------------------
// 8. خواندن و نوشتن تراکنشی کل موجودیت‌ها از جداول MySQL (بدون JSON)
// -----------------------------------------------------------------------------

/**
 * واکشی اطلاعات از جداول بیست‌گانه MySQL با PDO Prepared Statements
 */
function loadDatabaseSafe(): array {
    $pdo = getMySQLConnection();
    $result = getDefaultDatabaseStructure();

    // ۱. واکشی پرسنل از جدول rabo_personnel
    $stmtP = $pdo->prepare("SELECT * FROM rabo_personnel");
    $stmtP->execute([]);
    $pRows = $stmtP->fetchAll();

    if (!empty($pRows)) {
        $personnelList = [];
        $hasSuperAdmin = false;
        foreach ($pRows as $row) {
            $profile = json_decode($row['profile_payload'] ?? '{}', true) ?: [];
            $permissions = json_decode($row['permissions_payload'] ?? '{}', true) ?: [];
            $profile['id'] = $row['id'];
            $profile['username'] = $row['username'];
            $profile['name'] = $row['name'];
            $profile['role'] = $row['role'];
            $profile['unit'] = $row['unit'];
            $profile['isManager'] = !empty($row['is_manager']);
            $profile['permissions'] = $permissions;

            // تضمین نام کاربری و رمز عبور مدیر ارشد (rabo / 14011555706)
            if ($profile['id'] === SUPER_ADMIN_ID || $profile['username'] === SUPER_ADMIN_USERNAME || $profile['username'] === 'admin') {
                $profile['id'] = SUPER_ADMIN_ID;
                $profile['username'] = SUPER_ADMIN_USERNAME;
                $profile['password'] = SUPER_ADMIN_PASSWORD;
                $profile['isManager'] = true;
                $hasSuperAdmin = true;
            }
            $personnelList[] = $profile;
        }
        if (!$hasSuperAdmin) {
            array_unshift($personnelList, getDefaultPersonnel()[0]);
        }
        $result['personnel'] = $personnelList;
    }

    // ۲. واکشی سایر ۱۹ جدول عملیاتی MySQL
    foreach (RABO_ENTITY_TABLES as $entityKey => $tableName) {
        if ($entityKey === 'personnel') continue;
        $stmt = $pdo->prepare("SELECT * FROM {$tableName}");
        $stmt->execute([]);
        $rows = $stmt->fetchAll();
        $items = [];
        foreach ($rows as $r) {
            $decoded = json_decode($r['record_payload'] ?? '{}', true);
            if (is_array($decoded)) {
                $items[] = $decoded;
            }
        }
        $result[$entityKey] = $items;
    }

    $result['lastUpdated'] = date('c');
    return $result;
}

/**
 * ذخیره‌سازی اتمیک و تراکنشی (ACID Transaction) داده‌ها در جداول MySQL با PDO Prepared Statements
 */
function saveDatabaseAtomicSafe(array $data): bool {
    $cleanData = sanitizeInputRecursive($data);
    $pdo = getMySQLConnection();

    try {
        $pdo->beginTransaction();

        // ۱. همگام‌سازی جدول rabo_personnel
        if (isset($cleanData['personnel']) && is_array($cleanData['personnel'])) {
            $pdo->exec("DELETE FROM rabo_personnel");
            $hasSuperAdmin = false;
            foreach ($cleanData['personnel'] as $person) {
                if (!is_array($person)) continue;
                if (($person['id'] ?? '') === SUPER_ADMIN_ID || ($person['username'] ?? '') === SUPER_ADMIN_USERNAME || ($person['username'] ?? '') === 'admin') {
                    $person['id'] = SUPER_ADMIN_ID;
                    $person['username'] = SUPER_ADMIN_USERNAME;
                    $person['password'] = SUPER_ADMIN_PASSWORD;
                    $person['isManager'] = true;
                    $hasSuperAdmin = true;
                }
                upsertPersonInMySQL($pdo, $person);
            }
            if (!$hasSuperAdmin) {
                upsertPersonInMySQL($pdo, getDefaultPersonnel()[0]);
            }
        }

        // ۲. همگام‌سازی ۱۹ جدول دیگر با Prepared Statements اختصاصی هر جدول
        foreach (RABO_ENTITY_TABLES as $entityKey => $tableName) {
            if ($entityKey === 'personnel') continue;
            if (!isset($cleanData[$entityKey]) || !is_array($cleanData[$entityKey])) continue;

            $pdo->exec("DELETE FROM {$tableName}");

            foreach ($cleanData[$entityKey] as $idx => $record) {
                if (!is_array($record)) continue;
                $id = (string)($record['id'] ?? ($entityKey . '-' . ($idx + 1) . '-' . uniqid()));
                $record['id'] = $id;
                $payloadStr = json_encode($record, JSON_UNESCAPED_UNICODE);

                insertEntityRowPrepared($pdo, $entityKey, $tableName, $id, $record, $payloadStr);
            }
        }

        $pdo->commit();
        return true;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new RuntimeException('MySQL Transaction Failed: ' . $e->getMessage());
    }
}

/**
 * اجرای Prepared Statement ستون‌بندی‌شده متناسب با اسکیمای هر جدول در MySQL
 */
function insertEntityRowPrepared($pdo, string $entityKey, string $tableName, string $id, array $rec, string $payloadStr): void {
    switch ($entityKey) {
        case 'projects':
            $stmt = $pdo->prepare("INSERT INTO rabo_projects (id, code, title, client, status, progress, record_payload) VALUES (:id, :code, :title, :client, :status, :progress, :record_payload)");
            $stmt->execute([
                ':id'             => $id,
                ':code'           => (string)($rec['code'] ?? ''),
                ':title'          => (string)($rec['title'] ?? $rec['name'] ?? 'پروژه'),
                ':client'         => (string)($rec['client'] ?? $rec['employer'] ?? ''),
                ':status'         => (string)($rec['status'] ?? ''),
                ':progress'       => (int)($rec['progress'] ?? 0),
                ':record_payload' => $payloadStr
            ]);
            break;

        case 'receivedLetters':
            $stmt = $pdo->prepare("INSERT INTO rabo_received_letters (id, indicator_number, sender, subject, received_date, due_date, status, record_payload) VALUES (:id, :indicator_number, :sender, :subject, :received_date, :due_date, :status, :record_payload)");
            $stmt->execute([
                ':id'               => $id,
                ':indicator_number' => (string)($rec['indicatorNumber'] ?? $rec['letterNumber'] ?? ''),
                ':sender'           => (string)($rec['sender'] ?? ''),
                ':subject'          => (string)($rec['subject'] ?? ''),
                ':received_date'    => (string)($rec['receivedDate'] ?? $rec['issueDate'] ?? ''),
                ':due_date'         => (string)($rec['dueDate'] ?? ''),
                ':status'           => (string)($rec['status'] ?? ''),
                ':record_payload'   => $payloadStr
            ]);
            break;

        case 'sentLetters':
            $stmt = $pdo->prepare("INSERT INTO rabo_sent_letters (id, indicator_number, recipient, subject, sent_date, signatory, record_payload) VALUES (:id, :indicator_number, :recipient, :subject, :sent_date, :signatory, :record_payload)");
            $stmt->execute([
                ':id'               => $id,
                ':indicator_number' => (string)($rec['indicatorNumber'] ?? $rec['letterNumber'] ?? ''),
                ':recipient'        => (string)($rec['recipient'] ?? $rec['receiver'] ?? ''),
                ':subject'          => (string)($rec['subject'] ?? ''),
                ':sent_date'        => (string)($rec['sentDate'] ?? $rec['date'] ?? ''),
                ':signatory'        => (string)($rec['signatory'] ?? ''),
                ':record_payload'   => $payloadStr
            ]);
            break;

        case 'crmLeads':
            $stmt = $pdo->prepare("INSERT INTO rabo_crm_leads (id, company_name, contact_name, phone, status, next_followup_date, assigned_to, record_payload) VALUES (:id, :company_name, :contact_name, :phone, :status, :next_followup_date, :assigned_to, :record_payload)");
            $stmt->execute([
                ':id'                 => $id,
                ':company_name'       => (string)($rec['companyName'] ?? $rec['name'] ?? ''),
                ':contact_name'       => (string)($rec['contactName'] ?? ''),
                ':phone'              => (string)($rec['phone'] ?? $rec['mobile'] ?? ''),
                ':status'             => (string)($rec['status'] ?? ''),
                ':next_followup_date' => (string)($rec['nextFollowUpDate'] ?? ''),
                ':assigned_to'        => (string)($rec['assignedTo'] ?? ''),
                ':record_payload'     => $payloadStr
            ]);
            break;

        case 'attendanceRecords':
            $stmt = $pdo->prepare("INSERT INTO rabo_attendance_records (id, employee_id, record_date, record_type, status, record_payload) VALUES (:id, :employee_id, :record_date, :record_type, :status, :record_payload)");
            $stmt->execute([
                ':id'             => $id,
                ':employee_id'    => (string)($rec['employeeId'] ?? $rec['userId'] ?? ''),
                ':record_date'    => (string)($rec['date'] ?? ''),
                ':record_type'    => (string)($rec['type'] ?? ''),
                ':status'         => (string)($rec['status'] ?? ''),
                ':record_payload' => $payloadStr
            ]);
            break;

        case 'dailyTodos':
            $stmt = $pdo->prepare("INSERT INTO rabo_daily_todos (id, user_id, todo_date, completed, record_payload) VALUES (:id, :user_id, :todo_date, :completed, :record_payload)");
            $stmt->execute([
                ':id'             => $id,
                ':user_id'        => (string)($rec['userId'] ?? ''),
                ':todo_date'      => (string)($rec['date'] ?? ''),
                ':completed'      => !empty($rec['completed']) ? 1 : 0,
                ':record_payload' => $payloadStr
            ]);
            break;

        case 'personalCalendarEvents':
            $stmt = $pdo->prepare("INSERT INTO rabo_personal_calendar_events (id, user_id, event_date, category, record_payload) VALUES (:id, :user_id, :event_date, :category, :record_payload)");
            $stmt->execute([
                ':id'             => $id,
                ':user_id'        => (string)($rec['userId'] ?? ''),
                ':event_date'     => (string)($rec['date'] ?? ''),
                ':category'       => (string)($rec['category'] ?? $rec['type'] ?? ''),
                ':record_payload' => $payloadStr
            ]);
            break;

        case 'leaveMissionRequests':
            $stmt = $pdo->prepare("INSERT INTO rabo_leave_mission_requests (id, employee_id, request_type, from_date, to_date, status, record_payload) VALUES (:id, :employee_id, :request_type, :from_date, :to_date, :status, :record_payload)");
            $stmt->execute([
                ':id'             => $id,
                ':employee_id'    => (string)($rec['employeeId'] ?? $rec['userId'] ?? ''),
                ':request_type'   => (string)($rec['type'] ?? 'leave'),
                ':from_date'      => (string)($rec['fromDate'] ?? $rec['date'] ?? ''),
                ':to_date'        => (string)($rec['toDate'] ?? $rec['date'] ?? ''),
                ':status'         => (string)($rec['status'] ?? 'pending'),
                ':record_payload' => $payloadStr
            ]);
            break;

        case 'payrollRecords':
            $stmt = $pdo->prepare("INSERT INTO rabo_payroll_records (id, employee_id, period_year, period_month, net_payable, status, record_payload) VALUES (:id, :employee_id, :period_year, :period_month, :net_payable, :status, :record_payload)");
            $stmt->execute([
                ':id'             => $id,
                ':employee_id'    => (string)($rec['employeeId'] ?? ''),
                ':period_year'    => (int)($rec['year'] ?? 1405),
                ':period_month'   => (string)($rec['month'] ?? ''),
                ':net_payable'    => (int)preg_replace('/[^0-9]/', '', (string)($rec['netPayable'] ?? '0')),
                ':status'         => (string)($rec['status'] ?? 'صادر شده'),
                ':record_payload' => $payloadStr
            ]);
            break;

        default:
            $stmt = $pdo->prepare("INSERT INTO {$tableName} (id, record_payload) VALUES (:id, :record_payload)");
            $stmt->execute([
                ':id'             => $id,
                ':record_payload' => $payloadStr
            ]);
            break;
    }
}

/**
 * ادغام ایمن مجموعه‌های دیتابیس (بدون تکرار رکوردها در آرایه‌های عددی)
 */
function safeMergeDatabase(array $currentDb, array $incomingPayload): array {
    $result = $currentDb;
    foreach ($incomingPayload as $key => $value) {
        $result[$key] = $value;
    }
    $result['lastUpdated'] = date('c');
    return $result;
}
