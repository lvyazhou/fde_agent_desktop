<template>
  <div class="flex-1 flex flex-col min-w-0 relative bg-white">
    <!-- Messages area -->
    <div ref="chatContainerRef" class="flex-1 overflow-y-auto px-4 pt-5" :class="messages.length > 0 ? 'pb-[160px]' : ''">
      <!-- Loading state -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-24">
        <div class="relative w-12 h-12 mb-5">
          <div class="absolute inset-0 rounded-full border-2 border-blue-100"></div>
          <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin"></div>
          <div class="absolute inset-2 rounded-full bg-white flex items-center justify-center">
            <i class="fa-solid fa-comments text-blue-400 text-sm"></i>
          </div>
        </div>
        <p class="text-sm text-slate-500 font-medium">正在加载对话记录...</p>
        <p class="text-[11px] text-slate-400 mt-1">请稍候</p>
      </div>

      <!-- Empty state: Welcome hero (full height) -->
      <WelcomeHero
        v-else-if="messages.length === 0"
        class="h-full"
        :available-models="availableModels"
        :current-model="currentModel"
        @send-quick="(text) => $emit('send-quick', text)"
        @send-with-attachments="(text, atts) => $emit('send-with-attachments', text, atts)"
        @navigate="(tab) => $emit('navigate', tab)"
        @change-model="(id) => $emit('change-model', id)"
      />

      <!-- Message list -->
      <div v-else class="w-full max-w-4xl mx-auto space-y-7">

        <!-- Message list -->
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          :data-msg-index="idx"
          class="flex flex-col w-full group transition-all duration-300 relative"
          :class="msg.role === 'user' ? 'items-end' : 'items-start'"
        >
          <!-- User Message -->
          <div v-if="msg.role === 'user'" class="relative max-w-[80%] flex flex-col items-end">
            <!-- User attachments (images + files) -->
            <div v-if="msg.attachments && msg.attachments.length > 0" class="flex flex-wrap gap-2 mb-2 justify-end">
              <template v-for="(att, ai) in msg.attachments" :key="ai">
                <img
                  v-if="att.type === 'image' || (!att.type && att.data)"
                  :src="'data:' + (att.media_type || 'image/png') + ';base64,' + att.data"
                  class="max-w-[200px] max-h-[150px] object-cover rounded-xl border border-slate-200 shadow-sm"
                />
                <div
                  v-else
                  class="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-sm max-w-[220px]"
                >
                  <i class="fa-solid fa-file-lines text-blue-500 text-sm shrink-0"></i>
                  <span class="text-[12px] text-slate-600 truncate">{{ att.name || '附件' }}</span>
                </div>
              </template>
            </div>
            <div class="rounded-[18px] px-4 py-2.5 leading-relaxed text-[14px] bg-[#e7edf7] text-slate-800 whitespace-pre-wrap break-words inline-block text-left">
              {{ msg.displayContent || msg.content }}
            </div>
          </div>

          <!-- Assistant Message -->
          <div v-else class="w-full flex flex-col items-start">
            <!-- Thinking Steps -->
            <div v-if="msg.thinkingSteps && msg.thinkingSteps.length > 0" class="mb-3">
              <button
                type="button"
                class="cursor-pointer group/think flex items-center gap-2.5 w-full text-left transition-all duration-300"
                @click="msg.expanded = !msg.expanded"
              >
                <div
                  class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500"
                  :class="msg.thinkingDone ? 'bg-gradient-to-br from-slate-100 to-slate-50 shadow-sm' : 'bg-gradient-to-br from-blue-100 to-indigo-50 shadow-md shadow-blue-100/50'"
                >
                  <i class="fa-solid text-sm transition-all duration-300" :class="msg.thinkingDone ? 'fa-brain text-slate-400' : 'fa-brain text-blue-500 animate-pulse'"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-[13px] font-semibold tracking-tight transition-colors" :class="msg.thinkingDone ? 'text-slate-500' : 'text-blue-700'">
                      {{ msg.thinkingDone ? '推理完成' : '深度推理中' }}
                    </span>
                    <span v-if="!msg.thinkingDone" class="flex gap-[3px]">
                      <span class="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 0ms"></span>
                      <span class="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 150ms"></span>
                      <span class="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 300ms"></span>
                    </span>
                    <i v-if="msg.thinkingDone" class="fa-solid fa-chevron-down text-[9px] text-slate-400 transition-transform duration-300" :class="msg.expanded ? 'rotate-180' : ''"></i>
                  </div>
                  <div class="text-[11px] text-slate-400 mt-0.5 font-medium">
                    {{ msg.thinkingSteps.filter(s => s.visible).length }} 个步骤
                    <template v-if="msg.thinkingDone">· 点击{{ msg.expanded ? '收起' : '展开' }}详情</template>
                  </div>
                </div>
              </button>

              <div v-show="msg.expanded || !msg.thinkingDone" class="mt-2 ml-4 pl-4 border-l-2 border-blue-200/40 space-y-0.5 max-h-[220px] overflow-y-auto transition-all pr-1 scrollbar-hide">
                <div
                  v-for="(step, si) in msg.thinkingSteps"
                  :key="si"
                  v-show="step.visible !== false"
                  class="flex items-start gap-2.5 py-1 group/step"
                >
                  <div class="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors" :class="si === msg.thinkingSteps.length - 1 && !msg.thinkingDone ? 'bg-blue-500 text-white shadow-sm' : 'bg-white border border-slate-200/60 text-slate-400'">
                    <i :class="step.icon || 'fa-solid fa-circle'" class="text-[8px]"></i>
                  </div>
                  <!-- Browser screenshot or image result -->
                  <img v-if="step.image" :src="step.image.startsWith('data:') ? step.image : 'data:image/png;base64,' + step.image" class="max-w-[300px] rounded-lg border border-slate-200 mt-1" />
                  <span v-else class="text-[12px] leading-relaxed text-slate-600" v-html="renderMarkdown(step.text)"></span>
                </div>
              </div>
            </div>

            <!-- Message content: Doubao-style, no bubble, plain text on background -->
            <div v-if="msg.content" class="w-full leading-[1.75] text-[15px] text-slate-800 prose prose-slate max-w-none" v-html="renderAssistantContent(msg.content)">
            </div>

            <!-- Action bar (always visible) -->
            <div v-if="msg.content" class="flex items-center gap-0.5 mt-2">
              <button @click="copyMessage(msg.content, idx)" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer" :title="copiedIdx === idx ? '已复制' : '复制'">
                <i class="text-[13px]" :class="copiedIdx === idx ? 'fa-solid fa-check text-emerald-500' : 'fa-regular fa-copy'"></i>
              </button>
              <button @click="msg.feedback = msg.feedback === 'up' ? null : 'up'" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer" :class="msg.feedback === 'up' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'" title="赞">
                <i class="text-[13px]" :class="msg.feedback === 'up' ? 'fa-solid fa-thumbs-up' : 'fa-regular fa-thumbs-up'"></i>
              </button>
              <button @click="msg.feedback = msg.feedback === 'down' ? null : 'down'" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer" :class="msg.feedback === 'down' ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'" title="踩">
                <i class="text-[13px]" :class="msg.feedback === 'down' ? 'fa-solid fa-thumbs-down' : 'fa-regular fa-thumbs-down'"></i>
              </button>
              <button @click="$emit('regenerate', idx)" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer" title="重新生成">
                <i class="fa-solid fa-rotate-right text-[13px]"></i>
              </button>

              <!-- More menu: 反馈 + 删除 -->
              <div class="relative">
                <button @click.stop="menuIdx = menuIdx === idx ? null : idx" class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer" :class="menuIdx === idx ? 'text-slate-700 bg-slate-100' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'" title="更多">
                  <i class="fa-solid fa-ellipsis text-[13px]"></i>
                </button>
                <div v-if="menuIdx === idx" class="absolute left-0 top-full mt-1 w-32 bg-white border border-slate-200/80 rounded-xl shadow-lg shadow-slate-900/10 py-1 z-30 overflow-hidden">
                  <button @click="$emit('feedback', idx); menuIdx = null" class="w-full px-3 py-2 flex items-center gap-2.5 text-[13px] text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                    <i class="fa-regular fa-comment-dots text-[12px] text-slate-400 w-4"></i>反馈
                  </button>
                  <button @click="$emit('delete', idx); menuIdx = null" class="w-full px-3 py-2 flex items-center gap-2.5 text-[13px] text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer">
                    <i class="fa-regular fa-trash-can text-[12px] w-4"></i>删除
                  </button>
                </div>
              </div>

              <span v-if="msg.timestamp" class="text-[12px] text-slate-400 ml-2 self-center">{{ msg.timestamp }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating input area (hidden when welcome hero is shown - it has its own input) -->
    <div v-if="messages.length > 0" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-10 pb-5 px-4">
      <div class="w-full max-w-4xl mx-auto relative">
        <!-- Slash command palette -->
        <div v-if="showSlashMenu" class="absolute bottom-full mb-2 left-2 right-2 bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-900/5 overflow-hidden z-20 max-h-[220px] overflow-y-auto">
          <div
            v-for="(cmd, ci) in filteredCommands"
            :key="cmd.name || ci"
            @click="selectCommand(cmd)"
            class="px-4 py-2.5 hover:bg-blue-50/70 cursor-pointer flex items-center gap-3 text-[12px] transition-colors"
          >
            <span class="text-blue-600 font-mono font-semibold shrink-0">/{{ cmd.name }}</span>
            <span class="text-slate-500 truncate">{{ cmd.hint || cmd.description || '' }}</span>
          </div>
          <div v-if="filteredCommands.length === 0" class="px-4 py-3 text-[11px] text-slate-400 text-center">无匹配命令</div>
        </div>

        <!-- Doubao-style composer -->
        <div
          class="group/composer rounded-[26px] border transition-all duration-200"
          :class="isFocused ? 'bg-white border-blue-400/70 shadow-[0_6px_28px_-8px_rgba(59,130,246,0.28)]' : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-[0_2px_12px_-6px_rgba(15,23,42,0.12)]'"
        >
          <!-- Attachment preview (images + files) -->
          <div v-if="chatAttachments.length > 0" class="flex items-center gap-2 px-5 pt-4 flex-wrap">
            <div v-for="(att, ai) in chatAttachments" :key="ai" class="relative group/att">
              <img v-if="att.type === 'image'" :src="'data:' + att.media_type + ';base64,' + att.data" class="w-14 h-14 object-cover rounded-xl border border-slate-200" />
              <div v-else class="flex items-center gap-2 h-14 px-3 rounded-xl border border-slate-200 bg-white max-w-[200px]">
                <i class="fa-solid fa-file-lines text-blue-500 text-base shrink-0"></i>
                <div class="min-w-0">
                  <div class="text-[12px] text-slate-700 truncate">{{ att.name }}</div>
                  <div class="text-[10px] text-slate-400">{{ att.text != null ? '文本' : '文件' }}</div>
                </div>
              </div>
              <button @click="chatAttachments.splice(ai, 1)" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700/90 hover:bg-rose-500 text-white text-[9px] flex items-center justify-center transition-colors cursor-pointer shadow-sm">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <textarea
            ref="inputRef"
            v-model="inputText"
            :placeholder="isStreaming ? 'AI 正在响应中…' : '发消息、输入 / 唤起指令，Ctrl + Enter 发送'"
            rows="1"
            :disabled="isStreaming"
            @input="autoGrow"
            @focus="isFocused = true"
            @blur="isFocused = false"
            class="w-full resize-none text-[14px] text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none leading-6 px-5 pt-4 pb-1 max-h-[168px] scrollbar-hide disabled:opacity-60"
            @keydown.ctrl.enter.prevent="sendMessage"
            @keydown.meta.enter.prevent="sendMessage"
          ></textarea>

          <!-- Bottom toolbar -->
          <div class="flex items-center justify-between px-3 pb-3 pt-1.5">
            <div class="flex items-center gap-1.5">
              <ModelSelector
                :models="availableModels"
                :current="currentModel"
                @change="(id) => $emit('change-model', id)"
              />
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 cursor-pointer hover:bg-blue-100 transition-colors" style="font-size:10px;line-height:1">
                <i class="fa-solid fa-robot" style="font-size:9px"></i>
                AI 产品设计智能体
                <i class="fa-solid fa-chevron-down ml-0.5" style="font-size:7px"></i>
              </span>
              <button
                @click="pickImage"
                :disabled="isStreaming"
                class="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="上传图片"
              >
                <i class="fa-solid fa-image text-xs"></i>
              </button>
              <button
                @click="pickFile"
                :disabled="isStreaming"
                class="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="上传文件"
              >
                <i class="fa-solid fa-paperclip text-xs"></i>
              </button>
              <button
                @click="toggleRecording"
                :disabled="isStreaming || !recordingSupported"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                :class="isRecording ? 'text-white bg-rose-500 hover:bg-rose-600' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'"
                :title="recordingSupported ? (isRecording ? '停止录音' : '语音输入') : '当前环境不支持录音'"
              >
                <i class="fa-solid text-xs" :class="isRecording ? 'fa-stop' : 'fa-microphone'"></i>
              </button>
              <span v-if="isRecording" class="text-[11px] text-rose-500 font-medium select-none tabular-nums">{{ recordSeconds }}s · 点击停止</span>
              <span v-else-if="isTranscribing" class="text-[11px] text-blue-500 font-medium select-none">识别中…</span>
              <button
                @click="triggerSlash"
                :disabled="isStreaming"
                class="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="指令"
              >
                <i class="fa-solid fa-slash text-xs"></i>
              </button>
            </div>

            <div class="flex items-center gap-2.5">
              <span class="hidden sm:inline text-[11px] text-slate-400 select-none">Ctrl + Enter 发送</span>
              <button
                v-if="isStreaming"
                @click="$emit('cancel')"
                class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="停止生成"
              >
                <span class="w-3 h-3 rounded-[3px] bg-white"></span>
              </button>
              <button
                v-else
                @click="sendMessage"
                :disabled="!inputText.trim() && chatAttachments.length === 0"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                :class="(inputText.trim() || chatAttachments.length > 0) ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white cursor-pointer shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'"
              >
                <i class="fa-solid fa-arrow-up text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, computed, onMounted, onBeforeUnmount } from 'vue';
import { marked } from 'marked';
import WelcomeHero from './WelcomeHero.vue';
import ModelSelector from './ModelSelector.vue';
import { prepareImage } from '@/composables/imagePrep';

const props = defineProps({
  slug: { type: String, required: true },
  projectName: { type: String, default: '' },
  messages: { type: Array, default: () => [] },
  isStreaming: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  availableCommands: { type: Array, default: () => [] },
  availableModels: { type: Array, default: () => [] },
  currentModel: { type: String, default: '' },
});

const emit = defineEmits(['send', 'send-quick', 'send-with-attachments', 'cancel', 'navigate', 'fork', 'regenerate', 'feedback', 'delete', 'change-model']);

const inputText = ref('');
const inputRef = ref(null);
const chatContainerRef = ref(null);
const chatAttachments = ref([]);
const isFocused = ref(false);
const copiedIdx = ref(null);
const menuIdx = ref(null);

// Auto-grow textarea like Doubao (single line -> expands up to max-h)
const autoGrow = () => {
  const el = inputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 168) + 'px';
};

