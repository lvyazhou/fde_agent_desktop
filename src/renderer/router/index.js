import { createRouter, createWebHashHistory } from 'vue-router';
import AppShellLayout from '@/components/layout/AppShellLayout.vue';
import AgentHome from '@/pages/projects/AgentHome.vue';
import ProjectList from '@/pages/projects/ProjectList.vue';
import ProjectCreate from '@/pages/projects/ProjectCreate.vue';
import ProjectDetail from '@/pages/projects/ProjectDetail.vue';
import Settings from '@/pages/settings/Settings.vue';

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: AppShellLayout,
      children: [
        { path: '', component: AgentHome },
        { path: 'projects', component: ProjectList },
        { path: 'projects/new', component: ProjectCreate },
        { path: 'projects/:slug', component: ProjectDetail, props: true },
        { path: 'settings', component: Settings },
      ],
    },
  ],
});
