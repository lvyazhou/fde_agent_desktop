import { ref } from 'vue';

// 两套主题：blue = 蓝色玻璃（默认），brown = 暖棕磨砂。
// 实现方式是给 <html> 打 data-theme，CSS 侧只覆盖变量，组件无需改动。
const THEMES = ['blue', 'brown'];
const STORAGE_KEY = 'fde-theme';

const theme = ref(readStored());

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(v) ? v : 'blue';
  } catch {
    return 'blue';
  }
}

function apply(next) {
  // 蓝色是默认态，不打属性；棕色才加，这样 :root 的默认值天然生效
  if (next === 'blue') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', next);
}

export function setTheme(next) {
  if (!THEMES.includes(next)) return;
  theme.value = next;
  apply(next);
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* 隐私模式下忽略 */ }
}

// 启动时立刻套用，避免首帧闪烁
export function initTheme() {
  apply(theme.value);
}

export function useTheme() {
  return { theme, setTheme, themes: THEMES };
}
