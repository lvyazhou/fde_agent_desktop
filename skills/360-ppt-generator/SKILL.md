---
name: 360-ppt-generator
description: Generates 360-branded PPT presentations in text mode, poster mode, hybrid mode, or background-image-with-text mode. Supports blue and green color themes.
---

# 360 品牌 PPT 生成器

## Overview

支持 **两种主模式 + 两种变体**：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **文字模式** | 基于 PPT模版.pptx + python-pptx 绘制文字/表格/卡片 | 内部汇报、数据密集、精确排版 |
| **海报模式** | 每页 = AI 生成的完整中文海报，PPT 仅作容器 | 外部展示、培训演讲、视觉冲击力 |
| *变体: 背景图+文字* | AI 生成纯装饰背景 + python-pptx 叠加可编辑文字 | 视觉美观且需后期改文字 |
| *变体: 混合模式* | 同一 PPT 中部分页海报、部分页文字 | 封面/章节用海报、数据页用文字 |

### 模式决策树

```
用户需求 → 未指定模式？ → 默认「背景图+文字」变体
                       → "文字模式/表格/精确排版" → 文字模式
                       → "海报模式/每页一张图" → 海报模式
                       → "混合/封面海报其他文字" → 混合模式
                       → "背景图+文字" → 背景图+文字变体
```

## When to Use / When NOT to Use

**Use**: 360 品牌 PPT、培训课件、代理商材料、产品介绍、`.pptx` 输出需 360 品牌一致性。

**Don't Use**: 非 360 品牌通用 PPT（用 `powerpoint-ppt`）、仅编辑现有 PPT、需要动画/视频/音频。

## 环境依赖

```bash
pip install python-pptx requests Pillow
```

Python ≥ 3.9。运行时 `from helpers import *` 导入所有组件函数。

---

## 核心规则（MUST FOLLOW）

### 1. 始终使用 Master 2 + Layout 6

```python
_MASTER2_IDX = 2
_LY_BLANK_IDX = 6

def cslide(prs):
    layout = prs.slide_masters[_MASTER2_IDX].slide_layouts[_LY_BLANK_IDX]
    return prs.slides.add_slide(layout)
```

**NEVER** 使用其他 Master 创建内容页，否则丢失品牌装饰（蓝弧+Logo+页脚）。

### 2. 保留所有模板 Slide

模板有 3 张 slide（封面 idx=0 / 空白 idx=1 / 结尾 idx=2），**必须全部保留**，否则触发 `zip "Duplicate name"` 错误。结尾页用 `_move_slide_to_end(prs, 2)` 移到末尾。

### 3. 不使用 Surrogate Pair Emoji

python-pptx/lxml 不支持 U+10000+ 字符，会报 `UnicodeEncodeError: surrogates not allowed`。

| 禁止 | 替代 |
|------|------|
| 📅🎯🟡🚀 | ▶ `▶` ◆ `◆` ○ `○` » `»` |
| ✅ | ✓ `✓` 或 ✔ `✔` |

只能使用 BMP 范围（U+0000 - U+FFFF）。

### 4. 安全区域

| 边界 | 值 |
|------|-----|
| 顶部 | Y ≥ Inches(0.2) |
| 底部 | Y + H ≤ Inches(6.5) |
| 左侧 | X ≥ Inches(0.4) |
| 右侧 | X + W ≤ Inches(11.8) |

### 5. Logo 规范（统一 — 所有模式通用）

**核心原则：海报图片中绝不让 AI 画 Logo！Logo 全部由 python-pptx 叠加真实 PNG。**

Prompt 中必须包含：`STRICTLY NO LOGO, NO BRAND MARK, NO '360' TEXT — a real logo PNG will be overlaid later.`

| 页面类型 | Logo 文件 | 位置 | 宽度 |
|----------|-----------|------|------|
| 封面页 | `logo-title-white.png` | 居中偏上 `(5.2", 0.3~1.0")` | 3.0" |
| 目录页 | `logo-title-white.png` | 左上 `(0.5", 0.3")` | 2.2" |
| 章节分隔页 | `logo-title-white.png` | 左上 `(0.5", 0.3")` | 2.2" |
| 内容页（白底） | `logo-title.png` | 左上 `(0.2~0.3", 0.1~0.15")` | 2.2" |
| 结束语页 | `logo-title-white.png` | 居中偏上 `(5.2", 0.4~1.2")` | 3.0" |

```python
SKILL_DIR = os.path.dirname(os.path.abspath(__file__))
BRAND_DIR = os.path.join(SKILL_DIR, "brand_assets")
WHITE_LOGO  = os.path.join(BRAND_DIR, "logo-title-white.png")   # 深蓝背景用
ORIG_LOGO   = os.path.join(BRAND_DIR, "logo-title.png")        # 白底用
CONTENT_BG  = os.path.join(BRAND_DIR, "content_bg.png")        # 内容页统一背景（白底蓝角装饰）
```

> **内容页统一背景**：所有内容页使用 `content_bg.png` 作为固定背景，保证视觉一致。封面/章节页才 AI 现场生成背景。

### 6. Prompt 规范（所有模式通用，出现 ONCE）

所有 AI 图片 prompt 必须遵循：

1. **禁止文字**：`NO TEXT, NO CHARACTERS, NO NUMBERS, NO LETTERS, NO WORDS`
2. **禁止 Logo**：`STRICTLY NO LOGO, NO BRAND MARK` + 留白说明
3. **禁止结构性元素**（背景图模式）：`NO CARDS, NO BOXES, NO TABLE LINES, NO FRAMES, NO RECTANGLES`
4. **品牌色调**：深蓝 `#0721A8` / `#0D2B5A`，强调绿 `#00C853`
5. **中文文字不让 AI 生成**（背景图模式）：用 python-pptx 叠加
6. **16:9 widescreen**

### 7. 图片尺寸统一（所有模式通用）

**所有 AI 生成的海报/背景图统一使用 `1792x1024` 尺寸，无例外。** 确保整套 PPT 每页宽度一致。

### 8. 风格一致性（所有模式通用 — 最重要的规则）

> **⚠️ 同一套 PPT 的所有页面必须看起来像一套，不是各自独立的海报/背景。**

无论使用海报模式、背景图+文字模式还是混合模式，同一套 PPT 中所有 AI 生成的图片必须在以下维度保持一致：

| 维度 | 要求 |
|------|------|
| **尺寸** | 统一 `1792x1024`，无例外 |
| **背景** | 内容页统一浅蓝白底渐变+右上/右下蓝色几何角装饰（位置、颜色、大小一致） |
| **标题** | 位置（顶部居中）、字号、字体、颜色完全一致 |
| **表格** | 表头颜色、行高、边框样式、宽度一致 |
| **配色** | 统一使用深蓝 `#0721A8` + 绿色 `#00C853`，不要自由发挥其他配色 |
| **装饰** | 角装饰位置、序号圆点样式、图标风格保持统一 |
| **留白** | 左上角 Logo 区域留白规格一致 |

**实现方式**：先生成一页标杆页确认风格，后续所有页面 prompt 都参照标杆页的视觉描述来写，确保输出一致。

