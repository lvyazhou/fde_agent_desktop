<template>
  <div class="bg-white rounded-[24px] border border-dashed border-slate-200 p-10 text-center shadow-card">
    <div class="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl text-slate-300 mx-auto mb-4">
      <i :class="icon"></i>
    </div>
    <div class="text-slate-600 font-medium mb-1">{{ title }}</div>
    <div class="text-sm text-slate-400">{{ subtitle }}</div>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: 'fa-solid fa-inbox' },
  title: { type: String, default: '暂无数据' },
  subtitle: { type: String, default: '' },
});
</script>
