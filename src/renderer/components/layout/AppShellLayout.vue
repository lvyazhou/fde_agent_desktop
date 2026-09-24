<template>
  <div class="app-root">
    <!-- 授权到期遮罩:过了 expire_at(缓冲期/硬过期)或授权异常 → 全屏阻断,必须导入新授权 -->
    <div v-if="licenseBlock" class="license-overlay">
      <div class="license-overlay-drag"></div>
      <div class="license-card no-drag">
        <div class="license-card-icon">
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <h2 class="license-card-title">{{ licenseBlock.title }}</h2>
        <p class="license-card-desc">{{ licenseBlock.desc }}</p>
        <div v-if="licenseBlock.detail" class="license-card-detail">{{ licenseBlock.detail }}</div>
        <button class="license-card-btn" :disabled="importing" @click="importLicense">
          <i class="fa-solid fa-file-import"></i>
          {{ importing ? '正在导入…' : '导入授权文件' }}
        </button>
        <p v-if="importError" class="license-card-err">{{ importError }}</p>
        <p class="license-card-sn" v-if="licenseInfo && licenseInfo.sn">机器码:{{ licenseInfo.sn }}</p>
      </div>
    </div>

    <!-- 极简顶条:仅可拖拽区 + 窗口控制(Electron frameless 必需),高 36px -->
    <header class="app-titlebar drag-region">
      <div class="titlebar-left no-drag">
        <button class="rail-collapse-top" :title="collapsed ? '展开侧栏' : '收起侧栏'" @click="collapsed = !collapsed">
          <i class="fa-solid" :class="collapsed ? 'fa-angles-right' : 'fa-angles-left'"></i>
        </button>
      </div>
      <div class="titlebar-right no-drag">
        <span class="titlebar-clock font-mono">{{ clock }}</span>
        <div class="titlebar-divider"></div>
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

    <!-- 主体:深色左侧栏 + 浅色内容区 -->
    <div class="app-body">
      <!-- 深色左侧导航栏(可折叠) -->
      <aside class="rail" :class="{ 'rail--collapsed': collapsed }">
        <!-- 品牌 -->
        <div class="rail-brand">
          <img src="../../assets/logo.png" alt="Logo" class="rail-logo" />
          <div v-if="!collapsed" class="rail-brand-text">
            <span class="rail-brand-name">FDE 产品设计</span>
            <span class="rail-brand-sub">五阶段作战工作台</span>
          </div>
        </div>

        <!-- 导航(分组) -->
        <nav class="rail-nav scrollbar-thin">
          <div v-for="group in navGroups" :key="group.label" class="rail-group">
            <div v-if="!collapsed" class="rail-group-label">{{ group.label }}</div>
            <RouterLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="rail-link"
              :class="item.match(route.path) ? 'rail-link--active' : ''"
              :title="collapsed ? item.label : ''"
            >
              <i :class="item.icon" class="rail-ico"></i>
              <span v-if="!collapsed" class="rail-label">{{ item.label }}</span>
            </RouterLink>
          </div>
        </nav>

        <!-- 底部:引擎状态 + 授权 + 设置 -->
        <div class="rail-footer">
          <div class="rail-status" :class="collapsed ? 'rail-status--mini' : ''" :title="engineTitle">
            <span class="status-dot" :class="engineDotCls"></span>
            <span v-if="!collapsed" class="rail-status-text">{{ engineText }}</span>
          </div>
          <div v-if="!collapsed && licenseChip" class="rail-license" :class="licenseChip.cls" :title="licenseChip.title">
            <i class="fa-solid fa-shield-halved text-[9px]"></i>
            <span class="truncate">{{ licenseChip.text }}</span>
          </div>
          <RouterLink
            to="/settings"
            class="rail-link rail-link--settings"
            :class="isSettingsRoute ? 'rail-link--active' : ''"
            :title="collapsed ? '设置' : ''"
          >
            <i class="fa-solid fa-gear rail-ico"></i>
            <span v-if="!collapsed" class="rail-label">设置</span>
            <span v-if="!collapsed" class="rail-version font-mono">{{ appVersionShort }}</span>
          </RouterLink>
        </div>
      </aside>

      <!-- 浅色内容区 -->
      <main class="app-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isMaximized = ref(false);
const appVersion = ref('v3.3.7');
const licenseInfo = ref(null);
const importing = ref(false);
const importError = ref('');

// 顶栏状态条:实时时钟 + AI 引擎就绪状态
const clock = ref('--:--:--');
const engineReady = ref(null); // null=检测中, true=就绪, false=未就绪
let clockTimer = null;
let licenseTimer = null;

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

const isSettingsRoute = computed(() => route.path === '/settings');

