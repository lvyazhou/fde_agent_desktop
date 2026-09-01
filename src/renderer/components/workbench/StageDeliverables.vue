<template>
  <div class="flex h-full w-full">
    <!-- 左侧：交付物列表 -->
    <div class="w-[260px] shrink-0 bg-white border-r border-slate-200/60 flex flex-col overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100">
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">
          <i class="fa-solid fa-box-open text-blue-500 mr-1.5"></i>阶段③交付物
        </span>
        <p class="text-[11px] text-slate-400 mt-1">需求签字定稿 + 智能体设计</p>
      </div>
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <button
          v-for="d in deliverables"
          :key="d.key"
          @click="$emit('select', d.key)"
          class="w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start gap-2.5"
          :class="selected === d.key ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'"
        >
          <i :class="[d.icon, 'text-[13px] mt-0.5 shrink-0', selected === d.key ? 'text-blue-500' : 'text-slate-400']"></i>
          <div class="min-w-0 flex-1">
            <div class="text-[13px] font-medium text-slate-700 leading-tight">{{ d.name }}</div>
            <div class="mt-1 flex items-center gap-1.5">
              <span
                class="text-[10px] px-1.5 py-0.5 rounded"
                :class="statusMap[d.key] === 'ready' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'"
              >
                <i :class="statusMap[d.key] === 'ready' ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'" class="mr-0.5 text-[9px]"></i>
                {{ statusMap[d.key] === 'ready' ? '已生成' : '未生成' }}
              </span>
            </div>
          </div>
        </button>
      </div>
      <div class="p-3 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed">
        <i class="fa-solid fa-circle-info mr-1"></i>交付物由 AI 参照 FDE 手册模板生成，可编辑后导出。
      </div>
    </div>

    <!-- 右侧：预览 / 生成 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 工具条 -->
      <div class="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-white">
        <span class="text-[13px] font-semibold text-slate-700">{{ activeDeliverable?.name }}</span>
        <div class="ml-auto flex items-center gap-2">
          <button
            @click="$emit('generate', selected)"
            :disabled="busy"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i :class="busy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-wand-magic-sparkles'" class="text-[10px]"></i>
            {{ statusMap[selected] === 'ready' ? '重新生成' : '生成' + activeDeliverable?.short }}
          </button>
          <button
            v-if="statusMap[selected] === 'ready'"
            @click="$emit('toggle-edit')"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors"
            :class="editing ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          >
            <i :class="editing ? 'fa-solid fa-eye' : 'fa-solid fa-pen'" class="text-[10px]"></i>
            {{ editing ? '预览' : '编辑' }}
          </button>
          <button
            v-if="statusMap[selected] === 'ready'"
            @click="$emit('export-md', selected)"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <i class="fa-solid fa-download text-[10px]"></i>.md
          </button>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="flex-1 overflow-y-auto px-8 py-10 bg-[#e9e5dd]">
        <!-- 生成中 -->
        <div v-if="busy" class="flex flex-col items-center justify-center py-24 text-slate-400">
          <div class="relative w-12 h-12 mb-5">
            <div class="absolute inset-0 rounded-full border-2 border-blue-100"></div>
            <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin"></div>
            <div class="absolute inset-2 rounded-full bg-white flex items-center justify-center">
              <i class="fa-solid fa-wand-magic-sparkles text-blue-400 text-sm"></i>
            </div>
          </div>
          <p class="text-sm text-slate-500 font-medium">正在生成《{{ activeDeliverable?.name }}》…</p>
          <p class="text-[11px] text-slate-400 mt-1">AI 正参照手册模板填写，进度见"对话"tab 的执行日志</p>
        </div>

        <!-- 空态 -->
        <div v-else-if="!content" class="flex flex-col items-center justify-center py-20">
          <div class="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-4">
            <i :class="activeDeliverable?.icon" class="text-2xl text-slate-300"></i>
          </div>
          <p class="text-sm text-slate-500 mb-1">尚未生成《{{ activeDeliverable?.name }}》</p>
          <p class="text-xs text-slate-400 mb-6 max-w-sm text-center">{{ activeDeliverable?.hint }}</p>
          <button
            @click="$emit('generate', selected)"
            :disabled="busy"
            class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-700 hover:bg-blue-800 text-white transition-colors shadow-sm disabled:opacity-50"
          >
            <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
            生成{{ activeDeliverable?.short }}
          </button>
        </div>

        <!-- 编辑态 -->
        <div v-else-if="editing" class="mx-auto w-full max-w-[1440px]">
          <textarea
            :value="content"
            @input="$emit('update-content', $event.target.value)"
            class="w-full h-[calc(100vh-320px)] px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white"
          ></textarea>
          <div class="mt-3 flex justify-end">
            <button
              @click="$emit('save', selected)"
              class="px-4 py-2 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors"
            >
              <i class="fa-solid fa-check mr-1"></i>保存修改
            </button>
          </div>
        </div>

        <!-- 预览态 -->
        <div v-else class="mx-auto w-full max-w-[1440px]">
          <div class="doc-paper bg-[#fdfcfa] rounded-[14px] border border-[#e7e2d9] px-10 py-12 sm:px-14 sm:py-16">
            <div class="prose prose-sm prose-slate max-w-none doc-body" v-html="rendered"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { marked } from 'marked';

