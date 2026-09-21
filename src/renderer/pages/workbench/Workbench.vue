<template>
  <div class="flex-1 min-h-0 overflow-hidden">
    <!-- 阶段详情视图 -->
    <StageDetail
      v-if="activeStage"
      :stage="activeStage"
      @back="activeStage = null"
      @coach="goCoach"
    />

    <!-- 门户视图(一屏自适应,不滚动) -->
    <div v-else class="portal h-full overflow-hidden">
      <div class="portal-inner relative z-[1] w-full h-full flex flex-col">
        <!-- Hero:平台是什么 / 为什么做 -->
        <div class="hero rounded-2xl card border border-blue-500/14 relative overflow-hidden shrink-0" style="box-shadow: var(--shadow-card-token)">
          <div class="hero-bg" :style="{ backgroundImage: `url(${topHero})` }"></div>
          <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-600 z-[2]"></div>
          <div class="relative z-[1] flex items-start justify-between gap-6 flex-wrap">
            <div class="hero-copy min-w-0 flex-1">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[12px] font-medium text-blue-600 mb-2">
                <img src="../../assets/logo.png" alt="Logo" class="w-4 h-4 rounded object-cover" />
                FDE 五阶段工作台
              </div>
              <h1 class="hero-title font-bold mb-1.5 leading-snug text-slate-800">把「客户要 AI」翻译成「能落地的行业工作台」</h1>
              <p class="hero-desc text-slate-500 leading-relaxed max-w-4xl">
                FDE 项目经理的作战指挥台。把一次商业化 AI 交付拆成五个前后咬合的阶段——
                <span class="font-semibold text-blue-600">调研备弹 → 需求原型 → 智能体设计 → 工作台上线 → 试用定稿</span>,
                每阶段的知识库、话术、交付物模板都在这里规范取用。
              </p>
            </div>
            <button
              @click="goCoach"
              class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
            >
              <i class="fa-solid fa-headset"></i>
              <span>找 FDE 教练陪练聊需求</span>
            </button>
          </div>
        </div>

        <!-- 两条线并行推进(流程图) -->
        <div class="card rounded-2xl p-5 shrink-0">
          <div class="flex items-center justify-between mb-4">
            <div class="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
              <i class="fa-solid fa-route text-blue-600"></i>两条线并行推进
            </div>
            <div class="flex items-center gap-2.5 text-[11px]">
              <span
                class="group/badge relative flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl bg-blue-50 border border-blue-500/14 cursor-help transition-colors hover:bg-blue-100/60 shrink-0"
                title="节奏卡点：全程只跟甲方碰 2 次面 + 1 次签字确认出原型，逼自己一次性问清、避免反复拉扯"
              >
                <span class="min-w-[42px] h-7 px-2 flex items-center justify-center rounded-lg bg-blue-600 text-white font-mono font-bold text-[13px] shrink-0 whitespace-nowrap">2+1</span>
                <span class="flex flex-col leading-tight min-w-0">
                  <span class="text-slate-700 font-semibold text-[11px] whitespace-nowrap">2 次对接 + 1 次签字</span>
                  <span class="text-slate-400 text-[10px] whitespace-nowrap">碰 2 次面即出原型</span>
                </span>
              </span>
              <span
                class="group/badge relative flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl bg-blue-50 border border-blue-500/14 cursor-help transition-colors hover:bg-blue-100/60 shrink-0"
                title="交付时限：按项目大小定死交付天数——小项目 3 天 / 中 7 天 / 大 14 天，两线齐备才起算"
              >
                <span class="min-w-[58px] h-7 px-2 flex items-center justify-center rounded-lg bg-blue-600 text-white font-mono font-bold text-[12px] shrink-0 whitespace-nowrap">3/7/14</span>
                <span class="flex flex-col leading-tight min-w-0">
                  <span class="text-slate-700 font-semibold text-[11px] whitespace-nowrap">小 3 / 中 7 / 大 14 天</span>
                  <span class="text-slate-400 text-[10px] whitespace-nowrap">按规模定交付时限</span>
                </span>
              </span>
            </div>
          </div>
          <!-- 需求主线 -->
          <div class="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
            <span class="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 w-24">
              <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
              需求主线
            </span>
            <template v-for="(node, i) in demandLine" :key="'d'+i">
              <div class="shrink-0 px-3 py-2 rounded-lg bg-blue-50 text-[12px] text-slate-700 whitespace-nowrap">{{ node }}</div>
              <i v-if="i < demandLine.length - 1" class="fa-solid fa-arrow-right text-blue-600/50 text-[10px] shrink-0"></i>
            </template>
          </div>
          <!-- 环境地基线 -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1">
            <span class="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 w-24">
              <span class="w-5 h-5 rounded-full bg-slate-500 text-white flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
              实施地基线
            </span>
            <template v-for="(node, i) in envLine" :key="'e'+i">
              <div
                class="shrink-0 px-3 py-1.5 rounded-lg whitespace-nowrap flex flex-col items-start leading-tight"
                :class="i === envLine.length - 1 ? 'bg-emerald-50/70 border border-emerald-200/60' : 'bg-blue-50'"
              >
                <span class="text-[12px] font-medium flex items-center gap-1" :class="i === envLine.length - 1 ? 'text-emerald-700' : 'text-slate-600'">
                  <i v-if="i === envLine.length - 1" class="fa-solid fa-circle-check text-[10px]"></i>{{ node.label }}
                </span>
                <span class="text-[10px]" :class="i === envLine.length - 1 ? 'text-emerald-500' : 'text-slate-400'">{{ node.hint }}</span>
              </div>
              <i v-if="i < envLine.length - 1" class="fa-solid fa-arrow-right text-slate-300 text-[10px] shrink-0"></i>
            </template>
          </div>
          <div class="mt-3 pt-3 border-t border-blue-500/10 text-[11px] text-slate-400">
            <i class="fa-solid fa-circle-info mr-1"></i>两线并行、互不等待;<span class="text-slate-600 font-medium">两线齐备才起算交付天数</span>。任一线被甲方卡住 = 加时赛(先发邮件告知、暂停计时单独记)。
          </div>
        </div>

        <!-- FDE 五阶段工业化流水线(流程图:输出=下一阶段输入) -->
        <div class="stages-section flex flex-col flex-1 min-h-0">
          <div class="flex items-center justify-between mb-3 shrink-0">
            <h2 class="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-diagram-project text-blue-600"></i>FDE 五阶段工业化流水线
            </h2>
            <span class="text-[12px] text-slate-400">上一阶段的输出 = 下一阶段的输入 · 五阶段一条链</span>
          </div>

          <div v-if="loading" class="flex items-center justify-center flex-1 text-slate-400">
            <div class="w-8 h-8 rounded-full border-2 border-blue-500/14 border-t-blue-500 animate-spin"></div>
          </div>

          <!-- 横向流程图:五阶段卡片等比铺满整行,不换行、不横向滚动 -->
          <div v-else class="stages-row flex items-stretch gap-0 flex-1 min-h-0">
            <template v-for="(s, idx) in stages" :key="s.id">
              <button
                @click="activeStage = s"
                class="group stage-card text-left card rounded-2xl hover:border-blue-400 transition-all cursor-pointer relative flex flex-col flex-1 min-w-0 overflow-hidden"
                :class="s.ui?.accent || 'stage-blue'"
                style="box-shadow: var(--shadow-card-token)"
              >
                <!-- 头部:序号 + 图标 + 名称 + 目标 -->
                <div class="px-4 pt-4 pb-3.5">
                  <div class="flex items-center gap-2 mb-2.5">
                    <span class="stage-num shrink-0">{{ s.id }}</span>
                    <span class="stage-icon shrink-0"><i :class="s.ui?.icon || 'fa-solid fa-circle-nodes'"></i></span>
                  </div>
                  <div class="text-[14px] font-bold text-slate-800 leading-snug mb-2">{{ s.name }}</div>
                  <div class="flex flex-wrap gap-1.5 mb-2.5">
                    <span v-for="chip in (s.ui?.chips || [])" :key="chip" class="stage-chip">{{ chip }}</span>
                  </div>
                  <div class="text-[11.5px] text-slate-500 leading-relaxed">{{ s.goal }}</div>
                </div>

                <!-- 交付物 / 知识内化 -->
                <div class="px-4 pt-3 pb-3 mt-auto border-t border-blue-500/10">
                  <div class="text-[10.5px] text-slate-400 mb-1.5"><i class="fa-solid fa-box-open mr-1 stage-label-icon"></i>{{ s.ui?.listLabel || '交付物' }}</div>
                  <div class="space-y-1">
                    <div v-for="(d, di) in displayItems(s)" :key="di" class="text-[11px] text-slate-600 flex items-start gap-1.5 leading-snug">
                      <i class="fa-solid fa-circle stage-dot text-[4px] mt-1.5 shrink-0"></i>
                      <span>{{ d }}</span>
                    </div>
                  </div>
                </div>

                <!-- 底部:节奏 + 进入箭头 -->
                <div class="px-3.5 py-2 bg-blue-50/40 border-t border-blue-500/10 flex items-center gap-1.5 text-[10px] text-slate-400">
                  <i class="fa-solid fa-clock w-3 text-slate-300"></i>
                  <span class="truncate">{{ s.ui?.rhythmShort || s.rhythm || s.duration }}</span>
                  <i class="fa-solid fa-arrow-right ml-auto text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all"></i>
                </div>
              </button>
              <!-- 阶段间流转箭头 -->
              <div v-if="idx < stages.length - 1" class="flex items-center justify-center px-1 self-center shrink-0">
                <i class="fa-solid fa-chevron-right text-blue-600/40 text-sm"></i>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { FDE_STAGES } from '@/data/fde-stages';
