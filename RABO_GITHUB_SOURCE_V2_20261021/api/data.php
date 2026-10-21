<?php
/**
 * Rabo Engineering ERP - Backend Data Persistence Engine (PHP Fallback & Sync)
 * Supports atomic reads and writes to data/rabo_database.json and data/rabo_db.json
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

$dbFilePath = $dataDir . '/rabo_db.json';
$legacyDbFilePath = $dataDir . '/rabo_database.json';

function getDatabaseContent($dbFilePath, $legacyDbFilePath) {
    if (file_exists($dbFilePath)) {
        $content = file_get_contents($dbFilePath);
        $decoded = json_decode($content, true);
        if ($decoded) {
            return $decoded;
        }
    }
    if (file_exists($legacyDbFilePath)) {
        $content = file_get_contents($legacyDbFilePath);
        $decoded = json_decode($content, true);
        if ($decoded) {
            return $decoded;
        }
    }
    return [
        'personnel' => [],
        'projects' => [],
        'receivedLetters' => [],
        'sentLetters' => [],
        'crmLeads' => [],
        'attendanceRecords' => [],
        'dailyTodos' => [],
        'personalCalendarEvents' => [],
        'leaveMissionRequests' => [],
        'payrollRecords' => [],
        'trainingMatrix' => [],
        'kpiIndicators' => [],
        'kpiEvaluations' => [],
        'tasks' => [],
        'pettyCashInflows' => [],
        'pettyCashExpenses' => [],
        'chatMessages' => [],
        'contactBook' => [],
        'energyLeads' => [],
        'managementLeads' => [],
        'lastUpdated' => date('c')
    ];
}

function saveDatabaseContent($data, $dbFilePath, $legacyDbFilePath) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $tmpPath = $dbFilePath . '.tmp_' . time() . '_' . rand(1000, 9999);
    
    file_put_contents($tmpPath, $json);
    rename($tmpPath, $dbFilePath);
    file_put_contents($legacyDbFilePath, $json);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $db = getDatabaseContent($dbFilePath, $legacyDbFilePath);
    echo json_encode($db, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $input = file_get_contents('php://input');
    $payload = json_decode($input, true);
    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON payload'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $currentDb = getDatabaseContent($dbFilePath, $legacyDbFilePath);
    $updatedDb = array_merge($currentDb, $payload);
    $updatedDb['lastUpdated'] = date('c');

    saveDatabaseContent($updatedDb, $dbFilePath, $legacyDbFilePath);

    echo json_encode(['success' => true, 'timestamp' => $updatedDb['lastUpdated']], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method Not Allowed'], JSON_UNESCAPED_UNICODE);
