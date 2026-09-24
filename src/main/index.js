delete process.env.ELECTRON_RUN_AS_NODE;

const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');
// node-pty 是原生模块，其 .node 二进制按 Electron 具体版本/ABI 编译。别人在自己机器
// 上 npm install 后，如果平台/架构没有匹配的 prebuild、或 Electron 版本没对齐，顶层
// require 会直接抛异常——而这一行原先在文件最开头无条件执行，会在主进程启动的第一
// 时间就把整个应用带崩（不只是终端功能，AI coding 对话/hermes 连接全部起不来，且没
// 有任何界面提示）。改成懒加载：只在真正要开终端时才 require，加载失败只让终端功能
// 不可用，不影响应用其余部分。
let pty = null;
let ptyLoadError = null;
function getPty() {
  if (pty || ptyLoadError) return pty;
  try {
    pty = require('node-pty');
  } catch (err) {
    ptyLoadError = err;
    console.error('[main] node-pty load failed, terminal feature disabled:', err.message);
  }
  return pty;
}
const AcpClient = require('./acp-client.js');
const licenseVerifier = require('./license/verifier.js');
const licenseStore = require('./license/store.js');
const licenseFingerprint = require('./license/fingerprint.js');
const licenseRemote = require('./license/remote.js');

// 统一应用名（菜单栏、关于、macOS 顶栏、任务栏）。
// 打包后来自 package.json 的 productName；开发态 app.name 默认是 "Electron"，这里显式覆盖。
app.setName('FDE产设大师');

let mainWindow;
let splashWindow;
// 真退出标志：macOS 上「关闭 = 隐藏」，只有 before-quit 之后才允许窗口真的销毁。
let isQuitting = false;
let acp = null;
let hermesProcess = null;
let prototypeServer = null;
let prototypeServerPort = null;
let prototypeServingDir = null;
let mediaServer = null;        // 媒体流服务（支持 Range，用于视频/音频内嵌播放）
let mediaServerPort = null;
const mediaTokenMap = new Map(); // token -> absolute file path（白名单，避免任意读盘）
let cachedModels = [];       // Cached model list from initialize/session
let currentModelId = '';     // 当前会话模型 id（来自 session/new 的 modelState）
let cachedCapabilities = {}; // Cached ACP capabilities
let hermesReady = false;     // ACP 是否已连接且 initialize 成功(供环境自检读取)

// 待用户裁决的权限请求(编辑确认 / 危险命令确认)。key = requestId，
// value = { resolve } —— 渲染层通过 hermes:permission-respond 回传裁决后 resolve。
const pendingPermissions = new Map();

// session/load 回放历史期间的会话：回放出来的 chunk 不转发，否则前端会当成新回复追加
const replayingSessions = new Set();
// 正在跑 session/prompt 的会话：此时重进项目页不再 session/load，免得打乱进行中的这一轮
const promptingSessions = new Set();
// 当前 Hermes 进程里已经 load/new 成功的代码会话。应用重启后集合为空，
// 首次使用会先 session/load，避免拿磁盘里的旧 sessionId 直接 prompt 导致无响应。
const loadedCodeSessions = new Set();
const ensuringCodeSessions = new Map();

// 代码工作区终端：每个 PTY 固定在对应工作区 cwd，避免跨工作区串台。
const codeTerminals = new Map();
let nextCodeTerminalId = 1;

function codeShellOptions() {
  if (process.platform === 'win32') {
    const powershell = process.env.ProgramFiles
      ? path.join(process.env.ProgramFiles, 'PowerShell', '7', 'pwsh.exe')
      : '';
    return [
      { id: 'cmd', label: '命令提示符', command: process.env.ComSpec || 'cmd.exe', args: [] },
      { id: 'powershell', label: 'PowerShell', command: fs.existsSync(powershell) ? powershell : 'powershell.exe', args: ['-NoLogo'] },
    ];
  }
  const preferred = process.env.SHELL && fs.existsSync(process.env.SHELL) ? process.env.SHELL : '/bin/zsh';
  return [
    { id: 'zsh', label: 'zsh', command: preferred, args: [] },
    { id: 'bash', label: 'bash', command: '/bin/bash', args: [] },
  ];
}

function findCodeTerminal(id) {
  return codeTerminals.get(String(id || '')) || null;
}


// ---------------------------------------------------------------------------
// Data directories
// ---------------------------------------------------------------------------

const PRODUCT_LOBSTER_HOME = path.join(os.homedir(), '.product-lobster');
const PROJECTS_DIR = path.join(PRODUCT_LOBSTER_HOME, 'projects');
const HANDBOOK_DIR = path.join(PRODUCT_LOBSTER_HOME, 'fde-handbook');
const SKILLS_DIR = path.join(PRODUCT_LOBSTER_HOME, 'skills');
const SKILLS_GROUPS_FILE = path.join(SKILLS_DIR, 'groups.json');
const CONFIG_YAML_PATH = path.join(PRODUCT_LOBSTER_HOME, 'config.yaml');
const AI_APPS_DIR = path.join(PRODUCT_LOBSTER_HOME, 'ai-apps');
const AI_APPS_FILE = path.join(AI_APPS_DIR, 'apps.json');
const AI_APPS_MEMORY_DIR = path.join(AI_APPS_DIR, 'memory');
// 内置专家覆盖层：{ overrides: { [builtinId]: {…被改字段} }, deleted: [builtinId…] }
// 不改源码 ai-experts.js，前端合并 内置定义 + 覆盖 = 最终展示，可随时恢复默认。
const AI_APPS_BUILTIN_OVERRIDES_FILE = path.join(AI_APPS_DIR, 'builtin-overrides.json');

// 「代码」模式(Codex 式)的工作区登记表。工作区 ≠ FDE 项目：它指向磁盘上
// 任意一个文件夹(用户导入的代码仓 / 新建的空工程)，agent 在原地读写，
// 不进 PROJECTS_DIR。登记表只存指针，不拷贝文件。
// 结构：[{ id, name, path(绝对路径), sessionId, lastOpenedAt, createdAt }]
const CODE_WORKSPACES_JSON = path.join(PRODUCT_LOBSTER_HOME, 'code-workspaces.json');
// 排障用：主进程 console.log 只进用户自己开的终端，我这边读不到；
// 关键动作额外落一份到这个文件，方便直接读日志定位，不用让用户贴终端输出。
const CODE_DEBUG_LOG = path.join(PRODUCT_LOBSTER_HOME, 'code-debug.log');
function codeDebugLog(line) {
  try { fs.appendFileSync(CODE_DEBUG_LOG, `[${new Date().toISOString()}] ${line}\n`); } catch (_) {}
}

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
// 把向导/设置里填的 API Key 同步写进 config.yaml 的 custom_providers[].api_key。
// 背景：hermes 选模型的事实来源是 config.yaml；custom_providers 条目的凭据取自
// 该条目内联的 api_key（或它 key_env 指向的环境变量）。向导只写 .env 的
// OPENAI_API_KEY,不会更新 config.yaml,于是别人机器上首装的占位符
// your-api-key-here 一直生效 → 填了 key 也不生效。这里在保存时把 key 同步进去。
// 用行级正则替换,保留注释/格式,不引入 YAML 库。
//
// 关于「多网关」：这里仍然无条件改写 api_key/base_url,不按条目名定位。
// 原因在引擎侧 —— hermes 解析 provider:custom 用的是**顶层 model.base_url**
// (runtime_provider.py 的 bare-custom 信任路径 / 凭据池按 base_url 建 key),
// custom_providers 只是承载凭据的那一份配置,引擎同一时刻只认一个 base_url。
// 所以多网关并存的「事实来源」是 gateway-profiles.json(桌面侧),config.yaml 只需
// 反映**当前激活**的那一组;按名改写条目并不会让引擎同时认多个网关。
//
// opts.stripVendorPrefix: 显式指定是否剥掉模型名的「厂商/」前缀。不传则按 base_url
//   是否含 360.cn 猜(旧行为)。
// opts.replaceModels: 显式指定是否用传入的 models 覆盖 config 里的 models: 列表。
//   网关档案走这条(用户勾的就是他要的);不传时沿用旧的「只有非360才覆盖」推断。
function writeConfigProviderKey(apiKey, baseUrl, model, opts = {}) {
  try {
    const key = String(apiKey || '').trim();
    if (!key) return false;
    ensureDirs();
    if (!fs.existsSync(CONFIG_YAML_PATH)) return false;
    let content = fs.readFileSync(CONFIG_YAML_PATH, 'utf-8');

    const url = String(baseUrl || '').trim();
    // 前缀:引擎 provider:custom 桶把带前缀模型名整串透传给 base_url。360 认前缀名
    //   (anthropic/claude-sonnet-5 能跑);非360官方网关只认裸名(gpt-4o),带 openai/ 前缀会400。
    //   故非360网关写入前先剥前缀。opts 显式指定优先,否则按 base_url 猜(未填=默认360)。
    const guessThreeSixty = !url || /(^|\.)360\.cn(\b|\/|:)/i.test(url);
    const isThreeSixty = opts.stripVendorPrefix === undefined
      ? guessThreeSixty
      : !opts.stripVendorPrefix;

    // api_key / base_url:替换所有 custom_providers 条目(含占位符)。
    if (/^[ \t]+api_key:[ \t]*.+$/m.test(content)) {
      content = content.replace(
        /^([ \t]+)api_key:[ \t]*.+$/gm,
        (_full, indent) => `${indent}api_key: ${key}`
      );
    }
    if (url && /^[ \t]+base_url:[ \t]*.+$/m.test(content)) {
      content = content.replace(
        /^([ \t]+)base_url:[ \t]*.+$/gm,
        (_full, indent) => `${indent}base_url: ${url}`
      );
    }

    const stripPrefix = (m) => { const i = m.indexOf('/'); return i >= 0 ? m.slice(i + 1).trim() : m; };
    const models = (Array.isArray(model) ? model : (model != null ? [model] : []))
      .map((m) => String(m || '').trim())
      .filter(Boolean)
      .map((m) => (isThreeSixty ? m : stripPrefix(m))) // 非360剥前缀
      .filter(Boolean)
      .filter((m, i, arr) => arr.indexOf(m) === i); // 去重,保序

    if (models.length) {
      // ① model 块内的 default:(始终写第一个模型)
      if (/^[ \t]+default:[ \t]*.+$/m.test(content)) {
        content = content.replace(
          /^([ \t]+)default:[ \t]*.+$/m,
          (_full, indent) => `${indent}default: ${models[0]}`
        );
      }
      // ② 覆盖 models: 列表(= 顶栏下拉框的白名单)。
      //   旧行为(opts.replaceModels 未传时):只有非 360 网关才覆盖。因为 360 下模板里
      //   那 11 个模型本来都能用,若无条件收敛成单个默认模型,下拉框就只剩一项(旧 bug)。
      //   网关档案(显式传 true):用户在「获取模型」里勾了什么就写什么 —— 包括 360,
      //   否则勾选被静默忽略,顶栏显示的仍是模板里的旧清单,和用户所见不一致。
      //   CRLF 兼容:config.yaml 在 Windows 上可能是 \r\n,故用 \r?\n。
      const replaceModels = opts.replaceModels === undefined ? !isThreeSixty : !!opts.replaceModels;
      if (replaceModels) {
        content = content.replace(
          /^([ \t]+)models:[ \t]*\r?\n(?:[ \t]+-[ \t]*.+\r?\n?)+/m,
          (_full, indent) => `${indent}models:\n` + models.map((m) => `${indent}  - ${m}\n`).join('')
        );
      }
    }

    fs.writeFileSync(CONFIG_YAML_PATH, content, 'utf-8');
    return true;
  } catch (e) {
    console.warn('[main] writeConfigProviderKey failed:', e.message);
    return false;
  }
}

// --- 网关档案(gateway profiles) -------------------------------------------
// 多组命名网关配置各自保存 baseUrl/apiKey/models,一次激活一组写进 config.yaml。
// 切换网关不再覆盖上一组的凭据 —— 这是单一 custom_providers[0] 时代的主要痛点。
//
// stripVendorPrefix: 显式声明该网关认不认 "厂商/模型" 前缀名。360 认
// anthropic/claude-sonnet-5;OpenAI/DeepSeek 官方只认裸名 gpt-4o,带前缀会 400。
// 旧代码在两处用 base_url 是否含 360.cn 去猜(writeConfigProviderKey / test-connection),
// 这里改成建档时就定下来,不再猜。
const GATEWAY_PROFILES_PATH = path.join(PRODUCT_LOBSTER_HOME, 'gateway-profiles.json');

function readGatewayProfiles() {
  try {
    if (!fs.existsSync(GATEWAY_PROFILES_PATH)) return { version: 1, activeId: '', profiles: [] };
    const raw = JSON.parse(fs.readFileSync(GATEWAY_PROFILES_PATH, 'utf-8'));
    const profiles = Array.isArray(raw && raw.profiles) ? raw.profiles.filter((p) => p && p.id) : [];
    return { version: 1, activeId: String((raw && raw.activeId) || ''), profiles };
  } catch (e) {
    console.error('[main] readGatewayProfiles failed:', e.message);
    return { version: 1, activeId: '', profiles: [] };
  }
}

// 就地更新 .env 里的若干变量:值为 null/'' 的键整行删除,其余就地改值,新键追加。
// 不整文件重写 —— 用户可能在 .env 里放了别的变量(代理、调试开关),整写会抹掉。
function upsertEnvVars(vars) {
  ensureDirs();
  const nl = '\n';
  let lines = [];
  try {
    if (fs.existsSync(ENV_FILE_PATH)) {
      lines = fs.readFileSync(ENV_FILE_PATH, 'utf-8').split(/\r?\n/);
    }
  } catch (_) { lines = []; }

  const pending = new Map(Object.entries(vars));
  const out = [];
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!m || !pending.has(m[1])) { out.push(line); continue; }
    const key = m[1];
    const val = pending.get(key);
    pending.delete(key);
    if (val === null || val === undefined || val === '') continue; // 删除该行
    out.push(`${key}=${val}`);
  }
  // 剩下的是文件里原本没有的键,追加(空值不写)。
  for (const [key, val] of pending) {
    if (val === null || val === undefined || val === '') continue;
    out.push(`${key}=${val}`);
  }
  // 收尾:去掉末尾多余空行,保证正好一个结尾换行。
  while (out.length && !out[out.length - 1].trim()) out.pop();
  fs.writeFileSync(ENV_FILE_PATH, out.join(nl) + nl, 'utf-8');
}

function writeGatewayProfiles(store) {
  ensureDirs();
  const payload = {
    version: 1,
    activeId: String((store && store.activeId) || ''),
    profiles: Array.isArray(store && store.profiles) ? store.profiles : [],
  };
  // 原子写:profiles 里存着用户的 API Key,写一半被打断会丢凭据。
  const tmp = `${GATEWAY_PROFILES_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
  fs.renameSync(tmp, GATEWAY_PROFILES_PATH);
}

// 首次使用:把当前 config.yaml + .env 里已生效的那份配置收编成第一个 profile,
// 老用户升级后打开设置页就能看到自己原有的网关,不用重新填。
//
// 只在「确实已配置过」(.env 里有真实 key)时收编。全新安装没有 key,此时不能建档 ——
// 一是会生成一个空 key 的垃圾档案,二是 ensureDirs 的 models 自愈以「档案文件是否
// 存在」为开关,提前建档会把自愈永久关掉。全新用户走首启向导正常建档。
function ensureGatewayProfilesSeeded() {
  const store = readGatewayProfiles();
  if (store.profiles.length) return store;
  const { apiKey } = parseEnvConfig();
  if (!apiKey) return store; // 尚未配置过 → 不建档,返回空列表让前端进「新增网关」态
  const models = readDeclaredModelIds();
  let baseUrl = '';
  try {
    if (fs.existsSync(CONFIG_YAML_PATH)) {
      const m = fs.readFileSync(CONFIG_YAML_PATH, 'utf-8').match(/^[ \t]+base_url:[ \t]*(\S+)[ \t]*$/m);
      if (m) baseUrl = m[1];
    }
  } catch (_) { /* 读不到就留空,下面按 360 兜底 */ }
  const url = baseUrl || 'https://api.360.cn/v1';
  const isThreeSixty = /(^|\.)360\.cn(\b|\/|:)/i.test(url);
  // stripVendorPrefix 必须看「现有 config 里的模型名长什么样」,不能看域名。
  // 这份 config 是用户已经跑通的配置:里面的模型名带 "厂商/" 前缀,就证明该网关
  // 认前缀名 —— 各种自建/聚合代理(llm.api.xxx.com 之类)域名里没有 360.cn,但同样
  // 透传 deepseek/deepseek-v4-pro 这种前缀名。按域名猜会把它们判成"要剥前缀",
  // 用户一点「保存并启用」就被改写成裸名,直接 400。
  const declaredHasPrefix = models.some((m) => m.includes('/'));
  const seeded = {
    version: 1,
    activeId: 'default',
    profiles: [{
      id: 'default',
      name: isThreeSixty ? '360 网关' : '当前网关',
      baseUrl: url,
      apiKey: apiKey || '',
      models,
      // 有带前缀的模型名 → 保留前缀;一个都没有(全裸名或空)→ 回退按域名猜。
      stripVendorPrefix: declaredHasPrefix ? false : !isThreeSixty,
    }],
  };
  writeGatewayProfiles(seeded);
  return seeded;
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
  for (const dir of [PRODUCT_LOBSTER_HOME, PROJECTS_DIR, AI_APPS_DIR, AI_APPS_MEMORY_DIR]) {
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

  // 自愈:旧版 writeConfigProviderKey 会在首启保存 key 时把 custom_providers[].models
  // 列表无条件收敛成一项(DEFAULT_MODEL),导致老用户下拉框只剩一个模型。此处在启动时
  // 检测:若已存在的 config.yaml 是 360 网关且 models: 列表 <2 项(被旧版砍过),就从
  // 模板补回完整列表。非 360 网关(用户自己换的)不动,避免覆盖用户的自定义。
  //
  // 网关档案存在时必须跳过:档案里的 models 是用户在「获取模型」里亲手勾的,
  // 只勾一个模型是完全合法的选择,而这段自愈会把它当成"被旧版砍过"直接覆盖回
  // 模板的 11 条 —— 用户每次重启都发现下拉框里冒出一堆没勾过的模型。
  try {
    const target = path.join(PRODUCT_LOBSTER_HOME, 'config.yaml');
    const source = path.join(templatesDir, 'config.yaml');
    const hasProfiles = fs.existsSync(GATEWAY_PROFILES_PATH);
    if (!hasProfiles && fs.existsSync(target) && fs.existsSync(source)) {
      const cur = fs.readFileSync(target, 'utf-8');
      // 判定 360 网关:base_url 含 360.cn(未显式换网关即视为默认 360)。
      const nonThreeSixty = /base_url:[ \t]*(\S+)/i.test(cur)
        && !/base_url:[ \t]*\S*360\.cn/i.test(cur);
      // 统计 models: 块下的列表项数。
      let count = 0, inModels = false;
      for (const line of cur.split('\n')) {
        if (/^\s*models:\s*$/.test(line)) { inModels = true; continue; }
        if (inModels) {
          if (/^\s+-\s+\S+/.test(line)) { count++; continue; }
          if (line.trim() && !/^\s*#/.test(line)) break;
        }
      }
      if (!nonThreeSixty && count < 2) {
        // 从模板抽出完整 "models:\n  - ...\n  - ..." 块。
        const tmpl = fs.readFileSync(source, 'utf-8');
        const m = tmpl.match(/^([ \t]+)models:[ \t]*\r?\n(?:[ \t]+-[ \t]*.+\r?\n?)+/m);
        if (m) {
          const healed = cur.replace(
            /^([ \t]+)models:[ \t]*\r?\n(?:[ \t]+-[ \t]*.+\r?\n?)+/m,
            m[0]
          );
          if (healed !== cur) {
            fs.writeFileSync(target, healed, 'utf-8');
            console.log('[main] Healed config.yaml models list from template (was collapsed to <2 entries)');
          }
        }
      }
    }
  } catch (e) {
    console.warn('[main] heal models list skipped:', e.message);
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
      // 用户在桌面端编辑过的内置技能会落 .edited 标记 → 跳过覆盖,保住编辑。
      // 未编辑的内置技能仍随 app 升级更新。
      if (fs.existsSync(path.join(dstSkill, '.edited'))) continue;
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
// Media streaming server — 支持 HTTP Range 请求，供 <video>/<audio> 内嵌播放
// （视频若用 data: URI 无法拖动进度条、大文件卡；这里按 token 白名单流式返回）
// ---------------------------------------------------------------------------

function startMediaServer() {
  if (mediaServer) return;

  mediaServer = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== '/media') {
        res.writeHead(404); res.end('Not found'); return;
      }
      const token = url.searchParams.get('t');
      const filePath = token && mediaTokenMap.get(token);
      if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404); res.end('Not found'); return;
      }

      const stat = fs.statSync(filePath);
      const total = stat.size;
      const ext = path.extname(filePath).toLowerCase();
      const mime = EXTENDED_MIME[ext] || 'application/octet-stream';
      const range = req.headers.range;

      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        let start = m && m[1] ? parseInt(m[1], 10) : 0;
        let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
        if (isNaN(start) || start < 0) start = 0;
        if (isNaN(end) || end >= total) end = total - 1;
        if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${total}` }); res.end(); return; }
        res.writeHead(206, {
          'Content-Type': mime,
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Cache-Control': 'no-cache',
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Type': mime,
          'Content-Length': total,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err) {
      res.writeHead(500); res.end(String(err && err.message || err));
    }
  });

  mediaServer.listen(0, '127.0.0.1', () => {
    mediaServerPort = mediaServer.address().port;
    console.log(`[main] Media server listening on http://127.0.0.1:${mediaServerPort}`);
  });
}

