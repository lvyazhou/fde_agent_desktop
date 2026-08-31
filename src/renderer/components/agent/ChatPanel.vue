<template>
  <div class="flex-1 flex flex-col min-w-0 relative bg-[#f0f4f8]">
    <!-- Messages area -->
    <div ref="chatContainerRef" class="flex-1 overflow-y-auto px-4 pt-5" :class="messages.length > 0 ? 'pb-[160px]' : ''">
      <!-- Loading state -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-24">
        <div class="relative w-12 h-12 mb-5">
          <div class="absolute inset-0 rounded-full border-2 border-blue-100"></div>
          <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin"></div>
          <div class="absolute inset-2 rounded-full bg-white flex items-center justify-center">
            <i class="fa-solid fa-comments text-blue-400 text-sm"></i>
          </div>
        </div>
        <p class="text-sm text-slate-500 font-medium">正在加载对话记录...</p>
        <p class="text-[11px] text-slate-400 mt-1">请稍候</p>
      </div>

      <!-- Empty state: Welcome hero (full height) -->
      <WelcomeHero
        v-else-if="messages.length === 0"
        class="h-full"
        @send-quick="(text) => $emit('send-quick', text)"
        @navigate="(tab) => $emit('navigate', tab)"
      />

      <!-- Message list -->
      <div v-else class="w-full max-w-4xl mx-auto space-y-6">

        <!-- Message list -->
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          :data-msg-index="idx"
          class="flex gap-4 w-full group transition-all duration-300 rounded-2xl relative"
          :class="msg.role === 'user' ? 'justify-end' : ''"
        >
          <!-- Assistant Avatar -->
          <div v-if="msg.role === 'assistant'" class="shrink-0 w-10 h-10 rounded-[16px] bg-white border border-blue-100/80 flex items-center justify-center shadow-sm self-start mt-1 overflow-hidden">
            <i class="fa-solid fa-robot text-blue-500 text-sm"></i>
          </div>

          <!-- Spacer for user alignment -->
          <div v-if="msg.role === 'user'" class="shrink-0 w-10 h-10 invisible"></div>

          <!-- User Message -->
          <div v-if="msg.role === 'user'" class="relative w-full flex-1 min-w-0 max-w-[80%] flex flex-col items-end">
            <!-- User image attachments -->
            <div v-if="msg.attachments && msg.attachments.length > 0" class="flex flex-wrap gap-2 mb-2 justify-end">
              <img
                v-for="(att, ai) in msg.attachments"
                :key="ai"
                :src="'data:' + (att.media_type || 'image/png') + ';base64,' + att.data"
                class="max-w-[200px] max-h-[150px] object-cover rounded-xl border border-white/30 shadow-sm"
              />
            </div>
            <div class="rounded-[20px] rounded-br-[6px] px-4 py-3 leading-relaxed text-sm bg-gradient-to-br from-blue-500 to-indigo-700 text-white shadow-md shadow-blue-500/20 whitespace-pre-wrap break-words border border-blue-400/20 inline-block text-left">
              {{ msg.content }}
            </div>
            <div v-if="msg.timestamp" class="text-[10px] text-slate-400/80 mt-1 mr-1 font-medium">{{ msg.timestamp }}</div>
          </div>

          <!-- Assistant Message -->
          <div v-else class="w-full flex-1 min-w-0 flex flex-col items-start">
            <!-- Thinking Steps -->
            <div v-if="msg.thinkingSteps && msg.thinkingSteps.length > 0" class="mb-3">
              <button
                type="button"
                class="cursor-pointer group/think flex items-center gap-2.5 w-full text-left transition-all duration-300"
                @click="msg.expanded = !msg.expanded"
              >
                <div
                  class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500"
                  :class="msg.thinkingDone ? 'bg-gradient-to-br from-slate-100 to-slate-50 shadow-sm' : 'bg-gradient-to-br from-blue-100 to-indigo-50 shadow-md shadow-blue-100/50'"
                >
                  <i class="fa-solid text-sm transition-all duration-300" :class="msg.thinkingDone ? 'fa-brain text-slate-400' : 'fa-brain text-blue-500 animate-pulse'"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-[13px] font-semibold tracking-tight transition-colors" :class="msg.thinkingDone ? 'text-slate-500' : 'text-blue-700'">
                      {{ msg.thinkingDone ? '推理完成' : '深度推理中' }}
                    </span>
                    <span v-if="!msg.thinkingDone" class="flex gap-[3px]">
                      <span class="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 0ms"></span>
                      <span class="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 150ms"></span>
                      <span class="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 300ms"></span>
                    </span>
                    <i v-if="msg.thinkingDone" class="fa-solid fa-chevron-down text-[9px] text-slate-400 transition-transform duration-300" :class="msg.expanded ? 'rotate-180' : ''"></i>
                  </div>
                  <div class="text-[11px] text-slate-400 mt-0.5 font-medium">
                    {{ msg.thinkingSteps.filter(s => s.visible).length }} 个步骤
                    <template v-if="msg.thinkingDone">· 点击{{ msg.expanded ? '收起' : '展开' }}详情</template>
                  </div>
                </div>
              </button>

              <div v-show="msg.expanded || !msg.thinkingDone" class="mt-2 ml-4 pl-4 border-l-2 border-blue-200/40 space-y-0.5 max-h-[220px] overflow-y-auto transition-all pr-1 scrollbar-hide">
                <div
                  v-for="(step, si) in msg.thinkingSteps"
                  :key="si"
                  v-show="step.visible !== false"
                  class="flex items-start gap-2.5 py-1 group/step"
                >
                  <div class="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors" :class="si === msg.thinkingSteps.length - 1 && !msg.thinkingDone ? 'bg-blue-500 text-white shadow-sm' : 'bg-white border border-slate-200/60 text-slate-400'">
                    <i :class="step.icon || 'fa-solid fa-circle'" class="text-[8px]"></i>
                  </div>
                  <!-- Browser screenshot or image result -->
                  <img v-if="step.image" :src="step.image.startsWith('data:') ? step.image : 'data:image/png;base64,' + step.image" class="max-w-[300px] rounded-lg border border-slate-200 mt-1" />
                  <span v-else class="text-[12px] leading-relaxed text-slate-600" v-html="renderMarkdown(step.text)"></span>
                </div>
              </div>
            </div>

            <!-- Message content -->
            <div v-if="msg.content" class="rounded-[20px] rounded-bl-[6px] px-4 py-3 leading-relaxed text-[13px] bg-white shadow-sm border border-slate-100 prose prose-sm prose-slate max-w-none" v-html="renderAssistantContent(msg.content)">
            </div>
            <div v-if="msg.timestamp" class="text-[11px] text-slate-400/80 mt-1.5 ml-1 font-medium">{{ msg.timestamp }}</div>
          </div>

          <!-- User Avatar -->
          <div v-if="msg.role === 'user'" class="shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-sm self-start mt-1">
            <i class="fa-solid fa-user text-white text-xs"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating input area (hidden when welcome hero is shown - it has its own input) -->
    <div v-if="messages.length > 0" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#f0f4f8] via-[#f0f4f8] to-transparent pt-8 pb-4 px-4">
      <div class="w-full max-w-3xl mx-auto relative">
        <!-- Slash command palette -->
        <div v-if="showSlashMenu" class="absolute bottom-full mb-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20 max-h-[200px] overflow-y-auto">
          <div
            v-for="(cmd, ci) in filteredCommands"
            :key="cmd.name || ci"
            @click="selectCommand(cmd)"
            class="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-3 text-[12px] transition-colors"
          >
            <span class="text-blue-600 font-mono font-semibold">/{{ cmd.name }}</span>
            <span class="text-slate-500">{{ cmd.hint || cmd.description || '' }}</span>
          </div>
          <div v-if="filteredCommands.length === 0" class="px-4 py-3 text-[11px] text-slate-400 text-center">无匹配命令</div>
        </div>
        <div class="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-[22px] p-3">
          <textarea
            ref="inputRef"
            v-model="inputText"
            :placeholder="isStreaming ? 'AI 正在响应中...' : '描述你想要的产品功能...'"
            rows="2"
            :disabled="isStreaming"
            class="w-full resize-none text-[13px] text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none leading-relaxed px-2"
            @keydown.ctrl.enter.prevent="sendMessage"
            @keydown.meta.enter.prevent="sendMessage"
          ></textarea>
          <!-- Attachment preview -->
          <div v-if="chatAttachments.length > 0" class="flex items-center gap-2 px-1 py-1 flex-wrap">
            <div v-for="(att, ai) in chatAttachments" :key="ai" class="relative group/att">
              <img :src="'data:' + att.media_type + ';base64,' + att.data" class="w-10 h-10 object-cover rounded-lg border border-slate-200" />
              <button @click="chatAttachments.splice(ai, 1)" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity cursor-pointer">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between mt-1 px-1">
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-slate-400">Ctrl + Enter 发送</span>
              <button @click="pickImage" class="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer" title="上传图片" :disabled="isStreaming">
                <i class="fa-solid fa-paperclip text-xs"></i>
              </button>
            </div>
            <button
              v-if="isStreaming"
              @click="$emit('cancel')"
              class="w-9 h-9 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            >
              <i class="fa-solid fa-stop text-xs"></i>
            </button>
            <button
              v-else
              @click="sendMessage"
              :disabled="!inputText.trim()"
              class="w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm"
              :class="inputText.trim() ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer' : 'bg-slate-100 text-slate-300 cursor-not-allowed'"
            >
              <i class="fa-solid fa-arrow-up text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, computed } from 'vue';
