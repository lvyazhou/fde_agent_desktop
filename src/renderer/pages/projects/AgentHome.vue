<template>
  <div class="flex-1 flex min-h-0 overflow-hidden">
    <!-- Left: Session list -->
    <SessionList
      v-show="showSessionPanel"
      :projects="projects"
      :current-slug="currentSlug"
      @close="showSessionPanel = false"
      @select="selectProject"
      @new-chat="startNewChat"
    />

    <!-- Center: Chat area -->
    <ChatPanel
      ref="chatPanelRef"
      :slug="currentSlug"
      :project-name="currentProjectName"
      :messages="messages"
      :is-streaming="isStreaming"
      :elapsed-sec="elapsedSec"
      :is-loading="messagesLoading"
      :available-commands="availableCommands"
      :available-models="availableModels"
      :current-model="currentModel"
      @send="handleSend"
      @send-quick="handleQuickSend"
      @send-with-attachments="handleSendWithAttachments"
      @cancel="handleCancel"
      @navigate="handleNavigate"
      @fork="handleFork"
      @change-model="handleChangeModel"
    />

    <!-- Right: Info sidebar -->
    <InfoSidebar
      v-show="showInfoPanel"
      :slug="currentSlug"
      :project-meta="currentMeta"
      :skills="skills"
      :logs="logs"
      :suggested-questions="suggestedQuestions"
      :knowledge-files="knowledgeFiles"
      :context-usage="contextUsage"
      :plan-items="planItems"
      :current-model="currentModel"
      @close="showInfoPanel = false"
      @clear-logs="logs = []"
      @ask-question="handleQuickSend"
      @upload-knowledge="handleUploadKnowledge"
      @change-model="handleChangeModel"
      @browse-skills="handleBrowseSkills"
    />

    <!-- Toggle buttons (floating when panels are hidden) -->
    <button
      v-if="!showSessionPanel"
      @click="showSessionPanel = true"
      class="fixed top-14 left-2 z-10 w-8 h-8 rounded-lg bg-white/90 backdrop-blur border border-slate-200/60 text-slate-400 hover:text-blue-600 flex items-center justify-center shadow-sm transition-all cursor-pointer"
    >
      <i class="fa-solid fa-bars text-xs"></i>
    </button>
    <button
      v-if="!showInfoPanel"
      @click="showInfoPanel = true"
      class="fixed top-14 right-2 z-10 w-8 h-8 rounded-lg bg-white/90 backdrop-blur border border-slate-200/60 text-slate-400 hover:text-blue-600 flex items-center justify-center shadow-sm transition-all cursor-pointer"
    >
      <i class="fa-solid fa-circle-info text-xs"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import SessionList from '@/components/agent/SessionList.vue';
import ChatPanel from '@/components/agent/ChatPanel.vue';
import InfoSidebar from '@/components/agent/InfoSidebar.vue';
import { isMultimodalModel } from '@/composables/useChatComposer';

const router = useRouter();
const route = useRoute();
const chatPanelRef = ref(null);

// --- State ---
const projects = ref([]);
const currentSlug = ref('');
const currentProjectName = ref('');
const currentMeta = ref({});
const messages = ref([]);
const isStreaming = ref(false);
const messagesLoading = ref(false);
const suggestedQuestions = ref([]);
const contextUsage = ref({ used: 0, size: 0 });   // Feature 6: context window usage
const planItems = ref([]);                          // Feature 7: task plan
const availableCommands = ref([]);                  // Feature 5: slash commands
const currentModel = ref('');                       // Feature 1: current model name
const availableModels = ref([]);                    // Feature 1: model list for top-bar selector
const knowledgeFiles = ref([]);
const showSessionPanel = ref(true);
const showInfoPanel = ref(true);
const skills = ref([]);
const logs = ref([]);

let unsubscribe = null;
const isToolRunning = ref(false);
let streamEndTimer = null;
let currentStreamId = null;

// 等待"活着感"：流式期间跑一个本地秒表，头部据此显示耗时 + 递进安心文案。
// 引擎无 heartbeat，只能客户端计时。正常快速返回时秒表短暂出现即停，不打扰。
const elapsedSec = ref(0);
let elapsedTimer = null;
const startElapsed = () => {
  elapsedSec.value = 0;
  if (elapsedTimer) clearInterval(elapsedTimer);
  elapsedTimer = setInterval(() => { elapsedSec.value += 1; }, 1000);
};
const stopElapsed = () => {
  if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
};

