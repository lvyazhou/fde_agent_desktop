<template>
  <div class="min-h-screen h-screen flex flex-col bg-[#f5f7fa] font-sans text-slate-800 antialiased overflow-hidden">
    <!-- Top nav bar (48px, draggable) -->
    <header class="h-12 bg-white border-b border-slate-200/80 flex items-center justify-between px-5 shrink-0 select-none drag-region">
      <!-- Left: Logo + brand + nav links -->
      <div class="flex items-center gap-5 min-w-0">
        <!-- Logo + brand -->
        <div class="flex items-center gap-2.5 shrink-0">
          <div class="w-7 h-7 rounded-lg bg-blue-700 flex items-center justify-center shadow-sm">
            <i class="fa-solid fa-wand-magic-sparkles text-white text-xs"></i>
          </div>
          <span class="font-semibold text-slate-800 text-sm">产设大师</span>
          <span class="text-xs text-slate-400 hidden sm:inline">智能体协作网格</span>
        </div>

        <!-- Nav links -->
        <nav class="flex items-center gap-0.5 no-drag">
          <RouterLink
            to="/"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-all"
            :class="isHomeRoute ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'"
          >
            <i class="fa-solid fa-comments text-[11px]" :class="isHomeRoute ? 'text-blue-700' : 'text-slate-400'"></i>
            <span>智能对话</span>
          </RouterLink>
          <RouterLink
            to="/projects"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-all"
            :class="isProjectsRoute ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'"
          >
            <i class="fa-solid fa-folder-open text-[11px]" :class="isProjectsRoute ? 'text-blue-700' : 'text-slate-400'"></i>
            <span>项目列表</span>
          </RouterLink>
          <RouterLink
            to="/settings"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-all"
            :class="isSettingsRoute ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'"
          >
            <i class="fa-solid fa-gear text-[11px]" :class="isSettingsRoute ? 'text-blue-700' : 'text-slate-400'"></i>
            <span>设置</span>
          </RouterLink>
        </nav>
      </div>

      <!-- Right: version + window controls -->
      <div class="flex items-center gap-1 no-drag text-slate-700">
        <span class="text-xs text-slate-400 mr-3 font-mono">{{ appVersion }}</span>
        <button @click="minimizeWindow" class="w-8 h-8 inline-flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors" title="最小化">
          <span class="text-sm font-semibold leading-none">-</span>
        </button>
        <button @click="toggleMaximize" class="w-8 h-8 inline-flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors" title="最大化">
          <span class="text-sm font-semibold leading-none">{{ isMaximized ? '❏' : '□' }}</span>
        </button>
        <button @click="closeWindow" class="w-8 h-8 inline-flex items-center justify-center hover:bg-rose-500 hover:text-white rounded-lg transition-colors" title="关闭">
          <span class="text-sm font-semibold leading-none">&times;</span>
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
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isMaximized = ref(false);
const appVersion = ref('v1.0.0');

const isHomeRoute = computed(() => route.path === '/');
const isProjectsRoute = computed(() => route.path.startsWith('/projects'));
const isSettingsRoute = computed(() => route.path === '/settings');

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
</style>
