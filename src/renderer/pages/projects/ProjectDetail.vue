<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <!-- ===== 顶部：浅色 Hero 带 + 五阶段步骤条 + Tabs ===== -->
    <div class="shrink-0">
      <!-- Hero：浅底 + 右侧 top.png 背景图 + 蓝色标题 -->
      <div class="hero-band relative overflow-hidden px-6 py-4">
        <!-- 右侧背景插画（top.png，纯视觉） -->
        <img :src="topBg" alt="" aria-hidden="true" class="hero-bg" />
        <div class="relative z-[1] flex items-start justify-between gap-6">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2.5 mb-1.5">
              <RouterLink to="/projects" class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0" title="返回项目列表">
                <i class="fa-solid fa-arrow-left text-sm"></i>
              </RouterLink>
              <h1 class="text-[22px] font-bold text-blue-700 truncate leading-tight">{{ projectName }}</h1>
            </div>
            <p class="text-[13px] text-slate-500 leading-relaxed max-w-2xl pl-9.5 line-clamp-2">
              {{ heroSubtitle }}
            </p>
          </div>
          <div class="shrink-0 text-right relative z-[1] hidden md:block">
            <div class="text-[19px] font-bold text-blue-700 leading-tight">AI 助力医院运营</div>
            <div class="text-[12px] text-slate-500 mt-1 tracking-wide">数据驱动 · 精准决策</div>
          </div>
        </div>
      </div>

      <!-- 五阶段大号步骤条 -->
      <div class="glass-card border-b border-slate-200/70 px-5 py-3 overflow-x-auto">
        <div class="flex items-center gap-0 min-w-max">
          <template v-for="(stage, idx) in FDE_STAGES" :key="stage.id">
            <button
              @click="selectStage(stage.id)"
              class="step-node group flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-xl transition-all shrink-0"
              :class="stepNodeClass(stage.id)"
              :title="stage.goal"
            >
              <span class="step-dot" :class="stepDotClass(stage.id)">
                <i v-if="statusOf(stage.id) === 'done'" class="fa-solid fa-check text-[12px]"></i>
                <span v-else class="text-[13px] font-bold">{{ stage.id }}</span>
              </span>
              <div class="text-left leading-tight">
                <div class="text-[13px] font-semibold whitespace-nowrap" :class="statusOf(stage.id) === 'todo' ? 'text-slate-400' : (stage.id === currentStage ? 'text-blue-700' : 'text-slate-700')">{{ stepTitle(stage) }}</div>
                <div class="text-[10.5px] text-slate-400 whitespace-nowrap mt-0.5">{{ stepHint(stage) }}</div>
              </div>
            </button>
            <i v-if="idx < FDE_STAGES.length - 1" class="fa-solid fa-chevron-right text-slate-300 text-[11px] mx-1 shrink-0"></i>
          </template>
        </div>
      </div>

      <!-- Tabs(仅工作区阶段显示) -->
      <div v-if="isWorkspaceStage" class="glass-card border-b border-slate-200/70 flex items-center gap-5 px-6 pt-1.5">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="group relative inline-flex items-center gap-1.5 pb-2 text-[12.5px] transition-colors duration-200"
          :class="activeTab === tab.key ? 'text-blue-600 font-semibold' : 'text-slate-400 hover:text-slate-700 font-medium'"
        >
          <i :class="tab.icon" class="text-[10.5px]"></i>
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

      <!-- 阶段②③ 工作台 Tab：三栏 — 交付物导航 + 对话 + 文档预览 -->
      <div v-if="activeTab === 'workspace'" class="flex h-full w-full overflow-hidden">

        <!-- 左栏：项目文档（可隐藏） -->
        <div
          v-if="!leftPanelCollapsed"
          class="shrink-0 flex flex-col glass-panel border-r border-slate-200/70 overflow-hidden"
          :style="'flex: 1 1 0; min-width: 210px; max-width: 280px'"
        >
          <!-- 顶部：项目文档 / 目录 tab + 折叠 + 新建 -->
          <div class="px-4 pt-3 pb-2 border-b border-slate-100">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <span class="text-[14px] font-bold text-slate-800">项目文档</span>
              </div>
              <button
                @click="leftPanelCollapsed = true"
                class="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="隐藏项目文档"
              >
                <i class="fa-solid fa-angles-left text-[9px]"></i>
              </button>
            </div>
            <!-- 搜索框 + 新建 -->
            <div class="flex items-center gap-2">
              <div class="flex-1 flex items-center gap-2 h-8 px-2.5 rounded-lg bg-white/80 border border-slate-200/80 focus-within:border-blue-400/70 transition-colors">
                <i class="fa-solid fa-magnifying-glass text-slate-300 text-[11px]"></i>
                <input
                  v-model="docSearch"
                  type="text"
                  placeholder="搜索文档、文件夹…"
                  class="flex-1 min-w-0 bg-transparent text-[12px] text-slate-700 placeholder-slate-300 focus:outline-none"
                />
              </div>
              <button
                @click="generateDeliverable(deliverableSelected)"
                :disabled="isStreaming || deliverableBusy || !deliverableSelected"
                class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :title="deliverableBusy ? '生成中…' : (selectedDeliverable ? `生成 · ${selectedDeliverable.short}` : '生成交付物')"
              >
                <i class="fa-solid text-[12px]" :class="deliverableBusy ? 'fa-circle-notch fa-spin' : 'fa-plus'"></i>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto scrollbar-thin py-2.5 px-2">
            <!-- 交付物文档卡片（真实数据）-->
            <button
              v-for="d in filteredDeliverables"
              :key="d.key"
              @click="selectDeliverable(d.key)"
              type="button"
              :aria-pressed="deliverableSelected === d.key"
              class="doc-card w-full text-left px-2.5 py-2.5 mb-1.5 rounded-xl transition-all group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              :class="deliverableSelected === d.key
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-white/70 hover:bg-white border border-transparent hover:border-slate-200/80'"
            >
              <!-- 选中态左侧强调条 -->
              <span v-if="deliverableSelected === d.key" class="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-blue-600"></span>
              <!-- 清空该交付物的对话 -->
              <button
                v-if="(deliverableMsgs[dkey(currentStage, d.key)] || []).length > 0"
                @click.stop="clearDeliverableChat(d.key)"
                type="button"
                class="absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center text-slate-300 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-danger hover:bg-danger-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/60"
                title="清空该交付物的对话记录"
                aria-label="清空该交付物的对话记录"
              >
                <i class="fa-solid fa-trash-can text-[9px]"></i>
              </button>
              <div class="flex items-start gap-2.5">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                  :class="deliverableSelected === d.key ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-blue-50'">
                  <i :class="[d.icon, deliverableSelected === d.key ? 'text-blue-600' : 'text-slate-400']" class="text-[12px]"></i>
                </div>
                <div class="flex-1 min-w-0 pr-4">
                  <span class="block text-[12.5px] font-semibold leading-snug truncate"
                    :class="deliverableSelected === d.key ? 'text-blue-700' : 'text-slate-700'">
                    {{ d.name }}
                  </span>
                  <div class="flex items-center gap-1 mt-1">
                    <span v-if="deliverableStatus[d.key] === 'ready'"
                      class="inline-flex items-center gap-1 text-[10.5px] text-blue-600 font-medium">
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>已生成
                    </span>
                    <span v-else class="inline-flex items-center gap-1 text-[10.5px] text-slate-400">
                      <span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span>未生成
                    </span>
                  </div>
                </div>
              </div>
              <!-- 收藏星标 -->
              <span
                @click.stop="toggleFav(d.key)"
                class="absolute bottom-2 right-2 text-[11px] transition-colors cursor-pointer"
                :class="favDocs.has(d.key) ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'"
                :title="favDocs.has(d.key) ? '取消收藏' : '收藏'"
              >
                <i class="fa-solid fa-star" v-if="favDocs.has(d.key)"></i>
                <i class="fa-regular fa-star" v-else></i>
              </span>
            </button>

            <!-- 相关资料（静态占位）-->
            <div class="mt-4 pt-3 border-t border-slate-100">
              <div class="px-1 mb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">相关资料</div>
              <div
                v-for="r in relatedResources"
                :key="r.name"
                class="group flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-500 hover:bg-white/70 transition-colors"
              >
                <i class="fa-solid fa-folder text-amber-400 text-[12px] shrink-0"></i>
                <span class="flex-1 min-w-0 text-[12px] truncate">{{ r.name }}</span>
                <button class="w-5 h-5 rounded flex items-center justify-center text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-600 transition-all" title="更多">
                  <i class="fa-solid fa-ellipsis text-[11px]"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 中栏：对话区 (flex-1) -->
        <div class="flex flex-col min-w-0 relative glass-card" style="flex: 4.5 1 0">
          <!-- 顶部：FDE 智能助手标题栏 -->
          <div class="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-white/95">
            <button
              v-if="leftPanelCollapsed"
              @click="leftPanelCollapsed = false"
              class="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-slate-100 transition-colors shrink-0"
              title="显示项目文档"
            >
              <i class="fa-solid fa-angles-right text-[9px]"></i>
            </button>
            <div class="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-blue-50 shadow-sm shadow-blue-500/10">
              <img :src="botAvatar" alt="FDE 智能助手" class="w-full h-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-[14px] font-bold text-slate-800">FDE 智能助手</span>
                <span v-if="livePreviewStreaming" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>生成中
                </span>
              </div>
              <p class="text-[11.5px] text-slate-400 mt-0.5 truncate">基于项目文档 · 直接生成专业内容</p>
            </div>
            <span class="text-[11px] text-slate-300 shrink-0 tabular-nums">{{ nowClock }}</span>
          </div>

          <!-- 消息区 -->
          <div
            ref="chatContainerRef"
            class="flex-1 overflow-y-auto px-4 pt-5"
            :class="activeDlvMsgs.length > 0 ? 'pb-[140px]' : ''"
          >
            <!-- Loading -->
            <div v-if="messagesLoading" class="flex flex-col items-center justify-center py-24">
              <div class="relative w-9 h-9 mb-4">
                <div class="absolute inset-0 rounded-full border-2 border-blue-100"></div>
                <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin"></div>
              </div>
              <p class="text-sm text-slate-400">加载对话记录…</p>
            </div>

            <!-- Empty: no deliverable selected -->
            <div v-else-if="!deliverableSelected" class="flex flex-col items-center justify-center h-full text-center px-6">
              <i class="fa-solid fa-hand-pointer text-3xl text-slate-200 mb-3"></i>
              <p class="text-[13px] text-slate-400">从左侧选择一件交付物开始</p>
            </div>

            <!-- Empty: deliverable selected, no messages yet -->
            <div v-else-if="activeDlvMsgs.length === 0" class="flex flex-col items-center justify-center h-full text-center px-6">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                <i :class="selectedDeliverable ? selectedDeliverable.icon : 'fa-solid fa-comments'" class="text-lg text-white"></i>
              </div>
              <h3 class="text-[15px] font-semibold text-slate-800 mb-2">{{ selectedDeliverable ? selectedDeliverable.name : '' }}</h3>
              <p class="text-[12.5px] text-slate-400 max-w-sm leading-relaxed mb-6">{{ selectedDeliverable ? selectedDeliverable.hint : '' }}</p>
              <div class="flex flex-wrap gap-2 justify-center max-w-sm">
                <button
                  v-for="q in (currentStage === 3 ? stage3Quick : stage2Quick)"
                  :key="q"
                  @click="dlvInput = q; dlvSend()"
                  class="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-200 text-[12.5px] text-slate-600 hover:text-blue-700 transition-all"
                >
                  {{ q }}
                </button>
              </div>
            </div>

            <!-- Message list -->
            <div v-else class="w-full max-w-[640px] mx-auto space-y-8">
              <div
                v-for="(msg, idx) in activeDlvMsgs"
                :key="idx"
                :data-msg-index="idx"
                class="flex flex-col w-full"
                :class="msg.role === 'user' ? 'items-end' : 'items-start'"
              >
                <!-- User -->
                <div v-if="msg.role === 'user'" class="max-w-[80%]">
                  <div v-if="msg.attachments && msg.attachments.length" class="flex flex-wrap gap-2 mb-1.5 justify-end">
                    <template v-for="(att, ai) in msg.attachments" :key="ai">
                      <img v-if="att.type === 'image'" :src="'data:' + (att.media_type || 'image/png') + ';base64,' + att.data" class="max-w-[140px] max-h-[100px] object-cover rounded-xl border border-slate-200" @click="openLightbox('data:' + (att.media_type || 'image/png') + ';base64,' + att.data)" />
                      <AttachmentChip v-else :att="att" @preview-image="openLightbox" />
                    </template>
                  </div>
                  <div v-if="msg.content" class="rounded-[16px] px-3.5 py-2 leading-relaxed text-[14px] bg-[#e7edf7] text-slate-800 whitespace-pre-wrap break-words text-left">
                    {{ msg.content }}
                  </div>
                </div>

                <!-- Assistant -->
                <div v-else class="w-full flex flex-col items-start">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                      <i class="fa-solid fa-robot text-white text-[12px]"></i>
                    </div>
                    <span class="text-[13px] font-semibold text-slate-700">FDE 智能助手</span>
                    <span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                      :class="(isStreaming && idx === activeDlvMsgs.length - 1) ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'">
                      <span class="w-1.5 h-1.5 rounded-full" :class="(isStreaming && idx === activeDlvMsgs.length - 1) ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'"></span>
                      {{ (isStreaming && idx === activeDlvMsgs.length - 1) ? '工作中' : '已完成' }}
                    </span>
                  </div>
                  <!-- Thinking steps -->
                  <div v-if="msg.thinkingSteps && msg.thinkingSteps.length > 0" class="mb-2.5 w-full">
                    <button type="button" class="flex items-center gap-2 text-left" @click="msg.expanded = !msg.expanded">
                      <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" :class="msg.thinkingDone ? 'bg-slate-100' : 'bg-gradient-to-br from-blue-100 to-indigo-50'">
                        <i class="fa-solid fa-brain text-xs" :class="msg.thinkingDone ? 'text-slate-400' : 'text-blue-500 animate-pulse'"></i>
                      </div>
                      <span class="text-[12px] font-semibold" :class="msg.thinkingDone ? 'text-slate-500' : 'text-blue-700'">
                        {{ !msg.thinkingDone ? '深度推理中' : (msg.expanded ? '收起推理过程' : `推理完成 · ${msg.thinkingSteps.length} 步`) }}
                      </span>
                    </button>
                    <div v-if="msg.expanded" class="mt-2 ml-3.5 pl-4 border-l-2 border-blue-100 space-y-0.5 max-h-[200px] overflow-y-auto scrollbar-hide">
                      <div v-for="(step, si) in msg.thinkingSteps" :key="si" v-show="step.visible !== false" class="flex items-start gap-2 py-0.5">
                        <div class="w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 glass-card border border-slate-200/60 text-slate-400">
                          <i :class="step.icon || 'fa-solid fa-circle'" class="text-[7px]"></i>
                        </div>
                        <span class="text-[11.5px] leading-relaxed text-slate-500 compact-markdown" v-html="renderMarkdown(step.text)"></span>
                      </div>
                    </div>
                  </div>
                  <!-- AI 结果卡：标题 chip + 正文 + 动作条 -->
                  <div v-if="msg.content || (isStreaming && idx === activeDlvMsgs.length - 1)"
                    class="result-card w-full rounded-2xl border border-blue-200/60 overflow-hidden">
                    <!-- 标题 chip 栏 -->
                    <div v-if="selectedDeliverable" class="flex items-center gap-2 px-4 py-2.5 border-b border-blue-100/70 bg-blue-50/40">
                      <div class="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                        <i :class="selectedDeliverable.icon" class="text-blue-600 text-[11px]"></i>
                      </div>
                      <span class="text-[13px] font-semibold text-slate-800 truncate">{{ selectedDeliverable.name }}</span>
                      <span class="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100/70 text-blue-600 font-medium shrink-0">{{ currentStage === 3 ? '阶段③' : '阶段②' }} · {{ projectName }}</span>
                      <span class="flex-1"></span>
                      <span v-if="deliverableStatus[selectedDeliverable.key] === 'ready'" class="inline-flex items-center gap-1 text-[10.5px] text-blue-600 font-medium shrink-0">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>已生成
                      </span>
                    </div>
                    <!-- 正文 -->
                    <div class="px-5 py-4">
                      <div class="w-full max-w-full leading-[1.8] text-[14px] text-slate-800 markdown-body"
                        v-html="renderAssistantContent(msg, idx, { noFileCards: true })" @click="handleContentImgClick"></div>
                    </div>
                    <!-- 动作条：仅在回复完成后显示 -->
                    <div v-if="msg.content && !(isStreaming && idx === activeDlvMsgs.length - 1)" class="flex items-center gap-1 px-3 py-2 border-t border-blue-100/70 bg-white/60">
                      <button @click="copyMessage(msg.content)" class="result-act">
                        <i class="fa-regular fa-copy"></i>复制内容
                      </button>
                      <button @click="exportDeliverableMd(deliverableSelected)" :disabled="deliverableStatus[selectedDeliverable?.key] !== 'ready'" class="result-act">
                        <i class="fa-solid fa-download"></i>下载文档
                      </button>
                      <button @click="activeTab = 'prototype'" class="result-act">
                        <i class="fa-solid fa-window-maximize"></i>查看原型
                      </button>
                      <span class="flex-1"></span>
                      <button class="result-act result-act-icon" title="更多">
                        <i class="fa-solid fa-ellipsis"></i>
                      </button>
                    </div>
                  </div>
                  <span v-if="msg.timestamp" class="text-[11px] text-slate-400 mt-1.5 ml-0.5">{{ msg.timestamp }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Composer -->
          <div v-if="deliverableSelected" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-8 pb-4 px-4">
            <div class="w-full max-w-[640px] mx-auto">
              <div class="rounded-[22px] border transition-all duration-200 bg-slate-50 border-slate-200 hover:border-slate-300 shadow-[0_2px_10px_-6px_rgba(15,23,42,0.10)] focus-within:bg-white focus-within:border-blue-400/70 focus-within:shadow-[0_4px_20px_-6px_rgba(59,130,246,0.22)]">
                <div v-if="dlvComposer.attachments.value.length" class="flex items-center gap-2 px-4 pt-3 flex-wrap">
                  <div v-for="(att, ai) in dlvComposer.attachments.value" :key="ai" class="relative">
                    <img v-if="att.type === 'image'" :src="'data:' + att.media_type + ';base64,' + att.data" class="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                    <div v-else class="flex items-center gap-2 h-12 px-2.5 rounded-lg border border-slate-200 glass-card max-w-[180px]">
                      <i class="fa-solid fa-file-lines text-blue-500 text-sm shrink-0"></i>
                      <span class="text-[11.5px] text-slate-700 truncate">{{ att.name }}</span>
                    </div>
                    <button @click="dlvComposer.removeAttachment(ai)" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-700/90 hover:bg-danger text-white text-[8px] flex items-center justify-center">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
                <textarea
                  v-model="dlvInput"
                  rows="1"
                  :placeholder="isStreaming ? 'AI 正在响应中…' : `关于《${selectedDeliverable ? selectedDeliverable.name : '交付物'}》的问题，Ctrl+Enter 发送`"
                  :disabled="isStreaming"
                  class="w-full resize-none text-[13.5px] text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none leading-6 px-4 pt-3 pb-1 max-h-[150px] scrollbar-hide disabled:opacity-60"
                  @keydown.ctrl.enter.prevent="dlvSend"
                  @keydown.meta.enter.prevent="dlvSend"
                ></textarea>
                <div class="flex items-center justify-between px-3 pb-2.5 pt-1 gap-2">
                  <div class="flex items-center gap-1">
                    <ModelSelector
                      class="mr-1"
                      :models="availableModels"
                      :current="currentModel"
                      @change="handleChangeModel"
                    />
                    <button @click="dlvComposer.pickImage" :disabled="isStreaming" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors disabled:opacity-40">
                      <i class="fa-solid fa-image text-xs"></i>
                    </button>
                    <button @click="dlvComposer.pickFile" :disabled="isStreaming" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors disabled:opacity-40">
                      <i class="fa-solid fa-paperclip text-xs"></i>
                    </button>
                    <button @click="dlvComposer.toggleRecording" :disabled="isStreaming || !dlvComposer.recordingSupported" class="w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-40" :class="dlvComposer.isRecording.value ? 'text-white bg-danger' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'">
                      <i class="fa-solid text-xs" :class="dlvComposer.isRecording.value ? 'fa-stop' : 'fa-microphone'"></i>
                    </button>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[10.5px] text-slate-300 select-none">Ctrl+Enter</span>
                    <button v-if="isStreaming" @click="cancelStream" class="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center">
                      <span class="w-2.5 h-2.5 rounded-[2px] glass-card"></span>
                    </button>
                    <button v-else @click="dlvSend" :disabled="!dlvInput.trim() && dlvComposer.attachments.value.length === 0"
                      class="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      :class="(dlvInput.trim() || dlvComposer.attachments.value.length) ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30 active:scale-95' : 'bg-slate-100 text-slate-300'"
                    ><i class="fa-solid fa-arrow-up text-xs"></i></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 拖拽分割线 -->
        <div
          v-if="!rightPanelCollapsed"
          class="w-[3px] shrink-0 cursor-col-resize transition-colors relative z-10 bg-slate-100 hover:bg-blue-300"
          :class="rightPanelDragging ? 'bg-blue-400' : ''"
          @mousedown.prevent="startRightDrag"
        ></div>

        <!-- 右栏：文档预览 -->
        <div
          class="shrink-0 flex flex-col bg-transparent/60 border-l border-slate-100 overflow-hidden"
          :style="rightPanelCollapsed ? 'flex: 0 0 40px' : (rightPanelUserWidth ? 'flex: 0 0 ' + rightPanelUserWidth + 'px' : 'flex: 4.5 1 0; min-width: 320px')"
        >
          <!-- 顶栏 -->
          <div class="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 glass-card">
            <button
              class="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
              :title="rightPanelCollapsed ? '展开文档面板' : '折叠'"
              @click="rightPanelCollapsed = !rightPanelCollapsed"
            >
              <i class="fa-solid text-[10px]" :class="rightPanelCollapsed ? 'fa-chevron-left' : 'fa-chevron-right'"></i>
            </button>
            <template v-if="!rightPanelCollapsed">
              <div class="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-file-lines text-blue-600 text-[11px]"></i>
              </div>
              <span class="flex-1 text-[13px] font-bold text-slate-800 truncate">
                {{ livePreviewTitle || (selectedDeliverable ? selectedDeliverable.name : '文档') }}
              </span>
              <span v-if="livePreviewStreaming" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium shrink-0">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>写入中
              </span>
              <!-- MD / Word 药丸 -->
              <div class="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 ml-1 shrink-0">
                <button @click="livePreviewMode = 'md'" class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors" :class="livePreviewMode === 'md' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"><i class="fa-solid fa-arrow-pointer text-[8px]"></i>MD</button>
                <button @click="switchToDocxView" :disabled="!livePreviewDocxHtml" class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium disabled:opacity-40 transition-colors" :class="livePreviewMode === 'docx' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"><i class="fa-solid fa-file-word text-[9px]"></i>Word</button>
              </div>
              <!-- 编辑 / 下载 -->
              <button @click="togglePreviewEdit" :disabled="!livePreviewContent || livePreviewStreaming" class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-40 shrink-0" :class="previewEditing ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'" title="编辑文档">
                <i class="fa-solid text-[10px]" :class="previewEditing ? 'fa-eye' : 'fa-pen'"></i>{{ previewEditing ? '预览' : '编辑' }}
              </button>
              <button @click="openDeliverableDocx" :disabled="!livePreviewDocxHtml" class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:text-blue-600 hover:bg-slate-100 disabled:opacity-40 transition-colors shrink-0" title="用 Word 打开 / 下载">
                <i class="fa-solid fa-download text-[10px]"></i>下载
              </button>
            </template>
          </div>

          <!-- 文档正文 -->
          <div v-if="!rightPanelCollapsed" ref="previewScrollRef" class="flex-1 overflow-y-auto min-h-0">
            <!-- 空态 -->
            <div v-if="!livePreviewContent && !livePreviewDocxHtml" class="h-full flex flex-col px-4 py-5">
              <div class="mb-3 px-1">
                <div class="flex items-center gap-2 mb-1">
                  <i :class="selectedDeliverable ? selectedDeliverable.icon : 'fa-solid fa-file-lines'" class="text-blue-500 text-sm"></i>
                  <span class="text-[13px] font-semibold text-slate-700">{{ selectedDeliverable ? selectedDeliverable.name : '选择交付物' }}</span>
                </div>
                <p class="text-[12px] text-slate-400 leading-relaxed pl-5">{{ selectedDeliverable ? selectedDeliverable.hint : '从左侧选一件交付物' }}</p>
              </div>
              <div class="flex-1 glass-card rounded-xl border border-slate-200/70 shadow-sm overflow-hidden">
                <div class="px-3.5 py-2 border-b border-slate-100 bg-transparent/60 flex items-center gap-2">
                  <div class="w-3 h-3 rounded-sm bg-slate-200"></div>
                  <div class="h-2 w-28 bg-slate-200 rounded-full"></div>
                </div>
                <div class="px-4 py-4 space-y-2.5">
                  <div class="h-2.5 w-3/4 bg-slate-100 rounded-full"></div>
                  <div class="h-2 w-full bg-slate-100 rounded-full"></div>
                  <div class="h-2 w-5/6 bg-slate-100 rounded-full"></div>
                  <div class="h-2 w-4/5 bg-slate-100 rounded-full"></div>
                  <div class="mt-4 h-2.5 w-1/2 bg-slate-100 rounded-full"></div>
                  <div class="h-2 w-full bg-slate-100 rounded-full"></div>
                  <div class="h-2 w-3/4 bg-slate-100 rounded-full"></div>
                </div>
              </div>
              <div class="mt-3 flex justify-center">
                <button @click="generateDeliverable(deliverableSelected)" :disabled="isStreaming || deliverableBusy || !deliverableSelected"
                  class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm disabled:opacity-50">
                  <i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                  {{ deliverableBusy ? '生成中…' : 'AI 生成' }}
                </button>
              </div>
            </div>

            <!-- Word 成品预览 -->
            <div v-else-if="livePreviewMode === 'docx' && livePreviewDocxHtml"
              class="glass-card mx-3 mt-3 mb-4 rounded-xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.10)]">
              <div class="px-4 py-2 border-b border-slate-100 bg-transparent/50 rounded-t-xl flex items-center gap-2">
                <i class="fa-solid fa-file-word text-blue-500 text-[12px]"></i>
                <span class="text-[12.5px] text-slate-500 truncate">{{ livePreviewTitle || '文档' }} · Word</span>
              </div>
              <div class="px-7 py-6 markdown-body docx-preview" v-html="livePreviewDocxHtml"></div>
            </div>

            <!-- Markdown 预览 / 在线编辑 -->
            <div v-else
              class="glass-card mx-3 mt-3 mb-4 rounded-xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.10)]">
              <div class="px-4 py-2 border-b border-slate-100 bg-transparent/50 rounded-t-xl flex items-center gap-2">
                <i class="fa-solid fa-file-lines text-slate-400 text-[12px]"></i>
                <span class="text-[12.5px] text-slate-500 truncate">{{ livePreviewTitle || '文档' }}</span>
                <span v-if="livePreviewStreaming" class="ml-auto text-[11.5px] text-emerald-600">正在写入…</span>
                <!-- 生成完成后可就地编辑 -->
                <button
                  v-else-if="livePreviewContent"
                  @click="togglePreviewEdit"
                  class="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors"
                  :class="previewEditing ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'"
                  :title="previewEditing ? '回到预览' : '编辑文档'"
                >
                  <i class="fa-solid text-[10px]" :class="previewEditing ? 'fa-eye' : 'fa-pen'"></i>
                  {{ previewEditing ? '预览' : '编辑' }}
                </button>
              </div>
              <!-- 编辑态 -->
              <div v-if="previewEditing" class="p-4">
                <textarea
                  v-model="previewDraft"
                  class="w-full h-[calc(100vh-340px)] min-h-[320px] px-4 py-3 border border-slate-200 rounded-lg text-[13.5px] font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                ></textarea>
                <div class="mt-3 flex items-center justify-end gap-2">
                  <button @click="previewEditing = false" class="px-3 py-1.5 text-[12.5px] rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">取消</button>
                  <button @click="savePreviewEdit" class="px-4 py-1.5 text-[12.5px] font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                    <i class="fa-solid fa-check mr-1 text-[10px]"></i>保存并更新 Word
                  </button>
                </div>
              </div>
              <!-- 预览态 -->
              <div v-else class="px-7 py-6 markdown-body" v-html="renderMarkdown(livePreviewPreviewMd, { noFileCards: true })"></div>
            </div>
          </div>
        </div>
      </div><!-- end workspace tab -->

      <!-- Prototype Tab — full width -->
      <div v-if="activeTab === 'prototype'" class="flex h-full w-full">
        <!-- File tree -->
        <div class="w-[212px] shrink-0 bg-transparent/60 border-r border-slate-100 flex flex-col overflow-hidden">
          <div class="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <span class="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">文件列表</span>
            <button @click="refreshPrototypeFiles" class="text-slate-400 hover:text-blue-600 transition-colors" title="刷新">
              <i class="fa-solid fa-arrows-rotate text-[11px]"></i>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto py-1.5 px-1.5">
            <div v-if="prototypeFiles.length === 0" class="px-3 py-4 text-[11px] text-slate-400 text-center">
              暂无文件
            </div>
            <template v-for="row in fileTreeRows" :key="row.type + ':' + (row.path || row.rel)">
              <!-- 文件夹行：可折叠 -->
              <button
                v-if="row.type === 'dir'"
                @click="toggleDir(row.path)"
                class="w-full text-left pr-2 py-1.5 rounded-md text-[12px] leading-tight text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1"
                :style="{ paddingLeft: (8 + row.depth * 14) + 'px' }"
              >
                <i class="fa-solid text-[9px] text-slate-400 w-2.5 shrink-0" :class="row.collapsed ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
                <i class="fa-solid text-[11px] shrink-0" :class="row.collapsed ? 'fa-folder text-amber-400' : 'fa-folder-open text-amber-400'"></i>
                <span class="truncate font-medium">{{ row.name }}</span>
              </button>
              <!-- 文件行 -->
              <button
                v-else
                @click="selectPrototypeFile(row.rel)"
                class="w-full text-left pr-2 py-1.5 rounded-md text-[12px] leading-tight transition-colors flex items-center gap-1.5"
                :style="{ paddingLeft: (8 + row.depth * 14 + 15) + 'px' }"
                :class="selectedFile === row.rel ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'"
              >
                <i
                  class="text-[11px] shrink-0"
                  :class="[fileIcon(row.rel).icon, selectedFile === row.rel ? 'text-blue-500' : fileIcon(row.rel).color]"
                ></i>
                <span class="truncate">{{ row.base }}</span>
              </button>
            </template>
          </div>
        </div>
        <!-- Preview pane -->
        <div class="flex-1 flex flex-col min-w-0">
          <div class="shrink-0 flex items-center gap-3 px-3.5 py-2 border-b border-slate-100 glass-card">
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
            <button
              @click="publishLocal"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              :disabled="prototypeFiles.length === 0"
              title="启动本地服务并在浏览器打开（数据可正常加载）"
            >
              <i class="fa-solid fa-globe text-[10px]"></i>
              发布本地服务
            </button>
            <button
              @click="exportZip"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              :disabled="prototypeFiles.length === 0"
              title="把原型打包为 ZIP 下载"
            >
              <i class="fa-solid fa-file-zipper text-[10px]"></i>
              导出 ZIP
            </button>
            <!-- 预览缩放：仅缩放 iframe 视觉，不改原型文件 -->
            <div v-if="selectedFile && isHtmlSelected" class="ml-auto flex items-center gap-1 rounded-lg bg-slate-100 px-1 py-0.5">
              <button @click="zoomStep(-0.1)" class="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-white hover:text-blue-600 transition-colors" title="缩小">
                <i class="fa-solid fa-minus text-[10px]"></i>
              </button>
              <button @click="setZoom(1)" class="min-w-[42px] text-center text-[11px] tabular-nums text-slate-600 hover:text-blue-600 transition-colors" title="重置为 100%">
                {{ Math.round(previewZoom * 100) }}%
              </button>
              <button @click="zoomStep(0.1)" class="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-white hover:text-blue-600 transition-colors" title="放大">
                <i class="fa-solid fa-plus text-[10px]"></i>
              </button>
            </div>
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
                    <div v-if="msg.content" class="rounded-[18px] px-3.5 py-2 leading-relaxed text-[14px] bg-[#e7edf7] text-slate-800 whitespace-pre-wrap break-words text-left">
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
                          <div class="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 glass-card border border-slate-200/60 text-slate-400">
                            <i :class="step.icon || 'fa-solid fa-circle'" class="text-[8px]"></i>
                          </div>
                          <span class="text-[12px] leading-relaxed text-slate-600 compact-markdown" v-html="renderMarkdown(step.text)"></span>
                        </div>
                      </div>
                    </div>
                    <div v-if="msg.content || (isStreaming && idx === iterateMessages.length - 1)" class="w-full leading-[1.75] text-[15px] text-slate-800 markdown-body" v-html="renderAssistantContent(msg, idx)" @click="handleContentImgClick"></div>
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
            <div v-else-if="isHtmlSelected" class="w-full h-full overflow-hidden glass-card">
              <iframe
                :key="iframeKey"
                :src="iframeSrc"
                class="border-0 origin-top-left"
                :style="{ width: (100 / previewZoom) + '%', height: (100 / previewZoom) + '%', transform: 'scale(' + previewZoom + ')' }"
                sandbox="allow-scripts allow-same-origin"
              ></iframe>
            </div>
            <!-- 非 HTML 文件：源码预览 -->
            <div v-else class="h-full flex flex-col bg-[#0f1b2d] min-h-0">
              <div class="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-white/10">
                <i class="text-[11px]" :class="[fileIcon(selectedFile).icon, fileIcon(selectedFile).color]"></i>
                <span class="text-[12px] text-slate-300 font-mono">{{ selectedFile }}</span>
                <span class="ml-auto text-[10px] text-slate-500">只读预览</span>
              </div>
              <pre class="flex-1 overflow-auto p-4 text-[12px] leading-relaxed text-slate-200 font-mono whitespace-pre"><code>{{ fileSource || '（空文件）' }}</code></pre>
            </div>
          </div>

          <!-- 迭代对话条（就地改原型，原「迭代修改」tab 并入这里）-->
          <div v-if="prototypeFiles.length > 0 || isStreaming" class="shrink-0 border-t border-slate-100 glass-card px-4 py-3">
            <div class="max-w-3xl mx-auto">
              <!-- 附件预览 -->
              <div v-if="iterateComposer.attachments.value.length" class="flex items-center gap-2 mb-2 flex-wrap">
                <div v-for="(att, ai) in iterateComposer.attachments.value" :key="ai" class="relative group/att">
                  <img v-if="att.type === 'image'" :src="'data:' + att.media_type + ';base64,' + att.data" class="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                  <div v-else class="flex items-center gap-1.5 h-12 px-2.5 rounded-lg border border-slate-200 glass-card max-w-[160px]">
                    <i class="fa-solid fa-file-lines text-blue-500 text-sm shrink-0"></i>
                    <span class="text-[11px] text-slate-600 truncate">{{ att.name }}</span>
                  </div>
                  <button @click="iterateComposer.removeAttachment(ai)" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[8px] flex items-center justify-center shadow-sm">
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
                  @keydown.enter.exact="onIterateEnter"
                ></textarea>
                <button @click="iterateComposer.pickImage" :disabled="isStreaming" class="mb-1.5 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed" title="上传图片">
                  <i class="fa-solid fa-image text-xs"></i>
                </button>
                <button @click="iterateComposer.pickFile" :disabled="isStreaming" class="mb-1.5 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed" title="上传文件">
                  <i class="fa-solid fa-paperclip text-xs"></i>
                </button>
                <button @click="iterateComposer.toggleRecording" :disabled="isStreaming || !iterateComposer.recordingSupported" class="mb-1.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" :class="iterateComposer.isRecording.value ? 'text-white bg-danger hover:bg-danger-deep' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'" :title="iterateComposer.recordingSupported ? (iterateComposer.isRecording.value ? '停止录音' : '语音输入') : '当前环境不支持录音'">
                  <i class="fa-solid text-xs" :class="iterateComposer.isRecording.value ? 'fa-stop' : 'fa-microphone'"></i>
                </button>
                <button
                  v-if="isStreaming"
                  @click="cancelStream"
                  class="mb-1.5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center shrink-0"
                  title="停止"
                >
                  <span class="w-3 h-3 rounded-[3px] glass-card"></span>
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
        <div class="flex-1 flex flex-col min-w-0 relative glass-card">
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
                      <img v-if="att.type === 'image'" :src="'data:' + (att.media_type || 'image/png') + ';base64,' + att.data" class="max-w-[160px] max-h-[120px] object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:brightness-95 transition" @click="openLightbox('data:' + (att.media_type || 'image/png') + ';base64,' + att.data)" />
                      <AttachmentChip v-else :att="att" @preview-image="openLightbox" />
                    </template>
                  </div>
                  <div v-if="msg.content" class="rounded-[18px] px-3.5 py-2 leading-relaxed text-[14px] bg-[#e7edf7] text-slate-800 whitespace-pre-wrap break-words text-left">
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
                        <div class="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 glass-card border border-slate-200/60 text-slate-400">
                          <i :class="step.icon || 'fa-solid fa-circle'" class="text-[8px]"></i>
                        </div>
                        <span class="text-[12px] leading-relaxed text-slate-600 compact-markdown" v-html="renderMarkdown(step.text)"></span>
                      </div>
                    </div>
                  </div>
                  <!-- Content: no bubble, plain text -->
                  <div v-if="msg.content || (isStreaming && idx === stage3Messages.length - 1)" class="w-full leading-[1.75] text-[15px] text-slate-800 markdown-body" v-html="renderAssistantContent(msg, idx)" @click="handleContentImgClick"></div>
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
                  class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium glass-card border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div v-else class="flex items-center gap-2 h-14 px-3 rounded-xl border border-slate-200 glass-card max-w-[200px]">
                      <i class="fa-solid fa-file-lines text-blue-500 text-base shrink-0"></i>
                      <span class="text-[12px] text-slate-700 truncate">{{ att.name }}</span>
                    </div>
                    <button @click="stage3Composer.removeAttachment(ai)" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700/90 hover:bg-danger text-white text-[9px] flex items-center justify-center shadow-sm">
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
                    <button @click="stage3Composer.pickImage" :disabled="isStreaming" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="上传图片">
                      <i class="fa-solid fa-image text-sm"></i>
                    </button>
                    <button @click="stage3Composer.pickFile" :disabled="isStreaming" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="上传文件">
                      <i class="fa-solid fa-paperclip text-sm"></i>
                    </button>
                    <button @click="stage3Composer.toggleRecording" :disabled="isStreaming || !stage3Composer.recordingSupported" class="w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed" :class="stage3Composer.isRecording.value ? 'text-white bg-danger hover:bg-danger-deep' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'" :title="stage3Composer.recordingSupported ? (stage3Composer.isRecording.value ? '停止录音' : '语音输入') : '当前环境不支持录音'">
                      <i class="fa-solid text-sm" :class="stage3Composer.isRecording.value ? 'fa-stop' : 'fa-microphone'"></i>
                    </button>
                    <span v-if="stage3Composer.isRecording.value" class="text-[11px] text-danger font-medium tabular-nums">{{ stage3Composer.recordSeconds.value }}s</span>
                    <span v-else-if="stage3Composer.isTranscribing.value" class="text-[11px] text-blue-500 font-medium">识别中…</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="text-[11px] text-slate-400 select-none">Ctrl + Enter 发送</span>
                    <button
                      v-if="isStreaming"
                      @click="cancelStream"
                      class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center transition-all shadow-sm"
                      title="停止生成"
                    >
                      <span class="w-3 h-3 rounded-[3px] glass-card"></span>
                    </button>
                    <button
                      v-else
                      @click="sendStage3"
                      :disabled="!stage3Input.trim() && stage3Composer.attachments.value.length === 0"
                      class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
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
        v-else-if="activeTab === 'deliverables'"
        :deliverables="activeDeliverables"
        :selected="deliverableSelected"
        :status-map="deliverableStatus"
        :content="activeDeliverableContent"
        :preview-content="activeDeliverablePreview"
        :busy="deliverableBusy"
        :busy-key="deliverableBusyKey"
        :stage-id="currentStage"
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

  <!-- 轻量提示 -->
  <transition name="fade">
    <div
      v-if="toast.show"
      class="fixed top-4 right-4 z-[9999] max-w-md px-3.5 py-2 rounded-lg shadow-lg text-sm border"
      :class="toast.type === 'success' ? 'glass-card border-emerald-300 text-emerald-700'
        : toast.type === 'error' ? 'glass-card border-red-300 text-red-700'
        : 'glass-card border-blue-200 text-blue-700'"
    >
      <i class="fa-solid mr-1.5" :class="toast.type === 'success' ? 'fa-circle-check'
        : toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'"></i>
      {{ toast.text }}
    </div>
  </transition>

  <ImageLightbox :src="lightboxSrc" :visible="lightboxVisible" @close="lightboxVisible = false" />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { trackPrompt, getInflightPrompt } from '../../composables/promptInflight.js';
import { useRoute } from 'vue-router';
import { marked } from 'marked';
import StagePanel from '@/components/workbench/StagePanel.vue';
import Stage3Deliverables from '@/components/workbench/StageDeliverables.vue';
import ImageLightbox from '@/components/common/ImageLightbox.vue';
import AttachmentChip from '@/components/common/AttachmentChip.vue';
import ModelSelector from '@/components/agent/ModelSelector.vue';
import { FDE_STAGES, getStage, DEFAULT_STAGE } from '@/data/fde-stages';
import { useChatComposer } from '@/composables/useChatComposer';

const props = defineProps({
  slug: { type: String, required: true },
});

const route = useRoute();

// --- State ---
const projectName = ref('');
const projectMeta = ref(null);
const activeTab = ref('workspace');

// 图片放大预览（三个对话 tab 共用）
const lightboxSrc = ref('');
const lightboxVisible = ref(false);
const openLightbox = (src) => {
  lightboxSrc.value = src;
  lightboxVisible.value = true;
};
const handleContentImgClick = (e) => {
  const dlBtn = e.target.closest('.chat-file-download');
  if (dlBtn) {
    e.stopPropagation();
    const fp = dlBtn.dataset.filepath;
    if (fp) window.api.fs.saveLocalFile(fp);
    return;
  }
  const openBtn = e.target.closest('.chat-file-open');
  if (openBtn) {
    e.stopPropagation();
    const fp = openBtn.dataset.filepath;
    if (fp) window.api.shell.openPath(fp);
    return;
  }
  const card = e.target.closest('.chat-delivery-card');
  if (card) {
    const fp = card.dataset.filepath;
    if (fp) window.api.shell.openPath(fp);
    return;
  }
  const img = e.target.closest('img.chat-inline-img');
  if (img) openLightbox(img.src);
};

// --- FDE 五阶段工作台状态 ---
const WORKSPACE_STAGES = [2, 3]; // 阶段②③承载真实工作区;①④⑤仍走 StagePanel 展示
const currentStage = ref(DEFAULT_STAGE);
const stageStatus = ref({ 1: 'done', 2: 'active', 3: 'todo', 4: 'todo', 5: 'todo' });
const activeStageObj = computed(() => getStage(currentStage.value));
const isWorkspaceStage = computed(() => WORKSPACE_STAGES.includes(currentStage.value));

// ===== 截图版工作台 UI 辅助（纯展示，不改数据流）=====

// Hero 副标题：优先项目需求描述，回退到通用文案
const heroSubtitle = computed(() =>
  projectMeta.value?.requirement
  || projectMeta.value?.description
  || '基于项目数据与业务知识，构建智能分析与决策助手，帮助管理者快速获取关键指标与分析结论。'
);

// 顶栏时钟（HH:mm:ss），每秒刷新
const nowClock = ref('');
let clockTimer = null;
const tickClock = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  nowClock.value = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

// 步骤条状态判定（复刻自 StageTimeline：stageStatus 优先，否则据 currentStage 推导）
function statusOf(id) {
  if (stageStatus.value && stageStatus.value[id]) return stageStatus.value[id];
  if (id < currentStage.value) return 'done';
  if (id === currentStage.value) return 'active';
  return 'todo';
}
function stepNodeClass(id) {
  if (id === currentStage.value) return 'bg-blue-50 ring-1 ring-blue-200';
  if (statusOf(id) === 'done') return 'hover:bg-slate-50';
  return 'hover:bg-slate-50 opacity-80';
}
function stepDotClass(id) {
  if (id === currentStage.value) return 'is-active';
  if (statusOf(id) === 'done') return 'is-done';
  return 'is-todo';
}
// 步骤标题：手册里 name 含「+」，截图分两行，这里取主标题；hint 取「+」后半段
function stepTitle(stage) {
  return String(stage.name).split(/\s*\+\s*/)[0] || stage.name;
}
function stepHint(stage) {
  const parts = String(stage.name).split(/\s*\+\s*/);
  return parts.length > 1 ? parts.slice(1).join(' · ') : (stage.short || '');
}

// 左栏搜索 + 过滤（仅前端按名称过滤当前阶段交付物）
const docSearch = ref('');
const filteredDeliverables = computed(() => {
  const q = docSearch.value.trim().toLowerCase();
  if (!q) return activeDeliverables.value;
  return activeDeliverables.value.filter((d) =>
    d.name.toLowerCase().includes(q) || (d.short || '').toLowerCase().includes(q)
  );
});

// 收藏星标（localStorage 持久化，per project）
const favDocs = ref(new Set());
const favKey = () => `fde:favDocs:${props.slug}`;
function loadFavDocs() {
  try {
    const raw = localStorage.getItem(favKey());
    favDocs.value = new Set(raw ? JSON.parse(raw) : []);
  } catch (_) { favDocs.value = new Set(); }
}
function toggleFav(key) {
  const s = new Set(favDocs.value);
  if (s.has(key)) s.delete(key); else s.add(key);
  favDocs.value = s;
  try { localStorage.setItem(favKey(), JSON.stringify([...s])); } catch (_) { /* 忽略 */ }
}

// 相关资料（静态占位，仅展示）
const relatedResources = [
  { name: '医院数据字典' },
  { name: 'HIS系统对接文档' },
  { name: '同类案例参考' },
];

// composer 模型选择器：与「AI 智能对话」同源（hermes.listModels / setModel）
const availableModels = ref([]);
const currentModel = ref('');

// 加载可选模型列表 + 回填当前模型
const loadModels = async (retries = 5) => {
  try {
    const res = await window.api?.hermes?.listModels?.();
    const list = (res && res.models) || [];
    if (list.length > 0) availableModels.value = list;
    if (res?.current && !currentModel.value) currentModel.value = res.current;
    if (list.length === 0 && retries > 0) {
      setTimeout(() => loadModels(retries - 1), 1200);
    }
  } catch (e) {
    console.error('List models failed:', e);
  }
  // 兜底：config.yaml 持久化真值
  if (!currentModel.value) {
    try {
      const cfg = await window.api?.hermes?.readConfigModel?.();
      if (cfg?.model) currentModel.value = cfg.model;
    } catch (_) { /* ignore */ }
  }
};

// 切模型：乐观更新 + 对当前项目会话生效（引擎可能重启，重启后重载项目）
const handleChangeModel = async (modelId) => {
  currentModel.value = modelId;
  try {
    const result = await window.api.hermes.setModel(props.slug, modelId);
    if (result?.restarted) {
      try { await window.api.hermes.loadProject(props.slug); } catch (_) { /* 下次发消息会自动重建 */ }
    }
  } catch (e) {
    console.error('Set model failed:', e);
    // 持久化兜底（无活动会话时）
    try { await window.api?.hermes?.setConfigModel?.(modelId); } catch (_) { /* ignore */ }
  }
};


// 复制结果卡内容到剪贴板
async function copyMessage(text) {
  try {
    await navigator.clipboard.writeText(text || '');
    showToast('已复制内容', 'success');
  } catch (_) {
    showToast('复制失败', 'error');
  }
}


async function selectStage(id) {
  if (id === currentStage.value) return;
  currentStage.value = id;
  // 切阶段时重置到该阶段第一个 tab
  const firstTab = tabsForStage(id)[0];
  if (firstTab) activeTab.value = firstTab.key;
  // 交付物：选中该阶段第一件，并加载该阶段已生成的交付物
  const firstDeliv = deliverablesForStage(id)[0];
  if (firstDeliv) deliverableSelected.value = firstDeliv.key;
  // 清掉上一阶段的预览内容，再读新阶段（loadDeliverablesForStage 会刷新右侧）
  livePreviewContent.value = '';
  livePreviewDocxHtml.value = '';
  livePreviewTitle.value = '';
  livePreviewFile.value = '';
  previewEditing.value = false;
  await loadDeliverablesForStage(id);
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

// tab 集按阶段计算：阶段②③ 统一为 工作台（对话+交付物预览）| 原型
const STAGE2_TABS = [
  { key: 'workspace', label: '工作台', icon: 'fa-solid fa-table-columns' },
  { key: 'deliverables', label: '交付物', icon: 'fa-solid fa-box-open' },
  { key: 'prototype', label: '原型', icon: 'fa-solid fa-window-maximize' },
];
const STAGE3_TABS = [
  { key: 'workspace', label: '工作台', icon: 'fa-solid fa-table-columns' },
  { key: 'deliverables', label: '交付物', icon: 'fa-solid fa-box-open' },
  { key: 'prototype', label: '定稿原型', icon: 'fa-solid fa-window-maximize' },
];
function tabsForStage(id) {
  if (id === 3) return STAGE3_TABS;
  return STAGE2_TABS;
}
const tabs = computed(() => tabsForStage(currentStage.value));

// 当前阶段活动的对话消息数组（workspace tab 按 currentStage 区分）
const currentMessages = computed(() => {
  if (activeTab.value === 'iterate' || streamTargetTab.value === 'iterate') return iterateMessages;
  return currentStage.value === 3 ? stage3Messages : messages;
});

// 按当前 tab 取对应的消息数组（.value）——统一入口，供流式渲染/追加使用
const streamTargetTab = ref('');
// 本轮回复锁定的写入目标 { arr, tab }：生成途中切交付物 / 切 tab 都不会串台
let lockedStream = null;
function activeMessagesArr() {
  if (lockedStream) return lockedStream.arr;
  const t = streamTargetTab.value || activeTab.value;
  if (t === 'iterate') return iterateMessages.value;
  if (t === 'prototype-gen') return prototypeGenMessages.value;
  if (t === 'chat3') return stage3Messages.value;
  if (t === 'workspace' || t.startsWith('deliverable')) {
    // 正在生成时锁定到生成目标；否则才跟随界面选中项。
    // 否则用户在生成途中切换交付物，剩余 chunk 会串进新选中的那条对话。
    const target = deliverableBusyKey.value || deliverableSelected.value;
    const k = dkey(currentStage.value, target);
    if (!deliverableMsgs.value[k]) deliverableMsgs.value[k] = [];
    return deliverableMsgs.value[k];
  }
  return messages.value;
}
// 当前 tab 对应的持久化 tab 名
function activeTabName() {
  if (lockedStream) return lockedStream.tab;
  const t = streamTargetTab.value || activeTab.value;
  if (t === 'iterate') return 'iterate';
  if (t === 'prototype-gen') return 'prototype-gen';
  if (t === 'workspace' || t.startsWith('deliverable')) return `deliverable:${deliverableBusyKey.value || deliverableSelected.value}`;
  if (t === 'chat3') return 'chat3';
  return 'requirement';
}

// 由持久化 tab 名反查该轮应写入的消息数组（重进页面时恢复锁用）
function lockFromTab(tab) {
  if (String(tab).startsWith('deliverable:')) {
    const key = String(tab).slice('deliverable:'.length);
    const k = dkey(currentStage.value, key);
    if (!deliverableMsgs.value[k]) deliverableMsgs.value[k] = [];
    return { arr: deliverableMsgs.value[k], tab };
  }
  if (tab === 'iterate') return { arr: iterateMessages.value, tab };
  if (tab === 'chat3') return { arr: stage3Messages.value, tab };
  return { arr: messages.value, tab };
}

// 一轮回复开始：锁死写入目标。之后切交付物 / 切 tab 都不会把剩余 chunk 串到别处。
function beginStream(arr, tab) {
  lockedStream = { arr, tab };
  isStreaming.value = true;
  isToolRunning.value = false;
  currentStreamId = Date.now().toString();
  return currentStreamId;
}

// 一轮回复收尾。幂等：引擎事件和 await 返回都会调，只有第一次真正生效，
// 否则 finalizeLastAssistantMessage 会重复落盘同一条回答。
function endStream() {
  if (!isStreaming.value && !lockedStream) return;
  if (streamEndTimer) { clearTimeout(streamEndTimer); streamEndTimer = null; }
  flushTypewriterQueue();
  finalizeLastAssistantMessage();   // 仍要用本轮的锁，必须在清锁之前
  lockedStream = null;
  isStreaming.value = false;
  isToolRunning.value = false;
}

// 离开项目页时上一轮还没结束：重进后锁回它原来的对话，保持「生成中」直到引擎真正返回
function resumeInflight(inflight) {
  const tab = String(inflight.tab || '');
  const dlvKey = tab.startsWith('deliverable:') ? tab.slice('deliverable:'.length) : '';
  if (dlvKey) {
    deliverableBusy.value = true;
    deliverableBusyKey.value = dlvKey;
    selectDeliverable(dlvKey);
  }
  if (tab === 'iterate') streamTargetTab.value = 'iterate';
  const lock = lockFromTab(tab);
  const streamId = beginStream(lock.arr, lock.tab);
  lock.arr.push(createMessage('assistant', '', {
    thinkingSteps: [{ text: 'AI 仍在处理上一轮请求…', icon: 'fa-solid fa-hourglass-half', visible: true }],
    thinkingDone: false, expanded: true, typingContent: '', timestamp: '', streamId,
  }));
  inflight.done.then(async () => {
    endStream();
    if (dlvKey) {
      deliverableBusy.value = false;
      deliverableBusyKey.value = '';
      await finishLivePreview(currentStage.value);
    }
    if (tab === 'iterate') { iframeKey.value++; streamTargetTab.value = ''; }
    refreshPrototypeFiles();
    loadSpec();
  });
}
// 生成 PRD / 功能清单时自动配图的指令片段。
// {mdDir} 会被替换为该交付物 md 文件所在目录（根目录交付物为空串）。
// 图必须写到「与 md 同级的 assets/ 目录」，并在正文用相对路径 ![](assets/xxx.svg) 引用，
// 这样展示端 inlineRelativeImages 才能按 md 所在目录解析并内联渲染。
const diagramInstruction = (mdDir) => {
  const assetsAbs = mdDir ? `${mdDir}assets/` : 'assets/';
  return `

【自动配图（重要）】在写文档正文前，先根据需求上下文生成 3 类图并存为 SVG，供页面直接展示：
1) 架构图（系统分层/模块关系）→ 文件 \`${assetsAbs}architecture.svg\`
2) 业务流程图（用户操作流程/关键判断分支）→ 文件 \`${assetsAbs}flow.svg\`
3) 智能体能力图（AI/agent 推理、工具、知识库分布）→ 文件 \`${assetsAbs}agent-capability.svg\`

生成方式（优先复用绘图脚本，不可用则退化）：
- 优先：\`python3 ~/.claude/skills/fireworks-tech-graph/scripts/generate-from-template.py architecture 项目绝对路径/${assetsAbs}architecture.svg '{"title":"系统架构","nodes":[...],"arrows":[...]}'\`（flowchart / agent 类型同理，见该脚本用法）。
- 退化：脚本不存在时，直接用 python 写出合法 SVG 文本，再用 \`rsvg-convert 文件.svg -o /tmp/_diagcheck.png\` 校验语法（无 rsvg-convert 则跳过校验，SVG 仍可展示）。
- 每张图先 \`mkdir -p 项目绝对路径/${assetsAbs}\` 确保目录存在。

在文档正文对应章节用【相对路径】插入图片（不要写绝对路径、不要 data URI，展示端会自动内联）：
- 「产品架构总览」章节：\`![架构图](assets/architecture.svg)\`
- 核心业务流程 / 交互流程章节：\`![业务流程图](assets/flow.svg)\`
- AI 能力分布 / 智能体章节：\`![智能体能力图](assets/agent-capability.svg)\`
若某类图与本产品无关可省略对应一张，但架构图与流程图应尽量都有。`;
};

// 需要自动配图的交付物 key（PRD + 功能清单）
const DIAGRAM_KEYS = ['feature-spec', 'prd2', 'prd'];

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
    tplHtml: { stage: '03', html: '2-需求最终确认表【交付】.html' },
    hint: '把阶段②收敛后的需求签字定稿——项目概述/痛点/AI赋能方案/需求清单/验收口径。',
  },
  {
    key: 'agent-design', name: '智能体设计表', short: '设计表',
    icon: 'fa-solid fa-diagram-project', file: 'stage3/agent-design.md',
    tplHtml: { stage: '03', html: '1-智能体设计表【交付】.html' },
    hint: '一个环节一个智能体：身份卡→五层拆解→六组件→提示词→知识库→技能→A/B→验收上线。',
  },
  {
    key: 'impl-plan', name: '产品实施计划表', short: '实施计划',
    icon: 'fa-solid fa-calendar-check', file: 'stage3/impl-plan.md',
    tplHtml: { stage: '03', html: '3-产品实施计划表【交付】.html' },
    hint: '把签字定死的需求拆成可排期的实施计划：前期调研（网络/服务器/VPN/业务系统/数据库）、SDR 部署、里程碑节点，每项带责任人/工期/前置依赖/交付物，作为阶段④建工作台的排期依据。',
  },
  {
    key: 'data-metric', name: '业务数据口径模板', short: '数据口径',
    icon: 'fa-solid fa-ruler-combined', file: 'stage3/data-metric.md',
    tplHtml: { stage: '03', html: '4-业务数据口径模板【研发交付】.html' },
    hint: '按 章/节/指标/指标类型/取数SQL/数据来源表 把每个指标的取数出处与计算口径定死；数据集优先复用 SDR 标准库、新增部分登记数据集清单，作为阶段④建模、阶段⑤验收的对账依据。',
  },
  {
    key: 'prd', name: '产品需求文档PRD(范例)', short: 'PRD',
    icon: 'fa-solid fa-file-lines', file: 'stage3/prd.md',
    tplHtml: { stage: '03', html: '5-PRD【交付】.html' },
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
// 折叠的文件夹路径集合（默认全部展开）
const collapsedDirs = ref(new Set());
function toggleDir(dirPath) {
  const s = new Set(collapsedDirs.value);
  if (s.has(dirPath)) s.delete(dirPath); else s.add(dirPath);
  collapsedDirs.value = s;
}
// 由扁平文件列表构建嵌套树，再按折叠状态摊平成「可见行」供 v-for 渲染
const fileTreeRows = computed(() => {
  const root = { dirs: new Map(), files: [] };
  for (const f of prototypeFiles.value) {
    const rel = f.rel || f.name;
    const parts = rel.split('/');
    let node = root;
    // 逐级建目录
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      if (!node.dirs.has(seg)) node.dirs.set(seg, { name: seg, dirs: new Map(), files: [] });
      node = node.dirs.get(seg);
    }
    node.files.push({ ...f, rel, base: parts[parts.length - 1] });
  }
  const rows = [];
  const walk = (node, prefix, depth) => {
    // 目录在前，按名排序
    const dirNames = [...node.dirs.keys()].sort((a, b) => a.localeCompare(b));
    for (const name of dirNames) {
      const dirPath = prefix ? `${prefix}/${name}` : name;
      const collapsed = collapsedDirs.value.has(dirPath);
      rows.push({ type: 'dir', name, path: dirPath, depth, collapsed });
      if (!collapsed) walk(node.dirs.get(name), dirPath, depth + 1);
    }
    // 文件按名排序
    for (const file of node.files.slice().sort((a, b) => a.base.localeCompare(b.base))) {
      rows.push({ type: 'file', ...file, depth });
    }
  };
  walk(root, '', 0);
  return rows;
});

// 轻量提示（导出 / 发布本地服务的成功或失败反馈）
const toast = ref({ show: false, type: 'info', text: '' });
let toastTimer = null;
function showToast(text, type = 'info') {
  toast.value = { show: true, type, text };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.value.show = false; }, 3200);
}
const iframeKey = ref(0);
const iframeSrc = ref('');
// 非 HTML 文件的源码预览
const fileSource = ref('');
const isHtmlSelected = ref(true);
// 原型预览缩放（仅缩放 iframe 视觉，不改原型文件）
const previewZoom = ref(0.75);
function setZoom(z) {
  previewZoom.value = Math.min(1.5, Math.max(0.5, Math.round(z * 100) / 100));
}
function zoomStep(delta) { setZoom(previewZoom.value + delta); }

