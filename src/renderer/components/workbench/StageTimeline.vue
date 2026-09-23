<template>
  <div class="px-5 py-3">
    <!-- 步骤卡：已完成蓝勾 / 当前蓝色高亮 / 未开始灰色；只做展示和快速跳阶段 -->
    <div class="flex items-stretch gap-1 overflow-x-auto scrollbar-thin">
      <template v-for="(stage, idx) in stages" :key="stage.id">
        <button
          @click="$emit('select', stage.id)"
          class="flex-1 min-w-[150px] flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-colors"
          :class="cardClass(stage.id)"
          :title="`${stage.name}：${stage.goal}`"
          :aria-current="stage.id === current ? 'step' : undefined"
        >
          <span
            class="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0 transition-colors"
            :class="dotClass(stage.id)"
          >
            <i v-if="stateOf(stage.id) === 'done'" class="fa-solid fa-check text-[11px]"></i>
            <span v-else>{{ stage.id }}</span>
          </span>
          <span class="min-w-0 flex-1 leading-tight">
            <span class="block text-[12.5px] truncate" :class="labelClass(stage.id)">{{ stageFlow(stage) }}</span>
            <span class="block text-[10.5px] truncate mt-0.5" :class="stateOf(stage.id) === 'todo' ? 'text-slate-300' : 'text-slate-400'">{{ stage.steps }}</span>
          </span>
        </button>
        <i
          v-if="idx < stages.length - 1"
          class="fa-solid fa-chevron-right self-center text-[10px] shrink-0"
          :class="stage.id < current ? 'text-blue-300' : 'text-slate-200'"
          aria-hidden="true"
        ></i>
      </template>
    </div>

    <!-- 当前阶段说明：告诉用户现在在哪、下一步做什么 -->
    <div class="mt-2.5 flex flex-wrap items-baseline gap-x-6 gap-y-0.5 text-[11.5px] leading-5 text-slate-500">
      <span>当前阶段：<span class="font-semibold text-slate-800">{{ flowText }}</span></span>
      <span class="min-w-0 truncate">
        下一步：<slot name="next"><span class="text-slate-600">{{ currentStage.nextStep }}</span></slot>
      </span>
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

// 阶段名里的「A + B」是同一阶段内的先后两步，卡片里也写成 A → B
function stageFlow(stage) {
  return String(stage.name).split(/\s*\+\s*/).join(' → ');
}

function stateOf(id) {
  if (id === props.current) return 'active';
  if (id < props.current || props.stageStatus?.[id] === 'done') return 'done';
  return 'todo';
}

function cardClass(id) {
  const s = stateOf(id);
  if (s === 'active') return 'bg-blue-50 border-blue-300 ring-1 ring-blue-200';
  if (s === 'done') return 'bg-white border-slate-200 hover:border-blue-200';
  return 'bg-slate-50/60 border-slate-200/70 hover:border-slate-300';
}

function dotClass(id) {
  const s = stateOf(id);
  if (s === 'active') return 'bg-blue-600 text-white shadow-sm shadow-blue-500/30';
  if (s === 'done') return 'bg-blue-100 text-blue-600';
  return 'bg-slate-200/70 text-slate-400';
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
