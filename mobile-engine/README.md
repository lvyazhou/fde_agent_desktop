# FDE产设大师 · 安卓版

把桌面版(Electron)搬到安卓的方案与工程。核心思路见项目根 `/Users/qihoo/.claude/plans/reflective-greeting-gadget.md`。

## 架构

```
Vue 前端(Capacitor WebView, APK 内)
        │  HTTP /rpc  +  SSE /events
        ▼
本地网关 gateway/server.js (Termux 内, 127.0.0.1:43918)
        │  stdio JSON-RPC (ACP)
        ▼
hermes-acp 引擎 (Termux 内 Python, agent 逻辑本地跑)
        │  https
        ▼
远程模型 API (config.yaml 配 key, 需联网)
```

- **界面**:复用桌面版同一套 Vue 代码,零改动。差别只在接入层——桌面走 Electron IPC(`window.api` by preload),安卓走 `src/renderer/platform/bridge.js`(HTTP/SSE 连网关),两者暴露完全相同的 `window.api`。
- **引擎**:hermes 官方支持 Android/Termux(`.[termux,acp]`)。agent 逻辑在手机本地,模型推理走远程。

## 目录

| 路径 | 作用 |
|---|---|
| `mobile-engine/install-termux.sh` | 手机端一键安装脚本:装系统包+引擎+网关,自检,生成启动脚本 |
| `mobile-engine/gateway/server.js` | stdio→HTTP/SSE 网关(零 npm 依赖) |
| `mobile-engine/gateway/acp-client.js` | 复用自桌面版 `src/main/acp-client.js` 的 stdio JSON-RPC 客户端 |
| `src/renderer/platform/bridge.js` | 前端安卓接入层,重造 invoke/send/on 走网关 |
| `capacitor.config.js` | Capacitor 打包配置 |

## 手机端(引擎 + 网关)

1. 从 **F-Droid** 安装 Termux(不要用 Play 商店旧版)。
2. 把 `mobile-engine/` 目录传到手机(或 `git clone` 后 cd 进去)。
3. 在 Termux 里:
   ```bash
   bash install-termux.sh
   ```
   首次会编译 pydantic-core 等原生依赖(需 rust,较慢)。
4. 编辑 `~/.hermes/.env` 和 `~/.hermes/config.yaml` 填 API Key。
5. 启动网关:
   ```bash
   bash ~/.hermes/start-gateway.sh
   ```
   记下打印出的 token(也在 `~/.hermes/gateway-token`)。

### 分步验证(排障用)

```bash
# 引擎自检
hermes-acp --check                 # 期望: Hermes ACP check OK

# 网关存活
curl http://127.0.0.1:43918/health # 期望: {"ok":true,"hermesRunning":true,...}

# 发一次 initialize
curl -XPOST http://127.0.0.1:43918/rpc \
  -H "X-Gateway-Token: <你的token>" \
  -H "Content-Type: application/json" \
  -d '{"method":"initialize","params":{}}'
```

## 出 APK(需 Android SDK + JDK + Gradle)

在开发机(macOS,装了 Android Studio):

```bash
# 一次性:装 Capacitor
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/android

# 初始化(首次;会读 capacitor.config.js)
npx cap init "FDE产设大师" com.prodesigner.android --web-dir dist/renderer
npx cap add android

# 每次改前端后
npm run build:renderer
npx cap sync android

# 出 APK
npx cap open android          # Android Studio 里 Build > Build APK
# 或命令行:
cd android && ./gradlew assembleDebug
```

APK 装到手机后:

1. 先在 Termux 跑起网关(见上)。
2. 打开 APP → 设置里填网关地址 `127.0.0.1:43918` 和 token。
3. 新建会话 → 发消息 → 应收到远程模型回复(agent 在本机跑)。

## 已知限制 / TODO

- **License**:桌面机器指纹方案不适用安卓,MVP 阶段 `bridge.js` 里 `license.*` 直接返回跳过。上线前需重定安卓授权策略。
- **窗口控制/shell 打开路径**:安卓无对应概念,`window.*`/`shell.openPath` 为 no-op。
- **附件/文件选择**:P1,`saveAttachment`/文件选择在安卓需接 Capacitor 的 Filesystem/FilePicker 插件(当前走网关的文件接口,依赖 Termux 侧路径)。
- **后台保活**:Termux 需 `termux-wake-lock`(启动脚本已带)+ 系统电池优化白名单,否则引擎可能被杀。
- **首次配对**:token 目前需手动从 Termux 复制到 APP。后续可做二维码/深链配对。
