# ACP Session Update 事件协议文档

## 概述

Product Lobster Desktop 通过 Hermes ACP（Agent Client Protocol）协议与 AI 引擎通信。
主进程 (`main/index.js`) 收到 hermes 的 JSON-RPC 通知后，转发给 renderer 进程处理。

## 数据流

```
hermes-acp (Python)  →  main/index.js (Electron)  →  renderer (Vue)
      stdout JSON-RPC        ipc "hermes:session-update"     handleSessionUpdate()
```

### 主进程转发格式

```js
// main/index.js - acp.onNotification 回调
mainWindow.webContents.send('hermes:session-update', {
  method: notification.method,        // 固定为 "session/update"
  sessionId: params.sessionId,
  update: { sessionUpdate: "...", ... }  // ← 核心事件对象
});
```

### Renderer 解析方式

```js
// AgentHome.vue - handleSessionUpdate(data)
const update = data?.update || data;
const type = update.sessionUpdate;  // ← 事件类型从这里取！不是 type 字段
```

## 事件类型清单（sessionUpdate 字段值）

| sessionUpdate 值 | 含义 | 关键字段 |
|---|---|---|
| `agent_thought_chunk` | AI 推理/思考过程 | `content: [{type:"text", text:"..."}]` |
| `agent_message_chunk` | AI 回复正文块 | `content: [{type:"text", text:"..."}]` |
| `tool_call` | 工具调用开始 | `title`: 工具名, `status`: "in_progress" |
| `tool_call_update` | 工具调用进度/完成 | `title`: 工具名, `status`: "completed"\|"failed", `rawOutput` |
| `usage_update` | Token 使用统计 | `inputTokens`, `outputTokens` |
| `plan` | 执行计划更新 | `entries: [{content, status}]` |
| `session_info_update` | 会话元信息 | `title`: 会话标题, `model`: 当前模型 |
| `available_commands_update` | 可用斜杠命令 | `commands: [...]` |
| `user_message_chunk` | 用户消息块（不常用） | `content: [...]` |
| `current_mode_update` | 模式切换 | - |
| `config_option_update` | 配置选项变更 | - |

## 重要注意事项

### 1. 字段命名是 camelCase

ACP 协议 JSON 用 camelCase 别名：
- `sessionUpdate` (不是 `session_update`)
- `sessionId` (不是 `session_id`)
- `toolCallId` (不是 `tool_call_id`)
- `rawInput` / `rawOutput`
- `inputTokens` / `outputTokens`

### 2. content 是数组，不是字符串

`agent_message_chunk` 和 `agent_thought_chunk` 的 `content` 字段是内容块数组：
```json
{
  "sessionUpdate": "agent_message_chunk",
  "content": [
    { "type": "text", "text": "实际文本内容" }
  ]
}
```

解析时需要：
```js
let text = '';
if (Array.isArray(content)) {
  text = content.map(c => c.text || '').join('');
} else if (typeof content === 'string') {
  text = content;
}
```

### 3. 工具调用是两段式

- **开始**: `sessionUpdate: "tool_call"`, `status: "in_progress"`, `title: "write_file"`
- **完成**: `sessionUpdate: "tool_call_update"`, `status: "completed"|"failed"`, `title: "write_file"`

**不是** `tool_call_start` / `tool_call_end`！之前用错了这两个名字导致日志一直为空。

### 4. 没有显式的 "stream end" 事件

ACP 协议没有发送 `agent_message_end` 或 `session_end`。
流结束的判断靠**超时**（`scheduleStreamEnd` 用 15 秒无新事件则判定结束）。

### 5. ToolCallStatus 枚举值

```
"pending" | "in_progress" | "completed" | "failed"
```

## 调试技巧

renderer 里有 console.log 输出每个事件：
```js
console.log('[AgentHome] session-update:', type, JSON.stringify(data).slice(0, 200));
```

在 Electron DevTools (Ctrl+Shift+I) 的 Console 中可以看到所有事件流经。

## 来源

- ACP 协议库: `hermes-agent/.venv/Lib/site-packages/acp/schema.py`
- Hermes 事件发射: `hermes-agent/acp_adapter/events.py`, `acp_adapter/server.py`
- 前端处理: `src/renderer/pages/projects/AgentHome.vue` → `handleSessionUpdate()`