// --- Message helpers ---
function createMessage(role, content, extra = {}) {
  return {
    role,
    content,
    thinkingSteps: [],
    thinkingDone: true,
    expanded: false,
    typingContent: '',
    timestamp: '',
    ...extra,
  };
}

function formatTimestamp(date) {
  const d = date || new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// --- Load projects list ---
const loadProjects = async () => {
  try {
    projects.value = await window.api.hermes.listProjects();
  } catch (e) {
    projects.value = [];
  }
};

// --- Select / load a project ---
const selectProject = async (slug) => {
  if (slug === currentSlug.value) return;
  currentSlug.value = slug;
  messages.value = [];
  logs.value = [];
  suggestedQuestions.value = [];
  messagesLoading.value = true;

  try {
    const data = await window.api.hermes.loadProject(slug);
    if (data) {
      currentMeta.value = data;
      currentProjectName.value = data.name || slug;
      if (data.messages && data.messages.length > 0) {
        const reqMsgs = data.messages.filter(m => m.tab !== 'iterate');
        if (reqMsgs.length) {
          messages.value = reqMsgs.map(m => createMessage(m.role || 'assistant', m.content || ''));
        }
      }
      if (data.sessionRecovered) {
        messages.value.push(createMessage('assistant', '检测到之前的会话已过期，已从项目文件中自动恢复上下文。'));
      }
    }
  } catch (e) {
    console.error('Failed to load project:', e);
  } finally {
    messagesLoading.value = false;
  }

  loadKnowledgeFiles();
  loadModels();  // 会话已建立，此时模型列表才有值
};

// --- Start new chat ---
const startNewChat = () => {
  currentSlug.value = '';
  currentProjectName.value = '';
  currentMeta.value = {};
  messages.value = [];
  logs.value = [];
  suggestedQuestions.value = [];
};

// --- Streaming handlers ---
const getOrCreateAssistantMsg = () => {
  const lastMsg = messages.value[messages.value.length - 1];
  // 未结束 → 继续追加
  if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.thinkingDone) {
    return lastMsg;
  }
  // 已结束但 streamId 匹配当前轮次 → 重新打开追加（防止竞态丢内容）
  if (lastMsg && lastMsg.role === 'assistant' && lastMsg.streamId && lastMsg.streamId === currentStreamId) {
    lastMsg.thinkingDone = false;
    return lastMsg;
  }
  // 否则新建
  const newMsg = createMessage('assistant', '', {
    thinkingSteps: [],
    thinkingDone: false,
    expanded: true,
    typingContent: '',
    timestamp: '',
    streamId: currentStreamId,
  });
  messages.value.push(newMsg);
  return newMsg;
};

const finalizeLastAssistantMessage = () => {
  stopElapsed();
  const lastMsg = messages.value[messages.value.length - 1];
  if (lastMsg && lastMsg.role === 'assistant') {
    lastMsg.thinkingDone = true;
    lastMsg.expanded = false;
    lastMsg.typingContent = '';
    lastMsg.timestamp = formatTimestamp();
    if (lastMsg.thinkingSteps && lastMsg.thinkingSteps.length > 0) {
      const toolSteps = lastMsg.thinkingSteps.filter(s => s.icon === 'fa-solid fa-wrench' || s.text.startsWith('✅'));
      const summary = toolSteps.length > 0 ? `全部完成（${toolSteps.length} 个操作）` : '回复完成';
      lastMsg.thinkingSteps.push({ text: summary, icon: 'fa-solid fa-flag-checkered', visible: true });
    }
    if (lastMsg.content && currentSlug.value) {
      window.api.hermes.saveMessage(currentSlug.value, { role: 'assistant', content: lastMsg.content, tab: 'requirement', timestamp: new Date().toISOString() });
      // Generate suggested follow-up questions
      generateSuggestions(lastMsg.content);
    }
  }
};

