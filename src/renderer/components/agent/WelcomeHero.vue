<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Scrollable content area -->
    <div class="flex-1 overflow-y-auto">
      <div class="flex flex-col items-center px-6 py-6 max-w-4xl mx-auto">
        <!-- Header: avatar + title -->
        <div class="flex items-center gap-3 mb-3">
          <div class="w-11 h-11 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
            <i class="fa-solid fa-robot text-blue-600 text-lg"></i>
          </div>
          <h2 class="text-lg font-bold text-slate-800">你好，我是 FDE产品设计</h2>
        </div>

        <!-- Capability description lines -->
        <p class="text-xs text-slate-500 text-center mb-2">FDE 项目经理的五阶段作战工作台 —— 从客户一句话到上线定稿:</p>
        <div class="text-center space-y-1 mb-2 max-w-2xl">
          <p class="text-[11px] text-slate-500 leading-relaxed">
            <span class="text-amber-500">①</span> <b class="text-slate-700">调研备弹</b> ·
            <span class="text-blue-500">②</span> <b class="text-slate-700">需求沟通+原型</b>(对接确认表→PRD→可交互原型) ·
            <span class="text-violet-500">③</span> <b class="text-slate-700">需求确认+智能体设计</b>
          </p>
          <p class="text-[11px] text-slate-500 leading-relaxed">
            <span class="text-teal-500">④</span> <b class="text-slate-700">纳米Work 工作台上线</b> ·
            <span class="text-rose-500">⑤</span> <b class="text-slate-700">客户试用+定稿</b> —— 每阶段输出即交付物,一环扣一环
          </p>
        </div>
        <p class="text-[10px] text-slate-400 mb-5">新建 FDE 项目按阶段推进,或在下方直接提问:</p>

        <!-- Feature cards: 4 cols x 2 rows -->
        <div class="w-full grid grid-cols-4 gap-3">
          <div
            v-for="card in featureCards"
            :key="card.key"
            class="bg-white rounded-xl border border-slate-200/80 hover:shadow-lg hover:border-blue-300 transition-all px-4 py-3 group"
          >
            <!-- Card header -->
            <div class="flex items-center gap-2 mb-2.5">
              <div class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <i :class="card.icon" class="text-[11px] text-blue-600"></i>
              </div>
              <span class="text-[12px] font-bold text-slate-800">{{ card.label }}</span>
            </div>
            <!-- Quick questions -->
            <div class="space-y-1">
              <div
                v-for="(q, qi) in card.quickQuestions"
                :key="qi"
                @click="fillInput(q)"
                class="flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 transition-colors cursor-pointer group/item"
                :title="q"
              >
                <span class="flex-1 truncate">{{ q }}</span>
                <i class="fa-solid fa-arrow-right text-[8px] text-slate-300 group-hover/item:text-blue-500 shrink-0 transition-colors"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Fixed bottom input area -->
    <div class="shrink-0 px-6 pb-3 pt-2 bg-white">
      <div class="max-w-3xl mx-auto">
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <textarea
            ref="inputRef"
            v-model="inputText"
            placeholder="向智能体提问；输入 / 触发提示词；Ctrl+Enter 发送"
            rows="2"
            class="w-full resize-none text-[13px] text-slate-700 placeholder-slate-400 bg-transparent focus:outline-none leading-relaxed px-4 pt-3 pb-1"
            @keydown.ctrl.enter.prevent="handleSend"
            @keydown.meta.enter.prevent="handleSend"
          ></textarea>
          <!-- Attachment preview (images + files) -->
          <div v-if="attachments.length > 0" class="flex items-center gap-2 px-4 py-1.5 flex-wrap">
            <div v-for="(att, ai) in attachments" :key="ai" class="relative group/att">
              <img v-if="att.type === 'image'" :src="'data:' + att.media_type + ';base64,' + att.data" class="w-12 h-12 object-cover rounded-lg border border-slate-200" />
              <div v-else class="flex items-center gap-1.5 h-12 px-2.5 rounded-lg border border-slate-200 bg-white max-w-[160px]">
                <i class="fa-solid fa-file-lines text-blue-500 text-sm shrink-0"></i>
                <span class="text-[11px] text-slate-600 truncate">{{ att.name }}</span>
              </div>
              <button @click="attachments.splice(ai, 1)" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity cursor-pointer">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between px-4 pb-2.5">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors">
                <i class="fa-solid fa-globe text-[9px]"></i>
                MiniMax
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[10px] text-blue-600 cursor-pointer hover:bg-blue-100 transition-colors">
                <i class="fa-solid fa-robot text-[9px]"></i>
                AI 产品设计智能体
                <i class="fa-solid fa-chevron-down text-[7px] ml-0.5"></i>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button @click="pickImage" class="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors cursor-pointer" title="上传图片">
                <i class="fa-solid fa-image text-xs"></i>
              </button>
              <button @click="pickFile" class="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors cursor-pointer" title="上传文件">
                <i class="fa-solid fa-paperclip text-xs"></i>
              </button>
              <button
                @click="toggleRecording"
                :disabled="!recordingSupported"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                :class="isRecording ? 'text-white bg-rose-500 hover:bg-rose-600' : 'bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-blue-600'"
                :title="recordingSupported ? (isRecording ? '停止录音' : '语音输入') : '当前环境不支持录音'"
              >
                <i class="fa-solid text-xs" :class="isRecording ? 'fa-stop' : 'fa-microphone'"></i>
              </button>
              <span v-if="isRecording" class="text-[10px] text-rose-500 font-medium select-none tabular-nums">{{ recordSeconds }}s</span>
              <span v-else-if="isTranscribing" class="text-[10px] text-blue-500 font-medium select-none">识别中…</span>
              <button
                @click="handleSend"
                :disabled="!inputText.trim() && attachments.length === 0"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                :class="(inputText.trim() || attachments.length > 0) ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm' : 'bg-slate-100 text-slate-300 cursor-not-allowed'"
              >
                <i class="fa-solid fa-arrow-up text-xs"></i>
              </button>
            </div>
          </div>
        </div>
        <p class="text-center text-[9px] text-slate-400 mt-1.5">内容由 AI 生成，请仔细甄别；Ctrl + Enter 发送，Shift + Enter 换行</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue';

