/**
 * 安卓(Capacitor)平台桥接层。
 * ====================================
 * 桌面版:preload 的 contextBridge 把 65 个 IPC 通道包成 window.api.*。
 * 安卓版:没有 Electron IPC,改成连 Termux 里的本地网关(HTTP + SSE)。
 *
 * 关键设计:重造 invoke/send/on 三个底层原语,让它们走网关;然后用
 * 与 preload 完全相同的 API 外壳结构暴露成 window.api,UI 组件零改动。
 *
 * 网关契约(见 android/gateway/server.js):
 *   POST /rpc      {method, params}          → {result} | {error}
 *   GET  /events   SSE                        → {kind:'notification'|'reverse-request', payload}
 *   POST /respond  {requestId, result|error}  → 回复权限确认
 *   GET  /health                              → 探活
 */

// 网关地址与 token:安卓端从本地存储读,允许用户在设置里改。
// 默认连本机 Termux。token 由网关生成,首次需用户从 Termux 复制过来(或走配对流程)。
function getGatewayConfig() {
  let port = 43918;
  let token = '';
  let host = '127.0.0.1';
  try {
    port = parseInt(localStorage.getItem('hermes.gateway.port') || '43918', 10);
    token = localStorage.getItem('hermes.gateway.token') || '';
    host = localStorage.getItem('hermes.gateway.host') || '127.0.0.1';
  } catch (_) { /* localStorage 不可用时用默认 */ }
  return { base: `http://${host}:${port}`, token };
}

// --- 底层原语:invoke ---
async function invoke(channel, payload) {
  // channel 就是 ACP handler 名,如 'hermes:prompt'。网关侧按 channel 分发。
  const { base, token } = getGatewayConfig();
  const res = await fetch(`${base}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Gateway-Token': token },
    body: JSON.stringify({ method: channel, params: payload }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

// --- 底层原语:send(单向,无返回) ---
// 桌面版仅 window:* 用 send;安卓无窗口控制,直接吞掉(no-op)。
function send(channel, _payload) {
  // window:minimize/maximize/close 在安卓无意义
  if (channel.startsWith('window:')) return;
  // 其余按需扩展
}

// --- 底层原语:on(事件订阅) ---
// 通过单条 SSE 连接分发所有事件。返回取消订阅函数。
const listeners = new Map(); // channel → Set<handler>
let sse = null;
let sseRetry = null;

function ensureSse() {
  if (sse) return;
  const { base, token } = getGatewayConfig();
  // EventSource 不支持自定义头,token 走 query 参数(网关需同时接受 query token)
  sse = new EventSource(`${base}/events?token=${encodeURIComponent(token)}`);

  sse.onmessage = (evt) => {
    let msg;
    try { msg = JSON.parse(evt.data); } catch (_) { return; }
    const { kind, payload } = msg;

    if (kind === 'notification') {
      // payload 是 hermes 的原始 JSON-RPC 通知:{method, params}
      routeNotification(payload);
    } else if (kind === 'reverse-request') {
      // hermes 反向请求(权限确认):{requestId, method, params}
      routeReverseRequest(payload);
    }
  };

  sse.onerror = () => {
    // SSE 断线自动重连
    try { sse.close(); } catch (_) {}
    sse = null;
    clearTimeout(sseRetry);
    sseRetry = setTimeout(ensureSse, 2000);
  };
}

// 把 hermes 通知映射回桌面版的事件通道名,让 on() 的订阅者收到
function routeNotification(notification) {
  const method = notification && notification.method;
  // hermes 的 session/update 通知 → 桌面版的 'hermes:session-update'
  if (method === 'session/update') {
    emit('hermes:session-update', notification.params);
  } else if (method === 'app:notify') {
    emit('app:notify', notification.params);
  } else {
    // 其它通知也按 method 原样广播,方便扩展
    emit(method, notification.params);
  }
}

function routeReverseRequest(payload) {
  // 权限确认:桌面版走 'hermes:permission-request' 事件,前端回 respondPermission
  if (payload.method === 'session/request_permission') {
    emit('hermes:permission-request', { requestId: payload.requestId, ...payload.params });
  }
}

function emit(channel, ...args) {
  const set = listeners.get(channel);
  if (!set) return;
  for (const h of set) {
    try { h(...args); } catch (err) { console.error('[bridge] listener error', err); }
  }
}

function on(channel, handler) {
  if (!listeners.has(channel)) listeners.set(channel, new Set());
  listeners.get(channel).add(handler);
  ensureSse();
  return () => {
    const set = listeners.get(channel);
    if (set) set.delete(handler);
  };
}

// 权限确认的回复:走 /respond
async function respondReverse(requestId, result, error) {
  const { base, token } = getGatewayConfig();
  await fetch(`${base}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Gateway-Token': token },
    body: JSON.stringify({ requestId, result, error }),
  });
}

