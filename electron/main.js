import { app, BrowserWindow, shell, utilityProcess } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

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
      .logo { margin-bottom: 24px; animation: pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
      .logo svg { width: 96px; height: 96px; }
      @keyframes pop {
        0% { transform: scale(0.8); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
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
        background: linear-gradient(90deg, #10B981, #c9973a);
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
    <div class="logo">
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="vakeel-gold" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FDE68A" />
            <stop offset="0.5" stop-color="#D97706" />
            <stop offset="1" stop-color="#78350F" />
          </linearGradient>
          <linearGradient id="vakeel-green" x1="24" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
            <stop stop-color="#10B981" />
            <stop offset="1" stop-color="#047857" />
          </linearGradient>
        </defs>
        <path d="M24 2L42 10V22C42 34 34 42 24 46C14 42 6 34 6 22V10L24 2Z" fill="#022c22" stroke="url(#vakeel-gold)" stroke-width="1.5" />
        <path d="M14 16L24 32L34 16" stroke="url(#vakeel-gold)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M24 16V32" stroke="url(#vakeel-gold)" stroke-width="3.5" stroke-linecap="round" opacity="0.3" />
        <circle cx="14" cy="16" r="2" fill="#FDE68A" />
        <circle cx="34" cy="16" r="2" fill="#FDE68A" />
        <path d="M18 20L24 29L30 20" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" filter="drop-shadow(0px 0px 4px rgba(16, 185, 129, 0.5))" />
      </svg>
    </div>
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
   Start the Express backend using Electron's built-in Node.js
   utilityProcess.fork() uses Electron's own runtime — no system
   'node' in PATH required. Works in any packaged .app on any Mac.
───────────────────────────────────────────────────────────── */
async function startServer() {
  // ASAR is disabled, so paths are identical in dev and production
  const serverPath = path.join(__dirname, '../server/index.mjs');
  const userDataPath = app.getPath('userData');
  const isPackaged = app.isPackaged;

  console.log('🚀 Starting VAKEEL server via utilityProcess...');
  console.log('   Server path:', serverPath);
  console.log('   User data:', userDataPath);

  serverProcess = utilityProcess.fork(serverPath, [], {
    env: {
      ...process.env,
      VAKEEL_USER_DATA: userDataPath,
      PORT: '3001',
      NODE_ENV: isPackaged ? 'production' : 'development',
      APP_DIR: path.join(__dirname, '..'),
    },
    stdio: 'pipe',   // capture stdout/stderr from server
  });

  // Pipe server logs to Electron console
  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  }
  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  }

  // Poll the health endpoint — resolve as soon as it responds 2xx
  // 5-minute timeout covers first-run model downloads (~1.2 GB)
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const TIMEOUT_MS = 300_000; // 5 minutes
    const INTERVAL_MS = 600;
    let exited = false;

    // Fail fast if the server process dies before health check passes
    serverProcess.once('exit', (code) => {
      exited = true;
      reject(new Error(`Server process exited unexpectedly (code ${code})`));
    });

    function poll() {
      if (exited) return; // already rejected via exit handler
      if (Date.now() - started > TIMEOUT_MS) {
        return reject(new Error('Server did not respond within 5 minutes'));
      }
      const req = http.get('http://localhost:3001/api/health', (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          console.log('✅ VAKEEL server is ready');
          resolve();
        } else {
          setTimeout(poll, INTERVAL_MS);
        }
        res.resume();
      });
      req.on('error', () => setTimeout(poll, INTERVAL_MS));
      req.setTimeout(2000, () => { req.destroy(); setTimeout(poll, INTERVAL_MS); });
    }

    // Give the process 300 ms to start before first poll
    setTimeout(poll, 300);
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
    : 'http://localhost:5173';

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
    try { serverProcess.kill(); } catch { /* ignore */ }
  }
});
