<template>
  <div class="flex h-full min-h-0 sk-bg">
    <!-- ── 左侧:技能分组树 ────────────────────────── -->
    <aside class="sk-tree shrink-0 flex flex-col bg-white/95 backdrop-blur border-r border-slate-200/70">
      <div class="px-3 pt-3.5 pb-2.5 border-b border-slate-100">
        <div class="flex items-center gap-2 mb-2.5">
          <span class="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <i class="fa-solid fa-brain text-white text-[11px]"></i>
          </span>
          <span class="text-[12.5px] font-semibold text-slate-700">技能体系</span>
        </div>
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索技能…"
            class="w-full text-[12px] bg-slate-50 border border-transparent focus:bg-white focus:border-blue-400 rounded-md pl-7 pr-2.5 py-1.5 focus:outline-none transition"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <button
          class="tree-node"
          :class="active === 'all' ? 'tree-node--active' : ''"
          @click="active = 'all'"
        >
          <span class="tree-badge" style="background:#64748b"><i class="fa-solid fa-layer-group text-[10px]"></i></span>
          <span class="flex-1 text-left truncate">全部技能</span>
          <span class="tree-count">{{ skills.length }}</span>
        </button>

        <button
          v-for="g in groups"
          :key="g.id"
          class="tree-node"
          :class="active === g.id ? 'tree-node--active' : ''"
          @click="active = g.id"
        >
          <span class="tree-badge" :style="{ background: g.color || groupColor(g.id) }">
            <i :class="faIcon(g.icon, 'toolbox') + ' text-[10px]'"></i>
          </span>
          <span class="flex-1 text-left truncate">{{ g.name }}</span>
          <span class="tree-count">{{ g.count }}</span>
        </button>
      </div>

      <div class="px-4 py-3 border-t border-slate-100 text-[11px] text-slate-400">
        <i class="fa-solid fa-circle-info mr-1"></i>共 <b class="text-slate-600">{{ skills.length }}</b> 项可调用技能
      </div>
    </aside>

    <!-- ── 右侧:技能卡片 ────────────────────────── -->
    <div class="flex-1 min-w-0 overflow-y-auto">
      <div class="px-6 py-6 lg:px-8">
        <div class="mb-4 flex items-center justify-between gap-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="text-[17px] font-bold text-slate-800 truncate">{{ activeName }}</h1>
              <span class="text-[12px] text-slate-400 shrink-0">共 {{ filtered.length }} 项</span>
            </div>
            <p class="text-[12px] text-slate-400 mt-0.5 truncate">
              AI 内置的真实技能包 · 覆盖产品文档 / 原型 / 出图 / 陪练全链路
            </p>
          </div>
          <div class="shrink-0 flex items-center gap-2">
          <button
            @click="refresh"
            :disabled="importing"
            class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-600 transition cursor-pointer active:scale-95"
            title="重新扫描技能库"
          >
            <i class="fa-solid fa-rotate text-[11px]" :class="refreshing ? 'fa-spin' : ''"></i>刷新
          </button>
          <button
            @click="openHub"
            class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-600 transition cursor-pointer active:scale-95"
            title="从 360 SkillHub 搜索并安装技能"
          >
            <i class="fa-solid fa-cloud-arrow-down text-[11px]"></i>技能中心
          </button>
          <button
            @click="startImport"
            :disabled="importing"
            class="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <i class="fa-solid fa-file-zipper text-[11px]"></i>导入技能包
          </button>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-4 mb-5">
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

        <div v-if="filtered.length" class="sk-grid">
          <button
            v-for="sk in pagedItems"
            :key="sk.id"
            class="sk-card text-left group"
            @click="openSkill(sk)"
          >
            <div class="sk-card__accent" :style="{ background: sk.color }"></div>
            <div class="flex items-start gap-3">
              <span class="sk-icon" :style="{ background: sk.color, boxShadow: `0 6px 16px ${sk.color}55` }">
                <i :class="faIcon(sk.icon, 'cube')"></i>
              </span>
              <div class="flex-1 min-w-0">
                <h3 class="text-[13.5px] font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{{ sk.name }}</h3>
                <div class="flex items-center gap-1.5 mt-1">
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{{ groupName(sk.group) }}</span>
                  <span v-if="sk.generated" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium"><i class="fa-solid fa-wand-magic-sparkles mr-0.5"></i>自动生成</span>
                  <span v-if="sk.version" class="text-[10px] text-slate-400">v{{ sk.version }}</span>
                </div>
              </div>
            </div>
            <p class="text-[12px] text-slate-500 mt-3 leading-relaxed line-clamp-2">{{ sk.summary || '——' }}</p>
            <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span class="font-mono truncate">{{ sk.id }}</span>
              <span class="text-blue-500 font-medium shrink-0"><i class="fa-solid fa-book-open mr-1"></i>查看说明</span>
            </div>
          </button>
        </div>
        <div v-else class="text-center py-20 text-slate-300">
          <i class="fa-solid fa-inbox text-5xl mb-3"></i>
          <p class="text-[13px]">该分组下暂无技能</p>
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

    <!-- ── 技能说明抽屉 ────────────────────────── -->
    <transition name="drawer">
      <div v-if="selected" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-slate-900/40" @click="!editing && (selected = null)"></div>
        <aside class="absolute right-0 top-0 bottom-0 w-[640px] max-w-[92vw] bg-white shadow-2xl flex flex-col">
          <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200/80 shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0" :style="{ background: selected.color }">
                <i :class="faIcon(selected.icon, 'cube')"></i>
              </span>
              <div class="min-w-0">
                <div class="text-[13px] font-semibold text-slate-800 truncate">{{ selected.name }}</div>
                <div class="text-[11px] text-slate-400">{{ groupName(selected.group) }}<span v-if="selected.version"> · v{{ selected.version }}</span></div>
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <template v-if="!editing">
                <button @click="startEdit()" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-blue-600 hover:bg-blue-50 transition" title="编辑技能">
                  <i class="fa-solid fa-pen text-[11px]"></i><span>编辑</span>
                </button>
                <button @click="openDir(selected)" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-slate-600 hover:bg-slate-100 transition" title="打开技能目录">
                  <i class="fa-solid fa-folder-open text-[11px]"></i><span>打开目录</span>
                </button>
                <button @click="deleteSkill(selected)" :disabled="deleting" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-rose-500 hover:bg-rose-50 transition disabled:opacity-50" title="删除技能">
                  <i class="fa-solid fa-trash text-[11px]"></i><span>删除</span>
                </button>
                <button @click="selected = null" class="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 transition"><i class="fa-solid fa-xmark"></i></button>
              </template>
              <template v-else>
                <button @click="saveEdit()" :disabled="saving" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50" title="保存">
                  <i class="fa-solid text-[11px]" :class="saving ? 'fa-spinner fa-spin' : 'fa-check'"></i><span>{{ saving ? '保存中…' : '保存' }}</span>
                </button>
                <button @click="cancelEdit()" :disabled="saving" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-slate-600 hover:bg-slate-100 transition disabled:opacity-50" title="取消">
                  <i class="fa-solid fa-xmark text-[11px]"></i><span>取消</span>
                </button>
              </template>
            </div>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto p-6 bg-white">
            <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-slate-400">
              <div class="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin mb-3"></div>
              <span class="text-[12px]">加载中…</span>
            </div>
            <div v-else-if="error" class="flex flex-col items-center justify-center py-20 text-slate-400">
              <i class="fa-solid fa-triangle-exclamation text-xl mb-2 text-amber-400"></i>
              <span class="text-[12px]">{{ error }}</span>
            </div>
            <div v-else-if="!editing" class="prose prose-sm prose-slate max-w-none skill-md" v-html="rendered"></div>
            <!-- 编辑表单 -->
            <div v-else class="space-y-4">
              <div>
                <label class="block text-[12px] font-medium text-slate-600 mb-1.5">名称</label>
                <input v-model="form.name" type="text" placeholder="技能显示名称"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[12px] font-medium text-slate-600 mb-1.5">分类</label>
                  <select v-model="form.category"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-800 bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                    <option v-for="g in SKILL_GROUP_OPTIONS" :key="g.id" :value="g.id">{{ g.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[12px] font-medium text-slate-600 mb-1.5">图标 <span class="text-slate-400 font-normal">(Font Awesome 名)</span></label>
                  <div class="flex items-center gap-2">
                    <span class="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0" :style="{ background: selected.color }">
                      <i :class="faIcon(form.icon, 'cube')"></i>
                    </span>
                    <input v-model="form.icon" type="text" placeholder="如 star / wand-magic-sparkles"
                      class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-[12px] font-medium text-slate-600 mb-1.5">描述</label>
                <textarea v-model="form.description" rows="3" placeholder="技能触发描述(agent 据此判断何时调用)"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-800 leading-relaxed resize-y focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"></textarea>
              </div>
              <div>
                <label class="block text-[12px] font-medium text-slate-600 mb-1.5">正文 <span class="text-slate-400 font-normal">(Markdown)</span></label>
                <textarea v-model="form.body" rows="18" spellcheck="false" placeholder="技能正文(Markdown)"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 text-[12.5px] font-mono text-slate-800 leading-relaxed resize-y focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"></textarea>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </transition>

    <!-- ── 技能中心(SkillHub)抽屉 ────────────────────────── -->
    <transition name="drawer">
      <div v-if="hubOpen" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-slate-900/40" @click="hubOpen = false"></div>
        <aside class="absolute right-0 top-0 bottom-0 w-[1100px] max-w-[95vw] bg-white shadow-2xl flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200/80 shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-gradient-to-br from-blue-500 to-blue-700">
                <i class="fa-solid fa-cloud-arrow-down"></i>
              </span>
              <div class="min-w-0">
                <div class="text-[13px] font-semibold text-slate-800 truncate">技能中心</div>
                <div class="text-[11px] text-slate-400">从 360 SkillHub 搜索并安装技能</div>
              </div>
            </div>
            <button @click="hubOpen = false" class="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 transition cursor-pointer active:scale-95 shrink-0"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <!-- 两栏布局 -->
          <div class="flex-1 min-h-0 flex">
            <!-- 左侧:搜索 + 分类树 -->
            <aside class="w-[200px] shrink-0 flex flex-col border-r border-slate-200/70 bg-white">
              <div class="px-3 pt-3 pb-2.5 border-b border-slate-100 shrink-0">
                <div class="relative">
                  <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
                  <input
                    v-model="hubKeyword"
                    type="text"
                    placeholder="搜索技能…"
                    class="w-full text-[12px] bg-slate-50 border border-transparent focus:bg-white focus:border-blue-400 rounded-md pl-7 pr-2.5 py-1.5 focus:outline-none transition"
                  />
                </div>
              </div>
              <div class="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                <button
                  v-for="cat in hubVisibleCategories"
                  :key="cat.id"
                  class="tree-node"
                  :class="hubActiveCat === cat.id ? 'tree-node--active' : ''"
                  @click="hubActiveCat = cat.id"
                >
                  <span class="tree-badge" :style="{ background: cat.color }">
                    <i :class="'fa-solid fa-' + cat.icon + ' text-[10px]'"></i>
                  </span>
                  <span class="flex-1 text-left truncate">{{ cat.name }}</span>
                </button>
              </div>
            </aside>

            <!-- 右侧:卡片网格 + 分页 -->
            <div class="flex-1 min-w-0 overflow-y-auto bg-slate-50/40">
              <div class="px-5 py-4">
                <!-- 结果头 -->
                <div class="flex items-center gap-2 mb-3">
                  <h2 class="text-[14px] font-bold text-slate-800">{{ hubCatName(hubActiveCat) }}</h2>
                  <span class="text-[11.5px] text-slate-400">第 {{ hubPageNum }} 页 · 本页 {{ hubItems.length }} 项</span>
                </div>

                <!-- 加载中 -->
                <div v-if="hubLoading && !hubItems.length" class="flex flex-col items-center justify-center py-24 text-slate-400">
                  <div class="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin mb-3"></div>
                  <span class="text-[12px]">搜索中…</span>
                </div>

                <!-- 空态 -->
                <div v-else-if="!hubItems.length" class="flex flex-col items-center justify-center py-24 text-slate-300">
                  <i class="fa-solid fa-inbox text-4xl mb-3"></i>
                  <p class="text-[12.5px]">没有找到匹配的技能</p>
                </div>

                <!-- 卡片网格 -->
                <div v-else class="hub-grid" :class="hubLoading ? 'opacity-50 pointer-events-none' : ''">
                  <div v-for="item in hubItems" :key="item.slug" class="sk-card cursor-default">
                    <div class="sk-card__accent" style="background:#2563eb"></div>
                    <div class="flex items-center gap-2">
                      <h3 class="text-[13px] font-semibold text-slate-800 truncate flex-1 min-w-0">{{ item.displayName || item.name }}</h3>
                      <span v-if="item.version" class="text-[10px] text-slate-400 shrink-0">v{{ item.version }}</span>
                    </div>
                    <p class="text-[11.5px] text-slate-500 mt-2 leading-relaxed line-clamp-2">{{ item.summary || '——' }}</p>
                    <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-400">
                      <span><i class="fa-solid fa-download mr-1"></i>{{ formatCount(item.downloads) }}</span>
                      <span><i class="fa-solid fa-star mr-1 text-amber-400"></i>{{ item.stars ?? 0 }}</span>
                      <span v-if="item.owner" class="truncate max-w-[90px]"><i class="fa-solid fa-user mr-1"></i>{{ item.owner }}</span>
                      <span v-if="item.securityStatus === 'safe'" class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">
                        <i class="fa-solid fa-shield-halved mr-0.5"></i>安全
                      </span>
                    </div>
                    <div class="mt-3">
                      <span
                        v-if="isInstalled(item)"
                        class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-slate-100 text-slate-400 cursor-default"
                      >
                        <i class="fa-solid fa-check text-[11px]"></i>已安装
                      </span>
                      <button
                        v-else
                        @click="installFromHub(item)"
                        :disabled="!!hubInstalling"
                        class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
                      >
                        <i class="fa-solid text-[11px]" :class="hubInstalling === item.slug ? 'fa-spinner fa-spin' : 'fa-download'"></i>安装
                      </button>
                    </div>
                  </div>
                </div>

                <!-- 分页条:游标式上一页/下一页 -->
                <div v-if="hubItems.length && (hubPrevCursors.length > 0 || hubNextCursor)" class="flex items-center justify-center gap-3 mt-6">
                  <button
                    class="pgn cursor-pointer active:scale-95"
                    :disabled="hubPrevCursors.length === 0 || hubLoading"
                    @click="hubPrevPage"
                  >
                    <i class="fa-solid fa-chevron-left text-[10px] mr-1"></i>上一页
                  </button>
                  <span class="text-[12px] text-slate-400">第 {{ hubPageNum }} 页</span>
                  <button
                    class="pgn cursor-pointer active:scale-95"
                    :disabled="!hubNextCursor || hubLoading"
                    @click="hubNextPage"
                  >
                    下一页<i class="fa-solid fa-chevron-right text-[10px] ml-1"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </transition>
    <transition name="fade">
      <div v-if="importing || importResult" class="fixed inset-0 z-[55] flex items-center justify-center">
        <div class="absolute inset-0 bg-slate-900/40"></div>
        <div class="relative w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl p-6">
          <div class="flex items-center gap-2 mb-5">
            <i class="fa-solid fa-file-zipper text-blue-600"></i>
            <span class="text-[15px] font-bold text-slate-800">导入技能包</span>
            <button v-if="importResult" @click="closeImport" class="ml-auto w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <!-- 进行中 / 成功:进度条 -->
          <template v-if="!importError">
            <div class="flex items-center justify-between text-[12px] mb-1.5">
              <span class="text-slate-500">{{ progressMsg }}</span>
              <span class="font-mono text-slate-400">{{ progressPct }}%</span>
            </div>
            <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300" :style="{ width: progressPct + '%' }"></div>
            </div>
            <div v-if="importResult && !importError" class="mt-5 flex items-center gap-2 text-[13px] text-blue-600">
              <i class="fa-solid fa-circle-check"></i>技能「{{ importResult.skillId }}」导入成功
            </div>
          </template>

          <!-- 失败:校验不通过 -->
          <div v-else class="flex flex-col items-center text-center py-3">
            <i class="fa-solid fa-triangle-exclamation text-2xl text-amber-500 mb-3"></i>
            <p class="text-[13px] font-medium text-slate-700 mb-1">导入失败</p>
            <p class="text-[12px] text-slate-400 leading-relaxed">{{ importError }}</p>
          </div>

          <button
            v-if="importResult"
            @click="closeImport"
            class="w-full mt-6 py-2.5 rounded-lg text-[13px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >完成</button>
        </div>
      </div>
    </transition>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="fixed top-4 right-4 z-[60] bg-slate-800 text-white text-[13px] px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
        <i class="fa-solid fa-circle-check text-blue-400"></i>{{ toast }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { marked } from 'marked';

const groups = ref([]);
const skills = ref([]);
const active = ref('all');
const keyword = ref('');
const selected = ref(null);
const loading = ref(false);
const error = ref('');
const rendered = ref('');
const refreshing = ref(false);
const deleting = ref(false);
const toast = ref('');

// 技能编辑态。form 收集结构化字段,YAML 合并全在主进程做(skills:write)。
const editing = ref(false);
const saving = ref(false);
const form = ref({ name: '', description: '', body: '', category: 'general', icon: '' });

// 编辑时的分类下拉选项 —— 与主进程 SKILLS_GROUPS 同 id/中文名(不可复用 hubCategories
// 那是 SkillHub 的 API tag;也不可用 groups ref 它只含 count>0 的组)。
const SKILL_GROUP_OPTIONS = [
  { id: 'product-doc',  name: '产品文档' },
  { id: 'prototype',    name: '原型设计' },
  { id: 'report-image', name: '汇报出图' },
  { id: 'dataviz',      name: '数据可视化' },
  { id: 'coach',        name: '教练陪练' },
  { id: 'thinking',     name: '思考协作' },
  { id: 'general',      name: '通用工具' },
];

function showToast(msg) {
  toast.value = msg;
  setTimeout(() => { toast.value = ''; }, 2600);
}

// 导入技能包状态
const importing = ref(false);
const importResult = ref(null);
const importError = ref('');
const progressPct = ref(0);
const progressMsg = ref('');
let offProgress = null;

// 技能中心(SkillHub)状态 —— 服务端搜索/分类过滤 + 游标翻页
const hubOpen = ref(false);
const hubKeyword = ref('');
const hubActiveCat = ref('all'); // 当前选中分类(走服务端 tag 过滤)
const hubItems = ref([]);        // 当前页技能(翻页替换,不累积)
const hubPrevCursors = ref([]);  // 游标栈:每页起始游标,用于"上一页"回退
const hubNextCursor = ref(null); // 下一页游标(本页返回的 nextCursor)
const hubPageNum = ref(1);       // 当前页码(仅显示用)
const hubLoading = ref(false);
const hubInstalling = ref(''); // 正在安装的 slug
let hubDebounce = null;

// 分类映射(API tag → 中文名 + 图标 + 颜色)。分类过滤走服务端 tag 参数
const hubCategories = [
  { id: 'all', name: '全部分类', icon: 'layer-group', color: '#64748b' },
  { id: 'efficiency', name: '效率', icon: 'gauge-high', color: '#2563eb' },
  { id: 'creativity', name: '创作', icon: 'wand-magic-sparkles', color: '#7c3aed' },
  { id: 'knowledge', name: '知识', icon: 'book', color: '#0891b2' },
  { id: 'search', name: '搜索', icon: 'magnifying-glass', color: '#0ea5e9' },
  { id: 'marketing', name: '营销', icon: 'bullhorn', color: '#db2777' },
  { id: 'development', name: '开发', icon: 'code', color: '#1d4ed8' },
  { id: 'data', name: '数据', icon: 'chart-column', color: '#059669' },
  { id: 'collaboration', name: '协作', icon: 'users', color: '#d97706' },
  { id: 'automation', name: '自动化', icon: 'robot', color: '#4f46e5' },
  { id: 'security', name: '安全', icon: 'shield-halved', color: '#dc2626' },
  { id: 'lifestyle', name: '生活', icon: 'mug-hot', color: '#ea580c' },
];
function hubCatName(id) {
  return hubCategories.find((c) => c.id === id)?.name || id;
}

async function loadManifest() {
  try {
    const res = await window.api.skills.getManifest();
    if (res && res.success && res.data) {
      groups.value = res.data.groups || [];
      skills.value = res.data.skills || [];
    } else {
      error.value = res?.error || '技能清单读取失败';
    }
  } catch (e) {
    console.error('[skills] load manifest failed', e);
  }
}

onMounted(() => {
  loadManifest();
  // 订阅主进程的导入进度事件
  offProgress = window.api.skills.onImportProgress((p) => {
    progressPct.value = p.percent ?? progressPct.value;
    progressMsg.value = p.message || '';
  });
});

onUnmounted(() => { if (offProgress) offProgress(); });

async function startImport() {
  if (importing.value) return;
  importing.value = true;
  importResult.value = null;
  importError.value = '';
  progressPct.value = 0;
  progressMsg.value = '等待选择文件…';
  try {
    const res = await window.api.skills.importZip();
    if (res && res.success) {
      progressPct.value = 100;
      importResult.value = res;
      await loadManifest();
      if (res.skillId) {
        const g = skills.value.find((s) => s.id === res.skillId)?.group;
        if (g) active.value = g;
      }
    } else if (res && res.canceled) {
      // 用户取消:静默关闭
      importing.value = false;
      return;
    } else {
      importError.value = res?.error || '导入失败';
      importResult.value = { skillId: '' };
    }
  } catch (e) {
    importError.value = e.message || String(e);
    importResult.value = { skillId: '' };
  } finally {
    importing.value = false;
  }
}

function closeImport() {
  importResult.value = null;
  importError.value = '';
  progressPct.value = 0;
}

// ── 技能中心(SkillHub)──
function openHub() {
  hubOpen.value = true;
  if (!hubItems.value.length) hubResetAndSearch();
}

// 加载一页(cursor 为 null 即第一页)。结果替换 hubItems,并记录 nextCursor 供翻页
async function hubLoadPage(cursor) {
  if (hubLoading.value) return;
  hubLoading.value = true;
  const q = hubKeyword.value.trim();
  try {
    const res = await window.api.skills.hubSearch(q, hubActiveCat.value, 24, cursor);
    if (res && res.success) {
      hubItems.value = res.items || [];
      hubNextCursor.value = res.nextCursor || null;
    } else {
      hubItems.value = [];
      hubNextCursor.value = null;
    }
  } catch (e) {
    console.error('[skills] hub search failed', e);
    hubItems.value = [];
    hubNextCursor.value = null;
  } finally {
    hubLoading.value = false;
  }
}

// 重新搜索:清空游标栈,回到第一页(关键词变化 / 切分类时调用)
function hubResetAndSearch() {
  hubPrevCursors.value = [];
  hubPageNum.value = 1;
  hubLoadPage(null);
}

// 下一页:把"进入下一页所用的游标"压栈,便于回退
function hubNextPage() {
  if (!hubNextCursor.value || hubLoading.value) return;
  hubPrevCursors.value.push(hubNextCursor.value);
  hubPageNum.value += 1;
  hubLoadPage(hubNextCursor.value);
}

// 上一页:弹出当前页游标,用上一页的游标重新加载
function hubPrevPage() {
  if (hubPrevCursors.value.length === 0 || hubLoading.value) return;
  hubPrevCursors.value.pop();           // 移除当前页游标
  const prevCursor = hubPrevCursors.value.length
    ? hubPrevCursors.value[hubPrevCursors.value.length - 1]
    : null;                             // 栈空 → 回第一页
  hubPageNum.value = Math.max(1, hubPageNum.value - 1);
  hubLoadPage(prevCursor);
}

watch(hubKeyword, () => {
  if (hubDebounce) clearTimeout(hubDebounce);
  hubDebounce = setTimeout(() => { hubResetAndSearch(); }, 300);
});
watch(hubActiveCat, () => { hubResetAndSearch(); });

// 展示全部预设分类(服务端过滤,前端无法预判哪个分类有货)
const hubVisibleCategories = computed(() => hubCategories);

function isInstalled(item) {
  return skills.value.some((s) =>
    s.id === item.slug ||
    s.id === item.name ||
    s.name === item.displayName ||
    s.name === item.name
  );
}

function formatCount(n) {
  const v = Number(n) || 0;
  if (v >= 10000) return (v / 10000).toFixed(1) + '万';
  return String(v);
}

async function installFromHub(item) {
  if (importing.value || hubInstalling.value) return;
  importing.value = true;
  importResult.value = null;
  importError.value = '';
  progressPct.value = 0;
  progressMsg.value = '准备下载…';
  hubInstalling.value = item.slug;
  try {
    // item 来自 hubItems(ref)，是 Vue reactive Proxy，直接过 IPC 会触发
    // structured-clone 失败(An object could not be cloned)。传前摊平成纯 JSON。
    const plain = JSON.parse(JSON.stringify(item));
    const res = await window.api.skills.hubInstall(plain);
    if (res && res.success) {
      progressPct.value = 100;
      importResult.value = { skillId: res.skillId || item.displayName || item.name };
      await loadManifest();
      showToast(`技能「${item.displayName || item.name}」安装成功`);
    } else {
      importError.value = res?.error || '安装失败';
      importResult.value = { skillId: '' };
      showToast('安装失败:' + (res?.error || '未知错误'));
    }
  } catch (e) {
    importError.value = e.message || String(e);
    importResult.value = { skillId: '' };
    showToast('安装失败:' + (e.message || e));
  } finally {
    importing.value = false;
    hubInstalling.value = '';
  }
}

const activeName = computed(() => {
  if (active.value === 'all') return '全部技能';
  return groups.value.find((g) => g.id === active.value)?.name || '全部技能';
});

const filtered = computed(() => {
  let list = active.value === 'all' ? skills.value : skills.value.filter((s) => s.group === active.value);
  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase();
    list = list.filter((s) => s.name.toLowerCase().includes(kw) || (s.summary || '').toLowerCase().includes(kw) || s.id.includes(kw));
  }
  return list;
});

// ── 分页 ──
const currentPage = ref(1);
const pageSize = ref(12);
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filtered.value.slice(start, start + pageSize.value);
});
watch([active, keyword], () => { currentPage.value = 1; });
watch(totalPages, (tp) => { if (currentPage.value > tp) currentPage.value = tp; });

