# 360 纳米 Work 行业 AI 工作台 · AI 开发规范体系

> 本文档是阶段四（纳米Work行业工作台）的开发标准总纲。项目系统名称：**360 纳米 Work 行业 AI 工作台**（仓库代号 `ai-work-platform`）。这是一个前后端分离的 monorepo，由三个可独立部署的服务组成，以「多租户权限底座 + 通用任务调度/消息推送引擎」为核心。AI 原生开发——用 Claude Code 写代码，用一套可执行的规范体系约束 AI 产出，保证 AI 写的代码也符合团队规范。所有 FDE 照此开发，做出来的东西能互相接手、能复制到下个行业。

## 〇、三个服务（先认清家底）

平台不是单个后端，是三个能各自部署的服务，靠 `docker-compose.yml` 编排、nginx 反代分流。

| 服务 | 目录 | 端口 | 技术栈 | 说明 |
|---|---|---|---|---|
| **API** | `saas-lobster-api` | 8100 | Python 3.11 · FastAPI · SQLAlchemy 2.0(async) · Pydantic 2 | 后端主服务，多租户管理底座 |
| **Scheduler** | `saas-lobster-scheduler` | 8101 | Python 3.11 · FastAPI · APScheduler | 独立定时任务调度中心，跟主服务解耦 |
| **Frontend** | `saas-lobster-vben` | 80（compose 映射 8080） | Vue 3 · TS · Vite · Element Plus（Vben Admin 5） | Web 管理后台，nginx 托管 |

- **调度独立**：定时任务由独立的 Scheduler 承担，API 主服务**不内置调度器**。Scheduler 启动时自动扫 `scripts/` 目录，把脚本注册成可调度任务，以子进程执行，跑完通过钉钉/企微/飞书/邮件等通道推结果。
- **数据库与 Redis 是外部实例**，不由 compose 启动。Redis 分区：API 用 DB 10，Scheduler 用 DB 11。
- **配置中心优先**：LLM、S3、图床等配置优先从数据库配置中心加载，`.env` 仅作兜底。

## 一、体系概览：三层机制约束 AI

这不是一份供人翻阅的文档，而是三层自动生效的机制——AI 写的代码也被强制拉回规范。

| 层 | 载体 | 作用 | 何时生效 |
|---|---|---|---|
| **① 铁律** | `CLAUDE.md`（根目录） | AI 编码红线、强制 Skill 路由、Git/验证铁律 | 每次会话自动加载 |
| **② 规范库** | `.claude/skills/` | 分场景编码规范 + 代码生成器（api-\* 32 + vben-\* 32 + 流程类） | 按任务匹配触发 |
| **③ 门禁** | `.claude/hooks/redline-guard.py` | 写文件后自动静态检查红线，命中即反馈 AI 修正 | 每次写文件后 |

门禁层具体由这几个 hook / 脚本落地，从软引导到硬拦截层层收口：

| 载体 | 强度 | 触发时机 |
|---|---|---|
| `.claude/hooks/skill-router.py` | 软引导 | 每次发开发类指令，提醒先加载对应 Skill |
| `.claude/hooks/redline-guard.py` | 硬拦截 | 每次写文件后，命中红线即反馈修正 |
| `scripts/pre-commit.sh` + `.github/workflows/ci-gate.yml` | 硬拦截 | 提交 / PR，lint + 测试不过不让合 |

> AI 编码工作流（不可跳步）：**Skill 匹配 → 规范记忆 → TDD（红-绿-重构）→ 完工验证 → 人工 Review → 人工合并**。

## 二、统一技术栈（锁死，不许自由发挥）

| 层 | 必须用 | 禁止 |
|---|---|---|
| 后端框架 | Python + FastAPI | Django、Flask、裸写 |
| 后端 ORM | SQLAlchemy 2.0（async）+ Pydantic 2 | 同步 ORM、手拼 SQL |
| 后端规范 | ruff（line-length=120, py311）、loguru 日志、async-first | print 日志、同步阻塞 IO |
| 前端框架 | Vue 3 + `<script setup>` + Composition API | Options API、Vue 2 |
| 前端语言 | TypeScript（strict） | 裸 JS、`any` 泛滥 |
| 前端 UI | Vben Admin 5（`@vben/web-ele`） | Element Plus 魔改、Ant Design、Naive UI 混用 |
| 前端构建/状态/路由 | Vite 5 / Pinia / Vue Router 4 | webpack、Vuex、全局变量、手写 hash 跳转 |
| 前端 HTTP | `@vben/request` 封装的 axios | 页面里直接 `axios.create`、`fetch` |
| 图表 | ECharts | Chart.js / AntV / D3 混用 |

