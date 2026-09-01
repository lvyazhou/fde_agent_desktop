<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <!-- Top bar: project name + tab bar -->
    <div class="shrink-0 bg-white border-b border-slate-200/80 px-6 pt-4 pb-0">
      <div class="flex items-center gap-3 mb-4">
        <RouterLink to="/projects" class="text-slate-400 hover:text-blue-700 transition-colors">
          <i class="fa-solid fa-arrow-left text-sm"></i>
        </RouterLink>
        <h1 class="text-lg font-bold text-slate-800 truncate">{{ projectName }}</h1>
      </div>
      <!-- FDE 五阶段时间线 -->
      <div class="-mx-6 mb-0">
        <StageTimeline :current="currentStage" :stage-status="stageStatus" @select="selectStage" />
      </div>
      <!-- Tabs(仅工作区阶段显示) -->
      <div v-if="isWorkspaceStage" class="flex items-center gap-6 mt-3.5 px-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="group relative inline-flex items-center gap-2 pb-2.5 text-[14px] transition-colors duration-200"
          :class="activeTab === tab.key ? 'text-blue-600 font-semibold' : 'text-slate-400 hover:text-slate-700 font-medium'"
        >
          <i :class="tab.icon" class="text-[13px]"></i>
          {{ tab.label }}
          <span
            class="absolute -bottom-px left-0 right-0 h-0.5 rounded-full transition-all duration-200"
            :class="activeTab === tab.key ? 'bg-blue-600' : 'bg-transparent'"
          ></span>
        </button>
      </div>
    </div>

    <!-- Tab content body -->
    <!-- 非阶段②:显示 FDE 阶段面板(要素卡 + 交付物占位) -->
    <StagePanel
      v-if="!isWorkspaceStage"
      :stage="activeStageObj"
      :has-workspace="false"
    />

    <!-- 阶段②工作区:现有 tab 内容(需求对话/功能清单/原型/迭代/导出) -->
    <div v-show="isWorkspaceStage" class="flex-1 flex min-h-0 overflow-hidden">

      <!-- 阶段② 对话 Tab (requirement) — 豆包风格,与「智能对话」一致 -->
      <div v-if="activeTab === 'requirement'" class="flex h-full w-full">
        <div class="flex-1 flex flex-col min-w-0 relative bg-white">
          <div ref="chatContainerRef" class="flex-1 overflow-y-auto px-4 pt-6" :class="messages.length > 0 ? 'pb-[150px]' : ''">
            <!-- Loading -->
            <div v-if="messagesLoading" class="flex flex-col items-center justify-center py-24">
              <div class="relative w-12 h-12 mb-5">
                <div class="absolute inset-0 rounded-full border-2 border-blue-100"></div>
                <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin"></div>
              </div>
              <p class="text-sm text-slate-500 font-medium">正在加载对话记录...</p>
            </div>

            <!-- Empty state -->
            <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center px-6">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/25">
                <i class="fa-solid fa-comments text-xl text-white"></i>
              </div>
              <h3 class="text-[17px] font-semibold text-slate-800 mb-1.5">阶段② · 需求沟通 + 原型设计</h3>
              <p class="text-[13px] text-slate-400 max-w-md leading-relaxed">聊透需求，出对接确认表与 AI 能力清单，再到「交付物」生成功能清单、「原型」出可交互 Demo。</p>
              <div class="flex flex-wrap gap-2 justify-center mt-6 max-w-lg">
                <button
                  v-for="q in stage2Quick"
                  :key="q"
                  @click="chatInput = q; sendMessage()"
                  class="px-3.5 py-2 rounded-full bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-200 text-[12.5px] text-slate-600 hover:text-blue-700 transition-all"
                >
                  {{ q }}
                </button>
              </div>
            </div>

            <!-- Message list -->
            <div v-else class="w-full max-w-3xl mx-auto space-y-7">
              <div
                v-for="(msg, idx) in messages"
                :key="idx"
                :data-msg-index="idx"
                class="flex flex-col w-full group"
                :class="msg.role === 'user' ? 'items-end' : 'items-start'"
              >
                <!-- User -->
                <div v-if="msg.role === 'user'" class="max-w-[80%] flex flex-col items-end">
                  <div v-if="msg.attachments && msg.attachments.length" class="flex flex-wrap gap-2 mb-1.5 justify-end">
                    <template v-for="(att, ai) in msg.attachments" :key="ai">
                      <img v-if="att.type === 'image'" :src="'data:' + (att.media_type || 'image/png') + ';base64,' + att.data" class="max-w-[160px] max-h-[120px] object-cover rounded-xl border border-slate-200" />
                      <div v-else class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 max-w-[180px]">
                        <i class="fa-solid fa-file-lines text-blue-500 text-xs shrink-0"></i>
                        <span class="text-[11px] text-slate-600 truncate">{{ att.name }}</span>
                      </div>
                    </template>
                  </div>
                  <div v-if="msg.content" class="rounded-[18px] px-4 py-2.5 leading-relaxed text-[14px] bg-[#e7edf7] text-slate-800 whitespace-pre-wrap break-words text-left">
                    {{ msg.content }}
                  </div>
                </div>

                <!-- Assistant -->
                <div v-else class="w-full flex flex-col items-start">
                  <!-- AI 头像 + 名字 + 状态 -->
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                      <i class="fa-solid fa-robot text-white text-[12px]"></i>
                    </div>
                    <span class="text-[13px] font-semibold text-slate-700">AI 助手</span>
                    <span class="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full"
                      :class="(isStreaming && idx === messages.length - 1) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'">
                      <span class="w-1.5 h-1.5 rounded-full" :class="(isStreaming && idx === messages.length - 1) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'"></span>
                      {{ (isStreaming && idx === messages.length - 1) ? '工作中' : '已完成' }}
                    </span>
                  </div>
                  <div v-if="msg.thinkingSteps && msg.thinkingSteps.length > 0 && (!msg.thinkingDone || msg.expanded)" class="mb-3 w-full">
                    <button type="button" class="flex items-center gap-2.5 text-left" @click="msg.expanded = !msg.expanded">
                      <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" :class="msg.thinkingDone ? 'bg-slate-100' : 'bg-gradient-to-br from-blue-100 to-indigo-50'">
                        <i class="fa-solid fa-brain text-sm" :class="msg.thinkingDone ? 'text-slate-400' : 'text-blue-500 animate-pulse'"></i>
                      </div>
                      <span class="text-[13px] font-semibold" :class="msg.thinkingDone ? 'text-slate-500' : 'text-blue-700'">
                        {{ msg.thinkingDone ? '推理完成' : '深度推理中' }}
                      </span>
                    </button>
                    <div class="mt-2 ml-4 pl-4 border-l-2 border-blue-200/40 space-y-0.5 max-h-[220px] overflow-y-auto scrollbar-hide">
                      <div v-for="(step, si) in msg.thinkingSteps" :key="si" v-show="step.visible !== false" class="flex items-start gap-2.5 py-1">
                        <div class="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 bg-white border border-slate-200/60 text-slate-400">
                          <i :class="step.icon || 'fa-solid fa-circle'" class="text-[8px]"></i>
                        </div>
                        <span class="text-[12px] leading-relaxed text-slate-600 compact-markdown" v-html="renderMarkdown(step.text)"></span>
                      </div>
                    </div>
                  </div>
                  <div v-if="msg.content || (isStreaming && idx === messages.length - 1)" class="w-full leading-[1.75] text-[15px] text-slate-800 markdown-body" v-html="renderAssistantContent(msg, idx)"></div>
                  <span v-if="msg.timestamp" class="text-[12px] text-slate-400 mt-2">{{ msg.timestamp }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Composer -->
          <div v-if="messages.length > 0" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-10 pb-5 px-4">
            <div class="w-full max-w-3xl mx-auto">
              <!-- 快捷操作芯片（贴输入框上方，豆包式）-->
              <div class="flex items-center gap-1 mb-2 overflow-x-auto scrollbar-hide pb-0.5">
                <button
                  v-for="act in quickActions"
                  :key="act.key"
                  @click="runQuickAction(act)"
                  :disabled="isStreaming || deliverableBusy"
                  class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i :class="act.icon" class="text-[8px] text-blue-500"></i>
                  {{ act.label }}
                </button>
              </div>
              <div class="rounded-[26px] border transition-all duration-200 bg-slate-50 border-slate-200 hover:border-slate-300 shadow-[0_2px_12px_-6px_rgba(15,23,42,0.12)] focus-within:bg-white focus-within:border-blue-400/70 focus-within:shadow-[0_6px_28px_-8px_rgba(59,130,246,0.28)]">
                <!-- 附件预览 -->
                <div v-if="reqComposer.attachments.value.length" class="flex items-center gap-2 px-5 pt-4 flex-wrap">
                  <div v-for="(att, ai) in reqComposer.attachments.value" :key="ai" class="relative group/att">
                    <img v-if="att.type === 'image'" :src="'data:' + att.media_type + ';base64,' + att.data" class="w-14 h-14 object-cover rounded-xl border border-slate-200" />
                    <div v-else class="flex items-center gap-2 h-14 px-3 rounded-xl border border-slate-200 bg-white max-w-[200px]">
                      <i class="fa-solid fa-file-lines text-blue-500 text-base shrink-0"></i>
                      <span class="text-[12px] text-slate-700 truncate">{{ att.name }}</span>
                    </div>
                    <button @click="reqComposer.removeAttachment(ai)" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700/90 hover:bg-rose-500 text-white text-[9px] flex items-center justify-center shadow-sm">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
                <textarea
                  v-model="chatInput"
                  rows="1"
                  :placeholder="isStreaming ? 'AI 正在响应中…' : '聊需求、输入 / 唤起指令，Ctrl + Enter 发送'"
                  :disabled="isStreaming"
                  class="w-full resize-none text-[14px] text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none leading-6 px-5 pt-4 pb-1 max-h-[160px] scrollbar-hide disabled:opacity-60"
                  @keydown.ctrl.enter.prevent="sendMessage"
                  @keydown.meta.enter.prevent="sendMessage"
                ></textarea>
                <div class="flex items-center justify-between px-3 pb-3 pt-1.5 gap-2.5">
                  <div class="flex items-center gap-1.5">
                    <button @click="reqComposer.pickImage" :disabled="isStreaming" class="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="上传图片">
                      <i class="fa-solid fa-image text-sm"></i>
                    </button>
                    <button @click="reqComposer.pickFile" :disabled="isStreaming" class="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="上传文件">
                      <i class="fa-solid fa-paperclip text-sm"></i>
                    </button>
                    <button @click="reqComposer.toggleRecording" :disabled="isStreaming || !reqComposer.recordingSupported" class="w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed" :class="reqComposer.isRecording.value ? 'text-white bg-rose-500 hover:bg-rose-600' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'" :title="reqComposer.recordingSupported ? (reqComposer.isRecording.value ? '停止录音' : '语音输入') : '当前环境不支持录音'">
                      <i class="fa-solid text-sm" :class="reqComposer.isRecording.value ? 'fa-stop' : 'fa-microphone'"></i>
                    </button>
                    <span v-if="reqComposer.isRecording.value" class="text-[11px] text-rose-500 font-medium tabular-nums">{{ reqComposer.recordSeconds.value }}s</span>
                    <span v-else-if="reqComposer.isTranscribing.value" class="text-[11px] text-blue-500 font-medium">识别中…</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="text-[11px] text-slate-400 select-none">Ctrl + Enter 发送</span>
                    <button
                      v-if="isStreaming"
                      @click="cancelStream"
                      class="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center transition-all shadow-sm"
                      title="停止生成"
                    >
                      <span class="w-3 h-3 rounded-[3px] bg-white"></span>
                    </button>
                    <button
                      v-else
                      @click="sendMessage"
                      :disabled="!chatInput.trim() && reqComposer.attachments.value.length === 0"
                      class="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
                      :class="(chatInput.trim() || reqComposer.attachments.value.length) ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30 hover:shadow-lg active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'"
                    >
                      <i class="fa-solid fa-arrow-up text-sm"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Prototype Tab — full width -->
      <div v-else-if="activeTab === 'prototype'" class="flex h-full w-full">
        <!-- File tree -->
        <div class="w-[220px] shrink-0 bg-white border-r border-slate-100 flex flex-col overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-600">文件列表</span>
            <button @click="refreshPrototypeFiles" class="text-slate-400 hover:text-blue-600 transition-colors" title="刷新">
              <i class="fa-solid fa-arrows-rotate text-xs"></i>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-2">
            <div v-if="prototypeFiles.length === 0" class="px-3 py-4 text-xs text-slate-400 text-center">
              暂无文件
            </div>
            <button
              v-for="file in prototypeFiles"
              :key="file.name"
              @click="selectPrototypeFile(file.name)"
              class="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors truncate flex items-center gap-2"
              :class="selectedFile === file.name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'"
            >
              <i class="fa-solid fa-file-code text-[10px]" :class="selectedFile === file.name ? 'text-blue-500' : 'text-slate-400'"></i>
              {{ file.name }}
            </button>
          </div>
        </div>
        <!-- Preview pane -->
        <div class="flex-1 flex flex-col min-w-0">
          <div class="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-white">
            <button
              @click="openInBrowser"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              :disabled="!selectedFile"
            >
              <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              在浏览器打开
            </button>
            <button
              @click="regeneratePrototype"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-colors"
              :disabled="isStreaming"
            >
              <i class="fa-solid fa-rotate text-[10px]"></i>
              重新生成
            </button>
          </div>
          <div class="flex-1 min-h-0">
            <!-- AI 工作进度：生成 / 迭代原型时实时展示推理步骤、工具调用与输出 -->
            <div
              v-if="streamTargetTab === 'iterate' && iterateMessages.length > 0 && (isStreaming || !selectedFile)"
              ref="iterateChatRef"
              class="h-full overflow-y-auto px-4 py-5"
            >
              <div class="w-full max-w-3xl mx-auto space-y-7">
                <div
                  v-for="(msg, idx) in iterateMessages"
                  :key="idx"
                  class="flex flex-col w-full"
                  :class="msg.role === 'user' ? 'items-end' : 'items-start'"
                >
                  <!-- User -->
                  <div v-if="msg.role === 'user'" class="max-w-[80%] flex flex-col items-end">
                    <div v-if="msg.content" class="rounded-[18px] px-4 py-2.5 leading-relaxed text-[14px] bg-[#e7edf7] text-slate-800 whitespace-pre-wrap break-words text-left">
                      {{ msg.content }}
                    </div>
                  </div>
                  <!-- Assistant -->
                  <div v-else class="w-full flex flex-col items-start">
                    <div class="flex items-center gap-2 mb-2">
                      <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                        <i class="fa-solid fa-robot text-white text-[12px]"></i>
                      </div>
                      <span class="text-[13px] font-semibold text-slate-700">AI 助手</span>
                      <span class="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full"
                        :class="(isStreaming && idx === iterateMessages.length - 1) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'">
                        <span class="w-1.5 h-1.5 rounded-full" :class="(isStreaming && idx === iterateMessages.length - 1) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'"></span>
                        {{ (isStreaming && idx === iterateMessages.length - 1) ? '工作中' : '已完成' }}
                      </span>
                    </div>
                    <div v-if="msg.thinkingSteps && msg.thinkingSteps.length > 0 && (!msg.thinkingDone || msg.expanded)" class="mb-3 w-full">
                      <button type="button" class="flex items-center gap-2.5 text-left" @click="msg.expanded = !msg.expanded">
                        <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" :class="msg.thinkingDone ? 'bg-slate-100' : 'bg-gradient-to-br from-blue-100 to-indigo-50'">
                          <i class="fa-solid fa-brain text-sm" :class="msg.thinkingDone ? 'text-slate-400' : 'text-blue-500 animate-pulse'"></i>
                        </div>
                        <span class="text-[13px] font-semibold" :class="msg.thinkingDone ? 'text-slate-500' : 'text-blue-700'">
                          {{ msg.thinkingDone ? '推理完成' : '深度推理中' }}
                        </span>
                      </button>
                      <div class="mt-2 ml-4 pl-4 border-l-2 border-blue-200/40 space-y-0.5 max-h-[220px] overflow-y-auto scrollbar-hide">
                        <div v-for="(step, si) in msg.thinkingSteps" :key="si" v-show="step.visible !== false" class="flex items-start gap-2.5 py-1">
                          <div class="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 bg-white border border-slate-200/60 text-slate-400">
                            <i :class="step.icon || 'fa-solid fa-circle'" class="text-[8px]"></i>
                          </div>
                          <span class="text-[12px] leading-relaxed text-slate-600 compact-markdown" v-html="renderMarkdown(step.text)"></span>
                        </div>
                      </div>
                    </div>
                    <div v-if="msg.content || (isStreaming && idx === iterateMessages.length - 1)" class="w-full leading-[1.75] text-[15px] text-slate-800 markdown-body" v-html="renderAssistantContent(msg, idx)"></div>
                    <span v-if="msg.timestamp" class="text-[12px] text-slate-400 mt-2">{{ msg.timestamp }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="!selectedFile && prototypeFiles.length === 0" class="flex flex-col items-center justify-center h-full">
              <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <i class="fa-solid fa-window-maximize text-2xl text-slate-300"></i>
              </div>
              <p class="text-sm text-slate-500 mb-4">尚未生成原型</p>
              <button
                @click="generatePrototype"
                class="inline-flex items-center gap-2 px-4 py-2 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors"
                :disabled="isStreaming"
              >
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                开始生成
              </button>
            </div>
            <div v-else-if="!selectedFile" class="flex items-center justify-center h-full text-sm text-slate-400">
              选择左侧文件进行预览
            </div>
            <iframe
              v-else
              :key="iframeKey"
              :src="iframeSrc"
              class="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
            ></iframe>
          </div>

          <!-- 迭代对话条（就地改原型，原「迭代修改」tab 并入这里）-->
          <div v-if="prototypeFiles.length > 0 || isStreaming" class="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
            <div class="max-w-3xl mx-auto">
              <!-- 附件预览 -->
              <div v-if="iterateComposer.attachments.value.length" class="flex items-center gap-2 mb-2 flex-wrap">
                <div v-for="(att, ai) in iterateComposer.attachments.value" :key="ai" class="relative group/att">
                  <img v-if="att.type === 'image'" :src="'data:' + att.media_type + ';base64,' + att.data" class="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                  <div v-else class="flex items-center gap-1.5 h-12 px-2.5 rounded-lg border border-slate-200 bg-white max-w-[160px]">
                    <i class="fa-solid fa-file-lines text-blue-500 text-sm shrink-0"></i>
                    <span class="text-[11px] text-slate-600 truncate">{{ att.name }}</span>
                  </div>
                  <button @click="iterateComposer.removeAttachment(ai)" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center shadow-sm">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
              <div class="rounded-2xl border transition-all duration-200 bg-slate-50 border-slate-200 focus-within:bg-white focus-within:border-blue-400/70 focus-within:shadow-[0_4px_20px_-8px_rgba(59,130,246,0.25)] flex items-end gap-2 pr-2">
                <textarea
                  v-model="iterateInput"
                  rows="1"
                  :placeholder="isStreaming ? 'AI 正在修改原型…' : '说出你想改什么，AI 就地更新原型，例如：把首页导航改成左侧栏'"
                  :disabled="isStreaming"
                  class="flex-1 resize-none text-[13px] text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none leading-6 px-4 py-3 max-h-[120px] scrollbar-hide disabled:opacity-60"
                  @keydown.enter.exact.prevent="sendIterate"
                  @keydown.shift.enter.exact="null"
                ></textarea>
                <button @click="iterateComposer.pickImage" :disabled="isStreaming" class="mb-1.5 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed" title="上传图片">
                  <i class="fa-solid fa-image text-xs"></i>
                </button>
                <button @click="iterateComposer.pickFile" :disabled="isStreaming" class="mb-1.5 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed" title="上传文件">
                  <i class="fa-solid fa-paperclip text-xs"></i>
                </button>
                <button @click="iterateComposer.toggleRecording" :disabled="isStreaming || !iterateComposer.recordingSupported" class="mb-1.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" :class="iterateComposer.isRecording.value ? 'text-white bg-rose-500 hover:bg-rose-600' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'" :title="iterateComposer.recordingSupported ? (iterateComposer.isRecording.value ? '停止录音' : '语音输入') : '当前环境不支持录音'">
                  <i class="fa-solid text-xs" :class="iterateComposer.isRecording.value ? 'fa-stop' : 'fa-microphone'"></i>
                </button>
                <button
                  v-if="isStreaming"
                  @click="cancelStream"
                  class="mb-1.5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center shrink-0"
                  title="停止"
                >
                  <span class="w-3 h-3 rounded-[3px] bg-white"></span>
                </button>
                <button
                  v-else
                  @click="sendIterate"
                  :disabled="!iterateInput.trim() && iterateComposer.attachments.value.length === 0"
                  class="mb-1.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
                  :class="(iterateInput.trim() || iterateComposer.attachments.value.length) ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30' : 'bg-slate-100 text-slate-300 cursor-not-allowed'"
                >
                  <i class="fa-solid fa-arrow-up text-xs"></i>
                </button>
              </div>
              <p class="text-[10px] text-slate-400 mt-1.5 text-center">Enter 发送迭代 · 修改会直接作用到当前原型文件</p>
            </div>
          </div>
        </div>
      </div>


      <!-- 阶段③ 对话 Tab (chat3) — 豆包风格,与「智能对话」一致 -->
      <div v-else-if="activeTab === 'chat3'" class="flex h-full w-full">
        <!-- Center: Chat area -->
        <div class="flex-1 flex flex-col min-w-0 relative bg-white">
          <div ref="stage3ChatRef" class="flex-1 overflow-y-auto px-4 pt-6" :class="stage3Messages.length > 0 ? 'pb-[150px]' : ''">
            <!-- Empty state -->
            <div v-if="stage3Messages.length === 0" class="flex flex-col items-center justify-center h-full text-center px-6">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/25">
                <i class="fa-solid fa-diagram-project text-xl text-white"></i>
              </div>
              <h3 class="text-[17px] font-semibold text-slate-800 mb-1.5">阶段③ · 需求确认 + 智能体设计</h3>
              <p class="text-[13px] text-slate-400 max-w-md leading-relaxed">把需求签字定稿、拆智能体矩阵。聊透后到「交付物」一键生成确认表 / 设计表 / PRD。</p>
              <div class="flex flex-wrap gap-2 justify-center mt-6 max-w-lg">
                <button
                  v-for="q in stage3Quick"
                  :key="q"
                  @click="stage3Input = q; sendStage3()"
                  class="px-3.5 py-2 rounded-full bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-200 text-[12.5px] text-slate-600 hover:text-blue-700 transition-all"
                >
                  {{ q }}
                </button>
              </div>
            </div>

            <!-- Message list -->
            <div v-else class="w-full max-w-3xl mx-auto space-y-7">
              <div
                v-for="(msg, idx) in stage3Messages"
                :key="idx"
                class="flex flex-col w-full group"
                :class="msg.role === 'user' ? 'items-end' : 'items-start'"
              >
                <!-- User -->
                <div v-if="msg.role === 'user'" class="max-w-[80%] flex flex-col items-end">
                  <div v-if="msg.attachments && msg.attachments.length" class="flex flex-wrap gap-2 mb-1.5 justify-end">
                    <template v-for="(att, ai) in msg.attachments" :key="ai">
                      <img v-if="att.type === 'image'" :src="'data:' + (att.media_type || 'image/png') + ';base64,' + att.data" class="max-w-[160px] max-h-[120px] object-cover rounded-xl border border-slate-200" />
                      <div v-else class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 max-w-[180px]">
                        <i class="fa-solid fa-file-lines text-blue-500 text-xs shrink-0"></i>
                        <span class="text-[11px] text-slate-600 truncate">{{ att.name }}</span>
                      </div>
                    </template>
                  </div>
                  <div v-if="msg.content" class="rounded-[18px] px-4 py-2.5 leading-relaxed text-[14px] bg-[#e7edf7] text-slate-800 whitespace-pre-wrap break-words text-left">
                    {{ msg.content }}
                  </div>
                </div>

                <!-- Assistant -->
                <div v-else class="w-full flex flex-col items-start">
                  <!-- AI 头像 + 名字 + 状态 -->
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                      <i class="fa-solid fa-robot text-white text-[12px]"></i>
                    </div>
                    <span class="text-[13px] font-semibold text-slate-700">AI 助手</span>
                    <span class="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full"
                      :class="(isStreaming && idx === stage3Messages.length - 1) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'">
                      <span class="w-1.5 h-1.5 rounded-full" :class="(isStreaming && idx === stage3Messages.length - 1) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'"></span>
                      {{ (isStreaming && idx === stage3Messages.length - 1) ? '工作中' : '已完成' }}
                    </span>
                  </div>
                  <!-- Thinking steps -->
                  <div v-if="msg.thinkingSteps && msg.thinkingSteps.length > 0 && (!msg.thinkingDone || msg.expanded)" class="mb-3 w-full">
                    <button type="button" class="flex items-center gap-2.5 text-left" @click="msg.expanded = !msg.expanded">
                      <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" :class="msg.thinkingDone ? 'bg-slate-100' : 'bg-gradient-to-br from-blue-100 to-indigo-50'">
                        <i class="fa-solid fa-brain text-sm" :class="msg.thinkingDone ? 'text-slate-400' : 'text-blue-500 animate-pulse'"></i>
                      </div>
                      <span class="text-[13px] font-semibold" :class="msg.thinkingDone ? 'text-slate-500' : 'text-blue-700'">
                        {{ msg.thinkingDone ? '推理完成' : '深度推理中' }}
                      </span>
                    </button>
                    <div class="mt-2 ml-4 pl-4 border-l-2 border-blue-200/40 space-y-0.5 max-h-[220px] overflow-y-auto scrollbar-hide">
                      <div v-for="(step, si) in msg.thinkingSteps" :key="si" v-show="step.visible !== false" class="flex items-start gap-2.5 py-1">
                        <div class="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 bg-white border border-slate-200/60 text-slate-400">
                          <i :class="step.icon || 'fa-solid fa-circle'" class="text-[8px]"></i>
                        </div>
                        <span class="text-[12px] leading-relaxed text-slate-600 compact-markdown" v-html="renderMarkdown(step.text)"></span>
                      </div>
                    </div>
                  </div>
                  <!-- Content: no bubble, plain text -->
                  <div v-if="msg.content || (isStreaming && idx === stage3Messages.length - 1)" class="w-full leading-[1.75] text-[15px] text-slate-800 markdown-body" v-html="renderAssistantContent(msg, idx)"></div>
                  <span v-if="msg.timestamp" class="text-[12px] text-slate-400 mt-2">{{ msg.timestamp }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Composer — 豆包圆角风格 -->
          <div v-if="stage3Messages.length > 0" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-10 pb-5 px-4">
            <div class="w-full max-w-3xl mx-auto">
              <!-- 快捷操作芯片（贴输入框上方，豆包式）-->
              <div class="flex items-center gap-1 mb-2 overflow-x-auto scrollbar-hide pb-0.5">
                <button
                  v-for="act in quickActions"
                  :key="act.key"
                  @click="runQuickAction(act)"
                  :disabled="isStreaming || deliverableBusy"
                  class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i :class="act.icon" class="text-[8px] text-blue-500"></i>
                  {{ act.label }}
                </button>
              </div>
              <div class="rounded-[26px] border transition-all duration-200 bg-slate-50 border-slate-200 hover:border-slate-300 shadow-[0_2px_12px_-6px_rgba(15,23,42,0.12)] focus-within:bg-white focus-within:border-blue-400/70 focus-within:shadow-[0_6px_28px_-8px_rgba(59,130,246,0.28)]">
                <!-- 附件预览 -->
                <div v-if="stage3Composer.attachments.value.length" class="flex items-center gap-2 px-5 pt-4 flex-wrap">
                  <div v-for="(att, ai) in stage3Composer.attachments.value" :key="ai" class="relative group/att">
                    <img v-if="att.type === 'image'" :src="'data:' + att.media_type + ';base64,' + att.data" class="w-14 h-14 object-cover rounded-xl border border-slate-200" />
                    <div v-else class="flex items-center gap-2 h-14 px-3 rounded-xl border border-slate-200 bg-white max-w-[200px]">
                      <i class="fa-solid fa-file-lines text-blue-500 text-base shrink-0"></i>
                      <span class="text-[12px] text-slate-700 truncate">{{ att.name }}</span>
                    </div>
                    <button @click="stage3Composer.removeAttachment(ai)" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700/90 hover:bg-rose-500 text-white text-[9px] flex items-center justify-center shadow-sm">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
                <textarea
                  v-model="stage3Input"
                  rows="1"
                  :placeholder="isStreaming ? 'AI 正在响应中…' : '聊需求确认、智能体矩阵设计，Ctrl + Enter 发送'"
                  :disabled="isStreaming"
                  class="w-full resize-none text-[14px] text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none leading-6 px-5 pt-4 pb-1 max-h-[160px] scrollbar-hide disabled:opacity-60"
                  @keydown.ctrl.enter.prevent="sendStage3"
                  @keydown.meta.enter.prevent="sendStage3"
                ></textarea>
                <div class="flex items-center justify-between px-3 pb-3 pt-1.5 gap-2.5">
                  <div class="flex items-center gap-1.5">
                    <button @click="stage3Composer.pickImage" :disabled="isStreaming" class="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="上传图片">
                      <i class="fa-solid fa-image text-sm"></i>
                    </button>
                    <button @click="stage3Composer.pickFile" :disabled="isStreaming" class="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="上传文件">
                      <i class="fa-solid fa-paperclip text-sm"></i>
                    </button>
                    <button @click="stage3Composer.toggleRecording" :disabled="isStreaming || !stage3Composer.recordingSupported" class="w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed" :class="stage3Composer.isRecording.value ? 'text-white bg-rose-500 hover:bg-rose-600' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'" :title="stage3Composer.recordingSupported ? (stage3Composer.isRecording.value ? '停止录音' : '语音输入') : '当前环境不支持录音'">
                      <i class="fa-solid text-sm" :class="stage3Composer.isRecording.value ? 'fa-stop' : 'fa-microphone'"></i>
                    </button>
                    <span v-if="stage3Composer.isRecording.value" class="text-[11px] text-rose-500 font-medium tabular-nums">{{ stage3Composer.recordSeconds.value }}s</span>
                    <span v-else-if="stage3Composer.isTranscribing.value" class="text-[11px] text-blue-500 font-medium">识别中…</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="text-[11px] text-slate-400 select-none">Ctrl + Enter 发送</span>
                    <button
                      v-if="isStreaming"
                      @click="cancelStream"
                      class="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center transition-all shadow-sm"
                      title="停止生成"
                    >
                      <span class="w-3 h-3 rounded-[3px] bg-white"></span>
                    </button>
                    <button
                      v-else
                      @click="sendStage3"
                      :disabled="!stage3Input.trim() && stage3Composer.attachments.value.length === 0"
                      class="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
                      :class="(stage3Input.trim() || stage3Composer.attachments.value.length) ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30 hover:shadow-lg active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'"
                    >
                      <i class="fa-solid fa-arrow-up text-sm"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 交付物 Tab (阶段②③ 通用) -->
      <Stage3Deliverables
        v-else-if="activeTab === 'deliverables2' || activeTab === 'deliverables3'"
        :deliverables="activeDeliverables"
        :selected="deliverableSelected"
        :status-map="deliverableStatus"
        :content="activeDeliverableContent"
        :busy="deliverableBusy"
        :editing="deliverableEditing"
        @select="deliverableSelected = $event"
        @generate="generateDeliverable"
        @toggle-edit="deliverableEditing = !deliverableEditing"
        @export-md="exportDeliverableMd"
        @update-content="updateDeliverableContent"
        @save="saveDeliverable"
      />

    </div><!-- end tab content body -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';
import StageTimeline from '@/components/workbench/StageTimeline.vue';
import StagePanel from '@/components/workbench/StagePanel.vue';
import Stage3Deliverables from '@/components/workbench/StageDeliverables.vue';
import { FDE_STAGES, getStage, DEFAULT_STAGE } from '@/data/fde-stages';
import { useChatComposer } from '@/composables/useChatComposer';

const props = defineProps({
  slug: { type: String, required: true },
});

const route = useRoute();

// --- State ---
const projectName = ref('');
const projectMeta = ref(null);
const activeTab = ref('requirement');

// --- FDE 五阶段工作台状态 ---
const WORKSPACE_STAGES = [2, 3]; // 阶段②③承载真实工作区;①④⑤仍走 StagePanel 展示
const currentStage = ref(DEFAULT_STAGE);
const stageStatus = ref({ 1: 'done', 2: 'active', 3: 'todo', 4: 'todo', 5: 'todo' });
const activeStageObj = computed(() => getStage(currentStage.value));
const isWorkspaceStage = computed(() => WORKSPACE_STAGES.includes(currentStage.value));

async function selectStage(id) {
  if (id === currentStage.value) return;
  currentStage.value = id;
  // 切阶段时重置到该阶段第一个 tab
  const firstTab = tabsForStage(id)[0];
  if (firstTab) activeTab.value = firstTab.key;
  // 交付物：选中该阶段第一件，并加载该阶段已生成的交付物
  const firstDeliv = deliverablesForStage(id)[0];
  if (firstDeliv) deliverableSelected.value = firstDeliv.key;
  loadDeliverablesForStage(id);
  // 更新阶段状态:比 id 小的算 done、id 为 active、比 id 大的保持 todo
  const next = {};
  for (let i = 1; i <= 5; i++) {
    next[i] = i < id ? 'done' : i === id ? 'active' : (stageStatus.value[i] === 'done' ? 'done' : 'todo');
  }
  stageStatus.value = next;
  // 写回 meta(持久化当前阶段)
  try {
    await window.api.hermes.updateProjectMeta(props.slug, { stage: id, stageStatus: next });
  } catch (e) { /* 非致命 */ }
}


// --- Panel toggle state ---
const showSessionPanel = ref(true);
const showLogsPanel = ref(true);

// --- Agent logs state ---
const agentLogs = ref([]);
const logsContainerRef = ref(null);
const iterateLogsContainerRef = ref(null);
let logIdCounter = 0;

const addLog = (type, content, status) => {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  agentLogs.value.push({ id: ++logIdCounter, time, type, content, status });
  // Keep max 200 entries
  if (agentLogs.value.length > 200) {
    agentLogs.value = agentLogs.value.slice(-150);
  }
  // Auto scroll logs
  nextTick(() => {
    if (logsContainerRef.value) {
      logsContainerRef.value.scrollTop = logsContainerRef.value.scrollHeight;
    }
    if (iterateLogsContainerRef.value) {
      iterateLogsContainerRef.value.scrollTop = iterateLogsContainerRef.value.scrollHeight;
    }
  });
};

// --- Thought buffer for agent logs ---
let thoughtBuffer = '';
let thoughtFlushTimer = null;

const flushThoughtBuffer = () => {
  if (thoughtBuffer.trim()) {
    // Truncate to 150 chars for display
    const display = thoughtBuffer.length > 150 ? thoughtBuffer.slice(0, 147) + '...' : thoughtBuffer;
    addLog('thought', display);
    thoughtBuffer = '';
  }
  thoughtFlushTimer = null;
};

// --- Computed: user messages for session sidebar ---
const userMessageSummaries = computed(() => {
  return messages.value
    .filter(m => m.role === 'user')
    .map((m, idx) => ({
      index: messages.value.indexOf(m),
      preview: (m.content || '').slice(0, 20) + ((m.content || '').length > 20 ? '...' : ''),
      full: m.content || '',
    }));
});

const scrollToMessage = (msgIndex) => {
  // Ensure we're on the requirement tab
  activeTab.value = 'requirement';
  nextTick(() => {
    if (chatContainerRef.value) {
      const messageEls = chatContainerRef.value.querySelectorAll('[data-msg-index]');
      for (const el of messageEls) {
        if (parseInt(el.getAttribute('data-msg-index')) === msgIndex) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Brief highlight effect
          el.classList.add('ring-2', 'ring-blue-300');
          setTimeout(() => el.classList.remove('ring-2', 'ring-blue-300'), 1500);
          break;
        }
      }
    }
  });
};

// tab 集按阶段计算：阶段②③ 统一为 对话 | 交付物 | 原型
const STAGE2_TABS = [
  { key: 'requirement', label: '智能对话', icon: 'fa-solid fa-comments' },
  { key: 'deliverables2', label: '交付物', icon: 'fa-solid fa-box-open' },
  { key: 'prototype', label: '原型', icon: 'fa-solid fa-window-maximize' },
];
const STAGE3_TABS = [
  { key: 'chat3', label: '智能对话', icon: 'fa-solid fa-comments' },
  { key: 'deliverables3', label: '交付物', icon: 'fa-solid fa-box-open' },
  { key: 'prototype', label: '定稿原型', icon: 'fa-solid fa-window-maximize' },
];
function tabsForStage(id) {
  if (id === 3) return STAGE3_TABS;
  return STAGE2_TABS;
}
const tabs = computed(() => tabsForStage(currentStage.value));

// 阶段②交付物定义（4 件都接 AI；功能清单走 product-feature-spec skill）
const STAGE2_DELIVERABLES = [
  {
    key: 'contact-form', name: '需求与数据对接确认表', short: '对接确认表',
    icon: 'fa-solid fa-clipboard-list', file: 'stage2/contact-form.md',
    tplHtml: { stage: '02', html: '2-需求与数据对接确认表【交付】（含组织关系）.html' },
    hint: '第一轮摸清组织关系五层人 + 逐轮挖需求、对数据源就绪度。',
  },
  {
    key: 'ai-capability', name: 'AI 需求能力清单', short: 'AI能力清单',
    icon: 'fa-solid fa-wand-magic-sparkles', file: 'stage2/ai-capability.md',
    tplHtml: { stage: '02', html: '3-AI需求能力清单【交付】.html' },
    hint: '客户要的 AI 能力逐条列出，每条带效果指标 + 验收口径（如“问数≤30秒/准确率≥95%”）。',
  },
  {
    key: 'feature-spec', name: '产品功能清单（六字段）', short: '功能清单',
    icon: 'fa-solid fa-list-check', file: 'spec.md',
    skill: 'product-feature-spec',
    hint: '六字段红线：功能名称/所属页面/功能描述/优先级/关联智能体/数据依赖，缺一阶段四可打回。',
  },
  {
    key: 'prd2', name: '产品需求文档 PRD（三层）', short: 'PRD',
    icon: 'fa-solid fa-file-lines', file: 'stage2/prd.md',
    tpl: { stage: '03', md: '2.4-产品需求文档PRD(模板)【交付】.md' },
    hint: '目标层 / 功能层 / 交互层三层拆解，功能可追溯到需求。',
  },
];

// 阶段③交付物定义（AI 参照 FDE 手册模板生成）
const STAGE3_DELIVERABLES = [
  {
    key: 'final-req', name: '需求最终确认表', short: '需求确认表',
    icon: 'fa-solid fa-file-signature', file: 'stage3/final-req.md',
    tpl: { stage: '03', md: '2.4-产品需求文档PRD(模板)【交付】.md' }, // 无独立 md 模板时以 PRD 模板兜底结构
    hint: '把阶段②收敛后的需求签字定稿——项目概述/痛点/AI赋能方案/需求清单/验收口径。',
  },
  {
    key: 'agent-design', name: '智能体设计表', short: '设计表',
    icon: 'fa-solid fa-diagram-project', file: 'stage3/agent-design.md',
    tpl: { stage: '03', md: '1-智能体设计表【交付】.md' },
    hint: '一个环节一个智能体：身份卡→五层拆解→六组件→提示词→知识库→技能→A/B→验收上线。',
  },
  {
    key: 'prd', name: '产品需求文档 PRD（定稿）', short: 'PRD',
    icon: 'fa-solid fa-file-lines', file: 'stage3/prd.md',
    tpl: { stage: '03', md: '2.4-产品需求文档PRD(模板)【交付】.md' },
    hint: '需求签字后升级为定稿版 PRD——目标/功能/交互三层，功能可追溯到需求。',
  },
];

// 当前阶段的交付物清单
const deliverablesForStage = (id) => (id === 3 ? STAGE3_DELIVERABLES : STAGE2_DELIVERABLES);

// Chat state - enhanced message structure
const messages = ref([]);
const chatInput = ref('');
const isStreaming = ref(false);
const isToolRunning = ref(false);
const messagesLoading = ref(true);
const toolLabel = ref('正在处理...');
const chatContainerRef = ref(null);
let currentStreamId = null;

// Spec state
const specContent = ref('');
const specLoading = ref(false);
const specEditing = ref(false);

// Prototype state
const prototypeFiles = ref([]);
const selectedFile = ref('');
const iframeKey = ref(0);
const iframeSrc = ref('');

// Iterate state
const iterateMessages = ref([]);
const iterateInput = ref('');
const iterateChatRef = ref(null);

// 原型「生成 / 重新生成」的流式消息（就地显示在原型页，不进对话 tab）
const prototypeGenMessages = ref([]);

// --- 阶段③ state ---
const stage3Messages = ref([]);
const stage3Input = ref('');
const stage3ChatRef = ref(null);

// 三个对话 tab 各自的多模态输入器（图片 / 文件 / 语音）。
// 语音识别文本回填到对应 tab 的输入框；发送时把 attachments 传入 hermes.prompt。
const reqComposer = useChatComposer({
  onTranscribe: (t) => { chatInput.value = (chatInput.value ? chatInput.value + ' ' : '') + t; },
  getSlug: () => props.slug,
});
const iterateComposer = useChatComposer({
  onTranscribe: (t) => { iterateInput.value = (iterateInput.value ? iterateInput.value + ' ' : '') + t; },
  getSlug: () => props.slug,
});
const stage3Composer = useChatComposer({
  onTranscribe: (t) => { stage3Input.value = (stage3Input.value ? stage3Input.value + ' ' : '') + t; },
  getSlug: () => props.slug,
});

// —— 通用交付物状态（阶段②③共用，按 currentStage 键控）——
const deliverableStage = ref(3);              // 当前打开交付物的阶段
const deliverableSelected = ref('');          // 当前选中的交付物 key
const deliverableContents = ref({});          // { 'stage:key': markdown }
const deliverableEditing = ref(false);
const deliverableBusy = ref(false);

// 当前阶段交付物清单 + 选中项 + 状态
const activeDeliverables = computed(() => (currentStage.value === 3 ? STAGE3_DELIVERABLES : STAGE2_DELIVERABLES));
const selectedDeliverable = computed(() =>
  activeDeliverables.value.find((d) => d.key === deliverableSelected.value) || null
);
const activeDeliverableContent = computed(() =>
  deliverableContents.value[`${currentStage.value}:${deliverableSelected.value}`] || ''
);
const deliverableStatus = computed(() => {
  const m = {};
  activeDeliverables.value.forEach((d) => {
    m[d.key] = deliverableContents.value[`${currentStage.value}:${d.key}`] ? 'ready' : 'empty';
  });
  return m;
});

const stage3Quick = [
  '帮我把阶段②收敛的需求整理成最终确认清单',
  '这个项目该拆成哪几个智能体？画个矩阵',
  '梳理一下每个智能体的输入输出和边界',
];
const stage2Quick = [
  '帮我梳理这个项目的核心需求和使用场景',
  '这个客户可能有哪些痛点？该问哪些问题',
  '基于我们聊的，列一下需要哪些 AI 能力',
];

// Session update subscription
let unsubscribe = null;

// Determine which messages array to target based on active tab
const currentMessages = computed(() => activeTab.value === 'iterate' ? iterateMessages : (activeTab.value === 'chat3' ? stage3Messages : messages));

// 按当前 tab 取对应的消息数组（.value）——统一入口，供流式渲染/追加使用
// streamTargetTab 非空时优先（用于原型页迭代：在 prototype tab 触发，但内容应归到 iterate 流）
const streamTargetTab = ref('');
function activeMessagesArr() {
  const t = streamTargetTab.value || activeTab.value;
  if (t === 'iterate') return iterateMessages.value;
  if (t === 'chat3') return stage3Messages.value;
  if (t === 'prototype-gen') return prototypeGenMessages.value;
  return messages.value;
}
// 当前 tab 对应的持久化 tab 名
function activeTabName() {
  const t = streamTargetTab.value || activeTab.value;
  if (t === 'iterate') return 'iterate';
  if (t === 'chat3') return 'chat3';
  if (t === 'prototype-gen') return 'prototype-gen';
  return 'requirement';
}

// --- Helper: create a fresh message object ---
function createMessage(role, content, extra = {}) {
  return {
    role,
    content: content || '',
    thinkingSteps: [],
    thinkingDone: true,
    expanded: false,
    typingContent: '',
    timestamp: formatTimestamp(),
    ...extra,
  };
}

function formatTimestamp(date) {
  const d = date || new Date();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${mm}-${dd} ${h}:${m}`;
}

// --- Helper: format tool call text nicely ---
function formatToolCallText(title, args) {
  if (!title) return '正在处理...';

  // Try to parse args if it's a string
  let argsObj = args || {};
  if (typeof argsObj === 'string') {
    try { argsObj = JSON.parse(argsObj); } catch (e) {}
  }

  const name = title.toLowerCase();

  if (name.includes('read_file') || name.includes('read')) {
    const p = argsObj.path || argsObj.file_path || title;
    return `📄 查看了 \`${p}\``;
  }
  if (name.includes('write_to_file') || name.includes('write_file') || name.includes('write')) {
    const p = argsObj.path || argsObj.file_path || title;
    return `📝 写入了 \`${p}\``;
  }
  if (name.includes('execute_command') || name.includes('exec') || name.includes('command')) {
    const cmd = argsObj.command || argsObj.cmd || title;
    return `💻 执行了命令:\n\`${cmd}\``;
  }
  if (name.includes('list_dir') || name.includes('list_files')) {
    const p = argsObj.path || argsObj.dir || title;
    return `📁 查看了目录: \`${p}\``;
  }
  if (name.includes('apply_diff') || name.includes('edit')) {
    const p = argsObj.path || title;
    return `✏️ 编辑了 \`${p}\``;
  }
  if (name.includes('search')) {
    return `🔍 搜索了 \`${argsObj.regex || argsObj.query || title}\``;
  }

  return `🔧 ${title}`;
}

// --- Markdown rendering ---
const renderMarkdown = (text) => {
  if (!text) return '';
  return marked(text, { breaks: true, gfm: true });
};

const renderedSpec = computed(() => {
  if (!specContent.value) return '';
  return marked(specContent.value, { breaks: true, gfm: true });
});

// --- Render assistant content with typewriter cursor ---
const renderAssistantContent = (msg, index) => {
  const targetMessages = activeMessagesArr();
  const isLast = index === targetMessages.length - 1;

  // If still streaming and this is the last message, show typing content with cursor
  if (isLast && isStreaming.value && msg.role === 'assistant') {
    const content = msg.typingContent || msg.content || '';
    if (content) {
      return renderMarkdown(content) + "<span class='inline-block w-2 h-4 bg-blue-500 ml-1 rounded-sm animate-pulse align-middle'></span>";
    }
    // Still waiting for first content
    return "<span class='inline-block w-2 h-4 bg-blue-500 ml-1 rounded-sm animate-pulse align-middle'></span>";
  }

  return renderMarkdown(msg.content);
};

// --- Load project ---
const loadProject = async () => {
  messagesLoading.value = true;
  try {
    const data = await window.api.hermes.loadProject(props.slug);
    if (data) {
      projectMeta.value = data.meta || data;
      projectName.value = data.meta?.name || data.name || props.slug;
      // 读取 FDE 阶段状态(主进程已对旧项目补默认)
      const m = projectMeta.value || {};
      if (typeof m.stage === 'number') currentStage.value = m.stage;
      if (m.stageStatus && typeof m.stageStatus === 'object') stageStatus.value = m.stageStatus;
      if (data.messages && data.messages.length > 0) {
        const reqMsgs = data.messages.filter(m => m.tab !== 'iterate' && m.tab !== 'chat3');
        const itMsgs = data.messages.filter(m => m.tab === 'iterate');
        const s3Msgs = data.messages.filter(m => m.tab === 'chat3');
        if (reqMsgs.length) {
          messages.value = reqMsgs.map(m => createMessage(m.role || 'assistant', m.content || ''));
        }
        if (itMsgs.length) {
          iterateMessages.value = itMsgs.map(m => createMessage(m.role || 'assistant', m.content || ''));
        }
        if (s3Msgs.length) {
          stage3Messages.value = s3Msgs.map(m => createMessage(m.role || 'assistant', m.content || ''));
        }
      }
      if (data.sessionRecovered) {
        messages.value.push(createMessage('assistant', '检测到之前的会话已过期，已从项目文件中自动恢复上下文，可以继续之前的工作。'));
      }
    }
  } catch (e) {
    console.error('Failed to load project:', e);
    projectName.value = props.slug;
  } finally {
    messagesLoading.value = false;
  }
};

// --- Session update handler ---
let streamEndTimer = null;

const scheduleStreamEnd = () => {
  // Don't auto-end while tools are running — AI may be between tool calls
  if (isToolRunning.value) return;
  if (streamEndTimer) clearTimeout(streamEndTimer);
  // 120 seconds — generous fallback; normal ending relies on agent_message_end event
  streamEndTimer = setTimeout(() => {
    if (isStreaming.value && !isToolRunning.value) {
      flushTypewriterQueue();
      finalizeLastAssistantMessage();
      isStreaming.value = false;
      loadSpec();
      refreshPrototypeFiles();
    }
  }, 120000);
};

// --- Typewriter effect ---
const typewriterQueue = [];
let typewriterTimer = null;
const TYPEWRITER_INTERVAL = 30; // ms per chunk

const enqueueChunk = (text) => {
  typewriterQueue.push(text);
  if (!typewriterTimer) {
    drainTypewriter();
  }
};

const drainTypewriter = () => {
  if (typewriterQueue.length === 0) {
    typewriterTimer = null;
    return;
  }
  const text = typewriterQueue.shift();
  appendAssistantText(text);
  scrollToBottom();
  typewriterTimer = setTimeout(drainTypewriter, TYPEWRITER_INTERVAL);
};

const flushTypewriterQueue = () => {
  if (typewriterTimer) clearTimeout(typewriterTimer);
  typewriterTimer = null;
  while (typewriterQueue.length > 0) {
    appendAssistantText(typewriterQueue.shift());
  }
  scrollToBottom();
};

const appendAssistantText = (text) => {
  const targetMessages = activeMessagesArr();
  const lastMsg = targetMessages[targetMessages.length - 1];
  if (lastMsg && lastMsg.role === 'assistant') {
    // Append to typingContent (which shows during streaming) and content (the final)
    lastMsg.typingContent = (lastMsg.typingContent || '') + text;
    lastMsg.content = (lastMsg.content || '') + text;
  } else {
    targetMessages.push(createMessage('assistant', text, {
      thinkingSteps: [],
      thinkingDone: false,
      expanded: true,
      typingContent: text,
    }));
  }
};

// --- Finalize the last assistant message when streaming ends ---
const finalizeLastAssistantMessage = () => {
  const targetMessages = activeMessagesArr();
  const lastMsg = targetMessages[targetMessages.length - 1];
  if (lastMsg && lastMsg.role === 'assistant') {
    lastMsg.thinkingDone = true;
    lastMsg.expanded = false;
    lastMsg.typingContent = '';
    lastMsg.timestamp = formatTimestamp();
    if (lastMsg.thinkingSteps && lastMsg.thinkingSteps.length > 0) {
      // Summarize what was done instead of generic "处理完成"
      const toolSteps = lastMsg.thinkingSteps.filter(s => s.icon === 'fa-solid fa-wrench' || s.text.startsWith('✅'));
      const summary = toolSteps.length > 0
        ? `全部完成（${toolSteps.length} 个操作）`
        : '回复完成';
      lastMsg.thinkingSteps.push({
        text: summary,
        icon: 'fa-solid fa-flag-checkered',
        visible: true,
      });
    }

    // Persist assistant message
    if (lastMsg.content) {
      const tab = activeTabName();
      window.api.hermes.saveMessage(props.slug, { role: 'assistant', content: lastMsg.content, tab, timestamp: new Date().toISOString() });
    }
  }
};

// --- Get or create the current assistant message for streaming ---
const getOrCreateAssistantMsg = () => {
  const targetMessages = activeMessagesArr();
  const lastMsg = targetMessages[targetMessages.length - 1];
  // 未结束 → 继续追加
  if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.thinkingDone) {
    return lastMsg;
  }
  // 已结束但 streamId 匹配当前轮次 → 重新打开追加（防止竞态丢内容）
  if (lastMsg && lastMsg.role === 'assistant' && lastMsg.streamId && lastMsg.streamId === currentStreamId) {
    lastMsg.thinkingDone = false;
    return lastMsg;
  }
  // 否则新建
  const newMsg = createMessage('assistant', '', {
    thinkingSteps: [],
    thinkingDone: false,
    expanded: true,
    typingContent: '',
    timestamp: '',
    streamId: currentStreamId,
  });
  targetMessages.push(newMsg);
  return newMsg;
};

