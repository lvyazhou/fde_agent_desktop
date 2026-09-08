#!/data/data/com.termux/files/usr/bin/bash
#
# FDE产设大师 · 安卓引擎一键安装脚本 (Termux)
# ============================================
# 在手机的 Termux 里跑这个脚本,把 hermes-acp 引擎 + 本地网关装好并拉起。
# 之后 APK 里的界面就能连本机 127.0.0.1 上的网关工作。
#
# 用法(在 Termux 里):
#   pkg install wget -y
#   wget <你放脚本的地址>/install-termux.sh
#   bash install-termux.sh
#
# 前置:从 F-Droid 安装 Termux(不要用 Play 商店的旧版,装不了新包)。
#
# 模型说明:引擎(agent 逻辑)跑在手机本地,模型推理走远程 API,
# 所以需要联网,并在 ~/.hermes/config.yaml 里填好 API Key。

set -e

# ---- 可配置项 ----
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
HERMES_SRC="$HERMES_HOME/hermes-agent"
GATEWAY_DIR="$HERMES_HOME/gateway"
# hermes 源码地址:优先用本地已有副本,否则从官方仓库拉
HERMES_REPO="${HERMES_REPO:-https://github.com/NousResearch/hermes-agent.git}"
GATEWAY_PORT="${HERMES_GATEWAY_PORT:-43918}"

log()  { printf '\033[1;36m[install]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; }

# ---- 0. 基本环境检查 ----
if [ -z "$PREFIX" ] || [ ! -d "/data/data/com.termux" ]; then
  err "这个脚本要在 Termux 里运行(检测不到 Termux 环境)。"
  err "请从 F-Droid 安装 Termux 后,在 Termux 里执行本脚本。"
  exit 1
fi

log "HERMES_HOME = $HERMES_HOME"
log "网关端口     = $GATEWAY_PORT"

# ---- 1. 系统包 ----
# rust/binutils/openssl: 编译 pydantic-core、httpx 等带原生扩展的依赖时需要
# 官方 termux 路径要求这些,详见 hermes README 的 Termux 指南
log "更新并安装系统包(python nodejs git rust ...)..."
pkg update -y
pkg install -y python nodejs git rust binutils openssl libjpeg-turbo libxml2 libxslt clang make

# Termux 上 pydantic-core/cryptography 走 rust 编译,需指明链接器
export CARGO_BUILD_TARGET="$(rustc -vV | sed -n 's/host: //p')"
export RUSTFLAGS="-C link-arg=-Wl,-rpath,$PREFIX/lib"

# ---- 2. 拉 hermes 源码 ----
if [ -d "$HERMES_SRC/.git" ]; then
  log "已存在 hermes 源码,拉取更新..."
  git -C "$HERMES_SRC" pull --ff-only || warn "git pull 失败,用现有代码继续"
elif [ -d "$HERMES_SRC" ] && [ -f "$HERMES_SRC/pyproject.toml" ]; then
  log "已存在 hermes 源码(非 git),直接使用。"
else
  log "克隆 hermes 源码到 $HERMES_SRC ..."
  mkdir -p "$HERMES_HOME"
  git clone --depth 1 "$HERMES_REPO" "$HERMES_SRC"
fi

# ---- 3. 建 venv 并装引擎 ----
# 关键:装 [termux,acp] —— termux extra 保证安卓兼容依赖,acp extra 提供 hermes-acp
cd "$HERMES_SRC"
if [ ! -d ".venv" ]; then
  log "创建 Python venv..."
  python -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

log "升级 pip 并安装 hermes-agent[termux,acp] (首次编译原生依赖较慢,请耐心)..."
pip install --upgrade pip wheel setuptools
if [ -f "constraints-termux.txt" ]; then
  pip install -e '.[termux,acp]' -c constraints-termux.txt
else
  warn "未找到 constraints-termux.txt,不加约束安装(可能遇到不兼容 wheel)。"
  pip install -e '.[termux,acp]'
fi

# ---- 4. 生成 .env 和 config.yaml 模板(若不存在) ----
if [ ! -f "$HERMES_HOME/.env" ]; then
  log "生成 .env 模板(记得填 API Key)..."
  cat > "$HERMES_HOME/.env" <<'EOF'
# hermes 引擎环境变量
# OPENAI_API_KEY 用于 OpenAI 兼容网关(360 / OpenAI 官方 / DeepSeek 等)
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://api.360.cn/v1
EOF
fi

if [ ! -f "$HERMES_HOME/config.yaml" ]; then
  log "生成 config.yaml 模板..."
  cat > "$HERMES_HOME/config.yaml" <<'EOF'
# hermes 引擎配置(安卓/Termux)
# agent 逻辑跑在本机,模型推理走下面配置的远程 API。
model:
  provider: custom
  default: anthropic/claude-sonnet-5
  base_url: https://api.360.cn/v1

auxiliary:
  vision:
    provider: custom
    model: anthropic/claude-sonnet-5
    timeout: 120
    download_timeout: 60

custom_providers:
  - name: "360ai"
    base_url: https://api.360.cn/v1
    key_env: OPENAI_API_KEY
    api_key: your-api-key-here
    models:
      - anthropic/claude-opus-4.8
      - anthropic/claude-sonnet-5
      - anthropic/claude-haiku-4.5
      - deepseek/deepseek-v4-pro
      - openai/gpt-5.5

providers: {}
fallback_providers: []
EOF
fi

# ---- 5. 装网关 ----
# 网关零 npm 依赖(只用 Node 内置模块),把 server.js + acp-client.js 放到 GATEWAY_DIR。
log "部署本地网关到 $GATEWAY_DIR ..."
mkdir -p "$GATEWAY_DIR"
# 脚本同目录下的 gateway/ 会被一起下发;若单独下载脚本,则从源码副本或提示手动放置
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/gateway/server.js" ]; then
  cp "$SCRIPT_DIR/gateway/server.js" "$SCRIPT_DIR/gateway/acp-client.js" "$SCRIPT_DIR/gateway/package.json" "$GATEWAY_DIR/"
else
  warn "未在脚本目录找到 gateway/,请手动把 mobile-engine/gateway/ 下的三个文件放到 $GATEWAY_DIR/"
fi

# ---- 6. 自检:hermes-acp --check ----
log "自检引擎: hermes-acp --check ..."
if hermes-acp --check; then
  log "✓ 引擎自检通过"
else
  err "引擎自检失败,请回看上面的报错。常见原因:原生依赖编译失败(rust/clang 缺失)。"
  exit 1
fi

# ---- 7. 生成启动脚本 ----
cat > "$HERMES_HOME/start-gateway.sh" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
# 拉起本地网关(会自动 spawn hermes-acp)。让 Termux 保持后台运行(termux-wake-lock)。
export HERMES_HOME="$HERMES_HOME"
export HERMES_GATEWAY_PORT="$GATEWAY_PORT"
export PATH="$HERMES_SRC/.venv/bin:\$PATH"
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock || true
cd "$GATEWAY_DIR"
exec node server.js
EOF
chmod +x "$HERMES_HOME/start-gateway.sh"

log "============================================"
log "✓ 安装完成!"
log ""
log "下一步:"
log "  1) 编辑 $HERMES_HOME/.env 和 $HERMES_HOME/config.yaml,填入你的 API Key"
log "  2) 启动网关:  bash $HERMES_HOME/start-gateway.sh"
log "  3) 在 APK 里连接 127.0.0.1:$GATEWAY_PORT (token 见 $HERMES_HOME/gateway-token)"
log "============================================"
