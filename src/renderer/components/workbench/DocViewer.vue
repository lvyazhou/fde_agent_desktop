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
            <span :class="item.category === 'knowledge' ? 'text-emerald-600' : item.category === 'deliverable' ? 'text-blue-600' : item.category === 'tech' ? 'text-indigo-600' : 'text-slate-400'">
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
    <!-- html 原型:铺满 iframe,内边距归零(走本地静态服务,fetch data 可正常加载) -->
    <div v-if="isHtmlPreview" class="flex-1 min-h-0 bg-white">
      <div v-if="loading" class="flex flex-col items-center justify-center h-full text-slate-400">
        <div class="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin mb-3"></div>
        <span class="text-[12px]">加载中...</span>
      </div>
      <div v-else-if="error" class="flex flex-col items-center justify-center h-full text-slate-400">
        <i class="fa-solid fa-triangle-exclamation text-xl mb-2 text-amber-400"></i>
        <span class="text-[12px]">{{ error }}</span>
      </div>
      <iframe
        v-else
        :src="htmlSrc"
        class="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      ></iframe>
    </div>

    <div v-else class="flex-1 min-h-0 overflow-y-auto p-6 bg-white">
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

      <!-- 项目产物里的源码类文件(js/json/css…):深色只读源码视图 -->
      <div v-else-if="isSourcePreview">
        <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-slate-400">
          <div class="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin mb-3"></div>
          <span class="text-[12px]">加载中...</span>
        </div>
        <div v-else-if="error" class="flex flex-col items-center justify-center py-20 text-slate-400">
          <i class="fa-solid fa-triangle-exclamation text-xl mb-2 text-amber-400"></i>
          <span class="text-[12px]">{{ error }}</span>
        </div>
        <pre v-else class="doc-source"><code>{{ fileSource || '（空文件）' }}</code></pre>
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
  stage: { type: String, default: '' },      // handbook 目录名,如 '03'(项目模式可空)
  item: { type: Object, required: true },     // manifest item
  // 传入时切到「项目产物」模式:从项目目录(而非 handbook)读文件。
  // 此时 item 需带 relPath(相对项目根,如 'stage2/prd.md' 或 'prototype/index.html')。
  projectSlug: { type: String, default: '' },
});

const loading = ref(false);
const error = ref('');
const rendered = ref('');
const fileSource = ref('');   // 源码类文件(js/json/css…)只读展示
const htmlSrc = ref('');      // html 原型走本地静态服务的预览地址

const isProject = computed(() => !!props.projectSlug);
// 相对项目根的路径:优先 relPath,回退 dir/file
const projectRel = computed(() =>
  props.item.relPath || (props.item.dir ? `${props.item.dir}/${props.item.file}` : props.item.file));

// html 原型:铺满 iframe 预览
const isHtmlPreview = computed(() => isProject.value && /\.html?$/i.test(props.item.file || projectRel.value || ''));
// 源码类:项目产物里非 md、非 html 的文本文件
const isSourcePreview = computed(() =>
  isProject.value && !isHtmlPreview.value && props.item.type !== 'md' && props.item.type !== 'docx');

// 可内嵌 md/docx 预览:handbook 模式看 previewable/previewHtml;项目模式看是否 md
const canPreview = computed(() =>
  isProject.value ? props.item.type === 'md' : (props.item.previewable || !!props.item.previewHtml));

const categoryLabel = computed(() => ({
  knowledge: '知识',
  deliverable: '交付物',
  spec: '规范',
  tech: '平台技术',
  other: '文档',
}[props.item.category] || '文档'));

const fileIcon = computed(() => {
  if (props.item.type === 'docx') return 'fa-solid fa-file-word text-blue-500';
  if (isHtmlPreview.value) return 'fa-solid fa-code text-blue-500';
  if (isSourcePreview.value) return 'fa-solid fa-file-code text-slate-500';
  return 'fa-solid fa-file-lines text-emerald-500';
});
const iconBg = computed(() => props.item.type === 'docx' ? 'bg-blue-50' : isHtmlPreview.value ? 'bg-blue-50' : isSourcePreview.value ? 'bg-slate-100' : 'bg-emerald-50');

const loadContent = async () => {
  loading.value = true;
  error.value = '';
  rendered.value = '';
  fileSource.value = '';
  htmlSrc.value = '';
  try {
    if (isProject.value) {
      // ── 项目产物模式 ──
      if (isHtmlPreview.value) {
        // html:走本地静态服务(否则原型页 fetch('data/*.json') 会被拦截)
        const res = await window.api.hermes.prototypeUrl(props.projectSlug, projectRel.value.replace(/^prototype\//, ''));
        if (res && res.success) {
          htmlSrc.value = res.url;
        } else {
          error.value = res?.error || '预览服务未就绪';
        }
      } else if (props.item.type === 'md') {
        const res = await window.api.hermes.readFile(props.projectSlug, projectRel.value);
        const content = typeof res === 'string' ? res : res?.content;
        if (typeof content === 'string') rendered.value = marked.parse(content);
        else error.value = res?.error || '读取失败';
      } else {
        // 源码类文本:直接展示
        const res = await window.api.hermes.readFile(props.projectSlug, projectRel.value);
        const content = typeof res === 'string' ? res : res?.content;
        if (typeof content === 'string') fileSource.value = content;
        else error.value = res?.error || '读取失败';
      }
    } else {
      // ── handbook 模式 ──
      if (!canPreview.value) return;
      if (props.item.type === 'docx' && props.item.previewHtml) {
        // docx:渲染构建时生成的 html 快照
        const res = await window.api.handbook.readHtml(props.stage, props.item.previewHtml);
        if (res && res.success) rendered.value = res.content || '';
        else error.value = res?.error || '读取失败';
      } else {
        // md:读取后用 marked 渲染
        const res = await window.api.handbook.readMd(props.stage, props.item.file);
        if (res && res.success) rendered.value = marked.parse(res.content || '');
        else error.value = res?.error || '读取失败';
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
    if (isProject.value) {
      const res = await window.api.hermes.openInBrowser(props.projectSlug, projectRel.value);
      if (res && !res.success && res.error) console.error('open failed:', res.error);
      return;
    }
    const res = await window.api.handbook.open(props.stage, props.item.file);
    if (res && !res.success && res.error) console.error('open failed:', res.error);
  } catch (e) {
    console.error('open failed:', e);
  }
};

const downloadFile = async () => {
  try {
    if (isProject.value) {
      // 项目产物暂无独立另存对话框:退化为系统打开(用户可从系统里另存)
      await window.api.hermes.openInBrowser(props.projectSlug, projectRel.value);
      return;
    }
    await window.api.handbook.saveAs(props.stage, props.item.file);
  } catch (e) {
    console.error('download failed:', e);
  }
};

watch(() => [props.projectSlug, props.stage, props.item.relPath, props.item.file], loadContent);
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

/* 项目产物里的源码类文件:深色只读视图 */
.doc-source {
  margin: 0;
  padding: 1em 1.1em;
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.7;
  font-family: 'SF Mono', 'JetBrains Mono', ui-monospace, monospace;
  white-space: pre;
}
</style>
