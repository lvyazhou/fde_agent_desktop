<template>
  <div class="px-6 pt-1.5 pb-2.5">
    <!-- 阶段节点：已完成蓝勾 / 当前蓝色高亮 / 未开始灰色；只做展示和快速跳阶段 -->
    <div class="grid grid-cols-5">
      <button
        v-for="stage in stages"
        :key="stage.id"
        @click="$emit('select', stage.id)"
        class="min-w-0 flex items-center justify-center gap-1.5 py-1 rounded-md transition-colors hover:bg-slate-50"
        :title="`${stage.name}：${stage.goal}`"
      >
        <span
          class="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 transition-colors"
          :class="dotClass(stage.id)"
        >
          <i v-if="stateOf(stage.id) === 'done'" class="fa-solid fa-check text-[9px]"></i>
          <span v-else>{{ stage.id }}</span>
        </span>
        <span class="text-[12.5px] truncate" :class="labelClass(stage.id)">{{ stage.label }}</span>
      </button>
    </div>

    <!-- 进度条：填到当前阶段节点的中点 -->
    <div class="relative h-1 mt-1 rounded-full bg-slate-200/80 overflow-hidden">
      <div
        class="absolute inset-y-0 left-0 rounded-full bg-blue-600 transition-[width] duration-300"
        :style="{ width: fillPct + '%' }"
      ></div>
    </div>

    <!-- 当前阶段说明 -->
    <div class="mt-2 text-[12px] leading-5 text-slate-500">
      <div>
        当前阶段：<span class="font-semibold text-slate-800">{{ flowText }}</span>
      </div>
      <div class="truncate">
        下一步：<slot name="next"><span class="text-slate-700">{{ currentStage.nextStep }}</span></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { FDE_STAGES } from '@/data/fde-stages';

const props = defineProps({
  current: { type: Number, default: 2 },
  stageStatus: { type: Object, default: () => ({}) },
});
defineEmits(['select']);

const stages = FDE_STAGES;
const CIRCLED = '①②③④⑤';

const currentStage = computed(() => stages.find((s) => s.id === props.current) || stages[0]);

// 阶段名里的「A + B」是同一阶段内的先后两步，写成 A → B，避免被读成两个并列入口
const flowText = computed(() => {
  const s = currentStage.value;
  return `${CIRCLED[s.id - 1] || s.id} ${s.name.split(/\s*\+\s*/).join(' → ')}`;
});

const fillPct = computed(() => ((props.current - 0.5) / stages.length) * 100);

function stateOf(id) {
  if (id === props.current) return 'active';
  if (id < props.current || props.stageStatus?.[id] === 'done') return 'done';
  return 'todo';
}

function dotClass(id) {
  const s = stateOf(id);
  if (s === 'active') return 'bg-blue-600 text-white ring-[3px] ring-blue-100';
  if (s === 'done') return 'bg-blue-100 text-blue-600';
  return 'bg-slate-100 text-slate-400';
}

function labelClass(id) {
  const s = stateOf(id);
  if (s === 'active') return 'text-blue-700 font-semibold';
  if (s === 'done') return 'text-slate-600 font-medium';
  return 'text-slate-400 font-medium';
}
</script>

<style scoped>
button { cursor: pointer; }
</style>
