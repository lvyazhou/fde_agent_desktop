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
          <div class="space-y-3">
            <div
              v-for="(group, gi) in stageGroups"
              :key="gi"
              class="grid grid-cols-1 sm:grid-cols-2 gap-3"
              :class="group.cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'"
            >
              <div
                v-for="s in group.items"
                :key="s.id"
                class="bg-white rounded-2xl border border-slate-200/70 p-4 flex flex-col transition-all"
                :class="s.template ? 'cursor-pointer hover:border-blue-300 hover:shadow-md group/card' : ''"
                @click="s.template && openTemplate(s)"
              >
              <!-- 顶部常驻提示:点击查看模板(仅有 template 的卡片) -->
              <div
                v-if="s.template"
                class="mb-2.5 -mt-0.5 inline-flex self-start items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-medium group-hover/card:bg-blue-600 group-hover/card:text-white transition-colors"
              >
                <i class="fa-solid fa-hand-pointer text-[10px]"></i>
                点击查看模板
                <i class="fa-solid fa-arrow-right-long text-[9px]"></i>
              </div>
              <div class="flex items-center gap-2.5 mb-2">
                <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
                  <i :class="s.icon" class="text-[13px]"></i>
                </span>
                <div class="min-w-0 flex-1">
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

    <!-- 模板预览抽屉(右侧滑出) -->
    <DrawerPanel
      :visible="!!activeTemplate"
      :title="activeTemplate?.title || ''"
      :subtitle="activeTemplate?.subtitle || ''"
      width="640px"
      @close="activeTemplate = null"
    >
      <template #header-icon>
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
          <i :class="activeTemplate?.icon || 'fa-solid fa-file-lines'"></i>
        </div>
      </template>
      <template #header-actions>
        <button
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          @click="copyTemplate"
        >
          <i :class="copied ? 'fa-solid fa-check text-emerald-500' : 'fa-regular fa-copy'" class="text-[12px]"></i>
          {{ copied ? '已复制' : '复制模板' }}
        </button>
      </template>

      <div class="p-6">
        <!-- 文档纸张卡片 -->
        <div class="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.05)] overflow-hidden ring-1 ring-slate-200/60">
          <!-- 顶部彩条 + 文件名标签 -->
          <div class="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500"></div>
          <div class="flex items-center gap-2 px-6 pt-4 pb-2">
            <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-500 text-[11px] font-mono">
              <i class="fa-regular fa-file-lines text-[10px]"></i>
              {{ activeTemplate?.filename || 'template.md' }}
            </span>
            <span class="text-[11px] text-slate-400">· 参考模板,可按需增减字段</span>
          </div>
          <!-- markdown 正文 -->
          <div class="px-6 pb-7 pt-1 tpl-body" v-html="activeTemplateHtml"></div>
        </div>
      </div>
    </DrawerPanel>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { marked } from 'marked';
import DrawerPanel from '@/components/common/DrawerPanel.vue';
import { FIVE_STAGE_MGMT, REQUIREMENT_MGMT, REPLICATION_MODES, GEELIB_LINKS } from '@/data/fde-project-spec';

const fiveStage = FIVE_STAGE_MGMT;
// 上面一行 3 个(内容多的环节 1/2/3),下面一行 4 个(环节 4/5/6/7),视觉更整齐
const stageGroups = [
  { cols: 3, items: fiveStage.slice(0, 3) },
  { cols: 4, items: fiveStage.slice(3) },
];
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