// 为一个本地文件登记一个流式播放 URL（幂等：同路径复用同 token）
function registerMediaUrl(filePath) {
  const abs = path.resolve(filePath);
  startMediaServer();
  for (const [tok, p] of mediaTokenMap) {
    if (p === abs) return `http://127.0.0.1:${mediaServerPort}/media?t=${tok}`;
  }
  const token = require('crypto').randomBytes(12).toString('hex');
  mediaTokenMap.set(token, abs);
  return `http://127.0.0.1:${mediaServerPort}/media?t=${token}`;
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

  // 用局部 proc 持有本次 spawn 的子进程；exit/error 回调里以 `hermesProcess === proc`
  // 守卫，避免「旧进程延迟到达的 exit 事件」误清掉重启后新建的 acp/hermesProcess。
  const proc = spawn(command, [], {
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
      // 终端环境不活跃清理阈值（秒），必须 > prompt 超时（600s），
      // 否则长任务期间终端被提前回收导致引擎卡死。
      TERMINAL_LIFETIME_SECONDS: '900',
      // Git Bash path conversion fixes for Windows
      MSYS_NO_PATHCONV: '1',
      MSYS2_ARG_CONV_EXCL: '*',
    },
    ...(process.platform === 'win32' ? { windowsHide: true } : {}),
  });
  hermesProcess = proc;

  proc.on('error', (err) => {
    console.error('[main] Failed to start hermes-acp:', err.message);
    if (hermesProcess !== proc) return; // 旧进程的事件，别碰当前活动引擎
    hermesReady = false;
  });

  proc.on('exit', (code, signal) => {
    console.log(`[main] hermes-acp exited (code=${code}, signal=${signal})`);
    if (hermesProcess !== proc) return; // 旧进程延迟到达的 exit，不能清掉新引擎
    hermesProcess = null;
    acp = null;
    hermesReady = false;
  });

  acp = new AcpClient(proc);

  // Forward server notifications to renderer (include method name and sessionId for routing)
  acp.onNotification((notification) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const params = notification.params || {};
      const sessionId = params.sessionId || params.session_id || '';
      codeDebugLog(`notification method=${notification.method} sid=${sessionId} replaying=${sessionId && replayingSessions.has(sessionId)} keys=${Object.keys(params).join(',')}`);
      // session/load 会把整段历史当成 message chunk 重放一遍。放行会让前端把历史
      // 当成新回复追加进当前对话（重进项目页就「乱套」的根因），这里直接丢掉。
      if (sessionId && replayingSessions.has(sessionId)) return;
      const payload = {
        method: notification.method || '',
        sessionId,
        ...params,
      };
      mainWindow.webContents.send('hermes:session-update', payload);
    }
  });

  // Register reverse RPC handler: permission requests from hermes.
  // 引擎在「default」模式下(代码工作区用它)会在每次写文件前发来 request_permission，
  // toolCall.content 里带 {type:'diff', path, oldText, newText}。我们把它转给渲染层，
  // 由 diff 确认弹窗裁决。ACP 期望的返回体是 { outcome:{ outcome:'selected', optionId } }
  // (批准) 或 { outcome:{ outcome:'cancelled' } }(拒绝，引擎据此不写文件)。
  acp.onRequest('request_permission', async (params) => {
    const sessionId = params.sessionId || params.session_id || '';
    const codeWorkspace = sessionId && readCodeWorkspaces().find((w) =>
      (w.conversations || []).some((c) => c.sessionId === sessionId));
    // 判断是不是「编辑确认」——带 diff 内容块，或 toolCall.kind === 'edit'。
    const tc = (params && (params.toolCall || params.tool_call)) || {};
    const content = Array.isArray(tc.content) ? tc.content : [];
    const isEdit = tc.kind === 'edit' || content.some((c) => c && c.type === 'diff');
    // 默认放行选项(引擎给的 options 里第一个 allow_* 的 id)。
    const options = Array.isArray(params && params.options) ? params.options : [];
    const allowOpt = options.find((o) => o && String(o.kind || '').startsWith('allow')) || options.find((o) => o && o.optionId === 'allow_once');
    const allowId = (allowOpt && (allowOpt.optionId || allowOpt.option_id)) || 'allow_once';
    const selected = (optionId) => ({ outcome: { outcome: 'selected', optionId } });
    const cancelled = () => ({ outcome: { outcome: 'cancelled' } });
    if (codeWorkspace) {
      const root = path.resolve(codeWorkspace.path);
      const insideRoot = (target) => {
        const resolved = path.resolve(path.isAbsolute(target) ? target : path.join(root, target));
        const normalizedRoot = process.platform === 'win32' ? root.toLowerCase() : root;
        const normalizedTarget = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
        return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(normalizedRoot + path.sep);
      };
      const diffPaths = content.filter((item) => item && item.type === 'diff').map((item) => item.path || item.file_path);
      // 只允许当前工作区内有明确路径的编辑；无路径的编辑无法验证，也拒绝。
      if (isEdit && (!diffPaths.length || diffPaths.some((target) => typeof target !== 'string' || !insideRoot(target)))) {
        console.warn(`[main] Blocked code edit outside workspace: ${tc.title || 'unknown'}`);
        return cancelled();
      }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      return new Promise((resolve) => {
        const requestId = `perm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        let settled = false;
        const finish = (result) => {
          if (settled) return;
          settled = true;
          pendingPermissions.delete(requestId);
          resolve(result);
        };
        pendingPermissions.set(requestId, {
          resolve: (decision) => {
            // decision: { approved:bool, optionId? }
            if (decision && decision.approved) finish(selected(decision.optionId || allowId));
            else finish(cancelled());
          },
        });
        mainWindow.webContents.send('hermes:permission-request', { requestId, isEdit, ...params });

        // 非编辑类(危险命令)保留 30s 自动放行的旧行为，避免命令类卡死；
        // 编辑类必须由用户明确裁决——不自动放行，只兜一个很长的超时防止永久挂起。
        const ms = isEdit ? 600_000 : 30_000;
        setTimeout(() => {
          if (settled) return;
          finish(isEdit ? cancelled() : selected(allowId));
        }, ms);
      });
    }
    // If no window, auto-allow non-edits, deny edits.
    return isEdit ? cancelled() : selected(allowId);
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
      clientInfo: { name: 'prodesigner', version: '3.0.0' },
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
  // 先把要停的引用取到局部，并立刻让出全局：这样 startHermes 随后新建的
  // 进程天然满足 `hermesProcess === proc` 守卫，旧进程延迟到达的 exit 不会误伤新引擎。
  const dyingAcp = acp;
  const dying = hermesProcess;
  acp = null;
  hermesProcess = null;
  hermesReady = false;
  // 模型列表是「上一个引擎进程 + 上一份 config」的产物。切网关时新 config 的模型
  // 与旧列表可能毫无交集,留着它会让顶栏在新引擎 warmup 回填前显示旧网关的模型名。
  // 清空后 hermes:list-models 会退到 config 声明的清单(当前网关的事实来源)。
  cachedModels = [];
  currentModelId = '';

  if (dyingAcp) {
    try {
      await dyingAcp.shutdown(); // 内含 3s SIGKILL 兜底
    } catch (err) {
      console.error('[main] Error shutting down hermes-acp:', err.message);
    }
  }
  // 确保旧子进程真的退出后再返回，避免新旧进程抢 stdio。
  if (dying && dying.exitCode == null && dying.signalCode == null) {
    try { dying.kill('SIGKILL'); } catch (_) { /* ignore */ }
    await new Promise((resolve) => {
      if (dying.exitCode != null || dying.signalCode != null) return resolve();
      const t = setTimeout(resolve, 3000); // 兜底：最坏等 3s
      dying.once('exit', () => { clearTimeout(t); resolve(); });
    });
  }
}

// 原子重启：stop → start → initialize，失败最多重试 `retries` 次。
// 返回 true 表示重启后引擎已就绪（hermesReady 且 acp 非 null）。
async function restartHermes(retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await stopHermes();
      startHermes();
      await initializeHermes();
      if (hermesReady && acp) return true;
    } catch (err) {
      console.error(`[main] restartHermes attempt ${attempt} failed:`, err && err.message);
    }
    if (attempt < retries) {
      console.warn('[main] restartHermes: 未就绪，重试一次…');
    }
  }
  return hermesReady && !!acp;
}

// 兜底自愈：发消息前若引擎未连接，先尝试拉起一次，让「再发一次」就能恢复，
// 而不必重启整个 app。返回 true 表示已就绪。
async function ensureHermesReady() {
  if (acp && hermesReady) return true;
  console.warn('[main] ensureHermesReady: 引擎未就绪，尝试重连…');
  try {
    if (!hermesProcess) {
      // 进程已不在：直接拉起并初始化。
      startHermes();
      await initializeHermes();
    } else {
      // 进程还在但握手失败/状态可疑：走干净的原子重启，避免在坏连接上重试。
      await restartHermes(1);
    }
  } catch (err) {
    console.error('[main] ensureHermesReady failed:', err && err.message);
  }
  return !!acp && hermesReady;
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

// ---------------------------------------------------------------------------
// 「代码」模式(Codex 式) —— 工作区登记表读写 + 路径解析
// ---------------------------------------------------------------------------

function readCodeWorkspaces() {
  try {
    if (!fs.existsSync(CODE_WORKSPACES_JSON)) return [];
    const raw = fs.readFileSync(CODE_WORKSPACES_JSON, 'utf-8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error('[main] readCodeWorkspaces failed:', e.message);
    return [];
  }
}

function writeCodeWorkspaces(list) {
  try {
    if (!fs.existsSync(PRODUCT_LOBSTER_HOME)) fs.mkdirSync(PRODUCT_LOBSTER_HOME, { recursive: true });
    fs.writeFileSync(CODE_WORKSPACES_JSON, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('[main] writeCodeWorkspaces failed:', e.message);
  }
}

function findCodeWorkspace(id) {
  return readCodeWorkspaces().find((w) => w.id === id) || null;
}

// 每个工作区可以开多条独立对话(像 VSCode 里对同一项目开多个 AI 会话)。
// 结构：workspace.conversations = [{ id, title, sessionId, messages[], createdAt, lastActiveAt }]。
// 兼容老数据：旧工作区只有顶层 sessionId、无 conversations → 迁移成一条默认对话。
function genConversationId() {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureConversations(workspace) {
  if (!workspace) return workspace;
  if (!Array.isArray(workspace.conversations)) workspace.conversations = [];
  if (workspace.conversations.length === 0) {
    const now = new Date().toISOString();
    workspace.conversations.push({
      id: genConversationId(),
      title: '对话 1',
      // 继承旧的顶层 sessionId(如有)，历史对话上下文不丢。
      sessionId: workspace.sessionId || null,
      messages: [],
      createdAt: now,
      lastActiveAt: now,
    });
    // 迁移后清掉顶层 sessionId，统一走 conversations。
    delete workspace.sessionId;
  }
  return workspace;
}

// 取工作区 + 指定对话；conversationId 为空时取最近活跃的一条(或默认第一条)。
function findCodeConversation(workspaceId, conversationId) {
  const list = readCodeWorkspaces();
  const workspace = list.find((w) => w.id === workspaceId);
  if (!workspace) return { list, workspace: null, conversation: null };
  ensureConversations(workspace);
  let conversation = conversationId
    ? workspace.conversations.find((c) => c.id === conversationId)
    : null;
  if (!conversation) conversation = workspace.conversations[0];
  return { list, workspace, conversation };
}

function validateEntryName(name) {
  const value = String(name || '').trim();
  if (!value || value === '.' || value === '..' || value.includes('/') || value.includes('\\') || value.includes('\0')) {
    throw new Error('名称无效');
  }
  return value;
}

function uniqueCopyPath(targetDir, name) {
  const parsed = path.parse(name);
  let candidate = path.join(targetDir, name);
  let index = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(targetDir, `${parsed.name} 副本${index > 1 ? ` ${index}` : ''}${parsed.ext}`);
    index++;
  }
  return candidate;
}

// 解析工作区内的相对路径为绝对路径，并做路径逃逸守卫(照抄 resolveProjectPath 的做法)。
function resolveWorkspacePath(workspace, relPath) {
  const root = path.resolve(workspace.path);
  const resolved = path.resolve(path.join(root, relPath || '.'));
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

// 代码工作区文件树扫描：跳过体量大 / 无意义的目录，限制总条数防止巨仓卡死。
const CODE_TREE_IGNORE_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', '.next', '.nuxt', '.venv', 'venv',
  '__pycache__', '.idea', '.vscode', '.cache', 'target', 'out', '.gradle',
]);
const CODE_TREE_MAX_ENTRIES = 5000;

// ---------------------------------------------------------------------------
// Project type inference — 区分"智能对话"与"FDE 项目"
// ---------------------------------------------------------------------------
const CHAT_SLUG_PREFIXES = ['chat-', 'coach-', 'expert-', 'app-'];

function inferProjectType(slug, meta) {
  if (meta && meta.projectType) return meta.projectType;
  if (CHAT_SLUG_PREFIXES.some((p) => String(slug || '').startsWith(p))) return 'chat';
  return 'fde-project';
}

function conversationKindOf(projectType) {
  return projectType === 'fde-project' ? 'project' : 'chat';
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

// 删除某个会话线的历史消息（按 tab 过滤后整档重写）。
// tab 为空表示清空全部；返回删除条数。
function deleteMessagesByTab(slug, tab) {
  const msgPath = resolveProjectPath(slug, 'messages.jsonl');
  if (!fs.existsSync(msgPath)) return 0;
  const lines = fs.readFileSync(msgPath, 'utf-8').trim().split('\n').filter(Boolean);
  const kept = [];
  let removed = 0;
  for (const line of lines) {
    let msg = null;
    try { msg = JSON.parse(line); } catch { kept.push(line); continue; } // 坏行原样保留
    if (!tab || msg.tab === tab) { removed++; continue; }
    kept.push(line);
  }
  fs.writeFileSync(msgPath, kept.length ? kept.join('\n') + '\n' : '', 'utf-8');
  return removed;
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

// 中文应用菜单。Electron 默认菜单是全英文的（File/Edit/View/Window/Help），
// 这里替换成中文模板；应用名统一用 app.name（= package.json productName「FDE产设大师」）。
function buildAppMenu() {
  const appName = app.name;
  const isMac = process.platform === 'darwin';

  const template = [];

  if (isMac) {
    template.push({
      label: appName,
      submenu: [
        { role: 'about', label: `关于 ${appName}` },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: `隐藏 ${appName}` },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '全部显示' },
        { type: 'separator' },
        { role: 'quit', label: `退出 ${appName}` },
      ],
    });
  }

  template.push({
    label: '编辑',
    submenu: [
      { role: 'undo', label: '撤销' },
      { role: 'redo', label: '重做' },
      { type: 'separator' },
      { role: 'cut', label: '剪切' },
      { role: 'copy', label: '复制' },
      { role: 'paste', label: '粘贴' },
      ...(isMac
        ? [
            { role: 'pasteAndMatchStyle', label: '粘贴并匹配格式' },
            { role: 'delete', label: '删除' },
            { role: 'selectAll', label: '全选' },
          ]
        : [
            { role: 'delete', label: '删除' },
            { type: 'separator' },
            { role: 'selectAll', label: '全选' },
          ]),
    ],
  });

  template.push({
    label: '视图',
    submenu: [
      { role: 'reload', label: '重新加载' },
      { role: 'forceReload', label: '强制重新加载' },
      { role: 'toggleDevTools', label: '开发者工具' },
      { type: 'separator' },
      { role: 'resetZoom', label: '实际大小' },
      { role: 'zoomIn', label: '放大' },
      { role: 'zoomOut', label: '缩小' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: '全屏' },
    ],
  });

  template.push({
    label: '窗口',
    submenu: [
      { role: 'minimize', label: '最小化' },
      { role: 'zoom', label: '缩放' },
      ...(isMac
        ? [
            { type: 'separator' },
            { role: 'front', label: '前置全部窗口' },
          ]
        : [{ role: 'close', label: '关闭' }]),
    ],
  });

  template.push({
    label: '帮助',
    submenu: [
      {
        label: `关于 ${appName}`,
        click: () => {
          dialog.showMessageBox(mainWindow || undefined, {
            type: 'info',
            title: `关于 ${appName}`,
            message: appName,
            detail: `版本 ${app.getVersion()}\n\nFDE 项目经理五阶段作战工作台`,
            buttons: ['确定'],
          });
        },
      },
    ],
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    frame: false,
    // 不设的话 Chromium 给纯白，首帧就是刺眼白屏；对齐 :root 的 --background(白)，
    // 让「窗口底 → 页面底」无缝，看不出加载过程。
    backgroundColor: '#ffffff',
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

  // 页面加载 promise 挂到窗口上：启动流程要等它 resolve 才 show，
  // 否则窗口会赶在渲染层出首帧之前显示出来，那段空白就是白屏。
  mainWindow.__rendererReady = loadRenderer(mainWindow).catch((error) => {
    console.error('[main] Failed to load renderer:', error);
  });

  // 窗口控制 IPC 在模块级注册一次（见 registerWindowControls），
  // 不能放这里：每次重建窗口都会再注册一遍，监听器只增不减。

  mainWindow.on('maximize', () =>
    mainWindow.webContents.send('window:maximized-changed', true),
  );
  mainWindow.on('unmaximize', () =>
    mainWindow.webContents.send('window:maximized-changed', false),
  );

  // macOS：点「×」只隐藏不销毁。窗口留着，重开瞬时可见，agent 会话与渲染层状态都不丢。
  // 真正退出（Cmd+Q / before-quit）时 isQuitting 为 true，放行销毁。
  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin' && !isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

// 窗口控制 IPC：与窗口实例解耦，模块级只注册一次，作用于当前的 mainWindow。
function registerWindowControls() {
  ipcMain.on('window:minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  });
  ipcMain.on('window:maximize', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window:close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  });
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

ipcMain.handle('fs:save-local-file', async (_event, srcPath) => {
  try {
    if (!fs.existsSync(srcPath)) return { success: false, error: '文件不存在' };
    const defaultName = path.basename(srcPath);
    const { canceled, filePath: dest } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      title: '保存文件',
    });
    if (canceled || !dest) return { success: false, canceled: true };
    fs.copyFileSync(srcPath, dest);
    return { success: true, filePath: dest };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- Deliverable file resolution and preview ---

const EXTENDED_MIME = {
  ...MIME_TYPES,
  '.pdf': 'application/pdf',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.xml': 'text/xml',
  '.py': 'text/x-python',
  '.sh': 'text/x-shellscript',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
  '.gz': 'application/gzip',
  '.tar': 'application/x-tar',
};

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function previewKindForExt(ext) {
  const e = (ext || '').toLowerCase();
  if (['.png','.jpg','.jpeg','.gif','.svg','.webp','.bmp','.ico'].includes(e)) return 'image';
  if (e === '.pdf') return 'pdf';
  if (['.mp4','.m4v','.mov','.webm','.ogv'].includes(e)) return 'video';
  if (['.mp3','.wav','.m4a','.aac','.ogg','.oga','.flac'].includes(e)) return 'audio';
  if (['.html','.htm'].includes(e)) return 'html';
  if (['.md','.txt','.csv','.json','.js','.ts','.py','.sh','.css','.xml','.yaml','.yml','.vue','.jsx','.tsx'].includes(e)) return 'text';
  return 'unsupported';
}

function buildFileMeta(filePath) {
  const name = path.basename(filePath);
  const ext = path.extname(name).toLowerCase();
  const stat = fs.statSync(filePath);
  return {
    filePath: path.resolve(filePath),
    name,
    ext,
    mime: EXTENDED_MIME[ext] || 'application/octet-stream',
    size: stat.size,
    sizeLabel: formatFileSize(stat.size),
    previewKind: previewKindForExt(ext),
  };
}

ipcMain.handle('hermes:resolve-file-ref', async (_event, { slug, ref }) => {
  try {
    if (!ref) return { success: false, error: 'empty ref' };
    // 1. Absolute path
    if (path.isAbsolute(ref)) {
      if (fs.existsSync(ref) && fs.statSync(ref).isFile()) {
        return { success: true, file: buildFileMeta(ref) };
      }
      return { success: false, error: '文件不存在' };
    }
    // 2. Relative/basename within project
    if (slug) {
      const projectDir = resolveProjectPath(slug);
      if (fs.existsSync(projectDir)) {
        // Try direct relative path first
        const direct = path.join(projectDir, ref);
        if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
          const meta = buildFileMeta(direct);
          meta.relPath = ref;
          return { success: true, file: meta };
        }
        // Recursive search for basename
        const baseName = path.basename(ref);
        const priorityDirs = ['', 'output', 'outputs', 'deliverables', 'prototype', 'stage2', 'stage3', 'generated_images'];
        let bestMatch = null;
        let bestMtime = 0;
        const searchDir = (dir) => {
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const ent of entries) {
              const full = path.join(dir, ent.name);
              if (ent.isFile() && ent.name === baseName) {
                const st = fs.statSync(full);
                if (st.mtimeMs > bestMtime) {
                  bestMatch = full;
                  bestMtime = st.mtimeMs;
                }
              } else if (ent.isDirectory() && !ent.name.startsWith('.')) {
                searchDir(full);
              }
            }
          } catch { /* skip unreadable dirs */ }
        };
        // Search priority dirs first, then full project
        for (const pd of priorityDirs) {
          const sub = pd ? path.join(projectDir, pd) : projectDir;
          if (fs.existsSync(sub)) searchDir(sub);
          if (bestMatch) break;
        }
        if (!bestMatch) searchDir(projectDir);
        if (bestMatch) {
          const meta = buildFileMeta(bestMatch);
          meta.relPath = path.relative(projectDir, bestMatch);
          return { success: true, file: meta };
        }
      }
    }
    return { success: false, error: '文件未找到' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

const MAX_DATA_URI_SIZE = 50 * 1024 * 1024; // 50 MB

ipcMain.handle('fs:read-local-file-data-uri', async (_event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return { success: false, error: '文件不存在' };
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_DATA_URI_SIZE) return { success: false, error: '文件过大，无法预览', tooLarge: true };
    const ext = path.extname(filePath).toLowerCase();
    const mime = EXTENDED_MIME[ext] || 'application/octet-stream';
    const buf = fs.readFileSync(filePath);
    const dataUri = `data:${mime};base64,${buf.toString('base64')}`;
    return { success: true, dataUri, mime, size: stat.size };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:media-url', async (_event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return { success: false, error: '文件不存在' };
    if (fs.statSync(filePath).isDirectory()) return { success: false, error: '不是文件' };
    const url = registerMediaUrl(filePath);
    return { success: true, url };
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

// 把单个 frontmatter 值序列化成 YAML 行(可能多行)。返回不含结尾换行的字符串。
// 现有 parseSkillFrontmatter 不解双引号转义(只去首尾引号),为保证往返一致,
// 凡含换行或 YAML 特殊字符的值一律用 block scalar(key: |)——解析器对 | 块
// 的缩进续行处理是正确的,免疫内容里的冒号/引号/#,且不涉及转义。
function serializeFrontmatterValue(key, rawVal) {
  const val = rawVal == null ? '' : String(rawVal);
  const needsBlock = val === '' || val.includes('\n') ||
    /:\s/.test(val) || /\s#/.test(val) ||
    /^[>|*&!%@`"'\-?{}\[\],#]/.test(val) ||
    /[:#]$/.test(val) || /["']/.test(val);
  if (needsBlock) {
    if (val === '') return `${key}: ""`;
    const indented = val.split('\n').map((l) => '  ' + l).join('\n');
    return `${key}: |\n${indented}`;
  }
  return `${key}: ${val}`;
}

// 行级 patch:只重写 updates 里出现的键所在行(单行或多行块整段替换)，
// 其余 frontmatter 行与正文逐字节保留。不整体重序列化(现有解析器不可逆)。
// updates: { name?, description?, category?, icon? }，只处理值非 undefined 的键。
function patchSkillFrontmatter(rawText, updates) {
  const text = String(rawText || '');
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const keys = Object.keys(updates).filter((k) => updates[k] !== undefined);
  if (!keys.length) return text;

  // 定位 frontmatter 块。无则新建一个插到最前。
  const fmMatch = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
  if (!fmMatch) {
    const block = keys.map((k) => serializeFrontmatterValue(k, updates[k])).join(nl);
    return `---${nl}${block}${nl}---${nl}${text}`;
  }

  const fmInner = fmMatch[1];
  const before = text.slice(0, fmMatch.index) + '---' + nl; // 开头 --- 行
  const after = text.slice(fmMatch.index + fmMatch[0].length); // 结尾 --- 之后的正文
  const lines = fmInner.split(/\r?\n/);

  const remaining = new Set(keys);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):[ \t]*(.*)$/);
    if (kv && remaining.has(kv[1])) {
      const key = kv[1];
      // 与 parseSkillFrontmatter 一致:块标量或空值时吞掉后续缩进续行
      const inlineVal = kv[2];
      if (inlineVal === '|' || inlineVal === '>' || inlineVal === '|-' || inlineVal === '>-' || inlineVal === '') {
        let j = i + 1;
        while (j < lines.length && (/^\s+\S/.test(lines[j]) || lines[j].trim() === '')) j++;
        i = j - 1; // 跳过被吞的续行
      }
      out.push(serializeFrontmatterValue(key, updates[key]));
      remaining.delete(key);
    } else {
      out.push(lines[i]);
    }
  }
  // 没在原块里出现的键 → 追加到块末
  for (const k of keys) {
    if (remaining.has(k)) out.push(serializeFrontmatterValue(k, updates[k]));
  }

  return before + out.join(nl) + nl + '---' + nl + after;
}

function skillGroupOf(id) {
  for (const g of SKILLS_GROUPS) if (g.members.includes(id)) return g.id;
  return 'general';
}
function loadCustomSkillGroups() {
  try {
    const raw = JSON.parse(fs.readFileSync(SKILLS_GROUPS_FILE, 'utf-8'));
    return Array.isArray(raw) ? raw.filter((g) => g && g.id && g.name) : [];
  } catch { return []; }
}
function allSkillGroups() { return [...SKILLS_GROUPS, ...loadCustomSkillGroups()]; }
function writeCustomSkillGroups(groups) {
  fs.mkdirSync(SKILLS_DIR, { recursive: true });
  const tmp = `${SKILLS_GROUPS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(groups, null, 2) + '\n', 'utf-8');
  fs.renameSync(tmp, SKILLS_GROUPS_FILE);
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
    // group/icon 优先读 frontmatter(用户在桌面端编辑可改)，缺失回退硬编码:
    // fm.category 合法才用，否则回退 skillGroupOf(id) 的成员映射。
    const fmCat = fm.category && allSkillGroups().some((g) => g.id === fm.category) ? fm.category : null;
    const group = fmCat || skillGroupOf(id);
    const meta = allSkillGroups().find((g) => g.id === group) || SKILLS_GROUPS[SKILLS_GROUPS.length - 1];
    const generated = !builtin.has(id) && group === 'general';
    skills.push({
      id,
      name: fm.name || id,
      file: path.basename(candidate),
      group,
      icon: fm.icon || SKILL_ICONS[id] || meta.icon,
      color: meta.color,
      version: fm.version || '',
      summary: skillSummary(description),
      description,
      builtin: builtin.has(id),
      generated,
    });
  }

  skills.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));

  const groups = allSkillGroups()
    .map((g) => ({ id: g.id, name: g.name, icon: g.icon, color: g.color, custom: !!g.custom,
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

ipcMain.handle('skills:create-group', async (_event, payload = {}) => {
  try {
    const name = String(payload.name || '').trim();
    if (!name) return { success: false, error: '分组名称不能为空' };
    const id = String(payload.id || `custom-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    const groups = loadCustomSkillGroups();
    if (!id || allSkillGroups().some((g) => g.id === id)) return { success: false, error: '分组标识已存在或无效' };
    const group = { id, name, icon: String(payload.icon || 'folder'), color: String(payload.color || '#64748b'), custom: true, members: [] };
    writeCustomSkillGroups([...groups, group]);
    return { success: true, group };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('skills:delete-group', async (_event, { id } = {}) => {
  try {
    const groupId = String(id || '');
    if (!groupId || SKILLS_GROUPS.some((g) => g.id === groupId)) return { success: false, error: '内置分组不可删除' };
    const data = scanSkillsManifest(SKILLS_DIR);
    if (data.skills.some((s) => s.group === groupId)) return { success: false, error: '请先将分组内技能移出后再删除' };
    writeCustomSkillGroups(loadCustomSkillGroups().filter((g) => g.id !== groupId));
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});


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

// 编辑技能:把 {name,description,category,icon} patch 进 SKILL.md 的 frontmatter,
// body 用新正文整体替换,其余 frontmatter(注释/未识别字段/格式)逐字节保留。
// 内置技能编辑后落一个 .edited 标记,ensureDirs 启动同步时跳过覆盖(否则编辑会丢)。
ipcMain.handle('skills:write', async (_event, payload = {}) => {
  try {
    const id = String(payload.skill || '').trim();
    if (!id || id.includes('/') || id.includes('\\') || id.includes('..')) {
      return { success: false, error: '无效技能 id' };
    }
    const dirPath = path.join(SKILLS_DIR, id);
    if (!dirPath.startsWith(SKILLS_DIR + path.sep)) return { success: false, error: '路径越界' };
    // 定位 SKILL.md(大小写兼容),不存在则用默认名
    const filePath = ['SKILL.md', 'skill.md']
      .map((f) => path.join(dirPath, f))
      .find((p) => fs.existsSync(p)) || path.join(dirPath, 'SKILL.md');
    if (!filePath.startsWith(dirPath + path.sep)) return { success: false, error: '路径越界' };
    if (!fs.existsSync(dirPath)) return { success: false, error: '技能不存在' };

    const raw = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';

    // 只 patch 传入的 frontmatter 字段(undefined 的键不动)
    const updates = {};
    if (payload.name !== undefined) updates.name = String(payload.name);
    if (payload.description !== undefined) updates.description = String(payload.description);
    if (payload.category !== undefined) updates.category = String(payload.category);
    if (payload.icon !== undefined) updates.icon = String(payload.icon);
    let next = patchSkillFrontmatter(raw, updates);

    // body 整体替换(前端传了才换;body 是纯 markdown,无 YAML 风险)
    if (payload.body !== undefined) {
      const nl = next.includes('\r\n') ? '\r\n' : '\n';
      const fmMatch = next.match(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/);
      const head = fmMatch ? next.slice(0, fmMatch.index + fmMatch[0].length) : '';
      const body = String(payload.body);
      next = head ? head + nl + body.replace(/^\r?\n/, '') : body;
    }

    fs.writeFileSync(filePath, next, 'utf-8');

    // 内置技能:落 .edited 标记,防启动同步覆盖
    if (bundledSkillIds().has(id)) {
      try { fs.writeFileSync(path.join(dirPath, '.edited'), '', 'utf-8'); } catch (e) {}
    }

    // 重扫 manifest,保持与实时扫描一致
    try {
      const data = scanSkillsManifest(SKILLS_DIR);
      fs.writeFileSync(path.join(SKILLS_DIR, 'manifest.json'), JSON.stringify(data, null, 2) + '\n', 'utf-8');
    } catch (e) {}
    return { success: true, skillId: id };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
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
// 从内存中的 zip buffer 安装技能：校验 SKILL.md → 推导 id → 解压到 SKILLS_DIR → 重建 manifest。
// promptOverwrite=true 时重名弹框询问（本地导入用）；false 时静默覆盖（技能中心安装用）。
async function installSkillFromZipBuffer(buffer, { fallbackId, emit, promptOverwrite = false } = {}) {
  const noop = () => {};
  const em = typeof emit === 'function' ? emit : noop;
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(buffer);

  // 校验:找到 SKILL.md(顶层或单一子目录内),且 frontmatter 含 name
  em('validate', 35, '校验技能包结构…');
  const norm = (p) => p.replace(/\\/g, '/');
  const fileKeys = Object.keys(zip.files).filter((k) => !zip.files[k].dir);
  let skillMdKey = null;
  for (const k of fileKeys) {
    if (/(^|\/)SKILL\.md$/i.test(norm(k))) { skillMdKey = k; break; }
  }
  if (!skillMdKey) {
    return { success: false, error: '无效技能包:缺少 SKILL.md' };
  }
  const skillMdPath = norm(skillMdKey);
  const parts = skillMdPath.split('/');
  const rootPrefix = parts.length > 1 ? parts.slice(0, -1).join('/') + '/' : '';
  let skillId = parts.length > 1 ? parts[parts.length - 2] : (fallbackId || 'imported-skill');
  skillId = skillId.replace(/[^A-Za-z0-9._-]/g, '-').replace(/^-+|-+$/g, '') || 'imported-skill';

  const skillMdRaw = await zip.file(skillMdKey).async('string');
  const fmMatch = skillMdRaw.replace(/\r\n?/g, '\n').match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch || !/^name:\s*\S+/m.test(fmMatch[1])) {
    return { success: false, error: '无效技能包:SKILL.md 缺少 name 字段' };
  }

  const destDir = path.join(SKILLS_DIR, skillId);
  if (fs.existsSync(destDir)) {
    if (promptOverwrite) {
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['覆盖', '取消'],
        defaultId: 1,
        cancelId: 1,
        title: '技能已存在',
        message: `技能「${skillId}」已存在,是否覆盖?`,
      });
      if (response !== 0) return { success: false, canceled: true };
    }
    fs.rmSync(destDir, { recursive: true, force: true });
  }

  em('extract', 65, '解压技能文件…');
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
  em('manifest', 88, '更新技能清单…');
  try {
    const { execFileSync } = require('child_process');
    const scriptPath = app.isPackaged
      ? path.join(process.resourcesPath, 'scripts', 'build-skills-manifest.js')
      : path.join(app.getAppPath(), 'scripts', 'build-skills-manifest.js');
    if (fs.existsSync(scriptPath)) {
      execFileSync(process.execPath, [scriptPath], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      });
      const builtManifest = app.isPackaged
        ? path.join(process.resourcesPath, 'skills', 'manifest.json')
        : path.join(app.getAppPath(), 'skills', 'manifest.json');
      if (fs.existsSync(builtManifest) && builtManifest !== path.join(SKILLS_DIR, 'manifest.json')) {
        fs.copyFileSync(builtManifest, path.join(SKILLS_DIR, 'manifest.json'));
      }
    }
  } catch (e) {
    console.warn('[installSkillFromZipBuffer] manifest rebuild failed:', e.message);
  }

  em('done', 100, '导入完成');
  return { success: true, skillId };
}

// 下载文件到内存 buffer，跟随 302 重定向（node http/https 不自动跟）。
function downloadBuffer(urlStr, { maxRedirects = 5, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(new Error('无效的下载地址')); }
    const lib = u.protocol === 'http:' ? require('http') : require('https');
    const req = lib.get(u, (res) => {
      const { statusCode, headers } = res;
      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume(); // 排空重定向响应体
        if (maxRedirects <= 0) return reject(new Error('重定向次数过多'));
        const next = new URL(headers.location, u).toString();
        return resolve(downloadBuffer(next, { maxRedirects: maxRedirects - 1, onProgress }));
      }
      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        return reject(new Error(`下载失败:HTTP ${statusCode}`));
      }
      const total = parseInt(headers['content-length'] || '0', 10);
      let received = 0;
      const chunks = [];
      res.on('data', (c) => {
        chunks.push(c);
        received += c.length;
        if (total && typeof onProgress === 'function') onProgress(received, total);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(120_000, () => { req.destroy(); reject(new Error('下载超时')); });
  });
}

// 从 URL 拉取 JSON（GET），跟随重定向。
function fetchJson(urlStr, { maxRedirects = 5 } = {}) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(new Error('无效的地址')); }
    const lib = u.protocol === 'http:' ? require('http') : require('https');
    const req = lib.get(u, { headers: { 'Accept': 'application/json' } }, (res) => {
      const { statusCode, headers } = res;
      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume();
        if (maxRedirects <= 0) return reject(new Error('重定向次数过多'));
        const next = new URL(headers.location, u).toString();
        return resolve(fetchJson(next, { maxRedirects: maxRedirects - 1 }));
      }
      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        return reject(new Error(`请求失败:HTTP ${statusCode}`));
      }
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('返回数据解析失败')); }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30_000, () => { req.destroy(); reject(new Error('请求超时')); });
  });
}

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
    return await installSkillFromZipBuffer(fs.readFileSync(zipPath), {
      fallbackId: path.basename(zipPath, '.zip'),
      emit,
      promptOverwrite: true,
    });
  } catch (err) {
    emit('error', 100, err.message);
    return { success: false, error: err.message };
  }
});

