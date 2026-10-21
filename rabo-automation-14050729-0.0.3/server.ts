import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = 3000;

// High payload limit for base64 uploads and full database syncs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Security headers middleware
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Paths for persistence (Strictly MySQL / Binary InnoDB Store - NO JSON files)
const dataDir = path.resolve(__dirname, 'data');
const uploadsDir = path.resolve(__dirname, 'public', 'uploads');
const apiDir = path.resolve(__dirname, 'api');
const backupDir = path.resolve(dataDir, 'backups');

// Ensure data, backups, and uploads directories exist
for (const dir of [dataDir, uploadsDir, backupDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Clean up any legacy JSON database files so only MySQL storage is used
for (const legacyJson of ['rabo_db.json', 'rabo_database.json']) {
  const p = path.resolve(dataDir, legacyJson);
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
    } catch {}
  }
}

/**
 * Execute PHP Backend Script (api/*.php) via Fast CLI Bridge
 */
const executePhpEndpoint = (scriptName: string, req: express.Request, res: express.Response) => {
  const scriptPath = path.resolve(apiDir, scriptName);
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  const bodyString = typeof req.body === 'object' && req.body !== null ? JSON.stringify(req.body) : '';

  const runnerCode = `
    $_SERVER['REQUEST_METHOD'] = ${JSON.stringify(req.method)};
    $_SERVER['REQUEST_URI'] = ${JSON.stringify(req.originalUrl)};
    $_SERVER['REMOTE_ADDR'] = ${JSON.stringify(req.ip || '127.0.0.1')};
    $_SERVER['HTTP_USER_AGENT'] = ${JSON.stringify(req.headers['user-agent'] || 'RaboClient/1.0')};
    $_SERVER['HTTP_AUTHORIZATION'] = ${JSON.stringify(req.headers['authorization'] || '')};
    parse_str(${JSON.stringify(queryString)}, $_GET);
    require ${JSON.stringify(scriptPath)};
  `;

  const result = spawnSync('php', ['-r', runnerCode], {
    cwd: apiDir,
    input: bodyString,
    maxBuffer: 50 * 1024 * 1024,
    encoding: 'utf-8'
  });

  if (result.error) {
    return res.status(500).json({
      success: false,
      error: 'خطا در اجرای مفسر PHP و MySQL',
      details: result.error.message
    });
  }

  const stdout = (result.stdout || '').trim();
  if (scriptName === 'backup.php' && req.query.action === 'download') {
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    return res.send(stdout);
  }

  try {
    const parsed = JSON.parse(stdout);
    const statusCode = parsed.success === false && parsed.error?.includes('مسدود') ? 429 : (parsed.success === false && parsed.error?.includes('نادرست') ? 401 : 200);
    return res.status(statusCode).json(parsed);
  } catch {
    return res.send(stdout);
  }
};

// ---------------- PHP + MYSQL REST API ROUTES ----------------

// 1. Authentication Endpoint (/api/auth.php) - Super Admin: rabo / 14011555706
app.all(['/api/auth', '/api/auth.php'], (req, res) => {
  executePhpEndpoint('auth.php', req, res);
});

// 2. MySQL Data Sync Endpoint (/api/data.php, /api/db, /api/db/sync)
app.all(['/api/db', '/api/db/sync', '/api/data.php'], (req, res) => {
  executePhpEndpoint('data.php', req, res);
});

// 3. Hardened File Upload Endpoint (/api/upload.php, /api/upload)
app.post(['/api/upload', '/api/upload.php'], (req, res) => {
  executePhpEndpoint('upload.php', req, res);
});

// 4. MySQL & Security Diagnostics Endpoint (/api/health.php, /api/health)
app.get(['/api/health', '/api/health.php'], (req, res) => {
  executePhpEndpoint('health.php', req, res);
});

// 5. MySQL .sql Backup & Restore Endpoint (/api/backup.php, /api/backup)
app.all(['/api/backup', '/api/backup.php'], (req, res) => {
  executePhpEndpoint('backup.php', req, res);
});


// ---------------- EXISTING SERVICES (Maps Grounding & Gemini Live) ----------------

// API route for Maps Grounding with gemini-2.5-flash
app.post('/api/maps-grounding', async (req, res) => {
  try {
    const { prompt, latLng } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in environment' });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Use gemini-2.5-flash with googleMaps tool
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        ...(latLng && latLng.latitude && latLng.longitude ? {
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: Number(latLng.latitude),
                longitude: Number(latLng.longitude),
              }
            }
          }
        } : {})
      }
    });

    const text = response.text || '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    res.json({
      text,
      groundingChunks
    });
  } catch (error: any) {
    console.error('Error in maps-grounding API:', error);
    res.status(500).json({ 
      error: error.message || 'Error executing Maps Grounding request' 
    });
  }
});

// Setup WebSocket server for Gemini Live API (gemini-3.8-live)
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Live API WebSocket');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY is not set on server' }));
    clientWs.close();
    return;
  }

  let session: any = null;

  try {
    const ai = new GoogleGenAI({ apiKey });

    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' }
          }
        },
        systemInstruction: 'شما دستیار صوتی هوشمند شرکت مهندسی رابو هستید. پاسخ‌ها را به زبان فارسی، به صورت موجز، حرفه‌ای، محترمانه و روان برای کارشناسان و مدیران سازمان بیان کنید.'
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
        onclose: () => {
          console.log('Gemini Live session closed');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ status: 'session_closed' }));
          }
        }
      }
    });

    clientWs.send(JSON.stringify({ status: 'ready', model: 'gemini-3.8-live' }));

    clientWs.on('message', (data: any) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio && session) {
          session.sendRealtimeInput({
            audio: {
              data: parsed.audio,
              mimeType: 'audio/pcm;rate=16000'
            }
          });
        }
      } catch (err) {
        console.error('Error processing client audio packet:', err);
      }
    });

    clientWs.on('close', () => {
      if (session) {
        try {
          session.close();
        } catch {}
      }
    });
  } catch (err: any) {
    console.error('Error establishing Gemini Live session:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: err.message || 'Failed to connect to Live API' }));
    }
  }
});

// Serve public static folder (which includes /uploads)
app.use(express.static(path.resolve(__dirname, 'public')));

// Vite middleware in dev or static files in production
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, port: port, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
