#!/usr/bin/env python3
"""
生图工具 - 支持文本生图和图生图/图片修改功能

Usage:
    # 文本生图
    python generate_images.py -p "一只可爱的猫咪"

    # 图生图（修改参考图片）
    python generate_images.py -p "把这只猫变成老虎" -i input.png

    # 指定尺寸和输出文件名
    python generate_images.py -p "科技感封面" -s 1536x608 -o cover.png

    # 指定输出目录
    python generate_images.py -p "一只猫" -d /path/to/output

    # 多张参考图片
    python generate_images.py -p "融合这两张图片的风格" -i image1.png -i image2.png
"""

import os
import argparse
import requests
import json
import base64
from datetime import datetime
from pathlib import Path

# ============ 配置 ============
API_BASE_URL = "https://api.360.cn/v1"
API_KEY = "fk877248635.ecUvG0o6o-3b3sdg8zjVVpfy-M_SDSyT43375334"
# 默认输出到当前工作目录下的 generated_images/，可通过 -d 参数覆盖
SCRIPT_DIR = Path(__file__).parent.resolve()
DEFAULT_OUTPUT_DIR = str(Path.cwd() / "generated_images")


def get_image_data_uri(image_path):
    """将本地图片转换为 base64 字符串，如果是 URL 则直接返回"""
    if image_path.startswith("http://") or image_path.startswith("https://"):
        return image_path

    if os.path.exists(image_path):
        with open(image_path, "rb") as f:
            b64_data = base64.b64encode(f.read()).decode('utf-8')
        return b64_data

    raise FileNotFoundError(f"找不到图片文件: {image_path}")


