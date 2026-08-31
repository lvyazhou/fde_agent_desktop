---
name: image-generator
description: Use when the user wants to generate an image, create a picture, make an illustration, design a cover, or do image-to-image editing.
---

# Image Generator

AI 图片生成工具，支持文本生图（Text-to-Image）和图生图（Image-to-Image）。

## Command

```bash
python C:\Users\lvyazhou\.product-lobster\skills\image-generator\generate_images.py -p "PROMPT" [OPTIONS]
```

## Parameters

| Flag | Description | Default |
|------|-------------|---------|
| `-p` / `--prompt` | 图片描述提示词（必填） | — |
| `-i` / `--image` | 参考图片路径或URL（图生图，可多次指定） | — |
| `-m` / `--mask` | 蒙版图片（局部重绘） | — |
| `-s` / `--size` | 图片尺寸（**必须是 16 的倍数**） | `1024x1024` |
| `-n` | 生成数量 | `1` |
| `-q` / `--quality` | 质量: low, medium, high, auto | API 默认 |
| `--style` | 风格: natural, vivid | — |
| `-o` / `--output` | 输出文件名 | `generated_时间戳.png` |
| `-d` / `--dir` | 输出目录 | 当前目录下 `generated_images/` |
| `--model` | 模型 | `openai/gpt-image-2` |

## Critical Rules

### 1. 尺寸必须是 16 的倍数
**不要用** `1500x600`，**要用** `1536x608`。否则 API 会报错。

### 2. 建议显式传 -q medium
API 代理有个 bug：不传 quality 参数时可能注入无效的 `standard` 值导致 400 错误。建议每次都带上 `-q medium`。

## Common Sizes

| 用途 | 尺寸 | 比例 |
|------|------|------|
| 正方形（头像/图标） | `1024x1024` | 1:1 |
| Twitter/X 封面 | `1536x608` | ~5:2 |
| 宽屏横图 | `1792x1024` | 16:9 |
| 竖图/海报/手机壁纸 | `1024x1792` | 9:16 |

## Prompt Writing Tips

好的提示词通常包含：
- **主体与角色**：描述画面中的主要对象
- **视觉对比/冲突**：增加画面张力
- **布局方向**：如「左侧留白」「居中构图」
- **色彩方案**：如「深蓝与金色色调」「莫兰迪色系」
- **光影与美学**：如「电影感光影」「扁平插画风格」
- **留白指示**：如果需要后期加文字，注明「reserve clean negative space for text overlay」

### Chinese Text Warning
AI 生成的中文文字排版不稳定，建议：
1. **推荐**：生成干净背景 + 留白区域，后期在 Canva/Figma 加文字
2. **直接出文字**：在 prompt 中包含文字内容，但需仔细检查输出

## Examples

```bash
# 基础文本生图
python C:\Users\lvyazhou\.product-lobster\skills\image-generator\generate_images.py \
  -p "A cute orange tabby cat sitting on a windowsill, warm sunlight, cozy atmosphere" \
  -q medium

# Twitter/X 封面
python C:\Users\lvyazhou\.product-lobster\skills\image-generator\generate_images.py \
  -p "Cinematic wide illustration: futuristic cityscape with neon lights reflecting on wet streets, cyberpunk aesthetic, deep blue and magenta tones, clean space on the left for text" \
  -s 1536x608 -q medium -o twitter_cover.png

# 图生图（修改已有图片）
python C:\Users\lvyazhou\.product-lobster\skills\image-generator\generate_images.py \
  -p "Transform this into a watercolor painting style, keep the composition" \
  -i /path/to/source.png -q medium

# 竖版海报
python C:\Users\lvyazhou\.product-lobster\skills\image-generator\generate_images.py \
  -p "Minimalist poster design: a single tree on a hill, golden hour, soft gradients" \
  -s 1024x1792 -q medium -o poster.png

# 指定输出到项目目录
python C:\Users\lvyazhou\.product-lobster\skills\image-generator\generate_images.py \
  -p "App icon: a brain with circuit patterns, flat design, gradient blue to purple" \
  -s 1024x1024 -q medium -d /path/to/project/assets -o app_icon.png
```