**禁止**：
- ❌ 每页随意变换配色方案
- ❌ 不同页面用不同的表格样式（有的圆角有的直角）
- ❌ 标题位置、大小忽大忽小
- ❌ 有的页面宽度撑满、有的页面两侧留大量空白

### 9. 图文平衡型默认标准（代理商/培训/业务宣讲优先）

> 2026-08 安腾/通用版代理商培训PPT验证：单纯极简会显空，满屏文字又眼花。以后做 360 代理商培训、业务培训、AI转型宣讲类PPT，默认采用**图文平衡型**。

**一页结构**：

```text
顶部：大标题 + 一句副标题
中间：主视觉图（业务流程 / 角色 / 工作台 / 时间轴 / 对比图）
右侧或下方：3-4条短说明（每条10-18字左右）
底部：一句金句/结论
```

**设计原则**：

| 维度 | 要求 |
|---|---|
| 主视觉 | 每页必须有业务场景图、流程图、角色图、工作台界面、案例时间轴、对比图之一 |
| 文字 | 不是极简空页，也不是长段落；每页保留适量解释，3-4条短句即可 |
| 场景 | 多用老板驾驶舱、员工工具箱、客户现场调研、FDE角色、纳米Work工作台等业务画面 |
| 对比 | 痛点/过去用橙色，解法/现在用绿色 |
| 案例 | 能用案例就用案例：时间、角色、结果、数据点要露出来 |
| 口播 | 细节放 speaker notes，图上只放能帮助听众抓住主线的短信息 |

**常用版式**：

1. **章节页**：章节编号 + 章节标题 + 一句话 + 3个关键词 + 底部金句
2. **卡点解法页**：左侧橙色「代理商卡点」，右侧绿色「360解法」
3. **图文解释页**：左侧/中间主视觉，右侧3-4条短说明
4. **案例流程页**：时间轴/流程图 + 关键产出 + 底部结论
5. **角色页**：人物/岗位卡 + 每类人干什么
6. **交付物页**：工作台界面示意 + 模块说明

**优先使用的 Prompt 句式**：

```text
Balanced business slide, light-blue/white background with blue tech corner decorations.
Top: big bold title + one-line subtitle.
Main visual: [business scenario / workflow / role diagram / workbench mockup / timeline].
Side panel: 3-4 concise bullets, each 10-18 Chinese characters.
Bottom: full-width dark-green ribbon with one bold punchline.
Use green #00A870 as main color, blue tech accents, orange #FF8C42 only for pain/risk/old-state.
Rich visual scene, but no long paragraphs; training deck, not document page.
```

**反例**：

- ❌ 只有3个词的空页：信息太少，培训时观众抓不住上下文
- ❌ 标题+8条bullet：像Word，不像PPT
- ❌ 每页只有抽象图标：没有业务场景，老板没有代入感
- ❌ 把所有细节画到图上：字太密，讲的人和听的人都累

---

## 10. 绿色海报版标准组合（默认混排）

> 当用户说“海报模式绿色版”“绿色海报版”“绿色PPT”时，默认按这一套来，不要只做纯视觉海报。

### 默认页型组合

一套绿色海报版 PPT 默认包含这些页型，并按内容穿插：

- **封面页**：纯装饰背景 + 标题 + 副标题
- **目录页**：横向模块，快速交代全篇结构
- **章节页**：大编号 + 章节标题 + 过渡句
- **普通图文页**：标题 + 主视觉 + 3~4 条短说明 + 底部结论条
- **结构化图文页**：标题 + 流程 / 对比 / 矩阵 / 关系图 + 底部结论条
- **结尾页**：纯装饰背景 + 结束语 + 联系信息

### 普通图文页怎么写

适合讲：

- 为什么
- 场景感
- 痛点
- 扶持说明
- 客户故事

固定结构：

```text
顶部：大标题 + 一句副标题
中间：主视觉图
右侧或下方：3~4 条短说明
底部：一句金句/结论
```

### 结构化图文页怎么写

适合讲：

- 流程
- 对比
- 关系
- 分类
- 矩阵
- 判断节点

固定结构：

```text
顶部：大标题 + 一句副标题
中间：流程图 / 对比图 / 分组卡 / 闭环图 / 判断图
侧边或下方：3~5 个结构点
底部：一句结论
```

### 推荐混排顺序

常见顺序可以这样排：

1. 封面
2. 目录
3. 章节页
4. 普通图文页：为什么现在是机会
5. 结构化图文页：360 的解法
6. 普通图文页：合伙人能赚什么
7. 结构化图文页：RoT 回本逻辑
8. 普通图文页：总部扶持
9. 结构化图文页：加入路径
10. 结尾页

### 生成时的默认判断

如果用户没特别说明，只要关键词里出现这些内容，就优先用绿色海报版混排：

- 代理商招募
- 培训宣讲
- 业务介绍
- AI 转型宣讲
- 城市合伙人
- 海报版

如果内容里有表格、数据密集页、精确排版要求，再切到文字模式。

---

## 11. 绿色海报版图文页 prompt 骨架（实战验证）

> 承第 10 节：页型组合、混排顺序、默认判断见上一节，本节只讲**内容页 prompt 到底怎么写才不空洞**。

### ⚠️ 头号坑：图文页写太笼统 → 生成的是空洞装饰海报

「顶部标题 + 中间主视觉 + 右侧3-4条 + 底部金句」这种**大白话结构不够**。
`STYLE_GREEN_LIGHT` 前缀本身偏极简，prompt 不写死细节时，它会把页面拉成一张“好看但没信息”的装饰海报。

**必须在 prompt 里做两件事：**

1. **写死版式的每一块**（下面的骨架），别只给一句“右侧放几条说明”。
2. **加反空洞约束**：句首明确写
   `RICH BUSINESS INFOGRAPHIC SLIDE, NOT a minimal decorative poster.`

### 普通图文页骨架（痛点/场景/扶持/客户故事）

2026-08 安全云代理商招募 PPT 验证过的版式，直接照抄改内容：

```text
RICH BUSINESS INFOGRAPHIC SLIDE, NOT a minimal decorative poster.

TOP TITLE BAND: 章节号(如 '01') + 大号黑色粗体标题 + 绿色装饰下划线 + 绿色副标题一句.
LEFT HALF ILLUSTRATION: 写实 3D 人物场景图（如愁眉苦脸的老板+IT人员），传达该页情绪.
RIGHT HALF INFO-CARD: 白色圆角信息卡，N 行，行与行之间用虚线分隔；
  每行 = 绿色圆形图标 + 加粗小标题 + 一句说明.
BOTTOM RIBBON: 整宽实心绿色横幅，放一句加粗金句/结论.
UNDER RIBBON: 一排 5 个小图标 + 短caption.
颜色：主色绿；橙色 #FF6D00 只用在“痛点/警示”，不要滥用.
```

### 结构化图文页骨架（流程/对比/矩阵/闭环）

