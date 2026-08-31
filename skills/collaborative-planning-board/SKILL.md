---
name: collaborative-planning-board
description: Use when the user wants to collaboratively design, plan, or think through a topic using a visual interactive board. Triggers on "协作面板", "规划面板", "一起设计", "做个面板讨论", "planning board", "collaborative board", or when the user says they want to think through / plan something together in a structured visual way (not just text).
---

# 协作规划面板生成技能

生成一个交互式 HTML 协作面板页面，用于和用户一起结构化地思考和规划某个主题。兼具 PPT 的美观、文档的详实、图表的直观，并支持标注讨论。

## 核心价值

- 比 PPT 更详实（可以包含完整分析内容）
- 比 Markdown 更美观（有布局、配色、图表）
- 比 Word 更交互（可标注讨论、状态追踪、导出）
- 适合和用户逐节讨论迭代，不是一次性交付

## 触发场景

- 用户说"帮我做一个面板来讨论/规划 XX"
- 用户说"我们一起设计 XX，用上次那种面板"
- 用户想结构化地梳理某个复杂主题（产品规划、架构设计、方案对比等）
- 用户说"做个协作面板"或"planning board"

## 生成流程

### 1. 理解主题和结构

先和用户确认：
- **主题是什么**：要讨论/规划什么
- **有几个大模块**：通常 3-5 个章节
- **每个模块的核心内容**：要点、对比、图表需求
- **是否有特殊视角/维度**：比如多角色分析、正反对比等

### 2. 生成单文件 HTML

技术栈（全 CDN，零构建）：
- Tailwind CSS — 布局和工具类
- Vue 3 Global Build — 响应式交互
- ECharts 5 — 图表（按需，不是每个面板都要）
- Font Awesome 6 — 图标
- LocalStorage — 标注持久化

### 3. 必须包含的功能

每个面板都必须有：

1. **Header 栏** — 标题 + 保存状态 + 导出按钮 + 打印按钮
2. **左侧树形导航** — 可点击滚动到对应章节，IntersectionObserver 同步高亮
3. **右侧内容区** — 章节卡片，每个卡片支持标注
4. **标注/讨论系统** —
   - 每个卡片右上角评论按钮 + 数量badge
   - 右侧滑出标注面板
   - 支持添加、回复、标记解决、删除
   - LocalStorage 持久化
   - 导出为 Markdown
5. **章节状态追踪** — 未开始/讨论中/已达成/有挑战 四色状态
6. **Print CSS** — 打印时隐藏侧边栏和交互元素

### 4. 内容卡片类型（按需使用）

- **对比表** — 两列或多列对比（如新旧方案、选项A vs B）
- **流程图** — 用 flex/grid + 箭头图标做简单流程
- **Hub图** — 中心辐射型（如核心概念 + 多个支柱）
- **四象限矩阵** — ECharts scatter 图（如优先级矩阵）
- **时间线** — 纵向时间线（如路线图）
- **分类卡片网格** — 2x2 或 2x3 grid 展示分类信息
- **高亮提示框** — 不同颜色的 callout（信息/警告/成功/错误）
- **问答卡片** — 问题 + 展开回答

### 5. 文件存放位置

默认放在当前工作目录下，文件名用 kebab-case：
- 如 `agent-planning-board.html`
- 如 `product-architecture-board.html`
- 如 `market-analysis-board.html`

如果当前项目有专用的静态页面目录（如 `frontend-test/`、`public/`、`static/`），优先放在那里。否则放在工作目录根下或用户指定的位置。

## 设计原则

1. **内容第一** — 先把内容结构想清楚，再考虑美化
2. **渐进细化** — 先生成骨架和核心内容，后续可以逐节深入
3. **对话友好** — 面板生成后，用户可以说"帮我修改 B.2 那节"或"在 C 部分加一个新卡片"
4. **中文为主** — 内容中文，技术术语保留英文
5. **配色和谐** — 每个大章节一个渐变主色，内部卡片用统一的灰底白卡风格

## 配色参考

章节标题圆圈：
- 第1章：蓝→青 (from-blue-500 to-cyan-500)
- 第2章：紫→粉 (from-purple-500 to-pink-500)
- 第3章：琥珀→橙 (from-amber-500 to-orange-500)
- 第4章：玫瑰→粉 (from-rose-500 to-pink-500)
- 第5章：绿→青 (from-emerald-500 to-teal-500)

状态色：
- 未开始：slate-400
- 讨论中：amber-500
- 已达成：emerald-500
- 有挑战：red-500

## 迭代模式

面板生成后进入迭代模式：
- 用户可以对任何章节提问题、提建议
- Claude 根据讨论内容更新对应的卡片
- 如果讨论产生了新的 insight，可以直接加到面板里
- QA 模块可以持续追加新的关键问答
