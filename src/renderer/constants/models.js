// 网关预设 —— 供「注册引导 Setup」和「设置页 Settings」新建网关档案时用。
//
// 主路径是「选预设自动填地址 → 填 Key → 点『获取模型』从网关拉真实模型清单」,
// 所以这里的 models 只是**兜底建议**:该网关不支持 /models 接口时,让用户有东西可勾,
// 不必对着空列表手打。真能拉到列表时这份建议不参与。
//
// stripVendorPrefix: 该网关认不认「厂商/模型」前缀名。360 认
// anthropic/claude-sonnet-5;OpenAI/DeepSeek 官方只认裸名 gpt-4o,带前缀会 400。
// 档案里显式存这个标记,主进程写 config.yaml 时据此决定是否剥前缀 ——
// 旧代码在两处用 base_url 是否含 360.cn 去猜,猜不准自建代理。
export const GATEWAY_PRESETS = [
  {
    id: '360',
    name: '360 网关',
    baseUrl: 'https://api.360.cn/v1',
    stripVendorPrefix: false,
    models: [
      'anthropic/claude-opus-4.8',
      'anthropic/claude-sonnet-5',
      'anthropic/claude-haiku-4.5',
      'deepseek/deepseek-v4-pro',
      'deepseek/deepseek-v4.1-flash',
      'openai/gpt-5.5',
      'google/gemini-3-pro-preview',
      'moonshotai/kimi-k3',
      'z-ai/glm-5.3',
      'qwen/qwen3.8-max',
      'minimax/MiniMax-M3',
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI 官方',
    baseUrl: 'https://api.openai.com/v1',
    stripVendorPrefix: true,
    models: ['gpt-5.5', 'gpt-5.5-mini', 'gpt-4o', 'gpt-4o-mini'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek 官方',
    baseUrl: 'https://api.deepseek.com/v1',
    stripVendorPrefix: true,
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'custom',
    name: '自定义网关',
    baseUrl: '',
    stripVendorPrefix: true,
    models: [],
  },
];
