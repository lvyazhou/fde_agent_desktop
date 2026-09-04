delete process.env.ELECTRON_RUN_AS_NODE;

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');
const AcpClient = require('./acp-client.js');
const licenseVerifier = require('./license/verifier.js');
const licenseStore = require('./license/store.js');
const licenseFingerprint = require('./license/fingerprint.js');

let mainWindow;
let splashWindow;
let acp = null;
let hermesProcess = null;
let prototypeServer = null;
let prototypeServerPort = null;
let prototypeServingDir = null;
let cachedModels = [];       // Cached model list from initialize/session
let currentModelId = '';     // 当前会话模型 id（来自 session/new 的 modelState）
let cachedCapabilities = {}; // Cached ACP capabilities
let hermesReady = false;     // ACP 是否已连接且 initialize 成功(供环境自检读取)

// ---------------------------------------------------------------------------
// Data directories
// ---------------------------------------------------------------------------

const PRODUCT_LOBSTER_HOME = path.join(os.homedir(), '.product-lobster');
const PROJECTS_DIR = path.join(PRODUCT_LOBSTER_HOME, 'projects');
const HANDBOOK_DIR = path.join(PRODUCT_LOBSTER_HOME, 'fde-handbook');
const SKILLS_DIR = path.join(PRODUCT_LOBSTER_HOME, 'skills');
const CONFIG_YAML_PATH = path.join(PRODUCT_LOBSTER_HOME, 'config.yaml');

// --- config.yaml model persistence -----------------------------------------
// config.yaml 是 hermes 选择模型的唯一事实来源（cli.py 明确不读 LLM_MODEL/OPENAI_MODEL 环境变量）。
// 结构：
//   model:
//     provider: custom
//     default: <model-id>   ← 只改这一行
//     base_url: ...
// 用行级正则替换，避免引入 YAML 库改变文件里的注释/格式。

