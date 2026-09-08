---
name: prototype-generator
description: "Use when user says 生成原型/做原型/出原型/设计原型/画原型/产品原型/AI产品原型/智能体产品/做个demo/做个页面/prototype/做系统原型. Accepts ANY input (sentence, doc, image, requirements). This is an AI-PRODUCT prototype designer: every prototype it generates is an agent product by default — with an agent-tools workbench page, LOOP drawers, streaming chat, AI-reasoning displays and proactive alerts baked in, not bolted on. Output: multi-page HTML + JS + data/ directory, ready to open in browser or package with Electron."
---

# Prototype Generator（AI 产品原型设计器）

## Overview

根据**任意形式的输入**，设计并生成一个**AI 智能体产品**的高保真可交互原型。

**这个技能已经进化了：它默认产出的不是普通管理系统，而是 AI 产品。** 每一个原型天生就"长在智能体下面"——用户在每一页都看得见背后有一群智能体在感知、研判、生成、推送。智能体能力不是"AI 产品才加的可选项"，而是这个技能的**基本盘、主线**。除非用户明确说"只要个纯展示页/纯表格系统、别加 AI"，否则默认按 AI 产品来做。

**每个原型默认自带（主线，不是附加项）：**
- **智能体工具页** `agent-tools.html`——产品有哪些智能体能力的总入口（三栏工作台，铁律必带）
- **LOOP 抽屉**——智能动作（扫描/生成/研判）点击后流式演"感知→判断→调工具→产出"
- **流式对话 + 在线态**——AI 回答逐字打印，顶部"● 智能体在线"
- **AI 判断依据展示**——凡结论/排序/预警都附"为什么"，不做黑盒
- **主动推送 / 告警**——智能体主动冒出来找人，不干等提问
- **智能体头像** `image/bot.png` + 平台 logo `image/icon.png`

**同时它仍是高保真原型**，所以也包含：
- 多页面 HTML（含导航跳转）
- Alpine.js 驱动的真实交互（按钮点击有状态流转、表格可筛选排序、图表可点击下钻）
- ECharts 图表（真实渲染，非截图）
- 真实 mock 数据（`data/*.json`）
- 统一设计语言（360 安全云企业级 BI 风格）

> 详见下方**「智能体产品必备元素」**章节——那是这个技能的灵魂，先读它再动手。

---

## When to Use

- 用户说：生成原型、做原型、出原型、设计原型、画原型、做个 demo、做系统原型、出个可交互的页面
- 用户说：做 AI 产品原型、做智能体产品、做个 AI 系统、给这个产品加 AI 能力
- 用户提供了产品功能清单/需求文档，要求出原型
- 用户给了一句话产品概念，要求做可视化演示

> **默认按 AI 产品做**：不管用户有没有明说"AI"，只要是做一个业务系统原型，都默认把它设计成智能体产品（带 agent-tools 页 + LOOP + 流式 + AI 依据 + 主动推送）。这是这个技能进化后的默认行为。

## When NOT to Use

- 用户**明确**说"别加 AI/只要纯展示页/只要纯表格系统"——这时才退化成普通原型
- 用户要的是正式 Vue3 生产代码（用 `vben-page-generator` 系列）
- 用户只要功能清单文档不要原型（用 `product-feature-spec`）
- 用户要的是大屏可视化（单页大屏，非多页系统）

---

## 技术栈（锁定，不可替换）

| 依赖 | 版本 | CDN |
|------|------|-----|
| TailwindCSS | CDN（无配置文件） | `https://cdn.tailwindcss.com` |
| Alpine.js | **3.13.0**（pinned） | `https://cdn.jsdelivr.net/npm/alpinejs@3.13.0/dist/cdn.min.js` |
| ECharts | **5.4.3** | `https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js` |
| Font Awesome | **6.4.0**（仅 Solid） | `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css` |

---

## 输出目录结构

```
<product-name>-demo/
├── index.html              首页/总览（驾驶舱）
├── <module-1>.html         业务模块页
├── <module-2>.html         业务模块页
├── ...
├── chat.html               智能对话页（如有 AI 能力）
├── agent-tools.html        智能体工具页（★铁律必带 — 三栏智能体工作台，见下）
├── login.html              登录页
├── demo.html               产品导航页（大屏风格，可选）
├── 启动原型.command         一键启动（★必带 — 双击起本地服务并打开浏览器）
├── README.md               打开方式 + 页面清单 + 交互说明（★必带）
├── image/
│   ├── icon.png            平台 Logo（★必带 — 顶部导航左上角，从技能 images/ 复制）
│   └── bot.png             智能体头像（★必带 — 聊天/LOOP抽屉/智能体列表统一用它，从技能 images/ 复制）
├── js/
│   └── charts.js           ECharts 公共配置（token 派生色板 + botFallback 兜底）
└── data/
    ├── stats.json           全局统计数据
    ├── <entity>.json        业务实体数据（人员/患者/案例/订单等）
    └── <module>.json        模块级 mock 数据
```

---

## 配色系统（铁律 —— Token 化，禁止硬编码）

**唯一色值来源是 `:root` token**（对齐 saas-lobster-vben `preferences.ts` 的主色入口 `hsl(214 95% 44%)`）。所有页面 `<style>` 的第一段必须是下面的 **Token 基线**，业务组件里**不允许出现任何硬编码品牌色**（`#2563eb`、`#409eff`、`#1677ff`、`#1e3a8a`、`#eff6ff`、`#e8ecf0` 等）——一律写 `hsl(var(--primary) / x%)` 或 `color-mix()` 派生。改主题色 = 改一行 token，全站跟随。

### Token 基线（每页必含，原样照抄，禁止修改）

```css
:root{
  --primary: 214 95% 44%;            /* 主色 —— preferences.theme.colorPrimary */
  --background: 0 0% 100%;
  --foreground: 218 45% 14%;
  --muted-foreground: 215 18% 45%;
  --border: 213 32% 88%;
  --success: 160 84% 33%;            /* 成功/启用/健康/完成 */
  --warning: 32 88% 40%;             /* 临界/待审核/暂停/超时 */
  --danger:  352 68% 48%;            /* 失败/停用/过期/高危 */
  --info:    214 15% 50%;            /* 草稿/未开始/归档/中性 */
  /* 派生层：近实底卡片渐变 + 轻玻璃框架 */
  --card-bg: linear-gradient(110deg,
      color-mix(in srgb, hsl(var(--primary)) 8%, hsl(var(--background))) 0%,
      hsl(var(--background)) 58%,
      color-mix(in srgb, hsl(var(--primary)) 3%, hsl(var(--background))) 100%);
  --chrome-bg: color-mix(in srgb, hsl(var(--background)) 80%, hsl(var(--primary)) 6%);
  --shadow-card: 0 4px 14px hsl(var(--primary) / 7%);
}
@media (prefers-color-scheme: dark){
  :root{
    --background: 214 40% 11%;  --foreground: 210 40% 94%;
    --muted-foreground: 213 22% 68%;  --border: 213 28% 26%;  --success: 158 60% 45%;
    --card-bg: linear-gradient(110deg,
        color-mix(in srgb, hsl(var(--primary)) 16%, hsl(var(--background))) 0%,
        hsl(var(--background)) 58%,
        color-mix(in srgb, hsl(var(--primary)) 8%, hsl(var(--background))) 100%);
    --chrome-bg: color-mix(in srgb, hsl(var(--background)) 74%, hsl(var(--primary)) 8%);
    --shadow-card: 0 4px 14px hsl(0 0% 0% / 25%);
  }
}
@media (prefers-reduced-motion: reduce){ *{transition:none!important;animation:none!important} }
```

### 四层视觉结构（每页都必须是这四层，顺序不可乱）

1. **Body**：主色驱动的左深右浅横向渐变，固定在页面底层，**全站唯一背景**（各页面/卡片不得重复绘制）
2. **Chrome**：顶栏(48px)与侧栏轻玻璃（`--chrome-bg` + `backdrop-filter:blur(14px) saturate(1.35)`），边界用低透明度内阴影，不用粗分割线
3. **Content**：内容布局**透明**，让背景连续；不叠加网格、噪点、光晕
4. **Cards**：近实底横向浅蓝渐变（`--card-bg`），**无 backdrop-blur**，保证表格文字控件清晰；圆角 12px

### 主色派生规则（分类/分组场景）

当页面内有多个平行分类（如 6 个主题域、4 个模块、5 种数据源类型），**只用主色的透明度梯度区分**，不允许用红橙绿紫等彩色区分：

```
hsl(var(--primary) / 1) → / .78 → / .6 → / .45 → / .32 → / .2
```

### 状态色语义（对齐 core-rules/status-color-system.md）

| 语义 | token | 允许用在 |
|------|-------|---------|
| 成功、启用、健康、完成 | `--success` | Tag 文字+浅底、8px 小圆点、细边框 |
| 进行中、审批中、运行中 | `--primary` | 同上 |
| 临界、待审核、暂停、超时 | `--warning` | 同上 |
| 失败、停用、过期、高危 | `--danger` | 同上 |
| 草稿、未开始、归档、中性 | `--info` | 同上 |

**状态色核心原则**：只做"点缀"不做"铺底"。卡片背景、图标容器背景、进度条填充一律用主色族；状态色仅限文字/小圆点/细边框。浅色底一律用透明度派生（如 `color-mix(in srgb, hsl(var(--success)) 12%, hsl(var(--background)))`），**禁止写死 `#e5f7ef` 式浅色十六进制**。

### 严禁
- 紫色（`#7c3aed` `#6366f1` 等）、粉色、霓虹色、青色（`#0891b2`）
- Tailwind 的 `purple-` `orange-` `cyan-` `teal-` `pink-` `rose-` `violet-` `fuchsia-` `lime-` 系列类名
- 业务样式里硬编码任何品牌色/状态色/中性色十六进制值（一律 token）
- 顶部"系统运行中 / AI 引擎就绪 / 时间 / 版本号"状态胶囊（"智能体在线"绿点允许）
- 导航做成白色浮岛、整组胶囊、独立白条
- 给业务卡片加深蓝毛玻璃 / backdrop-filter（只允许顶栏/侧栏框架层用）
- 在单个页面重复定义全局 body/header/sidebar 背景
- 多层 box-shadow 堆叠；用阴影、发光、动效代替信息层级
- 全屏渐变背景（仅登录页/显式大屏页例外；大屏另用深蓝科技主题，不得反向污染常规页）