const handleSessionUpdate = (data) => {
  if (!data) return;
  // ACP notification structure varies — normalize access
  const update = data.update || data;
  const type = update.type || update.sessionUpdate || data.type || data.sessionUpdate;

  // Debug: log every incoming event to help diagnose silent drops
  if (!type) {
    console.warn('[ProjectDetail] session-update with no type:', JSON.stringify(data).slice(0, 300));
    return;
  }
  console.log('[ProjectDetail] session-update:', type);

  if (type === 'agent_message_chunk' || type === 'content_block_delta') {
    const text = update.content?.text || update.content || '';
    if (!isStreaming.value) {
      addLog('info', '📝 AI 开始生成回复内容');
    }
    isStreaming.value = true;
    isToolRunning.value = false;
    if (thoughtBuffer) flushThoughtBuffer();
    enqueueChunk(text);
    scheduleStreamEnd();
  } else if (type === 'agent_thought_chunk' || type === 'agent_reasoning') {
    // Accumulate thought tokens into a single thinking step (not one per token)
    const text = update.content?.text || update.content || '';
    if (text && isStreaming.value) {
      const assistantMsg = getOrCreateAssistantMsg();
      const steps = assistantMsg.thinkingSteps;
      // Find the last "thinking" step to append to (must be brain icon and not finalized)
      const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
      if (lastStep && lastStep.icon === 'fa-solid fa-brain' && !lastStep._done) {
        lastStep.text += text;
      } else {
        steps.push({
          text: text,
          icon: 'fa-solid fa-brain',
          visible: true,
          _done: false,
        });
      }
      // Buffer thoughts for agent logs — flush when buffer exceeds 50 chars or after 500ms
      thoughtBuffer += text;
      if (thoughtFlushTimer) clearTimeout(thoughtFlushTimer);
      if (thoughtBuffer.length >= 50) {
        flushThoughtBuffer();
      } else {
        thoughtFlushTimer = setTimeout(flushThoughtBuffer, 500);
      }
    }
    if (isStreaming.value) scheduleStreamEnd();
  } else if (type === 'tool_call_start') {
    if (streamEndTimer) clearTimeout(streamEndTimer);
    flushTypewriterQueue();
    // Flush thought buffer when a tool starts
    if (thoughtBuffer) flushThoughtBuffer();
    isToolRunning.value = true;
    isStreaming.value = true;

    const assistantMsg = getOrCreateAssistantMsg();
    // Mark the last thought step as done (so next thought starts fresh)
    const steps = assistantMsg.thinkingSteps;
    if (steps.length > 0 && steps[steps.length - 1].icon === 'fa-solid fa-brain') {
      steps[steps.length - 1]._done = true;
      // Trim very long thoughts to a summary
      const lastThought = steps[steps.length - 1];
      if (lastThought.text.length > 200) {
        lastThought.text = lastThought.text.slice(0, 150) + '... (思考中)';
      }
    }

    const title = update.title || update.name || '正在执行工具...';
    const args = update.arguments || update.args || {};
    toolLabel.value = title;

    assistantMsg.thinkingSteps.push({
      text: formatToolCallText(title, args),
      icon: 'fa-solid fa-wrench',
      visible: true,
    });
    addLog('tool', formatToolCallText(title, args), 'running');
    scrollToBottom();
  } else if (type === 'tool_call_progress') {
    if (update.status === 'completed' || update.status === 'failed') {
      isToolRunning.value = false;
      const assistantMsg = getOrCreateAssistantMsg();
      const title = update.title || update.name || '';
      if (update.status === 'completed') {
        const detail = update.content?.text || title || '完成';
        assistantMsg.thinkingSteps.push({
          text: `✅ ${formatToolCallText(title, update.arguments || update.args || {})}`,
          icon: 'fa-solid fa-check',
          visible: true,
        });
        addLog('tool', '✓ ' + (title || '完成'), 'completed');
      } else {
        assistantMsg.thinkingSteps.push({
          text: `❌ 失败: ${update.message || title || '未知错误'}`,
          icon: 'fa-solid fa-xmark',
          visible: true,
        });
        addLog('tool', '✗ ' + (title || '工具执行失败'), 'failed');
      }
      scrollToBottom();
    }
  } else if (type === 'tool_call_end') {
    isToolRunning.value = false;
    // Mark tool completion in thinking steps if no tool_call_progress was sent
    const assistantMsg = getOrCreateAssistantMsg();
    const toolName = update.title || update.name || update.toolName || '';
    if (toolName) {
      assistantMsg.thinkingSteps.push({
        text: `✅ ${toolName} 完成`,
        icon: 'fa-solid fa-circle-check',
        visible: true,
      });
      addLog('tool', '✓ ' + toolName, 'completed');
    }
    scrollToBottom();
    scheduleStreamEnd();
  } else if (type === 'agent_message_end' || type === 'session_end' || type === 'stop') {
    if (streamEndTimer) clearTimeout(streamEndTimer);
    if (thoughtBuffer) flushThoughtBuffer();
    flushTypewriterQueue();
    finalizeLastAssistantMessage();
    isStreaming.value = false;
    isToolRunning.value = false;
    // Rich completion log with usage stats if available
    const usage = update.usage || data.usage || {};
    let doneMsg = '✅ 回复完成';
    if (usage.totalTokens || usage.total_tokens) {
      const total = usage.totalTokens || usage.total_tokens || 0;
      const input = usage.inputTokens || usage.input_tokens || 0;
      const output = usage.outputTokens || usage.output_tokens || 0;
      doneMsg += ` | tokens: ${input}→${output} (${total})`;
    }
    addLog('info', doneMsg);
    // 原型迭代结束：刷新 iframe 并清除流目标标记
    if (activeTab.value === 'iterate' || streamTargetTab.value === 'iterate') {
      iframeKey.value++;
      refreshPrototypeFiles();
      streamTargetTab.value = '';
    }
    loadSpec();
    refreshPrototypeFiles();
    // 阶段②③：AI 可能刚写完交付物文件，读回渲染
    if (currentStage.value === 2 || currentStage.value === 3) {
      deliverableBusy.value = false;
      loadDeliverablesForStage(currentStage.value);
    }
  } else if (type === 'usage_update' || type === 'usage') {
    // Rich usage info: model, tokens, latency
    const used = update.used || 0;
    const size = update.size || 0;
    const pct = size > 0 ? Math.round((used / size) * 100) : 0;
    const model = update.model || '';
    const latency = update.latency ? `${update.latency}s` : '';
    const inputTokens = update.inputTokens || update.input_tokens || '';
    const outputTokens = update.outputTokens || update.output_tokens || '';

    let logContent = `上下文: ${(used/1000).toFixed(1)}k/${(size/1000).toFixed(0)}k (${pct}%)`;
    if (inputTokens || outputTokens) {
      logContent += ` | in:${inputTokens} out:${outputTokens}`;
    }
    if (model) {
      logContent += ` | ${model}`;
    }
    if (latency) {
      logContent += ` | ${latency}`;
    }
    addLog('usage', logContent);

    if (isStreaming.value && !isToolRunning.value) {
      scheduleStreamEnd();
    }
    if (update.used && update.size) {
      addLog('usage', `tokens: ${update.used}/${update.size}`);
    }
    if (isStreaming.value && !isToolRunning.value) {
      scheduleStreamEnd();
    }
  } else if (type === 'error') {
    if (streamEndTimer) clearTimeout(streamEndTimer);
    if (thoughtBuffer) flushThoughtBuffer();
    isStreaming.value = false;
    isToolRunning.value = false;
    addLog('error', update.message || '请求失败');
    const targetMessages = activeMessagesArr();
    targetMessages.push(createMessage('assistant', `**Error:** ${update.message || '请求失败'}`));
  }
};

