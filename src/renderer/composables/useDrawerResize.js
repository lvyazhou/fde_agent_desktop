import { ref, onUnmounted } from 'vue';

// 右侧抽屉拖拽改宽度。key 用于按页面分别记住用户拉过的宽度。
export function useDrawerResize(key, defaultWidth = 640, minWidth = 420) {
  const maxWidth = () => Math.max(minWidth, window.innerWidth - 120);
  const clamp = (w) => Math.min(Math.max(w, minWidth), maxWidth());

  const width = ref(clamp(Number(localStorage.getItem(key)) || defaultWidth));
  const resizing = ref(false);

  const onMove = (e) => { width.value = clamp(window.innerWidth - e.clientX); };

  const stopResize = () => {
    if (!resizing.value) return;
    resizing.value = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    localStorage.setItem(key, String(Math.round(width.value)));
  };

  const startResize = () => {
    resizing.value = true;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', stopResize);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  onUnmounted(stopResize);

  return { width, resizing, startResize };
}
