<template>
  <div class="w-[480px] shrink-0 glass-card border-l border-slate-200/60 flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center gap-3 min-w-0">
      <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" :style="{ background: iconBg }">
        <i :class="'fa-solid ' + iconClass" class="text-[14px]" :style="{ color: iconColor }"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-[13px] font-semibold text-slate-800 truncate">{{ file.name }}</div>
        <div class="text-[11px] text-slate-400 mt-0.5">{{ typeLabel }} · {{ file.sizeLabel || '' }}</div>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button @click="openExternal" class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer" title="用系统程序打开">
          <i class="fa-solid fa-arrow-up-right-from-square text-[11px]"></i>
        </button>
        <button @click="saveAs" class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer" title="另存为…">
          <i class="fa-solid fa-download text-[11px]"></i>
        </button>
        <button @click="$emit('close')" class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer" title="关闭预览">
          <i class="fa-solid fa-xmark text-[12px]"></i>
        </button>
      </div>
    </div>

    <!-- Preview body -->
    <div class="flex-1 min-h-0 overflow-auto bg-slate-50/50">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin"></div>
          <p class="text-xs text-slate-400">加载预览中…</p>
        </div>
      </div>

      <!-- Image preview -->
      <div v-else-if="file.previewKind === 'image' && dataUri" class="flex items-center justify-center p-4 h-full">
        <img :src="dataUri" class="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
      </div>

      <!-- PDF preview -->
      <iframe v-else-if="file.previewKind === 'pdf' && dataUri" :src="dataUri" class="w-full h-full border-0"></iframe>

      <!-- Video preview -->
      <div v-else-if="file.previewKind === 'video' && mediaUrl" class="flex items-center justify-center p-4 h-full bg-black/90">
        <video :src="mediaUrl" controls autoplay preload="metadata" class="max-w-full max-h-full rounded-lg shadow-sm outline-none">
          您的环境不支持内嵌播放该视频。
        </video>
      </div>

      <!-- Audio preview -->
      <div v-else-if="file.previewKind === 'audio' && mediaUrl" class="flex flex-col items-center justify-center gap-5 p-8 h-full">
        <div class="w-20 h-20 rounded-2xl flex items-center justify-center" :style="{ background: iconBg }">
          <i class="fa-solid fa-music text-[32px]" :style="{ color: iconColor }"></i>
        </div>
        <div class="text-sm font-medium text-slate-700 text-center break-all max-w-full px-4">{{ file.name }}</div>
        <audio :src="mediaUrl" controls autoplay preload="metadata" class="w-full max-w-md outline-none">
          您的环境不支持内嵌播放该音频。
        </audio>
      </div>

      <!-- HTML preview -->
      <iframe v-else-if="file.previewKind === 'html' && previewUrl" :src="previewUrl" class="w-full h-full border-0" sandbox="allow-scripts allow-same-origin"></iframe>

      <!-- Markdown preview -->
      <div v-else-if="file.previewKind === 'text' && isMarkdown && textContent !== null" class="p-5 overflow-auto h-full">
        <div class="md-preview" v-html="renderedMarkdown"></div>
      </div>

      <!-- Text/source preview -->
      <div v-else-if="file.previewKind === 'text' && textContent !== null" class="p-4 overflow-auto h-full">
        <pre class="text-[12px] leading-relaxed text-slate-700 glass-card rounded-lg border border-slate-200 p-4 overflow-auto whitespace-pre-wrap break-words font-mono">{{ textContent }}</pre>
      </div>

      <!-- Unsupported / fallback -->
      <div v-else-if="!loading" class="flex items-center justify-center h-full">
        <div class="text-center px-8">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <i :class="'fa-solid ' + iconClass" class="text-[24px] text-slate-300"></i>
          </div>
          <p class="text-sm font-medium text-slate-600 mb-1">{{ file.name }}</p>
          <p class="text-xs text-slate-400 mb-5">该文件类型暂不支持内嵌预览</p>
          <div class="flex items-center justify-center gap-3">
            <button @click="openExternal" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer">
              <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              用系统程序打开
            </button>
            <button @click="saveAs" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg glass-card border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer">
              <i class="fa-solid fa-download text-[10px]"></i>
              另存为
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { marked } from 'marked';

const props = defineProps({
  file: { type: Object, required: true },
  slug: { type: String, default: '' },
});

const emit = defineEmits(['close']);

const loading = ref(false);
const dataUri = ref(null);
const textContent = ref(null);
const previewUrl = ref(null);
const mediaUrl = ref(null);