const triggerSlash = () => {
  if (!inputText.value.startsWith('/')) {
    inputText.value = '/' + inputText.value;
  }
  showSlashMenu.value = true;
  inputRef.value?.focus();
};

const copyMessage = async (content, idx) => {
  try {
    await navigator.clipboard.writeText(content || '');
    copiedIdx.value = idx;
    setTimeout(() => { if (copiedIdx.value === idx) copiedIdx.value = null; }, 1500);
  } catch {
    // ignore clipboard failures
  }
};

// Close the "more" menu when clicking anywhere outside it
const closeMenu = () => { menuIdx.value = null; };
onMounted(() => document.addEventListener('click', closeMenu));
onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenu);
  try { if (mediaRecorder && isRecording.value) mediaRecorder.stop(); } catch { /* ignore */ }
  stopTracks();
});

const pickImage = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = async (e) => {
    for (const file of e.target.files) {
      try {
        const { data, media_type } = await prepareImage(file);
        if (!data) continue;
        chatAttachments.value.push({ type: 'image', data, media_type, name: file.name });
      } catch (err) {
        console.error('[ChatPanel] pickImage failed for', file.name, err);
        alert(`「${file.name}」读取失败，已跳过`);
      }
    }
  };
  input.click();
};

// Plain text/code files are inlined whole by the server, so keep them modest.
// Rich documents (PDF/Word/Excel/PPT) get a larger cap — the server extracts
// their text, so the raw file (a few MB) just needs to arrive.
const MAX_FILE_BYTES = 512 * 1024;
const MAX_DOC_BYTES = 10 * 1024 * 1024;
const TEXT_EXT = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'log', 'yaml', 'yml', 'xml', 'html', 'htm',
  'css', 'js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'go',
  'rs', 'rb', 'php', 'sh', 'sql', 'ini', 'conf', 'toml', 'env',
]);
const DOC_EXT = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);
const fileExt = (file) => {
  const idx = file.name.lastIndexOf('.');
  return idx >= 0 ? file.name.slice(idx + 1).toLowerCase() : '';
};
const isTextFile = (file) => TEXT_EXT.has(fileExt(file)) || (file.type || '').startsWith('text/');
const isDocFile = (file) => DOC_EXT.has(fileExt(file));

