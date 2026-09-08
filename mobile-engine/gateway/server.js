#!/usr/bin/env node
/**
 * hermes-acp 本地网关(Android/Termux 用)。
 *
 * 桌面版通过 Electron 主进程用 stdio 直连 hermes-acp;安卓的 WebView 无法
 * 直接读写子进程 stdio,所以在 Termux 侧起这个网关:
 *   - spawn hermes-acp(纯 Python,由 install-termux.sh 装好)
 *   - 复用桌面版的 AcpClient 解析 stdio 上的 JSON-RPC
 *   - 对外暴露 127.0.0.1:PORT 的 HTTP:
 *       POST /rpc      → 转发一次 ACP 请求,返回 JSON 结果
 *       GET  /events   → SSE 长连接,推送 hermes 的通知(session/update 等)
 *       POST /respond  → 前端对 reverse-request(权限确认)的回复
 *       GET  /health   → 存活探针
 *
 * 设计原则:零 npm 依赖(只用 Node 内置模块),Termux 里 `node server.js` 直接跑。
 * 安全:只绑 127.0.0.1,并要求 X-Gateway-Token 头匹配启动时生成的 token。
 */

const http = require('http');
const { spawn } = require('child_process');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');
const AcpClient = require('./acp-client');

// --- 配置 ---
const PORT = parseInt(process.env.HERMES_GATEWAY_PORT || '43918', 10);
const HOST = '127.0.0.1';
const HERMES_HOME = process.env.HERMES_HOME || path.join(os.homedir(), '.hermes');
// token:优先用环境变量(APK 里也用同一个),否则生成并写到 ~/.hermes/gateway-token
const TOKEN_FILE = path.join(HERMES_HOME, 'gateway-token');
let TOKEN = process.env.HERMES_GATEWAY_TOKEN || '';
if (!TOKEN) {
  try {
    TOKEN = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
  } catch (_) { /* not yet created */ }
}
if (!TOKEN) {
  TOKEN = crypto.randomBytes(16).toString('hex');
  try {
    fs.mkdirSync(HERMES_HOME, { recursive: true });
    fs.writeFileSync(TOKEN_FILE, TOKEN, { mode: 0o600 });
  } catch (err) {
    console.error('[gateway] 无法写入 token 文件:', err.message);
  }
}