## 全局布局骨架（所有业务页强制 —— 四层结构 + 轻玻璃 Chrome）

```
┌──────────────────────────────────────────────────────────────┐
│ 1 Body    主色左深右浅渐变，fixed 在页面底层（全站唯一背景）      │
├──────────────────────────────────────────────────────────────┤
│ 2 Chrome  Top Nav 48px 轻玻璃：Logo + 一级菜单横排 + 在线态/用户 │
├─────────┬────────────────────────────────────────────────────┤
│ 二级菜单 │ 3 Content  透明连续，px-6 py-4，不套窄 max-width      │
│ (180px   │                                                      │
│  可选)   │ 4 Cards    近实底 --card-bg 渐变卡片，12px 圆角        │
└─────────┴────────────────────────────────────────────────────┘
```

**布局规则**：
- Body 渐变只在 `body` 上画一次：`linear-gradient(100deg, hsl(var(--primary)/12%) 0%, hsl(var(--primary)/4%) 38%, transparent 62%, hsl(var(--primary)/4%)) fixed hsl(var(--background))`
- 一级菜单横排在 Top Nav 里（Logo 右边 `<a>` 链接），**不做 side-rail 竖排图标栏**；active = 主色文字 + 2px 底部线
- 二级菜单 180px 纵向，**仅有子功能的页面才显示**；active = 主色文字 + `hsl(var(--primary)/10%)` 背景
- 无子功能的页面删掉左栏，内容区全宽
- Tabbar 不使用；顶栏不放"日期/版本号/运行状态"胶囊

### Top Nav CSS（轻玻璃 —— 每页必含）

```css
.top-nav { background:var(--chrome-bg); backdrop-filter:blur(14px) saturate(1.35); height:48px; display:flex; align-items:center; padding:0 16px; position:sticky; top:0; z-index:30; box-shadow:inset 0 -1px 0 hsl(var(--border) / 70%); }
.top-nav .logo { display:flex; align-items:center; gap:8px; margin-right:32px; font-size:16px; font-weight:600; color:hsl(var(--foreground)); white-space:nowrap; }
.top-nav .logo img { width:24px; height:24px; border-radius:6px; }
.top-nav-item { color:hsl(var(--muted-foreground)); font-size:14px; padding:0 16px; height:48px; display:flex; align-items:center; gap:6px; white-space:nowrap; text-decoration:none; border-bottom:2px solid transparent; transition:color .2s; }
.top-nav-item:hover { color:hsl(var(--primary)); }
.top-nav-item.active { color:hsl(var(--primary)); font-weight:500; border-bottom-color:hsl(var(--primary)); }
```

### Top Nav HTML（每页必含，只改 active 位置）

```html
<nav class="top-nav">
  <div class="logo"><img src="image/icon.png" alt="" onerror="botFallback(this)">{产品名}</div>
  <a href="index.html" class="top-nav-item active"><i class="fa fa-bolt"></i>模块一</a>
  <a href="module2.html" class="top-nav-item"><i class="fa fa-heart-pulse"></i>模块二</a>
  <a href="module3.html" class="top-nav-item"><i class="fa fa-comments"></i>模块三</a>
  <div class="ml-auto flex items-center gap-4 text-[14px]" style="color:hsl(var(--muted-foreground))">
    <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full" style="background:hsl(var(--success))"></span>智能体在线</span>
    <span class="flex items-center gap-1.5"><i class="fa fa-user-circle"></i>{用户名}</span>
  </div>
</nav>
```

**注意**：右侧只放"● 智能体在线"绿点 + 用户名，**不放日期/时间/版本号**。所有 `<img>` 一律挂 `onerror="botFallback(this)"`（js/charts.js 已内置兜底函数），图片缺失显示 token 色占位头像，不裂图。

### Sub Nav CSS（二级菜单 —— 有子功能的页面才有）

```css
.sub-nav { width:180px; padding:16px 8px; flex-shrink:0; background:var(--chrome-bg); backdrop-filter:blur(12px) saturate(1.3); box-shadow:inset -1px 0 0 hsl(var(--border) / 70%); display:flex; flex-direction:column; gap:2px; overflow-y:auto; }
.sub-nav-item { padding:8px 12px; font-size:14px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:8px; color:hsl(var(--muted-foreground)); transition:background .15s; white-space:nowrap; }
.sub-nav-item:hover { background:hsl(var(--primary) / 6%); color:hsl(var(--primary)); }
.sub-nav-item.active { background:hsl(var(--primary) / 10%); color:hsl(var(--primary)); font-weight:500; }
```

**二级菜单项必须带图标**：
```html
<div class="sub-nav-item" :class="{'active': activeTab==='xxx'}" @click="activeTab='xxx'; page=1">
  <i class="fa fa-{icon} text-xs w-4"></i> 菜单名称
</div>
```

一级 vs 二级视觉区分：一级=顶部横排+下划线 active；二级=左侧纵向+圆角低透明底 active。

### 数据表格样式规范（铁律 —— 对标 Element Plus / vxe-table）

所有数据列表必须遵循以下样式（颜色全部从 token 派生）：

```css
/* 表格容器：近实底卡片，禁止白底硬编码 */
.table-card { background:var(--card-bg); border:1px solid hsl(var(--border)); border-radius:12px; overflow:hidden; box-shadow:var(--shadow-card); }
/* 表头：主色 4% 低透明底 + 弱化文字 12px/600 */
table thead tr { background:hsl(var(--primary) / 4%); }
table th { padding:12px 16px; font-size:12px; font-weight:600; color:hsl(var(--muted-foreground)); text-align:left; white-space:nowrap; }
/* 行：低透明度细线分隔，不用粗实线 */
table td { padding:12px 16px; font-size:14px; color:hsl(var(--foreground)); font-variant-numeric:tabular-nums; border-top:1px solid hsl(var(--border) / 70%); }
table tbody tr { cursor:pointer; }
table tbody tr:hover td { background:hsl(var(--primary) / 4%); }
table tr:last-child td { border-bottom:none; }
/* 操作列：文字链接风格（对标 ElButton link） */
.action-link { color:hsl(var(--primary)); font-size:14px; cursor:pointer; margin-right:16px; }
.action-link:hover { color:hsl(var(--primary) / 75%); }
.action-link--danger { color:hsl(var(--danger)); }
```

**表格设计要点**：
- 数字列（金额/次数/百分比/时间）必须 `tabular-nums`（模板已提供 `.num` 类）
- 状态列用语义 Tag：`已启用→success`、`运行中→primary`、`待审核→warning`、`已停用/高危→danger`、`草稿→info`
- 操作列：主色文字"查看/编辑"+ 危险色"删除"，文字链接无下划线
- 表格必须有 Loading 与 Empty 状态

**搜索栏（表格上方，独立近实底卡片或与表格同卡）**：按钮统一用模板的 `.btn-pri` / `.btn-ghost` 类，输入控件统一用 `.field` 类，不要散写样式：

```html
<div class="flex items-center gap-2 flex-wrap p-4">
  <input class="field w-56" type="text" x-model.trim="kw" @input="page=1" placeholder="搜索名称 / 负责人">
  <select class="field" x-model="level" @change="page=1">
    <option value="">全部状态</option><option>启用</option><option>停用</option>
  </select>
  <button class="btn-pri" @click="page=1">查询</button>
  <button class="btn-ghost" @click="kw='';level='';page=1">重置</button>
  <span class="ml-auto text-[12px]" style="color:hsl(var(--muted-foreground))">共 <b class="num" x-text="filtered().length"></b> 条</span>
</div>
```

**表格主体（紧接搜索栏）**：

```html
<div class="table-card overflow-hidden">
  <div class="flex items-center justify-between p-4" style="box-shadow:inset 0 -1px 0 hsl(var(--border) / 70%)">
    <h2 class="text-[16px] font-semibold">{列表标题} <span class="text-[12px] font-normal" style="color:hsl(var(--muted-foreground))">共 {N} 条</span></h2>
    <div class="flex gap-2"><button class="btn-pri">+ 新建</button><button class="btn-ghost">更多 ▾</button></div>
  </div>
  <div class="overflow-x-auto">
    <table class="table">
      <thead><tr><th>名称</th><th>状态</th><th style="text-align:right">操作</th></tr></thead>
      <tbody>
        <template x-for="item in pagedItems()" :key="item.id">
          <tr @click="handleView(item)">
            <td x-text="item.name"></td>
            <td><span class="tag success" x-text="item.status"></span></td>
            <td style="text-align:right;white-space:nowrap" @click.stop>
              <span class="action-link" @click="handleEdit(item)">编辑</span>
              <span class="action-link action-link--danger" @click="confirmDel(item)">删除</span>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
    <!-- 空状态必须存在 -->
    <div class="py-12 text-center text-[14px]" style="color:hsl(var(--muted-foreground))" x-show="!filteredItems.length">
      <i class="fa fa-inbox mr-1.5"></i>没有符合条件的数据
    </div>
  </div>
  <!-- 分页条：用"分页组件"章节的模板 -->
</div>
```

**核心色值（全部 token，不硬编码）**：

| 元素 | 色值 |
|------|------|
| 表头背景 | `hsl(var(--primary) / 4%)` |
| 表头文字 | `hsl(var(--muted-foreground))` 12px/600 |
| 正文文字 | `hsl(var(--foreground))` |
| 边框线 | `hsl(var(--border) / 70%)` |
| 行 hover | `hsl(var(--primary) / 4%)` |
| 操作-查看/编辑 | `hsl(var(--primary))` |
| 操作-删除 | `hsl(var(--danger))` |
| 按钮-主色/次色 | `.btn-pri` / `.btn-ghost`（模板内置） |
| 输入框 focus | `border-color: hsl(var(--primary))` |
| 分页-当前页 | `.pgn.cur`（主色实底白字） |

**一级 vs 二级视觉区分**：
- 一级：顶部横排、轻玻璃、下划线 active
- 二级：左侧纵向、轻玻璃、圆角低透明底 active

