<template>
  <div class="flex-1 overflow-y-auto p-8">
    <PageHero
      title="代码工作区"
      description="打开任意本地文件夹，让 AI 直接读写代码；改动前先展示 diff，由你确认"
      icon="fa-solid fa-code"
      :image="heroImage"
      image-class="page-hero__image--center"
    >
      <template #actions>
        <button @click="createWorkspace" class="btn-sm"><i class="fa-solid fa-folder-plus"></i>新建项目</button>
        <button @click="openFolder" class="btn-sm-pri"><i class="fa-solid fa-folder-open"></i>打开文件夹</button>
      </template>
    </PageHero>


    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="flex items-center gap-3 text-slate-400">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span class="text-sm">加载中...</span>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="workspaces.length === 0" class="flex flex-col items-center justify-center py-20">
      <div class="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
        <i class="fa-solid fa-code text-3xl text-blue-500"></i>
      </div>
      <h3 class="text-lg font-semibold text-slate-700 mb-2">还没有代码工作区</h3>
      <p class="text-sm text-slate-500 mb-6 text-center max-w-md">
        打开一个已有的代码仓库，或新建一个空项目。AI 会在这个文件夹里读文件、写代码、改 bug —— 每次写入前都会把 diff 交给你确认。
      </p>
      <div class="flex items-center gap-3">
        <button
          @click="openFolder"
          class="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-700/20"
        >
          <i class="fa-solid fa-folder-open text-xs"></i>
          <span>打开一个文件夹</span>
        </button>
        <button
          @click="createWorkspace"
          class="inline-flex items-center gap-2 px-6 py-3 glass-card hover:bg-transparent text-slate-700 border border-slate-200 rounded-xl text-sm font-medium transition-colors"
        >
          <i class="fa-solid fa-folder-plus text-xs"></i>
          <span>新建项目</span>
        </button>
      </div>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      <div
        v-for="ws in workspaces"
        :key="ws.id"
        class="group relative glass-card rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200/50 transition-all cursor-pointer"
        @click="openWorkspace(ws.id)"
      >
        <div class="absolute top-3 right-3 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            @click.stop="removeWorkspace(ws)"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-danger hover:bg-danger-soft transition-all"
            title="从列表移除（不删磁盘文件）"
          >
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
        <div class="p-5">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <i class="fa-solid fa-folder-tree text-blue-700"></i>
            </div>
          </div>
          <h3 class="text-base font-semibold text-slate-800 mb-1 truncate">{{ ws.name }}</h3>
          <p class="text-xs text-slate-400 mb-1 truncate" :title="ws.path">
            <i class="fa-regular fa-folder mr-1"></i>{{ ws.path }}
          </p>
          <p class="text-xs text-slate-400">最近打开：{{ formatDate(ws.lastOpenedAt || ws.createdAt) }}</p>
        </div>
      </div>
    </div>

    <!-- 新建项目：项目名输入弹窗（Electron 不支持浏览器 prompt()，用应用内弹窗代替） -->
    <div
      v-if="showNameDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40"
      @click.self="cancelNameDialog"
    >
      <div class="w-[420px] max-w-[90vw] glass-card rounded-2xl shadow-xl border border-slate-100 p-6">
        <h3 class="text-base font-semibold text-slate-800 mb-1">新建项目</h3>
        <p class="text-xs text-slate-500 mb-4">给项目起个名字，下一步选择父目录，会在里面建一个同名文件夹。</p>
        <input
          ref="nameInputEl"
          v-model="newName"
          type="text"
          placeholder="例如：my-app（留空则自动命名）"
          class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          @keydown.enter="confirmNameDialog"
          @keydown.esc="cancelNameDialog"
        />
        <div class="flex items-center justify-end gap-2 mt-5">
          <button
            @click="cancelNameDialog"
            class="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >取消</button>
          <button
            @click="confirmNameDialog"
            class="px-4 py-2 rounded-xl text-sm font-medium bg-blue-700 hover:bg-blue-800 text-white transition-colors shadow-sm shadow-blue-700/20"
          >选择父目录…</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import PageHero from '@/components/common/PageHero.vue';
import heroImage from '@/assets/hero-code.jpg';

const router = useRouter();
const workspaces = ref([]);
const loading = ref(true);
const showNameDialog = ref(false);
const newName = ref('');
const nameInputEl = ref(null);

const refresh = async () => {
  loading.value = true;
  try {
    if (!window.api?.code) { workspaces.value = []; return; }
    workspaces.value = (await window.api.code.listWorkspaces()) || [];
  } catch (e) {
    console.error('[CodeWorkspaceList] list failed:', e);
    workspaces.value = [];
  } finally {
    loading.value = false;
  }
};

const openFolder = async () => {
  try {
    const res = await window.api.code.openFolder();
    if (res && res.canceled) return;
    if (res && res.error) { alert(res.error); return; }
    if (res && res.workspace) router.push(`/code/${res.workspace.id}`);
  } catch (e) { alert('打开失败：' + e.message); }
};

const createWorkspace = () => {
  newName.value = '';
  showNameDialog.value = true;
  nextTick(() => nameInputEl.value?.focus());
};

const cancelNameDialog = () => {
  showNameDialog.value = false;
};

const confirmNameDialog = async () => {
  const name = newName.value.trim();
  showNameDialog.value = false;
  try {
    const res = await window.api.code.createWorkspace(name);
    if (res && res.canceled) return;
    if (res && res.error) { alert(res.error); return; }
    if (res && res.workspace) router.push(`/code/${res.workspace.id}`);
  } catch (e) { alert('新建失败：' + e.message); }
};

const openWorkspace = (id) => router.push(`/code/${id}`);

const removeWorkspace = async (ws) => {
  if (!confirm(`从列表移除「${ws.name}」？\n\n只是从代码工作区列表里移除，磁盘上的文件不会被删除。`)) return;
  try {
    await window.api.code.removeWorkspace(ws.id);
    await refresh();
  } catch (e) { alert('移除失败：' + e.message); }
};

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return iso; }
};

onMounted(refresh);
</script>
