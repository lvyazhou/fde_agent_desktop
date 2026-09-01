<template>
  <div class="bg-white border-b border-slate-200/80 px-5 py-3 shrink-0">
    <!-- 标题 -->
    <div class="flex items-center gap-2 mb-2.5">
      <span class="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
        <i class="fa-solid fa-industry text-white text-[10px]"></i>
      </span>
      <span class="text-[13px] font-bold text-slate-700 tracking-tight">FDE 工业化流水线</span>
      <span class="text-[11px] text-slate-400 font-medium">五阶段一条链 · 上一阶段的输出＝下一阶段的输入</span>
    </div>
    <div class="flex items-center gap-1 overflow-x-auto">
      <template v-for="(stage, idx) in stages" :key="stage.id">
        <!-- 阶段节点 -->
        <button
          @click="$emit('select', stage.id)"
          class="group flex items-center gap-2 px-3 py-2 rounded-lg transition-all shrink-0"
          :class="nodeClass(stage.id)"
          :title="stage.goal"
        >
          <!-- 状态圆点 -->
          <span
            class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
            :class="dotClass(stage.id)"
          >
            <i v-if="statusOf(stage.id) === 'done'" class="fa-solid fa-check text-[10px]"></i>
            <span v-else>{{ stage.id }}</span>
          </span>
          <div class="text-left min-w-0">
            <div class="text-[13px] font-medium leading-tight whitespace-nowrap">{{ stage.name }}</div>
            <div class="text-[10px] text-slate-400 leading-tight whitespace-nowrap">
              {{ stage.deliverables.length ? stage.deliverables.length + ' 项交付物' : '无交付物' }}
            </div>
          </div>
        </button>
        <!-- 连接线 -->
        <div
          v-if="idx < stages.length - 1"
          class="h-px w-4 shrink-0"
          :class="statusOf(stage.id) === 'done' ? 'bg-blue-400' : 'bg-slate-200'"
        ></div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { FDE_STAGES } from '@/data/fde-stages';

const props = defineProps({
  current: { type: Number, default: 2 },
  stageStatus: { type: Object, default: () => ({}) },
});
defineEmits(['select']);

const stages = FDE_STAGES;

function statusOf(id) {
  // 优先用传入的 stageStatus;否则据 current 推导
  if (props.stageStatus && props.stageStatus[id]) return props.stageStatus[id];
  if (id < props.current) return 'done';
  if (id === props.current) return 'active';
  return 'todo';
}

function nodeClass(id) {
  const s = statusOf(id);
  if (id === props.current) return 'bg-blue-50 ring-1 ring-blue-200';
  if (s === 'done') return 'hover:bg-slate-50';
  return 'hover:bg-slate-50 opacity-70';
}

function dotClass(id) {
  const s = statusOf(id);
  if (id === props.current) return 'bg-blue-600 text-white';
  if (s === 'done') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-400';
}
</script>

<style scoped>
button { cursor: pointer; }
</style>
