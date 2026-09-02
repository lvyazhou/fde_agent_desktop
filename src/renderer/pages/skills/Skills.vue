<template>
  <div class="flex h-full min-h-0 sk-bg">
    <!-- ── 左侧:技能分组树 ────────────────────────── -->
    <aside class="sk-tree shrink-0 flex flex-col bg-white/95 backdrop-blur border-r border-slate-200/70">
      <div class="px-4 pt-4 pb-3 border-b border-slate-100">
        <div class="flex items-center gap-2.5 mb-3">
          <span class="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm shadow-blue-500/30">
            <i class="fa-solid fa-brain text-white text-[12px]"></i>
          </span>
          <span class="text-[13px] font-bold text-slate-800">技能体系</span>
        </div>
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[11px]"></i>
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索技能…"
            class="w-full text-[12.5px] bg-slate-50 border border-transparent focus:bg-white focus:border-blue-400 rounded-lg pl-8 pr-3 py-2 focus:outline-none transition"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <button
          class="tree-node"
          :class="active === 'all' ? 'tree-node--active' : ''"
          @click="active = 'all'"
        >
          <span class="tree-badge" style="background:#64748b"><i class="fa-solid fa-layer-group text-[10px]"></i></span>
          <span class="flex-1 text-left truncate">全部技能</span>
          <span class="tree-count">{{ skills.length }}</span>
        </button>

        <button
          v-for="g in groups"
          :key="g.id"
          class="tree-node"
          :class="active === g.id ? 'tree-node--active' : ''"
          @click="active = g.id"
        >
          <span class="tree-badge" :style="{ background: g.color || groupColor(g.id) }">
            <i :class="faIcon(g.icon, 'toolbox') + ' text-[10px]'"></i>
          </span>
          <span class="flex-1 text-left truncate">{{ g.name }}</span>
          <span class="tree-count">{{ g.count }}</span>
        </button>
      </div>

      <div class="px-4 py-3 border-t border-slate-100 text-[11px] text-slate-400">
        <i class="fa-solid fa-circle-info mr-1"></i>共 <b class="text-slate-600">{{ skills.length }}</b> 项可调用技能
      </div>
    </aside>

    <!-- ── 右侧:技能卡片 ────────────────────────── -->
    <div class="flex-1 min-w-0 overflow-y-auto">
      <div class="max-w-[1400px] mx-auto px-6 py-6">
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <div class="text-[12px] text-slate-400 flex items-center gap-1.5 mb-1">
              <i class="fa-solid fa-brain"></i>技能
              <i class="fa-solid fa-angle-right text-[10px]"></i>
              <span class="text-slate-600">{{ activeName }}</span>
            </div>
            <h1 class="text-xl font-bold text-slate-800">{{ activeName }}</h1>
            <p class="text-[13px] text-slate-400 mt-0.5">
              AI 内置的真实技能包 · 覆盖产品文档 / 原型 / 出图 / 陪练全链路 · 共 {{ filtered.length }} 项
            </p>
          </div>
          <button
            @click="startImport"
            :disabled="importing"
            class="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm disabled:opacity-50"
          >
            <i class="fa-solid fa-file-zipper text-[12px]"></i>导入技能包
          </button>
        </div>

        <div class="grid grid-cols-4 gap-4 mb-5">
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

        <div v-if="filtered.length" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <button
            v-for="sk in filtered"
            :key="sk.id"
            class="sk-card text-left group"
            @click="openSkill(sk)"
          >
            <div class="sk-card__accent" :style="{ background: sk.color }"></div>
            <div class="flex items-start gap-3">
              <span class="sk-icon" :style="{ background: sk.color, boxShadow: `0 6px 16px ${sk.color}55` }">
                <i :class="faIcon(sk.icon, 'cube')"></i>
              </span>
              <div class="flex-1 min-w-0">
                <h3 class="text-[13.5px] font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{{ sk.name }}</h3>
                <div class="flex items-center gap-1.5 mt-1">
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{{ groupName(sk.group) }}</span>
                  <span v-if="sk.version" class="text-[10px] text-slate-400">v{{ sk.version }}</span>
                </div>
              </div>
            </div>
            <p class="text-[12px] text-slate-500 mt-3 leading-relaxed line-clamp-2">{{ sk.summary || '——' }}</p>
            <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span class="font-mono truncate">{{ sk.id }}</span>
              <span class="text-blue-500 font-medium shrink-0"><i class="fa-solid fa-book-open mr-1"></i>查看说明</span>
            </div>
          </button>
        </div>
        <div v-else class="text-center py-20 text-slate-300">
          <i class="fa-solid fa-inbox text-5xl mb-3"></i>
          <p class="text-[13px]">该分组下暂无技能</p>
        </div>
      </div>
    </div>

    <!-- ── 技能说明抽屉 ────────────────────────── -->
    <transition name="drawer">
      <div v-if="selected" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-slate-900/40" @click="selected = null"></div>
        <aside class="absolute right-0 top-0 bottom-0 w-[640px] max-w-[92vw] bg-white shadow-2xl flex flex-col">
          <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200/80 shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0" :style="{ background: selected.color }">
                <i :class="faIcon(selected.icon, 'cube')"></i>
              </span>
              <div class="min-w-0">
                <div class="text-[13px] font-semibold text-slate-800 truncate">{{ selected.name }}</div>
                <div class="text-[11px] text-slate-400">{{ groupName(selected.group) }}<span v-if="selected.version"> · v{{ selected.version }}</span></div>
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button @click="openDir(selected)" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-slate-600 hover:bg-slate-100 transition" title="打开技能目录">
                <i class="fa-solid fa-folder-open text-[11px]"></i><span>打开目录</span>
              </button>
              <button @click="selected = null" class="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 transition"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto p-6 bg-white">
            <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-slate-400">
              <div class="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin mb-3"></div>
              <span class="text-[12px]">加载中…</span>
            </div>
            <div v-else-if="error" class="flex flex-col items-center justify-center py-20 text-slate-400">
              <i class="fa-solid fa-triangle-exclamation text-xl mb-2 text-amber-400"></i>
              <span class="text-[12px]">{{ error }}</span>
            </div>
            <div v-else class="prose prose-sm prose-slate max-w-none skill-md" v-html="rendered"></div>
          </div>
        </aside>
      </div>
    </transition>

    <!-- ── 导入进度弹框 ────────────────────────── -->
    <transition name="fade">
      <div v-if="importing || importResult" class="fixed inset-0 z-[55] flex items-center justify-center">
        <div class="absolute inset-0 bg-slate-900/40"></div>
        <div class="relative w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl p-6">
          <div class="flex items-center gap-2 mb-5">
            <i class="fa-solid fa-file-zipper text-blue-600"></i>
            <span class="text-[15px] font-bold text-slate-800">导入技能包</span>
            <button v-if="importResult" @click="closeImport" class="ml-auto w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <!-- 进行中 / 成功:进度条 -->
          <template v-if="!importError">
            <div class="flex items-center justify-between text-[12px] mb-1.5">
              <span class="text-slate-500">{{ progressMsg }}</span>
              <span class="font-mono text-slate-400">{{ progressPct }}%</span>
            </div>
            <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300" :style="{ width: progressPct + '%' }"></div>
            </div>
            <div v-if="importResult && !importError" class="mt-5 flex items-center gap-2 text-[13px] text-blue-600">
              <i class="fa-solid fa-circle-check"></i>技能「{{ importResult.skillId }}」导入成功
            </div>
          </template>

          <!-- 失败:校验不通过 -->
          <div v-else class="flex flex-col items-center text-center py-3">
            <i class="fa-solid fa-triangle-exclamation text-2xl text-amber-500 mb-3"></i>
            <p class="text-[13px] font-medium text-slate-700 mb-1">导入失败</p>
            <p class="text-[12px] text-slate-400 leading-relaxed">{{ importError }}</p>
          </div>

          <button
            v-if="importResult"
            @click="closeImport"
            class="w-full mt-6 py-2.5 rounded-lg text-[13px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >完成</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { marked } from 'marked';

