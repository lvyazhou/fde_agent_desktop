<template>
  <div class="flex-1 flex min-h-0 overflow-hidden">
    <!-- Left: file tree -->
    <aside class="code-sidebar" :class="{ 'code-sidebar--collapsed': !showTree }">
      <div class="code-sidebar-head">
        <div class="flex items-center gap-2 min-w-0">
          <i class="fa-solid fa-folder-tree text-blue-600 text-xs"></i>
          <span class="text-[13px] font-semibold text-slate-700 truncate" :title="workspace?.path">{{ workspace?.name || '工作区' }}</span>
        </div>
        <button class="icon-btn" title="刷新文件树" @click="refreshTree">
          <i class="fa-solid fa-arrows-rotate text-[11px]"></i>
        </button>
      </div>
      <div class="code-tree scrollbar-thin">
        <div v-if="treeLoading" class="p-3 text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-1"></i> 读取目录…</div>
        <div v-else-if="!tree.length" class="p-3 text-xs text-slate-400">空目录</div>
        <FileTree
          v-else
          :nodes="tree"
          :selected="selectedFile"
          :collapsed="collapsedDirs"
          @select="selectFile"
          @toggle="toggleDir"
        />
        <p v-if="treeTruncated" class="px-3 py-2 text-[11px] text-amber-500">文件较多，仅展示前若干项</p>
      </div>
    </aside>

    <!-- Center: chat -->
    <section class="code-main">
      <div class="code-main-head">
        <button class="icon-btn" :title="showTree ? '隐藏文件树' : '显示文件树'" @click="showTree = !showTree">
          <i class="fa-solid" :class="showTree ? 'fa-angles-left' : 'fa-angles-right'"></i>
        </button>
        <div class="flex items-center gap-2 min-w-0">
          <i class="fa-solid fa-robot text-blue-600 text-xs"></i>
          <span class="text-[13px] font-medium text-slate-600">AI 代码助手</span>
        </div>
        <button class="icon-btn ml-auto" :title="showPreview ? '隐藏预览' : '显示预览'" @click="showPreview = !showPreview">
          <i class="fa-solid" :class="showPreview ? 'fa-angles-right' : 'fa-angles-left'"></i>
        </button>
      </div>

      <!-- 会话 tab 栏（多会话，可并行）-->
      <div class="conv-bar scrollbar-thin">
        <button
          v-for="c in conversations"
          :key="c.id"
          class="conv-tab"
          :class="{ 'conv-tab--on': c.id === activeConvId }"
          @click="selectConversation(c.id)"
        >
          <i v-if="streamingByConv[c.id]" class="fa-solid fa-spinner fa-spin text-[10px]"></i>
          <i v-else class="fa-regular fa-comment text-[10px]"></i>
          <span class="conv-tab-title">{{ c.title }}</span>
          <span
            v-if="conversations.length > 1"
            class="conv-x"
            title="关闭会话"
            @click.stop="closeConversation(c.id)"
          ><i class="fa-solid fa-xmark"></i></span>
        </button>
        <button class="conv-new" title="新建会话" @click="newConversation">
          <i class="fa-solid fa-plus text-[11px]"></i>
        </button>
      </div>

      <!-- messages -->
      <div ref="msgScroll" class="code-messages scrollbar-thin">
        <div v-if="!messages.length" class="code-welcome">
          <div class="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <i class="fa-solid fa-code text-2xl text-blue-500"></i>
          </div>
          <h3 class="text-base font-semibold text-slate-700 mb-1">让我在这个文件夹里写代码</h3>
          <p class="text-sm text-slate-400 max-w-sm text-center">
            比如「读一下 README，帮我在 utils 里加一个防抖函数」。我改文件前会把 diff 给你看，你确认了才写入。
          </p>
        </div>

        <div v-for="msg in messages" :key="msg.id" class="msg" :class="'msg--' + msg.role">
          <!-- 用户：靠右气泡 -->
          <div v-if="msg.role === 'user'" class="user-col">
            <div v-if="msg.attachments && msg.attachments.length" class="user-atts">
              <template v-for="(att, ai) in msg.attachments" :key="ai">
                <img
                  v-if="att.type === 'image'"
                  :src="'data:' + att.media_type + ';base64,' + att.data"
                  class="w-16 h-16 object-cover rounded-lg border border-blue-300/40"
                />
                <div v-else class="att-chip">
                  <i class="fa-solid fa-file-lines text-[11px]"></i>
                  <span class="truncate">{{ att.name }}</span>
                </div>
              </template>
            </div>
            <div v-if="msg.content" class="bubble bubble--user">{{ msg.content }}</div>
          </div>

          <!-- 助手：左对齐、正文全宽，思考过程独立折叠区 -->
          <div v-else class="assistant-col">
            <div class="assistant-avatar">
              <i class="fa-solid fa-robot text-[11px]"></i>
            </div>
            <div class="assistant-body">
              <!-- 思考 / 工具步骤：独立折叠区 -->
              <div v-if="msg.thinkingSteps && msg.thinkingSteps.length" class="think-block">
                <button class="think-toggle" @click="msg.thinkOpen = !msg.thinkOpen">
                  <i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                  <span>{{ msg.pending ? '正在思考与执行…' : '思考与执行过程' }}</span>
                  <span class="think-count">{{ msg.thinkingSteps.length }}</span>
                  <i class="fa-solid text-[9px] ml-auto" :class="msg.thinkOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
                <div v-if="msg.thinkOpen" class="think-rail">
                  <div v-for="(s, i) in msg.thinkingSteps" :key="i" class="think-step">
                    <i :class="s.icon" class="think-ico"></i>
                    <span class="think-text" v-html="renderInline(s.text)"></span>
                  </div>
                </div>
              </div>
              <!-- 正文（markdown 渲染）-->
              <div v-if="msg.content" class="assistant-md markdown-body" v-html="renderContent(msg.content)"></div>
              <div v-else-if="msg.pending && !(msg.thinkingSteps && msg.thinkingSteps.length)" class="text-slate-400 text-sm py-1">
                <i class="fa-solid fa-spinner fa-spin mr-1"></i> 思考中…
              </div>
              <!-- 回合小结：耗时 + token -->
              <div v-if="msg.meta && !msg.pending" class="turn-meta">
                <span class="tm-item" title="本回合耗时">
                  <i class="fa-regular fa-clock"></i>{{ fmtDuration(msg.meta.elapsedMs) }}
                </span>
                <template v-if="msg.meta.turnTokens != null">
                  <span class="tm-sep"></span>
                  <span class="tm-item" title="本回合 token 消耗（输入 + 输出）">
                    <i class="fa-solid fa-coins"></i>{{ fmtTokens(msg.meta.turnTokens) }} tokens
                  </span>
                  <span v-if="msg.meta.input != null" class="tm-item tm-dim" title="输入 / 输出">
                    ({{ fmtTokens(msg.meta.input) }}↑ {{ fmtTokens(msg.meta.output) }}↓)
                  </span>
                </template>
                <template v-if="msg.meta.stopReason && stopReasonLabel(msg.meta.stopReason)">
                  <span class="tm-sep"></span>
                  <span class="tm-item tm-dim">{{ stopReasonLabel(msg.meta.stopReason) }}</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- composer -->
      <div class="code-composer-wrap">
        <!-- 附件预览 -->
        <div v-if="composer.attachments.value.length" class="composer-atts">
          <div v-for="(att, ai) in composer.attachments.value" :key="ai" class="relative group/att">
            <img
              v-if="att.type === 'image'"
              :src="'data:' + att.media_type + ';base64,' + att.data"
              class="w-12 h-12 object-cover rounded-lg border border-slate-200"
            />
            <div v-else class="flex items-center gap-1.5 h-12 px-2.5 rounded-lg border border-slate-200 bg-white max-w-[170px]">
              <i class="fa-solid fa-file-lines text-blue-500 text-sm shrink-0"></i>
              <span class="text-[11.5px] text-slate-700 truncate">{{ att.name }}</span>
            </div>
            <button
              @click="composer.removeAttachment(ai)"
              class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700/90 hover:bg-rose-500 text-white text-[9px] flex items-center justify-center shadow-sm"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div class="code-composer">
          <!-- 多模态按钮 -->
          <button class="tool-btn" :disabled="isStreaming" title="上传图片" @click="composer.pickImage">
            <i class="fa-solid fa-image text-sm"></i>
          </button>
          <button class="tool-btn" :disabled="isStreaming" title="上传文件" @click="composer.pickFile">
            <i class="fa-solid fa-paperclip text-sm"></i>
          </button>
          <button
            class="tool-btn"
            :class="composer.isRecording.value ? 'tool-btn--rec' : ''"
            :disabled="isStreaming || !composer.recordingSupported"
            :title="composer.recordingSupported ? (composer.isRecording.value ? '停止录音' : '语音输入') : '当前环境不支持录音'"
            @click="composer.toggleRecording"
          >
            <i class="fa-solid text-sm" :class="composer.isRecording.value ? 'fa-stop' : 'fa-microphone'"></i>
          </button>
          <span v-if="composer.isRecording.value" class="text-[11px] text-rose-500 font-medium tabular-nums shrink-0">{{ composer.recordSeconds.value }}s</span>
          <span v-else-if="composer.isTranscribing.value" class="text-[11px] text-blue-500 font-medium shrink-0">识别中…</span>

          <textarea
            ref="inputRef"
            v-model="draft"
            rows="1"
            placeholder="描述要做的改动，回车发送（Shift+Enter 换行）"
            class="code-input"
            :disabled="isStreaming"
            @keydown.enter.exact.prevent="send"
          ></textarea>
          <button
            v-if="!isStreaming"
            class="send-btn"
            :disabled="!draft.trim() && composer.attachments.value.length === 0"
            @click="send"
          >
            <i class="fa-solid fa-paper-plane text-xs"></i>
          </button>
          <button v-else class="send-btn send-btn--stop" @click="cancel" title="停止">
            <i class="fa-solid fa-stop text-xs"></i>
          </button>
        </div>
      </div>
    </section>

    <!-- Right: file preview -->
    <aside v-if="showPreview" class="code-preview">
      <div class="code-preview-head">
        <span class="text-[12.5px] font-mono text-slate-500 truncate" :title="selectedFile">
          {{ selectedFile || '未选择文件' }}
        </span>
        <button v-if="selectedFile" class="icon-btn" title="重新读取" @click="reloadFile">
          <i class="fa-solid fa-arrows-rotate text-[11px]"></i>
        </button>
      </div>
      <div class="code-preview-body scrollbar-thin">
        <div v-if="fileLoading" class="p-4 text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-1"></i> 读取中…</div>
        <div v-else-if="fileError" class="p-4 text-xs text-amber-500">{{ fileError }}</div>
        <pre v-else-if="fileContent !== null" class="code-source">{{ fileContent }}</pre>
        <div v-else class="p-6 text-center text-xs text-slate-400">
          <i class="fa-regular fa-file-lines text-2xl text-slate-300 mb-2 block"></i>
          在左侧文件树里点一个文件查看内容
        </div>
      </div>
    </aside>

    <!-- Diff approval dialog -->
    <DiffApprovalDialog
      v-if="pendingDiff"
      :file-path="pendingDiff.convTitle ? `〔${pendingDiff.convTitle}〕${pendingDiff.filePath}` : pendingDiff.filePath"
      :old-text="pendingDiff.oldText"
      :new-text="pendingDiff.newText"
      @approve="respondDiff(true)"
      @reject="respondDiff(false)"
    />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import FileTree from '@/components/code/FileTree.vue';