const pickFile = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.md,.markdown,.json,.csv,.log,.yaml,.yml,.xml,.html,.htm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.epub';
  input.multiple = true;
  input.onchange = async (e) => {
    for (const file of e.target.files) {
      const cap = isDocFile(file) ? MAX_DOC_BYTES : MAX_FILE_BYTES;
      if (file.size > cap) {
        alert(`「${file.name}」超过 ${Math.round(cap / 1024 / 1024 * 10) / 10}MB，已跳过`);
        continue;
      }
      if (isTextFile(file)) {
        const text = await file.text();
        chatAttachments.value.push({ type: 'file', text, media_type: file.type || 'text/plain', name: file.name });
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target.result.split(',')[1];
          chatAttachments.value.push({ type: 'file', data: base64, media_type: file.type || 'application/octet-stream', name: file.name });
        };
        reader.readAsDataURL(file);
      }
    }
  };
  input.click();
};

// ===== Voice input: record → 360 ASR → fill input box =====
const recordingSupported = typeof window !== 'undefined'
  && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  && typeof window.MediaRecorder !== 'undefined';
const isRecording = ref(false);
const isTranscribing = ref(false);
const recordSeconds = ref(0);
let mediaRecorder = null;
let mediaStream = null;
let recordChunks = [];
let recordTimer = null;
let recordStartAt = 0;
const MIN_RECORD_MS = 800;

