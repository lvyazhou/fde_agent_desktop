delete process.env.ELECTRON_RUN_AS_NODE;

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');
const AcpClient = require('./acp-client.js');

let mainWindow;
let splashWindow;
let acp = null;
let hermesProcess = null;
let prototypeServer = null;
let prototypeServerPort = null;
let prototypeServingDir = null;
let cachedModels = [];       // Cached model list from initialize/session
let cachedCapabilities = {}; // Cached ACP capabilities
let hermesReady = false;     // ACP 是否已连接且 initialize 成功(供环境自检读取)

// ---------------------------------------------------------------------------
// Data directories
// ---------------------------------------------------------------------------

const PRODUCT_LOBSTER_HOME = path.join(os.homedir(), '.product-lobster');
const PROJECTS_DIR = path.join(PRODUCT_LOBSTER_HOME, 'projects');
const HANDBOOK_DIR = path.join(PRODUCT_LOBSTER_HOME, 'fde-handbook');

function ensureDirs() {
  for (const dir of [PRODUCT_LOBSTER_HOME, PROJECTS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 首次启动：从项目模板初始化 config.yaml 和 .env（不覆盖已有的）
  const templatesDir = app.isPackaged
    ? path.join(process.resourcesPath, 'config-templates')
    : path.join(app.getAppPath(), 'config-templates');

  const filesToInit = ['config.yaml', '.env'];
  for (const file of filesToInit) {
    const target = path.join(PRODUCT_LOBSTER_HOME, file);
    const source = path.join(templatesDir, file);
    if (!fs.existsSync(target) && fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      console.log(`[main] Initialized ${file} from template`);
    }
  }

  // 同步内置 skills 到 HERMES_HOME/skills（每次启动都同步，确保更新）
  const bundledSkillsDir = app.isPackaged
    ? path.join(process.resourcesPath, 'skills')
    : path.join(app.getAppPath(), 'skills');
  const targetSkillsDir = path.join(PRODUCT_LOBSTER_HOME, 'skills');

  if (fs.existsSync(bundledSkillsDir)) {
    if (!fs.existsSync(targetSkillsDir)) {
      fs.mkdirSync(targetSkillsDir, { recursive: true });
    }
    // 递归复制每个 skill 文件夹
    const skillEntries = fs.readdirSync(bundledSkillsDir, { withFileTypes: true });
    for (const entry of skillEntries) {
      if (!entry.isDirectory()) continue;
      const srcSkill = path.join(bundledSkillsDir, entry.name);
      const dstSkill = path.join(targetSkillsDir, entry.name);
      copyDirSync(srcSkill, dstSkill);
    }
    console.log(`[main] Synced ${skillEntries.filter(e => e.isDirectory()).length} skills to ${targetSkillsDir}`);
  }

  // 同步内置 FDE 作战手册知识库到 HERMES_HOME/fde-handbook(每次启动同步,确保更新)
  const bundledHandbookDir = app.isPackaged
    ? path.join(process.resourcesPath, 'fde-handbook')
    : path.join(app.getAppPath(), 'fde-handbook');
  if (fs.existsSync(bundledHandbookDir)) {
    copyDirSync(bundledHandbookDir, HANDBOOK_DIR);
    console.log(`[main] Synced fde-handbook to ${HANDBOOK_DIR}`);
  }
}

// 递归复制目录（覆盖已有文件）
function copyDirSync(src, dst) {
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

// ---------------------------------------------------------------------------
// Prototype static HTTP server — serves prototype files with proper MIME types
// ---------------------------------------------------------------------------

const MIME_TYPES = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function startPrototypeServer() {
  if (prototypeServer) return; // already running

  prototypeServer = http.createServer((req, res) => {
    if (!prototypeServingDir) {
      res.writeHead(404);
      res.end('No prototype loaded');
      return;
    }

    // Parse URL, strip query string
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(prototypeServingDir, urlPath);

    // Security: prevent path traversal
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(prototypeServingDir))) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(resolved);
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    res.end(content);
  });

  // Listen on a random available port
  prototypeServer.listen(0, '127.0.0.1', () => {
    prototypeServerPort = prototypeServer.address().port;
    console.log(`[main] Prototype server listening on http://127.0.0.1:${prototypeServerPort}`);
  });
}

// ---------------------------------------------------------------------------
// Hermes ACP process management
// ---------------------------------------------------------------------------

function resolveHermesAcpCommand() {
  const exe = process.platform === 'win32' ? 'hermes-acp.exe' : 'hermes-acp';

  // 1. Packaged mode: look in resources/hermes-acp/
  if (app.isPackaged) {
    const bundled = path.join(process.resourcesPath, 'hermes-acp', exe);
    if (fs.existsSync(bundled)) return bundled;
  }

  // 2. Dev mode: look in monorepo hermes-agent/.venv
  if (!app.isPackaged) {
    const ext = process.platform === 'win32' ? 'Scripts' : 'bin';
    const venvPath = path.resolve(__dirname, '..', '..', '..', 'hermes-agent', '.venv', ext, exe);
    if (fs.existsSync(venvPath)) return venvPath;
    // Also check PyInstaller dist output (for testing build locally)
    const distPath = path.resolve(__dirname, '..', '..', '..', 'hermes-agent', 'dist', 'hermes-acp', exe);
    if (fs.existsSync(distPath)) return distPath;
  }

  // 3. Fallback: expect on PATH
  return 'hermes-acp';
}

function resolveGitBashPath() {
  if (process.platform !== 'win32') return '';
  const candidates = [
    path.join('D:', 'Program Files', 'Git', 'bin', 'bash.exe'),
    path.join('C:', 'Program Files', 'Git', 'bin', 'bash.exe'),
    path.join('C:', 'Program Files (x86)', 'Git', 'bin', 'bash.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'bin', 'bash.exe'),
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return '';
}

function startHermes() {
  const command = resolveHermesAcpCommand();
  console.log(`[main] Starting hermes-acp: ${command}`);

  hermesProcess = spawn(command, [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: PRODUCT_LOBSTER_HOME,
    env: {
      ...process.env,
      HERMES_HOME: PRODUCT_LOBSTER_HOME,
      // 防止系统 Anthropic 环境变量干扰 hermes provider 选择
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_AUTH_TOKEN: '',
      ANTHROPIC_BASE_URL: '',
      // 清除可能存在的无关 venv，避免 hermes 探测到坏的 Python 环境
      VIRTUAL_ENV: '',
      // Hermes 工具执行需要 Git Bash
      HERMES_GIT_BASH_PATH: resolveGitBashPath(),
      // Git Bash path conversion fixes for Windows
      MSYS_NO_PATHCONV: '1',
      MSYS2_ARG_CONV_EXCL: '*',
    },
    ...(process.platform === 'win32' ? { windowsHide: true } : {}),
  });

  hermesProcess.on('error', (err) => {
    console.error('[main] Failed to start hermes-acp:', err.message);
    hermesReady = false;
  });

  hermesProcess.on('exit', (code, signal) => {
    console.log(`[main] hermes-acp exited (code=${code}, signal=${signal})`);
    hermesProcess = null;
    acp = null;
    hermesReady = false;
  });

  acp = new AcpClient(hermesProcess);

  // Forward server notifications to renderer (include method name and sessionId for routing)
  acp.onNotification((notification) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const params = notification.params || {};
      const payload = {
        method: notification.method || '',
        sessionId: params.sessionId || params.session_id || '',
        ...params,
      };
      mainWindow.webContents.send('hermes:session-update', payload);
    }
  });

  // Register reverse RPC handler: permission requests from hermes
  acp.onRequest('request_permission', async (params) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Forward to renderer and wait for user response
      return new Promise((resolve) => {
        const requestId = `perm_${Date.now()}`;
        mainWindow.webContents.send('hermes:permission-request', { requestId, ...params });

        // Listen for renderer's response
        const handler = (_event, response) => {
          if (response.requestId === requestId) {
            ipcMain.removeHandler('hermes:permission-response-' + requestId);
            resolve(response.result);
          }
        };
        ipcMain.handle('hermes:permission-response-' + requestId, handler);

        // Timeout: auto-allow after 30s if user doesn't respond
        setTimeout(() => {
          ipcMain.removeHandler('hermes:permission-response-' + requestId);
          resolve({ permission: 'allow_once' });
        }, 30000);
      });
    }
    // If no window, auto-allow
    return { permission: 'allow_once' };
  });
}