const generateSuggestions = async (lastResponse) => {
  // 通过独立 API 调用生成建议追问（不经过 hermes session，不干扰主对话流）
  try {
    const userMsgs = messages.value.filter(m => m.role === 'user');
    const lastUserMsg = userMsgs[userMsgs.length - 1]?.content || '';
    const result = await window.api.hermes.generateSuggestions(lastUserMsg, lastResponse);
    if (result?.suggestions?.length > 0) {
      suggestedQuestions.value = result.suggestions;
    } else {
      suggestedQuestions.value = ['继续深入讨论', '还有其他方面需要考虑吗？', '帮我总结一下'];
    }
  } catch (e) {
    suggestedQuestions.value = ['继续深入讨论', '还有其他方面需要考虑吗？', '帮我总结一下'];
  }
};

const scheduleStreamEnd = () => {
  if (isToolRunning.value) return;
  if (streamEndTimer) clearTimeout(streamEndTimer);
  streamEndTimer = setTimeout(() => {
    if (isStreaming.value && !isToolRunning.value) {
      finalizeLastAssistantMessage();
      isStreaming.value = false;
    }
  }, 120000);
};

const handleSessionUpdate = (data) => {
  const update = data?.update || data;
  if (!update) return;

  const type = update.type || update.sessionUpdate;
  console.log('[AgentHome] session-update:', type || 'NO_TYPE', JSON.stringify(data).slice(0, 200));

  // If type is null, still log it so we can debug
  if (!type) {
    logs.value.push({ id: Date.now(), type: 'info', status: '', time: formatTimestamp(), content: '⚠️ 收到未知事件: ' + JSON.stringify(data).slice(0, 100) });
    return;
  }
  const content = update.content || update.data || '';

  // Add to logs — log key events for the sidebar activity feed
  // ACP sessionUpdate types: agent_thought_chunk, agent_message_chunk, tool_call, tool_call_update, usage_update, plan, session_info_update
  if (type) {
    const logEntry = { id: Date.now() + Math.random(), type: 'info', status: '', time: formatTimestamp(), content: '' };
    if (type === 'agent_thought_chunk') {
      if (!logs.value.some(l => l.content === '🧠 推理中...')) {
        logEntry.type = 'thought';
        logEntry.content = '🧠 推理中...';
        logs.value.push(logEntry);
      }
    } else if (type === 'agent_message_chunk') {
      if (!logs.value.some(l => l.content === '📝 生成回复中')) {
        logEntry.type = 'info';
        logEntry.content = '📝 生成回复中';
        logs.value.push(logEntry);
      }
    } else if (type === 'tool_call') {
      logEntry.type = 'tool';
      logEntry.status = 'running';
      const toolName = update.title || update.toolName || update.name || 'tool';
      logEntry.content = `🔧 ${toolName}`;
      logs.value.push(logEntry);
      isToolRunning.value = true;
    } else if (type === 'tool_call_update') {
      const toolName = update.title || update.toolName || update.name || 'tool';
      const status = update.status || '';
      if (status === 'completed' || status === 'failed') {
        logEntry.type = 'tool';
        logEntry.status = status;
        logEntry.content = status === 'failed' ? `❌ ${toolName} 失败` : `✓ ${toolName} 完成`;
        logs.value.push(logEntry);
        isToolRunning.value = false;
      }
    } else if (type === 'usage_update') {
      const inputTokens = update.input_tokens || update.inputTokens || 0;
      const outputTokens = update.output_tokens || update.outputTokens || 0;
      if (inputTokens > 0 || outputTokens > 0) {
        logEntry.type = 'usage';
        logEntry.content = `Token: ${inputTokens} 输入 / ${outputTokens} 输出`;
        logs.value.push(logEntry);
      }
    } else if (type === 'error') {
      logEntry.type = 'error';
      logEntry.content = typeof content === 'string' ? content : JSON.stringify(content);
      logs.value.push(logEntry);
    }
    // Keep max 200 entries
    if (logs.value.length > 200) {
      logs.value = logs.value.slice(-150);
    }
  }

  // Handle streaming content — build chat messages from ACP events
  if (type === 'agent_message_chunk') {
    const msg = getOrCreateAssistantMsg();
    // ACP content is an array of content blocks: [{type: "text", text: "..."}]
    let text = '';
    if (Array.isArray(content)) {
      text = content.map(c => c.text || '').join('');
    } else if (typeof content === 'string') {
      text = content;
    } else if (content?.text) {
      text = content.text;
    }
    if (text) msg.content += text;
    // ⟦系统通知⟧ 前缀 = 引擎回执(如"已并入进行中的回答""已排队")，不是 AI 的真实回答。
    // 标记成系统提示，模板据此渲染成浅灰提示条而非 AI 气泡。
    if (typeof msg.content === 'string' && msg.content.startsWith('⟦系统通知⟧')) {
      msg.systemNotice = true;
      msg.displayContent = msg.content.replace(/^⟦系统通知⟧\s*/, '');
    }
    scheduleStreamEnd();
  } else if (type === 'agent_thought_chunk') {
    const msg = getOrCreateAssistantMsg();
    let text = '';
    if (Array.isArray(content)) {
      text = content.map(c => c.text || '').join('');
    } else if (typeof content === 'string') {
      text = content;
    } else if (content?.text) {
      text = content.text;
    }
    if (text) {
      const steps = msg.thinkingSteps;
      if (steps.length > 0 && steps[steps.length - 1].icon === 'fa-solid fa-brain' && !steps[steps.length - 1].finalized) {
        steps[steps.length - 1].text += text;
      } else {
        steps.push({ text, icon: 'fa-solid fa-brain', visible: true, finalized: false });
      }
    }
    scheduleStreamEnd();
  } else if (type === 'tool_call') {
    const msg = getOrCreateAssistantMsg();
    const toolName = update.title || update.toolName || 'tool';
    msg.thinkingSteps.push({ text: `调用工具: ${toolName}`, icon: 'fa-solid fa-wrench', visible: true });
    if (streamEndTimer) clearTimeout(streamEndTimer);
  } else if (type === 'tool_call_update') {
    const status = update.status || '';
    if (status === 'completed' || status === 'failed') {
      const msg = getOrCreateAssistantMsg();
      const toolName = update.title || update.toolName || 'tool';
      if (status === 'failed') {
        msg.thinkingSteps.push({ text: `❌ ${toolName} 失败`, icon: 'fa-solid fa-circle-xmark', visible: true });
      } else {
        msg.thinkingSteps.push({ text: `✅ ${toolName} 完成`, icon: 'fa-solid fa-circle-check', visible: true });
      }
      scheduleStreamEnd();
    }
  }

  // Session end — hermes doesn't send explicit "end" for streaming; rely on scheduleStreamEnd timeout
  // But if we receive session_info_update with a title, finalize
  if (type === 'session_info_update') {
    if (update.title) {
      currentProjectName.value = update.title;
      if (currentSlug.value) {
        window.api.hermes.updateProjectMeta(currentSlug.value, { name: update.title });
        loadProjects();
      }
    }
    // 仅当 hermes 推送的模型与当前显示的「裸名」不同才覆盖，避免带前缀格式差异导致闪回
    if (update.model) {
      const bare = (s) => String(s || '').includes(':') ? String(s).slice(String(s).lastIndexOf(':') + 1) : String(s || '');
      if (bare(update.model) !== bare(currentModel.value)) currentModel.value = update.model;
    }
  }
  // Feature 7: Plan updates
  if (type === 'plan') {
    const entries = update.entries || update.items || content;
    if (Array.isArray(entries)) {
      planItems.value = entries.map(e => ({
        content: e.content || e.text || '',
        status: e.status || 'pending',
      }));
    }
  }
  // Feature 5: Available commands update
  if (type === 'available_commands_update') {
    const commands = update.commands || content;
    if (Array.isArray(commands)) {
      availableCommands.value = commands;
    }
  }
};

