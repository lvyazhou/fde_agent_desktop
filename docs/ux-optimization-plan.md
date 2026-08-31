# 沧澜 AgentOS — 项目流程 UX 优化设计文档

> 📅 2026-06-02 生成 | 供 06-03 实施参考

---

## 一、当前问题诊断

### 1.1 流程引导缺失

**现状**：5 个 Tab 平铺展示，无步骤编号、无进度条、无完成状态标记。

**用户困惑**：
- 第一次进来不知道先做什么
- "需求对话"和"迭代修改"长得几乎一样，分不清区别
- 不知道哪些步骤已完成、当前该做什么

### 1.2 "智能对话"与"需求对话"概念重复

**现状**：顶部导航有 AgentHome（"智能对话"），项目里又有"需求对话" Tab，两个都是 AI 聊天界面。

**用户困惑**：我在哪里聊？区别是什么？

### 1.3 迭代 Tab 侧边栏无用

**现状**：迭代修改的左侧会话列表只有一个静态 "当前对话"，无导航功能。

**浪费**：220px 宽度的空白面板。

### 1.4 生成过程中 Tab 跳转突兀

**现状**：点"生成功能清单"→ 自动切到"需求对话"看 AI 工作 → 完成后又跳回"功能清单"。

**体验**：用户没点 Tab 但 Tab 自己在跳，失去控制感。

### 1.5 导出 Tab 内容单薄

**现状**：3 张卡片 + 几个按钮，独占一个 Tab 不够内容感。

---

## 二、优化设计方案

### 2.1 Tab 栏改为"步骤进度条"风格

**目标**：让用户一眼看出流程、当前位置、完成状态。

#### 视觉设计

```
  ① 需求对话    ──>    ② 功能清单    ──>    ③ 原型预览    ──>    ④ 迭代优化    ──>    ⑤ 导出
  [✓ 已完成]          [✓ 已完成]          [● 当前]             [ 未开始]           [ 未开始]
```

#### 实现要点

- Tab 前加数字编号（①②③④⑤）
- 根据项目状态动态显示完成标记：
  - ✓ 绿色勾 = 该步骤已有产出（有对话记录 / 有 spec.md / 有 prototype 文件）
  - ● 蓝色圆点 = 当前 Tab
  - ○ 灰色 = 未开始
- Tab 之间加连接线（CSS `border-bottom` 或伪元素箭头）
- 已完成的 Tab label 可以加淡绿背景

#### 状态判断逻辑

```javascript
const tabStates = computed(() => ({
  requirement: messages.value.length > 0 ? 'done' : 'empty',
  spec: specContent.value ? 'done' : 'empty',
  prototype: prototypeFiles.value.length > 0 ? 'done' : 'empty',
  iterate: iterateMessages.value.length > 0 ? 'done' : 'empty',
  export: 'always', // 始终可用
}));
```

---

### 2.2 迭代 Tab 布局优化

**改为两栏**：去掉左侧无用的会话列表，改为 `[聊天区 | 原型预览]` 并排。

#### 布局

```
┌─────────────────────────┬──────────────────────────┐
│                         │                          │
│    迭代对话区            │    原型实时预览 (iframe)  │
│    (和用户交流修改意图)    │    (每次迭代后自动刷新)    │
│                         │                          │
│  ┌─────────────────┐    │                          │
│  │ 输入修改指令...   │    │                          │
│  └─────────────────┘    │                          │
└─────────────────────────┴──────────────────────────┘
```

**好处**：
- 左右对照，改完立即看到效果
- 不用在"迭代修改"和"原型预览"两个 Tab 之间来回切
- 去掉了无意义的侧边栏

#### 实现要点

- 去掉 `showSessionPanel` 在 iterate 模式下的渲染
- 右侧复用 prototype 的 iframe 逻辑 + `iframeKey` 刷新
- 比例建议：50% / 50% 或可拖拽分割线

---

### 2.3 "需求对话" Tab 优化

#### 去掉左侧会话列表（或改为可折叠默认隐藏）

当前左侧 220px 的"会话列表"只是显示用户消息摘要，实际导航价值低。建议：
- **默认隐藏**，只保留浮动按钮唤出
- 或直接去掉，聊天区占满宽度

#### Agent Logs 面板改为底部抽屉

