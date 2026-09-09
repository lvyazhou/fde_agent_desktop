#!/bin/bash
#
# 在 Mac 上把 hermes 引擎+网关跑起来,供局域网内的手机 APK 连接。
# ============================================================
# 用法:  bash mobile-engine/start-gateway-mac.sh
#
# 前提:这台 Mac 上桌面版能正常用(即 ~/.hermes 配置齐全、引擎二进制已构建)。
# 手机和 Mac 连同一个 WiFi,然后在 APK 里填下面打印出来的"局域网地址 + token"。

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 1. 找到桌面版在用的引擎二进制(PyInstaller 产物,macOS 原生,直接能跑)
ENGINE="$ROOT/../hermes-agent/dist/hermes-acp/hermes-acp"
if [ ! -f "$ENGINE" ]; then
  # 退而求其次:venv 里的
  ENGINE="$HOME/.hermes/hermes-agent/.venv/bin/hermes-acp"
fi
if [ ! -f "$ENGINE" ]; then
  echo "❌ 找不到 hermes 引擎二进制。请确认桌面版能正常运行(它会构建/自带引擎)。"
  exit 1
fi

# 2. 局域网 IP(手机要连这个)
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")
PORT="${HERMES_GATEWAY_PORT:-43918}"

# 3. 起网关:绑 0.0.0.0 让手机能连,用真引擎
export HERMES_ACP_BIN="$ENGINE"
export HERMES_HOME="$HOME/.hermes"
export HERMES_GATEWAY_HOST="0.0.0.0"
export HERMES_GATEWAY_PORT="$PORT"

echo "============================================================"
echo "  启动网关中... 引擎: $ENGINE"
echo "============================================================"

# 后台起,拿到 token 后打印连接信息
node "$ROOT/mobile-engine/gateway/server.js" &
GWPID=$!
sleep 3
TOKEN=$(cat "$HOME/.hermes/gateway-token" 2>/dev/null)

echo ""
echo "============================================================"
echo "  ✓ 网关已启动!在手机 APK 里填入:"
echo ""
echo "    服务器地址(host):  $LAN_IP"
echo "    端口(port):        $PORT"
echo "    令牌(token):       $TOKEN"
echo ""
echo "  要求:手机和这台 Mac 连同一个 WiFi。"
echo "  停止:按 Ctrl+C。"
echo "============================================================"

# 前台等待,Ctrl+C 时一起收掉
trap "kill $GWPID 2>/dev/null; echo '网关已停止'; exit 0" INT TERM
wait $GWPID
