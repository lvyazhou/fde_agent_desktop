<template>
  <div class="flex-1 overflow-y-auto p-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold text-slate-800 mb-8">设置</h1>

      <!-- AI Model Config -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <i class="fa-solid fa-robot text-blue-700"></i>
          </div>
          <h2 class="font-semibold text-slate-800">AI 模型配置</h2>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">API Key</label>
            <div class="relative">
              <input
                :type="showApiKey ? 'text' : 'password'"
                v-model="apiKey"
                placeholder="sk-... 请输入你的 AI API Key"
                class="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-mono"
              />
              <button
                @click="showApiKey = !showApiKey"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i :class="showApiKey ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" class="text-sm"></i>
              </button>
            </div>
            <p class="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
              <i class="fa-solid fa-circle-info text-slate-300"></i>
              填写后点击保存，配置文件存储在 ~/.product-lobster/.env
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Base URL <span class="text-slate-400 font-normal">(可选)</span></label>
            <input
              v-model="baseUrl"
              placeholder="https://api.openai.com/v1（留空使用默认）"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-mono"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">模型 <span class="text-slate-400 font-normal">(可选)</span></label>

            <!-- 360 网关:单选下拉(模板 12 个模型自动全保留) -->
            <template v-if="isThreeSixty">
              <div class="relative">
                <select
                  v-model="modelSelect"
                  class="w-full appearance-none px-4 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                >
                  <option value="" disabled>请选择模型…</option>
                  <optgroup label="强 · 首选">
                    <option v-for="m in COMMON_MODELS.filter(x => x.group === '强 · 首选')" :key="m.value" :value="m.value">{{ m.label }}</option>
                  </optgroup>
                  <optgroup label="快 · 日常">
                    <option v-for="m in COMMON_MODELS.filter(x => x.group === '快 · 日常')" :key="m.value" :value="m.value">{{ m.label }}</option>
                  </optgroup>
                  <option :value="CUSTOM_MODEL">自定义（手动填写）…</option>
                </select>
                <i class="fa-solid fa-chevron-down text-xs text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              </div>
              <input
                v-if="isCustomModel"
                v-model="customModel"
                placeholder="按网关支持的名称填写，如 gpt-4o、qwen/qwen3-max"
                class="w-full mt-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-mono"
              />
              <p class="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                <i class="fa-solid fa-circle-info text-slate-300"></i>
                360 网关常用模型，均已验证可稳定驱动。
              </p>
            </template>

            <!-- 非 360 网关:多选(勾选的写进 models 列表,顶栏下拉可切换) -->
            <template v-else>
              <div class="mb-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-700 flex items-start gap-1.5">
                <i class="fa-solid fa-triangle-exclamation mt-0.5"></i>
                <span>你正在使用非 360 网关。下方内置清单是 360 专用模型名，多半不被该网关识别——请用底部输入框<b>手填该网关真实支持的裸模型名</b>（如 <code class="bg-white/60 px-1 rounded">gpt-4o</code>、<code class="bg-white/60 px-1 rounded">deepseek-chat</code>）。保存时会自动去掉 <code class="bg-white/60 px-1 rounded">厂商/</code> 前缀。</span>
              </div>
              <!-- 已选 chip -->
              <div v-if="selectedModels.length" class="flex flex-wrap gap-2 mb-2">
                <span
                  v-for="(m, i) in selectedModels" :key="m"
                  class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-[12px] font-medium"
                  :class="i === 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600'"
                >
                  <span class="font-mono">{{ m }}</span>
                  <span v-if="i === 0" class="text-[10px] text-blue-400">默认</span>
                  <button @click="removeSelected(m)" class="w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center">
                    <i class="fa-solid fa-xmark text-[10px]"></i>
                  </button>
                </span>
              </div>
              <p v-else class="text-[12px] text-rose-500 mb-2">
                <i class="fa-solid fa-circle-exclamation mr-1"></i>至少勾选或添加一个模型
              </p>

              <!-- 常用模型勾选 -->
              <div class="border border-slate-200 rounded-xl p-3 max-h-52 overflow-y-auto space-y-1">
                <label
                  v-for="m in COMMON_MODELS" :key="m.value"
                  class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :checked="selectedModels.includes(m.value)"
                    @change="toggleModel(m.value)"
                    class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                  />
                  <span class="text-[13px] text-slate-700 flex-1">{{ m.label }}</span>
                  <span class="text-[11px] text-slate-400 font-mono">{{ m.value }}</span>
                </label>
              </div>

              <!-- 手动添加额外模型 -->
              <div class="flex items-center gap-2 mt-2">
                <input
                  v-model="extraModelInput"
                  @keyup.enter="addExtraModel"
                  placeholder="其他网关的模型名，如 gpt-4o、gpt-4o-mini（回车添加）"
                  class="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-mono"
                />
                <button
                  @click="addExtraModel"
                  :disabled="!extraModelInput.trim()"
                  class="shrink-0 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] transition-colors disabled:opacity-40"
                >
                  <i class="fa-solid fa-plus mr-1 text-[11px]"></i>添加
                </button>
              </div>
              <p class="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                <i class="fa-solid fa-circle-info text-slate-300"></i>
                勾选/添加的模型会出现在顶栏下拉框，第一个为默认。请填该网关的裸模型名（如 <code class="bg-slate-100 px-1 rounded">gpt-4o</code>），不要带 <code class="bg-slate-100 px-1 rounded">厂商/</code> 前缀。
              </p>
            </template>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button
              @click="saveEnv"
              :disabled="saving || (!isThreeSixty && selectedModels.length === 0)"
              class="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
            >
              <i class="fa-solid fa-check mr-1.5 text-xs"></i>
              {{ saving ? '保存中...' : '保存配置' }}
            </button>
            <span v-if="saveStatus === 'success'" class="text-xs text-blue-600 font-medium">
              <i class="fa-solid fa-circle-check mr-1"></i>已保存，引擎已重启
            </span>
            <span v-else-if="saveStatus === 'error'" class="text-xs text-rose-600 font-medium">
              <i class="fa-solid fa-triangle-exclamation mr-1"></i>保存失败
            </span>
          </div>
        </div>
      </div>

      <!-- MCP Servers -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <i class="fa-solid fa-plug text-blue-700"></i>
          </div>
          <h2 class="font-semibold text-slate-800">MCP 服务器</h2>
        </div>
        <p class="text-xs text-slate-500 mb-3">
          MCP (Model Context Protocol) 服务器扩展 AI 的能力——连接外部数据源、API 和工具。
          在 <code class="bg-slate-50 px-1.5 py-0.5 rounded text-[11px] font-mono">~/.product-lobster/config.yaml</code> 的 <code class="bg-slate-50 px-1.5 py-0.5 rounded text-[11px] font-mono">mcp_servers:</code> 部分配置。
        </p>
        <button
          @click="openConfigFile"
          class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm transition-colors cursor-pointer"
        >
          <i class="fa-solid fa-file-code mr-1.5 text-xs"></i>
          打开 config.yaml
        </button>
      </div>

      <!-- Data Storage -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <i class="fa-solid fa-hard-drive text-blue-700"></i>
          </div>
          <h2 class="font-semibold text-slate-800">数据存储</h2>
        </div>
        <div class="space-y-3">
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-slate-600">数据目录</span>
            <span class="text-sm text-slate-800 font-mono bg-slate-50 px-3 py-1 rounded-lg">{{ hermesHome }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-t border-slate-50">
            <span class="text-sm text-slate-600">项目数量</span>
            <span class="text-sm text-slate-800 font-semibold">{{ projectCount }} 个</span>
          </div>
        </div>
      </div>

      <!-- About -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <i class="fa-solid fa-circle-info text-blue-700"></i>
          </div>
          <h2 class="font-semibold text-slate-800">关于</h2>
        </div>
        <div class="space-y-3">
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-slate-600">应用名称</span>
            <span class="text-sm text-slate-800">FDE产品设计</span>
          </div>
          <div class="flex items-center justify-between py-2 border-t border-slate-50">
            <span class="text-sm text-slate-600">版本号</span>
            <span class="text-sm text-slate-800 font-mono">{{ appVersion }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-t border-slate-50">
            <span class="text-sm text-slate-600">技术栈</span>
            <span class="text-sm text-slate-500">Electron + Vue 3 + AI Agent</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { COMMON_MODELS, CUSTOM_MODEL, DEFAULT_MODEL, isCommonModel } from '../../constants/models.js';

const apiKey = ref('');
const baseUrl = ref('');
// 模型下拉状态:modelSelect = 下拉选中值(常用模型全名 或 自定义哨兵);
// customModel = 选「自定义」时的手填值。model 为最终生效模型名(供保存逻辑用)。
const modelSelect = ref('');
const customModel = ref('');
const isCustomModel = computed(() => modelSelect.value === CUSTOM_MODEL);
const model = computed(() => (isCustomModel.value ? customModel.value.trim() : modelSelect.value.trim()));

// 网关判定:base_url 含 360.cn 或留空(=默认360)→ 360 网关。
// 360 网关维持单选(config 模板 12 个模型自动全保留);非 360 网关走「多选」——
// 用户勾选的模型全部写进 config.yaml 的 models: 列表,第一个作 model.default。
const isThreeSixty = computed(() => {
  const u = baseUrl.value.trim();
  return !u || /360\.cn/i.test(u);
});
// 非360网关的多选状态:selectedModels = 已选模型全名数组(保序,第一个=默认)。
const selectedModels = ref([]);
const extraModelInput = ref('');
function toggleModel(value) {
  const i = selectedModels.value.indexOf(value);
  if (i >= 0) selectedModels.value.splice(i, 1);
  else selectedModels.value.push(value);
}
function addExtraModel() {
  const v = extraModelInput.value.trim();
  if (v && !selectedModels.value.includes(v)) selectedModels.value.push(v);
  extraModelInput.value = '';
}
function removeSelected(value) {
  const i = selectedModels.value.indexOf(value);
  if (i >= 0) selectedModels.value.splice(i, 1);
}
function modelLabel(value) {
  const m = COMMON_MODELS.find((x) => x.value === value);
  return m ? m.label : value;
}

const showApiKey = ref(false);
const hermesHome = ref('~/.product-lobster');
const projectCount = ref(0);
const appVersion = ref('3.0.0');
const saving = ref(false);
const saveStatus = ref(''); // '' | 'success' | 'error'

onMounted(async () => {
  // Load app version
  if (window.api && window.api.app) {
    try {
      appVersion.value = await window.api.app.getVersion();
    } catch (e) {}
  }

  // Load project count
  if (window.api && window.api.hermes) {
    try {
      const projects = await window.api.hermes.listProjects({ kind: 'project' });
      projectCount.value = projects ? projects.length : 0;
    } catch (e) {}
  }

  // Load .env file(回填 apiKey / baseUrl / 单选 model)
  if (window.api && window.api.hermes && window.api.hermes.readEnv) {
    try {
      const result = await window.api.hermes.readEnv();
      if (result && result.success && result.content) {
        parseEnv(result.content);
      }
    } catch (e) {}
  }

  // 非360网关多选的事实来源是 config.yaml 的 models:,从那里回填已勾选项。
  if (window.api && window.api.hermes && window.api.hermes.readConfigModels) {
    try {
      const r = await window.api.hermes.readConfigModels();
      if (r && r.success) {
        // baseUrl 若 .env 没回填到,用 config 里的兜底
        if (!baseUrl.value.trim() && r.baseUrl) baseUrl.value = r.baseUrl;
        if (Array.isArray(r.models) && r.models.length) selectedModels.value = [...r.models];
      }
    } catch (e) {}
  }
});

function parseEnv(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key === 'ANTHROPIC_API_KEY' || key === 'OPENAI_API_KEY' || key === 'API_KEY') {
      apiKey.value = val;
    } else if (key === 'OPENAI_BASE_URL' || key === 'BASE_URL' || key === 'API_BASE_URL') {
      baseUrl.value = val;
    } else if (key === 'HERMES_MODEL' || key === 'MODEL' || key === 'OPENAI_MODEL') {
      // 已配置的模型:在常用清单里 → 下拉选中它;否则 → 归到「自定义」并回填手填框。
      if (isCommonModel(val)) {
        modelSelect.value = val;
      } else if (val) {
        modelSelect.value = CUSTOM_MODEL;
        customModel.value = val;
      }
    }
  }
}