import DiffApprovalDialog from '@/components/code/DiffApprovalDialog.vue';
import { useChatComposer } from '@/composables/useChatComposer';
import { marked } from 'marked';

const props = defineProps({ id: { type: String, required: true } });

// markdown 渲染：正文走块级(标题/列表/代码块/加粗都渲染)，步骤文本走内联。
// GFM 开启、\n 转 <br>；失败兜底原文，避免异常内容把整条消息搞崩。
marked.setOptions({ gfm: true, breaks: true });
const renderContent = (text) => {
  if (!text) return '';
  try { return marked.parse(String(text)); } catch { return String(text); }
};
const renderInline = (text) => {
  if (!text) return '';
  try { return marked.parseInline(String(text)); } catch { return String(text); }
};

// 回合小结的格式化：耗时(ms→s/min)、token(千分位/k 缩写)。
const fmtDuration = (ms) => {
  if (ms == null) return '';
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}分${Math.round(s - m * 60)}秒`;
};
const fmtTokens = (n) => {
  if (n == null) return '—';
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(n < 10000 ? 2 : 1)}k`;
};
const stopReasonLabel = (r) => {
  const map = { end_turn: '正常结束', cancelled: '已取消', max_tokens: '达到长度上限', refusal: '被拒绝' };
  return map[r] || '';
};