// --- Chat functions ---
const sendMessage = async () => {
  const text = chatInput.value.trim();
  const atts = reqComposer.attachments.value;
  if ((!text && atts.length === 0) || isStreaming.value) return;

  messages.value.push(createMessage('user', text, atts.length ? { attachments: [...atts] } : {}));
  chatInput.value = '';
  const sending = [...atts];
  reqComposer.clearAttachments();
  isStreaming.value = true;
  currentStreamId = Date.now().toString();

  window.api.hermes.saveMessage(props.slug, { role: 'user', content: text, tab: 'requirement', timestamp: new Date().toISOString() });

  // Pre-create assistant message with initial thinking step
  messages.value.push(createMessage('assistant', '', {
    thinkingSteps: [
      { text: '已发送请求，等待 AI 响应...', icon: 'fa-solid fa-cloud-arrow-up', visible: true },
    ],
    thinkingDone: false,
    expanded: true,
    typingContent: '',
    timestamp: '',
    streamId: currentStreamId,
  }));

  scrollToBottom();

  try {
    await window.api.hermes.prompt(props.slug, text, sending);
    // 延迟兜底：正常情况由 agent_message_end 事件结束
    setTimeout(() => {
      if (isStreaming.value) {
        finalizeLastAssistantMessage();
        isStreaming.value = false;
        isToolRunning.value = false;
        loadSpec();
      }
    }, 2000);
  } catch (e) {
    console.error('Prompt failed:', e);
    isStreaming.value = false;
  }
};

