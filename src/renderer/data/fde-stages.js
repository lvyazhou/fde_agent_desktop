/**
 * FDE 五阶段作战链 — 阶段元数据(单一数据源)
 *
 * 内容取自《商业化 FDE 作战手册》五阶段规范。工作台的阶段时间线、
 * 每阶段要素卡、输入/输出交付物区都从这里读取。
 *
 * 交付物流转铁律:每个阶段的「输出」正好是下一阶段的「输入」。
 */

export const FDE_STAGES = [
  {
    id: 1,
    key: 'research',
    name: '调研准备 + 备弹知识',
    short: '调研备弹',
    goal: '进场前把弹备足——行业政策/术语/痛点/对标案例装进脑子,调研框架和话术练到条件反射。',
    // 阶段一是纯知识内化,无交付物
    inputs: ['客户线索', '拓客经验', '客户方资料'],
    deliverables: [], // 无交付物(备弹知识/调研SOP/话术卡=内化)
    internalize: ['备弹知识库', '调研框架 SOP(六项框架)', '调研话术卡(破冰/SPIN/七维串)'],
    owner: 'FDE 项目经理',
    duration: '进场前准备',
    successCriteria: '客户说行业术语能接上话;六项框架背熟;话术练到不看卡能走一遍。',
    aiSupport: '备弹知识库 / 话术卡 / 六项框架 查阅 + AI 辅助备弹',
  },
  {
    id: 2,
    key: 'requirement-prototype',
    name: '需求沟通 + 原型设计',
    short: '沟通·原型',
    goal: '结构化挖需求、当场确认,出对接确认表 + AI能力清单,喂智能体出可交互原型收敛需求。',
    inputs: ['备弹知识', '调研 SOP'],
    deliverables: [
      { key: 'contact-form', name: '需求与数据对接确认表(含组织关系)', form: 'docx', sign: '群确认(等同签字)' },
      { key: 'ai-capability', name: 'AI需求能力清单', form: 'docx', note: '每条带效果指标+验收口径' },
      { key: 'prd', name: 'PRD(三层:目标/功能/交互,收敛稿)', form: 'md' },
      { key: 'prototype', name: '可交互原型(收敛稿)', form: 'html', note: '能看能点,收敛需求用' },
    ],
    owner: 'FDE 项目经理 + 业务科室',
    duration: '2+1 主场(按"次"算:2次对接 + 1次确认出原型),约一天一轮',
    successCriteria: '组织关系摸清、需求逐轮聊透、AI能力量化可验收、原型能点、方向认可。',
    aiSupport: '核心阶段:结构化拆解 → PRD三层 → 信息架构 → 六区块 → 可交互原型(约3小时/版)',
    rhythm: '2+1(数"次",需求大则 (2+1)×n)',
    isCore: true,
  },
  {
    id: 3,
    key: 'confirm-agent',
    name: '需求确认 + 智能体设计',
    short: '需求确认·智能体',
    goal: '需求签字定死,拆智能体矩阵逐个设计过 Eval;PRD+原型升级为定稿版。',
    inputs: ['对接确认表', '原型功能清单(收敛稿)'],
    deliverables: [
      { key: 'final-req', name: '需求最终确认表', form: 'docx', sign: '客户签字定死' },
      { key: 'task-plan', name: '项目任务计划表', form: 'docx' },
      { key: 'acceptance', name: '项目验收标准表', form: 'docx' },
      { key: 'data-metric', name: '业务数据口径模版', form: 'md', note: '每个指标的计数/去重/过滤/优先级口径定死,阶段④建模阶段⑤验收对账依据' },
      { key: 'agent-matrix', name: '智能体矩阵 + 各智能体设计表', form: 'doc', note: '身份卡/五层拆解/六组件' },
      { key: 'prd-final', name: '定稿版 PRD', form: 'md', note: '需求签字后升级' },
      { key: 'prototype-final', name: '最终产品原型(定稿)', form: 'html', note: '需求签字后升级' },
    ],
    owner: 'FDE 项目经理 + FDE交付工程师',
    duration: '2+1 的"1":签字定稿',
    successCriteria: '需求签字定死;智能体矩阵端到端能跑、准确率达标;PRD/原型定稿。',
    aiSupport: '表单 + AI 辅助拆解 + PRD/原型定稿迭代(prototype-iterate);矩阵设计主要人工',
    rhythm: '2+1 的"1"',
  },
  {
    id: 4,
    key: 'nano-workbench',
    name: '纳米Work 行业工作台',
    short: '工作台上线',
    goal: '建模、搭前后端、部署,做成客户能访问、能用的行业工作台。',
    inputs: ['功能清单(六字段)', '智能体矩阵', '真实数据样本'],
    deliverables: [
      { key: 'er-model', name: 'ER 数据模型图', form: 'system' },
      { key: 'demo-system', name: 'demo 版系统', form: 'system' },
      { key: 'full-system', name: '完整前后端工作台系统', form: 'system', note: '交付物是系统本身,非文档' },
      { key: 'progress', name: '项目进度表', form: 'docx' },
      { key: 'deploy-doc', name: '部署文档', form: 'md' },
    ],
    owner: 'AI 编程 / FDE交付工程师',
    duration: '3/7/14 交付版本(两线齐备起算:小3/中7/大14天)',
    successCriteria: '技术栈合规、能访问、鉴权通、真实数据通、过门禁、demo先行、有部署文档。',
    aiSupport: '64 个平台标准 skill(api-* 32 + vben-* 32)+ AI 编程工具,不从零手写',
    rhythm: '3/7/14(算"天")',
  },
  {
    id: 5,
    key: 'trial-optimize',
    name: '客户试用 + 智能体优化',
    short: '试用·定稿',
    goal: '代理商试跑、三轮定稿、客户交付签字,沉淀可复制行业模板。',
    inputs: ['能跑的行业工作台系统', '客户试用渠道'],
    deliverables: [
      { key: 'feedback', name: '客户反馈跟踪表', form: 'docx' },
      { key: 'iteration', name: '三轮迭代记录表', form: 'docx' },
      { key: 'usage-watch', name: '使用率盯防表(30/60/90天)', form: 'docx' },
      { key: 'delivery-sign', name: '项目交付签字表', form: 'docx', sign: '五要素总签字' },
      { key: 'final-product', name: '定稿产品', form: 'system' },
      { key: 'reusable-template', name: '可复制行业模板', form: 'template' },
    ],
    owner: 'FDE项目经理 + 客户(试用方)',
    duration: '2–4 周 / 三轮迭代',
    successCriteria: '试用满意度高、问题闭环、智能体准确率达标。',
    aiSupport: '表单管理 + AI 辅助反馈分类 / Trace 全链路追踪',
    rhythm: '三轮定稿(看大方向→抠细节→定死)',
  },
];

