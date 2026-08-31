<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Scrollable content area -->
    <div class="flex-1 overflow-y-auto">
      <div class="flex flex-col items-center px-6 py-6 max-w-4xl mx-auto">
        <!-- Header: avatar + title -->
        <div class="flex items-center gap-3 mb-3">
          <div class="w-11 h-11 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
            <i class="fa-solid fa-robot text-blue-600 text-lg"></i>
          </div>
          <h2 class="text-lg font-bold text-slate-800">你好，我是 AI 产品设计智能体</h2>
        </div>

        <!-- Capability description lines -->
        <p class="text-xs text-slate-500 text-center mb-2">基于你的需求，一站式搞定产品功能清单和 HTML 原型设计：</p>
        <div class="text-center space-y-1 mb-2 max-w-2xl">
          <p class="text-[11px] text-slate-500 leading-relaxed">
            <span class="text-amber-500">💡</span> <b class="text-slate-700">头脑风暴</b>：需求分析、竞品调研、用户痛点挖掘 ·
            <span class="text-blue-500">📋</span> <b class="text-slate-700">功能清单</b>：模块拆解、优先级排序、MVP 规划
          </p>
          <p class="text-[11px] text-slate-500 leading-relaxed">
            <span class="text-violet-500">🎨</span> <b class="text-slate-700">原型生成</b>：HTML 可点击原型、响应式布局、数据可视化 ·
            <span class="text-teal-500">🔄</span> <b class="text-slate-700">原型迭代</b>：自然语言驱动修改
          </p>
        </div>
        <p class="text-[10px] text-slate-400 mb-5">按场景选择，或直接在下方输入问题：</p>

        <!-- Feature cards: 4 cols x 2 rows -->
        <div class="w-full grid grid-cols-4 gap-3">
          <div
            v-for="card in featureCards"
            :key="card.key"
            class="bg-white rounded-xl border border-slate-200/80 hover:shadow-lg hover:border-blue-300 transition-all px-4 py-3 group"
          >
            <!-- Card header -->
            <div class="flex items-center gap-2 mb-2.5">
              <div class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <i :class="card.icon" class="text-[11px] text-blue-600"></i>
              </div>
              <span class="text-[12px] font-bold text-slate-800">{{ card.label }}</span>
            </div>
            <!-- Quick questions -->
            <div class="space-y-1">
              <div
                v-for="(q, qi) in card.quickQuestions"
                :key="qi"
                @click="fillInput(q)"
                class="flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 transition-colors cursor-pointer group/item"
                :title="q"
              >
                <span class="flex-1 truncate">{{ q }}</span>
                <i class="fa-solid fa-arrow-right text-[8px] text-slate-300 group-hover/item:text-blue-500 shrink-0 transition-colors"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Fixed bottom input area -->
    <div class="shrink-0 px-6 pb-3 pt-2 bg-[#f0f4f8]">
      <div class="max-w-3xl mx-auto">
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <textarea
            ref="inputRef"
            v-model="inputText"
            placeholder="向智能体提问；输入 / 触发提示词；Ctrl+Enter 发送"
            rows="2"
            class="w-full resize-none text-[13px] text-slate-700 placeholder-slate-400 bg-transparent focus:outline-none leading-relaxed px-4 pt-3 pb-1"
            @keydown.ctrl.enter.prevent="handleSend"
            @keydown.meta.enter.prevent="handleSend"
          ></textarea>
          <!-- Attachment preview -->
          <div v-if="attachments.length > 0" class="flex items-center gap-2 px-4 py-1.5 flex-wrap">
            <div v-for="(att, ai) in attachments" :key="ai" class="relative group/att">
              <img :src="'data:' + att.media_type + ';base64,' + att.data" class="w-12 h-12 object-cover rounded-lg border border-slate-200" />
              <button @click="attachments.splice(ai, 1)" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity cursor-pointer">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between px-4 pb-2.5">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors">
                <i class="fa-solid fa-globe text-[9px]"></i>
                MiniMax
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[10px] text-blue-600 cursor-pointer hover:bg-blue-100 transition-colors">
                <i class="fa-solid fa-robot text-[9px]"></i>
                AI 产品设计智能体
                <i class="fa-solid fa-chevron-down text-[7px] ml-0.5"></i>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button @click="pickImage" class="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors cursor-pointer" title="上传图片">
                <i class="fa-solid fa-paperclip text-xs"></i>
              </button>
              <button
                @click="handleSend"
                :disabled="!inputText.trim()"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                :class="inputText.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm' : 'bg-slate-100 text-slate-300 cursor-not-allowed'"
              >
                <i class="fa-solid fa-arrow-up text-xs"></i>
              </button>
            </div>
          </div>
        </div>
        <p class="text-center text-[9px] text-slate-400 mt-1.5">内容由 AI 生成，请仔细甄别；Ctrl + Enter 发送，Shift + Enter 换行</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['send-quick', 'navigate', 'fill-input', 'send-with-attachments']);

