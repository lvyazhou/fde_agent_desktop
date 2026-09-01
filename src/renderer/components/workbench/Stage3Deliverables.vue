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
      <div class="flex-1 overflow-y-auto p-6 bg-[#f5f7fa]">
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
        <div v-else-if="editing" class="max-w-4xl mx-auto">
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
        <div v-else class="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <div class="prose prose-sm prose-slate max-w-none" v-html="rendered"></div>
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

.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3) { color: #1e293b; margin-top: 1.4em; margin-bottom: 0.5em; }
.prose :deep(h1) { font-size: 1.5em; }
.prose :deep(h2) { font-size: 1.2em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
.prose :deep(ul), .prose :deep(ol) { padding-left: 1.5em; }
.prose :deep(table) { width: 100%; border-collapse: collapse; margin: 1em 0; display: block; overflow-x: auto; }
.prose :deep(th), .prose :deep(td) { border: 1px solid #e2e8f0; padding: 0.5em 0.75em; text-align: left; }
.prose :deep(th) { background: #f8fafc; font-weight: 600; }
.prose :deep(code) { background: #f1f5f9; padding: 0.15em 0.4em; border-radius: 0.25rem; font-size: 0.85em; }
.prose :deep(blockquote) { border-left: 3px solid #cbd5e1; padding-left: 1em; color: #64748b; margin: 1em 0; }
</style>