**为什么锁死**：统一技术栈，一个 FDE 做的东西另一个能无痛接手，换行业也能直接复制。技术栈一乱，复制就无从谈起。

## 三、后端红线（saas-lobster-api）

必须遵守，违反被 hook 自动拦截：

1. 每个 `.py` 文件首行必须是 `from __future__ import annotations`
2. `api/` 层禁止写 SQL / ORM 查询（`db.execute` / `select(...)` / `.query(...)`），必须下沉到 `services/`
3. 禁止同步 ORM：`db.query(...)` → 必须 `await db.execute(...)`
4. 业务代码禁止 `os.getenv()`，必须走 `core/config.py` 的 Settings
5. `services/` 层有 ORM 查询时，必须带 `hospital_id` 过滤（多租户隔离）
6. 禁止裸 `print(...)`，必须用 logging
7. 全量类型注解（函数签名 + 返回值）

**分层规则（严格单向，禁止反向/循环依赖）：**

```
api/ → services/ → managers/（可选）→ db/
schemas/  Pydantic DTO（被 api/services 引用）
core/     基础设施：deps/auth/redis/llm/s3/config（叶子层，不依赖业务）
middleware/  横切面（洋葱模型，外→内）
```

- `api/`：HTTP 入口、参数校验、鉴权、响应组装（薄）
- `services/`：事务编排、跨表逻辑、调外部（LLM/S3/Redis）
- `managers/`：复杂实体生命周期管理（可选）
- `db/`：ORM 模型 + 会话 + 引擎
- `core/` 是叶子层，不依赖任何业务层；`db/models` 禁止导入 `schemas/`（ORM 与 DTO 单向）

**中间件（洋葱模型，外→内执行）：**

```
CORS → TenantContext（注入租户上下文）→ SystemAudit（系统审计）→ APILogger（接口日志）
```

多租户隔离靠 `TenantContextMiddleware` 注入租户上下文，业务表通过 `TenantScopedMixin` 打租户字段（`hospital_id`）。

**命名约定：**

| 类型 | 路径 | 示例 |
|---|---|---|
| 路由 | `api/<entities>.py` | `api/products.py` |
| 业务 | `services/<entity>_service.py` | `services/product_service.py` |
| 模型 | `db/models.py` 内 `<Entity>Model` | `ProductModel` |
| DTO | `schemas/<entity>.py` | `schemas/product.py` |
| 测试 | `tests/test_<entities>.py` | `tests/test_products.py` |

**接口契约：**

- 列表接口统一返回 `{"items": [...], "total": N}`
- 错误统一 `raise HTTPException(status_code, detail="中文说明")`
- 单对象直接返回，不加 Result 包装层

## 四、前端红线（saas-lobster-vben）

必须遵守，违反被 hook 自动拦截：

1. 只能改 `apps/web-ele/src/`，禁止改 `packages/@vben/*` / `@core/*`
2. 网络请求必须用 `requestClient`（`@vben/request`），禁止 `import axios` / `fetch`
3. 只用 `<script setup>` Composition API，禁止 Options API（`data`/`methods`/`computed`）
4. `: any` 超过 1 处即返工，必须补全类型
5. 颜色必须引用 Theme Token，禁止硬编码 `#RRGGBB`
6. 字号只允许 12/14/16/18/20/24/32/48px
7. 文案必须用 `$t()`（国际化）
8. 类型定义放 `src/types/api/<module>.ts`

**目录结构：**

```
apps/web-ele/src/
├── views/        页面（按模块分组）
├── api/          接口封装（requestClient）
├── router/       静态路由（routes/modules/<module>.ts）
├── store/        Pinia 状态
├── composables/  可复用 hooks
├── components/   通用业务组件
└── types/api/    TS 类型定义
```

## 五、Skill 路由（开发前必须先加载对应 Skill）

| 任务类型 | 必须加载的 Skill |
|---|---|
| 前端任何开发 | `vben-guide` |
| 后端任何开发 | `api-guide` |
| 数据建模 | `api-er-modeling` |
| 标准 CRUD 模块 | `api-template-standard-crud-module` + `vben-crud-generator` |
| SSE 流式接口 | `api-template-sse-streaming-module` + `vben-chat-stream-generator` |
| 后台任务 | `api-template-background-job-module` |
| 报表导出 | `api-template-report-generation-module` |
| 修复 Bug | `systematic-debugging`（禁止猜修） |
| 完工验证 | `verification-before-completion` |
| 分支收尾 | `finishing-a-development-branch` |

## 六、开发工作流（不可跳步）

```
1. 匹配 Skill → 2. 加载规范 → 3. TDD（红-绿-重构）
→ 4. 完工验证 → 5. 人工 Review → 6. 人工合并
```

**TDD 三步：**

- RED：先写失败的测试
- GREEN：最小实现让测试通过
- REFACTOR：重构保持绿

