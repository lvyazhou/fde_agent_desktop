---
name: product-doc-to-word
description: Use when user says 转成word/生成word/导出word/输出正式文档/产品功能清单word/word文档/生成产品文档/做成word. Converts a product feature list (Markdown) into a formal Word document (.docx) with Chinese government-standard formatting.
---

# Product Doc to Word（产品文档转 Word）

## Overview

将 Markdown 格式的产品功能清单转换为排版规范的 Word 文档（.docx），符合中国政企公文排版标准。使用 python-docx 库生成，字体/字号/间距/表格样式固定不变。

## When to Use

- 用户说：转成word、生成word、导出word、输出正式文档、产品功能清单word、做成word
- 用户指定一个 Markdown 产品文档，要求输出为 Word 格式
- 用户刚写完/修改完一个产品功能清单，说"出个正式版"

## When NOT to Use

- 只是普通文本转 Word（不是产品功能清单结构的）
- 用户要求 PDF 输出（不是本技能范围）
- 技术文档/API文档转换（格式不同）

## 排版规范（铁律，不可修改）

| 元素 | 字体 | 字号 | 其他 |
|------|------|------|------|
| 一级标题 | 黑体 | 22pt | 加粗，居中 |
| 二级标题 | 黑体 | 16pt | 加粗，左对齐 |
| 三级标题 | 黑体 | 14pt | 加粗，左对齐 |
| 四级标题 | 黑体 | 12pt | 加粗，左对齐 |
| 正文 | 仿宋 | 12pt（小四） | 行距1.5倍，首行缩进两字符（24pt） |
| 元信息行 | 仿宋 | 10.5pt（五号） | 居中 |
| 表头 | 黑体 | 10.5pt | 加粗，蓝灰底色 #D9E2F3 |
| 表格正文 | 仿宋 | 10.5pt | 功能列加粗 |
| 英文/数字 | Times New Roman | 同中文 | 通过 rPr.rFonts eastAsia 设置 |
| 页边距 | — | — | 上下2.54cm，左右3.17cm |

## 执行流程

### Step 1：确认源文件

- 确认要转换的 Markdown 文件路径
- 如果用户没指定，询问或根据上下文推断（通常是刚修改过的产品功能清单）

### Step 2：读取并分析 Markdown 结构

- Read 源文件
- 识别：一级标题（文档名）、元信息（版本/定位/用户/依据）、各级标题、正文段落、Markdown 表格、引用块（需求场景）

### Step 3：生成 Python 脚本

基于下方代码模板，根据源文档内容生成完整的 python-docx 脚本。

### Step 4：执行脚本

```bash
python <script_path>
```

### Step 5：确认输出

告知用户文件已生成及路径。

## 输出路径约定

- 默认：与源 Markdown 同目录，文件名相同，后缀 .docx
- 如果用户指定了路径，用用户指定的

## 代码模板（核心 Helper 函数集）

以下 helper 函数是固定的，每次生成脚本都必须包含：

