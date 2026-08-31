import { createRouter, createWebHashHistory } from 'vue-router';
import AppShellLayout from '@/components/layout/AppShellLayout.vue';
import Setup from '@/pages/setup/Setup.vue';
import Workbench from '@/pages/workbench/Workbench.vue';
import AgentHome from '@/pages/projects/AgentHome.vue';
import ProjectList from '@/pages/projects/ProjectList.vue';
import ProjectCreate from '@/pages/projects/ProjectCreate.vue';
import ProjectDetail from '@/pages/projects/ProjectDetail.vue';
import Settings from '@/pages/settings/Settings.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    // 首次启动向导(独立于主壳,无顶栏)
    { path: '/setup', component: Setup },
    {
      path: '/',
      component: AppShellLayout,
      children: [
        { path: '', component: Workbench },
        { path: 'chat', component: AgentHome },
        { path: 'projects', component: ProjectList },
        { path: 'projects/new', component: ProjectCreate },
        { path: 'projects/:slug', component: ProjectDetail, props: true },
        { path: 'settings', component: Settings },
      ],
    },
  ],
});

// 启动门禁:首次导航前做一次环境自检,未就绪(引擎缺失 / Key 未配 / 引擎连不上)→ 强制进 /setup
let bootChecked = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

router.beforeEach(async (to) => {
  if (to.path === '/setup') return true;
  if (bootChecked) return true;
  bootChecked = true;
  try {
    if (!window.api?.env?.check) return true;
    let res = await window.api.env.check();
    if (!res || !res.success) return true; // 检查异常不阻断
    // 引擎可执行缺失 或 Key 未配 → 直接进向导
    if (!res.engine.ok || !res.apiKey.configured) return '/setup';
    // 引擎存在但 ACP 可能仍在异步初始化 → 轮询等待最多 ~4s,避免首屏误判
    for (let i = 0; i < 8 && !res.acp.ok; i++) {
      await sleep(500);
      res = await window.api.env.check();
    }
    if (!res.acp.ok) return '/setup';
  } catch (e) { /* 放行,不阻断 */ }
  return true;
});

export default router;