const EXT_ICON_MAP = {
  pdf: { icon: 'fa-file-pdf', color: '#e11d48', bg: '#fff1f2' },
  doc: { icon: 'fa-file-word', color: 'var(--ui-brand)', bg: 'var(--ui-brand-soft)' },
  docx: { icon: 'fa-file-word', color: 'var(--ui-brand)', bg: 'var(--ui-brand-soft)' },
  xls: { icon: 'fa-file-excel', color: '#059669', bg: '#ecfdf5' },
  xlsx: { icon: 'fa-file-excel', color: '#059669', bg: '#ecfdf5' },
  csv: { icon: 'fa-file-excel', color: '#059669', bg: '#ecfdf5' },
  ppt: { icon: 'fa-file-powerpoint', color: '#ea580c', bg: '#fff7ed' },
  pptx: { icon: 'fa-file-powerpoint', color: '#ea580c', bg: '#fff7ed' },
  zip: { icon: 'fa-file-zipper', color: '#d97706', bg: '#fffbeb' },
  rar: { icon: 'fa-file-zipper', color: '#d97706', bg: '#fffbeb' },
  '7z': { icon: 'fa-file-zipper', color: '#d97706', bg: '#fffbeb' },
  png: { icon: 'fa-image', color: 'var(--ui-violet)', bg: 'var(--ui-violet-soft)' },
  jpg: { icon: 'fa-image', color: 'var(--ui-violet)', bg: 'var(--ui-violet-soft)' },
  jpeg: { icon: 'fa-image', color: 'var(--ui-violet)', bg: 'var(--ui-violet-soft)' },
  gif: { icon: 'fa-image', color: 'var(--ui-violet)', bg: 'var(--ui-violet-soft)' },
  svg: { icon: 'fa-image', color: 'var(--ui-violet)', bg: 'var(--ui-violet-soft)' },
  webp: { icon: 'fa-image', color: 'var(--ui-violet)', bg: 'var(--ui-violet-soft)' },
  mp3: { icon: 'fa-file-audio', color: 'var(--ui-violet)', bg: 'var(--ui-violet-soft)' },
  wav: { icon: 'fa-file-audio', color: 'var(--ui-violet)', bg: 'var(--ui-violet-soft)' },
  m4a: { icon: 'fa-file-audio', color: 'var(--ui-violet)', bg: 'var(--ui-violet-soft)' },
  aac: { icon: 'fa-file-audio', color: 'var(--ui-violet)', bg: 'var(--ui-violet-soft)' },
  ogg: { icon: 'fa-file-audio', color: 'var(--ui-violet)', bg: 'var(--ui-violet-soft)' },
  flac: { icon: 'fa-file-audio', color: 'var(--ui-violet)', bg: 'var(--ui-violet-soft)' },
  mp4: { icon: 'fa-file-video', color: 'var(--ui-pink)', bg: 'var(--ui-pink-soft)' },
  m4v: { icon: 'fa-file-video', color: 'var(--ui-pink)', bg: 'var(--ui-pink-soft)' },
  mov: { icon: 'fa-file-video', color: 'var(--ui-pink)', bg: 'var(--ui-pink-soft)' },
  webm: { icon: 'fa-file-video', color: 'var(--ui-pink)', bg: 'var(--ui-pink-soft)' },
  mkv: { icon: 'fa-file-video', color: 'var(--ui-pink)', bg: 'var(--ui-pink-soft)' },
  avi: { icon: 'fa-file-video', color: 'var(--ui-pink)', bg: 'var(--ui-pink-soft)' },
  html: { icon: 'fa-file-code', color: 'var(--ui-accent)', bg: 'var(--ui-accent-soft)' },
  htm: { icon: 'fa-file-code', color: 'var(--ui-accent)', bg: 'var(--ui-accent-soft)' },
  js: { icon: 'fa-file-code', color: 'var(--ui-accent)', bg: 'var(--ui-accent-soft)' },
  json: { icon: 'fa-file-code', color: 'var(--ui-accent)', bg: 'var(--ui-accent-soft)' },
  py: { icon: 'fa-file-code', color: 'var(--ui-accent)', bg: 'var(--ui-accent-soft)' },
  md: { icon: 'fa-file-lines', color: 'var(--ui-brand)', bg: 'var(--ui-brand-soft)' },
  txt: { icon: 'fa-file-lines', color: 'var(--ui-brand)', bg: 'var(--ui-brand-soft)' },
};

const ext = computed(() => (props.file.ext || '').replace('.', '').toLowerCase());
const mapped = computed(() => EXT_ICON_MAP[ext.value] || { icon: 'fa-file', color: 'var(--ui-text-3)', bg: 'var(--ui-bg-3)' });
const iconClass = computed(() => mapped.value.icon);
const iconColor = computed(() => mapped.value.color);
const iconBg = computed(() => mapped.value.bg);
const isMarkdown = computed(() => ['md', 'markdown'].includes(ext.value));
const renderedMarkdown = computed(() => {
  if (!isMarkdown.value || !textContent.value) return '';
  return marked(textContent.value, { breaks: true, gfm: true });
});

const TYPE_LABELS = {
  pdf: 'PDF', doc: 'Word', docx: 'Word', xls: 'Excel', xlsx: 'Excel', csv: 'CSV',
  ppt: 'PPT', pptx: 'PPT', zip: 'ZIP', rar: 'RAR', '7z': '7Z',
  png: 'PNG', jpg: 'JPEG', jpeg: 'JPEG', gif: 'GIF', svg: 'SVG', webp: 'WebP',
  mp3: 'MP3', wav: 'WAV', m4a: 'M4A', aac: 'AAC', ogg: 'OGG', flac: 'FLAC',
  mp4: 'MP4', m4v: 'M4V', mov: 'MOV', webm: 'WebM', mkv: 'MKV', avi: 'AVI',
  html: 'HTML', htm: 'HTML', js: 'JavaScript', json: 'JSON', py: 'Python',
  md: 'Markdown', txt: '文本',
};
const typeLabel = computed(() => TYPE_LABELS[ext.value] || ext.value.toUpperCase() || '文件');

