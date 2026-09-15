#!/bin/bash
# 双击启动原型：起本地静态服务并打开浏览器（macOS）
cd "$(dirname "$0")"
PORT=8770
echo "美迪康经营驾驶舱原型 · 启动中… http://localhost:$PORT"
( sleep 1; open "http://localhost:$PORT/index.html" ) &
python3 -m http.server $PORT