const sendIterate = async () => {
  const text = iterateInput.value.trim();
  const atts = iterateComposer.attachments.value;
  if ((!text && atts.length === 0) || isStreaming.value) return;

  streamTargetTab.value = 'iterate';   // 原型页迭代：内容归到 iterate 流，不污染需求对话
  iterateMessages.value.push(createMessage('user', text, atts.length ? { attachments: [...atts] } : {}));
  iterateInput.value = '';
  const sending = [...atts];
  iterateComposer.clearAttachments();
  isStreaming.value = true;
  currentStreamId = Date.now().toString();

  window.api.hermes.saveMessage(props.slug, { role: 'user', content: text, tab: 'iterate', timestamp: new Date().toISOString() });

  // Pre-create assistant message with initial thinking step
  iterateMessages.value.push(createMessage('assistant', '', {
    thinkingSteps: [
      { text: '已发送请求，等待 AI 响应...', icon: 'fa-solid fa-cloud-arrow-up', visible: true },
    ],
    thinkingDone: false,
    expanded: true,
    typingContent: '',
    timestamp: '',
    streamId: currentStreamId,
  }));

  try {
    await window.api.hermes.prompt(props.slug, `/prototype-iterate ${text}`, sending);
    // 延迟兜底：正常情况由 agent_message_end 事件结束
    setTimeout(() => {
      if (isStreaming.value) {
        finalizeLastAssistantMessage();
        isStreaming.value = false;
        isToolRunning.value = false;
        iframeKey.value++;
        refreshPrototypeFiles();
        streamTargetTab.value = '';
      }
    }, 2000);
  } catch (e) {
    console.error('Iterate prompt failed:', e);
    isStreaming.value = false;
    streamTargetTab.value = '';
  }
};

