<template>
  <div class="flex-1 flex items-center justify-center p-8 overflow-y-auto">
    <div class="w-full max-w-2xl">
      <!-- Back link -->
      <RouterLink
        to="/projects"
        class="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-700 mb-8 transition-colors"
      >
        <i class="fa-solid fa-arrow-left text-xs"></i>
        <span>返回项目列表</span>
      </RouterLink>

      <!-- Main card -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <!-- Icon -->
        <div class="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
          <i class="fa-solid fa-wand-magic-sparkles text-2xl text-blue-700"></i>
        </div>

        <h1 class="text-2xl font-bold text-slate-800 mb-2">新建 FDE 项目</h1>
        <p class="text-sm text-slate-500 mb-8">
          填入客户需求或对接确认表要点,进入五阶段作战工作台 —— 从需求沟通到原型、智能体设计、上线定稿
        </p>

        <!-- Textarea -->
        <div class="mb-6">
          <textarea
            v-model="requirement"
            rows="4"
            :placeholder="'例如:为某三甲医院运营部做门诊量异动归因智能体 —— 主任发现指标异常时,自动取数、归因、出建议'"
            class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
            :disabled="submitting"
            @keydown.ctrl.enter="handleSubmit"
          ></textarea>
          <p class="text-xs text-slate-400 mt-2">
            <i class="fa-solid fa-lightbulb text-amber-400 mr-1"></i>
            提示:需求/对接确认表越详细,阶段②生成的功能清单、PRD 与原型越贴近客户预期
          </p>
        </div>

        <!-- Submit button -->
        <button
          @click="handleSubmit"
          :disabled="!requirement.trim() || submitting"
          class="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          <template v-if="submitting">
            <i class="fa-solid fa-spinner fa-spin text-xs"></i>
            <span>正在创建...</span>
          </template>
          <template v-else>
            <i class="fa-solid fa-rocket text-xs"></i>
            <span>创建 FDE 项目</span>
          </template>
        </button>

        <!-- Keyboard hint -->
        <p class="text-center text-xs text-slate-400 mt-3">
          Ctrl + Enter 快速提交
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const requirement = ref('');
const submitting = ref(false);

const handleSubmit = async () => {
  const text = requirement.value.trim();
  if (!text || submitting.value) return;

  submitting.value = true;
  try {
    const name = text.slice(0, 20) + (text.length > 20 ? '...' : '');
    const result = await window.api.hermes.createProject({ name, requirement: text });
    if (result && result.slug) {
      router.push(`/projects/${result.slug}`);
    }
  } catch (e) {
    console.error('Failed to create project:', e);
    submitting.value = false;
  }
};
</script>
