<template>
  <div class="w-[280px] shrink-0 bg-white border-l border-slate-200/60 flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="shrink-0 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
      <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">智能体</span>
      <button class="text-slate-400 hover:text-slate-600 text-xs" @click="$emit('close')">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>

    <!-- Scrollable content (hidden scrollbar) -->
    <div class="flex-1 overflow-y-auto scrollbar-hide">
      <!-- 1. Agent Status -->
      <AccordionSection title="智能体状态" icon="fa-solid fa-robot" icon-color="#2563eb" :default-open="true">
        <div class="flex items-center gap-2 mb-2">
          <span class="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse"></span>
          <span class="text-xs font-semibold text-slate-800">沧澜 AI</span>
          <span class="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium ml-auto">在线</span>
        </div>
        <div class="text-[11px] text-slate-500 leading-relaxed space-y-1">
          <div class="flex items-center gap-1.5">
            <i class="fa-solid fa-layer-group text-[9px] text-blue-400 w-3 text-center"></i>
            <span>当前阶段：{{ projectMeta?.phase === 'brainstorming' ? '需求探索' : projectMeta?.phase === 'spec' ? '功能清单生成' : projectMeta?.phase === 'prototype' ? '原型设计' : projectMeta?.phase === 'iterating' ? '迭代优化' : '就绪' }}</span>
          </div>
        </div>
        <!-- Current model -->
        <div v-if="currentModel" class="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
          <i class="fa-solid fa-microchip text-[9px] text-blue-400"></i>
          <span>{{ currentModel }}</span>
        </div>
        <!-- Context usage bar -->
        <div v-if="contextUsage.size > 0" class="mt-2">
          <div class="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>上下文</span>
            <span>{{ Math.round(contextUsage.used / contextUsage.size * 100) }}%</span>
          </div>
          <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="contextUsage.used / contextUsage.size > 0.8 ? 'bg-rose-500' : contextUsage.used / contextUsage.size > 0.6 ? 'bg-amber-500' : 'bg-blue-500'"
              :style="{ width: Math.min(100, contextUsage.used / contextUsage.size * 100) + '%' }"
            ></div>
          </div>
        </div>
      </AccordionSection>

      <!-- 2. Knowledge Base -->
      <AccordionSection title="知识库" icon="fa-solid fa-book" icon-color="#3b82f6" :default-open="true">
        <template #action>
          <button v-if="slug" @click="$emit('upload-knowledge')" class="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer" title="上传参考文档">
            <i class="fa-solid fa-cloud-arrow-up text-[10px]"></i>
          </button>
        </template>
        <div class="space-y-1.5">
          <div v-if="projectMeta?.outputs?.hasSpec" class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer text-xs text-slate-600 hover:text-blue-700">
            <i class="fa-solid fa-file-lines text-blue-500 text-[10px] w-4 text-center"></i>
            <span>spec.md</span>
            <span class="text-[10px] text-slate-400 ml-auto">功能清单</span>
          </div>
          <div v-if="projectMeta?.outputs?.hasPrototype" class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer text-xs text-slate-600 hover:text-blue-700">
            <i class="fa-solid fa-folder text-blue-500 text-[10px] w-4 text-center"></i>
            <span>prototype/</span>
            <span class="text-[10px] text-slate-400 ml-auto">{{ projectMeta.outputs.prototypeFileCount }} 个页面</span>
          </div>
          <div v-if="!projectMeta?.outputs?.hasSpec && !projectMeta?.outputs?.hasPrototype && knowledgeFiles.length === 0" class="text-[11px] text-slate-400 py-2 text-center">
            暂无文档，可点击右上角上传
          </div>
          <!-- Uploaded knowledge files -->
          <div v-for="file in knowledgeFiles" :key="file" class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 text-xs text-slate-600">
            <i class="fa-solid fa-file text-slate-400 text-[10px] w-4 text-center"></i>
            <span class="flex-1 truncate">{{ file }}</span>
          </div>
        </div>
      </AccordionSection>

      <!-- 2.5. Execution Plan (Feature 7) -->
      <AccordionSection v-if="planItems.length > 0" title="执行计划" icon="fa-solid fa-list-ol" icon-color="#2563eb" :default-open="true">
        <div class="space-y-1">
          <div
            v-for="(item, i) in planItems"
            :key="i"
            class="flex items-start gap-2 text-[11px] py-0.5"
          >
            <span class="shrink-0 mt-0.5">
              <i v-if="item.status === 'completed'" class="fa-solid fa-circle-check text-blue-500 text-[10px]"></i>
              <i v-else-if="item.status === 'in_progress'" class="fa-solid fa-spinner fa-spin text-blue-500 text-[10px]"></i>
              <i v-else class="fa-regular fa-circle text-slate-300 text-[10px]"></i>
            </span>
            <span :class="item.status === 'completed' ? 'text-slate-400 line-through' : item.status === 'in_progress' ? 'text-blue-700 font-medium' : 'text-slate-600'">
              {{ item.content }}
            </span>
          </div>
        </div>
      </AccordionSection>

      <!-- 3. Skills -->
      <AccordionSection title="技能" icon="fa-solid fa-wand-magic-sparkles" icon-color="#2563eb" :default-open="true">
        <template #action>
          <button @click="$emit('browse-skills')" class="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer" title="浏览技能市场">
            <i class="fa-solid fa-store text-[10px]"></i>
          </button>
        </template>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="skill in displaySkills"
            :key="skill.key"
            class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors"
            :class="skill.bgClass"
          >
            <i :class="skill.icon" class="text-[8px]"></i>
            {{ skill.label }}
          </span>
        </div>
      </AccordionSection>

      <!-- 4. Execution Logs -->
      <AccordionSection title="执行日志" icon="fa-solid fa-terminal" icon-color="#2563eb" :default-open="true">
        <template #action>
          <button v-if="logs.length > 0" @click="$emit('clear-logs')" class="text-slate-400 hover:text-rose-500 transition-colors" title="清空日志">
            <i class="fa-solid fa-trash-can text-[10px]"></i>
          </button>
        </template>
        <div v-if="logs.length === 0" class="flex flex-col items-center py-4 text-slate-400">
          <i class="fa-solid fa-satellite-dish text-lg mb-2 opacity-40"></i>
          <span class="text-[11px]">等待 Agent 活动...</span>
        </div>
        <div v-else class="space-y-1 max-h-[180px] overflow-y-auto font-mono text-[11px]">
          <div
            v-for="log in logs.slice(-50)"
            :key="log.id"
            class="px-2 py-1 rounded-md transition-colors"
            :class="logClass(log)"
          >
            <div class="flex items-center gap-1.5">
              <i :class="logIcon(log)" class="text-[9px] w-3 text-center"></i>
              <span class="text-[10px] text-slate-400 shrink-0">{{ log.time }}</span>
            </div>
            <div class="mt-0.5 pl-[18px] text-slate-600 break-all leading-relaxed">{{ log.content }}</div>
          </div>
        </div>
      </AccordionSection>

      <!-- Suggested Questions -->
      <AccordionSection title="建议追问" icon="fa-solid fa-comments" icon-color="#2563eb" :default-open="true">
        <div v-if="suggestedQuestions.length === 0" class="text-[11px] text-slate-400 text-center py-3">
          对话后将生成建议追问
        </div>
        <div v-else class="space-y-1.5">
          <button
            v-for="(q, i) in suggestedQuestions"
            :key="i"
            @click="$emit('ask-question', q)"
            style="font-size: 12px;"
            class="w-full text-left text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg px-2 py-1.5 transition-colors flex items-start gap-1.5 cursor-pointer leading-snug"
          >
            <i class="fa-solid fa-chevron-right text-[9px] mt-[3px] shrink-0"></i>
            <span>{{ q }}</span>
          </button>
        </div>
      </AccordionSection>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import AccordionSection from '@/components/common/AccordionSection.vue';