const groups = ref([]);
const skills = ref([]);
const active = ref('all');
const keyword = ref('');
const selected = ref(null);
const loading = ref(false);
const error = ref('');
const rendered = ref('');

// 导入技能包状态
const importing = ref(false);
const importResult = ref(null);
const importError = ref('');
const progressPct = ref(0);
const progressMsg = ref('');
let offProgress = null;

async function loadManifest() {
  try {
    const res = await window.api.skills.getManifest();
    if (res && res.success && res.data) {
      groups.value = res.data.groups || [];
      skills.value = res.data.skills || [];
    } else {
      error.value = res?.error || '技能清单读取失败';
    }
  } catch (e) {
    console.error('[skills] load manifest failed', e);
  }
}

onMounted(() => {
  loadManifest();
  // 订阅主进程的导入进度事件
  offProgress = window.api.skills.onImportProgress((p) => {
    progressPct.value = p.percent ?? progressPct.value;
    progressMsg.value = p.message || '';
  });
});

onUnmounted(() => { if (offProgress) offProgress(); });

async function startImport() {
  if (importing.value) return;
  importing.value = true;
  importResult.value = null;
  importError.value = '';
  progressPct.value = 0;
  progressMsg.value = '等待选择文件…';
  try {
    const res = await window.api.skills.importZip();
    if (res && res.success) {
      progressPct.value = 100;
      importResult.value = res;
      await loadManifest();
      if (res.skillId) {
        const g = skills.value.find((s) => s.id === res.skillId)?.group;
        if (g) active.value = g;
      }
    } else if (res && res.canceled) {
      // 用户取消:静默关闭
      importing.value = false;
      return;
    } else {
      importError.value = res?.error || '导入失败';
      importResult.value = { skillId: '' };
    }
  } catch (e) {
    importError.value = e.message || String(e);
    importResult.value = { skillId: '' };
  } finally {
    importing.value = false;
  }
}