```text
RICH BUSINESS INFOGRAPHIC SLIDE, NOT a minimal decorative poster.

TOP TITLE BAND: 同上（章节号 + 黑标题 + 绿下划线 + 绿副标题）.
CENTER: 明确写清是哪种结构——
  - 对比页：左右两栏（左=旧做法橙色系，右=360做法绿色系）+ 中间绿色箭头
  - 流程页：横向 N 个等宽卡片，左→右箭头串联
  - 矩阵/闭环：按需描述格子/环形
BOTTOM RIBBON: 整宽实心绿色横幅 + 一句结论.
```

### ⚠️ 坑 2：重新生成必须先删旧图

`run_poster_pipeline.py` 有 SKIP 缓存：**若某 PNG 已存在且 >10KB 就跳过不重生**。
改了 prompt 想让某页重新出图，**必须先手动删掉 `assets/` 下对应的旧 PNG**，否则 pipeline 会 SKIP，你看到的还是老图（这坑真实踩过：以为改了 prompt 没生效，其实是根本没重跑那张）。

```powershell
# 只重生 page_pain / page_solution 两页
Remove-Item shared\{topic}\assets\page_pain.png, shared\{topic}\assets\page_solution.png
python skills\360-ppt-generator\run_poster_pipeline.py --workspace . --topic {topic} --theme green
```

### ⚠️ 坑 3：Windows 下别用 Git Bash 跑 pipeline

Git Bash 里 `ls`/`awk`/`tail`/`find` 可能 not found，导致 `... | tail -40` 整条命令 exit 127、pipeline 根本没执行。
用 **PowerShell** 跑 pipeline 和删文件；提示词含 emoji/对勾时命令前加 `PYTHONIOENCODING=utf-8`。

### posters.json 示例模板

```json
[
  {
    "key": "cover",
    "page_type": "cover",
    "title": "360安全云 城市合伙人招募",
    "subtitle": "一城一代 · AI安全新生意 · 陪你把单子跑通",
    "prompt": "PURELY DECORATIVE background only. STRICTLY NO TEXT, NO CHARACTERS, NO NUMBERS, NO LETTERS, NO WORDS. Deep emerald-green gradient background with subtle tech circuit-line pattern, faint hexagon grid, soft glowing green particle dots, a few thin geometric light rays. Clean premium enterprise cybersecurity feel. Leave the top-center area clean for a logo overlay."
  },
  {
    "key": "toc",
    "page_type": "content",
    "prompt": "Table of contents / agenda slide. Title at top-center: '今日议程'. Four large horizontal modules across the middle, each with a green numbered badge and a short green line-icon. Bottom summary bar in green with the line: '四步看懂：这门AI安全生意值不值得做'."
  },
  {
    "key": "page_pain",
    "page_type": "content",
    "prompt": "RICH BUSINESS INFOGRAPHIC SLIDE, NOT a minimal decorative poster. TOP TITLE BAND: big bold BLACK title '客户的真实困境' with a green underline and a green subtitle '卡点：想用AI，却用不起来、还怕不安全'. LEFT HALF: realistic 3D illustration of a worried boss and IT staff, a tangled AI robot, a red warning shield. RIGHT HALF: white rounded info-card with 3 rows separated by dashed green dividers, each row = green circular icon + bold heading + one line: '用不起来 / 不安全 / 缺人才'. BOTTOM: full-width solid green ribbon '结论：需求真实存在，却没人帮企业把AI安全地用起来'. Under ribbon: a row of 5 small green icon-captions. orange #FF6D00 ONLY for pain points."
  },
  {
    "key": "page_solution",
    "page_type": "content",
    "prompt": "Structured comparison content slide. Title at top-center: '360的解法：多引擎 + 安全兜底'. Two-column comparison layout: left side '过去的做法', right side '360安全云', center arrow from old to new. Bottom green summary bar."
  },
  {
    "key": "page_rot",
    "page_type": "content",
    "prompt": "Structured horizontal 4-step pipeline slide. Title at top-center: 'RoT 回本逻辑：投入怎么变收益'. Exactly four equal-width cards in a single horizontal row, connected left-to-right by arrows. Bottom full-width dark-green ribbon with the conclusion line."
  },
  {
    "key": "closing",
    "page_type": "closing",
    "title": "现在就是入场的最好时机",
    "subtitle": "360安全云 · 城市合伙人招募 | 联系区域负责人，聊聊你的城市",
    "prompt": "PURELY DECORATIVE background only. STRICTLY NO TEXT, NO CHARACTERS, NO NUMBERS, NO LETTERS, NO WORDS. Deep emerald-green gradient background with soft glowing green light halo in the center, subtle tech particle dots and thin light rays radiating outward."
  }
]
```

---

## Design Tokens

```python
from pptx.dml.color import RGBColor

C_BRAND     = RGBColor(0x07, 0x21, 0xA8)  # 360 品牌深蓝
C_PRIMARY   = RGBColor(0x0D, 0x47, 0xA1)  # 主色蓝
C_PRIMARY_L = RGBColor(0x42, 0xA5, 0xF5)  # 浅蓝
C_ACCENT    = RGBColor(0x00, 0xC8, 0x53)  # 强调绿
C_WARM      = RGBColor(0xFF, 0x6D, 0x00)  # 暖橙
C_PURPLE    = RGBColor(0x7C, 0x4D, 0xFF)  # 紫色
C_WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
C_DARK      = RGBColor(0x1A, 0x1A, 0x2E)  # 正文色
C_GRAY      = RGBColor(0x6B, 0x7B, 0x8D)  # 次要文字
C_LGRAY     = RGBColor(0xE8, 0xEC, 0xF0)  # 浅灰背景
C_BLUE_BG   = RGBColor(0xE3, 0xF2, 0xFD)  # 蓝色浅底
C_RED       = RGBColor(0xEF, 0x53, 0x50)  # 警示红
C_LIGHT_BLUE = RGBColor(0x90, 0xCA, 0xF9) # 浅蓝（海报模式副标题）

FONT_T = "Microsoft YaHei UI"   # 标题字体
FONT_B = "Microsoft YaHei"      # 正文字体
```

---

## 组件库（from helpers import *）

运行时 `from helpers import *`，以下为签名速查。**不要在脚本中重新实现这些函数。**

### 基础绘图

| 函数 | 用途 |
|------|------|
| `rect(slide, l, t, w, h, fill)` | 圆角矩形卡片背景 |
| `flat_rect(slide, l, t, w, h, fill)` | 直角矩形/色带 |
| `ln(slide, l, t, w, color, thick)` | 水平线 |

### 文本组件

| 函数 | 用途 |
|------|------|
| `txt(slide, l, t, w, h, text, sz, bold, color, align, font)` | 单行/段落文本 |
| `multi_txt(slide, l, t, w, h, lines, sz, color, spacing)` | 多行文本 |
| `bullet_txt(slide, l, t, w, h, items, sz, color)` | 圆点列表 |

### 版式组件

