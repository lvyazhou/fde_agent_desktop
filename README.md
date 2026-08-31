# Product Lobster Desktop

AI 驱动的产品设计助手桌面客户端。输入一句话需求，自动生成功能清单和可点击 HTML 原型。

## 技术栈

- **桌面壳**: Electron 41
- **前端**: Vue 3 + Tailwind CSS v4 + Vite 8
- **AI 引擎**: Hermes Agent (通过 ACP 协议 JSON-RPC over stdio)
- **技能**: product-feature-spec / prototype-generator / prototype-iterate

## 核心流程

```
一句话需求 → /product-feature-spec → 功能清单 .md
功能清单 → /prototype-generator → HTML 原型
自然语言修改 → /prototype-iterate → 增量更新原型
```

## 开发

```bash
# 1. 安装前端依赖
npm install

# 2. 确保 hermes-agent 已安装（需要 Python 3.11+）
pip install hermes-agent[acp]

# 3. 配置 API key
# 在 ~/.product-lobster/.env 中设置你的 LLM provider key
# 例如: OPENROUTER_API_KEY=sk-...

# 4. 启动开发服务器
npm run dev
```

## 验证 ACP 连通性

```bash
node scripts/spike-acp.js
```

## 构建

```bash
# Windows 便携包
npm run build:win

# macOS DMG
npm run build:mac
```

## 项目结构

```
product-lobster-desktop/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.js    # 窗口管理 + ACP 生命周期 + IPC
│   │   └── acp-client.js  # ACP JSON-RPC 客户端
│   ├── preload/        # contextBridge 安全隔离
│   └── renderer/       # Vue 3 前端
│       ├── pages/
│       │   ├── projects/   # 项目管理页面
│       │   └── settings/   # 设置页面
│       └── components/
├── skills/             # 内置 AI 技能（随包打包）
│   ├── product-feature-spec/
│   ├── prototype-generator/
│   └── prototype-iterate/
└── scripts/
    └── spike-acp.js    # ACP 连通性验证脚本
```

## 数据存储

所有数据存在 `~/.product-lobster/`:
- `projects/<slug>/` — 每个项目一个目录
- `skills/` — 运行时技能目录
- `config.yaml` — Hermes Agent 配置
- `.env` — API keys
- `state.db` — 会话历史（SQLite，Hermes 自动管理）

# fde_agent_desktop