const inputText = ref('');
const inputRef = ref(null);
const attachments = ref([]);

const pickImage = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = (e) => {
    for (const file of e.target.files) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(',')[1];
        const mediaType = file.type || 'image/png';
        attachments.value.push({ type: 'image', data: base64, media_type: mediaType, name: file.name });
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
};

const fillInput = (text) => {
  inputText.value = text;
  inputRef.value?.focus();
};

const handleSend = () => {
  const text = inputText.value.trim();
  if (!text && attachments.value.length === 0) return;
  if (attachments.value.length > 0) {
    emit('send-with-attachments', text || '请分析这张图片', [...attachments.value]);
  } else {
    emit('send-quick', text);
  }
  inputText.value = '';
  attachments.value = [];
};

const featureCards = [
  {
    key: 'brainstorming',
    label: '头脑风暴',
    icon: 'fa-solid fa-lightbulb',
    quickQuestions: [
      '帮我分析一下这个产品方向的可行性',
      '有哪些竞品可以参考？',
      '用户的核心痛点是什么？',
    ],
  },
  {
    key: 'spec',
    label: '功能清单',
    icon: 'fa-solid fa-list-check',
    quickQuestions: [
      '根据讨论生成完整的功能清单',
      '帮我梳理核心功能模块',
      '哪些功能是 MVP 必须的？',
    ],
  },
  {
    key: 'prototype',
    label: '原型生成',
    icon: 'fa-solid fa-palette',
    quickQuestions: [
      '基于功能清单生成 HTML 原型',
      '先生成首页和核心流程页面',
      '用现代简约风格设计界面',
    ],
  },
  {
    key: 'iterate',
    label: '原型迭代',
    icon: 'fa-solid fa-rotate',
    quickQuestions: [
      '把导航改成侧边栏布局',
      '给表格增加搜索和筛选功能',
      '调整配色方案，更专业一些',
    ],
  },
  {
    key: 'export',
    label: '项目导出',
    icon: 'fa-solid fa-download',
    quickQuestions: [
      '导出完整项目为 ZIP',
      '导出功能清单为 Word',
    ],
  },
  {
    key: 'general',
    label: '通用提问',
    icon: 'fa-solid fa-message',
    quickQuestions: [
      '帮我写一份产品需求文档',
      '分析一下技术可行性',
      '给我一些 UI 设计建议',
    ],
  },
  {
    key: 'market',
    label: '市场分析',
    icon: 'fa-solid fa-chart-line',
    quickQuestions: [
      '分析目标市场的竞争格局',
      '用户画像是什么样的？',
      '商业模式建议',
    ],
  },
  {
    key: 'tech',
    label: '技术方案',
    icon: 'fa-solid fa-code',
    quickQuestions: [
      '推荐适合的技术栈',
      '系统架构该怎么设计？',
      '有哪些技术风险？',
    ],
  },
];
</script>