import StageDetail from '@/components/workbench/StageDetail.vue';
import topHero from '@/assets/top.png';

const router = useRouter();
const stages = ref([]);
const activeStage = ref(null);
const loading = ref(true);

// 两条并行推进线(流程图节点)——取自手册"全流程一张图"
const demandLine = ['客户/行业需求', '①调研备弹', '②需求沟通·原型', '③需求确认·智能体', '④工作台上线', '⑤试用定稿', '沉淀复制'];
const envLine = [
  { label: '前期调研', hint: '网络/服务器/VPN' },
  { label: '系统与数据库确认', hint: 'HIS/LIS/EMR/账号' },
  { label: 'SDR表结构设计', hint: '0→1 底层逻辑' },
  { label: '建表SQL与部署', hint: '执行SQL/安装SDR' },
  { label: 'SDR试点验证', hint: '数据接入/指标跑通' },
  { label: 'SAAS平台配置', hint: '租户/账号/权限' },
  { label: '智能体部署接入', hint: '参数/SDR数据源' },
  { label: '试用培训与验收', hint: '反馈/修复/交付' },
];

const stageUi = {
  1: { icon: 'fa-solid fa-brain', accent: 'stage-blue', chips: ['调研备弹', '知识内化'], listLabel: '知识内化', rhythmShort: '进场前准备' },
  2: { icon: 'fa-solid fa-file-lines', accent: 'stage-blue', chips: ['结构化沟通', '原型收敛'], listLabel: '交付物', rhythmShort: '2+1 · 需求收敛' },
  3: { icon: 'fa-solid fa-diagram-project', accent: 'stage-blue', chips: ['需求签字', '智能体矩阵'], listLabel: '交付物', rhythmShort: '2+1 的 1 · 签字定稿' },
  4: { icon: 'fa-solid fa-desktop', accent: 'stage-green', chips: ['工作台上线', '真实数据接入'], listLabel: '交付物', rhythmShort: '3/7/14 · 两线齐备后起算' },
  5: { icon: 'fa-solid fa-rocket', accent: 'stage-purple', chips: ['客户试用', '三轮定稿'], listLabel: '交付物', rhythmShort: '2–4 周 · 三轮定稿' },
};

