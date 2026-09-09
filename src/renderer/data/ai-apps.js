/**
 * AI 应用广场 —— 统一应用数据模型 + prompt 构建
 *
 * 内置应用复用 ai-experts.js 定义，加 source/status 标记。
 * 本地开发者应用通过 window.api.aiApps 从主进程加载。
 */

import { aiExperts, expertCategories, buildExpertOpeningPrompt } from './ai-experts';

// ── 应用分类(在专家分类基础上追加虚拟分类) ──

export const aiAppCategories = [
  { id: 'all',        name: '全部应用',   icon: 'layer-group',         color: '#64748b' },
  ...expertCategories.filter((c) => c.id !== 'all'),
  { id: 'my-published', name: '我的发布', icon: 'rocket',              color: '#059669' },
  { id: 'my-drafts',    name: '开发草稿', icon: 'pen-ruler',           color: '#d97706' },
];

// ── 内置应用:从 aiExperts 映射 ──

export const builtinAiApps = aiExperts.map((ex) => ({
  ...ex,
  slugPrefix: ex.slugPrefix.replace(/^expert-/, 'app-'),
  source: 'builtin',
  status: 'published',
  developer: { author: '系统内置', version: '1.0.0' },
}));

// ── helpers ──

export function findBuiltinAiAppById(id) {
  return builtinAiApps.find((a) => a.id === id) || null;
}

export function getAiAppCategoryName(categoryId) {
  const cat = aiAppCategories.find((c) => c.id === categoryId);
  return cat ? cat.name : categoryId;
}

export function buildAiAppOpeningPrompt(app) {
  if (app.prompt) return app.prompt;

  const caps = app.capabilities || '';
  const workflow = app.workflow ? `\n\n工作流程：\n${app.workflow}` : '';
  const constraints = app.constraints ? `\n\n使用约束：\n${app.constraints}` : '';
  const riskLine = app.riskNotice ? `\n\n重要提醒：${app.riskNotice}` : '';

  return `你现在进入「${app.name}」模式。

定位：
- 你是面向企业业务人员的 AI 应用助手，不是通用闲聊助手。
- 你的目标是帮助用户把业务问题快速转成可执行方案、提示词、清单、表格或下一步行动。

工作方式：
1. 先用 2-3 句话说明你能帮什么。
2. 如果用户还没有给出足够上下文，先提出 3-5 个关键问题。
3. 如果用户已经给出明确需求，直接输出结构化方案。
4. 输出尽量包含：目标理解、关键建议、可复制模板、下一步行动。
5. 全程使用中文，语气专业、简洁、业务化。

当前应用能力：
${caps}${workflow}${constraints}${riskLine}

推荐开场：
请先主动开场，说明你能帮什么，然后询问用户当前要处理的具体场景。`;
}

// ── 兼容旧接口 ──

export { expertCategories, aiExperts, buildExpertOpeningPrompt };
export { findAiExpertById, getExpertCategoryName } from './ai-experts';
