<template>
  <div class="flex h-full min-h-0 es-bg">
    <!-- ── 左侧:应用分类树 ────────────────────────── -->
    <aside class="es-tree shrink-0 flex flex-col bg-white/95 backdrop-blur border-r border-slate-200/70">
      <div class="px-3 pt-3.5 pb-2.5 border-b border-slate-100">
        <div class="flex items-center gap-2 mb-2.5">
          <span class="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <i class="fa-solid fa-store text-white text-[11px]"></i>
          </span>
          <span class="text-[12.5px] font-semibold text-slate-700">AI应用广场</span>
        </div>
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索应用、场景、能力…"
            class="w-full text-[12px] bg-slate-50 border border-transparent focus:bg-white focus:border-blue-400 rounded-md pl-7 pr-2.5 py-1.5 focus:outline-none transition"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <button
          v-for="cat in visibleCategories"
          :key="cat.id"
          class="tree-node"
          :class="active === cat.id ? 'tree-node--active' : ''"
          @click="active = cat.id"
        >
          <span class="tree-badge" :style="{ background: cat.color }">
            <i :class="'fa-solid fa-' + cat.icon + ' text-[10px]'"></i>
          </span>
          <span class="flex-1 text-left truncate">{{ cat.name }}</span>
          <span class="tree-count">{{ catCount(cat.id) }}</span>
        </button>
      </div>

      <div class="px-4 py-3 border-t border-slate-100 text-[11px] text-slate-400">
        <i class="fa-solid fa-circle-info mr-1"></i>共 <b class="text-slate-600">{{ visibleApps.length }}</b> 个 AI 应用
      </div>
    </aside>

    <!-- ── 右侧:应用卡片 ────────────────────────── -->
    <div class="flex-1 min-w-0 overflow-y-auto">
      <div class="px-6 py-6 lg:px-8">
        <div class="mb-4 flex items-center justify-between gap-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="text-[17px] font-bold text-slate-800 truncate">{{ activeName }}</h1>
              <span class="text-[12px] text-slate-400 shrink-0">共 {{ filtered.length }} 个</span>
            </div>
            <p class="text-[12px] text-slate-400 mt-0.5 truncate">
              发现、开发、发布和启动 AI 应用
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              @click="toggleDevMode"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium border transition"
              :class="devMode
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'"
            >
              <i class="fa-solid fa-code text-[10px]"></i>开发者模式
            </button>
            <button
              v-if="devMode"
              @click="openEditor(null)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm shadow-blue-500/25"
            >
              <i class="fa-solid fa-plus text-[10px]"></i>创建应用
            </button>
          </div>
        </div>

        <div class="grid gap-4 mb-5" :class="devMode ? 'grid-cols-4' : 'grid-cols-3'">
          <div v-for="s in statCards" :key="s.label" class="stat-card">
            <div class="stat-icon" :style="{ background: s.bg, boxShadow: `0 6px 16px ${s.bg}55` }">
              <i :class="'fa-solid ' + s.icon"></i>
            </div>
            <div>
              <div class="text-[22px] font-bold text-slate-800 leading-none tracking-tight">{{ s.value }}</div>
              <div class="text-[11px] text-slate-400 mt-1.5">{{ s.label }}</div>
            </div>
          </div>
        </div>

        <div v-if="filtered.length" class="es-grid">
          <div
            v-for="app in pagedItems"
            :key="app.id"
            class="es-card group"
          >
            <div class="es-card__accent" :style="{ background: app.color }"></div>
            <div class="flex items-start gap-3">
              <span class="es-icon" :style="{ background: app.color, boxShadow: `0 6px 16px ${app.color}55` }">
                <i :class="'fa-solid fa-' + (app.icon || 'rocket')"></i>
              </span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <h3 class="text-[13.5px] font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{{ app.name }}</h3>
                  <span class="src-badge shrink-0" :class="sourceBadge(app).cls">{{ sourceBadge(app).text }}</span>
                </div>
                <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{{ getCategoryName(app.category) }}</span>
                  <span
                    v-for="tag in (app.bestFor || []).slice(0, 2)"
                    :key="tag"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600"
                  >{{ tag }}</span>
                </div>
              </div>
            </div>
            <p class="text-[12px] text-slate-500 mt-3 leading-relaxed line-clamp-2">{{ app.summary }}</p>
            <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <button
                  @click="openDetail(app)"
                  class="text-[11px] text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <i class="fa-solid fa-circle-info mr-1"></i>查看详情
                </button>
                <button
                  v-if="devMode && app.source === 'local'"
                  @click.stop="openEditor(app)"
                  class="w-6 h-6 rounded-md text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition"
                  title="编辑应用"
                >
                  <i class="fa-solid fa-pen text-[10px]"></i>
                </button>
              </div>
              <button
                v-if="app.status === 'published'"
                @click.stop="launchApp(app)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
              >
                <i class="fa-solid fa-bolt text-[10px]"></i>启动应用
              </button>
              <button
                v-else
                @click.stop="openEditor(app)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm"
              >
                <i class="fa-solid fa-pen text-[10px]"></i>编辑
              </button>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-20 text-slate-300">
          <i class="fa-solid fa-inbox text-5xl mb-3"></i>
          <p class="text-[13px]">该分类下暂无应用</p>
        </div>

        <!-- 分页条 -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-1 mt-6">
          <button class="pgn" :disabled="currentPage <= 1" @click="currentPage--">
            <i class="fa-solid fa-chevron-left text-[10px]"></i>
          </button>
          <button
            v-for="p in totalPages" :key="p"
            class="pgn" :class="p === currentPage ? 'pgn--cur' : ''"
            @click="currentPage = p"
          >{{ p }}</button>
          <button class="pgn" :disabled="currentPage >= totalPages" @click="currentPage++">
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ── 应用详情抽屉 ────────────────────────── -->
    <transition name="drawer">
      <div v-if="selected" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-slate-900/40" @click="selected = null"></div>
        <aside class="absolute right-0 top-0 bottom-0 w-[640px] max-w-[92vw] bg-white shadow-2xl flex flex-col">
          <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200/80 shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0" :style="{ background: selected.color }">
                <i :class="'fa-solid fa-' + (selected.icon || 'rocket')"></i>
              </span>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <div class="text-[13px] font-semibold text-slate-800 truncate">{{ selected.name }}</div>
                  <span class="src-badge shrink-0" :class="sourceBadge(selected).cls">{{ sourceBadge(selected).text }}</span>
                </div>
                <div class="text-[11px] text-slate-400">{{ getCategoryName(selected.category) }}</div>
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <template v-if="devMode && selected.source === 'local'">
                <button
                  @click="openEditor(selected)"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 transition"
                >
                  <i class="fa-solid fa-pen text-[10px]"></i>编辑
                </button>
                <button
                  @click="togglePublish(selected)"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition"
                  :class="selected.status === 'published'
                    ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'"
                >
                  <i class="fa-solid text-[10px]" :class="selected.status === 'published' ? 'fa-arrow-down' : 'fa-rocket'"></i>
                  {{ selected.status === 'published' ? '下架' : '发布' }}
                </button>
                <button
                  @click="removeApp(selected)"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                >
                  <i class="fa-solid fa-trash text-[10px]"></i>删除
                </button>
              </template>
              <button @click="selected = null" class="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 transition">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto p-6">
            <!-- tagline -->
            <p class="text-[14px] font-medium text-slate-700 mb-4">{{ selected.tagline }}</p>

            <!-- 应用简介 -->
            <div class="mb-5">
              <h4 class="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <i class="fa-solid fa-circle-info mr-1.5 text-blue-500"></i>应用简介
              </h4>
              <p class="text-[13px] text-slate-600 leading-relaxed">{{ selected.summary }}</p>
            </div>

            <!-- 风险提醒 -->
            <div v-if="selected.riskNotice" class="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200/60">
              <p class="text-[12px] text-amber-700 flex items-start gap-2">
                <i class="fa-solid fa-triangle-exclamation mt-0.5 shrink-0"></i>
                <span>{{ selected.riskNotice }}</span>
              </p>
            </div>

            <!-- 适用场景 -->
            <div v-if="(selected.bestFor || []).length" class="mb-5">
              <h4 class="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <i class="fa-solid fa-bullseye mr-1.5 text-blue-500"></i>适用场景
              </h4>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in selected.bestFor"
                  :key="tag"
                  class="px-2.5 py-1 rounded-lg text-[12px] bg-blue-50 text-blue-700 border border-blue-100"
                >{{ tag }}</span>
              </div>
            </div>

            <!-- 核心能力 -->
            <div v-if="capabilityLines.length" class="mb-5">
              <h4 class="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <i class="fa-solid fa-list-check mr-1.5 text-blue-500"></i>核心能力
              </h4>
              <ul class="space-y-1.5">
                <li
                  v-for="(line, i) in capabilityLines"
                  :key="i"
                  class="text-[12.5px] text-slate-600 flex items-start gap-2"
                >
                  <i class="fa-solid fa-check text-[10px] text-blue-500 mt-1 shrink-0"></i>
                  <span>{{ line }}</span>
                </li>
              </ul>
            </div>

            <!-- 推荐开场 -->
            <div v-if="(selected.starters || []).length" class="mb-5">
              <h4 class="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <i class="fa-solid fa-message mr-1.5 text-blue-500"></i>推荐开场
              </h4>
              <div class="space-y-2">
                <button
                  v-for="(q, i) in selected.starters"
                  :key="i"
                  @click="launchApp(selected)"
                  class="w-full text-left px-3.5 py-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-300 text-[12.5px] text-slate-600 hover:text-blue-700 transition-all"
                >
                  <i class="fa-solid fa-arrow-right text-[9px] text-blue-400 mr-2"></i>{{ q }}
                </button>
              </div>
            </div>

            <!-- 专家资产（仅开发者模式） -->
            <div v-if="devMode" class="mb-5">
              <h4 class="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <i class="fa-solid fa-database mr-1.5 text-blue-500"></i>专家资产
              </h4>
              <div class="grid grid-cols-2 gap-2.5 mb-2.5">
                <div class="rounded-lg bg-slate-50 border border-slate-200/70 px-3 py-2.5">
                  <div class="text-[11px] text-slate-400 mb-1">
                    <i class="fa-solid fa-brain text-[10px] text-blue-500 mr-1.5"></i>长期记忆
                  </div>
                  <div class="text-[15px] font-bold text-slate-700 leading-none">{{ assetMemoryChars }} <span class="text-[11px] font-normal text-slate-400">字</span></div>
                </div>
                <div class="rounded-lg bg-slate-50 border border-slate-200/70 px-3 py-2.5">
                  <div class="text-[11px] text-slate-400 mb-1">
                    <i class="fa-solid fa-folder-open text-[10px] text-blue-500 mr-1.5"></i>知识库
                  </div>
                  <div class="text-[15px] font-bold text-slate-700 leading-none">{{ assetKnowledgeCount }} <span class="text-[11px] font-normal text-slate-400">个文件</span></div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="openAssetDrawer('memory')"
                  class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11.5px] font-medium border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
                >
                  <i class="fa-solid fa-brain text-[10px] text-blue-500"></i>管理长期记忆
                </button>
                <button
                  @click="openAssetDrawer('knowledge')"
                  class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11.5px] font-medium border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
                >
                  <i class="fa-solid fa-folder-open text-[10px] text-blue-500"></i>管理知识库
                </button>
              </div>
            </div>

            <!-- 开发者信息 -->
            <div class="mb-2">
              <h4 class="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <i class="fa-solid fa-user-gear mr-1.5 text-blue-500"></i>开发者信息
              </h4>
              <div class="flex items-center gap-4 text-[12.5px] text-slate-600">
                <span><i class="fa-solid fa-user text-[10px] text-slate-400 mr-1.5"></i>{{ (selected.developer && selected.developer.author) || '未知作者' }}</span>
                <span><i class="fa-solid fa-tag text-[10px] text-slate-400 mr-1.5"></i>v{{ (selected.developer && selected.developer.version) || '1.0.0' }}</span>
              </div>
            </div>
          </div>

          <!-- 底部 CTA -->
          <div class="px-5 py-4 border-t border-slate-200/80 shrink-0">
            <button
              v-if="selected.status === 'published'"
              @click="launchApp(selected)"
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm shadow-blue-500/25"
            >
              <i class="fa-solid fa-bolt text-[11px]"></i>启动该应用
            </button>
            <button
              v-else
              @click="openEditor(selected)"
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm"
            >
              <i class="fa-solid fa-pen text-[11px]"></i>编辑应用
            </button>
          </div>
        </aside>
      </div>
    </transition>

    <!-- ── 应用编辑抽屉 ────────────────────────── -->
    <transition name="drawer">
      <div v-if="editing" class="fixed inset-0 z-[60]">
        <div class="absolute inset-0 bg-slate-900/40" @click="closeEditor"></div>
        <aside class="absolute right-0 top-0 bottom-0 w-[680px] max-w-[94vw] bg-white shadow-2xl flex flex-col">
          <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200/80 shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0" :style="{ background: form.color || '#2563eb' }">
                <i :class="'fa-solid fa-' + (form.icon || 'rocket')"></i>
              </span>
              <div class="min-w-0">
                <div class="text-[13px] font-semibold text-slate-800 truncate">{{ form.id ? '编辑应用' : '创建应用' }}</div>
                <div class="text-[11px] text-slate-400">配置并发布你的 AI 应用</div>
              </div>
            </div>
            <button @click="closeEditor" class="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 transition">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="ed-label">应用名称 <span class="text-rose-500">*</span></label>
                <input v-model="form.name" type="text" class="ed-input" placeholder="例如：营销文案生成器" />
              </div>
              <div>
                <label class="ed-label">分类</label>
                <select v-model="form.category" class="ed-input">
                  <option v-for="c in businessCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div>
                <label class="ed-label">图标名（fa 图标，无 fa- 前缀）</label>
                <input v-model="form.icon" type="text" class="ed-input" placeholder="rocket" />
              </div>
              <div>
                <label class="ed-label">主题色</label>
                <div class="flex items-center gap-2">
                  <input v-model="form.color" type="color" class="ed-color" />
                  <input v-model="form.color" type="text" class="ed-input flex-1" placeholder="#2563eb" />
                </div>
              </div>
              <div>
                <label class="ed-label">一句话卖点</label>
                <input v-model="form.tagline" type="text" class="ed-input" placeholder="用一句话说明这个应用能干什么" />
              </div>
            </div>

            <div>
              <label class="ed-label">简介</label>
              <textarea v-model="form.summary" rows="3" class="ed-input" placeholder="应用的详细介绍"></textarea>
            </div>

            <div>
              <label class="ed-label">适用场景（每行一个）</label>
              <textarea v-model="form.bestForText" rows="3" class="ed-input" placeholder="营销海报&#10;商品主图&#10;公众号配图"></textarea>
            </div>

            <div>
              <label class="ed-label">推荐开场问题（每行一个）</label>
              <textarea v-model="form.startersText" rows="3" class="ed-input" placeholder="帮我设计一张海报的提示词&#10;把这个卖点转成主图方案"></textarea>
            </div>

            <div>
              <label class="ed-label">核心能力（每行一条，可用 - 前缀）</label>
              <textarea v-model="form.capabilities" rows="4" class="ed-input" placeholder="- 将业务需求转为提示词&#10;- 推荐构图与风格"></textarea>
            </div>

            <div>
              <label class="ed-label">工作流程</label>
              <textarea v-model="form.workflow" rows="3" class="ed-input" placeholder="描述应用的工作步骤"></textarea>
            </div>

            <div>
              <label class="ed-label">使用约束</label>
              <textarea v-model="form.constraints" rows="3" class="ed-input" placeholder="使用时的限制与注意事项"></textarea>
            </div>

            <div>
              <label class="ed-label">风险提醒</label>
              <input v-model="form.riskNotice" type="text" class="ed-input" placeholder="需要提醒用户注意的风险" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="ed-label">作者</label>
                <input v-model="form.author" type="text" class="ed-input" placeholder="本地开发者" />
              </div>
              <div>
                <label class="ed-label">版本</label>
                <input v-model="form.version" type="text" class="ed-input" placeholder="1.0.0" />
              </div>
              <div>
                <label class="ed-label">绑定模型 <span class="font-normal text-slate-400">(可选)</span></label>
                <input v-model="form.preferredModel" type="text" class="ed-input" placeholder="留空使用默认模型" />
              </div>
            </div>
          </div>

          <div class="px-5 py-4 border-t border-slate-200/80 shrink-0 flex items-center gap-2">
            <button
              @click="saveApp(false)"
              :disabled="saving"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition disabled:opacity-50"
            >
              <i class="fa-solid fa-floppy-disk text-[11px]"></i>保存草稿
            </button>
            <button
              @click="saveApp(true)"
              :disabled="saving"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm shadow-blue-500/25 disabled:opacity-50"
            >
              <i class="fa-solid fa-rocket text-[11px]"></i>发布到广场
            </button>
            <button
              @click="closeEditor"
              class="px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 hover:text-slate-600 transition"
            >取消</button>
          </div>
        </aside>
      </div>
    </transition>

    <!-- ── 专家资产管理抽屉 ────────────────────────── -->
    <transition name="drawer">
      <div v-if="assetDrawerOpen" class="fixed inset-0 z-[65]">
        <div class="absolute inset-0 bg-slate-900/40" @click="assetDrawerOpen = false"></div>
        <aside class="absolute right-0 top-0 bottom-0 w-[640px] max-w-[92vw] bg-white shadow-2xl flex flex-col">
          <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200/80 shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-gradient-to-br from-blue-500 to-blue-700">
                <i class="fa-solid fa-database"></i>
              </span>
              <div class="min-w-0">
                <div class="text-[13px] font-semibold text-slate-800 truncate">专家资产</div>
                <div class="text-[11px] text-slate-400 truncate">长期记忆与知识库</div>
              </div>
            </div>
            <button @click="assetDrawerOpen = false" class="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 transition">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Tab 切换 -->
          <div class="flex items-center gap-1 px-5 pt-3 shrink-0">
            <button
              @click="assetTab = 'memory'"
              class="asset-tab"
              :class="assetTab === 'memory' ? 'asset-tab--active' : ''"
            >
              <i class="fa-solid fa-brain text-[10px]"></i>长期记忆
            </button>
            <button
              @click="assetTab = 'knowledge'"
              class="asset-tab"
              :class="assetTab === 'knowledge' ? 'asset-tab--active' : ''"
            >
              <i class="fa-solid fa-folder-open text-[10px]"></i>知识库
            </button>
          </div>

          <!-- Tab: 长期记忆 -->
          <div v-if="assetTab === 'memory'" class="flex-1 min-h-0 flex flex-col p-5">
            <p class="text-[12px] text-slate-400 mb-2.5 flex items-start gap-1.5">
              <i class="fa-solid fa-circle-info text-blue-400 mt-0.5 shrink-0"></i>
              <span>这些内容会在每次启动该专家时写入会话上下文。</span>
            </p>
            <textarea
              v-model="assetMemoryContent"
              class="flex-1 min-h-0 w-full text-[12.5px] leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:outline-none focus:bg-white focus:border-blue-400 transition resize-none font-mono"
              placeholder="# 长期记忆&#10;&#10;记录该专家需要长期记住的偏好、背景、约定…"
            ></textarea>
            <div class="flex items-center gap-2 pt-3 shrink-0">
              <button
                @click="saveAssetMemory"
                :disabled="assetSaving"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm shadow-blue-500/25 disabled:opacity-50"
              >
                <i class="fa-solid fa-floppy-disk text-[10px]"></i>保存
              </button>
              <button
                @click="openAssetDir('memory')"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
              >
                <i class="fa-solid fa-folder-open text-[10px] text-blue-500"></i>打开目录
              </button>
              <span class="ml-auto text-[11px] text-slate-400">{{ assetMemoryChars }} 字</span>
            </div>
          </div>

          <!-- Tab: 知识库 -->
          <div v-else class="flex-1 min-h-0 flex flex-col p-5">
            <p class="text-[12px] text-slate-400 mb-2.5 flex items-start gap-1.5">
              <i class="fa-solid fa-circle-info text-blue-400 mt-0.5 shrink-0"></i>
              <span>这些文件会在启动专家会话时复制到当前会话项目的 knowledge/app/。</span>
            </p>
            <div class="flex items-center gap-2 mb-3 shrink-0">
              <button
                @click="uploadAssetKnowledge"
                :disabled="assetSaving"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm shadow-blue-500/25 disabled:opacity-50"
              >
                <i class="fa-solid fa-upload text-[10px]"></i>上传文档
              </button>
              <button
                @click="openAssetDir('knowledge')"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
              >
                <i class="fa-solid fa-folder-open text-[10px] text-blue-500"></i>打开目录
              </button>
              <span class="ml-auto text-[11px] text-slate-400">{{ assetKnowledgeCount }} 个文件</span>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto space-y-1.5">
              <div
                v-for="f in assetKnowledgeFiles"
                :key="f.name"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200/70 hover:border-blue-200 transition group"
              >
                <span class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <i class="fa-solid fa-file-lines text-[13px] text-blue-500"></i>
                </span>
                <div class="min-w-0 flex-1">
                  <div class="text-[12.5px] text-slate-700 truncate">{{ f.name }}</div>
                  <div class="text-[10.5px] text-slate-400">{{ formatFileSize(f.size) }}</div>
                </div>
                <button
                  @click="deleteAssetKnowledge(f)"
                  class="w-7 h-7 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                  title="删除"
                >
                  <i class="fa-solid fa-trash text-[10px]"></i>
                </button>
              </div>
              <div v-if="!assetKnowledgeFiles.length" class="text-center py-16 text-slate-300">
                <i class="fa-solid fa-folder-open text-4xl mb-2.5"></i>
                <p class="text-[12.5px]">知识库暂无文件</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </transition>

    <!-- ── Toast ────────────────────────── -->
    <transition name="toast">
      <div
        v-if="toast.show"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl text-[12.5px] font-medium text-white shadow-lg"
        :class="toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-800'"
      >
        <i class="fa-solid mr-1.5" :class="toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'"></i>{{ toast.msg }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  aiAppCategories,
  builtinAiApps,
  getAiAppCategoryName,
  buildAiAppOpeningPrompt,
} from '@/data/ai-apps';