| 函数 | 用途 |
|------|------|
| `ptitle(slide, text, subtitle=None)` | 页面标题 + 绿色装饰线 |
| `card(slide, x, y, w, h, title, body, accent)` | 左边框卡片 |
| `num_card(slide, x, y, number, label, color)` | 数字指标卡（默认 2.3"×1.5"，汇报类建议 3.5"×2.2"） |
| `icon_card(slide, x, y, w, h, icon, title, desc, accent)` | 图标卡片 |
| `table_slide(slide, headers, rows, x, y, w)` | 数据表格（默认 y=1.5"） |

### 页面辅助

| 函数 | 用途 |
|------|------|
| `footer_note(slide, text)` | 底部 y=6.5" 分隔线 + 总结结论（每个内容页必须调用） |
| `add_notes(slide, text)` | Speaker Notes 解说词（每页必须调用） |
| `_replace_shape_text(shape, lines)` | 替换已有 shape 文字（封面/结尾页用） |
| `cslide(prs)` | 创建新内容页（Master 2 空白 layout） |
| `_move_slide_to_end(prs, idx)` | 将指定 slide 移到末尾 |
| `add_image(slide, path, l, t, w, h)` | 插入图片 |
| `add_bg_image(slide, path)` | 铺满整页 + z-order 最底层（背景图模式用） |

---

## 常见布局模式

### 3 列卡片

```python
for i in range(3):
    card(slide, Inches(0.5) + i * Inches(3.7), Inches(1.5),
         Inches(3.5), Inches(2.0), titles[i], bodies[i])
```

### 4 列图标卡

```python
for i in range(4):
    x = Inches(0.4) + i * Inches(2.9)
    icon_card(slide, x, Inches(1.3), Inches(2.7), Inches(2.5),
              nums[i], titles[i], descs[i])
```

### 2x3 数字卡片网格

```python
for i, (num, label) in enumerate(metrics):
    row, col = i // 3, i % 3
    x = Inches(0.5) + col * Inches(3.8)
    y = Inches(1.4) + row * Inches(2.2)
    num_card(slide, x, y, num, label)
```

### 左右分栏

```python
flat_rect(slide, Inches(0.5), Inches(1.2), Inches(5.3), Inches(4.5), C_BLUE_BG)
bullet_txt(slide, Inches(0.7), Inches(1.5), Inches(4.8), Inches(4.0), left_items)
bullet_txt(slide, Inches(6.4), Inches(1.5), Inches(5.0), Inches(4.0), right_items)
```

---

## 图片生成（generate_images.py）

内嵌在本技能目录，**只能用 subprocess 调用，不能 import**：

```python
SKILL_DIR = os.path.dirname(os.path.abspath(__file__))
result = subprocess.run(
    [sys.executable, os.path.join(SKILL_DIR, "generate_images.py"),
     "-p", prompt, "-o", output_path, "-s", "1792x1024", "-q", "high"],
    capture_output=True, text=True, timeout=300,
    env={**os.environ, "PYTHONIOENCODING": "utf-8"}
)
```

### PPT 常用图片尺寸（必须为 16 的倍数）

| 用途 | 推荐尺寸 |
|------|----------|
| **全页海报（默认）** | **`1792x1024`** |
| 全页背景 | `1920x1088` |
| 半页配图 | `960x1088` |
| 卡片图标 | `512x512` |
| 横幅 | `1792x448` |

> **⚠️ 重要：所有海报模式的图片统一使用 `1792x1024` 尺寸，不要使用其他尺寸。** 这确保了所有页面宽度一致、视觉统一。

### 图片层级控制

后添加的 shape 在上层，背景图 **先添加**，文字 **后添加**：

```python
add_image(slide, "bg.png", ...)     # 底层
rect(slide, ...)                     # 中间层
txt(slide, ...)                      # 顶层文字
```

---

## 海报模式（Poster Mode）

### 架构

每页 Slide = 一张 AI 生成的完整中文海报图片（1792×1024），文字由 AI 在图内渲染。PPT 仅作容器（`Presentation()` 创建空白 16:9）。

**例外**：封面/结尾页默认采用「纯装饰背景 + python-pptx 可编辑文字」，因为标题是用户最常需要修改的。

### 流程

> 风格一致性和尺寸统一的要求见上方核心规则第 7、8 条，所有模式通用。

```
Step 1: 确定 PPT 大纲（每页标题 + 内容要点）
Step 2: 定义统一 STYLE 前缀（见下方）
Step 3: 先生成1张标杆页，确认风格
Step 4: 以标杆页为参照，为每页编写 prompt = STYLE + 内容描述（强调 match same style）
Step 5: 批量调用 generate_images.py 生成海报图片（并行 ThreadPoolExecutor）
Step 6: 组装前验证所有图片存在且 >10KB
Step 7: python-pptx 组装 PPT（全屏插图 + Logo 叠加 + 封面/结尾文字叠加）
```

### 主题配色（蓝色 / 绿色）

海报模式支持两套 360 品牌配色，通过 `run_poster_pipeline.py` 的 `--theme` 参数切换：

| 主题 | 参数 | 配色 | 适用场景 | 触发词 |
|------|------|------|----------|--------|
| **深蓝**（默认） | `--theme blue` 或不传 | 白底+深蓝 `#0721A8`+绿色点缀 | 安全运营、产品介绍、内部汇报 | 默认 |
| **绿色**（教育/培训版） | `--theme green` | 白底+绿色 `#00A870/#16B37F`+绿色系图标进度条 | 培训课件、教育版海报、FDE 培训体系 | "生成绿色PPT""绿色海报""绿色版""培训版海报" |

**用户说"生成绿色PPT/绿色海报/绿色版"时，pipeline 命令必须带 `--theme green`：**

```bash
python skills/360-ppt-generator/run_poster_pipeline.py --workspace . --topic {topic} --theme green
```

- 绿色主题的 STYLE 已内置在 `run_poster_pipeline.py`（`STYLE_GREEN_LIGHT` 内容页 / `STYLE_GREEN_DARK` 封面章节结尾页），子 agent 无需自己写 STYLE。
- Logo 沿用现有 `brand_assets/logo-title.png`（内容页）和 `logo-title-white.png`（深绿封面/章节/结尾页），无需额外资产。
- posters.json 格式与蓝色主题完全一致，只是配色不同——子 agent 照常只写 posters.json + 执行脚本。

---

### 编排模式（代码驱动，MUST FOLLOW）

海报模式有两种并发方式，根据运行环境选择：

| 场景 | 方式 | 说明 |
|------|------|------|
| **平台在线生成**（用户在聊天页） | `orchestrate` 工具 | 子 agent 只写 posters.json + 执行现成脚本 |
| **本地脚本调试**（开发者命令行） | 脚本内 `ThreadPoolExecutor` | 见下方"批量生成脚本模板" |

**平台在线模式的子 agent 任务极其简单——不需要写脚本！**

子 agent 只做两件事：
1. 创建 `shared/{topic}/posters.json`（定义每页内容）
2. 执行 `python skills/360-ppt-generator/run_poster_pipeline.py --workspace {WORKSPACE_ROOT} --topic {topic}`

脚本 `run_poster_pipeline.py` 已经内置了所有逻辑（并行生成 + 验证 + 组装 + Logo叠加），子 agent 不需要写任何路径计算代码。

