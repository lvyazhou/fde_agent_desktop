# FDE产设大师

FDE 项目经理的五阶段作战工作台(Electron 桌面端)。把行业智能体产品从客户一句话做到落地上线,五个阶段一条链,每阶段的输出即交付物、一环扣一环流转。

## 五阶段作战链

```
①调研备弹 → ②需求沟通+原型 → ③需求确认+智能体设计 → ④纳米Work工作台上线 → ⑤客户试用定稿 → 沉淀复制
```

| 阶段 | 输入 | 输出交付物 |
|---|---|---|
| ① 调研备弹 | 客户线索/资料 | 备弹知识/话术卡(内化,无交付物) |
| ② 需求沟通+原型 | ⬅备弹 | 对接确认表 + AI能力清单 + PRD三层 + 可交互原型 |
| ③ 需求确认+智能体 | ⬅对接确认表+原型清单 | 需求确认表 + 智能体矩阵 + 定稿版PRD/原型 |
| ④ 纳米Work工作台 | ⬅六字段功能清单+智能体矩阵 | ER模型 + demo + 完整工作台系统 + 部署文档 |
| ⑤ 客户试用+优化 | ⬅完整系统 | 反馈跟踪表 + 三轮迭代记录 + 定稿产品 + 可复制模板 |

> 核心接缝:阶段②功能清单须满足**六字段红线**(功能名称/所属页面/功能描述/优先级/关联智能体/数据依赖),缺「关联智能体」或「数据依赖」阶段四实现岗有权打回。

## 技术栈

- **桌面壳**: Electron 41
- **前端**: Vue 3 + Tailwind CSS v4 + Vite 8
- **AI 引擎**: Hermes Agent (通过 ACP 协议 JSON-RPC over stdio)
- **技能**: product-feature-spec / prototype-generator / prototype-iterate

## 阶段②核心流程(当前落地能力)

```
需求/对接确认表 → /product-feature-spec → 功能清单 .md(六字段)
功能清单 → /prototype-generator → 可交互 HTML 原型
自然语言修改 → /prototype-iterate → 增量迭代原型(收敛→定稿)
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