当前右侧 280px 的日志面板常态显示，挤压了聊天区宽度。建议：
- 改为底部可拉伸抽屉（类似 Chrome DevTools），默认收起
- 或改为浮动面板 + 一个"查看日志"按钮触发

---

### 2.4 功能清单 Tab 增加引导和操作闭环

#### 空状态优化

当前空状态只有一个"生成功能清单"按钮。改为更有引导性的空状态：

```
┌─────────────────────────────────────────────────┐
│                                                 │
│         📋 功能清单尚未生成                       │
│                                                 │
│   AI 将根据你的需求对话，自动生成结构化的           │
│   产品功能清单（包含模块、功能点、优先级）           │
│                                                 │
│   前置条件：先在"需求对话"中描述你的产品需求        │
│                                                 │
│        [ 🚀 一键生成功能清单 ]                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### 生成过程不跳 Tab

当前点"生成功能清单"会跳到需求对话 Tab。改为：
- **在当前 Tab 内显示生成进度**（底部进度条 + thinking 步骤展开）
- 或弹出一个半透明遮罩层显示"AI 正在生成..."
- 不切换 Tab

---

### 2.5 原型预览 Tab 优化

#### 文件树与预览的比例

当前文件树固定 220px，且只显示文件名。优化建议：
- 文件树缩窄为 180px
- 支持文件夹折叠（如果原型有子目录）
- 选中文件高亮更明显（当前只是 `bg-blue-50`，改为左侧蓝色竖线）

#### 预览区增加工具栏

- 当前页面路径显示（面包屑）
- 刷新按钮
- 缩放控制（50% / 75% / 100%）
- 响应式切换（Desktop / Tablet / Mobile 宽度模拟）

---

### 2.6 导出 Tab 合并到工具栏

**激进方案**：导出不需要独立 Tab，改为每个 Tab 顶部工具栏的操作按钮：
- "功能清单" Tab 已经有导出 .md / .docx 按钮 ✓
- "原型预览" Tab 加"导出 ZIP"按钮
- 项目标题栏加"一键导出全部"按钮

**保守方案**：保留导出 Tab，但丰富内容：
- 增加导出预览（功能清单摘要 + 原型截图缩略图）
- 增加分享功能（生成分享链接、二维码）
- 增加版本历史（如果有多次迭代）

---

### 2.7 顶部"智能对话"入口定位调整

**建议**：将 AgentHome 定位为"快速对话 / 头脑风暴"，项目内的"需求对话"定位为"项目级需求细化"。

- AgentHome 顶部加一个"将对话转为项目"按钮
- 进入项目后，隐藏顶部"智能对话"导航高亮，让用户聚焦在项目流程中

---

## 三、实施优先级

| 优先级 | 改动项 | 工作量 | 效果 |
|--------|--------|--------|------|
| P0 | Tab 加步骤编号 + 完成状态标记 | 0.5h | 立刻有流程感 |
| P0 | 超时/中断修复（已完成） | - | 基础体验保障 |
| P1 | 迭代 Tab 改两栏（聊天+预览并排） | 2h | 核心流程体验大提升 |
| P1 | 生成时不跳 Tab，当前 Tab 内显示进度 | 1h | 避免突兀跳转 |
| P2 | 需求对话去掉/折叠左侧会话列表 | 0.5h | 聊天区更宽敞 |
| P2 | Agent Logs 改为底部抽屉或浮动面板 | 1.5h | 减少视觉干扰 |
| P2 | 原型预览加缩放和响应式模拟 | 1h | 预览体验提升 |
| P3 | 导出 Tab 丰富内容或合并到工具栏 | 1h | 完整性 |
| P3 | "智能对话"与项目关系梳理 | 1h | 概念清晰度 |

---

## 四、视觉参考

### 4.1 步骤进度条 Mock

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← 返回    我的电商系统                                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ① 需求对话     ②  功能清单     ③ 原型预览     ④ 迭代优化     ⑤ 导出     │
│  ──✓──────────>──✓──────────>──●──────────>──○──────────>──○──         │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        [ 当前 Tab 内容区 ]                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 迭代 Tab 两栏 Mock

```
┌────────────────────────────┬─────────────────────────────────┐
│                            │                                 │
│  🤖 好的，我来把导航改成     │  ┌─────────────────────────┐   │
│  左侧栏样式...              │  │                         │   │
│                            │  │    原型 iframe 预览       │   │
│  ✅ Write sidebar.html     │  │                         │   │
│  ✅ Update styles.css      │  │   （实时刷新）            │   │
│                            │  │                         │   │
│  已完成！导航栏改为左侧了    │  └─────────────────────────┘   │
│                            │                                 │
│ ┌────────────────────────┐ │                                 │
│ │ 把颜色改成深色主题...    │ │                                 │
│ └────────────────────────┘ │                                 │
└────────────────────────────┴─────────────────────────────────┘
```

---

## 五、技术实现备注

### 5.1 步骤状态计算

在 `ProjectDetail.vue` script 中新增：

```javascript
const tabStepStates = computed(() => {
  const hasChat = messages.value.some(m => m.role === 'user');
  const hasSpec = !!specContent.value;
  const hasPrototype = prototypeFiles.value.length > 0;
  const hasIterate = iterateMessages.value.some(m => m.role === 'user');

  return {
    requirement: hasChat ? 'completed' : 'empty',
    spec: hasSpec ? 'completed' : 'empty',
    prototype: hasPrototype ? 'completed' : 'empty',
    iterate: hasIterate ? 'completed' : 'empty',
    export: 'available',
  };
});
```

### 5.2 Tab 栏改造（当前 → 优化后）

**当前代码位置**：`ProjectDetail.vue` lines 30-44

**当前**：
```html
<button v-for="tab in tabs" ...>
  <i :class="tab.icon"></i> {{ tab.label }}