调用 `orchestrate` 工具：

```json
{
  "topic": "sandabaigu",
  "task_prompts": [
    {
      "step_id": "gen_images",
      "prompts": [
        "1. 创建文件 shared/sandabaigu/posters.json，内容为页面列表（见下方格式）\n2. 执行命令: python skills/360-ppt-generator/run_poster_pipeline.py --workspace . --topic sandabaigu --action gen\n3. 确认输出: shared/sandabaigu/assets/ 下有所有 PNG 文件"
      ]
    },
    {
      "step_id": "assemble",
      "prompts": [
        "执行命令: python skills/360-ppt-generator/run_poster_pipeline.py --workspace . --topic sandabaigu --action build\n确认输出: shared/sandabaigu/sandabaigu.pptx"
      ]
    }
  ]
}
```

**posters.json 格式（子 agent 需要创建这个文件）：**

```json
[
  {"key": "cover", "page_type": "cover", "title": "360安全运营托管服务", "subtitle": "专业团队 · 7×24监控 · 持续进化", "prompt": "封面纯装饰背景，不要任何文字。深蓝科技渐变+电路板纹理。"},
  {"key": "toc", "page_type": "content", "prompt": "目录页。Title: '今日议程'。列出4大章节标题。"},
  {"key": "section_1", "page_type": "section", "prompt": "章节分隔页。大号'01'，标题：'安全运营概述'"},
  {"key": "page03", "page_type": "content", "prompt": "内容页。Title: '什么是安全运营'。左栏3要点，右栏安全盾牌图。"},
  {"key": "page04", "page_type": "content", "prompt": "内容页。Title: '核心价值'。4个指标卡片横排。"},
  {"key": "closing", "page_type": "closing", "title": "感谢聆听", "subtitle": "360安全云 | 让安全触手可及", "prompt": "结尾纯装饰背景，不要任何文字。深蓝+光晕粒子效果。"}
]
```

- `key`: 文件名（生成 {key}.png）
- `page_type`: "cover"/"section"/"content"/"closing"（决定 Logo 位置和背景风格）
- `prompt`: 该页图片内容描述（脚本自动拼接 STYLE 前缀）
- `title`: （可选）封面/结尾页的可编辑标题文字（python-pptx 叠加白色大字，双击可改）
- `subtitle`: （可选）封面/结尾页的副标题文字

**禁止：**
- ❌ 子 agent 自己写生成脚本（用现成的 run_poster_pipeline.py）
- ❌ 子 agent 自己计算路径（脚本通过 --workspace 参数接收）
- ❌ 给 gen_images 传多个 prompt
- ❌ 直接调用 spawn 工具

### 子代理输出路径规范（MUST FOLLOW）

**一次 PPT 生成请求 = 一个主题文件夹。所有页面的图片、脚本、最终 PPT 都放在同一个文件夹内。**

> ⚠️ **"主题"是用户的整个 PPT 请求名称（如"三打白骨精"、"世界杯2026"），不是每一页、每一章节。**
> 绝对不允许为每一页或每个章节单独建文件夹！一次请求 = 一个文件夹，里面放所有页的图片。

```python
import os, re

SKILL_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.abspath(os.path.join(SKILL_DIR, '..', '..'))
WORKSPACE_SHARED = os.path.join(WORKSPACE_ROOT, "shared")

# 主题名 = 用户这次 PPT 的整体名称，不是页面名/章节名
# 例：用户说"生成三打白骨精海报PPT" → topic_slug = "sandabaigu"
topic_slug = re.sub(r'[^\w\-]', '_', topic.lower())[:50]
PROJECT_DIR = os.path.join(WORKSPACE_SHARED, topic_slug)
ASSETS_DIR = os.path.join(PROJECT_DIR, "assets")       # 所有页面的海报图片都放这里
SCRIPTS_DIR = os.path.join(PROJECT_DIR, "scripts")      # 生成脚本放这里
os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(SCRIPTS_DIR, exist_ok=True)

# 最终 PPT 输出也放在主题文件夹内
OUTPUT_PPTX = os.path.join(PROJECT_DIR, f"{topic_slug}.pptx")
```

**正确示例（三打白骨精 11 页 PPT）：**

```
shared/
└── sandabaigu/                    ← 整个 PPT 一个文件夹
    ├── assets/                    ← 所有 11 页的图片都在这里
    │   ├── cover.png              ← 封面
    │   ├── toc.png                ← 目录
    │   ├── section01.png          ← 章节1
    │   ├── page03_cungu.png       ← 内容页
    │   ├── page04_huoyan.png      ← 内容页
    │   ├── ...
    │   └── closing.png            ← 结尾
    ├── scripts/                   ← 生成脚本
    │   ├── gen_posters.py
    │   └── assemble_ppt.py
    └── sandabaigu.pptx            ← 最终输出 PPT
```

**错误示例（❌ 绝对不允许）：**

```
shared/
├── baigujing_xiyang/       ← ❌ 按章节建文件夹
├── baijingsheng/           ← ❌ 按章节建文件夹
├── section_divider_01/     ← ❌ 按页面建文件夹
├── sdbjg/                  ← ❌ 又一个散落文件夹
└── create_poster.py        ← ❌ 脚本散落在 shared 顶层
```

**禁止：**
- ❌ 为每一页/每一章节单独建文件夹（一次请求的所有图片放同一个 `assets/` 下）
- ❌ 在 workspace 根目录或 `scripts/` 目录写文件
- ❌ 在 `shared/` 顶层直接放文件（必须在 `shared/{topic}/` 下）
- ❌ 在 `skills/360-ppt-generator/` 下写运行时产物
- ❌ 使用相对路径或硬编码路径

### 三类页面视觉规范（MUST FOLLOW）

| 页面类型 | 背景 | 文字来源 | 可编辑？ | Logo |
|----------|------|---------|---------|------|
| **封面/结尾** | AI 纯装饰深蓝（NO TEXT） | python-pptx TextBox | ✅ 双击可改 | 白色 PNG 顶部居中 |
| **内容页** | AI 完整海报（浅蓝白底渐变+蓝角装饰） | AI 画在图里 | ❌ 需重生成 | 原版 PNG 左上角 |
| **章节分隔页** | AI 完整海报（深蓝渐变） | AI 画在图里 | ❌ 需重生成 | 白色 PNG 左上角 |

> **⚠️ 封面/结尾 prompt 铁律**：封面和结尾页的 prompt 必须包含 `STRICTLY NO TEXT, NO CHARACTERS, NO NUMBERS, NO LETTERS, NO WORDS`，并描述 `PURELY DECORATIVE background`。绝对不能在 prompt 中写 `Title: '...'` 或 `Large centered text: '...'` 之类让 AI 画文字的指令——否则会和 python-pptx 叠加的 TextBox 文字重叠。文字全部由组装代码中的 `add_textbox()` 负责。

### STYLE 前缀（统一定义 — 内容页默认浅蓝白底渐变风格，v4 真人验货确认）

