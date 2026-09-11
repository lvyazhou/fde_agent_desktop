// 常用模型清单 —— 供「注册引导 Setup」和「设置页 Settings」的模型下拉使用。
//
// 这是一份「主用 360 网关」的精选常用模型:均已实测 tool-calling 通过、能稳定驱动 Hermes agent。
// 想加/删模型直接改这里一处,两个页面同步生效。
//
// 注意:这份清单是为 360 网关(api.360.cn)准备的。用别的网关的用户,
// 在下拉里选「自定义」手填模型名即可 —— 不会被这份清单堵死。
//
// value = 传给接口的模型全名; label = 下拉里展示的中文友好名。
export const COMMON_MODELS = [
  // —— 强 · 首选(复杂任务 / 长链路 agent)——
  { value: 'deepseek/deepseek-v4-pro',        label: 'DeepSeek V4 Pro（强）',        group: '强 · 首选' },
  { value: 'anthropic/claude-sonnet-5',       label: 'Claude Sonnet 5',              group: '强 · 首选' },
  { value: 'anthropic/claude-opus-4.8',       label: 'Claude Opus 4.8（最强）',      group: '强 · 首选' },
  { value: 'openai/gpt-5.5',                  label: 'GPT-5.5',                      group: '强 · 首选' },
  { value: 'google/gemini-3-pro-preview',     label: 'Gemini 3 Pro',                 group: '强 · 首选' },
  // —— 快 · 日常(省钱快速,已验证不泄漏推理)——
  { value: 'deepseek/deepseek-v4.1-flash',    label: 'DeepSeek V4.1 Flash（快·默认）', group: '快 · 日常' },
  { value: 'anthropic/claude-haiku-4.5',      label: 'Claude Haiku 4.5（快）',       group: '快 · 日常' },
  { value: 'z-ai/glm-5.3',                    label: 'GLM-5.3',                      group: '快 · 日常' },
  { value: 'qwen/qwen3.8-max',                label: '通义千问 3.8 Max',            group: '快 · 日常' },
  { value: 'moonshotai/kimi-k3',              label: 'Kimi K3',                      group: '快 · 日常' },
  { value: 'openai/gpt-5.6-terra',            label: 'GPT-5.6 Terra',                group: '快 · 日常' },
];

// 默认模型(下拉初始选中项)。与 config.yaml 的 model.default 保持一致。
export const DEFAULT_MODEL = 'deepseek/deepseek-v4.1-flash';

// 自定义手填项的哨兵值。
export const CUSTOM_MODEL = '__custom__';

// 给定模型全名,返回它是否在常用清单里(不在 = 需要走自定义手填)。
export function isCommonModel(value) {
  return COMMON_MODELS.some((m) => m.value === value);
}
