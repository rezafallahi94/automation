<?php
/**
 * Rabo Engineering ERP - Hardened File Upload Service with MySQL Audit Logging (PHP)
 * سامانه اتوماسیون مهندسی رابو - سرویس بارگذاری امن پیوست‌ها با ثبت در دیتابیس MySQL
 *
 * لایه‌های امنیتی بارگذاری فایل:
 * 1. بررسی لیست سفید پسوندها (Extension Whitelist) و مسدودسازی کامل پسوندهای اجرایی (.php, .phar, .sh, .exe)
 * 2. بررسی بایت‌های جادویی محتوا (Magic Bytes / finfo_buffer) برای جلوگیری از جعل MIME
 * 3. اسکن محتوای باینری برای جلوگیری از تزریق Web-Shell (<?php, <?=, <script)
 * 4. تولید نام فایل تصادفی رمزنگاری‌شده (random_bytes) و ایجاد خودکار .htaccess ضد اجرای اسکریپت در پوشه uploads
 * 5. ثبت مشخصات فایل و هش SHA-256 در جدول MySQL (rabo_uploads_log)
 */

require_once __DIR__ . '/config.php';

handleCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'POST') {
    sendJsonResponse([
        'success' => false,
        'error'   => 'برای بارگذاری فایل فقط متد POST مجاز است.'
    ], 405);
}

// ایجاد خودکار فایل امنیتی .htaccess در پوشه آپلودها برای غیرفعال کردن کامل اجرای PHP
$uploadsHtaccess = UPLOADS_DIR . '/.htaccess';
if (!file_exists($uploadsHtaccess)) {
    $htaccessRules = <<<HTACCESS
# Rabo ERP Security - Disable Script Execution in Uploads Directory
Options -Indexes -ExecCGI
RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .phps .phar .cgi .pl .py
RemoveType .php .phtml .php3 .php4 .php5 .php7 .phps .phar .cgi .pl .py
<IfModule mod_php.c>
    php_flag engine off
</IfModule>
<IfModule mod_php8.c>
    php_flag engine off
</IfModule>
<FilesMatch "\.(php|phtml|php3|php4|php5|php7|phps|phar|pl|py|cgi|sh|exe|bat|cmd|htaccess)$">
    Require all denied
</FilesMatch>
HTACCESS;
    @file_put_contents($uploadsHtaccess, $htaccessRules);
}

// لیست سفید پسوندهای مجاز مهندسی و اداری
$allowedExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'csv', 'zip', 'rar', 'dwg', 'dxf'
];

// پسوندهای خطرناک و ممنوعه
$forbiddenExtensions = [
    'php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'php8', 'phps', 'phar',
    'exe', 'bat', 'cmd', 'sh', 'bash', 'cgi', 'pl', 'py', 'rb', 'jar',
    'asp', 'aspx', 'jsp', 'htaccess', 'htpasswd', 'ini', 'config', 'svg', 'html', 'htm', 'js'
];

$maxFileSize = 50 * 1024 * 1024; // حداکثر ۵۰ مگابایت

/**
 * اعتبارسنجی امنیتی بافر فایل، ذخیره در دیسک و ثبت در جدول MySQL
 */