const workspace = ref(null);
const tree = ref([]);
const treeLoading = ref(false);
const treeTruncated = ref(false);
const collapsedDirs = ref(new Set());
const showTree = ref(true);
const showPreview = ref(true);

const selectedFile = ref('');
const fileContent = ref(null);
const fileLoading = ref(false);
const fileError = ref('');

// ---- 多会话状态 ----------------------------------------------------------
// conversations: 该工作区全部会话[{id,title,sessionId,messages[],...}]。
// messages: 当前活动会话的可写副本(流式频繁 mutate 元素，用 ref 而非只读 computed)。
// 并行状态全部按 convId 维度存，后台会话流式不影响前台显示。
const conversations = ref([]);
const activeConvId = ref('');
const activeConversation = computed(() => conversations.value.find((c) => c.id === activeConvId.value) || null);
const activeSessionId = computed(() => activeConversation.value?.sessionId || '');

const messages = ref([]);
const draft = ref('');
// 每会话是否正在流式(并行时多个可同时为真)。当前会话据此禁用输入。
const streamingByConv = reactive({});
const inflightByConv = new Set();   // convId → prompt 仍在 await 中（未返回则引擎还在跑）
const isStreaming = computed(() => !!streamingByConv[activeConvId.value]);
const msgScroll = ref(null);
const inputRef = ref(null);

// 每会话的 streamEnd 定时器 / 计时 / token 累计 / 待落 meta。
const streamEndTimers = new Map();   // convId → timer
const turnStartByConv = new Map();   // convId → performance.now()
const prevTotalByConv = new Map();   // convId → 上轮累计 token
const pendingMetaByConv = new Map(); // convId → 本轮小结

// 多模态输入：图片 / 文件 / 语音，复用共享 composer。
// onTranscribe 把识别文本填进输入框；getSlug 给录音兜底落盘用（无 FDE slug，
// 用 code- 前缀 + 工作区 id，落到 ~/.product-lobster/recordings 也能区分来源）。
const composer = useChatComposer({
  onTranscribe: (text) => {
    draft.value = draft.value ? `${draft.value} ${text}` : text;
    nextTick(() => inputRef.value?.focus());
  },
  getSlug: () => `code-${props.id}`,
});

// 待确认的 diff 队列（来自引擎 request_permission）。并行时多个会话可能同时来请求，
// 逐个处理；pendingDiff 取队首展示。每项带归属会话标题。
const diffQueue = ref([]);
const pendingDiff = computed(() => diffQueue.value[0] || null);