const stopTracks = () => {
  if (mediaStream) { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; }
  if (recordTimer) { clearInterval(recordTimer); recordTimer = null; }
};

// 识别失败时把录音落盘兜底，避免录音丢失；提示用户并可打开所在文件夹。
const saveRecordingOnFailure = async (base64, mime, errMsg) => {
  const reason = errMsg || '语音识别失败';
  if (!base64) { alert(reason); return; }
  const ext = (mime.split('/')[1] || 'webm').split(';')[0];
  let saved = null;
  try {
    saved = await window.api.hermes.saveRecording(props.slug || '', base64, ext);
  } catch { /* ignore */ }
  if (saved?.success) {
    const open = confirm(`${reason}\n\n录音已保存到：\n${saved.filePath}\n\n点击“确定”打开所在文件夹。`);
    if (open) {
      try { await window.api.shell.openPath(saved.dirPath); } catch { /* ignore */ }
    }
  } else {
    alert(`${reason}（录音保存失败：${saved?.error || '未知错误'}）`);
  }
};

const toggleRecording = async () => {
  if (!recordingSupported) return;
  if (isRecording.value) { mediaRecorder?.stop(); return; }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    alert('无法访问麦克风，请检查权限设置');
    return;
  }
  recordChunks = [];
  try {
    mediaRecorder = new MediaRecorder(mediaStream);
  } catch {
    alert('当前环境不支持录音');
    stopTracks();
    return;
  }
  recordStartAt = performance.now();
  mediaRecorder.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) recordChunks.push(ev.data); };
  mediaRecorder.onstop = async () => {
    const durationMs = performance.now() - recordStartAt;
    const mime = mediaRecorder?.mimeType || 'audio/webm';
    stopTracks();
    isRecording.value = false;
    const blob = new Blob(recordChunks, { type: mime });
    if (durationMs < MIN_RECORD_MS || blob.size === 0) { return; }
    isTranscribing.value = true;
    let base64 = '';
    try {
      base64 = await blobToBase64(blob);
      const res = await window.api.hermes.transcribe(base64, mime);
      if (res?.success && res.text) {
        inputText.value = (inputText.value ? inputText.value + ' ' : '') + res.text;
        nextTick(() => { autoGrow(); inputRef.value?.focus(); });
      } else {
        await saveRecordingOnFailure(base64, mime, res?.error);
      }
    } catch (err) {
      await saveRecordingOnFailure(base64, mime, err?.message);
    } finally {
      isTranscribing.value = false;
    }
  };
  mediaRecorder.start();
  isRecording.value = true;
  recordSeconds.value = 0;
  // 不限录音时长：只更新计时显示，由用户手动点停。
  recordTimer = setInterval(() => {
    recordSeconds.value = Math.floor((performance.now() - recordStartAt) / 1000);
  }, 250);
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