```python
from docx import Document
from docx.shared import Pt, Cm, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

doc = Document()

# ===== 页边距 =====
for section in doc.sections:
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)
    section.left_margin = Cm(3.17)
    section.right_margin = Cm(3.17)

# ===== Helper 函数 =====

def set_font(run, name_cn='仿宋', name_en='Times New Roman', size=Pt(12), bold=False, color=None):
    """设置字体（中英文分别指定）"""
    run.font.size = size
    run.font.bold = bold
    run.font.name = name_en
    run.element.rPr.rFonts.set(qn('w:eastAsia'), name_cn)
    if color:
        run.font.color.rgb = color

def add_heading_custom(doc, text, level=1):
    """添加标题（黑体，按级别设置字号）"""
    p = doc.add_paragraph()
    if level == 1:
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(6)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(text)
        set_font(run, name_cn='黑体', size=Pt(22), bold=True)
    elif level == 2:
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(6)
        run = p.add_run(text)
        set_font(run, name_cn='黑体', size=Pt(16), bold=True)
    elif level == 3:
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(text)
        set_font(run, name_cn='黑体', size=Pt(14), bold=True)
    elif level == 4:
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(text)
        set_font(run, name_cn='黑体', size=Pt(12), bold=True)
    return p

def add_body_text(doc, text, indent=True):
    """添加正文段落（仿宋小四，1.5倍行距）"""
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.5
    if indent:
        p.paragraph_format.first_line_indent = Pt(24)
    run = p.add_run(text)
    set_font(run, name_cn='仿宋', size=Pt(12))
    return p

def add_meta_line(doc, text):
    """添加元信息行（仿宋五号，居中）"""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(text)
    set_font(run, name_cn='仿宋', size=Pt(10.5))
    return p

def set_cell_font(cell, text, bold=False, header=False):
    """设置表格单元格字体"""
    cell.text = ''
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(text)
    if header:
        set_font(run, name_cn='黑体', size=Pt(10.5), bold=True)
    else:
        set_font(run, name_cn='仿宋', size=Pt(10.5), bold=bold)

def set_table_borders(table):
    """设置表格黑色单线边框"""
    tbl = table._tbl
    tblPr = tbl.tblPr if tbl.tblPr is not None else OxmlElement('w:tblPr')
    borders = OxmlElement('w:tblBorders')
    for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        border = OxmlElement(f'w:{border_name}')
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), '4')
        border.set(qn('w:space'), '0')
        border.set(qn('w:color'), '000000')
        borders.append(border)
    tblPr.append(borders)

def shade_header_row(table):
    """表头行加蓝灰底色"""
    for cell in table.rows[0].cells:
        shading = OxmlElement('w:shd')
        shading.set(qn('w:fill'), 'D9E2F3')
        shading.set(qn('w:val'), 'clear')
        cell._tc.get_or_add_tcPr().append(shading)

def add_feature_table(doc, rows):
    """添加功能表格（2列：功能+说明）"""
    table = doc.add_table(rows=len(rows)+1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table)
    table.columns[0].width = Cm(4)
    table.columns[1].width = Cm(12)
    set_cell_font(table.rows[0].cells[0], '功能', header=True)
    set_cell_font(table.rows[0].cells[1], '说明', header=True)
    shade_header_row(table)
    for i, (func, desc) in enumerate(rows, 1):
        set_cell_font(table.rows[i].cells[0], func, bold=True)
        set_cell_font(table.rows[i].cells[1], desc)
    doc.add_paragraph()
    return table

def add_multi_col_table(doc, rows, headers, col_widths=None):
    """添加多列表格（自定义表头）"""
    table = doc.add_table(rows=len(rows)+1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table)
    if col_widths:
        for j, w in enumerate(col_widths):
            table.columns[j].width = Cm(w)
    for j, h in enumerate(headers):
        set_cell_font(table.rows[0].cells[j], h, header=True)
    shade_header_row(table)
    for i, row in enumerate(rows, 1):
        for j, val in enumerate(row):
            set_cell_font(table.rows[i].cells[j], val)
    doc.add_paragraph()
    return table
```

## Markdown → Word 映射规则

| Markdown 元素 | Word 处理方式 |
|--------------|--------------|
| `# 标题` | `add_heading_custom(doc, text, level=1)` — 文档主标题 |
| `## 标题` | `add_heading_custom(doc, text, level=2)` — 章节标题 |
| `### 标题` | `add_heading_custom(doc, text, level=3)` — 子章节 |
| `#### 标题` | `add_heading_custom(doc, text, level=4)` — 小节 |
| `> 版本：...` | `add_meta_line(doc, text)` — 元信息居中 |
| `> **需求场景**：...` | `add_body_text(doc, text)` — 转为正文段落（楷体/仿宋） |
| 普通段落 | `add_body_text(doc, text)` — 仿宋小四 |
| 两列表格（功能\|说明） | `add_feature_table(doc, rows)` |
| 多列表格 | `add_multi_col_table(doc, rows, headers)` |
| `---` 分隔线 | 忽略，不输出 |
| 代码块 | 忽略（功能清单中一般没有代码块需要输出） |
| 加粗 `**text**` | run 设置 bold=True |
| 列表 `- item` | 转为正文段落，前加"· " |

## 核心规则

### 排版一致性
- 所有字体设置必须通过 `set_font()` 函数，确保 eastAsia 字体正确设置
- 不要使用 python-docx 的 `doc.add_heading()`（它的默认样式不符合公文规范）
- 表格必须有边框和表头底色

### 内容完整性
- 源文档中的每一个章节、每一个表格都必须转换，不能遗漏
- 表格中的 emoji（✅ 等）保留原样

### 脚本可执行性
- 生成的脚本必须是一个完整可运行的 .py 文件
- 文件路径使用绝对路径
- 确认环境有 python-docx：如果没有，先 `pip install python-docx`

### 文件命名
- 脚本临时文件：`/tmp/gen_word_<timestamp>.py` 或系统临时目录
- 输出 Word：与源文件同目录同名 `.docx`

## 特殊处理

### 引用块（需求场景说明）
Markdown 中的 `> **需求场景**：...` 块在 Word 中转为：
- 楷体或仿宋正文段落
- 可选：左侧加蓝色竖线（通过段落左边框实现），但不强制

### 长表格
如果 Markdown 表格超过 20 行，考虑分页。表头在每页重复（通过 `tbl.tblPr` 的 `tblHeader` 属性）。

### 多级列表
Markdown 的 `- [ ] 任务` 转为正文，前加 "□ "；`- [x] 任务` 前加 "☑ "。
