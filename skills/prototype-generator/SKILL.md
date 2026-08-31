---
name: prototype-generator
description: "Use when user says 生成原型/做原型/出原型/设计原型/画原型/产品原型/做个demo/做个页面/prototype/做系统原型. Accepts ANY input (sentence, doc, image, requirements). Generates high-fidelity interactive HTML prototypes with real mock data, following the unified design specification. Output: multi-page HTML + JS + data/ directory, ready to open in browser or package with Electron."
---

# Prototype Generator（产品原型生成器）

## Overview

根据**任意形式的输入**，生成高保真、可交互的 HTML 产品原型。

**支持的输入**：一句话、需求文档、产品功能清单、截图、口头描述、目录路径——任意形式。

**输出**：完整可运行的多页面 HTML 原型（浏览器直接打开即可交互），包含：
- 多页面 HTML（含导航跳转）
- Alpine.js 驱动的真实交互（按钮点击有状态流转、表格可筛选排序、图表可点击下钻）
- ECharts 图表（真实渲染，非截图）
- 真实 mock 数据（`data/*.json`）
- 统一设计语言（360 安全云企业级 BI 风格）

---

## When to Use

- 用户说：生成原型、做原型、出原型、设计原型、画原型、做个 demo、做系统原型、出个可交互的页面
- 用户提供了产品功能清单/需求文档，要求出原型
- 用户给了一句话产品概念，要求做可视化演示

## When NOT to Use

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
├── login.html              登录页
├── demo.html               产品导航页（大屏风格，可选）
├── image/
│   └── icon.png            360 安全云 Logo（必备，从已有原型复制）
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
| Primary | `#2563eb` |
| Primary Dark | `#1d4ed8` |
| Primary Light | `#eff6ff` |
| Deep Blue | `#1e3a8a` |
| Mid Blue | `#1e40af` |
| Border Blue | `#bfdbfe` |

### 中性色
| 用途 | 色值 |
|------|------|
| 主文 | `#333` |
| 辅文 | `#475569` |
| 占位 | `#999` |
| 页面底 | `#f5f7fa` |
| 卡片底 | `#ffffff` |
| 分隔线 | `#e8ecf0` |

### 状态色（仅 3 色）
| 状态 | 色值 |
|------|------|
| 危险/高风险 | `#dc2626` |
| 警示/中风险 | `#d97706` |
| 健康/正常 | `#059669` |

### 严禁
- 紫色、粉色、霓虹色
- 多层 box-shadow 堆叠
- 全屏渐变背景（仅登录页/大屏导航例外）
- 毛玻璃 backdrop-filter（仅登录页/大屏例外）

---

## 全局布局骨架（所有业务页强制）

```
┌──────────────────────────────────────────────────────────┐
│  Top Nav (48px)  Logo + 主菜单 + 数据快照 + 用户头像       │
├────┬──────────────────────────────────────────────────────┤
│Side│  Page Tabs (40px) — 当前页内多 Tab 切换              │
│Rail├──────────────────────────────────────────────────────┤
│72px│  Dimension Bar — 维度/类别说明条                     │
│    ├──────────────────────────────────────────────────────┤
│    │  KPI Section — 4-6 项动态指标                        │
│    ├──────────────────────────────────────────────────────┤
│    │  Main Chart + Side Chart + Detail Table              │
└────┴──────────────────────────────────────────────────────┘
```

### Top Nav CSS（每页必含）
```css
.top-nav { background: #fff; height: 48px; border-bottom: 1px solid #e8ecf0; display: flex; align-items: center; flex-shrink: 0; position: sticky; top: 0; z-index: 30; }
.top-nav-item { color: #666; font-size: 14px; padding: 0 20px; height: 48px; display: flex; align-items: center; gap: 6px; white-space: nowrap; text-decoration: none; }
.top-nav-item:hover { color: #2563eb; }
.top-nav-item.active { color: #2563eb; font-weight: 500; border-bottom: 2px solid #2563eb; }
```

### Side Rail CSS
```css
.side-rail { width: 72px; background: #fff; border-right: 1px solid #e8ecf0; display: flex; flex-direction: column; padding: 8px 0; gap: 4px; }
.rail-item { width: 56px; height: 56px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 6px; color: #666; cursor: pointer; }
.rail-item.active { background: #eff6ff; color: #2563eb; }
```

### Page Tabs CSS
```css
.page-tabs { height: 40px; background: #fff; border-bottom: 1px solid #e8ecf0; display: flex; align-items: center; padding: 0 8px; }
.page-tab { padding: 0 14px; height: 40px; display: inline-flex; align-items: center; font-size: 13px; color: #666; border-bottom: 2px solid transparent; cursor: pointer; }
.page-tab.active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 500; }
```

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
      <button class="ml-auto" @click="drawerOpen = false"><i class="fa fa-times text-gray-400"></i></button>
    </header>
    <div class="p-5 space-y-4"><!-- 内容 --></div>
  </aside>
</div>
```

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
| **分页** | 数据列表支持分页（上下页 + 页码） |
| **确认弹窗** | 危险操作（删除/清空）前置确认弹窗 |
| **抽屉** | 右侧 480px 滑入抽屉，含遮罩 + 动画 |

### 禁止的"假交互"
- ❌ 按钮只弹 alert("功能开发中")
- ❌ 图表是截图不是 ECharts 渲染
- ❌ 表格数据写死在 HTML 里不可筛选
- ❌ Tab 切换但内容不变

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
- **所有输出必须写入当前工作目录下的 `prototype/` 子目录**（即 `./prototype/`），不要使用绝对路径
- **小产品（≤4 页面）**：直接逐文件 Write 输出
- **大产品（>4 页面）**：用并行 Agent 分工生成（每个 Agent 负责 2-3 页面）

---

## 页面模板参考

### 首页/总览页标准结构
```
Top Nav → Side Rail → Page Tabs（全部/分类1/分类2）
→ 维度说明条
→ 6 KPI 卡（grid-cols-6）
→ 2×2 图表网格（年龄分布+职称分布+学历分布+编制分布）
→ 排名 TOP10 横向柱状图
→ AI 洞察抽屉（可选）
```

### 列表/管理页标准结构
```
Top Nav → Side Rail → Page Tabs
→ 筛选条（科室/状态/时间/关键词）
→ 数据表格（可排序、可分页、行可点击）
→ 详情抽屉（点击行打开）
```

### 对话页标准结构（参考教学案例 chat.html）
```
Top Nav → Side Rail
→ 三栏布局：会话列表(260px) + 消息区(flex-1) + 上下文面板(280px)
→ 空状态：分类预设卡片
→ 流式打字输出
→ 推理过程卡片（可选）
→ 内嵌图表渲染
→ 右侧面板：置信度 + 数据来源 + 追问建议
```

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
- 所有页面共享 Top Nav + Side Rail + Page Tabs 骨架
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