let unsubUpdate = null;
let unsubPerm = null;

// ---- workspace + tree ----------------------------------------------------

const loadWorkspace = async () => {
  const res = await window.api.code.getWorkspace(props.id);
  if (res && res.workspace) workspace.value = res.workspace;
};

// ---- 会话管理 ------------------------------------------------------------

// 找某 sessionId 归属的会话(流式事件路由用)。
const convBySession = (sid) => conversations.value.find((c) => c.sessionId && c.sessionId === sid) || null;

const loadConversations = async () => {
  const res = await window.api.code.listConversations(props.id);
  let list = (res && res.conversations) || [];
  if (!list.length) {
    // 空工作区：建首条会话(立即建 session)。
    const r = await window.api.code.newConversation(props.id);
    if (r && r.conversation) list = [r.conversation];
  }
  conversations.value = list;
  activeConvId.value = list[0]?.id || '';
  messages.value = activeConversation.value?.messages || [];
  // 历史(迁移/旧)会话可能没有 sessionId，后台补齐以便后续能路由。
  for (const c of conversations.value) {
    if (!c.sessionId) ensureConvSession(c.id);
  }
};

const ensureConvSession = async (convId) => {
  const c = conversations.value.find((x) => x.id === convId);
  if (!c || c.sessionId) return c?.sessionId || '';
  try {
    const r = await window.api.code.ensureSession(props.id, convId);
    if (r && r.sessionId) c.sessionId = r.sessionId;
  } catch (e) {
    console.error('[CodeWorkspace] ensureSession failed:', e);
  }
  return c.sessionId || '';
};

const selectConversation = async (convId) => {
  if (convId === activeConvId.value) return;
  activeConvId.value = convId;
  // 只改指向；后台会话的 messages 引用保持稳定，流式不受影响。
  messages.value = activeConversation.value?.messages || [];
  scrollToBottom();
  if (!activeConversation.value?.sessionId) ensureConvSession(convId);
};

const newConversation = async () => {
  try {
    const r = await window.api.code.newConversation(props.id);
    if (r && r.conversation) {
      conversations.value.push(r.conversation);
      activeConvId.value = r.conversation.id;
      // 关键：push 进 reactive 数组后元素被 proxy 化，必须从 conversations.value 重新取
      // proxy 引用赋给 messages.value——否则 messages.value 指向 raw 对象的数组，
      // 而流式回填/落盘走的是 proxy 数组，两者不是同一引用 → 消息串台且落盘为空。
      messages.value = activeConversation.value?.messages || [];
    }
  } catch (e) {
    console.error('[CodeWorkspace] newConversation failed:', e);
  }
};

const closeConversation = async (convId) => {
  if (!confirm('关闭这条会话？其历史将被删除。')) return;
  const idx = conversations.value.findIndex((c) => c.id === convId);
  try {
    const r = await window.api.code.deleteConversation(props.id, convId);
    conversations.value = (r && r.conversations) || [];
  } catch (e) {
    console.error('[CodeWorkspace] deleteConversation failed:', e);
    return;
  }
  // 关的是当前会话 → 切到相邻。
  if (convId === activeConvId.value) {
    const next = conversations.value[Math.max(0, idx - 1)];
    activeConvId.value = next?.id || '';
    messages.value = activeConversation.value?.messages || [];
    if (activeConvId.value && !activeConversation.value?.sessionId) ensureConvSession(activeConvId.value);
  }
};

// 把当前会话 messages 落盘(strip 附件 base64，延续附件 session-only 约定)。
const stripAttachmentsData = (msgs) =>
  msgs.map((m) => {
    if (!m.attachments || !m.attachments.length) return m;
    return { ...m, attachments: m.attachments.map((a) => ({ type: a.type, name: a.name, media_type: a.media_type })) };
  });

const saveConversation = (convId) => {
  const c = conversations.value.find((x) => x.id === convId);
  if (!c) return;
  window.api.code.saveConversation(props.id, convId, stripAttachmentsData(c.messages || [])).catch((e) =>
    console.error('[CodeWorkspace] saveConversation failed:', e)
  );
};

const refreshTree = async () => {
  treeLoading.value = true;
  try {
    const res = await window.api.code.listTree(props.id);
    if (res && res.success) {
      tree.value = res.tree || [];
      treeTruncated.value = !!res.truncated;
      // 默认折叠所有目录，保持列表清爽。
      const dirs = new Set();
      const collect = (nodes) => {
        for (const n of nodes) {
          if (n.isDirectory) { dirs.add(n.relPath); collect(n.children || []); }
        }
      };
      collect(tree.value);
      collapsedDirs.value = dirs;
    } else {
      tree.value = [];
    }
  } finally {
    treeLoading.value = false;
  }
};

const toggleDir = (rel) => {
  const next = new Set(collapsedDirs.value);
  if (next.has(rel)) next.delete(rel); else next.add(rel);
  collapsedDirs.value = next;
};

// ---- file preview --------------------------------------------------------

const selectFile = async (rel) => {
  selectedFile.value = rel;
  showPreview.value = true;
  await loadFile(rel);
};