// ============ 阶段③：需求确认 + 智能体设计 ============

// 阶段③对话发送（复用项目级 prompt 通道，注入阶段语境）
const sendStage3 = async () => {
  const text = stage3Input.value.trim();
  const atts = stage3Composer.attachments.value;
  if ((!text && atts.length === 0) || isStreaming.value) return;

  stage3Messages.value.push(createMessage('user', text, atts.length ? { attachments: [...atts] } : {}));
  stage3Input.value = '';
  const sending = [...atts];
  stage3Composer.clearAttachments();
  isStreaming.value = true;
  currentStreamId = Date.now().toString();

  window.api.hermes.saveMessage(props.slug, { role: 'user', content: text, tab: 'chat3', timestamp: new Date().toISOString() });

  stage3Messages.value.push(createMessage('assistant', '', {
    thinkingSteps: [{ text: '已发送请求，等待 AI 响应...', icon: 'fa-solid fa-cloud-arrow-up', visible: true }],
    thinkingDone: false, expanded: true, typingContent: '', timestamp: '', streamId: currentStreamId,
  }));
  scrollToBottom();

  const framed = `【阶段③ 需求确认+智能体设计】你是 FDE 交付工程师。当前任务：把阶段②收敛后的需求签字定死，并把业务链路拆成智能体矩阵（一个环节一个智能体、上游输出=下游输入、过 Eval 门禁）。请围绕以下用户输入继续推进，必要时追问澄清：\n\n${text}`;
  try {
    await window.api.hermes.prompt(props.slug, framed, sending);
    setTimeout(() => {
      if (isStreaming.value) {
        finalizeLastAssistantMessage();
        isStreaming.value = false;
        isToolRunning.value = false;
      }
    }, 2000);
  } catch (e) {
    console.error('Stage3 prompt failed:', e);
    isStreaming.value = false;
  }
};