```python
STYLE = (
    "Professional Chinese business presentation slide, premium Tencent-healthcare "
    "product-page aesthetic. CLEAN LIGHT-BLUE-TO-WHITE gradient background (very light, "
    "airy, lots of whitespace), with subtle thin blue geometric decorations only in the "
    "TOP-RIGHT and BOTTOM-RIGHT corners. "
    "CRITICAL LAYOUT RULE - LOGO SPACE: The ENTIRE top-left corner area (the top 1.2 inches "
    "height, left 3.5 inches width) MUST be COMPLETELY EMPTY - pure background color only, "
    "absolutely NO text, NO graphics, NO decorations, NO title in that zone. A real company "
    "logo PNG will be placed there afterward. Put the page title in the UPPER-CENTER, "
    "starting well clear of that top-left logo zone. "
    "STRICTLY NO LOGO, NO BRAND MARK, NO '360' TEXT anywhere - a real logo PNG will be "
    "overlaid later. "
    "Modern flat design, rounded cards with soft shadows, deep blue (#0721A8) titles, "
    "green (#00C853) and blue accents, clear accurate Simplified Chinese typography with "
    "bold titles and well-organized content, generous spacing. 16:9 widescreen. "
    "FONT: render ALL Chinese text in a clean modern sans-serif GOTHIC typeface like "
    "Microsoft YaHei / Source Han Sans - no serif, no decorative or handwriting fonts, "
    "consistent across the whole slide. "
    "FONT-SIZE HIERARCHY (keep this clear visual scale): page title largest and bold "
    "(about 40pt), section/card headings medium bold (about 22-24pt), body text regular "
    "(about 18pt), secondary notes / captions smaller (about 14pt). "
    "The text must be rendered clearly and accurately in Simplified Chinese. "
)
```

> **字体/字号说明**：内容页文字是 AI 直接画进图里的，无法用代码强制字体，只能靠 prompt 引导 AI 往「微软雅黑/思源黑体」这类现代无衬线黑体上画，并给出字号层级参照（页标题≈40pt / 卡片小标题≈22-24pt / 正文≈18pt / 次要说明≈14pt）。这是**引导**不是硬约束，AI 每张的一致性尽量高但不保证 100% 像素级统一。要 100% 锁死字体字号，需用文字模式或封面/结尾的 python-pptx 叠加文字。

深蓝页面（封面/章节/结尾）使用 `OVERRIDE STYLE:` 覆盖白底：

```python
# 封面/结尾/章节页 prompt 中添加：
"OVERRIDE STYLE: deep blue gradient background (#0D2B5A to #0721A8) with subtle tech circuit patterns. "
"STRICTLY NO LOGO, NO BRAND MARK, NO '360' TEXT anywhere — a real logo PNG will be overlaid later. "
"Leave the top-center/top-left area clean for logo overlay. "
"This is a COVER/SECTION DIVIDER/CLOSING slide - use deep blue gradient NOT white background."
```

### Prompt 编写规则

```python
# 每张海报 prompt = STYLE + "\n\n" + 内容描述

# ✅ 好的 prompt（结构清晰，指定具体文字）
("kpi_overview", (
    "KPI dashboard slide. Title: '平台数据概览'. "
    "4 large metric cards in a row: '50+ 已接入企业' '10+ 智能体已发布' ..."
))

# ❌ 差的 prompt（模糊）
("kpi_overview", "Show some KPI metrics")
```

要点：`Title: '...'` 明确标题；`Layout:` 指定布局；引号包裹所有中文文字；200-500 词。

### 批量生成脚本模板

本地模式的脚本也按主题文件夹组织，与平台在线模式保持一致：

```python
#!/usr/bin/env python3
"""海报批量生成脚本模板（本地模式）

输出结构：
  脚本所在目录/
  └── {topic}/
      ├── assets/          ← 海报图片
      ├── {topic}.pptx     ← 最终PPT
      └── 本脚本自身
"""
import os, sys, subprocess, time, re
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- 路径设置 ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))  # 技能根目录
GEN_SCRIPT = os.path.join(SKILL_DIR, "generate_images.py")

TOPIC = "worldcup_2026"  # ← 改成你的主题
ASSETS = os.path.join(SCRIPT_DIR, "assets")
os.makedirs(ASSETS, exist_ok=True)

STYLE = "..."  # 见上方统一定义

POSTERS = [
    ("cover", "OVERRIDE STYLE: deep blue gradient... PURELY DECORATIVE background, STRICTLY NO TEXT..."),
    ("agenda", "Agenda slide with 6 sections..."),
    ("section_1", "OVERRIDE STYLE: deep blue gradient... Section divider: '01' '章节标题'..."),
    ("content_1a", "Content slide. Title: '页面标题'. Layout: ..."),
    # ... 更多页面 ...
    ("closing", "OVERRIDE STYLE: deep blue gradient... PURELY DECORATIVE background, STRICTLY NO TEXT..."),
]

def gen_one(key, prompt, size="1792x1024"):  # 所有海报统一 1792x1024
    out = os.path.join(ASSETS, f"{key}.png")
    if os.path.exists(out):
        return (key, True, f"[SKIP] {key}.png exists")
    t0 = time.time()
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    result = subprocess.run(
        [sys.executable, GEN_SCRIPT, "-p", prompt, "-s", size,
         "-q", "high", "-o", f"{key}.png", "-d", ASSETS],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300, env=env
    )
    elapsed = time.time() - t0
    if result.returncode == 0 and os.path.exists(out):
        return (key, True, f"[OK] {key}.png ({os.path.getsize(out)//1024}KB, {elapsed:.1f}s)")
    stderr = result.stderr.decode('utf-8', errors='replace')[:300] if result.stderr else ''
    return (key, False, f"[FAIL] {key} rc={result.returncode}\n  {stderr}")

def main():
    print(f"Generating {len(POSTERS)} posters (parallel, max_workers=6)...")
    t_start = time.time()
    results = {}
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(gen_one, k, STYLE + "\n\n" + p): k for k, p in POSTERS}
        for f in as_completed(futures):
            k = futures[f]
            results[k] = f.result()
    for i, (key, _) in enumerate(POSTERS, 1):
        if key in results:
            print(f"[{i}/{len(POSTERS)}] {results[key][2]}")
    ok = sum(1 for v in results.values() if v[1])
    print(f"\nDone: {ok} OK, {len(results)-ok} FAIL ({time.time()-t_start:.1f}s)")

if __name__ == "__main__":
    main()
```

### 组装前验证（MUST FOLLOW）

```python
missing = []
for name in SLIDE_ORDER:
    path = os.path.join(ASSETS_DIR, f"{name}.png")
    if not os.path.exists(path):
        missing.append(name)
    elif os.path.getsize(path) < 10240:
        missing.append(f"{name} (文件过小)")
if missing:
    print(f"[FAIL] 缺少 {len(missing)} 个文件: {missing}")
else:
    print(f"[OK] 全部验证通过")
```

### PPT 组装模板