### 内容区宽度与密度（铁律 — 治"留白太空"和"整页滚动"）

**内容区默认撑满，不要用窄的 max-width 居中。** 常见错误是套 `max-w-[980px] mx-auto`，大屏上两侧留一大片空白，很难看。正确做法：

```html
<!-- ✅ 内容区撑满，只留左右内边距 -->
<div class="flex-1 overflow-y-auto msc">
  <div class="px-6 py-4 space-y-4"><!-- 内容 --></div>
</div>
```

- 内容区用 `px-6` 内边距（16px 基线，最多 px-8），**不套 max-width**（让内容跟着屏幕宽度走）。
- 只有一种例外：**纯阅读型长文**（如协议、说明）可以用 `max-w-[820px]`，因为长行不利阅读。业务页（列表、卡片、仪表盘、对话）一律撑满。
- 超宽屏（≥2560px）担心内容被拉太散时，最多用 `max-w-[1600px] mx-auto` 这种**大**上限，绝不用 980/1120 这种窄的。

**密度要求：能一屏放下的，别让它出现整页滚动条。** 侧边面板、右栏、卡片区，间距和 padding 要克制：区块间距用 `space-y-3.5`~`space-y-4`（不是 `space-y-6`），卡片内 padding 用 `p-2.5`~`p-3`（不是 `p-4`~`p-5`），小字用 `text-[12px]`。一屏能容纳的信息量优先，滚动是最后手段。

---

## 核心组件模板

### 维度说明条（Killer Pattern —— 每个分析页必有）
```html
<section class="rounded-xl px-4 py-2.5 flex items-center justify-between"
         style="background:hsl(var(--primary) / 6%);border:1px solid hsl(var(--primary) / 25%)">
  <div class="flex items-center gap-3">
    <div class="w-9 h-9 rounded-lg text-white flex items-center justify-center flex-shrink-0" style="background:hsl(var(--primary))">
      <i class="fa fa-{icon} text-[14px]"></i>
    </div>
    <div>
      <div class="text-[14px] font-semibold">{维度标题}</div>
      <div class="text-[12px] mt-0.5" style="color:hsl(var(--primary))">{规则副文}</div>
    </div>
  </div>
  <div class="text-[12px]" style="color:hsl(var(--primary))">命中 <span class="text-[16px] font-semibold num">{N}</span> 项</div>
</section>
```

### KPI 卡（可点击下钻）
```html
<div class="rounded-xl p-4 cursor-pointer transition-transform hover:-translate-y-0.5"
     style="background:var(--card-bg);border:1px solid hsl(var(--border));box-shadow:var(--shadow-card)"
     @click="drillKpi(k)">
  <div class="flex items-center justify-between">
    <span class="text-[12px]" style="color:hsl(var(--muted-foreground))">{label}</span>
    <i class="fa fa-{icon}" style="color:hsl(var(--primary))"></i>
  </div>
  <div class="flex items-baseline gap-2 mt-2">
    <span class="text-[24px] font-semibold num">{value}</span>
    <span class="text-[12px]" style="color:hsl(var(--success))">↑ {delta}%</span>
  </div>
</div>
```

### 右侧抽屉（详情/AI/配置通用）
```html
<div x-show="drawerOpen" x-transition.opacity class="fixed inset-0 z-50" x-cloak>
  <div class="absolute inset-0" style="background:hsl(0 0% 0% / 40%)" @click="drawerOpen=false"></div>
  <aside class="absolute right-0 top-0 bottom-0 w-[480px] max-w-[94vw] overflow-y-auto msc"
         style="background:hsl(var(--background));box-shadow:-6px 0 24px hsl(0 0% 0% / 12%)"
         x-transition:enter="transition transform duration-300" x-transition:enter-start="translate-x-full" x-transition:enter-end="translate-x-0"
         x-transition:leave="transition transform duration-300" x-transition:leave-start="translate-x-0" x-transition:leave-end="translate-x-full">
    <header class="h-12 px-5 flex items-center sticky top-0 z-10" style="background:hsl(var(--background));box-shadow:inset 0 -1px 0 hsl(var(--border) / 70%)">
      <span class="text-[14px] font-semibold" x-text="drawerTitle"></span>
      <button class="ml-auto w-7 h-7 rounded flex items-center justify-center text-[12px]" style="color:hsl(var(--muted-foreground))" @click="drawerOpen=false"><i class="fa fa-times"></i></button>
    </header>
    <div class="p-5 space-y-4" x-html="drawerContent"></div>
  </aside>
</div>
```

### 抽屉按钮样式规范（铁律）

抽屉底部的操作按钮**必须美观统一**，禁止光秃秃的纯文字按钮：

| 按钮类型 | 样式 |
|---------|------|
| **主操作（保存/确认/提交）** | `class="py-2.5 rounded-lg text-white text-[14px] font-medium" style="background:hsl(var(--primary))"` |
| **次操作（关闭/取消）** | `class="py-2.5 rounded-lg text-[14px] font-medium" style="border:1px solid hsl(var(--border));color:hsl(var(--muted-foreground));background:hsl(var(--background))"` |
| **危险操作（删除确认框内）** | `style="background:hsl(var(--danger))"` 白字 |
| **双按钮布局** | `<div class="flex gap-3 pt-4">` 包裹，两个都 `flex-1` |

```html
<!-- 双按钮示例 -->
<div class="flex gap-3 pt-4">
  <button class="flex-1 py-2.5 rounded-lg text-[14px] font-medium" style="border:1px solid hsl(var(--border));color:hsl(var(--muted-foreground));background:hsl(var(--background))" @click="drawerOpen=false">
    <i class="fa fa-times mr-1.5 text-xs"></i>取消
  </button>
  <button class="flex-1 py-2.5 rounded-lg text-white text-[14px] font-medium" style="background:hsl(var(--primary))" @click="handleSave()">
    <i class="fa fa-check mr-1.5 text-xs"></i>保存
  </button>
</div>
```

**禁止**：
- ❌ 光秃秃纯文字"关闭"按钮、没有 hover/圆角/图标
- ❌ 按钮颜色硬编码（用 `.btn-pri` / `.btn-ghost` 或上面的 token 写法）

### Toast 系统
```js
showToast(message, type = 'info') {
  const id = ++this._toastId;
  this.toasts.push({ id, message, type, removing: false });
  setTimeout(() => {
    const t = this.toasts.find(t => t.id === id);
    if (t) t.removing = true;
    setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 300);
  }, 2500);
}
```
Toast 底色按语义映射 token：success→`--success`、error→`--danger`、warn→`--warning`、info→`--primary`。

### Alpine.js 异步更新铁律（流式打字/定时器/延迟渲染必看）

**踩过的坑**：在 `setInterval` / `setTimeout` 回调里修改一个从数组里取出的对象引用，Alpine 监测不到，界面永不更新——表现为"流式打字卡在光标闪、字出不来"、"loading 转圈不结束"、"倒计时不动"。

**根因**：Alpine 的响应式是对 `x-data` 里的对象做 Proxy 代理。你 `const msg = this.messages[i]` 取出的是**裸对象引用**，在异步回调里改 `msg.xxx` 绕过了 Proxy，视图不刷新。

**正确写法（铁律）**：异步回调里改数组内元素，必须**按索引经代理对象修改**，不要缓存裸引用。

```js
// ❌ 错误：缓存裸引用，异步改它界面不动
pushAI(p) {
  const msg = { id:++this._mid, textShown:'', full:p.text };
  this.messages.push(msg);
  this.stream(msg);           // 传对象引用
}
stream(msg) {
  const timer = setInterval(()=>{ msg.textShown += ...; }, 26);  // 改的是裸引用，视图不更新
}

// ✅ 正确：传索引，回调里改 this.messages[idx]（走 Proxy）
pushAI(p) {
  this.messages.push({ id:++this._mid, textShown:'', full:p.text });
  this.stream(this.messages.length - 1);   // 传索引
}
stream(idx) {
  let i = 0; const full = this.messages[idx].full;
  const timer = setInterval(()=>{
    this.messages[idx].textShown += full[i]; i++;   // 经代理对象修改，视图实时刷新
    if (i >= full.length) clearInterval(timer);
  }, 26);
}
```

**适用一切"异步改数组内对象"的场景**：流式打字、逐条冒出、分步 loading、进度条、倒计时。凡是 `setTimeout`/`setInterval`/`Promise.then` 里要改列表里某一项，一律用索引 `this.arr[idx].prop = ...`，禁止缓存 `const item = this.arr[idx]` 后在回调里改 `item.prop`。

（实在遇到深层嵌套仍不刷新时，兜底用整条替换 `this.arr[idx] = {...this.arr[idx], prop: newVal}` 强制触发。）

**打字机效果专项坑：禁止 `+=` 读自身叠字。** 逐字打字时不要写 `this.text += full[i]`——高频 `setInterval`（20-30ms）下，Alpine 响应式读取自身旧值再追加，会读到中间态导致**字符重复错乱**（"今今天天有有..."）。正确写法是每帧从原文 `slice` 干净前缀：

```js
// ❌ 错误：读自身 += 追加，高频下叠字错乱
playType() {
  let i = 0;
  const timer = setInterval(()=>{ this.text += this.full[i]; i++; ... }, 22);
}

// ✅ 正确：每帧 slice(0, i)，永远是干净的完整前缀
playType() {
  this.text = ''; let i = 0;
  const timer = setInterval(()=>{
    i++;
    this.text = this.full.slice(0, i);   // 不读自身，从原文截取
    if (i >= this.full.length) clearInterval(timer);
  }, 30);
}
```

间隔别低于 30ms（太快既看不清也更易触发渲染竞态）。数组内元素同理：`this.arr[idx].shown = this.arr[idx].full.slice(0, i)`。

### 分页组件（所有数据列表页强制）

**铁律**：任何有表格/列表的页面，数据超过5条就必须加分页。不加分页的列表页视为未完成。

**Alpine.js 状态**（加到 `pageApp()` return 对象中）：
```js
currentPage: 1,
pageSize: 10,
```

**分页方法**（每页按实际列表命名）：
```js
paginatedItems() {
  const items = this.filteredItems; // 替换为实际的过滤后列表
  const start = (this.currentPage - 1) * this.pageSize;
  return items.slice(start, start + this.pageSize);
},
```