/** 功能清单六字段红线(阶段②产出 → 阶段④验收,缺一不可) */
export const FEATURE_LIST_REDLINE_FIELDS = [
  { key: 'id', name: '功能名称', desc: '唯一识别,如 工作台-001' },
  { key: 'page', name: '所属页面', desc: '对应原型的哪个页面' },
  { key: 'desc', name: '功能描述', desc: '一句话说清"用户做什么"' },
  { key: 'priority', name: '优先级', desc: 'P0 必须 / P1 重要 / P2 可选' },
  { key: 'agent', name: '关联智能体', desc: '对应阶段三的哪个智能体(红线)' },
  { key: 'data', name: '数据依赖', desc: '需要哪些数据表/字段(红线)' },
];

/** 项目推进节奏(两条线 + 三档) */
export const FDE_RHYTHM = {
  parallelLines: {
    demand: '需求主线(对业务科室,阶段①~⑤)',
    environment: '环境地基线(对信息科:网络 / VPN / 部署基础服务)',
  },
  cadence: {
    '2+1': '需求侧节奏:一轮=2次对接+1次签字出原型(阶段②③,数"次")',
    '3/7/14': '交付节奏:签字+环境就绪后,小3/中7/大14天(阶段④,算"天")',
  },
  overtime: '任一线被甲方卡住(尤其签不了字)=加时赛:先发邮件告知 → 暂停计时、单独记。',
};

/** 默认新建项目落在的阶段(用户确认:阶段②,过渡友好) */
export const DEFAULT_STAGE = 2;

export function getStage(id) {
  return FDE_STAGES.find((s) => s.id === id) || null;
}

/**
 * 交付物文件名(不含扩展名)→ 展示元数据。
 * 后端扫描 stageN/ 目录只知道文件名,列表页/详情页用这张表把文件名翻成
 * 中文名 + 图标 + 简称。key 用磁盘上的实际 basename(与详情页 STAGEx_DELIVERABLES 的 file 对齐)。
 */
export const DELIVERABLE_META = {
  // 阶段②
  'contact-form':   { name: '需求与数据对接确认表', short: '对接确认表', icon: 'fa-solid fa-file-signature' },
  'ai-capability':  { name: 'AI 需求能力清单',      short: 'AI能力清单', icon: 'fa-solid fa-list-check' },
  'prd':            { name: '产品需求文档 PRD',      short: 'PRD',       icon: 'fa-solid fa-file-lines' },
  // 阶段③
  'final-req':      { name: '需求最终确认表',        short: '需求确认表', icon: 'fa-solid fa-file-circle-check' },
  'agent-design':   { name: '智能体设计表',          short: '智能体设计', icon: 'fa-solid fa-diagram-project' },
  'agent-matrix':   { name: '智能体矩阵',            short: '智能体矩阵', icon: 'fa-solid fa-table-cells' },
  'task-plan':      { name: '项目任务计划表',        short: '任务计划',   icon: 'fa-solid fa-list-ol' },
  'acceptance':     { name: '项目验收标准表',        short: '验收标准',   icon: 'fa-solid fa-clipboard-check' },
  'data-metric':    { name: '业务数据口径模版',      short: '数据口径',   icon: 'fa-solid fa-ruler-combined' },
  // 阶段④
  'er-model':       { name: 'ER 数据模型图',         short: 'ER模型',    icon: 'fa-solid fa-sitemap' },
  'deploy-doc':     { name: '部署文档',              short: '部署文档',   icon: 'fa-solid fa-server' },
  'progress':       { name: '项目进度表',            short: '进度表',     icon: 'fa-solid fa-bars-progress' },
  // 阶段⑤
  'feedback':       { name: '客户反馈跟踪表',        short: '反馈跟踪',   icon: 'fa-solid fa-comment-dots' },
  'iteration':      { name: '三轮迭代记录表',        short: '迭代记录',   icon: 'fa-solid fa-rotate' },
  'usage-watch':    { name: '使用率盯防表',          short: '使用率',     icon: 'fa-solid fa-chart-line' },
  'delivery-sign':  { name: '项目交付签字表',        short: '交付签字',   icon: 'fa-solid fa-file-signature' },
};

/** 按文件 basename 取交付物展示元数据;未登记的文件回退用文件名本身 */
export function getDeliverableMeta(base) {
  return DELIVERABLE_META[base] || { name: base, short: base, icon: 'fa-solid fa-file' };
}
