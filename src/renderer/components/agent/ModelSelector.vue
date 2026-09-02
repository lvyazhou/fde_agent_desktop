<template>
  <div class="relative" ref="rootRef">
    <!-- Trigger：与旁边「智能体」胶囊同款样式。用内联 style 强制字号，
         杜绝任何 class 优先级/继承导致的字号偏大。 -->
    <button
      @click.stop="toggleOpen"
      style="font-size:10px;line-height:1;font-weight:400"
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors cursor-pointer max-w-[220px]"
      :class="open
        ? 'bg-blue-100 border-blue-200 text-blue-700'
        : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100'"
      :title="currentLabel"
    >
      <i class="fa-solid fa-microchip shrink-0" style="font-size:9px"></i>
      <span class="truncate" style="font-size:10px">{{ currentShort || '选择模型' }}</span>
      <i class="fa-solid fa-chevron-down ml-0.5 shrink-0 transition-transform duration-200" style="font-size:7px"
        :class="open ? 'rotate-180' : ''"></i>
    </button>

    <!-- Dropdown：向上弹出（bottom-full），避免被底部输入框边界遮挡 -->
    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="open"
        class="absolute z-30 bottom-full mb-2 left-0 w-[280px] max-h-[340px] rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col"
      >
        <!-- Search -->
        <div class="p-2.5 border-b border-slate-100">
          <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-300"></i>
            <input
              ref="searchRef"
              v-model="query"
              type="text"
              placeholder="搜索模型…"
              class="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-transparent text-[12.5px] placeholder:text-slate-300 focus:outline-none focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>
        </div>

        <!-- List -->
        <div class="overflow-y-auto flex-1 p-1.5 space-y-0.5">
          <div v-if="filtered.length === 0" class="px-3 py-8 text-center text-[12px] text-slate-400">
            <i class="fa-regular fa-face-frown mb-2 block text-lg text-slate-300"></i>
            无匹配模型
          </div>
          <button
            v-for="item in filtered"
            :key="item.id"
            @click="select(item.id)"
            class="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left transition-colors cursor-pointer"
            :class="isCurrent(item.id) ? 'bg-blue-50' : 'hover:bg-slate-50'"
          >
            <span class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px]"
              :class="isCurrent(item.id) ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'">
              <i :class="brandIcon(item.id)"></i>
            </span>
            <div class="min-w-0 flex-1">
              <div class="text-[12.5px] truncate"
                :class="isCurrent(item.id) ? 'font-semibold text-blue-700' : 'text-slate-700'">
                {{ shortName(item.id) }}
              </div>
              <div class="text-[10px] text-slate-400 truncate">{{ item.id }}</div>
            </div>
            <i v-if="isCurrent(item.id)" class="fa-solid fa-check text-[11px] text-blue-500 shrink-0"></i>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';

const props = defineProps({
  // 每项可为字符串，或 { model_id | id, name, description }
  models: { type: Array, default: () => [] },
  current: { type: String, default: '' },
});

const emit = defineEmits(['change']);

const open = ref(false);
const query = ref('');
const rootRef = ref(null);
const searchRef = ref(null);

// hermes 会把 360 全部 400+ 个模型（含视频/embedding/OCR/内部测试变体）一股脑返回。
// 这里用「精选白名单」筛出干净的一线对话模型：按结尾模型名（去掉 provider 前缀）匹配。
// 想加/删模型：改这个数组即可。顺序即展示顺序。
const CURATED = [
  'anthropic/claude-opus-4.8',
  'anthropic/claude-opus-5',
  'anthropic/claude-sonnet-5',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-fable-5',
  'deepseek/deepseek-v4-pro',
  'deepseek/deepseek-v4-flash',
  'openai/gpt-5.5',
  'openai/gpt-5.6-terra',
  'openai/gpt-5.6-sol',
  'moonshotai/kimi-k3',
  'z-ai/glm-5.3',
  'z-ai/glm-5.2',
  'qwen/qwen3.8-max',
  'minimax/MiniMax-M2.7-highspeed',
  'minimax/MiniMax-M3',
];

// 去掉 provider 前缀（openai-api:anthropic/claude-opus-4.8 → anthropic/claude-opus-4.8）
function stripProvider(id) {
  const s = String(id || '');
  const i = s.indexOf(':');
  return i >= 0 ? s.slice(i + 1) : s;
}

// 归一化：统一成 { id, label }，并用白名单筛选 + 排序
const normalized = computed(() => {
  const all = (props.models || []).map((m) => {
    if (typeof m === 'string') return { id: m };
    const id = m.modelId || m.model_id || m.id || m.model || '';
    return { id, label: m.name };
  }).filter((m) => m.id);

  // 建立 “去前缀名 → 原始项” 映射（同名取第一个，通常是标准 provider）
  const byBare = new Map();
  for (const m of all) {
    const bare = stripProvider(m.id);
    if (!byBare.has(bare)) byBare.set(bare, m);
  }

  const picked = [];
  for (const want of CURATED) {
    const hit = byBare.get(want);
    if (hit) picked.push({ id: hit.id, label: shortName(hit.id), description: want });
  }
  // 若白名单一个都没命中（列表结构异常），退回展示全部去重项，避免空框
  if (picked.length === 0) {
    for (const [bare, m] of byBare) picked.push({ id: m.id, label: shortName(m.id), description: bare });
  }
  return picked;
});

// 取最后一段作为短名（deepseek/deepseek-v4-pro → deepseek-v4-pro）
function shortName(id) {
  if (!id) return '';
  const parts = String(id).split('/');
  return parts[parts.length - 1];
}

// 判断某项是否为「当前模型」。current 可能带不同前缀
// （如 custom:openai-api:anthropic/claude-opus-4.8 vs openai-api:anthropic/...），
// 统一去到最后一段裸名比较，容错。
function bareModel(id) {
  const s = String(id || '');
  const noProv = s.includes(':') ? s.slice(s.lastIndexOf(':') + 1) : s;
  return noProv; // e.g. anthropic/claude-opus-4.8
}
function isCurrent(id) {
  if (!id || !props.current) return false;
  return bareModel(id) === bareModel(props.current);
}

// 按厂商给个小图标
function brandIcon(id) {
  const s = String(id).toLowerCase();
  if (s.includes('claude') || s.includes('anthropic')) return 'fa-solid fa-star';
  if (s.includes('deepseek')) return 'fa-solid fa-water';
  if (s.includes('gpt') || s.includes('openai')) return 'fa-solid fa-bolt';
  if (s.includes('kimi') || s.includes('moonshot')) return 'fa-solid fa-moon';
  if (s.includes('glm') || s.includes('z-ai')) return 'fa-solid fa-cube';
  if (s.includes('qwen')) return 'fa-solid fa-feather';
  if (s.includes('minimax')) return 'fa-solid fa-wave-square';
  return 'fa-solid fa-microchip';
}

const currentLabel = computed(() => {
  const hit = normalized.value.find((m) => isCurrent(m.id));
  return hit ? hit.label : shortName(bareModel(props.current));
});

const currentShort = computed(() => shortName(bareModel(props.current)));

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return normalized.value;
  return normalized.value.filter(
    (m) => m.id.toLowerCase().includes(q) || (m.label || '').toLowerCase().includes(q)
  );
});

function toggleOpen() {
  open.value = !open.value;
  if (open.value) {
    query.value = '';
    nextTick(() => searchRef.value && searchRef.value.focus());
  }
}

function select(id) {
  open.value = false;
  if (id) emit('change', id);
}

function onDocClick(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) open.value = false;
}

onMounted(() => document.addEventListener('click', onDocClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick));
</script>