// --- Send message ---
const handleSend = async (text) => {
  if (!text.trim() || isStreaming.value) return;

  // Immediately show user message + AI thinking animation (before any async work)
  messages.value.push(createMessage('user', text));
  isStreaming.value = true;
  startElapsed();
  currentStreamId = Date.now().toString();

  messages.value.push(createMessage('assistant', '', {
    thinkingSteps: [{ text: '已发送请求，等待 AI 响应...', icon: 'fa-solid fa-cloud-arrow-up', visible: true }],
    thinkingDone: false,
    expanded: true,
    typingContent: '',
    timestamp: '',
    streamId: currentStreamId,
  }));

  await nextTick();
  chatPanelRef.value?.scrollToBottom?.();

  // Auto-create a new chat session if none selected — use first message as name
  if (!currentSlug.value) {
    const chatSlug = `chat-${Date.now()}`;
    const chatName = text.slice(0, 20).replace(/\n/g, ' ').trim() || '新对话';
    currentSlug.value = chatSlug;
    currentProjectName.value = chatName;
    try {
      await window.api.hermes.createProject({ name: chatName, requirement: text, slug: chatSlug });
      loadProjects(); // 不 await，后台刷新即可
    } catch (e) {
      console.error('Auto-create chat failed:', e);
      isStreaming.value = false;
      stopElapsed();
      messages.value.pop(); // 移除 AI 占位消息
      return;
    }
  }

  // Save user message
  window.api.hermes.saveMessage(currentSlug.value, { role: 'user', content: text, tab: 'requirement', timestamp: new Date().toISOString() });

  try {
    await window.api.hermes.prompt(currentSlug.value, text);
    // 延迟兜底：正常情况由 agent_message_end 事件结束，RPC 返回只作为安全回退
    setTimeout(() => {
      if (isStreaming.value) {
        finalizeLastAssistantMessage();
        isStreaming.value = false;
        isToolRunning.value = false;
      }
    }, 2000);
  } catch (e) {
    console.error('Prompt failed:', e);
    isStreaming.value = false;
    stopElapsed();
  }
};

