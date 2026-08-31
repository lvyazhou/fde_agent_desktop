<template>
  <div class="border-b border-slate-100 last:border-b-0">
    <button
      @click="open = !open"
      class="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
    >
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <i :class="icon" class="text-xs w-4 text-center shrink-0" :style="{ color: iconColor }"></i>
        <span class="text-xs font-semibold text-slate-700 tracking-wide">{{ title }}</span>
        <!-- Action slot (e.g. clear button) — stop propagation so click doesn't toggle -->
        <span class="ml-auto flex items-center" @click.stop>
          <slot name="action" />
        </span>
      </div>
      <i class="fa-solid fa-chevron-down text-[9px] text-slate-400 transition-transform duration-200 ml-2 shrink-0" :class="open ? 'rotate-180' : ''"></i>
    </button>
    <div v-show="open" class="px-4 pb-3">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: 'fa-solid fa-circle-info' },
  iconColor: { type: String, default: '#64748b' },
  defaultOpen: { type: Boolean, default: true },
});

const open = ref(props.defaultOpen);
</script>
