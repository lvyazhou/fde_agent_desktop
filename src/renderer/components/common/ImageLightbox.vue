<template>
  <transition name="lb-fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 select-none"
      @click.self="close"
      @wheel.prevent="onWheel"
    >
      <!-- Image -->
      <img
        v-if="src"
        :src="src"
        class="max-w-none will-change-transform"
        :style="imgStyle"
        draggable="false"
        @mousedown.prevent="onDown"
        @dblclick="reset"
      />

      <!-- Close button -->
      <button
        type="button"
        class="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        title="关闭 (Esc)"
        @click="close"
      >
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>

      <!-- Zoom controls -->
      <div
        class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/10 backdrop-blur-sm"
        @click.stop
      >
        <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer" title="缩小" @click="zoomBy(-0.25)">
          <i class="fa-solid fa-magnifying-glass-minus text-sm"></i>
        </button>
        <span class="text-white text-[12px] font-medium w-14 text-center tabular-nums">{{ Math.round(scale * 100) }}%</span>
        <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer" title="放大" @click="zoomBy(0.25)">
          <i class="fa-solid fa-magnifying-glass-plus text-sm"></i>
        </button>
        <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer" title="复位" @click="reset">
          <i class="fa-solid fa-arrows-rotate text-sm"></i>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';

const props = defineProps({
  src: { type: String, default: '' },
  visible: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const MIN = 0.2;
const MAX = 8;
const scale = ref(1);
const tx = ref(0);
const ty = ref(0);

const dragging = ref(false);
let startX = 0;
let startY = 0;
let startTx = 0;
let startTy = 0;

const imgStyle = computed(() => ({
  transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
  transition: dragging.value ? 'none' : 'transform 0.12s ease-out',
  cursor: scale.value > 1 ? (dragging.value ? 'grabbing' : 'grab') : 'default',
  maxWidth: '90vw',
  maxHeight: '90vh',
}));

function clampScale(v) {
  return Math.min(MAX, Math.max(MIN, v));
}

function zoomBy(delta) {
  scale.value = clampScale(scale.value + delta);
  if (scale.value <= 1) {
    tx.value = 0;
    ty.value = 0;
  }
}

function onWheel(e) {
  zoomBy(e.deltaY < 0 ? 0.2 : -0.2);
}

function reset() {
  scale.value = 1;
  tx.value = 0;
  ty.value = 0;
}

function onDown(e) {
  if (scale.value <= 1) return;
  dragging.value = true;
  startX = e.clientX;
  startY = e.clientY;
  startTx = tx.value;
  startTy = ty.value;
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function onMove(e) {
  if (!dragging.value) return;
  tx.value = startTx + (e.clientX - startX);
  ty.value = startTy + (e.clientY - startY);
}

function onUp() {
  dragging.value = false;
  window.removeEventListener('mousemove', onMove);
  window.removeEventListener('mouseup', onUp);
}

function close() {
  emit('close');
}

function onKey(e) {
  if (e.key === 'Escape') close();
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      reset();
      window.addEventListener('keydown', onKey);
    } else {
      window.removeEventListener('keydown', onKey);
      onUp();
    }
  }
);

onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  onUp();
});
</script>

<style scoped>
.lb-fade-enter-active,
.lb-fade-leave-active {
  transition: opacity 0.18s ease;
}
.lb-fade-enter-from,
.lb-fade-leave-to {
  opacity: 0;
}
</style>
