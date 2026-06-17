import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import waitOn from 'wait-on';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let splashWindow;
let serverProcess;

/* ─────────────────────────────────────────────────────────────
   Splash / loading screen shown while AI models load
   (Critical for non-technical users — they need to see progress)
───────────────────────────────────────────────────────────── */
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 340,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    backgroundColor: '#060f1e',
    webPreferences: { nodeIntegration: false },
  });

  // Inline splash HTML — no external files needed
  const splashHTML = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8"/>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body {
        background: #060f1e;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        text-align: center;
        padding: 32px;
      }
      .logo { font-size: 56px; margin-bottom: 16px; }
      h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 6px; }
      h1 span { color: #c9973a; }
      .tagline { font-size: 14px; color: rgba(255,255,255,0.45); margin-bottom: 36px; }
      .progress-track {
        width: 100%;
        max-width: 320px;
        height: 4px;
        background: rgba(255,255,255,0.08);
        border-radius: 99px;
        overflow: hidden;
        margin-bottom: 14px;
      }
      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #c9973a, #e3c68e);
        border-radius: 99px;
        width: 0%;
        animation: load 8s ease-in-out forwards;
      }
      @keyframes load {
        0%   { width: 5%; }
        20%  { width: 25%; }
        50%  { width: 55%; }
        80%  { width: 82%; }
        100% { width: 95%; }
      }
      .status {
        font-size: 12px;
        color: rgba(255,255,255,0.35);
        height: 18px;
        animation: blink 2s ease-in-out infinite;
      }
      @keyframes blink { 50% { opacity: 0.4 } }
      .first-run {
        margin-top: 24px;
        background: rgba(201,151,58,0.1);
        border: 1px solid rgba(201,151,58,0.2);
        border-radius: 10px;
        padding: 12px 16px;
        font-size: 12px;
        color: rgba(255,255,255,0.5);
        max-width: 340px;
        line-height: 1.6;
      }
      .first-run strong { color: #c9973a; }
    </style>
  </head>
  <body>
    <div class="logo">⚖️</div>
    <h1>VAKE<span>EL</span></h1>
    <p class="tagline">Your free AI legal advisor</p>
    <div class="progress-track">
      <div class="progress-bar"></div>
    </div>
    <div class="status" id="status">Loading AI models…</div>
    <div class="first-run">
      <strong>First time?</strong> VAKEEL is downloading AI models (~1.2 GB).<br/>
      This happens <strong>once only</strong>. Future launches are instant.
    </div>
    <script>
      const msgs = [
        'Loading AI models…',
        'Starting legal analysis engine…',
        'Loading OCR for document reading…',
        'Loading voice recognition…',
        'Almost ready…',
      ];
      let i = 0;
      setInterval(() => {
        i = (i + 1) % msgs.length;
        document.getElementById('status').textContent = msgs[i];
      }, 2200);
    </script>
  </body>
  </html>`;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
  splashWindow.show();
}

/* ─────────────────────────────────────────────────────────────
   Start the Express backend + QVAC AI models
───────────────────────────────────────────────────────────── */
async function startServer() {
  const serverPath = path.join(__dirname, '../server/index.mjs');
  const userDataPath = app.getPath('userData');
  const isPackaged = app.isPackaged;

  serverProcess = spawn('node', [serverPath], {
    env: {
      ...process.env,
      VAKEEL_USER_DATA: userDataPath,
      PORT: '3001',
      NODE_ENV: isPackaged ? 'production' : 'development',
      APP_DIR: path.join(__dirname, '..'),
    },
    stdio: 'inherit',
  });

  serverProcess.on('error', (err) => {
    console.error('Server process error:', err);
  });

  // Wait for server health endpoint (up to 5 min for first-run model downloads)
  return waitOn({
    resources: ['http://localhost:3001/api/health'],
    timeout: 300000,  // 5 minutes — needed for model downloads on first run
    interval: 500,
  });
}

/* ─────────────────────────────────────────────────────────────
   Main window
───────────────────────────────────────────────────────────── */
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1340,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    show: false,           // Hidden until ready — prevents blank flash
    backgroundColor: '#f8f6f1',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'VAKEEL — AI Legal Advisor',
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Open external links in system browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const url = app.isPackaged
    ? 'http://localhost:3001'
    : 'http://localhost:5000';

  await mainWindow.loadURL(url);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  // Show main window and close splash when ready
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });
}

/* ─────────────────────────────────────────────────────────────
   App lifecycle
───────────────────────────────────────────────────────────── */
app.whenReady().then(async () => {
  createSplashWindow();

  try {
    await startServer();
    await createMainWindow();
  } catch (err) {
    console.error('Failed to start VAKEEL:', err);
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
});