import { marked } from 'marked';
import WelcomeHero from './WelcomeHero.vue';

defineProps({
  slug: { type: String, required: true },
  projectName: { type: String, default: '' },
  messages: { type: Array, default: () => [] },
  isStreaming: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  availableCommands: { type: Array, default: () => [] },
});

const emit = defineEmits(['send', 'send-quick', 'send-with-attachments', 'cancel', 'navigate', 'fork']);

const inputText = ref('');
const inputRef = ref(null);
const chatContainerRef = ref(null);
const chatAttachments = ref([]);

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
        chatAttachments.value.push({ type: 'image', data: base64, media_type: file.type || 'image/png', name: file.name });
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
};

// Slash command menu
const showSlashMenu = ref(false);
const filteredCommands = computed(() => {
  const text = inputText.value;
  if (!text.startsWith('/')) return [];
  const query = text.slice(1).toLowerCase();
  const defaultCmds = [
    { name: 'compact', hint: '压缩上下文窗口' },
    { name: 'steer', hint: '给 AI 临时指令（如: /steer 用中文回答）' },
    { name: 'model', hint: '切换模型' },
    { name: 'tools', hint: '查看可用工具列表' },
    { name: 'context', hint: '查看上下文使用量' },
    { name: 'help', hint: '帮助' },
  ];
  const all = [...defaultCmds];
  if (!query) return all;
  return all.filter(c => c.name.includes(query));
});

