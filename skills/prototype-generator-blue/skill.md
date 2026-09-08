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
├── image/
│   ├── icon.png            平台 Logo（★必带 — 顶部导航左上角，从技能 images/ 复制）
│   └── bot.png             智能体头像（★必带 — 聊天/LOOP抽屉/智能体列表统一用它，从技能 images/ 复制）
├── js/
│   └── charts.js           ECharts 公共配置（TC_COLORS / TC_ECHARTS / TC_FMT）
└── data/
    ├── stats.json           全局统计数据
    ├── <entity>.json        业务实体数据（人员/患者/案例/订单等）
    └── <module>.json        模块级 mock 数据
```

---

## 配色系统（铁律）

### 主色（蓝色族，平台唯一品牌色）
| 用途 | 色值 |
|------|------|
| Deep Blue（最深） | `#1e3a8a` |
| Mid Blue | `#1e40af` |
| Primary Dark | `#1d4ed8` |
| Primary（主色） | `#2563eb` |
| Primary Medium | `#3b82f6` |
| Primary Light | `#60a5fa` |
| Border Blue | `#bfdbfe` |
| Soft Blue（浅蓝背景） | `#dbeafe` |
| Lightest Blue（最浅背景） | `#eff6ff` |

**分类/分组场景配色规则**：当页面内有多个平行分类（如6个主题域、4个模块、5种数据源类型），**只用蓝色族的深浅梯度区分**，不允许用红橙绿紫等彩色区分。例如：
```
分类1: #1e3a8a (最深)
分类2: #1d4ed8
分类3: #2563eb (主色)
分类4: #1e40af
分类5: #3b82f6
分类6: #60a5fa (最浅)
```

### 中性色
| 用途 | 色值 |
|------|------|
| 主文 | `#333` |
| 辅文 | `#475569` |
| 占位 | `#999` |
| 页面底 | `#f5f7fa` |
| 卡片底 | `#ffffff` |
| 分隔线 | `#e8ecf0` |

### 状态色（仅 3 色，严格限定使用范围）
| 状态 | 色值 | **允许用在** | **禁止用在** |
|------|------|------------|------------|
| 危险/高风险 | `#dc2626` | 状态小圆点(8px)、标签文字、边框线 | ❌ 卡片大面积背景、图标背景、进度条 |
| 警示/中风险 | `#d97706` | 状态小圆点、标签文字、边框线 | ❌ 卡片大面积背景、图标背景、进度条 |
| 健康/正常 | `#059669` | 状态小圆点、标签文字、边框线 | ❌ 卡片大面积背景、图标背景、进度条 |

**状态色核心原则**：状态色只做"点缀"不做"铺底"。卡片背景、图标容器背景、进度条填充一律用蓝色族，状态色仅限文字/小圆点/细边框。

### 浅色背景白名单（只允许以下浅色）
| 色值 | 用途 |
|------|------|
| `#eff6ff` | 浅蓝背景（卡片、图标容器、高亮行） |
| `#dbeafe` | 次浅蓝背景（标签背景、hover态） |
| `#f5f7fa` | 页面底色 |
| `#ffffff` | 卡片底色 |

**以下浅色全部禁止**：`#fef2f2`(浅红) `#fff7ed`(浅橙) `#fefce8`(浅黄) `#f0fdf4`(浅绿) `#ecfdf5`(浅翠) `#faf5ff`(浅紫) `#fdf2f8`(浅粉) — 需要浅色背景时一律用 `#eff6ff`

### 严禁
- 紫色（`#7c3aed` `#6366f1` 等）、粉色、霓虹色、青色（`#0891b2`）
- 在同一页面内用超过2种非蓝色（状态色除外的点缀也不能同时出现3种以上）
- Tailwind 的 `purple-` `orange-` `cyan-` `teal-` `pink-` `rose-` `violet-` `fuchsia-` `lime-` 系列类名
- 多层 box-shadow 堆叠
- 全屏渐变背景（仅登录页/大屏导航例外）
- 毛玻璃 backdrop-filter（仅登录页/大屏例外）

---

## 全局布局骨架（所有业务页强制）

```
┌──────────────────────────────────────────────────────────┐
│ Top Nav (48px): Logo + 一级菜单(模块横排) + 状态 + 用户    │
├─────────┬────────────────────────────────────────────────┤
│ 二级菜单 │                                                │
│ (纵向    │         内容区（撑满，px-8，不套窄 max-width）  │
│  200px   │                                                │
│  可选)   │                                                │
│ · 子功能1│         无子功能的页面：删掉左栏，内容区全宽    │
│ · 子功能2│                                                │
│ · 子功能3│                                                │
│ · 子功能4│                                                │
└─────────┴────────────────────────────────────────────────┘
```

**布局规则**：
- 一级菜单横排在 Top Nav 里（Logo 右边的 `<a>` 链接），**不做 side-rail 竖排图标栏**
- 二级菜单在左侧纵向（Sub Menu，200px宽），**仅有子功能的页面才显示**
- 没有子功能的页面（仪表盘、作战台、对话页）不显示左侧二级菜单，内容区全宽
- 有子功能的页面（如安全：敏感分级/加密/脱敏/权限），左侧显示纵向二级菜单

