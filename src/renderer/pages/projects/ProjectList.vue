<template>
  <div class="flex-1 overflow-y-auto p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">我的产品项目</h1>
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
      <h3 class="text-lg font-semibold text-slate-700 mb-2">还没有项目</h3>
      <p class="text-sm text-slate-500 mb-6">开始你的第一个产品设计，只需一句话描述你的想法</p>
      <RouterLink
        to="/projects/new"
        class="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-700/20"
      >
        <i class="fa-solid fa-rocket text-xs"></i>
        <span>开始你的第一个产品设计</span>
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
        <!-- Card content -->
        <div class="p-5">
          <div class="flex items-start justify-between mb-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <i class="fa-solid fa-cube text-blue-700"></i>
            </div>
            <!-- Delete button (visible on hover) -->
            <button
              @click.stop="confirmDeleteProject(project)"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
              title="删除项目"
            >
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
          <h3 class="text-base font-semibold text-slate-800 mb-1 truncate">{{ project.name }}</h3>
          <p class="text-xs text-slate-400 mb-4">{{ formatDate(project.createdAt) }}</p>
          <!-- Status badges -->
          <div class="flex items-center gap-2 flex-wrap">
            <span
              v-if="project.hasSpec"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-medium"
            >
              <i class="fa-solid fa-list-check text-[10px]"></i>
              有功能清单
            </span>
            <span
              v-if="project.hasPrototype"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-medium"
            >
              <i class="fa-solid fa-palette text-[10px]"></i>
              有原型
            </span>
            <span
              v-if="!project.hasSpec && !project.hasPrototype"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 text-[11px] font-medium"
            >
              <i class="fa-solid fa-clock text-[10px]"></i>
              刚创建
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const projects = ref([]);
const loading = ref(true);
const showDeleteConfirm = ref(false);
const deleteTarget = ref(null);

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