function readConfigModel() {
  try {
    if (!fs.existsSync(CONFIG_YAML_PATH)) return '';
    const content = fs.readFileSync(CONFIG_YAML_PATH, 'utf-8');
    // 切出 model: 块（从 "model:" 行到下一个顶格 key 或文件尾）
    const m = content.match(/^model:[ \t]*\n([\s\S]*?)(?=^\S|$(?![\r\n]))/m);
    const block = m ? m[1] : content;
    // 块内找缩进的 default: <value>
    const dm = block.match(/^[ \t]+default:[ \t]*(.+?)[ \t]*$/m);
    if (dm) return dm[1].replace(/^["']|["']$/g, '').trim();
    return '';
  } catch (e) {
    console.error('[main] readConfigModel failed:', e.message);
    return '';
  }
}

// best-effort 写回 model.default；成功返回 true。不抛异常（持久化失败不应阻断秒切）。
// 注意：hermes 秒切用带 provider 前缀的完整 id（如 openai-api:deepseek/deepseek-v4-pro），
// 但 config.yaml 的 model.default 应存「裸模型名」（deepseek/deepseek-v4-pro），
// 与现有 provider: custom + default: minimax/... 的格式一致，避免 provider 解析歧义。
function stripModelPrefix(id) {
  const s = String(id || '');
  // 去掉最外层 provider 前缀：custom:openai-api:deepseek/... 或 openai-api:deepseek/... → deepseek/...
  // 规则：若含 ':' 且冒号后仍是 provider:model 形式，剥到最后一个非厂商冒号段。
  // 实测格式：[custom:]<runtime>:<vendor>/<model>，vendor/model 里不含 ':'，所以取最后一个 ':' 之后。
  return s.includes(':') ? s.slice(s.lastIndexOf(':') + 1) : s;
}

function writeConfigModel(modelId) {
  try {
    if (!modelId) return false;
    modelId = stripModelPrefix(modelId);
    ensureDirs();
    let content = fs.existsSync(CONFIG_YAML_PATH)
      ? fs.readFileSync(CONFIG_YAML_PATH, 'utf-8')
      : '';

    // 只替换 model: 块内那一行 default:，其余原样保留。
    if (/^model:[ \t]*$/m.test(content) && /^[ \t]+default:[ \t]*.+$/m.test(content)) {
      content = content.replace(
        /^([ \t]+)default:[ \t]*.+$/m,
        (_full, indent) => `${indent}default: ${modelId}`
      );
    } else {
      // 没有可识别的 model.default 结构：补一个最小 model 块（沿用现有 provider/base_url 若存在则不动）。
      const block = `model:\n  provider: custom\n  default: ${modelId}\n`;
      content = content ? `${block}\n${content}` : block;
    }

    fs.writeFileSync(CONFIG_YAML_PATH, content, 'utf-8');
    return true;
  } catch (e) {
    console.warn('[main] writeConfigModel failed (persist skipped):', e.message);
    return false;
  }
}

// 把向导/设置里填的 API Key 同步写进 config.yaml 的 custom_providers[].api_key。
// 背景：hermes 选模型的事实来源是 config.yaml；custom_providers 条目的凭据取自
// 该条目内联的 api_key（或它 key_env 指向的环境变量）。向导只写 .env 的
// OPENAI_API_KEY,不会更新 config.yaml,于是别人机器上首装的占位符
// your-api-key-here 一直生效 → 填了 key 也不生效。这里在保存时把 key 同步进去。
// 用行级正则替换,保留注释/格式,不引入 YAML 库。
function writeConfigProviderKey(apiKey, baseUrl, model) {
  try {
    const key = String(apiKey || '').trim();
    if (!key) return false;
    ensureDirs();
    if (!fs.existsSync(CONFIG_YAML_PATH)) return false;
    let content = fs.readFileSync(CONFIG_YAML_PATH, 'utf-8');

    // 替换 custom_providers 里每个条目的 api_key: <任意值>（含占位符）。
    if (/^[ \t]+api_key:[ \t]*.+$/m.test(content)) {
      content = content.replace(
        /^([ \t]+)api_key:[ \t]*.+$/gm,
        (_full, indent) => `${indent}api_key: ${key}`
      );
    }

    // base_url 同步(可选):替换 model.base_url 与 custom_providers[].base_url。
    const url = String(baseUrl || '').trim();
    if (url && /^[ \t]+base_url:[ \t]*.+$/m.test(content)) {
      content = content.replace(
        /^([ \t]+)base_url:[ \t]*.+$/gm,
        (_full, indent) => `${indent}base_url: ${url}`
      );
    }

    // model 同步(可选):换网关后 360 专用模型名不再适用,用用户填的模型统一:
    //   ① model.default 改成该模型;② custom_providers[].models 列表收敛为仅此一项,
    //   保证顶栏下拉框至少列出这个网关能用的模型。
    const mdl = String(model || '').trim();
    if (mdl) {
      // ① model 块内的 default:
      if (/^[ \t]+default:[ \t]*.+$/m.test(content)) {
        content = content.replace(
          /^([ \t]+)default:[ \t]*.+$/m,
          (_full, indent) => `${indent}default: ${mdl}`
        );
      }
      // ② custom_providers[].models: 列表 —— 定位 "models:" 行,把其后连续的
      //    "- xxx" 缩进列表项整体替换为单行 "- <model>"(保留 models: 的缩进层级)。
      //    注意 config.yaml 可能是 CRLF,故用 \r?\n 兼容 Windows 换行。
      content = content.replace(
        /^([ \t]+)models:[ \t]*\r?\n(?:[ \t]+-[ \t]*.+\r?\n?)+/m,
        (_full, indent) => `${indent}models:\n${indent}  - ${mdl}\n`
      );
    }

    fs.writeFileSync(CONFIG_YAML_PATH, content, 'utf-8');
    return true;
  } catch (e) {
    console.warn('[main] writeConfigProviderKey failed:', e.message);
    return false;
  }
}

// 从 session/new 的响应里抓模型列表 + 当前模型。
// ACP 的 SessionModelState 结构：{ available_models: [{model_id,name,description}], current_model_id }
// 注意：字段可能是 snake_case（availableModels/available_models、currentModelId/current_model_id 两种都兼容）。
function captureModelsFromSession(result) {
  try {
    const ms = result && (result.models || result.modelState || result.model_state);
    if (!ms) return;
    const list = ms.available_models || ms.availableModels || [];
    if (Array.isArray(list) && list.length > 0) cachedModels = list;
    const cur = ms.current_model_id || ms.currentModelId || '';
    if (cur) currentModelId = cur;
  } catch (e) {
    console.warn('[main] captureModelsFromSession failed:', e.message);
  }
}

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
    // 同步 skills 根目录的 manifest.json(build-skills-manifest.js 生成)
    const bundledSkillsManifest = path.join(bundledSkillsDir, 'manifest.json');
    if (fs.existsSync(bundledSkillsManifest)) {
      fs.copyFileSync(bundledSkillsManifest, path.join(targetSkillsDir, 'manifest.json'));
    }
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

  // acp 可能在进程刚 spawn 后、或异常 exit 后为 null；等待最多 ~3s 让它就绪
  for (let i = 0; i < 30 && !acp; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!acp) {
    hermesReady = false;
    console.error('[main] initializeHermes: acp 未就绪，跳过 initialize');
    return null;
  }

  try {
    const result = await acp.request('initialize', {
      protocolVersion: 1,
      clientInfo: { name: 'prodesigner', version: '1.1.0' },
    });
    console.log('[main] hermes-acp initialized:', JSON.stringify(result).slice(0, 300));
    cachedCapabilities = result || {};
    if (result && result.models) cachedModels = result.models;
    hermesReady = true;
    updateSplash(80, '设计引擎已就绪');

    // Warmup：模型列表来自 session/new（initialize 不含），这里建一个临时会话把列表抓下来，
    // 让欢迎页（尚未选项目、无活动会话）也能立即拿到可选模型。fire-and-forget，不阻塞。
    if (acp) {
      acp.request('session/new', { cwd: PRODUCT_LOBSTER_HOME, mcpServers: [] })
        .then((s) => { captureModelsFromSession(s); })
        .catch(() => { /* ignore warmup failure */ });
    }
    return result;
  } catch (err) {
    console.error('[main] hermes-acp initialize failed:', err.message);
    hermesReady = false;
    updateSplash(80, '引擎初始化超时，尝试继续...');
    throw err;
  }
}

async function stopHermes() {
  console.log('[main] Stopping hermes-acp...');
  if (acp) {
    try {
      await acp.shutdown();
    } catch (err) {
      console.error('[main] Error shutting down hermes-acp:', err.message);
    }
  }
  // 兜底：即使 acp 为 null，也确保子进程被杀掉，避免残留僵尸进程与新进程抢 stdio
  if (hermesProcess) {
    try { hermesProcess.kill('SIGKILL'); } catch (_) { /* ignore */ }
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
  // 扫描各阶段目录下已产出的交付物文件(stage1~stage5/*.md|*.docx|*.html)。
  // 只登记文件相对路径 + 阶段号,中文名/图标由前端按文件名映射(单一数据源在 fde-stages.js)。
  const deliverables = [];
  for (let s = 1; s <= 5; s++) {
    const stageDir = resolveProjectPath(slug, `stage${s}`);
    if (!fs.existsSync(stageDir)) continue;
    let entries = [];
    try { entries = fs.readdirSync(stageDir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isFile()) continue;
      const ext = path.extname(e.name).toLowerCase();
      // 只把可交付文档算作交付物;图片/svg 等附图不单列
      if (!['.md', '.docx', '.doc', '.html', '.pdf', '.xlsx'].includes(ext)) continue;
      // 同名 md/html 视作同一份交付物,优先记 md,避免 prd.md + prd.html 重复计数
      const base = e.name.replace(/\.(md|html|docx|doc|pdf|xlsx)$/i, '');
      const existingIdx = deliverables.findIndex(d => d.stage === s && d.base === base);
      if (existingIdx >= 0) {
        // 已有同名:md 优先保留
        if (ext === '.md') deliverables[existingIdx] = { stage: s, base, file: `stage${s}/${e.name}`, ext };
        continue;
      }
      deliverables.push({ stage: s, base, file: `stage${s}/${e.name}`, ext });
    }
  }
  // 按"实际产出"推断项目到达的阶段:有交付物文件的最高 stage 号最可靠。
  // meta.stage 是创建时写死的默认值(常年停在②),不反映真实进度——故以文件为准。
  // 有原型/spec 但还没有任何 stageN 交付物时,至少算到阶段②(原型收敛阶段)。
  let derivedStage = 0;
  for (const d of deliverables) derivedStage = Math.max(derivedStage, d.stage);
  if (derivedStage === 0 && (hasPrototype || hasSpec)) derivedStage = 2;
  return { hasSpec, hasPrototype, prototypeFileCount, deliverables, derivedStage };
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

ipcMain.handle('hermes:sync-provider-key', async (_event, { apiKey, baseUrl, model } = {}) => {
  try {
    const ok = writeConfigProviderKey(apiKey, baseUrl, model);
    return { success: ok };
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
// IPC handlers — 技能库(skills/)
// ---------------------------------------------------------------------------

// 安全解析 skills 内的文件路径,防止越界
function resolveSkillPath(skillId, file) {
  const base = path.join(SKILLS_DIR, skillId);
  const resolved = path.join(base, file);
  if (!resolved.startsWith(base)) throw new Error('Invalid skill path');
  return resolved;
}

// --- 实时扫描技能库,生成与 build-skills-manifest.js 同构的 manifest -----------
// 与 scripts/build-skills-manifest.js 的分组/图标/frontmatter 解析保持一致。
// agent 主动生成、未被 SKILLS_GROUPS 收录的技能归入 general 组并标 generated:true,
// 这样"约定目录里新出现的技能"打开技能页即可见,无需重生静态 manifest.json。
const SKILLS_GROUPS = [
  { id: 'product-doc',   name: '产品文档',   icon: 'file-lines',      color: '#2563eb',
    members: ['product-prd-allinone', 'product-feature-spec', 'product-doc-to-word', 'md-export'] },
  { id: 'prototype',     name: '原型设计',   icon: 'window-maximize', color: '#1d4ed8',
    members: ['prototype-generator', 'prototype-iterate'] },
  { id: 'report-image',  name: '汇报出图',   icon: 'image',           color: '#3b82f6',
    members: ['360-ppt-generator', 'business-architecture-image', 'fireworks-tech-graph', 'image-generator'] },
  { id: 'dataviz',       name: '数据可视化', icon: 'chart-column',    color: '#0ea5e9',
    members: ['dashboard-generator'] },
  { id: 'coach',         name: '教练陪练',   icon: 'headset',         color: '#1e40af',
    members: ['fde-coach'] },
  { id: 'thinking',      name: '思考协作',   icon: 'lightbulb',       color: '#0369a1',
    members: ['brainstorming', 'collaborative-planning-board', 'first-principles-critic'] },
  { id: 'general',       name: '通用工具',   icon: 'toolbox',         color: '#64748b', members: [] },
];
const SKILL_ICONS = {
  'product-prd-allinone': 'file-contract', 'product-feature-spec': 'list-check',
  'product-doc-to-word': 'file-word', 'md-export': 'file-export',
  'prototype-generator': 'wand-magic-sparkles', 'prototype-iterate': 'pen-ruler',
  '360-ppt-generator': 'file-powerpoint', 'business-architecture-image': 'sitemap',
  'fireworks-tech-graph': 'diagram-project', 'image-generator': 'palette',
  'dashboard-generator': 'chart-line', 'fde-coach': 'headset',
  'brainstorming': 'lightbulb', 'collaborative-planning-board': 'chalkboard-user',
  'first-principles-critic': 'scale-balanced',
};

function parseSkillFrontmatter(rawText) {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const lines = m[1].split('\n');
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2];
    if (val === '|' || val === '>' || val === '|-' || val === '>-' || val === '') {
      const collected = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\s+\S/.test(lines[j])) { collected.push(lines[j].replace(/^\s+/, '')); i = j; }
        else if (lines[j].trim() === '') { collected.push(''); i = j; }
        else break;
      }
      if (collected.length) val = collected.join(val === '>' || val === '>-' ? ' ' : '\n').trim();
    }
    val = val.replace(/^["']|["']$/g, '').trim();
    if (val !== '') out[key] = val;
  }
  return out;
}

function skillSummary(desc) {
  if (!desc) return '';
  let s = desc.replace(/\s+/g, ' ').trim();
  const cut = s.search(/[。.]/);
  if (cut > 8) s = s.slice(0, cut + 1);
  if (s.length > 90) s = s.slice(0, 88) + '…';
  return s;
}

function skillGroupOf(id) {
  for (const g of SKILLS_GROUPS) if (g.members.includes(id)) return g.id;
  return 'general';
}

// 内置技能 id 集合:用于区分"内置(重启会恢复)"与"生成/导入"
function bundledSkillIds() {
  const bundledDir = app.isPackaged
    ? path.join(process.resourcesPath, 'skills')
    : path.join(app.getAppPath(), 'skills');
  try {
    return new Set(fs.readdirSync(bundledDir, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name));
  } catch (e) {
    return new Set();
  }
}

// 实时扫描 SKILLS_DIR,返回 {groups, skills} —— 结构与 manifest.json 完全同构,前端零改动
function scanSkillsManifest(dir) {
  const builtin = bundledSkillIds();
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name);
  } catch (e) {
    return { groups: [], skills: [] };
  }

  const skills = [];
  for (const id of entries) {
    const candidate = ['SKILL.md', 'skill.md']
      .map((f) => path.join(dir, id, f))
      .find((p) => fs.existsSync(p));
    if (!candidate) continue;
    let fm = {};
    try { fm = parseSkillFrontmatter(fs.readFileSync(candidate, 'utf-8')); } catch (e) {}
    const description = fm.description || '';
    const group = skillGroupOf(id);
    const meta = SKILLS_GROUPS.find((g) => g.id === group) || SKILLS_GROUPS[SKILLS_GROUPS.length - 1];
    const generated = !builtin.has(id) && group === 'general';
    skills.push({
      id,
      name: fm.name || id,
      file: path.basename(candidate),
      group,
      icon: SKILL_ICONS[id] || meta.icon,
      color: meta.color,
      version: fm.version || '',
      summary: skillSummary(description),
      description,
      builtin: builtin.has(id),
      generated,
    });
  }

  skills.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));

  const groups = SKILLS_GROUPS
    .map((g) => ({ id: g.id, name: g.name, icon: g.icon, color: g.color,
      count: skills.filter((s) => s.group === g.id).length }))
    .filter((g) => g.count > 0);

  return {
    generatedAt: new Date().toISOString(),
    source: 'scan:~/.product-lobster/skills',
    groups,
    skills,
  };
}