async function initializeHermes() {
  updateSplash(30, '正在初始化设计引擎...');

  try {
    const result = await acp.request('initialize', {
      protocolVersion: 1,
      clientInfo: { name: 'prodesigner', version: '1.0.0' },
    });
    console.log('[main] hermes-acp initialized:', JSON.stringify(result).slice(0, 300));
    cachedCapabilities = result || {};
    if (result && result.models) cachedModels = result.models;
    hermesReady = true;
    updateSplash(80, '设计引擎已就绪');
    return result;
  } catch (err) {
    console.error('[main] hermes-acp initialize failed:', err.message);
    hermesReady = false;
    updateSplash(80, '引擎初始化超时，尝试继续...');
    throw err;
  }
}

async function stopHermes() {
  if (!acp) return;
  console.log('[main] Stopping hermes-acp...');
  try {
    await acp.shutdown();
  } catch (err) {
    console.error('[main] Error shutting down hermes-acp:', err.message);
  }
  acp = null;
  hermesProcess = null;
}

// ---------------------------------------------------------------------------
// Project helpers
// ---------------------------------------------------------------------------

function slugify(name) {
  // Use only ASCII chars for directory name (Git Bash can't cd into Chinese paths)
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  // If nothing left after stripping (all Chinese), use timestamp
  return ascii || `project-${Date.now()}`;
}

function resolveProjectPath(slug, ...rest) {
  const projectDir = path.join(PROJECTS_DIR, slug);
  if (rest.length === 0) return projectDir;
  const resolved = path.join(projectDir, ...rest);
  // Path traversal guard
  const normalized = path.resolve(resolved);
  if (!normalized.startsWith(path.resolve(projectDir))) {
    throw new Error('Path traversal detected');
  }
  return normalized;
}

// FDE 五阶段默认落点(新项目落阶段②,过渡友好;与前端 fde-stages.js DEFAULT_STAGE 一致)
const FDE_DEFAULT_STAGE = 2;

// 向后兼容:给旧项目 meta 补齐 FDE 五阶段字段。旧项目只有 phase,
// 没有 stage/stageStatus——读时补默认,不改写磁盘(下次 writeProjectMeta 时落盘)。
function ensureFdeFields(meta) {
  if (!meta) return meta;
  if (typeof meta.stage !== 'number') meta.stage = FDE_DEFAULT_STAGE;
  if (!meta.stageStatus || typeof meta.stageStatus !== 'object') {
    // 默认:当前 stage 之前的阶段为 done,当前为 active,之后为 todo
    meta.stageStatus = {};
    for (let i = 1; i <= 5; i++) {
      meta.stageStatus[i] = i < meta.stage ? 'done' : i === meta.stage ? 'active' : 'todo';
    }
  }
  return meta;
}