const emit = defineEmits(['send-quick', 'navigate', 'fill-input', 'send-with-attachments']);

const inputText = ref('');
const inputRef = ref(null);
const attachments = ref([]);

const pickImage = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = (e) => {
    for (const file of e.target.files) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(',')[1];
        const mediaType = file.type || 'image/png';
        attachments.value.push({ type: 'image', data: base64, media_type: mediaType, name: file.name });
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
};

// ACP embedded-resource cap is 512KB on the server side.
const MAX_FILE_BYTES = 512 * 1024;
const TEXT_EXT = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'log', 'yaml', 'yml', 'xml', 'html', 'htm',
  'css', 'js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'go',
  'rs', 'rb', 'php', 'sh', 'sql', 'ini', 'conf', 'toml', 'env',
]);
const isTextFile = (file) => {
  const idx = file.name.lastIndexOf('.');
  const ext = idx >= 0 ? file.name.slice(idx + 1).toLowerCase() : '';
  return TEXT_EXT.has(ext) || (file.type || '').startsWith('text/');
};

const pickFile = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.md,.markdown,.json,.csv,.log,.yaml,.yml,.xml,.html,.htm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.epub';
  input.multiple = true;
  input.onchange = async (e) => {
    for (const file of e.target.files) {
      if (file.size > MAX_FILE_BYTES) {
        alert(`「${file.name}」超过 ${Math.round(MAX_FILE_BYTES / 1024)}KB，已跳过`);
        continue;
      }
      if (isTextFile(file)) {
        const text = await file.text();
        attachments.value.push({ type: 'file', text, media_type: file.type || 'text/plain', name: file.name });
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target.result.split(',')[1];
          attachments.value.push({ type: 'file', data: base64, media_type: file.type || 'application/octet-stream', name: file.name });
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

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

// 识别失败时把录音落盘兜底（欢迎页无项目 slug，存到全局录音目录）；提示并可打开文件夹。
const saveRecordingOnFailure = async (base64, mime, errMsg) => {
  const reason = errMsg || '语音识别失败';
  if (!base64) { alert(reason); return; }
  const ext = (mime.split('/')[1] || 'webm').split(';')[0];
  let saved = null;
  try {
    saved = await window.api.hermes.saveRecording('', base64, ext);
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
        nextTick(() => inputRef.value?.focus());
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

onBeforeUnmount(() => {
  try { if (mediaRecorder && isRecording.value) mediaRecorder.stop(); } catch { /* ignore */ }
  stopTracks();
});

const fillInput = (text) => {
  inputText.value = text;
  inputRef.value?.focus();
};

const handleSend = () => {
  const text = inputText.value.trim();
  if (!text && attachments.value.length === 0) return;
  if (attachments.value.length > 0) {
    emit('send-with-attachments', text || '请分析这个附件', [...attachments.value]);
  } else {
    emit('send-quick', text);
  }
  inputText.value = '';
  attachments.value = [];
};

const featureCards = [
  {
    key: 'stage1',
    label: '① 调研备弹',
    icon: 'fa-solid fa-book',
    quickQuestions: [
      '这个行业有哪些政策/术语我该先备弹？',
      '给我一套结构化调研的六项框架',
      '进场破冰和 SPIN 挖痛点的话术',
    ],
  },
  {
    key: 'stage2',
    label: '② 需求·原型',
    icon: 'fa-solid fa-list-check',
    quickQuestions: [
      '根据对接确认表生成六字段功能清单',
      '按 PRD 三层(目标/功能/交互)整理需求',
      '基于功能清单生成可交互原型',
    ],
  },
  {
    key: 'stage3',
    label: '③ 需求·智能体',
    icon: 'fa-solid fa-diagram-project',
    quickQuestions: [
      '把这条业务链路拆成智能体矩阵',
      '帮我填一个智能体的设计表(身份卡+五层拆解)',
      '需求签字后把 PRD 和原型升级为定稿版',
    ],
  },
  {
    key: 'stage4',
    label: '④ 工作台上线',
    icon: 'fa-solid fa-server',
    quickQuestions: [
      '从功能清单反推 ER 数据模型',
      '这个功能该关联哪个智能体、依赖哪些数据表？',
      '梳理一份项目进度表',
    ],
  },
  {
    key: 'stage5',
    label: '⑤ 试用定稿',
    icon: 'fa-solid fa-clipboard-check',
    quickQuestions: [
      '把客户反馈按功能缺失/逻辑不通/体验问题分类',
      '整理一份三轮迭代记录',
      '30/60/90 天使用率盯防怎么做',
    ],
  },
  {
    key: 'export',
    label: '交付物导出',
    icon: 'fa-solid fa-download',
    quickQuestions: [
      '导出功能清单为 Word',
      '导出完整项目为 ZIP',
    ],
  },
  {
    key: 'iterate',
    label: '原型迭代',
    icon: 'fa-solid fa-rotate',
    quickQuestions: [
      '把导航改成侧边栏布局',
      '给表格增加搜索和筛选',
      '调整配色,更专业一些',
    ],
  },
  {
    key: 'general',
    label: '通用提问',
    icon: 'fa-solid fa-message',
    quickQuestions: [
      '帮我写一份需求确认表',
      '这个方案的可行性分析',
      '给我一些 UI 设计建议',
    ],
  },
];
</script>
