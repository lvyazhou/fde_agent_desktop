<template>
  <div class="min-h-screen h-screen flex flex-col bg-[#f5f7fa] font-sans text-slate-800 antialiased overflow-hidden">
    <!-- Top nav bar (52px, draggable) -->
    <header class="app-header h-[52px] flex items-center justify-between pl-4 pr-2 shrink-0 select-none drag-region relative z-20">
      <!-- Left: Logo + brand + nav links -->
      <div class="flex items-center gap-4 min-w-0 lg:gap-6">
        <!-- Logo + brand -->
        <div class="flex items-center gap-3 shrink-0">
          <div class="brand-logo w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
            <i class="fa-solid fa-wand-magic-sparkles text-white text-[13px]"></i>
          </div>
          <div class="flex flex-col leading-none">
            <span class="font-semibold text-slate-800 text-[13px] tracking-tight">FDE产品设计</span>
            <span class="brand-subtitle text-[10px] text-slate-400 mt-0.5 tracking-wide">五阶段作战工作台</span>
          </div>
        </div>

        <!-- Divider -->
        <div class="h-5 w-px bg-slate-200/70 shrink-0 hidden md:block"></div>

        <!-- Nav links —— 优先级分层:窄屏按 p2 → p1 顺序收起文字,仅留图标+tooltip,永不换行 -->
        <nav class="nav-bar no-drag">
          <RouterLink
            to="/"
            class="nav-link"
            :class="isHomeRoute ? 'nav-link--active' : ''"
            title="FDE 工作台"
          >
            <i class="fa-solid fa-table-columns text-[11px]"></i>
            <span class="nav-label nav-p0">FDE 工作台</span>
          </RouterLink>
          <RouterLink
            to="/project-spec"
            class="nav-link"
            :class="isProjectSpecRoute ? 'nav-link--active' : ''"
            title="FDE 项目规范"
          >
            <i class="fa-solid fa-clipboard-list text-[11px]"></i>
            <span class="nav-label nav-p2">FDE 项目规范</span>
          </RouterLink>
          <RouterLink
            to="/training"
            class="nav-link"
            :class="isTrainingRoute ? 'nav-link--active' : ''"
            title="FDE 培训教程"
          >
            <i class="fa-solid fa-graduation-cap text-[11px]"></i>
            <span class="nav-label nav-p2">FDE 培训教程</span>
          </RouterLink>
          <RouterLink
            to="/chat"
            class="nav-link"
            :class="isChatRoute ? 'nav-link--active' : ''"
            title="智能对话"
          >
            <i class="fa-solid fa-comments text-[11px]"></i>
            <span class="nav-label nav-p1">智能对话</span>
          </RouterLink>
          <RouterLink
            to="/projects"
            class="nav-link"
            :class="isProjectsRoute ? 'nav-link--active' : ''"
            title="项目列表"
          >
            <i class="fa-solid fa-folder-open text-[11px]"></i>
            <span class="nav-label nav-p1">项目列表</span>
          </RouterLink>
          <RouterLink
            to="/knowledge"
            class="nav-link"
            :class="isKnowledgeRoute ? 'nav-link--active' : ''"
            title="知识库"
          >
            <i class="fa-solid fa-book-open text-[11px]"></i>
            <span class="nav-label nav-p2">知识库</span>
          </RouterLink>
          <RouterLink
            to="/skills"
            class="nav-link"
            :class="isSkillsRoute ? 'nav-link--active' : ''"
            title="技能"
          >
            <i class="fa-solid fa-brain text-[11px]"></i>
            <span class="nav-label nav-p2">技能</span>
          </RouterLink>
          <RouterLink
            to="/settings"
            class="nav-link"
            :class="isSettingsRoute ? 'nav-link--active' : ''"
            title="设置"
          >
            <i class="fa-solid fa-gear text-[11px]"></i>
            <span class="nav-label nav-p1">设置</span>
          </RouterLink>
        </nav>
      </div>

      <!-- Right: status strip + license + window controls (fixed, never shrinks) -->
      <div class="flex items-center no-drag text-slate-600 shrink-0">
        <!-- 状态指示条:系统运行 · AI 引擎 · 时钟 · 版本 -->
        <div class="status-strip">
          <span class="status-item status-sys" title="系统运行中">
            <span class="status-dot dot-green"></span>
            <span class="status-text">系统运行中</span>
          </span>
          <span class="status-sep status-sys-sep"></span>
          <span class="status-item" :title="engineTitle">
            <span class="status-dot" :class="engineDotCls"></span>
            <span class="status-text">{{ engineText }}</span>
          </span>
          <span class="status-sep status-clock-sep"></span>
          <span class="status-clock font-mono">{{ clock }}</span>
          <span class="version-pill font-mono">{{ appVersionShort }}</span>
        </div>

        <span
          v-if="licenseChip"
          class="license-chip ml-2"
          :class="licenseChip.cls"
          :title="licenseChip.title"
        >
          <i class="fa-solid fa-shield-halved text-[9px]"></i>
          <span class="truncate max-w-[140px]">{{ licenseChip.text }}</span>
        </span>
        <div class="h-5 w-px bg-slate-200/70 mx-1.5"></div>
        <button @click="minimizeWindow" class="win-btn" title="最小化">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        </button>
        <button @click="toggleMaximize" class="win-btn" title="最大化">
          <svg v-if="!isMaximized" width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.2"/></svg>
          <svg v-else width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="2.2" y="3.2" width="4.6" height="4.6" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M3.6 3V2.2A.8.8 0 0 1 4.4 1.4h3.4a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8H7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        </button>
        <button @click="closeWindow" class="win-btn win-btn--close" title="关闭">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        </button>
      </div>
    </header>

    <!-- Main content (no sidebar, just RouterView) -->
    <main class="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isMaximized = ref(false);