function readProjectMeta(slug) {
  const metaPath = resolveProjectPath(slug, 'meta.json');
  if (!fs.existsSync(metaPath)) return null;
  return ensureFdeFields(JSON.parse(fs.readFileSync(metaPath, 'utf-8')));
}

function writeProjectMeta(slug, meta) {
  const metaPath = resolveProjectPath(slug, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

function updateProjectMeta(slug, updates) {
  const meta = readProjectMeta(slug);
  if (!meta) return null;
  Object.assign(meta, updates, { updatedAt: new Date().toISOString() });
  writeProjectMeta(slug, meta);
  return meta;
}

function computeProjectOutputs(slug) {
  const hasSpec = fs.existsSync(resolveProjectPath(slug, 'spec.md'));
  const protoDir = resolveProjectPath(slug, 'prototype');
  let hasPrototype = false, prototypeFileCount = 0;
  if (fs.existsSync(protoDir)) {
    const files = fs.readdirSync(protoDir).filter(f => f.endsWith('.html'));
    hasPrototype = files.length > 0;
    prototypeFileCount = files.length;
  }
  return { hasSpec, hasPrototype, prototypeFileCount };
}

function appendMessage(slug, message) {
  const msgPath = resolveProjectPath(slug, 'messages.jsonl');
  fs.appendFileSync(msgPath, JSON.stringify(message) + '\n', 'utf-8');
}

function readMessages(slug, maxLines = 200) {
  const msgPath = resolveProjectPath(slug, 'messages.jsonl');
  if (!fs.existsSync(msgPath)) return [];
  const lines = fs.readFileSync(msgPath, 'utf-8').trim().split('\n').filter(Boolean);
  return lines.slice(-maxLines).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 800,
    height: 560,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.on('closed', () => { splashWindow = null; });
}

function updateSplash(percent, text) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents
      .executeJavaScript(`updateProgress(${percent}, '${text.replace(/'/g, "\\'")}')`)
      .catch(() => {});
  }
}

const isDev = !app.isPackaged;
const DEV_SERVER_URL = 'http://127.0.0.1:43917';

async function loadRenderer(win) {
  if (isDev) {
    await win.loadURL(DEV_SERVER_URL);
    return;
  }
  await win.loadFile(path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') || url.startsWith('https') || url.startsWith('file://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  loadRenderer(mainWindow).catch((error) => {
    console.error('[main] Failed to load renderer:', error);
  });

  // Window control IPC handlers
  ipcMain.on('window:minimize', () => mainWindow.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow.close());

  mainWindow.on('maximize', () =>
    mainWindow.webContents.send('window:maximized-changed', true),
  );
  mainWindow.on('unmaximize', () =>
    mainWindow.webContents.send('window:maximized-changed', false),
  );

  return mainWindow;
}

// ---------------------------------------------------------------------------
// IPC handlers — App metadata & Window state
// ---------------------------------------------------------------------------

ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('app:get-platform', () => process.platform);

// ---------------------------------------------------------------------------
// Environment / API Key management
// ---------------------------------------------------------------------------

const ENV_FILE_PATH = path.join(PRODUCT_LOBSTER_HOME, '.env');

