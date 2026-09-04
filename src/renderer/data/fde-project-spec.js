/**
 * FDE 项目规范 — 极库云项目管理制度(单一数据源)
 *
 * 内容取自极库云《五阶段项目管理规范》文档。与 fde-stages.js(进场作战链)不同,
 * 这里承载的是**项目管理制度**:产出物归档方式、需求管理与迭代规划、产品复制模式。
 * 工作台「项目规范」详情页(ProjectSpec.vue)从这里读取渲染。
 *
 * 极库云文档:https://geelib.qihoo.net/geelib/knowledge/doc?spaceId=4632&docId=442814
 */

import { getStage } from './fde-stages';

/** 环节1/2 的交付物直接复用作战链阶段②③的 deliverables,保持与作战链一致 */
const stage2Deliverables = getStage(2)?.deliverables || []; // 需求沟通+原型设计
const stage3Deliverables = getStage(3)?.deliverables || []; // 需求确认+智能体设计

/** 一、五阶段项目管理 — 每个环节的产出物 / 归档制度 */
export const FIVE_STAGE_MGMT = [
  {
    id: 1,
    name: '需求沟通 + 原型设计',
    desc: '结构化挖需求、当场确认,输出可交互原型收敛需求。',
    icon: 'fa-solid fa-comments',
    deliverables: stage2Deliverables, // PRD / 可交互原型 / 对接确认表 / AI能力清单
  },
  {
    id: 2,
    name: '需求确认 + 智能体设计',
    desc: '需求签字定死,拆智能体矩阵逐个设计。',
    icon: 'fa-solid fa-diagram-project',
    deliverables: stage3Deliverables, // 需求确认表 / 智能体矩阵 / 定稿PRD / 定稿原型 等
  },
  {
    id: 3,
    name: '产品实施计划说明书',
    desc: '定位到产品复制模式,由 FDE 项目经理和交付共同完成。',
    icon: 'fa-solid fa-file-contract',
    // HIS 厂商标品交付 SOP 举例
    example: {
      title: '举例:HIS 厂商 · 标品交付 SOP',
      steps: ['账号开通', '数据治理', '智能体调试', '平台调试', '客户试用'],
    },
  },
  {
    id: 4,
    name: '工作日报',
    desc: '按月来新建文件,按天竖排。',
    icon: 'fa-solid fa-calendar-day',
    cadence: '按月建文件 · 按天竖排',
    // TODO(模板内容待用户提供后替换):日报按天竖排,一个文件写一个月,新的一天追加在最上面
    template: {
      title: '工作日报模板',
      subtitle: '按月建文件 · 按天竖排(最新在上)',
      filename: '2025-09 工作日报.md',
      // 文件名示例:2025-09 工作日报.md
      content: `# 2025-09 工作日报

> 说明:一个月一个文件,按天竖排,**最新的一天写在最上面**。

---

## 2025-09-04(周四)

**今日完成**
- [项目A] 完成需求沟通,输出对接确认表
- [项目B] 智能体调试,通过 Eval 3/5

**遇到的问题**
- [项目B] 数据口径与客户不一致,待确认

**明日计划**
- [项目B] 与客户对齐数据口径
- [项目A] 启动原型设计

---

## 2025-09-03(周三)

**今日完成**
- …

**遇到的问题**
- …

**明日计划**
- …
`,
    },
  },
  {
    id: 5,
    name: '工作周报',
    desc: '按季度新建文件,按周竖排。',
    icon: 'fa-solid fa-calendar-week',
    cadence: '按季建文件 · 按周竖排',
    // TODO(模板内容待用户提供后替换)
    template: {
      title: '工作周报模板',
      subtitle: '按季建文件 · 按周竖排(最新在上)',
      filename: '2025-Q3 工作周报.md',
      // 文件名示例:2025-Q3 工作周报.md
      content: `# 2025-Q3 工作周报

> 说明:一个季度一个文件,按周竖排,**最新的一周写在最上面**。

---

## 第 36 周(09-01 ~ 09-07)

**本周进展**
- [项目A] 需求沟通完成,进入原型设计
- [项目B] 智能体矩阵设计过半

**关键指标 / 里程碑**
- …

**风险 / 阻塞**
- …

**下周计划**
- …
`,
    },
  },
  {
    id: 6,
    name: '会议纪要',
    desc: '按项目/主题归档,记录会议决议、待办与责任人。',
    icon: 'fa-solid fa-file-lines',
    cadence: '按会议记录 · 决议+待办',
    // TODO(模板内容待用户提供后替换)
    template: {
      title: '会议纪要模板',
      subtitle: '按项目/主题归档 · 决议+待办',
      filename: '会议纪要-{主题}-2025-09-04.md',
      content: `# 会议纪要 · {会议主题}

- **时间**:2025-09-04 14:00–15:00
- **地点 / 会议室**:线上腾讯会议
- **参会人**:张三、李四、王五
- **主持人**:张三
- **记录人**:王五

## 一、会议议题
1. …
2. …

## 二、会议决议
1. …
2. …

## 三、待办事项(Action Items)
| 事项 | 责任人 | 截止时间 | 状态 |
| --- | --- | --- | --- |
| … | 李四 | 2025-09-08 | 待办 |
| … | 王五 | 2025-09-06 | 进行中 |

## 四、遗留 / 下次讨论
- …
`,
    },
  },
  {
    id: 7,
    name: '相关材料',
    desc: '包含录音、客户的资料、我们调研的竞品材料。',
    icon: 'fa-solid fa-folder-open',
    tags: ['客户录音', '客户资料', '竞品调研材料'],
    // TODO(模板内容待用户提供后替换):相关材料是归档目录结构约定,非文档模板
    template: {
      title: '相关材料归档结构',
      subtitle: '录音 / 客户资料 / 竞品调研材料',
      filename: '相关材料/',
      content: `# 相关材料归档结构

> 说明:按材料类型分目录归档,文件名带日期与来源,方便检索。

\`\`\`
相关材料/
├── 客户录音/
│   └── 2025-09-04 客户需求沟通会.m4a
├── 客户资料/
│   ├── 客户提供的业务流程说明.pdf
│   └── 客户现有系统截图/
└── 竞品调研材料/
    ├── 竞品A 功能对比.xlsx
    └── 竞品B 产品文档.pdf
\`\`\`

**归档规范**
- 文件名格式:\`日期 + 来源/主题 + 类型\`
- 录音同步转写文字稿,与录音同目录存放
- 客户敏感资料注意脱敏与权限控制
`,
    },
  },
];

