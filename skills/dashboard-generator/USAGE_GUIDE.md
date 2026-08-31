# Dashboard Generator 技能使用说明书

**Dashboard Generator** 是一款专为 AI Agent（如 Roo Code / Claude / Cursor）设计的强大技能包，能让 AI 根据单句提示词（One-Prompt）快速生成高质量、多风格的 React 或 HTML 数据可视化大屏（驾驶舱）。

---

## 🌟 核心特性

1. **一句话生成 (One-Prompt Generation)**：只需输入类似"生成一个销售数据大屏"或"我要一个天津市GDP分析看板"，AI 即可自动脑补业务指标、图表维度、筛选条件，并输出完整代码。
2. **双端输出支持**：
   - **Mode 1: React 项目 (默认)** - 输出基于 React + Ant Design + echarts-for-react 的工程化组件。
   - **Mode 2: 纯 HTML (适合 AI 预览)** - 输出单文件 HTML（内置 CSS/JS、CDN 引入 ECharts），开箱即用。
3. **四大主题预设**：
   - ⚡ **Cyber (赛博朋克)**：深色背景、青色/紫色霓虹发光、扫描线、网格叠加。
   - 💼 **Business (商务风格)**：深蓝底色、金色辅助色、克制的 UI、无光污染。
   - 🍃 **Simple (简约风格)**：石板灰背景、扁平蓝辅助色、圆角卡片、去科技边框。
   - 🏛️ **GDP (宏观经济)**：专属梯形 Header、独立筛选栏、适合政务/经济指标的专有布局。
4. **四大核心交互 (开箱即带)**：
   - ① **一键全屏**功能
   - ② 自定义的**多维度下拉筛选器**（且会触发全局 Loading）
   - ③ **核心 KPI 点击联动**（带涟漪动效，点击后同步更新下方趋势图）
   - ④ **卡片内多维 Tab 切换**（在同一个卡片内切换图表数据）

---

## 📂 模板资产说明 (`assets/boilerplate/`)

所有的模板均包含配套的 `.js` 和 `.css`（React）或融合在 `.html`（Vanilla）中。

| 主题名称 | React 模板文件名 | Vanilla HTML 模板文件名 | 适用场景 | 触发关键词 |
| --- | --- | --- | --- | --- |
| **赛博朋克 (Cyber)** | `DashboardTemplate` | `vanilla-html-dashboard.html` | IT、大模型、网络安全、科技感驾驶舱 | 默认使用 |
| **商务风格 (Business)**| `BusinessDashboardTemplate` | `business-html-dashboard.html` | 销售、运营、金融、股市、公司级分析 | “商务”、“Corporate”、“高级” |
| **简约风格 (Simple)** | `SimpleDashboardTemplate` | `simple-html-dashboard.html` | 极简数据呈现、汇报 PPT 级图表、无边框 | “简约”、“简单”、“极简” |
| **宏观经济 (GDP)** | `GdpDashboardTemplate` | `gdp-html-dashboard.html` | 政府大屏、区域经济、人口、产业结构分析 | “GDP”、“经济”、“政务” |

> **提示**：React 模板使用了特定的 CSS 前缀（如 `.biz-`, `.simple-`, `.gdp-`）以确保在大型前端工程中不会发生样式冲突。

---

## 🛠️ 如何使用本技能？

只需在对话框中给 AI 发送包含明确**业务意图**和**样式倾向**的提示词。

### 示例 1：默认科技风 React 组件
> "请帮我生成一个**服务器性能监控大屏**的 React 组件，需要包含 CPU、内存、网络 IO 和磁盘状态。图表要用到雷达图和双轴图。"
> 
> *AI 行为*：将自动调用 `DashboardTemplate.js/css`，生成赛博朋克风格的监控看板。

### 示例 2：纯 HTML 商务风导出
> "请生成一个单 HTML 文件的**全球黄金市场分析看板**。要求风格是**商务风**，不要太花哨，指标包含实时金价、交易量和 ETF 持仓。"
> 
> *AI 行为*：将读取 `business-html-dashboard.html` 并内联所有 ECharts 逻辑，输出可直接双击用浏览器打开的高级金色/深蓝主题大屏。

### 示例 3：指定宏观经济风
> "需要一个**天津市河西区GDP经济分析大屏**（React 版本）。指标要有第三产业占比和固定资产投资。"
> 
> *AI 行为*：触发 `GdpDashboardTemplate` 拦截器，使用带有政务风格梯形头部和专有宏观经济布局（独立筛选行、双轴趋势图）的样板。

---

## 🔧 给前端开发者的接入指南（React）

当你拿到 AI 生成的 React 代码后，按以下步骤整合进你的工程：

1. **安装依赖**：
   ```bash
   npm install react echarts echarts-for-react antd dayjs axios
   ```
2. **文件放置**：将 AI 生成的 `XxxDashboard.js` 和 `XxxDashboard.css`（以及拆分的 `XxxUtils.js` 如果有）放入同一个目录。
3. **替换 Mock 数据**：
   在组件中搜索 `// TODO: Replace with Real API Call`。
   AI 生成的代码通常会有一个 `fetchData` 函数，内部使用 `setTimeout` 模拟网络请求。你只需将这部分替换为真实的 axios/fetch 调用，并将响应的真实数据设置给相应的 React State 即可。
4. **全屏兼容**：
   模板内置了 `requestFullscreen` 逻辑，请确保挂载大屏的父容器没有 `overflow: hidden` 限制，否则可能会影响原生全屏的呈现效果。