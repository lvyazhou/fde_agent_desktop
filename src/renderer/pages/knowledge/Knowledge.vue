<template>
  <div class="flex h-full min-h-0 kb-bg">
    <!-- ── 左侧:五阶段分类树 ────────────────────────── -->
    <aside class="kb-tree shrink-0 flex flex-col bg-white/95 backdrop-blur border-r border-slate-200/70">
      <div class="px-4 pt-4 pb-3 border-b border-slate-100">
        <div class="flex items-center gap-2.5 mb-3">
          <span class="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm shadow-blue-500/30">
            <i class="fa-solid fa-book-open text-white text-[12px]"></i>
          </span>
          <span class="text-[13px] font-bold text-slate-800">FDE 作战手册</span>
        </div>
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[11px]"></i>
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索交付物 / 知识…"
            class="w-full text-[12.5px] bg-slate-50 border border-transparent focus:bg-white focus:border-blue-400 rounded-lg pl-8 pr-3 py-2 focus:outline-none transition"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <!-- 全部 -->
        <button
          class="tree-node"
          :class="active === 'all' ? 'tree-node--active' : ''"
          @click="active = 'all'"
        >
          <span class="tree-badge tree-badge--all"><i class="fa-solid fa-layer-group text-[10px]"></i></span>
          <span class="flex-1 text-left truncate">全部交付物</span>
          <span class="tree-count">{{ allItems.length }}</span>
        </button>

        <!-- 本项目产物(扫描各项目目录里 agent 生成的文档,可一键归档) -->
        <button
          class="tree-node"
          :class="active === 'projects' ? 'tree-node--active' : ''"
          @click="selectProjects"
        >
          <span class="tree-badge" style="background:#0ea5e9"><i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i></span>
          <span class="flex-1 text-left truncate">本项目产物</span>
          <span class="tree-count">{{ projectItemCount }}</span>
        </button>

        <!-- 五阶段 -->
        <button
          v-for="(st, i) in stages"
          :key="st.dir"
          class="tree-node"
          :class="active === st.dir ? 'tree-node--active' : ''"
          @click="active = st.dir"
        >
          <span class="tree-badge" :style="{ background: STAGE_COLORS[i] }">{{ CN_NUM[i] }}</span>
          <span class="flex-1 text-left truncate">{{ st.name }}</span>
          <span class="tree-count">{{ st.items.filter(it => it.category !== 'spec').length }}</span>
        </button>
      </div>

      <div class="px-4 py-3 border-t border-slate-100 text-[11px] text-slate-400">
        <i class="fa-solid fa-circle-info mr-1"></i>共 <b class="text-slate-600">{{ allItems.length }}</b> 份交付物 / 知识文档
      </div>
    </aside>

    <!-- ── 右侧:卡片区 ────────────────────────── -->
    <div class="flex-1 min-w-0 overflow-y-auto">
      <div class="max-w-[1400px] mx-auto px-6 py-6">
        <!-- 面包屑 + 标题 -->
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <div class="text-[12px] text-slate-400 flex items-center gap-1.5 mb-1">
              <i class="fa-solid fa-book-open"></i>知识库
              <i class="fa-solid fa-angle-right text-[10px]"></i>
              <span class="text-slate-600">{{ activeName }}</span>
            </div>
            <h1 class="text-xl font-bold text-slate-800">{{ activeName }}</h1>
            <p v-if="active !== 'projects'" class="text-[13px] text-slate-400 mt-0.5">
              按 FDE 五阶段作战链沉淀的真实交付物与知识模板 · 共 {{ filtered.length }} 份
            </p>
            <p v-else class="text-[13px] text-slate-400 mt-0.5">
              各项目里 AI 生成的交付物与文档 · 可一键归档到作战阶段知识库 · 共 {{ projectItemCount }} 份
            </p>
          </div>
          <button
            v-if="active !== 'projects'"
            @click="openUpload"
            class="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
          >
            <i class="fa-solid fa-cloud-arrow-up text-[12px]"></i>上传归档
          </button>
          <button
            v-else
            @click="loadProjects"
            :disabled="scanningProjects"
            class="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-600 transition"
          >
            <i class="fa-solid fa-rotate text-[12px]" :class="scanningProjects ? 'fa-spin' : ''"></i>重新扫描
          </button>
        </div>

        <!-- 统计条(仅阶段视图) -->
        <div v-if="active !== 'projects'" class="grid grid-cols-4 gap-4 mb-5">
          <div v-for="s in statCards" :key="s.label" class="stat-card">
            <div class="stat-icon" :style="{ background: s.bg, boxShadow: `0 6px 16px ${s.bg}55` }">
              <i :class="'fa-solid ' + s.icon"></i>
            </div>
            <div>
              <div class="text-[22px] font-bold text-slate-800 leading-none tracking-tight">{{ s.value }}</div>
              <div class="text-[11px] text-slate-400 mt-1.5">{{ s.label }}</div>
            </div>
          </div>
        </div>

        <!-- 筛选 chips(仅阶段视图) -->
        <div v-if="active !== 'projects'" class="flex items-center gap-2 mb-4">
          <button
            v-for="c in categories"
            :key="c.key"
            @click="catFilter = c.key"
            class="px-3 py-1.5 rounded-lg text-[12.5px] transition"
            :class="catFilter === c.key
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'"
          >{{ c.label }}</button>
        </div>

        <!-- ═══ 本项目产物视图 ═══ -->
        <template v-if="active === 'projects'">
          <div v-if="scanningProjects" class="text-center py-20 text-slate-300">
            <div class="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin mx-auto mb-3"></div>
            <p class="text-[13px]">正在扫描项目产物…</p>
          </div>
          <div v-else-if="!projects.length" class="text-center py-20 text-slate-300">
            <i class="fa-solid fa-folder-open text-5xl mb-3"></i>
            <p class="text-[13px]">各项目里还没有可归档的产物文档</p>
          </div>
          <div v-else class="space-y-6">
            <div v-for="pj in projects" :key="pj.slug">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
                  <i class="fa-solid fa-diagram-project text-white text-[10px]"></i>
                </span>
                <span class="text-[13.5px] font-semibold text-slate-700">{{ pj.name }}</span>
                <span class="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{{ pj.items.length }} 份</span>
              </div>
              <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                <div v-for="item in pj.items" :key="item.relPath" class="kb-card text-left">
                  <div class="kb-card__accent" :style="{ background: fmtColor(item.type) }"></div>
                  <div class="flex items-start gap-3">
                    <span class="fmt-badge" :style="{ background: fmtColor(item.type) }">{{ item.type.toUpperCase() }}</span>
                    <div class="flex-1 min-w-0">
                      <h3 class="text-[13.5px] font-semibold text-slate-800 leading-snug line-clamp-2">{{ item.title }}</h3>
                      <div class="flex items-center gap-1.5 mt-1.5">
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono truncate">{{ item.dir }}/{{ item.file }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end">
                    <button
                      @click="openArchive(pj, item)"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-blue-600 hover:bg-blue-50 transition"
                    >
                      <i class="fa-solid fa-inbox text-[11px]"></i>归档到知识库
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ═══ 阶段/全部视图卡片网格 ═══ -->
        <template v-else>
        <div v-if="filtered.length" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <div
            v-for="item in filtered"
            :key="item.stageDir + '/' + item.file"
            class="kb-card text-left group"
          >
            <div class="kb-card__accent" :style="{ background: fmtColor(item.type) }"></div>
            <button class="block w-full text-left" @click="openDoc(item)">
              <div class="flex items-start gap-3">
                <span class="fmt-badge" :style="{ background: fmtColor(item.type) }">{{ item.type.toUpperCase() }}</span>
                <div class="flex-1 min-w-0">
                  <h3 class="text-[13.5px] font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">{{ item.title }}</h3>
                  <div class="flex items-center gap-1.5 mt-1.5">
                    <span class="cat-chip" :class="catChipCls(item.category)">{{ catLabel(item.category) }}</span>
                    <span class="text-[11px] text-slate-400">阶段{{ CN_NUM[item.stageIndex] }}</span>
                    <span v-if="item.uploaded" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">已归档</span>
                  </div>
                </div>
              </div>
            </button>
            <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span class="truncate">{{ stageShort(item.stageIndex) }}</span>
              <div class="flex items-center gap-2 shrink-0">
                <button @click.stop="openDoc(item)" class="text-blue-500 font-medium hover:text-blue-700"><i class="fa-solid fa-eye mr-1"></i>预览</button>
                <button @click.stop="deleteDoc(item)" class="text-rose-400 font-medium hover:text-rose-600"><i class="fa-solid fa-trash mr-1"></i>删除</button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-20 text-slate-300">
          <i class="fa-solid fa-box-open text-5xl mb-3"></i>
          <p class="text-[13px]">该分类下暂无文档</p>
        </div>
        </template>
      </div>
    </div>

    <!-- ── 文档预览抽屉(复用 DocViewer) ────────── -->
    <transition name="drawer">
      <div v-if="selected" class="fixed inset-0 z-50" @keydown.esc="selected = null">
        <div class="absolute inset-0 bg-slate-900/40" @click="selected = null"></div>
        <aside class="absolute right-0 top-0 bottom-0 w-[640px] max-w-[92vw] bg-white shadow-2xl flex flex-col">
          <DocViewer :stage="selected.stageDir" :item="selected" />
        </aside>
      </div>
    </transition>

    <!-- ── 上传归档弹框 ────────────────────────── -->
    <transition name="fade">
      <div v-if="showUpload" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-slate-900/40" @click="showUpload = false"></div>
        <div class="relative w-[440px] max-w-[92vw] bg-white rounded-2xl shadow-2xl p-6">
          <div class="flex items-center gap-2 mb-4">
            <i class="fa-solid fa-cloud-arrow-up text-blue-600"></i>
            <span class="text-[15px] font-bold text-slate-800">上传文档归档</span>
            <button @click="showUpload = false" class="ml-auto w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <p class="text-[12px] text-slate-400 mb-4 leading-relaxed">
            选择本地文档,归档到指定作战阶段的知识库目录。支持 md / docx / pdf / pptx / xlsx / html。
          </p>
          <label class="block text-[12.5px] font-medium text-slate-600 mb-1.5">归档到阶段</label>
          <select v-model="uploadStage" class="w-full mb-4 border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-blue-400">
            <option v-for="(st, i) in stages" :key="st.dir" :value="st.dir">阶段{{ CN_NUM[i] }} · {{ st.name }}</option>
          </select>
          <label class="block text-[12.5px] font-medium text-slate-600 mb-1.5">文档类型</label>
          <div class="flex gap-2 mb-6">
            <button
              v-for="c in [{k:'deliverable',l:'交付物'},{k:'knowledge',l:'知识'}]" :key="c.k"
              @click="uploadCat = c.k"
              class="flex-1 py-2 rounded-lg text-[13px] border transition"
              :class="uploadCat === c.k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'"
            >{{ c.l }}</button>
          </div>
          <button
            @click="doUpload"
            :disabled="uploading || !uploadStage"
            class="w-full py-2.5 rounded-lg text-[13px] font-medium bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i :class="uploading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-folder-open'" class="mr-1.5 text-[12px]"></i>
            {{ uploading ? '归档中…' : '选择文件并归档' }}
          </button>
        </div>
      </div>
    </transition>

    <!-- ── 项目产物归档弹框 ────────────────────────── -->
    <transition name="fade">
      <div v-if="showArchive" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-slate-900/40" @click="showArchive = false"></div>
        <div class="relative w-[440px] max-w-[92vw] bg-white rounded-2xl shadow-2xl p-6">
          <div class="flex items-center gap-2 mb-4">
            <i class="fa-solid fa-inbox text-blue-600"></i>
            <span class="text-[15px] font-bold text-slate-800">归档到知识库</span>
            <button @click="showArchive = false" class="ml-auto w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <p class="text-[12px] text-slate-400 mb-4 leading-relaxed">
            将 <b class="text-slate-600">{{ archiveTarget?.item?.file }}</b>
            (来自项目「{{ archiveTarget?.pj?.name }}」)复制归档到指定作战阶段的知识库。
          </p>
          <label class="block text-[12.5px] font-medium text-slate-600 mb-1.5">归档到阶段</label>
          <select v-model="archiveStage" class="w-full mb-4 border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-blue-400">
            <option v-for="(st, i) in stages" :key="st.dir" :value="st.dir">阶段{{ CN_NUM[i] }} · {{ st.name }}</option>
          </select>
          <label class="block text-[12.5px] font-medium text-slate-600 mb-1.5">文档类型</label>
          <div class="flex gap-2 mb-6">
            <button
              v-for="c in [{k:'deliverable',l:'交付物'},{k:'knowledge',l:'知识'}]" :key="c.k"
              @click="archiveCat = c.k"
              class="flex-1 py-2 rounded-lg text-[13px] border transition"
              :class="archiveCat === c.k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'"
            >{{ c.l }}</button>
          </div>
          <button
            @click="doArchive"
            :disabled="archiving || !archiveStage"
            class="w-full py-2.5 rounded-lg text-[13px] font-medium bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i :class="archiving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-inbox'" class="mr-1.5 text-[12px]"></i>
            {{ archiving ? '归档中…' : '确认归档' }}
          </button>
        </div>
      </div>
    </transition>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="fixed top-4 right-4 z-[60] bg-slate-800 text-white text-[13px] px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
        <i class="fa-solid fa-circle-check text-blue-400"></i>{{ toast }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import DocViewer from '@/components/workbench/DocViewer.vue';

const CN_NUM = ['一', '二', '三', '四', '五'];
const STAGE_COLORS = ['#2563eb', '#1d4ed8', '#3b82f6', '#0ea5e9', '#1e40af'];

const stages = ref([]);       // manifest.stages,并给每个 item 注入 stageDir/stageIndex
const active = ref('all');    // 'all' | stage.dir
const keyword = ref('');
const catFilter = ref('all'); // all | deliverable | knowledge | spec
const selected = ref(null);   // 当前预览的 item(含 stageDir)

const showUpload = ref(false);
const uploadStage = ref('');
const uploadCat = ref('deliverable');
const uploading = ref(false);
const toast = ref('');

// 本项目产物视图
const projects = ref([]);            // [{slug, name, items:[{file, relPath, title, type, dir, mtime}]}]
const scanningProjects = ref(false);
const projectsLoaded = ref(false);
// 归档弹框
const showArchive = ref(false);
const archiveTarget = ref(null);     // {pj, item}
const archiveStage = ref('');
const archiveCat = ref('deliverable');
const archiving = ref(false);

const categories = [
  { key: 'all', label: '全部' },
  { key: 'deliverable', label: '交付物' },
  { key: 'knowledge', label: '知识' },
  { key: 'spec', label: '规范' },
];

async function loadManifest() {
  try {
    const res = await window.api.handbook.getManifest();
    if (res && res.success && res.data?.stages) {
      stages.value = res.data.stages.map((st, i) => ({
        ...st,
        items: (st.items || []).map((it) => ({ ...it, stageDir: st.dir, stageIndex: i })),
      }));
    }
  } catch (e) {
    console.error('[knowledge] load manifest failed', e);
  }
}

onMounted(loadManifest);

function showToast(msg) {
  toast.value = msg;
  setTimeout(() => { toast.value = ''; }, 2600);
}

function openUpload() {
  uploadStage.value = active.value !== 'all' ? active.value : (stages.value[0]?.dir || '');
  uploadCat.value = 'deliverable';
  showUpload.value = true;
}

async function doUpload() {
  if (!uploadStage.value || uploading.value) return;
  uploading.value = true;
  try {
    const res = await window.api.handbook.upload(uploadStage.value, uploadCat.value);
    if (res && res.success) {
      await loadManifest();
      active.value = res.stage;
      showUpload.value = false;
      showToast(`已归档 ${res.files.length} 份文档到阶段目录`);
    } else if (res && !res.canceled) {
      showToast('上传失败:' + (res.error || '未知错误'));
    }
  } catch (e) {
    showToast('上传失败:' + (e.message || e));
  } finally {
    uploading.value = false;
  }
}

// ── 本项目产物:扫描 / 归档 / 删除 ──
const projectItemCount = computed(() => projects.value.reduce((n, p) => n + p.items.length, 0));

async function loadProjects() {
  if (scanningProjects.value) return;
  scanningProjects.value = true;
  try {
    const res = await window.api.handbook.scanProjects();
    projects.value = (res && res.success && res.projects) ? res.projects : [];
    projectsLoaded.value = true;
  } catch (e) {
    console.error('[knowledge] scan projects failed', e);
    projects.value = [];
  } finally {
    scanningProjects.value = false;
  }
}

function selectProjects() {
  active.value = 'projects';
  if (!projectsLoaded.value) loadProjects();
}

function openArchive(pj, item) {
  archiveTarget.value = { pj, item };
  archiveStage.value = stages.value[0]?.dir || '';
  archiveCat.value = 'deliverable';
  showArchive.value = true;
}

async function doArchive() {
  if (!archiveTarget.value || !archiveStage.value || archiving.value) return;
  archiving.value = true;
  try {
    const { pj, item } = archiveTarget.value;
    const res = await window.api.handbook.archiveFromProject({
      slug: pj.slug,
      relPath: item.relPath,
      stage: archiveStage.value,
      category: archiveCat.value,
    });
    if (res && res.success) {
      await loadManifest();
      showArchive.value = false;
      showToast(`已归档「${item.title}」到阶段${CN_NUM[Number(res.stage) - 1] || ''}`);
    } else {
      showToast('归档失败:' + (res?.error || '未知错误'));
    }
  } catch (e) {
    showToast('归档失败:' + (e.message || e));
  } finally {
    archiving.value = false;
  }
}

async function deleteDoc(item) {
  const builtin = !item.uploaded;
  const tip = builtin
    ? `「${item.title}」是内置知识文档,删除后下次启动会自动恢复。确认删除?`
    : `确认删除「${item.title}」?此操作会移除该文档,不可撤销。`;
  if (!window.confirm(tip)) return;
  try {
    const res = await window.api.handbook.delete(item.stageDir, item.file);
    if (res && res.success) {
      if (selected.value && selected.value.file === item.file && selected.value.stageDir === item.stageDir) {
        selected.value = null;
      }
      await loadManifest();
      showToast(`已删除「${item.title}」`);
    } else {
      showToast('删除失败:' + (res?.error || '未知错误'));
    }
  } catch (e) {
    showToast('删除失败:' + (e.message || e));
  }
}

const allItems = computed(() => stages.value.flatMap((st) => st.items));

const activeName = computed(() => {
  if (active.value === 'all') return '全部交付物';
  const st = stages.value.find((s) => s.dir === active.value);
  return st ? st.name : '全部交付物';
});

const filtered = computed(() => {
  let list = active.value === 'all'
    ? allItems.value
    : (stages.value.find((s) => s.dir === active.value)?.items || []);
  if (catFilter.value !== 'all') list = list.filter((it) => it.category === catFilter.value);
  if (keyword.value.trim()) {
    const kw = keyword.value.trim();
    list = list.filter((it) => it.title.includes(kw));
  }
  return list;
});

const statCards = computed(() => [
  { label: '文档总数', value: allItems.value.length, icon: 'fa-file-lines', bg: '#2563eb' },
  { label: '交付物', value: allItems.value.filter((i) => i.category === 'deliverable').length, icon: 'fa-box-open', bg: '#3b82f6' },
  { label: '知识模板', value: allItems.value.filter((i) => i.category === 'knowledge').length, icon: 'fa-lightbulb', bg: '#0ea5e9' },
  { label: '作战阶段', value: stages.value.length, icon: 'fa-layer-group', bg: '#1d4ed8' },
]);

function stageShort(i) {
  const st = stages.value[i];
  return st ? `阶段${CN_NUM[i]} · ${st.short || st.name}` : '';
}
function catLabel(c) {
  return { knowledge: '知识', deliverable: '交付物', spec: '规范' }[c] || '文档';
}
function catChipCls(c) {
  return {
    knowledge: 'cat-chip--kn',
    deliverable: 'cat-chip--dl',
    spec: 'cat-chip--sp',
  }[c] || 'cat-chip--sp';
}
function fmtColor(t) {
  return { md: '#0ea5e9', docx: '#2563eb', doc: '#2563eb', html: '#3b82f6', pdf: '#1e40af', pptx: '#1d4ed8' }[t] || '#64748b';
}
function openDoc(item) {
  selected.value = item;
}
</script>

<style scoped>
.kb-bg {
  background:
    radial-gradient(900px 500px at 100% 0%, rgba(37, 99, 235, 0.06), transparent 60%),
    radial-gradient(700px 400px at 0% 100%, rgba(14, 165, 233, 0.05), transparent 55%),
    #f4f7fb;
}
.kb-tree { width: 272px; }

.tree-node {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 9px;
  font-size: 12.5px;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, transform 0.15s;
}
.tree-node:hover { background: #f0f5ff; color: #2563eb; }
.tree-node:hover .tree-badge { transform: scale(1.06); }
.tree-node--active {
  background: linear-gradient(90deg, #e8f1ff, #f3f8ff);
  color: #1d4ed8;
  font-weight: 600;
  box-shadow: inset 3px 0 0 #2563eb;
}

.tree-badge {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 2px 5px rgba(15, 23, 42, 0.14);
  transition: transform 0.15s;
}
.tree-badge--all { background: #64748b; }

.tree-count {
  font-size: 10.5px;
  color: #94a3b8;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 1px 7px;
  flex-shrink: 0;
}
.tree-node--active .tree-count { color: #2563eb; background: #dbeafe; }

/* 统计卡片 */
.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 16px;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff, #fbfdff);
  border: 1px solid #e8ecf3;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
}
.stat-card:hover {
  box-shadow: 0 10px 26px rgba(37, 99, 235, 0.10);
  transform: translateY(-2px);
  border-color: #d4e2fb;
}
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  flex-shrink: 0;
}

.kb-card {
  position: relative;
  display: block;
  width: 100%;
  background: #fff;
  border: 1px solid #e8ecf0;
  border-radius: 14px;
  padding: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease;
}
.kb-card__accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity 0.22s ease;
}
.kb-card:hover {
  box-shadow: 0 12px 30px rgba(30, 58, 138, 0.13);
  transform: translateY(-3px);
  border-color: #c7d7f5;
}
.kb-card:hover .kb-card__accent { opacity: 1; }

.fmt-badge {
  width: 40px;
  height: 48px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 3px 8px rgba(37, 99, 235, 0.22);
}

.cat-chip {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  font-weight: 500;
}
.cat-chip--kn { background: #e0f2fe; color: #0369a1; }
.cat-chip--dl { background: #eff6ff; color: #2563eb; }
.cat-chip--sp { background: #f1f5f9; color: #64748b; }

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.drawer-enter-active, .drawer-leave-active { transition: opacity 0.2s; }
.drawer-enter-active aside, .drawer-leave-active aside { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from aside, .drawer-leave-to aside { transform: translateX(100%); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