function closeImport() {
  importResult.value = null;
  importError.value = '';
  progressPct.value = 0;
}

const activeName = computed(() => {
  if (active.value === 'all') return '全部技能';
  return groups.value.find((g) => g.id === active.value)?.name || '全部技能';
});

const filtered = computed(() => {
  let list = active.value === 'all' ? skills.value : skills.value.filter((s) => s.group === active.value);
  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase();
    list = list.filter((s) => s.name.toLowerCase().includes(kw) || (s.summary || '').toLowerCase().includes(kw) || s.id.includes(kw));
  }
  return list;
});

const statCards = computed(() => [
  { label: '技能总数', value: skills.value.length, icon: 'fa-cubes', bg: '#2563eb' },
  { label: '能力分组', value: groups.value.length, icon: 'fa-layer-group', bg: '#1d4ed8' },
  { label: '产文档类', value: skills.value.filter((s) => s.group === 'product-doc').length, icon: 'fa-file-lines', bg: '#0ea5e9' },
  { label: '出图/可视化', value: skills.value.filter((s) => ['report-image', 'dataviz'].includes(s.group)).length, icon: 'fa-images', bg: '#3b82f6' },
]);

function groupName(id) {
  return groups.value.find((g) => g.id === id)?.name || id;
}
function groupColor(id) {
  return { 'product-doc': '#2563eb', prototype: '#1d4ed8', dataviz: '#0ea5e9', 'report-image': '#3b82f6', coach: '#1e40af', thinking: '#0369a1', general: '#64748b' }[id] || '#64748b';
}
// manifest 里的 icon 是不带 fa- 前缀的图标名(如 headset),这里补全 Font Awesome class
function faIcon(name, fallback) {
  const n = (name || fallback || 'cube').trim();
  return n.startsWith('fa-') ? `fa-solid ${n}` : `fa-solid fa-${n}`;
}