const props = defineProps({
  slug: { type: String, required: true },
  projectMeta: { type: Object, default: () => ({}) },
  skills: { type: Array, default: () => [] },
  logs: { type: Array, default: () => [] },
  suggestedQuestions: { type: Array, default: () => [] },
  knowledgeFiles: { type: Array, default: () => [] },
  contextUsage: { type: Object, default: () => ({ used: 0, size: 0 }) },
  planItems: { type: Array, default: () => [] },
  currentModel: { type: String, default: '' },
});

defineEmits(['close', 'clear-logs', 'ask-question', 'upload-knowledge', 'change-model', 'browse-skills']);

// Skill 名称 → 中文标签 + 图标映射（兜底自动生成）
const skillMeta = {
  'brainstorming': { label: '头脑风暴', icon: 'fa-solid fa-lightbulb' },
  'product-feature-spec': { label: '功能清单', icon: 'fa-solid fa-list-check' },
  'prototype-generator': { label: '原型生成', icon: 'fa-solid fa-palette' },
  'prototype-iterate': { label: '原型迭代', icon: 'fa-solid fa-rotate' },
  'collaborative-planning-board': { label: '协作规划', icon: 'fa-solid fa-chalkboard' },
  'first-principles-critic': { label: '第一性原理', icon: 'fa-solid fa-microscope' },
  'image-generator': { label: '图片生成', icon: 'fa-solid fa-image' },
};

const displaySkills = computed(() => {
  // 优先使用动态扫描到的 skills，没有则降级到默认列表
  const source = props.skills && props.skills.length > 0
    ? props.skills
    : [{ name: 'brainstorming' }, { name: 'product-feature-spec' }, { name: 'prototype-generator' }, { name: 'prototype-iterate' }];

  return source.map(s => {
    const name = s.name || s.key || s;
    const meta = skillMeta[name] || {};
    return {
      key: name,
      label: meta.label || s.label || name,
      icon: meta.icon || 'fa-solid fa-puzzle-piece',
      bgClass: 'bg-blue-50 text-blue-700',
    };
  });
});

const logClass = (log) => {
  const map = {
    thought: 'bg-slate-50',
    tool: log.status === 'running' ? 'bg-sky-50 border-l-2 border-sky-400' : log.status === 'failed' ? 'bg-rose-50 border-l-2 border-rose-400' : 'bg-blue-50 border-l-2 border-blue-400',
    usage: 'bg-amber-50',
    error: 'bg-rose-50',
    info: 'bg-blue-50',
  };
  return map[log.type] || 'bg-slate-50';
};

const logIcon = (log) => {
  const map = {
    thought: 'fa-solid fa-brain text-slate-400',
    tool: log.status === 'running' ? 'fa-solid fa-gear fa-spin text-sky-500' : log.status === 'failed' ? 'fa-solid fa-circle-xmark text-rose-500' : 'fa-solid fa-circle-check text-blue-500',
    usage: 'fa-solid fa-chart-pie text-amber-500',
    error: 'fa-solid fa-triangle-exclamation text-rose-500',
    info: 'fa-solid fa-circle-info text-blue-500',
  };
  return map[log.type] || 'fa-solid fa-circle text-slate-400';
};
</script>
