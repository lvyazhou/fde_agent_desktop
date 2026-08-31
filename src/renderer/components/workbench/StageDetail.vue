<template>
  <div class="flex flex-col h-full min-h-0 bg-[#f5f7fa]">
    <!-- 顶部:返回 + 阶段标题 -->
    <div class="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200/80 shrink-0">
      <button
        @click="$emit('back')"
        class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
        title="返回工作台"
      >
        <i class="fa-solid fa-arrow-left text-sm"></i>
      </button>
      <span class="w-7 h-7 rounded-full bg-blue-600 text-white text-[13px] font-semibold flex items-center justify-center">{{ stage.id }}</span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h2 class="text-[15px] font-semibold text-slate-800 truncate">{{ stage.name }}</h2>
          <span v-if="stage.isCore" class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium shrink-0">核心阶段</span>
        </div>
        <p class="text-[12px] text-slate-500 truncate">{{ stage.goal }}</p>
      </div>
      <button
        v-if="stage.id === 1"
        @click="$emit('coach')"
        class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all cursor-pointer shadow-sm shrink-0"
      >
        <i class="fa-solid fa-headset text-[12px]"></i>
        <span>进入教练陪练</span>
      </button>
    </div>

    <!-- 主体:左文件列表 + 右预览 -->
    <div class="flex-1 min-h-0 flex overflow-hidden">
      <!-- 左侧:要素 + 文件清单 -->
      <div class="w-[340px] shrink-0 border-r border-slate-200/80 overflow-y-auto bg-white">
        <!-- 要素卡 -->
        <div class="p-4 space-y-3 border-b border-slate-100">
          <div class="bg-slate-50 rounded-xl p-3">
            <div class="text-[11px] text-slate-400 mb-1"><i class="fa-solid fa-arrow-right-to-bracket mr-1"></i>输入</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="inp in stage.inputs" :key="inp" class="text-[11px] px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200/60">{{ inp }}</span>
            </div>
          </div>
          <div class="bg-slate-50 rounded-xl p-3">
            <div class="text-[11px] text-slate-400 mb-1"><i class="fa-solid fa-user-gear mr-1"></i>负责人 / 节奏</div>
            <div class="text-[12px] text-slate-700">{{ stage.owner }}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">{{ stage.duration }}</div>
          </div>
        </div>

        <!-- 知识库 -->
        <div v-if="knowledgeItems.length" class="p-4 pb-2">
          <div class="text-[12px] font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-book text-emerald-500 text-[11px]"></i>知识库
            <span class="text-[10px] text-slate-400 font-normal">{{ knowledgeItems.length }} 份 · 要学会内化</span>
          </div>
          <button
            v-for="it in knowledgeItems"
            :key="it.file"
            @click="select(it)"
            class="w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-2.5 transition-colors cursor-pointer"
            :class="isActive(it) ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-slate-50'"
          >
            <i :class="[it.type === 'docx' ? 'fa-solid fa-file-word text-blue-400' : 'fa-solid fa-file-lines text-emerald-500', 'text-[12px] shrink-0']"></i>
            <span class="text-[12px] text-slate-700 flex-1 min-w-0 truncate">{{ it.title }}</span>
            <span v-if="!it.previewable" class="text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 shrink-0">Word</span>
          </button>
        </div>

        <!-- 交付物 -->
        <div v-if="deliverableItems.length" class="p-4 pt-2">
          <div class="text-[12px] font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-box-open text-blue-500 text-[11px]"></i>交付物
            <span class="text-[10px] text-slate-400 font-normal">= 下一阶段输入</span>
          </div>
          <button
            v-for="it in deliverableItems"
            :key="it.file"
            @click="select(it)"
            class="w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-2.5 transition-colors cursor-pointer"
            :class="isActive(it) ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'"
          >
            <i :class="[it.type === 'docx' ? 'fa-solid fa-file-word text-blue-400' : 'fa-solid fa-file-lines text-emerald-500', 'text-[12px] shrink-0']"></i>
            <span class="text-[12px] text-slate-700 flex-1 min-w-0 truncate">{{ it.title }}</span>
            <span v-if="!it.previewable" class="text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 shrink-0">Word</span>
          </button>
        </div>

        <!-- 规范说明 -->
        <div v-if="specItems.length" class="p-4 pt-2">
          <div class="text-[12px] font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-scroll text-slate-400 text-[11px]"></i>规范说明
          </div>
          <button
            v-for="it in specItems"
            :key="it.file"
            @click="select(it)"
            class="w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-2.5 transition-colors cursor-pointer"
            :class="isActive(it) ? 'bg-slate-100 ring-1 ring-slate-200' : 'hover:bg-slate-50'"
          >
            <i class="fa-solid fa-file-lines text-slate-400 text-[12px] shrink-0"></i>
            <span class="text-[12px] text-slate-700 flex-1 min-w-0 truncate">{{ it.title }}</span>
          </button>
        </div>

        <div v-if="!items.length" class="p-8 text-center text-slate-400">
          <i class="fa-solid fa-graduation-cap text-xl mb-2"></i>
          <p class="text-[12px]">本阶段暂无内置文档</p>
        </div>
      </div>

      <!-- 右侧:预览 -->
      <div class="flex-1 min-w-0 min-h-0">
        <DocViewer v-if="activeItem" :stage="stage.dir" :item="activeItem" :key="activeItem.file" />
        <div v-else class="h-full flex flex-col items-center justify-center text-slate-300">
          <i class="fa-solid fa-hand-pointer text-3xl mb-3"></i>
          <p class="text-[13px] text-slate-400">从左侧选择一份文档查看</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import DocViewer from './DocViewer.vue';

const props = defineProps({
  stage: { type: Object, required: true },        // 合并了 fde-stages + manifest 的阶段对象
});
defineEmits(['back', 'coach']);

const items = computed(() => props.stage.items || []);
const knowledgeItems = computed(() => items.value.filter((i) => i.category === 'knowledge'));
const deliverableItems = computed(() => items.value.filter((i) => i.category === 'deliverable'));
const specItems = computed(() => items.value.filter((i) => i.category === 'spec' || i.category === 'other'));

const activeItem = ref(null);
const select = (it) => { activeItem.value = it; };
const isActive = (it) => activeItem.value && activeItem.value.file === it.file;

// 默认选中第一个可预览的文档
const pickDefault = () => {
  const first = items.value.find((i) => i.previewable) || items.value[0] || null;
  activeItem.value = first;
};
watch(() => props.stage, pickDefault, { immediate: true });
</script>