// Slash command menu
const showSlashMenu = ref(false);
const filteredCommands = computed(() => {
  const text = inputText.value;
  if (!text.startsWith('/')) return [];
  const query = text.slice(1).toLowerCase();
  const defaultCmds = [
    { name: 'compact', hint: '压缩上下文窗口' },
    { name: 'steer', hint: '给 AI 临时指令（如: /steer 用中文回答）' },
    { name: 'model', hint: '切换模型' },
    { name: 'tools', hint: '查看可用工具列表' },
    { name: 'context', hint: '查看上下文使用量' },
    { name: 'help', hint: '帮助' },
  ];
  const all = [...defaultCmds];
  if (!query) return all;
  return all.filter(c => c.name.includes(query));
});

const selectCommand = (cmd) => {
  inputText.value = `/${cmd.name} `;
  showSlashMenu.value = false;
  inputRef.value?.focus();
};

// Watch input for slash trigger
watch(inputText, (val) => {
  showSlashMenu.value = val.startsWith('/') && !val.includes(' ');
});

const sendMessage = () => {
  const text = inputText.value.trim();
  if (!text && chatAttachments.value.length === 0) return;
  if (chatAttachments.value.length > 0) {
    emit('send-with-attachments', text || '请分析这张图片', [...chatAttachments.value]);
  } else {
    emit('send', text);
  }
  inputText.value = '';
  chatAttachments.value = [];
  nextTick(() => {
    if (inputRef.value) inputRef.value.style.height = 'auto';
  });
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
    }
  });
};

