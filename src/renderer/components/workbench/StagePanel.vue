<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-y-auto">
    <!-- 阶段头部:名称 + 目标 -->
    <div class="px-6 pt-5 pb-3">
      <div class="flex items-center gap-2 mb-1">
        <span class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">{{ stage.id }}</span>
        <h2 class="text-base font-semibold text-slate-800">{{ stage.name }}</h2>
        <span v-if="stage.isCore" class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">核心阶段</span>
      </div>
      <p class="text-[13px] text-slate-500 leading-relaxed">{{ stage.goal }}</p>
    </div>

    <!-- 要素卡:输入 / 输出 / 负责人 / 周期 / 成功标准 -->
    <div class="px-6 pb-4">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="bg-white rounded-xl border border-slate-200/80 p-3">
          <div class="text-[11px] text-slate-400 mb-1.5"><i class="fa-solid fa-arrow-right-to-bracket mr-1"></i>输入</div>
          <div class="flex flex-wrap gap-1">
            <span v-for="inp in stage.inputs" :key="inp" class="text-[11px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-600">{{ inp }}</span>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200/80 p-3">
          <div class="text-[11px] text-slate-400 mb-1.5"><i class="fa-solid fa-flag-checkered mr-1"></i>负责人 / 周期</div>
          <div class="text-[12px] text-slate-700">{{ stage.owner }}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">{{ stage.duration }}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200/80 p-3 col-span-2">
          <div class="text-[11px] text-slate-400 mb-1.5"><i class="fa-solid fa-circle-check mr-1"></i>成功标准</div>
          <div class="text-[12px] text-slate-600 leading-snug">{{ stage.successCriteria }}</div>
        </div>
      </div>
    </div>

    <!-- 产出区:交付物 -->
    <div class="px-6 pb-4 flex-1 min-h-0 flex flex-col">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-[13px] font-medium text-slate-700"><i class="fa-solid fa-box-open mr-1.5 text-slate-400"></i>本阶段交付物</span>
        <span class="text-[11px] text-slate-400">= 下一阶段的输入</span>
      </div>

      <!-- 阶段② 有实际工作区内容(通过 slot 注入现有 tab UI) -->
      <div v-if="hasWorkspace" class="flex-1 min-h-0 flex flex-col">
        <slot name="workspace" />
      </div>

      <!-- 其余阶段:交付物占位槽 -->
      <div v-else class="space-y-2">
        <template v-if="stage.deliverables.length">
          <div
            v-for="d in stage.deliverables"
            :key="d.key"
            class="bg-white rounded-xl border border-dashed border-slate-200 p-3 flex items-center gap-3"
          >
            <span class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300">
              <i :class="formIcon(d.form)"></i>
            </span>
            <div class="min-w-0 flex-1">
              <div class="text-[13px] text-slate-700">{{ d.name }}</div>
              <div v-if="d.note || d.sign" class="text-[11px] text-slate-400">
                <span v-if="d.sign">{{ d.sign }}</span><span v-if="d.note && d.sign"> · </span><span v-if="d.note">{{ d.note }}</span>
              </div>
            </div>
            <span class="text-[11px] px-2 py-1 rounded-md bg-slate-50 text-slate-400 shrink-0">待接入</span>
          </div>
        </template>
        <div v-else class="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center">
          <i class="fa-solid fa-graduation-cap text-slate-300 text-xl mb-2"></i>
          <p class="text-[13px] text-slate-500">本阶段为知识内化,无交付物</p>
          <p class="text-[11px] text-slate-400 mt-1">{{ (stage.internalize || []).join(' · ') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  stage: { type: Object, required: true },
  hasWorkspace: { type: Boolean, default: false },
});

function formIcon(form) {
  return {
    docx: 'fa-solid fa-file-word',
    md: 'fa-solid fa-file-lines',
    html: 'fa-solid fa-window-maximize',
    system: 'fa-solid fa-server',
    template: 'fa-solid fa-copy',
    doc: 'fa-solid fa-file',
  }[form] || 'fa-solid fa-file';
}
</script>