// —— 通用交付物：读取 / 加载 / 生成 / 保存 / 导出（阶段②③共用）——

const dkey = (stageId, key) => `${stageId}:${key}`;

// 读取某份交付物文件到 deliverableContents
const loadDeliverable = async (stageId, d) => {
  try {
    const result = await window.api.hermes.readFile(props.slug, d.file);
    if (result && result.success && result.content) {
      deliverableContents.value = { ...deliverableContents.value, [dkey(stageId, d.key)]: result.content };
    }
  } catch (e) { /* 未生成，忽略 */ }
};

const loadDeliverablesForStage = async (stageId) => {
  for (const d of deliverablesForStage(stageId)) {
    await loadDeliverable(stageId, d);
  }
};

// 生成某份交付物：读模板(md/html)或走 skill → 拼 prompt → AI 真跑 write_file → 读回
const generateDeliverable = async (key) => {
  if (isStreaming.value || deliverableBusy.value) return;
  const stageId = currentStage.value;
  const d = deliverablesForStage(stageId).find((x) => x.key === key);
  if (!d) return;

  deliverableSelected.value = key;
  deliverableBusy.value = true;
  isStreaming.value = true;

  // 生成留痕：写到当前阶段的对话流
  const chatArr = stageId === 3 ? stage3Messages : messages;
  chatArr.value.push(createMessage('user', `请生成《${d.name}》`));
  chatArr.value.push(createMessage('assistant', '', {
    thinkingSteps: [{ text: `正在生成《${d.name}》...`, icon: 'fa-solid fa-wand-magic-sparkles', visible: true }],
    thinkingDone: false, expanded: true, typingContent: '', timestamp: '',
  }));

  const reqName = projectMeta.value?.name || props.slug;
  let prompt = '';

  if (d.skill) {
    // 走现成 skill（如 product-feature-spec），不塞模板
    prompt = `/${d.skill} 根据本项目"${reqName}"之前的需求对话上下文，生成《${d.name}》。\n\n`
      + `【重要】把生成的完整内容用 write_file 工具写入当前项目目录下的 \`${d.file}\` 文件（Markdown 格式）。`;
  } else {
    // 读手册模板（md 优先，否则 html 当结构参考）
    let tplText = '';
    try {
      if (d.tpl) {
        const t = await window.api.handbook.readMd(d.tpl.stage, d.tpl.md);
        if (t && t.success) tplText = t.content || '';
      } else if (d.tplHtml) {
        const t = await window.api.handbook.readHtml(d.tplHtml.stage, d.tplHtml.html);
        if (t && t.success) tplText = t.content || '';
      }
    } catch (e) { tplText = ''; }

    prompt = `【阶段${stageId} 交付物生成】基于本项目"${reqName}"之前的需求对话上下文，生成《${d.name}》。\n\n`
      + (tplText
        ? `严格参照以下 FDE 手册模板的结构与字段（这是标准格式，不要照抄示例内容，要结合本项目实际填写）：\n\n----- 模板开始 -----\n${tplText.slice(0, 6000)}\n----- 模板结束 -----\n\n`
        : `请按该交付物的行业标准结构组织内容。\n\n`)
      + `【重要】把生成的完整内容用 write_file 工具写入当前项目目录下的 \`${d.file}\` 文件（Markdown 格式，若目录不存在请一并创建）。`;
  }

  try {
    await window.api.hermes.prompt(props.slug, prompt);
    setTimeout(async () => {
      finalizeLastAssistantMessage();
      isStreaming.value = false;
      isToolRunning.value = false;
      deliverableBusy.value = false;
      await loadDeliverable(stageId, d);
    }, 3000);
  } catch (e) {
    console.error('Generate deliverable failed:', e);
    isStreaming.value = false;
    deliverableBusy.value = false;
  }
};

