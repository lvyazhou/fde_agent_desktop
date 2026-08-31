<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <!-- Top bar: project name + tab bar -->
    <div class="shrink-0 bg-white border-b border-slate-200/80 px-6 pt-4 pb-0">
      <div class="flex items-center gap-3 mb-4">
        <RouterLink to="/projects" class="text-slate-400 hover:text-blue-700 transition-colors">
          <i class="fa-solid fa-arrow-left text-sm"></i>
        </RouterLink>
        <h1 class="text-lg font-bold text-slate-800 truncate">{{ projectName }}</h1>
        <!-- Panel toggle buttons (visible only for requirement/iterate tabs) -->
        <div v-if="activeTab === 'requirement' || activeTab === 'iterate'" class="ml-auto flex items-center gap-1">
          <button
            @click="showSessionPanel = !showSessionPanel"
            class="w-7 h-7 inline-flex items-center justify-center rounded-md transition-colors text-[11px]"
            :class="showSessionPanel ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'"
            title="会话侧栏"
          >
            <i class="fa-solid fa-bars-staggered"></i>
          </button>
          <button
            @click="showLogsPanel = !showLogsPanel"
            class="w-7 h-7 inline-flex items-center justify-center rounded-md transition-colors text-[11px]"
            :class="showLogsPanel ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'"
            title="执行日志"
          >
            <i class="fa-solid fa-terminal"></i>
          </button>
        </div>
      </div>
      <!-- Tabs -->
      <div class="flex items-center gap-1 -mb-px">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all"
          :class="activeTab === tab.key
            ? 'border-blue-700 text-blue-700 bg-blue-50/50'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'"
        >
          <i :class="tab.icon" class="mr-1.5 text-xs"></i>
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Tab content body -->
    <div class="flex-1 flex min-h-0 overflow-hidden">

      <!-- Requirement Chat Tab — three-column layout -->
      <div v-if="activeTab === 'requirement'" class="flex h-full w-full">
        <!-- Left: Session panel -->
        <div v-show="showSessionPanel" class="w-[220px] shrink-0 bg-white border-r border-slate-200/60 flex flex-col overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">会话</span>
            <button class="text-slate-400 hover:text-slate-600 text-xs" @click="showSessionPanel = false">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-2">
            <div v-if="userMessageSummaries.length === 0" class="text-xs text-slate-400 text-center py-6">
              暂无对话记录
            </div>
            <!-- Current session item - active -->
            <div class="px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100/60 mb-1">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                <span class="text-[13px] font-medium text-blue-800 truncate">{{ projectName }}</span>
              </div>
              <div class="text-[11px] text-blue-600/70 mt-1 ml-4">当前对话</div>
            </div>
            <button
              v-for="(entry, i) in userMessageSummaries"
              :key="i"
              @click="scrollToMessage(entry.index)"
              class="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors truncate flex items-center gap-2 group"
            >
              <span class="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 text-[10px] text-slate-400 group-hover:text-blue-500 font-semibold">
                {{ i + 1 }}
              </span>
              <span class="truncate">{{ entry.preview }}</span>
            </button>
          </div>
        </div>

        <!-- Center: Chat area -->
        <div class="flex-1 flex flex-col min-w-0 relative bg-[#f4f7f6]">
          <!-- Toggle left panel button when hidden -->
          <button v-if="!showSessionPanel" @click="showSessionPanel = true"
            class="absolute top-3 left-3 z-10 w-8 h-8 rounded-lg bg-white/80 backdrop-blur border border-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center shadow-sm transition-all">
            <i class="fa-solid fa-bars text-xs"></i>
          </button>

          <!-- Messages area -->
          <div ref="chatContainerRef" class="flex-1 overflow-y-auto px-4 pt-5 pb-[160px]">
            <div class="w-full max-w-4xl mx-auto space-y-6">
              <!-- Loading state -->
              <div v-if="messagesLoading" class="flex flex-col items-center justify-center py-24">
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

              <!-- Empty state -->
              <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                <div class="w-16 h-16 rounded-[20px] bg-gradient-to-br from-white to-blue-50 shadow-card border border-white flex items-center justify-center mb-5">
                  <i class="fa-solid fa-comments text-2xl text-blue-400"></i>
                </div>
                <p class="text-sm font-medium text-slate-500">开始对话，描述你的产品需求</p>
                <p class="text-xs text-slate-400 mt-1">Ctrl + Enter 发送消息</p>
              </div>

              <!-- Message list -->
              <div
                v-for="(msg, idx) in messages"
                :key="idx"
                :data-msg-index="idx"
                class="flex gap-4 w-full group transition-all duration-300 rounded-2xl"
                :class="msg.role === 'user' ? 'justify-end' : ''"
              >
                <!-- Assistant Avatar -->
                <div v-if="msg.role === 'assistant'" class="shrink-0 w-10 h-10 rounded-[16px] bg-white border border-blue-100/80 flex items-center justify-center shadow-sm self-start mt-1 transform transition-transform group-hover:scale-105 overflow-hidden">
                  <i class="fa-solid fa-robot text-blue-500 text-sm"></i>
                </div>

                <!-- Spacer for user alignment -->
                <div v-if="msg.role === 'user'" class="shrink-0 w-10 h-10 invisible"></div>

                <!-- User Message -->
                <div v-if="msg.role === 'user'" class="relative w-full flex-1 min-w-0 max-w-[85%] flex flex-col items-end">
                  <div class="rounded-[20px] rounded-br-[6px] px-4 py-3 leading-relaxed text-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/20 whitespace-pre-wrap break-words border border-blue-500/20 inline-block text-left">
                    {{ msg.content }}
                  </div>
                  <div v-if="msg.timestamp" class="text-[11px] text-slate-400/80 mt-1.5 mr-1 font-medium">{{ msg.timestamp }}</div>
                </div>

                <!-- Assistant Message -->
                <div v-else class="w-full flex-1 min-w-0 flex flex-col items-start">
                  <!-- Thinking Steps -->
                  <div v-if="msg.thinkingSteps && msg.thinkingSteps.length > 0" class="mb-3 w-full">
                    <!-- Thinking Header -->
                    <button
                      type="button"
                      class="cursor-pointer group/think flex items-center gap-2.5 w-full text-left transition-all duration-300"
                      @click="msg.expanded = !msg.expanded"
                    >
                      <div
                        class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-500"
                        :class="msg.thinkingDone ? 'bg-slate-100' : 'bg-blue-50'"
                      >
                        <i
                          class="fa-solid text-xs transition-all duration-300"
                          :class="msg.thinkingDone ? 'fa-circle-check text-blue-500' : 'fa-brain text-blue-500 animate-pulse'"
                        ></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span
                            class="text-[13px] font-semibold tracking-tight transition-colors"
                            :class="msg.thinkingDone ? 'text-slate-600' : 'text-blue-700'"
                          >
                            {{ msg.thinkingDone ? '推理完成' : '深度推理中' }}
                          </span>
                          <span class="text-[11px] text-slate-400 font-normal">{{ msg.thinkingSteps.filter(s => s.visible).length }} 个步骤</span>
                          <span v-if="!msg.thinkingDone" class="flex gap-[3px]">
                            <span class="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 0ms"></span>
                            <span class="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 150ms"></span>
                            <span class="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 300ms"></span>
                          </span>
                          <template v-if="msg.thinkingDone">
                            <span class="text-[11px] text-blue-500 ml-1 cursor-pointer">· 点击{{ msg.expanded ? '收起' : '展开' }}详情</span>
                            <i class="fa-solid fa-chevron-up text-[9px] text-slate-400 transition-transform duration-300" :class="msg.expanded ? '' : 'rotate-180'"></i>
                          </template>
                        </div>
                      </div>
                    </button>

                    <!-- Steps Timeline — always visible during streaming, toggleable after done -->
                    <div v-show="msg.expanded || !msg.thinkingDone" class="mt-3 ml-3 pl-4 border-l-2 border-blue-100 space-y-2 max-h-[400px] overflow-y-auto transition-all pr-1 scrollbar-hide">
                      <div
                        v-for="(step, si) in msg.thinkingSteps"
                        :key="si"
                        v-show="step.visible"
                        class="flex items-start gap-2.5 py-0.5 transition-all duration-300"
                      >
                        <div
                          class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 -ml-[0.8rem]"
                          :class="si === msg.thinkingSteps.filter(s => s.visible).length - 1 && !msg.thinkingDone
                            ? 'bg-blue-500 text-white shadow-sm'
                            : step.icon === 'fa-solid fa-circle-check' || step.icon === 'fa-solid fa-flag-checkered'
                              ? 'bg-blue-50 text-blue-500'
                              : 'bg-white border border-slate-200 text-slate-400'"
                        >
                          <i :class="step.icon" class="text-[8px]"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                          <div
                            class="leading-relaxed break-all whitespace-pre-wrap compact-markdown text-[12px]"
                            :class="si === msg.thinkingSteps.filter(s => s.visible).length - 1 && !msg.thinkingDone ? 'text-slate-700 font-medium' : 'text-slate-500'"
                            v-html="renderMarkdown(step.text)"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Content Block -->
                  <div
                    v-show="!msg.thinkingSteps || msg.thinkingSteps.length === 0 || msg.thinkingDone || msg.typingContent || msg.content"
                    class="rounded-[20px] rounded-bl-[6px] px-4 py-3 leading-relaxed text-[13px] bg-white shadow-sm border border-slate-100 text-slate-700 w-full"
                  >
                    <div class="markdown-body leading-relaxed text-[13px] text-slate-700" v-html="renderAssistantContent(msg, idx)"></div>
                  </div>
                  <div v-if="msg.timestamp" class="text-[11px] text-slate-400/80 mt-1.5 ml-1 font-medium">{{ msg.timestamp }}</div>
                </div>

                <!-- User Avatar -->
                <div v-if="msg.role === 'user'" class="shrink-0 w-10 h-10 rounded-[16px] bg-gradient-to-br from-slate-100 to-slate-200 border border-white shadow-sm flex items-center justify-center text-slate-600 font-black self-start mt-1 transform transition-transform group-hover:scale-105">
                  <span>U</span>
                </div>

                <!-- Spacer for assistant alignment -->
                <div v-if="msg.role === 'assistant'" class="shrink-0 w-10 h-10 invisible"></div>
              </div>
            </div>
          </div>

          <!-- Floating input area -->
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#f4f7f6] via-[#f4f7f6]/95 to-transparent pt-6 pb-3 px-6 z-10">
            <div class="w-full max-w-4xl mx-auto">
              <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <textarea
                  v-model="chatInput"
                  rows="3"
                  placeholder="向智能体提问，输入 / 触发提示词；Enter 发送，Shift+Enter 换行"
                  class="w-full resize-none bg-transparent text-sm placeholder:text-slate-400 text-slate-800 outline-none px-5 pt-4 pb-3 leading-relaxed"
                  :disabled="isStreaming"
                  @keydown.ctrl.enter="sendMessage"
                  @keydown.enter.exact.prevent="sendMessage"
                  @keydown.shift.enter.exact="null"
                ></textarea>
                <div class="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
                  <div class="flex items-center gap-3">
                    <span class="text-[11px] text-slate-400">Enter 发送，Shift+Enter 换行</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      v-if="isStreaming"
                      @click="cancelStream"
                      class="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-sm"
                      title="停止生成"
                    >
                      <i class="fa-solid fa-stop text-[10px]"></i>
                    </button>
                    <button
                      v-else
                      @click="sendMessage"
                      :disabled="!chatInput.trim()"
                      class="w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm"
                      :class="chatInput.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'"
                    >
                      <i class="fa-solid fa-arrow-up text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Agent Logs panel -->
        <div v-show="showLogsPanel" class="w-[280px] shrink-0 bg-white border-l border-slate-200/60 flex flex-col overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">
              <i class="fa-solid fa-terminal text-blue-500 mr-1.5"></i>执行日志
            </span>
            <div class="flex items-center gap-1">
              <button @click="agentLogs = []" class="text-slate-400 hover:text-slate-600 text-[10px] px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors" title="清空">
                <i class="fa-solid fa-trash-can"></i>
              </button>
              <button @click="showLogsPanel = false" class="text-slate-400 hover:text-slate-600 text-xs px-1" title="关闭">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
          <div ref="logsContainerRef" class="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[11px]">
            <div v-if="agentLogs.length === 0" class="text-slate-400 text-center py-8">
              <i class="fa-solid fa-satellite-dish text-lg mb-2 block text-slate-300"></i>
              等待 Agent 活动...
            </div>
            <div v-for="log in agentLogs" :key="log.id"
              class="px-2.5 py-1.5 rounded-md leading-relaxed"
              :class="{
                'bg-slate-50': log.type === 'thought',
                'bg-sky-50 border-l-2 border-sky-400': log.type === 'tool' && log.status === 'running',
                'bg-blue-50 border-l-2 border-blue-400': log.type === 'tool' && log.status === 'completed',
                'bg-rose-50 border-l-2 border-rose-400': log.type === 'tool' && log.status === 'failed',
                'bg-amber-50': log.type === 'usage',
                'bg-violet-50': log.type === 'api',
                'bg-rose-50': log.type === 'error',
                'bg-blue-50': log.type === 'info',
              }"
            >
              <div class="flex items-start gap-2">
                <span class="text-slate-400 shrink-0 text-[10px] mt-0.5 font-mono">{{ log.time }}</span>
                <div class="flex-1 min-w-0">
                  <span v-if="log.type === 'thought'" class="text-slate-500 break-words">
                    <i class="fa-solid fa-brain mr-1 text-[9px] text-slate-400"></i>{{ log.content }}
                  </span>
                  <span v-else-if="log.type === 'tool'" class="break-words" :class="log.status === 'failed' ? 'text-rose-600' : log.status === 'completed' ? 'text-blue-600' : 'text-sky-600'">
                    <i class="mr-1 text-[9px]" :class="log.status === 'completed' ? 'fa-solid fa-circle-check' : log.status === 'failed' ? 'fa-solid fa-circle-xmark' : 'fa-solid fa-gear fa-spin'"></i>{{ log.content }}
                  </span>
                  <span v-else-if="log.type === 'usage'" class="text-amber-600">
                    <i class="fa-solid fa-chart-pie mr-1 text-[9px]"></i>{{ log.content }}
                  </span>
                  <span v-else-if="log.type === 'api'" class="text-violet-600">
                    <i class="fa-solid fa-bolt mr-1 text-[9px]"></i>{{ log.content }}
                  </span>
                  <span v-else-if="log.type === 'error'" class="text-rose-600">
                    <i class="fa-solid fa-triangle-exclamation mr-1 text-[9px]"></i>{{ log.content }}
                  </span>
                  <span v-else class="text-blue-600">
                    <i class="fa-solid fa-circle-info mr-1 text-[9px]"></i>{{ log.content }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Spec Tab — full width -->
      <div v-else-if="activeTab === 'spec'" class="flex flex-col h-full w-full">
        <div class="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-slate-100 bg-white">
          <button
            @click="toggleSpecEdit"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors"
            :class="specEditing ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          >
            <i :class="specEditing ? 'fa-solid fa-eye' : 'fa-solid fa-pen'" class="text-[10px]"></i>
            {{ specEditing ? '预览' : '编辑' }}
          </button>
          <button
            @click="generatePrototype"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-colors"
            :disabled="isStreaming"
          >
            <i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
            生成原型
          </button>
          <button
            @click="exportSpec"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <i class="fa-solid fa-download text-[10px]"></i>
            导出 .md
          </button>
          <button
            @click="exportWord"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            <i class="fa-solid fa-file-word text-[10px]"></i>
            导出 .docx
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-6">
          <div v-if="specLoading" class="flex items-center justify-center py-20 text-slate-400">
            <i class="fa-solid fa-spinner fa-spin mr-2"></i> 加载中...
          </div>
          <div v-else-if="!specContent" class="flex flex-col items-center justify-center py-20">
            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <i class="fa-solid fa-file-lines text-2xl text-slate-300"></i>
            </div>
            <p class="text-sm text-slate-500 mb-4">尚未生成功能清单</p>
            <p class="text-xs text-slate-400 mb-6">先在"需求对话"中与 AI 头脑风暴，确认方向后点击下方按钮生成</p>
            <button
              @click="generateSpec"
              :disabled="isStreaming"
              class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-700 hover:bg-blue-800 text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
              生成功能清单
            </button>
          </div>
          <div v-else-if="specEditing">
            <textarea
              v-model="specContent"
              class="w-full h-[calc(100vh-280px)] px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            ></textarea>
            <div class="mt-3 flex justify-end">
              <button
                @click="saveSpec"
                class="px-4 py-2 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors"
              >
                <i class="fa-solid fa-check mr-1"></i> 保存修改
              </button>
            </div>
          </div>
          <div v-else class="prose prose-sm prose-slate max-w-none" v-html="renderedSpec"></div>
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
            <div v-if="!selectedFile && prototypeFiles.length === 0" class="flex flex-col items-center justify-center h-full">
              <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <i class="fa-solid fa-browser text-2xl text-slate-300"></i>
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
        </div>
      </div>

      <!-- Iterate Tab — three-column layout -->
      <div v-else-if="activeTab === 'iterate'" class="flex h-full w-full">
        <!-- Left: Session panel -->
        <div v-show="showSessionPanel" class="w-[220px] shrink-0 bg-white border-r border-slate-200/60 flex flex-col overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">会话</span>
            <button class="text-slate-400 hover:text-slate-600 text-xs" @click="showSessionPanel = false">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-2">
            <!-- Current session item - active -->
            <div class="px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100/60 mb-1">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                <span class="text-[13px] font-medium text-blue-800 truncate">{{ projectName }}</span>
              </div>
              <div class="text-[11px] text-blue-600/70 mt-1 ml-4">当前对话</div>
            </div>
          </div>
        </div>

        <!-- Center: Chat area -->
        <div class="flex-1 flex flex-col min-w-0 relative bg-[#f4f7f6]">
          <!-- Toggle left panel button when hidden -->
          <button v-if="!showSessionPanel" @click="showSessionPanel = true"
            class="absolute top-3 left-3 z-10 w-8 h-8 rounded-lg bg-white/80 backdrop-blur border border-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center shadow-sm transition-all">
            <i class="fa-solid fa-bars text-xs"></i>
          </button>

          <!-- Messages area -->
          <div ref="iterateChatRef" class="flex-1 overflow-y-auto px-4 pt-5 pb-[160px]">
            <div class="w-full max-w-4xl mx-auto space-y-6">
              <!-- Loading state -->
              <div v-if="messagesLoading" class="flex flex-col items-center justify-center py-24">
                <div class="relative w-12 h-12 mb-5">
                  <div class="absolute inset-0 rounded-full border-2 border-blue-100"></div>
                  <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin"></div>
                  <div class="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                    <i class="fa-solid fa-arrows-rotate text-blue-400 text-sm"></i>
                  </div>
                </div>
                <p class="text-sm text-slate-500 font-medium">正在加载对话记录...</p>
                <p class="text-[11px] text-slate-400 mt-1">请稍候</p>
              </div>

              <!-- Empty state -->
              <div v-else-if="iterateMessages.length === 0" class="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                <div class="w-16 h-16 rounded-[20px] bg-gradient-to-br from-white to-blue-50 shadow-card border border-white flex items-center justify-center mb-5">
                  <i class="fa-solid fa-arrows-rotate text-2xl text-blue-400"></i>
                </div>
                <p class="text-sm font-medium text-slate-500">告诉 AI 你想修改什么，它会自动更新原型</p>
                <p class="text-xs text-slate-400 mt-1">例如："把首页的导航栏改成左侧边栏"</p>
              </div>

              <!-- Message list -->
              <div
                v-for="(msg, idx) in iterateMessages"
                :key="idx"
                class="flex gap-4 w-full group"
                :class="msg.role === 'user' ? 'justify-end' : ''"
              >
                <!-- Assistant Avatar -->
                <div v-if="msg.role === 'assistant'" class="shrink-0 w-10 h-10 rounded-[16px] bg-white border border-blue-100/80 flex items-center justify-center shadow-sm self-start mt-1 transform transition-transform group-hover:scale-105 overflow-hidden">
                  <i class="fa-solid fa-robot text-blue-500 text-sm"></i>
                </div>

                <!-- Spacer for user alignment -->
                <div v-if="msg.role === 'user'" class="shrink-0 w-10 h-10 invisible"></div>

                <!-- User Message -->
                <div v-if="msg.role === 'user'" class="relative w-full flex-1 min-w-0 max-w-[85%] flex flex-col items-end">
                  <div class="rounded-[20px] rounded-br-[6px] px-4 py-3 leading-relaxed text-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/20 whitespace-pre-wrap break-words border border-blue-500/20 inline-block text-left">
                    {{ msg.content }}
                  </div>
                  <div v-if="msg.timestamp" class="text-[11px] text-slate-400/80 mt-1.5 mr-1 font-medium">{{ msg.timestamp }}</div>
                </div>

                <!-- Assistant Message -->
                <div v-else class="w-full flex-1 min-w-0 flex flex-col items-start">
                  <!-- Thinking Steps -->
                  <div v-if="msg.thinkingSteps && msg.thinkingSteps.length > 0" class="mb-3 w-full">
                    <!-- Thinking Header -->
                    <button
                      type="button"
                      class="cursor-pointer group/think flex items-center gap-2.5 w-full text-left transition-all duration-300"
                      @click="msg.expanded = !msg.expanded"
                    >
                      <div
                        class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-500"
                        :class="msg.thinkingDone ? 'bg-slate-100' : 'bg-blue-50'"
                      >
                        <i
                          class="fa-solid text-xs transition-all duration-300"
                          :class="msg.thinkingDone ? 'fa-circle-check text-blue-500' : 'fa-brain text-blue-500 animate-pulse'"
                        ></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span
                            class="text-[13px] font-semibold tracking-tight transition-colors"
                            :class="msg.thinkingDone ? 'text-slate-600' : 'text-blue-700'"
                          >
                            {{ msg.thinkingDone ? '推理完成' : '深度推理中' }}
                          </span>
                          <span class="text-[11px] text-slate-400 font-normal">{{ msg.thinkingSteps.filter(s => s.visible).length }} 个步骤</span>
                          <span v-if="!msg.thinkingDone" class="flex gap-[3px]">
                            <span class="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 0ms"></span>
                            <span class="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 150ms"></span>
                            <span class="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 300ms"></span>
                          </span>
                          <template v-if="msg.thinkingDone">
                            <span class="text-[11px] text-blue-500 ml-1 cursor-pointer">· 点击{{ msg.expanded ? '收起' : '展开' }}详情</span>
                            <i class="fa-solid fa-chevron-up text-[9px] text-slate-400 transition-transform duration-300" :class="msg.expanded ? '' : 'rotate-180'"></i>
                          </template>
                        </div>
                      </div>
                    </button>

                    <!-- Steps Timeline — always visible during streaming, toggleable after done -->
                    <div v-show="msg.expanded || !msg.thinkingDone" class="mt-3 ml-3 pl-4 border-l-2 border-blue-100 space-y-2 max-h-[400px] overflow-y-auto transition-all pr-1 scrollbar-hide">
                      <div
                        v-for="(step, si) in msg.thinkingSteps"
                        :key="si"
                        v-show="step.visible"
                        class="flex items-start gap-2.5 py-0.5 transition-all duration-300"
                      >
                        <div
                          class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 -ml-[0.8rem]"
                          :class="si === msg.thinkingSteps.filter(s => s.visible).length - 1 && !msg.thinkingDone
                            ? 'bg-blue-500 text-white shadow-sm'
                            : step.icon === 'fa-solid fa-circle-check' || step.icon === 'fa-solid fa-flag-checkered'
                              ? 'bg-blue-50 text-blue-500'
                              : 'bg-white border border-slate-200 text-slate-400'"
                        >
                          <i :class="step.icon" class="text-[8px]"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                          <div
                            class="leading-relaxed break-all whitespace-pre-wrap compact-markdown text-[12px]"
                            :class="si === msg.thinkingSteps.filter(s => s.visible).length - 1 && !msg.thinkingDone ? 'text-slate-700 font-medium' : 'text-slate-500'"
                            v-html="renderMarkdown(step.text)"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Content Block -->
                  <div
                    v-show="!msg.thinkingSteps || msg.thinkingSteps.length === 0 || msg.thinkingDone || msg.typingContent || msg.content"
                    class="rounded-[20px] rounded-bl-[6px] px-4 py-3 leading-relaxed text-[13px] bg-white shadow-sm border border-slate-100 text-slate-700 w-full"
                  >
                    <div class="markdown-body leading-relaxed text-[13px] text-slate-700" v-html="renderAssistantContent(msg, idx)"></div>
                  </div>
                  <div v-if="msg.timestamp" class="text-[11px] text-slate-400/80 mt-1.5 ml-1 font-medium">{{ msg.timestamp }}</div>
                </div>

                <!-- User Avatar -->
                <div v-if="msg.role === 'user'" class="shrink-0 w-10 h-10 rounded-[16px] bg-gradient-to-br from-slate-100 to-slate-200 border border-white shadow-sm flex items-center justify-center text-slate-600 font-black self-start mt-1 transform transition-transform group-hover:scale-105">
                  <span>U</span>
                </div>

                <!-- Spacer for assistant alignment -->
                <div v-if="msg.role === 'assistant'" class="shrink-0 w-10 h-10 invisible"></div>
              </div>
            </div>
          </div>

          <!-- Floating input area -->
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#f4f7f6] via-[#f4f7f6]/95 to-transparent pt-6 pb-3 px-6 z-10">
            <div class="w-full max-w-4xl mx-auto">
              <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <textarea
                  v-model="iterateInput"
                  rows="3"
                  placeholder="向智能体提问，输入 / 触发提示词；Enter 发送，Shift+Enter 换行"
                  class="w-full resize-none bg-transparent text-sm placeholder:text-slate-400 text-slate-800 outline-none px-5 pt-4 pb-3 leading-relaxed"
                  :disabled="isStreaming"
                  @keydown.enter.exact.prevent="sendIterate"
                  @keydown.shift.enter.exact="null"
                ></textarea>
                <div class="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
                  <div class="flex items-center gap-3">
                    <span class="text-[11px] text-slate-400">Enter 发送，Shift+Enter 换行</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      v-if="isStreaming"
                      @click="cancelStream"
                      class="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-sm"
                      title="停止生成"
                    >
                      <i class="fa-solid fa-stop text-[10px]"></i>
                    </button>
                    <button
                      v-else
                      @click="sendIterate"
                      :disabled="!iterateInput.trim() || isStreaming"
                      class="w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm"
                      :class="iterateInput.trim() && !isStreaming ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'"
                    >
                      <i class="fa-solid fa-arrow-up text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Agent Logs panel -->
        <div v-show="showLogsPanel" class="w-[280px] shrink-0 bg-white border-l border-slate-200/60 flex flex-col overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">
              <i class="fa-solid fa-terminal text-blue-500 mr-1.5"></i>执行日志
            </span>
            <div class="flex items-center gap-1">
              <button @click="agentLogs = []" class="text-slate-400 hover:text-slate-600 text-[10px] px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors" title="清空">
                <i class="fa-solid fa-trash-can"></i>
              </button>
              <button @click="showLogsPanel = false" class="text-slate-400 hover:text-slate-600 text-xs px-1" title="关闭">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
          <div ref="iterateLogsContainerRef" class="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[11px]">
            <div v-if="agentLogs.length === 0" class="text-slate-400 text-center py-8">
              <i class="fa-solid fa-satellite-dish text-lg mb-2 block text-slate-300"></i>
              等待 Agent 活动...
            </div>
            <div v-for="log in agentLogs" :key="log.id"
              class="px-2.5 py-1.5 rounded-md leading-relaxed"
              :class="{
                'bg-slate-50': log.type === 'thought',
                'bg-sky-50 border-l-2 border-sky-400': log.type === 'tool' && log.status === 'running',
                'bg-blue-50 border-l-2 border-blue-400': log.type === 'tool' && log.status === 'completed',
                'bg-rose-50 border-l-2 border-rose-400': log.type === 'tool' && log.status === 'failed',
                'bg-amber-50': log.type === 'usage',
                'bg-violet-50': log.type === 'api',
                'bg-rose-50': log.type === 'error',
                'bg-blue-50': log.type === 'info',
              }"
            >
              <div class="flex items-start gap-2">
                <span class="text-slate-400 shrink-0 text-[10px] mt-0.5 font-mono">{{ log.time }}</span>
                <div class="flex-1 min-w-0">
                  <span v-if="log.type === 'thought'" class="text-slate-500 break-words">
                    <i class="fa-solid fa-brain mr-1 text-[9px] text-slate-400"></i>{{ log.content }}
                  </span>
                  <span v-else-if="log.type === 'tool'" class="break-words" :class="log.status === 'failed' ? 'text-rose-600' : log.status === 'completed' ? 'text-blue-600' : 'text-sky-600'">
                    <i class="mr-1 text-[9px]" :class="log.status === 'completed' ? 'fa-solid fa-circle-check' : log.status === 'failed' ? 'fa-solid fa-circle-xmark' : 'fa-solid fa-gear fa-spin'"></i>{{ log.content }}
                  </span>
                  <span v-else-if="log.type === 'usage'" class="text-amber-600">
                    <i class="fa-solid fa-chart-pie mr-1 text-[9px]"></i>{{ log.content }}
                  </span>
                  <span v-else-if="log.type === 'api'" class="text-violet-600">
                    <i class="fa-solid fa-bolt mr-1 text-[9px]"></i>{{ log.content }}
                  </span>
                  <span v-else-if="log.type === 'error'" class="text-rose-600">
                    <i class="fa-solid fa-triangle-exclamation mr-1 text-[9px]"></i>{{ log.content }}
                  </span>
                  <span v-else class="text-blue-600">
                    <i class="fa-solid fa-circle-info mr-1 text-[9px]"></i>{{ log.content }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Export Tab — full width -->
      <div v-else-if="activeTab === 'export'" class="flex-1 overflow-y-auto p-8">
        <h2 class="text-lg font-bold text-slate-800 mb-6">导出项目</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <!-- Export zip -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center hover:border-blue-200 transition-colors">
            <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <i class="fa-solid fa-file-zipper text-xl text-blue-600"></i>
            </div>
            <h3 class="font-semibold text-slate-800 mb-1">导出完整项目</h3>
            <p class="text-xs text-slate-500 mb-4">包含功能清单和所有原型文件</p>
            <button
              @click="exportZip"
              class="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-medium transition-colors"
            >
              下载 .zip
            </button>
          </div>
          <!-- Export spec -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center hover:border-blue-200 transition-colors">
            <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <i class="fa-solid fa-file-lines text-xl text-blue-600"></i>
            </div>
            <h3 class="font-semibold text-slate-800 mb-1">导出功能清单</h3>
            <p class="text-xs text-slate-500 mb-4">Markdown 或 Word 格式的功能需求文档</p>
            <div class="w-full flex gap-2">
              <button
                @click="exportSpec"
                class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                下载 .md
              </button>
              <button
                @click="exportWord"
                class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                下载 .docx
              </button>
            </div>
          </div>
          <!-- Open in browser -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center hover:border-blue-200 transition-colors">
            <div class="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
              <i class="fa-solid fa-arrow-up-right-from-square text-xl text-violet-600"></i>
            </div>
            <h3 class="font-semibold text-slate-800 mb-1">在浏览器打开原型</h3>
            <p class="text-xs text-slate-500 mb-4">使用系统浏览器查看 HTML 原型</p>
            <button
              @click="openInBrowser"
              class="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              打开浏览器
            </button>
          </div>
        </div>
      </div>

    </div><!-- end tab content body -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';

const props = defineProps({
  slug: { type: String, required: true },
});

const route = useRoute();

// --- State ---
const projectName = ref('');
const projectMeta = ref(null);
const activeTab = ref('requirement');

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

const tabs = [
  { key: 'requirement', label: '需求对话', icon: 'fa-solid fa-comments' },
  { key: 'spec', label: '功能清单', icon: 'fa-solid fa-list-check' },
  { key: 'prototype', label: '原型预览', icon: 'fa-solid fa-browser' },
  { key: 'iterate', label: '迭代修改', icon: 'fa-solid fa-arrows-rotate' },
  { key: 'export', label: '导出', icon: 'fa-solid fa-download' },
];

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

// Session update subscription
let unsubscribe = null;

// Determine which messages array to target based on active tab
const currentMessages = computed(() => activeTab.value === 'iterate' ? iterateMessages : messages);

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
  const targetMessages = activeTab.value === 'iterate' ? iterateMessages.value : messages.value;
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
      if (data.messages && data.messages.length > 0) {
        const reqMsgs = data.messages.filter(m => m.tab !== 'iterate');
        const itMsgs = data.messages.filter(m => m.tab === 'iterate');
        if (reqMsgs.length) {
          messages.value = reqMsgs.map(m => createMessage(m.role || 'assistant', m.content || ''));
        }
        if (itMsgs.length) {
          iterateMessages.value = itMsgs.map(m => createMessage(m.role || 'assistant', m.content || ''));
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
  const targetMessages = activeTab.value === 'iterate' ? iterateMessages.value : messages.value;
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
  const targetMessages = activeTab.value === 'iterate' ? iterateMessages.value : messages.value;
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
      const tab = activeTab.value === 'iterate' ? 'iterate' : 'requirement';
      window.api.hermes.saveMessage(props.slug, { role: 'assistant', content: lastMsg.content, tab, timestamp: new Date().toISOString() });
    }
  }
};