/** 模板预览抽屉:点击带 template 的卡片打开,把该环节图标一并带进抽屉头部 */
const activeTemplate = ref(null);
const copied = ref(false);
const openTemplate = (stage) => {
  if (!stage?.template) return;
  copied.value = false;
  activeTemplate.value = { ...stage.template, icon: stage.icon };
};
const activeTemplateHtml = computed(() =>
  activeTemplate.value?.content ? marked.parse(activeTemplate.value.content) : ''
);
const copyTemplate = async () => {
  if (!activeTemplate.value?.content) return;
  try {
    await navigator.clipboard.writeText(activeTemplate.value.content);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1800);
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

/* ============================================================
   模板预览抽屉 · markdown 文档排版
   目标:统一字体(承接全局 Inter/PingFang)、清晰层级、克制配色
   ============================================================ */
.tpl-body {
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 13.5px;
  line-height: 1.75;
  color: #334155; /* slate-700 */
  -webkit-font-smoothing: antialiased;
}
.tpl-body :deep(> :first-child) { margin-top: 0; }
.tpl-body :deep(> :last-child) { margin-bottom: 0; }

/* —— 标题层级 —— */
.tpl-body :deep(h1) {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #0f172a; /* slate-900 */
  margin: 0 0 0.9rem;
  padding-bottom: 0.6rem;
  border-bottom: 2px solid #eef2f8;
}
.tpl-body :deep(h2) {
  font-size: 1.02rem;
  font-weight: 700;
  color: #1e3a8a; /* blue-900 */
  margin: 1.6rem 0 0.7rem;
  padding-left: 0.65rem;
  border-left: 3px solid #3b82f6; /* blue-500 */
  line-height: 1.4;
}
.tpl-body :deep(h3) {
  font-size: 0.92rem;
  font-weight: 600;
  color: #1e40af;
  margin: 1.2rem 0 0.5rem;
}

/* —— 段落 / 列表 —— */
.tpl-body :deep(p) { margin: 0.6rem 0; }
.tpl-body :deep(ul),
.tpl-body :deep(ol) { margin: 0.6rem 0; padding-left: 1.4rem; }
.tpl-body :deep(li) { margin: 0.35rem 0; }
.tpl-body :deep(li::marker) { color: #3b82f6; }
.tpl-body :deep(ul ul),
.tpl-body :deep(ol ol) { margin: 0.2rem 0; }
.tpl-body :deep(strong) { font-weight: 600; color: #0f172a; }

/* —— 引用块(说明/提示) —— */
.tpl-body :deep(blockquote) {
  margin: 0.9rem 0;
  padding: 0.7rem 1rem;
  background: linear-gradient(90deg, #eff6ff, #f8fafc);
  border-left: 3px solid #60a5fa;
  border-radius: 0 0.6rem 0.6rem 0;
  color: #475569;
  font-style: normal;
}
.tpl-body :deep(blockquote p) { margin: 0.2rem 0; font-size: 12.5px; }

/* —— 分隔线 —— */
.tpl-body :deep(hr) {
  border: none;
  height: 1px;
  margin: 1.4rem 0;
  background: linear-gradient(90deg, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent);
}

/* —— 表格 —— */
.tpl-body :deep(table) {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 0.9rem 0;
  font-size: 12.5px;
  border: 1px solid #e6ebf3;
  border-radius: 0.7rem;
  overflow: hidden;
}
.tpl-body :deep(thead th) {
  background: #f1f5fb;
  color: #1e3a8a;
  font-weight: 600;
  text-align: left;
}
.tpl-body :deep(th),
.tpl-body :deep(td) {
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid #eef2f8;
}
.tpl-body :deep(th:not(:last-child)),
.tpl-body :deep(td:not(:last-child)) { border-right: 1px solid #eef2f8; }
.tpl-body :deep(tbody tr:last-child td) { border-bottom: none; }
.tpl-body :deep(tbody tr:nth-child(even)) { background: #fafbfd; }

/* —— 行内 code / 代码块 —— */
.tpl-body :deep(:not(pre) > code) {
  font-family: 'SF Mono', 'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace;
  background: #eef2f8;
  color: #1e40af;
  padding: 0.12em 0.4em;
  border-radius: 0.35rem;
  font-size: 0.86em;
}
.tpl-body :deep(pre) {
  margin: 0.9rem 0;
  padding: 1rem 1.1rem;
  background: #0f172a; /* slate-900 */
  border-radius: 0.75rem;
  overflow-x: auto;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
}
.tpl-body :deep(pre code) {
  font-family: 'SF Mono', 'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace;
  background: transparent;
  color: #e2e8f0;
  padding: 0;
  font-size: 12px;
  line-height: 1.7;
}
</style>
