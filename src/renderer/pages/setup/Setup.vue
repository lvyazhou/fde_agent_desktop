<template>
  <div class="min-h-screen h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50/40 font-sans text-slate-800 antialiased overflow-hidden">
    <!-- 顶部可拖拽条 -->
    <div class="h-10 shrink-0 drag-region flex items-center px-5">
      <div class="flex items-center gap-2 no-drag">
        <img src="../../assets/logo.png" alt="Logo" class="w-6 h-6 rounded-lg object-cover shadow-sm" />
        <span class="font-semibold text-slate-700 text-[13px]">FDE产品设计 · 初始化</span>
      </div>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-6">
      <div class="w-full max-w-2xl">
        <!-- 步骤指示 -->
        <div class="flex items-center justify-center gap-2 mb-8">
          <template v-for="(s, i) in steps" :key="i">
            <div class="flex items-center gap-2">
              <span
                class="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors"
                :class="i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'"
              >
                <i v-if="i < step" class="fa-solid fa-check text-[10px]"></i>
                <span v-else>{{ i + 1 }}</span>
              </span>
              <span class="text-[12px] font-medium" :class="i === step ? 'text-blue-700' : 'text-slate-400'">{{ s }}</span>
            </div>
            <div v-if="i < steps.length - 1" class="w-8 h-px bg-slate-200"></div>
          </template>
        </div>

        <div class="glass-card rounded-3xl border border-slate-200/70 shadow-lg shadow-blue-500/5 p-8">
          <!-- 步骤1:授权 -->
          <div v-if="step === 0">
            <h1 class="text-xl font-bold text-slate-800 mb-1">软件授权</h1>
            <p class="text-[13px] text-slate-500 mb-6">填写企业授权码在线激活。内网或断网环境可改用授权文件导入。</p>

            <!-- 机器码 -->
            <div class="rounded-2xl border border-slate-200 bg-transparent/60 p-4 mb-4">
              <div class="text-[11px] text-slate-400 mb-1.5">本机机器码</div>
              <div class="flex items-center gap-2">
                <code class="flex-1 min-w-0 text-[13px] font-mono text-slate-700 glass-card border border-slate-200 rounded-lg px-3 py-2 truncate">{{ machineSn || '计算中...' }}</code>
                <button @click="copySn" :disabled="!machineSn" class="shrink-0 text-[12px] px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
                  <i class="fa-solid" :class="copied ? 'fa-check' : 'fa-copy'"></i> {{ copied ? '已复制' : '复制' }}
                </button>
              </div>
            </div>

            <!-- 在线激活 -->
            <div class="rounded-2xl border border-blue-200/70 bg-blue-50/40 p-4 mb-4">
              <div class="text-[11px] text-slate-500 mb-1.5">企业授权码</div>
              <div class="flex items-center gap-2">
                <input
                  v-model="secretKey"
                  type="text"
                  placeholder="填写企业授权码后在线激活"
                  :disabled="activating"
                  @keyup.enter="activateOnline"
                  class="flex-1 min-w-0 text-[13px] font-mono glass-card border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 disabled:opacity-50"
                />
                <button
                  @click="activateOnline"
                  :disabled="activating || !secretKey.trim()"
                  class="shrink-0 text-[12px] px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40"
                >
                  <i class="fa-solid" :class="activating ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                  {{ activating ? ' 激活中' : ' 在线激活' }}
                </button>
              </div>

              <button @click="showServerUrl = !showServerUrl" class="mt-2 text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
                <i class="fa-solid text-[9px]" :class="showServerUrl ? 'fa-chevron-down' : 'fa-chevron-right'"></i> 授权服务地址
              </button>
              <input
                v-if="showServerUrl"
                v-model="serverUrl"
                type="text"
                placeholder="https://授权服务地址"
                :disabled="activating"
                class="mt-1.5 w-full text-[12px] font-mono glass-card border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 disabled:opacity-50"
              />

              <div v-if="activateError" class="mt-2 text-[12px] text-danger-deep flex items-start gap-1.5">
                <i class="fa-solid fa-circle-exclamation mt-0.5"></i><span>{{ activateError }}</span>
              </div>
            </div>

            <!-- 授权状态 -->
            <div v-if="licState" class="mb-4 p-3 rounded-xl text-[12px] flex items-start gap-2"
                 :class="licState.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-danger-soft text-danger-deep'">
              <i class="fa-solid mt-0.5" :class="licState.ok ? 'fa-circle-check' : 'fa-circle-exclamation'"></i>
              <span>{{ licStatusText }}</span>
            </div>

            <div class="flex items-center justify-between mt-6">
              <button @click="refreshLicense" :disabled="licLoading" class="text-[13px] px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">
                <i class="fa-solid" :class="licLoading ? 'fa-spinner fa-spin' : 'fa-rotate-right'"></i> 刷新状态
              </button>
              <div class="flex items-center gap-2">
                <button @click="importLicense" :disabled="importing" class="text-[13px] px-3.5 py-2 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40">
                  <i class="fa-solid" :class="importing ? 'fa-spinner fa-spin' : 'fa-file-import'"></i>
                  {{ importing ? ' 导入中' : ' 导入授权文件' }}
                </button>
                <button
                  @click="goNextFromLicense"
                  :disabled="!(licState && licState.ok)"
                  class="text-[13px] px-4 py-2 rounded-xl font-medium text-white transition-colors"
                  :class="(licState && licState.ok) ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'"
                >
                  下一步 <i class="fa-solid fa-arrow-right text-[11px] ml-1"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- 步骤2:环境自检 -->
          <div v-else-if="step === 1">
            <h1 class="text-xl font-bold text-slate-800 mb-1">环境自检</h1>
            <p class="text-[13px] text-slate-500 mb-6">确认运行环境就绪,避免装完跑不起来。</p>

            <div class="space-y-3">
              <div v-for="c in checkRows" :key="c.key" class="flex items-start gap-3 p-3.5 rounded-xl border" :class="rowClass(c.state)">
                <span class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" :class="iconWrapClass(c.state)">
                  <i :class="iconClass(c.state)"></i>
                </span>
                <div class="min-w-0 flex-1">
                  <div class="text-[13px] font-semibold text-slate-800">{{ c.label }}</div>
                  <div class="text-[12px] mt-0.5" :class="c.state === 'fail' ? 'text-danger-deep' : 'text-slate-500'">{{ c.detail }}</div>
                </div>
                <button
                  v-if="c.key === 'acp' && c.state === 'fail'"
                  @click="restartEngine"
                  :disabled="restarting"
                  class="shrink-0 text-[12px] px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <i class="fa-solid" :class="restarting ? 'fa-spinner fa-spin' : 'fa-rotate-right'"></i>
                  {{ restarting ? ' 重启中' : ' 重启引擎' }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between mt-7">
              <button @click="runCheck" :disabled="checking" class="text-[13px] px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">
                <i class="fa-solid" :class="checking ? 'fa-spinner fa-spin' : 'fa-rotate-right'"></i> 重新检查
              </button>
              <button
                @click="goNextFromCheck"
                :disabled="checking"
                class="text-[13px] px-4 py-2 rounded-xl font-medium text-white transition-colors disabled:opacity-50"
                :class="engineReady ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'"
              >
                下一步:配置 API Key <i class="fa-solid fa-arrow-right text-[11px] ml-1"></i>
              </button>
            </div>
            <p v-if="!engineReady && !checking" class="text-[11px] text-danger mt-3 text-right">
              引擎未就绪,先解决上方红色项。开发模式需先在 hermes-agent 建好 .venv。
            </p>
          </div>

          <!-- 步骤3:配置并验证 Key -->
          <div v-else-if="step === 2">
            <h1 class="text-xl font-bold text-slate-800 mb-1">配置 LLM API Key</h1>
            <p class="text-[13px] text-slate-500 mb-5">选网关、填 Key，点「获取模型」自动拉取可用模型。</p>

            <label class="block text-[12px] font-medium text-slate-600 mb-1.5">网关</label>
            <div class="flex flex-wrap gap-2 mb-4">
              <button
                v-for="preset in GATEWAY_PRESETS" :key="preset.id"
                @click="applyPreset(preset)"
                class="px-3 py-1.5 rounded-lg border text-[12.5px] transition-colors cursor-pointer"
                :class="matchedPresetId === preset.id
                  ? 'bg-blue-50 border-blue-400 text-blue-600 font-medium'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'"
              >
                {{ preset.name }}
              </button>
            </div>

            <label class="block text-[12px] font-medium text-slate-600 mb-1.5">API Key</label>
            <input
              v-model="apiKey"
              type="password"
              placeholder="sk-..."
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 mb-4"
            />

            <label class="block text-[12px] font-medium text-slate-600 mb-1.5">Base URL</label>
            <input
              v-model="baseUrl"
              type="text"
              placeholder="https://api.360.cn/v1"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 mb-2"
            />
            <p class="text-[11px] text-slate-400 mb-4">兼容 OpenAI 格式的接口地址。漏写 <code class="bg-slate-100 px-1 rounded">/v1</code> 会自动补齐重试。</p>

            <!-- 一键获取模型 -->
            <div class="flex items-center gap-2 mb-3">
              <button
                @click="discoverModels"
                :disabled="!apiKey.trim() || !baseUrl.trim() || discovering"
                class="text-[13px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <i class="fa-solid" :class="discovering ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-down'"></i>
                {{ discovering ? ' 获取中' : ' 获取模型' }}
              </button>
              <span v-if="discoverMsg" class="text-[12px]" :class="discoverOk ? 'text-blue-600' : 'text-danger-deep'">
                {{ discoverMsg }}
              </span>
            </div>

            <!-- 模型清单 -->
            <div class="mb-4">
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-[12px] font-medium text-slate-600">
                  启用的模型 <span class="text-slate-400 font-normal">已选 {{ selectedModels.length }} 个</span>
                </label>
                <div v-if="modelChoices.length" class="flex items-center gap-2 text-[11.5px]">
                  <button @click="selectAllModels" class="text-blue-600 hover:underline cursor-pointer">
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
                  <span class="font-mono">{{ m }}</span>
                  <span v-if="i === 0" class="text-[10px] text-blue-400">默认</span>
                  <button @click="removeSelected(m)" class="w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center">
                    <i class="fa-solid fa-xmark text-[10px]"></i>
                  </button>
                </span>
              </div>
              <p v-else class="text-[12px] text-danger mb-2">
                <i class="fa-solid fa-circle-exclamation mr-1"></i>请先「获取模型」，或在下方手动添加
              </p>

              <!-- 搜索:网关可能返回上百个模型,靠滚动找不现实 -->
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

              <div v-if="modelChoices.length" class="border border-slate-200 rounded-xl p-3 max-h-44 overflow-y-auto space-y-1">
                <p v-if="!filteredModelChoices.length" class="px-2 py-5 text-center text-[12px] text-slate-400">
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
              <div class="flex items-center gap-2 mt-2">
                <input
                  v-model="extraModelInput"
                  @keyup.enter="addExtraModel"
                  placeholder="手动添加模型名（回车添加）"
                  class="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 font-mono"
                />
                <button
                  @click="addExtraModel"
                  :disabled="!extraModelInput.trim()"
                  class="shrink-0 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] transition-colors disabled:opacity-40"
                >
                  <i class="fa-solid fa-plus mr-1 text-[11px]"></i>添加
                </button>
              </div>
              <p class="text-[11px] text-slate-400 mt-2">第一个模型为默认，之后可在顶栏下拉随时切换。</p>
            </div>

            <!-- 测试结果 -->
            <div v-if="testResult" class="mb-4 p-3 rounded-xl text-[12px] flex items-start gap-2"
                 :class="testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-danger-soft text-danger-deep'">
              <i class="fa-solid mt-0.5" :class="testResult.ok ? 'fa-circle-check' : 'fa-circle-exclamation'"></i>
              <!-- 带上测的是哪个模型:勾了几十个时,不写清楚会被当成"全部都通了" -->
              <span v-if="testResult.ok">
                <span class="font-mono">{{ testResult.model }}</span> 连接成功,响应 {{ testResult.latencyMs }}ms。可以继续。
              </span>
              <span v-else><span class="font-mono">{{ testResult.model }}</span> {{ testResult.error }}</span>
            </div>

            <div class="flex items-center justify-between mt-6">
              <button @click="step = 1" class="text-[13px] px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
                <i class="fa-solid fa-arrow-left text-[11px] mr-1"></i> 上一步
              </button>
              <div class="flex items-center gap-2">
                <!-- 明确测哪个模型,不默认拿第一个 -->
                <div class="relative">
                  <select
                    v-model="testModel"
                    :disabled="!selectedModels.length"
                    class="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200 bg-white text-[12px] text-slate-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 max-w-[190px] font-mono"
                  >
                    <option value="" disabled>选择测试模型…</option>
                    <option v-for="m in selectedModels" :key="m" :value="m">{{ m }}</option>
                  </select>
                  <i class="fa-solid fa-chevron-down text-[9px] text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                </div>
                <button
                  @click="testConn"
                  :disabled="!apiKey.trim() || !testModel || testing"
                  class="text-[13px] px-3.5 py-2 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
                >
                  <i class="fa-solid" :class="testing ? 'fa-spinner fa-spin' : 'fa-plug'"></i>
                  {{ testing ? ' 测试中' : ' 测试连接' }}
                </button>
                <button
                  @click="saveAndFinish"
                  :disabled="!(testResult && testResult.ok) || saving || selectedModels.length === 0"
                  class="text-[13px] px-4 py-2 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-check'"></i>
                  {{ saving ? ' 保存中' : ' 保存并进入' }}
                </button>
              </div>
            </div>
          </div>

          <!-- 步骤4:完成 -->
          <div v-else class="text-center py-8">
            <div class="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <i class="fa-solid fa-circle-check text-emerald-500 text-3xl"></i>
            </div>
            <h1 class="text-xl font-bold text-slate-800 mb-1">环境就绪</h1>
            <p class="text-[13px] text-slate-500">正在进入工作台...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { GATEWAY_PRESETS } from '../../constants/models.js';

const router = useRouter();
const steps = ['软件授权', '环境自检', '配置 Key', '完成'];
const step = ref(0);

// --- 授权 ---
const machineSn = ref('');
const copied = ref(false);
const licState = ref(null);
const licLoading = ref(false);
const importing = ref(false);

// 在线取证
const secretKey = ref('');
const serverUrl = ref('');
const showServerUrl = ref(false);
const activating = ref(false);
const activateError = ref('');

const LIC_STATUS_TEXT = {
  ACTIVE_PERMANENT: '已授权(永久)',
  ACTIVE_TEMPORARY: '已授权(临时)',
  GRACE_PERIOD: '授权已到期,处于缓冲期,请尽快续期',
  HARD_EXPIRED: '授权已过期,请导入新的授权文件',
  NO_LICENSE: '尚未授权,请导入授权文件',
  SN_MISMATCH: '授权文件与本机不匹配(换机需重新授权)',
  TAMPERED: '授权文件无效或已损坏',
  CLOCK_ROLLBACK: '检测到系统时间异常,请校正后重试',
  FINGERPRINT_FAIL: '无法读取本机标识',
};
const licStatusText = computed(() => {
  if (!licState.value) return '';
  const s = licState.value.status;
  let t = LIC_STATUS_TEXT[s] || s;
  if (licState.value.customer) t += ` · ${licState.value.customer}`;
  if (licState.value.expireAt) t += ` · 到期 ${licState.value.expireAt}`;
  return t;
});

const loadSn = async () => {
  try {
    const r = await window.api.license.machineSn();
    if (r && r.success) machineSn.value = r.sn;
  } catch (e) { /* ignore */ }
};
const loadServerUrl = async () => {
  try {
    const r = await window.api.license.serverUrl();
    if (r && r.success && r.url) serverUrl.value = r.url;
    else showServerUrl.value = true; // 没有内置地址时直接展开让用户填
  } catch (e) { showServerUrl.value = true; }
};
const activateOnline = async () => {
  activateError.value = '';
  if (!secretKey.value.trim()) { activateError.value = '请填写企业授权码'; return; }
  activating.value = true;
  try {
    const r = await window.api.license.activateOnline({
      secretKey: secretKey.value.trim(),
      serverUrl: serverUrl.value.trim() || undefined,
    });
    if (r && r.success) {
      secretKey.value = '';
      await refreshLicense();
    } else if (r && r.rejected) {
      licState.value = { ok: false, status: r.status };
      activateError.value = LIC_STATUS_TEXT[r.status] || r.status;
    } else {
      activateError.value = (r && r.error) || '激活失败';
    }
  } catch (e) {
    activateError.value = e.message || '激活失败';
  } finally { activating.value = false; }
};
const refreshLicense = async () => {
  licLoading.value = true;
  try {
    const r = await window.api.license.status();
    if (r && r.success !== false) licState.value = r;
  } catch (e) { console.error('license.status failed', e); }
  finally { licLoading.value = false; }
};
const copySn = async () => {
  try { await navigator.clipboard.writeText(machineSn.value); copied.value = true; setTimeout(() => copied.value = false, 1500); }
  catch { /* clipboard 不可用时忽略 */ }
};
const importLicense = async () => {
  importing.value = true;
  try {
    const r = await window.api.license.import();
    if (r && r.success) {
      await refreshLicense();
    } else if (r && r.rejected) {
      licState.value = { ok: false, status: r.status };
    }
  } catch (e) { console.error('license.import failed', e); }
  finally { importing.value = false; }
};
const goNextFromLicense = () => {
  if (!(licState.value && licState.value.ok)) return;
  step.value = 1;
  runCheck();
};

// --- 自检 ---
const checking = ref(false);
const restarting = ref(false);
const checkData = ref(null);

const engineReady = computed(() => checkData.value && checkData.value.engine.ok && checkData.value.acp.ok);

const checkRows = computed(() => {
  const d = checkData.value;
  const st = (ok) => (d ? (ok ? 'ok' : 'fail') : 'pending');
  return [
    { key: 'engine', label: '设计引擎 (hermes-acp)', state: st(d?.engine.ok), detail: d ? (d.engine.ok ? '已找到引擎程序' : d.engine.error) : '检测中...' },
    { key: 'acp', label: '引擎连接', state: st(d?.acp.ok), detail: d ? (d.acp.ok ? '引擎已连接并就绪' : d.acp.error) : '检测中...' },
    { key: 'apiKey', label: 'API Key', state: d ? (d.apiKey.configured ? 'ok' : 'warn') : 'pending', detail: d ? (d.apiKey.configured ? `已配置 (${d.apiKey.provider || 'openai'})` : '尚未配置,下一步填写') : '检测中...' },
  ];
});

const rowClass = (s) => ({ ok: 'border-emerald-100 bg-emerald-50/40', fail: 'border-danger-soft bg-danger-soft/40', warn: 'border-amber-100 bg-amber-50/40', pending: 'border-slate-100 bg-slate-50/40' }[s]);
const iconWrapClass = (s) => ({ ok: 'bg-emerald-100 text-emerald-600', fail: 'bg-danger-soft text-danger-deep', warn: 'bg-amber-100 text-amber-600', pending: 'bg-slate-100 text-slate-400' }[s]);
const iconClass = (s) => ({ ok: 'fa-solid fa-check text-sm', fail: 'fa-solid fa-xmark text-sm', warn: 'fa-solid fa-triangle-exclamation text-xs', pending: 'fa-solid fa-spinner fa-spin text-xs' }[s]);

const runCheck = async () => {
  checking.value = true;
  try {
    const res = await window.api.env.check();
    if (res && res.success) {
      checkData.value = res;
      if (res.allOk) finishToApp();
    }
  } catch (e) { console.error('env.check failed', e); }
  finally { checking.value = false; }
};

const restartEngine = async () => {
  restarting.value = true;
  try {
    await window.api.hermes.restart();
    await runCheck();
  } catch (e) { console.error('restart failed', e); }
  finally { restarting.value = false; }
};

const goNextFromCheck = () => {
  if (!engineReady.value) return;
  if (checkData.value?.apiKey?.baseUrl) baseUrl.value = checkData.value.apiKey.baseUrl;
  step.value = 2;
};

// --- 配置 Key ---
// 首启向导与设置页共用「网关档案」这一份真值:这里保存时创建第一组档案,
// 之后在设置页可以继续加别的网关、来回切换(旧版这两处各写一套逻辑,会漂移)。
const apiKey = ref('');
const baseUrl = ref('https://api.360.cn/v1');
const stripVendorPrefix = ref(false); // 默认预设是 360,认带厂商前缀的模型名
// selectedModels = 已选模型(保序,第一个=默认);discoveredModels = 拉到的对话模型
// (主进程已滤掉 embedding/图像/语音等非对话模型,向导里不再展示它们 —— 首次上手
//  不该被一堆用不了的模型干扰;真要用可事后在设置页的折叠区勾选)。
const selectedModels = ref([]);
const discoveredModels = ref([]);
const extraModelInput = ref('');

const discovering = ref(false);
const discoverMsg = ref('');
const discoverOk = ref(false);
const testing = ref(false);
const saving = ref(false);
const testResult = ref(null);
// 测试连接要测的那个模型(必须明确指定,不默认拿 selectedModels[0])
const testModel = ref('');
// 模型勾选区的搜索词
const modelQuery = ref('');

// 当前 baseUrl 命中的预设(高亮 + 取建议模型)。
const matchedPresetId = computed(() => {
  const u = baseUrl.value.trim().replace(/\/+$/, '');
  const hit = GATEWAY_PRESETS.find((p) => p.baseUrl && p.baseUrl.replace(/\/+$/, '') === u);
  return hit ? hit.id : (u ? 'custom' : '');
});
const suggestedModels = computed(() => {
  const hit = GATEWAY_PRESETS.find((p) => p.id === matchedPresetId.value);
  return hit ? hit.models : [];
});
// 勾选区候选:优先拉取结果,没拉过则用预设建议,并把已选项补进来。
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

// 已选列表变动后,若原先选的测试模型已不在列表里,回落到默认模型。
watch(selectedModels, (list) => {
  if (!list.length) { testModel.value = ''; return; }
  if (!testModel.value || !list.includes(testModel.value)) testModel.value = list[0];
}, { deep: true, immediate: true });

// 全选:有搜索词时只勾搜索结果(保留已勾的其他项),无搜索词时勾全部。
function selectAllModels() {
  const q = modelQuery.value.trim();
  selectedModels.value = q
    ? [...selectedModels.value, ...filteredModelChoices.value.filter((m) => !selectedModels.value.includes(m))]
    : [...modelChoices.value];
}

// 清空:有搜索词时只取消搜索结果里的勾选,无搜索词时全清。
function clearSelectedModels() {
  const q = modelQuery.value.trim();
  if (!q) { selectedModels.value = []; return; }
  const drop = new Set(filteredModelChoices.value);
  selectedModels.value = selectedModels.value.filter((m) => !drop.has(m));
}

function applyPreset(preset) {
  baseUrl.value = preset.baseUrl;
  stripVendorPrefix.value = preset.stripVendorPrefix;
  // 换网关后旧模型多半不适用,清掉等重新获取。
  discoveredModels.value = [];
  selectedModels.value = [];
  modelQuery.value = '';
  discoverMsg.value = '';
  testResult.value = null;
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

// 一键拉取该网关真实支持的模型,成功后默认全选。
const discoverModels = async () => {
  discovering.value = true;
  discoverMsg.value = '';
  testResult.value = null;
  try {
    const r = await window.api.gateway.discoverModels(baseUrl.value.trim(), apiKey.value.trim());
    if (r && r.ok && Array.isArray(r.models) && r.models.length) {
      discoveredModels.value = r.models;
      selectedModels.value = [...r.models];
      discoverOk.value = true;
      const skipped = Array.isArray(r.others) ? r.others.length : 0;
      discoverMsg.value = skipped
        ? `拉到 ${r.total} 个，已选中 ${r.models.length} 个对话模型（跳过 ${skipped} 个非对话模型）`
        : `拉到 ${r.models.length} 个模型，已全选`;
      // 网关回的模型名带「厂商/」前缀 → 它认前缀名,不能剥(剥了必然 400)。
      // 这比预设/域名推断都准,自建代理预设猜错也能自动兜回来。
      stripVendorPrefix.value = !r.models.some((m) => String(m).includes('/'));
    } else {
      // 拉取失败不阻断:退回建议清单 + 手填,照样能完成向导。
      discoverOk.value = false;
      discoverMsg.value = (r && r.error) || '获取失败，可手动添加模型名';
    }
  } catch (e) {
    discoverOk.value = false;
    discoverMsg.value = e.message || '获取失败';
  } finally {
    discovering.value = false;
  }
};

// 测指定的那一个模型;结果带回模型名,避免"测通了"被当成全部都通。
const testConn = async () => {
  const model = testModel.value;
  if (!model) return;
  testing.value = true;
  testResult.value = null;
  try {
    const r = await window.api.env.testConnection({
      apiKey: apiKey.value.trim(),
      baseUrl: baseUrl.value.trim(),
      model,
      // 显式传,别让主进程按域名猜着剥前缀 —— 猜错会导致测的模型名和引擎实际用的不一致。
      stripVendorPrefix: stripVendorPrefix.value,
    });
    testResult.value = { ...(r || {}), model };
  } catch (e) {
    testResult.value = { ok: false, error: e.message || '测试失败', model };
  } finally {
    testing.value = false;
  }
};

const saveAndFinish = async () => {
  if (!(testResult.value && testResult.value.ok)) return;
  if (selectedModels.value.length === 0) return;
  saving.value = true;
  try {
    const preset = GATEWAY_PRESETS.find((p) => p.id === matchedPresetId.value);
    const saved = await window.api.gateway.saveProfile({
      name: (preset && preset.name) || '我的网关',
      baseUrl: baseUrl.value.trim(),
      apiKey: apiKey.value.trim(),
      models: [...selectedModels.value],
      stripVendorPrefix: stripVendorPrefix.value,
    });
    if (!saved || !saved.success) throw new Error((saved && saved.error) || '保存失败');
    // activateProfile 内部负责写 .env / config.yaml 并重启引擎。
    const activated = await window.api.gateway.activateProfile(saved.profile.id);
    if (!activated || !activated.success) throw new Error((activated && activated.error) || '启用失败');
    finishToApp();
  } catch (e) {
    console.error('save failed', e);
    testResult.value = { ok: false, error: '保存失败:' + (e.message || '') };
  } finally {
    saving.value = false;
  }
};

const finishToApp = () => {
  step.value = 3;
  setTimeout(() => router.replace('/'), 800);
};

onMounted(async () => {
  await loadSn();
  await loadServerUrl();
  await refreshLicense();
  // 已授权 → 直接进环境自检
  if (licState.value && licState.value.ok) {
    step.value = 1;
    runCheck();
  }
});
</script>

<style scoped>
.drag-region { -webkit-app-region: drag; }
.no-drag { -webkit-app-region: no-drag; }
</style>