// --- Get or create the current assistant message for streaming ---
const getOrCreateAssistantMsg = () => {
  const targetMessages = activeTab.value === 'iterate' ? iterateMessages.value : messages.value;
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
    if (activeTab.value === 'iterate') {
      iframeKey.value++;
    }
    loadSpec();
    refreshPrototypeFiles();
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
    const targetMessages = activeTab.value === 'iterate' ? iterateMessages.value : messages.value;
    targetMessages.push(createMessage('assistant', `**Error:** ${update.message || '请求失败'}`));
  }
};

// --- Chat functions ---
const sendMessage = async () => {
  const text = chatInput.value.trim();
  if (!text || isStreaming.value) return;

  messages.value.push(createMessage('user', text));
  chatInput.value = '';
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
    await window.api.hermes.prompt(props.slug, text);
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
  if (!text || isStreaming.value) return;

  iterateMessages.value.push(createMessage('user', text));
  iterateInput.value = '';
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

  scrollToBottom();

  try {
    await window.api.hermes.prompt(props.slug, `/prototype-iterate ${text}`);
    // 延迟兜底：正常情况由 agent_message_end 事件结束
    setTimeout(() => {
      if (isStreaming.value) {
        finalizeLastAssistantMessage();
        isStreaming.value = false;
        isToolRunning.value = false;
        iframeKey.value++;
        refreshPrototypeFiles();
      }
    }, 2000);
  } catch (e) {
    console.error('Iterate prompt failed:', e);
    isStreaming.value = false;
  }
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
    if (activeTab.value === 'iterate' && iterateChatRef.value) {
      iterateChatRef.value.scrollTop = iterateChatRef.value.scrollHeight;
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
    activeTab.value = 'spec';
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
  isStreaming.value = true;
  try {
    await window.api.hermes.prompt(props.slug, '/prototype-generator 基于当前项目目录下的 spec.md 生成 HTML 原型，输出到 prototype/ 目录');
  } catch (e) {
    console.error('Generate prototype failed:', e);
    isStreaming.value = false;
  }
};

const regeneratePrototype = async () => {
  if (isStreaming.value) return;
  isStreaming.value = true;
  try {
    await window.api.hermes.prompt(props.slug, '/prototype-generator 基于当前项目目录下的 spec.md 重新生成 HTML 原型，输出到 prototype/ 目录');
  } catch (e) {
    console.error('Regenerate prototype failed:', e);
    isStreaming.value = false;
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

  // Set initial tab from query
  const queryTab = route.query.tab;
  if (queryTab && tabs.some(t => t.key === queryTab)) {
    activeTab.value = queryTab;
  }

  // Subscribe to session updates
  if (window.api && window.api.hermes && window.api.hermes.onSessionUpdate) {
    unsubscribe = window.api.hermes.onSessionUpdate(handleSessionUpdate);
  }

  // Load spec
  loadSpec();

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
  if (newTab === 'spec') {
    loadSpec();
  } else if (newTab === 'prototype') {
    refreshPrototypeFiles();
  }
});
</script>

<style scoped>
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