### 导航层级（铁律 — 唯一标准，不用 side-rail 竖排图标）

| 层级 | 区域 | 样式特征 | 内容 |
|------|------|---------|------|
| **一级** | Top Nav (48px) | 白底+下划线active+13px字+横排 | Logo + **模块菜单横排** + 右侧状态/用户 |
| **二级** | 左侧 Sub Menu (200px) | 白底+圆角高亮active+13px字+纵向 | 当前模块的子功能列表（**仅有子功能的页面才显示**） |

**铁律 3 条**：
1. **一级菜单直接放在 Top Nav 里**（Logo 右边横排 `<a>` 链接），不要另做一条 side-rail 竖排图标栏。侧边竖排图标栏（rail-item）已废弃，不再使用。
2. **二级菜单按需出现**：没有子功能的页面（作战台、驾驶舱、对话页）不显示左侧二级菜单，内容区全宽；有子功能的页面（如健康监测下分 全部/风险/正常）左侧显示 200px 纵向二级菜单。
3. **active 联动**：当前页在 Top Nav 里高亮（下划线），进入后左侧二级菜单第一项默认 active。

### Top Nav CSS（一级菜单 — 白色背景，每页必含）
```css
.top-nav { background: #fff; height: 48px; border-bottom: 1px solid #e8ecf0; display: flex; align-items: center; padding: 0 16px; flex-shrink: 0; position: sticky; top: 0; z-index: 30; }
.top-nav .logo { display: flex; align-items: center; gap: 8px; margin-right: 32px; font-size: 15px; font-weight: 600; color: #1e3a8a; white-space: nowrap; }
.top-nav .logo img { width: 24px; height: 24px; }
.top-nav-item { color: #666; font-size: 13px; padding: 0 16px; height: 48px; display: flex; align-items: center; gap: 6px; white-space: nowrap; text-decoration: none; border-bottom: 2px solid transparent; transition: all 0.2s; }
.top-nav-item:hover { color: #2563eb; }
.top-nav-item.active { color: #2563eb; font-weight: 500; border-bottom-color: #2563eb; }
```

### Top Nav HTML（一级菜单横排 — 每页必含，只改 active 位置）
```html
<nav class="top-nav">
  <div class="logo"><img src="image/icon.png" alt="">{产品名}</div>
  <a href="index.html" class="top-nav-item active"><i class="fa fa-bolt"></i>模块一</a>
  <a href="module2.html" class="top-nav-item"><i class="fa fa-heart-pulse"></i>模块二</a>
  <a href="module3.html" class="top-nav-item"><i class="fa fa-comments"></i>模块三</a>
  <div class="ml-auto flex items-center gap-4 text-[13px] text-[#475569]">
    <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>在线</span>
    <span>{日期}</span>
    <span><i class="fa fa-user-circle mr-1"></i>{用户名}</span>
  </div>
</nav>
```
一级菜单链接直接跳转到对应页面（`href`），不用 activeTab。每页只把自己那条设为 `active`。

### Sub Menu CSS（二级菜单 — 有子功能的页面才有）
```css
.sub-menu { width: 200px; background: #ffffff; border-right: 1px solid #e8ecf0; padding: 16px 12px; flex-shrink: 0; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; box-shadow: 2px 0 8px rgba(0,0,0,0.04); }
.sub-menu-item { padding: 9px 14px; font-size: 13px; color: #475569; border-radius: 8px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 10px; white-space: nowrap; line-height: 1.4; }
.sub-menu-item:hover { color: #2563eb; background: #eff6ff; }
.sub-menu-item.active { color: #2563eb; background: #eff6ff; font-weight: 500; border-left: 3px solid #2563eb; }
```

**二级菜单项必须带图标**：
```html
<div class="sub-menu-item" :class="{'active': activeTab==='xxx'}" @click="activeTab='xxx'">
  <i class="fa fa-{icon} text-xs w-4"></i> 菜单名称
</div>
```
每个菜单项前面加一个FontAwesome图标（`text-xs w-4` 保证对齐）。

### 数据表格样式规范（铁律 — 对标 Vben Admin / vxe-table 风格）

所有数据列表必须遵循以下样式，对标 Element Plus + vxe-table 的企业级管理系统：

```css
/* 表格容器 */
.data-table-wrap { background: #fff; border-radius: 8px; border: 1px solid #ebeef5; overflow: hidden; }

/* 表头：浅灰底 + 灰色文字 + 底部灰线 */
table thead tr { background: #fafafa; border-bottom: 1px solid #ebeef5; }
table th { padding: 12px 16px; font-size: 13px; font-weight: 600; color: #606266; text-align: left; }

/* 表格行 */
table td { padding: 12px 16px; font-size: 13px; color: #333; border-bottom: 1px solid #ebeef5; }
table tr:hover td { background: #f5f7fa; }
table tr:last-child td { border-bottom: none; }

/* 操作列：文字链接风格（对标 ElButton link） */
.action-link { color: #409eff; font-size: 13px; cursor: pointer; margin-right: 16px; }
.action-link:hover { color: #66b1ff; }
.action-link--danger { color: #f56c6c; }
.action-link--danger:hover { color: #f89898; }
```