def generate_images(args):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {args.api_key}"
    }

    payload = {
        "model": args.model,
        "prompt": args.prompt,
        "n": args.n,
        "size": args.size,
        "response_format": "",
        "style": args.style if args.style else ""
    }

    # 只在用户明确传入 -q 时才带 quality 参数，避免传入 API 不支持的默认值导致 400
    if args.quality:
        payload["quality"] = args.quality

    # 判断是生图还是编辑（图生图）
    is_edit = bool(args.image)

    if is_edit:
        url = f"{API_BASE_URL}/images/edits"
        print(f"模式: 图片编辑 (Image Edit)")

        images = []
        for img in args.image:
            if img.startswith("http://") or img.startswith("https://"):
                images.append(img)
            else:
                images.append(get_image_data_uri(img))

        extra_body = {"image_urls": images}

        if args.mask:
            if args.mask.startswith("http://") or args.mask.startswith("https://"):
                extra_body["mask"] = args.mask
            else:
                extra_body["mask"] = get_image_data_uri(args.mask)

        # 针对 wan2.7 模型的特殊参数结构
        if "wan2.7" in args.model:
            messages = []
            for img in images:
                messages.append({"image": img})
            messages.append({"text": args.prompt})
            extra_body = {
                "input": {
                    "messages": messages
                },
                "parameters": {
                    "size": args.size,
                    "n": args.n
                }
            }

        payload["extra_body"] = extra_body
    else:
        url = f"{API_BASE_URL}/images/generations"
        print(f"模式: 文本生图 (Text to Image)")

        # 针对 wan2.7 模型的特殊参数结构
        if "wan2.7" in args.model:
            payload["extra_body"] = {
                "input": {
                    "messages": [
                        {"role": "user", "content": [{"text": args.prompt}]}
                    ]
                },
                "parameters": {
                    "size": args.size,
                    "n": args.n
                }
            }

    print(f"模型: {args.model}")
    print(f"提示词: {args.prompt}")
    print(f"请求 URL: {url}")

    # 打印 payload 时截断过长的 base64 数据，避免刷屏
    debug_payload = json.loads(json.dumps(payload))
    if is_edit and "extra_body" in debug_payload:
        if "image_urls" in debug_payload["extra_body"]:
            debug_payload["extra_body"]["image_urls"] = [
                img[:50] + "..." if len(img) > 100 else img
                for img in debug_payload["extra_body"]["image_urls"]
            ]
        if "mask" in debug_payload["extra_body"]:
            mask = debug_payload["extra_body"]["mask"]
            if len(mask) > 100:
                debug_payload["extra_body"]["mask"] = mask[:50] + "..."

    print(f"请求参数: {json.dumps(debug_payload, ensure_ascii=False, indent=2)}")

    try:
        response = requests.post(url, headers=headers, json=payload)

        if response.status_code != 200:
            print(f"\n✗ 请求失败: HTTP {response.status_code}")
            print(response.text)
            return

        data = response.json()
        if "error" in data:
            print(f"\n✗ API 返回错误: {json.dumps(data['error'], ensure_ascii=False)}")
            return

        output_dir = args.dir if args.dir else DEFAULT_OUTPUT_DIR
        os.makedirs(output_dir, exist_ok=True)

        saved_paths = []
        for i, item in enumerate(data.get("data", [])):
            img_url = item.get("url")
            b64_json = item.get("b64_json")

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            if args.output:
                filename = args.output if args.n == 1 else f"{Path(args.output).stem}_{i+1}{Path(args.output).suffix}"
            else:
                filename = f"generated_{timestamp}_{i+1}.png"

            filepath = os.path.join(output_dir, filename)

            if img_url:
                print(f"\n正在下载图片 {i+1}/{args.n}...")
                img_resp = requests.get(img_url)
                if img_resp.status_code == 200:
                    with open(filepath, "wb") as f:
                        f.write(img_resp.content)
                    print(f"✓ 已保存: {filepath}")
                    saved_paths.append(filepath)
                else:
                    print(f"✗ 下载图片失败: HTTP {img_resp.status_code}")
            elif b64_json:
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(b64_json))
                print(f"✓ 已保存 (base64): {filepath}")
                saved_paths.append(filepath)

        print(f"\n完成！共生成 {len(saved_paths)} 张图片。")

    except Exception as e:
        print(f"\n✗ 发生异常: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="生图工具 - 支持文本生图和图生图",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
尺寸参考 (必须是 16 的倍数):
  1024x1024   正方形（默认）
  1536x608    Twitter/X 封面（~5:2，推荐）
  1792x1024   宽屏横图（16:9）
  1024x1792   竖图（手机 / 海报）

示例:
  # 文本生图
  python generate_images.py -p "一只可爱的橘猫"

  # Twitter 封面图（5:2）
  python generate_images.py -p "科技感封面图，深蓝色调" -s 1536x608 -o twitter_cover.png

  # 图生图（修改参考图片）
  python generate_images.py -p "把这只猫变成老虎" -i cat.png

  # 多张参考图片
  python generate_images.py -p "融合这两张图片的风格" -i image1.png -i image2.png

  # 指定输出目录
  python generate_images.py -p "一只猫" -d /tmp/my_images
        """
    )

    parser.add_argument("-p", "--prompt", type=str, required=True,
                        help="图片生成/编辑提示词")
    parser.add_argument("-i", "--image", type=str, action="append",
                        help="参考图片路径或URL（用于图生图，可指定多个）")
    parser.add_argument("-m", "--mask", type=str,
                        help="蒙版图片路径或URL（用于局部重绘）")
    parser.add_argument("--model", type=str,
                        default="openai/gpt-image-2",
                        help="使用的模型 (默认: openai/gpt-image-2)")
    parser.add_argument("-n", type=int, default=1,
                        help="生成图片数量 (默认: 1)")
    parser.add_argument("-s", "--size", type=str,
                        default="1024x1024",
                        help="图片尺寸，必须是16的倍数，如 1536x608 (默认: 1024x1024)")
    parser.add_argument("-q", "--quality", type=str,
                        help="图片质量: low, medium, high, auto（不传则由 API 决定）")
    parser.add_argument("--style", type=str,
                        help="图片风格 (如: natural, vivid)")
    parser.add_argument("-o", "--output", type=str,
                        help="输出文件名")
    parser.add_argument("-d", "--dir", type=str,
                        help="输出目录（默认: 当前目录下的 generated_images/）")
    parser.add_argument("--api-key", type=str, default=API_KEY,
                        help="API Key（可选，默认使用内置Key）")

    args = parser.parse_args()
    generate_images(args)


if __name__ == "__main__":
    main()
