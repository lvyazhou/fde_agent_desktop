<template>
  <div class="bg-white border border-blue-100 rounded-[24px] p-5 shadow-card">
    <div class="flex items-center justify-between mb-4">
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
        :class="iconBgClass"
      >
        <i :class="icon"></i>
      </div>
      <span
        class="text-xs font-medium px-2 py-1 rounded-md border"
        :class="badgeClass"
      >
        {{ badge }}
      </span>
    </div>
    <div class="text-2xl font-bold text-slate-800 mb-1">
      {{ value }} <span class="text-sm font-normal text-slate-500">{{ unit }}</span>
    </div>
    <div class="text-xs text-slate-500">{{ description }}</div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, required: true },
  iconBgClass: { type: String, default: 'bg-blue-50 text-blue-700' },
  badge: { type: String, default: '' },
  badgeClass: { type: String, default: 'text-blue-700 bg-blue-50 border-blue-100' },
  value: { type: [String, Number], required: true },
  unit: { type: String, default: '' },
  description: { type: String, default: '' },
});
</script>