// 侧栏折叠状态(持久化到 localStorage,重开保留用户偏好)
const collapsed = ref(false);
try { collapsed.value = localStorage.getItem('rail-collapsed') === '1'; } catch { /* ignore */ }
watch(collapsed, (v) => { try { localStorage.setItem('rail-collapsed', v ? '1' : '0'); } catch { /* ignore */ } });

// 左侧导航:分三组。match 决定高亮(startsWith 处理 /code/:id、/projects/:slug 等子路由)。
const navGroups = [
  {
    label: '工作台',
    items: [
      { to: '/', label: 'FDE 工作台', icon: 'fa-solid fa-table-columns', match: (p) => p === '/' },
      { to: '/project-spec', label: 'FDE 项目规范', icon: 'fa-solid fa-clipboard-list', match: (p) => p === '/project-spec' },
      { to: '/training', label: 'FDE 培训教程', icon: 'fa-solid fa-graduation-cap', match: (p) => p === '/training' },
    ],
  },
  {
    label: 'AI 助手',
    items: [
      { to: '/chat', label: 'AI 智能对话', icon: 'fa-solid fa-comments', match: (p) => p === '/chat' },
      { to: '/code', label: 'AI 代码模式', icon: 'fa-solid fa-code', match: (p) => p.startsWith('/code') },
      { to: '/apps', label: 'AI 应用广场', icon: 'fa-solid fa-store', match: (p) => p === '/apps' || p === '/experts' },
    ],
  },
  {
    label: '资源',
    items: [
      { to: '/projects', label: '项目列表', icon: 'fa-solid fa-folder-open', match: (p) => p.startsWith('/projects') },
      { to: '/knowledge', label: '知识中心', icon: 'fa-solid fa-book-open', match: (p) => p === '/knowledge' },
      { to: '/skills', label: '技能中心', icon: 'fa-solid fa-brain', match: (p) => p === '/skills' },
    ],
  },
];

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

// 授权阻断遮罩:任何“过了到期日”或授权异常的状态都要挡住使用。
// 覆盖:GRACE_PERIOD(缓冲期,已过 expire)/ HARD_EXPIRED / NO_LICENSE / SN_MISMATCH / TAMPERED / CLOCK_ROLLBACK / FINGERPRINT_FAIL
const licenseBlock = computed(() => {
  const l = licenseInfo.value;
  if (!l) return null; // 尚未取到状态,先不阻断,避免误挡
  const customer = l.customer || '';
  const who = customer ? `${customer} 的` : '';
  switch (l.status) {
    case 'GRACE_PERIOD': {
      // 已到期,处于缓冲期——按你的要求同样弹窗阻断
      const detail = l.expireAt ? `授权已于 ${l.expireAt} 到期` : '';
      return { title: '授权已到期', desc: `${who}授权已到期,请导入新的授权文件后继续使用。`, detail };
    }
    case 'HARD_EXPIRED':
      return { title: '授权已过期', desc: `${who}授权已过期,请导入新的授权文件后继续使用。`, detail: l.expireAt ? `到期日:${l.expireAt}` : '' };
    case 'NO_LICENSE':
      return { title: '未授权', desc: '本机尚未导入授权文件,请导入授权文件以激活软件。', detail: '' };
    case 'SN_MISMATCH':
      return { title: '授权与本机不匹配', desc: '当前授权文件绑定的机器码与本机不一致,请使用为本机签发的授权文件。', detail: '' };
    case 'CLOCK_ROLLBACK':
      return { title: '检测到系统时间异常', desc: '系统时间被回拨,授权校验无法通过。请将系统时间调整正确后重试。', detail: '' };
    case 'TAMPERED':
      return { title: '授权文件无效', desc: '授权文件已损坏或被篡改,请重新导入有效的授权文件。', detail: '' };
    case 'FINGERPRINT_FAIL':
      return { title: '无法读取机器码', desc: '无法获取本机机器码,授权校验失败,请联系技术支持。', detail: '' };
    default:
      // ACTIVE_PERMANENT / ACTIVE_TEMPORARY 或未知的 ok:true 状态 → 不阻断
      return l.ok ? null : { title: '授权校验未通过', desc: '授权状态异常,请导入有效的授权文件。', detail: l.status ? `状态:${l.status}` : '' };
  }
});

const loadLicense = async () => {
  try {
    if (window.api?.license?.status) {
      const r = await window.api.license.status();
      if (r && r.success !== false) licenseInfo.value = r;
    }
  } catch (e) { /* ignore */ }
};