const handleQuickSend = (text) => {
  handleSend(text);
};

const handleSendWithAttachments = async (text, attachments) => {
  if (!text.trim() && (!attachments || attachments.length === 0)) return;
  if (isStreaming.value) return;

  // 当前模型不支持多模态时，拦截带附件的发送并引导切换（避免卡死）。
  if (attachments && attachments.length > 0 && !isMultimodalModel(currentModel.value)) {
    const bare = String(currentModel.value || '').includes('/')
      ? currentModel.value.split('/').pop()
      : currentModel.value;
    alert(`当前模型「${bare || '未知'}」不支持图片/文件解读。\n\n请点顶部模型下拉框切换到 Claude 等多模态模型后再发送。`);
    return;
  }

  // Immediately show UI feedback
  messages.value.push(createMessage('user', text, { attachments }));
  isStreaming.value = true;
  startElapsed();
  currentStreamId = Date.now().toString();

  messages.value.push(createMessage('assistant', '', {
    thinkingSteps: [{ text: '已发送请求，等待 AI 响应...', icon: 'fa-solid fa-cloud-arrow-up', visible: true }],
    thinkingDone: false, expanded: true, typingContent: '', timestamp: '',
    streamId: currentStreamId,
  }));

  await nextTick();
  chatPanelRef.value?.scrollToBottom?.();

  // Auto-create project if needed (after UI already responded)
  if (!currentSlug.value) {
    const chatSlug = `chat-${Date.now()}`;
    currentSlug.value = chatSlug;
    currentProjectName.value = '新对话';
    try {
      await window.api.hermes.createProject({ name: '新对话', requirement: text, slug: chatSlug });
      loadProjects(); // 不 await，后台刷新即可
    } catch (e) {
      console.error('Auto-create chat failed:', e);
      isStreaming.value = false;
      stopElapsed();
      messages.value.pop();
      return;
    }
  }

  window.api.hermes.saveMessage(currentSlug.value, { role: 'user', content: text, tab: 'requirement', timestamp: new Date().toISOString() });

  try {
    // 附件对象来自 Vue reactive，元素是 Proxy，直接过 IPC 会报
    // "An object could not be cloned"（structured clone 无法序列化 Proxy）。
    // 先摊平成纯对象，只保留可序列化的原始字段。
    const plainAttachments = Array.isArray(attachments)
      ? attachments.map((a) => ({
          type: a.type,
          name: a.name,
          media_type: a.media_type,
          ...(typeof a.text === 'string' ? { text: a.text } : {}),
          ...(a.data ? { data: a.data } : {}),
        }))
      : attachments;
    await window.api.hermes.prompt(currentSlug.value, text, plainAttachments);
    // 延迟兜底：正常情况由 agent_message_end 事件结束
    setTimeout(() => {
      if (isStreaming.value) {
        finalizeLastAssistantMessage();
        isStreaming.value = false;
        isToolRunning.value = false;
      }
    }, 2000);
  } catch (e) {
    console.error('Prompt with attachments failed:', e);
    isStreaming.value = false;
    stopElapsed();
  }
};

