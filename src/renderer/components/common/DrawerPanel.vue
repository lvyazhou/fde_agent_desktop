<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="fixed inset-0 z-50 flex" :class="placement === 'left' ? 'justify-start' : 'justify-end'">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
          @click="$emit('close')"
        />
        <!-- Panel -->
        <div
          class="bg-white h-full shadow-2xl relative z-50 flex flex-col transition-transform duration-300"
          :class="[placement === 'left' ? 'border-r border-slate-200' : 'border-l border-slate-200', panelClass]"
          :style="{ width: width, '--drawer-translate-x': placement === 'left' ? '-100%' : '100%' }"
        >
          <!-- Header -->
          <div class="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <slot name="header-icon">
                <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <i class="fa-solid fa-sliders"></i>
                </div>
              </slot>
              <div class="min-w-0">
                <h2 class="font-bold text-slate-800 text-base leading-tight truncate">{{ title }}</h2>
                <div v-if="subtitle" class="text-[10px] text-slate-500 font-mono truncate">{{ subtitle }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <slot name="header-actions" />
              <button
                class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
                @click="$emit('close')"
              >
                <i class="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
          </div>

          <!-- Tabs (optional) -->
          <div v-if="$slots.tabs" class="px-6 border-b border-slate-200 bg-slate-50 flex gap-6 shrink-0">
            <slot name="tabs" />
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
            <slot />
          </div>

          <!-- Footer (optional) -->
          <div v-if="$slots.footer" class="px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  width: { type: String, default: '600px' },
  panelClass: { type: String, default: '' },
  placement: {
    type: String,
    default: 'right',
    validator: (value) => ['left', 'right'].includes(value),
  },
});
const placement = props.placement;
defineEmits(['close']);
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
}
.drawer-enter-active > div:last-child,
.drawer-leave-active > div:last-child {
  transition: transform 0.3s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from > div:last-child {
  transform: translateX(var(--drawer-translate-x, 100%));
}
.drawer-leave-to > div:last-child {
  transform: translateX(var(--drawer-translate-x, 100%));
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