const displayItems = (stage) => {
  if (stage.id === 1) return stage.internalize || [];
  return (stage.deliverables || []).map((d) => d.name);
};

// 合并 fde-stages.js(阶段语义)与 manifest(实际文件)
const buildStages = (manifest) => {
  const manifestByDir = {};
  (manifest?.stages || []).forEach((s) => { manifestByDir[s.id] = s; });
  return FDE_STAGES.map((base) => {
    const m = manifestByDir[base.id] || {};
    return {
      ...base,
      dir: m.dir || String(base.id).padStart(2, '0'),
      items: m.items || [],
      counts: m.counts || { knowledge: 0, deliverable: 0 },
      ui: stageUi[base.id] || {},
    };
  });
};

const goCoach = () => {
  router.push({ path: '/chat', query: { coach: '1' } });
};

onMounted(async () => {
  try {
    const res = await window.api.handbook.getManifest();
    stages.value = buildStages(res?.success ? res.data : null);
  } catch (e) {
    stages.value = buildStages(null);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* 门户一屏自适应:内边距与块间距随视口收缩,整体不滚动 */
.portal-inner {
  padding: clamp(12px, 2.2vh, 24px) clamp(16px, 3vw, 40px);
  gap: clamp(10px, 1.8vh, 20px);
}

/* Hero 随高度收缩 */
.hero {
  padding: clamp(14px, 2.4vh, 24px) clamp(20px, 2.6vw, 32px);
  min-height: clamp(128px, 16vh, 170px);
  background: linear-gradient(120deg, #f4f8ff 0%, #eef4ff 46%, #e8f0ff 100%);
}
.hero-bg {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: min(58%, 880px);
  background-position: right center;
  background-size: cover;
  background-repeat: no-repeat;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 34%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 34%);
  pointer-events: none;
}
.hero-copy {
  max-width: 64%;
}
.hero-title {
  font-size: clamp(17px, 2.1vh, 24px);
}
.hero-desc {
  font-size: clamp(11px, 1.4vh, 13px);
}
/* 窗口很矮时收起 Hero 描述文字,优先保证卡片一屏可读 */
@media (max-height: 640px) {
  .hero-desc {
    display: none;
  }
}

/* 五阶段卡片行:等比铺满,阶段间箭头不占据弹性宽度 */
.stages-row > .flex.items-center {
  flex: 0 0 auto;
}
.stage-card {
  min-height: 100%;
}
.stage-num {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2563eb;
}
.stage-icon {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  background: #eff4ff;
  color: #2563eb;
}
.stage-chip {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 6px;
  font-weight: 500;
  background: #eff4ff;
  color: #1d4ed8;
}
.stage-label-icon,
.stage-dot {
  color: rgba(37, 99, 235, .7);
}
.stage-green .stage-num { background: #0ea5a0; }
.stage-green .stage-icon { background: #e6faf8; color: #0d9488; }
.stage-green .stage-chip { background: #e6faf8; color: #0d9488; }
.stage-green .stage-label-icon,
.stage-green .stage-dot { color: #0d9488; }
.stage-purple .stage-num { background: #7c3aed; }
.stage-purple .stage-icon { background: #f3edff; color: #7c3aed; }
.stage-purple .stage-chip { background: #f3edff; color: #7c3aed; }
.stage-purple .stage-label-icon,
.stage-purple .stage-dot { color: #7c3aed; }

@media (max-width: 1180px) {
  .hero-bg { display: none; }
  .hero-copy { max-width: 100%; }
}
</style>
