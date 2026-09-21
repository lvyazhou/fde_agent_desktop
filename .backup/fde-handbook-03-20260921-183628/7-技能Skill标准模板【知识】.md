# 技能（Skill）规范

## 一、Skill 设计原则

| 原则 | 说明 |
|---|---|
| 单一职责 | 一个 Skill 只干一件事，不搞大杂烩 |
| 有错误处理 | 必须有错误路径和最小样例 |
| 命名规范 | 按功能命名，如"招标文件解析skill"、"素材检索skill" |
| 可复用 | 优先使用平台标准 Skill（64 个 = api-* 32 + vben-* 32），减少自研成本 |

## 二、Skill 开发步骤

| 步骤 | 内容 |
|---|---|
| 步骤一：定义职责 | 明确这个 Skill 干什么、单一职责 |
| 步骤二：定义输入输出 | 输入参数、输出格式、异常返回值 |
| 步骤三：编写核心逻辑 | 使用 Python/Go 实现核心功能 |
| 步骤四：编写单元测试 | 覆盖正常路径、边界情况、异常情况 |
| 步骤五：编写使用文档 | YAML Front Matter + Markdown 文档 |
| 步骤六：性能测试 | 响应时间 ≤3秒（简单调用），≤10秒（复杂计算） |

## 三、Skill 清单模板

| Skill 名称 | 所属智能体 | 干什么 | 单一职责？ | 有错误处理？ | 状态 |
|---|---|---|---|---|---|
| 招标文件解析skill | 招投标智能体 | 解析招标 PDF/Word，提取结构化要求 | 是 | 是 | 已上线 |
| 素材检索skill | 招投标智能体 | 从知识库检索匹配的资质/案例 | 是 | 是 | 已上线 |

## 四、Markdown 文档编写规范

每个 Skill 必须有一个完整的 Markdown 文档，包含 YAML Front Matter 和标准章节：

```yaml
name: "biddocument-parser"
description: "解析招标文件（PDF/Word），提取评分点、资格要求、废标项。支持自动OCR、智能分类、结构化输出。"
version: 1.2.0
```

## 五、完整示例：招标文件解析 Skill

```python
class BidDocumentParser:
    """招标文件解析Skill"""

    def parse(self, file_path: str) -> dict:
        """
        解析招标文件
        Args:
            file_path: 文件路径
        Returns:
            {
                "success": bool,
                "data": {
                    "scoring_points": [...],
                    "qualification_req": [...],
                    "disqualification_items": [...]
                }
            }
        """
        try:
            # 解析逻辑
            return {"success": True, "data": {...}}
        except Exception as e:
            return {"success": False, "error": str(e)}
```

## 六、验收标准

| 检查项 | 达标标准 |
|---|---|
| 单一职责 | 一个 Skill 只干一件事 |
| 有错误处理 | 异常情况有兜底策略 |
| 有单元测试 | 覆盖正常/边界/异常三种情况 |
| 有文档 | 使用说明、调用示例、错误码 |
| 性能达标 | 响应时间符合要求 |
