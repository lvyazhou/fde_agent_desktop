<template>
  <div class="inline-flex bg-[#e2e8e5] rounded-full p-1 border border-slate-200/70">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5"
      :class="modelValue === tab.value
        ? 'bg-white text-slate-900 shadow-sm'
        : 'text-slate-600 hover:text-slate-900'"
      @click="$emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
      <slot :name="'badge-' + tab.value" />
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, required: true },
  tabs: {
    type: Array,
    required: true,
    // [{ value: 'agents', label: '本地已配置' }, ...]
  },
});
defineEmits(['update:modelValue']);
</script>