// 技能中心：搜索
ipcMain.handle('skills:hub-search', async (_event, { query, tag, limit, cursor } = {}) => {
  try {
    const url = new URL('https://skillhub.360.com/api/v1/skills');
    if (query) url.searchParams.set('q', String(query));
    if (tag && tag !== 'all') url.searchParams.set('tag', String(tag));
    url.searchParams.set('limit', String(limit || 24));
    if (cursor) url.searchParams.set('cursor', String(cursor));
    const data = await fetchJson(url.toString());
    const items = Array.isArray(data.items) ? data.items.map((it) => ({
      slug: it.slug,
      name: it.skillName || it.slug,
      displayName: it.displayName || it.skillName || it.slug,
      summary: it.summary_short || it.summary || '',
      summaryFull: it.summary || '',
      category: (it.tags && it.tags.category) || 'general',
      sceneTags: (it.tags && it.tags.scene_tags) || [],
      downloads: it.merged_downloads || 0,
      stars: it.merged_stars || 0,
      owner: it.ownerDisplayName || it.ownerHandle || '',
      securityStatus: it.securityStatus || '',
      license: it.license || (it.latestVersion && it.latestVersion.license) || '',
      version: (it.latestVersion && it.latestVersion.version) || '',
      downloadUrl: (it.latestVersion && it.latestVersion.downloadUrl) || '',
    })) : [];
    return { success: true, items, nextCursor: data.nextCursor || null };
  } catch (err) {
    return { success: false, error: err.message, items: [] };
  }
});

