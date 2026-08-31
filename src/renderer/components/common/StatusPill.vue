<template>
  <span class="status-pill inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" :class="colorClass">
    <span class="w-1.5 h-1.5 rounded-full mr-1.5" :class="dotClass"></span>
    <slot></slot>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    default: 'success', // success, warning, error, idle
  },
});

const colorClass = computed(() => {
  const map = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    idle: 'bg-gray-100 text-gray-800',
  };
  return map[props.status] || map.idle;
});

const dotClass = computed(() => {
  const map = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    idle: 'bg-gray-500',
  };
  return map[props.status] || map.idle;
});
</script>