ipcMain.handle('skills:get-manifest', async () => {
  try {
    // 实时扫描 SKILLS_DIR:agent 主动生成/用户导入的技能只要落在此目录即刻可见。
    const data = scanSkillsManifest(SKILLS_DIR);
    // 顺带把扫描结果写回 manifest.json,兼容仍读静态文件的旧路径(失败不阻断)。
    try {
      fs.writeFileSync(path.join(SKILLS_DIR, 'manifest.json'), JSON.stringify(data, null, 2) + '\n', 'utf-8');
    } catch (e) {}
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('skills:read', async (_event, { skill, file }) => {
  try {
    const filePath = resolveSkillPath(skill, file || 'SKILL.md');
    if (!fs.existsSync(filePath)) return { success: false, error: 'file not found' };
    return { success: true, content: fs.readFileSync(filePath, 'utf-8') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('skills:open', async (_event, { skill }) => {
  try {
    const dirPath = path.join(SKILLS_DIR, skill);
    if (!fs.existsSync(dirPath)) return { success: false, error: 'skill not found' };
    const error = await shell.openPath(dirPath);
    if (error) return { success: false, error };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 删除技能:移除 SKILLS_DIR/<id> 整个目录,并刷新 manifest。
// 内置技能(bundledSkillIds)删除后会在下次启动被 ensureDirs 从内置目录恢复,
// 前端会对内置技能给出"重启恢复"提示——这里不阻断,由前端把关。
ipcMain.handle('skills:delete', async (_event, { skill }) => {
  try {
    const id = String(skill || '').trim();
    if (!id || id.includes('/') || id.includes('\\') || id.includes('..')) {
      return { success: false, error: '无效技能 id' };
    }
    const dirPath = path.join(SKILLS_DIR, id);
    if (!dirPath.startsWith(SKILLS_DIR + path.sep)) return { success: false, error: '路径越界' };
    if (!fs.existsSync(dirPath)) return { success: false, error: '技能不存在' };
    fs.rmSync(dirPath, { recursive: true, force: true });
    // 重生 manifest.json,保持与实时扫描一致
    try {
      const data = scanSkillsManifest(SKILLS_DIR);
      fs.writeFileSync(path.join(SKILLS_DIR, 'manifest.json'), JSON.stringify(data, null, 2) + '\n', 'utf-8');
    } catch (e) {}
    return { success: true, skillId: id };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 把一个源文件复制进 HANDBOOK_DIR/<stageDir> 并登记 manifest,返回最终文件名。
// 供 handbook:upload(本地选文件)与 handbook:archive-from-project(项目产物归档)共用。
// 调用方负责已读入并最终写回 manifest 对象;此函数只处理单个 stage 的一次拷贝+登记。
function registerHandbookFile(manifest, stageDir, srcPath, category) {
  const cat = ['knowledge', 'deliverable'].includes(category) ? category : 'knowledge';
  const st = (manifest.stages || []).find((s) => s.dir === stageDir);
  if (!st) throw new Error('阶段不存在');
  st.items = st.items || [];

  const targetDir = path.join(HANDBOOK_DIR, stageDir);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  let fileName = path.basename(srcPath);
  let destPath = path.join(targetDir, fileName);
  if (fs.existsSync(destPath)) {
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    let n = 2;
    while (fs.existsSync(path.join(targetDir, `${base}(${n})${ext}`))) n++;
    fileName = `${base}(${n})${ext}`;
    destPath = path.join(targetDir, fileName);
  }
  fs.copyFileSync(srcPath, destPath);

  const type = (path.extname(fileName).slice(1) || 'txt').toLowerCase();
  const title = path.basename(fileName, path.extname(fileName)).replace(/【(知识|交付)】/g, '').trim();
  const previewable = type === 'md' || type === 'html';
  st.items.push({ file: fileName, title, type, category: cat, previewable, uploaded: true });

  st.counts = {
    knowledge: st.items.filter((it) => it.category === 'knowledge').length,
    deliverable: st.items.filter((it) => it.category === 'deliverable').length,
  };
  return fileName;
}

// 上传文档归档到知识库(FDE 手册某阶段目录),并登记 manifest.json
ipcMain.handle('handbook:upload', async (_event, { stage, category }) => {
  try {
    const stageDir = String(stage || '').replace(/[^0-9]/g, '');
    if (!stageDir) return { success: false, error: '无效阶段' };

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: '选择要归档的文档',
      filters: [
        { name: '文档', extensions: ['md', 'docx', 'doc', 'pdf', 'pptx', 'ppt', 'xlsx', 'html', 'txt'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled || !filePaths || filePaths.length === 0) return { success: false, canceled: true };

    const manifestPath = path.join(HANDBOOK_DIR, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return { success: false, error: 'manifest 缺失' };
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    const added = [];
    for (const srcPath of filePaths) {
      added.push(registerHandbookFile(manifest, stageDir, srcPath, category));
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

    return { success: true, files: added, stage: stageDir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 扫描各项目目录里的产物文档,供知识库"本项目产物"视图列出/一键归档。
// 扫描 knowledge/ stage2/ stage3/ + 项目根的文档文件;跳过 prototype/uploads/recordings/meta.json 等。
ipcMain.handle('handbook:scan-projects', async () => {
  try {
    const DOC_EXTS = new Set(['md', 'docx', 'doc', 'pdf', 'pptx', 'ppt', 'xlsx', 'html', 'txt']);
    const SCAN_SUBDIRS = ['knowledge', 'stage2', 'stage3'];
    const SKIP_ROOT = new Set(['meta.json']);
    let slugs = [];
    try {
      slugs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory()).map((d) => d.name);
    } catch (e) { slugs = []; }

    const projects = [];
    for (const slug of slugs) {
      const meta = readProjectMeta(slug);
      const projectDir = resolveProjectPath(slug);
      const items = [];

      const collect = (absPath, relDir) => {
        let entries = [];
        try { entries = fs.readdirSync(absPath, { withFileTypes: true }); } catch (e) { return; }
        for (const ent of entries) {
          if (!ent.isFile()) continue;
          if (relDir === '' && SKIP_ROOT.has(ent.name)) continue;
          const ext = (path.extname(ent.name).slice(1) || '').toLowerCase();
          if (!DOC_EXTS.has(ext)) continue;
          let mtime = 0;
          try { mtime = fs.statSync(path.join(absPath, ent.name)).mtimeMs; } catch (e) {}
          const relPath = (relDir ? relDir + '/' : '') + ent.name;
          items.push({
            file: ent.name,
            relPath,
            title: path.basename(ent.name, path.extname(ent.name)),
            type: ext,
            dir: relDir || '.',
            mtime,
          });
        }
      };

      collect(projectDir, '');
      for (const sub of SCAN_SUBDIRS) collect(path.join(projectDir, sub), sub);

      if (items.length) {
        items.sort((a, b) => b.mtime - a.mtime);
        projects.push({ slug, name: (meta && meta.name) || slug, items });
      }
    }
    // 有产物的项目按名称排序
    projects.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, projects };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 把某项目产物文件归档到知识库某阶段,并登记 manifest。
ipcMain.handle('handbook:archive-from-project', async (_event, { slug, relPath, stage, category }) => {
  try {
    const stageDir = String(stage || '').replace(/[^0-9]/g, '');
    if (!stageDir) return { success: false, error: '无效阶段' };
    if (!slug || !relPath) return { success: false, error: '缺少项目/文件' };

    // resolveProjectPath 已含路径穿越防护
    const srcPath = resolveProjectPath(slug, ...relPath.split('/'));
    if (!fs.existsSync(srcPath)) return { success: false, error: '源文件不存在' };

    const manifestPath = path.join(HANDBOOK_DIR, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return { success: false, error: 'manifest 缺失' };
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    const fileName = registerHandbookFile(manifest, stageDir, srcPath, category);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

    return { success: true, file: fileName, stage: stageDir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 删除知识库文档:删磁盘文件并从 manifest 对应 stage.items 摘除、重算 counts。
// 内置文档删除后会在下次启动被 ensureDirs 的 copyDirSync 从内置目录恢复(前端给出提示)。
ipcMain.handle('handbook:delete', async (_event, { stage, file }) => {
  try {
    const stageDir = String(stage || '').replace(/[^0-9]/g, '');
    if (!stageDir || !file) return { success: false, error: '缺少阶段/文件' };
    const filePath = resolveHandbookPath(stageDir, file); // 越界防护
    if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });

    const manifestPath = path.join(HANDBOOK_DIR, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const st = (manifest.stages || []).find((s) => s.dir === stageDir);
      if (st && Array.isArray(st.items)) {
        st.items = st.items.filter((it) => it.file !== file);
        st.counts = {
          knowledge: st.items.filter((it) => it.category === 'knowledge').length,
          deliverable: st.items.filter((it) => it.category === 'deliverable').length,
        };
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
      }
    }
    return { success: true, stage: stageDir, file };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 导入标准技能 zip:选包 → 校验 → 解压 → 重生 manifest,分阶段回报进度
ipcMain.handle('skills:import-zip', async () => {
  const emit = (phase, percent, message) => {
    try { mainWindow?.webContents.send('skills:import-progress', { phase, percent, message }); } catch (e) {}
  };
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: '选择技能包(.zip)',
      filters: [{ name: '技能包', extensions: ['zip'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths || filePaths.length === 0) return { success: false, canceled: true };

    const zipPath = filePaths[0];
    emit('read', 10, '读取压缩包…');
    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));

    // 校验:找到 SKILL.md(顶层或单一子目录内),且 frontmatter 含 name
    emit('validate', 35, '校验技能包结构…');
    const norm = (p) => p.replace(/\\/g, '/');
    // zip 原始 key -> 归一化路径,只看非目录条目
    const fileKeys = Object.keys(zip.files).filter((k) => !zip.files[k].dir);
    let skillMdKey = null;
    for (const k of fileKeys) {
      if (/(^|\/)SKILL\.md$/i.test(norm(k))) { skillMdKey = k; break; }
    }
    if (!skillMdKey) {
      return { success: false, error: '无效技能包:缺少 SKILL.md' };
    }
    const skillMdPath = norm(skillMdKey);
    // 技能 id = SKILL.md 所在目录名;若在顶层则用 zip 文件名
    const parts = skillMdPath.split('/');
    const rootPrefix = parts.length > 1 ? parts.slice(0, -1).join('/') + '/' : '';
    let skillId = parts.length > 1 ? parts[parts.length - 2]
      : path.basename(zipPath, '.zip');
    skillId = skillId.replace(/[^A-Za-z0-9._-]/g, '-').replace(/^-+|-+$/g, '') || 'imported-skill';

    // 校验 frontmatter 含 name
    const skillMdRaw = await zip.file(skillMdKey).async('string');
    const fmMatch = skillMdRaw.replace(/\r\n?/g, '\n').match(/^---\s*\n([\s\S]*?)\n---/);
    if (!fmMatch || !/^name:\s*\S+/m.test(fmMatch[1])) {
      return { success: false, error: '无效技能包:SKILL.md 缺少 name 字段' };
    }

    // 重名冲突 → 询问覆盖 / 取消
    const destDir = path.join(SKILLS_DIR, skillId);
    if (fs.existsSync(destDir)) {
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['覆盖', '取消'],
        defaultId: 1,
        cancelId: 1,
        title: '技能已存在',
        message: `技能「${skillId}」已存在,是否覆盖?`,
      });
      if (response !== 0) return { success: false, canceled: true };
      fs.rmSync(destDir, { recursive: true, force: true });
    }

    // 解压该技能目录下所有文件到 SKILLS_DIR/skillId
    emit('extract', 65, '解压技能文件…');
    fs.mkdirSync(destDir, { recursive: true });
    const fileEntries = Object.keys(zip.files).filter((k) => {
      const n = norm(k);
      if (zip.files[k].dir) return false;
      return rootPrefix ? n.startsWith(rootPrefix) : true;
    });
    for (const key of fileEntries) {
      const rel = rootPrefix ? norm(key).slice(rootPrefix.length) : norm(key);
      if (!rel || rel.includes('..')) continue;
      const outPath = path.join(destDir, rel);
      if (!outPath.startsWith(destDir)) continue; // zip-slip 防护
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, await zip.file(key).async('nodebuffer'));
    }

    // 重生 manifest(调用 build 脚本,幂等)
    emit('manifest', 88, '更新技能清单…');
    try {
      const { execFileSync } = require('child_process');
      const scriptPath = app.isPackaged
        ? path.join(process.resourcesPath, 'scripts', 'build-skills-manifest.js')
        : path.join(app.getAppPath(), 'scripts', 'build-skills-manifest.js');
      if (fs.existsSync(scriptPath)) {
        execFileSync(process.execPath, [scriptPath], {
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        });
        // 脚本写到仓库 skills/,同步一份到运行时 SKILLS_DIR
        const builtManifest = app.isPackaged
          ? path.join(process.resourcesPath, 'skills', 'manifest.json')
          : path.join(app.getAppPath(), 'skills', 'manifest.json');
        if (fs.existsSync(builtManifest) && builtManifest !== path.join(SKILLS_DIR, 'manifest.json')) {
          fs.copyFileSync(builtManifest, path.join(SKILLS_DIR, 'manifest.json'));
        }
      }
    } catch (e) {
      // 脚本不可用时不阻断导入(技能文件已落地),仅提示 manifest 未刷新
      console.warn('[skills:import-zip] manifest rebuild failed:', e.message);
    }

    emit('done', 100, '导入完成');
    return { success: true, skillId };
  } catch (err) {
    emit('error', 100, err.message);
    return { success: false, error: err.message };
  }
});

// ---------------------------------------------------------------------------
// IPC handlers — FDE 授权
// ---------------------------------------------------------------------------

// 授权状态(无 .lic → NO_LICENSE)
ipcMain.handle('license:status', async () => {
  try {
    return { success: true, ...licenseVerifier.currentStatus() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 本机机器码(授权页显示,给用户报给签发方)
ipcMain.handle('license:machine-sn', async () => {
  try {
    return { success: true, sn: licenseFingerprint.computeSN() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 导入 .lic:选文件 → 校验 → 通过则落盘
ipcMain.handle('license:import', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: '选择授权文件 (.lic)',
      filters: [{ name: '授权文件', extensions: ['lic'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths || !filePaths[0]) return { success: false, canceled: true };
    const bytes = fs.readFileSync(filePaths[0]);
    const result = licenseVerifier.loadAndVerify(bytes);
    if (!result.ok) {
      return { success: false, rejected: true, status: result.status, reason: result.reason, detail: result };
    }
    licenseStore.saveLicense(bytes);
    return { success: true, status: result.status, sn: result.sn };
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
        // 真实阶段:以磁盘产出推断的 derivedStage 为准(文件不会骗人),
        // 与 meta.stage(可能被手动切到更靠后)取较大值——已推进过的阶段不回退。
        const stage = Math.max(outputs.derivedStage || 0, Number(meta.stage) || 0) || FDE_DEFAULT_STAGE;
        projects.push({ slug: entry.name, ...meta, stage, outputs, hasSpec: outputs.hasSpec, hasPrototype: outputs.hasPrototype, deliverables: outputs.deliverables, derivedStage: outputs.derivedStage, phase });
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

    // 预建 FDE 标准子目录（交付物/原型的落点）。不预建 spec.md 等文件——
    // deriveOutputs 以文件是否存在判断阶段进度，空文件会误判为"已生成"。
    for (const sub of ['stage2', 'stage3', 'prototype']) {
      fs.mkdirSync(path.join(projectDir, sub), { recursive: true });
    }

    // Create session via ACP
    let sessionId = null;
    if (acp) {
      const result = await acp.request('session/new', { cwd: projectDir, mcpServers: [] });
      sessionId = result && result.sessionId ? result.sessionId : null;
      captureModelsFromSession(result);
      // Auto-approve all edits — fire-and-forget so we don't block project creation on a second round-trip
      if (sessionId) {
        acp.request('session/set_mode', { sessionId, modeId: 'dont_ask' }).catch(() => {});
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
        captureModelsFromSession(newSession);
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
  return { models: cachedModels, current: currentModelId };
});

ipcMain.handle('hermes:set-model', async (_event, { slug, modelId }) => {
  // 关键：360 custom provider 下，运行时 session/set_model 会被 hermes 误判成 openrouter
  // provider（detect_provider_for_model 看到 vendor/model 格式即判 openrouter）→ 401。
  // 唯一可靠方式：写 config.yaml 的 model.default(裸名) + 重启引擎，让 provider: custom 生效。
  try {
    const persisted = writeConfigModel(modelId);   // 内部会剥掉 openai-api: 等前缀，存裸名
    if (!persisted) return { success: false, error: '写入 config.yaml 失败' };
    // 重启 hermes 让新模型生效（provider=custom 路由到 360）
    await stopHermes();
    startHermes();
    await new Promise((r) => setTimeout(r, 300)); // 给新进程一点启动时间
    await initializeHermes();
    // 重启后所有旧 sessionId 在新进程里已失效：清掉每个项目的 sessionId，
    // 下次发消息时 hermes:prompt 会自动 session/new 重建（带项目上下文恢复）。
    try {
      if (fs.existsSync(PROJECTS_DIR)) {
        for (const entry of fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const m = readProjectMeta(entry.name);
          if (m && m.sessionId) updateProjectMeta(entry.name, { sessionId: null });
        }
      }
    } catch (e) {
      console.warn('[main] clear sessionIds after model switch failed:', e.message);
    }
    return { success: true, persisted, restarted: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 读 config.yaml 当前默认模型（供顶栏初始回填）
ipcMain.handle('hermes:read-config-model', async () => {
  return { model: readConfigModel() };
});

// 只写 config.yaml 的 model.default（兜底/独立持久化，不走 session/set_model）
ipcMain.handle('hermes:set-config-model', async (_event, { modelId }) => {
  const ok = writeConfigModel(modelId);
  return { success: ok };
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
      captureModelsFromSession(newSession);
      meta.sessionId = newSession.sessionId;
      await acp.request('session/set_mode', { sessionId: meta.sessionId, modeId: 'dont_ask' }).catch(() => {});
      writeProjectMeta(slug, meta);
    }

    // Build prompt content blocks (text + optional images / files)
    // ACP content-block fields are camelCase (mimeType). We also keep media_type
    // on image blocks for backward-compat with older render paths.
    const promptBlocks = [{ type: 'text', text }];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.type === 'image' && att.data) {
          // Images go through as inline base64 → the ACP server emits an
          // image_url part so vision models can see them directly.
          const mime = att.media_type || 'image/png';
          promptBlocks.push({ type: 'image', data: att.data, mimeType: mime, media_type: mime });
        } else if (att.type === 'file') {
          const mimeType = att.media_type || 'application/octet-stream';
          if (typeof att.text === 'string') {
            // Plain-text files: inline the decoded text directly as an
            // embedded resource (the server splices it into the prompt).
            const uri = `file:///${encodeURIComponent(att.name || 'attachment')}`;
            promptBlocks.push({ type: 'resource', resource: { uri, mimeType, text: att.text } });
          } else if (att.data) {
            // Binary documents (docx/pdf/xlsx/…): DO NOT inline the base64 blob.
            // The agent would try to Read the fake URI path and hang. Instead we
            // write the bytes to the project's uploads/ dir and send a
            // resource_link to the REAL on-disk path — the ACP server then reads
            // and extracts the document's text server-side.
            try {
              const safeName = (att.name || `attachment-${Date.now()}`).replace(/[/\\]/g, '_');
              const uploadsDir = resolveProjectPath(slug, 'uploads');
              if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
              const diskPath = path.join(uploadsDir, safeName);
              fs.writeFileSync(diskPath, Buffer.from(att.data, 'base64'));
              const fileUri = `file://${diskPath}`;
              promptBlocks.push({ type: 'resource_link', uri: fileUri, name: safeName, mimeType });
            } catch (e) {
              console.error(`[main] failed to persist binary attachment ${att.name}: ${e.message}`);
              // Fall back to a text note so the user's turn still goes through.
              promptBlocks.push({ type: 'text', text: `（附件「${att.name}」处理失败，未能读取：${e.message}）` });
            }
          }
        }
      }
    }

    // [debug] 多模态附件排查：打印附件概况与 block 详情
    if (Array.isArray(attachments) && attachments.length > 0) {
      console.log(`[main] prompt: ${attachments.length} attachment(s) received`);
      attachments.forEach((a, i) => {
        console.log(`[main]   in[${i}] type=${a && a.type} media=${a && a.media_type} hasData=${!!(a && a.data)} dataLen=${a && a.data ? a.data.length : 0} hasText=${typeof (a && a.text) === 'string'}`);
      });
      console.log(`[main]   → blocks=${JSON.stringify(promptBlocks.map(b => b.type))}  imageBlocks=${promptBlocks.filter(b => b.type === 'image').length}`);
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
    console.error(`[main] prompt FAILED: ${err && err.message}`, err && err.stack ? err.stack.split('\n').slice(0, 4).join('\n') : '');
    throw new Error(`Prompt failed: ${err.message}`);
  }
});

// 语音转文字：录音 base64 → 360 ASR（volcengine/asr-turbo）→ 识别文本
// 360 ASR 接受内联 base64 音频（extra_body.audio.data，无 data: 前缀），无需公网 URL。
ipcMain.handle('hermes:transcribe', async (_event, { audioBase64, mimeType } = {}) => {
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return { success: false, error: '没有可识别的音频' };
  }
  const { apiKey, baseUrl } = parseEnvConfig();
  if (!apiKey) {
    return { success: false, error: '未配置 API Key，无法进行语音识别' };
  }
  const https = require('https');
  const http = require('http');
  let url;
  try {
    url = new URL((baseUrl || 'https://api.360.cn/v1').replace(/\/$/, '') + '/audios/generations');
  } catch {
    return { success: false, error: 'API 地址格式不正确' };
  }
  const lib = url.protocol === 'http:' ? http : https;
  const payload = JSON.stringify({
    model: 'volcengine/asr-turbo',
    extra_body: {
      user: { uid: 'product-lobster-desktop' },
      audio: { data: audioBase64 },
      request: { model_name: 'bigmodel' },
    },
  });

  return await new Promise((resolve) => {
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
        const status = res.statusCode || 0;
        if (status === 401) return resolve({ success: false, error: '鉴权失败，请检查 API Key' });
        if (status === 429) return resolve({ success: false, error: '请求过于频繁，请稍后再试' });
        let parsed;
        try { parsed = JSON.parse(body); } catch {
          // 非 JSON 响应：把状态码和原始响应片段带出来，便于定位
          const snippet = (body || '').slice(0, 300);
          return resolve({ success: false, error: `语音识别响应解析失败（HTTP ${status}）：${snippet}` });
        }
        if (parsed.error) {
          const e = parsed.error;
          const detail = (typeof e === 'string') ? e
            : (e.message || e.msg || e.code || JSON.stringify(e));
          return resolve({ success: false, error: `语音识别失败（HTTP ${status}）：${detail}` });
        }
        if (status < 200 || status >= 300) {
          const snippet = (body || '').slice(0, 300);
          return resolve({ success: false, error: `语音识别失败（HTTP ${status}）：${snippet}` });
        }
        // data.extra_data 是 JSON 字符串，内含 result.text
        try {
          const extra = JSON.parse(parsed?.data?.extra_data || '{}');
          const textOut = extra?.result?.text || '';
          const duration = extra?.audio_info?.duration ?? null;
          if (!textOut) return resolve({ success: false, error: '未识别到语音内容' });
          return resolve({ success: true, text: textOut, duration });
        } catch {
          return resolve({ success: false, error: '语音识别结果解析失败' });
        }
      });
    });
    req.on('error', (err) => resolve({ success: false, error: err.message || '语音识别请求失败' }));
    req.setTimeout(120_000, () => { req.destroy(); resolve({ success: false, error: '语音识别请求超时' }); });
    req.write(payload);
    req.end();
  });
});

// 保存录音到磁盘（用于语音识别失败时兜底，避免录音丢失）。
// 有 slug → 存到 <项目>/recordings/；无 slug（如欢迎页）→ 存到全局 ~/.product-lobster/recordings/。
// 返回 { success, filePath, dirPath }，dirPath 供前端“打开所在文件夹”。
ipcMain.handle('hermes:save-recording', async (_event, { slug, audioBase64, ext } = {}) => {
  try {
    if (!audioBase64) return { success: false, error: '没有可保存的录音' };
    const safeExt = (ext || 'webm').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'webm';
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `recording-${stamp}.${safeExt}`;

    let dirPath;
    if (slug) {
      dirPath = resolveProjectPath(slug, 'recordings');
    } else {
      dirPath = path.join(PRODUCT_LOBSTER_HOME, 'recordings');
    }
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, Buffer.from(audioBase64, 'base64'));
    return { success: true, filePath, dirPath, fileName };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 保存/预览聊天附件。toTemp=true → 写系统临时目录返回路径（供 shell.openPath 预览）;
// 否则弹「另存为」让用户选路径下载。内容优先 base64 data，否则按 utf-8 写 text。
ipcMain.handle('hermes:save-attachment', async (_event, { name, data, text, toTemp } = {}) => {
  try {
    if (!data && typeof text !== 'string') return { success: false, error: '没有可保存的内容' };
    const safeName = (name || 'attachment').replace(/[/\\:*?"<>|]/g, '_').slice(0, 200) || 'attachment';
    const buffer = data ? Buffer.from(data, 'base64') : Buffer.from(text, 'utf-8');

    if (toTemp) {
      const dirPath = path.join(os.tmpdir(), 'product-lobster-preview');
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
      const filePath = path.join(dirPath, safeName);
      fs.writeFileSync(filePath, buffer);
      return { success: true, filePath, dirPath };
    }

    const { canceled, filePath: dest } = await dialog.showSaveDialog(mainWindow, {
      title: '下载附件',
      defaultPath: safeName,
    });
    if (canceled || !dest) return { success: false, canceled: true };
    fs.writeFileSync(dest, buffer);
    return { success: true, path: dest };
  } catch (err) {
    return { success: false, error: err.message };
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
  if (!model) return { ok: false, error: '未指定测试模型(请填写该网关支持的模型名)' };
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

// 读取项目内的图片/二进制文件，返回 data URI（renderer 无法直接读磁盘文件）
const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
};
ipcMain.handle('hermes:read-file-data-uri', async (_event, { slug, relativePath }) => {
  try {
    const filePath = resolveProjectPath(slug, relativePath);
    if (!fs.existsSync(filePath)) return { success: false, error: 'file not found' };
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
    const base64 = fs.readFileSync(filePath).toString('base64');
    return { success: true, dataUri: `data:${mime};base64,${base64}` };
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

ipcMain.handle('hermes:list-files', async (_event, { slug, dir, recursive }) => {
  try {
    const baseDir = dir || '.';
    const targetDir = resolveProjectPath(slug, baseDir);
    if (!fs.existsSync(targetDir)) return { success: true, files: [] };

    // 递归列出目录下所有文件（含 data/ 等子目录），relPath 相对于 targetDir，
    // 供原型文件树展示 html / js / json 等全部产物，而不仅是顶层 html。
    const walk = (absDir, relPrefix) => {
      const out = [];
      const items = fs.readdirSync(absDir, { withFileTypes: true });
      for (const item of items) {
        const rel = relPrefix ? `${relPrefix}/${item.name}` : item.name;
        if (item.isDirectory()) {
          out.push({ name: item.name, isDirectory: true, relPath: rel, depth: relPrefix ? relPrefix.split('/').length : 0 });
          if (recursive) out.push(...walk(path.join(absDir, item.name), rel));
        } else {
          out.push({ name: item.name, isDirectory: false, relPath: rel, depth: relPrefix ? relPrefix.split('/').length : 0 });
        }
      }
      return out;
    };

    const files = walk(targetDir, '').map((f) => ({
      ...f,
      // path 保持相对项目根，兼容既有调用（如 prototype/xxx）
      path: path.join(baseDir, f.relPath).replace(/\\/g, '/'),
    }));
    // 目录在前、同级按名排序（递归时子项已紧随其父目录，故仅做稳定的浅层排序）
    if (!recursive) {
      files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    }
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

    // 确保静态服务已启动并拿到端口(冷启动/异常时兜底)
    if (!prototypeServer) startPrototypeServer();
    if (!prototypeServerPort) {
      await new Promise((resolve) => {
        let waited = 0;
        const timer = setInterval(() => {
          waited += 50;
          if (prototypeServerPort || waited >= 3000) { clearInterval(timer); resolve(); }
        }, 50);
      });
    }
    if (!prototypeServerPort) {
      return { success: false, error: '本地预览服务未就绪，请重启应用后重试' };
    }

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
    // 只打包 prototype/ 目录（纯原型页面+数据），发出去即可直接查看
    const protoDir = resolveProjectPath(slug, 'prototype');
    if (!fs.existsSync(protoDir)) {
      return { success: false, error: 'prototype directory not found' };
    }

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

    addDirToZip(protoDir, zip);

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Prototype',
      defaultPath: `${slug}-prototype.zip`,
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