const router = useRouter();

const categories = aiAppCategories;
const active = ref('all');
const keyword = ref('');
const selected = ref(null);
const devMode = ref(false);

// eslint-disable-next-line no-unused-vars
const _opening = buildAiAppOpeningPrompt;

const getCategoryName = getAiAppCategoryName;

// 业务分类(排除虚拟分类 + all)
const virtualCatIds = ['all', 'my-published', 'my-drafts'];
const businessCategories = categories.filter((c) => !virtualCatIds.includes(c.id));

// ── 本地应用 ──
const localApps = ref([]);

async function refreshLocalApps() {
  try {
    const res = await window.api?.aiApps?.list();
    if (res && res.success && Array.isArray(res.apps)) {
      localApps.value = res.apps;
    } else {
      localApps.value = [];
    }
  } catch (e) {
    localApps.value = [];
  }
}

onMounted(() => {
  refreshLocalApps();
});

// 合并的完整应用列表
const allApps = computed(() => [...builtinAiApps, ...localApps.value]);

// devMode 关闭时草稿不可见
const visibleApps = computed(() => {
  if (devMode.value) return allApps.value;
  return allApps.value.filter((a) => a.status === 'published');
});

// 左侧分类:开发草稿仅在 devMode 时显示
const visibleCategories = computed(() =>
  categories.filter((c) => c.id !== 'my-drafts' || devMode.value)
);

