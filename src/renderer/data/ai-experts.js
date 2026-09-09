/**
 * AI 专家广场 —— 内置专家定义 + 分类 + prompt 构建
 */

export const expertCategories = [
  { id: 'all',        name: '全部专家',   icon: 'layer-group',         color: '#64748b' },
  { id: 'creative',   name: '内容创意',   icon: 'wand-magic-sparkles', color: '#2563eb' },
  { id: 'growth',     name: '增长获客',   icon: 'chart-line',          color: '#0ea5e9' },
  { id: 'operations', name: '交易运营',   icon: 'clipboard-check',     color: '#1d4ed8' },
  { id: 'enterprise', name: '企业服务',   icon: 'building',            color: '#0369a1' },
];

export const aiExperts = [
  // ── 内容创意 ──
  {
    id: 'image-generation',
    name: 'AI 图像生成专家',
    category: 'creative',
    icon: 'image',
    color: '#2563eb',
    tagline: '商品图、海报、配图、视觉风格一次说清',
    summary: '把业务目标转成可直接用于生图模型的高质量提示词，并给出构图、风格、镜头、尺寸和迭代建议。',
    bestFor: ['营销海报', '商品主图', '公众号配图', '品牌视觉'],
    starters: [
      '帮我设计一张新品发布海报的生图提示词',
      '把这个产品卖点转成电商主图方案',
      '给我 3 套不同风格的品牌视觉方向',
    ],
    sessionName: 'AI 图像生成专家',
    slugPrefix: 'expert-image',
    displayOpening: '启动 AI 图像生成专家',
    capabilities: `- 将业务需求转为中英文生图提示词\n- 推荐构图、风格关键词、负面提示词\n- 指定渠道尺寸(电商主图/海报/公众号/社媒)\n- 迭代方向建议`,
  },
  {
    id: 'video-generation',
    name: 'AI 视频生成专家',
    category: 'creative',
    icon: 'film',
    color: '#3b82f6',
    tagline: '短视频脚本、分镜、旁白、视频提示词一站搞定',
    summary: '从营销目标出发，输出完整的短视频脚本、分镜表、旁白、视频生成提示词和发布建议。',
    bestFor: ['产品宣传片', '短视频带货', '品牌故事', '教程演示'],
    starters: [
      '帮我写一个 30 秒产品宣传短视频脚本',
      '把这个卖点拆成 5 条短视频分镜',
      '生成一条适合抖音的带货视频提示词',
    ],
    sessionName: 'AI 视频生成专家',
    slugPrefix: 'expert-video',
    displayOpening: '启动 AI 视频生成专家',
    capabilities: `- 从营销目标出发拆解视频脚本\n- 输出分镜表(画面描述+镜头语言+时长)\n- 撰写旁白/字幕\n- 生成视频生成模型提示词\n- 素材需求清单 + 发布平台建议`,
  },

  // ── 增长获客 ──
  {
    id: 'lead-acquisition',
    name: '获客线索专家',
    category: 'growth',
    icon: 'bullseye',
    color: '#0ea5e9',
    tagline: '目标客群、获客渠道、触达话术、跟进节奏全链路',
    summary: '帮助梳理目标客户画像，推荐获客渠道和触达策略，输出线索筛选字段和跟进 SOP。',
    bestFor: ['B2B 获客', '线索清洗', '渠道评估', '冷启动拓客'],
    starters: [
      '帮我梳理目标客户画像和获客渠道',
      '我有一批线索，帮我设计筛选和跟进 SOP',
      '为我的新产品设计冷启动获客方案',
    ],
    sessionName: '获客线索专家',
    slugPrefix: 'expert-lead',
    displayOpening: '启动获客线索专家',
    capabilities: `- 目标客户画像分析\n- 获客渠道推荐与评估\n- 触达话术/邮件/私信模板\n- 线索筛选字段与评分模型\n- 跟进节奏与转化指标`,
  },
  {
    id: 'sales-script',
    name: '销售话术专家',
    category: 'growth',
    icon: 'comments-dollar',
    color: '#06b6d4',
    tagline: '销售开场白、异议处理、逼单话术、复盘',
    summary: '根据产品特点和客户类型，输出完整销售话术手册，包括开场白、SPIN 提问、异议处理和逼单策略。',
    bestFor: ['电话销售', '面销话术', '异议处理', '成交逼单'],
    starters: [
      '帮我写一套电话销售开场白',
      '客户说"太贵了"怎么回应？',
      '用 SPIN 法帮我设计需求挖掘问题',
    ],
    sessionName: '销售话术专家',
    slugPrefix: 'expert-sales',
    displayOpening: '启动销售话术专家',
    capabilities: `- 销售开场白和自我介绍模板\n- SPIN/FABE/BANT 需求挖掘话术\n- 常见异议处理话术\n- 逼单策略与时机判断\n- 销售复盘与改进建议`,
  },

  // ── 交易运营 ──
  {
    id: 'customer-orders',
    name: '客户订单专家',
    category: 'operations',
    icon: 'box-open',
    color: '#1d4ed8',
    tagline: '订单状态、交付异常、客户沟通、售后 SOP',
    summary: '帮助梳理订单全生命周期管理，处理交付异常、客户投诉和售后场景，输出 SOP 和话术模板。',
    bestFor: ['订单管理', '交付跟踪', '售后处理', '客诉应对'],
    starters: [
      '帮我梳理订单从下单到交付的完整 SOP',
      '客户投诉发货延迟，帮我写安抚话术',
      '设计一套退换货处理流程',
    ],
    sessionName: '客户订单专家',
    slugPrefix: 'expert-orders',
    displayOpening: '启动客户订单专家',
    capabilities: `- 订单全生命周期梳理\n- 交付异常处理 SOP\n- 客户沟通话术模板\n- 退换货/售后流程设计\n- 优先级判断与风险提醒`,
  },
  {
    id: 'operation-analysis',
    name: '经营分析专家',
    category: 'operations',
    icon: 'chart-pie',
    color: '#4f46e5',
    tagline: '经营指标、数据看板、归因分析、决策建议',
    summary: '帮助搭建经营分析框架，梳理核心指标，设计数据看板，并给出归因分析和优化建议。',
    bestFor: ['月度经营分析', '指标体系设计', '数据看板', '归因分析'],
    starters: [
      '帮我设计一套电商核心指标体系',
      '上月 GMV 下降 15%，帮我做归因分析框架',
      '给我设计一个运营日报/周报模板',
    ],
    sessionName: '经营分析专家',
    slugPrefix: 'expert-analysis',
    displayOpening: '启动经营分析专家',
    capabilities: `- 经营指标体系搭建(GMV/利润/流量/转化/复购…)\n- 数据看板设计\n- 下钻归因分析框架\n- 趋势预警与优化建议\n- 报告模板输出`,
  },

  // ── 企业服务 ──
  {
    id: 'contract-review',
    name: '合同审查专家',
    category: 'enterprise',
    icon: 'file-contract',
    color: '#0369a1',
    tagline: '风险条款识别、缺失条款提醒、修订建议',
    summary: '辅助识别合同中的风险条款、缺失条款和模糊义务，给出修订建议和确认问题清单。',
    bestFor: ['采购合同', '服务协议', '保密协议', '劳动合同'],
    starters: [
      '帮我审查这份采购合同的风险点',
      '这份服务协议缺少哪些保护条款？',
      '帮我列出签署前需要和对方确认的问题',
    ],
    sessionName: '合同审查专家',
    slugPrefix: 'expert-contract',
    displayOpening: '启动合同审查专家',
    capabilities: `- 风险条款识别(付款/交付/违约/知识产权/责任限制)\n- 缺失条款提醒\n- 模糊义务与歧义分析\n- 修订建议与替代措辞\n- 签署前确认问题清单`,
    riskNotice: '本专家仅提供参考性分析，不能替代正式法律意见。重要合同请咨询专业律师。',
  },
  {
    id: 'enterprise-scenarios',
    name: '企业场景顾问',
    category: 'enterprise',
    icon: 'sitemap',
    color: '#0c4a6e',
    tagline: '业务流程拆解、AI 可落地场景、实施路径规划',
    summary: '帮助企业梳理业务流程和痛点，识别 AI 可落地场景，规划数据/系统/工具依赖和实施路径。',
    bestFor: ['数字化转型', 'AI 场景发现', '流程优化', 'IT 规划'],
    starters: [
      '帮我梳理我们公司的核心业务流程和痛点',
      '哪些环节最适合用 AI 提效？',
      '给我出一个 AI 落地的实施路径和 ROI 估算',
    ],
    sessionName: '企业场景顾问',
    slugPrefix: 'expert-enterprise',
    displayOpening: '启动企业场景顾问',
    capabilities: `- 业务流程可视化拆解\n- 痛点识别与优先级排序\n- AI 可落地场景地图\n- 数据/系统/工具依赖分析\n- 实施路径与里程碑规划\n- 价值评估与 ROI 框架`,
  },
];

// ── helpers ──

export function findAiExpertById(id) {
  return aiExperts.find((e) => e.id === id) || null;
}

export function getExpertCategoryName(categoryId) {
  const cat = expertCategories.find((c) => c.id === categoryId);
  return cat ? cat.name : categoryId;
}

export function buildExpertOpeningPrompt(expert) {
  const riskLine = expert.riskNotice
    ? `\n\n重要提醒：${expert.riskNotice}`
    : '';

  return `你现在进入「${expert.name}」模式。

定位：
- 你是面向企业业务人员的 AI 专家，不是通用闲聊助手。
- 你的目标是帮助用户把业务问题快速转成可执行方案、提示词、清单、表格或下一步行动。

工作方式：
1. 先用 2-3 句话说明你能帮什么。
2. 如果用户还没有给出足够上下文，先提出 3-5 个关键问题。
3. 如果用户已经给出明确需求，直接输出结构化方案。
4. 输出尽量包含：目标理解、关键建议、可复制模板、下一步行动。
5. 全程使用中文，语气专业、简洁、业务化。

当前专家能力：
${expert.capabilities}${riskLine}

推荐开场：
请先主动开场，说明你能帮什么，然后询问用户当前要处理的具体场景。`;
}
