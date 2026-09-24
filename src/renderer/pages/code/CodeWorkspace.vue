<template>
  <div class="code-workspace-shell">
    <div class="code-workspace-main">
    <!-- Left: file tree -->
    <aside
      class="code-sidebar"
      :class="{ 'code-sidebar--collapsed': !showTree }"
      :style="sidebarW ? { width: sidebarW + 'px' } : null"
    >
      <div class="code-sidebar-head">
        <div class="flex items-center gap-2 min-w-0">
          <i class="fa-solid fa-folder-tree text-blue-600 text-xs"></i>
          <span class="text-[13px] font-semibold text-slate-700 truncate" :title="workspace?.path">{{ workspace?.name || '工作区' }}</span>
        </div>
        <button class="icon-btn" title="新建文件" @click="beginEntryAction('file', '')"><i class="fa-solid fa-plus text-[11px]"></i></button>
        <button class="icon-btn" title="新建文件夹" @click="beginEntryAction('folder', '')"><i class="fa-solid fa-folder-plus text-[11px]"></i></button>
        <button class="icon-btn" title="全部折叠" @click="collapseAllDirs"><i class="fa-solid fa-angles-up text-[11px]"></i></button>
        <button class="icon-btn" title="刷新文件树" @click="refreshTree">
          <i class="fa-solid fa-arrows-rotate text-[11px]"></i>
        </button>
      </div>
      <div class="code-tree scrollbar-thin" @contextmenu.prevent.self="showRootMenu($event)">
        <div v-if="treeLoading" class="p-3 text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-1"></i> 读取目录…</div>
        <div v-else-if="!tree.length" class="p-3 text-xs text-slate-400">空目录</div>
        <FileTree
          v-else
          :nodes="tree"
          :selected="selectedFile"
          :collapsed="collapsedDirs"
          @select="selectFile"
          @toggle="toggleDir"
          @contextmenu="showEntryMenu"
        />
        <p v-if="treeTruncated" class="px-3 py-2 text-[11px] text-amber-500">文件较多，仅展示前若干项</p>
      </div>
    </aside>

    <aside
      v-if="!showTree"
      class="code-collapsed-rail code-collapsed-rail--left"
      title="显示文件树"
      @click="showTree = true"
    >
      <i class="fa-solid fa-folder-tree"></i>
      <span>资源管理器</span>
    </aside>

    <!-- 拖拽把手：文件树 / 主区之间 -->
    <div
      v-if="showTree"
      class="code-resizer code-resizer--left"
      :class="{ 'code-resizer--on': draggingPanel === 'sidebar' }"
      title="拖动调整文件树宽度"
      @pointerdown.prevent="startDrag($event, 'sidebar')"
    ></div>

    <!-- 拖拽把手：编辑器 / AI 对话之间 -->
    <div
      v-if="showChat"
      class="code-resizer code-resizer--right"
      :class="{ 'code-resizer--on': draggingPanel === 'preview' }"
      title="拖动调整 AI 对话宽度"
      @pointerdown.prevent="startDrag($event, 'preview')"
    ></div>
    <section class="code-main code-chat" :class="{ 'code-chat--hidden': !showChat }" :style="previewW ? { width: previewW + 'px', flex: `0 0 ${previewW}px` } : null">
      <div class="code-main-head code-chat-head">
        <div class="flex items-center gap-2 min-w-0">
          <i class="fa-solid fa-sparkles text-blue-600 text-xs"></i>
          <span class="text-[13px] font-semibold text-slate-700">AI coding</span>
          <span v-if="selectedFile" class="code-chat-context" :title="selectedFile">{{ selectedFile }}</span>
        </div>
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
            <div v-else class="flex items-center gap-1.5 h-12 px-2.5 rounded-lg border border-slate-200 glass-card max-w-[170px]">
              <i class="fa-solid fa-file-lines text-blue-500 text-sm shrink-0"></i>
              <span class="text-[11.5px] text-slate-700 truncate">{{ att.name }}</span>
            </div>
            <button
              @click="composer.removeAttachment(ai)"
              class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700/90 hover:bg-danger text-white text-[9px] flex items-center justify-center shadow-sm"
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
          <span v-if="composer.isRecording.value" class="text-[11px] text-danger font-medium tabular-nums shrink-0">{{ composer.recordSeconds.value }}s</span>
          <span v-else-if="composer.isTranscribing.value" class="text-[11px] text-blue-500 font-medium shrink-0">识别中…</span>

          <textarea
            ref="inputRef"
            v-model="draft"
            rows="1"
            placeholder="描述要做的改动，回车发送（Shift+Enter 换行）"
            class="code-input"
            :disabled="isStreaming"
            @keydown.enter.exact="onEnterKey"
            @input="autoGrowInput"
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

    <!-- Center: editor and terminal stack -->
    <section class="code-center" :class="{ 'code-center--hidden': !showPreview }">
      <div class="open-file-tabs scrollbar-thin">
        <button
          v-for="file in openFiles"
          :key="file"
          class="open-file-tab"
          :class="{ 'open-file-tab--active': file === selectedFile }"
          :title="file"
          @click="selectFile(file)"
        >
          <i class="fa-regular fa-file-code"></i>
          <span>{{ file.split('/').pop() }}</span>
          <i class="fa-solid fa-xmark open-file-close" @click.stop="closeOpenFile(file)"></i>
        </button>
        <span v-if="!openFiles.length" class="open-file-placeholder">打开的文件会显示在这里</span>
      </div>
      <section class="code-preview code-editor">
        <div class="code-editor-head">
          <div class="code-editor-tab" :class="{ 'code-editor-tab--empty': !selectedFile }">
            <i class="fa-solid fa-file-code text-[11px]"></i>
            <span class="truncate">{{ selectedFile || '未打开文件' }}</span>
            <span v-if="editorDirty" class="editor-dirty-dot" title="有未保存修改"></span>
          </div>
          <div class="code-editor-actions">
            <span v-if="editorSaving" class="editor-status">保存中…</span>
            <span v-else-if="editorDirty" class="editor-status editor-status--dirty">未保存</span>
            <span v-else-if="selectedFile" class="editor-status">已保存</span>
            <button class="icon-btn" :disabled="!selectedFile" title="保存 (⌘/Ctrl+S)" @click="saveEditor"><i class="fa-solid fa-floppy-disk text-[11px]"></i></button>
            <button class="icon-btn" :disabled="!selectedFile" title="重新读取" @click="reloadFile"><i class="fa-solid fa-arrows-rotate text-[11px]"></i></button>
            <span class="editor-action-divider"></span>
            <div class="layout-controls" aria-label="工作区布局控制">
              <button class="layout-btn" :class="{ 'layout-btn--on': showTree }" :title="showTree ? '隐藏左侧栏' : '显示左侧栏'" @click="showTree = !showTree"><span class="layout-glyph layout-glyph--left"></span></button>
              <button class="layout-btn" :class="{ 'layout-btn--on': terminalOpen }" :title="terminalOpen ? '隐藏终端面板' : '显示终端面板'" @click="toggleTerminal"><span class="layout-glyph layout-glyph--bottom"></span></button>
              <button class="layout-btn" :class="{ 'layout-btn--on': showChat }" :title="showChat ? '隐藏 AI coding' : '显示 AI coding'" @click="showChat = !showChat"><span class="layout-glyph layout-glyph--right"></span></button>
              <button class="layout-btn layout-btn--tooltip" aria-label="恢复默认布局" @click="resetWorkspaceLayout"><span class="layout-glyph layout-glyph--grid"></span><span class="layout-tooltip" role="tooltip">恢复默认布局</span></button>
            </div>
          </div>
        </div>
        <div v-if="!selectedFile" class="code-editor-empty"><i class="fa-solid fa-file-code"></i><strong>从左侧打开一个文件</strong><span>代码会显示在这里，AI 修改文件后也会实时同步。</span></div>
        <div v-else-if="fileLoading" class="code-editor-empty"><i class="fa-solid fa-spinner fa-spin"></i><span>读取文件中…</span></div>
        <div v-else-if="fileError" class="code-editor-empty code-editor-empty--error"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ fileError }}</span></div>
        <div v-else class="editor-surface">
          <div class="editor-gutter" aria-hidden="true"><span v-for="line in editorLineCount" :key="line">{{ line }}</span></div>
          <textarea ref="editorRef" v-model="editorDraft" class="editor-input" spellcheck="false" :aria-label="selectedFile ? `编辑 ${selectedFile}` : '代码编辑器'" @input="editorDirty = true" @keydown="handleEditorKeydown"></textarea>
        </div>
      </section>
      <div v-if="terminalOpen" class="terminal-height-resizer" @mousedown.prevent="startTerminalDrag"></div>
      <section class="terminal-panel" :class="{ 'terminal-panel--closed': !terminalOpen }" :style="{ height: terminalOpen ? `${terminalH}px` : '36px' }">
        <div class="terminal-head">
          <div class="terminal-tabs">
            <button class="terminal-new-btn" title="新建终端" @click="newTerminal"><i class="fa-solid fa-plus"></i></button>
            <button
              v-for="item in terminalRecords"
              :key="item.id"
              class="terminal-tab"
              :class="{ 'terminal-tab--active': item.id === activeTerminalId }"
              @click="selectTerminal(item.id)"
            >
              <i class="fa-solid fa-terminal"></i>
              <span>{{ item.label }}</span>
              <i class="fa-solid fa-xmark terminal-tab-close" title="关闭终端" @click.stop="closeTerminal(item.id)"></i>
            </button>
          </div>
          <div class="terminal-actions">
            <span class="terminal-cwd" :title="workspace?.path">{{ workspace?.path || '当前工作区' }}</span>
            <select v-model="terminalShell" class="terminal-shell-select" title="选择终端"><option v-for="shell in terminalShells" :key="shell.id" :value="shell.id">{{ shell.label }}</option></select>
            <button class="terminal-icon-btn" title="清空终端" @click="clearTerminal"><i class="fa-solid fa-eraser"></i></button>
            <button class="terminal-icon-btn" title="重启终端" @click="restartTerminal"><i class="fa-solid fa-arrows-rotate"></i></button>
            <button class="terminal-icon-btn" :title="terminalOpen ? '收起终端' : '展开终端'" @click="toggleTerminal"><i class="fa-solid" :class="terminalOpen ? 'fa-chevron-down' : 'fa-chevron-up'"></i></button>
          </div>
        </div>
        <div
          v-for="item in terminalRecords"
          :key="item.id"
          :ref="(el) => setTerminalHost(item.id, el)"
          class="terminal-screen"
          :class="{ 'terminal-screen--hidden': !terminalOpen || item.id !== activeTerminalId }"
          @click="focusTerminal(item.id)"
        ></div>
      </section>
    </section>
    <aside
      v-if="!showChat"
      class="code-collapsed-rail code-collapsed-rail--right"
      title="显示 AI coding"
      @click="showChat = true"
    >
      <i class="fa-solid fa-sparkles"></i>
      <span>AI coding</span>
    </aside>
    <div v-if="entryAction" class="entry-dialog-backdrop" @click.self="entryAction = null">
      <div class="entry-dialog">
        <h3>{{ entryAction.mode === 'rename' ? '重命名' : entryAction.mode === 'file' ? '新建文件' : '新建文件夹' }}</h3>
        <p>{{ entryAction.mode === 'rename' ? entryAction.path : (entryAction.parent || workspace?.name || '工作区根目录') }}</p>
        <input ref="entryNameInput" v-model="entryAction.name" type="text" placeholder="输入名称" @keydown.enter="submitEntryAction" @keydown.esc="entryAction = null" />
        <div class="entry-dialog-actions"><button @click="entryAction = null">取消</button><button class="entry-dialog-confirm" @click="submitEntryAction">确认</button></div>
      </div>
    </div>
    <Teleport to="body">
      <div v-if="entryMenu" class="entry-menu" :style="{ left: `${entryMenu.x}px`, top: `${entryMenu.y}px` }">
        <button v-for="action in entryMenu.actions" :key="action.id" @click="runEntryMenuAction(action.id)"><i :class="action.icon"></i>{{ action.label }}</button>
      </div>
      <div v-if="entryNotice" class="entry-notice" @click="entryNotice = ''">{{ entryNotice }}</div>
    </Teleport>
    <DiffApprovalDialog
      v-if="pendingDiff"
      :file-path="pendingDiff.convTitle ? `〔${pendingDiff.convTitle}〕${pendingDiff.filePath}` : pendingDiff.filePath"
      :old-text="pendingDiff.oldText"
      :new-text="pendingDiff.newText"
      @approve="respondDiff(true)"
      @reject="respondDiff(false)"
    />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import FileTree from '@/components/code/FileTree.vue';