**分页 HTML 模板**（插在表格容器之后，统一用 `.pgn` / `.field` 类）：
```html
<div class="flex items-center justify-between px-1 py-3">
  <span class="text-[12px]" style="color:hsl(var(--muted-foreground))">共 <span class="font-medium num" style="color:hsl(var(--foreground))" x-text="filteredItems.length"></span> 条</span>
  <div class="flex items-center gap-1">
    <button class="pgn" :disabled="currentPage <= 1" @click="currentPage--">
      <i class="fa fa-chevron-left text-xs"></i> 上一页
    </button>
    <template x-for="p in Math.ceil(filteredItems.length / pageSize)" :key="p">
      <button class="pgn num" :class="p === currentPage ? 'cur' : ''" x-text="p" @click="currentPage = p"></button>
    </template>
    <button class="pgn" :disabled="currentPage >= Math.ceil(filteredItems.length / pageSize)" @click="currentPage++">
      下一页 <i class="fa fa-chevron-right text-xs"></i>
    </button>
    <select class="field ml-2" style="height:32px;padding:0 8px" x-model.number="pageSize" @change="currentPage=1">
      <option :value="10">10条/页</option><option :value="20">20条/页</option><option :value="50">50条/页</option>
    </select>
  </div>
</div>
```

**分页按钮 CSS（放进页面 `<style>` 或 `_template.html`）**：
```css
.pgn { min-width:32px; height:32px; padding:0 8px; border-radius:6px; border:1px solid hsl(var(--border)); background:hsl(var(--background)); color:hsl(var(--muted-foreground)); font-size:14px; cursor:pointer; transition:color .15s,border-color .15s; }
.pgn:hover:not(:disabled) { color:hsl(var(--primary)); border-color:hsl(var(--primary) / 50%); }
.pgn.cur { background:hsl(var(--primary)); color:#fff; border-color:hsl(var(--primary)); }
.pgn:disabled { opacity:.4; cursor:not-allowed; }
```

**分页配色**（全部 token）：
- 当前页按钮：`.pgn.cur`（`hsl(var(--primary))` 实底 + 白字）
- 非当前页：`hsl(var(--border))` 边框 + `hsl(var(--muted-foreground))` 文字
- Hover：`hsl(var(--primary))` 文字 + 主色 50% 边框
- 禁用：`opacity-40 cursor-not-allowed`
- 统计文字：`hsl(var(--muted-foreground))`，数字 `hsl(var(--foreground))`

**切换Tab/筛选时必须重置分页**：
```html
@click="activeTab='xxx'; currentPage=1"
```

### 卡片网格布局（列表也适用，治"一行1个太空"）

**卡片/要紧事/信息块列表不要单列铺满整行**——一行1个大卡在宽屏上左右一大片空，很丑。默认**一行2个**（`grid-cols-2`），信息量小的可 3~4 个：

```html
<div class="grid grid-cols-2 gap-4">
  <template x-for="item in pagedItems()" :key="item.id">
    <article class="dcard">…</article>
  </template>
</div>
```

**DataCard CSS（近实底主色渐变，统一放进模板）**：
```css
.dcard { background:var(--card-bg); border:1px solid hsl(var(--border)); border-radius:12px; box-shadow:var(--shadow-card); display:flex; flex-direction:column; overflow:hidden; transition:transform .18s,box-shadow .18s,border-color .18s; cursor:pointer; }
/* 可点击卡片 Hover：最多上移 4px + 主色边框增强 */
.dcard:hover { transform:translateY(-4px); border-color:hsl(var(--primary) / 55%); box-shadow:0 12px 24px hsl(var(--primary) / 14%); }
```
卡片内文字一律 `hsl(var(--foreground))` / `hsl(var(--muted-foreground))`，数字加 `.num`。
```js
edit(item) { const n = prompt('重命名', item.title); if (n && n.trim()) { item.title = n.trim(); this.showToast('已重命名','success'); } },
del(item) { if (!confirm('确定删除？')) return; this.list = this.list.filter(x=>x.id!==item.id); this.showToast('已删除','success'); },
```
按钮用 `@click.stop` 防止冒泡触发整行的点击。

---

## charts.js 公共配置（必须包含 —— 从 token 派生，主题换色自动跟随）

```js
(function(){
  const css = getComputedStyle(document.documentElement);
  const hsl = (n, a) => {
    const v = css.getPropertyValue(n).trim() || '214 95% 44%';
    return a == null ? `hsl(${v})` : `hsl(${v} / ${a})`;
  };
  const P = hsl('--primary'), FG = hsl('--foreground'), SUB = hsl('--muted-foreground'), BD = hsl('--border');

  window.TC_COLORS = {
    primary: P, foreground: FG, textSub: SUB, textMute: SUB, border: BD,
    success: hsl('--success'), warning: hsl('--warning'), danger: hsl('--danger'), info: hsl('--info'),
    // 分类只用主色透明度梯度（基线：不用彩色区分平行分类）
    palette: [P, hsl('--primary',.78), hsl('--primary',.6), hsl('--primary',.45), hsl('--primary',.32), hsl('--primary',.2), FG, SUB, hsl('--info'), hsl('--border')],
  };

  window.TC_ECHARTS = {
    tooltip(extra={}) { return { trigger:'axis', backgroundColor:hsl('--background'), borderColor:BD, textStyle:{color:FG,fontSize:12}, appendToBody:true, ...extra }; },
    grid(extra={}) { return { left:48, right:20, top:28, bottom:32, containLabel:true, ...extra }; },
    axis(extra={}) { return { axisLine:{lineStyle:{color:BD}}, axisTick:{show:false}, axisLabel:{color:SUB,fontSize:12}, splitLine:{lineStyle:{color:hsl('--border',.5),type:'dashed'}}, ...extra }; },
    legend(extra={}) { return { icon:'circle', itemWidth:8, itemHeight:8, textStyle:{color:SUB,fontSize:12}, top:4, ...extra }; },
  };

  window.TC_FMT = {
    thousands(v) { return v == null || isNaN(v) ? '-' : Number(v).toLocaleString('zh-CN'); },
    pct(v, d=1) { return v == null || isNaN(v) ? '-' : (v*100).toFixed(d)+'%'; },
    fixed(v, d=1) { return v == null || isNaN(v) ? '-' : Number(v).toFixed(d); },
  };

  /* 图片缺失兜底：头像/logo 404 时换 token 色占位图，不出现裂图 */
  window.botFallback = function(img){
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='"+P+"'/><text x='32' y='43' font-size='30' text-anchor='middle' fill='white'>✦</text></svg>");
  };
})();
```

**要点**：
- 色板在运行时读取 `:root` token——主题换色、暗色模式下图表自动跟随，不需要改图表代码
- 分类/系列颜色只从 `TC_COLORS.palette` 取（主色透明度梯度），禁止在图表配置里写十六进制
- 每个页面 `<head>` 里 `<script src="js/charts.js">` 必须在 ECharts 之后引入

## 高保真交互要求（铁律）

### 必须实现的交互模式

| 模式 | 要求 |
|------|------|
| **KPI 卡下钻** | 每个 KPI 卡可点击，打开右侧抽屉展示趋势+明细 |
| **图表点击下钻** | ECharts `.on('click')` 注册事件，打开抽屉展示明细数据 |
| **表格行点击** | 表格行 hover 高亮 + 点击打开详情抽屉 |
| **按钮状态流转** | 点击 → loading（spinner）→ 成功/失败反馈（toast） |
| **表单验证** | 必填字段检测，红色错误提示，阻断提交 |
| **Tab 联动** | 切Tab 同步刷新：说明条 + KPI + 图表 + 表格 |
| **筛选联动** | 筛选器变更后列表/图表实时更新 |
| **分页** | **所有数据列表必须有分页**（上一页/页码按钮/下一页/每页条数选择），使用统一的分页组件模板，切Tab/筛选时重置到第1页 |
| **确认弹窗** | 危险操作（删除/清空）前置确认弹窗 |
| **抽屉** | 右侧 480px 滑入抽屉，含遮罩 + 动画 |

### 禁止的"假交互"
- ❌ 按钮只弹 alert("功能开发中") 或 toast("操作成功") 却没有实际效果
- ❌ 图表是截图不是 ECharts 渲染
- ❌ 表格数据写死在 HTML 里不可筛选
- ❌ Tab 切换但内容不变
- ❌ 数据列表没有分页组件（超过5条数据的列表必须有分页）
- ❌ 分页用了非蓝色的按钮颜色
- ❌ "新建"按钮点了没有弹出表单
- ❌ "编辑"按钮点了没有预填数据的表单
- ❌ "删除"按钮点了没有确认弹窗、没有从列表移除
- ❌ "保存"按钮点了没有把数据写回列表（哪怕是Alpine.js内存中的数组操作）
- ❌ "测试/验证"按钮点了只弹toast没有loading状态转换
- ❌ 搜索框存在但输入后列表没有过滤
- ❌ 开关/toggle存在但点了没有状态变化

### 真正的高仿真交互标准

每个功能按钮必须有**完整的状态流转**，不允许只弹一句话：

| 按钮类型 | 必须实现的交互 |
|---------|-------------|
| **新建** | 打开抽屉/弹窗 → 表单填写 → 保存后数据加入列表 + toast确认 |
| **编辑** | 打开抽屉 → 预填原有数据 → 修改后保存回列表 + toast确认 |
| **删除** | 确认弹窗("确定删除?") → 确认后从列表移除 + toast确认 |
| **测试/验证** | 按钮loading(spinner) 1-2秒 → 成功/失败结果展示 |
| **导出** | loading → toast"导出成功" + 模拟下载（可以只是toast，但要有loading过程） |
| **切换/Toggle** | 立即改变Alpine.js状态 → UI同步更新 → toast确认 |
| **搜索/筛选** | 输入即时过滤列表（@input事件绑定） |
| **表格行点击** | 打开详情抽屉，展示该行完整信息 |
| **刷新** | loading spinner → 数据重新加载（模拟1秒延迟）→ toast"刷新完成" |

