<template>
  <div class="flex-1 overflow-y-auto p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">我的FDE产品项目</h1>
        <p class="text-sm text-slate-500 mt-1">管理你的产品设计项目，从需求到原型一站式完成</p>
      </div>
      <RouterLink
        to="/projects/new"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-700/20"
      >
        <i class="fa-solid fa-plus text-xs"></i>
        <span>新建项目</span>
      </RouterLink>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="flex items-center gap-3 text-slate-400">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span class="text-sm">加载中...</span>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="projects.length === 0" class="flex flex-col items-center justify-center py-20">
      <div class="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
        <i class="fa-solid fa-lightbulb text-3xl text-blue-500"></i>
      </div>
      <h3 class="text-lg font-semibold text-slate-700 mb-2">还没有 FDE 项目</h3>
      <p class="text-sm text-slate-500 mb-6">创建第一个 FDE 项目,按五阶段作战链推进:调研备弹 → 需求原型 → 智能体设计 → 工作台上线 → 试用定稿</p>
      <RouterLink
        to="/projects/new"
        class="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-700/20"
      >
        <i class="fa-solid fa-rocket text-xs"></i>
        <span>创建第一个 FDE 项目</span>
      </RouterLink>
    </div>

    <!-- Project grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      <div
        v-for="project in projects"
        :key="project.slug"
        class="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200/50 transition-all cursor-pointer"
        @click="openProject(project.slug)"
      >
        <!-- Action buttons (visible on hover) -->
        <div class="absolute top-3 right-3 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            @click.stop="openRename(project)"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
            title="重命名项目"
          >
            <i class="fa-solid fa-pen text-xs"></i>
          </button>
          <button
            @click.stop="confirmDeleteProject(project)"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
            title="删除项目"
          >
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
        <!-- Card content -->
        <div class="p-5">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <i class="fa-solid fa-cube text-blue-700"></i>
            </div>
            <!-- FDE stage badge -->
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-medium shadow-sm">
              <i class="fa-solid fa-flag-checkered text-[10px]"></i>
              第 {{ toCn(stageOf(project)) }} 阶段 · {{ stageShort(project) }}
            </span>
          </div>
          <h3 class="text-base font-semibold text-slate-800 mb-1 truncate">{{ project.name }}</h3>
          <p class="text-xs text-slate-400 mb-3">{{ formatDate(project.createdAt) }}</p>
          <!-- FDE five-stage progress dots -->
          <div class="flex items-center gap-1.5 mb-2" :title="`FDE 五阶段作战链 · 当前第 ${toCn(stageOf(project))} 阶段`">
            <span
              v-for="n in 5"
              :key="n"
              class="h-1.5 flex-1 rounded-full transition-colors"
              :class="{
                'bg-blue-400': dotState(project, n) === 'done',
                'bg-blue-600': dotState(project, n) === 'active',
                'bg-slate-200': dotState(project, n) === 'todo',
              }"
            ></span>
          </div>
          <!-- 当前阶段一句话说明(在做什么) -->
          <p class="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed" :title="stageGoal(project)">
            <i class="fa-solid fa-location-arrow text-[9px] text-blue-500 mr-1"></i>{{ stageDesc(project) }}
          </p>
          <!-- 交付物徽章:展示项目已产出的全部交付物(按阶段扫描) + 原型 -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <template v-if="deliverableChips(project).length">
              <span
                v-for="chip in visibleChips(project)"
                :key="chip.key"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-medium"
                :title="`${chip.name}（阶段${toCn(chip.stage)}）`"
              >
                <i :class="chip.icon" class="text-[10px]"></i>
                {{ chip.short }}
              </span>
              <span
                v-if="hiddenChipCount(project) > 0"
                class="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-medium"
                :title="hiddenChipNames(project)"
              >
                +{{ hiddenChipCount(project) }}
              </span>
            </template>
            <span
              v-else
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 text-[11px] font-medium"
            >
              <i class="fa-solid fa-clock text-[10px]"></i>
              暂无交付物
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirmation dialog -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="showDeleteConfirm = false">
      <div class="bg-white rounded-2xl shadow-xl p-6 w-[360px]">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
            <i class="fa-solid fa-triangle-exclamation text-rose-500"></i>
          </div>
          <div>
            <h4 class="font-semibold text-slate-800">确认删除</h4>
            <p class="text-sm text-slate-500">此操作不可恢复</p>
          </div>
        </div>
        <p class="text-sm text-slate-600 mb-6">
          确定要删除项目 <strong>{{ deleteTarget?.name }}</strong> 吗？所有相关文件将被永久删除。
        </p>
        <div class="flex items-center justify-end gap-3">
          <button
            @click="showDeleteConfirm = false"
            class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            @click="doDelete"
            class="px-4 py-2 text-sm bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>

    <!-- Rename dialog -->
    <div v-if="showRename" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="showRename = false">
      <div class="bg-white rounded-2xl shadow-xl p-6 w-[400px]">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <i class="fa-solid fa-pen text-blue-600"></i>
          </div>
          <div>
            <h4 class="font-semibold text-slate-800">重命名项目</h4>
            <p class="text-sm text-slate-500">仅修改显示名称，不影响项目文件</p>
          </div>
        </div>
        <input
          ref="renameInput"
          v-model="renameValue"
          type="text"
          placeholder="请输入项目名称"
          maxlength="60"
          class="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition mb-6"
          @keyup.enter="doRename"
          @keyup.esc="showRename = false"
        />
        <div class="flex items-center justify-end gap-3">
          <button
            @click="showRename = false"
            class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            @click="doRename"
            :disabled="!renameValue.trim() || renameSaving"
            class="px-4 py-2 text-sm bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {{ renameSaving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { getStage, getDeliverableMeta, DEFAULT_STAGE } from '@/data/fde-stages';