import DiffApprovalDialog from '@/components/code/DiffApprovalDialog.vue';
import { useChatComposer } from '@/composables/useChatComposer';
import { marked } from 'marked';
import { useTheme } from '@/composables/useTheme.js';

const props = defineProps({ id: { type: String, required: true } });

const { theme } = useTheme();

// xterm 的配色是 JS 对象，CSS 变量到不了，只能各备一套并在切主题时手动刷。
const TERMINAL_THEMES = {
  blue: {
    background: '#f8fbff', foreground: '#334155', cursor: '#4f86e8', selectionBackground: '#cfe0f5',
    black: '#52677f', blue: '#4f86e8', cyan: '#328ea8', green: '#3a9b72', red: '#d45d68', yellow: '#c47b19',
  },
  brown: {
    background: '#faf8f3', foreground: '#564d42', cursor: '#8f5a18', selectionBackground: '#e7dcc6',
    black: '#6d6254', blue: '#8f5a18', cyan: '#a87833', green: '#5d7a4f', red: '#a8432f', yellow: '#b8860b',
  },
};
const terminalTheme = () => TERMINAL_THEMES[theme.value] || TERMINAL_THEMES.blue;

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
const showChat = ref(true);
const terminalOpen = ref(false);
const terminalH = ref(240);
const terminalShell = ref('cmd');
const terminalShells = ref([{ id: 'cmd', label: '命令提示符' }, { id: 'powershell', label: 'PowerShell' }]);
const terminalRecords = ref([]);
const activeTerminalId = ref('');
const terminalHosts = new Map();
const terminalInstances = new Map();
const terminalFits = new Map();
const terminalUnsubs = new Map();
let terminalCounter = 1;
let unsubTerminalExit = null;
let unsubTerminalData = null;