// —— 对话顶部「快捷操作」：按阶段动态。每件交付物一个生成按钮 + 一个「生成原型」——
const quickActions = computed(() => {
  const acts = activeDeliverables.value.map((d) => ({
    key: d.key, label: `生成${d.short}`, icon: d.icon, kind: 'deliverable',
  }));
  acts.push({ key: '__proto__gen', label: '生成原型', icon: 'fa-solid fa-wand-magic-sparkles', kind: 'prototype' });
  return acts;
});

const runQuickAction = (act) => {
  if (isStreaming.value || deliverableBusy.value) return;
  if (act.kind === 'prototype') {
    activeTab.value = 'prototype';
    generatePrototype();
  } else {
    deliverableSelected.value = act.key;
    activeTab.value = currentStage.value === 3 ? 'deliverables3' : 'deliverables2';
    generateDeliverable(act.key);
  }
};

const saveDeliverable = async (key) => {
  const stageId = currentStage.value;
  const d = deliverablesForStage(stageId).find((x) => x.key === key);
  if (!d) return;
  try {
    await window.api.hermes.writeFile(props.slug, d.file, deliverableContents.value[dkey(stageId, key)] || '');
    deliverableEditing.value = false;
  } catch (e) { console.error('Save deliverable failed:', e); }
};

const updateDeliverableContent = (val) => {
  deliverableContents.value = { ...deliverableContents.value, [dkey(currentStage.value, deliverableSelected.value)]: val };
};

const exportDeliverableMd = async (key) => {
  const stageId = currentStage.value;
  const d = deliverablesForStage(stageId).find((x) => x.key === key);
  const content = d && deliverableContents.value[dkey(stageId, key)];
  if (!d || !content) return;
  try {
    await window.api.hermes.writeFile(props.slug, d.file, content);
    await window.api.hermes.openInBrowser(props.slug, d.file);
  } catch (e) { console.error('Export deliverable md failed:', e); }
};

const cancelStream = async () => {
  try {
    await window.api.hermes.cancel(props.slug);
  } catch (e) {
    console.error('Cancel failed:', e);
  }
  flushTypewriterQueue();
  finalizeLastAssistantMessage();
  isStreaming.value = false;
  isToolRunning.value = false;
};

const scrollToBottom = () => {
  nextTick(() => {
    if ((activeTab.value === 'iterate' || (activeTab.value === 'prototype' && streamTargetTab.value === 'iterate')) && iterateChatRef.value) {
      iterateChatRef.value.scrollTop = iterateChatRef.value.scrollHeight;
    } else if (activeTab.value === 'chat3' && stage3ChatRef.value) {
      stage3ChatRef.value.scrollTop = stage3ChatRef.value.scrollHeight;
    } else if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
    }
  });
};

// --- Spec functions ---
const loadSpec = async () => {
  specLoading.value = true;
  try {
    const result = await window.api.hermes.readFile(props.slug, 'spec.md');
    if (result && result.success && result.content) {
      specContent.value = result.content;
    } else {
      specContent.value = '';
    }
  } catch (e) {
    specContent.value = '';
  } finally {
    specLoading.value = false;
  }
};

const toggleSpecEdit = () => {
  specEditing.value = !specEditing.value;
};

const generateSpec = async () => {
  isStreaming.value = true;
  activeTab.value = 'requirement';
  const requirement = projectMeta.value?.requirement || projectMeta.value?.name || '这个产品';
  messages.value.push(createMessage('user', '请根据我们之前的讨论，生成完整的产品功能清单'));
  messages.value.push(createMessage('assistant', '', {
    thinkingSteps: [
      { text: '正在生成功能清单...', icon: 'fa-solid fa-list-check', visible: true },
    ],
    thinkingDone: false,
    expanded: true,
    typingContent: '',
    timestamp: '',
  }));
  scrollToBottom();

  try {
    await window.api.hermes.prompt(props.slug, `/product-feature-spec 根据之前的对话讨论，为"${requirement}"生成完整的产品功能清单。\n\n【重要】请将生成的功能清单用 write_file 工具写入当前目录的 spec.md 文件中。`);
    finalizeLastAssistantMessage();
    isStreaming.value = false;
    loadSpec();
    activeTab.value = 'deliverables2';
  } catch (e) {
    console.error('Generate spec failed:', e);
    isStreaming.value = false;
  }
};

const saveSpec = async () => {
  try {
    await window.api.hermes.writeFile(props.slug, 'spec.md', specContent.value);
    specEditing.value = false;
  } catch (e) {
    console.error('Failed to save spec:', e);
  }
};

const exportSpec = async () => {
  if (!specContent.value) {
    await loadSpec();
  }
  if (specContent.value) {
    try {
      await window.api.hermes.writeFile(props.slug, 'spec.md', specContent.value);
      await window.api.hermes.openInBrowser(props.slug, 'spec.md');
    } catch (e) {
      console.error('Export spec failed:', e);
    }
  }
};