const appVersion = ref('v1.0.0');
const licenseInfo = ref(null);

// 顶栏状态条:实时时钟 + AI 引擎就绪状态
const clock = ref('--:--:--');
const engineReady = ref(null); // null=检测中, true=就绪, false=未就绪
let clockTimer = null;

// 版本号去掉前缀 v,状态条里用 5.7.0 这样的纯数字胶囊
const appVersionShort = computed(() => String(appVersion.value).replace(/^v/i, ''));

const engineText = computed(() =>
  engineReady.value === true ? 'AI 引擎就绪'
  : engineReady.value === false ? 'AI 引擎未就绪'
  : 'AI 引擎检测中'
);
const engineDotCls = computed(() =>
  engineReady.value === true ? 'dot-blue'
  : engineReady.value === false ? 'dot-amber'
  : 'dot-gray'
);
const engineTitle = computed(() =>
  engineReady.value === true ? 'AI 引擎已就绪,可正常对话'
  : engineReady.value === false ? 'AI 引擎未就绪,请前往设置检查引擎/密钥'
  : '正在检测 AI 引擎状态…'
);

const isHomeRoute = computed(() => route.path === '/');
const isProjectSpecRoute = computed(() => route.path === '/project-spec');
const isTrainingRoute = computed(() => route.path === '/training');
const isChatRoute = computed(() => route.path === '/chat');
const isProjectsRoute = computed(() => route.path.startsWith('/projects'));
const isKnowledgeRoute = computed(() => route.path === '/knowledge');
const isSkillsRoute = computed(() => route.path === '/skills');
const isSettingsRoute = computed(() => route.path === '/settings');

// 顶栏授权徽章:客户名 + 有效期(永久/剩余天数/缓冲期)
const licenseChip = computed(() => {
  const l = licenseInfo.value;
  if (!l || !l.customer) return null;
  const customer = l.customer;
  if (l.status === 'ACTIVE_PERMANENT' || l.licenseType === 'permanent') {
    return { text: `${customer} · 永久`, cls: 'lic-gray', title: `已授权:${customer}(永久授权)` };
  }
  if (l.status === 'GRACE_PERIOD') {
    return { text: `${customer} · 已到期`, cls: 'lic-red', title: `${customer} · 授权已到期,处于缓冲期,请尽快续期` };
  }
  if (l.status === 'ACTIVE_TEMPORARY' && l.expireAt) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const exp = new Date(l.expireAt + 'T00:00:00');
    const days = Math.ceil((exp - today) / 86400000);
    const cls = days <= 7 ? 'lic-red' : days <= 30 ? 'lic-amber' : 'lic-gray';
    const text = days <= 0 ? `${customer} · 今日到期` : `${customer} · 剩 ${days} 天`;
    return { text, cls, title: `${customer} · 有效期至 ${l.expireAt}(剩 ${days} 天)` };
  }
  return null;
});

const loadLicense = async () => {
  try {
    if (window.api?.license?.status) {
      const r = await window.api.license.status();
      if (r && r.success !== false) licenseInfo.value = r;
    }
  } catch (e) { /* ignore */ }
};

// 实时时钟(HH:MM:SS)
const tickClock = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  clock.value = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

// 检测 AI 引擎就绪状态(引擎可执行 + 密钥已配 + ACP 就绪)
const checkEngine = async () => {
  try {
    if (!window.api?.env?.check) { engineReady.value = null; return; }
    const res = await window.api.env.check();
    if (!res || !res.success) { engineReady.value = null; return; }
    engineReady.value = !!(res.engine?.ok && res.apiKey?.configured && res.acp?.ok);
  } catch (e) { engineReady.value = null; }
};

onMounted(async () => {
  if (window.api && window.api.window) {
    try {
      isMaximized.value = await window.api.window.isMaximized();
      window.api.window.onMaximizedChanged((event, isMax) => {
        isMaximized.value = isMax;
      });
    } catch (e) {}
  }
  if (window.api && window.api.app) {
    try {
      appVersion.value = 'v' + await window.api.app.getVersion();
    } catch (e) {}
  }
  loadLicense();

  tickClock();
  clockTimer = setInterval(tickClock, 1000);
  checkEngine();
});

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer);
});

const minimizeWindow = () => {
  if (window.api) window.api.window.minimize();
};

const toggleMaximize = () => {
  if (window.api) window.api.window.maximize();
};