**表格设计要点（对标截图）**：
- 表头背景 `#fafafa`（极浅灰），文字 `#606266`（中灰）
- 行间分隔线 `#ebeef5`
- 行hover背景 `#f5f7fa`
- 操作列：蓝色文字"查看"/"编辑"（`#409eff`）+ 红色"删除"（`#f56c6c`），文字链接无下划线
- 分页条：左侧"共N条记录 10条/页▼"，右侧 `|< << < 1 2 3 > >> >|`

**搜索栏（表格上方，与表格容器border连接）**：
```html
<div class="bg-white rounded-t-lg border border-[#ebeef5] border-b-0 px-4 py-3 flex items-center gap-4">
  <label class="text-sm text-[#606266] whitespace-nowrap">名称</label>
  <input type="text" x-model="searchText" class="h-8 px-3 border border-[#dcdfe6] rounded text-sm w-48 focus:border-[#409eff] outline-none" placeholder="请输入">
  <button class="h-8 px-4 bg-[#409eff] text-white text-sm rounded hover:bg-[#66b1ff] transition-colors" @click="currentPage=1">搜索</button>
  <button class="h-8 px-4 border border-[#dcdfe6] text-sm rounded text-[#606266] hover:text-[#409eff] hover:border-[#409eff] transition-colors" @click="searchText=''; currentPage=1">重置</button>
</div>
```

**表格主体（紧接搜索栏）**：
```html
<div class="bg-white rounded-b-lg border border-[#ebeef5] overflow-hidden">
  <table class="w-full text-sm">
    <thead>
      <tr class="bg-[#fafafa]" style="border-bottom: 1px solid #ebeef5;">
        <th class="px-4 py-3 text-left font-semibold text-[#606266]">列名</th>
        <th class="px-4 py-3 text-right font-semibold text-[#606266]">操作</th>
      </tr>
    </thead>
    <tbody>
      <template x-for="item in paginatedItems()" :key="item.id">
        <tr class="border-b border-[#ebeef5] last:border-b-0 hover:bg-[#f5f7fa] transition-colors">
          <td class="px-4 py-3 text-[#303133]" x-text="item.name"></td>
          <td class="px-4 py-3 text-right">
            <span class="text-[#409eff] hover:text-[#66b1ff] text-sm cursor-pointer mr-4" @click="handleView(item)">查看</span>
            <span class="text-[#409eff] hover:text-[#66b1ff] text-sm cursor-pointer mr-4" @click="handleEdit(item)">编辑</span>
            <span class="text-[#f56c6c] hover:text-[#f89898] text-sm cursor-pointer" @click="handleDelete(item)">删除</span>
          </td>
        </tr>
      </template>
    </tbody>
  </table>
  <!-- 分页条 -->
  <div class="flex items-center justify-between px-4 py-3 border-t border-[#ebeef5]">
    <span class="text-sm text-[#606266]">共 <span class="font-medium" x-text="totalCount"></span> 条记录
      <select class="ml-2 h-7 px-2 border border-[#dcdfe6] rounded text-sm text-[#606266] outline-none bg-white" x-model.number="pageSize" @change="currentPage=1">
        <option value="10">10条/页</option>
        <option value="20">20条/页</option>
        <option value="50">50条/页</option>
      </select>
    </span>
    <div class="flex items-center gap-1">
      <button class="w-8 h-8 rounded border border-[#dcdfe6] text-[#606266] hover:text-[#409eff] hover:border-[#409eff] transition-colors flex items-center justify-center text-xs" :disabled="currentPage<=1" @click="currentPage=1">
        <i class="fa fa-angle-double-left"></i>
      </button>
      <button class="w-8 h-8 rounded border border-[#dcdfe6] text-[#606266] hover:text-[#409eff] hover:border-[#409eff] transition-colors flex items-center justify-center text-xs" :disabled="currentPage<=1" @click="currentPage--">
        <i class="fa fa-angle-left"></i>
      </button>
      <template x-for="p in Math.ceil(totalCount/pageSize)" :key="p">
        <button class="w-8 h-8 rounded text-sm transition-colors"
                :class="p===currentPage ? 'bg-[#409eff] text-white' : 'border border-[#dcdfe6] text-[#606266] hover:text-[#409eff] hover:border-[#409eff]'"
                x-text="p" @click="currentPage=p"></button>
      </template>
      <button class="w-8 h-8 rounded border border-[#dcdfe6] text-[#606266] hover:text-[#409eff] hover:border-[#409eff] transition-colors flex items-center justify-center text-xs" :disabled="currentPage>=Math.ceil(totalCount/pageSize)" @click="currentPage++">
        <i class="fa fa-angle-right"></i>
      </button>
      <button class="w-8 h-8 rounded border border-[#dcdfe6] text-[#606266] hover:text-[#409eff] hover:border-[#409eff] transition-colors flex items-center justify-center text-xs" :disabled="currentPage>=Math.ceil(totalCount/pageSize)" @click="currentPage=Math.ceil(totalCount/pageSize)">
        <i class="fa fa-angle-double-right"></i>
      </button>
    </div>
  </div>
</div>
```