const selectCommand = (cmd) => {
  inputText.value = `/${cmd.name} `;
  showSlashMenu.value = false;
  inputRef.value?.focus();
};

// Watch input for slash trigger
watch(inputText, (val) => {
  showSlashMenu.value = val.startsWith('/') && !val.includes(' ');
});

const sendMessage = () => {
  const text = inputText.value.trim();
  if (!text && chatAttachments.value.length === 0) return;
  if (chatAttachments.value.length > 0) {
    emit('send-with-attachments', text || '请分析这张图片', [...chatAttachments.value]);
  } else {
    emit('send', text);
  }
  inputText.value = '';
  chatAttachments.value = [];
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
    }
  });
};

const scrollToMessage = (index) => {
  nextTick(() => {
    const el = chatContainerRef.value?.querySelector(`[data-msg-index="${index}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

const renderMarkdown = (text) => {
  if (!text) return '';
  try {
    return marked.parseInline(text);
  } catch {
    return text;
  }
};

const renderAssistantContent = (content) => {
  if (!content) return '';
  try {
    // Detect MEDIA: local file paths and render as images
    let processed = content.replace(
      /MEDIA:([^\s\n]+\.(png|jpg|jpeg|gif|svg|webp))/gi,
      (match, filePath) => {
        const safePath = filePath.replace(/\\/g, '/');
        return `<img src="file:///${safePath}" class="max-w-[300px] rounded-lg border border-slate-200 my-2" onerror="this.style.display='none'" />`;
      }
    );
    return marked.parse(processed);
  } catch {
    return content;
  }
};

defineExpose({ scrollToBottom, scrollToMessage });
</script>

<style scoped>
/* Ensure markdown content renders correctly inside chat bubbles */
:deep(.prose) {
  font-size: 13px;
  line-height: 1.7;
}
:deep(.prose p) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}
:deep(.prose ul),
:deep(.prose ol) {
  margin-top: 0.4em;
  margin-bottom: 0.4em;
  padding-left: 1.5em;
}
:deep(.prose li) {
  margin-top: 0.15em;
  margin-bottom: 0.15em;
}
:deep(.prose table) {
  font-size: 12px;
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
}
:deep(.prose th),
:deep(.prose td) {
  border: 1px solid #e2e8f0;
  padding: 0.4em 0.6em;
  text-align: left;
}
:deep(.prose th) {
  background: #f8fafc;
  font-weight: 600;
}
:deep(.prose strong) {
  font-weight: 700;
  color: #1e293b;
}
:deep(.prose code) {
  font-size: 12px;
  background: #f1f5f9;
  padding: 0.15em 0.35em;
  border-radius: 4px;
  color: #475569;
}
:deep(.prose pre) {
  background: #1e293b;
  color: #e2e8f0;
  padding: 0.75em 1em;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 12px;
  margin: 0.5em 0;
}
:deep(.prose pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}
:deep(.prose hr) {
  border-color: #e2e8f0;
  margin: 0.75em 0;
}
:deep(.prose h1),
:deep(.prose h2),
:deep(.prose h3),
:deep(.prose h4) {
  margin-top: 0.8em;
  margin-bottom: 0.3em;
  font-weight: 700;
  color: #1e293b;
}
:deep(.prose h1) { font-size: 1.1em; }
:deep(.prose h2) { font-size: 1.05em; }
:deep(.prose h3) { font-size: 1em; }
:deep(.prose blockquote) {
  border-left: 3px solid #2563eb;
  padding-left: 0.75em;
  color: #475569;
  margin: 0.5em 0;
}
</style>