**核心原则**：每个按钮的点击，用户必须能看到**界面发生了变化**（不是只有一个一闪而过的toast）。新建了的数据要出现在列表里，删除了的数据要从列表消失，编辑了的数据要显示新值。

---

## 智能体产品必备元素（铁律 — 每个页面都要有）

**这是本技能的灵魂章节。** 这个技能是 AI 产品原型设计器——它产出的每个原型默认都是智能体产品，而不是换皮的管理系统。要让用户**在每一页都看得见"背后有一群智能体在干活"**。下面是每次生成 AI 产品必须落地的东西，组件直接从 `references/` 复制注入：

1. **智能体 LOOP 抽屉**（`loop-tray.html`）— 智能动作点击后流式演干活过程
2. **原型批注层**（`annotator.html`）— 评审打标签、导出给大模型
3. **智能体工具页**（`agent-tools.html`，铁律必带页）— 智能体能力总入口
4. **智能体 AI 效果四件套** — 流式/LOOP/在线态、AI依据、主动推送、头像图片
5. **图片资源** — `bot.png` 头像 + `icon.png` logo

逐块展开：

### 1. 智能体 LOOP 抽屉（每页必含 — 但只有"智能体替你动脑子"的动作才弹）

**这是每个 AI 产品页面的灵魂元素。** 不做飘在顶部的抽象循环状态条（那种跟页面没关系的装饰已废弃），也不做占版面的页内工作流区块。正确做法是一个**全站统一的 LOOP 抽屉**：当用户触发一个**智能体在替他研判/生成/分析**的动作时，滑出右侧抽屉，按 LOOP **流式打印智能体这一次到底怎么干的**：

```
① 感知(扫了哪些数据) → ② 判断(怎么研判) → ③ 调工具(query_agent 入参/返回) → ④ 产出(结论)
```

每步的动作名逐字打字、打完展开"输入→输出"和工具调用（`query_agent(scope=all) → 42家`）、序号圆点变绿打勾，最后给出产出结论。**这才是"看得见智能体在干活"**——把"智能体在动脑子"这件事，绑定到那些真的有智能体在背后思考的动作上。

**⚠️ 关键边界：不是所有按钮都弹 LOOP。** 只有智能体在替用户动脑子的动作才弹；普通 CRUD 走普通交互，硬套 LOOP 反而假。生成前对每个按钮先过这张表：

| 动作类型 | 例子 | 交互形态 |
|---|---|---|
| 🤖 **智能动作 → 弹 LOOP 抽屉** | 扫描研判、智能生成方案/话术、主动分析、风险预测、智能派发（带"分给谁最合适"的研判）、一键跟进（生成话术） | `window.fireLoop(配置)`，流式演 感知→判断→调工具→产出 |
| 📝 **普通 CRUD → 走普通交互** | 新增、编辑、查看详情、删除、纯派发（人选人）、翻页、筛选、导出 | 表单抽屉 / 详情抽屉 / 确认框 / 选人弹窗，**不弹 LOOP** |

判断标准就一句：**这个动作点下去，是"智能体在想"还是"人在填/翻/确认"?** 前者弹 LOOP，后者不弹。派发要看性质——纯粹让人手动选个负责人就是 CRUD；如果是"智能体研判后推荐分给谁"才弹 LOOP。

- **组件源**：`references/loop-tray.html`（一整段 CSS+HTML+JS，粘到 `</body>` 前。独立 Alpine `x-data="loopTray()"`，**不依赖也不干扰**页面的 `pageApp()`）。
- **触发方式**：**智能动作**按钮的 `@click` 里调 `window.fireLoop(配置)` 即可，一处组件、全站复用（CRUD 按钮不接）：
  ```js
  window.fireLoop({
    title:'扫描全部代理商', engine:'数据采集智能体',
    steps:[
      {phase:'感知', act:'连接数据源', in:'HIS/CRM', out:'4源接通', tool:'query_agent(scope=all)', ret:'42家', note:'…'},
      {phase:'判断', act:'研判掉队风险', in:'42家画像', out:'8个风险点', note:'…'},
      // …
    ],
    result:'<b>扫描完成，识别8个风险点</b>', confirm:'查看要紧事'
  })
  ```
- **每个动作的 steps 不同**：用产品专家视角写清这个动作背后智能体的真实 LOOP——每步 = `{phase(感知/判断/调工具/产出), act(逐字打印的动作名), in(输入), out(输出), tool(可选:工具调用), ret(工具返回), note(说明)}`。让用户看懂"它扫了什么→怎么判断→调了什么工具→产出什么"。
- **两个坑（组件里已固化，勿改）**：打字机改 `this.typing = act.slice(0,ci+1)` 字符串而非 `+=`（避免高频叠字/漏刷）；用 `seq` 序号让快速连点不同动作时旧播放自动退出，防串台。

> 每个智能动作的 LOOP 按它真实做的事写，别套模板。"扫描"是"感知→判断→调工具→产出"，"发企微消息（含话术生成）"可能是"确认对象→生成话术→调发送接口→回执"。关键是**智能动作要能弹出它自己的 LOOP**，让智能体"动脑子"这件事在该出现的地方都可见——但别给新增/编辑/查看这些 CRUD 硬套。

### 2. 原型批注层（每页右下角必含）

评审时给"跟客户需求不一致的地方"就地打标签的能力。右下角浮动批注按钮 → 批注模式下点页面任意元素落标记 → 选标签(❌需求不符/⚠️待确认/✏️客户要改/💡建议)+写说明 → 右侧清单汇总 → **导出成给大模型的修改清单**。

- **组件源**：`references/annotator.html`（纯原生 JS，粘到 `</body>` 前，按页面路径存 localStorage）
- **关键**：落点时自动抓取被点元素的**定位信息**（元素类型+文字+所在区块），导出的 Markdown 每条含【定位】+【要求】，能直接喂给大模型照着改——不是只有"改什么"没有"改哪"。

> 这两个组件已在"代理商运营参谋"原型（作战台/健康监测/问参谋/智能体工具四页）验证跑通。生成 AI 产品原型时，**每个业务页都必须注入这两个组件**：LOOP 抽屉 `loop-tray.html` 全页必含，但只给**智能动作**按钮（扫描/生成/分析/研判类）接 `window.fireLoop`——CRUD 按钮（新增/编辑/查看/删除/纯派发）走普通交互，不接；批注层 `annotator.html` 每个业务页右下角必含（登录页/纯展示页可不注入批注）。

### 3. 智能体工具页 agent-tools.html（★铁律必带页面 — 做 AI 产品必生成）

做 AI 智能体产品，**必须生成一个 `agent-tools.html`**，作为"这个产品到底有哪些智能体能力"的总入口。缺了它，产品就只是几个功能页，看不出"背后有一群智能体"。顶部导航要有一项指向它（`<i class="fa fa-toolbox"></i>智能体工具`）。

> **★ 有现成模板，别从头写**：`references/agent-tools.html` 是验证过的完整三栏工作台。直接复制到原型根目录，**只改两处**——① 顶部 `<nav>` 导航链接换成本产品页面；② `<script>` 里的 `groups` 数组换成本产品的智能体清单。骨架/CSS/流式逻辑/头像全照搬，头像已固定用 `image/bot.png`。

**形态：三栏智能体工作台**（对标 360 安全运营中心的智能体中心）：

| 栏 | 宽 | 内容 |
|---|---|---|
| 左栏 | 240px | 智能体列表（8-12 个，按能力分组：研判类/生成类/分析类/编排类…），每个含头像+名称+标签 |
| 中栏 | 撑满 | 选中智能体后的对话区：欢迎语 + 快捷提问 chips + 流式回答，底部输入框，脚注"智能体生成内容均为草稿态，人工拥有最终决定权" |
| 右栏 | 300px | 当前智能体详情：**知识库**（它读哪些数据源）+ **技能**（它会哪几种能力）|

- **每个智能体** = `{name, tag, icon, role(一句话职责), quick[快捷提问], knowledge[知识库], skills[技能]}`。

**★★ 铁律：智能体清单必须按"本产品的系统功能"现设计，绝不照抄模板示例。** 模板里那组（线索研判/话术生成/健康分析…）是**代理商运营产品**的智能体，只是占位样例。换个产品，智能体就完全不同——照抄示例是最典型的翻车。正确做法是**从功能倒推智能体**：

1. **先列本产品有哪些系统功能/业务模块**（看需求、看已生成的其它页面）。比如"医院药品管理"的功能是：库存管理、效期预警、采购计划、处方审核、盘点。
2. **每个核心功能背后，配一个替用户在这件事上动脑子的智能体**：
   - 库存管理 → 库存预警智能体（算安全库存、预测断货）
   - 效期管理 → 效期管理智能体（扫近效期、给处置建议）
   - 采购计划 → 采购建议智能体（按消耗预测生成采购单）
   - 处方审核 → 用药审核智能体（查配伍禁忌、剂量异常）
   - 盘点 → 盘点差异智能体（找账实不符、归因）
3. **按能力把它们分 2-3 组**（如 预警类 / 生成类 / 分析类），凑够 8-12 个。功能少就往深里拆（一个功能可拆研判+生成+复盘几个智能体）。
4. **每个智能体的 `knowledge`（读哪些数据源）和 `skills`（会哪些能力）也要贴本产品**——库存智能体的知识库是"库存台账/消耗历史/供应商目录"，不是代理商那套"线索池/转化历史"。

> 一句话检验：把你写的智能体名字念一遍，如果换成别的产品也成立（太通用）、或者还带着"代理商/线索"字样（没改干净），就是没按本产品功能设计。**每个智能体都应该让人一看就知道"这是 XX 系统才会有的智能体"。**

- 中栏对话复用流式打字（见下 AI 效果），回答格式：**先结论、再依据**（"XX智能体已完成研判，先给结论。…依据：结合规则与历史样本…"）。
- 智能体头像统一用 `image/bot.png`（见下图片规范）。

### 4. 智能体 AI 效果四件套（★每次生成必带 — 让人信"这真是个 AI 产品"）

光有页面不够，要让 AI"活"起来。这四样每次做 AI 产品原型都必须体现：

