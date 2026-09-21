import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/tailwind.css';
import { installAndroidBridge } from './platform/bridge.js';
import { initTheme } from './composables/useTheme.js';

// 平台桥接:
// - 桌面(Electron):preload 已把 window.api 注入好,跳过。
// - 安卓(Capacitor)/纯浏览器:没有 preload,用 HTTP/SSE 网关桥接层补上 window.api。
// 判定:window.api 不存在即视为非 Electron 环境。
if (!window.api) {
  installAndroidBridge();
}

// 挂载前套用已保存的主题，避免首帧用默认色再跳变
initTheme();

createApp(App).use(router).mount('#app');


