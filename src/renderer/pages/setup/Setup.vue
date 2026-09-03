<template>
  <div class="min-h-screen h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50/40 font-sans text-slate-800 antialiased overflow-hidden">
    <!-- 顶部可拖拽条 -->
    <div class="h-10 shrink-0 drag-region flex items-center px-5">
      <div class="flex items-center gap-2 no-drag">
        <div class="w-6 h-6 rounded-lg bg-blue-700 flex items-center justify-center shadow-sm">
          <i class="fa-solid fa-wand-magic-sparkles text-white text-[10px]"></i>
        </div>
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

        <div class="bg-white rounded-3xl border border-slate-200/70 shadow-lg shadow-blue-500/5 p-8">
          <!-- 步骤1:授权 -->
          <div v-if="step === 0">
            <h1 class="text-xl font-bold text-slate-800 mb-1">软件授权</h1>
            <p class="text-[13px] text-slate-500 mb-6">导入授权文件激活。若尚未授权,请把下方机器码提供给供应方获取授权文件。</p>

            <!-- 机器码 -->
            <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 mb-4">
              <div class="text-[11px] text-slate-400 mb-1.5">本机机器码</div>
              <div class="flex items-center gap-2">
                <code class="flex-1 min-w-0 text-[13px] font-mono text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 truncate">{{ machineSn || '计算中...' }}</code>
                <button @click="copySn" :disabled="!machineSn" class="shrink-0 text-[12px] px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
                  <i class="fa-solid" :class="copied ? 'fa-check' : 'fa-copy'"></i> {{ copied ? '已复制' : '复制' }}
                </button>
              </div>
            </div>

            <!-- 授权状态 -->
            <div v-if="licState" class="mb-4 p-3 rounded-xl text-[12px] flex items-start gap-2"
                 :class="licState.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'">
              <i class="fa-solid mt-0.5" :class="licState.ok ? 'fa-circle-check' : 'fa-circle-exclamation'"></i>
              <span>{{ licStatusText }}</span>
            </div>

            <div class="flex items-center justify-between mt-6">
              <button @click="refreshLicense" :disabled="licLoading" class="text-[13px] px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">
                <i class="fa-solid" :class="licLoading ? 'fa-spinner fa-spin' : 'fa-rotate-right'"></i> 刷新状态
              </button>
              <div class="flex items-center gap-2">
                <button @click="importLicense" :disabled="importing" class="text-[13px] px-4 py-2.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40">
                  <i class="fa-solid" :class="importing ? 'fa-spinner fa-spin' : 'fa-file-import'"></i>
                  {{ importing ? ' 导入中' : ' 导入授权文件' }}
                </button>
                <button
                  @click="goNextFromLicense"
                  :disabled="!(licState && licState.ok)"
                  class="text-[13px] px-5 py-2.5 rounded-xl font-medium text-white transition-colors"
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
                  <div class="text-[12px] mt-0.5" :class="c.state === 'fail' ? 'text-rose-600' : 'text-slate-500'">{{ c.detail }}</div>
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
              <button @click="runCheck" :disabled="checking" class="text-[13px] px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">
                <i class="fa-solid" :class="checking ? 'fa-spinner fa-spin' : 'fa-rotate-right'"></i> 重新检查
              </button>
              <button
                @click="goNextFromCheck"
                :disabled="checking"
                class="text-[13px] px-5 py-2.5 rounded-xl font-medium text-white transition-colors disabled:opacity-50"
                :class="engineReady ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'"
              >
                下一步:配置 API Key <i class="fa-solid fa-arrow-right text-[11px] ml-1"></i>
              </button>
            </div>
            <p v-if="!engineReady && !checking" class="text-[11px] text-rose-500 mt-3 text-right">
              引擎未就绪,先解决上方红色项。开发模式需先在 hermes-agent 建好 .venv。
            </p>
          </div>

          <!-- 步骤3:配置并验证 Key -->
          <div v-else-if="step === 2">
            <h1 class="text-xl font-bold text-slate-800 mb-1">配置 LLM API Key</h1>
            <p class="text-[13px] text-slate-500 mb-6">填写你的大模型 API Key,点「测试连接」确认能调通后再继续。</p>

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
            <p class="text-[11px] text-slate-400 mb-4">兼容 OpenAI 格式的接口地址。以 <code class="bg-slate-100 px-1 rounded">sk-ant-</code> 开头会按 Anthropic 处理。</p>

            <label class="block text-[12px] font-medium text-slate-600 mb-1.5">模型</label>
            <input
              v-model="model"
              type="text"
              placeholder="deepseek/deepseek-v4-pro 或 gpt-4o"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 mb-2"
            />
            <p class="text-[11px] text-slate-400 mb-4">测试连接和默认对话使用的模型名,按你所选网关支持的名称填写。</p>

            <!-- 测试结果 -->
            <div v-if="testResult" class="mb-4 p-3 rounded-xl text-[12px] flex items-start gap-2"
                 :class="testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'">
              <i class="fa-solid mt-0.5" :class="testResult.ok ? 'fa-circle-check' : 'fa-circle-exclamation'"></i>
              <span v-if="testResult.ok">连接成功,响应 {{ testResult.latencyMs }}ms。可以继续。</span>
              <span v-else>{{ testResult.error }}</span>
            </div>

            <div class="flex items-center justify-between mt-6">
              <button @click="step = 1" class="text-[13px] px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
                <i class="fa-solid fa-arrow-left text-[11px] mr-1"></i> 上一步
              </button>
              <div class="flex items-center gap-2">
                <button
                  @click="testConn"
                  :disabled="!apiKey.trim() || !model.trim() || testing"
                  class="text-[13px] px-4 py-2.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
                >
                  <i class="fa-solid" :class="testing ? 'fa-spinner fa-spin' : 'fa-plug'"></i>
                  {{ testing ? ' 测试中' : ' 测试连接' }}
                </button>
                <button
                  @click="saveAndFinish"
                  :disabled="!(testResult && testResult.ok) || saving"
                  class="text-[13px] px-5 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
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
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const steps = ['软件授权', '环境自检', '配置 Key', '完成'];
const step = ref(0);

