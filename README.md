# FDE产设大师

FDE 项目经理的五阶段作战工作台(Electron 桌面端)。把行业智能体产品从客户一句话做到落地上线,五个阶段一条链,每阶段的输出即交付物、一环扣一环流转。内置知识库/话术/交付物模板、FDE 教练陪练、以及首启环境向导与离线授权。

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

## 主要功能

- **FDE 工作台门户**(首页):平台介绍 + 五阶段路由;点进任一阶段查看其规范/知识库/交付物,md 直接内嵌渲染,Word(docx)构建时经 mammoth 转 html 快照内嵌预览,并保留「用 Word 打开 / 下载原件」。
- **FDE 教练陪练**(`fde-coach` 技能):AI 扮演甲方客户,陪项目经理演练 SPIN + 七维挖需求;输入「复盘」按六维打分表点评。工作台阶段①一键进入。
- **首启向导**(`/setup`):软件授权 → 环境自检 → 配置并验证 LLM Key → 进入。未就绪项会拦在向导,避免"装完跑不起来"。
- **离线授权**:机器指纹绑定 + Ed25519 验签 + 三阶段过期。顶栏显示客户名与有效期。签发端见 `../license-toolkit/`。

## 技术栈

- **桌面壳**: Electron 41
- **前端**: Vue 3 + Tailwind CSS v4 + Vite 8
- **AI 引擎**: Hermes Agent (通过 ACP 协议 JSON-RPC over stdio)
- **技能**: product-feature-spec / prototype-generator / prototype-iterate / fde-coach
- **授权**: Node 原生 crypto(AES-256-GCM + Ed25519),零第三方加密依赖

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

# 2. 确保 hermes-agent 已安装(需要 Python 3.11+),开发模式在同级 hermes-agent 建好 .venv
pip install hermes-agent[acp]

# 3. 启动开发服务器
npm run dev
```

> API Key **无需手动改 .env**:首次启动进 `/setup` 向导,填入 Key 并「测试连接」验证通过后自动写入 `~/.product-lobster/.env`。
> 若需先生成授权:见下方「授权签发」,否则向导授权步无法通过。

## 知识库快照生成

内置知识库在 `fde-handbook/`(各阶段规范/知识/交付物)。docx 在构建时转成 html 快照供内嵌预览:

```bash
node scripts/build-handbook-manifest.js   # 扫描 fde-handbook/,转 docx→html,生成 manifest.json
```

原始文档更新后重跑此脚本。

## 授权签发

签发工具在同级 `../license-toolkit/`(独立目录,不打包进 app):

```bash
cd ../license-toolkit
node gen-keys.js                 # 一次性:生成密钥,公钥+aes.key 自动拷入 app
node server.js                   # 本地网页签发器 http://127.0.0.1:41787(推荐)
# 或命令行:
node issue.js --sn SN-xxx --customer "客户名" --type permanent
```

客户在应用授权页复制机器码 → 报给你 → 你签发 `.lic` → 客户导入激活。私钥只在 `license-toolkit/keys/`,绝不入包/入库。

## 构建

```bash
npm run build:mac        # macOS DMG(引擎产物已存在时)
npm run build:win        # Windows 便携包
npm run build:mac-full   # 先跨平台重建 hermes-acp 引擎,再打 mac 包
node scripts/build-hermes.js   # 单独跨平台重建引擎(PyInstaller)
```

> 打包前须先 `cd ../license-toolkit && node gen-keys.js` 生成正式密钥(否则授权无法验签)。

## 项目结构

```
product-lobster-desktop/
├── src/
│   ├── main/                # Electron 主进程
│   │   ├── index.js         # 窗口/ACP 生命周期/IPC(hermes/handbook/env/license)
│   │   ├── acp-client.js    # ACP JSON-RPC 客户端
│   │   └── license/         # 离线授权(fingerprint/crypto/verifier/store + keys/)
│   ├── preload/             # contextBridge 安全隔离
│   └── renderer/            # Vue 3 前端
│       ├── pages/
│       │   ├── workbench/    # FDE 工作台门户 + 阶段详情
│       │   ├── setup/        # 首启向导(授权/自检/配 key)
│       │   ├── projects/     # 智能对话 + 项目管理
│       │   └── settings/     # 设置
│       ├── components/workbench/  # StageDetail / DocViewer 等
│       └── data/fde-stages.js     # 五阶段元数据(单一数据源)
├── skills/                  # 内置 AI 技能(随包打包)
│   ├── product-feature-spec/  prototype-generator/  prototype-iterate/
│   └── fde-coach/           # FDE 教练陪练
├── fde-handbook/            # 内置知识库/交付物(md + docx + html 快照 + manifest.json)
└── scripts/
    ├── build-handbook-manifest.js  # 知识库快照 + manifest 生成
    ├── build-hermes.js             # 跨平台构建 hermes-acp
    └── spike-acp.js                # ACP 连通性验证
```

## 数据存储

所有数据存在 `~/.product-lobster/`:
- `projects/<slug>/` — 每个项目一个目录
- `skills/` — 运行时技能目录(启动同步)
- `fde-handbook/` — 知识库副本(启动同步)
- `license/` — `license.lic` + 加密 `license.meta.json`
- `config.yaml` — Hermes Agent 配置
- `.env` — API keys(向导写入)
- `state.db` — 会话历史(SQLite,Hermes 自动管理)