function validateAndStoreSecureFile(string $originalName, string $binaryData, string $clientMime = ''): array {
    global $allowedExtensions, $forbiddenExtensions, $maxFileSize;

    $size = strlen($binaryData);
    if ($size === 0) {
        throw new RuntimeException('محتوای فایل ارسالی خالی است.');
    }
    if ($size > $maxFileSize) {
        throw new RuntimeException('حجم فایل بیش از سقف مجاز (۵۰ مگابایت) است.');
    }

    // ۱. بررسی پسوند و جلوگیری از Double Extension Attack (مانند file.php.jpg)
    $cleanOriginal = basename(str_replace(['\\', '/', "\0"], '_', $originalName));
    $ext = strtolower(pathinfo($cleanOriginal, PATHINFO_EXTENSION));

    if ($ext === '' || in_array($ext, $forbiddenExtensions, true) || !in_array($ext, $allowedExtensions, true)) {
        logSecurityAudit('UPLOAD_BLOCKED_EXTENSION', 'CRITICAL', null, null, "Blocked file upload with extension: .{$ext}");
        throw new RuntimeException("پسوند فایل (.{$ext}) به دلایل امنیتی مجاز نمی‌باشد.");
    }

    if (preg_match('/\.(php|phtml|phar|sh|exe|pl|py|cgi|htaccess)\./i', $cleanOriginal)) {
        logSecurityAudit('UPLOAD_DOUBLE_EXT_BLOCKED', 'CRITICAL', null, null, "Blocked double extension: {$cleanOriginal}");
        throw new RuntimeException('نام فایل حاوی پسوند ترکیبی غیرمجاز است.');
    }

    // ۲. اسکن محتوای باینری برای جلوگیری از تزریق کد PHP / Web-Shell
    $headSample = substr($binaryData, 0, 8192);
    if (preg_match('/<\?(php|=)/i', $headSample) || preg_match('/<script\b/i', $headSample)) {
        logSecurityAudit('UPLOAD_MALICIOUS_PAYLOAD', 'CRITICAL', null, null, "Malicious script signature detected inside {$cleanOriginal}");
        throw new RuntimeException('محتوای فایل حاوی کدهای اسکریپتی غیرمجاز است و توسط سپر امنیتی مسدود شد.');
    }

    // ۳. تشخیص واقعی MIME از روی بایت‌های فایل (Magic Bytes)
    $detectedMime = $clientMime ?: 'application/octet-stream';
    if (function_exists('finfo_open')) {
        $finfo = @finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo) {
            $realMime = @finfo_buffer($finfo, $binaryData);
            @finfo_close($finfo);
            if ($realMime) {
                $detectedMime = $realMime;
            }
        }
    }

    if (stripos($detectedMime, 'php') !== false || stripos($detectedMime, 'x-executable') !== false || stripos($detectedMime, 'x-shellscript') !== false) {
        logSecurityAudit('UPLOAD_MIME_BLOCKED', 'CRITICAL', null, null, "Blocked dangerous MIME: {$detectedMime}");
        throw new RuntimeException('نوع باینری فایل غیرمجاز تشخیص داده شد.');
    }

    // ۴. تولید نام فایل یکتا با بایت‌های تصادفی رمزنگاری‌شده
    $baseName = pathinfo($cleanOriginal, PATHINFO_FILENAME);
    $safeBase = preg_replace('/[^a-zA-Z0-9._\-\x{0600}-\x{06FF}]/u', '_', $baseName);
    $safeBase = substr(trim($safeBase, '_'), 0, 80) ?: 'attachment';
    $randomToken = bin2hex(random_bytes(6));
    $storedFilename = time() . '_' . $randomToken . '_' . $safeBase . '.' . $ext;
    $targetPath = UPLOADS_DIR . '/' . $storedFilename;

    if (@file_put_contents($targetPath, $binaryData, LOCK_EX) === false) {
        throw new RuntimeException('خطا در ذخیره‌سازی فایل در مسیر امن سرور.');
    }
    @chmod($targetPath, 0640);

    $sha256 = hash('sha256', $binaryData);

    // ۵. ثبت اطلاعات فایل در جدول MySQL (rabo_uploads_log) با PDO Prepared Statement
    $pdo = getMySQLConnection();
    $stmt = $pdo->prepare("
        INSERT INTO rabo_uploads_log (stored_filename, original_filename, mime_type, file_size, sha256_checksum, uploader_ip)
        VALUES (:stored_filename, :original_filename, :mime_type, :file_size, :sha256_checksum, :uploader_ip)
    ");
    $stmt->execute([
        ':stored_filename'   => $storedFilename,
        ':original_filename' => $cleanOriginal,
        ':mime_type'         => $detectedMime,
        ':file_size'         => $size,
        ':sha256_checksum'   => $sha256,
        ':uploader_ip'       => getClientIpAddress()
    ]);

    logSecurityAudit('FILE_UPLOAD_SUCCESS', 'INFO', null, null, "Stored {$storedFilename} ({$size} bytes, SHA256: {$sha256})");

    return [
        'success'        => true,
        'url'            => '/uploads/' . $storedFilename,
        'filename'       => $storedFilename,
        'originalName'   => $cleanOriginal,
        'size'           => $size,
        'mimeType'       => $detectedMime,
        'sha256Checksum' => $sha256
    ];
}

try {
    // حالت اول: آپلود از طریق Multipart Form-Data ($_FILES)
    if (!empty($_FILES['file']) && isset($_FILES['file']['tmp_name'])) {
        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            sendJsonResponse([
                'success' => false,
                'error'   => 'خطا در دریافت فایل ارسالی (کد: ' . (int)$file['error'] . ')'
            ], 400);
        }
        $binary = @file_get_contents($file['tmp_name']);
        $res = validateAndStoreSecureFile($file['name'] ?? 'document.pdf', (string)$binary, $file['type'] ?? '');
        sendJsonResponse($res, 200);
    }

    // حالت دوم: آپلود از طریق Base64 Payload
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);
    if (!is_array($payload) || empty($payload['data'])) {
        sendJsonResponse([
            'success' => false,
            'error'   => 'هیچ داده فایلی برای بارگذاری ارسال نشده است.'
        ], 400);
    }

    $rawData = (string)$payload['data'];
    $filename = (string)($payload['filename'] ?? 'document.pdf');
    $mimeType = (string)($payload['mimeType'] ?? '');

    if (preg_match('/^data:([^;]+);base64,(.*)$/s', $rawData, $m)) {
        if ($mimeType === '') {
            $mimeType = $m[1];
        }
        $rawData = $m[2];
    }

    $binary = base64_decode(str_replace(' ', '+', $rawData), true);
    if ($binary === false) {
        sendJsonResponse([
            'success' => false,
            'error'   => 'فرمت داده Base64 فایل نامعتبر است.'
        ], 400);
    }

    $res = validateAndStoreSecureFile($filename, $binary, $mimeType);
    sendJsonResponse($res, 200);

} catch (Throwable $e) {
    sendJsonResponse([
        'success' => false,
        'error'   => $e->getMessage()
    ], 400);
}