const entryAction = ref(null);
const entryNameInput = ref(null);
const entryMenu = ref(null);
const entryNotice = ref('');
const entryClipboard = ref(null);
const collapseAllDirs = () => { const dirs = new Set(); const collect = (nodes) => nodes.forEach((n) => { if (n.isDirectory) { dirs.add(n.relPath); collect(n.children || []); } }); collect(tree.value); collapsedDirs.value = dirs; };
const showRootMenu = (event) => { showEntryMenu({ event, node: { name: workspace.value?.name || '工作区', relPath: '', isDirectory: true } }); };
const beginEntryAction = (mode, parent = '') => { entryMenu.value = null; entryAction.value = { mode, parent, path: parent, name: '' }; nextTick(() => entryNameInput.value?.focus()); };
const showEntryMenu = ({ event, node }) => {
  const actions = node.isDirectory
    ? [{ id: 'new-file', label: '新建文件', icon: 'fa-regular fa-file' }, { id: 'new-folder', label: '新建文件夹', icon: 'fa-solid fa-folder-plus' }, { id: 'paste', label: '粘贴', icon: 'fa-solid fa-paste' }, { id: 'rename', label: '重命名', icon: 'fa-solid fa-pen' }, { id: 'copy-path', label: '复制路径', icon: 'fa-solid fa-link' }, { id: 'reveal', label: '在系统中显示', icon: 'fa-solid fa-arrow-up-right-from-square' }, { id: 'terminal', label: '在终端中打开', icon: 'fa-solid fa-terminal' }]
    : [{ id: 'open', label: '打开', icon: 'fa-regular fa-file-code' }, { id: 'copy', label: '复制', icon: 'fa-regular fa-copy' }, { id: 'rename', label: '重命名', icon: 'fa-solid fa-pen' }, { id: 'delete', label: '删除', icon: 'fa-solid fa-trash' }, { id: 'copy-path', label: '复制路径', icon: 'fa-solid fa-link' }, { id: 'reveal', label: '在系统中显示', icon: 'fa-solid fa-arrow-up-right-from-square' }, { id: 'terminal', label: '在终端中打开', icon: 'fa-solid fa-terminal' }];
  entryMenu.value = { node, x: Math.min(event.clientX, window.innerWidth - 190), y: Math.min(event.clientY, window.innerHeight - actions.length * 34 - 12), actions };
};
const submitEntryAction = async () => {
  const action = entryAction.value; const name = action?.name?.trim(); if (!action || !name) return;
  let res;
  if (action.mode === 'rename') res = await window.api.code.renameEntry(props.id, action.path, name);
  else res = await window.api.code.createEntry(props.id, action.parent || '', name, action.mode === 'folder');
  if (!res?.success) { entryNotice.value = res?.error || '操作失败'; return; }
  entryAction.value = null; await refreshTree();
  if (!res.relPath) return;
  if (action.mode === 'file' || action.mode === 'rename') selectFile(res.relPath);
};
const runEntryMenuAction = async (id) => {
  const menu = entryMenu.value; if (!menu) return; const node = menu.node; entryMenu.value = null;
  if (id === 'open') return selectFile(node.relPath);
  if (id === 'new-file') return beginEntryAction('file', node.relPath);
  if (id === 'new-folder') return beginEntryAction('folder', node.relPath);
  if (id === 'rename') return beginEntryAction('rename', node.relPath);
  if (id === 'delete') { if (!confirm(`确定删除“${node.name}”吗？`)) return; const res = await window.api.code.deleteEntry(props.id, node.relPath); if (!res?.success) { entryNotice.value = res?.error || '删除失败'; return; } closeOpenFile(node.relPath); if (selectedFile.value === node.relPath) closePreview(); return refreshTree(); }
  if (id === 'copy') { entryClipboard.value = { path: node.relPath, name: node.name }; entryNotice.value = '已复制，可在目标文件夹菜单中粘贴'; return; }
  if (id === 'paste') { if (!entryClipboard.value) { entryNotice.value = '剪贴板为空'; return; } const res = await window.api.code.copyEntry(props.id, entryClipboard.value.path, node.relPath); if (!res?.success) entryNotice.value = res?.error || '粘贴失败'; else { entryNotice.value = '已粘贴'; refreshTree(); } return; }
  if (id === 'copy-path') { await navigator.clipboard?.writeText(node.relPath || workspace.value?.path || ''); entryNotice.value = '已复制相对路径'; return; }
  if (id === 'reveal') { await window.api.code.revealEntry(props.id, node.relPath); return; }
  if (id === 'terminal') { const record = getTerminalRecord(activeTerminalId.value); if (record?.terminalId) { window.api.code.terminal.cd(record.terminalId, node.isDirectory ? node.relPath : node.relPath.split('/').slice(0, -1).join('/') || '.'); terminalOpen.value = true; } else { terminalOpen.value = true; await newTerminal(); } }
};
const resetWorkspaceLayout = () => {
  showTree.value = true;
  showPreview.value = true;
  showChat.value = true;
  sidebarW.value = 0;
  previewW.value = 0;
  terminalH.value = 240;
};
const getTerminalRecord = (id) => terminalRecords.value.find((item) => item.id === id);
const setTerminalHost = (id, el) => { if (el) terminalHosts.set(id, el); else terminalHosts.delete(id); };
const focusTerminal = (id = activeTerminalId.value) => terminalInstances.get(id)?.focus();
const fitTerminal = (id = activeTerminalId.value) => {
  const fit = terminalFits.get(id);
  const instance = terminalInstances.get(id);
  if (!terminalOpen.value || !fit || !instance) return;
  nextTick(() => { fit.fit(); const record = getTerminalRecord(id); if (record?.terminalId) window.api.code.terminal.resize(record.terminalId, instance.cols, instance.rows); });
};
const toggleTerminal = async () => {
  terminalOpen.value = !terminalOpen.value;
  if (terminalOpen.value && !activeTerminalId.value) await newTerminal();
  fitTerminal();
  nextTick(() => focusTerminal());
};
const selectTerminal = (id) => { if (!getTerminalRecord(id)) return; activeTerminalId.value = id; fitTerminal(id); nextTick(() => focusTerminal(id)); };
const clearTerminal = () => terminalInstances.get(activeTerminalId.value)?.clear();
const startTerminalDrag = (e) => {
  const startY = e.clientY; const startH = terminalH.value;
  const onMove = (ev) => { terminalH.value = Math.max(120, Math.min(520, startH + startY - ev.clientY)); fitTerminal(); };
  const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); fitTerminal(); };
  window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
};
const killTerminalRecord = async (record) => { if (record?.terminalId) await window.api.code.terminal.kill(record.terminalId).catch(() => {}); };
const closeTerminal = async (id) => {
  const record = getTerminalRecord(id); if (!record) return;
  await killTerminalRecord(record);
  terminalUnsubs.get(id)?.(); terminalUnsubs.delete(id);
  terminalInstances.get(id)?.dispose(); terminalInstances.delete(id); terminalFits.delete(id); terminalHosts.delete(id);
  terminalRecords.value = terminalRecords.value.filter((item) => item.id !== id);
  if (!terminalRecords.value.length) { activeTerminalId.value = ''; return; }
  if (activeTerminalId.value === id) selectTerminal(terminalRecords.value[Math.max(0, terminalRecords.value.length - 1)].id);
};
const newTerminal = async () => {
  const id = `terminal-${Date.now()}-${terminalCounter++}`;
  const instance = new Terminal({ convertEol: true, cursorBlink: true, fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', theme: terminalTheme() });
  const fit = new FitAddon(); instance.loadAddon(fit);
  terminalRecords.value.push({ id, label: terminalShell.value, terminalId: '', shellId: terminalShell.value });
  terminalInstances.set(id, instance); terminalFits.set(id, fit); activeTerminalId.value = id;
  await nextTick();
  const host = terminalHosts.get(id); if (host) instance.open(host);
  instance.onData((data) => { const record = getTerminalRecord(id); if (record?.terminalId) window.api.code.terminal.input(record.terminalId, data); });
  instance.onResize(({ cols, rows }) => { const record = getTerminalRecord(id); if (record?.terminalId) window.api.code.terminal.resize(record.terminalId, cols, rows); });
  const res = await window.api.code.terminal.create(props.id, terminalShell.value);
  if (!res?.success) { instance.writeln(`\r\n终端启动失败：${res?.error || '未知错误'}`); return; }
  const record = getTerminalRecord(id); if (!record) return;
  record.terminalId = res.terminalId; record.label = res.shell.label; record.shellId = res.shell.id;
  terminalShells.value = res.platform === 'win32' ? [{ id: 'cmd', label: '命令提示符' }, { id: 'powershell', label: 'PowerShell' }] : [{ id: 'zsh', label: 'zsh' }, { id: 'bash', label: 'bash' }];
  terminalShell.value = res.shell.id;
  fitTerminal(id); nextTick(() => focusTerminal(id));
};
const restartTerminal = async () => { const id = activeTerminalId.value; const record = getTerminalRecord(id); if (!record) return; await killTerminalRecord(record); record.terminalId = ''; const res = await window.api.code.terminal.create(props.id, record.shellId); if (res?.success) { record.terminalId = res.terminalId; record.label = res.shell.label; fitTerminal(id); } };
const handleTerminalData = (payload) => { const record = terminalRecords.value.find((item) => item.terminalId === payload?.terminalId); if (record) terminalInstances.get(record.id)?.write(payload.data || ''); };
const handleTerminalExit = (payload) => { const record = terminalRecords.value.find((item) => item.terminalId === payload?.terminalId); if (record) { terminalInstances.get(record.id)?.writeln('\r\n[终端已退出]'); record.terminalId = ''; } };
watch(theme, () => { const next = terminalTheme(); terminalInstances.forEach((instance) => { instance.options.theme = next; }); });
watch(terminalShell, async (next, old) => { if (next !== old && activeTerminalId.value) { const record = getTerminalRecord(activeTerminalId.value); if (record) { record.shellId = next; await restartTerminal(); } } });
// 三栏宽度：侧栏/预览支持拖拽调整，拖动后再固定为像素宽
const sidebarW = ref(0);      // 0 = 用默认 260px
const previewW = ref(0);      // 0 = 用默认 380px
const draggingPanel = ref('');  // '' | 'sidebar' | 'preview'

function startDrag(e, which) {
  draggingPanel.value = which;
  const handle = e.currentTarget;
  const panel = which === 'sidebar' ? handle.previousElementSibling : handle.nextElementSibling;
  const container = handle.parentElement;
  const startW = panel?.getBoundingClientRect().width || (which === 'sidebar' ? 260 : 380);
  const startX = e.clientX;
  const minCenter = 320;
  const minPanel = which === 'sidebar' ? 180 : 300;
  const maxPanel = Math.max(minPanel, (container?.clientWidth || 1000) - minCenter - (which === 'sidebar' ? (showChat.value ? previewW.value || 380 : 32) : (showTree.value ? sidebarW.value || 260 : 32)) - 10);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  const onMove = (ev) => {
    const delta = which === 'sidebar' ? ev.clientX - startX : startX - ev.clientX;
    const next = Math.min(maxPanel, Math.max(minPanel, startW + delta));
    if (which === 'sidebar') sidebarW.value = next;
    else previewW.value = next;
  };
  const onUp = () => {
    draggingPanel.value = '';
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

const selectedFile = ref('');
const openFiles = ref([]);
const closeOpenFile = (rel) => {
  if (rel === selectedFile.value && editorDirty.value && !confirm('当前文件有未保存修改，关闭后会丢失。继续吗？')) return;
  openFiles.value = openFiles.value.filter((file) => file !== rel);
  if (rel === selectedFile.value) {
    const next = openFiles.value[openFiles.value.length - 1];
    closePreview();
    if (next) selectFile(next);
  }
};
const fileContent = ref(null);
const fileLoading = ref(false);
const fileError = ref('');
const editorRef = ref(null);
const editorDraft = ref('');
const editorDirty = ref(false);
const editorSaving = ref(false);
const editorLineCount = computed(() => Math.max(1, String(editorDraft.value || '').split('\n').length));

const syncEditorContent = (content) => {
  fileContent.value = content;
  editorDraft.value = typeof content === 'string' ? content : '';
  editorDirty.value = false;
};

const saveEditor = async () => {
  if (!selectedFile.value || editorSaving.value) return;
  editorSaving.value = true;
  fileError.value = '';
  try {
    const res = await window.api.code.writeFile(props.id, selectedFile.value, editorDraft.value);
    if (!res || !res.success) throw new Error((res && res.error) || '保存失败');
    syncEditorContent(editorDraft.value);
    refreshTree();
  } catch (e) {
    fileError.value = `保存失败：${e.message}`;
  } finally {
    editorSaving.value = false;
  }
};

const handleEditorKeydown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveEditor();
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    editorDraft.value = `${editorDraft.value.slice(0, start)}  ${editorDraft.value.slice(end)}`;
    editorDirty.value = true;
    nextTick(() => { el.selectionStart = el.selectionEnd = start + 2; });
  }
};

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

const ensurePromises = new Map();
const ensureConvSession = async (convId) => {
  const c = conversations.value.find((x) => x.id === convId);
  if (!c) return '';
  if (ensurePromises.has(convId)) return ensurePromises.get(convId);
  const promise = (async () => {
    try {
      const r = await window.api.code.ensureSession(props.id, convId);
      if (r?.sessionId) c.sessionId = r.sessionId;
      return c.sessionId || '';
    } catch (e) { console.error('[CodeWorkspace] ensureSession failed:', e); return ''; }
    finally { ensurePromises.delete(convId); }
  })();
  ensurePromises.set(convId, promise);
  return promise;
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
    // 不在主进程里同步等 session 建好（要一两秒，点「+」时界面僵住）。
    // 先把空会话推上来让 tab 立刻出现；session 交给首次发送前的 ensureConvSession 懒建。
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

// 把当前会话 messages 落盘。messages 数组元素是 Vue reactive Proxy(thinkingSteps/meta
// 等字段同理)，ipcRenderer.invoke 走 structured clone，Proxy 直接传会抛
// "An object could not be cloned"——而且是同步抛在 send() 内部，会把发送流程整个
// 打断（后面的 window.api.code.prompt 根本没机会跑），表现就是「点发送后 AI 不回复」。
// 用 JSON.parse(JSON.stringify(...)) 摊平成纯对象，顺带保留 strip 附件 base64 的约定。
const stripAttachmentsData = (msgs) =>
  msgs.map((m) => {
    if (!m.attachments || !m.attachments.length) return m;
    return { ...m, attachments: m.attachments.map((a) => ({ type: a.type, name: a.name, media_type: a.media_type })) };
  });

const saveConversation = (convId) => {
  const c = conversations.value.find((x) => x.id === convId);
  if (!c) return;
  let plain;
  try {
    plain = JSON.parse(JSON.stringify(stripAttachmentsData(c.messages || [])));
  } catch (e) {
    console.error('[CodeWorkspace] saveConversation serialize failed:', e);
    return;
  }
  window.api.code.saveConversation(props.id, convId, plain).catch((e) =>
    console.error('[CodeWorkspace] saveConversation failed:', e)
  );
};

// AI 写文件时右侧实时跟着变：从工具事件的 diff 块里取 newText 直接推给预览，
// 不等一轮结束再 loadFile 重读（原先整轮写完才刷新，看不到过程）。
const captureLiveEdit = (update) => {
  if (!update) return;
  const blocks = Array.isArray(update.content) ? update.content
    : (update.content ? [update.content] : []);
  const diff = blocks.find((c) => c && (c.type === 'diff' || c.newText != null || c.new_text != null));
  if (!diff) return;

  const rawPath = diff.path || diff.file_path || '';
  const newText = diff.newText ?? diff.new_text ?? '';
  if (!rawPath || typeof newText !== 'string') return;

  // 主进程给的是绝对路径，转成工作区相对路径才能跟文件树的 rel 对上
  const norm = String(rawPath).replace(/\\/g, '/');
  const root = String(workspace.value?.path || '').replace(/\\/g, '/');
  const rel = root && norm.startsWith(root) ? norm.slice(root.length).replace(/^\//, '') : norm;

  // 正在写的文件自动切到预览，省得用户自己去点
  if (selectedFile.value !== rel) {
    selectedFile.value = rel;
    showPreview.value = true;
  }
  fileLoading.value = false;
  fileError.value = '';
  if (!editorDirty.value || selectedFile.value !== rel) syncEditorContent(newText);
  else fileContent.value = newText;
};

// 流式途中节流落盘：一轮可能跑几分钟，中途关窗不该丢掉已输出的内容。
const saveTimers = new Map();
const saveConversationThrottled = (convId) => {
  if (saveTimers.has(convId)) return;
  saveTimers.set(convId, setTimeout(() => {
    saveTimers.delete(convId);
    saveConversation(convId);
  }, 2000));
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
  if (rel === selectedFile.value) return;
  if (editorDirty.value && !confirm('当前文件有未保存修改，切换文件会丢失这些修改。继续吗？')) return;
  selectedFile.value = rel;
  if (!openFiles.value.includes(rel)) openFiles.value.push(rel);
  showPreview.value = true;
  await loadFile(rel);
};

const loadFile = async (rel) => {
  fileLoading.value = true;
  fileError.value = '';
  fileContent.value = null;
  try {
    const res = await window.api.code.readFile(props.id, rel);
    if (res && res.success) syncEditorContent(res.content);
    else fileError.value = (res && res.error) || '读取失败';
  } catch (e) {
    fileError.value = e.message;
  } finally {
    fileLoading.value = false;
  }
};

const reloadFile = () => {
  if (selectedFile.value) loadFile(selectedFile.value);
};

// 关闭预览：清掉选中文件，预览区整块收起（不是只藏起来留个空壳）
const closePreview = () => {
  selectedFile.value = '';
  fileContent.value = null;
  editorDraft.value = '';
  editorDirty.value = false;
  fileError.value = '';
};

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
    // 引擎一个字都没回（事件丢了/被拒/异常静默）→ 给出可见提示，
    // 不要只留一条用户消息让人以为「没反应」。
    if (!last.content && !(last.thinkingSteps || []).length) {
      last.content = '⚠️ 本轮没有收到回复。可能是引擎连接中断或请求被拒绝，请重试；若持续如此，请到设置里检查 AI 引擎状态。';
    }
  } else if (last && last.role === 'user') {
    msgs.push({ id: Date.now() + Math.random(), role: 'assistant', content: '⚠️ 本轮没有收到回复。请重试，或到设置里检查 AI 引擎状态。' });
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
// ACP 的通知体是 { sessionId, update: { sessionUpdate: '<类型名>', content } }。
// 注意 sessionUpdate 是「字符串类型名」而不是嵌套对象——只有下一层确实是对象时
// 才继续往里解包，否则会把 update 变成一条字符串，后面所有分支都匹配不上、
// 整轮回复被静默丢弃（表现就是「AI 不回复」）。
const normalizeUpdate = (data) => {
  let value = data?.update ?? data;
  for (let i = 0; i < 3; i++) {
    if (value && typeof value.update === 'object') { value = value.update; continue; }
    if (value && typeof value.sessionUpdate === 'object') { value = value.sessionUpdate; continue; }
    break;
  }
  return value && typeof value === 'object' ? value : {};
};
const handleSessionUpdate = (data) => {
  const update = normalizeUpdate(data);
  if (!update || typeof update !== 'object') return;
  const sid = data?.sessionId || data?.session_id || update.sessionId || update.session_id || '';
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
    saveConversationThrottled(conv.id);
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
    if (isActive) captureLiveEdit(update);
    const t = streamEndTimers.get(conv.id);
    if (t) clearTimeout(t);
    if (isActive) scrollToBottom();
  } else if (type === 'tool_call_update' || type === 'tool_call_end') {
    const status = update.status || '';
    if (isActive) captureLiveEdit(update);
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
  const sid = await ensureConvSession(convId);
  if (!sid) { const c = conversations.value.find((item) => item.id === convId); c?.messages.push({ id: Date.now(), role: 'assistant', content: '⚠️ AI 会话无法启动。请检查引擎状态，然后重试。' }); return; }

  // 快照附件（发送后即清空 composer），随用户气泡一起展示。
  const sentAtts = atts.map((a) => ({ type: a.type, name: a.name, media_type: a.media_type, data: a.data, text: a.text }));
  draft.value = '';
  if (inputRef.value) inputRef.value.style.height = 'auto';
  composer.clearAttachments();
  // 用 convId 定位目标会话数组，而非 messages.value——避免 await 期间用户切换会话导致推错。
  const sendConv = conversations.value.find((c) => c.id === convId);
  if (!sendConv) return;
  console.log('[mc] send → conv=', sendConv.title, 'sid=', String(sendConv.sessionId).slice(0,8), 'msgsRef===messages.value?', sendConv.messages === messages.value);
  sendConv.messages.push({ id: Date.now(), role: 'user', content: text, attachments: sentAtts });
  // 立刻落盘：原先只在 finishStream 里存一次，流式途中切走/关窗这一轮就永久丢了
  saveConversation(convId);
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

// 中文输入法选词时按回车会触发 keydown.enter，但此时 isComposing 为 true，
// 不能当成发送——否则选个词就把半句话发出去了。
// 输入框随内容自增高（1 行起步，最多 160px），发完/清空要缩回去，
// 不然发一条长消息之后输入框永远占着那么高。
const autoGrowInput = (e) => {
  const el = e.target;
  el.style.height = 'auto';
  el.style.height = `${Math.min(160, el.scrollHeight)}px`;
};

const onEnterKey = (e) => {
  if (e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  send();
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
  if (window.api?.code?.terminal) {
    unsubTerminalExit = window.api.code.terminal.onExit(handleTerminalExit);
    unsubTerminalData = window.api.code.terminal.onData(handleTerminalData);
  }
  window.addEventListener('resize', fitTerminal);
  if (window.api?.hermes?.onSessionUpdate) unsubUpdate = window.api.hermes.onSessionUpdate(handleSessionUpdate);
  if (window.api?.hermes?.onPermissionRequest) unsubPerm = window.api.hermes.onPermissionRequest(handlePermissionRequest);
});

onUnmounted(() => {
  // 必须先摘监听再 dispose，否则下次窗口 resize 会对已销毁的 xterm 调 fit()；
  // 而且每进一次代码模式就多累积一个（原先还多挂了个匿名的，压根摘不掉）。
  window.removeEventListener('resize', fitTerminal);
  if (unsubUpdate) unsubUpdate();
  if (unsubPerm) unsubPerm();
  if (unsubTerminalData) unsubTerminalData();
  if (unsubTerminalExit) unsubTerminalExit();
  for (const record of terminalRecords.value) killTerminalRecord(record);
  for (const instance of terminalInstances.values()) instance.dispose();
  terminalInstances.clear(); terminalFits.clear(); terminalHosts.clear(); terminalRecords.value = [];
  for (const t of streamEndTimers.values()) clearTimeout(t);
  streamEndTimers.clear();
  // 卸载正好落在节流窗口里时，待存的内容要立刻冲掉，否则这段又丢了
  for (const [convId, t] of saveTimers) {
    clearTimeout(t);
    saveConversation(convId);
  }
  saveTimers.clear();
});
</script>

<style scoped>
.entry-dialog-backdrop { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; background: rgba(15,23,42,.18); }
.entry-dialog { width: 340px; padding: 18px; border: 1px solid var(--ui-brand-soft-2); border-radius: 12px; background: #fff; box-shadow: 0 12px 35px hsl(var(--primary) / 18%); }
.entry-dialog h3 { margin: 0 0 4px; color: var(--ui-ink-3); font-size: 14px; }
.entry-dialog p { margin: 0 0 12px; overflow: hidden; color: var(--ui-text-3); font: 11px ui-monospace, monospace; text-overflow: ellipsis; white-space: nowrap; }
.entry-dialog input { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid var(--ui-brand-soft-2); border-radius: 7px; outline: 0; color: var(--ui-ink-3); font-size: 12px; }
.entry-dialog input:focus { border-color: var(--ui-brand-light); box-shadow: 0 0 0 3px hsl(var(--primary) / 12%); }
.entry-dialog-actions { display: flex; justify-content: flex-end; gap: 7px; margin-top: 14px; }
.entry-dialog-actions button { padding: 6px 12px; border: 0; border-radius: 6px; color: var(--ui-text-2); background: var(--ui-bg-2); cursor: pointer; font-size: 12px; }
.entry-dialog-actions .entry-dialog-confirm { color: #fff; background: var(--ui-brand); }
.entry-menu { position: fixed; z-index: 2147483647; min-width: 178px; padding: 5px; border: 1px solid var(--ui-brand-soft-2); border-radius: 8px; background: #fff; box-shadow: 0 8px 25px rgba(15,23,42,.16); }
.entry-menu button { width: 100%; display: flex; align-items: center; gap: 8px; padding: 7px 9px; border: 0; border-radius: 5px; color: var(--ui-text); background: transparent; cursor: pointer; text-align: left; font-size: 11.5px; }
.entry-menu button:hover { color: var(--ui-brand); background: var(--ui-brand-soft); }
.entry-menu i { width: 14px; color: var(--ui-text-3); text-align: center; }
.entry-notice { position: fixed; z-index: 90; left: 50%; bottom: 24px; transform: translateX(-50%); padding: 8px 14px; border-radius: 7px; color: #fff; background: var(--ui-ink-3); box-shadow: 0 5px 16px rgba(15,23,42,.2); font-size: 12px; cursor: pointer; }

.code-workspace-shell { flex: 1; min-height: 0; display: flex; overflow: hidden; background: var(--ui-brand-soft); }
.code-workspace-main { position: relative; flex: 1; min-width: 0; min-height: 0; display: flex; overflow: hidden; }
.code-center { order: 2; flex: 1 1 0; min-width: 320px; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--ui-brand-soft); }
.code-center--hidden { display: none; }
.open-file-tabs { height: 35px; flex-shrink: 0; display: flex; align-items: stretch; overflow-x: auto; background: var(--ui-brand-soft); border-bottom: 1px solid var(--ui-brand-soft-2); }
.open-file-tab { max-width: 190px; min-width: 92px; display: flex; align-items: center; gap: 7px; padding: 0 10px; border: 0; border-right: 1px solid var(--ui-brand-soft-2); background: var(--ui-brand-soft); color: var(--ui-text-2); font-size: 11.5px; cursor: pointer; }
.open-file-tab span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.open-file-tab--active { color: var(--ui-brand-dark); background: #fff; box-shadow: inset 0 -2px var(--ui-brand); }
.open-file-close { opacity: 0; font-size: 9px; }
.open-file-tab:hover .open-file-close, .open-file-tab--active .open-file-close { opacity: .65; }
.open-file-placeholder { padding: 0 12px; align-self: center; color: var(--ui-text-3); font-size: 11px; }
.terminal-height-resizer { height: 5px; flex-shrink: 0; cursor: row-resize; background: transparent; border-top: 1px solid var(--ui-brand-soft-2); }
.terminal-height-resizer:hover { background: hsl(var(--primary) / 25%); }
.terminal-panel { flex: 0 0 auto; min-height: 36px; display: flex; flex-direction: column; background: var(--ui-brand-soft); border-top: 0; box-shadow: 0 -4px 14px rgba(53, 102, 158, .06); }
.terminal-head { height: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 10px 0 14px; background: var(--ui-brand-soft); border-bottom: 1px solid var(--ui-brand-soft-2); }
.terminal-tabs, .terminal-actions { display: flex; align-items: center; gap: 7px; min-width: 0; }
.terminal-new-btn { width: 25px; height: 25px; display: grid; place-items: center; border: 0; border-radius: 6px; color: var(--ui-text-3); background: transparent; cursor: pointer; }
.terminal-new-btn:hover { color: var(--ui-brand); background: var(--ui-brand-soft); }
.terminal-tab { display: inline-flex; align-items: center; gap: 6px; }
.terminal-tab-close { opacity: .45; font-size: 9px; }
.terminal-tab:hover .terminal-tab-close { opacity: 1; }
.terminal-cwd { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ui-text-3); font: 10.5px ui-monospace, SFMono-Regular, Menlo, monospace; }
.terminal-shell-select { height: 25px; padding: 0 6px; border: 1px solid var(--ui-brand-soft-2); border-radius: 6px; outline: 0; background: #fff; color: var(--ui-ink-3); font-size: 11px; }
.terminal-icon-btn { width: 25px; height: 25px; display: grid; place-items: center; border: 0; border-radius: 6px; color: var(--ui-text-3); background: transparent; cursor: pointer; }
.terminal-icon-btn:hover { color: var(--ui-brand); background: var(--ui-brand-soft); }
.terminal-screen { flex: 1; min-height: 0; padding: 10px 12px; overflow: hidden; }
.terminal-screen :deep(.xterm) { height: 100%; }
.terminal-screen :deep(.xterm-viewport) { background: var(--ui-brand-soft) !important; }
.terminal-screen--hidden { display: none; }

.code-sidebar {
  order: 0;
  width: 260px; flex-shrink: 0;
  display: flex; flex-direction: column;
  background: var(--ui-brand-soft);
  border-right: 1px solid var(--ui-brand-soft-2);
}
.code-sidebar--collapsed { display: none; }
.code-collapsed-rail { width: 32px; flex: 0 0 32px; min-height: 0; display: flex; flex-direction: column; align-items: center; gap: 10px; padding-top: 12px; color: var(--ui-text-3); background: var(--ui-brand-soft); border-right: 1px solid var(--ui-brand-soft-2); cursor: pointer; user-select: none; }
.code-collapsed-rail--right { order: 5; border-right: 0; border-left: 1px solid var(--ui-brand-soft-2); }
.code-collapsed-rail:hover { color: var(--ui-brand); background: var(--ui-brand-soft); }
.code-collapsed-rail i { font-size: 13px; }
.code-collapsed-rail span { writing-mode: vertical-rl; font-size: 10px; letter-spacing: .04em; }
/* 拖拽把手：视觉上只有 1px 分隔线，命中区域 5px 好抓 */
.code-resizer {
  width: 5px; flex-shrink: 0;
  cursor: col-resize;
  background: transparent;
  transition: background .15s;
}
.code-resizer:hover,
.code-resizer--on { background: hsl(var(--primary) / 35%); }
/* order 顺序：0 文件树 → 1 左分隔线 → 2 编辑器 → 3 右分隔线 → 4 AI coding。
   之前右分隔线和编辑器同为 order:2，靠 DOM 先后摆位——分隔线写在编辑器前面，
   于是被挤到「文件树/编辑器」之间，跟真正想拖的「编辑器/AI coding」缝隙对不上，
   看起来就是拖不动。 */
.code-resizer--right { order: 3; }
.code-resizer--right:hover, .code-resizer--right.code-resizer--on { background: hsl(var(--primary) / 45%); }
.code-resizer--left { order: 1; }
.code-sidebar-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--ui-brand-soft);
}
.code-tree { flex: 1; overflow: auto; padding: 6px 4px; }

.code-main { flex: 1 1 0; display: flex; flex-direction: column; min-width: 280px; background: #fff; }
.code-chat { order: 4; width: 380px; flex: 0 0 380px; min-width: 300px; max-width: 55vw; background: #ffffff; border: 1px solid var(--ui-brand-soft); border-radius: 12px; overflow: hidden; box-shadow: 0 6px 24px hsl(var(--primary) / 5%); }
.code-chat.code-chat--hidden { display: none !important; }
.code-chat-head { background: linear-gradient(180deg, #ffffff 0%, var(--ui-brand-soft) 100%); border-bottom-color: var(--ui-brand-soft-2); }
.layout-controls { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; }
.layout-btn { width: 25px; height: 25px; display: grid; place-items: center; border: 0; border-radius: 6px; background: transparent; color: var(--ui-text-2); cursor: pointer; }
.layout-btn:hover { background: var(--ui-brand-soft); color: var(--ui-brand); }
.layout-btn--on { color: var(--ui-brand); }
.layout-btn--tooltip { position: relative; }
.layout-tooltip { position: absolute; z-index: 20; top: calc(100% + 7px); right: 0; width: max-content; padding: 5px 8px; border-radius: 6px; color: #fff; background: var(--ui-ink-3); box-shadow: 0 4px 12px rgba(15,23,42,.18); font-size: 11px; line-height: 1.2; pointer-events: none; opacity: 0; transform: translateY(-2px); transition: opacity .12s, transform .12s; }
.layout-tooltip::before { content: ''; position: absolute; right: 8px; bottom: 100%; border: 4px solid transparent; border-bottom-color: var(--ui-ink-3); }
.layout-btn--tooltip:hover .layout-tooltip, .layout-btn--tooltip:focus-visible .layout-tooltip { opacity: 1; transform: translateY(0); }
.layout-glyph { position: relative; width: 14px; height: 11px; display: block; border: 1.4px solid currentColor; border-radius: 2px; }
.layout-glyph--left::before, .layout-glyph--right::before, .layout-glyph--bottom::before { content: ''; position: absolute; background: currentColor; opacity: .8; }
.layout-glyph--left::before { top: 0; bottom: 0; left: 3px; width: 1px; }
.layout-glyph--right::before { top: 0; bottom: 0; right: 3px; width: 1px; }
.layout-glyph--bottom::before { left: 0; right: 0; bottom: 3px; height: 1px; }
.layout-glyph--grid::before, .layout-glyph--grid::after { content: ''; position: absolute; background: currentColor; opacity: .75; }
.layout-glyph--grid::before { top: 0; bottom: 0; left: 50%; width: 1px; }
.layout-glyph--grid::after { left: 0; right: 0; top: 50%; height: 1px; }
.code-chat-context {
  min-width: 0; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  padding-left: 9px; border-left: 1px solid var(--ui-line-2); color: var(--ui-text-3); font: 11px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.code-editor {
  width: auto; flex: 1 1 0; min-height: 0; min-width: 0; display: flex; flex-direction: column;
  background: var(--ui-brand-soft); border: 0; border-radius: 0;
  overflow: hidden; box-shadow: none;
}
.code-editor--hidden { display: none; }
.code-editor-head {
  display: flex; align-items: center; justify-content: space-between; min-height: 46px;
  padding: 0 12px; background: linear-gradient(180deg, #ffffff 0%, var(--ui-brand-soft) 100%); border-bottom: 1px solid var(--ui-brand-soft-2);
}
.code-editor-tab { display: flex; align-items: center; gap: 8px; min-width: 0; height: 100%; max-width: 65%; padding: 0 13px; color: var(--ui-ink-3); font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; border-bottom: 2px solid var(--ui-brand); }
.code-editor-tab > i { color: var(--ui-brand); }
.code-editor-tab--empty { color: var(--ui-text-3); border-bottom-color: transparent; }
.editor-dirty-dot { width: 7px; height: 7px; flex-shrink: 0; border-radius: 50%; background: #f3ad4b; box-shadow: 0 0 0 3px rgba(243, 173, 75, .14); }
.code-editor-actions { display: flex; align-items: center; gap: 4px; }
.editor-action-divider { width: 1px; height: 16px; margin: 0 5px; background: var(--ui-brand-soft-2); }
.code-editor-actions .layout-controls { margin-left: 0; }
.editor-status { color: var(--ui-text-3); font-size: 11px; margin-right: 4px; }
.editor-status--dirty { color: #c47b19; }
.code-editor-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--ui-text-3); font-size: 12px; background: radial-gradient(circle at 50% 42%, rgba(219, 234, 254, .52), transparent 32%); }
.code-editor-empty i { display: grid; place-items: center; width: 54px; height: 54px; margin-bottom: 4px; border: 1px solid var(--ui-brand-soft-2); border-radius: 16px; color: var(--ui-brand-light); background: var(--ui-brand-soft); font-size: 22px; }
.code-editor-empty strong { color: var(--ui-ink-3); font-size: 13px; }
.code-editor-empty--error { color: #c47b19; }
.code-editor-empty--error i { color: #e2a23d; background: #fff8e9; border-color: #f1dfb6; }
.editor-surface { flex: 1; min-height: 0; display: flex; overflow: hidden; background: var(--ui-brand-soft); }
.editor-gutter { width: 56px; flex-shrink: 0; padding: 16px 13px 16px 0; overflow: hidden; color: var(--ui-text-3); background: linear-gradient(90deg, var(--ui-brand-soft) 0%, var(--ui-brand-soft) 100%); border-right: 1px solid var(--ui-brand-soft); font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; text-align: right; user-select: none; }
.editor-gutter span { display: block; height: 19.2px; }
.editor-input { flex: 1; min-width: 0; resize: none; border: 0; outline: 0; padding: 16px 20px; overflow: auto; background: var(--ui-brand-soft); color: var(--ui-ink-3); caret-color: var(--ui-brand); font: 12.5px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; tab-size: 2; white-space: pre; }
.editor-input::selection { background: rgba(96, 150, 235, .2); }
.editor-input:focus { box-shadow: inset 2px 0 var(--ui-brand-light); }
.editor-input::-webkit-scrollbar { width: 10px; height: 10px; }
.editor-input::-webkit-scrollbar-thumb { border: 3px solid var(--ui-brand-soft); border-radius: 10px; background: var(--ui-brand-soft-2); }
.editor-input::-webkit-scrollbar-thumb:hover { background: var(--ui-brand-light); }
.code-main-head {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; background: #fff; border-bottom: 1px solid var(--ui-brand-soft);
}
/* 会话 tab 栏 */
.conv-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 10px; background: var(--ui-brand-soft); border-bottom: 1px solid var(--ui-brand-soft);
  overflow-x: auto; flex-shrink: 0;
}
.conv-tab {
  display: flex; align-items: center; gap: 7px; flex-shrink: 0;
  padding: 5px 8px 5px 11px; border-radius: 8px; cursor: pointer;
  font-size: 12.5px; color: var(--ui-text-2); background: transparent;
  border: 1px solid transparent; white-space: nowrap; transition: all .12s;
}
.conv-tab:hover { background: var(--ui-brand-soft); }
.conv-tab--on { background: var(--ui-brand-soft); border-color: hsl(var(--primary) / 30%); color: var(--ui-brand-dark); font-weight: 600; }
.conv-tab-title { max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
.conv-x {
  width: 16px; height: 16px; border-radius: 5px; display: flex;
  align-items: center; justify-content: center; font-size: 10px; opacity: .55;
}
.conv-x:hover { opacity: 1; background: rgba(239,68,68,.15); color: #dc2626; }
.conv-new {
  width: 28px; height: 28px; flex-shrink: 0; border: 1px dashed var(--ui-line);
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--ui-text-2); background: transparent; transition: all .12s;
}
.conv-new:hover { border-color: hsl(var(--primary) / 55%); color: var(--ui-brand-dark); }
.code-messages { flex: 1; overflow: auto; padding: 20px; background: linear-gradient(180deg, var(--ui-brand-soft) 0%, var(--ui-brand-soft) 100%); }
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
  background: hsl(var(--primary) / 10%); color: var(--ui-brand-dark); font-size: 11.5px;
}
.att-chip .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bubble--user {
  background: var(--ui-brand); color: #fff;
  padding: 10px 14px; border-radius: 12px; border-bottom-right-radius: 4px;
  font-size: 13.5px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;
}

/* 助手列：头像 + 全宽正文，左对齐 */
.assistant-col { display: flex; gap: 10px; width: 100%; max-width: 100%; }
.assistant-avatar {
  width: 28px; height: 28px; flex-shrink: 0; margin-top: 2px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 8px; background: hsl(var(--primary) / 10%); color: var(--ui-brand);
}
.assistant-body { flex: 1; min-width: 0; }

/* 思考 / 工具步骤：独立折叠区，左侧竖线轨道 */
.think-block { margin-bottom: 10px; }
.think-toggle {
  display: flex; align-items: center; gap: 7px; width: 100%;
  padding: 6px 10px; border: 1px solid var(--ui-brand-soft); border-radius: 9px;
  background: var(--ui-bg-3); color: var(--ui-text-2); font-size: 12px; cursor: pointer;
  transition: background 0.15s;
}
.think-toggle:hover { background: var(--ui-bg-2); }
.think-count {
  font-size: 10px; padding: 1px 6px; border-radius: 999px;
  background: hsl(var(--primary) / 10%); color: var(--ui-brand-dark);
}
.think-rail {
  margin: 6px 0 0 12px; padding-left: 12px;
  border-left: 2px solid hsl(var(--primary) / 15%);
  display: flex; flex-direction: column; gap: 4px;
  max-height: 260px; overflow-y: auto;
}
.think-step { display: flex; align-items: flex-start; gap: 7px; padding: 2px 0; }
.think-ico { font-size: 9px; color: var(--ui-text-3); margin-top: 4px; flex-shrink: 0; }
.think-text { font-size: 12px; line-height: 1.55; color: var(--ui-text-2); word-break: break-word; }
.think-text :deep(code) { background: var(--ui-brand-soft); padding: 0 4px; border-radius: 4px; font-size: 11px; }

/* 正文 markdown */
.assistant-md {
  font-size: 14px; line-height: 1.7; color: var(--ui-ink-2); word-break: break-word;
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
.assistant-md :deep(strong) { font-weight: 600; color: var(--ui-ink); }
.assistant-md :deep(a) { color: var(--ui-brand); text-decoration: underline; }
.assistant-md :deep(code) {
  background: var(--ui-bg-2); color: #be123c;
  padding: 1px 5px; border-radius: 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px;
}
.assistant-md :deep(pre) {
  background: var(--ui-ink); color: var(--ui-line-2);
  padding: 12px 14px; border-radius: 10px; overflow-x: auto; margin: 0 0 10px;
}
.assistant-md :deep(pre code) { background: transparent; color: inherit; padding: 0; font-size: 12.5px; line-height: 1.6; }
.assistant-md :deep(blockquote) {
  border-left: 3px solid var(--ui-line); margin: 0 0 10px; padding: 2px 0 2px 12px; color: var(--ui-text-2);
}
.assistant-md :deep(table) { border-collapse: collapse; margin: 0 0 10px; font-size: 13px; }
.assistant-md :deep(th),
.assistant-md :deep(td) { border: 1px solid var(--ui-line-2); padding: 5px 10px; }
.assistant-md :deep(th) { background: var(--ui-bg-3); font-weight: 600; }
.assistant-md :deep(img) { max-width: 100%; border-radius: 8px; }

/* 回合小结：耗时 + token 的浅色状态条 */
.turn-meta {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  margin-top: 10px; padding-top: 8px;
  border-top: 1px dashed var(--ui-line-2);
  font-size: 11.5px; color: var(--ui-text-3);
}
.tm-item { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.tm-item i { font-size: 10px; }
.tm-dim { color: var(--ui-line); }
.tm-sep { width: 1px; height: 10px; background: var(--ui-line-2); }

.code-composer-wrap { background: #fff; border-top: 1px solid var(--ui-brand-soft-2); }
.composer-atts { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 12px 0; }
.code-composer {
  display: flex; align-items: flex-end; gap: 6px;
  padding: 12px;
}
.tool-btn {
  width: 34px; height: 34px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 9px; background: transparent; color: var(--ui-text-2); cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.tool-btn:hover:not(:disabled) { background: var(--ui-bg-2); color: var(--ui-brand-dark); }
.tool-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tool-btn--rec { background: #ef4444; color: #fff; }
.tool-btn--rec:hover:not(:disabled) { background: #dc2626; color: #fff; }
.code-input {
  flex: 1; resize: none; max-height: 160px; overflow-y: auto;
  border: 1px solid var(--ui-line-2); border-radius: 10px;
  padding: 8px 12px; font-size: 13.5px; color: var(--ui-ink-2); line-height: 1.5;
  outline: none;
}
.code-input:focus { border-color: var(--ui-brand-light); box-shadow: 0 0 0 3px hsl(var(--primary) / 12%); }
.send-btn {
  width: 38px; height: 38px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 10px; background: var(--ui-brand); color: #fff; cursor: pointer;
  transition: background 0.15s;
}
.send-btn:hover:not(:disabled) { background: var(--ui-brand-dark); }
.send-btn:disabled { opacity: 0.4; cursor: default; }
.send-btn--stop { background: #ef4444; }
.send-btn--stop:hover { background: #dc2626; }

.code-preview { width: auto; flex-shrink: 0; }
.code-preview-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 12px; background: var(--ui-ink-2); border-bottom: 1px solid var(--ui-ink-3);
}
.code-preview-head span { color: var(--ui-line); }
.code-preview-body { flex: 1; overflow: auto; }
.code-source {
  margin: 0; padding: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px; line-height: 1.6; color: var(--ui-line-2);
  white-space: pre; word-break: normal;
}

.icon-btn {
  width: 28px; height: 28px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px; color: var(--ui-text-2); cursor: pointer; transition: background 0.15s, color 0.15s;
}
.icon-btn:hover { background: var(--ui-bg-2); color: var(--ui-brand-dark); }
.code-preview-head .icon-btn { color: var(--ui-text-3); }
.code-preview-head .icon-btn:hover { background: var(--ui-ink-3); color: #fff; }
</style>
