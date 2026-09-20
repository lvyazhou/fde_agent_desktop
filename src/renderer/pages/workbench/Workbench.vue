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
    <div v-else class="portal paper-grain h-full overflow-hidden">
      <div class="portal-inner relative z-[1] w-full h-full flex flex-col">
        <!-- Hero:平台是什么 / 为什么做 -->
        <div class="hero rounded-2xl bg-white border border-paper-line/70 relative overflow-hidden shrink-0" style="box-shadow: 0 1px 2px rgba(15,23,41,.05)">
          <!-- 左侧棕色竖条:替代原来的整块黑底,强调但不压迫 -->
          <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-brass"></div>
          <div class="relative flex items-start justify-between gap-6 flex-wrap">
            <div class="min-w-0 flex-1">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paper-faint text-[12px] font-medium text-brass mb-2">
                <img src="../../assets/logo.png" alt="Logo" class="w-4 h-4 rounded object-cover" />
                FDE 五阶段作战工作台
              </div>
              <h1 class="hero-title font-bold mb-1.5 leading-snug text-slate-800">把「客户要 AI」翻译成「能落地的行业工作台」</h1>
              <p class="hero-desc text-slate-500 leading-relaxed max-w-4xl">
                FDE 项目经理的作战指挥台。把一次商业化 AI 交付拆成五个前后咬合的阶段——
                <span class="font-semibold text-brass">调研备弹 → 需求原型 → 智能体设计 → 工作台上线 → 试用定稿</span>,
                每阶段的知识库、话术、交付物模板都在这里预览取用。
              </p>
            </div>
            <button
              @click="goCoach"
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brass text-white text-[13px] font-semibold hover:bg-brass-deep transition-colors cursor-pointer shrink-0"
            >
              <i class="fa-solid fa-headset"></i>
              <span>找 FDE 教练陪练聊需求</span>
            </button>
          </div>
        </div>

        <!-- 两条线并行推进(流程图) -->
        <div class="bg-white rounded-2xl border border-paper-line/70 p-5 shrink-0">
          <div class="flex items-center justify-between mb-4">
            <div class="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
              <i class="fa-solid fa-route text-brass"></i>两条线并行推进
            </div>
            <div class="flex items-center gap-2.5 text-[11px]">
              <span
                class="group/badge relative flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl bg-paper-faint border border-paper-line/70 cursor-help transition-colors hover:bg-paper-line/40"
                title="节奏卡点：全程只跟甲方碰 2 次面 + 1 次签字确认出原型，逼自己一次性问清、避免反复拉扯"
              >
                <span class="w-9 h-7 flex items-center justify-center rounded-lg bg-brass-deep text-white font-mono font-bold text-[13px] shrink-0">2+1</span>
                <span class="flex flex-col leading-tight">
                  <span class="text-slate-700 font-semibold text-[11px]">2 次对接 + 1 次签字</span>
                  <span class="text-slate-400 text-[10px]">碰 2 次面即出原型</span>
                </span>
              </span>
              <span
                class="group/badge relative flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl bg-paper-faint border border-paper-line/70 cursor-help transition-colors hover:bg-paper-line/40"
                title="交付时限：按项目大小定死交付天数——小项目 3 天 / 中 7 天 / 大 14 天，两线齐备才起算"
              >
                <span class="w-9 h-7 flex items-center justify-center rounded-lg bg-brass text-white font-mono font-bold text-[12px] shrink-0">3/7/14</span>
                <span class="flex flex-col leading-tight">
                  <span class="text-slate-700 font-semibold text-[11px]">小 3 / 中 7 / 大 14 天</span>
                  <span class="text-slate-400 text-[10px]">按规模定交付时限</span>
                </span>
              </span>
            </div>
          </div>
          <!-- 需求主线 -->
          <div class="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
            <span class="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 w-24">
              <span class="w-5 h-5 rounded-full bg-brass-deep text-white flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
              需求主线
            </span>
            <template v-for="(node, i) in demandLine" :key="'d'+i">
              <div class="shrink-0 px-3 py-2 rounded-lg bg-paper-faint text-[12px] text-slate-700 whitespace-nowrap">{{ node }}</div>
              <i v-if="i < demandLine.length - 1" class="fa-solid fa-arrow-right text-brass/50 text-[10px] shrink-0"></i>
            </template>
          </div>
          <!-- 环境地基线 -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1">
            <span class="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 w-24">
              <span class="w-5 h-5 rounded-full bg-slate-500 text-white flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
              环境地基线
            </span>
            <template v-for="(node, i) in envLine" :key="'e'+i">
              <div
                class="shrink-0 px-3 py-1.5 rounded-lg whitespace-nowrap flex flex-col items-start leading-tight"
                :class="i === envLine.length - 1 ? 'bg-emerald-50/70 border border-emerald-200/60' : 'bg-paper-faint'"
              >
                <span class="text-[12px] font-medium flex items-center gap-1" :class="i === envLine.length - 1 ? 'text-emerald-700' : 'text-slate-600'">
                  <i v-if="i === envLine.length - 1" class="fa-solid fa-circle-check text-[10px]"></i>{{ node.label }}
                </span>
                <span class="text-[10px]" :class="i === envLine.length - 1 ? 'text-emerald-500' : 'text-slate-400'">{{ node.hint }}</span>
              </div>
              <i v-if="i < envLine.length - 1" class="fa-solid fa-arrow-right text-slate-300 text-[10px] shrink-0"></i>
            </template>
          </div>
          <div class="mt-3 pt-3 border-t border-paper-line/50 text-[11px] text-slate-400">
            <i class="fa-solid fa-circle-info mr-1"></i>两线并行、互不等待;<span class="text-slate-600 font-medium">两线齐备才起算交付天数</span>。任一线被甲方卡住 = 加时赛(先发邮件告知、暂停计时单独记)。
          </div>
        </div>

        <!-- 五阶段作战链(流程图:输出=下一阶段输入) -->
        <div class="stages-section flex flex-col flex-1 min-h-0">
          <div class="flex items-center justify-between mb-3 shrink-0">
            <h2 class="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-diagram-project text-brass"></i>五阶段作战链
            </h2>
            <span class="text-[12px] text-slate-400">上一阶段的输出 = 下一阶段的输入 · 点击进入阶段</span>
          </div>

          <div v-if="loading" class="flex items-center justify-center flex-1 text-slate-400">
            <div class="w-8 h-8 rounded-full border-2 border-paper-line border-t-brass animate-spin"></div>
          </div>

          <!-- 横向流程图:五阶段卡片等比铺满整行,不换行、不横向滚动 -->
          <div v-else class="stages-row flex items-stretch gap-0 flex-1 min-h-0">
            <template v-for="(s, idx) in stages" :key="s.id">
              <button
                @click="activeStage = s"
                class="group text-left bg-white rounded-2xl border border-paper-line/70 hover:border-brass/45 transition-all cursor-pointer relative flex flex-col flex-1 min-w-0 overflow-hidden"
                style="box-shadow: 0 1px 2px rgba(15,23,41,.05)"
              >
                <!-- 头部:序号 + 名称 + 目标 -->
                <div class="px-4 pt-4 pb-3.5">
                  <div class="flex items-center gap-2 mb-2.5">
                    <span class="w-7 h-7 rounded-lg bg-brass-deep text-white text-[12px] font-bold flex items-center justify-center shrink-0">{{ s.id }}</span>
                    <span v-if="s.isCore" class="text-[9px] px-1.5 py-0.5 rounded bg-brass/12 text-brass font-semibold">核心</span>
                    <span v-else-if="s.id === 1" class="text-[9px] px-1.5 py-0.5 rounded bg-paper-faint text-slate-500 font-semibold">可陪练</span>
                  </div>
                  <div class="text-[13px] font-semibold text-slate-800 leading-snug mb-1.5">{{ s.name }}</div>
                  <div class="text-[11px] text-slate-500 leading-relaxed">{{ s.goal }}</div>
                </div>

                <!-- 交付物:卡片唯一的清单区,给足高度不滚动 -->
                <div class="px-4 pt-3 pb-3 mt-auto border-t border-paper-line/50">
                  <div class="text-[10px] text-slate-400 mb-1.5"><i class="fa-solid fa-box-open mr-1 text-brass/70"></i>交付物</div>
                  <div class="space-y-1">
                    <div v-for="(d, di) in (s.deliverables || [])" :key="di" class="text-[11px] text-slate-600 flex items-start gap-1.5 leading-snug">
                      <i class="fa-solid fa-circle text-brass/40 text-[4px] mt-1.5 shrink-0"></i>
                      <span>{{ d.name }}</span>
                    </div>
                    <div v-if="!(s.deliverables || []).length" class="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <i class="fa-solid fa-graduation-cap text-[10px]"></i>知识内化,无交付物
                    </div>
                  </div>
                </div>

                <!-- 底部:节奏 + 进入箭头 -->
                <div class="px-4 py-2.5 bg-paper-faint/60 border-t border-paper-line/50 flex items-center gap-1.5 text-[10px] text-slate-400">
                  <i class="fa-solid fa-clock w-3 text-slate-300"></i>
                  <span class="truncate">{{ s.rhythm || s.duration }}</span>
                  <i class="fa-solid fa-arrow-right ml-auto text-slate-300 group-hover:text-brass group-hover:translate-x-0.5 transition-all"></i>
                </div>
              </button>
              <!-- 阶段间流转箭头 -->
              <div v-if="idx < stages.length - 1" class="flex items-center justify-center px-1 self-center shrink-0">
                <i class="fa-solid fa-chevron-right text-brass/40 text-sm"></i>
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

const router = useRouter();
const stages = ref([]);
const activeStage = ref(null);
const loading = ref(true);

// 两条并行推进线(流程图节点)——取自手册"全流程一张图"
const demandLine = ['客户/行业需求', '①调研备弹', '②需求沟通·原型', '③需求确认·智能体', '④工作台上线', '⑤试用定稿', '沉淀复制'];
const envLine = [
  { label: '摸底踩点', hint: '摸网络拓扑' },
  { label: '开 VPN', hint: '问信息科要账号' },
  { label: '部署基础服务', hint: '部署智能体数据基座' },
  { label: '底座就绪', hint: '全部 ready' },
];

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
</style>