```python
#!/usr/bin/env python3
"""海报模式 PPT 组装（含 Logo 叠加 + 封面/结尾可编辑文字）"""
import os
from pptx import Presentation
from pptx.util import Inches, Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

SLIDE_WIDTH = Inches(13.333)
SLIDE_HEIGHT = Inches(7.5)
ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")

# Logo 资产
SKILL_DIR = os.path.dirname(os.path.abspath(__file__))
BRAND_DIR = os.path.join(SKILL_DIR, "brand_assets")
WHITE_LOGO = os.path.join(BRAND_DIR, "logo-title-white.png")
ORIG_LOGO  = os.path.join(BRAND_DIR, "logo-title.png")

def get_logo_config(key):
    if key == "cover":    return (WHITE_LOGO, 5.2, 0.3, 3.0)
    if key == "closing":  return (WHITE_LOGO, 5.2, 0.4, 3.0)
    if key.startswith("section_"): return (WHITE_LOGO, 0.5, 0.3, 2.2)
    return (ORIG_LOGO, 0.3, 0.15, 2.2)  # 内容页

C_WHITE = RGBColor(0xFF, 0xFF, 0xFF)
C_LIGHT_BLUE = RGBColor(0x90, 0xCA, 0xF9)
FONT_T = "Microsoft YaHei UI"

def add_textbox(slide, left, top, width, height, text, sz=28, bold=False,
                color=C_WHITE, align=PP_ALIGN.CENTER, font=FONT_T):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.text = text
    p.font.size = Pt(sz); p.font.bold = bold
    p.font.color.rgb = color; p.font.name = font; p.alignment = align

SLIDE_ORDER = ["cover", "agenda", "section_1", "content_1a", ..., "closing"]

def main():
    prs = Presentation()
    prs.slide_width = SLIDE_WIDTH; prs.slide_height = SLIDE_HEIGHT
    blank_layout = prs.slide_layouts[6]

    for key in SLIDE_ORDER:
        img_path = os.path.join(ASSETS, f"{key}.png")
        if not os.path.exists(img_path): continue
        slide = prs.slides.add_slide(blank_layout)
        slide.shapes.add_picture(img_path, Emu(0), Emu(0), SLIDE_WIDTH, SLIDE_HEIGHT)
        # Logo 叠加
        logo_file, lx, ly, lw = get_logo_config(key)
        if os.path.exists(logo_file):
            slide.shapes.add_picture(logo_file, Inches(lx), Inches(ly), Inches(lw))
        # 封面/结尾可编辑文字
        if key == "cover":
            add_textbox(slide, Inches(1.5), Inches(2.5), Inches(10.3), Inches(1.2),
                        "主标题", sz=44, bold=True)
            add_textbox(slide, Inches(2.0), Inches(3.8), Inches(9.3), Inches(0.8),
                        "副标题", sz=22, color=C_LIGHT_BLUE)
            add_textbox(slide, Inches(3.0), Inches(6.2), Inches(7.3), Inches(0.5),
                        "底部信息  |  日期", sz=14)
        elif key == "closing":
            add_textbox(slide, Inches(1.5), Inches(2.8), Inches(10.3), Inches(1.2),
                        "核心标语", sz=40, bold=True)
            add_textbox(slide, Inches(2.0), Inches(4.2), Inches(9.3), Inches(0.8),
                        "副标语/总结", sz=20, color=C_LIGHT_BLUE)
            add_textbox(slide, Inches(3.0), Inches(6.2), Inches(7.3), Inches(0.5),
                        "团队名称  |  时间", sz=14)
        # Speaker Notes（见下方）
        add_notes(slide, page_notes.get(key, ""))

    prs.save("输出文件名.pptx")

if __name__ == "__main__":
    main()
```

### 章节结构规划

- 每 3-6 页内容为一个章节，总章节数 4-8 个（推荐 6）
- 章节标题 4-8 字概括性名词短语
- 封面和结尾不计入章节

```python
CHAPTERS = [
    ("01", "平台定位与价值",    "为什么需要智能体协作平台"),
    ("02", "平台架构与能力",    "技术架构 · 能力全景 · 安全体系"),
    # ... 更多章节
]
```

---

## 文字模式（Text Mode）

### 模板结构

模板位置：`docs/01 医院智能体安全协作平台/13-代理商运营/PPT模版.pptx`

- Master 2 包含 6 个品牌装饰 shape（蓝弧+底部装饰+Logo组合+页脚）
- Layout 6（空白）绑定到 Master 2 → 所有内容页用 `cslide(prs)`

模板预设 3 张 Slide：
- idx 0 → 封面（保留，替换文字）
- idx 1 → 空白（用作议程页）
- idx 2 → 结尾（保留，`_move_slide_to_end` 移到末尾）

### main() 骨架

```python
def main():
    base = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base)

    tpl_files = glob.glob(os.path.join(project_root, "docs", "**", "PPT*.pptx"), recursive=True)
    tpl = next((f for f in tpl_files if "13-" in f), tpl_files[0])
    prs = Presentation(tpl)

    update_cover(prs)       # idx 0 — 替换文字，不新增 shape
    update_closing(prs)     # idx 2
    make_agenda(prs)        # idx 1

    make_section(prs, "01", "第一章标题")
    make_xxx(prs)
    # ... 更多章节 ...

    _move_slide_to_end(prs, 2)   # 结尾页移到末尾

    out = os.path.join(base, "_test_output.pptx")
    prs.save(out)
    print(f"Saved: {out} | Total slides: {len(prs.slides)}")
```

### Slide Builder 模式

每个内容页 = 一个独立的 `make_xxx(prs)` 函数：

```python
def make_positioning(prs):
    slide = cslide(prs)
    ptitle(slide, "平台定位")
    cards = [("安全合规", "等保三级认证\n全链路审计"), ...]
    for i, (title, body) in enumerate(cards):
        card(slide, Inches(0.5) + i * Inches(3.7), Inches(1.5),
             Inches(3.5), Inches(2.0), title, body)
    footer_note(slide, "结论：...")
    add_notes(slide, "解说词...")
```

### 章节分隔页

```python
def make_section(prs, num, title, subtitle=""):
    slide = cslide(prs)
    flat_rect(slide, Inches(0), Inches(2.0), Inches(12.2), Inches(2.5), C_BRAND)
    txt(slide, Inches(1.0), Inches(2.2), Inches(2), Inches(1),
        num, sz=48, bold=True, color=C_WHITE, font=FONT_T)
    txt(slide, Inches(1.0), Inches(3.0), Inches(10), Inches(0.6),
        title, sz=28, bold=True, color=C_WHITE, font=FONT_T)
    if subtitle:
        txt(slide, Inches(1.0), Inches(3.7), Inches(10), Inches(0.4),
            subtitle, sz=14, color=C_PRIMARY_L)
```

### 封面/结尾页修改规范

**必须替换已有文字，不能新增 shape 叠加**，否则文字重叠。用 `_replace_shape_text` 通过 `shape.text_frame.text` 中的关键字定位目标 shape。