**两步交付节奏（别一口气憋大的）：**

| 步骤 | 干什么 | 目的 |
|---|---|---|
| 第一步：还原 demo | 核心流程能跑通、关键页面能点能看 | 拿去给代理商/客户演示，验证方向对不对 |
| 第二步：补齐完整 | 基于反馈把剩下的页面、接口、业务规则全落地 | 直到整个系统能真正上线用 |

## 七、完工前强制验证（未过不得声称"完成"）

```bash
# 后端
cd saas-lobster-api && ruff check . && ruff format --check .
cd saas-lobster-api && pytest -q

# 前端
cd saas-lobster-vben && pnpm lint
cd saas-lobster-vben && pnpm check:type
```

**额外检查清单：**

- 改了表结构 → 生成并人工复核 Alembic 迁移
- 加了接口 → 在 `http://localhost:8100/docs` 确认可调
- 涉及多租户 → 验证跨 `hospital_id` 数据不可见

## 八、数据模型与权限底座

数据表按前缀分类：`sys_*`（系统）、`busi_*`（业务）、`log_*`（日志）。

| 分类 | 数据表 | 说明 |
|---|---|---|
| 系统 | `sys_users` / `sys_roles` / `sys_menus` | 用户 / 角色 / 菜单 |
| 系统 | `sys_role_menus` / `sys_user_roles` / `sys_role_hospitals` | RBAC 关系表（角色-菜单 / 用户-角色 / 角色-租户） |
| 系统 | `sys_settings` / `sys_cron_jobs` | 用户设置 / 定时任务配置 |
| 业务 | `busi_hospitals` / `busi_departments` | 租户 / 部门 |
| 日志 | `log_login` / `log_system_audit` / `log_mcp_queries` | 登录日志 / 系统审计 / LLM 查询日志 |

**RBAC 链路**：用户 →（`sys_user_roles`）→ 角色 →（`sys_role_menus`）→ 菜单；租户维度再经 `sys_role_hospitals` 隔离。用户/角色/菜单/部门/租户五要素 + 三张绑定表，构成完整权限体系。

**后端菜单模式**：菜单树由数据库 `sys_menus` 下发，前端不硬编码。登录后前端调 `/api/auth/me` 拿到当前用户可见菜单，动态渲染侧边栏。新功能要可见，得两步——① 开发者注册静态路由（`router/routes/modules/<module>.ts`）；② 管理员在「菜单管理 + 角色授权」后台配置。

> 库里另有 `busi_dispatch_*`、`busi_report_*` 等历史遗留表，来自早期业务模块，当前功能已不依赖，别照着它们建新表。

## 九、发布与访问（CI/CD）

线上发布走 **极库云流水线 → 360 智汇云容器云**，不用本地 `docker compose`。

极库云（项目：商业化 FDE 作战项目 → 流水线）为三个服务各配了一条流水线，点「运行」一键发布：

| 流水线 ID | 名称 | 对应服务 |
|---|---|---|
| 22530 | `ai-work-platform-api` | 后端主服务 |
| 22531 | `ai-work-platform-scheduler` | 调度服务 |
| 22532 | `ai-work-platform-frontend` | 前端 |

每条流水线 3 个串行任务全绿即发布成功：`代码源 → 构建容器云镜像 → 容器云发布`。发布后进「360 智汇云 → 容器云 CIS → 工作负载」看三个 Deployment（api/scheduler/frontend）的 Pod 状态、日志、监控。

**nginx 反代规则**（前端容器内分流）：`/api/scheduling/` → `scheduler:8101`；`/api/` → `api:8100`；其余 → 前端 SPA。

## 十、Git 规范

**分支命名：**

| 前缀 | 用途 |
|---|---|
| `feat/` | 新功能 |
| `fix/` | 缺陷修复 |
| `refactor/` | 重构 |
| `docs/` | 文档 |

**Commit 格式（Conventional Commits）：**

```
<type>(<scope>): <中文描述>
# 示例：feat(user): 用户列表支持 Excel 导出
```

**铁律：**

- AI 禁止 `git merge` 到 master
- AI 禁止 `git push --force` 到 master
- 合并一律人工操作，必须经过 Code Review

## 十一、新成员上手

```bash
# 1. 安装本地 pre-commit 门禁（一次性）
bash scripts/install-hooks.sh

# 2. 阅读规范入口
# README.md → "AI 开发规范体系" 章节
# CLAUDE.md → 完整铁律
# docs/DEV-STANDARDS.md → 完整规范总纲
```

## 十二、重要命名说明

多租户字段全平台统一使用 `hospital_id`（历史命名，语义即 `tenant_id`）。禁止改名，所有业务查询必须带此字段过滤。