// --- 与 preload 完全一致的 API 外壳 ---
// P0/P1 通道走网关;P2(桌面专属)在安卓降级为 no-op 或本地实现。
const api = {
  // 窗口控制:安卓无窗口 → no-op
  window: {
    minimize() {}, maximize() {}, close() {},
    isMaximized() { return Promise.resolve(false); },
    onMaximizedChanged() { return () => {}; },
  },

  app: {
    getVersion() { return invoke('app:get-version').catch(() => 'android'); },
    getPlatform() { return Promise.resolve('android'); },
    onNotify(handler) { return on('app:notify', handler); },
  },

  // shell:安卓用系统浏览器打开外链(Capacitor Browser 插件在 main.js 注入)
  shell: {
    openPath() { return Promise.resolve(); }, // 安卓无桌面文件管理器概念
    openExternal(url) { window.open(url, '_blank'); return Promise.resolve(); },
  },

  // Hermes:核心链路,全部走网关。签名与 preload 一一对应。
  hermes: {
    listProjects(options) { return invoke('hermes:list-projects', options); },
    createProject(params) { return invoke('hermes:create-project', params); },
    loadProject(slug) { return invoke('hermes:load-project', slug); },
    deleteProject(slug) { return invoke('hermes:delete-project', slug); },
    prompt(slug, text, attachments) {
      // 与桌面版一致:摊平 attachments 为纯对象(网关侧走 JSON,不涉及 structured clone,
      // 但保持同样清洗逻辑以对齐后端期望的形状)
      const clean = Array.isArray(attachments)
        ? attachments.map((a) => ({
            type: a && a.type,
            name: a && a.name,
            media_type: a && a.media_type,
            ...(a && typeof a.text === 'string' ? { text: a.text } : {}),
            ...(a && a.data ? { data: a.data } : {}),
          }))
        : attachments;
      return invoke('hermes:prompt', { slug, text, attachments: clean });
    },
    transcribe(audioBase64, mimeType) { return invoke('hermes:transcribe', { audioBase64, mimeType }); },
    saveRecording(slug, audioBase64, ext) { return invoke('hermes:save-recording', { slug, audioBase64, ext }); },
    saveAttachment(payload) { return invoke('hermes:save-attachment', payload); },
    cancel(slug) { return invoke('hermes:cancel', slug); },
    readFile(slug, relativePath) { return invoke('hermes:read-file', { slug, relativePath }); },
    readFileDataUri(slug, relativePath) { return invoke('hermes:read-file-data-uri', { slug, relativePath }); },
    writeFile(slug, relativePath, content) { return invoke('hermes:write-file', { slug, relativePath, content }); },
    listFiles(slug, dir, recursive) { return invoke('hermes:list-files', { slug, dir, recursive }); },
    prototypeUrl(slug, file) { return invoke('hermes:prototype-url', { slug, file }); },
    exportZip(slug) { return invoke('hermes:export-zip', slug); },
    exportWord(slug) { return invoke('hermes:export-word', { slug }); },
    saveMessage(slug, message) { return invoke('hermes:save-message', { slug, message }); },
    updateProjectMeta(slug, updates) { return invoke('hermes:update-project-meta', { slug, updates }); },
    uploadKnowledge(slug) { return invoke('hermes:upload-knowledge', { slug }); },
    openInBrowser(slug, file) { return invoke('hermes:open-in-browser', { slug, file }); },
    readEnv() { return invoke('hermes:read-env'); },
    writeEnv(content) { return invoke('hermes:write-env', { content }); },
    syncProviderKey(apiKey, baseUrl, model) { return invoke('hermes:sync-provider-key', { apiKey, baseUrl, model }); },
    restart() { return invoke('hermes:restart'); },
    listModels() { return invoke('hermes:list-models'); },
    setModel(slug, modelId) { return invoke('hermes:set-model', { slug, modelId }); },
    readConfigModel() { return invoke('hermes:read-config-model'); },
    setConfigModel(modelId) { return invoke('hermes:set-config-model', { modelId }); },
    listSessions(cursor, cwd) { return invoke('hermes:list-sessions', { cursor, cwd }); },
    forkSession(slug) { return invoke('hermes:fork-session', { slug }); },
    respondPermission(requestId, result) {
      // 安卓走 /respond(不是普通 rpc),因为这是对 reverse-request 的回复
      return respondReverse(requestId, result);
    },
    browseSkills(query) { return invoke('hermes:browse-skills', { query }); },
    generateSuggestions(userMessage, aiResponse) { return invoke('hermes:generate-suggestions', { userMessage, aiResponse }); },
    resolveFileRef(slug, ref) { return invoke('hermes:resolve-file-ref', { slug, ref }); },
    onSessionUpdate(handler) { return on('hermes:session-update', handler); },
    onPermissionRequest(handler) { return on('hermes:permission-request', handler); },
  },

  fs: {
    readFile(filePath) { return invoke('fs:read-file', filePath); },
    readDirectory(dirPath) { return invoke('fs:read-directory', dirPath); },
    getHomeDir() { return invoke('fs:get-home-dir'); },
    saveLocalFile(srcPath) { return invoke('fs:save-local-file', srcPath); },
    readLocalFileDataUri(filePath) { return invoke('fs:read-local-file-data-uri', filePath); },
  },

  skills: {
    scanLocal() { return invoke('skills:scan-local'); },
    getManifest() { return invoke('skills:get-manifest'); },
    read(skill, file) { return invoke('skills:read', { skill, file }); },
    open(skill) { return invoke('skills:open', { skill }); },
    importZip() { return invoke('skills:import-zip'); },
    onImportProgress(handler) { return on('skills:import-progress', handler); },
    delete(skill) { return invoke('skills:delete', { skill }); },
  },

  handbook: {
    getManifest() { return invoke('handbook:get-manifest'); },
    readMd(stage, file) { return invoke('handbook:read-md', { stage, file }); },
    readHtml(stage, file) { return invoke('handbook:read-html', { stage, file }); },
    open(stage, file) { return invoke('handbook:open', { stage, file }); },
    saveAs(stage, file) { return invoke('handbook:save-as', { stage, file }); },
    upload(stage, category) { return invoke('handbook:upload', { stage, category }); },
    scanProjects() { return invoke('handbook:scan-projects'); },
    archiveFromProject(payload) { return invoke('handbook:archive-from-project', payload); },
    delete(stage, file) { return invoke('handbook:delete', { stage, file }); },
  },

  env: {
    check() { return invoke('env:check'); },
    testConnection(params) { return invoke('env:test-connection', params); },
  },

  // 授权:安卓 MVP 阶段跳过 license 校验(桌面机器指纹方案不适用于安卓)
  license: {
    status() { return Promise.resolve({ ok: true, skipped: true, reason: 'android-mvp' }); },
    machineSn() { return Promise.resolve('android-device'); },
    import() { return Promise.resolve({ ok: true, skipped: true }); },
  },

  // 安卓专属:网关连接管理(设置页用)
  _gateway: {
    getConfig: getGatewayConfig,
    setConfig({ host, port, token }) {
      try {
        if (host != null) localStorage.setItem('hermes.gateway.host', host);
        if (port != null) localStorage.setItem('hermes.gateway.port', String(port));
        if (token != null) localStorage.setItem('hermes.gateway.token', token);
      } catch (_) {}
    },
    async health() {
      const { base } = getGatewayConfig();
      try {
        const res = await fetch(`${base}/health`);
        return await res.json();
      } catch (err) {
        return { ok: false, error: err.message };
      }
    },
  },
};

export function installAndroidBridge() {
  window.api = api;
  return api;
}

export default api;