```python
def update_cover(prs):
    slide = prs.slides[0]
    for shape in slide.shapes:
        if shape.has_text_frame and "360" in shape.text_frame.text:
            _replace_shape_text(shape, [
                ("你的标题", 40, True, C_BRAND, PP_ALIGN.CENTER),
                ("", 14, False, C_BRAND, PP_ALIGN.CENTER),
                ("副标题信息", 18, False, C_GRAY, PP_ALIGN.CENTER),
            ])
            break
```

**注意**：模板封面/结尾背景为白色，文字用 `C_BRAND`/`C_GRAY`，**不要用 `C_WHITE`**（白底白字不可见）。

### footer_note 规则

- 每个 `make_xxx()` 最后调用 `footer_note(slide, "结论：...")`
- 章节分隔页不需要
- 结论文字概括该页核心，15-40 字

---

## 混合模式

在同一 PPT 中组合文字页和海报页。基于文字模式的 360 品牌模板，海报页通过 `add_image_centered()` 全页覆盖。

```
典型规划：
Slide 1  — 封面          → 海报（AI 封面图）
Slide 2  — 目录          → 文字（精确列表）
Slide 3  — 章节分隔      → 海报（深蓝渐变）
Slide 4  — 产品定位      → 文字（卡片+要点）
Slide 5  — 数据对比      → 文字（table_slide）
...
Slide N  — 结尾          → 海报（感谢聆听）
```

**关键要点**：
1. 使用 `cslide(prs)` 统一创建所有页（无论文字还是海报）
2. 海报图片先生成，在 `main()` 开头调用批量生成
3. 封面(idx=0)/结尾(idx=2) 可用海报图片覆盖原有内容
4. 混合比例灵活

完整模板脚本见 [template_hybrid_script.py](./template_hybrid_script.py)。

---

## 背景图 + 可编辑文字变体

AI 生成纯装饰背景 + python-pptx 叠加可编辑文字。与海报模式的区别：文字全部由 python-pptx 绘制（可编辑），背景只做装饰。

> **核心铁律**：AI 背景 = 纯装饰。所有结构（卡片/表格/分隔线/边框）由 python-pptx 绘制。
> AI 画的结构位置不可控，python-pptx 叠加时必然错位。

```python
# 工作流：
# 1. AI 生成纯背景（prompt 强调 NO TEXT + NO LOGO + NO STRUCTURE + 留出 logo 空间）
# 2. add_bg_image(slide, bg_path)    → 铺满整页、z-order 最底层
# 3. slide.shapes.add_picture(logo)  → 叠加真实 logo PNG
# 4. txt(slide, ..., color=C_WHITE)  → 叠加可编辑文字（避开 logo 区域）
```

背景图 Prompt 模板：
```python
BG_PROMPT = (
    "Abstract technology background, deep blue gradient (#0B1D3A to #1A3A6B), "
    "subtle geometric grid lines, glowing particle dots, soft light rays. "
    "STRICTLY NO TEXT, NO CHARACTERS, NO LETTERS, NO NUMBERS, NO WATERMARK. "
    "STRICTLY NO LOGO, NO BRAND MARK — a real logo PNG will be overlaid later. "
    "NO CARDS, NO BOXES, NO RECTANGLES, NO TABLE LINES, NO FRAMES, NO CONTENT AREAS. "
    "Leave the top-left corner (top 1 inch, left 3 inches) clean for logo overlay. "
    "Pure abstract decorative background only."
)
```

---

## Speaker Notes（解说词）

**规则**：每页必须调用 `add_notes(slide, text)`，无一例外。

```python
add_notes(slide, (
    "这页的核心信息是：{一句话总结}\n"
    "\n"
    "{展开说明关键数据/要点的解读}\n"
    "{补充幻灯片上没写但值得口头说的内容}\n"
    "\n"
    "{过渡句：引出下一页}"
))
```

| 规则 | 说明 |
|------|------|
| 长度 | 每页 50-150 字，不超 200 字 |
| 语气 | 口语化，用"大家""我们""你看" |
| 结构 | 引入 → 展开 → 过渡（承接下一页） |
| 禁止 | 不要复读幻灯片文字，notes 是"补充" |

海报模式在组装时通过 `page_notes` dict 传入：

```python
if key in page_notes:
    add_notes(slide, page_notes[key])
```

---

## 验证清单

### 文字模式

- [ ] `python -m py_compile script.py` 语法正确
- [ ] 脚本运行无报错，输出 slide 数量
- [ ] Slide 1 是封面、最后一页是结尾
- [ ] 所有内容页有蓝弧 + 360 Logo + 页脚
- [ ] 没有文字溢出或被裁切
- [ ] 没有空白页面
- [ ] 每页有 Speaker Notes
- [ ] 每页有 footer_note

### 海报模式

- [ ] 所有海报图片已生成，每张 **1792×1024**（统一尺寸），>100KB
- [ ] 中文文字渲染正确（无乱码/缺字）
- [ ] 视觉风格统一
- [ ] 封面/结尾：纯装饰背景 + 可编辑 TextBox + Logo PNG
- [ ] 内容页：白底 + 蓝角装饰 + 左上角 Logo
- [ ] 章节页：深蓝渐变 + 左上角 Logo + 大编号
- [ ] PPT 页数 = SLIDE_ORDER 长度
- [ ] 每页全屏铺满无黑边
- [ ] 所有页面叠加真实 Logo PNG（非 AI 绘制）
- [ ] 每页有 Speaker Notes

---

## 常见错误

| 问题 | 原因 | 解决 |
|------|------|------|
| 品牌装饰消失 | 错误的 Master/Layout | 必须用 `cslide(prs)` |
| zip Duplicate name | 删除了模板 slide | 保留所有 3 张模板 slide |
| UnicodeEncodeError surrogates | emoji U+10000+ | 替换为 BMP 字符 |
| 文字被底部遮挡 | Y 超出安全区域 | Y+H ≤ Inches(6.5) |
| 表格溢出 | 行数过多 | 每表 ≤ 8 行，或分页 |
| 封面/结尾空白 | 白底上用 C_WHITE 写字 | 用 C_BRAND/C_GRAY |
| 封面文字重叠 | 新增 shape 而非替换 | 用 `_replace_shape_text` |
| 内容页下半空旷 | 缺少底部结论 | 加 `footer_note()` |
| 背景图+文字对不齐 | AI 背景画了结构元素 | Prompt 加 NO CARDS/BOXES/FRAMES |

---

## 参考文件

### 文字模式
- **模板**: `brand_assets/PPT模版.pptx`
- **Helper 函数库**: [helpers.py](./helpers.py)
- **模板脚本**: [template_script.py](./template_script.py)

### 海报模式
- **模板脚本**: [template_poster_script.py](./template_poster_script.py)

### 混合模式
- **模板脚本**: [template_hybrid_script.py](./template_hybrid_script.py)

### 通用
- **图片生成器**: [generate_images.py](./generate_images.py)（内嵌，无外部依赖）
- **Logo 资产**: `brand_assets/logo-title.png`、`brand_assets/logo-title-white.png`
- **内容页背景**: `brand_assets/content_bg.png`（所有内容页统一使用）
- **品牌模板**: `brand_assets/PPT模版.pptx`