const props = defineProps({
  deliverables: { type: Array, required: true },   // [{ key, name, short, icon, hint }]
  selected: { type: String, required: true },
  statusMap: { type: Object, default: () => ({}) }, // { key: 'ready' | 'empty' }
  content: { type: String, default: '' },           // 当前选中交付物的 markdown
  busy: { type: Boolean, default: false },
  editing: { type: Boolean, default: false },
});

defineEmits(['select', 'generate', 'toggle-edit', 'export-md', 'update-content', 'save']);

const activeDeliverable = computed(() => props.deliverables.find((d) => d.key === props.selected) || null);
const rendered = computed(() => (props.content ? marked(props.content, { breaks: true, gfm: true }) : ''));
</script>

<style scoped>
/* 可点击元素统一小手 */
button:not(:disabled) { cursor: pointer; }
button:disabled { cursor: not-allowed; }
textarea { cursor: text; }

/* ── 书本纸面 ───────────────────────────── */
.doc-paper {
  position: relative;
  box-shadow:
    0 1px 1px rgba(60, 50, 30, 0.05),
    0 18px 50px -18px rgba(60, 50, 30, 0.28);
}
/* 顶部一道极淡的"装订"暖光，增强纸张质感 */
.doc-paper::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 5px;
  border-radius: 14px 14px 0 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0));
  pointer-events: none;
}

/* ── 文档正文排版 ───────────────────────────── */
.doc-body {
  color: #3d3a34;
  font-size: 14px;
  line-height: 1.9;
}
.doc-body :deep(> :first-child) { margin-top: 0; }

.doc-body :deep(h1) {
  font-size: 1.7em;
  font-weight: 700;
  color: #2a2620;
  letter-spacing: -0.01em;
  margin: 0 0 0.8em;
  padding-bottom: 0.6em;
  border-bottom: 1px solid #e2dacb;
}
.doc-body :deep(h2) {
  font-size: 1.24em;
  font-weight: 700;
  color: #33302a;
  margin: 2em 0 0.7em;
  padding-left: 0.6em;
  border-left: 3px solid #b08a4f;
}
.doc-body :deep(h3) {
  font-size: 1.08em;
  font-weight: 600;
  color: #45413a;
  margin: 1.6em 0 0.5em;
}

.doc-body :deep(p) { margin: 0.75em 0; }

.doc-body :deep(ul),
.doc-body :deep(ol) { margin: 0.75em 0; padding-left: 1.4em; }
.doc-body :deep(li) { margin: 0.4em 0; padding-left: 0.2em; }
.doc-body :deep(li::marker) { color: #b08a4f; }
.doc-body :deep(ul ul),
.doc-body :deep(ol ol) { margin: 0.25em 0; }

.doc-body :deep(strong) { font-weight: 700; color: #2a2620; }

.doc-body :deep(table) {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 1.4em 0;
  font-size: 0.92em;
  border: 1px solid #e2dacb;
  border-radius: 10px;
  overflow: hidden;
  display: table;
}
.doc-body :deep(th),
.doc-body :deep(td) {
  border-bottom: 1px solid #efe9dd;
  border-right: 1px solid #efe9dd;
  padding: 0.6em 0.9em;
  text-align: left;
  vertical-align: top;
}
.doc-body :deep(th:last-child),
.doc-body :deep(td:last-child) { border-right: none; }
.doc-body :deep(tr:last-child td) { border-bottom: none; }
.doc-body :deep(th) {
  background: #f6f1e7;
  font-weight: 600;
  color: #45413a;
  white-space: nowrap;
}
.doc-body :deep(tbody tr:hover td) { background: #faf7f0; }

.doc-body :deep(code) {
  background: #f2ede3;
  padding: 0.15em 0.42em;
  border-radius: 5px;
  font-size: 0.85em;
  color: #a15c2b;
}
.doc-body :deep(pre) {
  background: #2a2620;
  color: #ece3d3;
  padding: 1em 1.2em;
  border-radius: 10px;
  overflow-x: auto;
  font-size: 0.85em;
  margin: 1.2em 0;
}
.doc-body :deep(pre code) { background: transparent; padding: 0; color: inherit; }

.doc-body :deep(blockquote) {
  border-left: 3px solid #d8c3a0;
  background: #faf6ee;
  padding: 0.6em 1em;
  margin: 1.2em 0;
  border-radius: 0 8px 8px 0;
  color: #6b6456;
}
.doc-body :deep(blockquote p) { margin: 0.3em 0; }

.doc-body :deep(hr) {
  border: none;
  border-top: 1px solid #e2dacb;
  margin: 2em 0;
}
.doc-body :deep(a) { color: #9a6a2f; text-decoration: none; border-bottom: 1px solid #d8c3a0; }
.doc-body :deep(a:hover) { color: #7c541f; border-bottom-color: #9a6a2f; }
.doc-body :deep(img) { max-width: 100%; height: auto; border-radius: 8px; margin: 1.2em auto; display: block; }
</style>