// --- 授权 ---
const machineSn = ref('');
const copied = ref(false);
const licState = ref(null);
const licLoading = ref(false);
const importing = ref(false);

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

const rowClass = (s) => ({ ok: 'border-emerald-100 bg-emerald-50/40', fail: 'border-rose-100 bg-rose-50/40', warn: 'border-amber-100 bg-amber-50/40', pending: 'border-slate-100 bg-slate-50/40' }[s]);
const iconWrapClass = (s) => ({ ok: 'bg-emerald-100 text-emerald-600', fail: 'bg-rose-100 text-rose-600', warn: 'bg-amber-100 text-amber-600', pending: 'bg-slate-100 text-slate-400' }[s]);
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
const apiKey = ref('');
const baseUrl = ref('https://api.360.cn/v1');
const model = ref('');
const testing = ref(false);
const saving = ref(false);
const testResult = ref(null);

const testConn = async () => {
  testing.value = true;
  testResult.value = null;
  try {
    testResult.value = await window.api.env.testConnection({ apiKey: apiKey.value.trim(), baseUrl: baseUrl.value.trim(), model: model.value.trim() });
  } catch (e) {
    testResult.value = { ok: false, error: e.message || '测试失败' };
  } finally {
    testing.value = false;
  }
};

const saveAndFinish = async () => {
  if (!(testResult.value && testResult.value.ok)) return;
  saving.value = true;
  try {
    const lines = [];
    const key = apiKey.value.trim();
    if (key.startsWith('sk-ant-')) lines.push(`ANTHROPIC_API_KEY=${key}`);
    else lines.push(`OPENAI_API_KEY=${key}`);
    if (baseUrl.value.trim()) lines.push(`OPENAI_BASE_URL=${baseUrl.value.trim()}`);
    if (model.value.trim()) lines.push(`HERMES_MODEL=${model.value.trim()}`);
    await window.api.hermes.writeEnv(lines.join('\n') + '\n');
    // 同步写进 config.yaml 的 custom_providers[].api_key / base_url / 默认模型 ——
    // hermes 选模型的事实来源是 config.yaml,只写 .env 不生效(占位符会一直被用),
    // 且模型清单要跟着网关走,否则顶栏下拉列的是别的网关不认的模型名。
    await window.api.hermes.syncProviderKey(key, baseUrl.value.trim(), model.value.trim());
    await window.api.hermes.restart();
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