const exportWord = async () => {
  if (!specContent.value) {
    await loadSpec();
  }
  if (specContent.value) {
    try {
      await window.api.hermes.writeFile(props.slug, 'spec.md', specContent.value);
      await window.api.hermes.exportWord(props.slug);
    } catch (e) {
      console.error('Export word failed:', e);
    }
  }
};

// --- Prototype functions ---
const refreshPrototypeFiles = async () => {
  try {
    const result = await window.api.hermes.listFiles(props.slug, 'prototype');
    const files = (result && result.success) ? (result.files || []) : (Array.isArray(result) ? result : []);
    prototypeFiles.value = files.filter(f => !f.isDirectory && f.name.endsWith('.html'));
    if (prototypeFiles.value.length > 0 && !selectedFile.value) {
      selectPrototypeFile(prototypeFiles.value[0].name);
    }
  } catch (e) {
    prototypeFiles.value = [];
  }
};

const selectPrototypeFile = async (fileName) => {
  selectedFile.value = fileName;
  try {
    const result = await window.api.hermes.prototypeUrl(props.slug, fileName);
    if (result && result.success) {
      iframeSrc.value = result.url;
    } else {
      // Fallback to blob if server not available
      const content = await window.api.hermes.readFile(props.slug, `prototype/${fileName}`);
      const blob = new Blob([content], { type: 'text/html' });
      iframeSrc.value = URL.createObjectURL(blob);
    }
    iframeKey.value++;
  } catch (e) {
    console.error('Failed to load prototype file:', e);
  }
};

const openInBrowser = async () => {
  try {
    const file = selectedFile.value || (prototypeFiles.value[0]?.name);
    if (file) {
      await window.api.hermes.openInBrowser(props.slug, `prototype/${file}`);
    }
  } catch (e) {
    console.error('Open in browser failed:', e);
  }
};

const generatePrototype = async () => {
  if (isStreaming.value) return;
  activeTab.value = 'prototype';
  streamTargetTab.value = 'iterate';           // 生成过程的流归到 iterate 消息数组，供原型页进度面板展示
  isStreaming.value = true;
  currentStreamId = Date.now().toString();
  iterateMessages.value.push(createMessage('user', '基于 stage2/prd.md 生成 HTML 原型'));
  iterateMessages.value.push(createMessage('assistant', '', {
    thinkingSteps: [
      { text: '正在准备生成原型...', icon: 'fa-solid fa-wand-magic-sparkles', visible: true },
    ],
    thinkingDone: false,
    expanded: true,
    typingContent: '',
    timestamp: '',
    streamId: currentStreamId,
  }));
  scrollToBottom();
  try {
    await window.api.hermes.prompt(props.slug, '/prototype-generator 基于当前项目目录下的 stage2/prd.md 生成 HTML 原型，输出到 prototype/ 目录');
  } catch (e) {
    console.error('Generate prototype failed:', e);
    finalizeLastAssistantMessage();
    isStreaming.value = false;
    streamTargetTab.value = '';
  }
};

const regeneratePrototype = async () => {
  if (isStreaming.value) return;
  activeTab.value = 'prototype';
  streamTargetTab.value = 'iterate';
  isStreaming.value = true;
  currentStreamId = Date.now().toString();
  iterateMessages.value.push(createMessage('user', '基于 stage2/prd.md 重新生成 HTML 原型'));
  iterateMessages.value.push(createMessage('assistant', '', {
    thinkingSteps: [
      { text: '正在准备重新生成原型...', icon: 'fa-solid fa-wand-magic-sparkles', visible: true },
    ],
    thinkingDone: false,
    expanded: true,
    typingContent: '',
    timestamp: '',
    streamId: currentStreamId,
  }));
  scrollToBottom();
  try {
    await window.api.hermes.prompt(props.slug, '/prototype-generator 基于当前项目目录下的 stage2/prd.md 重新生成 HTML 原型，输出到 prototype/ 目录');
  } catch (e) {
    console.error('Regenerate prototype failed:', e);
    finalizeLastAssistantMessage();
    isStreaming.value = false;
    streamTargetTab.value = '';
  }
};

// --- Export functions ---
const exportZip = async () => {
  try {
    await window.api.hermes.exportZip(props.slug);
  } catch (e) {
    console.error('Export zip failed:', e);
  }
};

// --- Lifecycle ---
onMounted(async () => {
  await loadProject();

  // 依据恢复后的当前阶段，把 activeTab 设为该阶段第一个 tab
  const stageTabs = tabsForStage(currentStage.value);
  if (!stageTabs.some(t => t.key === activeTab.value)) {
    activeTab.value = stageTabs[0]?.key || 'requirement';
  }

  // Set initial tab from query
  const queryTab = route.query.tab;
  if (queryTab && tabs.value.some(t => t.key === queryTab)) {
    activeTab.value = queryTab;
  }

  // Subscribe to session updates
  if (window.api && window.api.hermes && window.api.hermes.onSessionUpdate) {
    unsubscribe = window.api.hermes.onSessionUpdate(handleSessionUpdate);
  }

  // Load spec
  loadSpec();

  // 交付物：初始化当前阶段选中项 + 读回已生成的交付物
  const firstDeliv = deliverablesForStage(currentStage.value)[0];
  if (firstDeliv && !deliverableSelected.value) deliverableSelected.value = firstDeliv.key;
  loadDeliverablesForStage(currentStage.value);

  // Load prototype files
  refreshPrototypeFiles();

  // Auto-start if flagged
  if (route.query.autostart === 'true' && projectMeta.value) {
    const requirement = projectMeta.value.requirement || projectMeta.value.name || '';
    if (requirement) {
      messages.value.push(createMessage('user', requirement));
      isStreaming.value = true;

      // Pre-create assistant message
      messages.value.push(createMessage('assistant', '', {
        thinkingSteps: [
          { text: '已发送请求，等待 AI 响应...', icon: 'fa-solid fa-cloud-arrow-up', visible: true },
        ],
        thinkingDone: false,
        expanded: true,
        typingContent: '',
        timestamp: '',
      }));

      try {
        await window.api.hermes.prompt(props.slug, `/brainstorming ${requirement}`);
      } catch (e) {
        console.error('Auto-start prompt failed:', e);
        isStreaming.value = false;
      }
    }
  }
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
  if (streamEndTimer) clearTimeout(streamEndTimer);
  if (typewriterTimer) clearTimeout(typewriterTimer);
  if (thoughtFlushTimer) clearTimeout(thoughtFlushTimer);
});

// Watch tab changes to load relevant data
watch(activeTab, (newTab) => {
  if (newTab === 'deliverables2' || newTab === 'deliverables3') {
    loadDeliverablesForStage(currentStage.value);
  } else if (newTab === 'prototype') {
    refreshPrototypeFiles();
  }
});
</script>

<style scoped>
/* 所有可点击元素统一小手光标；禁用态恢复默认 */
button:not(:disabled),
[role="button"],
a,
textarea,
summary,
label[for] {
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
}
textarea {
  cursor: text;
}
/* Markdown Body Styles */
:deep(.markdown-body) {
  word-wrap: break-word;
}
:deep(.markdown-body p) {
  margin-bottom: 1em;
}
:deep(.markdown-body p:last-child) {
  margin-bottom: 0;
}
:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3),
:deep(.markdown-body h4),
:deep(.markdown-body h5),
:deep(.markdown-body h6) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 700;
  line-height: 1.25;
  color: #1e293b;
}
:deep(.markdown-body h1) { font-size: 1.5em; }
:deep(.markdown-body h2) { font-size: 1.25em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
:deep(.markdown-body h3) { font-size: 1.1em; }
:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  margin-top: 0;
  margin-bottom: 1em;
  padding-left: 2em;
}
:deep(.markdown-body ul) { list-style-type: disc; }
:deep(.markdown-body ol) { list-style-type: decimal; }
:deep(.markdown-body li + li) { margin-top: 0.25em; }
:deep(.markdown-body code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: #f1f5f9;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
  color: #0f172a;
}
:deep(.markdown-body pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f8fafc;
  border-radius: 8px;
  margin-bottom: 1em;
  border: 1px solid #e2e8f0;
}
:deep(.markdown-body pre code) {
  display: inline;
  max-width: auto;
  padding: 0;
  margin: 0;
  overflow: visible;
  line-height: inherit;
  word-wrap: normal;
  background-color: transparent;
  border: 0;
  color: #334155;
}
:deep(.markdown-body blockquote) {
  padding: 0 1em;
  color: #64748b;
  border-left: 0.25em solid #cbd5e1;
  margin-bottom: 1em;
}
:deep(.markdown-body table) {
  display: block;
  width: 100%;
  width: max-content;
  max-width: 100%;
  overflow: auto;
  margin-bottom: 1em;
  border-spacing: 0;
  border-collapse: collapse;
}
:deep(.markdown-body table th),
:deep(.markdown-body table td) {
  padding: 6px 13px;
  border: 1px solid #e2e8f0;
}
:deep(.markdown-body table tr) {
  background-color: #fff;
  border-top: 1px solid #e2e8f0;
}
:deep(.markdown-body table tr:nth-child(2n)) {
  background-color: #f8fafc;
}
:deep(.markdown-body hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e2e8f0;
  border: 0;
}

/* Compact Markdown for Thinking Steps */
:deep(.compact-markdown) {
  word-wrap: break-word;
  line-height: 1.25;
}
:deep(.compact-markdown p) {
  margin: 0 !important;
  padding: 0 !important;
}
:deep(.compact-markdown pre) {
  padding: 4px 8px !important;
  margin: 2px 0 !important;
  font-size: 11px !important;
  background-color: #f8fafc;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  overflow-x: auto;
}
:deep(.compact-markdown pre code) {
  background-color: transparent;
  border: 0;
  padding: 0;
  color: #334155;
  font-size: inherit;
}
:deep(.compact-markdown code) {
  padding: 0.1em 0.3em;
  font-size: 12px;
  background-color: #f1f5f9;
  border-radius: 4px;
  color: #0f172a;
  word-break: break-all;
  white-space: pre-wrap;
}

/* Hide scrollbar for a cleaner look */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Spec prose styles */
.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3) {
  color: #1e293b;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}
.prose :deep(ul),
.prose :deep(ol) {
  padding-left: 1.5em;
}
.prose :deep(code) {
  background: #f1f5f9;
  padding: 0.15em 0.4em;
  border-radius: 0.25rem;
  font-size: 0.85em;
}
.prose :deep(pre) {
  background: #1e293b;
  color: #e2e8f0;
  padding: 1em;
  border-radius: 0.75rem;
  overflow-x: auto;
}
.prose :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}
.prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
}
.prose :deep(th),
.prose :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 0.5em 0.75em;
  text-align: left;
}
.prose :deep(th) {
  background: #f8fafc;
  font-weight: 600;
}
</style>
