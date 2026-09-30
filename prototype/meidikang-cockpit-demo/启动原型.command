#!/bin/bash
# 双击启动原型：起本地静态服务并打开浏览器（macOS）
# 健壮版：自动避开被占端口、探活后再打开，防止串到别的项目页面
cd "$(dirname "$0")" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ 未找到 python3，请先安装（或用 Homebrew：brew install python）"
  read -n 1 -s -r -p "按任意键关闭…"; exit 1
fi

DIR="$(pwd)"

# 判断某端口是否正被“本目录”的服务占用（复用它，避免重复起）
serving_here() {
  local port=$1 pid cwd
  pid=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -1)
  [ -z "$pid" ] && return 1
  cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | grep '^n' | head -1 | cut -c2-)
  [ "$cwd" = "$DIR" ]
}

port_free() {
  ! lsof -nP -iTCP:"$1" -sTCP:LISTEN -t >/dev/null 2>&1
}

# 选端口：8770 起，若被“别的目录”占用就顺延找空闲端口
PORT=8770
if serving_here "$PORT"; then
  echo "✅ 本原型服务已在运行，直接打开。"
else
  while ! port_free "$PORT"; do
    echo "⚠️  端口 $PORT 被别的程序占用，换一个…"
    PORT=$((PORT+1))
  done
  echo "🚀 美迪康经营驾驶舱原型 · 启动中… http://localhost:$PORT"
  python3 -m http.server "$PORT" >/dev/null 2>&1 &
fi

# 探活：等服务真的能响应，再打开浏览器（最多等 10 秒）
URL="http://localhost:$PORT/index.html"
for _ in $(seq 1 50); do
  if curl -s -o /dev/null -m 1 "$URL"; then break; fi
  sleep 0.2
done

open "$URL"
echo "已打开：$URL"
echo "（关闭此窗口不会停止服务；如需停止：lsof -nP -iTCP:$PORT -sTCP:LISTEN -t | xargs kill）"
