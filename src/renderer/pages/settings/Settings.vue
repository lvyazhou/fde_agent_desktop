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
            <input
              v-model="model"
              placeholder="deepseek/deepseek-v4-pro 或 gpt-4o（按网关支持的名称填写）"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-mono"
            />
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button
              @click="saveEnv"
              :disabled="saving"
              class="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white rounded-xl text-sm font-medium transition-colors"
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
import { ref, onMounted } from 'vue';

const apiKey = ref('');
const baseUrl = ref('');
const model = ref('');
const showApiKey = ref(false);
const hermesHome = ref('~/.product-lobster');
const projectCount = ref(0);
const appVersion = ref('1.0.0');
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
      const projects = await window.api.hermes.listProjects();
      projectCount.value = projects ? projects.length : 0;
    } catch (e) {}
  }

  // Load .env file
  if (window.api && window.api.hermes && window.api.hermes.readEnv) {
    try {
      const result = await window.api.hermes.readEnv();
      if (result && result.success && result.content) {
        parseEnv(result.content);
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
      model.value = val;
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
  if (model.value.trim()) {
    lines.push(`HERMES_MODEL=${model.value.trim()}`);
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
      // 同步进 config.yaml 的 custom_providers[].api_key / base_url / 默认模型（hermes 选模型凭据与清单的事实来源）
      await window.api.hermes.syncProviderKey(apiKey.value.trim(), baseUrl.value.trim(), model.value.trim());
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