function buildEnv() {
  let lines = [];
  if (apiKey.value.trim()) {
    // Detect key type
    if (apiKey.value.startsWith('sk-ant-')) {
      lines.push(`ANTHROPIC_API_KEY=${apiKey.value.trim()}`);
    } else {
      lines.push(`OPENAI_API_KEY=${apiKey.value.trim()}`);
    }
  }
  if (baseUrl.value.trim()) {
    lines.push(`OPENAI_BASE_URL=${baseUrl.value.trim()}`);
  }
  // 默认模型:非360网关取多选第一个,360网关取单选值。
  const def = isThreeSixty.value ? model.value : (selectedModels.value[0] || '');
  if (def) {
    lines.push(`HERMES_MODEL=${def}`);
  }
  return lines.join('\n') + '\n';
}

async function openConfigFile() {
  try {
    const homeDir = await window.api.fs.getHomeDir();
    await window.api.shell.openPath(homeDir + '/.product-lobster/config.yaml');
  } catch (e) {
    console.error('Failed to open config.yaml:', e);
  }
}

async function saveEnv() {
  saving.value = true;
  saveStatus.value = '';
  try {
    const content = buildEnv();
    const result = await window.api.hermes.writeEnv(content);
    if (result && result.success) {
      // 同步进 config.yaml。360网关传单选值(不收敛,保留模板全量);
      // 非360网关传多选数组(收敛成用户勾选的这几项,第一个作 default)。
      const modelArg = isThreeSixty.value ? model.value : selectedModels.value;
      await window.api.hermes.syncProviderKey(apiKey.value.trim(), baseUrl.value.trim(), modelArg);
      // Restart hermes to pick up new key
      await window.api.hermes.restart();
      saveStatus.value = 'success';
    } else {
      saveStatus.value = 'error';
    }
  } catch (e) {
    console.error('Save env failed:', e);
    saveStatus.value = 'error';
  } finally {
    saving.value = false;
    // Clear status after 3s
    setTimeout(() => { saveStatus.value = ''; }, 3000);
  }
}
</script>
