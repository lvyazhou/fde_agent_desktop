<template>
  <ul class="file-tree" :class="{ 'file-tree--root': depth === 0 }">
    <li v-for="node in nodes" :key="node.relPath">
      <!-- 目录行 -->
      <div
        v-if="node.isDirectory"
        class="tree-row"
        :style="{ paddingLeft: depth * 12 + 8 + 'px' }"
        @click="toggle(node.relPath)"
        @contextmenu.prevent="$emit('contextmenu', { event: $event, node })"
      >
        <i
          class="fa-solid text-[9px] w-3 text-slate-400 transition-transform"
          :class="isCollapsed(node.relPath) ? 'fa-chevron-right' : 'fa-chevron-down'"
        ></i>
        <i class="fa-solid fa-folder text-[11px] text-amber-400"></i>
        <span class="tree-label">{{ node.name }}</span>
      </div>
      <!-- 目录子节点 -->
      <FileTree
        v-if="node.isDirectory && !isCollapsed(node.relPath)"
        :nodes="node.children"
        :depth="depth + 1"
        :selected="selected"
        :collapsed="collapsed"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @contextmenu="$emit('contextmenu', $event)"
      />
      <!-- 文件行 -->
      <div
        v-else-if="!node.isDirectory"
        class="tree-row"
        :class="{ 'tree-row--active': selected === node.relPath }"
        :style="{ paddingLeft: depth * 12 + 22 + 'px' }"
        @click="$emit('select', node.relPath)"
        @contextmenu.prevent="$emit('contextmenu', { event: $event, node })"
      >
        <i class="fa-solid text-[11px]" :class="fileIcon(node.name)"></i>
        <span class="tree-label">{{ node.name }}</span>
      </div>
    </li>
  </ul>
</template>

<script setup>
// 递归文件夹树。父级维护 collapsed(Set 里的 relPath = 折叠) 与 selected。
const props = defineProps({
  nodes: { type: Array, default: () => [] },
  depth: { type: Number, default: 0 },
  selected: { type: String, default: '' },
  collapsed: { type: Object, default: () => new Set() }, // Set<relPath>
});
const emit = defineEmits(['select', 'toggle', 'contextmenu']);

const isCollapsed = (rel) => props.collapsed.has(rel);
const toggle = (rel) => emit('toggle', rel);

// 按扩展名着色的文件图标(与项目原型树一致的思路)。
function fileIcon(name) {
  const ext = String(name).split('.').pop().toLowerCase();
  const map = {
    js: 'fa-brands fa-js text-yellow-500',
    mjs: 'fa-brands fa-js text-yellow-500',
    ts: 'fa-solid fa-file-code text-blue-500',
    tsx: 'fa-solid fa-file-code text-blue-500',
    jsx: 'fa-solid fa-file-code text-blue-400',
    vue: 'fa-solid fa-file-code text-emerald-500',
    py: 'fa-brands fa-python text-blue-400',
    json: 'fa-solid fa-brackets-curly text-amber-500',
    html: 'fa-brands fa-html5 text-amber-600',
    css: 'fa-brands fa-css3-alt text-sky-500',
    scss: 'fa-brands fa-sass text-blue-300',
    md: 'fa-solid fa-file-lines text-slate-500',
    yml: 'fa-solid fa-file-lines text-slate-500',
    yaml: 'fa-solid fa-file-lines text-slate-500',
    sh: 'fa-solid fa-terminal text-slate-600',
    go: 'fa-solid fa-file-code text-sky-600',
    rs: 'fa-solid fa-file-code text-amber-700',
    png: 'fa-solid fa-file-image text-indigo-400',
    jpg: 'fa-solid fa-file-image text-indigo-400',
    svg: 'fa-solid fa-file-image text-indigo-400',
  };
  return map[ext] || 'fa-solid fa-file text-slate-400';
}
</script>

<style scoped>
.file-tree { list-style: none; margin: 0; padding: 0; }
.tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  font-size: 12.5px;
  color: #475569;
  cursor: pointer;
  border-radius: 6px;
  white-space: nowrap;
  overflow: hidden;
}
.tree-row:hover { background: rgba(241, 245, 249, 0.9); }
.tree-row--active { background: rgba(37, 99, 235, 0.1); color: #1d4ed8; }
.tree-label { overflow: hidden; text-overflow: ellipsis; }
</style>