const statCards = computed(() => [
  { label: '技能总数', value: skills.value.length, icon: 'fa-cubes', bg: '#2563eb' },
  { label: '能力分组', value: groups.value.length, icon: 'fa-layer-group', bg: '#1d4ed8' },
  { label: '产文档类', value: skills.value.filter((s) => s.group === 'product-doc').length, icon: 'fa-file-lines', bg: '#0ea5e9' },
  { label: '出图/可视化', value: skills.value.filter((s) => ['report-image', 'dataviz'].includes(s.group)).length, icon: 'fa-images', bg: '#3b82f6' },
]);

function groupName(id) {
  return groups.value.find((g) => g.id === id)?.name || id;
}
function groupColor(id) {
  return { 'product-doc': '#2563eb', prototype: '#1d4ed8', dataviz: '#0ea5e9', 'report-image': '#3b82f6', coach: '#1e40af', thinking: '#0369a1', general: '#64748b' }[id] || '#64748b';
}
// manifest 里的 icon 是不带 fa- 前缀的图标名(如 headset),这里补全 Font Awesome class
function faIcon(name, fallback) {
  const n = (name || fallback || 'cube').trim();
  return n.startsWith('fa-') ? `fa-solid ${n}` : `fa-solid fa-${n}`;
}

async function openSkill(sk) {
  selected.value = sk;
  editing.value = false;
  loading.value = true;
  error.value = '';
  rendered.value = '';
  try {
    const res = await window.api.skills.read(sk.id, sk.file || 'SKILL.md');
    if (res && res.success) {
      // 去掉 frontmatter,只渲染正文
      const body = (res.content || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
      rendered.value = marked.parse(body);
    } else {
      error.value = res?.error || '读取失败';
    }
  } catch (e) {
    error.value = e.message || '读取失败';
  } finally {
    loading.value = false;
  }
}

// 进编辑态:openSkill 只存了渲染后 html,没存源码 body,需重新读原文拆出纯 body。
async function startEdit() {
  const sk = selected.value;
  if (!sk) return;
  form.value = {
    name: sk.name || '',
    // selected.description 是 manifest 全文(非截断 summary),可直接用
    description: sk.description || '',
    body: '',
    category: sk.group || 'general',
    icon: (sk.icon || '').replace(/^fa-solid\s+fa-|^fa-/, ''),
  };
  editing.value = true;
  try {
    const res = await window.api.skills.read(sk.id, sk.file || 'SKILL.md');
    if (res && res.success) {
      form.value.body = (res.content || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    }
  } catch (e) {
    showToast('读取源码失败:' + (e.message || e));
  }
}

function cancelEdit() {
  editing.value = false;
}

async function saveEdit() {
  const sk = selected.value;
  if (!sk || saving.value) return;
  saving.value = true;
  try {
    const payload = {
      skill: sk.id,
      name: form.value.name,
      description: form.value.description,
      body: form.value.body,
      category: form.value.category,
      icon: (form.value.icon || '').trim(),
    };
    const res = await window.api.skills.write(payload);
    if (res && res.success) {
      await loadManifest();
      // 用新数据刷新当前 selected(loadManifest 换了 skills 数组引用)
      const fresh = skills.value.find((s) => s.id === sk.id);
      if (fresh) { selected.value = fresh; await openSkill(fresh); }
      editing.value = false;
      showToast('已保存');
    } else {
      showToast('保存失败:' + (res?.error || '未知错误'));
    }
  } catch (e) {
    showToast('保存失败:' + (e.message || e));
  } finally {
    saving.value = false;
  }
}

async function openDir(sk) {
  try {
    await window.api.skills.open(sk.id);
  } catch (e) {
    console.error('[skills] open dir failed', e);
  }
}

async function refresh() {
  if (refreshing.value) return;
  refreshing.value = true;
  try {
    await loadManifest();
    showToast('技能库已刷新');
  } finally {
    setTimeout(() => { refreshing.value = false; }, 300);
  }
}

async function deleteSkill(sk) {
  if (!sk || deleting.value) return;
  const tip = sk.builtin
    ? `「${sk.name}」是内置技能,删除后下次启动会自动恢复。确认删除?`
    : `确认删除技能「${sk.name}」?此操作会移除该技能目录,不可撤销。`;
  if (!window.confirm(tip)) return;
  deleting.value = true;
  try {
    const res = await window.api.skills.delete(sk.id);
    if (res && res.success) {
      selected.value = null;
      await loadManifest();
      showToast(`已删除技能「${sk.name}」`);
    } else {
      showToast('删除失败:' + (res?.error || '未知错误'));
    }
  } catch (e) {
    showToast('删除失败:' + (e.message || e));
  } finally {
    deleting.value = false;
  }
}
</script>

<style scoped>
.sk-bg {
  background:
    radial-gradient(900px 500px at 100% 0%, rgba(37, 99, 235, 0.06), transparent 60%),
    radial-gradient(700px 400px at 0% 100%, rgba(14, 165, 233, 0.05), transparent 55%),
    #f4f7fb;
}
.sk-tree { width: 240px; }

/* 自适应卡片网格:列数随宽度自动增减(最小 280px),窄屏 2 列宽屏可到 4-5 列 */
.sk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* 分页按钮 */
.pgn {
  min-width: 32px;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-size: 12.5px;
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

/* 统计卡片 */
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

.sk-card {
  position: relative;
  display: block;
  width: 100%;
  background: #fff;
  border: 1px solid #e8ecf0;
  border-radius: 14px;
  padding: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease;
}
.sk-card__accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity 0.22s ease;
}
.sk-card:hover {
  box-shadow: 0 12px 30px rgba(30, 58, 138, 0.13);
  transform: translateY(-3px);
  border-color: #c7d7f5;
}
.sk-card:hover .sk-card__accent { opacity: 1; }

.sk-icon {
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

/* 技能中心卡片网格 */
.hub-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
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

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 技能说明 markdown 排版(对齐 DocViewer 的 handbook-md) */
.skill-md :deep(h1) { font-size: 1.4em; font-weight: 700; color: #1e293b; margin: 0.4em 0 0.5em; }
.skill-md :deep(h2) { font-size: 1.18em; font-weight: 700; color: #1e293b; margin: 1em 0 0.4em; padding-bottom: 0.2em; border-bottom: 1px solid #e2e8f0; }
.skill-md :deep(h3) { font-size: 1.04em; font-weight: 600; color: #334155; margin: 0.8em 0 0.3em; }
.skill-md :deep(p) { margin: 0.5em 0; line-height: 1.75; color: #475569; font-size: 13px; }
.skill-md :deep(ul), .skill-md :deep(ol) { margin: 0.4em 0; padding-left: 1.5em; }
.skill-md :deep(li) { margin: 0.2em 0; line-height: 1.7; color: #475569; font-size: 13px; }
.skill-md :deep(table) { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 12px; }
.skill-md :deep(th), .skill-md :deep(td) { border: 1px solid #e2e8f0; padding: 0.5em 0.7em; text-align: left; vertical-align: top; }
.skill-md :deep(th) { background: #f8fafc; font-weight: 600; color: #334155; }
.skill-md :deep(strong) { font-weight: 700; color: #1e293b; }
.skill-md :deep(code) { font-size: 12px; background: #f1f5f9; padding: 0.15em 0.4em; border-radius: 4px; color: #475569; }
.skill-md :deep(pre) { background: #1e293b; color: #e2e8f0; padding: 0.9em 1.1em; border-radius: 8px; overflow-x: auto; font-size: 12px; margin: 0.6em 0; }
.skill-md :deep(pre code) { background: transparent; padding: 0; color: inherit; }
.skill-md :deep(blockquote) { border-left: 3px solid #2563eb; padding: 0.2em 0 0.2em 0.9em; margin: 0.6em 0; color: #475569; background: #f8fafc; border-radius: 0 6px 6px 0; }
.skill-md :deep(a) { color: #2563eb; text-decoration: none; }
</style>
