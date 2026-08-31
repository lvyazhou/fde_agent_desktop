---
name: md-export
description: Use when user says 转PDF/生成PDF/导出PDF/转Word/生成Word/导出Word/转成word/md转pdf/md转word/出个PDF版/出个Word版/export PDF/export Word/把这个转成PDF/把这个转成word. Converts Markdown to a styled PDF or Word (.docx) document with 360 brand styling, full Chinese font support, embedded images, and formatted tables. Auto-detects target format (PDF vs Word) from the user's request.
---

# Markdown Export（Markdown 导出 PDF / Word）

## Overview

把 Markdown 文件导出成排版精美的 **PDF** 或 **Word（.docx）**，带 360 品牌样式（深蓝 `#0721A8` 标题 + 蓝底白字表格 + 引用块），支持中文字体（微软雅黑）、自动嵌入图片、A4/公文页边距。

一个脚本 `export.py` 统一处理，用 `--to pdf` 或 `--to word` 分流。

## When to Use

- **转 PDF**：用户说 转PDF、生成PDF、导出PDF、md转pdf、出个PDF版、export PDF
- **转 Word**：用户说 转Word、转成word、生成Word、导出Word、md转word、出个Word版、做成word、export Word
- 用户写完/改完一个 `.md`，说"出个正式版""发给领导的版本"——**问清楚要 PDF 还是 Word**，或按上下文判断

## When NOT to Use

- 转 PPT（用 `360-ppt-generator`）
- 产品功能清单转规范公文 Word（可用 `product-doc-to-word`，那个专门做政企公文格式）
- 源文件不是 Markdown

## 格式判断（重要）

先从用户的话里判断目标格式：

| 用户说 | 格式 |
|--------|------|
| 转PDF、PDF版、export PDF | `--to pdf` |
| 转Word、word、docx、做成word | `--to word` |
| 只说"转一下""出正式版"没指明 | 默认 PDF，或直接问用户 |

## 环境依赖

```bash
pip install markdown python-docx
```

Edge 或 Chrome（PDF 用，Windows 自带 Edge）。

## 执行流程

### Step 1：确认源文件和格式

- 确认要转换的 `.md` 文件路径（用 Glob 确认真实文件名，别猜——文件名可能带版本号如 `xxxv1.1.md`）
- 确认目标格式（PDF 还是 Word）

### Step 2：调用脚本

脚本在本技能目录：`export.py`。**必须设 `PYTHONUTF8=1`**（中文路径需要）：

```powershell
$env:PYTHONUTF8 = "1"
$skill = "e:\work-notes\.claude\skills\md-export\export.py"

# 转 PDF
python $skill "输入.md" --to pdf

# 转 Word
python $skill "输入.md" --to word

# 指定输出路径
python $skill "输入.md" --to pdf --out "输出.pdf"
```

输出默认是同名 `.pdf` / `.docx`（同目录）。

### Step 3：确认结果

脚本打印 `[OK] 文件名.pdf (XXX KB) [PDF]`。看到就是成功。

## 样式规范（固定，除非用户要求改）

| 元素 | PDF | Word |
|------|-----|------|
| H1 标题 | 深蓝 26px，居中 | 深蓝 22pt，居中 |
| H2 标题 | 深蓝 22px | 深蓝 16pt |
| H3/H4 | 主色蓝 18/16px | 主色蓝 14/12pt |
| 正文 | 微软雅黑 14px，行距 1.8 | 微软雅黑 12pt |
| 表头 | 深蓝底白字加粗 | 深蓝底白字加粗 |
| 表格 | 斑马纹 + 边框 | 网格线 |
| 图片 | 自动内嵌（base64） | 自动嵌入，宽 6 英寸 |
| 加粗 | 深蓝 | 深蓝 |
| 页面 | A4，2cm 边距，**无横杠** | 公文页边距（上下2.54/左右3.17cm）|

改样式：PDF 改 `export.py` 里的 `CSS` 常量；Word 改 `to_word()` 函数里的字号/颜色。

## 脚本已规避的坑（关键）

- **中文路径 mojibake**：某些 Windows Python 环境下，中文路径经 argv/glob 会乱码，导致"文件找不到"。脚本内部**先把 md 和引用的图片复制到英文临时目录处理，产物再复制回目标路径**——这是最稳的办法。调用时务必设 `PYTHONUTF8=1`。
- **PDF file URI**：用 Python `Path.as_uri()` 生成，自动编码中文/空格/加号。**不要**在 PowerShell 里用 `-replace '\\','/'` 拼 URI（沙箱会误当删除路径拦截）。
- **Edge 路径**：脚本内部自己找浏览器，**不要**把 Edge 路径存 PowerShell 变量再 `Remove-Item`（沙箱误拦 `C:\Program`）。
- **横杠问题**：标题不加 `border-bottom` 下划线，`hr` 隐藏——PDF 里不会有多余的横线。
- **图片嵌入**：md 里的 `![](图片.png)` 会被自动找到并嵌入；Word 里图片插在含"架构/组织"的标题后。

## 常见问题

- **文件找不到 / FileNotFoundError**：先用 Glob 查真实文件名（可能带版本号）。确认设了 `PYTHONUTF8=1`。
- **PDF 没生成**：上一个 Edge headless 进程没退干净，等几秒重试。
- **Word 表格错位**：确认 md 表格语法规范（每行 `|` 数量一致 + 有分隔行 `| --- |`）。
- **中文乱码**：源 md 必须 UTF-8 编码。