function toggleDevMode() {
  devMode.value = !devMode.value;
  // 关闭开发者模式时,若停留在仅开发可见的分类则回到全部
  if (!devMode.value && active.value === 'my-drafts') active.value = 'all';
}

function sourceBadge(app) {
  if (app.source === 'local' && app.status === 'draft') {
    return { text: '草稿', cls: 'src-badge--draft' };
  }
  if (app.source === 'local') {
    return { text: '本地发布', cls: 'src-badge--local' };
  }
  return { text: '内置', cls: 'src-badge--builtin' };
}

function catCount(catId) {
  return filterByCategory(visibleApps.value, catId).length;
}

function filterByCategory(list, catId) {
  if (catId === 'all') return list;
  if (catId === 'my-published') return list.filter((a) => a.source === 'local' && a.status === 'published');
  if (catId === 'my-drafts') return list.filter((a) => a.source === 'local' && a.status === 'draft');
  return list.filter((a) => a.category === catId);
}

const activeName = computed(() => {
  const cat = categories.find((c) => c.id === active.value);
  return cat ? cat.name : '全部应用';
});

const filtered = computed(() => {
  let list = filterByCategory(visibleApps.value, active.value);
  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase();
    list = list.filter((a) =>
      (a.name || '').toLowerCase().includes(kw)
      || (a.summary || '').toLowerCase().includes(kw)
      || (a.tagline || '').toLowerCase().includes(kw)
      || (a.bestFor || []).some((t) => String(t).toLowerCase().includes(kw))
      || (a.starters || []).some((s) => String(s).toLowerCase().includes(kw))
    );
  }
  return list;
});