**核心色值（Element Plus / vxe-table）**：
| 元素 | 色值 |
|------|------|
| 表头背景 | `#fafafa` |
| 表头文字 | `#606266` |
| 正文文字 | `#303133` |
| 边框线 | `#ebeef5` |
| 行hover | `#f5f7fa` |
| 操作-查看/编辑 | `#409eff`（Element蓝） |
| 操作-删除 | `#f56c6c`（Element红） |
| 按钮-主色 | `#409eff` |
| 输入框focus | `border: #409eff` |
| 分页-当前页 | `bg-[#409eff] text-white` |

**一级 vs 二级视觉区分**：
- 一级：顶部横排、白底、下划线 active
- 二级：左侧纵向、白底、圆角填色 active、字号相同但位置不同

### 内容区宽度与密度（铁律 — 治"留白太空"和"整页滚动"）

**内容区默认撑满，不要用窄的 max-width 居中。** 常见错误是套 `max-w-[980px] mx-auto`，大屏上两侧留一大片空白，很难看。正确做法：

```html
<!-- ✅ 内容区撑满，只留左右内边距 -->
<div class="flex-1 overflow-y-auto">
  <div class="px-8 py-6 space-y-5"><!-- 内容 --></div>
</div>
```

- 内容区用 `px-6`~`px-8` 内边距，**不套 max-width**（让内容跟着屏幕宽度走）。
- 只有一种例外：**纯阅读型长文**（如协议、说明）可以用 `max-w-[820px]`，因为长行不利阅读。业务页（列表、卡片、仪表盘、对话）一律撑满。
- 超宽屏（≥2560px）担心内容被拉太散时，最多用 `max-w-[1600px] mx-auto` 这种**大**上限，绝不用 980/1120 这种窄的。

**密度要求：能一屏放下的，别让它出现整页滚动条。** 侧边面板、右栏、卡片区，间距和 padding 要克制：区块间距用 `space-y-3.5`~`space-y-4`（不是 `space-y-6`），卡片内 padding 用 `p-2.5`~`p-3`（不是 `p-4`~`p-5`），小字用 `text-[12px]`。一屏能容纳的信息量优先，滚动是最后手段。

---

## 核心组件模板

### 维度说明条（Killer Pattern — 每个分析页必有）
```html
<section class="bg-gradient-to-r from-[#eff6ff] to-white border border-[#bfdbfe] rounded-lg px-4 py-2.5 flex items-center justify-between">
  <div class="flex items-center gap-3">
    <div class="w-9 h-9 rounded-md bg-[#2563eb] text-white flex items-center justify-center flex-shrink-0">
      <i class="fa fa-{icon} text-[14px]"></i>
    </div>
    <div>
      <div class="text-sm font-semibold text-[#1e3a8a]">{维度标题}</div>
      <div class="text-[11.5px] text-[#1e40af] mt-0.5">{规则副文}</div>
    </div>
  </div>
  <div class="text-[12px] text-[#1e40af]">命中 <span class="text-[15px] font-semibold">{N}</span> 项</div>
</section>
```

### KPI 卡
```html
<div class="bg-white rounded-lg border border-[#e8ecf0] p-4 cursor-pointer hover:shadow-md transition-shadow">
  <div class="flex items-center justify-between">
    <span class="text-[#999] text-[13px]">{label}</span>
    <i class="fa fa-{icon} text-[#2563eb]"></i>
  </div>
  <div class="flex items-baseline gap-2 mt-1">
    <span class="text-xl font-semibold text-[#333]">{value}</span>
    <span class="text-[11px] text-emerald-600">↑ {delta}%</span>
  </div>
</div>
```

### 右侧抽屉（详情/AI/配置通用）
```html
<div x-show="drawerOpen" x-transition.opacity class="fixed inset-0 z-50">
  <div class="absolute inset-0 bg-black/40" @click="drawerOpen = false"></div>
  <aside class="absolute right-0 top-0 bottom-0 w-[480px] bg-white shadow-xl overflow-y-auto"
         x-transition:enter="transition transform" x-transition:enter-start="translate-x-full" x-transition:enter-end="translate-x-0">
    <header class="h-12 px-5 flex items-center border-b border-[#e8ecf0] sticky top-0 bg-white z-10">
      <span class="text-sm font-medium" x-text="drawerTitle"></span>
      <button class="ml-auto w-7 h-7 rounded flex items-center justify-center hover:bg-[#f5f7fa] text-[#999]" @click="drawerOpen = false">
        <i class="fa fa-times"></i>
      </button>
    </header>
    <div class="p-5 space-y-4"><!-- 内容 --></div>
  </aside>
</div>
```