const scrollToMessage = (index) => {
  nextTick(() => {
    const el = chatContainerRef.value?.querySelector(`[data-msg-index="${index}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

const renderMarkdown = (text) => {
  if (!text) return '';
  try {
    return marked.parseInline(text);
  } catch {
    return text;
  }
};

const renderAssistantContent = (content) => {
  if (!content) return '';
  try {
    // Detect MEDIA: local file paths and render as images
    let processed = content.replace(
      /MEDIA:([^\s\n]+\.(png|jpg|jpeg|gif|svg|webp))/gi,
      (match, filePath) => {
        const safePath = filePath.replace(/\\/g, '/');
        return `<img src="file:///${safePath}" class="max-w-[300px] rounded-lg border border-slate-200 my-2" onerror="this.style.display='none'" />`;
      }
    );
    return marked.parse(processed);
  } catch {
    return content;
  }
};

defineExpose({ scrollToBottom, scrollToMessage });
</script>

<style scoped>
/* Ensure markdown content renders correctly inside chat bubbles */
:deep(.prose) {
  font-size: 15px;
  line-height: 1.75;
}
:deep(.prose p) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}
:deep(.prose ul),
:deep(.prose ol) {
  margin-top: 0.4em;
  margin-bottom: 0.4em;
  padding-left: 1.5em;
}
:deep(.prose li) {
  margin-top: 0.15em;
  margin-bottom: 0.15em;
}
:deep(.prose table) {
  font-size: 12px;
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
}
:deep(.prose th),
:deep(.prose td) {
  border: 1px solid #e2e8f0;
  padding: 0.4em 0.6em;
  text-align: left;
}
:deep(.prose th) {
  background: #f8fafc;
  font-weight: 600;
}
:deep(.prose strong) {
  font-weight: 700;
  color: #1e293b;
}
:deep(.prose code) {
  font-size: 12px;
  background: #f1f5f9;
  padding: 0.15em 0.35em;
  border-radius: 4px;
  color: #475569;
}
:deep(.prose pre) {
  background: #1e293b;
  color: #e2e8f0;
  padding: 0.75em 1em;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 12px;
  margin: 0.5em 0;
}
:deep(.prose pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}
:deep(.prose hr) {
  border-color: #e2e8f0;
  margin: 0.75em 0;
}
:deep(.prose h1),
:deep(.prose h2),
:deep(.prose h3),
:deep(.prose h4) {
  margin-top: 0.8em;
  margin-bottom: 0.3em;
  font-weight: 700;
  color: #1e293b;
}
:deep(.prose h1) { font-size: 1.1em; }
:deep(.prose h2) { font-size: 1.05em; }
:deep(.prose h3) { font-size: 1em; }
:deep(.prose blockquote) {
  border-left: 3px solid #2563eb;
  padding-left: 0.75em;
  color: #475569;
  margin: 0.5em 0;
}
</style>