1. **流式 + LOOP + 在线态**：所有 AI 回答逐字流式打印（带光标）；智能动作走 LOOP 抽屉（见 1）；顶部导航右侧挂"● 智能体在线"绿点状态。流式实现严守 [Alpine 异步更新铁律](#alpinejs-异步更新铁律流式打字定时器延迟渲染必看)——改字符串/索引，不缓存裸引用，用 seq 防串台。
2. **AI 判断依据展示**：凡是 AI 给的结论/排序/预警，卡片里都要附"**为什么**"——像作战台要紧事卡片的"为什么要紧：… / AI 预测：…"。不能只甩结论不给依据，那就成了黑盒。每条关键数据背后都要能点开或直接看到 AI 的研判理由。
3. **主动推送 / 告警**：智能体要**主动**冒出来，不是干等人问。首页有"今日要紧事/智能体替你盯着"的推送流，风险出现有告警提示（红点/toast/角标）。体现"它一直在转、有事找你"。
4. **智能体头像图片**：聊天气泡、LOOP 抽屉头部、智能体列表统一用 `image/bot.png` 真实头像图，**不用** `fa-robot` 字体图标凑数。让智能体有统一、可信的形象。

### 图片资源规范（★必带 — 每次生成从技能 images/ 复制）

技能自带两张图，生成原型时**必须复制到原型的 `image/` 目录**（注意原型里是单数 `image/`）：

| 文件 | 用途 | 引用位置 |
|---|---|---|
| `image/icon.png` | 平台 Logo | 每页 Top Nav 左上角 `<img src="image/icon.png">` |
| `image/bot.png` | 智能体头像 | 聊天/LOOP抽屉/智能体列表/agent-tools，凡是"智能体形象"处 |

- **来源**：技能目录 `images/`（复数）下的 `icon.png`、`bot.png`，生成时 copy 过去。若技能 images 缺 icon.png，从已有原型复制或用平台现成 logo。
- **头像用法**：`<img src="image/bot.png" class="w-8 h-8 rounded-lg object-cover">`，别再用 `<i class="fa fa-robot">`。


---

## Mock 数据规范

### data/ 目录统一管理
- 所有 mock 数据放在 `data/*.json`
- 通过 `fetch('data/xxx.json')` 加载
- 数据量要求：主表 10-30 条真实感数据，统计表完整

### 数据加载器模板
```js
window.APP_DATA = (function() {
  const cache = {};
  async function load(name) {
    if (cache[name]) return cache[name];
    const res = await fetch(`data/${name}.json`);
    cache[name] = await res.json();
    return cache[name];
  }
  return {
    stats: () => load('stats'),
    // ... 按模块扩展
  };
})();
```

### 数据要求
- 字段名用 snake_case 英文
- 数值要合理（不要全是 0 或 999999）
- 姓名/地址等需要脱敏（用假名）
- 日期用 `YYYY-MM-DD` 格式
- 枚举值要有真实感（不要 type1/type2，要"临床科室"/"行政科室"）

---

## 执行流程

```
用户输入（任意形式）
    ↓
1. 理解需求：提取产品名、目标用户、核心模块、功能点
    ↓
2. 规划页面：确定页面列表、导航结构、每页核心内容
    ↓
3. 设计数据：规划 data/*.json 的结构和内容
    ↓
4. 生成代码：先写 Token 基线 + _template 骨架，再逐页面输出 HTML（含完整交互逻辑）
    ↓
5. 生成配置：charts.js（token 派生色板）+ data/*.json
    ↓
6. 验证交互：确保所有按钮/图表/表格有真实响应（浏览器实际点一遍）
    ↓
7. Token 一致性校验：grep 硬编码色值必须为 0 命中（见 Step 3 校验清单）
    ↓
8. 打包交付：清理 .DS_Store/临时文件 → zip（UTF-8 文件名）→ 附打开方式
    ↓
完成，告知用户目录路径和打开方式
```

### 交付打包规范（每次生成完必做）

1. **目录自足**：`image/icon.png + bot.png` 从技能 images/ 复制进包；`js/charts.js` 含 `botFallback()` 兜底
2. **一键启动**：包内必须带 `启动原型.command`（macOS 双击起 python http.server 并 open 浏览器）+ `README.md`（打开方式/页面清单/交互说明）
3. **file:// 兼容提示**：直接双击 index.html 会因 CORS 拦截 fetch(data/*.json)——README 必须写明用本地服务打开
4. **打包**：zip 用 UTF-8 文件名（python zipfile 或 ditto），剔除 .DS_Store / __MACOSX / _template.html
5. **交付验收**：包内文件解压后无需任何安装/构建即可运行

### 输出策略
- **小产品（≤4 页面）**：直接逐文件 Write 输出
- **大产品（>4 页面）**：**必须先生成 `_template.html` 骨架模板**，再用并行 Agent 分工生成业务内容

### 大产品并行生成规则（铁律）

当页面 >4 个需要并行 Agent 生成时，**必须严格执行以下流程**：

#### Step 1：主 Agent 先生成 `_template.html`

主 Agent 必须先 Write 一个 `_template.html` 文件到项目目录，包含：
- 完整的 `<head>` 区（CDN引用、公共CSS、**Token 基线**）
- Top Nav 完整 HTML（轻玻璃 + 一级菜单横排的所有链接、Logo、在线态/用户，**无日期/版本号胶囊**）
- 左侧二级菜单 sub-nav 骨架（示例项，供有子功能的页面参照）
- 布局骨架结构（flex容器 + 内容占位 `<!-- CONTENT -->`）
- 抽屉/Toast/Modal 的公共 HTML 模板
- 公共 CSS 全量写入：Token 基线 + `.top-nav/.sub-nav/.btn-pri/.btn-ghost/.field/.pgn/.tag/.card/.dcard`（不允许子Agent修改）

#### Step 2：子 Agent prompt 中必须包含以下约束

```
【强制约束 - 违反即为错误】
1. 先 Read `_template.html`，在其基础上修改生成目标页面
2. 不得修改 top-nav 的任何样式/结构（仅修改一级菜单的 active 位置）
3. 二级菜单：本页有子功能就填 sub-nav 菜单项；无子功能则删掉整个 <aside class="sub-nav">，内容区全宽
4. 不得修改 <style> 中 Token 基线（:root 八变量 + 派生层）与 .top-nav/.sub-nav/.btn-pri/.btn-ghost/.field/.pgn/.tag 定义
5. 布局结构保持：sticky top-nav → flex行(可选 sub-nav + 主内容区)，内容区透明不另绘背景
6. 内容区用 `<div class="flex-1 overflow-y-auto msc">` 内套 `<div class="px-6 py-4 space-y-4">`，不套窄 max-width
7. 只在 <!-- CONTENT --> 区域填充业务内容
8. 业务样式一律 token：hsl(var(--primary) / x%)、hsl(var(--foreground))、hsl(var(--muted-foreground))、hsl(var(--border))
   —— 出现 #2563eb/#409eff/#1e3a8a/#eff6ff/#e8ecf0 等十六进制即为错误（大屏页除外）
9. 状态浅底用 color-mix 派生，禁止写死浅色十六进制
10. 数字/金额/百分比一律加 .num（tabular-nums）；字号只用 12/14/16/18/20/24/32/48
```

#### Step 3：验证一致性（所有页面生成后主 Agent 必须 grep 验证）

```bash
# 1. 布局一致性
grep -L "top-nav-item" *.html                          # 每页都该有顶栏一级菜单
grep -l "side-rail\|rail-item" *.html                 # 不允许残留废弃写法
grep -l "max-w-\[980px\]\|max-w-\[1120px\]" *.html  # 不允许窄容器

# 2. Token 一致性（核心新校验）
grep -l ":root" *.html | wc -l                          # 每页都必须有 Token 基线
grep -n "#2563eb\|#409eff\|#1677ff\|#1e3a8a\|#eff6ff\|#e8ecf0\|#dbeafe\|#e5f1ff" *.html   # 必须为 0 命中（大屏页除外）
grep -c "hsl(var(--primary)" *.html                     # 每页都应大量出现 token 引用
grep -l "backdrop-filter" *.html | xargs grep -L "chrome\|top-nav\|side"   # backdrop-filter 只允许出现在框架层

# 3. 状态完整性
grep -l "showToast\|Toast" *.html | wc -l              # 每页必须有 toast 反馈
grep -c "x-show.*loading\|Empty\|empty" *.html        # loading / empty 状态
```

**任何一项不达标，立即修复后再交付。**

#### Token 化自检清单（每个页面交付前逐条过）

- [ ] `<style>` 第一段是 Token 基线（`:root` 8 个语义变量 + `--card-bg`/`--chrome-bg`/`--shadow-card` 派生）
- [ ] Body 上只有一层主色渐变，页面内无第二处全屏背景
- [ ] 顶栏/侧栏用 `var(--chrome-bg)` + `backdrop-filter`，边界是低透明度内阴影
- [ ] 卡片背景来自 `var(--card-bg)`，无 backdrop-blur，圆角 12px
- [ ] 状态 Tag / 圆点用语义 token（`--success/--warning/--danger/--info`），无硬编码浅色底
- [ ] 字号 ∈ {12,14,16,18,20,24,32,48}，字重 ∈ {400,500,600,700}，数字有 `.num`
- [ ] 间距落在 8/16/24 网格；内容 padding 16px；卡片圆角 12px
- [ ] 每屏只有一个 Primary 主按钮；危险操作走确认弹窗
- [ ] 暗色模式（`prefers-color-scheme`）与 `prefers-reduced-motion` 已由 token 覆盖
- [ ] 无任何硬编码十六进制品牌色 / 状态色 / 中性色

#### 常见错误（子 Agent 容易犯的）

| 错误 | 正确 |
|------|------|
| 做了 side-rail 竖排图标导航 | **已废弃**：一级菜单直接横排在 top-nav 里 |
| top-nav 用白色 `#fff` 背景 | 轻玻璃 `var(--chrome-bg)` + `backdrop-filter` |
| top-nav 高度 56px | 固定 48px |
| top-nav 右侧放日期/时间/版本号胶囊 | 只放"● 智能体在线"绿点 + 用户名 |
| 业务样式写 `#2563eb`/`#409eff`/`#eff6ff` | 一律 `hsl(var(--primary) / x%)` 派生 |
| 状态浅色底写死 `#e5f7ef`/`#fff3dc` | `color-mix(in srgb, hsl(var(--success)) 12%, hsl(var(--background)))` 派生 |
| 内容区套 `max-w-[980px] mx-auto` | 撑满：`flex-1` + 内层 `px-6`，不套窄 max-width |
| 卡片列表一行1个铺满整行 | 一行2个 `grid-cols-2` + 分页 |
| 列表项文字换行 | `truncate` 单行省略号 + `:title` |
| 主内容用 `margin-top/margin-left` | flex-1 自动填充，无需 margin |
| 用红/橙/绿/紫区分不同分类卡片 | 只用主色透明度梯度区分分类 |
| 图标容器背景用浅红/浅橙 | 统一 `hsl(var(--primary) / 8%)`（浅主色） |
| 图表颜色写十六进制 | 从 `TC_COLORS.palette` 取（token 派生） |
| `<img>` 无 onerror 兜底 | 挂 `onerror="botFallback(this)"`，缺失显示占位头像 |
| 重复绘制 body/header/sidebar 背景 | Body 一层渐变，其余透明 |

## `_template.html` 标准骨架（大产品必须先生成此文件 —— Token 基线版）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{页面标题}} - {{产品名}}</title>
<script src="https://cdn.tailwindcss.com"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.0/dist/cdn.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<script src="js/charts.js"></script>
<style>
/* ===== Token 基线（唯一色值来源，业务样式从这里派生）===== */
:root{
  --primary: 214 95% 44%;
  --background: 0 0% 100%;
  --foreground: 218 45% 14%;
  --muted-foreground: 215 18% 45%;
  --border: 213 32% 88%;
  --success: 160 84% 33%;
  --warning: 32 88% 40%;
  --danger:  352 68% 48%;
  --info:    214 15% 50%;
  --card-bg: linear-gradient(110deg,
      color-mix(in srgb, hsl(var(--primary)) 8%, hsl(var(--background))) 0%,
      hsl(var(--background)) 58%,
      color-mix(in srgb, hsl(var(--primary)) 3%, hsl(var(--background))) 100%);
  --chrome-bg: color-mix(in srgb, hsl(var(--background)) 80%, hsl(var(--primary)) 6%);
  --shadow-card: 0 4px 14px hsl(var(--primary) / 7%);
}
@media (prefers-color-scheme: dark){
  :root{
    --background: 214 40% 11%;  --foreground: 210 40% 94%;
    --muted-foreground: 213 22% 68%;  --border: 213 28% 26%;  --success: 158 60% 45%;
    --card-bg: linear-gradient(110deg,
        color-mix(in srgb, hsl(var(--primary)) 16%, hsl(var(--background))) 0%,
        hsl(var(--background)) 58%,
        color-mix(in srgb, hsl(var(--primary)) 8%, hsl(var(--background))) 100%);
    --chrome-bg: color-mix(in srgb, hsl(var(--background)) 74%, hsl(var(--primary)) 8%);
    --shadow-card: 0 4px 14px hsl(0 0% 0% / 25%);
  }
}
@media (prefers-reduced-motion: reduce){ *{transition:none!important;animation:none!important} }
body { font-family:'PingFang SC',-apple-system,sans-serif; margin:0; color:hsl(var(--foreground));
  background: linear-gradient(100deg, hsl(var(--primary) / 12%) 0%, hsl(var(--primary) / 4%) 38%, transparent 62%, hsl(var(--primary) / 4%) 100%) fixed hsl(var(--background)); }
.num{font-variant-numeric:tabular-nums}
.t-strong{color:hsl(var(--foreground))} .t-sub{color:hsl(var(--muted-foreground))} .t-pri{color:hsl(var(--primary))} .t-ok{color:hsl(var(--success))}
.bb{box-shadow:inset 0 -1px 0 hsl(var(--border) / 70%)} .bt{box-shadow:inset 0 1px 0 hsl(var(--border) / 70%)}
.card{background:var(--card-bg);border:1px solid hsl(var(--border));border-radius:12px;box-shadow:var(--shadow-card)}
.msc::-webkit-scrollbar{width:6px} .msc::-webkit-scrollbar-thumb{background:hsl(var(--border));border-radius:3px}
.top-nav { background:var(--chrome-bg); backdrop-filter:blur(14px) saturate(1.35); height:48px; display:flex; align-items:center; padding:0 16px; flex-shrink:0; position:sticky; top:0; z-index:30; box-shadow:inset 0 -1px 0 hsl(var(--border) / 70%); }
.top-nav .logo { display:flex; align-items:center; gap:8px; margin-right:32px; font-size:16px; font-weight:600; color:hsl(var(--foreground)); white-space:nowrap; }
.top-nav .logo img { width:24px; height:24px; border-radius:6px; }
.top-nav-item { color:hsl(var(--muted-foreground)); font-size:14px; padding:0 16px; height:48px; display:flex; align-items:center; gap:6px; white-space:nowrap; text-decoration:none; border-bottom:2px solid transparent; transition:color .2s; }
.top-nav-item:hover { color:hsl(var(--primary)); }
.top-nav-item.active { color:hsl(var(--primary)); font-weight:500; border-bottom-color:hsl(var(--primary)); }
.sub-nav { width:180px; padding:16px 8px; flex-shrink:0; background:var(--chrome-bg); backdrop-filter:blur(12px) saturate(1.3); box-shadow:inset -1px 0 0 hsl(var(--border) / 70%); display:flex; flex-direction:column; gap:2px; overflow-y:auto; }
.sub-nav-item { padding:8px 12px; font-size:14px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:8px; color:hsl(var(--muted-foreground)); transition:background .15s; }
.sub-nav-item:hover { background:hsl(var(--primary) / 6%); color:hsl(var(--primary)); }
.sub-nav-item.active { background:hsl(var(--primary) / 10%); color:hsl(var(--primary)); font-weight:500; }
.btn-pri { height:32px; padding:0 16px; border:0; border-radius:8px; cursor:pointer; font-size:14px; font-weight:500; color:#fff; background:linear-gradient(135deg, color-mix(in srgb, hsl(var(--primary)) 88%, black), hsl(var(--primary))); box-shadow:0 5px 12px hsl(var(--primary) / 18%); }
.btn-ghost { height:32px; padding:0 14px; border:1px solid hsl(var(--border)); border-radius:8px; cursor:pointer; font-size:14px; color:hsl(var(--muted-foreground)); background:hsl(var(--background)); }
.field { height:32px; padding:0 12px; border:1px solid hsl(var(--border)); border-radius:6px; background:hsl(var(--background)); font-size:14px; color:hsl(var(--foreground)); outline:none; }
.field:focus { border-color:hsl(var(--primary)); }
.pgn { min-width:32px; height:32px; padding:0 8px; border-radius:6px; border:1px solid hsl(var(--border)); background:hsl(var(--background)); color:hsl(var(--muted-foreground)); font-size:14px; cursor:pointer; }
.pgn:hover:not(:disabled) { color:hsl(var(--primary)); border-color:hsl(var(--primary) / 50%); }
.pgn.cur { background:hsl(var(--primary)); color:#fff; border-color:hsl(var(--primary)); }
.pgn:disabled { opacity:.4; cursor:not-allowed; }
.tag { display:inline-block; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:600; white-space:nowrap; }
.tag.success { color:hsl(var(--success)); background:color-mix(in srgb, hsl(var(--success)) 12%, hsl(var(--background))); }
.tag.primary { color:hsl(var(--primary)); background:hsl(var(--primary) / 10%); }
.tag.warning { color:hsl(var(--warning)); background:color-mix(in srgb, hsl(var(--warning)) 14%, hsl(var(--background))); }
.tag.danger { color:hsl(var(--danger)); background:color-mix(in srgb, hsl(var(--danger)) 10%, hsl(var(--background))); }
.tag.info { color:hsl(var(--info)); background:color-mix(in srgb, hsl(var(--info)) 12%, hsl(var(--background))); }
.msc::-webkit-scrollbar{width:6px} .msc::-webkit-scrollbar-thumb{background:hsl(var(--border));border-radius:3px}
[x-cloak]{display:none!important}
</style>
</head>
<body x-data="pageApp()" x-init="init()">

<!-- Top Nav：轻玻璃 + 一级菜单横排（不用 side-rail，不放时间/版本号胶囊） -->
<nav class="top-nav">
  <div class="logo"><img src="image/icon.png" alt="" onerror="botFallback(this)">{{产品名}}</div>
  <a href="index.html" class="top-nav-item active"><i class="fa fa-bolt"></i>模块一</a>
  <a href="module2.html" class="top-nav-item"><i class="fa fa-heart-pulse"></i>模块二</a>
  <a href="module3.html" class="top-nav-item"><i class="fa fa-comments"></i>模块三</a>
  <a href="agent-tools.html" class="top-nav-item"><i class="fa fa-toolbox"></i>智能体工具</a>
  <div class="ml-auto flex items-center gap-4 text-[14px]" style="color:hsl(var(--muted-foreground))">
    <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full" style="background:hsl(var(--success))"></span>智能体在线</span>
    <span class="flex items-center gap-1.5"><i class="fa fa-user-circle"></i>{{用户名}}</span>
  </div>
</nav>

<!-- 主体：（可选）左侧二级菜单 + 内容区 -->
<div class="flex" style="height: calc(100vh - 48px);">
  <!-- 二级菜单：仅当本页有子功能时才放；无子功能则删掉这个 aside，内容区自然全宽 -->
  <aside class="sub-nav">
    <div class="sub-nav-item active" @click="activeTab='sub1'"><i class="fa fa-layer-group text-xs w-4"></i>子功能1</div>
    <div class="sub-nav-item" @click="activeTab='sub2'"><i class="fa fa-filter text-xs w-4"></i>子功能2</div>
  </aside>

  <!-- 内容区：撑满，不套窄 max-width -->
  <div class="flex-1 overflow-y-auto msc">
    <div class="px-6 py-4 space-y-4">
      <!-- CONTENT: 子 Agent 只在此区域填充业务内容 -->
    </div>
  </div>
</div>

<!-- 右侧抽屉（公共） -->
<div x-show="drawerOpen" x-transition.opacity class="fixed inset-0 z-50" x-cloak>
  <div class="absolute inset-0" style="background:hsl(0 0% 0% / 40%)" @click="drawerOpen=false"></div>
  <aside class="absolute right-0 top-0 bottom-0 w-[480px] max-w-[94vw] overflow-y-auto msc"
         style="background:hsl(var(--background));box-shadow:-6px 0 24px hsl(0 0% 0% / 12%)"
         x-transition:enter="transition transform duration-300" x-transition:enter-start="translate-x-full" x-transition:enter-end="translate-x-0"
         x-transition:leave="transition transform duration-300" x-transition:leave-start="translate-x-0" x-transition:leave-end="translate-x-full">
    <header class="h-12 px-5 flex items-center sticky top-0 z-10" style="background:hsl(var(--background));box-shadow:inset 0 -1px 0 hsl(var(--border) / 70%)">
      <span class="text-[14px] font-semibold" x-text="drawerTitle"></span>
      <button class="ml-auto w-7 h-7 rounded flex items-center justify-center text-[12px]" style="color:hsl(var(--muted-foreground))" @click="drawerOpen=false"><i class="fa fa-times"></i></button>
    </header>
    <div class="p-5 space-y-4" x-html="drawerContent"></div>
  </aside>
</div>

<!-- Toast（公共） -->
<div class="fixed top-14 right-5 z-[9999] space-y-2">
  <template x-for="t in toasts" :key="t.id">
    <div class="px-4 py-2.5 rounded-lg text-white text-[14px]" style="box-shadow:0 6px 18px hsl(0 0% 0% / 18%)"
         :style="'background:hsl(var(--'+(t.type==='success'?'success':t.type==='error'?'danger':t.type==='warn'?'warning':'primary')+'))'"
         x-text="t.message" x-show="!t.removing" x-transition></div>
  </template>
</div>

<!-- LOOP 抽屉 + 批注层：从 references/loop-tray.html 与 references/annotator.html 原样粘贴到 </body> 前 -->

<script>
function pageApp() {
  return {
    activeTab: 'tab1',
    drawerOpen: false,
    drawerTitle: '',
    drawerContent: '',
    toasts: [],
    _toastId: 0,
    init() { /* 加载数据 */ },
    showToast(message, type = 'info') {
      const id = ++this._toastId;
      this.toasts.push({ id, message, type, removing: false });
      setTimeout(() => {
        const t = this.toasts.find(t => t.id === id);
        if (t) t.removing = true;
        setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 300);
      }, 2500);
    },
    openDrawer(title, content) {
      this.drawerTitle = title;
      this.drawerContent = content;
      this.drawerOpen = true;
    }
  };
}
</script>
</body>
</html>
```

**子 Agent 必须 Read 此文件，在其基础上只替换：**
1. `<title>` 中的页面标题
2. Top Nav 中一级菜单的 `.active` 位置（改成本页对应的那一条）
3. 左侧二级菜单：本页有子功能就填菜单项，无子功能就**整个删掉 `<aside class="sub-nav">`**（内容区自然全宽）
4. `<!-- CONTENT -->` 区域填充业务 HTML
5. `<script>` 中的 `pageApp()` 函数业务逻辑

**绝对不允许子 Agent 修改的部分：**
- `<style>` 中的所有 CSS 定义
- Top Nav 的 HTML 结构和类名（只改 active）
- 二级菜单 sub-nav 的样式类名（只改菜单项文字和 active）
- 整体 flex 布局结构
- 抽屉/Toast 的公共模板

---

## 页面模板参考

### 首页/总览页标准结构
```
Top Nav（一级菜单横排，总览页无二级菜单，内容全宽 px-6）
→ 维度说明条
→ 6 KPI 卡（grid-cols-6）
→ 2×2 图表网格（年龄分布+职称分布+学历分布+编制分布）
→ 排名 TOP10 横向柱状图
→ AI 洞察抽屉（可选）
```

### 列表/管理页标准结构
```
Top Nav（一级菜单横排）+ 可选左侧二级菜单
→ 筛选条（科室/状态/时间/关键词）
→ 卡片网格(grid-cols-2)或数据表格（可排序、可分页、行可点击）
→ 详情抽屉（点击行打开）
```

### 对话页标准结构（AI 智能体产品的核心页 — 三栏，照此搭）

AI 智能体产品的对话页**不是普通聊天框**，要让人一眼看出"背后是个懂业务、有数据、有依据的智能体"。标准三栏：

```
Top Nav（一级菜单横排，对话页无二级菜单）
├── 左栏 260px：会话列表
│    · "新对话"按钮（蓝色）
│    · "常问的" 预设问题（点击即提问，truncate 单行截断）
│    · "近期对话" 历史（truncate + 悬停出编辑/删除）
├── 中栏 flex-1：消息区
│    · 顶部细条："当前对话：{智能体名}"（浅蓝 chip）
│    · 空状态：预设问题卡片墙（grid-cols-2）
│    · 用户气泡：靠右 justify-end，蓝底白字
│    · AI 气泡：靠左，头像 + 内容区 flex-1（见下方"气泡对齐"）
│    · AI 回答分三段流式：结论(加粗) → 判断依据(逐条) → 追问建议(chip)
│    · 每条 AI 消息底部操作行：有用/无用/复制/重新生成
│    · 底部：模型选择器chip + 智能体下拉 + 输入框
└── 右栏 300px：智能体上下文面板（关键 — 这栏定义"它是智能体"）
     6 个区块，每块小标题带左侧竖蓝条：
     1. 智能体状态（绿点+名称+覆盖场景）
     2. 置信度（百分比 + 蓝色进度条 + 依据说明）
     3. 知识库（列出数据源，带 fa-database 图标）
     4. 技能（一堆蓝色 chip：研判/预测/生成/...）
     5. 数据来源（实时库 + 同步时间）
     6. 建议追问（带 › 箭头，点击即提问）
```

**气泡右边缘对齐（治"提问和回答对不齐"）**：用户气泡和 AI 气泡的右边缘要在同一条竖线上。做法是 AI 气泡的内容区用 `flex-1 min-w-0`（撑满头像右侧空间），用户气泡 `justify-end` 贴右，两者右边缘就齐了：
```html
<!-- AI 气泡：头像 + flex-1 内容区，右边缘到容器边 -->
<div class="flex justify-start gap-2.5">
  <div class="w-8 h-8 rounded-lg flex-shrink-0">...头像...</div>
  <div class="flex-1 min-w-0">...气泡内容...</div>   <!-- 不是 max-w-[80%]，那样右边缘会缩进 -->
</div>
<!-- 用户气泡：靠右，max-w 限宽但右边缘贴容器边 -->
<div class="flex justify-end">
  <div class="bubble-user max-w-[80%]" x-text="m.text"></div>
</div>
```

**流式分段渲染（结论→依据）用幂等写法，禁止 push 叠条**：
```js
// 依据逐条冒出，用 slice 赋值而非 push——重新生成时不会重复叠加
streamReasons(idx, ri) {
  this.messages[idx].stage = 'reasons';
  const reasons = this.messages[idx].reasons;
  if (ri >= reasons.length) { setTimeout(()=>{ this.messages[idx].stage='done'; this.replying=false; }, 200); return; }
  this.messages[idx].reasonsShown = reasons.slice(0, ri + 1);   // slice 幂等，不用 push
  setTimeout(()=>this.streamReasons(idx, ri+1), 420);
}
```

> 完整可参考的实现见"代理商运营参谋"原型的 chat.html（三栏 + 右栏上下文面板 + 流式分段 + 消息操作 + 会话编辑删除，全部落地过）。

---

## 与其他技能的关系

| 技能 | 关系 |
|------|------|
| `product-feature-spec` | 上游——先生成功能清单，再基于清单生成原型 |
| `product-doc-to-word` | 平级——原型和 Word 文档是产品的两种输出形态 |
| `vben-page-generator` | 下游——原型验证通过后，可用此技能迁移为 Vue3 生产代码 |

---

## 核心规则

### 高保真 = 真实可交互
- 不是线框图，不是截图，是**浏览器打开就能点的完整系统**
- 每个按钮必须有真实响应（loading → 成功/失败）
- 图表必须是 ECharts 真实渲染（不是图片）
- 数据必须来自 data/*.json（不是写死在 HTML 里）

### 设计一致性
- **严格 Token 化**：业务样式零硬编码色值，一律 `hsl(var(--primary) / x%)` / 语义 token 派生；改主题色=改一行 token
- 四层视觉结构：Body 主色渐变 → Chrome 轻玻璃 → Content 透明 → Cards 近实底（对齐"配色系统"章节）
- 所有页面共享 Top Nav（一级菜单横排）骨架；有子功能的页面加左侧二级 sub-nav
- 内容区撑满不留大白边；能一屏放下的别出滚动条
- 字号阶 12/14/16/18/20/24/32/48，字重 400/500/600/700，KPI/表格数字 `tabular-nums`
- 间距 8px 网格：页面 padding 16px、卡片间距 16px、大区块 24px、卡片圆角 12px

### 数据真实感
- mock 数据要有业务感（不是 Lorem ipsum）
- 数字要合理（人数几百到几千，百分比在合理范围）
- 实体名要像真的（科室名、人名、诊断名）

### 代码质量
- 每个页面是独立完整的 HTML（浏览器直接打开可运行）
- Alpine.js 状态管理清晰（一个 `x-data` 函数管全页）
- CSS 优先用 Tailwind 原子类，自定义 CSS 仅限公共组件样式；颜色一律 token，禁止原子类里写十六进制（`bg-[#2563eb]` 这类禁止，用 `style="background:hsl(var(--primary))"`）
- 图表配置继承 `TC_ECHARTS` / `TC_COLORS`（运行时读 token，自动跟随主题/暗色）
- 弹层默认 `x-cloak`，防闪烁

### Logo 固定
- 所有页面 Top Nav 左侧必须有 `image/icon.png`（挂 `onerror="botFallback(this)"` 兜底）
- 该文件从技能 `images/` 目录复制（360 安全云 Logo）
- 智能体头像统一 `image/bot.png`（聊天/LOOP 抽屉/智能体列表），同样挂 onerror 兜底