const handleCancel = async () => {
  if (!currentSlug.value) return;
  try {
    await window.api.hermes.cancel(currentSlug.value);
  } catch (e) {
    console.error('Cancel failed:', e);
  }
  finalizeLastAssistantMessage();
  isStreaming.value = false;
};

// Feature 4: Fork session
const handleFork = async (msgIndex) => {
  if (!currentSlug.value) return;
  try {
    const result = await window.api.hermes.forkSession(currentSlug.value);
    if (result?.success) {
      messages.value.push(createMessage('assistant', `✅ 会话已从第 ${msgIndex + 1} 条消息处分叉，新会话已创建。`));
      await loadProjects();
    }
  } catch (e) {
    console.error('Fork failed:', e);
  }
};

const handleNavigate = (tab) => {
  if (currentSlug.value) {
    router.push(`/projects/${currentSlug.value}?tab=${tab}`);
  }
};

// --- Feature 1: Model switching ---
// 加载可选模型列表 + 回填当前模型（顶栏下拉框数据源）
const loadModels = async (retries = 5) => {
  try {
    const res = await window.api?.hermes?.listModels?.();
    const list = (res && res.models) || [];
    if (list.length > 0) availableModels.value = list;
    // 当前模型：优先 session 返回的 current
    if (res?.current && !currentModel.value) currentModel.value = res.current;
    // 列表可能来自 main 的 warmup session（异步），空则稍后重试
    if (list.length === 0 && retries > 0) {
      setTimeout(() => loadModels(retries - 1), 1200);
    }
  } catch (e) {
    console.error('List models failed:', e);
  }
  // 初始当前模型兜底：config.yaml（持久化真值），避免顶栏空白
  if (!currentModel.value) {
    try {
      const cfg = await window.api?.hermes?.readConfigModel?.();
      if (cfg?.model) currentModel.value = cfg.model;
    } catch (_) { /* ignore */ }
  }
};

const handleChangeModel = async (modelId) => {
  // 乐观更新：立即把胶囊显示切过去，不等后端回执（体验上"点了就变"）
  currentModel.value = modelId;
  if (!currentSlug.value) {
    // 无活动会话时也持久化，下次启动生效
    try {
      await window.api?.hermes?.setConfigModel?.(modelId);
    } catch (e) {
      console.error('Persist model failed:', e);
    }
    return;
  }
  try {
    const result = await window.api.hermes.setModel(currentSlug.value, modelId);
    if (!result?.success) {
      console.warn('Set model returned:', result);
    } else if (result.restarted) {
      // 引擎已重启、旧 sessionId 已清空：重新加载当前项目，用新模型重建会话
      const slug = currentSlug.value;
      try { await window.api.hermes.loadProject(slug); } catch (_) { /* 下次发消息也会自动重建 */ }
    }
  } catch (e) {
    console.error('Set model failed:', e);
  }
};

// --- Feature 12: Skills market ---
const handleBrowseSkills = async () => {
  try {
    const result = await window.api.hermes.browseSkills();
    if (result?.skills) {
      const skillList = result.skills.map(s => `• **${s.name}** — ${s.description}`).join('\n');
      messages.value.push(createMessage('assistant', `📦 已安装的技能（${result.skills.length} 个）：\n\n${skillList}\n\n💡 提示：在对话中输入 \`/skill_view 技能名\` 可以查看技能详情并激活。`));
    }
  } catch (e) {
    console.error('Browse skills failed:', e);
  }
};

// --- Knowledge base ---
const loadKnowledgeFiles = async () => {
  if (!currentSlug.value) { knowledgeFiles.value = []; return; }
  try {
    const result = await window.api.hermes.listFiles(currentSlug.value, 'knowledge');
    if (result && result.success) {
      knowledgeFiles.value = (result.files || []).filter(f => !f.isDirectory).map(f => f.name);
    } else {
      knowledgeFiles.value = [];
    }
  } catch (e) {
    knowledgeFiles.value = [];
  }
};