async function openSkill(sk) {
  selected.value = sk;
  loading.value = true;
  error.value = '';
  rendered.value = '';
  try {
    const res = await window.api.skills.read(sk.id, sk.file || 'SKILL.md');
    if (res && res.success) {
      // 去掉 frontmatter,只渲染正文
      const body = (res.content || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
      rendered.value = marked.parse(body);
    } else {
      error.value = res?.error || '读取失败';
    }
  } catch (e) {
    error.value = e.message || '读取失败';
  } finally {
    loading.value = false;
  }
}

async function openDir(sk) {
  try {
    await window.api.skills.open(sk.id);
  } catch (e) {
    console.error('[skills] open dir failed', e);
  }
}
</script>

<style scoped>
.sk-bg {
  background:
    radial-gradient(900px 500px at 100% 0%, rgba(37, 99, 235, 0.06), transparent 60%),
    radial-gradient(700px 400px at 0% 100%, rgba(14, 165, 233, 0.05), transparent 55%),
    #f4f7fb;
}
.sk-tree { width: 272px; }

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
  flex-shrink: 0;
  box-shadow: 0 2px 5px rgba(15, 23, 42, 0.14);
  transition: transform 0.15s;
}
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

.sk-card {
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
.sk-card__accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity 0.22s ease;
}
.sk-card:hover {
  box-shadow: 0 12px 30px rgba(30, 58, 138, 0.13);
  transform: translateY(-3px);
  border-color: #c7d7f5;
}
.sk-card:hover .sk-card__accent { opacity: 1; }

.sk-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  flex-shrink: 0;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 34px;
}

.drawer-enter-active, .drawer-leave-active { transition: opacity 0.2s; }
.drawer-enter-active aside, .drawer-leave-active aside { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from aside, .drawer-leave-to aside { transform: translateX(100%); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 技能说明 markdown 排版(对齐 DocViewer 的 handbook-md) */
.skill-md :deep(h1) { font-size: 1.4em; font-weight: 700; color: #1e293b; margin: 0.4em 0 0.5em; }
.skill-md :deep(h2) { font-size: 1.18em; font-weight: 700; color: #1e293b; margin: 1em 0 0.4em; padding-bottom: 0.2em; border-bottom: 1px solid #e2e8f0; }
.skill-md :deep(h3) { font-size: 1.04em; font-weight: 600; color: #334155; margin: 0.8em 0 0.3em; }
.skill-md :deep(p) { margin: 0.5em 0; line-height: 1.75; color: #475569; font-size: 13px; }
.skill-md :deep(ul), .skill-md :deep(ol) { margin: 0.4em 0; padding-left: 1.5em; }
.skill-md :deep(li) { margin: 0.2em 0; line-height: 1.7; color: #475569; font-size: 13px; }
.skill-md :deep(table) { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 12px; }
.skill-md :deep(th), .skill-md :deep(td) { border: 1px solid #e2e8f0; padding: 0.5em 0.7em; text-align: left; vertical-align: top; }
.skill-md :deep(th) { background: #f8fafc; font-weight: 600; color: #334155; }
.skill-md :deep(strong) { font-weight: 700; color: #1e293b; }
.skill-md :deep(code) { font-size: 12px; background: #f1f5f9; padding: 0.15em 0.4em; border-radius: 4px; color: #475569; }
.skill-md :deep(pre) { background: #1e293b; color: #e2e8f0; padding: 0.9em 1.1em; border-radius: 8px; overflow-x: auto; font-size: 12px; margin: 0.6em 0; }
.skill-md :deep(pre code) { background: transparent; padding: 0; color: inherit; }
.skill-md :deep(blockquote) { border-left: 3px solid #2563eb; padding: 0.2em 0 0.2em 0.9em; margin: 0.6em 0; color: #475569; background: #f8fafc; border-radius: 0 6px 6px 0; }
.skill-md :deep(a) { color: #2563eb; text-decoration: none; }
</style>
