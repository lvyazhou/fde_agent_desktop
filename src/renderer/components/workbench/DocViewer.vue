<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- 头部:文件名 + 操作 -->
    <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200/80 shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" :class="iconBg">
          <i :class="fileIcon"></i>
        </span>
        <div class="min-w-0">
          <div class="text-[13px] font-semibold text-slate-800 truncate">{{ item.title }}</div>
          <div class="text-[11px] text-slate-400">
            <span :class="item.category === 'knowledge' ? 'text-emerald-600' : item.category === 'deliverable' ? 'text-blue-600' : 'text-slate-400'">
              {{ categoryLabel }}
            </span>
            · {{ item.type.toUpperCase() }}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          @click="openFile"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="用系统程序打开"
        >
          <i class="fa-solid fa-arrow-up-right-from-square text-[11px]"></i>
          <span>打开</span>
        </button>
        <button
          @click="downloadFile"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="下载到本地"
        >
          <i class="fa-solid fa-download text-[11px]"></i>
          <span>下载</span>
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 min-h-0 overflow-y-auto p-6 bg-white">
      <!-- md / docx(html快照) 内嵌渲染 -->
      <div v-if="canPreview">
        <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-slate-400">
          <div class="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin mb-3"></div>
          <span class="text-[12px]">加载中...</span>
        </div>
        <div v-else-if="error" class="flex flex-col items-center justify-center py-20 text-slate-400">
          <i class="fa-solid fa-triangle-exclamation text-xl mb-2 text-amber-400"></i>
          <span class="text-[12px]">{{ error }}</span>
        </div>
        <template v-else>
          <!-- docx 预览是由原文档转换而来的快照,给个轻提示 -->
          <div v-if="item.type === 'docx'" class="mb-4 flex items-center gap-2 text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            <i class="fa-solid fa-circle-info text-slate-300"></i>
            <span>由 Word 文档转换预览,排版略有差异。需精确格式或编辑请「打开」或「下载」原件。</span>
          </div>
          <div class="prose prose-sm prose-slate max-w-none handbook-md" v-html="rendered"></div>
        </template>
      </div>

      <!-- 无快照的 docx:回退引导 -->
      <div v-else class="flex flex-col items-center justify-center py-20 text-center">
        <span class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
          <i class="fa-solid fa-file-word text-blue-400 text-2xl"></i>
        </span>
        <p class="text-[14px] font-medium text-slate-700 mb-1">{{ item.title }}</p>
        <p class="text-[12px] text-slate-400 mb-5 max-w-sm leading-relaxed">
          该 Word 文档暂无法在应用内预览。点击下方按钮用系统 Word 打开,或下载到本地。
        </p>
        <div class="flex items-center gap-3">
          <button
            @click="openFile"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
          >
            <i class="fa-solid fa-arrow-up-right-from-square text-[12px]"></i>
            <span>用 Word 打开</span>
          </button>
          <button
            @click="downloadFile"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <i class="fa-solid fa-download text-[12px]"></i>
            <span>下载</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { marked } from 'marked';

const props = defineProps({
  stage: { type: String, required: true },   // 目录名,如 '03'
  item: { type: Object, required: true },     // manifest item
});

const loading = ref(false);
const error = ref('');
const rendered = ref('');

// 可内嵌预览:md 文件,或已生成 html 快照的 docx
const canPreview = computed(() => props.item.previewable || !!props.item.previewHtml);

const categoryLabel = computed(() => ({
  knowledge: '知识',
  deliverable: '交付物',
  spec: '规范',
  other: '文档',
}[props.item.category] || '文档'));

const fileIcon = computed(() => {
  if (props.item.type === 'docx') return 'fa-solid fa-file-word text-blue-500';
  return 'fa-solid fa-file-lines text-emerald-500';
});
const iconBg = computed(() => props.item.type === 'docx' ? 'bg-blue-50' : 'bg-emerald-50');

const loadContent = async () => {
  if (!canPreview.value) return;
  loading.value = true;
  error.value = '';
  rendered.value = '';
  try {
    if (props.item.type === 'docx' && props.item.previewHtml) {
      // docx:渲染构建时生成的 html 快照
      const res = await window.api.handbook.readHtml(props.stage, props.item.previewHtml);
      if (res && res.success) {
        rendered.value = res.content || '';
      } else {
        error.value = res?.error || '读取失败';
      }
    } else {
      // md:读取后用 marked 渲染
      const res = await window.api.handbook.readMd(props.stage, props.item.file);
      if (res && res.success) {
        rendered.value = marked.parse(res.content || '');
      } else {
        error.value = res?.error || '读取失败';
      }
    }
  } catch (e) {
    error.value = e.message || '读取失败';
  } finally {
    loading.value = false;
  }
};

const openFile = async () => {
  try {
    const res = await window.api.handbook.open(props.stage, props.item.file);
    if (res && !res.success && res.error) console.error('open failed:', res.error);
  } catch (e) {
    console.error('open failed:', e);
  }
};

const downloadFile = async () => {
  try {
    await window.api.handbook.saveAs(props.stage, props.item.file);
  } catch (e) {
    console.error('download failed:', e);
  }
};

watch(() => [props.stage, props.item.file], loadContent);
onMounted(loadContent);
</script>

<style scoped>
.handbook-md :deep(h1) { font-size: 1.4em; font-weight: 700; color: #1e293b; margin: 0.6em 0 0.4em; }
.handbook-md :deep(h2) { font-size: 1.2em; font-weight: 700; color: #1e293b; margin: 1em 0 0.4em; padding-bottom: 0.2em; border-bottom: 1px solid #e2e8f0; }
.handbook-md :deep(h3) { font-size: 1.05em; font-weight: 600; color: #334155; margin: 0.8em 0 0.3em; }
.handbook-md :deep(p) { margin: 0.5em 0; line-height: 1.75; color: #475569; font-size: 13px; }
.handbook-md :deep(ul), .handbook-md :deep(ol) { margin: 0.4em 0; padding-left: 1.5em; }
.handbook-md :deep(li) { margin: 0.2em 0; line-height: 1.7; color: #475569; font-size: 13px; }
.handbook-md :deep(table) { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 12px; }
.handbook-md :deep(th), .handbook-md :deep(td) { border: 1px solid #e2e8f0; padding: 0.5em 0.7em; text-align: left; vertical-align: top; }
.handbook-md :deep(th) { background: #f8fafc; font-weight: 600; color: #334155; }
.handbook-md :deep(tr:nth-child(even) td) { background: #fafbfc; }
.handbook-md :deep(strong) { font-weight: 700; color: #1e293b; }
.handbook-md :deep(blockquote) { border-left: 3px solid #2563eb; padding: 0.2em 0 0.2em 0.9em; margin: 0.6em 0; color: #475569; background: #f8fafc; border-radius: 0 6px 6px 0; }
.handbook-md :deep(code) { font-size: 12px; background: #f1f5f9; padding: 0.15em 0.4em; border-radius: 4px; color: #475569; }
.handbook-md :deep(pre) { background: #1e293b; color: #e2e8f0; padding: 0.9em 1.1em; border-radius: 8px; overflow-x: auto; font-size: 12px; margin: 0.6em 0; }
.handbook-md :deep(pre code) { background: transparent; padding: 0; color: inherit; }
.handbook-md :deep(hr) { border: none; border-top: 1px solid #e2e8f0; margin: 1em 0; }
.handbook-md :deep(a) { color: #2563eb; text-decoration: none; }
.handbook-md :deep(img) { max-width: 100%; height: auto; display: block; margin: 0.8em auto; border: 1px solid #e2e8f0; border-radius: 8px; }
</style>