const handleUploadKnowledge = async () => {
  if (!currentSlug.value) return;
  try {
    const result = await window.api.hermes.uploadKnowledge(currentSlug.value);
    if (result && result.success) {
      await loadKnowledgeFiles();
    }
  } catch (e) {
    console.error('Upload knowledge failed:', e);
  }
};

// --- Load skills ---
const loadSkills = async () => {
  try {
    const result = await window.api.skills.scanLocal();
    skills.value = result?.skills || [];
  } catch (e) {
    skills.value = [];
  }
};

// --- Auto-scroll on message changes ---
watch(messages, () => {
  nextTick(() => {
    chatPanelRef.value?.scrollToBottom?.();
  });
}, { deep: true });

// --- 教练陪练:从工作台 ?coach=1 进入时,自动起一局陪练 ---
const COACH_OPENING = '/fde-coach\n\n(系统:进入 FDE 教练陪练模式。请先用教练口吻做简短开场,说明玩法——你扮演甲方客户,我用 SPIN + 七维挖需求;我随时说"复盘"你就按六维打分表点评。然后让我选行业和客户类型。)';
// 用户气泡里展示的干净文案(系统指令对用户隐藏)
const COACH_OPENING_DISPLAY = '开始 FDE 教练陪练';

const startCoachSession = async () => {
  // 新建一个陪练会话
  startNewChat();
  const chatSlug = `coach-${Date.now()}`;
  currentSlug.value = chatSlug;
  currentProjectName.value = 'FDE 教练陪练';

  // 先立刻给出反馈：展示用户开场消息 + "正在启动教练"动画，避免建会话期间界面空白
  messages.value.push(createMessage('user', COACH_OPENING, { displayContent: COACH_OPENING_DISPLAY }));
  isStreaming.value = true;
  currentStreamId = Date.now().toString();
  messages.value.push(createMessage('assistant', '', {
    thinkingSteps: [{ text: '正在启动 FDE 教练陪练…', icon: 'fa-solid fa-headset', visible: true }],
    thinkingDone: false,
    expanded: true,
    typingContent: '',
    timestamp: '',
    streamId: currentStreamId,
  }));
  await nextTick();
  chatPanelRef.value?.scrollToBottom?.();

  // 后台建会话
  try {
    await window.api.hermes.createProject({ name: 'FDE 教练陪练', requirement: 'FDE 教练陪练', slug: chatSlug });
    loadProjects(); // 不 await，后台刷新
  } catch (e) {
    console.error('Create coach session failed:', e);
    isStreaming.value = false;
    messages.value.pop(); // 移除 AI 占位
    return;
  }

  // 会话已就绪，直接发送开场 prompt（currentSlug 已设，handleSend 不会重复建项目，也会复用已展示的占位消息）
  // 持久化存干净文案，避免历史记录里露出系统指令；prompt 仍发完整指令给 agent
  await window.api.hermes.saveMessage(currentSlug.value, { role: 'user', content: COACH_OPENING_DISPLAY, tab: 'requirement', timestamp: new Date().toISOString() });
  try {
    await window.api.hermes.prompt(currentSlug.value, COACH_OPENING);
    setTimeout(() => {
      if (isStreaming.value) {
        finalizeLastAssistantMessage();
        isStreaming.value = false;
        isToolRunning.value = false;
      }
    }, 2000);
  } catch (e) {
    console.error('Coach prompt failed:', e);
    isStreaming.value = false;
  }
};

// --- Lifecycle ---
onMounted(async () => {
  await loadProjects();
  loadSkills();
  loadModels();

  if (window.api?.hermes?.onSessionUpdate) {
    unsubscribe = window.api.hermes.onSessionUpdate(handleSessionUpdate);
  }

  // 优先:工作台跳来的教练陪练
  if (route.query.coach) {
    // 清掉 query,避免刷新重复触发
    router.replace({ path: '/chat' });
    await startCoachSession();
    return;
  }

  // 否则:自动选中最近的项目/对话
  if (projects.value.length > 0) {
    await selectProject(projects.value[0].slug);
  }
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
  if (streamEndTimer) clearTimeout(streamEndTimer);
  stopElapsed();
});
</script>