// 技能中心：下载并安装
ipcMain.handle('skills:hub-install', async (_event, { slug, version, downloadUrl } = {}) => {
  const emit = (phase, percent, message) => {
    try { mainWindow?.webContents.send('skills:import-progress', { phase, percent, message }); } catch (e) {}
  };
  try {
    if (!downloadUrl) return { success: false, error: '缺少下载地址' };
    emit('download', 15, '从技能中心下载…');
    const buffer = await downloadBuffer(downloadUrl, {
      onProgress: (recv, total) => {
        const pct = 15 + Math.round((recv / total) * 30); // 15~45%
        emit('download', Math.min(pct, 45), '下载中…');
      },
    });
    emit('read', 50, '读取技能包…');
    return await installSkillFromZipBuffer(buffer, {
      fallbackId: slug || 'hub-skill',
      emit,
      promptOverwrite: false,
    });
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

// 在线取证:企业授权码换 .lic,校验通过才落盘
ipcMain.handle('license:activate-online', async (_event, options) => {
  try {
    const { licenseBytes, info } = await licenseRemote.activateOnline({
      serverUrl: options && options.serverUrl,
      secretKey: options && options.secretKey,
      clientVersion: app.getVersion(),
    });
    const result = licenseVerifier.loadAndVerify(licenseBytes);
    if (!result.ok) {
      return { success: false, rejected: true, status: result.status, reason: result.reason, detail: result };
    }
    licenseStore.saveLicense(licenseBytes);
    return { success: true, status: result.status, sn: result.sn, info };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 默认授权服务地址(授权页用于回填输入框)
ipcMain.handle('license:server-url', () => {
  try {
    return { success: true, url: licenseRemote.defaultServerUrl() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ---------------------------------------------------------------------------
// IPC handlers — Hermes project management
// ---------------------------------------------------------------------------

ipcMain.handle('hermes:list-projects', async (_event, options) => {
  try {
    if (!fs.existsSync(PROJECTS_DIR)) return [];
    const kindFilter = (options && options.kind) || 'all';
    const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
    const projects = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const meta = readProjectMeta(entry.name);
      if (meta) {
        const projectType = inferProjectType(entry.name, meta);
        const conversationKind = conversationKindOf(projectType);
        if (kindFilter !== 'all' && conversationKind !== kindFilter) continue;
        const outputs = computeProjectOutputs(entry.name);
        const phase = meta.phase || (outputs.hasPrototype ? 'iterating' : outputs.hasSpec ? 'prototype' : 'brainstorming');
        const stage = Math.max(outputs.derivedStage || 0, Number(meta.stage) || 0) || FDE_DEFAULT_STAGE;
        projects.push({ slug: entry.name, ...meta, projectType, conversationKind, stage, outputs, hasSpec: outputs.hasSpec, hasPrototype: outputs.hasPrototype, deliverables: outputs.deliverables, derivedStage: outputs.derivedStage, phase });
      }
    }
    projects.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
    return projects;
  } catch (err) {
    throw new Error(`Failed to list projects: ${err.message}`);
  }
});

// ===========================================================================
// 「代码」模式(Codex 式) —— IPC handlers
// 工作区 = 磁盘上任意文件夹；session 的 cwd 指向该文件夹，agent 在原地读写。
// 用 mode:'default' 让引擎在每次写文件前发 request_permission(带 diff)。
// ===========================================================================

// 列出已登记工作区，顺带剔除磁盘上已不存在的路径(移动/删除后自愈)。
ipcMain.handle('code:list-workspaces', async () => {
  const list = readCodeWorkspaces();
  const alive = list.filter((w) => w && w.path && fs.existsSync(w.path));
  if (alive.length !== list.length) writeCodeWorkspaces(alive);
  return alive.slice().sort((a, b) => (b.lastOpenedAt || b.createdAt || '').localeCompare(a.lastOpenedAt || a.createdAt || ''));
});

// 打开(导入)一个已有文件夹 → 登记为工作区。按绝对路径去重。
ipcMain.handle('code:open-folder', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: '选择要用代码模式打开的文件夹',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths || !res.filePaths.length) return { canceled: true };
  const folder = res.filePaths[0];
  const list = readCodeWorkspaces();
  const existing = list.find((w) => path.resolve(w.path) === path.resolve(folder));
  const now = new Date().toISOString();
  if (existing) {
    existing.lastOpenedAt = now;
    writeCodeWorkspaces(list);
    return { workspace: existing };
  }
  const workspace = {
    id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: path.basename(folder) || folder,
    path: folder,
    sessionId: null,
    createdAt: now,
    lastOpenedAt: now,
  };
  list.push(workspace);
  writeCodeWorkspaces(list);
  return { workspace };
});

// 新建工作区：选父目录 + 名字 → 建空文件夹 → 登记。
ipcMain.handle('code:create-workspace', async (_event, { name } = {}) => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: '选择新项目所在的父目录',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths || !res.filePaths.length) return { canceled: true };
  const parent = res.filePaths[0];
  const folderName = (name && String(name).trim()) || `project-${Date.now()}`;
  const folder = path.join(parent, folderName);
  try {
    if (fs.existsSync(folder)) {
      // 已存在同名目录：直接当作导入(不覆盖)。
    } else {
      fs.mkdirSync(folder, { recursive: true });
    }
  } catch (e) {
    return { error: `新建目录失败：${e.message}` };
  }
  const list = readCodeWorkspaces();
  const existing = list.find((w) => path.resolve(w.path) === path.resolve(folder));
  const now = new Date().toISOString();
  if (existing) { existing.lastOpenedAt = now; writeCodeWorkspaces(list); return { workspace: existing }; }
  const workspace = {
    id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: folderName,
    path: folder,
    sessionId: null,
    createdAt: now,
    lastOpenedAt: now,
  };
  list.push(workspace);
  writeCodeWorkspaces(list);
  return { workspace };
});

// 从登记表移除工作区(不删磁盘文件)。
ipcMain.handle('code:remove-workspace', async (_event, { id } = {}) => {
  const list = readCodeWorkspaces();
  const next = list.filter((w) => w.id !== id);
  writeCodeWorkspaces(next);
  return { success: true };
});

ipcMain.handle('code:get-workspace', async (_event, { id } = {}) => {
  const list = readCodeWorkspaces();
  const w = list.find((x) => x.id === id);
  if (!w) return { error: 'workspace not found' };
  // 打开工作区即触发老数据迁移(顶层 sessionId → conversations[0])，并落盘一次。
  const before = JSON.stringify(w.conversations || null);
  ensureConversations(w);
  if (JSON.stringify(w.conversations) !== before) writeCodeWorkspaces(list);
  return { workspace: w };
});

// 递归列出工作区文件树(嵌套结构)。跳过大目录，限制总条数。
ipcMain.handle('code:list-tree', async (_event, { id } = {}) => {
  const workspace = findCodeWorkspace(id);
  if (!workspace) return { success: false, error: 'workspace not found' };
  if (!fs.existsSync(workspace.path)) return { success: false, error: '目录不存在' };
  let count = 0;
  const walk = (absDir, relPrefix) => {
    let items;
    try { items = fs.readdirSync(absDir, { withFileTypes: true }); }
    catch { return []; }
    const dirs = [];
    const files = [];
    for (const item of items) {
      if (count >= CODE_TREE_MAX_ENTRIES) break;
      const rel = relPrefix ? `${relPrefix}/${item.name}` : item.name;
      if (item.isDirectory()) {
        if (CODE_TREE_IGNORE_DIRS.has(item.name)) continue;
        count++;
        dirs.push({ name: item.name, isDirectory: true, relPath: rel, children: walk(path.join(absDir, item.name), rel) });
      } else {
        count++;
        files.push({ name: item.name, isDirectory: false, relPath: rel });
      }
    }
    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    return [...dirs, ...files];
  };
  return { success: true, tree: walk(workspace.path, ''), truncated: count >= CODE_TREE_MAX_ENTRIES };
});

// 读工作区内某个文件(文本)。
ipcMain.handle('code:read-file', async (_event, { id, relPath } = {}) => {
  const workspace = findCodeWorkspace(id);
  if (!workspace) return { success: false, error: 'workspace not found' };
  try {
    const abs = resolveWorkspacePath(workspace, relPath);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) return { success: false, error: '这是一个目录' };
    // 二进制/超大文件不当文本读，前端据 error 提示。
    if (stat.size > 2 * 1024 * 1024) return { success: false, error: '文件过大，暂不预览', tooLarge: true };
    const content = fs.readFileSync(abs, 'utf-8');
    return { success: true, content, path: abs };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 供 diff 弹窗读取旧内容用(与 code:read-file 同，但语义更明确)。
ipcMain.handle('code:write-file', async (_event, { id, relPath, content } = {}) => {
  const workspace = findCodeWorkspace(id);
  if (!workspace) return { success: false, error: 'workspace not found' };
  try {
    const abs = resolveWorkspacePath(workspace, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content ?? '', 'utf-8');
    return { success: true, path: abs };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('code:create-entry', async (_event, { id, parentPath, name, isDirectory } = {}) => {
  const workspace = findCodeWorkspace(id);
  if (!workspace) return { success: false, error: '工作区不存在' };
  try {
    const safeName = validateEntryName(name);
    const parent = resolveWorkspacePath(workspace, parentPath || '.');
    if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) throw new Error('父目录不存在');
    const target = resolveWorkspacePath(workspace, path.join(parentPath || '.', safeName));
    if (fs.existsSync(target)) throw new Error('同名文件或文件夹已存在');
    if (isDirectory) fs.mkdirSync(target);
    else fs.writeFileSync(target, '', { encoding: 'utf-8', flag: 'wx' });
    return { success: true, relPath: path.relative(workspace.path, target).split(path.sep).join('/') };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('code:rename-entry', async (_event, { id, relPath, name } = {}) => {
  const workspace = findCodeWorkspace(id);
  if (!workspace) return { success: false, error: '工作区不存在' };
  try {
    const safeName = validateEntryName(name);
    const source = resolveWorkspacePath(workspace, relPath);
    if (!fs.existsSync(source)) throw new Error('文件或文件夹不存在');
    const target = path.join(path.dirname(source), safeName);
    const targetRel = path.relative(workspace.path, target);
    const checkedTarget = resolveWorkspacePath(workspace, targetRel);
    if (fs.existsSync(checkedTarget)) throw new Error('同名文件或文件夹已存在');
    fs.renameSync(source, checkedTarget);
    return { success: true, relPath: targetRel.split(path.sep).join('/') };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('code:delete-entry', async (_event, { id, relPath } = {}) => {
  const workspace = findCodeWorkspace(id);
  if (!workspace) return { success: false, error: '工作区不存在' };
  try {
    const target = resolveWorkspacePath(workspace, relPath);
    if (target === path.resolve(workspace.path)) throw new Error('不能删除工作区根目录');
    if (!fs.existsSync(target)) throw new Error('文件或文件夹不存在');
    fs.rmSync(target, { recursive: true, force: false });
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('code:copy-entry', async (_event, { id, sourcePath, targetDir } = {}) => {
  const workspace = findCodeWorkspace(id);
  if (!workspace) return { success: false, error: '工作区不存在' };
  try {
    const source = resolveWorkspacePath(workspace, sourcePath);
    const destDir = resolveWorkspacePath(workspace, targetDir || '.');
    if (!fs.existsSync(source) || !fs.existsSync(destDir) || !fs.statSync(destDir).isDirectory()) throw new Error('源文件或目标文件夹不存在');
    const dest = uniqueCopyPath(destDir, path.basename(source));
    fs.cpSync(source, dest, { recursive: true, errorOnExist: true });
    return { success: true, relPath: path.relative(workspace.path, dest).split(path.sep).join('/') };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('code:reveal-entry', async (_event, { id, relPath } = {}) => {
  const workspace = findCodeWorkspace(id);
  if (!workspace) return { success: false, error: '工作区不存在' };
  try {
    const target = resolveWorkspacePath(workspace, relPath || '.');
    if (!fs.existsSync(target)) throw new Error('文件或文件夹不存在');
    shell.showItemInFolder(target);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});


// 每会话独立 session 是并行多会话的基础——不同 session 在引擎侧并发跑、上下文互不干扰。
async function ensureConversationSession(workspace, conversation) {
  const key = `${workspace.id}:${conversation.id}`;
  if (ensuringCodeSessions.has(key)) return ensuringCodeSessions.get(key);
  const pending = loadOrCreateCodeSession(workspace, conversation);
  ensuringCodeSessions.set(key, pending);
  try { return await pending; }
  finally { ensuringCodeSessions.delete(key); }
}

async function loadOrCreateCodeSession(workspace, conversation) {
  if (conversation.sessionId && loadedCodeSessions.has(conversation.sessionId)) return conversation.sessionId;
  if (conversation.sessionId && acp) {
    const oldSessionId = conversation.sessionId;
    replayingSessions.add(oldSessionId);
    try {
      const loaded = await acp.request('session/load', { sessionId: oldSessionId, cwd: workspace.path, mcpServers: [] });
      if (loaded) {
        loadedCodeSessions.add(oldSessionId);
        await acp.request('session/set_mode', { sessionId: oldSessionId, modeId: 'default' }).catch(() => {});
        return oldSessionId;
      }
    } catch (err) {
      console.log(`[main] Code session ${oldSessionId} unavailable, rebuilding context`);
    } finally {
      replayingSessions.delete(oldSessionId);
    }
  }
  const previousMessages = Array.isArray(conversation.messages) ? conversation.messages.slice(-30) : [];
  const newSession = await acp.request('session/new', { cwd: workspace.path, mcpServers: [] });
  captureModelsFromSession(newSession);
  conversation.sessionId = newSession && newSession.sessionId ? newSession.sessionId : null;
  if (conversation.sessionId) {
    loadedCodeSessions.add(conversation.sessionId);
    await acp.request('session/set_mode', { sessionId: conversation.sessionId, modeId: 'default' }).catch(() => {});
    // 历史上下文不再单独跑一轮 prompt（那会让用户的首条消息排在它后面等，
    // 看起来像「不回复」）。挂到 pendingContext 上，随下一条用户消息一起发。
    if (previousMessages.length) {
      const context = previousMessages
        .map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${String(m.content || '').slice(0, 1200)}`)
        .join('\n\n');
      conversation.pendingContext = `（以下是本会话此前的历史，仅作为上下文参考，不要复述）\n${context}`;
    }
  }
  conversation.lastActiveAt = new Date().toISOString();
  return conversation.sessionId;
}

// 代码工作区对话：cwd = 工作区目录，mode:'default'(每次写文件都要用户确认)。
// conversationId 指定发往哪条会话；缺省时 findCodeConversation 取最近一条。
// 取消某条会话正在跑的这一轮。之前前端「停止」只在本地收尾，引擎照跑、
// 继续往这条会话推 chunk，会追加到已收尾的消息上。
ipcMain.handle('code:terminal-create', async (event, { id, shellId } = {}) => {
  const workspace = findCodeWorkspace(id);
  if (!workspace || !fs.existsSync(workspace.path)) return { success: false, error: '工作区不存在' };
  const ptyLib = getPty();
  if (!ptyLib) return { success: false, error: `终端功能不可用（node-pty 原生模块加载失败：${ptyLoadError?.message || '未知原因'}，通常是 Electron ABI 与原生模块不匹配，需要重新安装依赖）` };
  const shellSpec = codeShellOptions().find((s) => s.id === shellId) || codeShellOptions()[0];
  const terminalId = `term_${Date.now()}_${nextCodeTerminalId++}`;
  try {
    // npm 的受限脚本模式可能漏掉 node-pty helper 的可执行位；启动前自愈。
    if (process.platform !== 'win32') {
      const helper = path.join(path.dirname(require.resolve('node-pty')), '..', 'prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper');
      if (fs.existsSync(helper)) {
        try { fs.chmodSync(helper, 0o755); } catch (_) { /* 只影响 PTY 启动，下面会返回具体错误 */ }
      }
    }
    const proc = ptyLib.spawn(shellSpec.command, shellSpec.args, {
      name: 'xterm-256color', cols: 100, rows: 30, cwd: workspace.path,
      env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
      ...(process.platform === 'win32' ? { useConpty: true } : {}),
    });
    const terminal = { id: terminalId, workspaceId: id, pty: proc };
    codeTerminals.set(terminalId, terminal);
    // 这两个回调跑在 node-pty 的 ThreadSafeFunction 里，不在任何 JS 调用栈上：
    // 抛出的异常会被 N-API 转成没人接管的 C++ 异常 → std::terminate → 主进程 SIGABRT。
    // 且窗口关闭途中 isDestroyed() 还是 false，send 却已经会抛 "Render frame was disposed"。
    const sender = event.sender;
    proc.onData((data) => {
      try {
        if (!sender.isDestroyed()) sender.send('code:terminal-data', { terminalId, data });
      } catch (_) { /* 窗口销毁中，丢掉这一帧 */ }
    });
    proc.onExit((info) => {
      try {
        codeTerminals.delete(terminalId);
        if (!sender.isDestroyed()) sender.send('code:terminal-exit', { terminalId, ...info });
      } catch (_) { /* 同上 */ }
    });
    return { success: true, terminalId, shell: shellSpec, platform: process.platform };
  } catch (err) {
    return { success: false, error: `终端启动失败：${err.message}` };
  }
});

ipcMain.handle('code:terminal-input', (_event, { terminalId, data } = {}) => {
  const terminal = findCodeTerminal(terminalId);
  if (!terminal) return { success: false, error: '终端不存在' };
  terminal.pty.write(String(data || ''));
  return { success: true };
});

ipcMain.handle('code:terminal-resize', (_event, { terminalId, cols, rows } = {}) => {
  const terminal = findCodeTerminal(terminalId);
  if (!terminal) return { success: false, error: '终端不存在' };
  const width = Math.max(20, Math.min(500, Number(cols) || 100));
  const height = Math.max(5, Math.min(200, Number(rows) || 30));
  terminal.pty.resize(width, height);
  return { success: true };
});

ipcMain.handle('code:terminal-cd', (_event, { terminalId, relPath = '.' } = {}) => {
  const terminal = findCodeTerminal(terminalId);
  if (!terminal) return { success: false, error: '终端不存在' };
  const workspace = findCodeWorkspace(terminal.workspaceId);
  if (!workspace) return { success: false, error: '工作区不存在' };
  try {
    const target = resolveWorkspacePath(workspace, relPath || '.');
    if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) throw new Error('目录不存在');
    const rel = path.relative(workspace.path, target);
    const command = process.platform === 'win32'
      ? `cd /d "${target.replace(/"/g, '\\"')}"\r`
      : `cd -- ${JSON.stringify(target)}\r`;
    terminal.pty.write(command);
    return { success: true, relPath: rel.split(path.sep).join('/') || '.' };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('code:terminal-kill', (_event, { terminalId } = {}) => {
  const terminal = findCodeTerminal(terminalId);
  if (!terminal) return { success: true };
  try { terminal.pty.kill(); } catch (_) { /* 已结束 */ }
  codeTerminals.delete(terminalId);
  return { success: true };
});

ipcMain.handle('code:cancel', async (_event, { id, conversationId } = {}) => {
  try {
    const { conversation } = findCodeConversation(id, conversationId);
    if (!conversation || !conversation.sessionId || !acp) return { success: false };
    acp.notify('session/cancel', { sessionId: conversation.sessionId });
    return { success: true };
  } catch (err) {
    console.error('[main] code:cancel error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('code:prompt', async (_event, { id, conversationId, text, attachments } = {}) => {
  codeDebugLog(`code:prompt CALLED id=${id} conversationId=${conversationId} textLen=${(text||'').length}`);
  try {
    if (!acp || !hermesReady) {
      codeDebugLog(`acp not ready (acp=${!!acp} hermesReady=${hermesReady}), calling ensureHermesReady`);
      if (!(await ensureHermesReady())) throw new Error('Hermes ACP not connected');
    }
    const { list, workspace, conversation } = findCodeConversation(id, conversationId);
    if (!workspace) throw new Error('workspace not found');
    if (!conversation) throw new Error('conversation not found');
    if (!fs.existsSync(workspace.path)) throw new Error('工作区目录不存在');
    codeDebugLog(`resolved workspace=${workspace.path} conversation=${conversation.id} sessionIdBefore=${conversation.sessionId}`);

    // 首次 prompt 前确保磁盘 session 已在当前 Hermes 进程 load；旧会话失效时
    // 会新建 session 并注入最近消息，保证历史上下文不中断。
    await ensureConversationSession(workspace, conversation);
    writeCodeWorkspaces(list);
    if (!conversation.sessionId) throw new Error('无法创建代码会话');
    codeDebugLog(`sessionIdAfter=${conversation.sessionId}`);

    // 二进制附件落到工作区的 .uploads/ 目录(与代码分开，方便忽略)。
    const uploadsDir = path.join(workspace.path, '.uploads');
    const promptBlocks = buildPromptBlocks(text, attachments, uploadsDir);

    // 会话是重建出来的 → 把历史上下文并进这一轮，一次请求搞定，不额外占一轮。
    if (conversation.pendingContext) {
      promptBlocks.unshift({ type: 'text', text: conversation.pendingContext });
      delete conversation.pendingContext;
      writeCodeWorkspaces(list);
    }

    codeDebugLog(`calling acp.request session/prompt sessionId=${conversation.sessionId}`);
    const result = await acp.request('session/prompt', {
      sessionId: conversation.sessionId,
      prompt: promptBlocks,
    }, 3_600_000); // 60 min timeout
    codeDebugLog(`code:prompt OK sessionId=${conversation.sessionId} stopReason=${result && result.stopReason} result=${JSON.stringify(result).slice(0,300)}`);
    return result;
  } catch (err) {
    codeDebugLog(`code:prompt FAILED: ${err && err.stack || err}`);
    throw new Error(`Prompt failed: ${err.message}`);
  }
});

// ---- 代码工作区「多会话」IPC -------------------------------------------------
// 每个工作区可开多条独立对话(conversations)，各自一条 ACP session、并行跑。
// 数据落 code-workspaces.json 的 workspace.conversations[]，持久化跨重启。

// 列出会话(含各自 messages)。顺带触发老数据迁移并落盘。
ipcMain.handle('code:list-conversations', async (_event, { id } = {}) => {
  const list = readCodeWorkspaces();
  const workspace = list.find((w) => w.id === id);
  if (!workspace) return { error: 'workspace not found' };
  const before = JSON.stringify(workspace.conversations || null);
  ensureConversations(workspace);
  if (JSON.stringify(workspace.conversations) !== before) writeCodeWorkspaces(list);
  return { conversations: workspace.conversations };
});

// 新建会话：立即建 ACP session(决策 A)，让前端拿到 sessionId 才能路由流式事件。
ipcMain.handle('code:new-conversation', async (_event, { id, title } = {}) => {
  try {
    if (!acp || !hermesReady) {
      if (!(await ensureHermesReady())) throw new Error('Hermes ACP not connected');
    }
    const list = readCodeWorkspaces();
    const workspace = list.find((w) => w.id === id);
    if (!workspace) throw new Error('workspace not found');
    if (!fs.existsSync(workspace.path)) throw new Error('工作区目录不存在');
    ensureConversations(workspace);
    const now = new Date().toISOString();
    // 取已有标题里的最大编号 +1，而不是数当前条数：
    // 关掉一条后数组变短，length+1 会算出跟现存对话相同的号，出现两个「对话 2」。
    const maxNo = workspace.conversations.reduce((max, c) => {
      const m = /^对话\s*(\d+)$/.exec(String(c.title || '').trim());
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);
    const conversation = {
      id: genConversationId(),
      title: (title && String(title).trim()) || `对话 ${maxNo + 1}`,
      sessionId: null,
      messages: [],
      createdAt: now,
      lastActiveAt: now,
    };
    workspace.conversations.push(conversation);
    writeCodeWorkspaces(list);
    return { conversation };
  } catch (err) {
    console.error(`[main] code:new-conversation FAILED: ${err && err.message}`);
    throw new Error(`New conversation failed: ${err.message}`);
  }
});

// 懒建 session：用于恢复历史(迁移/旧)会话时补齐 sessionId。
ipcMain.handle('code:ensure-session', async (_event, { id, conversationId } = {}) => {
  try {
    if (!acp || !hermesReady) {
      if (!(await ensureHermesReady())) throw new Error('Hermes ACP not connected');
    }
    const { list, workspace, conversation } = findCodeConversation(id, conversationId);
    if (!workspace || !conversation) throw new Error('conversation not found');
    await ensureConversationSession(workspace, conversation);
    writeCodeWorkspaces(list);
    return { sessionId: conversation.sessionId };
  } catch (err) {
    console.error(`[main] code:ensure-session FAILED: ${err && err.message}`);
    throw new Error(`Ensure session failed: ${err.message}`);
  }
});

// 删除会话；删到 0 条时补一条空默认对话(护栏)。不去释放旧 ACP session(悬空无害)。
ipcMain.handle('code:delete-conversation', async (_event, { id, conversationId } = {}) => {
  const list = readCodeWorkspaces();
  const workspace = list.find((w) => w.id === id);
  if (!workspace) return { error: 'workspace not found' };
  ensureConversations(workspace);
  workspace.conversations = workspace.conversations.filter((c) => c.id !== conversationId);
  if (workspace.conversations.length === 0) {
    const now = new Date().toISOString();
    workspace.conversations.push({ id: genConversationId(), title: '对话 1', sessionId: null, messages: [], createdAt: now, lastActiveAt: now });
  }
  writeCodeWorkspaces(list);
  return { conversations: workspace.conversations };
});

// 重命名会话。
ipcMain.handle('code:rename-conversation', async (_event, { id, conversationId, title } = {}) => {
  const { list, workspace, conversation } = findCodeConversation(id, conversationId);
  if (!workspace || !conversation) return { error: 'conversation not found' };
  conversation.title = (title && String(title).trim()) || conversation.title;
  conversation.lastActiveAt = new Date().toISOString();
  writeCodeWorkspaces(list);
  return { success: true };
});

// 保存会话消息(决策 B：前端权威)。前端在一轮结束后回传完整 messages 落盘。
ipcMain.handle('code:save-conversation', async (_event, { id, conversationId, messages } = {}) => {
  const { list, workspace, conversation } = findCodeConversation(id, conversationId);
  if (!workspace || !conversation) return { error: 'conversation not found' };
  conversation.messages = Array.isArray(messages) ? messages : [];
  conversation.lastActiveAt = new Date().toISOString();
  // 默认标题("对话 N")在首条用户消息后自动改为其文本截断。
  if (/^对话 \d+$/.test(conversation.title || '')) {
    const firstUser = conversation.messages.find((m) => m && m.role === 'user' && m.content);
    if (firstUser) {
      const t = String(firstUser.content).trim();
      conversation.title = t.length > 16 ? t.slice(0, 16) + '…' : t;
    }
  }
  writeCodeWorkspaces(list);
  return { success: true };
});

ipcMain.handle('hermes:create-project', async (_event, params) => {
  const { name, requirement, slug: customSlug, projectType: requestedType, expert, aiApp } = params || {};
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

    // 如果是 AI 应用专家项目，先准备记忆 + 知识 + CLAUDE.md，
    // 让 session/new 启动时 cwd 里就有完整的专家上下文。
    if (aiApp && aiApp.id) {
      prepareAiAppProjectContext(slug, aiApp);
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

    const projectType = requestedType || inferProjectType(slug, {});
    const meta = {
      name,
      slug,
      sessionId,
      requirement: requirement || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phase: 'brainstorming',
      projectType,
      // FDE 五阶段:新项目默认落阶段②(现有能力所在,过渡友好)
      stage: FDE_DEFAULT_STAGE,
      stageStatus: { 1: 'done', 2: 'active', 3: 'todo', 4: 'todo', 5: 'todo' },
      outputs: { hasSpec: false, hasPrototype: false, prototypeFileCount: 0 },
      messageCount: 0,
      ...(expert ? { expert } : {}),
      ...(aiApp ? { aiApp } : {}),
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

    // AI 应用专家项目：每次打开都用最新的记忆 + 知识刷新 CLAUDE.md，
    // 这样在应用管理页更新的记忆/知识能立刻在已有项目里生效。
    if (meta.aiApp && meta.aiApp.id) {
      prepareAiAppProjectContext(slug, meta.aiApp);
    }

    const persistedMessages = readMessages(slug);
    let sessionRecovered = false;

    if (acp && meta.sessionId) {
      const sid = meta.sessionId;
      // 这一轮还在生成：引擎里的会话本来就活着，不要 session/load（会重放历史、打乱进行中的回复）
      if (promptingSessions.has(sid)) {
        return { slug, ...meta, messages: persistedMessages, prompting: true };
      }
      replayingSessions.add(sid);
      try {
        const result = await acp.request('session/load', { sessionId: sid, cwd: resolveProjectPath(slug), mcpServers: [] });
        if (result) {
          await acp.request('session/set_mode', { sessionId: sid, modeId: 'dont_ask' }).catch(() => {});
          return { slug, ...meta, messages: persistedMessages, loadResult: result };
        }
      } catch (loadErr) {
        console.log(`[main] Session ${sid} not found, creating new session for ${slug}`);
      } finally {
        replayingSessions.delete(sid);
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

ipcMain.handle('hermes:delete-messages', async (_event, { slug, tab }) => {
  try {
    const removed = deleteMessagesByTab(slug, tab);
    return { success: true, removed };
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
// 读 config.yaml 的 custom_providers[].models 声明清单（下拉白名单）。
// 引擎侧 session/new 会把 360 全量 300+ 模型塞进 available_models（explicit_only 没挡住
// custom provider 的探测），所以桌面这层按 config 声明过滤，下拉只显示用户认可的那几个。
function readDeclaredModelIds() {
  try {
    const raw = fs.readFileSync(CONFIG_YAML_PATH, 'utf8');
    const ids = [];
    let inModels = false;
    for (const line of raw.split('\n')) {
      if (/^\s*models:\s*$/.test(line)) { inModels = true; continue; }
      if (inModels) {
        const m = line.match(/^\s+-\s+(\S+)\s*$/);
        if (m) { ids.push(m[1]); continue; }
        // 缩进回落到非列表项 → models 块结束
        if (line.trim() && !/^\s*#/.test(line)) break;
      }
    }
    return ids;
  } catch { return []; }
}

// 把模型 id 归一到「裸名」用于比较：剥掉 provider 前缀（custom:/openai-api: 等）。
function bareModelId(id) {
  const s = String(id || '').trim();
  const withoutProto = s.includes(':') ? s.slice(s.indexOf(':') + 1) : s;
  return withoutProto.toLowerCase();
}

ipcMain.handle('hermes:list-models', async () => {
  const declared = readDeclaredModelIds();
  if (!declared.length) return { models: cachedModels, current: currentModelId };
  const allow = new Set(declared.map(bareModelId));
  const filtered = (cachedModels || []).filter((m) => {
    const id = m && (m.model_id || m.modelId || m.id || m.name);
    return id && allow.has(bareModelId(id));
  });
  if (filtered.length) return { models: filtered, current: currentModelId };
  // 过滤后为空 = 引擎缓存与 config 声明完全不交集。最常见的成因是刚切了网关:
  // 引擎重启后 cachedModels 可能还是上一个网关的列表(warmup session 尚未回填)。
  // 此时若兜底返回 cachedModels,顶栏会显示旧网关的模型名,用户点了必然 400
  // (OpenAI 不认 anthropic/claude-sonnet-5)。所以直接用 config 声明的清单 ——
  // 它就是用户在设置页勾选的那几个,是当前网关的事实来源。
  return {
    models: declared.map((id) => ({ model_id: id, name: id })),
    current: currentModelId,
  };
});

// 读 config.yaml 里 custom_providers[].models 的原始声明 id 列表 + 当前 base_url。
// 供设置页在「非360网关」下回填多选已勾模型(事实来源是 config.yaml 的 models:,不是 .env)。
ipcMain.handle('hermes:read-config-models', async () => {
  try {
    const ids = readDeclaredModelIds();
    let baseUrl = '';
    if (fs.existsSync(CONFIG_YAML_PATH)) {
      const raw = fs.readFileSync(CONFIG_YAML_PATH, 'utf-8');
      // 取第一个 base_url:(model 块或 custom_providers 里都行,值一致)。
      const m = raw.match(/^[ \t]+base_url:[ \t]*(\S+)[ \t]*$/m);
      if (m) baseUrl = m[1];
    }
    return { success: true, models: ids, baseUrl };
  } catch (e) {
    return { success: false, error: e.message, models: [], baseUrl: '' };
  }
});

// 让 config.yaml 的改动生效:重启引擎 + 清掉各项目已失效的 sessionId。
// 切模型(hermes:set-model)与切网关(gateway:activate-profile)共用这一套,
// 避免两处各写一遍重启逻辑漂移。
async function applyProfileToEngine() {
  // 带就绪确认 + 一次重试：初始化失败不静默变砖，让前端能提示重试。
  const ok = await restartHermes(1);
  if (!ok || !hermesReady || !acp) {
    return { ok: false, error: '引擎重启后初始化失败，请重试' };
  }
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
    console.warn('[main] clear sessionIds after engine restart failed:', e.message);
  }
  return { ok: true };
}

ipcMain.handle('hermes:set-model', async (_event, { slug, modelId }) => {
  // 关键：360 custom provider 下，运行时 session/set_model 会被 hermes 误判成 openrouter
  // provider（detect_provider_for_model 看到 vendor/model 格式即判 openrouter）→ 401。
  // 唯一可靠方式：写 config.yaml 的 model.default(裸名) + 重启引擎，让 provider: custom 生效。
  try {
    const persisted = writeConfigModel(modelId);   // 内部会剥掉 openai-api: 等前缀，存裸名
    if (!persisted) return { success: false, error: '写入 config.yaml 失败' };
    const applied = await applyProfileToEngine();
    if (!applied.ok) return { success: false, error: applied.error };
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
ipcMain.handle('hermes:permission-respond', async (_event, { requestId, approved, optionId } = {}) => {
  // 渲染层的 diff 确认弹窗回传裁决 → resolve 对应的挂起权限请求。
  const pending = pendingPermissions.get(requestId);
  if (pending) {
    pending.resolve({ approved: !!approved, optionId });
    return { success: true };
  }
  return { success: false, error: 'no such pending permission' };
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

// 把「文本 + 附件(图片/文件)」转成 ACP prompt content blocks。
// hermes:prompt(FDE 项目) 与 code:prompt(代码工作区) 共用同一套转换逻辑：
//   - 图片 → 内联 base64 image block(视觉路径)
//   - 纯文本文件 → 内联 resource(text)，服务端拼进 prompt
//   - 二进制文档 → 落盘到 uploadsDir 再发 resource_link，服务端读盘提取文本
// uploadsDir 是二进制附件的落点(绝对路径)；调用方负责给出一个可写目录。
function buildPromptBlocks(text, attachments, uploadsDir) {
  const promptBlocks = [{ type: 'text', text }];
  if (attachments && Array.isArray(attachments)) {
    for (const att of attachments) {
      if (att.type === 'image' && att.data) {
        const mime = att.media_type || 'image/png';
        promptBlocks.push({ type: 'image', data: att.data, mimeType: mime, media_type: mime });
      } else if (att.type === 'file') {
        const mimeType = att.media_type || 'application/octet-stream';
        if (typeof att.text === 'string') {
          const uri = `file:///${encodeURIComponent(att.name || 'attachment')}`;
          promptBlocks.push({ type: 'resource', resource: { uri, mimeType, text: att.text } });
        } else if (att.data) {
          try {
            const safeName = (att.name || `attachment-${Date.now()}`).replace(/[/\\]/g, '_');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
            const diskPath = path.join(uploadsDir, safeName);
            fs.writeFileSync(diskPath, Buffer.from(att.data, 'base64'));
            const fileUri = `file://${diskPath}`;
            promptBlocks.push({ type: 'resource_link', uri: fileUri, name: safeName, mimeType });
          } catch (e) {
            console.error(`[main] failed to persist binary attachment ${att.name}: ${e.message}`);
            promptBlocks.push({ type: 'text', text: `（附件「${att.name}」处理失败，未能读取：${e.message}）` });
          }
        }
      }
    }
  }
  return promptBlocks;
}

ipcMain.handle('hermes:prompt', async (_event, { slug, text, attachments }) => {
  try {
    let meta = readProjectMeta(slug);
    if (!meta) throw new Error(`Project "${slug}" not found`);
    if (!acp || !hermesReady) {
      if (!(await ensureHermesReady())) throw new Error('Hermes ACP not connected');
    }

    // Auto-recover session if missing
    if (!meta.sessionId) {
      const projectDir = resolveProjectPath(slug);
      // AI 应用专家项目：会话过期重建前，先刷新 CLAUDE.md，
      // 让新 session 依旧带着专家的记忆与知识上下文。
      if (meta.aiApp && meta.aiApp.id) {
        prepareAiAppProjectContext(slug, meta.aiApp);
      }
      const newSession = await acp.request('session/new', { cwd: projectDir, mcpServers: [] });
      captureModelsFromSession(newSession);
      meta.sessionId = newSession.sessionId;
      await acp.request('session/set_mode', { sessionId: meta.sessionId, modeId: 'dont_ask' }).catch(() => {});
      writeProjectMeta(slug, meta);
    }

    // Build prompt content blocks (text + optional images / files)
    // 共用 buildPromptBlocks；二进制附件落到项目的 uploads/ 目录。
    const promptBlocks = buildPromptBlocks(text, attachments, resolveProjectPath(slug, 'uploads'));

    // [debug] 多模态附件排查：打印附件概况与 block 详情
    if (Array.isArray(attachments) && attachments.length > 0) {
      console.log(`[main] prompt: ${attachments.length} attachment(s) received`);
      attachments.forEach((a, i) => {
        console.log(`[main]   in[${i}] type=${a && a.type} media=${a && a.media_type} hasData=${!!(a && a.data)} dataLen=${a && a.data ? a.data.length : 0} hasText=${typeof (a && a.text) === 'string'}`);
      });
      console.log(`[main]   → blocks=${JSON.stringify(promptBlocks.map(b => b.type))}  imageBlocks=${promptBlocks.filter(b => b.type === 'image').length}`);
    }

    const promptSid = meta.sessionId;
    promptingSessions.add(promptSid);
    let result;
    try {
      result = await acp.request('session/prompt', {
        sessionId: promptSid,
        prompt: promptBlocks,
      }, 3_600_000); // 60 min timeout
    } finally {
      promptingSessions.delete(promptSid);
    }


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
    // 同 getJsonAuthed:连接类失败是 AggregateError,message 为空,须看 err.code。
    // 否则「测试连接」在地址填错时只显示空白错误。
    req.on('error', (err) => resolve({ ok: false, status: 0, error: describeNetError(err) }));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false, status: 0, error: '请求超时' }); });
    req.write(payload);
    req.end();
  });
}

// GET 一个 JSON 接口,带 Bearer 鉴权 + 跟随重定向。用于拉上游模型列表。
function getJsonAuthed(urlStr, apiKey, { maxRedirects = 5, timeoutMs = 10000 } = {}) {
  const https = require('https');
  const http = require('http');
  return new Promise((resolve) => {
    let u;
    try { u = new URL(urlStr); }
    catch { return resolve({ ok: false, status: 0, error: '地址格式不正确' }); }
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'http:' ? 80 : 443),
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    }, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        if (maxRedirects <= 0) return resolve({ ok: false, status, error: '重定向次数过多' });
        const next = new URL(res.headers.location, u).toString();
        return resolve(getJsonAuthed(next, apiKey, { maxRedirects: maxRedirects - 1, timeoutMs }));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (status < 200 || status >= 300) {
          return resolve({ ok: false, status, error: `请求失败(HTTP ${status})`, body: body.slice(0, 300) });
        }
        let data;
        try { data = JSON.parse(body); }
        catch { return resolve({ ok: false, status, error: '返回的不是 JSON', body: body.slice(0, 300) }); }
        resolve({ ok: true, status, data });
      });
    });
    // 连接类失败(DNS/拒绝连接)在 Node 里是 AggregateError,它的 message 是空字符串,
    // 有用信息只在 err.code(ECONNREFUSED/ENOTFOUND)里 —— 只取 message 会得到空错误。
    req.on('error', (err) => resolve({ ok: false, status: 0, error: describeNetError(err) }));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false, status: 0, error: '请求超时' }); });
    req.end();
  });
}

// 把 Node 的网络错误翻译成用户能看懂的一句话。
function describeNetError(err) {
  const code = (err && err.code) || '';
  const msg = (err && err.message) || '';
  if (code === 'ECONNREFUSED') return '连接被拒绝，请检查地址与端口是否正确';
  if (code === 'ENOTFOUND') return '域名解析失败，请检查 Base URL';
  if (code === 'ETIMEDOUT') return '连接超时';
  if (code === 'CERT_HAS_EXPIRED' || code === 'DEPTH_ZERO_SELF_SIGNED_CERT') return '服务端证书无效';
  return msg || code || '网络请求失败';
}

// 判断一个模型 id 是否**不是**对话模型。
// /v1/models 返回的是该 key 能访问的全部模型,不只是 chat —— 实测某聚合网关回 109 个,
// 里面有 embedding / 图像生成 / 美妆特效 / OCR / TTS 等一堆用不了的。全塞进下拉框
// 等于让用户在 100 多项里挑,且点中任何一个非 chat 模型都会报错。
//
// 这里用「按类型排除」而不是「按名单收录」:白名单要跟着各家上新不停维护,漏了就
// 显示不出新模型(历史上 CURATED 白名单就是这么和 config 脱节的);排除关键词只针对
// 模型类别,新出的对话模型天然放行。
// 规则按某聚合网关真实返回的 109 个模型逐条核对过(见下面每行的例子)。
// 只匹配「模型名里的品类词」,不写具体型号,新出的对话模型天然放行。
const NON_CHAT_MODEL_PATTERNS = [
  // 向量 / 重排
  /embed/i,                                   // embedding, RzenEmbed, qwen3-embedding-8b
  /rerank/i,                                  // bge-reranker-v2-m3, qwen3-vl-reranker-8b
  // 语音:识别 + 合成
  /tts|text-to-speech/i,                      // ChatTTS, F5TTS, f5-tts, chattts
  /whisper|transcri|(^|[-_/])asr([-_/]|$)/i,  // WhisperX, whisperx, qwen3-asr-1.7b
  /voice|speech|audio|sensevoice|cosyvoice|paraformer|dolphin/i, // SenseVoice, CosyVoice2, ParaformerOffline, DolphinSmall
  // OCR / 文档解析
  /(^|[-_/])ocr|paddleocr|mineru/i,           // paddleocr-vl-1.6, mineru2.5-2509-1.2b
  // 图像生成 / 编辑
  /image|dall-?e|stable-?diffusion|(^|[-_/])sd-|kolors|wanx|flux/i, // qwen-image-2512, sd-cartoon, stabilityai/sd-cg
  // 视频生成
  /video|sora|kling|runway|(^|[-_/])wan\d|[-_/](i2v|t2v)([-_/]|$)/i, // Wan2.1-14B, wan2.1-t2v-14b, wan2.1-i2v-14b-720p
  // 图像特效 / 分割类小模型
  /makeup|_layer$|layer$|clip$|try-?on|matting|segment|upscal|super-?resolution/i, // makeup_transfer, ecommerce_layer, reveal_layer, fg-clip
  // 安全审核 / 打分(非对话用途)
  /moderation|guard|safety|classif|detect|reward/i, // qwen3guard-gen-8b, skywork-vl-reward
  // 模型组件,不是可调用模型
  /(^|[-_/])(vae|lora|controlnet)([-_/]|$)/i,
];

function isChatModelId(id) {
  const s = String(id || '').trim();
  if (!s) return false;
  return !NON_CHAT_MODEL_PATTERNS.some((re) => re.test(s));
}

// 从各家不尽相同的模型列表响应里抽出模型 id 数组。
// 标准 OpenAI 是 { data: [{id}] };部分自建代理回 { models: [...] } 或裸数组。
function extractModelIds(payload) {
  const rows = Array.isArray(payload) ? payload
    : Array.isArray(payload && payload.data) ? payload.data
      : Array.isArray(payload && payload.models) ? payload.models
        : null;
  if (!rows) return [];
  const ids = rows.map((r) => {
    if (typeof r === 'string') return r.trim();
    if (!r || typeof r !== 'object') return '';
    return String(r.id || r.model_id || r.modelId || r.name || '').trim();
  }).filter(Boolean);
  return ids.filter((m, i) => ids.indexOf(m) === i); // 去重,保序
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
  let model = (params && params.model) || cfg.model;
  if (!apiKey) return { ok: false, error: '未填写 API Key' };
  if (!model) return { ok: false, error: '未指定测试模型(请填写该网关支持的模型名)' };
  // 与引擎写 config 的规则对齐:该网关只认裸名时剥掉模型名的「厂商/」前缀,
  // 否则测试连接会用 openai/gpt-4o 这种名字打官方 /chat/completions → 400,和引擎实际不一致。
  // params.stripVendorPrefix 显式指定优先(网关档案带着这个标记);没传才按域名猜旧行为
  // —— 猜不准自建/聚合代理(域名里没有 360.cn 但同样认前缀名)。
  const isThreeSixty = params && params.stripVendorPrefix !== undefined
    ? !params.stripVendorPrefix
    : (!baseUrl || /(^|\.)360\.cn(\b|\/|:)/i.test(baseUrl));
  if (!isThreeSixty) { const i = model.indexOf('/'); if (i >= 0) model = model.slice(i + 1).trim(); }
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

// ---------------------------------------------------------------------------
// 网关档案(gateway profiles) —— 多组网关配置并存 + 一键拉取模型
// ---------------------------------------------------------------------------

// 一键拉取该网关真实支持的模型列表(ccswitch 式体验:填 key + 地址就能拿到模型)。
// baseUrl 容错:用户常只粘 https://api.openai.com(漏 /v1),或反过来重复 /v1/v1。
// 先按用户填的试,404/400 再补 /v1 试一次。都失败才报错。
ipcMain.handle('gateway:discover-models', async (_event, { baseUrl, apiKey } = {}) => {
  const key = String(apiKey || '').trim();
  const base = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!key) return { ok: false, error: '请先填写 API Key' };
  if (!base) return { ok: false, error: '请先填写 Base URL' };

  // 候选地址:原样 → 补 /v1(仅当用户没填 /v1 时)。
  const candidates = [`${base}/models`];
  if (!/\/v\d+$/.test(base)) candidates.push(`${base}/v1/models`);

  let last = null;
  for (const url of candidates) {
    const r = await getJsonAuthed(url, key, { timeoutMs: 10000 });
    // 首个候选的失败原因更贴近用户填的地址(第二个是我们替他补的 /v1),
    // 所以只在还没有任何失败记录时才记,避免真正的报错被兜底候选的 404 盖掉。
    if (!last || (last.status && !r.status)) last = r;
    if (!r.ok) continue;
    const all = extractModelIds(r.data);
    if (all.length) {
      // 分成「对话模型」与「其他」两组回给前端:默认只勾对话模型,
      // 其他(embedding/图像/语音…)仍然列出但不勾 —— 万一我的排除规则误伤了
      // 某个真的能聊的模型,用户还能自己勾回来,不至于被规则挡死。
      const chat = all.filter(isChatModelId);
      const others = all.filter((m) => !isChatModelId(m));
      return {
        ok: true,
        models: chat.length ? chat : all,  // 全被过滤掉(整个网关都是非 chat)→ 退回全量
        others: chat.length ? others : [],
        total: all.length,
        endpoint: url,
      };
    }
    // 200 但结构不认识 → 换下一个候选;都不行则落到下面的报错。
    last = { ok: false, status: r.status, error: '该网关未返回可识别的模型列表' };
  }

  // 错误归类,文案与 env:test-connection 对齐。
  const status = (last && last.status) || 0;
  // status=0 表示没拿到 HTTP 响应(DNS 失败/连接被拒/超时),此时 error 里是
  // 底层原因(如 ECONNREFUSED),比泛泛的「获取失败」有用,原样带出来。
  let reason = (last && last.error) || '获取模型列表失败';
  if (status === 401 || status === 403) reason = `API Key 无效或无权限(HTTP ${status})`;
  else if (status === 404) reason = '该网关不支持模型列表接口(HTTP 404)，请手动填写模型名';
  else if (status === 429) reason = '请求过于频繁或额度不足(HTTP 429)';
  else if (status >= 500) reason = `服务端错误(HTTP ${status})`;
  return { ok: false, status, error: reason, detail: (last && last.body) || '' };
});

ipcMain.handle('gateway:list-profiles', async () => {
  try {
    const store = ensureGatewayProfilesSeeded();
    return { success: true, profiles: store.profiles, activeId: store.activeId };
  } catch (e) {
    return { success: false, error: e.message, profiles: [], activeId: '' };
  }
});

// 新增或更新一组档案。返回落盘后的完整列表,前端直接替换本地状态。
ipcMain.handle('gateway:save-profile', async (_event, { profile } = {}) => {
  try {
    if (!profile || !String(profile.name || '').trim()) {
      return { success: false, error: '请填写网关名称' };
    }
    const store = readGatewayProfiles();
    const id = String(profile.id || '').trim() || `gw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const models = Array.isArray(profile.models)
      ? profile.models.map((m) => String(m || '').trim()).filter(Boolean)
      : [];
    const next = {
      id,
      name: String(profile.name).trim(),
      baseUrl: String(profile.baseUrl || '').trim(),
      apiKey: String(profile.apiKey || '').trim(),
      models: models.filter((m, i) => models.indexOf(m) === i),
      stripVendorPrefix: !!profile.stripVendorPrefix,
    };
    const idx = store.profiles.findIndex((p) => p.id === id);
    if (idx >= 0) store.profiles[idx] = next;
    else store.profiles.push(next);
    if (!store.activeId) store.activeId = id;
    writeGatewayProfiles(store);
    return { success: true, profile: next, profiles: store.profiles, activeId: store.activeId };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('gateway:delete-profile', async (_event, { id } = {}) => {
  try {
    const store = readGatewayProfiles();
    const target = String(id || '');
    if (!store.profiles.some((p) => p.id === target)) {
      return { success: false, error: '档案不存在' };
    }
    store.profiles = store.profiles.filter((p) => p.id !== target);
    // 删掉的正是激活档案:activeId 置空,不自动顺延到下一个。
    // 因为 config.yaml 里仍是被删档案的 key/base_url,引擎也还在用它 —— 若把
    // 「生效中」标记挪到另一个档案,界面就在说谎(显示 A 生效,实际跑的是已删的 B)。
    // 置空后前端提示用户挑一个点「保存并启用」,那一步才真正改 config + 重启引擎。
    const clearedActive = store.activeId === target;
    if (clearedActive) store.activeId = '';
    writeGatewayProfiles(store);
    return { success: true, profiles: store.profiles, activeId: store.activeId, clearedActive };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 把某组档案写进 config.yaml 并重启引擎生效。
// 复用 applyProfileToEngine —— 与 hermes:set-model 共用同一套「重启 + 清 sessionId」流程。
ipcMain.handle('gateway:activate-profile', async (_event, { id } = {}) => {
  try {
    const store = readGatewayProfiles();
    const profile = store.profiles.find((p) => p.id === String(id || ''));
    if (!profile) return { success: false, error: '档案不存在' };
    if (!profile.apiKey) return { success: false, error: '该网关还没填 API Key' };
    if (!profile.models || !profile.models.length) return { success: false, error: '该网关还没有可用模型' };

    // replaceModels:true —— 档案里的模型清单是用户在「获取模型」里亲手勾的,
    // 必须原样写进 config 的 models:,否则顶栏下拉显示的还是模板旧清单。
    const written = writeConfigProviderKey(profile.apiKey, profile.baseUrl, profile.models, {
      stripVendorPrefix: profile.stripVendorPrefix,
      replaceModels: true,
    });
    if (!written) return { success: false, error: '写入 config.yaml 失败' };

    // .env 同步:引擎的 key_env 兜底路径读 OPENAI_API_KEY,不同步会在 config 写入
    // 失败时回退到上一组网关的 key。
    try {
      upsertEnvVars({
        OPENAI_API_KEY: profile.apiKey,
        OPENAI_BASE_URL: profile.baseUrl || '',
        // 这两个必须清掉,否则会盖掉本次切换:
        //   ANTHROPIC_API_KEY —— parseEnvConfig 优先它,残留会让测试连接用错 key;
        //   HERMES_MODEL —— 模型的唯一真值是 config.yaml 的 model.default。
        ANTHROPIC_API_KEY: null,
        HERMES_MODEL: null,
      });
    } catch (e) {
      console.warn('[main] activate-profile: sync .env failed:', e.message);
    }

    store.activeId = profile.id;
    writeGatewayProfiles(store);

    const applied = await applyProfileToEngine();
    if (!applied.ok) return { success: false, error: applied.error };
    return { success: true, activeId: store.activeId, restarted: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
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

// 删除项目内的文件或目录（交付物 / 原型清理用）。
// 路径经 resolveProjectPath 校验，越界会抛错；删目录必须显式传 recursive，
// 避免调用方手滑把整棵树删掉。不存在视为成功（幂等）。
ipcMain.handle('hermes:delete-file', async (_event, { slug, relativePath, recursive }) => {
  try {
    const filePath = resolveProjectPath(slug, relativePath);
    // 不允许删项目根目录本身
    if (path.resolve(filePath) === path.resolve(resolveProjectPath(slug))) {
      return { success: false, error: '不能删除项目根目录' };
    }
    if (!fs.existsSync(filePath)) return { success: true, missing: true };
    if (fs.statSync(filePath).isDirectory()) {
      if (!recursive) return { success: false, error: '目标是目录，需要 recursive' };
      fs.rmSync(filePath, { recursive: true, force: true });
      return { success: true, removedDir: true };
    }
    fs.unlinkSync(filePath);
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

ipcMain.handle('hermes:save-file', async (_event, { slug, file }) => {
  try {
    const srcPath = resolveProjectPath(slug, file);
    if (!fs.existsSync(srcPath) || !fs.statSync(srcPath).isFile()) return { success: false, error: '文件不存在' };
    const { canceled, filePath: dest } = await dialog.showSaveDialog(mainWindow, {
      title: '另存为',
      defaultPath: path.basename(srcPath),
    });
    if (canceled || !dest) return { success: false, canceled: true };
    fs.copyFileSync(srcPath, dest);
    return { success: true, path: dest };
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

// Markdown → docx Buffer。表格(GFM)转 Word 原生表格，图片按 md 所在目录解析相对路径后嵌入。
// baseDir 为 md 文件所在的绝对目录，用于解析 ![](assets/x.png) 这类相对图片；缺省则跳过图片。
async function markdownToDocxBuffer(mdContent, baseDir) {
  const {
    Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer,
    Table, TableRow, TableCell, WidthType, ImageRun,
  } = require('docx');

  const lines = mdContent.split('\n');
  const children = [];

  // 图片：仅支持 docx 能嵌的位图(png/jpg/gif/bmp)；svg/缺失文件退化为「[图片: alt]」占位。
  const imageParagraph = (alt, src) => {
    try {
      if (!baseDir || /^(https?:|data:|file:|\/\/)/i.test(src)) throw new Error('remote');
      const abs = path.isAbsolute(src) ? src : path.join(baseDir, src);
      const ext = path.extname(abs).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(ext)) throw new Error('unsupported');
      if (!fs.existsSync(abs)) throw new Error('missing');
      return new Paragraph({
        children: [new ImageRun({
          data: fs.readFileSync(abs),
          transformation: { width: 560, height: 320 },
        })],
        spacing: { before: 120, after: 120 },
      });
    } catch {
      return new Paragraph({
        children: [new TextRun({ text: `[图片: ${alt || src}]`, italics: true, color: '94a3b8' })],
        spacing: { after: 60 },
      });
    }
  };

  const splitRow = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const isSeparatorRow = (line) => /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // GFM 表格：`| a | b |` + 分隔行 → Word 原生表格
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const header = splitRow(line);
      const bodyRows = [];
      let j = i + 2;
      while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j])) {
        bodyRows.push(splitRow(lines[j]));
        j++;
      }
      const colCount = header.length;
      const mkCell = (text, bold) => new TableCell({
        children: [new Paragraph({ children: parseInlineMarkdown(text || '', TextRun, bold) })],
        shading: bold ? { fill: 'f1f5f9' } : undefined,
      });
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: header.map((h) => mkCell(h, true)), tableHeader: true }),
          ...bodyRows.map((r) => new TableRow({
            children: Array.from({ length: colCount }, (_, ci) => mkCell(r[ci], false)),
          })),
        ],
      }));
      children.push(new Paragraph({ text: '' }));
      i = j - 1;
      continue;
    }

    // 独占一行的图片
    const imgOnly = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    if (imgOnly) {
      children.push(imageParagraph(imgOnly[1], imgOnly[2]));
      continue;
    }

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
    } else if (/^\s*[-*+]\s/.test(line)) {
      const indent = line.match(/^(\s*)/)[1].length;
      const level = Math.min(Math.floor(indent / 2), 4);
      const text = line.replace(/^\s*[-*+]\s+/, '');
      children.push(new Paragraph({
        children: parseInlineMarkdown(text, TextRun),
        bullet: { level },
      }));
    } else if (/^\s*\d+\.\s/.test(line)) {
      const text = line.replace(/^\s*\d+\.\s+/, '');
      children.push(new Paragraph({
        children: parseInlineMarkdown(text, TextRun),
        numbering: { reference: 'default-numbering', level: 0 },
      }));
    } else if (/^---+$/.test(line.trim())) {
      children.push(new Paragraph({ text: '' }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '' }));
    } else {
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

  return Packer.toBuffer(doc);
}

function getMdExportScriptPath() {
  const candidates = [
    path.join(SKILLS_DIR, 'md-export', 'export.py'),
    app.isPackaged
      ? path.join(process.resourcesPath, 'skills', 'md-export', 'export.py')
      : path.join(app.getAppPath(), 'skills', 'md-export', 'export.py'),
  ];
  return candidates.find((p) => fs.existsSync(p));
}

function runPythonScript(scriptPath, args, options = {}) {
  const candidates = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  let lastError = null;
  const run = (cmd) => new Promise((resolve, reject) => {
    const proc = spawn(cmd, [scriptPath, ...args], {
      cwd: options.cwd || path.dirname(scriptPath),
      env: options.env || process.env,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error((stderr || stdout || `python exited with code ${code}`).trim()));
    });
  });
  return candidates.reduce((promise, cmd) => promise.catch(async (err) => {
    lastError = err;
    return run(cmd);
  }), Promise.reject(new Error('start'))).catch((err) => {
    throw lastError && lastError.message !== 'start' ? lastError : err;
  });
}

// 交付物 md 自动转存同名 .docx（阶段②③工作台：md 是可编辑源，docx 是交付成品）。
// relativePath 传 md 的项目内相对路径，产出同目录同名 .docx。
ipcMain.handle('hermes:md-to-docx', async (_event, { slug, relativePath }) => {
  try {
    const mdPath = resolveProjectPath(slug, relativePath);
    if (!fs.existsSync(mdPath)) return { success: false, error: `${relativePath} not found` };
    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    if (!mdContent.trim()) return { success: false, error: 'empty markdown' };

    // 统一使用内置技能 md-export 生成 Word，保证交付物 Word 样式与技能库一致。
    const docxPath = mdPath.replace(/\.md$/i, '') + '.docx';
    const scriptPath = getMdExportScriptPath();
    if (!scriptPath) return { success: false, error: 'md-export skill not found' };

    await runPythonScript(scriptPath, [mdPath, '--to', 'word', '--out', docxPath], {
      cwd: path.dirname(mdPath),
      env: { ...process.env, PYTHONUTF8: '1' },
    });

    const docxRel = relativePath.replace(/\.md$/i, '') + '.docx';
    return { success: true, path: docxPath, relativePath: docxRel, exporter: 'md-export' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 读取项目内 docx 并转成 HTML 供右侧面板预览（mammoth：Word → HTML 快照）。
ipcMain.handle('hermes:docx-preview', async (_event, { slug, relativePath }) => {
  try {
    const abs = resolveProjectPath(slug, relativePath);
    if (!fs.existsSync(abs)) return { success: false, error: `${relativePath} not found` };
    const mammoth = require('mammoth');
    const result = await mammoth.convertToHtml({ path: abs });
    return { success: true, html: result.value || '' };
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
    if (!mdContent.trim()) return { success: false, error: 'empty markdown' };

    const meta = readProjectMeta(slug);
    const defaultName = meta?.name ? `${meta.name} - 产品功能清单.docx` : '功能清单.docx';

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '导出 Word 文档',
      defaultPath: defaultName,
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    const scriptPath = getMdExportScriptPath();
    if (!scriptPath) return { success: false, error: 'md-export skill not found' };
    await runPythonScript(scriptPath, [specPath, '--to', 'word', '--out', filePath], {
      cwd: path.dirname(specPath),
      env: { ...process.env, PYTHONUTF8: '1' },
    });
    return { success: true, path: filePath, exporter: 'md-export' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Helper: parse bold/italic inline markdown to TextRun array
// forceBold: 表格表头整格加粗（正文行传 false / 省略）
function parseInlineMarkdown(text, TextRun, forceBold = false) {
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
      runs.push(new TextRun({ text: match[3], italics: true, bold: forceBold || undefined }));
    } else if (match[4]) {
      // Code
      runs.push(new TextRun({ text: match[4], font: 'Consolas', size: 20, bold: forceBold || undefined }));
    } else if (match[5]) {
      // Plain
      runs.push(new TextRun({ text: match[5], bold: forceBold || undefined }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text, bold: forceBold || undefined })];
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

// 崩溃留痕。原生模块（node-pty 等）的回调不在 JS 调用栈上，异常逃出去就是
// std::terminate，进程直接消失、终端里什么都看不到；这里至少把现场落到磁盘。
const CRASH_LOG = path.join(PRODUCT_LOBSTER_HOME, 'crash.log');
function logCrash(kind, detail) {
  const line = `[${new Date().toISOString()}] ${kind}\n${detail}\n\n`;
  try {
    // 超过 2MB 就重置，别让它无限长
    if (fs.existsSync(CRASH_LOG) && fs.statSync(CRASH_LOG).size > 2 * 1024 * 1024) {
      fs.writeFileSync(CRASH_LOG, '');
    }
    fs.appendFileSync(CRASH_LOG, line);
  } catch (_) { /* 磁盘写不进去也不能再抛 */ }
  console.error('[crash]', kind, detail);
}

process.on('uncaughtException', (err) => {
  logCrash('uncaughtException', err?.stack || String(err));
});
process.on('unhandledRejection', (reason) => {
  logCrash('unhandledRejection', reason?.stack || String(reason));
});
app.on('render-process-gone', (_e, contents, details) => {
  logCrash('render-process-gone', JSON.stringify(details));
  // 渲染进程 OOM / crash 后页面是白屏，自己拉回来
  if (details?.reason !== 'clean-exit' && !contents.isDestroyed()) {
    try { contents.reload(); } catch (_) { /* 窗口已经没了 */ }
  }
});
app.on('child-process-gone', (_e, details) => {
  logCrash('child-process-gone', JSON.stringify(details));
});

// 等窗口真的有内容可画。ready-to-show 可能在挂监听之前就已经触发，
// 所以用 isLoading() 兜一层；再加超时，保证任何异常下窗口都不会永远不出来。
function whenReadyToShow(win, timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (win.isDestroyed()) return resolve();
    let done = false;
    const finish = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
    const timer = setTimeout(finish, timeoutMs);
    win.once('ready-to-show', finish);
    // 已经加载完了就别干等 ready-to-show
    if (!win.webContents.isLoading()) finish();
  });
}

app.whenReady().then(async () => {
  ensureDirs();
  buildAppMenu();
  registerWindowControls();
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

  // 原先是「引擎就绪 + 固定 600ms」就 show，跟页面加载没关系：
  // 引擎先好、渲染层还在编译时，显示出来的就是一片白。改成等首帧可画。
  updateSplash(100, '正在打开工作台...');
  await Promise.all([win.__rendererReady, whenReadyToShow(win)]);

  if (!win.isDestroyed()) win.show();
  // 先 show 再关启动页，避免中间露出桌面闪一下
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();

  // Dock 图标点击 / 应用被重新激活：有窗口就拉回来，没有才重建。
  // 原实现只在 length === 0 时 createWindow()，但窗口是 show:false 创建的，
  // 没人 show 它 → 点了图标不出窗口，再点一次连分支都不进，彻底点不动。
  app.on('activate', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      return;
    }
    const win = createWindow();
    await Promise.all([win.__rendererReady, whenReadyToShow(win)]);
    if (!win.isDestroyed()) win.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ---------------------------------------------------------------------------
// AI 应用专家系统 —— 记忆 / 知识库 / 项目上下文（CLAUDE.md）
// ---------------------------------------------------------------------------
// 每个 AI 应用在 ai-apps/memory/<appId>/ 下有独立的：
//   memory.md      —— 应用专家的长期记忆（用户可编辑 / 追加）
//   knowledge/     —— 应用专家的知识库文件（用户上传的资料）
// 用这个应用创建 / 打开项目时，把记忆 + 知识注入到项目根 CLAUDE.md，
// 并把知识文件拷贝到 projects/<slug>/knowledge/app/ 供 agent 就地读取。

function sanitizeAiAppPathId(appId) {
  const id = String(appId == null ? '' : appId).trim();
  if (!id) throw new Error('appId is required');
  // 禁止路径分隔符与父目录跳出；限制长度。
  if (id === '.' || id === '..' || /[\\/]/.test(id) || id.includes('..')) {
    throw new Error(`Invalid appId: ${appId}`);
  }
  if (id.length > 120) throw new Error('appId too long');
  return id;
}

function resolveAiAppMemoryDir(appId, ...rest) {
  const safeId = sanitizeAiAppPathId(appId);
  const target = path.resolve(AI_APPS_MEMORY_DIR, safeId, ...rest);
  const root = path.resolve(AI_APPS_MEMORY_DIR);
  // 目录跳出防护：解析后的路径必须落在 memory 根目录内。
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('Path traversal detected');
  }
  return target;
}

function aiAppMemoryTemplate(appName) {
  const name = String(appName || '该应用');
  return `# ${name} — 专家记忆

> 这里记录「${name}」这位 AI 应用专家的长期记忆：偏好、约束、历史决策、专业知识要点。
> 每次用该应用创建或打开项目时，这些记忆会被注入到项目的 CLAUDE.md，指导 AI 的工作方式。

## 核心定位

（在这里补充这位专家的定位、擅长的场景、要坚持的原则）

## 长期记忆

（下面按日期自动追加，或手动编辑）
`;
}

function ensureAiAppMemoryStore(appId, appName) {
  const dir = resolveAiAppMemoryDir(appId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const knowledgeDir = resolveAiAppMemoryDir(appId, 'knowledge');
  if (!fs.existsSync(knowledgeDir)) fs.mkdirSync(knowledgeDir, { recursive: true });
  const memoryFile = resolveAiAppMemoryDir(appId, 'memory.md');
  if (!fs.existsSync(memoryFile)) {
    fs.writeFileSync(memoryFile, aiAppMemoryTemplate(appName), 'utf-8');
  }
  return { dir, knowledgeDir, memoryFile };
}

function readAiAppMemory(appId) {
  const memoryFile = resolveAiAppMemoryDir(appId, 'memory.md');
  try {
    if (!fs.existsSync(memoryFile)) return '';
    return fs.readFileSync(memoryFile, 'utf-8');
  } catch (e) {
    console.error('[ai-apps] readAiAppMemory failed:', e.message);
    return '';
  }
}

function writeAiAppMemory(appId, content) {
  ensureAiAppMemoryStore(appId);
  const memoryFile = resolveAiAppMemoryDir(appId, 'memory.md');
  fs.writeFileSync(memoryFile, typeof content === 'string' ? content : '', 'utf-8');
  return memoryFile;
}

function appendAiAppMemory(appId, entry, source) {
  ensureAiAppMemoryStore(appId);
  const memoryFile = resolveAiAppMemoryDir(appId, 'memory.md');
  const text = typeof entry === 'string' ? entry.trim() : '';
  if (!text) return memoryFile;
  const stamp = new Date().toISOString().slice(0, 10);
  const src = source ? `（来源：${String(source).slice(0, 100)}）` : '';
  const section = `\n\n### ${stamp} ${src}\n\n${text}\n`;
  fs.appendFileSync(memoryFile, section, 'utf-8');
  return memoryFile;
}

// 把 memory/<appId>/knowledge/ 里的文件同步到 projects/<slug>/knowledge/app/。
// 每次都清空并重建 knowledge/app/，确保与知识库一致（删除的文件不残留）。
function syncAiAppKnowledgeToProject(appId, slug) {
  const srcDir = resolveAiAppMemoryDir(appId, 'knowledge');
  const dstDir = resolveProjectPath(slug, 'knowledge', 'app');
  // 清空并重建目标目录。
  try {
    if (fs.existsSync(dstDir)) fs.rmSync(dstDir, { recursive: true, force: true });
  } catch (e) {
    console.warn('[ai-apps] clean knowledge/app failed:', e.message);
  }
  fs.mkdirSync(dstDir, { recursive: true });

  const files = [];
  if (!fs.existsSync(srcDir)) return files;
  let entries = [];
  try {
    entries = fs.readdirSync(srcDir, { withFileTypes: true });
  } catch (e) {
    console.warn('[ai-apps] read knowledge dir failed:', e.message);
    return files;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue; // 只同步顶层文件
    const name = entry.name;
    const srcPath = path.join(srcDir, name);
    const dstPath = path.join(dstDir, name);
    try {
      fs.copyFileSync(srcPath, dstPath);
      const stat = fs.statSync(dstPath);
      files.push({
        name,
        relPath: path.posix.join('knowledge', 'app', name),
        size: stat.size,
        ext: path.extname(name).replace(/^\./, '').toLowerCase(),
      });
    } catch (e) {
      console.warn(`[ai-apps] copy knowledge file ${name} failed:`, e.message);
    }
  }
  return files;
}

// 渲染项目根 CLAUDE.md：把 AI 应用的画像 + 记忆 + 知识清单写进去，
// 让 agent 从项目一打开就带着这位专家的人设与知识工作。
function buildAiAppClaudeMd(app, memory, knowledgeFiles) {
  const a = app || {};
  const name = a.name || 'AI 应用专家';
  const lines = [];
  lines.push(`# ${name}`);
  lines.push('');
  lines.push('> 本文件由 AI 应用专家系统自动生成。它定义了当前项目的 AI 专家人设、工作方式、记忆与知识库。');
  lines.push('> 请始终以这位专家的身份、遵循下面的约束进行工作。');
  lines.push('');

  if (a.tagline) { lines.push(`**一句话定位**：${a.tagline}`); lines.push(''); }
  if (a.summary) { lines.push('## 专家简介'); lines.push(''); lines.push(a.summary); lines.push(''); }

  if (Array.isArray(a.bestFor) && a.bestFor.length) {
    lines.push('## 最擅长');
    lines.push('');
    for (const item of a.bestFor) lines.push(`- ${item}`);
    lines.push('');
  }

  if (a.capabilities) { lines.push('## 能力'); lines.push(''); lines.push(a.capabilities); lines.push(''); }
  if (a.workflow) { lines.push('## 工作流程'); lines.push(''); lines.push(a.workflow); lines.push(''); }
  if (a.constraints) { lines.push('## 约束与原则'); lines.push(''); lines.push(a.constraints); lines.push(''); }
  if (a.riskNotice) { lines.push('## 风险提示'); lines.push(''); lines.push(a.riskNotice); lines.push(''); }
  if (a.prompt) { lines.push('## 系统提示词'); lines.push(''); lines.push(a.prompt); lines.push(''); }

  if (Array.isArray(a.skills) && a.skills.length) {
    lines.push('## 推荐技能');
    lines.push('');
    lines.push('处理任务时，请优先考虑使用以下技能（通过 `skill_view` 查看用法后按需调用）：');
    lines.push('');
    for (const s of a.skills) {
      const sn = typeof s === 'string' ? s : (s && (s.name || s.id));
      const sd = (s && typeof s === 'object' && s.description) ? ` —— ${s.description}` : '';
      if (sn) lines.push(`- **${sn}**${sd}`);
    }
    lines.push('');
  }

  lines.push('## 专家记忆');
  lines.push('');
  const mem = (typeof memory === 'string' ? memory : '').trim();
  lines.push(mem || '（暂无记忆）');
  lines.push('');

  lines.push('## 知识库');
  lines.push('');
  const files = Array.isArray(knowledgeFiles) ? knowledgeFiles : [];
  if (files.length) {
    lines.push('以下知识文件已同步到项目 `knowledge/app/` 目录，需要时请直接读取：');
    lines.push('');
    for (const f of files) lines.push(`- \`${f.relPath}\`${f.size ? ` (${f.size} bytes)` : ''}`);
  } else {
    lines.push('（暂无知识库文件）');
  }
  lines.push('');

  return lines.join('\n');
}

// 编排：确保记忆存在 → 读记忆 → 同步知识 → 生成并写入 CLAUDE.md。
// aiAppSnapshot 是保存在项目 meta.aiApp 里的应用快照（至少含 id/name）。
function prepareAiAppProjectContext(slug, aiAppSnapshot) {
  const app = aiAppSnapshot || {};
  const appId = app.id;
  if (!appId) return { memoryChars: 0, knowledgeCount: 0 };
  try {
    ensureAiAppMemoryStore(appId, app.name);
    const memory = readAiAppMemory(appId);
    const knowledgeFiles = syncAiAppKnowledgeToProject(appId, slug);
    const claudeMd = buildAiAppClaudeMd(app, memory, knowledgeFiles);
    const claudePath = resolveProjectPath(slug, 'CLAUDE.md');
    fs.writeFileSync(claudePath, claudeMd, 'utf-8');
    return { memoryChars: memory.length, knowledgeCount: knowledgeFiles.length };
  } catch (e) {
    console.error('[ai-apps] prepareAiAppProjectContext failed:', e.message);
    return { memoryChars: 0, knowledgeCount: 0, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// AI 应用广场 —— 本地应用持久化
// ---------------------------------------------------------------------------

const AI_APPS_ALLOWED_FIELDS = [
  'id', 'name', 'category', 'icon', 'color', 'tagline', 'summary',
  'bestFor', 'starters', 'sessionName', 'slugPrefix', 'displayOpening',
  'capabilities', 'workflow', 'constraints', 'riskNotice', 'prompt',
  'developer', 'source', 'status', 'createdAt', 'updatedAt', 'preferredModel', 'skills',
];

function readLocalAiApps() {
  try {
    if (!fs.existsSync(AI_APPS_FILE)) return [];
    const raw = fs.readFileSync(AI_APPS_FILE, 'utf-8');
    const store = JSON.parse(raw);
    return Array.isArray(store.apps) ? store.apps : [];
  } catch (e) {
    console.error('[ai-apps] read failed:', e.message);
    return [];
  }
}

function writeLocalAiApps(apps) {
  const store = { version: 1, updatedAt: new Date().toISOString(), apps };
  fs.writeFileSync(AI_APPS_FILE, JSON.stringify(store, null, 2) + '\n', 'utf-8');
}

function sanitizeAiAppId(name) {
  const base = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `local-${base || 'app'}-${Date.now()}`;
}

function clampStr(v, max = 2000) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function clampArr(v, maxItems = 20, maxLen = 200) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, maxItems).map((s) => clampStr(String(s), maxLen));
}

function normalizeLocalAiApp(input, existing) {
  const now = new Date().toISOString();
  const app = {};
  for (const key of AI_APPS_ALLOWED_FIELDS) {
    if (key in input) app[key] = input[key];
  }
  app.id = existing ? existing.id : (input.id && String(input.id).startsWith('local-') ? String(input.id) : sanitizeAiAppId(input.name));
  app.name = clampStr(app.name || '未命名应用', 100);
  app.category = clampStr(app.category || 'enterprise', 60);
  app.icon = clampStr(app.icon || 'rocket', 60);
  app.color = clampStr(app.color || '#2563eb', 20);
  app.tagline = clampStr(app.tagline, 200);
  app.summary = clampStr(app.summary, 1000);
  app.bestFor = clampArr(app.bestFor);
  app.starters = clampArr(app.starters, 10, 500);
  app.sessionName = clampStr(app.sessionName || app.name, 100);
  app.slugPrefix = clampStr(app.slugPrefix || `app-${app.id}`, 80);
  app.displayOpening = clampStr(app.displayOpening || `启动${app.name}`, 200);
  app.capabilities = clampStr(app.capabilities, 3000);
  app.workflow = clampStr(app.workflow, 3000);
  app.constraints = clampStr(app.constraints, 2000);
  app.riskNotice = clampStr(app.riskNotice, 500);
  app.prompt = clampStr(app.prompt, 8000);
  app.skills = clampArr(app.skills, 30, 100);
  app.developer = {
    author: clampStr((app.developer && app.developer.author) || '本地开发者', 100),
    version: clampStr((app.developer && app.developer.version) || '1.0.0', 20),
  };
  app.source = 'local';
  app.status = app.status === 'published' ? 'published' : 'draft';
  app.createdAt = existing ? existing.createdAt : now;
  app.updatedAt = now;
  return app;
}

ipcMain.handle('ai-apps:list', async () => {
  try {
    const apps = readLocalAiApps();
    return { success: true, apps };
  } catch (e) {
    return { success: false, error: e.message, apps: [] };
  }
});

ipcMain.handle('ai-apps:get', async (_event, { id }) => {
  try {
    const apps = readLocalAiApps();
    const app = apps.find((a) => a.id === id);
    if (!app) return { success: false, error: 'App not found' };
    return { success: true, app };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ai-apps:save', async (_event, { app: input }) => {
  try {
    if (!input || !input.name) return { success: false, error: '应用名称不能为空' };
    const apps = readLocalAiApps();
    const existingIdx = input.id ? apps.findIndex((a) => a.id === input.id) : -1;
    const existing = existingIdx >= 0 ? apps[existingIdx] : null;
    const app = normalizeLocalAiApp(input, existing);
    if (existingIdx >= 0) {
      apps[existingIdx] = app;
    } else {
      apps.push(app);
    }
    writeLocalAiApps(apps);
    return { success: true, app };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ai-apps:publish', async (_event, { id }) => {
  try {
    const apps = readLocalAiApps();
    const app = apps.find((a) => a.id === id);
    if (!app) return { success: false, error: 'App not found' };
    app.status = 'published';
    app.updatedAt = new Date().toISOString();
    writeLocalAiApps(apps);
    return { success: true, app };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ai-apps:unpublish', async (_event, { id }) => {
  try {
    const apps = readLocalAiApps();
    const app = apps.find((a) => a.id === id);
    if (!app) return { success: false, error: 'App not found' };
    app.status = 'draft';
    app.updatedAt = new Date().toISOString();
    writeLocalAiApps(apps);
    return { success: true, app };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ai-apps:delete', async (_event, { id }) => {
  try {
    let apps = readLocalAiApps();
    const before = apps.length;
    apps = apps.filter((a) => a.id !== id);
    if (apps.length === before) return { success: false, error: 'App not found' };
    writeLocalAiApps(apps);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// --- AI 应用广场：内置专家覆盖层 -------------------------------------------
// 内置专家（source:'builtin'，来自 ai-experts.js）不能改源码，这里存一层用户覆盖。
// 前端把 内置定义 + override 合并展示；deleted 里的内置 id 视为已删（软删，可恢复）。

function readBuiltinOverrides() {
  try {
    if (!fs.existsSync(AI_APPS_BUILTIN_OVERRIDES_FILE)) return { overrides: {}, deleted: [] };
    const store = JSON.parse(fs.readFileSync(AI_APPS_BUILTIN_OVERRIDES_FILE, 'utf-8'));
    return {
      overrides: (store && typeof store.overrides === 'object' && store.overrides) || {},
      deleted: Array.isArray(store && store.deleted) ? store.deleted : [],
    };
  } catch (e) {
    console.error('[ai-apps] read builtin overrides failed:', e.message);
    return { overrides: {}, deleted: [] };
  }
}

function writeBuiltinOverrides(store) {
  const out = {
    version: 1,
    updatedAt: new Date().toISOString(),
    overrides: store.overrides || {},
    deleted: Array.isArray(store.deleted) ? store.deleted : [],
  };
  fs.writeFileSync(AI_APPS_BUILTIN_OVERRIDES_FILE, JSON.stringify(out, null, 2) + '\n', 'utf-8');
}

// 只允许覆盖这些展示/prompt 相关字段；id/source 等结构性字段不可改。
const AI_APPS_OVERRIDABLE_FIELDS = [
  'name', 'category', 'icon', 'color', 'tagline', 'summary',
  'bestFor', 'starters', 'capabilities', 'workflow', 'constraints',
  'riskNotice', 'prompt', 'preferredModel', 'skills',
];

function normalizeBuiltinOverride(input) {
  const o = {};
  if ('name' in input) o.name = clampStr(input.name, 100);
  if ('category' in input) o.category = clampStr(input.category, 60);
  if ('icon' in input) o.icon = clampStr(String(input.icon || '').replace(/^fa-/, ''), 60);
  if ('color' in input) o.color = clampStr(input.color, 20);
  if ('tagline' in input) o.tagline = clampStr(input.tagline, 200);
  if ('summary' in input) o.summary = clampStr(input.summary, 1000);
  if ('bestFor' in input) o.bestFor = clampArr(input.bestFor);
  if ('starters' in input) o.starters = clampArr(input.starters, 10, 500);
  if ('capabilities' in input) o.capabilities = clampStr(input.capabilities, 3000);
  if ('workflow' in input) o.workflow = clampStr(input.workflow, 3000);
  if ('constraints' in input) o.constraints = clampStr(input.constraints, 2000);
  if ('riskNotice' in input) o.riskNotice = clampStr(input.riskNotice, 500);
  if ('prompt' in input) o.prompt = clampStr(input.prompt, 8000);
  if ('preferredModel' in input) o.preferredModel = clampStr(input.preferredModel, 200);
  if ('skills' in input) o.skills = clampArr(input.skills, 30, 100);
  return o;
}

ipcMain.handle('ai-apps:builtin-overrides', async () => {
  try {
    return { success: true, ...readBuiltinOverrides() };
  } catch (e) {
    return { success: false, error: e.message, overrides: {}, deleted: [] };
  }
});

ipcMain.handle('ai-apps:builtin-save', async (_event, { id, patch } = {}) => {
  try {
    if (!id) return { success: false, error: 'id is required' };
    if (!patch || typeof patch !== 'object') return { success: false, error: 'patch is required' };
    const store = readBuiltinOverrides();
    const prev = store.overrides[id] || {};
    const next = { ...prev, ...normalizeBuiltinOverride(patch) };
    store.overrides[id] = next;
    // 若曾被软删，保存即视为恢复显示
    store.deleted = store.deleted.filter((d) => d !== id);
    writeBuiltinOverrides(store);
    return { success: true, id, override: next };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ai-apps:builtin-delete', async (_event, { id } = {}) => {
  try {
    if (!id) return { success: false, error: 'id is required' };
    const store = readBuiltinOverrides();
    if (!store.deleted.includes(id)) store.deleted.push(id);
    writeBuiltinOverrides(store);
    return { success: true, id };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ai-apps:builtin-reset', async (_event, { id } = {}) => {
  try {
    if (!id) return { success: false, error: 'id is required' };
    const store = readBuiltinOverrides();
    delete store.overrides[id];
    store.deleted = store.deleted.filter((d) => d !== id);
    writeBuiltinOverrides(store);
    return { success: true, id };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// --- AI 应用专家：记忆 IPC -------------------------------------------------

ipcMain.handle('ai-apps:memory-get', async (_event, { id } = {}) => {
  try {
    if (!id) return { success: false, error: 'id is required' };
    const app = readLocalAiApps().find((a) => a.id === id);
    ensureAiAppMemoryStore(id, app && app.name);
    const content = readAiAppMemory(id);
    const memPath = resolveAiAppMemoryDir(id, 'memory.md');
    return { success: true, content, path: memPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ai-apps:memory-save', async (_event, { id, content } = {}) => {
  try {
    if (!id) return { success: false, error: 'id is required' };
    const memPath = writeAiAppMemory(id, typeof content === 'string' ? content : '');
    return { success: true, path: memPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ai-apps:memory-append', async (_event, { id, content, source } = {}) => {
  try {
    if (!id) return { success: false, error: 'id is required' };
    const memPath = appendAiAppMemory(id, content, source);
    return { success: true, path: memPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ai-apps:memory-open', async (_event, { id } = {}) => {
  try {
    if (!id) return { success: false, error: 'id is required' };
    const app = readLocalAiApps().find((a) => a.id === id);
    const { dir } = ensureAiAppMemoryStore(id, app && app.name);
    const err = await shell.openPath(dir);
    if (err) return { success: false, error: err };
    return { success: true, path: dir };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// --- AI 应用专家：知识库 IPC -----------------------------------------------

ipcMain.handle('ai-apps:knowledge-list', async (_event, { id } = {}) => {
  try {
    if (!id) return { success: false, error: 'id is required' };
    const app = readLocalAiApps().find((a) => a.id === id);
    const { knowledgeDir } = ensureAiAppMemoryStore(id, app && app.name);
    const entries = fs.readdirSync(knowledgeDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const full = path.join(knowledgeDir, entry.name);
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      files.push({
        name: entry.name,
        ext: path.extname(entry.name).replace(/^\./, '').toLowerCase(),
        size: stat.size,
        mtime: stat.mtimeMs,
      });
    }
    files.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, files, path: knowledgeDir };
  } catch (e) {
    return { success: false, error: e.message, files: [] };
  }
});

ipcMain.handle('ai-apps:knowledge-upload', async (_event, { id } = {}) => {
  try {
    if (!id) return { success: false, error: 'id is required' };
    const app = readLocalAiApps().find((a) => a.id === id);
    const { knowledgeDir } = ensureAiAppMemoryStore(id, app && app.name);
    const res = await dialog.showOpenDialog(mainWindow, {
      title: '选择要加入知识库的文件',
      properties: ['openFile', 'multiSelections'],
    });
    if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    const added = [];
    for (const src of res.filePaths) {
      const base = path.basename(src);
      const dst = path.join(knowledgeDir, base);
      try {
        fs.copyFileSync(src, dst);
        added.push(base);
      } catch (e) {
        console.warn(`[ai-apps] copy uploaded file ${base} failed:`, e.message);
      }
    }
    return { success: true, added };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ai-apps:knowledge-delete', async (_event, { id, file } = {}) => {
  try {
    if (!id) return { success: false, error: 'id is required' };
    if (!file) return { success: false, error: 'file is required' };
    const app = readLocalAiApps().find((a) => a.id === id);
    const { knowledgeDir } = ensureAiAppMemoryStore(id, app && app.name);
    const base = path.basename(String(file)); // 只用文件名，杜绝路径穿越
    if (!base || base === '.' || base === '..') {
      return { success: false, error: 'Invalid file name' };
    }
    const target = path.join(knowledgeDir, base);
    if (fs.existsSync(target)) fs.rmSync(target, { force: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ai-apps:knowledge-open', async (_event, { id } = {}) => {
  try {
    if (!id) return { success: false, error: 'id is required' };
    const app = readLocalAiApps().find((a) => a.id === id);
    const { knowledgeDir } = ensureAiAppMemoryStore(id, app && app.name);
    const err = await shell.openPath(knowledgeDir);
    if (err) return { success: false, error: err };
    return { success: true, path: knowledgeDir };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

app.on('will-quit', () => { stopHermes(); for (const terminal of codeTerminals.values()) { try { terminal.pty.kill(); } catch (_) {} } codeTerminals.clear(); });
// isQuitting 必须在窗口 close 事件之前置位，否则 macOS 上的「关闭=隐藏」
// 会把 Cmd+Q 触发的销毁也拦掉，应用退不掉。
app.on('before-quit', () => { isQuitting = true; stopHermes(); });
