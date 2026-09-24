<template>
  <div class="flex-1 overflow-y-auto p-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold text-slate-800 mb-8">设置</h1>

      <!-- AI Model Config -->
      <div class="glass-card rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <i class="fa-solid fa-robot text-blue-700"></i>
          </div>
          <h2 class="font-semibold text-slate-800">AI 模型配置</h2>
        </div>

        <!-- 网关档案切换:每组各自保存 key/地址/模型,切换互不覆盖 -->
        <div class="mb-5">
          <label class="block text-sm font-medium text-slate-700 mb-2">网关</label>
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="p in profiles" :key="p.id"
              @click="selectProfile(p.id)"
              class="group inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border text-[13px] transition-colors cursor-pointer"
              :class="p.id === editingId
                ? 'bg-primary-soft border-primary text-primary font-medium'
                : 'bg-white border-slate-200 text-slate-600 hover:border-primary'"
            >
              <i class="fa-solid fa-cloud text-[11px]"></i>
              <span>{{ p.name }}</span>
              <span v-if="p.id === activeId" class="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white">生效中</span>
              <span
                v-if="profiles.length > 1"
                @click.stop="removeProfile(p.id)"
                class="w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity"
                title="删除该网关"
              >
                <i class="fa-solid fa-xmark text-[10px]"></i>
              </span>
            </button>
            <button
              @click="startNewProfile"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 text-[13px] text-slate-500 hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              <i class="fa-solid fa-plus text-[11px]"></i> 新增网关
            </button>
          </div>
        </div>

        <div v-if="profiles.length === 0 && !isNew" class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[13px] text-slate-500">
          还没有配置任何网关。点「新增网关」开始 —— 选预设、填 Key、一键获取模型。
        </div>

        <div v-else class="space-y-4">
          <!-- 预设:选中自动填 baseUrl 与是否需裸模型名 -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">预设</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="preset in GATEWAY_PRESETS" :key="preset.id"
                @click="applyPreset(preset)"
                class="px-3 py-1.5 rounded-lg border text-[12.5px] transition-colors cursor-pointer"
                :class="matchedPresetId === preset.id
                  ? 'bg-primary-soft border-primary text-primary font-medium'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-primary'"
              >
                {{ preset.name }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">网关名称</label>
            <input
              v-model="form.name"
              placeholder="给这组配置起个名，如「公司 360」「我的 OpenAI」"
              class="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Base URL</label>
            <input
              v-model="form.baseUrl"
              placeholder="https://api.openai.com/v1"
              class="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-mono"
            />
            <p class="text-xs text-slate-400 mt-1.5">漏写 <code class="bg-slate-100 px-1 rounded">/v1</code> 也没关系，获取模型时会自动补齐重试。</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">API Key</label>
            <div class="relative">
              <input
                :type="showApiKey ? 'text' : 'password'"
                v-model="form.apiKey"
                placeholder="sk-... 请输入该网关的 API Key"
                class="w-full px-3.5 py-2 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-mono"
              />
              <button
                @click="showApiKey = !showApiKey"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i :class="showApiKey ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" class="text-sm"></i>
              </button>
            </div>
          </div>

          <!-- 一键获取模型 + 测试连接 -->
          <div class="flex flex-wrap items-center gap-2.5">
            <button
              @click="discoverModels"
              :disabled="!form.apiKey.trim() || !form.baseUrl.trim() || discovering"
              class="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              <i class="fa-solid mr-1.5 text-xs" :class="discovering ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-down'"></i>
              {{ discovering ? '获取中…' : '获取模型' }}
            </button>
            <!-- 测试连接:必须明确测哪个模型。之前默认拿 selectedModels[0] 去测,
                 勾了几十个模型时"测通了"只代表那一个通,其余照样可能 400,是假保障。 -->
            <div class="inline-flex items-center gap-1.5">
              <div class="relative">
                <select
                  v-model="testModel"
                  :disabled="!selectedModels.length"
                  class="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 max-w-[220px] font-mono text-[12.5px]"
                >
                  <option value="" disabled>选择要测试的模型…</option>
                  <option v-for="m in selectedModels" :key="m" :value="m">{{ m }}</option>
                </select>
                <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              </div>
              <button
                @click="testConn"
                :disabled="!form.apiKey.trim() || !testModel || testing"
                class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-sm transition-colors"
              >
                <i class="fa-solid mr-1.5 text-xs" :class="testing ? 'fa-spinner fa-spin' : 'fa-plug'"></i>
                {{ testing ? '测试中…' : '测试连接' }}
              </button>
            </div>
          </div>

          <div v-if="discoverMsg || testResult" class="flex flex-wrap items-center gap-3 -mt-1">
            <span v-if="discoverMsg" class="text-xs" :class="discoverOk ? 'text-blue-600' : 'text-danger-deep'">
              <i class="fa-solid mr-1" :class="discoverOk ? 'fa-circle-check' : 'fa-triangle-exclamation'"></i>{{ discoverMsg }}
            </span>
            <span v-if="testResult" class="text-xs" :class="testResult.ok ? 'text-blue-600' : 'text-danger-deep'">
              <i class="fa-solid mr-1" :class="testResult.ok ? 'fa-circle-check' : 'fa-triangle-exclamation'"></i>
              <!-- 带上测的是哪个模型:否则一堆模型里看到"连接正常"会误以为全都通了 -->
              <span class="font-mono">{{ testResult.model }}</span>
              {{ testResult.ok ? ` 连接正常 (${testResult.latencyMs}ms)` : ` ${testResult.error}` }}
            </span>
          </div>

          <!-- 模型清单:获取成功后默认全选;也可手填 -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-sm font-medium text-slate-700">
                模型 <span class="text-slate-400 font-normal">已选 {{ selectedModels.length }} 个</span>
              </label>
              <div v-if="modelChoices.length" class="flex items-center gap-2 text-[12px]">
                <!-- 有搜索词时只对搜索结果生效,措辞跟着变 —— 否则用户搜完点"全选"
                     会意外把没在看的模型也勾上。 -->
                <button @click="selectAllModels" class="text-primary hover:underline cursor-pointer">
                  {{ modelQuery.trim() ? '全选结果' : '全选' }}
                </button>
                <span class="text-slate-300">|</span>
                <button @click="clearSelectedModels" class="text-slate-500 hover:underline cursor-pointer">
                  {{ modelQuery.trim() ? '取消结果' : '清空' }}
                </button>
              </div>
            </div>

            <div v-if="selectedModels.length" class="flex flex-wrap gap-2 mb-2">
              <span
                v-for="(m, i) in selectedModels" :key="m"
                class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-[12px] font-medium"
                :class="i === 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600'"
              >
                <!-- 点非默认项即设为默认。勾了几十个模型时,不给这个入口用户就只能
                     把想要的那个之前的全删掉才能让它排第一。 -->
                <span
                  class="font-mono"
                  :class="i === 0 ? '' : 'cursor-pointer hover:underline'"
                  :title="i === 0 ? '当前默认模型' : '点击设为默认'"
                  @click="i === 0 ? null : makeDefaultModel(m)"
                >{{ m }}</span>
                <span v-if="i === 0" class="text-[10px] text-blue-400">默认</span>
                <button @click="removeSelected(m)" class="w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center">
                  <i class="fa-solid fa-xmark text-[10px]"></i>
                </button>
              </span>
            </div>
            <p v-else class="text-[12px] text-danger mb-2">
              <i class="fa-solid fa-circle-exclamation mr-1"></i>请先「获取模型」，或在下方手动添加
            </p>

            <!-- 搜索:网关可能返回上百个模型(实测某聚合网关 109 个),
                 靠滚动找某一个不现实。 -->
            <div v-if="modelChoices.length" class="relative mb-1.5">
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-300"></i>
              <input
                v-model="modelQuery"
                placeholder="搜索模型…"
                class="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-50 border border-transparent text-[12.5px] placeholder:text-slate-300 focus:outline-none focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
              />
              <button
                v-if="modelQuery"
                @click="modelQuery = ''"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <i class="fa-solid fa-xmark text-[10px]"></i>
              </button>
            </div>

            <!-- 拉取到的模型:勾选 -->
            <div v-if="modelChoices.length" class="border border-slate-200 rounded-xl p-3 max-h-56 overflow-y-auto space-y-1">
              <p v-if="!filteredModelChoices.length" class="px-2 py-6 text-center text-[12px] text-slate-400">
                没有匹配「{{ modelQuery }}」的模型
              </p>
              <label
                v-for="m in filteredModelChoices" :key="m"
                class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="selectedModels.includes(m)"
                  @change="toggleModel(m)"
                  class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                />
                <span class="text-[13px] text-slate-700 flex-1 font-mono truncate">{{ m }}</span>
              </label>
            </div>

            <!-- 非对话模型:网关把 embedding/图像/语音 也一并返回了,折叠起来默认不勾,
                 但留着入口 —— 万一判错了(比如某个能聊的模型名里带 image),用户能自己勾回来。 -->
            <div v-if="otherModels.length" class="mt-2">
              <button
                @click="showOthers = !showOthers"
                class="text-[12px] text-slate-500 hover:text-primary transition-colors cursor-pointer"
              >
                <i class="fa-solid mr-1 text-[10px]" :class="showOthers ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
                另有 {{ otherModels.length }} 个非对话模型（embedding / 图像 / 语音等，默认不启用）
              </button>
              <div v-if="showOthers" class="mt-1.5 border border-slate-200 rounded-xl p-3 max-h-44 overflow-y-auto space-y-1">
                <label
                  v-for="m in otherModels" :key="m"
                  class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :checked="selectedModels.includes(m)"
                    @change="toggleModel(m)"
                    class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                  />
                  <span class="text-[13px] text-slate-500 flex-1 font-mono truncate">{{ m }}</span>
                </label>
              </div>
            </div>

            <!-- 手动添加(网关不支持 /models 时的退路) -->
            <div class="flex items-center gap-2 mt-2">
              <input
                v-model="extraModelInput"
                @keyup.enter="addExtraModel"
                placeholder="手动添加模型名（回车添加）"
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
            <p class="text-xs text-slate-400 mt-2">第一个模型为默认，之后可在顶栏下拉随时切换。</p>

            <!-- 模型名格式:预设会自动设好,但自建/聚合代理千差万别,必须能手改。
                 判断依据很直观 —— 看上面「获取模型」拉回来的名字带不带斜杠。 -->
            <label class="flex items-start gap-2.5 mt-3 p-2.5 rounded-lg bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                v-model="form.stripVendorPrefix"
                class="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
              />
              <span class="text-[12px] text-slate-600 leading-relaxed">
                该网关只认<b>裸模型名</b>（如 <code class="bg-white px-1 rounded">gpt-4o</code>），保存时自动去掉「厂商/」前缀。
                <span class="block text-slate-400 mt-0.5">
                  若上方拉到的模型名形如 <code class="bg-white px-1 rounded">deepseek/deepseek-v4-pro</code>（带斜杠），请<b>不要</b>勾选。
                </span>
              </span>
            </label>
          </div>

          <div class="flex items-center gap-3 pt-2 border-t border-slate-100">
            <button
              @click="saveAndActivate"
              :disabled="saving || !form.name.trim() || !form.apiKey.trim() || selectedModels.length === 0"
              class="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
            >
              <i class="fa-solid mr-1.5 text-xs" :class="saving ? 'fa-spinner fa-spin' : 'fa-check'"></i>
              {{ saving ? '保存中…' : '保存并启用' }}
            </button>
            <button
              @click="saveOnly"
              :disabled="saving || !form.name.trim()"
              class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-sm transition-colors"
            >
              仅保存
            </button>
            <span v-if="saveStatus === 'success'" class="text-xs text-blue-600 font-medium">
              <i class="fa-solid fa-circle-check mr-1"></i>{{ saveMsg || '已保存' }}
            </span>
            <span v-else-if="saveStatus === 'error'" class="text-xs text-danger-deep font-medium">
              <i class="fa-solid fa-triangle-exclamation mr-1"></i>{{ saveMsg || '保存失败' }}
            </span>
          </div>
        </div>
      </div>

      <!-- MCP Servers -->
      <div class="glass-card rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <i class="fa-solid fa-plug text-blue-700"></i>
          </div>
          <h2 class="font-semibold text-slate-800">MCP 服务器</h2>
        </div>
        <p class="text-xs text-slate-500 mb-3">
          MCP (Model Context Protocol) 服务器扩展 AI 的能力——连接外部数据源、API 和工具。
          在 <code class="bg-transparent px-1.5 py-0.5 rounded text-[11px] font-mono">~/.product-lobster/config.yaml</code> 的 <code class="bg-transparent px-1.5 py-0.5 rounded text-[11px] font-mono">mcp_servers:</code> 部分配置。
        </p>
        <button
          @click="openConfigFile"
          class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm transition-colors cursor-pointer"
        >
          <i class="fa-solid fa-file-code mr-1.5 text-xs"></i>
          打开 config.yaml
        </button>
      </div>

      <!-- 外观主题 -->
      <div class="glass-card rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <i class="fa-solid fa-palette text-blue-700"></i>
          </div>
          <h2 class="font-semibold text-slate-800">外观主题</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            v-for="t in THEME_OPTIONS"
            :key="t.key"
            type="button"
            @click="setTheme(t.key)"
            class="text-left rounded-xl border p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            :class="theme === t.key ? 'border-primary bg-primary-soft' : 'border-slate-200 hover:border-primary'"
          >
            <div class="flex items-center gap-2.5 mb-2">
              <!-- 色卡预览：直接用写死的色值，避免受当前主题影响 -->
              <span class="flex gap-1 shrink-0">
                <span v-for="c in t.swatch" :key="c" class="w-4 h-4 rounded" :style="{ background: c }"></span>
              </span>
              <span class="text-[13px] font-semibold text-slate-800">{{ t.name }}</span>
              <i v-if="theme === t.key" class="fa-solid fa-circle-check text-primary text-[12px] ml-auto"></i>
            </div>
            <p class="text-[11.5px] text-slate-500 leading-relaxed">{{ t.desc }}</p>
          </button>
        </div>
      </div>

      <!-- Data Storage -->
      <div class="glass-card rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <i class="fa-solid fa-hard-drive text-blue-700"></i>
          </div>
          <h2 class="font-semibold text-slate-800">数据存储</h2>
        </div>
        <div class="space-y-3">
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-slate-600">数据目录</span>
            <span class="text-sm text-slate-800 font-mono bg-transparent px-3 py-1 rounded-lg">{{ hermesHome }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-t border-slate-50">
            <span class="text-sm text-slate-600">项目数量</span>
            <span class="text-sm text-slate-800 font-semibold">{{ projectCount }} 个</span>
          </div>
        </div>
      </div>

      <!-- About -->
      <div class="glass-card rounded-2xl border border-slate-100 shadow-sm p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
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
import { ref, computed, watch, onMounted } from 'vue';
import { GATEWAY_PRESETS } from '../../constants/models.js';
import { useTheme } from '../../composables/useTheme.js';

const { theme, setTheme } = useTheme();

const THEME_OPTIONS = [
  {
    key: 'blue',
    name: '蓝色玻璃',
    desc: '品牌蓝 + 四角光晕，卡片走浅蓝斜向渐变，偏清爽的产品感。',
    swatch: ['#2563eb', '#6090f6', '#eff4ff'],
  },
  {
    key: 'brown',
    name: '暖棕磨砂',
    desc: '黄铜棕 + 暖纸底，叠一层颗粒噪点，接近纸张手感的阅读氛围。',
    swatch: ['#8f5a18', '#ac8347', '#f7f5f0'],
  },
];

// --- 网关档案 ---------------------------------------------------------------
// profiles = 已保存的多组网关配置;activeId = 当前生效的那组;
// editingId = 正在编辑的那组(可以是未保存的新建 = NEW_ID)。
const NEW_ID = '__new__';
const profiles = ref([]);
const activeId = ref('');
const editingId = ref('');
const isNew = computed(() => editingId.value === NEW_ID);

const form = ref({ name: '', baseUrl: '', apiKey: '', stripVendorPrefix: true });
// selectedModels = 已选模型(保序,第一个=默认);discoveredModels = 本次拉到的对话模型;
// otherModels = 同次拉到但判为非对话的(embedding/图像/语音…),折叠区展示,默认不勾。
const selectedModels = ref([]);
const discoveredModels = ref([]);
const otherModels = ref([]);
const showOthers = ref(false);
const extraModelInput = ref('');

const discovering = ref(false);
const discoverMsg = ref('');
const discoverOk = ref(false);
const testing = ref(false);
const testResult = ref(null);
// 测试连接要测的那个模型(必须明确指定,不再默认拿 selectedModels[0])
const testModel = ref('');
// 模型勾选区的搜索词
const modelQuery = ref('');

// 勾选区展示的候选:优先用拉取结果;没拉过则用已选 + 预设建议补齐,
// 让用户在网关不支持 /models 时也有东西可勾。
const modelChoices = computed(() => {
  const base = discoveredModels.value.length ? discoveredModels.value : suggestedModels.value;
  const merged = [...base];
  for (const m of selectedModels.value) if (!merged.includes(m)) merged.push(m);
  return merged;
});

// 搜索过滤后的候选。空搜索词 = 全部。
const filteredModelChoices = computed(() => {
  const q = modelQuery.value.trim().toLowerCase();
  if (!q) return modelChoices.value;
  return modelChoices.value.filter((m) => m.toLowerCase().includes(q));
});

// 测试模型的兜底:已选列表变动后,若原先选的测试模型已不在列表里,回落到默认模型。
watch(selectedModels, (list) => {
  if (!list.length) { testModel.value = ''; return; }
  if (!testModel.value || !list.includes(testModel.value)) testModel.value = list[0];
}, { deep: true, immediate: true });

// 当前 baseUrl 命中的预设(用于高亮 + 取建议模型清单)。
const matchedPresetId = computed(() => {
  const u = form.value.baseUrl.trim().replace(/\/+$/, '');
  const hit = GATEWAY_PRESETS.find((p) => p.baseUrl && p.baseUrl.replace(/\/+$/, '') === u);
  return hit ? hit.id : (u ? 'custom' : '');
});
const suggestedModels = computed(() => {
  const hit = GATEWAY_PRESETS.find((p) => p.id === matchedPresetId.value);
  return hit ? hit.models : [];
});

function applyPreset(preset) {
  form.value.baseUrl = preset.baseUrl;
  form.value.stripVendorPrefix = preset.stripVendorPrefix;
  if (!form.value.name.trim() || GATEWAY_PRESETS.some((p) => p.name === form.value.name)) {
    form.value.name = preset.name;
  }
  // 换了网关,之前那套模型多半不适用:清掉拉取结果与已选,等用户重新「获取模型」。
  discoveredModels.value = [];
  otherModels.value = [];
  showOthers.value = false;
  selectedModels.value = [];
  discoverMsg.value = '';
  testResult.value = null;
}

function startNewProfile() {
  editingId.value = NEW_ID;
  form.value = { name: '', baseUrl: '', apiKey: '', stripVendorPrefix: true };
  selectedModels.value = [];
  discoveredModels.value = [];
  otherModels.value = [];
  showOthers.value = false;
  extraModelInput.value = '';
  discoverMsg.value = '';
  testResult.value = null;
  saveStatus.value = '';
}

function selectProfile(id) {
  const p = profiles.value.find((x) => x.id === id);
  if (!p) return;
  editingId.value = id;
  form.value = {
    name: p.name || '',
    baseUrl: p.baseUrl || '',
    apiKey: p.apiKey || '',
    stripVendorPrefix: !!p.stripVendorPrefix,
  };
  selectedModels.value = Array.isArray(p.models) ? [...p.models] : [];
  discoveredModels.value = [];
  otherModels.value = [];
  showOthers.value = false;
  extraModelInput.value = '';
  discoverMsg.value = '';
  testResult.value = null;
  saveStatus.value = '';
}

async function removeProfile(id) {
  const p = profiles.value.find((x) => x.id === id);
  if (!p) return;
  if (!window.confirm(`删除网关「${p.name}」？该组的 Key 与模型配置会一并删除。`)) return;
  try {
    const r = await window.api.gateway.deleteProfile(id);
    if (r && r.success) {
      profiles.value = r.profiles || [];
      activeId.value = r.activeId || '';
      // 删的正是正在编辑的那组 → 切到剩下的第一组(没有就进新建态)。
      if (editingId.value === id) {
        if (profiles.value.length) selectProfile(profiles.value[0].id);
        else startNewProfile();
      }
      // 删掉的是「生效中」那组:引擎此刻仍在用它的 key/地址跑,
      // 必须明确告诉用户去挑一个点「保存并启用」,否则他以为删了就切走了。
      if (r.clearedActive) {
        saveStatus.value = 'error';
        saveMsg.value = profiles.value.length
          ? '已删除生效中的网关，请选一个网关点「保存并启用」'
          : '已删除生效中的网关，请新增一个网关并启用';
      }
    }
  } catch (e) {
    console.error('deleteProfile failed:', e);
  }
}

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
// 全选:有搜索词时只勾当前搜索结果(并保留已勾的其他项),无搜索词时勾全部。
// 保持当前默认模型仍在首位 —— 全选不该顺带改掉默认模型。
function selectAllModels() {
  const prevDefault = selectedModels.value[0];
  const q = modelQuery.value.trim();
  const next = q
    ? [...selectedModels.value, ...filteredModelChoices.value.filter((m) => !selectedModels.value.includes(m))]
    : [...modelChoices.value];
  if (prevDefault && next.includes(prevDefault)) {
    next.splice(next.indexOf(prevDefault), 1);
    next.unshift(prevDefault);
  }
  selectedModels.value = next;
}

// 清空:有搜索词时只取消搜索结果里的勾选,无搜索词时全清。
function clearSelectedModels() {
  const q = modelQuery.value.trim();
  if (!q) { selectedModels.value = []; return; }
  const drop = new Set(filteredModelChoices.value);
  selectedModels.value = selectedModels.value.filter((m) => !drop.has(m));
}

// 把某个已选模型提到首位 = 设为默认(写 config 时取 selectedModels[0])。
function makeDefaultModel(value) {
  const i = selectedModels.value.indexOf(value);
  if (i <= 0) return;
  selectedModels.value.splice(i, 1);
  selectedModels.value.unshift(value);
}

// 一键从网关拉真实模型列表。成功后默认全选 —— 这是「点一下就完事」的关键一步。
async function discoverModels() {
  discovering.value = true;
  discoverMsg.value = '';
  testResult.value = null;
  try {
    const r = await window.api.gateway.discoverModels(form.value.baseUrl.trim(), form.value.apiKey.trim());
    if (r && r.ok && Array.isArray(r.models) && r.models.length) {
      discoveredModels.value = r.models;
      otherModels.value = Array.isArray(r.others) ? r.others : [];
      // 保留原本的默认模型:selectedModels[0] 会被写成 config 的 model.default。
      // 若直接用网关返回的顺序,默认模型就变成列表里碰巧排第一的那个(实测某网关
      // 排头是 360-deepseek-v3.1 这种老版本),用户原来在用的 v4-pro 被悄悄换掉。
      // 所以:原默认模型若仍在新列表里,把它提到最前。
      const prevDefault = selectedModels.value[0];
      const picked = [...r.models];
      if (prevDefault && picked.includes(prevDefault)) {
        picked.splice(picked.indexOf(prevDefault), 1);
        picked.unshift(prevDefault);
      }
      selectedModels.value = picked;
      discoverOk.value = true;
      const skipped = otherModels.value.length;
      discoverMsg.value = skipped
        ? `拉到 ${r.total} 个，已选中 ${r.models.length} 个对话模型（跳过 ${skipped} 个非对话模型）`
        : `拉到 ${r.models.length} 个模型，已全选`;
      // 网关自己报的模型名是最可靠的格式依据:它回的名字带「厂商/」前缀,
      // 就说明它认前缀名,此时绝不能剥(剥了必然 400)。比预设/域名推断都准,
      // 所以拉取成功后直接据此纠正 —— 自建代理的预设猜错也能自动兜回来。
      form.value.stripVendorPrefix = !r.models.some((m) => String(m).includes('/'));
    } else {
      discoverOk.value = false;
      // 拉取失败不阻断:退回预设建议 + 手填,照样能保存启用。
      discoverMsg.value = (r && r.error) || '获取失败，可手动添加模型名';
    }
  } catch (e) {
    discoverOk.value = false;
    discoverMsg.value = e.message || '获取失败';
  } finally {
    discovering.value = false;
  }
}

// 测试指定的那一个模型。结果里带回模型名,免得用户在几十个模型里
// 看到「连接正常」误以为全部都通。
async function testConn() {
  const model = testModel.value;
  if (!model) return;
  testing.value = true;
  testResult.value = null;
  try {
    const r = await window.api.env.testConnection({
      apiKey: form.value.apiKey.trim(),
      baseUrl: form.value.baseUrl.trim(),
      model,
      // 该网关认前缀名时不能让主进程按域名猜着剥前缀,否则测的模型名和
      // 引擎实际用的不一致 —— 测通了但真跑起来 400(或反过来)。
      stripVendorPrefix: form.value.stripVendorPrefix,
    });
    testResult.value = { ...(r || {}), model };
  } catch (e) {
    testResult.value = { ok: false, error: e.message || '测试失败', model };
  } finally {
    testing.value = false;
  }
}

// 把表单收敛成要落盘的 profile 对象。
function buildProfile() {
  return {
    id: isNew.value ? '' : editingId.value,
    name: form.value.name.trim(),
    baseUrl: form.value.baseUrl.trim(),
    apiKey: form.value.apiKey.trim(),
    models: [...selectedModels.value],
    stripVendorPrefix: !!form.value.stripVendorPrefix,
  };
}

async function persistProfile() {
  const r = await window.api.gateway.saveProfile(buildProfile());
  if (!r || !r.success) throw new Error((r && r.error) || '保存失败');
  profiles.value = r.profiles || [];
  activeId.value = r.activeId || '';
  editingId.value = r.profile.id;
  return r.profile;
}

// 仅保存:落盘档案但不切引擎。用于先把几组配置备好、稍后再切。
async function saveOnly() {
  saving.value = true;
  saveStatus.value = '';
  try {
    await persistProfile();
    saveStatus.value = 'success';
    saveMsg.value = '已保存（未启用）';
  } catch (e) {
    saveStatus.value = 'error';
    saveMsg.value = e.message;
  } finally {
    saving.value = false;
    setTimeout(() => { saveStatus.value = ''; }, 4000);
  }
}

// 保存并启用:落盘 + 写 config.yaml + 重启引擎。
async function saveAndActivate() {
  saving.value = true;
  saveStatus.value = '';
  try {
    const saved = await persistProfile();
    const r = await window.api.gateway.activateProfile(saved.id);
    if (!r || !r.success) throw new Error((r && r.error) || '启用失败');
    activeId.value = r.activeId || saved.id;
    saveStatus.value = 'success';
    saveMsg.value = '已启用，引擎已重启';
  } catch (e) {
    saveStatus.value = 'error';
    saveMsg.value = e.message;
  } finally {
    saving.value = false;
    setTimeout(() => { saveStatus.value = ''; }, 4000);
  }
}

const showApiKey = ref(false);
const hermesHome = ref('~/.product-lobster');
const projectCount = ref(0);
const appVersion = ref('3.3.7');
const saving = ref(false);
const saveStatus = ref(''); // '' | 'success' | 'error'
const saveMsg = ref('');

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

  // 网关档案是模型配置的唯一事实来源。主进程首次读取时会把已生效的
  // config.yaml + .env 收编成第一组档案(ensureGatewayProfilesSeeded),
  // 所以老用户升级后打开这里就能看到自己原有的网关。
  if (window.api && window.api.gateway) {
    try {
      const r = await window.api.gateway.listProfiles();
      if (r && r.success) {
        profiles.value = r.profiles || [];
        activeId.value = r.activeId || '';
        if (profiles.value.length) {
          selectProfile(activeId.value || profiles.value[0].id);
        } else {
          startNewProfile();
        }
      }
    } catch (e) {
      console.error('listProfiles failed:', e);
    }
  }
});

async function openConfigFile() {
  try {
    const homeDir = await window.api.fs.getHomeDir();
    await window.api.shell.openPath(homeDir + '/.product-lobster/config.yaml');
  } catch (e) {
    console.error('Failed to open config.yaml:', e);
  }
}
</script>
