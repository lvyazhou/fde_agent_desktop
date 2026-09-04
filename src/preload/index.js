const { contextBridge, ipcRenderer } = require('electron');

const validInvokeChannels = new Set([
  'app:get-version',
  'app:get-platform',
  'window:is-maximized',
  'skills:scan-local',
  'shell:open-path',
  'shell:open-external',
  'fs:read-file',
  'fs:read-directory',
  'fs:get-home-dir',
  'hermes:list-projects',
  'hermes:create-project',
  'hermes:load-project',
  'hermes:delete-project',
  'hermes:prompt',
  'hermes:transcribe',
  'hermes:save-recording',
  'hermes:save-attachment',
  'hermes:cancel',
  'hermes:read-file',
  'hermes:write-file',
  'hermes:list-files',
  'hermes:prototype-url',
  'hermes:export-zip',
  'hermes:export-word',
  'hermes:save-message',
  'hermes:update-project-meta',
  'hermes:upload-knowledge',
  'hermes:open-in-browser',
  'hermes:read-env',
  'hermes:write-env',
  'hermes:sync-provider-key',
  'hermes:restart',
  // New: 12 features
  'hermes:list-models',
  'hermes:set-model',
  'hermes:read-config-model',
  'hermes:set-config-model',
  'hermes:list-sessions',
  'hermes:fork-session',
  'hermes:permission-respond',
  'hermes:browse-skills',
  'hermes:generate-suggestions',
  // FDE 作战手册知识库
  'handbook:get-manifest',
  'handbook:read-md',
  'handbook:read-html',
  'handbook:open',
  'handbook:save-as',
  'handbook:upload',
  'handbook:scan-projects',
  'handbook:archive-from-project',
  'handbook:delete',
  // 技能库
  'skills:get-manifest',
  'skills:read',
  'skills:open',
  'skills:import-zip',
  'skills:delete',
  // 环境自检 + 连通性
  'env:check',
  'env:test-connection',
  // 授权
  'license:status',
  'license:machine-sn',
  'license:import',
]);

const validSendChannels = new Set([
  'window:minimize',
  'window:maximize',
  'window:close',
]);

const validOnChannels = new Set([
  'window:maximized-changed',
  'app:notify',
  'hermes:session-update',
  'hermes:permission-request',
  'skills:import-progress',
]);

function invoke(channel, payload) {
  if (!validInvokeChannels.has(channel)) {
    throw new Error(`Unsupported invoke channel: ${channel}`);
  }
  return ipcRenderer.invoke(channel, payload);
}

function send(channel, payload) {
  if (!validSendChannels.has(channel)) {
    throw new Error(`Unsupported send channel: ${channel}`);
  }
  ipcRenderer.send(channel, payload);
}

function on(channel, handler) {
  if (!validOnChannels.has(channel)) {
    throw new Error(`Unsupported event channel: ${channel}`);
  }
  const listener = (_event, ...args) => handler(...args);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

contextBridge.exposeInMainWorld('api', {
  // Window controls
  window: {
    minimize() { send('window:minimize'); },
    maximize() { send('window:maximize'); },
    close() { send('window:close'); },
    isMaximized() { return invoke('window:is-maximized'); },
    onMaximizedChanged(handler) { return on('window:maximized-changed', handler); },
  },

  // App info
  app: {
    getVersion() { return invoke('app:get-version'); },
    getPlatform() { return invoke('app:get-platform'); },
    onNotify(handler) { return on('app:notify', handler); },
  },

  // Shell
  shell: {
    openPath(targetPath) { return invoke('shell:open-path', targetPath); },
    openExternal(url) { return invoke('shell:open-external', url); },
  },

  // Hermes project management
  hermes: {
    listProjects() { return invoke('hermes:list-projects'); },
    createProject(params) { return invoke('hermes:create-project', params); },
    loadProject(slug) { return invoke('hermes:load-project', slug); },
    deleteProject(slug) { return invoke('hermes:delete-project', slug); },
    prompt(slug, text, attachments) {
      // 附件常来自 Vue reactive（元素是 Proxy），structured clone 无法序列化 →
      // ipcRenderer.invoke 抛 "An object could not be cloned"。这里统一摊平成
      // 纯对象，只保留可序列化字段，覆盖所有调用方（各聊天窗口）。
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
    // New: 12 features
    listModels() { return invoke('hermes:list-models'); },
    setModel(slug, modelId) { return invoke('hermes:set-model', { slug, modelId }); },
    readConfigModel() { return invoke('hermes:read-config-model'); },
    setConfigModel(modelId) { return invoke('hermes:set-config-model', { modelId }); },
    listSessions(cursor, cwd) { return invoke('hermes:list-sessions', { cursor, cwd }); },
    forkSession(slug) { return invoke('hermes:fork-session', { slug }); },
    respondPermission(requestId, result) { return invoke('hermes:permission-respond', { requestId, result }); },
    browseSkills(query) { return invoke('hermes:browse-skills', { query }); },
    generateSuggestions(userMessage, aiResponse) { return invoke('hermes:generate-suggestions', { userMessage, aiResponse }); },
    onSessionUpdate(handler) { return on('hermes:session-update', handler); },
    onPermissionRequest(handler) { return on('hermes:permission-request', handler); },
  },

  // File system
  fs: {
    readFile(filePath) { return invoke('fs:read-file', filePath); },
    readDirectory(dirPath) { return invoke('fs:read-directory', dirPath); },
    getHomeDir() { return invoke('fs:get-home-dir'); },
  },

  // Skills
  skills: {
    scanLocal() { return invoke('skills:scan-local'); },
    getManifest() { return invoke('skills:get-manifest'); },
    read(skill, file) { return invoke('skills:read', { skill, file }); },
    open(skill) { return invoke('skills:open', { skill }); },
    importZip() { return invoke('skills:import-zip'); },
    onImportProgress(handler) { return on('skills:import-progress', handler); },
    delete(skill) { return invoke('skills:delete', { skill }); },
  },

  // FDE 作战手册知识库(工作台)
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

  // 环境自检 + LLM 连通性(首次启动向导)
  env: {
    check() { return invoke('env:check'); },
    testConnection(params) { return invoke('env:test-connection', params); },
  },

  // 授权(首次启动向导)
  license: {
    status() { return invoke('license:status'); },
    machineSn() { return invoke('license:machine-sn'); },
    import() { return invoke('license:import'); },
  },
});