### 抽屉按钮样式规范（铁律）

抽屉底部的操作按钮**必须美观统一**，禁止光秃秃的纯文字按钮：

| 按钮类型 | 样式 |
|---------|------|
| **主操作（保存/确认/提交）** | `class="w-full py-2.5 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8] transition-colors"` |
| **次操作（关闭/取消）** | `class="w-full py-2.5 rounded-lg border border-[#e8ecf0] text-[#475569] text-sm font-medium hover:bg-[#f5f7fa] transition-colors"` |
| **双按钮布局** | 用 `<div class="flex gap-3 pt-4">` 包裹，主操作用 `flex-1`，次操作用 `flex-1` |

```html
<!-- 双按钮示例 -->
<div class="flex gap-3 pt-4">
  <button class="flex-1 py-2.5 rounded-lg border border-[#e8ecf0] text-[#475569] text-sm font-medium hover:bg-[#f5f7fa] transition-colors" @click="drawerOpen=false">
    <i class="fa fa-times mr-1.5 text-xs"></i>取消
  </button>
  <button class="flex-1 py-2.5 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8] transition-colors" @click="handleSave()">
    <i class="fa fa-check mr-1.5 text-xs"></i>保存
  </button>
</div>

<!-- 单按钮（查看详情类抽屉） -->
<div class="pt-4">
  <button class="w-full py-2.5 rounded-lg border border-[#e8ecf0] text-[#475569] text-sm font-medium hover:bg-[#f5f7fa] transition-colors" @click="drawerOpen=false">
    <i class="fa fa-times mr-1.5 text-xs"></i>关闭
  </button>
</div>
```

**禁止**：
- ❌ `class="btn-outline flex-1"` 配纯文字"关闭"（太丑）
- ❌ 按钮没有 hover 效果
- ❌ 按钮没有圆角 `rounded-lg`
- ❌ 按钮没有图标（关闭用 fa-times，保存用 fa-check，删除用 fa-trash）

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

**分页 HTML 模板**（插在表格容器之后）：
```html
<div class="flex items-center justify-between px-1 py-3">
  <span class="text-xs text-[#999]">共 <span class="font-medium text-[#333]" x-text="filteredItems.length"></span> 条</span>
  <div class="flex items-center gap-1">
    <button class="px-3 py-1.5 text-xs rounded-md border border-[#e8ecf0] text-[#475569] hover:bg-[#eff6ff] hover:text-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :disabled="currentPage <= 1" @click="currentPage--">
      <i class="fa fa-chevron-left text-[10px]"></i> 上一页
    </button>
    <template x-for="p in Math.ceil(filteredItems.length / pageSize)" :key="p">
      <button class="w-8 h-8 text-xs rounded-md border transition-colors"
              :class="p === currentPage ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'border-[#e8ecf0] text-[#475569] hover:bg-[#eff6ff] hover:text-[#2563eb]'"
              x-text="p" @click="currentPage = p"></button>
    </template>
    <button class="px-3 py-1.5 text-xs rounded-md border border-[#e8ecf0] text-[#475569] hover:bg-[#eff6ff] hover:text-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :disabled="currentPage >= Math.ceil(filteredItems.length / pageSize)" @click="currentPage++">
      下一页 <i class="fa fa-chevron-right text-[10px]"></i>
    </button>
    <select class="ml-2 px-2 py-1.5 text-xs border border-[#e8ecf0] rounded-md text-[#475569] outline-none" x-model.number="pageSize" @change="currentPage=1">
      <option value="10">10条/页</option>
      <option value="20">20条/页</option>
      <option value="50">50条/页</option>
    </select>
  </div>
</div>
```

**分页配色**（只用这些颜色）：
- 当前页按钮：`bg-[#2563eb] text-white border-[#2563eb]`
- 非当前页：`border-[#e8ecf0] text-[#475569]`
- Hover：`bg-[#eff6ff] text-[#2563eb]`
- 禁用：`opacity-40 cursor-not-allowed`
- 统计文字：`text-[#999]`，数字 `text-[#333]`

**切换Tab/筛选时必须重置分页**：
```html
@click="activeTab='xxx'; currentPage=1"
```

### 卡片网格布局（列表也适用，治"一行1个太空"）

**卡片/要紧事/信息块列表不要单列铺满整行**——一行1个大卡在宽屏上左右一大片空，很丑。默认**一行2个**（`grid-cols-2`），信息量小的可 3~4 个：

```html
<div class="grid grid-cols-2 gap-4">
  <template x-for="item in pagedItems()" :key="item.id">
    <div class="bg-white rounded-xl border border-[#e8ecf0] p-5 flex flex-col">...</div>
  </template>
</div>
```

- 卡片网格**同样要分页**（每页 4/6/8 个，正好铺满 2~4 行）。分页控件复用上面的模板。
- 分页返回的是**副本**（如果 `.map(x=>({...x}))` 加了序号），那么卡片上的动作（删除/标记）要**按 id 找回原数组的项**来改，否则改副本列表不更新：
  ```js
  orig(item) { return this.items.find(i => i.id === item.id) || item; },
  dismiss(item) { this.orig(item).status = 'done'; }  // 改原项，卡片才会消失
  ```

