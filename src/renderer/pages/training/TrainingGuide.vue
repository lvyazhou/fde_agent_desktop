<template>
  <div class="flex flex-col h-full min-h-0 bg-[#f5f7fa]">
    <!-- 顶部:标题 + 外部打开 -->
    <div class="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200/80 shrink-0">
      <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
        <i class="fa-solid fa-graduation-cap text-[13px]"></i>
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h2 class="text-[15px] font-semibold text-slate-800 truncate">FDE 培训教程</h2>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium shrink-0">新任项目经理 · 从0到上手</span>
        </div>
        <p class="text-[12px] text-slate-500 truncate">五阶段 · 医疗架构 · 技术底座 · 工作台 · 极库云 · 项管规范 · 实战</p>
      </div>
      <!-- 教程 / 讲师版 切换 -->
      <div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 shrink-0">
        <button
          v-for="t in tabs"
          :key="t.key"
          @click="switchTab(t.key)"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer"
          :class="active === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          :title="t.hint"
        >
          <i :class="t.icon" class="text-[11px]"></i>
          <span>{{ t.label }}</span>
        </button>
      </div>
      <button
        @click="openExternal"
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
        title="在浏览器中打开"
      >
        <i class="fa-solid fa-arrow-up-right-from-square text-[11px]"></i>
        <span class="hidden sm:inline">浏览器打开</span>
      </button>
    </div>

    <!-- 主体:iframe 承载完整教程页(保留原页样式与侧栏导航) -->
    <div class="flex-1 min-h-0 relative">
      <div v-if="!loaded" class="absolute inset-0 flex items-center justify-center text-slate-400">
        <div class="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin"></div>
      </div>
      <iframe
        ref="iframeEl"
        :key="active"
        :src="guideUrl"
        class="w-full h-full border-0 block"
        :title="active === 'speaker' ? 'FDE 培训讲师版讲稿' : 'FDE 新任项目经理培训教程'"
        @load="loaded = true"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

// 两个页面:学员教程 / 讲师版讲稿(都在 public 目录,dev 由 vite 提供、打包后与 index.html 同级)
const tabs = [
  { key: 'guide', label: '教程', icon: 'fa-solid fa-book-open', file: 'fde-training-guide.html', hint: '给学员读的完整教程' },
  { key: 'speaker', label: '讲师版', icon: 'fa-solid fa-chalkboard-user', file: 'fde-training-speaker.html', hint: '给讲师讲的 60 分钟讲稿:红绿灯配速 + 转场话术' },
];
const active = ref('guide');
const loaded = ref(false);
const iframeEl = ref(null);
const router = useRouter();

const guideUrl = computed(() => {
  const t = tabs.find((x) => x.key === active.value) || tabs[0];
  return `${import.meta.env.BASE_URL}${t.file}`;
});

const switchTab = (key) => {
  if (key === active.value) return;
  loaded.value = false; // :key 变化会重建 iframe,重新触发 load
  active.value = key;
};

const openExternal = async () => {
  try {
    // 拼成绝对 URL 交给系统浏览器(dev 为 http、prod 为 file)
    const abs = new URL(guideUrl.value, window.location.href).href;
    await window.api.shell.openExternal(abs);
  } catch { /* ignore */ }
};

// 教程页 iframe 内的「应用内延伸链接」→ 路由跳转(回工作台看五阶段手册)
const onGuideNav = (e) => {
  if (e.source !== iframeEl.value?.contentWindow) return;
  const path = e.data?.path;
  if (e.data?.type === 'fde-training-nav' && typeof path === 'string' && path.startsWith('/')) {
    router.push(path);
  }
};

onMounted(() => window.addEventListener('message', onGuideNav));
onBeforeUnmount(() => window.removeEventListener('message', onGuideNav));
</script>