// 导入授权文件:调主进程弹文件选择器 → 校验落盘 → 重新拉状态。成功即撤下遮罩。
const importLicense = async () => {
  if (importing.value) return;
  importError.value = '';
  importing.value = true;
  try {
    if (!window.api?.license?.import) { importError.value = '当前环境不支持导入,请联系技术支持。'; return; }
    const res = await window.api.license.import();
    if (res && res.canceled) { return; } // 用户取消,静默
    if (res && res.success) {
      // 主进程仅在校验通过(ok)时才返回 success:true 并落盘
      await loadLicense(); // 刷新状态,licenseBlock 会随之消失
      importError.value = '';
    } else {
      const reason = res && (res.reason || res.status || res.error);
      importError.value = reasonText(reason);
    }
  } catch (e) {
    importError.value = '导入失败:' + (e && e.message ? e.message : '未知错误');
  } finally {
    importing.value = false;
  }
};

// 把校验状态码翻译成给用户看的话
const reasonText = (r) => {
  switch (r) {
    case 'SN_MISMATCH': return '该授权文件不是为本机签发的(机器码不匹配)。';
    case 'HARD_EXPIRED': return '该授权文件已过期。';
    case 'GRACE_PERIOD': return '该授权文件已到期(处于缓冲期),请使用有效授权。';
    case 'TAMPERED': return '授权文件已损坏或被篡改。';
    case 'CLOCK_ROLLBACK': return '检测到系统时间被回拨,请校正系统时间后重试。';
    case 'FINGERPRINT_FAIL': return '无法读取本机机器码。';
    case 'NO_LICENSE': return '未选择有效的授权文件。';
    default: return r ? ('导入失败:' + r) : '导入失败,请确认授权文件是否有效。';
  }
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
  // 每 60s 复查一次授权,修掉“开着不动就永不复查”的问题:缓冲期跨进硬过期、时钟异常等都能及时挡住
  licenseTimer = setInterval(loadLicense, 60000);

  tickClock();
  clockTimer = setInterval(tickClock, 1000);
  checkEngine();
});

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer);
  if (licenseTimer) clearInterval(licenseTimer);
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
/* 授权到期遮罩:全屏、最高层级、阻断一切交互 */
.license-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
/* 顶部一条可拖拽区,遮罩下仍能移动/关闭窗口 */
.license-overlay-drag {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 52px;
  -webkit-app-region: drag;
}
.license-card {
  position: relative;
  width: 420px;
  max-width: calc(100vw - 48px);
  background: #ffffff;
  border-radius: 16px;
  padding: 32px 32px 28px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
  text-align: center;
}
.license-card-icon {
  width: 56px; height: 56px;
  margin: 0 auto 16px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  background: #fef2f2;
  color: #dc2626;
  font-size: 24px;
}
.license-card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ui-ink);
  margin: 0 0 8px;
}
.license-card-desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--ui-text);
  margin: 0 0 6px;
}
.license-card-detail {
  font-size: 12px;
  color: var(--ui-text-3);
  margin: 0 0 20px;
}
.license-card-btn {
  -webkit-app-region: no-drag;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 10px 22px;
  border: none;
  border-radius: 10px;
  background: var(--ui-brand);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.license-card-btn:hover:not(:disabled) { background: var(--ui-brand-dark); }
.license-card-btn:disabled { opacity: 0.6; cursor: default; }
.license-card-err {
  font-size: 12px;
  color: #dc2626;
  margin: 12px 0 0;
}
.license-card-sn {
  font-size: 11px;
  color: var(--ui-line);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  margin: 16px 0 0;
  word-break: break-all;
}

.drag-region {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}

/* ===================================================================
   新布局:深色左侧栏 + 浅色内容区(Codex/Linear 式)
   =================================================================== */
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--color-content-bg);
  color: var(--ui-ink-2);
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* 极简顶条:36px,承载窗口拖拽 + 控制按钮 + 时钟(浅色,与侧栏同底) */
.app-titlebar {
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 0 10px;
  /* 顶栏毛玻璃：chrome-bg + blur(14px) saturate(1.4)（skill 只许顶栏/侧栏加 blur） */
  background: var(--chrome-bg);
  backdrop-filter: blur(14px) saturate(1.4);
  border-bottom: 1px solid hsl(var(--primary) / 12%);
  position: relative;
  z-index: 30;
}
.titlebar-left, .titlebar-right { display: inline-flex; align-items: center; gap: 4px; }
.rail-collapse-top {
  width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px; color: var(--color-sidebar-text); font-size: 11px;
  transition: background 0.15s, color 0.15s;
}
.rail-collapse-top:hover { background: var(--color-sidebar-elevated); color: var(--color-sidebar-text-strong); }
.titlebar-clock {
  font-size: 11.5px; color: var(--color-sidebar-muted); letter-spacing: 0.02em; padding: 0 6px;
}
.titlebar-divider { width: 1px; height: 14px; background: var(--color-sidebar-border); margin: 0 2px; }