watch([active, keyword, devMode], () => { currentPage.value = 1; });

// ── 分页 ──
const currentPage = ref(1);
const pageSize = ref(12);
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filtered.value.slice(start, start + pageSize.value);
});
watch(totalPages, (tp) => { if (currentPage.value > tp) currentPage.value = tp; });

const statCards = computed(() => {
  const total = visibleApps.value.length;
  const builtinCount = allApps.value.filter((a) => a.source === 'builtin').length;
  const localPub = allApps.value.filter((a) => a.source === 'local' && a.status === 'published').length;
  const draftCount = allApps.value.filter((a) => a.source === 'local' && a.status === 'draft').length;
  const cards = [
    { label: '应用总数', value: total,        icon: 'fa-layer-group', bg: '#2563eb' },
    { label: '内置应用', value: builtinCount, icon: 'fa-cubes',       bg: '#1d4ed8' },
    { label: '本地发布', value: localPub,     icon: 'fa-rocket',      bg: '#059669' },
  ];
  if (devMode.value) {
    cards.push({ label: '开发草稿', value: draftCount, icon: 'fa-pen-ruler', bg: '#d97706' });
  }
  return cards;
});

const capabilityLines = computed(() => {
  if (!selected.value?.capabilities) return [];
  return selected.value.capabilities
    .split('\n')
    .map((l) => l.replace(/^[-·•]\s*/, '').trim())
    .filter(Boolean);
});

