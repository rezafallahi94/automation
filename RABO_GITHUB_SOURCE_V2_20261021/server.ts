import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
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

// Paths for persistence
const dataDir = path.resolve(__dirname, 'data');
const uploadsDir = path.resolve(__dirname, 'public', 'uploads');
const dbFilePath = path.resolve(dataDir, 'rabo_db.json');
const legacyDbFilePath = path.resolve(dataDir, 'rabo_database.json');

// Ensure data and uploads directories exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const fullManagerPermissions = {
  dashboard: true,
  letters: true,
  crm: true,
  finance: true,
  hr: true,
  devOpportunities: true,
  projects: true,
  tasks: true,
  dashboard_personal: true,
  dashboard_executive: true,
  letters_inbox: true,
  letters_outbox_create: true,
  letters_archive: true,
  crm_fire: true,
  crm_energy: true,
  crm_management: true,
  crm_customers: true,
  crm_followups: true,
  projects_view: true,
  projects_manage: true,
  tasks_board: true,
  tasks_chat: true,
  finance_petty_cash: true,
  finance_audit: true,
  hr_employees: true,
  hr_attendance: true,
  hr_payroll: true,
  hr_kpi: true,
  hr_training: true
};

// 2 Senior Managers baseline for Rabo database
const defaultPersonnel = [
  {
    id: 'EMP-01',
    name: 'مهندس رضا محمدی',
    latinName: 'Reza Mohammadi',
    fatherName: 'حسین',
    motherName: 'زهرا کاظمی',
    motherFullName: 'زهرا کاظمی',
    role: 'مدیر کل و ارشد رابو',
    unit: 'مدیریت ارشد',
    positionLevel: 'مدیر ارشد',
    isManager: true,
    username: 'admin',
    password: '123',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    birthDate: '۱۳۶۳/۰۴/۱۵',
    birthDateGregorian: '1984-07-06',
    idCertificate: '۴۵۲۹',
    gender: 'مرد',
    nationalId: '۰۰۷۱۸۲۹۳۴۱',
    homeAddress: 'تهران، سعادت‌آباد، خیابان سرو غربی، پلاک ۲۴',
    homePhone: '02122001122',
    mobile: '09121112233',
    postalCode: '1998765432',
    relativeContact: 'مهندس حسینی (برادر) - 09121112233 - سعادت‌آباد',
    relatives: [{ name: 'مهندس حسینی', phone: '02122001122', mobile: '09121112233' }],
    guaranteeType: 'چک صیادی',
    guaranteeDetails: 'چک تضمین شماره ۲۴۹۱۰۲۸۵ به مبلغ ۵۰۰ میلیون تومان',
    jobDescriptionDoc: 'JobDesc-SeniorManager-Rabo.pdf',
    contractType: 'قرارداد رسمی مدیریتی',
    serviceStartDate: '۱۳۹۵/۰۱/۱۵',
    contractStartDate: '۱۴۰۵/۰۱/۰۱',
    contractEndDate: '۱۴۰۵/۱۲/۲۹',
    serviceLocation: 'دفتر مرکزی رابو',
    baseDailySalary: '۴,۵۰۰,۰۰۰',
    baseMonthlySalary: '۱۳۵,۰۰۰,۰۰۰',
    housingAllowance: '۹,۰۰۰,۰۰۰',
    groceryAllowance: '۱۴,۰۰۰,۰۰۰',
    childAllowance: '۸,۵۰۰,۰۰۰',
    overtimeRateHourly: '۸۵۰,۰۰۰',
    holidayRateHourly: '۱,۱۵۰,۰۰۰',
    maxMonthlyLeaveDays: 2.5,
    commissionAmount: '۱۲۵,۰۰۰,۰۰۰',
    projectCommissionRate: 5,
    employmentStatus: 'فعال',
    insuranceType: 'تأمین اجتماعی',
    managerNotes: 'مدیریت ارشد اجرایی سازمان',
    kpis: [],
    permissions: fullManagerPermissions
  },
  {
    id: 'EMP-02',
    name: 'مهندس علی احمدی',
    latinName: 'Ali Ahmadi',
    fatherName: 'محمد',
    motherName: 'فاطمه رضایی',
    motherFullName: 'فاطمه رضایی',
    role: 'مدیر ارشد رابو',
    unit: 'مدیریت ارشد',
    positionLevel: 'مدیر ارشد',
    isManager: true,
    username: 'ahmadi',
    password: '123',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    birthDate: '۱۳۶۵/۰۸/۱۲',
    birthDateGregorian: '1986-11-03',
    idCertificate: '۱۸۴۰',
    gender: 'مرد',
    nationalId: '۰۰۸۲۹۴۰۱۹۲',
    homeAddress: 'تهران، میرداماد، میدان مادر، خیابان بهروز، پلاک ۱۲',
    homePhone: '02122223344',
    mobile: '09122223344',
    postalCode: '1918237465',
    relativeContact: 'دکتر احمدی (پدر) - 09122223344 - میرداماد',
    relatives: [{ name: 'دکتر احمدی', phone: '02122223344', mobile: '09122223344' }],
    guaranteeType: 'چک صیادی',
    guaranteeDetails: 'چک شماره ۵۹۲۱۰۳۸۲ به مبلغ ۵۰۰ میلیون تومان',
    jobDescriptionDoc: 'JobDesc-Director-Ahmadi.pdf',
    contractType: 'قرارداد رسمی مدیریتی',
    serviceStartDate: '۱۳۹۷/۰۲/۰۱',
    contractStartDate: '۱۴۰۵/۰۱/۰۱',
    contractEndDate: '۱۴۰۵/۱۲/۲۹',
    serviceLocation: 'دفتر مرکزی رابو',
    baseDailySalary: '۴,۳۰۰,۰۰۰',
    baseMonthlySalary: '۱۲۹,۰۰۰,۰۰۰',
    housingAllowance: '۹,۰۰۰,۰۰۰',
    groceryAllowance: '۱۴,۰۰۰,۰۰۰',
    childAllowance: '۰',
    overtimeRateHourly: '۸۰۰,۰۰۰',
    holidayRateHourly: '۱,۰۵۰,۰۰۰',
    maxMonthlyLeaveDays: 2.5,
    commissionAmount: '۱۸,۰۰۰,۰۰۰',
    projectCommissionRate: 4,
    employmentStatus: 'فعال',
    insuranceType: 'تأمین اجتماعی',
    kpis: [],
    permissions: fullManagerPermissions
  }
];

