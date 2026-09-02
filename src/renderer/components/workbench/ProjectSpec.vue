<template>
  <div class="flex flex-col h-full min-h-0 bg-[#f5f7fa]">
    <!-- 顶部:标题 -->
    <div class="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200/80 shrink-0">
      <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
        <i class="fa-solid fa-clipboard-list text-[13px]"></i>
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h2 class="text-[15px] font-semibold text-slate-800 truncate">FDE 项目规范</h2>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium shrink-0">极库云项目管理制度</span>
        </div>
        <p class="text-[12px] text-slate-500 truncate">五阶段项目管理 · 需求管理 · 产品复制模式</p>
      </div>
    </div>

    <!-- 主体:分区卡片纵向排列,可滚动 -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="spec-inner w-full space-y-6">

        <!-- 一、五阶段项目管理 -->
        <section>
          <div class="section-title">
            <span class="section-no">一</span>
            <i class="fa-solid fa-layer-group text-blue-500"></i>
            五阶段项目管理
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="s in fiveStage"
              :key="s.id"
              class="bg-white rounded-2xl border border-slate-200/70 p-4 flex flex-col"
            >
              <div class="flex items-center gap-2.5 mb-2">
                <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
                  <i :class="s.icon" class="text-[13px]"></i>
                </span>
                <div class="min-w-0">
                  <div class="text-[10px] text-slate-400 leading-none">环节 {{ s.id }}</div>
                  <div class="text-[13px] font-semibold text-slate-800 truncate">{{ s.name }}</div>
                </div>
              </div>
              <p class="text-[12px] text-slate-500 leading-relaxed">{{ s.desc }}</p>

              <!-- 交付物清单(复用作战链 deliverables) -->
              <div v-if="s.deliverables && s.deliverables.length" class="mt-3 pt-3 border-t border-slate-100">
                <div class="text-[10px] text-slate-400 mb-1.5">
                  <i class="fa-solid fa-box-open mr-1 text-blue-400"></i>输出交付物
                </div>
                <div class="space-y-1.5">
                  <div
                    v-for="(d, di) in s.deliverables"
                    :key="di"
                    class="text-[11px] text-slate-600 flex items-start gap-1.5 leading-snug"
                  >
                    <i class="fa-solid fa-circle text-blue-300 text-[4px] mt-1.5 shrink-0"></i>
                    <span class="min-w-0">
                      {{ d.name }}
                      <span v-if="d.form" class="text-[10px] text-slate-400 ml-0.5">· {{ formLabel(d.form) }}</span>
                      <span v-if="d.sign" class="ml-1 text-[10px] px-1 py-0.5 rounded bg-amber-50 text-amber-600 whitespace-nowrap">{{ d.sign }}</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- 节奏标签(日报/周报) -->
              <div v-if="s.cadence" class="mt-2 inline-flex self-start items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-100 text-[11px] text-amber-600 font-medium">
                <i class="fa-solid fa-clock text-[10px]"></i>{{ s.cadence }}
              </div>

              <!-- 相关材料标签 -->
              <div v-if="s.tags" class="mt-2 flex flex-wrap gap-1">
                <span v-for="t in s.tags" :key="t" class="text-[11px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200/60">{{ t }}</span>
              </div>

              <!-- HIS 标品交付 SOP 举例 -->
              <div v-if="s.example" class="mt-3 pt-3 border-t border-slate-100">
                <div class="text-[11px] text-slate-400 mb-2">{{ s.example.title }}</div>
                <div class="flex items-center gap-1 flex-wrap">
                  <template v-for="(step, i) in s.example.steps" :key="step">
                    <span class="text-[11px] px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 whitespace-nowrap">{{ i + 1 }}. {{ step }}</span>
                    <i v-if="i < s.example.steps.length - 1" class="fa-solid fa-arrow-right text-indigo-300 text-[9px]"></i>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 二、项目需求管理 -->
        <section>
          <div class="section-title">
            <span class="section-no">二</span>
            <i class="fa-solid fa-list-check text-blue-500"></i>
            项目需求管理
          </div>
          <p class="text-[12px] text-slate-500 mb-3">{{ reqMgmt.intro }}</p>

          <!-- 角色分工 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div v-for="r in reqMgmt.roles" :key="r.name" class="bg-white rounded-2xl border border-slate-200/70 p-4 flex items-start gap-3">
              <span class="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <i :class="r.icon"></i>
              </span>
              <div class="min-w-0">
                <div class="text-[13px] font-semibold text-slate-800 mb-0.5">{{ r.name }}</div>
                <p class="text-[12px] text-slate-500 leading-relaxed">{{ r.duty }}</p>
              </div>
            </div>
          </div>

          <!-- 迭代版本规划举例 -->
          <div class="bg-white rounded-2xl border border-slate-200/70 p-4 mb-3">
            <div class="text-[13px] font-semibold text-slate-800 mb-0.5">{{ reqMgmt.example.title }}</div>
            <p class="text-[12px] text-slate-500 mb-3">{{ reqMgmt.example.desc }}</p>
            <div class="flex items-stretch gap-2 overflow-x-auto pb-1">
              <div
                v-for="it in reqMgmt.example.iterations"
                :key="it.version"
                class="shrink-0 min-w-[160px] flex-1 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[12px] font-mono font-semibold text-indigo-700">{{ it.version }}</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-semibold">{{ it.priority }}</span>
                </div>
                <div class="text-[11px] text-slate-500">{{ it.label }}</div>
              </div>
            </div>
          </div>

          <!-- 项目主动跟进 -->
          <div class="bg-white rounded-2xl border border-slate-200/70 p-4">
            <div class="text-[13px] font-semibold text-slate-800 mb-0.5 flex items-center gap-1.5">
              <i class="fa-solid fa-bullseye text-blue-500 text-[12px]"></i>项目主动跟进
            </div>
            <p class="text-[12px] text-slate-500 mb-3">{{ reqMgmt.followUp.desc }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div v-for="src in reqMgmt.followUp.sources" :key="src.name" class="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
                <div class="text-[12px] font-medium text-emerald-800 flex items-center gap-1.5 mb-0.5">
                  <i class="fa-solid fa-circle-check text-emerald-500 text-[10px]"></i>{{ src.name }}
                </div>
                <div class="text-[11px] text-emerald-600">{{ src.watch }}</div>
                <div class="text-[10px] text-emerald-400 mt-0.5">{{ src.host }}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- 三、产品复制模式 -->
        <section>
          <div class="section-title">
            <span class="section-no">三</span>
            <i class="fa-solid fa-copy text-blue-500"></i>
            产品复制模式
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="m in modes"
              :key="m.key"
              class="bg-white rounded-2xl border p-4"
              :class="m.accent === 'blue' ? 'border-blue-200/70' : 'border-indigo-200/70'"
            >
              <div class="flex items-center gap-2.5 mb-3">
                <span
                  class="w-9 h-9 rounded-lg text-white flex items-center justify-center shrink-0"
                  :class="m.accent === 'blue' ? 'bg-blue-600' : 'bg-indigo-600'"
                >
                  <i :class="m.icon"></i>
                </span>
                <div class="text-[14px] font-semibold text-slate-800">{{ m.name }}</div>
              </div>
              <ul class="space-y-2">
                <li v-for="(p, i) in m.points" :key="i" class="text-[12px] text-slate-600 leading-relaxed flex items-start gap-2">
                  <i class="fa-solid fa-circle text-[4px] mt-1.5 shrink-0" :class="m.accent === 'blue' ? 'text-blue-300' : 'text-indigo-300'"></i>
                  <span>{{ p }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 相关外链 -->
        <section>
          <div class="section-title">
            <i class="fa-solid fa-link text-blue-500"></i>
            极库云资源
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              v-for="lk in links"
              :key="lk.url"
              @click="openLink(lk.url)"
              class="group text-left bg-white rounded-2xl border border-slate-200/70 hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5 transition-all cursor-pointer p-4 flex items-start gap-3"
            >
              <span class="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <i :class="lk.icon"></i>
              </span>
              <div class="min-w-0 flex-1">
                <div class="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
                  <span class="truncate">{{ lk.title }}</span>
                  <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-300 group-hover:text-blue-500 transition-colors shrink-0"></i>
                </div>
                <p class="text-[11px] text-slate-500 leading-relaxed mt-0.5">{{ lk.desc }}</p>
              </div>
            </button>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<script setup>
import { FIVE_STAGE_MGMT, REQUIREMENT_MGMT, REPLICATION_MODES, GEELIB_LINKS } from '@/data/fde-project-spec';

const fiveStage = FIVE_STAGE_MGMT;
const reqMgmt = REQUIREMENT_MGMT;
const modes = REPLICATION_MODES;
const links = GEELIB_LINKS;

/** 交付物文件形态 → 中文标签 */
const FORM_LABELS = { docx: 'Word', md: 'Markdown', html: '原型', doc: '文档', system: '系统', template: '模板' };
const formLabel = (form) => FORM_LABELS[form] || form;

const openLink = async (url) => {
  try {
    await window.api.shell.openExternal(url);
  } catch { /* ignore */ }
};
</script>

<style scoped>
/* 横向内边距与工作台门户(.portal-inner)保持一致,撑满宽度不居中收窄 */
.spec-inner {
  padding: clamp(16px, 2.2vh, 24px) clamp(16px, 3vw, 40px);
}
.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b; /* slate-800 */
  margin-bottom: 0.75rem;
}
.section-no {
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 0.5rem;
  background: #eff6ff; /* blue-50 */
  color: #2563eb; /* blue-600 */
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
