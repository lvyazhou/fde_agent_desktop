<template>
  <div class="w-[240px] shrink-0 bg-white border-r border-slate-200/60 flex flex-col">
    <!-- Header -->
    <div class="shrink-0 px-4 py-3 border-b border-slate-100">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">会话</span>
        <button class="text-slate-400 hover:text-slate-600 text-xs cursor-pointer" @click="$emit('close')">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
      </div>
      <button
        @click="$emit('new-chat')"
        class="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        <i class="fa-solid fa-plus text-xs"></i>
        开启新对话
      </button>
    </div>

    <!-- Search -->
    <div class="px-3 py-2">
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
        <i class="fa-solid fa-magnifying-glass text-[10px] text-slate-400"></i>
        <input
          v-model="searchQuery"
          placeholder="搜索会话/任务"
          class="flex-1 bg-transparent text-xs text-slate-600 placeholder-slate-400 focus:outline-none"
        />
      </div>
    </div>

    <!-- Project list -->
    <div class="flex-1 overflow-y-auto px-2 pb-2">
      <!-- Today -->
      <template v-if="todayProjects.length > 0">
        <div class="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">今天</div>
        <button
          v-for="project in todayProjects"
          :key="project.slug"
          @click="$emit('select', project.slug)"
          class="w-full text-left px-3 py-2 rounded-xl mb-0.5 transition-all flex items-center gap-2.5 cursor-pointer"
          :class="project.slug === currentSlug ? 'bg-blue-50 border border-blue-100/60' : 'hover:bg-slate-50'"
        >
          <i :class="phaseIcon(project.phase)" class="text-[11px] w-4 text-center" :style="{ color: project.slug === currentSlug ? '#2563eb' : '#64748b' }"></i>
          <span class="flex-1 min-w-0 text-[13px] font-medium truncate" :class="project.slug === currentSlug ? 'text-blue-800' : 'text-slate-700'">{{ project.name }}</span>
          <span v-if="project.slug === currentSlug" class="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
        </button>
      </template>

      <!-- Recent -->
      <template v-if="recentProjects.length > 0">
        <div class="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-2">近七天</div>
        <button
          v-for="project in recentProjects"
          :key="project.slug"
          @click="$emit('select', project.slug)"
          class="w-full text-left px-3 py-2 rounded-xl mb-0.5 transition-all flex items-center gap-2.5 cursor-pointer"
          :class="project.slug === currentSlug ? 'bg-blue-50 border border-blue-100/60' : 'hover:bg-slate-50'"
        >
          <i :class="phaseIcon(project.phase)" class="text-[11px] w-4 text-center text-slate-400"></i>
          <span class="flex-1 min-w-0 text-[13px] truncate text-slate-600">{{ project.name }}</span>
          <span class="text-[10px] text-slate-400 shrink-0">{{ formatDate(project.updatedAt || project.createdAt) }}</span>
        </button>
      </template>

      <!-- Older -->
      <template v-if="olderProjects.length > 0">
        <button
          @click="showOlder = !showOlder"
          class="w-full px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-3 flex items-center gap-1 hover:text-slate-600 cursor-pointer"
        >
          更多历史会话 ({{ olderProjects.length }})
          <i class="fa-solid fa-chevron-down text-[8px] transition-transform" :class="showOlder ? 'rotate-180' : ''"></i>
        </button>
        <template v-if="showOlder">
          <button
            v-for="project in olderProjects"
            :key="project.slug"
            @click="$emit('select', project.slug)"
            class="w-full text-left px-3 py-1.5 rounded-lg mb-0.5 transition-all flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
          >
            <i class="fa-solid fa-clock-rotate-left text-[9px] text-slate-300 w-4 text-center"></i>
            <span class="flex-1 min-w-0 text-xs text-slate-500 truncate">{{ project.name }}</span>
          </button>
        </template>
      </template>

      <!-- Empty -->
      <div v-if="filteredProjects.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-400">
        <i class="fa-solid fa-comments text-2xl mb-3 opacity-30"></i>
        <p class="text-xs">暂无对话记录</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  projects: { type: Array, default: () => [] },
  currentSlug: { type: String, default: '' },
});

defineEmits(['close', 'select', 'new-chat']);

const searchQuery = ref('');
const showOlder = ref(false);

const filteredProjects = computed(() => {
  let list = props.projects.filter(p => p.slug !== '__chat__');
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(p => (p.name || '').toLowerCase().includes(q));
  }
  return list;
});

const todayProjects = computed(() => {
  const today = new Date().toISOString().slice(0, 10);
  return filteredProjects.value.filter(p => (p.updatedAt || p.createdAt || '').slice(0, 10) === today);
});

const recentProjects = computed(() => {
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  return filteredProjects.value.filter(p => {
    const d = (p.updatedAt || p.createdAt || '').slice(0, 10);
    return d < todayStr && d >= sevenDaysAgo;
  });
});

const olderProjects = computed(() => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  return filteredProjects.value.filter(p => (p.updatedAt || p.createdAt || '').slice(0, 10) < sevenDaysAgo);
});

const phaseIcon = (phase) => {
  if (phase === 'iterating') return 'fa-solid fa-rotate';
  if (phase === 'prototype') return 'fa-solid fa-palette';
  if (phase === 'spec') return 'fa-solid fa-list-check';
  return 'fa-solid fa-comments';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}-${d.getDate()}`;
};
</script>