### 列表项文字截断（治"换行难看"）

会话列表、菜单项、标签这类**单行列表项**，文字过长必须截断成省略号，不要换行：

```html
<div class="flex items-center gap-2.5" :title="item.title">
  <i class="fa fa-comment text-[#999] flex-shrink-0"></i>
  <span class="text-[13px] text-[#333] truncate flex-1" x-text="item.title"></span>
</div>
```
关键：`truncate`（单行省略号）+ 父容器 `flex` + 文字 `flex-1 min-w-0` + 图标 `flex-shrink-0`。加 `:title` 让悬停能看全文。**禁止用 `leading-snug` 让它换行。**

### 列表项悬停操作（编辑/删除）

会话、条目类列表，常需要重命名/删除。用 `group` + `group-hover` 让操作按钮悬停才出现，不占地方：

```html
<div class="conv-item group flex items-center gap-2.5" @click="load(item)">
  <span class="truncate flex-1" x-text="item.title"></span>
  <div class="items-center gap-1.5 flex-shrink-0 hidden group-hover:flex">
    <button class="w-6 h-6 rounded flex items-center justify-center text-[#999] hover:text-[#2563eb]" @click.stop="edit(item)"><i class="fa fa-pen text-[11px]"></i></button>
    <button class="w-6 h-6 rounded flex items-center justify-center text-[#999] hover:text-[#dc2626]" @click.stop="del(item)"><i class="fa fa-trash text-[11px]"></i></button>
  </div>
</div>
```
```js
edit(item) { const n = prompt('重命名', item.title); if (n && n.trim()) { item.title = n.trim(); this.showToast('已重命名','success'); } },
del(item) { if (!confirm('确定删除？')) return; this.list = this.list.filter(x=>x.id!==item.id); this.showToast('已删除','success'); },
```
按钮用 `@click.stop` 防止冒泡触发整行的点击。

---

## charts.js 公共配置（必须包含）

```js
window.TC_COLORS = {
  primary: '#2563eb', primaryDark: '#1d4ed8', primaryLight: '#eff6ff',
  deepBlue: '#1e3a8a', midBlue: '#1e40af', borderBlue: '#bfdbfe', softBlue: '#dbeafe',
  text: '#333', textSub: '#475569', textMute: '#999',
  border: '#e8ecf0', bg: '#f5f7fa',
  red: '#dc2626', amber: '#d97706', green: '#059669',
  palette: ['#1e40af','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#1e3a8a','#0c4a6e','#475569','#94a3b8'],
};

window.TC_ECHARTS = {
  tooltip(extra={}) { return { trigger:'axis', backgroundColor:'#fff', borderColor:'#e8ecf0', textStyle:{color:'#333',fontSize:12}, appendToBody:true, ...extra }; },
  grid(extra={}) { return { left:50, right:20, top:28, bottom:32, containLabel:true, ...extra }; },
  axis(extra={}) { return { axisLine:{lineStyle:{color:'#e8ecf0'}}, axisTick:{show:false}, axisLabel:{color:'#666',fontSize:11}, splitLine:{lineStyle:{color:'#f0f2f5',type:'dashed'}}, ...extra }; },
  legend(extra={}) { return { icon:'circle', itemWidth:8, itemHeight:8, textStyle:{color:'#666',fontSize:12}, top:4, ...extra }; },
};

window.TC_FMT = {
  thousands(v) { return v == null || isNaN(v) ? '-' : Number(v).toLocaleString('zh-CN'); },
  pct(v, d=1) { return v == null || isNaN(v) ? '-' : (v*100).toFixed(d)+'%'; },
  fixed(v, d=1) { return v == null || isNaN(v) ? '-' : Number(v).toFixed(d); },
};
```

---

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
4. 生成代码：逐页面输出 HTML（含完整交互逻辑）
    ↓
