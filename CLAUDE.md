# product-lobster-desktop

Hermes agent 桌面版（Electron + Vue 3 + Vite）。前端在 `src/renderer`，主进程 `src/main/index.js`，预加载 `src/preload/index.js`。

## 构建 / 验证

- 只构建渲染层（最快验证前端改动是否编译通过）：`npx vite build --config vite.config.js`
- 完整打包：`npm run build`（win）/ `npm run build:mac`

## 原型（Prototype）预览 —— 项目详情页

阶段②/③ 的「原型」tab。核心文件：[ProjectDetail.vue](src/renderer/pages/projects/ProjectDetail.vue)。

**数据流**：
- 主进程 `hermes:list-files`（[src/main/index.js](src/main/index.js) 约 2181 行）递归列出 `prototype/` 目录下全部文件，返回 `{ name, isDirectory, relPath, path }`，`relPath` 相对 prototype 目录。调用需传 `recursive: true`。
- preload：`window.api.hermes.listFiles(slug, dir, recursive)`。
- 预览地址走本地静态服务 `hermes:prototype-url`（不是 file://，否则原型页 `fetch('data/*.json')` 被拦截、数据空白）。

**渲染约定（ProjectDetail.vue）**：
- `refreshPrototypeFiles()`：拉全部产物（不再只保留 `.html`），每项带 `rel`（=relPath）。加载后**默认折叠所有文件夹**（`collapsedDirs` 填入所有目录前缀）。默认选中顶层第一个 html。
- 文件列表是**真正的文件夹树**：`fileTreeRows` computed 把扁平列表建成嵌套树，再按 `collapsedDirs` 折叠状态摊平成可见行；每层文件夹在前、文件在后，各自按名排序。`toggleDir(path)` 折叠/展开。
- 选中文件预览：html → iframe（`isHtmlSelected`），其余（js/json/css…）→ 深色只读源码视图（`fileSource`）。
- iframe 预览带**缩放控件**（`previewZoom` 0.5~1.5，CSS transform，只缩放视觉、不改原型文件）。原型本身字号偏大是生成侧（原型生成 skill）的规范问题，桌面端只能靠缩放缓解。
- 文件图标按扩展名着色：`fileIcon(rel)`。