// hermes-acp 可执行文件解析:Termux 里通常在 PATH 上(pip install 后)
// 返回值可以是纯路径,也可以是"命令 参数"形式(如 "python -m acp_adapter.entry")
function resolveHermesAcp() {
  // 1. 环境变量显式指定(支持带参数,如 "python -m acp_adapter.entry")。
  //    用户显式指定即信任;可执行性由 spawn 报错兜底(HERMES_ACP_BIN 在 PATH 上时
  //    fs.existsSync 检查不到,所以不做存在性判断)。
  if (process.env.HERMES_ACP_BIN && process.env.HERMES_ACP_BIN.trim()) {
    return process.env.HERMES_ACP_BIN.trim();
  }
  // 2. Termux venv 常见位置
  const candidates = [
    path.join(HERMES_HOME, 'hermes-agent', '.venv', 'bin', 'hermes-acp'),
    path.join(os.homedir(), '.local', 'bin', 'hermes-acp'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // 3. 交给 PATH 解析
  return 'hermes-acp';
}

// --- 启动 hermes-acp 子进程 ---
let hermesProcess = null;
let acp = null;
let hermesExitInfo = null;

function startHermes() {
  const command = resolveHermesAcp();
  console.log(`[gateway] 启动 hermes-acp: ${command}`);
  console.log(`[gateway] HERMES_HOME=${HERMES_HOME}`);

  // "命令 参数..." 形式拆开 spawn(node/python 在 PATH 上时 exesistsSync 检查不到,
  // 但 spawn 会解析 PATH,所以多段形式直接交给 spawn)
  const parts = command.split(/\s+/);
  hermesProcess = spawn(parts[0], parts.slice(1), {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: HERMES_HOME,
    env: {
      ...process.env,
      HERMES_HOME,
      // 与桌面版一致:清掉可能干扰 provider 选择的系统变量
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_AUTH_TOKEN: '',
      ANTHROPIC_BASE_URL: '',
      VIRTUAL_ENV: '',
    },
  });

  hermesProcess.on('error', (err) => {
    console.error('[gateway] hermes-acp 启动失败:', err.message);
    hermesExitInfo = { error: err.message };
    hermesProcess = null;
  });

  hermesProcess.on('exit', (code, signal) => {
    console.log(`[gateway] hermes-acp 退出 (code=${code}, signal=${signal})`);
    hermesExitInfo = { code, signal };
    hermesProcess = null;
    acp = null;
    // 3 秒后自动重启,保持网关可用
    setTimeout(startHermes, 3000);
  });

  acp = new AcpClient(hermesProcess);

  // hermes 的通知 → 广播给所有 SSE 客户端
  acp.onNotification((notification) => {
    broadcast('notification', notification);
  });

  // reverse RPC(hermes 反向请求前端,如权限确认)→ 推给前端,等它 /respond 回来
  acp.onRequest('session/request_permission', (params) => {
    return handleReverseRequest('session/request_permission', params);
  });
  // 其它反向请求(fs/read_text_file 等)也可按需在此注册
}

// --- 引擎生命周期:stop / initialize(对齐桌面版 stopHermes/initializeHermes) ---

function stopHermes() {
  return new Promise((resolve) => {
    if (!hermesProcess) return resolve();
    // 给 exit handler 一次性短路,避免触发"3 秒后自动重启"
    const exitHandlers = hermesProcess.listeners('exit');
    hermesProcess.removeAllListeners('exit');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    hermesProcess.once('exit', finish);
    try {
      hermesProcess.stdin.end();
    } catch (_) { /* ignore */ }
    setTimeout(() => {
      try { hermesProcess && hermesProcess.kill('SIGKILL'); } catch (_) { /* ignore */ }
      finish();
    }, 3000);
    void exitHandlers; // 原有 exit 处理已摘除,重启定时器不会再次挂上
  });
}

async function initializeHermes() {
  // 与桌面版一致:spawn 后(重)发 initialize。等待 acp 就绪,最多 ~10s。
  for (let i = 0; i < 20 && !acp; i++) {
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!acp) throw new Error('hermes-acp 未就绪(重启后 10s 内未启动)');
  const result = await acp.request('initialize', {
    protocolVersion: 1,
    clientCapabilities: { fs: { readTextFile: false, writeTextFile: false } },
  });
  console.log('[gateway] hermes-acp initialized:', JSON.stringify(result).slice(0, 200));
  return result;
}

// --- SSE 事件推送 ---
const sseClients = new Set();

function broadcast(kind, payload) {
  const data = JSON.stringify({ kind, payload });
  const frame = `data: ${data}\n\n`;
  for (const res of sseClients) {
    try { res.write(frame); } catch (_) { /* client gone */ }
  }
}

// --- reverse request(权限确认)桥接 ---
// hermes 反向请求 → 分配 requestId 推给前端 → 前端 POST /respond 回结果
let reverseSeq = 1;
const pendingReverse = new Map(); // requestId → { resolve, reject, timer }

function handleReverseRequest(method, params) {
  return new Promise((resolve, reject) => {
    const requestId = `rev-${reverseSeq++}`;
    const timer = setTimeout(() => {
      pendingReverse.delete(requestId);
      reject(new Error(`reverse request "${method}" 超时`));
    }, 120_000);
    pendingReverse.set(requestId, { resolve, reject, timer });
    broadcast('reverse-request', { requestId, method, params });
  });
}

// --- HTTP 辅助 ---
function checkAuth(req, url) {
  // 优先看头;SSE(EventSource)不能设自定义头,故也接受 ?token= query 参数。
  if (req.headers['x-gateway-token'] === TOKEN) return true;
  if (url && url.searchParams.get('token') === TOKEN) return true;
  return false;
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Gateway-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 50 * 1024 * 1024) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// --- HTTP 服务 ---
const server = http.createServer(async (req, res) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Gateway-Token',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  // 健康探针:不需要 token,方便前端探测网关是否起来
  if (url.pathname === '/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      hermesRunning: !!hermesProcess,
      hermesExit: hermesExitInfo,
      port: PORT,
    });
  }

  // 其余接口都要 token
  if (!checkAuth(req, url)) {
    return sendJson(res, 401, { error: 'unauthorized: bad or missing X-Gateway-Token' });
  }

  // SSE 事件流
  if (url.pathname === '/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(': connected\n\n');
    sseClients.add(res);
    const keepAlive = setInterval(() => {
      try { res.write(': ping\n\n'); } catch (_) { /* ignore */ }
    }, 25_000);
    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
    return;
  }

  // 转发一次 ACP 请求
  if (url.pathname === '/rpc' && req.method === 'POST') {
    if (!acp) return sendJson(res, 503, { error: 'hermes-acp 未就绪' });
    try {
      const raw = await readBody(req);
      const { method, params, timeoutMs } = JSON.parse(raw || '{}');
      if (!method) return sendJson(res, 400, { error: 'missing method' });

      // 本地通道(网关自己处理,不转发 hermes):引擎重启。
      // 与桌面版 hermes:restart 一致:stop → start → initialize。
      if (method === 'hermes:restart') {
        try {
          await stopHermes();
          startHermes();
          await initializeHermes();
          return sendJson(res, 200, { result: { success: true } });
        } catch (err) {
          return sendJson(res, 200, { result: { success: false, error: err.message } });
        }
      }

      const result = await acp.request(method, params || {}, timeoutMs);
      return sendJson(res, 200, { result });
    } catch (err) {
      return sendJson(res, 200, { error: err.message || String(err) });
    }
  }

  // 前端回复 reverse request(权限确认)
  if (url.pathname === '/respond' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const { requestId, result, error } = JSON.parse(raw || '{}');
      const pending = pendingReverse.get(requestId);
      if (!pending) return sendJson(res, 404, { error: 'unknown requestId' });
      clearTimeout(pending.timer);
      pendingReverse.delete(requestId);
      if (error) pending.reject(new Error(error));
      else pending.resolve(result);
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  return sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[gateway] 监听 http://${HOST}:${PORT}`);
  console.log(`[gateway] token: ${TOKEN}`);
  console.log(`[gateway] token 文件: ${TOKEN_FILE}`);
  startHermes();
  // 与桌面版一致:引擎起来后自动做一次 initialize(失败不致命,hermes 重启逻辑兜底)
  initializeHermes().catch((err) => {
    console.error('[gateway] 初始 initialize 失败:', err.message);
  });
});

process.on('SIGINT', () => { try { acp && acp.shutdown(); } catch (_) {} process.exit(0); });
process.on('SIGTERM', () => { try { acp && acp.shutdown(); } catch (_) {} process.exit(0); });