ipcMain.handle('hermes:read-env', async () => {
  try {
    if (fs.existsSync(ENV_FILE_PATH)) {
      return { success: true, content: fs.readFileSync(ENV_FILE_PATH, 'utf-8') };
    }
    return { success: true, content: '' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('hermes:write-env', async (_event, { content }) => {
  try {
    ensureDirs();
    fs.writeFileSync(ENV_FILE_PATH, content, 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('hermes:restart', async () => {
  try {
    await stopHermes();
    startHermes();
    await initializeHermes();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('window:is-maximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isMaximized() : false;
});

// ---------------------------------------------------------------------------
// IPC handlers — File system & Shell
// ---------------------------------------------------------------------------

ipcMain.handle('fs:read-file', async (_event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return { success: true, data: Array.from(data) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:read-directory', async (_event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return { success: false, error: 'Directory not found' };
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = items.map((item) => ({
      name: item.name,
      isDirectory: item.isDirectory(),
      path: path.join(dirPath, item.name).replace(/\\/g, '/'),
    }));
    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:get-home-dir', () => {
  return process.platform === 'win32'
    ? (process.env.USERPROFILE || 'C:\\Users\\Default')
    : (process.env.HOME || '~');
});

ipcMain.handle('shell:open-path', async (_event, targetPath) => {
  try {
    const error = await shell.openPath(targetPath);
    if (error) return { success: false, error };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('shell:open-external', async (_event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ---------------------------------------------------------------------------
// IPC handlers — FDE 作战手册知识库(工作台)
// ---------------------------------------------------------------------------

// 安全解析 handbook 内的文件路径,防止越界
function resolveHandbookPath(stageDir, file) {
  const base = path.join(HANDBOOK_DIR, stageDir);
  const resolved = path.join(base, file);
  if (!resolved.startsWith(base)) throw new Error('Invalid handbook path');
  return resolved;
}

ipcMain.handle('handbook:get-manifest', async () => {
  try {
    const manifestPath = path.join(HANDBOOK_DIR, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return { success: false, error: 'manifest not found' };
    return { success: true, data: JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('handbook:read-md', async (_event, { stage, file }) => {
  try {
    const filePath = resolveHandbookPath(stage, file);
    if (!fs.existsSync(filePath)) return { success: false, error: 'file not found' };
    return { success: true, content: fs.readFileSync(filePath, 'utf-8') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('handbook:read-html', async (_event, { stage, file }) => {
  try {
    const filePath = resolveHandbookPath(stage, file);
    if (!fs.existsSync(filePath)) return { success: false, error: 'file not found' };
    return { success: true, content: fs.readFileSync(filePath, 'utf-8') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('handbook:open', async (_event, { stage, file }) => {
  try {
    const filePath = resolveHandbookPath(stage, file);
    if (!fs.existsSync(filePath)) return { success: false, error: 'file not found' };
    const error = await shell.openPath(filePath);
    if (error) return { success: false, error };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('handbook:save-as', async (_event, { stage, file }) => {
  try {
    const filePath = resolveHandbookPath(stage, file);
    if (!fs.existsSync(filePath)) return { success: false, error: 'file not found' };
    const { canceled, filePath: dest } = await dialog.showSaveDialog(mainWindow, {
      title: '另存为',
      defaultPath: file,
    });
    if (canceled || !dest) return { success: false, canceled: true };
    fs.copyFileSync(filePath, dest);
    return { success: true, path: dest };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ---------------------------------------------------------------------------
// IPC handlers — Hermes project management
// ---------------------------------------------------------------------------

ipcMain.handle('hermes:list-projects', async () => {
  try {
    if (!fs.existsSync(PROJECTS_DIR)) return [];
    const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
    const projects = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const meta = readProjectMeta(entry.name);
      if (meta) {
        const outputs = computeProjectOutputs(entry.name);
        const phase = meta.phase || (outputs.hasPrototype ? 'iterating' : outputs.hasSpec ? 'prototype' : 'brainstorming');
        projects.push({ slug: entry.name, ...meta, outputs, hasSpec: outputs.hasSpec, hasPrototype: outputs.hasPrototype, phase });
      }
    }
    projects.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
    return projects;
  } catch (err) {
    throw new Error(`Failed to list projects: ${err.message}`);
  }
});

ipcMain.handle('hermes:create-project', async (_event, { name, requirement, slug: customSlug }) => {
  try {
    const slug = customSlug || slugify(name);
    const projectDir = resolveProjectPath(slug);

    if (fs.existsSync(projectDir)) {
      // If already exists, just return existing meta
      const existing = readProjectMeta(slug);
      if (existing) return { slug, ...existing };
      throw new Error(`Project "${slug}" already exists`);
    }
    fs.mkdirSync(projectDir, { recursive: true });

    // Create session via ACP
    let sessionId = null;
    if (acp) {
      const result = await acp.request('session/new', { cwd: projectDir, mcpServers: [] });
      sessionId = result && result.sessionId ? result.sessionId : null;
      // Auto-approve all edits — no approval dialog needed for a local product tool
      if (sessionId) {
        await acp.request('session/set_mode', { sessionId, modeId: 'dont_ask' }).catch(() => {});
      }
    }

    const meta = {
      name,
      slug,
      sessionId,
      requirement: requirement || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phase: 'brainstorming',
      // FDE 五阶段:新项目默认落阶段②(现有能力所在,过渡友好)
      stage: FDE_DEFAULT_STAGE,
      stageStatus: { 1: 'done', 2: 'active', 3: 'todo', 4: 'todo', 5: 'todo' },
      outputs: { hasSpec: false, hasPrototype: false, prototypeFileCount: 0 },
      messageCount: 0,
    };
    writeProjectMeta(slug, meta);

    return { slug, ...meta };
  } catch (err) {
    throw new Error(`Failed to create project: ${err.message}`);
  }
});

ipcMain.handle('hermes:load-project', async (_event, slug) => {
  try {
    const meta = readProjectMeta(slug);
    if (!meta) throw new Error(`Project "${slug}" not found`);

    const persistedMessages = readMessages(slug);
    let sessionRecovered = false;

    if (acp && meta.sessionId) {
      try {
        const result = await acp.request('session/load', { sessionId: meta.sessionId, cwd: resolveProjectPath(slug), mcpServers: [] });
        if (result) {
          await acp.request('session/set_mode', { sessionId: meta.sessionId, modeId: 'dont_ask' }).catch(() => {});
          return { slug, ...meta, messages: persistedMessages, loadResult: result };
        }
      } catch (loadErr) {
        console.log(`[main] Session ${meta.sessionId} not found, creating new session for ${slug}`);
      }
    }

    // Create new session if none exists or old one is gone
    if (acp) {
      const projectDir = resolveProjectPath(slug);
      const newSession = await acp.request('session/new', { cwd: projectDir, mcpServers: [] });
      if (newSession && newSession.sessionId) {
        meta.sessionId = newSession.sessionId;
        writeProjectMeta(slug, meta);
        await acp.request('session/set_mode', { sessionId: meta.sessionId, modeId: 'dont_ask' }).catch(() => {});
        console.log(`[main] New session ${newSession.sessionId} created for project ${slug}`);

        // --- Context recovery: feed existing artifacts to the new session ---
        const contextParts = [];
        if (meta.requirement) contextParts.push(`## 原始需求\n${meta.requirement}`);

        const specPath = resolveProjectPath(slug, 'spec.md');
        if (fs.existsSync(specPath)) {
          let spec = fs.readFileSync(specPath, 'utf-8');
          if (spec.length > 3000) spec = spec.slice(0, 3000) + '\n\n...(已截断，完整版在 spec.md)';
          contextParts.push(`## 功能清单 (spec.md)\n${spec}`);
        }

        const protoDir = resolveProjectPath(slug, 'prototype');
        if (fs.existsSync(protoDir)) {
          const fileList = fs.readdirSync(protoDir).filter(f => f.endsWith('.html')).map(f => `- prototype/${f}`).join('\n');
          if (fileList) contextParts.push(`## 已有原型文件\n${fileList}`);
        }

        const recent = readMessages(slug, 20);
        if (recent.length > 0) {
          const summary = recent.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${(m.content || '').slice(0, 200)}`).join('\n');
          contextParts.push(`## 最近对话记录\n${summary}`);
        }

        if (contextParts.length > 0) {
          sessionRecovered = true;
          const recoveryPrompt = `这是一个产品设计项目，之前的会话已丢失，但以下项目文件仍在。请基于这些上下文继续工作，不要重复这些内容给用户。\n\n${contextParts.join('\n\n')}`;
          acp.request('session/prompt', {
            sessionId: meta.sessionId,
            prompt: [{ type: 'text', text: recoveryPrompt }],
          }, 60_000).catch(err => {
            console.log(`[main] Context recovery prompt failed: ${err.message}`);
          });
        }
      }
    }

    return { slug, ...meta, messages: persistedMessages, sessionRecovered };
  } catch (err) {
    throw new Error(`Failed to load project: ${err.message}`);
  }
});

ipcMain.handle('hermes:delete-project', async (_event, slug) => {
  try {
    const projectDir = resolveProjectPath(slug);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    return { success: true };
  } catch (err) {
    throw new Error(`Failed to delete project: ${err.message}`);
  }
});

ipcMain.handle('hermes:save-message', async (_event, { slug, message }) => {
  try {
    appendMessage(slug, message);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('hermes:update-project-meta', async (_event, { slug, updates }) => {
  try {
    const meta = updateProjectMeta(slug, updates);
    return { success: true, meta };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('hermes:upload-knowledge', async (_event, { slug }) => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: '选择参考文档',
      filters: [
        { name: '文档', extensions: ['pdf', 'md', 'txt', 'docx', 'doc', 'png', 'jpg', 'jpeg'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled || !filePaths || filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const knowledgeDir = resolveProjectPath(slug, 'knowledge');
    if (!fs.existsSync(knowledgeDir)) {
      fs.mkdirSync(knowledgeDir, { recursive: true });
    }

    const copied = [];
    for (const srcPath of filePaths) {
      const fileName = path.basename(srcPath);
      const destPath = path.join(knowledgeDir, fileName);
      fs.copyFileSync(srcPath, destPath);
      copied.push(fileName);
    }
    return { success: true, files: copied };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ---------------------------------------------------------------------------
// New IPC handlers — 12 features
// ---------------------------------------------------------------------------

// Feature 1: Model switching
ipcMain.handle('hermes:list-models', async () => {
  return { models: cachedModels };
});

ipcMain.handle('hermes:set-model', async (_event, { slug, modelId }) => {
  try {
    const meta = readProjectMeta(slug);
    if (!meta || !meta.sessionId || !acp) return { success: false, error: 'No active session' };
    const result = await acp.request('session/set_model', { sessionId: meta.sessionId, modelId });
    if (result && result.models) cachedModels = result.models;
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Feature 3: Session history list
ipcMain.handle('hermes:list-sessions', async (_event, { cursor, cwd }) => {
  try {
    if (!acp) return { sessions: [], nextCursor: null };
    const result = await acp.request('session/list', { cursor: cursor || null, cwd: cwd || PRODUCT_LOBSTER_HOME });
    return result || { sessions: [], nextCursor: null };
  } catch (err) {
    return { sessions: [], nextCursor: null, error: err.message };
  }
});

// Feature 4: Session fork
ipcMain.handle('hermes:fork-session', async (_event, { slug }) => {
  try {
    const meta = readProjectMeta(slug);
    if (!meta || !meta.sessionId || !acp) return { success: false, error: 'No active session' };
    const projectDir = resolveProjectPath(slug);
    const result = await acp.request('session/fork', { sessionId: meta.sessionId, cwd: projectDir, mcpServers: [] });
    if (result && result.sessionId) {
      // Update meta with new forked session
      meta.sessionId = result.sessionId;
      writeProjectMeta(slug, meta);
      return { success: true, sessionId: result.sessionId };
    }
    return { success: false, error: 'Fork returned no sessionId' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Feature 9: Permission response (renderer → main for permission approval)
ipcMain.handle('hermes:permission-respond', async (_event, { requestId, result }) => {
  // The actual response routing is handled via dynamic handlers in the onRequest callback
  // This channel is used as a fallback for the renderer to send responses
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('hermes:permission-resolved', { requestId, result });
  }
  return { success: true };
});

// Feature 12: Skills market browsing
ipcMain.handle('hermes:browse-skills', async (_event, { query }) => {
  // 复用 skills:scan-local 的逻辑，扫描项目内置 + 用户目录
  try {
    const seen = new Set();
    const skills = [];

    // 1. 项目自带的 skills/
    const bundledDirs = [
      path.join(app.getAppPath(), 'skills'),
      path.join(process.resourcesPath, 'skills'),
    ];
    for (const dir of bundledDirs) {
      for (const skill of scanSkillsDirectory(dir)) {
        if (!seen.has(skill.id)) {
          seen.add(skill.id);
          skills.push({ key: skill.id, name: skill.name, description: skill.description, installed: true });
        }
      }
    }

    // 2. 用户目录 ~/.product-lobster/skills
    const userSkillsDir = path.join(PRODUCT_LOBSTER_HOME, 'skills');
    for (const skill of scanSkillsDirectory(userSkillsDir)) {
      if (!seen.has(skill.id)) {
        seen.add(skill.id);
        skills.push({ key: skill.id, name: skill.name, description: skill.description, installed: true });
      }
    }

    return { skills };
  } catch (err) {
    return { skills: [], error: err.message };
  }
});

ipcMain.handle('hermes:prompt', async (_event, { slug, text, attachments }) => {
  try {
    let meta = readProjectMeta(slug);
    if (!meta) throw new Error(`Project "${slug}" not found`);
    if (!acp) throw new Error('Hermes ACP not connected');

    // Auto-recover session if missing
    if (!meta.sessionId) {
      const projectDir = resolveProjectPath(slug);
      const newSession = await acp.request('session/new', { cwd: projectDir, mcpServers: [] });
      meta.sessionId = newSession.sessionId;
      await acp.request('session/set_mode', { sessionId: meta.sessionId, modeId: 'dont_ask' }).catch(() => {});
      writeProjectMeta(slug, meta);
    }

    // Build prompt content blocks (text + optional images)
    const promptBlocks = [{ type: 'text', text }];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.type === 'image' && att.data) {
          promptBlocks.push({ type: 'image', data: att.data, media_type: att.media_type || 'image/png' });
        }
      }
    }

    const result = await acp.request('session/prompt', {
      sessionId: meta.sessionId,
      prompt: promptBlocks,
    }, 600_000); // 10 min timeout

    // Refresh outputs after AI may have written files
    const outputs = computeProjectOutputs(slug);
    const phase = outputs.hasPrototype ? 'iterating' : outputs.hasSpec ? 'prototype' : 'brainstorming';
    updateProjectMeta(slug, { outputs, phase });

    return result;
  } catch (err) {
    throw new Error(`Prompt failed: ${err.message}`);
  }
});

// ---------------------------------------------------------------------------
// 环境自检 + LLM 连通性(首次启动向导用)
// ---------------------------------------------------------------------------

// 读取 .env 里的 LLM 配置
function parseEnvConfig() {
  let apiKey = '';
  let baseUrl = 'https://api.360.cn/v1';
  let model = '';
  let provider = '';
  try {
    if (fs.existsSync(ENV_FILE_PATH)) {
      const c = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
      const anthropic = c.match(/^ANTHROPIC_API_KEY=(.+)$/m);
      const openai = c.match(/^OPENAI_API_KEY=(.+)$/m);
      const url = c.match(/^OPENAI_BASE_URL=(.+)$/m);
      const mdl = c.match(/^(?:HERMES_MODEL|MODEL|OPENAI_MODEL)=(.+)$/m);
      if (anthropic && anthropic[1].trim()) { apiKey = anthropic[1].trim(); provider = 'anthropic'; }
      else if (openai && openai[1].trim() && openai[1].trim() !== 'your-api-key-here') { apiKey = openai[1].trim(); provider = 'openai'; }
      if (url) baseUrl = url[1].trim();
      if (mdl) model = mdl[1].trim();
    }
  } catch (e) { /* ignore */ }
  return { apiKey, baseUrl, model, provider };
}

// 发一次 chat/completions,返回结构化结果(供建议生成 + 连通性测试复用)
function postChatCompletion({ apiKey, baseUrl, model, messages, maxTokens = 64, timeoutMs = 10000 }) {
  const https = require('https');
  const http = require('http');
  return new Promise((resolve) => {
    let url;
    try { url = new URL((baseUrl || '').replace(/\/$/, '') + '/chat/completions'); }
    catch { return resolve({ ok: false, status: 0, error: 'baseUrl 格式不正确' }); }
    const lib = url.protocol === 'http:' ? http : https;
    const payload = JSON.stringify({
      model: model || 'qwen-plus',
      messages: messages || [{ role: 'user', content: 'ping' }],
      max_tokens: maxTokens,
    });
    const started = Date.now();
    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'http:' ? 80 : 443),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        const latencyMs = Date.now() - started;
        const status = res.statusCode || 0;
        let text = '';
        try { text = JSON.parse(body).choices?.[0]?.message?.content || ''; } catch { /* non-json */ }
        resolve({ ok: status >= 200 && status < 300, status, latencyMs, text, body: body.slice(0, 300) });
      });
    });
    req.on('error', (err) => resolve({ ok: false, status: 0, error: err.message }));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false, status: 0, error: '请求超时' }); });
    req.write(payload);
    req.end();
  });
}

// 环境自检:引擎 / ACP 连接 / API Key
ipcMain.handle('env:check', async () => {
  // 引擎可执行
  const enginePath = resolveHermesAcpCommand();
  const engineExists = enginePath === 'hermes-acp' ? false : fs.existsSync(enginePath);
  const engine = {
    ok: engineExists,
    path: enginePath,
    exists: engineExists,
    error: engineExists ? '' : (app.isPackaged ? '未找到内置引擎 hermes-acp' : '开发模式未找到 .venv/dist 下的 hermes-acp'),
  };
  // ACP 连接
  const acpState = { ok: hermesReady && !!acp, error: (hermesReady && acp) ? '' : '设计引擎未就绪(未连接或初始化失败)' };
  // API Key
  const { apiKey, provider, baseUrl } = parseEnvConfig();
  const apiKeyState = { configured: !!apiKey, provider: provider || '', baseUrl };

  const allOk = engine.ok && acpState.ok && apiKeyState.configured;
  return { success: true, allOk, engine, acp: acpState, apiKey: apiKeyState, packaged: app.isPackaged };
});

// 真实连通性测试:用给定(或已存)的 key/baseUrl 发一次最小请求
ipcMain.handle('env:test-connection', async (_event, params) => {
  const cfg = parseEnvConfig();
  const apiKey = (params && params.apiKey) || cfg.apiKey;
  const baseUrl = (params && params.baseUrl) || cfg.baseUrl;
  const model = (params && params.model) || cfg.model;
  if (!apiKey) return { ok: false, error: '未填写 API Key' };
  const r = await postChatCompletion({
    apiKey, baseUrl, model,
    messages: [{ role: 'user', content: 'ping' }],
    maxTokens: 1, timeoutMs: 8000,
  });
  if (r.ok) return { ok: true, latencyMs: r.latencyMs };
  // 归类错误,给用户可读诊断
  let reason = r.error || `请求失败(HTTP ${r.status})`;
  if (r.status === 401 || r.status === 403) reason = 'API Key 无效或无权限(HTTP ' + r.status + ')';
  else if (r.status === 404) reason = '接口地址不对(HTTP 404,检查 Base URL)';
  else if (r.status === 429) reason = '请求过于频繁或额度不足(HTTP 429)';
  else if (r.status >= 500) reason = '服务端错误(HTTP ' + r.status + ')';
  return { ok: false, status: r.status, error: reason, detail: r.body || '' };
});

ipcMain.handle('hermes:generate-suggestions', async (_event, { userMessage, aiResponse }) => {
  // 独立调用 LLM API 生成建议追问，不经过 hermes session，避免干扰主对话流
  const { apiKey, baseUrl, model } = parseEnvConfig();
  if (!apiKey) return { suggestions: [] };

  const r = await postChatCompletion({
    apiKey, baseUrl, model,
    messages: [
      { role: 'system', content: '你是一个对话助手。根据用户的问题和AI的回答，生成3个用户可能想追问的问题。每行一个问题，不要编号，不要前缀，直接输出问题文本。问题要具体、有深度、与上下文相关。' },
      { role: 'user', content: `用户问了: "${(userMessage || '').slice(0, 150)}"\nAI回答了: "${(aiResponse || '').slice(0, 500)}"\n\n请生成3个追问建议：` },
    ],
    maxTokens: 200, timeoutMs: 10000,
  });
  if (!r.ok || !r.text) return { suggestions: [] };
  const lines = r.text.split('\n').map(l => l.trim()).filter(l => l && l.length > 5 && l.length < 100);
  return { suggestions: lines.slice(0, 3) };
});

ipcMain.handle('hermes:cancel', async (_event, slug) => {
  try {
    const meta = readProjectMeta(slug);
    if (!meta || !meta.sessionId) return;
    if (!acp) return;
    acp.notify('session/cancel', { sessionId: meta.sessionId });
  } catch (err) {
    console.error('[main] Cancel error:', err.message);
  }
});

ipcMain.handle('hermes:read-file', async (_event, { slug, relativePath }) => {
  try {
    const filePath = resolveProjectPath(slug, relativePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('hermes:write-file', async (_event, { slug, relativePath, content }) => {
  try {
    const filePath = resolveProjectPath(slug, relativePath);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('hermes:list-files', async (_event, { slug, dir }) => {
  try {
    const targetDir = resolveProjectPath(slug, dir || '.');
    if (!fs.existsSync(targetDir)) return { success: true, files: [] };

    const items = fs.readdirSync(targetDir, { withFileTypes: true });
    const files = items.map((item) => ({
      name: item.name,
      isDirectory: item.isDirectory(),
      path: path.join(dir || '.', item.name).replace(/\\/g, '/'),
    }));
    files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    return { success: true, files };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('hermes:prototype-url', async (_event, { slug, file }) => {
  try {
    const protoDir = resolveProjectPath(slug, 'prototype');
    if (!fs.existsSync(protoDir)) {
      return { success: false, error: 'prototype directory not found' };
    }
    // Point the static server at this project's prototype directory
    prototypeServingDir = protoDir;
    const fileName = file || 'index.html';
    const url = `http://127.0.0.1:${prototypeServerPort}/${fileName}`;
    return { success: true, url };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('hermes:export-zip', async (_event, slug) => {
  try {
    const JSZip = require('jszip');
    const zip = new JSZip();
    const projectDir = resolveProjectPath(slug);

    function addDirToZip(dirPath, zipFolder) {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          addDirToZip(fullPath, zipFolder.folder(entry.name));
        } else {
          zipFolder.file(entry.name, fs.readFileSync(fullPath));
        }
      }
    }

    addDirToZip(projectDir, zip);

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Project',
      defaultPath: `${slug}.zip`,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(filePath, buffer);
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('hermes:open-in-browser', async (_event, { slug, file }) => {
  try {
    const filePath = resolveProjectPath(slug, file);
    const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
    await shell.openExternal(fileUrl);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('hermes:export-word', async (_event, { slug }) => {
  try {
    const specPath = resolveProjectPath(slug, 'spec.md');
    if (!fs.existsSync(specPath)) {
      return { success: false, error: 'spec.md not found' };
    }
    const mdContent = fs.readFileSync(specPath, 'utf-8');

    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } = require('docx');

    // Parse markdown lines into docx paragraphs
    const lines = mdContent.split('\n');
    const children = [];

    for (const line of lines) {
      // Headings
      if (line.startsWith('# ')) {
        children.push(new Paragraph({
          text: line.slice(2).trim(),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        }));
      } else if (line.startsWith('## ')) {
        children.push(new Paragraph({
          text: line.slice(3).trim(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }));
      } else if (line.startsWith('### ')) {
        children.push(new Paragraph({
          text: line.slice(4).trim(),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        }));
      } else if (line.startsWith('#### ')) {
        children.push(new Paragraph({
          text: line.slice(5).trim(),
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 120, after: 60 },
        }));
      }
      // Unordered list items
      else if (/^\s*[-*+]\s/.test(line)) {
        const indent = line.match(/^(\s*)/)[1].length;
        const level = Math.min(Math.floor(indent / 2), 4);
        const text = line.replace(/^\s*[-*+]\s+/, '');
        children.push(new Paragraph({
          children: parseInlineMarkdown(text, TextRun),
          bullet: { level },
        }));
      }
      // Ordered list items
      else if (/^\s*\d+\.\s/.test(line)) {
        const text = line.replace(/^\s*\d+\.\s+/, '');
        children.push(new Paragraph({
          children: parseInlineMarkdown(text, TextRun),
          numbering: { reference: 'default-numbering', level: 0 },
        }));
      }
      // Horizontal rule
      else if (/^---+$/.test(line.trim())) {
        children.push(new Paragraph({ text: '' }));
      }
      // Empty line
      else if (line.trim() === '') {
        children.push(new Paragraph({ text: '' }));
      }
      // Normal paragraph
      else {
        children.push(new Paragraph({
          children: parseInlineMarkdown(line, TextRun),
          spacing: { after: 60 },
        }));
      }
    }

    const doc = new Document({
      numbering: {
        config: [{
          reference: 'default-numbering',
          levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
        }],
      },
      sections: [{ children }],
    });

    const meta = readProjectMeta(slug);
    const defaultName = meta?.name ? `${meta.name} - 产品功能清单.docx` : '功能清单.docx';

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '导出 Word 文档',
      defaultPath: defaultName,
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Helper: parse bold/italic inline markdown to TextRun array
function parseInlineMarkdown(text, TextRun) {
  const runs = [];
  // Match **bold**, *italic*, `code`, and plain text
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|([^*`]+))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Bold
      runs.push(new TextRun({ text: match[2], bold: true }));
    } else if (match[3]) {
      // Italic
      runs.push(new TextRun({ text: match[3], italics: true }));
    } else if (match[4]) {
      // Code
      runs.push(new TextRun({ text: match[4], font: 'Consolas', size: 20 }));
    } else if (match[5]) {
      // Plain
      runs.push(new TextRun({ text: match[5] }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text })];
}

// ---------------------------------------------------------------------------
// Local skills scanner — reads both bundled skills/ and ~/.product-lobster/skills
// ---------------------------------------------------------------------------

function scanSkillsDirectory(dirPath) {
  const skills = [];
  if (!fs.existsSync(dirPath)) return skills;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillDir = path.join(dirPath, entry.name);
    const skillMdPath = path.join(skillDir, 'SKILL.md');

    if (!fs.existsSync(skillMdPath)) continue;

    try {
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      const meta = parseSkillFrontMatter(content);

      const scriptsDir = path.join(skillDir, 'scripts');
      const referencesDir = path.join(skillDir, 'references');
      const scriptCount = fs.existsSync(scriptsDir) ? fs.readdirSync(scriptsDir).length : 0;
      const refCount = fs.existsSync(referencesDir) ? fs.readdirSync(referencesDir).length : 0;
      const allFiles = fs.readdirSync(skillDir);

      skills.push({
        id: entry.name,
        name: meta.name || entry.name,
        description: meta.description || '',
        version: meta.version || null,
        author: meta.author || null,
        files: { scripts: scriptCount, references: refCount, total: allFiles.length },
        path: skillDir,
        hasSkillMd: true,
      });
    } catch (_err) { /* skip */ }
  }
  return skills;
}

ipcMain.handle('skills:scan-local', async () => {
  const seen = new Set();
  const allSkills = [];

  // 1. 扫描项目自带的 skills/ 目录
  const bundledSkillsDirs = [
    path.join(app.getAppPath(), 'skills'),            // 开发模式：项目根目录/skills
    path.join(process.resourcesPath, 'skills'),       // 打包模式：extraResources 输出位置
  ];
  for (const dir of bundledSkillsDirs) {
    for (const skill of scanSkillsDirectory(dir)) {
      if (!seen.has(skill.id)) {
        seen.add(skill.id);
        allSkills.push(skill);
      }
    }
  }

  // 2. 扫描用户目录 ~/.product-lobster/skills（用户自装的优先级更高，同名覆盖）
  const userSkillsDir = path.join(PRODUCT_LOBSTER_HOME, 'skills');
  for (const skill of scanSkillsDirectory(userSkillsDir)) {
    if (seen.has(skill.id)) {
      // 用户目录的同名 skill 覆盖内置的
      const idx = allSkills.findIndex(s => s.id === skill.id);
      if (idx !== -1) allSkills[idx] = skill;
    } else {
      seen.add(skill.id);
      allSkills.push(skill);
    }
  }

  return { skills: allSkills, basePath: userSkillsDir };
});

function parseSkillFrontMatter(content) {
  if (!content.startsWith('---')) return {};
  const parts = content.split('---');
  if (parts.length < 3) return {};
  const frontMatter = parts[1];
  const meta = {};
  for (const line of frontMatter.split('\n')) {
    const match = line.match(/^(\w+)\s*:\s*"?(.+?)"?\s*$/);
    if (match) meta[match[1]] = match[2];
  }
  return meta;
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  ensureDirs();
  startPrototypeServer();

  // Show splash
  createSplashWindow();
  updateSplash(10, '正在启动产品设计引擎...');

  // Start hermes-acp
  startHermes();

  // Create window (hidden)
  const win = createWindow();

  // Initialize ACP protocol
  try {
    await initializeHermes();
    updateSplash(100, '设计引擎已就绪！');
    console.log('[main] Hermes ACP ready — showing window');
  } catch (err) {
    console.error('[main]', err.message, '— showing window anyway');
    updateSplash(100, '引擎启动超时，尝试强制进入...');
  }

  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    win.show();
  }, 600);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => { stopHermes(); });
app.on('before-quit', () => { stopHermes(); });