</button>
```

**优化后**：
```html
<div class="flex items-center gap-0">
  <template v-for="(tab, index) in tabs" :key="tab.key">
    <!-- 步骤按钮 -->
    <button @click="activeTab = tab.key" class="flex items-center gap-2 px-4 py-2.5 ...">
      <!-- 步骤编号圆圈 -->
      <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs"
            :class="stepCircleClass(tab.key, index)">
        <i v-if="tabStepStates[tab.key] === 'completed'" class="fa-solid fa-check text-[10px]"></i>
        <span v-else>{{ index + 1 }}</span>
      </span>
      <span>{{ tab.label }}</span>
    </button>
    <!-- 连接线 -->
    <div v-if="index < tabs.length - 1" class="w-6 h-px bg-slate-300"></div>
  </template>
</div>
```

```javascript
const stepCircleClass = (key, index) => {
  if (activeTab.value === key) return 'bg-blue-600 text-white';
  if (tabStepStates.value[key] === 'completed') return 'bg-green-100 text-green-600 border border-green-300';
  return 'bg-slate-100 text-slate-400 border border-slate-300';
};
```

### 5.3 迭代 Tab 两栏布局改造

**当前**（三栏）：`[Session Panel 220px | Chat flex-1 | Logs 280px]`

**改为**（两栏）：`[Chat 50% | Prototype Preview 50%]`

```html
<!-- iterate tab -->
<div v-else-if="activeTab === 'iterate'" class="flex-1 flex min-h-0">
  <!-- 左：迭代对话 -->
  <div class="w-1/2 flex flex-col border-r border-slate-200">
    <!-- 消息列表 + 输入框（复用现有逻辑）-->
  </div>
  <!-- 右：原型实时预览 -->
  <div class="w-1/2 flex flex-col">
    <div class="h-10 border-b flex items-center px-4 text-sm text-slate-500">
      <i class="fa-solid fa-eye mr-2"></i> 实时预览
      <button @click="iframeKey++" class="ml-auto text-slate-400 hover:text-slate-600">
        <i class="fa-solid fa-rotate"></i>
      </button>
    </div>
    <iframe :key="iframeKey" :src="iframeSrc" class="flex-1 w-full" sandbox="allow-scripts"></iframe>
  </div>
</div>
```

---

## 六、不改的部分（保持现状）

- 顶部全局导航栏结构不变
- 项目列表页面布局不变
- 项目创建页面不变
- AgentHome 三栏布局不变（那是独立的自由聊天场景）
- 设置页不变

---

## 七、改完后的验证清单

- [ ] 新建项目后进入，Tab 栏有步骤编号和连接线
- [ ] 进行需求对话后，① 显示绿色 ✓
- [ ] 生成功能清单后，② 显示绿色 ✓
- [ ] 点"生成功能清单"时不跳 Tab
- [ ] 迭代修改是左右两栏：对话 + 预览
- [ ] 迭代一次后，右侧 iframe 自动刷新
- [ ] 各 Tab 切换流畅，无白屏