async function loadPreview() {
  loading.value = true;
  dataUri.value = null;
  textContent.value = null;
  previewUrl.value = null;
  mediaUrl.value = null;

  try {
    let fp = props.file.filePath;
    let kind = props.file.previewKind;

    // If path is not absolute, try to resolve it via the project
    if (fp && !fp.startsWith('/')) {
      const res = await window.api.hermes.resolveFileRef(props.slug, fp);
      if (res && res.success && res.file) {
        fp = res.file.filePath;
        if (!kind || kind === 'unsupported') kind = res.file.previewKind;
      }
    }

    if (!fp) { loading.value = false; return; }

    if (kind === 'image' || kind === 'pdf') {
      const res = await window.api.fs.readLocalFileDataUri(fp);
      if (res && res.success) dataUri.value = res.dataUri;
    } else if (kind === 'video' || kind === 'audio') {
      const res = await window.api.fs.mediaUrl(fp);
      if (res && res.success) mediaUrl.value = res.url;
    } else if (kind === 'html') {
      const res = await window.api.fs.readLocalFileDataUri(fp);
      if (res && res.success) previewUrl.value = res.dataUri;
    } else if (kind === 'text') {
      const res = await window.api.fs.readFile(fp);
      if (res && res.success) {
        const bytes = new Uint8Array(res.data);
        textContent.value = new TextDecoder().decode(bytes);
      }
    }
  } catch { /* fallback to unsupported view */ }

  loading.value = false;
}

async function openExternal() {
  if (props.file.filePath) {
    await window.api.shell.openPath(props.file.filePath);
  }
}

async function saveAs() {
  if (props.file.filePath) {
    await window.api.fs.saveLocalFile(props.file.filePath);
  }
}

watch(() => props.file, () => { loadPreview(); }, { immediate: true });
</script>

<style scoped>
.md-preview {
  font-size: 14px;
  line-height: 1.7;
  color: var(--ui-ink-3);
  max-width: none;
}
.md-preview :deep(h1) { font-size: 1.4em; font-weight: 700; color: var(--ui-ink); margin: 1.2em 0 0.5em; padding-bottom: 0.3em; border-bottom: 1px solid var(--ui-line-2); }
.md-preview :deep(h2) { font-size: 1.2em; font-weight: 700; color: var(--ui-ink); margin: 1em 0 0.4em; padding-bottom: 0.2em; border-bottom: 1px solid var(--ui-bg-2); }
.md-preview :deep(h3) { font-size: 1.05em; font-weight: 600; color: var(--ui-ink-2); margin: 0.8em 0 0.3em; }
.md-preview :deep(h4) { font-size: 1em; font-weight: 600; color: var(--ui-ink-2); margin: 0.6em 0 0.2em; }
.md-preview :deep(p) { margin: 0.5em 0; }
.md-preview :deep(ul), .md-preview :deep(ol) { margin: 0.4em 0; padding-left: 1.5em; }
.md-preview :deep(li) { margin: 0.2em 0; }
.md-preview :deep(blockquote) { border-left: 3px solid var(--ui-brand); padding: 0.4em 0.8em; margin: 0.5em 0; color: var(--ui-text); background: var(--ui-bg-3); border-radius: 0 6px 6px 0; }
.md-preview :deep(code) { font-size: 12px; background: var(--ui-bg-2); padding: 0.15em 0.35em; border-radius: 4px; color: var(--ui-text); font-family: 'SF Mono', Monaco, Menlo, monospace; }
.md-preview :deep(pre) { background: var(--ui-ink-2); color: var(--ui-line-2); padding: 0.75em 1em; border-radius: 8px; overflow-x: auto; font-size: 12px; margin: 0.5em 0; }
.md-preview :deep(pre code) { background: transparent; padding: 0; color: inherit; }
.md-preview :deep(table) { font-size: 12px; border-collapse: collapse; width: 100%; margin: 0.5em 0; }
.md-preview :deep(th), .md-preview :deep(td) { border: 1px solid var(--ui-line-2); padding: 0.4em 0.6em; text-align: left; }
.md-preview :deep(th) { background: var(--ui-bg-3); font-weight: 600; }
.md-preview :deep(strong) { font-weight: 700; color: var(--ui-ink-2); }
.md-preview :deep(hr) { border: none; border-top: 1px solid var(--ui-line-2); margin: 0.75em 0; }
.md-preview :deep(a) { color: var(--ui-brand); text-decoration: none; }
.md-preview :deep(a:hover) { text-decoration: underline; }
.md-preview :deep(img) { max-width: 100%; border-radius: 8px; margin: 0.5em 0; }
</style>