const router = useRouter();
const projects = ref([]);
const loading = ref(true);
const showDeleteConfirm = ref(false);
const deleteTarget = ref(null);
const showRename = ref(false);
const renameTarget = ref(null);
const renameValue = ref('');
const renameSaving = ref(false);
const renameInput = ref(null);

const loadProjects = async () => {
  loading.value = true;
  try {
    const list = await window.api.hermes.listProjects();
    projects.value = list || [];
  } catch (e) {
    console.error('Failed to load projects:', e);
    projects.value = [];
  } finally {
    loading.value = false;
  }
};

const openProject = (slug) => {
  router.push(`/projects/${slug}`);
};

const confirmDeleteProject = (project) => {
  deleteTarget.value = project;
  showDeleteConfirm.value = true;
};

const openRename = async (project) => {
  renameTarget.value = project;
  renameValue.value = project.name || '';
  showRename.value = true;
  await nextTick();
  renameInput.value?.focus();
  renameInput.value?.select();
};

const doRename = async () => {
  if (!renameTarget.value || renameSaving.value) return;
  const name = renameValue.value.trim();
  if (!name || name === renameTarget.value.name) {
    showRename.value = false;
    return;
  }
  renameSaving.value = true;
  try {
    const res = await window.api.hermes.updateProjectMeta(renameTarget.value.slug, { name });
    if (res?.success) {
      const p = projects.value.find((x) => x.slug === renameTarget.value.slug);
      if (p) p.name = name;
      showRename.value = false;
    } else {
      console.error('Failed to rename project:', res?.error);
    }
  } catch (e) {
    console.error('Failed to rename project:', e);
  } finally {
    renameSaving.value = false;
  }
};

const doDelete = async () => {
  if (!deleteTarget.value) return;
  try {
    await window.api.hermes.deleteProject(deleteTarget.value.slug);
    projects.value = projects.value.filter(p => p.slug !== deleteTarget.value.slug);
  } catch (e) {
    console.error('Failed to delete project:', e);
  } finally {
    showDeleteConfirm.value = false;
    deleteTarget.value = null;
  }
};

const CN_NUM = ['', '一', '二', '三', '四', '五'];

// 当前 FDE 阶段(1~5),缺省回落到默认阶段并夹在合法区间内。
// stage 是权威字段(=正在做的阶段/active);stageStatus 仅用于渲染"已完成"点。
const stageOf = (project) => {
  const s = Number(project?.stage);
  if (!Number.isFinite(s)) return DEFAULT_STAGE;
  return Math.min(5, Math.max(1, Math.round(s)));
};

// 某一段(1~5)相对当前项目的状态:done / active / todo
// 优先信任 stage(当前阶段)——它之前的都算 done、它本身 active;
// 之后的段落再看 stageStatus 是否被显式标 done(容忍历史脏数据不越权前推 active)。
const dotState = (project, n) => {
  const cur = stageOf(project);
  if (n === cur) return 'active';
  if (n < cur) return 'done';
  return project?.stageStatus?.[n] === 'done' ? 'done' : 'todo';
};

// 阶段简称(如"沟通·原型"),取自 fde-stages 单一数据源
const stageShort = (project) => getStage(stageOf(project))?.short || '';

// 每阶段一句话说明(卡片里精炼版,点明"在做什么")
const STAGE_DESC = {
  1: '进场前备弹:行业政策/术语/痛点/话术练到条件反射',
  2: '结构化挖需求、当场确认,喂智能体出可交互原型',
  3: '需求签字定死,拆智能体矩阵逐个设计过 Eval',
  4: '建模+搭前后端+部署,做成能访问的行业工作台',
  5: '代理商试跑、三轮定稿、客户交付签字',
};
const stageDesc = (project) => STAGE_DESC[stageOf(project)] || '';

// 完整阶段目标(悬停 tooltip),取自 fde-stages 的 goal
const stageGoal = (project) => getStage(stageOf(project))?.goal || stageDesc(project);

// 阿拉伯数字转中文(1~5)
const toCn = (n) => CN_NUM[n] || String(n);

// 卡片最多平铺展示的交付物徽章数,超出折叠为 "+N"
const MAX_CHIPS = 4;

// 项目的全部交付物徽章:后端扫描 stageN/ 得到的文件 + 原型(prototype 目录)。
// 每个 chip 带 short(简称)/name(全名)/icon/stage,按阶段升序排列。
const deliverableChips = (project) => {
  const chips = [];
  const list = Array.isArray(project?.deliverables) ? project.deliverables : [];
  for (const d of list) {
    const meta = getDeliverableMeta(d.base);
    chips.push({ key: `${d.stage}:${d.base}`, stage: d.stage, short: meta.short, name: meta.name, icon: meta.icon });
  }
  // 原型不落在 stageN/ 目录,单独作为一枚 chip(归到阶段②——原型产出阶段)
  if (project?.hasPrototype) {
    chips.push({ key: 'prototype', stage: 2, short: '可交互原型', name: '可交互原型', icon: 'fa-solid fa-palette' });
  }
  chips.sort((a, b) => a.stage - b.stage);
  return chips;
};

const visibleChips = (project) => deliverableChips(project).slice(0, MAX_CHIPS);
const hiddenChipCount = (project) => Math.max(0, deliverableChips(project).length - MAX_CHIPS);
const hiddenChipNames = (project) =>
  deliverableChips(project).slice(MAX_CHIPS).map((c) => c.name).join('、');

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

onMounted(() => {
  loadProjects();
});
</script>
