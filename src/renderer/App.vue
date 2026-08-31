<template>
  <RouterView />

  <!-- Global Toast Notifications -->
  <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3" style="zoom: 1 !important;">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id"
           @click="handleToastClick(toast)"
           class="bg-white rounded-xl shadow-xl border border-slate-100 p-4 w-80 flex items-start gap-3 transform transition-all relative overflow-hidden cursor-pointer hover:bg-slate-50">
        <div class="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        <div class="mt-0.5 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
          <i class="fa-solid fa-bell text-blue-500"></i>
        </div>
        <div class="flex-1 min-w-0 pointer-events-none">
          <h4 class="text-slate-800 font-bold text-sm truncate">{{ toast.title }}</h4>
          <p class="text-slate-500 text-xs mt-1.5 line-clamp-3 leading-relaxed">{{ toast.message }}</p>
        </div>
        <button @click.stop="removeToast(toast.id)" class="text-slate-400 hover:text-slate-600 transition-colors p-1">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const toasts = ref([])
let toastId = 0

const addToast = (title, message, payload) => {
  const id = toastId++
  toasts.value.push({ id, title, message, payload })
  setTimeout(() => {
    removeToast(id)
  }, 15000) // auto close after 15s
}

const handleToastClick = (toast) => {
  if (toast.payload && toast.payload.session_id) {
    // Navigate to chat page and open the specific session
    router.push({ path: '/chat', hash: `#session=${toast.payload.session_id}` })
  }
  removeToast(toast.id)
}

const removeToast = (id) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

const adjustZoom = () => {
  // 设定设计稿基准宽度，比如 1440
  const baseWidth = 1440
  // 计算缩放比例
  let zoom = window.innerWidth / baseWidth
  
  // 限制缩放比例范围
  if (zoom > 1) zoom = 1
  if (zoom < 0.6) zoom = 0.6

  // 使用 document.body.style.zoom 缩放页面
  document.body.style.zoom = zoom
}

let removeNotifyListener = null

onMounted(() => {
  adjustZoom()
  window.addEventListener('resize', adjustZoom)
  
  if (window.api?.app?.onNotify) {
    removeNotifyListener = window.api.app.onNotify((payload) => {
      addToast(payload.title, payload.message, payload)
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', adjustZoom)
  if (removeNotifyListener) removeNotifyListener()
})
</script>

<style>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(120%);
}
.toast-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