5. 生成配置：charts.js + data/*.json
    ↓
6. 验证交互：确保所有按钮/图表/表格有真实响应
    ↓
完成，告知用户目录路径和打开方式
```

### 输出策略
- **小产品（≤4 页面）**：直接逐文件 Write 输出
- **大产品（>4 页面）**：**必须先生成 `_template.html` 骨架模板**，再用并行 Agent 分工生成业务内容

### 大产品并行生成规则（铁律）

当页面 >4 个需要并行 Agent 生成时，**必须严格执行以下流程**：

#### Step 1：主 Agent 先生成 `_template.html`

主 Agent 必须先 Write 一个 `_template.html` 文件到项目目录，包含：
- 完整的 `<head>` 区（CDN引用、公共CSS）
- Top Nav 完整 HTML（含一级菜单横排的所有链接、Logo、用户信息）
- 左侧二级菜单 sub-menu 骨架（示例项，供有子功能的页面参照）
- 布局骨架结构（flex容器 + 内容占位 `<!-- CONTENT -->`）
- 抽屉/Toast/Modal 的公共 HTML 模板
- 公共 CSS 全量写入（不允许子Agent修改）

#### Step 2：子 Agent prompt 中必须包含以下约束

```
【强制约束 - 违反即为错误】
1. 先 Read `_template.html`，在其基础上修改生成目标页面
2. 不得修改 top-nav 的任何样式/结构（仅修改一级菜单的 active 位置）
3. 二级菜单：本页有子功能就填 sub-menu 菜单项；无子功能则删掉整个 <aside class="sub-menu">，内容区全宽
4. 不得修改 <style> 中的 .top-nav / .top-nav-item / .sub-menu 定义
5. 布局结构保持：sticky top-nav → flex行(可选 sub-menu + 主内容区)
6. 内容区用 `<div class="flex-1 overflow-y-auto">` 内套 `<div class="px-8 py-6 space-y-5">`，不套窄 max-width
7. 只在 <!-- CONTENT --> 区域填充业务内容
```

#### Step 3：验证一致性

所有页面生成后，主 Agent 必须 grep 验证：
- 所有 HTML 的 `.top-nav` 高度均为 48px、背景为 `#fff`
- 所有 HTML 一级菜单用 `top-nav-item`，且 active 各就各位（不重不漏）
- 没有任何页面残留 `side-rail` / `rail-item`（旧写法，已废弃）
- 内容区未套窄 max-width（不出现 `max-w-[980px]`/`max-w-[1120px]` 这类窄容器）
- 所有 HTML 的布局为 flex 流式（非 fixed 拼接）

如有不一致，立即修复后再交付。

#### 常见错误（子 Agent 容易犯的）

| 错误 | 正确 |
|------|------|
| 做了 side-rail 竖排图标导航 | **已废弃**：一级菜单直接横排在 top-nav 里 |
| top-nav 放了图标竖排、或导航放在别处 | 一级菜单横排在 top-nav（Logo 右边），二级菜单在左侧 |
| top-nav 用蓝色渐变背景 | 白色 `#fff` 背景 + 底部 border |
| top-nav 高度 56px | 固定 48px |
| top-nav 用 `position:fixed` | 用 `position:sticky; top:0` |
| 无子功能的页面也放了空的左侧菜单 | 无子功能就删掉 sub-menu，内容全宽 |
| 内容区套 `max-w-[980px] mx-auto` | 撑满：`flex-1` + 内层 `px-8`，不套窄 max-width |
| 卡片列表一行1个铺满整行 | 一行2个 `grid-cols-2` + 分页 |
| 列表项文字换行 | `truncate` 单行省略号 + `:title` |
| 主内容用 `margin-top/margin-left` | flex-1 自动填充，无需 margin |
| 自定义 nav 链接颜色为白色 | 链接颜色 #666，active 为 #2563eb |
| 用红/橙/绿/紫区分不同分类卡片 | **只用蓝色深浅区分分类**，状态色只做小面积点缀 |
| 图标容器背景用浅红`#fef2f2`/浅橙`#fff7ed` | 统一用 `#eff6ff`（浅蓝） |
| 6个分类用6种不同颜色 | 6个分类用蓝色族6个深浅色阶 |
| 状态色(红/绿)用作卡片大面积背景 | 状态色只用于 8px 小圆点或文字颜色 |

---

## `_template.html` 标准骨架（大产品必须先生成此文件）

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
body { font-family: 'PingFang SC', -apple-system, sans-serif; background: #f5f7fa; color: #333; margin: 0; }
.top-nav { background: #fff; height: 48px; border-bottom: 1px solid #e8ecf0; display: flex; align-items: center; padding: 0 16px; flex-shrink: 0; position: sticky; top: 0; z-index: 30; }
.top-nav .logo { display: flex; align-items: center; gap: 8px; margin-right: 32px; font-size: 15px; font-weight: 600; color: #1e3a8a; white-space: nowrap; }
.top-nav .logo img { width: 24px; height: 24px; }
.top-nav-item { color: #666; font-size: 13px; padding: 0 16px; height: 48px; display: flex; align-items: center; gap: 6px; white-space: nowrap; text-decoration: none; border-bottom: 2px solid transparent; }
.top-nav-item:hover { color: #2563eb; }
.top-nav-item.active { color: #2563eb; font-weight: 500; border-bottom-color: #2563eb; }
.sub-menu { width: 200px; background: #fff; border-right: 1px solid #e8ecf0; padding: 16px 12px; flex-shrink: 0; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.sub-menu-item { padding: 9px 14px; font-size: 13px; color: #475569; border-radius: 8px; cursor: pointer; transition: all .15s; display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.sub-menu-item:hover { color: #2563eb; background: #eff6ff; }
.sub-menu-item.active { color: #2563eb; background: #eff6ff; font-weight: 500; }
</style>
</head>
<body x-data="pageApp()" x-init="init()">

<!-- Top Nav：Logo + 一级菜单横排 + 状态（一级菜单直接放这里，不用 side-rail） -->
<nav class="top-nav">
  <div class="logo"><img src="image/icon.png" alt="">{{产品名}}</div>
  <a href="index.html" class="top-nav-item active"><i class="fa fa-bolt"></i>模块一</a>
  <a href="module2.html" class="top-nav-item"><i class="fa fa-heart-pulse"></i>模块二</a>
  <a href="module3.html" class="top-nav-item"><i class="fa fa-comments"></i>模块三</a>
  <div class="ml-auto flex items-center gap-4 text-[13px] text-[#475569]">
    <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>{{全局状态}}</span>
    <span>{{日期}}</span>
    <span><i class="fa fa-user-circle mr-1"></i>{{用户名}}</span>
  </div>
</nav>

<!-- 主体：（可选）左侧二级菜单 + 内容区 -->
<div class="flex" style="height: calc(100vh - 48px);">
  <!-- 二级菜单：仅当本页有子功能时才放；无子功能则删掉这个 aside，内容区自然全宽 -->
  <aside class="sub-menu">
    <div class="sub-menu-item active" @click="activeTab='sub1'"><i class="fa fa-layer-group text-xs w-4"></i>子功能1</div>
    <div class="sub-menu-item" @click="activeTab='sub2'"><i class="fa fa-filter text-xs w-4"></i>子功能2</div>
  </aside>

  <!-- 内容区：撑满，不套窄 max-width -->
  <div class="flex-1 overflow-y-auto">
    <div class="px-8 py-6 space-y-5">
      <!-- CONTENT: 子 Agent 只在此区域填充业务内容 -->
    </div>
  </div>
</div>

<!-- 右侧抽屉（公共） -->
<div x-show="drawerOpen" x-transition.opacity class="fixed inset-0 z-50" style="display:none;">
  <div class="absolute inset-0 bg-black/40" @click="drawerOpen=false"></div>
  <aside class="absolute right-0 top-0 bottom-0 w-[480px] bg-white shadow-xl overflow-y-auto"
         x-transition:enter="transition transform duration-300" x-transition:enter-start="translate-x-full" x-transition:enter-end="translate-x-0"
         x-transition:leave="transition transform duration-300" x-transition:leave-start="translate-x-0" x-transition:leave-end="translate-x-full">
    <header class="h-12 px-5 flex items-center border-b border-[#e8ecf0] sticky top-0 bg-white z-10">
      <span class="text-sm font-medium" x-text="drawerTitle"></span>
      <button class="ml-auto" @click="drawerOpen=false"><i class="fa fa-times text-gray-400"></i></button>
    </header>
    <div class="p-5 space-y-4" x-html="drawerContent"></div>
  </aside>
</div>

<!-- Toast（公共） -->
<div class="fixed top-14 right-5 z-[9999] space-y-2">
  <template x-for="t in toasts" :key="t.id">
    <div class="px-4 py-2.5 rounded-lg text-white text-sm shadow-lg transition-all duration-300"
         :class="{'bg-[#059669]':t.type==='success','bg-[#dc2626]':t.type==='error','bg-[#d97706]':t.type==='warn','bg-[#2563eb]':t.type==='info'}"
         x-text="t.message" x-show="!t.removing" x-transition></div>
  </template>
</div>

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
3. 左侧二级菜单：本页有子功能就填菜单项，无子功能就**整个删掉 `<aside class="sub-menu">`**（内容区自然全宽）
4. `<!-- CONTENT -->` 区域填充业务 HTML
5. `<script>` 中的 `pageApp()` 函数业务逻辑

**绝对不允许子 Agent 修改的部分：**
- `<style>` 中的所有 CSS 定义
- Top Nav 的 HTML 结构和类名（只改 active）
- 二级菜单 sub-menu 的样式类名（只改菜单项文字和 active）
- 整体 flex 布局结构
- 抽屉/Toast 的公共模板

---

## 页面模板参考

### 首页/总览页标准结构
```
Top Nav（一级菜单横排，总览页无二级菜单，内容全宽 px-8）
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
- 严格遵守配色系统（只用蓝色族 + 3 状态色 + 中性色）
- 所有页面共享 Top Nav（一级菜单横排）骨架；有子功能的页面加左侧二级菜单
- 内容区撑满不留大白边；能一屏放下的别出滚动条
- 字号/间距/圆角统一（参照规范 §4）

### 数据真实感
- mock 数据要有业务感（不是 Lorem ipsum）
- 数字要合理（人数几百到几千，百分比在合理范围）
- 实体名要像真的（科室名、人名、诊断名）

### 代码质量
- 每个页面是独立完整的 HTML（浏览器直接打开可运行）
- Alpine.js 状态管理清晰（一个 `x-data` 函数管全页）
- CSS 优先用 Tailwind 原子类，自定义 CSS 仅限公共组件样式
- 图表配置继承 `TC_ECHARTS` / `TC_COLORS`

### Logo 固定
- 所有页面 Top Nav 左侧必须有 `image/icon.png`
- 该文件从已有原型目录复制（360 安全云 Logo）
