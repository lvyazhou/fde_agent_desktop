# Hermes Agent Windows 适配修复记录

> 📅 2026-06-02 | 修复 hermes-agent 在 Windows 环境下的路径兼容问题

---

## 问题背景

Hermes Agent 是用 Python 编写的 AI 执行引擎，通过 ACP 协议与沧澜 AgentOS 桌面端通信。该引擎在 Linux/Mac 上工作正常，但在 Windows 上存在路径格式不兼容的问题。

### 典型报错

```
[WARNING] agent.tool_executor: Tool read_file returned error:
  File not found: /c/Users/lvyaz/.product-lobster/worldcup_2026_bracket.html
```

```
[WARNING] agent.tool_executor: Tool terminal returned error:
  unexpected EOF while looking for matching `'`
```

---

## 根因分析

### 路径格式冲突

Windows 上 hermes 使用 Git Bash 作为 shell 执行器。Git Bash 内部使用 MSYS 路径格式：

| 格式 | 示例 |
|------|------|
| Windows 原生 | `C:\Users\lvyaz\.product-lobster\file.html` |
| MSYS/Git Bash | `/c/Users/lvyaz/.product-lobster/file.html` |

AI 在 Git Bash 中执行 `pwd` 或获取路径时，拿到的是 MSYS 格式。当它把这种路径传给 `read_file`/`write_file` 工具时，Python 的 `pathlib.Path` 在 Windows 上无法正确解析 `/c/Users/...` 格式（虽然以 `/` 开头看起来像绝对路径，但 Windows 的 `Path.resolve()` 不认识 `/c/` 这种挂载点写法），导致文件找不到。

### 已有的适配（terminal 工具）

hermes 的 `tools/environments/local.py` 已经有了 MSYS 路径转换函数 `_msys_to_windows_path()`，用于 terminal 工具的 cwd 设置。但 `file_tools.py`（负责 `read_file`、`write_file`、`search` 等工具）**没有调用这个转换**，这是路径报错的直接原因。

---

## 修复内容

### 文件：`hermes-agent/tools/file_tools.py`

#### 改动 1：新增 import

```python
# 在文件顶部 import 区域新增
import platform
import re
```

#### 改动 2：新增 MSYS 路径转换函数

```python
_IS_WINDOWS = platform.system() == "Windows"


def _msys_to_windows_path(filepath: str) -> str:
    """Convert MSYS/Git Bash paths like /c/Users/x to C:\\Users\\x on Windows.
    No-op on non-Windows or non-MSYS paths."""
    if not _IS_WINDOWS or not filepath:
        return filepath
    m = re.match(r'^/([a-zA-Z])(/.*)?$', filepath)
    if not m:
        return filepath
    drive = m.group(1).upper()
    tail = (m.group(2) or "").replace('/', '\\')
    return f"{drive}:{tail or chr(92)}"
```

**逻辑说明**：
- 只在 Windows 上生效，其他平台直接返回原路径
- 匹配 `/c/...` 或 `/d/...` 格式（单字母盘符 + `/`）
- 将 `/c/Users/lvyaz` 转换为 `C:\Users\lvyaz`
- 已经是 Windows 格式的路径不受影响（幂等）

#### 改动 3：在路径解析入口加入转换

```python
def _resolve_path_for_task(filepath: str, task_id: str = "default") -> Path:
    """Resolve *filepath* against the task's absolute base directory.

    On Windows, MSYS/Git Bash paths (/c/Users/...) are converted to native
    Windows paths (C:\\Users\\...) before resolution.
    """
    filepath = _msys_to_windows_path(filepath)  # ← 新增这一行
    p = Path(filepath).expanduser()
    if p.is_absolute():
        return p.resolve()
    return (_resolve_base_dir(task_id) / p).resolve()
```

**影响范围**：所有通过 `_resolve_path_for_task` 解析路径的工具都会受益，包括：
- `read_file` — 读取文件
- `write_file` — 写入文件
- `patch_replace` — 文件局部替换
- `search` — 文件搜索
- `list_directory` — 列出目录

---

## 已有的 Windows 适配（参考）

hermes-agent 在其他模块已经做了大量 Windows 适配，本次修复是补齐 file_tools 这个缺口：

| 模块 | 文件 | Windows 适配情况 |
|------|------|-----------------|
| Terminal 工具 | `tools/environments/local.py` | ✅ MSYS 路径转换、Git Bash 查找、Popen flags、进程 kill |
| 文件操作底层 | `tools/file_operations.py` | ✅ CRLF/BOM 处理、stdin pipe 修复、Windows 盘符 regex |
| 进程管理 | `tools/process_registry.py` | ✅ taskkill、winpty、creationflags |
| Agent 提示 | `agent/prompt_builder.py` | ✅ Windows shell hint 告知 AI 用 POSIX 语法 |
| ACP 会话 | `acp_adapter/session.py` | ✅ WSL 路径转换 |
| **文件工具** | **`tools/file_tools.py`** | **⚠️ 本次修复 — 补加 MSYS 路径转换** |

---

## 其他已知 Windows 问题（待后续处理）

| 问题 | 文件 | 说明 |
|------|------|------|
| Cron 调度器硬编码 `/bin/bash` | `cron/scheduler.py:917` | 应改为调用 `_find_bash()` |
| Gateway 硬编码 `/bin/sh` | `gateway/run.py:4059` | 应改为 Windows 感知的 shell 查找 |
| 缺少 Windows 敏感路径保护 | `tools/file_tools.py:235-239` | 只防了 Unix 路径（`/etc/`, `/boot/`），没防 `C:\Windows\System32` 等 |
| AI 生成命令引号不匹配 | N/A | LLM 输出问题，非代码 bug，可通过 prompt 提示缓解 |

---

## 验证方式

1. 重启 hermes-acp 进程（在沧澜 AgentOS 设置页点"重启引擎"）
2. 发送一个需要读写文件的请求（如"帮我生成一个 HTML 页面"）
3. 确认：
   - AI 生成文件后能成功读取（不再报 File not found）
   - 路径中的 `/c/Users/...` 被正确转换为 `C:\Users\...`
   - 查看 hermes stderr 日志中不再出现路径相关的 WARNING

---

## 修复生效条件

此修复修改的是 `hermes-agent` 源码。生效方式取决于部署模式：

- **开发模式**（直接运行 `.venv` 中的 hermes）：修改立即生效，重启进程即可
- **打包模式**（PyInstaller 构建的 `hermes-acp.exe`）：需要重新执行 `npm run build:hermes` 打包