/** 二、项目需求管理 — 角色分工 + 迭代版本规划 + 主动跟进 */
export const REQUIREMENT_MGMT = {
  intro: '做需求的管理和进度的把控,面向 FDE 项目经理和 FDE 交付工程师。',
  roles: [
    {
      name: 'FDE 项目经理',
      duty: '负责迭代版本的规划,以及需求、任务的创建。',
      icon: 'fa-solid fa-user-tie',
    },
    {
      name: 'FDE 交付工程师',
      duty: '根据产品需求进行任务拆解,在迭代版本时间范围内完成,每天定期更新需求任务。',
      icon: 'fa-solid fa-user-gear',
    },
  ],
  // 需求拆解 → 规划迭代版本(以医疗质量风险管理为例)
  example: {
    title: '举例:医疗质量风险管理',
    desc: '将用户最终 10 个需求逐步拆解,规划到 3 个迭代版本中。',
    iterations: [
      { version: 'v1.0.0', priority: 'P0', label: '医疗质量分析管理 · 必须' },
      { version: 'v1.0.1', priority: 'P1', label: '医疗质量分析管理 · 重要' },
      { version: 'v1.0.2', priority: 'P2', label: '医疗质量分析管理 · 可选' },
    ],
  },
  // 主动跟进:每天看交付任务执行情况,或拉专项群定期同步
  followUp: {
    desc: '每天看 FDE 交付工程师任务执行情况,或拉专项群定期同步进度。看两处成果:',
    sources: [
      { name: '纳米work · 医疗行业工作台', watch: '看需求成果', host: 'aimed.mss.360.net' },
      { name: 'seaf 智能体平台', watch: '看智能体编排成果', host: 'FDE 项目经理和交付一起完成' },
    ],
  },
};

/** 三、产品复制模式 — 标品 vs 定制化 */
export const REPLICATION_MODES = [
  {
    key: 'standard',
    name: '标品管理模式',
    icon: 'fa-solid fa-cubes',
    accent: 'blue',
    points: [
      '有一份标品实施部署说明书,由 FDE 项目经理和交付共同完成。',
      '在极酷云创建需求,规划到迭代版本中(如 7 天),并进行项目跟进。',
    ],
  },
  {
    key: 'custom',
    name: '定制化管理模式',
    icon: 'fa-solid fa-screwdriver-wrench',
    accent: 'indigo',
    points: [
      '新增需求(共性、通用性功能):可做。',
      '完全定制:评估工作量及预算,再决定要不要做。',
      '以上定制化都需重新走 FDE 五阶段工作流程,从需求到交付。',
    ],
  },
];

/** 相关外链 — 极库云资源(系统默认浏览器打开) */
export const GEELIB_LINKS = [
  {
    title: '极库云 · 五阶段项目管理规范',
    desc: '五阶段项目管理、需求管理、产品复制模式完整文档',
    url: 'https://geelib.qihoo.net/geelib/knowledge/doc?spaceId=4632&docId=442814',
    icon: 'fa-solid fa-book',
  },
  {
    title: '极库云 · 需求管理看板',
    desc: '需求拆解、迭代版本规划与进度把控',
    url: 'https://geelib.qihoo.net/geelib/project/projectOverview?subId=7175',
    icon: 'fa-solid fa-list-check',
  },
];
