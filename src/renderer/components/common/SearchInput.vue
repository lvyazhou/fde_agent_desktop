<template>
  <div class="relative">
    <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      class="w-full bg-white border border-slate-200 rounded-full pl-9 pr-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜索...' },
});
defineEmits(['update:modelValue']);
</script>