// 按扩展名给文件树选图标 / 颜色
function fileIcon(rel) {
  const n = (rel || '').toLowerCase();
  if (/\.html?$/.test(n)) return { icon: 'fa-solid fa-file-code', color: 'text-amber-600' };
  if (/\.jsx?$|\.mjs$/.test(n)) return { icon: 'fa-brands fa-js', color: 'text-yellow-500' };
  if (/\.css$/.test(n)) return { icon: 'fa-brands fa-css3-alt', color: 'text-sky-500' };
  if (/\.json$/.test(n)) return { icon: 'fa-solid fa-database', color: 'text-emerald-500' };
  if (/\.(png|jpe?g|gif|svg|webp)$/.test(n)) return { icon: 'fa-solid fa-image', color: 'text-indigo-500' };
  if (/\.md$/.test(n)) return { icon: 'fa-solid fa-file-lines', color: 'text-slate-500' };
  return { icon: 'fa-solid fa-file', color: 'text-slate-400' };
}
// 文件树展示名：子目录文件带上父目录前缀，避免同名混淆
function fileLabel(f) {
  return f.rel || f.name;
}

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
const deliverableContents = ref({});          // { 'stage:key': markdown } —— 原文，供编辑/导出/保存
const deliverablePreviews = ref({});           // { 'stage:key': markdown } —— 相对图片已内联为 data URI，供预览
const deliverableEditing = ref(false);
const deliverableBusy = ref(false);
const deliverableBusyKey = ref('');   // 正在生成的交付物 key（只让它转圈）