/* 主体两栏 */
.app-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }

/* 浅灰白左侧栏 */
.rail {
  width: 236px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  /* 侧栏毛玻璃：玻璃感最明显的区域 */
  background: var(--chrome-bg);
  backdrop-filter: blur(14px) saturate(1.35);
  border-right: 1px solid hsl(var(--primary) / 12%);
  transition: width 0.18s ease;
  overflow: hidden;
}
.rail--collapsed { width: 60px; }

/* 品牌 */
.rail-brand {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px 12px;
  min-height: 56px;
}
.rail--collapsed .rail-brand { padding: 14px 0 12px; justify-content: center; }
.rail-logo {
  width: 30px; height: 30px; border-radius: 9px; object-fit: cover; flex-shrink: 0;
  box-shadow: 0 2px 8px hsl(var(--primary) / 20%);
}
.rail-brand-text { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
.rail-brand-name { font-size: 13.5px; font-weight: 600; color: var(--color-sidebar-text-strong); white-space: nowrap; }
.rail-brand-sub { font-size: 10px; color: var(--color-sidebar-muted); margin-top: 2px; white-space: nowrap; }

/* 导航 */
.rail-nav { flex: 1; overflow-y: auto; padding: 6px 10px; }
.rail--collapsed .rail-nav { padding: 6px 8px; }
.rail-group { margin-bottom: 12px; }
.rail-group-label {
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--color-sidebar-muted); padding: 6px 10px 4px;
}
.rail-link {
  display: flex; align-items: center; gap: 11px;
  padding: 8px 11px; margin-bottom: 1px;
  border-radius: 8px; position: relative;
  font-size: 13px; color: var(--color-sidebar-text);
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.rail--collapsed .rail-link { justify-content: center; padding: 9px 0; }
.rail-ico { font-size: 14px; width: 18px; text-align: center; flex-shrink: 0; color: var(--color-sidebar-muted); transition: color 0.15s; }
.rail-label { flex: 1; overflow: hidden; text-overflow: ellipsis; }
.rail-link:hover { background: var(--color-sidebar-elevated); color: var(--color-sidebar-text-strong); }
.rail-link:hover .rail-ico { color: var(--color-sidebar-text); }
/* 选中态:淡灰底块(Codex 式,无蓝、无竖条) */
.rail-link--active {
  background: var(--color-sidebar-elevated);
  color: var(--color-sidebar-text-strong); font-weight: 500;
}
.rail-link--active .rail-ico { color: var(--color-sidebar-active); }

/* 底部区 */
.rail-footer {
  border-top: 1px solid var(--color-sidebar-border);
  padding: 8px 10px;
  display: flex; flex-direction: column; gap: 4px;
}
.rail--collapsed .rail-footer { padding: 8px; align-items: center; }
.rail-status {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 11px; font-size: 12px; color: var(--color-sidebar-text);
}
.rail-status--mini { padding: 6px 0; justify-content: center; }
.rail-status-text { white-space: nowrap; }
.rail-license {
  display: flex; align-items: center; gap: 5px;
  margin: 0 4px 2px; padding: 4px 10px; border-radius: 7px;
  font-size: 11px; font-weight: 500;
}
.rail-license .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
.rail-license.lic-gray { color: var(--ui-text-2); background: rgba(148, 163, 184, 0.14); }
.rail-license.lic-amber { color: #b45309; background: #fffbeb; }
.rail-license.lic-red { color: #b91c1c; background: #fef2f2; }
.rail-link--settings { margin-bottom: 0; }
.rail-version {
  font-size: 10px; color: var(--color-sidebar-muted); margin-left: auto;
}

/* 纯白内容区 */
.app-content {
  flex: 1;
  /* 透明：让 body 的蓝色光晕渐变透上来，各页面不再自带死板底色 */
  background: transparent;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-content-bg);
}

/* 状态点(rail-status 复用) */
.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; position: relative; }
.dot-blue { background: var(--ui-brand-light); box-shadow: 0 0 0 3px hsl(var(--primary) / 16%); }
.dot-amber { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.16); }
.dot-gray { background: var(--ui-line); box-shadow: 0 0 0 3px rgba(203, 213, 225, 0.16); }

/* Window controls(顶条内,浅底深字) */
.win-btn {
  width: 28px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px; color: var(--color-sidebar-text);
  transition: background 0.18s ease, color 0.18s ease;
}
.win-btn:hover { background: var(--color-sidebar-elevated); color: var(--color-sidebar-text-strong); }
.win-btn--close:hover { background: #ef4444; color: #ffffff; }
</style>