const closeWindow = () => {
  if (window.api) window.api.window.close();
};
</script>

<style scoped>
.drag-region {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}

/* Header material: soft frosted surface with a subtle gradient + depth */
.app-header {
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.03),
    0 4px 16px rgba(15, 23, 42, 0.035);
  backdrop-filter: saturate(1.4) blur(6px);
}
/* Thin accent line at the very top for a premium finish */
.app-header::after {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 45%, transparent 90%);
  opacity: 0.9;
}

/* Brand logo: gradient badge with glow */
.brand-logo {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 55%, #1d4ed8 100%);
  box-shadow:
    0 2px 6px rgba(37, 99, 235, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.brand-logo:hover {
  transform: translateY(-1px) scale(1.03);
  box-shadow:
    0 4px 12px rgba(37, 99, 235, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Nav bar: 单一容器,永不换行;弹性吸收,右侧固定 */
.nav-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
  min-width: 0;
}

/* Nav links */
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  border-radius: 0.6rem;
  font-size: 12.5px;
  color: #64748b;
  position: relative;
  transition: color 0.2s ease, background 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.nav-link :deep(i),
.nav-link i {
  color: #94a3b8;
  transition: color 0.2s ease;
}
.nav-link:hover {
  color: #334155;
  background: rgba(241, 245, 249, 0.9);
}
.nav-link:hover i {
  color: #64748b;
}
.nav-link--active {
  color: #1d4ed8;
  font-weight: 600;
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.09) 100%);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.16);
}
.nav-link--active i {
  color: #2563eb;
}
/* Active underline indicator */
.nav-link--active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -1px;
  width: 16px;
  height: 2px;
  border-radius: 2px;
  transform: translateX(-50%);
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

/* Status strip: 系统运行 · AI 引擎 · 时钟 · 版本 —— 浅色圆角胶囊容器 */
.status-strip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.03),
    0 2px 6px rgba(15, 23, 42, 0.03);
}
.status-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  white-space: nowrap;
}
.status-text { color: #475569; }
.status-sep {
  width: 1px;
  height: 14px;
  background: rgba(226, 232, 240, 0.9);
}
.status-clock {
  font-size: 12px;
  color: #64748b;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
/* 版本胶囊:深蓝,与 logo 同色调 */
.version-pill {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  padding: 4px 10px;
  border-radius: 999px;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 1px 3px rgba(29, 78, 216, 0.35);
  white-space: nowrap;
}

/* 状态点 */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
}
.dot-green {
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.16);
}
.dot-green::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1px solid rgba(34, 197, 94, 0.35);
  animation: status-pulse 2.4s ease-out infinite;
}
.dot-blue {
  background: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16);
}
.dot-amber {
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.16);
}
.dot-gray {
  background: #cbd5e1;
  box-shadow: 0 0 0 3px rgba(203, 213, 225, 0.16);
}
@keyframes status-pulse {
  0% { opacity: 0.7; transform: scale(0.8); }
  70% { opacity: 0; transform: scale(1.6); }
  100% { opacity: 0; transform: scale(1.6); }
}

/* License badge */
.license-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 999px;
  max-width: 200px;
  cursor: default;
}
.license-chip.lic-gray { color: #64748b; background: rgba(241, 245, 249, 0.9); border: 1px solid rgba(226, 232, 240, 0.9); }
.license-chip.lic-amber { color: #b45309; background: #fffbeb; border: 1px solid #fde68a; }
.license-chip.lic-red { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; }

/* Window controls */
.win-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.55rem;
  color: #64748b;
  transition: background 0.18s ease, color 0.18s ease;
}
.win-btn:hover {
  background: rgba(241, 245, 249, 0.95);
  color: #0f172a;
}
.win-btn--close:hover {
  background: #ef4444;
  color: #ffffff;
}

/* =====================================================================
   Responsive topbar —— 分层降级,杜绝换行:
   导航文字按 p0(核心) → p1 → p2(次要) 顺序,在窗口变窄时渐次收起为
   纯图标(悬停 tooltip 的 title 已在模板里),状态条与品牌副标题同步精简。
   ===================================================================== */
@media (max-width: 1520px) {
  /* 品牌副标题收起 */
  .brand-subtitle { display: none; }
  /* 状态条:"系统运行中 + 时钟" 收起,仅留 AI 引擎 + 版本 */
  .status-sys, .status-sys-sep, .status-clock, .status-clock-sep { display: none; }
  /* 次要导航(p2)收起文字 → 纯图标 */
  .nav-p2 { display: none; }
}

@media (max-width: 1380px) {
  /* 次级导航(p1)收起文字 → 纯图标 */
  .nav-p1 { display: none; }
}

@media (max-width: 1180px) {
  /* 授权徽章收窄 */
  .license-chip { max-width: 110px; }
}

@media (max-width: 1080px) {
  /* 核心(p0)也收起文字 → 全图标导航,单行稳定 */
  .nav-p0 { display: none; }
  .brand-logo { width: 30px; height: 30px; }
  /* 状态条进一步紧凑:版本胶囊去掉 */
  .version-pill { display: none; }
}
</style>
