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
  },
  {
    id: 5,
    name: '工作周报',
    desc: '按季度新建文件,按周竖排。',
    icon: 'fa-solid fa-calendar-week',
    cadence: '按季建文件 · 按周竖排',
  },
  {
    id: 6,
    name: '相关材料',
    desc: '包含录音、客户的资料、我们调研的竞品材料。',
    icon: 'fa-solid fa-folder-open',
    tags: ['客户录音', '客户资料', '竞品调研材料'],
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
