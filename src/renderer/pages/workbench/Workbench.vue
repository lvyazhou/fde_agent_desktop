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
      <div class="portal-inner w-full h-full flex flex-col">
        <!-- Hero:平台是什么 / 为什么做 -->
        <div class="hero rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden shrink-0">
          <div class="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-white/10 blur-2xl"></div>
          <div class="absolute right-20 bottom-0 w-40 h-40 rounded-full bg-indigo-400/20 blur-2xl"></div>
          <div class="relative flex items-start justify-between gap-6 flex-wrap">
            <div class="min-w-0 flex-1">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[12px] font-medium mb-2 backdrop-blur">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                FDE 五阶段作战工作台
              </div>
              <h1 class="hero-title font-bold mb-1.5 leading-snug">把「客户要 AI」翻译成「能落地的行业工作台」</h1>
              <p class="hero-desc text-blue-50/90 leading-relaxed max-w-4xl">
                FDE 项目经理的作战指挥台。把一次商业化 AI 交付拆成五个前后咬合的阶段——
                <span class="font-semibold text-white">调研备弹 → 需求原型 → 智能体设计 → 工作台上线 → 试用定稿</span>,
                每阶段的知识库、话术、交付物模板都在这里预览取用。
              </p>
            </div>
            <button
              @click="goCoach"
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 text-[13px] font-semibold hover:bg-blue-50 transition-colors cursor-pointer shadow-sm shrink-0"
            >
              <i class="fa-solid fa-headset"></i>
              <span>找 FDE 教练陪练聊需求</span>
            </button>
          </div>
        </div>

        <!-- 两条线并行推进(流程图) -->
        <div class="bg-white rounded-2xl border border-slate-200/70 p-5 shrink-0">
          <div class="flex items-center justify-between mb-4">
            <div class="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
              <i class="fa-solid fa-route text-blue-500"></i>两条线并行推进
            </div>
            <div class="flex items-center gap-2.5 text-[11px]">
              <span
                class="group/badge relative flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-100 cursor-help transition-colors hover:bg-indigo-100/80"
                title="节奏卡点：全程只跟甲方碰 2 次面 + 1 次签字确认出原型，逼自己一次性问清、避免反复拉扯"
              >
                <span class="w-9 h-7 flex items-center justify-center rounded-lg bg-indigo-600 text-white font-mono font-bold text-[13px] shrink-0">2+1</span>
                <span class="flex flex-col leading-tight">
                  <span class="text-indigo-700 font-semibold text-[11px]">2 次对接 + 1 次签字</span>
                  <span class="text-indigo-400 text-[10px]">碰 2 次面即出原型</span>
                </span>
              </span>
              <span
                class="group/badge relative flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-100 cursor-help transition-colors hover:bg-blue-100/80"
                title="交付时限：按项目大小定死交付天数——小项目 3 天 / 中 7 天 / 大 14 天，两线齐备才起算"
              >
                <span class="w-9 h-7 flex items-center justify-center rounded-lg bg-blue-600 text-white font-mono font-bold text-[12px] shrink-0">3/7/14</span>
                <span class="flex flex-col leading-tight">
                  <span class="text-blue-700 font-semibold text-[11px]">小 3 / 中 7 / 大 14 天</span>
                  <span class="text-blue-400 text-[10px]">按规模定交付时限</span>
                </span>
              </span>
            </div>
          </div>
          <!-- 需求主线 -->
          <div class="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
            <span class="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 w-24">
              <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
              需求主线
            </span>
            <template v-for="(node, i) in demandLine" :key="'d'+i">
              <div class="shrink-0 px-3 py-2 rounded-lg bg-blue-50/70 text-[12px] text-blue-800 whitespace-nowrap">{{ node }}</div>
              <i v-if="i < demandLine.length - 1" class="fa-solid fa-arrow-right text-blue-300 text-[10px] shrink-0"></i>
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
                :class="i === envLine.length - 1 ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'"
              >
                <span class="text-[12px] font-medium flex items-center gap-1" :class="i === envLine.length - 1 ? 'text-emerald-700' : 'text-slate-600'">
                  <i v-if="i === envLine.length - 1" class="fa-solid fa-circle-check text-[10px]"></i>{{ node.label }}
                </span>
                <span class="text-[10px]" :class="i === envLine.length - 1 ? 'text-emerald-500' : 'text-slate-400'">{{ node.hint }}</span>
              </div>
              <i v-if="i < envLine.length - 1" class="fa-solid fa-arrow-right text-slate-300 text-[10px] shrink-0"></i>
            </template>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            <i class="fa-solid fa-circle-info mr-1"></i>两线并行、互不等待;<span class="text-slate-600 font-medium">两线齐备才起算交付天数</span>。任一线被甲方卡住 = 加时赛(先发邮件告知、暂停计时单独记)。
          </div>
        </div>

        <!-- 五阶段作战链(流程图:输出=下一阶段输入) -->
        <div class="stages-section flex flex-col flex-1 min-h-0">
          <div class="flex items-center justify-between mb-3 shrink-0">
            <h2 class="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-diagram-project text-blue-500"></i>五阶段作战链
            </h2>
            <span class="text-[12px] text-slate-400">上一阶段的输出 = 下一阶段的输入 · 点击进入阶段</span>
          </div>

          <div v-if="loading" class="flex items-center justify-center flex-1 text-slate-400">
            <div class="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin"></div>
          </div>

          <!-- 横向流程图:五阶段卡片等比铺满整行,不换行、不横向滚动 -->
          <div v-else class="stages-row flex items-stretch gap-0 flex-1 min-h-0">
            <template v-for="(s, idx) in stages" :key="s.id">
              <button
                @click="activeStage = s"
                class="group text-left bg-white rounded-2xl border border-slate-200/70 hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5 transition-all cursor-pointer relative flex flex-col flex-1 min-w-0 overflow-hidden"
              >
                <!-- 头部 -->
                <div class="px-4 pt-4 pb-3 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[12px] font-bold flex items-center justify-center shadow-sm">{{ s.id }}</span>
                      <span class="text-[13px] font-semibold text-slate-800">{{ s.name }}</span>
                    </div>
                    <span v-if="s.isCore" class="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-semibold">核心</span>
                    <span v-else-if="s.id === 1" class="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-semibold">可陪练</span>
                  </div>
                  <div class="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{{ s.goal }}</div>
                </div>

                <!-- 输入 -->
                <div class="px-4 py-2.5 border-b border-slate-50">
                  <div class="text-[10px] text-slate-400 mb-1"><i class="fa-solid fa-arrow-right-to-bracket mr-1"></i>输入</div>
                  <div class="flex flex-wrap gap-1">
                    <span v-for="inp in (s.inputs || [])" :key="inp" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">{{ inp }}</span>
                    <span v-if="!(s.inputs || []).length" class="text-[10px] text-slate-300">—</span>
                  </div>
                </div>

                <!-- 输出交付物 -->
                <div class="px-4 py-2.5 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                  <div class="text-[10px] text-slate-400 mb-1.5"><i class="fa-solid fa-box-open mr-1 text-blue-400"></i>交付物</div>
                  <div class="space-y-1.5">
                    <div v-for="(d, di) in (s.deliverables || [])" :key="di" class="text-[11px] text-slate-600 flex items-start gap-1.5 leading-snug">
                      <i class="fa-solid fa-circle text-blue-300 text-[4px] mt-1.5 shrink-0"></i>
                      <span>{{ d.name }}</span>
                    </div>
                    <div v-if="!(s.deliverables || []).length" class="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <i class="fa-solid fa-graduation-cap text-[10px]"></i>知识内化,无交付物
                    </div>
                  </div>
                </div>

                <!-- 成功标准 -->
                <div class="px-4 py-2.5 border-t border-slate-50">
                  <div class="text-[10px] text-slate-400 mb-1"><i class="fa-solid fa-circle-check mr-1 text-emerald-400"></i>过关标准</div>
                  <div class="text-[10px] text-slate-500 leading-snug line-clamp-2">{{ s.successCriteria }}</div>
                </div>

                <!-- 底部:负责人 + 周期 -->
                <div class="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 text-[10px] text-slate-400 space-y-0.5">
                  <div class="flex items-center gap-1.5 truncate"><i class="fa-solid fa-user-gear w-3 text-slate-300"></i><span class="truncate">{{ s.owner }}</span></div>
                  <div class="flex items-center gap-1.5"><i class="fa-solid fa-clock w-3 text-slate-300"></i><span class="truncate">{{ s.rhythm || s.duration }}</span>
                    <i class="fa-solid fa-arrow-right ml-auto text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all"></i>
                  </div>
                </div>
              </button>
              <!-- 阶段间流转箭头 -->
              <div v-if="idx < stages.length - 1" class="flex items-center justify-center px-1 self-center shrink-0">
                <i class="fa-solid fa-chevron-right text-slate-300 text-sm"></i>
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
