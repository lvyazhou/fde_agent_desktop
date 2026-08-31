<template>
  <div class="window-controls flex items-center h-full">
    <button @click="minimize" class="control-btn hover:bg-gray-200">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 6H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
    <button @click="maximize" class="control-btn hover:bg-gray-200">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 2.5H9.5V9.5H2.5V2.5Z" stroke="currentColor" stroke-width="1.5"/>
      </svg>
    </button>
    <button @click="close" class="control-btn hover:bg-red-500 hover:text-white">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { useWindowState } from '@/lib/window-state';

const { minimize, maximize, close } = useWindowState();
</script>

<style scoped>
.control-btn {
  width: 48px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  -webkit-app-region: no-drag;
}
</style>