// 当前阶段交付物清单 + 选中项 + 状态
const activeDeliverables = computed(() => (currentStage.value === 3 ? STAGE3_DELIVERABLES : STAGE2_DELIVERABLES));
const selectedDeliverable = computed(() =>
  activeDeliverables.value.find((d) => d.key === deliverableSelected.value) || null
);
const activeDeliverableContent = computed(() =>
  deliverableContents.value[`${currentStage.value}:${deliverableSelected.value}`] || ''
);
// 预览用内容：优先用图片已内联的版本，回退到原文（编辑中的实时内容也会回退到原文）
const activeDeliverablePreview = computed(() =>
  deliverablePreviews.value[`${currentStage.value}:${deliverableSelected.value}`] ||
  activeDeliverableContent.value
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

// --- Markdown rendering (with delivery card support) ---
const ALL_EXTS = 'png|jpg|jpeg|gif|svg|webp|bmp|ico|pdf|html|htm|xlsx|xls|csv|doc|docx|ppt|pptx|zip|rar|7z|gz|tar|mp3|mp4|wav|mov|avi|txt|md|json|js|ts|css|py|java|go|rs|sh|vue';
const IMG_EXTS_SET = new Set(['png','jpg','jpeg','gif','svg','webp','bmp','ico']);

function escAttr(s) { return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

function deliveryCardHtml(fp) {
  const safePath = fp.replace(/\\/g, '/');
  const name = safePath.split('/').pop();
  const ext = (name.includes('.') ? name.split('.').pop() : '').toLowerCase();
  const isImg = IMG_EXTS_SET.has(ext);
  const iconMap = {
    pdf: ['fa-file-pdf', '#e11d48', '#fff1f2'],
    doc: ['fa-file-word', '#2563eb', '#eff6ff'], docx: ['fa-file-word', '#2563eb', '#eff6ff'],
    xls: ['fa-file-excel', '#059669', '#ecfdf5'], xlsx: ['fa-file-excel', '#059669', '#ecfdf5'], csv: ['fa-file-excel', '#059669', '#ecfdf5'],
    ppt: ['fa-file-powerpoint', '#ea580c', '#fff7ed'], pptx: ['fa-file-powerpoint', '#ea580c', '#fff7ed'],
    zip: ['fa-file-zipper', '#d97706', '#fffbeb'], rar: ['fa-file-zipper', '#d97706', '#fffbeb'], '7z': ['fa-file-zipper', '#d97706', '#fffbeb'],
    png: ['fa-image', '#7c3aed', '#f5f3ff'], jpg: ['fa-image', '#7c3aed', '#f5f3ff'], jpeg: ['fa-image', '#7c3aed', '#f5f3ff'],
    gif: ['fa-image', '#7c3aed', '#f5f3ff'], svg: ['fa-image', '#7c3aed', '#f5f3ff'], webp: ['fa-image', '#7c3aed', '#f5f3ff'],
    html: ['fa-file-code', '#4f46e5', '#eef2ff'], htm: ['fa-file-code', '#4f46e5', '#eef2ff'],
    md: ['fa-file-lines', '#2563eb', '#eff6ff'], txt: ['fa-file-lines', '#2563eb', '#eff6ff'],
  };
  const [icon, color, bg] = iconMap[ext] || ['fa-file', '#94a3b8', '#f8fafc'];
  const typeLabels = { pdf:'PDF', doc:'Word', docx:'Word', xls:'Excel', xlsx:'Excel', csv:'CSV', ppt:'PPT', pptx:'PPT', png:'PNG', jpg:'JPEG', jpeg:'JPEG', gif:'GIF', svg:'SVG', webp:'WebP', html:'HTML', md:'Markdown', txt:'文本' };
  const typeLabel = typeLabels[ext] || ext.toUpperCase() || '文件';
  const thumbHtml = isImg ? `<img src="file:///${escAttr(safePath.replace(/^\//, ''))}" class="chat-delivery-thumb" onerror="this.style.display='none'" />` : '';

  return `<div class="chat-delivery-card" data-filepath="${escAttr(safePath)}" data-name="${escAttr(name)}" data-ext=".${escAttr(ext)}">`
    + `<div class="chat-delivery-icon" style="background:${bg}"><i class="fa-solid ${icon}" style="color:${color}"></i></div>`
    + `<div class="chat-delivery-main"><div class="chat-delivery-name">${escAttr(name)}</div><div class="chat-delivery-meta">${escAttr(typeLabel)}</div></div>`
    + thumbHtml
    + `<button class="chat-delivery-action chat-file-download" data-filepath="${escAttr(safePath)}" title="另存为…"><i class="fa-solid fa-download"></i></button>`
    + `<button class="chat-delivery-action chat-file-open" data-filepath="${escAttr(safePath)}" title="用系统程序打开"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>`
    + `</div>`;
}

const _pdPlaceholders = [];
const processImagePaths = (content) => {
  const card = (fp) => deliveryCardHtml(fp);
  const imgTag = (fp) => {
    const safePath = fp.replace(/\\/g, '/').replace(/^\//, '');
    return `<img src="file:///${safePath}" class="max-w-[480px] rounded-lg border border-slate-200 my-2 cursor-zoom-in chat-inline-img" onerror="this.style.display='none'" />`;
  };
  const IMG_EXTS = 'png|jpg|jpeg|gif|svg|webp|bmp|ico';
  // 只有正经交付物(文档/表格/演示/网页/压缩包/音视频/md)转卡片;
  // 代码与参数文件(js/ts/py/json/css/sh/vue…)保持行内代码,不转卡片。
  const CARD_EXTS = new Set([
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx',
    'html', 'htm', 'md', 'txt',
    'zip', 'rar', '7z', 'gz', 'tar',
    'mp3', 'wav', 'mp4', 'mov', 'avi',
  ]);
  const render = (fp) => {
    const ext = (fp.split('.').pop() || '').toLowerCase();
    if (IMG_EXTS_SET.has(ext)) {
      if (!fp.startsWith('/')) return card(fp);
      return imgTag(fp);
    }
    if (!CARD_EXTS.has(ext)) return null; // 代码/参数文件不转卡片
    return card(fp);
  };

  _pdPlaceholders.length = 0;
  // 返回 null 表示不转卡片,调用方保留原始文本交给 marked。
  const ph = (fp) => {
    const html = render(fp);
    if (html == null) return null;
    const id = `XDLVR${_pdPlaceholders.length}X`;
    _pdPlaceholders.push(html);
    return id;
  };

  let processed = content.replace(
    new RegExp('`\\s*((?:[\\w.\\-\\u4e00-\\u9fff]+\\/)*[\\w.\\-\\u4e00-\\u9fff]+\\.(' + ALL_EXTS + '))\\s*`', 'gi'),
    (m, fp) => ph(fp) ?? m
  );
  processed = processed.replace(
    new RegExp(`MEDIA:([^\\s\\n]+\\.(${ALL_EXTS}))`, 'gi'),
    (m, fp) => ph(fp) ?? m
  );
  processed = processed.replace(
    new RegExp(`(?:^|\\n)[ \\t]*(?:\`)?(\\/[^\\s\`]+\\.(${ALL_EXTS}))(?:\`)?[ \\t]*(?:\\n|$)`, 'gim'),
    (m, fp) => { const id = ph(fp); return id == null ? m : '\n' + id + '\n'; }
  );
  processed = processed.replace(
    new RegExp(`(?<![\\w/:.])(\\/[^\\s\`<>|]+\\.(${ALL_EXTS}))(?![\\w/])`, 'gi'),
    (m, fp) => ph(fp) ?? m
  );
  processed = processed.replace(
    new RegExp(`(?<![\\w/:.\\u4e00-\\u9fff])((?:[\\w.\\-\\u4e00-\\u9fff]+\\/)+[\\w.\\-\\u4e00-\\u9fff]+\\.(${ALL_EXTS}))(?![\\w/])`, 'gi'),
    (m, fp) => ph(fp) ?? m
  );
  processed = processed.replace(
    new RegExp(`!\\[[^\\]]*\\]\\((\\/[^)]+\\.(${IMG_EXTS}))\\)`, 'gi'),
    (m, fp) => ph(fp) ?? m
  );
  processed = processed.replace(
    new RegExp(`(?:已生成[：:.]\\s*|生成了\\s*)([^\\s，。、\\n]+\\.(${ALL_EXTS}))`, 'gi'),
    (m, fn) => { const id = ph(fn); return id == null ? m : m.replace(fn, id); }
  );
  return processed;
};

// noFileCards：工作台对话区用——右侧已有文档预览，正文里再出文件卡片是重复信息。
// 此时文件名退化成普通行内代码，不再渲染可下载/打开的卡片。
const renderMarkdown = (text, opts = {}) => {
  if (!text) return '';
  if (opts.noFileCards) return marked(text, { breaks: true, gfm: true });
  let html = marked(processImagePaths(text), { breaks: true, gfm: true });
  for (let i = 0; i < _pdPlaceholders.length; i++) {
    html = html.replace(`XDLVR${i}X`, _pdPlaceholders[i]);
  }
  return html;
};

const renderedSpec = computed(() => {
  if (!specContent.value) return '';
  return marked(specContent.value, { breaks: true, gfm: true });
});

// --- Render assistant content with typewriter cursor ---
const renderAssistantContent = (msg, index, opts = {}) => {
  const targetMessages = activeMessagesArr();
  const isLast = index === targetMessages.length - 1;

  // If still streaming and this is the last message, show typing content with cursor
  if (isLast && isStreaming.value && msg.role === 'assistant') {
    const content = msg.typingContent || msg.content || '';
    if (content) {
      return renderMarkdown(content, opts) + "<span class='inline-block w-2 h-4 bg-blue-500 ml-1 rounded-sm animate-pulse align-middle'></span>";
    }
    // Still waiting for first content
    return "<span class='inline-block w-2 h-4 bg-blue-500 ml-1 rounded-sm animate-pulse align-middle'></span>";
  }

  return renderMarkdown(msg.content, opts);
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
        // 按交付物分拣：tab 形如 'deliverable:<key>'，各自恢复到独立会话
        const dlvBuckets = {};
        for (const m of data.messages) {
          const tab = m.tab || '';
          if (!tab.startsWith('deliverable:')) continue;
          const key = tab.slice('deliverable:'.length);
          for (const sid of [2, 3]) {
            if (!deliverablesForStage(sid).some((d) => d.key === key)) continue;
            const k = `${sid}:${key}`;
            (dlvBuckets[k] ||= []).push(m);
          }
        }
        const restored = {};
        for (const [k, msgs] of Object.entries(dlvBuckets)) {
          restored[k] = msgs.map((m) => createMessage(m.role || 'assistant', m.content || ''));
        }
        deliverableMsgs.value = restored;

        const reqMsgs = data.messages.filter(m => m.tab !== 'iterate' && m.tab !== 'chat3' && !String(m.tab || '').startsWith('deliverable:'));
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
    // prompt 还没返回说明引擎仍在跑（长工具调用时可能 2 分钟没 chunk），不能提前收尾
    if (isStreaming.value && !isToolRunning.value && !getInflightPrompt(props.slug)) {
      endStream();
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

// 从 ACP tool_call 事件里抓「写文件」的实时内容，推到右侧预览面板。
// 引擎在 auto-approve 模式下会把完整新内容放进 content[] 的 diff 块（{type:'diff', path, newText}），
// 所以文档在 agent 写完那一刻就能渲染，不用等落盘再读回。
function captureLiveEdit(update) {
  if (!update) return;
  const blocks = Array.isArray(update.content) ? update.content
    : (update.content ? [update.content] : []);
  const diff = blocks.find((c) => c && (c.type === 'diff' || c.newText != null || c.new_text != null));
  if (!diff) return;

  const rawPath = diff.path || diff.file_path || '';
  const newText = diff.newText ?? diff.new_text ?? '';
  if (!rawPath || typeof newText !== 'string') return;

  // 只关心当前阶段的交付物 md（其他文件如原型 html 不进文档面板）
  const norm = String(rawPath).replace(/\\/g, '/');
  const stageId = currentStage.value;
  const d = deliverablesForStage(stageId).find((x) => norm.endsWith(x.file));
  if (!d) return;

  const k = dkey(stageId, d.key);
  deliverableContents.value = { ...deliverableContents.value, [k]: newText };
  // 实时预览优先展示正在写的这份，切换选中项让左右对应
  deliverableSelected.value = d.key;
  livePreviewTitle.value = d.name;
  livePreviewFile.value = d.file;
  livePreviewContent.value = newText;
  livePreviewMode.value = 'md';        // 生成过程中固定看 md 实时流
  livePreviewDocxHtml.value = '';      // 新内容让旧 docx 快照失效
  livePreviewStreaming.value = true;
}

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

    // 实时预览：引擎写文件时带 diff 内容块（{type:'diff', path, newText}），
    // 直接把 newText 推到右侧面板，不必等落盘后再读回。
    captureLiveEdit(update);

    assistantMsg.thinkingSteps.push({
      text: formatToolCallText(title, args),
      icon: 'fa-solid fa-wrench',
      visible: true,
    });
    addLog('tool', formatToolCallText(title, args), 'running');
    scrollToBottom();
  } else if (type === 'tool_call_progress') {
    captureLiveEdit(update);
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
    if (thoughtBuffer) flushThoughtBuffer();
    endStream();
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
      deliverableBusyKey.value = '';
      livePreviewStreaming.value = false;
      finishLivePreview(currentStage.value);
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
    if (thoughtBuffer) flushThoughtBuffer();
    const targetMessages = activeMessagesArr();   // 先取本轮目标，endStream 会清锁
    endStream();
    addLog('error', update.message || '请求失败');
    targetMessages.push(createMessage('assistant', `**Error:** ${update.message || '请求失败'}`));
  }
};

// --- Chat functions ---
const sendMessage = async () => {
  const text = chatInput.value.trim();
  const atts = reqComposer.attachments.value;
  if ((!text && atts.length === 0) || isStreaming.value) return;
  if (!(await reqComposer.checkModelForAttachments())) return;

  messages.value.push(createMessage('user', text, atts.length ? { attachments: [...atts] } : {}));
  chatInput.value = '';
  const sending = [...atts];
  reqComposer.clearAttachments();
  beginStream(messages.value, 'requirement');

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
    const p = window.api.hermes.prompt(props.slug, text, sending);
    trackPrompt(props.slug, { tab: 'requirement' }, p);
    await p;
    endStream();   // prompt 返回 = 引擎这一轮真的结束了
    loadSpec();
  } catch (e) {
    console.error('Prompt failed:', e);
    endStream();
  }
};

const sendIterate = async () => {
  const text = iterateInput.value.trim();
  const atts = iterateComposer.attachments.value;
  if ((!text && atts.length === 0) || isStreaming.value) return;
  if (!(await iterateComposer.checkModelForAttachments())) return;

  streamTargetTab.value = 'iterate';   // 原型页迭代：内容归到 iterate 流，不污染需求对话
  iterateMessages.value.push(createMessage('user', text, atts.length ? { attachments: [...atts] } : {}));
  iterateInput.value = '';
  const sending = [...atts];
  iterateComposer.clearAttachments();
  beginStream(iterateMessages.value, 'iterate');

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
    const p = window.api.hermes.prompt(props.slug, `/prototype-iterate ${text}`, sending);
    trackPrompt(props.slug, { tab: 'iterate' }, p);
    await p;
    endStream();
    iframeKey.value++;
    refreshPrototypeFiles();
    streamTargetTab.value = '';
  } catch (e) {
    console.error('Iterate prompt failed:', e);
    endStream();
    streamTargetTab.value = '';
  }
};

// ============ 阶段③：需求确认 + 智能体设计 ============

// 阶段③对话发送（复用项目级 prompt 通道，注入阶段语境）
const sendStage3 = async () => {
  const text = stage3Input.value.trim();
  const atts = stage3Composer.attachments.value;
  if ((!text && atts.length === 0) || isStreaming.value) return;
  if (!(await stage3Composer.checkModelForAttachments())) return;

  stage3Messages.value.push(createMessage('user', text, atts.length ? { attachments: [...atts] } : {}));
  stage3Input.value = '';
  const sending = [...atts];
  stage3Composer.clearAttachments();
  beginStream(stage3Messages.value, 'chat3');

  window.api.hermes.saveMessage(props.slug, { role: 'user', content: text, tab: 'chat3', timestamp: new Date().toISOString() });

  stage3Messages.value.push(createMessage('assistant', '', {
    thinkingSteps: [{ text: '已发送请求，等待 AI 响应...', icon: 'fa-solid fa-cloud-arrow-up', visible: true }],
    thinkingDone: false, expanded: true, typingContent: '', timestamp: '', streamId: currentStreamId,
  }));
  scrollToBottom();

  const framed = `【阶段③ 需求确认+智能体设计】你是 FDE 交付工程师。当前任务：把阶段②收敛后的需求签字定死，并把业务链路拆成智能体矩阵（一个环节一个智能体、上游输出=下游输入、过 Eval 门禁）。请围绕以下用户输入继续推进，必要时追问澄清：\n\n${text}`;
  try {
    const p = window.api.hermes.prompt(props.slug, framed, sending);
    trackPrompt(props.slug, { tab: 'chat3' }, p);
    await p;
    endStream();
  } catch (e) {
    console.error('Stage3 prompt failed:', e);
    endStream();
  }
};

// —— 工作台右侧文档预览状态 ——
// 实时预览：agent 通过 tool_call(kind=edit) 写文件时，直接取 new_text 更新此处
const livePreviewContent = ref('');      // 当前右侧面板展示的 markdown 原文（实时 or 静态）
const livePreviewDocxHtml = ref('');     // docx → HTML 快照（生成完成后填充）
const livePreviewMode = ref('md');       // 'md' | 'docx'
const livePreviewTitle = ref('');        // 面板顶部标题（交付物名）
const livePreviewFile = ref('');         // 正在预览的项目内相对路径（用于 docx 转存判断）
const livePreviewStreaming = ref(false); // 正在实时接收写入（面板顶部显示「生成中」）
const rightPanelWidth = ref(480);        // 兼容旧引用
const rightPanelUserWidth = ref(0);     // 0 = 未拖拽，走 flex 2:4:4；>0 = 用户拖过，固定像素
const rightPanelCollapsed = ref(false);
const leftPanelCollapsed = ref(false);   // 隐藏左侧交付物导航
const rightPanelDragging = ref(false);
let _dragStartX = 0, _dragStartW = 0;

// 显示指定交付物的预览：切换 livePreviewContent + 标题。
// 内存里没有时回落到读盘——否则已生成的交付物在内存未填充前会被误判成「未生成」。
async function showPreview(stageId, d) {
  const k = dkey(stageId, d.key);
  livePreviewTitle.value = d.name;
  livePreviewFile.value = d.file;
  livePreviewDocxHtml.value = '';
  livePreviewMode.value = 'md';

  let content = deliverableContents.value[k] || '';
  if (!content) {
    await loadDeliverable(stageId, d);          // 读盘并写回 deliverableContents
    content = deliverableContents.value[k] || '';
  }
  livePreviewContent.value = content;
  if (content) loadDocxPreview(stageId, d);
}

async function loadDocxPreview(stageId, d) {
  try {
    const docxRel = d.file.replace(/\.md$/i, '') + '.docx';
    const r = await window.api.hermes.docxPreview(props.slug, docxRel);
    if (r && r.success && r.html) livePreviewDocxHtml.value = r.html;
  } catch (_) { /* 无 docx 时静默 */ }
}

// 拖拽调整右侧预览宽度。
// 未拖过时右栏走 flex 比例（2:4:4 随窗口自适应）；一旦用户拖过就固定为像素宽度。
function startRightDrag(e) {
  rightPanelDragging.value = true;
  _dragStartX = e.clientX;
  // 首次拖拽：以当前实际渲染宽度为起点，避免从默认值跳一下
  const panelEl = e.currentTarget?.nextElementSibling;
  _dragStartW = rightPanelUserWidth.value || panelEl?.getBoundingClientRect().width || rightPanelWidth.value;
  const onMove = (ev) => {
    const delta = _dragStartX - ev.clientX;
    rightPanelUserWidth.value = Math.min(900, Math.max(320, _dragStartW + delta));
  };
  const onUp = () => {
    rightPanelDragging.value = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

// 生成结束后自动把 md 转存为 docx
async function autoSaveDocx(stageId, key) {
  const d = deliverablesForStage(stageId).find((x) => x.key === key);
  if (!d) return;
  try {
    const r = await window.api.hermes.mdToDocx(props.slug, d.file);
    if (r && r.success) {
      // 刷新 docx 预览
      const rv = await window.api.hermes.docxPreview(props.slug, r.relativePath);
      if (rv && rv.success && rv.html) {
        livePreviewDocxHtml.value = rv.html;
      }
    }
  } catch (_) { /* 转存失败不中断流程 */ }
}

// —— 工作台：每件交付物的独立消息状态 ——
// 每件交付物的独立消息数组：键为 `${stageId}:${key}`
const deliverableMsgs = ref({});

// 当前选中交付物的消息数组（响应式引用，供模板绑定）
const activeDlvMsgs = computed(() => {
  const k = dkey(currentStage.value, deliverableSelected.value);
  if (!deliverableMsgs.value[k]) deliverableMsgs.value[k] = [];
  return deliverableMsgs.value[k];
});

// 发送当前交付物的对话消息
const dlvInput = ref('');
const dlvComposer = useChatComposer({
  onTranscribe: (t) => { dlvInput.value = (dlvInput.value ? dlvInput.value + ' ' : '') + t; },
  getSlug: () => props.slug,
});

async function dlvSend() {
  if (!dlvInput.value.trim() && dlvComposer.attachments.value.length === 0) return;
  if (isStreaming.value) return;

  const stageId = currentStage.value;
  const d = deliverablesForStage(stageId).find((x) => x.key === deliverableSelected.value);
  if (!d) return;

  const text = dlvInput.value.trim();
  const attachments = dlvComposer.attachments.value.length ? [...dlvComposer.attachments.value] : undefined;
  dlvInput.value = '';
  dlvComposer.clearAttachments?.();

  const k = dkey(stageId, deliverableSelected.value);
  if (!deliverableMsgs.value[k]) deliverableMsgs.value[k] = [];
  const arr = deliverableMsgs.value[k];

  const sending = { content: text, ...(attachments ? { attachments } : {}) };
  arr.push(createMessage('user', text, attachments ? { attachments } : {}));

  const tab = `deliverable:${d.key}`;
  beginStream(arr, tab);
  window.api.hermes.saveMessage(props.slug, {
    role: 'user', content: text, tab, timestamp: new Date().toISOString(),
  });

  arr.push(createMessage('assistant', '', {
    thinkingSteps: [{ text: `正在处理《${d.name}》相关问题...`, icon: 'fa-solid fa-cloud-arrow-up', visible: true }],
    thinkingDone: false, expanded: true, typingContent: '', timestamp: '', streamId: currentStreamId,
  }));
  scrollToBottom();

  const framed = `【交付物：${d.name}】${text}`;
  try {
    const p = window.api.hermes.prompt(props.slug, framed, sending);
    trackPrompt(props.slug, { tab }, p);
    await p;
    endStream();
  } catch (e) {
    console.error('dlvSend failed:', e);
    endStream();
  }
}

// 右侧预览滚动容器
const previewScrollRef = ref(null);

// docx 相对路径（面板顶栏展示）
const docxRelPath = computed(() =>
  livePreviewFile.value ? livePreviewFile.value.replace(/\.md$/i, '') + '.docx' : ''
);

// 预览用 markdown：图片已内联的版本优先，回退到实时原文
const livePreviewPreviewMd = computed(() => {
  const k = dkey(currentStage.value, deliverableSelected.value);
  return deliverablePreviews.value[k] || livePreviewContent.value;
});

// 选交付物 → 切选中项 + 刷新右侧预览
function selectDeliverable(key) {
  deliverableSelected.value = key;
  const d = deliverablesForStage(currentStage.value).find((x) => x.key === key);
  if (d) showPreview(currentStage.value, d);
  // 切换后确保该交付物的消息数组初始化
  const k = dkey(currentStage.value, key);
  if (!deliverableMsgs.value[k]) deliverableMsgs.value[k] = [];
}

// —— 右侧预览的在线编辑 ——
const previewEditing = ref(false);
const previewDraft = ref('');

function togglePreviewEdit() {
  if (previewEditing.value) { previewEditing.value = false; return; }
  previewDraft.value = livePreviewContent.value || '';
  previewEditing.value = true;
}

// 保存编辑：写回 md → 刷新预览 → 重新转存 docx（保持 md 与 Word 一致）
async function savePreviewEdit() {
  const stageId = currentStage.value;
  const key = deliverableSelected.value;
  const d = deliverablesForStage(stageId).find((x) => x.key === key);
  if (!d) return;
  try {
    await window.api.hermes.writeFile(props.slug, d.file, previewDraft.value);
    const k = dkey(stageId, key);
    deliverableContents.value = { ...deliverableContents.value, [k]: previewDraft.value };
    const preview = await inlineRelativeImages(previewDraft.value, d.file);
    deliverablePreviews.value = { ...deliverablePreviews.value, [k]: preview };
    livePreviewContent.value = previewDraft.value;
    previewEditing.value = false;
    await autoSaveDocx(stageId, key);   // md 改了，Word 跟着更新
    showToast('已保存，Word 同步更新', 'success');
  } catch (e) {
    showToast(`保存失败：${e.message || e}`, 'error');
  }
}

// 清空某件交付物的对话记录（磁盘 + 内存）。交付物文档本身不动。
async function clearDeliverableChat(key) {
  const stageId = currentStage.value;
  const d = deliverablesForStage(stageId).find((x) => x.key === key);
  if (!d) return;
  const k = dkey(stageId, key);
  const count = (deliverableMsgs.value[k] || []).filter((m) => m.role === 'user').length;
  if (!window.confirm(`清空《${d.name}》的 ${count} 轮对话记录？\n（已生成的文档不会被删除）`)) return;
  try {
    await window.api.hermes.deleteMessages(props.slug, `deliverable:${key}`);
    deliverableMsgs.value = { ...deliverableMsgs.value, [k]: [] };
    showToast(`已清空《${d.name}》的对话记录`, 'success');
  } catch (e) {
    showToast(`清空失败：${e.message || e}`, 'error');
  }
}

// 切到 Word 成品视图（只读 HTML 快照，无快照时按钮禁用）
function switchToDocxView() {
  if (livePreviewDocxHtml.value) livePreviewMode.value = 'docx';
}

// 用系统默认程序打开该交付物的 .docx
async function openDeliverableDocx() {
  if (!livePreviewFile.value) return;
  try {
    await window.api.hermes.openInBrowser(props.slug, docxRelPath.value);
  } catch (_) { /* 文件不存在时静默 */ }
}

// 一轮生成结束：读回全部交付物 → 刷新当前预览 → 自动转存 docx
async function finishLivePreview(stageId) {
  await loadDeliverablesForStage(stageId);
  const key = deliverableSelected.value;
  const d = deliverablesForStage(stageId).find((x) => x.key === key);
  if (d) {
    showPreview(stageId, d);
    await autoSaveDocx(stageId, key);
  }
  livePreviewStreaming.value = false;
}

// —— 工作台右侧预览辅助：渲染选中交付物 ——
const workspaceSplitRef = ref(null);
const chatPanelRef = ref(null);

const dkey = (stageId, key) => `${stageId}:${key}`;

// 把交付物 md 里的相对图片路径转成 data URI（Electron renderer 无法按项目目录解析相对路径）。
// 相对路径以该 md 文件所在目录为基准解析；data:/http(s): 等绝对地址原样保留。
// 只用于「预览」渲染，不写回磁盘，保持 md 里干净的相对路径。
const inlineRelativeImages = async (md, mdRelPath) => {
  if (!md || !/!\[[^\]]*\]\(/.test(md)) return md;
  const baseDir = mdRelPath.includes('/') ? mdRelPath.slice(0, mdRelPath.lastIndexOf('/')) : '';
  const imgRe = /(!\[[^\]]*\]\()([^)\s]+)(\s+"[^"]*")?(\))/g;
  const tasks = [];
  md.replace(imgRe, (m, _pre, src) => {
    if (!/^(data:|https?:|file:|\/\/)/i.test(src) && !tasks.some((t) => t.src === src)) {
      const rel = (baseDir ? baseDir + '/' : '') + src;
      tasks.push({ src, promise: window.api.hermes.readFileDataUri(props.slug, rel) });
    }
    return m;
  });
  if (!tasks.length) return md;
  const uriBySrc = {};
  await Promise.all(
    tasks.map(async (t) => {
      try {
        const r = await t.promise;
        if (r && r.success && r.dataUri) uriBySrc[t.src] = r.dataUri;
      } catch (_) { /* 图片缺失：保留原路径 */ }
    })
  );
  return md.replace(imgRe, (m, pre, src, title, post) =>
    uriBySrc[src] ? `${pre}${uriBySrc[src]}${title || ''}${post}` : m
  );
};

// 读取某份交付物文件到 deliverableContents（原文，供编辑/导出/保存），
// 同时生成一份图片内联版本供预览渲染。
const loadDeliverable = async (stageId, d) => {
  try {
    const result = await window.api.hermes.readFile(props.slug, d.file);
    if (result && result.success && result.content) {
      const k = dkey(stageId, d.key);
      deliverableContents.value = { ...deliverableContents.value, [k]: result.content };
      const preview = await inlineRelativeImages(result.content, d.file);
      deliverablePreviews.value = { ...deliverablePreviews.value, [k]: preview };
    }
  } catch (e) { /* 未生成，忽略 */ }
};

const loadDeliverablesForStage = async (stageId) => {
  for (const d of deliverablesForStage(stageId)) {
    await loadDeliverable(stageId, d);
  }
  // 读回内容后同步刷新右侧预览：否则首次进入/切阶段时右侧停在骨架屏
  // （之前只有手工点击交付物才会走 showPreview）
  if (stageId === currentStage.value) {
    const d = deliverablesForStage(stageId).find((x) => x.key === deliverableSelected.value);
    if (d) await showPreview(stageId, d);
  }
};

const loadAllDeliverableMsgs = async (stageId) => {
  // messages.jsonl 里按 tab 字段过滤出每件交付物的消息
  // 已由 loadProject 加载到 allMessages，这里按 tab key 分拣
  // （若未来需要懒加载可再改；目前项目消息量小，全量分拣可行）
};

// 生成某份交付物：读模板(md/html)或走 skill → 拼 prompt → AI 真跑 write_file → 读回
const generateDeliverable = async (key) => {
  if (isStreaming.value || deliverableBusy.value) return;
  const stageId = currentStage.value;
  const d = deliverablesForStage(stageId).find((x) => x.key === key);
  if (!d) return;

  deliverableSelected.value = key;
  deliverableBusy.value = true;
  deliverableBusyKey.value = key;

  // 生成留痕：写进「该交付物」的独立对话线（早先误写进全局 messages/stage3Messages，
  // 导致不同交付物、以及和「AI 智能对话」页的记录互相串台）
  const mk = dkey(stageId, key);
  if (!deliverableMsgs.value[mk]) deliverableMsgs.value[mk] = [];
  const chatArr = deliverableMsgs.value[mk];
  const tab = `deliverable:${key}`;
  beginStream(chatArr, tab);
  const userMsg = `请生成《${d.name}》`;
  chatArr.push(createMessage('user', userMsg));
  window.api.hermes.saveMessage(props.slug, { role: 'user', content: userMsg, tab, timestamp: new Date().toISOString() });
  chatArr.push(createMessage('assistant', '', {
    thinkingSteps: [{ text: `正在生成《${d.name}》...`, icon: 'fa-solid fa-wand-magic-sparkles', visible: true }],
    thinkingDone: false, expanded: true, typingContent: '', timestamp: '', streamId: currentStreamId,
  }));

  const reqName = projectMeta.value?.name || props.slug;
  // md 文件所在目录（根目录交付物为空串），供画图指令定位 assets/
  const mdDir = d.file.includes('/') ? d.file.slice(0, d.file.lastIndexOf('/') + 1) : '';
  const diagramPart = DIAGRAM_KEYS.includes(d.key) ? diagramInstruction(mdDir) : '';
  let prompt = '';

  if (d.skill) {
    // 走现成 skill（如 product-feature-spec），不塞模板
    prompt = `/${d.skill} 根据本项目"${reqName}"之前的需求对话上下文，生成《${d.name}》。\n\n`
      + `【重要】把生成的完整内容用 write_file 工具写入当前项目目录下的 \`${d.file}\` 文件（Markdown 格式）。`
      + diagramPart;
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
      + `【重要】把生成的完整内容用 write_file 工具写入当前项目目录下的 \`${d.file}\` 文件（Markdown 格式，若目录不存在请一并创建）。`
      + diagramPart;
  }

  try {
    const p = window.api.hermes.prompt(props.slug, prompt);
    trackPrompt(props.slug, { tab: `deliverable:${key}` }, p);
    await p;
    // 兜底：agent_message_end 已在事件处理里调 endStream，这里再调一次也是幂等的
    endStream();
    deliverableBusy.value = false;
    deliverableBusyKey.value = '';
    await finishLivePreview(stageId);
  } catch (e) {
    console.error('Generate deliverable failed:', e);
    endStream();
    deliverableBusy.value = false;
    deliverableBusyKey.value = '';
    livePreviewStreaming.value = false;
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
    // 工作台内就地生成：切右侧预览到这件交付物，不再跳 tab
    activeTab.value = 'workspace';
    selectDeliverable(act.key);
    generateDeliverable(act.key);
  }
};

const saveDeliverable = async (key) => {
  const stageId = currentStage.value;
  const d = deliverablesForStage(stageId).find((x) => x.key === key);
  if (!d) return;
  try {
    const raw = deliverableContents.value[dkey(stageId, key)] || '';
    await window.api.hermes.writeFile(props.slug, d.file, raw);
    // 刷新预览：编辑后可能新增/改动图片引用，重新内联相对图片
    const preview = await inlineRelativeImages(raw, d.file);
    deliverablePreviews.value = { ...deliverablePreviews.value, [dkey(stageId, key)]: preview };
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

// 中文输入法选词时的回车 isComposing 为 true，不能当发送——否则选个词就把半句发出去。
const onIterateEnter = (e) => {
  if (e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  sendIterate();
};

const cancelStream = async () => {
  try {
    await window.api.hermes.cancel(props.slug);
  } catch (e) {
    console.error('Cancel failed:', e);
  }
  endStream();
  deliverableBusy.value = false;
  deliverableBusyKey.value = '';
  livePreviewStreaming.value = false;
  streamTargetTab.value = '';
};

const scrollToBottom = () => {
  nextTick(() => {
    if ((activeTab.value === 'iterate' || (activeTab.value === 'prototype' && streamTargetTab.value === 'iterate')) && iterateChatRef.value) {
      iterateChatRef.value.scrollTop = iterateChatRef.value.scrollHeight;
    } else if (chatContainerRef.value) {
      // 工作台左栏（阶段②③共用同一个容器）
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
  activeTab.value = 'workspace';
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
    await window.api.hermes.prompt(props.slug, `/product-feature-spec 根据之前的对话讨论，为"${requirement}"生成完整的产品功能清单。\n\n【重要】请将生成的功能清单用 write_file 工具写入当前目录的 spec.md 文件中。` + diagramInstruction(''));
    finalizeLastAssistantMessage();
    isStreaming.value = false;
    loadSpec();
    selectDeliverable('feature-spec');
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
    const result = await window.api.hermes.listFiles(props.slug, 'prototype', true);
    const files = (result && result.success) ? (result.files || []) : (Array.isArray(result) ? result : []);
    // 展示全部产物（html / js / json / data 等）。排序与目录分组交给 fileTreeRows。
    const kept = files
      .filter(f => !f.isDirectory)
      .map(f => ({ ...f, rel: f.relPath || f.name }));
    prototypeFiles.value = kept;
    // 默认折叠所有文件夹：收集每个文件路径里出现的目录前缀
    const dirs = new Set();
    for (const f of kept) {
      const parts = f.rel.split('/');
      for (let i = 0; i < parts.length - 1; i++) {
        dirs.add(parts.slice(0, i + 1).join('/'));
      }
    }
    collapsedDirs.value = dirs;
    if (kept.length > 0 && !selectedFile.value) {
      // 默认选顶层第一个 html，没有则选第一个文件
      const firstHtml = kept.find(f => /\.html?$/i.test(f.rel) && !f.rel.includes('/'))
        || kept.find(f => /\.html?$/i.test(f.rel));
      selectPrototypeFile((firstHtml || kept[0]).rel);
    }
  } catch (e) {
    prototypeFiles.value = [];
  }
};

const selectPrototypeFile = async (fileName) => {
  selectedFile.value = fileName;
  fileSource.value = '';
  const isHtml = /\.html?$/i.test(fileName);
  isHtmlSelected.value = isHtml;
  try {
    if (isHtml) {
      // HTML 走本地静态服务在 iframe 内渲染（data/*.json 等可正常加载）
      const result = await window.api.hermes.prototypeUrl(props.slug, fileName);
      if (result && result.success) {
        iframeSrc.value = result.url;
      } else {
        const content = await window.api.hermes.readFile(props.slug, `prototype/${fileName}`);
        const blob = new Blob([content], { type: 'text/html' });
        iframeSrc.value = URL.createObjectURL(blob);
      }
      iframeKey.value++;
    } else {
      // 非 HTML（js / json / css / 数据文件）直接展示源码
      const content = await window.api.hermes.readFile(props.slug, `prototype/${fileName}`);
      fileSource.value = typeof content === 'string' ? content : String(content ?? '');
    }
  } catch (e) {
    console.error('Failed to load prototype file:', e);
  }
};

const openInBrowser = async () => {
  // 走本地静态服务而非 file://，否则原型页 fetch('data/*.json') 会被浏览器拦截、数据空白
  try {
    const file = selectedFile.value || (prototypeFiles.value[0]?.name);
    if (!file) return;
    const result = await window.api.hermes.prototypeUrl(props.slug, file);
    if (result && result.success) {
      await window.api.shell.openExternal(result.url);
    } else {
      // 本地服务不可用时退回 file://
      await window.api.hermes.openInBrowser(props.slug, `prototype/${file}`);
    }
  } catch (e) {
    console.error('Open in browser failed:', e);
  }
};

// 发布本地服务：把本地 http 服务指向本项目原型目录，并用默认浏览器打开
const publishLocal = async () => {
  try {
    const file = selectedFile.value || (prototypeFiles.value[0]?.name) || 'index.html';
    const result = await window.api.hermes.prototypeUrl(props.slug, file);
    if (result && result.success) {
      await window.api.shell.openExternal(result.url);
      showToast(`已发布并在浏览器打开：${result.url}`, 'success');
    } else {
      showToast(`发布失败：${(result && result.error) || '未知错误'}`, 'error');
      console.error('Publish local failed:', result && result.error);
    }
  } catch (e) {
    showToast(`发布失败：${e.message || e}`, 'error');
    console.error('Publish local failed:', e);
  }
};

const generatePrototype = async () => {
  if (isStreaming.value) return;
  activeTab.value = 'prototype';
  streamTargetTab.value = 'iterate';           // 生成过程的流归到 iterate 消息数组，供原型页进度面板展示
  iterateMessages.value.push(createMessage('user', '基于 stage2/prd.md 生成 HTML 原型'));
  beginStream(iterateMessages.value, 'iterate');
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
    const p = window.api.hermes.prompt(props.slug, '/prototype-generator 基于当前项目目录下的 stage2/prd.md 生成 HTML 原型，输出到 prototype/ 目录');
    trackPrompt(props.slug, { tab: 'iterate' }, p);
    await p;
  } catch (e) {
    console.error('Generate prototype failed:', e);
  }
  endStream();
  iframeKey.value++;
  refreshPrototypeFiles();
  streamTargetTab.value = '';
};

const regeneratePrototype = async () => {
  if (isStreaming.value) return;
  activeTab.value = 'prototype';
  streamTargetTab.value = 'iterate';
  iterateMessages.value.push(createMessage('user', '基于 stage2/prd.md 重新生成 HTML 原型'));
  beginStream(iterateMessages.value, 'iterate');
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
    const p = window.api.hermes.prompt(props.slug, '/prototype-generator 基于当前项目目录下的 stage2/prd.md 重新生成 HTML 原型，输出到 prototype/ 目录');
    trackPrompt(props.slug, { tab: 'iterate' }, p);
    await p;
  } catch (e) {
    console.error('Regenerate prototype failed:', e);
  }
  endStream();
  iframeKey.value++;
  refreshPrototypeFiles();
  streamTargetTab.value = '';
};

// --- Export functions ---
const exportZip = async () => {
  try {
    const result = await window.api.hermes.exportZip(props.slug);
    if (result && result.success) {
      showToast(`已导出：${result.path}`, 'success');
    } else if (result && result.canceled) {
      // 用户取消，不提示
    } else {
      showToast(`导出失败：${(result && result.error) || '未知错误'}`, 'error');
    }
  } catch (e) {
    showToast(`导出失败：${e.message || e}`, 'error');
    console.error('Export zip failed:', e);
  }
};

// --- Lifecycle ---
onMounted(async () => {
  tickClock();
  clockTimer = setInterval(tickClock, 1000);
  loadFavDocs();
  loadModels();
  await loadProject();

  // 依据恢复后的当前阶段，把 activeTab 设为该阶段第一个 tab
  const stageTabs = tabsForStage(currentStage.value);
  if (!stageTabs.some(t => t.key === activeTab.value)) {
    activeTab.value = stageTabs[0]?.key || 'workspace';
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
  // 加载每件交付物的独立对话记录
  loadAllDeliverableMsgs(currentStage.value);

  const inflight = getInflightPrompt(props.slug);
  if (inflight) resumeInflight(inflight);

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
  if (clockTimer) clearInterval(clockTimer);
  if (streamEndTimer) clearTimeout(streamEndTimer);
  if (typewriterTimer) clearTimeout(typewriterTimer);
  if (thoughtFlushTimer) clearTimeout(thoughtFlushTimer);
});

// Watch tab changes to load relevant data
watch(activeTab, (newTab) => {
  if (newTab === 'workspace' || newTab === 'deliverables') {
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

/* ===== 截图版工作台样式（全部走 token / 品牌蓝）===== */

/* 顶部蓝色 Hero 带 */
.hero-band {
  background: linear-gradient(105deg,
    hsl(var(--primary)) 0%,
    color-mix(in srgb, hsl(var(--primary)) 78%, white) 62%,
    color-mix(in srgb, hsl(var(--primary)) 60%, white) 100%);
}
.pl-9\.5 { padding-left: 2.375rem; }
/* Hero 右侧装饰图标（半透明白，错落分布） */
.hero-deco {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.hero-deco .deco-ico {
  position: absolute;
  color: rgba(255, 255, 255, 0.14);
}
.hero-deco .deco-1 { right: 30%; top: 14%; font-size: 42px; transform: rotate(-8deg); }
.hero-deco .deco-2 { right: 17%; bottom: 8%; font-size: 54px; }
.hero-deco .deco-3 { right: 42%; bottom: 16%; font-size: 30px; color: rgba(255,255,255,0.10); }
.hero-deco .deco-4 { right: 6%; top: 22%; font-size: 38px; transform: rotate(10deg); }

/* 五阶段步骤条编号圈 */
.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background .15s, color .15s, box-shadow .15s;
}
.step-dot.is-active {
  background: hsl(var(--primary));
  color: #fff;
  box-shadow: 0 4px 10px hsl(var(--primary) / 30%);
}
.step-dot.is-done {
  background: color-mix(in srgb, hsl(var(--primary)) 16%, white);
  color: hsl(var(--primary));
}
.step-dot.is-todo {
  background: hsl(var(--border) / 55%);
  color: hsl(var(--muted-foreground));
}

/* AI 结果卡：白底 + 淡蓝描边，动作条按钮 */
.result-card {
  background: hsl(var(--background));
  box-shadow: 0 4px 16px hsl(var(--primary) / 6%);
}
.result-act {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  background: transparent;
  transition: background .15s, color .15s;
}
.result-act i { font-size: 11px; }
.result-act:hover:not(:disabled) {
  background: hsl(var(--primary) / 8%);
  color: hsl(var(--primary));
}
.result-act:disabled { opacity: .45; cursor: not-allowed; }
.result-act-icon { padding: 0; width: 28px; justify-content: center; }

/* Markdown Body — document reading feel */
:deep(.markdown-body) {
  word-wrap: break-word;
  font-size: 13.5px;
  line-height: 1.75;
  color: #1e293b;
}
:deep(.markdown-body p) {
  margin-bottom: 1.1em;
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
  margin-top: 1.75em;
  margin-bottom: 0.6em;
  font-weight: 700;
  line-height: 1.3;
  color: #0f172a;
}
:deep(.markdown-body h1) { font-size: 1.45em; letter-spacing: -0.01em; }
:deep(.markdown-body h2) {
  font-size: 1.2em;
  border-bottom: 1.5px solid #e2e8f0;
  padding-bottom: 0.35em;
  letter-spacing: -0.005em;
}
:deep(.markdown-body h3) { font-size: 1.05em; font-weight: 600; color: #334155; }
:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  margin-top: 0.25em;
  margin-bottom: 1.1em;
  padding-left: 1.75em;
}
:deep(.markdown-body ul) { list-style-type: disc; }
:deep(.markdown-body ol) { list-style-type: decimal; }
:deep(.markdown-body li) { margin-bottom: 0.35em; }
:deep(.markdown-body li + li) { margin-top: 0; }
:deep(.markdown-body code) {
  padding: 0.18em 0.42em;
  margin: 0;
  font-size: 83%;
  background-color: #f1f5f9;
  border-radius: 5px;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
  color: #0f172a;
  border: 1px solid #e2e8f0;
}
:deep(.markdown-body pre) {
  padding: 16px 18px;
  overflow: auto;
  font-size: 83%;
  line-height: 1.5;
  background-color: #f8fafc;
  border-radius: 10px;
  margin-bottom: 1.2em;
  border: 1px solid #e2e8f0;
}
:deep(.markdown-body pre code) {
  padding: 0;
  margin: 0;
  background-color: transparent;
  border: 0;
  color: #334155;
  font-size: inherit;
  line-height: inherit;
}
:deep(.markdown-body blockquote) {
  padding: 0.3em 1em;
  color: #64748b;
  border-left: 3px solid #cbd5e1;
  margin-bottom: 1.1em;
  background: #f8fafc;
  border-radius: 0 6px 6px 0;
}
:deep(.markdown-body table) {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow: auto;
  margin-bottom: 1.2em;
  border-spacing: 0;
  border-collapse: collapse;
  font-size: 12.5px;
}
:deep(.markdown-body table th),
:deep(.markdown-body table td) {
  padding: 7px 14px;
  border: 1px solid #e2e8f0;
}
:deep(.markdown-body table th) {
  background: #f8fafc;
  font-weight: 600;
  color: #334155;
}
:deep(.markdown-body table tr:nth-child(2n)) {
  background-color: #fafafa;
}
:deep(.markdown-body hr) {
  height: 1.5px;
  padding: 0;
  margin: 1.5em 0;
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
:deep(.chat-delivery-card) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 340px;
  padding: 6px 8px 6px 7px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e8e8e4;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  margin: 5px 4px 5px 0;
  vertical-align: middle;
}
:deep(.chat-delivery-card:hover) {
  border-color: #cbd5e1;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
:deep(.chat-delivery-icon) {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
}
:deep(.chat-delivery-main) {
  min-width: 0;
  max-width: 200px;
}
:deep(.chat-delivery-name) {
  font-size: 12.5px;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}
:deep(.chat-delivery-meta) {
  font-size: 10.5px;
  color: #9ca3af;
  margin-top: 1px;
}
:deep(.chat-delivery-thumb) {
  width: 34px;
  height: 34px;
  object-fit: cover;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}
:deep(.chat-delivery-action) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #b0b7c3;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
  font-size: 11px;
}
:deep(.chat-delivery-action:hover) {
  background: #f1f5f9;
  color: #334155;
}
</style>