const defaultDatabaseStructure = {
  personnel: defaultPersonnel,
  projects: [],
  receivedLetters: [],
  sentLetters: [],
  crmLeads: [],
  attendanceRecords: [],
  dailyTodos: [],
  personalCalendarEvents: [],
  leaveMissionRequests: [],
  payrollRecords: [],
  trainingMatrix: [],
  kpiIndicators: [],
  kpiEvaluations: [],
  tasks: [],
  pettyCashInflows: [],
  pettyCashExpenses: [],
  chatMessages: [],
  contactBook: [],
  energyLeads: [],
  managementLeads: [],
  lastUpdated: new Date().toISOString()
};

// In-Memory Database Cache for instant responses
let cachedDatabase: any = null;

const saveDatabaseAtomic = (data: any) => {
  cachedDatabase = data;
  const jsonContent = JSON.stringify(data, null, 2);
  const tempFilePath = `${dbFilePath}.tmp_${Date.now()}`;
  try {
    fs.writeFileSync(tempFilePath, jsonContent, 'utf-8');
    fs.renameSync(tempFilePath, dbFilePath);
  } catch (err) {
    console.error('Error in saveDatabaseAtomic (dbFilePath):', err);
    try {
      fs.writeFileSync(dbFilePath, jsonContent, 'utf-8');
    } catch {}
  }

  // Also sync to data/rabo_database.json
  try {
    fs.writeFileSync(legacyDbFilePath, jsonContent, 'utf-8');
  } catch (err) {
    console.warn('Error saving to legacyDbFilePath:', err);
  }
};

const loadDatabase = (): any => {
  if (cachedDatabase) return cachedDatabase;
  try {
    if (fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, 'utf-8');
      cachedDatabase = JSON.parse(raw);
      return cachedDatabase;
    }
    // Migration fallback from rabo_database.json
    if (fs.existsSync(legacyDbFilePath)) {
      const raw = fs.readFileSync(legacyDbFilePath, 'utf-8');
      cachedDatabase = JSON.parse(raw);
      saveDatabaseAtomic(cachedDatabase);
      return cachedDatabase;
    }
  } catch (e) {
    console.warn('Failed to load database from file, initializing default:', e);
  }
  cachedDatabase = { ...defaultDatabaseStructure };
  saveDatabaseAtomic(cachedDatabase);
  return cachedDatabase;
};

// Initialize file database on boot
loadDatabase();

// ---------------- DATABASE REST APIS ----------------

// 1. GET /api/db & /api/data.php - Read current database with instant cache
app.get(['/api/db', '/api/data.php'], (_req, res) => {
  try {
    const data = loadDatabase();
    res.json(data);
  } catch (err: any) {
    console.error('Error reading database:', err);
    res.status(500).json({ error: 'Failed to read database', details: err.message });
  }
});

// 2. POST /api/db/sync & /api/data.php - Save / sync entire database or keys with atomic persistence
app.post(['/api/db/sync', '/api/data.php'], (req, res) => {
  try {
    const payload = req.body;
    const currentData = loadDatabase();

    const updatedData = {
      ...currentData,
      ...payload,
      lastUpdated: new Date().toISOString()
    };

    saveDatabaseAtomic(updatedData);

    res.json({ success: true, timestamp: updatedData.lastUpdated });
  } catch (err: any) {
    console.error('Error syncing database:', err);
    res.status(500).json({ error: 'Failed to sync database', details: err.message });
  }
});

// 3. POST /api/upload - Handle Base64 file uploads
app.post('/api/upload', (req, res) => {
  try {
    const { filename, data, mimeType } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    // Strip data URL header if present (e.g., data:image/png;base64,...)
    const base64Data = data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const cleanFilename = (filename || 'file.bin')
      .replace(/[^a-zA-Z0-9._\-\u0600-\u06FF]/g, '_');
    const uniqueFilename = `${Date.now()}-${cleanFilename}`;
    const targetPath = path.resolve(uploadsDir, uniqueFilename);

    fs.writeFileSync(targetPath, buffer);

    const fileUrl = `/uploads/${uniqueFilename}`;
    res.json({
      success: true,
      url: fileUrl,
      filename: uniqueFilename,
      originalName: filename,
      size: buffer.length,
      mimeType: mimeType || 'application/octet-stream'
    });
  } catch (err: any) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: 'File upload failed', details: err.message });
  }
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