function openDetail(app) {
  selected.value = app;
  assetMemoryContent.value = '';
  assetKnowledgeFiles.value = [];
  if (devMode.value && app?.id) {
    assetAppId.value = app.id;
    loadAssetMemory(app.id);
    loadAssetKnowledge(app.id);
  }
}

function launchApp(app) {
  selected.value = null;
  router.push({ path: '/chat', query: { app: app.id, source: app.source || 'builtin' } });
}

// ── Toast ──
const toast = reactive({ show: false, msg: '', type: 'ok', timer: null });
function showToast(msg, type = 'ok') {
  toast.msg = msg;
  toast.type = type;
  toast.show = true;
  if (toast.timer) clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { toast.show = false; }, 2400);
}

// ── 编辑器 ──
const editing = ref(false);
const saving = ref(false);
const form = reactive({
  id: '',
  name: '',
  category: 'enterprise',
  icon: 'rocket',
  color: '#2563eb',
  tagline: '',
  summary: '',
  bestForText: '',
  startersText: '',
  capabilities: '',
  workflow: '',
  constraints: '',
  riskNotice: '',
  author: '',
  version: '1.0.0',
  preferredModel: '',
});

function resetForm() {
  form.id = '';
  form.name = '';
  form.category = 'enterprise';
  form.icon = 'rocket';
  form.color = '#2563eb';
  form.tagline = '';
  form.summary = '';
  form.bestForText = '';
  form.startersText = '';
  form.capabilities = '';
  form.workflow = '';
  form.constraints = '';
  form.riskNotice = '';
  form.author = '';
  form.version = '1.0.0';
  form.preferredModel = '';
}

