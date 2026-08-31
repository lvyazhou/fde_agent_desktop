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
          <h2 class="text-lg font-bold text-slate-800">你好，我是 FDE产品设计</h2>
        </div>

        <!-- Capability description lines -->
        <p class="text-xs text-slate-500 text-center mb-2">FDE 项目经理的五阶段作战工作台 —— 从客户一句话到上线定稿:</p>
        <div class="text-center space-y-1 mb-2 max-w-2xl">
          <p class="text-[11px] text-slate-500 leading-relaxed">
            <span class="text-amber-500">①</span> <b class="text-slate-700">调研备弹</b> ·
            <span class="text-blue-500">②</span> <b class="text-slate-700">需求沟通+原型</b>(对接确认表→PRD→可交互原型) ·
            <span class="text-violet-500">③</span> <b class="text-slate-700">需求确认+智能体设计</b>
          </p>
          <p class="text-[11px] text-slate-500 leading-relaxed">
            <span class="text-teal-500">④</span> <b class="text-slate-700">纳米Work 工作台上线</b> ·
            <span class="text-rose-500">⑤</span> <b class="text-slate-700">客户试用+定稿</b> —— 每阶段输出即交付物,一环扣一环
          </p>
        </div>
        <p class="text-[10px] text-slate-400 mb-5">新建 FDE 项目按阶段推进,或在下方直接提问:</p>

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
    <div class="shrink-0 px-6 pb-3 pt-2 bg-white">
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
    key: 'stage1',
    label: '① 调研备弹',
    icon: 'fa-solid fa-book',
    quickQuestions: [
      '这个行业有哪些政策/术语我该先备弹？',
      '给我一套结构化调研的六项框架',
      '进场破冰和 SPIN 挖痛点的话术',
    ],
  },
  {
    key: 'stage2',
    label: '② 需求·原型',
    icon: 'fa-solid fa-list-check',
    quickQuestions: [
      '根据对接确认表生成六字段功能清单',
      '按 PRD 三层(目标/功能/交互)整理需求',
      '基于功能清单生成可交互原型',
    ],
  },
  {
    key: 'stage3',
    label: '③ 需求·智能体',
    icon: 'fa-solid fa-diagram-project',
    quickQuestions: [
      '把这条业务链路拆成智能体矩阵',
      '帮我填一个智能体的设计表(身份卡+五层拆解)',
      '需求签字后把 PRD 和原型升级为定稿版',
    ],
  },
  {
    key: 'stage4',
    label: '④ 工作台上线',
    icon: 'fa-solid fa-server',
    quickQuestions: [
      '从功能清单反推 ER 数据模型',
      '这个功能该关联哪个智能体、依赖哪些数据表？',
      '梳理一份项目进度表',
    ],
  },
  {
    key: 'stage5',
    label: '⑤ 试用定稿',
    icon: 'fa-solid fa-clipboard-check',
    quickQuestions: [
      '把客户反馈按功能缺失/逻辑不通/体验问题分类',
      '整理一份三轮迭代记录',
      '30/60/90 天使用率盯防怎么做',
    ],
  },
  {
    key: 'export',
    label: '交付物导出',
    icon: 'fa-solid fa-download',
    quickQuestions: [
      '导出功能清单为 Word',
      '导出完整项目为 ZIP',
    ],
  },
  {
    key: 'iterate',
    label: '原型迭代',
    icon: 'fa-solid fa-rotate',
    quickQuestions: [
      '把导航改成侧边栏布局',
      '给表格增加搜索和筛选',
      '调整配色,更专业一些',
    ],
  },
  {
    key: 'general',
    label: '通用提问',
    icon: 'fa-solid fa-message',
    quickQuestions: [
      '帮我写一份需求确认表',
      '这个方案的可行性分析',
      '给我一些 UI 设计建议',
    ],
  },
];
</script>