const loadFile = async (rel) => {
  fileLoading.value = true;
  fileError.value = '';
  fileContent.value = null;
  try {
    const res = await window.api.code.readFile(props.id, rel);
    if (res && res.success) fileContent.value = res.content;
    else fileError.value = (res && res.error) || '读取失败';
  } catch (e) {
    fileError.value = e.message;
  } finally {
    fileLoading.value = false;
  }
};

const reloadFile = () => { if (selectedFile.value) loadFile(selectedFile.value); };

// ---- chat ----------------------------------------------------------------

const scrollToBottom = () => {
  nextTick(() => {
    const el = msgScroll.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
};

// 往指定会话的消息数组取/建 pending 助手气泡(泛化，支持后台会话)。
const getOrCreateAssistant = (targetMsgs) => {
  const last = targetMsgs[targetMsgs.length - 1];
  if (last && last.role === 'assistant' && last.pending) return last;
  const msg = { id: Date.now() + Math.random(), role: 'assistant', content: '', thinkingSteps: [], thinkOpen: true, pending: true };
  targetMsgs.push(msg);
  return msg;
};

const scheduleStreamEnd = (convId) => {
  const t = streamEndTimers.get(convId);
  if (t) clearTimeout(t);
  // 只作长时兜底：prompt 还没返回说明引擎仍在跑（写文件/跑命令很容易静默十几秒），
  // 1.5 秒就收尾会误判结束 → 消息提前落盘、输入框放开，用户再发一条就串轮。
  streamEndTimers.set(convId, setTimeout(() => {
    if (inflightByConv.has(convId)) { scheduleStreamEnd(convId); return; }
    finishStream(convId);
  }, 120000));
};

const finishStream = (convId) => {
  const t = streamEndTimers.get(convId);
  if (t) { clearTimeout(t); streamEndTimers.delete(convId); }
  // 幂等：agent_message_end 事件和 prompt 返回都会调，只让第一次生效，
  // 否则同一轮会重复 saveConversation。
  if (!streamingByConv[convId]) return;
  const conv = conversations.value.find((c) => c.id === convId);
  if (!conv) return;
  const msgs = conv.messages;
  const last = msgs[msgs.length - 1];
  if (last && last.role === 'assistant') {
    last.pending = false;
    // 落本回合小结 + 完成后默认收起思考过程，回归干净的答案视图。
    const meta = pendingMetaByConv.get(convId);
    if (meta) { last.meta = meta; last.thinkOpen = false; }
  }
  pendingMetaByConv.delete(convId);
  streamingByConv[convId] = false;
  console.log('[mc] finishStream conv=', conv.title, 'msgs=', msgs.length, '→ saving');
  // 消息定稿后落盘。
  saveConversation(convId);
  // 一轮结束后刷新文件树 + 当前预览(仅当前会话，AI 可能改了文件)。
  if (convId === activeConvId.value) {
    refreshTree();
    if (selectedFile.value) loadFile(selectedFile.value);
  }
};

// 按 data.sessionId 把流式事件路由到对应会话的消息数组——多会话并行不串台的关键。
const handleSessionUpdate = (data) => {
  const update = data?.update || data;
  if (!update) return;
  const sid = data?.sessionId || '';
  const conv = sid ? convBySession(sid) : activeConversation.value;
  if (!conv) { console.warn('[mc] update DROPPED, unknown sid=', sid, 'known=', conversations.value.map(c=>c.sessionId)); return; } // 未知 session：丢弃
  console.log('[mc] update sid=', String(sid).slice(0,8), '→ conv=', conv.title, 'type=', (update.type||update.sessionUpdate));
  const targetMsgs = conv.messages;
  const isActive = conv.id === activeConvId.value;
  const type = update.type || update.sessionUpdate;
  const content = update.content || update.data || '';

  const textOf = (c) => {
    if (Array.isArray(c)) return c.map((x) => x.text || '').join('');
    if (typeof c === 'string') return c;
    if (c && c.text) return c.text;
    return '';
  };

  if (type === 'agent_message_chunk' || type === 'content_block_delta') {
    const msg = getOrCreateAssistant(targetMsgs);
    const t = textOf(content);
    if (t) msg.content += t;
    if (isActive) scrollToBottom();
    scheduleStreamEnd(conv.id);
  } else if (type === 'agent_thought_chunk' || type === 'agent_reasoning') {
    const msg = getOrCreateAssistant(targetMsgs);
    const t = textOf(content);
    if (t) {
      const steps = msg.thinkingSteps;
      const last = steps[steps.length - 1];
      if (last && last.icon === 'fa-solid fa-brain' && !last.finalized) last.text += t;
      else steps.push({ text: t, icon: 'fa-solid fa-brain', finalized: false });
    }
    if (isActive) scrollToBottom();
    scheduleStreamEnd(conv.id);
  } else if (type === 'tool_call' || type === 'tool_call_start') {
    const msg = getOrCreateAssistant(targetMsgs);
    const toolName = update.title || update.toolName || update.name || 'tool';
    msg.thinkingSteps.push({ text: `调用工具: ${toolName}`, icon: 'fa-solid fa-wrench', finalized: true });
    const t = streamEndTimers.get(conv.id);
    if (t) clearTimeout(t);
    if (isActive) scrollToBottom();
  } else if (type === 'tool_call_update' || type === 'tool_call_end') {
    const status = update.status || '';
    if (status === 'completed' || status === 'failed') {
      const msg = getOrCreateAssistant(targetMsgs);
      const toolName = update.title || update.toolName || update.name || 'tool';
      msg.thinkingSteps.push({
        text: status === 'failed' ? `${toolName} 失败` : `${toolName} 完成`,
        icon: status === 'failed' ? 'fa-solid fa-circle-xmark' : 'fa-solid fa-circle-check',
        finalized: true,
      });
      scheduleStreamEnd(conv.id);
    }
  } else if (type === 'agent_message_end' || type === 'session_end' || type === 'stop') {
    finishStream(conv.id);
  }
};

// ---- diff approval -------------------------------------------------------

// 从 request_permission 的 toolCall.content 里拆出 diff 块。
const extractDiff = (params) => {
  const tc = (params && (params.toolCall || params.tool_call)) || {};
  const content = Array.isArray(tc.content) ? tc.content : [];
  const diff = content.find((c) => c && c.type === 'diff');
  if (diff) {
    return {
      filePath: diff.path || tc.title || '(未知文件)',
      oldText: diff.oldText != null ? diff.oldText : (diff.old_text || ''),
      newText: diff.newText != null ? diff.newText : (diff.new_text || ''),
    };
  }
  // 没有 diff 块：退化成标题确认（危险命令等）。
  return { filePath: tc.title || '(操作确认)', oldText: '', newText: '' };
};

const handlePermissionRequest = (payload) => {
  // payload: { requestId, isEdit, sessionId, toolCall, options }
  const info = extractDiff(payload);
  // 按 sessionId 找归属会话，弹窗标题标注来源(并行时多个会话可能同时请求)。
  const conv = payload.sessionId ? convBySession(payload.sessionId) : activeConversation.value;
  diffQueue.value.push({
    requestId: payload.requestId,
    convId: conv?.id || '',
    convTitle: conv?.title || '',
    ...info,
  });
};

const respondDiff = async (approved) => {
  const req = diffQueue.value.shift(); // 出队队首
  if (!req) return;
  try {
    await window.api.hermes.respondPermission(req.requestId, approved, approved ? 'allow_once' : 'deny');
  } catch (e) {
    console.error('[CodeWorkspace] respondPermission failed:', e);
  }
};

// ---- send / cancel -------------------------------------------------------

const send = async () => {
  const text = draft.value.trim();
  const atts = composer.attachments.value;
  if ((!text && atts.length === 0) || isStreaming.value) return;
  const convId = activeConvId.value;
  if (!convId) return;
  // 带附件但当前模型不支持多模态 → 提示并阻止（composer 内部弹窗引导切模型）。
  if (!(await composer.checkModelForAttachments())) return;
  // 首次发送前确保本会话已有 session(路由/持久化都要它)。
  if (!activeConversation.value?.sessionId) await ensureConvSession(convId);

  // 快照附件（发送后即清空 composer），随用户气泡一起展示。
  const sentAtts = atts.map((a) => ({ type: a.type, name: a.name, media_type: a.media_type, data: a.data, text: a.text }));
  draft.value = '';
  composer.clearAttachments();
  // 用 convId 定位目标会话数组，而非 messages.value——避免 await 期间用户切换会话导致推错。
  const sendConv = conversations.value.find((c) => c.id === convId);
  if (!sendConv) return;
  console.log('[mc] send → conv=', sendConv.title, 'sid=', String(sendConv.sessionId).slice(0,8), 'msgsRef===messages.value?', sendConv.messages === messages.value);
  sendConv.messages.push({ id: Date.now(), role: 'user', content: text, attachments: sentAtts });
  streamingByConv[convId] = true;
  inflightByConv.add(convId);
  turnStartByConv.set(convId, performance.now());
  pendingMetaByConv.delete(convId);
  scrollToBottom();
  try {
    const result = await window.api.code.prompt(props.id, convId, text, sentAtts);
    inflightByConv.delete(convId);
    // prompt 返回 = 引擎这一轮真的结束了（或抛错）；agent_message_end 可能已经先到过一次
    // finishStream 幂等，多调一次不会重复落盘。
    const usage = result && result.usage ? result.usage : null;
    const total = usage ? (usage.totalTokens ?? ((usage.inputTokens || 0) + (usage.outputTokens || 0))) : null;
    const prevTotal = prevTotalByConv.get(convId) || 0;
    pendingMetaByConv.set(convId, {
      elapsedMs: Math.round(performance.now() - (turnStartByConv.get(convId) || performance.now())),
      stopReason: (result && result.stopReason) || 'end_turn',
      input: usage ? (usage.inputTokens || 0) : null,
      output: usage ? (usage.outputTokens || 0) : null,
      turnTokens: total != null ? Math.max(0, total - prevTotal) : null,
      totalTokens: total,
    });
    if (total != null) prevTotalByConv.set(convId, total);
  } catch (e) {
    inflightByConv.delete(convId);
    const conv = conversations.value.find((c) => c.id === convId);
    if (conv) {
      const msg = getOrCreateAssistant(conv.messages);
      msg.content += `\n\n⚠️ 出错了：${e.message}`;
    }
    pendingMetaByConv.set(convId, { elapsedMs: Math.round(performance.now() - (turnStartByConv.get(convId) || performance.now())), error: true });
    finishStream(convId);
    return;
  }
  // 正常结束由 scheduleStreamEnd / agent_message_end 兜底；prompt 已返回则直接收尾。
  finishStream(convId);
};

const cancel = async () => {
  const convId = activeConvId.value;
  if (!convId) return;
  // 必须通知引擎真停：只在前端收尾的话引擎照跑，之后的 chunk 会追加到已收尾的消息上。
  try { await window.api.code.cancel(props.id, convId); } catch (_) { /* 引擎已停也无妨 */ }
  inflightByConv.delete(convId);
  finishStream(convId);
};

onMounted(async () => {
  if (!window.api?.code) { fileError.value = '当前环境不支持代码工作区'; return; }
  await loadWorkspace();
  await loadConversations();
  await refreshTree();
  if (window.api?.hermes?.onSessionUpdate) unsubUpdate = window.api.hermes.onSessionUpdate(handleSessionUpdate);
  if (window.api?.hermes?.onPermissionRequest) unsubPerm = window.api.hermes.onPermissionRequest(handlePermissionRequest);
});

onUnmounted(() => {
  if (unsubUpdate) unsubUpdate();
  if (unsubPerm) unsubPerm();
  for (const t of streamEndTimers.values()) clearTimeout(t);
  streamEndTimers.clear();
});
</script>

<style scoped>
.code-sidebar {
  width: 260px; flex-shrink: 0;
  display: flex; flex-direction: column;
  background: #fff;
  border-right: 1px solid #eef2f7;
}
.code-sidebar--collapsed { display: none; }
.code-sidebar-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 10px 12px; border-bottom: 1px solid #eef2f7;
}
.code-tree { flex: 1; overflow: auto; padding: 6px 4px; }

.code-main { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #f8fafc; }
.code-main-head {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; background: #fff; border-bottom: 1px solid #eef2f7;
}
/* 会话 tab 栏 */
.conv-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; background: #fff; border-bottom: 1px solid #eef2f7;
  overflow-x: auto; flex-shrink: 0;
}
.conv-tab {
  display: flex; align-items: center; gap: 7px; flex-shrink: 0;
  padding: 5px 8px 5px 11px; border-radius: 8px; cursor: pointer;
  font-size: 12.5px; color: #64748b; background: transparent;
  border: 1px solid transparent; white-space: nowrap; transition: all .12s;
}
.conv-tab:hover { background: #eff6ff; }
.conv-tab--on { background: #eff6ff; border-color: rgba(37,99,235,.3); color: #1d4ed8; font-weight: 600; }
.conv-tab-title { max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
.conv-x {
  width: 16px; height: 16px; border-radius: 5px; display: flex;
  align-items: center; justify-content: center; font-size: 10px; opacity: .55;
}
.conv-x:hover { opacity: 1; background: rgba(239,68,68,.15); color: #dc2626; }
.conv-new {
  width: 28px; height: 28px; flex-shrink: 0; border: 1px dashed #cbd5e1;
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #64748b; background: transparent; transition: all .12s;
}
.conv-new:hover { border-color: rgba(37,99,235,.55); color: #1d4ed8; }
.code-messages { flex: 1; overflow: auto; padding: 20px; }
.code-welcome { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }

.msg { display: flex; margin-bottom: 18px; }
.msg--user { justify-content: flex-end; }
.msg--assistant { justify-content: flex-start; }

/* 用户列：靠右 */
.user-col { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; max-width: 78%; }
.user-atts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.att-chip {
  display: inline-flex; align-items: center; gap: 5px;
  max-width: 180px; padding: 5px 9px; border-radius: 8px;
  background: rgba(37, 99, 235, 0.1); color: #1d4ed8; font-size: 11.5px;
}
.att-chip .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bubble--user {
  background: #2563eb; color: #fff;
  padding: 10px 14px; border-radius: 12px; border-bottom-right-radius: 4px;
  font-size: 13.5px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;
}

/* 助手列：头像 + 全宽正文，左对齐 */
.assistant-col { display: flex; gap: 10px; width: 100%; max-width: 100%; }
.assistant-avatar {
  width: 28px; height: 28px; flex-shrink: 0; margin-top: 2px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 8px; background: rgba(37, 99, 235, 0.1); color: #2563eb;
}
.assistant-body { flex: 1; min-width: 0; }

/* 思考 / 工具步骤：独立折叠区，左侧竖线轨道 */
.think-block { margin-bottom: 10px; }
.think-toggle {
  display: flex; align-items: center; gap: 7px; width: 100%;
  padding: 6px 10px; border: 1px solid #eef2f7; border-radius: 9px;
  background: #f8fafc; color: #64748b; font-size: 12px; cursor: pointer;
  transition: background 0.15s;
}
.think-toggle:hover { background: #f1f5f9; }
.think-count {
  font-size: 10px; padding: 1px 6px; border-radius: 999px;
  background: rgba(37, 99, 235, 0.1); color: #1d4ed8;
}
.think-rail {
  margin: 6px 0 0 12px; padding-left: 12px;
  border-left: 2px solid rgba(37, 99, 235, 0.15);
  display: flex; flex-direction: column; gap: 4px;
  max-height: 260px; overflow-y: auto;
}
.think-step { display: flex; align-items: flex-start; gap: 7px; padding: 2px 0; }
.think-ico { font-size: 9px; color: #94a3b8; margin-top: 4px; flex-shrink: 0; }
.think-text { font-size: 12px; line-height: 1.55; color: #64748b; word-break: break-word; }
.think-text :deep(code) { background: #eef2f7; padding: 0 4px; border-radius: 4px; font-size: 11px; }

/* 正文 markdown */
.assistant-md {
  font-size: 14px; line-height: 1.7; color: #1e293b; word-break: break-word;
}
.assistant-md :deep(p) { margin: 0 0 10px; }
.assistant-md :deep(p:last-child) { margin-bottom: 0; }
.assistant-md :deep(h1),
.assistant-md :deep(h2),
.assistant-md :deep(h3) { font-weight: 600; margin: 14px 0 8px; line-height: 1.35; }
.assistant-md :deep(h1) { font-size: 18px; }
.assistant-md :deep(h2) { font-size: 16px; }
.assistant-md :deep(h3) { font-size: 14.5px; }
.assistant-md :deep(ul),
.assistant-md :deep(ol) { margin: 0 0 10px; padding-left: 22px; }
.assistant-md :deep(li) { margin: 3px 0; }
.assistant-md :deep(strong) { font-weight: 600; color: #0f172a; }
.assistant-md :deep(a) { color: #2563eb; text-decoration: underline; }
.assistant-md :deep(code) {
  background: #f1f5f9; color: #be123c;
  padding: 1px 5px; border-radius: 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px;
}
.assistant-md :deep(pre) {
  background: #0f172a; color: #e2e8f0;
  padding: 12px 14px; border-radius: 10px; overflow-x: auto; margin: 0 0 10px;
}
.assistant-md :deep(pre code) { background: transparent; color: inherit; padding: 0; font-size: 12.5px; line-height: 1.6; }
.assistant-md :deep(blockquote) {
  border-left: 3px solid #cbd5e1; margin: 0 0 10px; padding: 2px 0 2px 12px; color: #64748b;
}
.assistant-md :deep(table) { border-collapse: collapse; margin: 0 0 10px; font-size: 13px; }
.assistant-md :deep(th),
.assistant-md :deep(td) { border: 1px solid #e2e8f0; padding: 5px 10px; }
.assistant-md :deep(th) { background: #f8fafc; font-weight: 600; }
.assistant-md :deep(img) { max-width: 100%; border-radius: 8px; }

/* 回合小结：耗时 + token 的浅色状态条 */
.turn-meta {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  margin-top: 10px; padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
  font-size: 11.5px; color: #94a3b8;
}
.tm-item { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.tm-item i { font-size: 10px; }
.tm-dim { color: #cbd5e1; }
.tm-sep { width: 1px; height: 10px; background: #e2e8f0; }

.code-composer-wrap { background: #fff; border-top: 1px solid #eef2f7; }
.composer-atts { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 12px 0; }
.code-composer {
  display: flex; align-items: flex-end; gap: 6px;
  padding: 12px;
}
.tool-btn {
  width: 34px; height: 34px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 9px; background: transparent; color: #64748b; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.tool-btn:hover:not(:disabled) { background: #f1f5f9; color: #1d4ed8; }
.tool-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tool-btn--rec { background: #ef4444; color: #fff; }
.tool-btn--rec:hover:not(:disabled) { background: #dc2626; color: #fff; }
.code-input {
  flex: 1; resize: none; max-height: 160px;
  border: 1px solid #e2e8f0; border-radius: 10px;
  padding: 10px 12px; font-size: 13.5px; color: #1e293b;
  outline: none;
}
.code-input:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12); }
.send-btn {
  width: 38px; height: 38px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 10px; background: #2563eb; color: #fff; cursor: pointer;
  transition: background 0.15s;
}
.send-btn:hover:not(:disabled) { background: #1d4ed8; }
.send-btn:disabled { opacity: 0.4; cursor: default; }
.send-btn--stop { background: #ef4444; }
.send-btn--stop:hover { background: #dc2626; }

.code-preview {
  width: 380px; flex-shrink: 0;
  display: flex; flex-direction: column;
  background: #0f172a; border-left: 1px solid #1e293b;
}
.code-preview-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 12px; background: #1e293b; border-bottom: 1px solid #334155;
}
.code-preview-head span { color: #cbd5e1; }
.code-preview-body { flex: 1; overflow: auto; }
.code-source {
  margin: 0; padding: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px; line-height: 1.6; color: #e2e8f0;
  white-space: pre; word-break: normal;
}

.icon-btn {
  width: 28px; height: 28px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px; color: #64748b; cursor: pointer; transition: background 0.15s, color 0.15s;
}
.icon-btn:hover { background: #f1f5f9; color: #1d4ed8; }
.code-preview-head .icon-btn { color: #94a3b8; }
.code-preview-head .icon-btn:hover { background: #334155; color: #fff; }
</style>