function openEditor(app) {
  selected.value = null;
  if (app) {
    form.id = app.source === 'local' ? (app.id || '') : '';
    form.name = app.source === 'local' ? (app.name || '') : `${app.name || ''} 副本`;
    form.category = businessCategories.some((c) => c.id === app.category) ? app.category : 'enterprise';
    form.icon = app.icon || 'rocket';
    form.color = app.color || '#2563eb';
    form.tagline = app.tagline || '';
    form.summary = app.summary || '';
    form.bestForText = (app.bestFor || []).join('\n');
    form.startersText = (app.starters || []).join('\n');
    form.capabilities = app.capabilities || '';
    form.workflow = app.workflow || '';
    form.constraints = app.constraints || '';
    form.riskNotice = app.riskNotice || '';
    form.author = (app.developer && app.developer.author) || '';
    form.version = (app.developer && app.developer.version) || '1.0.0';
    form.preferredModel = app.preferredModel || '';
  } else {
    resetForm();
  }
  editing.value = true;
}

function closeEditor() {
  editing.value = false;
}

function linesToArray(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildPayload() {
  const payload = {
    name: form.name.trim(),
    category: form.category,
    icon: (form.icon || 'rocket').replace(/^fa-/, '').trim(),
    color: form.color || '#2563eb',
    tagline: form.tagline.trim(),
    summary: form.summary.trim(),
    bestFor: linesToArray(form.bestForText),
    starters: linesToArray(form.startersText),
    capabilities: form.capabilities,
    workflow: form.workflow,
    constraints: form.constraints,
    riskNotice: form.riskNotice.trim(),
    developer: {
      author: form.author.trim() || '本地开发者',
      version: form.version.trim() || '1.0.0',
    },
    preferredModel: form.preferredModel.trim(),
  };
  if (form.id) payload.id = form.id;
  return payload;
}

async function saveApp(publish) {
  if (!form.name.trim()) {
    showToast('请填写应用名称', 'error');
    return;
  }
  saving.value = true;
  try {
    const res = await window.api?.aiApps?.save(buildPayload());
    if (!res || !res.success) {
      showToast(res?.error || '保存失败', 'error');
      return;
    }
    if (publish && res.app?.id) {
      const pub = await window.api?.aiApps?.publish(res.app.id);
      if (!pub || !pub.success) {
        showToast(pub?.error || '发布失败', 'error');
        await refreshLocalApps();
        return;
      }
    }
    await refreshLocalApps();
    showToast(publish ? '已发布到广场' : '草稿已保存');
    editing.value = false;
  } catch (e) {
    showToast(e?.message || '保存失败', 'error');
  } finally {
    saving.value = false;
  }
}

async function togglePublish(app) {
  if (!app || app.source !== 'local') return;
  try {
    const fn = app.status === 'published' ? window.api?.aiApps?.unpublish : window.api?.aiApps?.publish;
    const res = await fn?.(app.id);
    if (!res || !res.success) {
      showToast(res?.error || '操作失败', 'error');
      return;
    }
    await refreshLocalApps();
    selected.value = localApps.value.find((a) => a.id === app.id) || null;
    showToast(app.status === 'published' ? '已下架' : '已发布');
  } catch (e) {
    showToast(e?.message || '操作失败', 'error');
  }
}

async function removeApp(app) {
  if (!app || app.source !== 'local') return;
  // eslint-disable-next-line no-alert
  if (!window.confirm(`确定删除应用「${app.name}」？此操作不可恢复。`)) return;
  try {
    const res = await window.api?.aiApps?.delete(app.id);
    if (!res || !res.success) {
      showToast(res?.error || '删除失败', 'error');
      return;
    }
    await refreshLocalApps();
    selected.value = null;
    showToast('已删除');
  } catch (e) {
    showToast(e?.message || '删除失败', 'error');
  }
}

// ── 专家资产（长期记忆 + 知识库）──
const assetDrawerOpen = ref(false);
const assetTab = ref('memory');
const assetMemoryContent = ref('');
const assetKnowledgeFiles = ref([]);
const assetSaving = ref(false);
const assetAppId = ref('');

const assetMemoryChars = computed(() => assetMemoryContent.value.length);
const assetKnowledgeCount = computed(() => assetKnowledgeFiles.value.length);

function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function openAssetDrawer(tab) {
  if (!selected.value?.id) return;
  assetAppId.value = selected.value.id;
  assetTab.value = tab || 'memory';
  assetMemoryContent.value = '';
  assetKnowledgeFiles.value = [];
  assetDrawerOpen.value = true;
  await Promise.all([
    loadAssetMemory(assetAppId.value),
    loadAssetKnowledge(assetAppId.value),
  ]);
}

async function loadAssetMemory(appId) {
  if (!appId) return;
  try {
    const res = await window.api?.aiApps?.memoryGet(appId);
    assetMemoryContent.value = (res && res.success && typeof res.content === 'string') ? res.content : '';
  } catch (e) {
    assetMemoryContent.value = '';
  }
}

async function saveAssetMemory() {
  if (!assetAppId.value) return;
  assetSaving.value = true;
  try {
    const res = await window.api?.aiApps?.memorySave(assetAppId.value, assetMemoryContent.value);
    if (!res || !res.success) {
      showToast(res?.error || '保存失败', 'error');
      return;
    }
    showToast('长期记忆已保存');
  } catch (e) {
    showToast(e?.message || '保存失败', 'error');
  } finally {
    assetSaving.value = false;
  }
}

async function loadAssetKnowledge(appId) {
  if (!appId) return;
  try {
    const res = await window.api?.aiApps?.knowledgeList(appId);
    assetKnowledgeFiles.value = (res && res.success && Array.isArray(res.files)) ? res.files : [];
  } catch (e) {
    assetKnowledgeFiles.value = [];
  }
}

async function uploadAssetKnowledge() {
  if (!assetAppId.value) return;
  assetSaving.value = true;
  try {
    const res = await window.api?.aiApps?.knowledgeUpload(assetAppId.value);
    if (res && res.canceled) return;
    if (!res || !res.success) {
      showToast(res?.error || '上传失败', 'error');
      return;
    }
    await loadAssetKnowledge(assetAppId.value);
    const n = Array.isArray(res.added) ? res.added.length : 0;
    showToast(n ? `已添加 ${n} 个文件` : '已上传');
  } catch (e) {
    showToast(e?.message || '上传失败', 'error');
  } finally {
    assetSaving.value = false;
  }
}

async function deleteAssetKnowledge(file) {
  if (!assetAppId.value || !file?.name) return;
  // eslint-disable-next-line no-alert
  if (!window.confirm(`确定从知识库删除「${file.name}」？`)) return;
  try {
    const res = await window.api?.aiApps?.knowledgeDelete(assetAppId.value, file.name);
    if (!res || !res.success) {
      showToast(res?.error || '删除失败', 'error');
      return;
    }
    await loadAssetKnowledge(assetAppId.value);
    showToast('已删除');
  } catch (e) {
    showToast(e?.message || '删除失败', 'error');
  }
}

async function openAssetDir(type) {
  if (!assetAppId.value) return;
  try {
    const fn = type === 'knowledge' ? window.api?.aiApps?.knowledgeOpen : window.api?.aiApps?.memoryOpen;
    const res = await fn?.(assetAppId.value);
    if (res && res.success === false) {
      showToast(res.error || '打开目录失败', 'error');
    }
  } catch (e) {
    showToast(e?.message || '打开目录失败', 'error');
  }
}
</script>

<style scoped>
.es-bg {
  background:
    radial-gradient(900px 500px at 100% 0%, rgba(37, 99, 235, 0.06), transparent 60%),
    radial-gradient(700px 400px at 0% 100%, rgba(14, 165, 233, 0.05), transparent 55%),
    #f4f7fb;
}
.es-tree { width: 240px; }

.es-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* 分页按钮 */
.pgn {
  min-width: 32px;
  height: 32px;
  padding: 0 9px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.pgn:hover:not(:disabled) { border-color: #93b4fb; color: #2563eb; }
.pgn--cur { background: #2563eb; border-color: #2563eb; color: #fff; font-weight: 600; }
.pgn:disabled { opacity: 0.4; cursor: not-allowed; }

.tree-node {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 9px;
  font-size: 12.5px;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, transform 0.15s;
}
.tree-node:hover { background: #f0f5ff; color: #2563eb; }
.tree-node:hover .tree-badge { transform: scale(1.06); }
.tree-node--active {
  background: linear-gradient(90deg, #e8f1ff, #f3f8ff);
  color: #1d4ed8;
  font-weight: 600;
  box-shadow: inset 3px 0 0 #2563eb;
}
.tree-badge {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 2px 5px rgba(15, 23, 42, 0.14);
  transition: transform 0.15s;
}
.tree-count {
  font-size: 10.5px;
  color: #94a3b8;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 1px 7px;
  flex-shrink: 0;
}
.tree-node--active .tree-count { color: #2563eb; background: #dbeafe; }

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 16px;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff, #fbfdff);
  border: 1px solid #e8ecf3;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
}
.stat-card:hover {
  box-shadow: 0 10px 26px rgba(37, 99, 235, 0.10);
  transform: translateY(-2px);
  border-color: #d4e2fb;
}
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  flex-shrink: 0;
}

.es-card {
  position: relative;
  display: block;
  width: 100%;
  background: #fff;
  border: 1px solid #e8ecf0;
  border-radius: 14px;
  padding: 16px;
  overflow: hidden;
  transition: box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease;
}
.es-card__accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity 0.22s ease;
}
.es-card:hover {
  box-shadow: 0 12px 30px rgba(30, 58, 138, 0.13);
  transform: translateY(-3px);
  border-color: #c7d7f5;
}
.es-card:hover .es-card__accent { opacity: 1; }

.es-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  flex-shrink: 0;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 34px;
}

.drawer-enter-active, .drawer-leave-active { transition: opacity 0.2s; }
.drawer-enter-active aside, .drawer-leave-active aside { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from aside, .drawer-leave-to aside { transform: translateX(100%); }

/* ── 来源徽标 ── */
.src-badge {
  font-size: 9.5px;
  font-weight: 600;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 999px;
}
.src-badge--builtin { background: #eff6ff; color: #2563eb; }
.src-badge--local   { background: #ecfdf5; color: #059669; }
.src-badge--draft   { background: #fffbeb; color: #d97706; }

/* ── 编辑器表单 ── */
.ed-label {
  display: block;
  font-size: 11.5px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 5px;
}
.ed-input {
  width: 100%;
  font-size: 12.5px;
  color: #334155;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  padding: 8px 10px;
  transition: border-color 0.15s, background 0.15s;
  resize: vertical;
}
.ed-input:focus {
  outline: none;
  background: #fff;
  border-color: #60a5fa;
}
.ed-color {
  width: 38px;
  height: 36px;
  padding: 2px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #fff;
  cursor: pointer;
}

/* ── Toast ── */
.toast-enter-active, .toast-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }

/* ── 专家资产抽屉 Tab ── */
.asset-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 9px 9px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.asset-tab:hover { color: #2563eb; }
.asset-tab--active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  background: #f0f5ff;
}
</style>
