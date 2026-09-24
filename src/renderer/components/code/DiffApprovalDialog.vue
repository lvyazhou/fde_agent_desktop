<template>
  <div class="diff-overlay" @click.self="onReject">
    <div class="diff-card">
      <!-- header -->
      <div class="diff-head">
        <div class="flex items-center gap-2 min-w-0">
          <span class="diff-badge"><i class="fa-solid fa-pen-to-square"></i> 待确认的改动</span>
          <span class="diff-path" :title="filePath">{{ filePath }}</span>
        </div>
        <span class="diff-stat">
          <span class="add">+{{ addCount }}</span>
          <span class="del">-{{ delCount }}</span>
        </span>
      </div>

      <!-- diff body -->
      <div class="diff-body scrollbar-thin">
        <table v-if="rows.length" class="diff-table">
          <tbody>
            <tr v-for="(row, i) in rows" :key="i" :class="'r-' + row.kind">
              <td class="ln">{{ row.oldNo || '' }}</td>
              <td class="ln">{{ row.newNo || '' }}</td>
              <td class="sign">{{ row.sign }}</td>
              <td class="code"><pre>{{ row.text }}</pre></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="diff-empty">
          <i class="fa-solid fa-file-circle-plus text-2xl text-slate-300 mb-2"></i>
          <p>{{ newText ? '新建文件 / 全量写入' : '无可展示的 diff 内容' }}</p>
        </div>
      </div>

      <!-- footer -->
      <div class="diff-foot">
        <p class="diff-hint">
          <i class="fa-solid fa-shield-halved text-slate-400"></i>
          确认后才会真正写入磁盘；拒绝则不改动此文件。
        </p>
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost" @click="onReject">
            <i class="fa-solid fa-xmark"></i> 拒绝
          </button>
          <button class="btn btn-primary" @click="onApprove">
            <i class="fa-solid fa-check"></i> 接受改动
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// props 从 request_permission 的 toolCall.content[diff] 拆出：path / oldText / newText。
const props = defineProps({
  filePath: { type: String, default: '' },
  oldText: { type: String, default: '' },
  newText: { type: String, default: '' },
});
const emit = defineEmits(['approve', 'reject']);

// 极简行级 LCS diff：够用来在弹窗里高亮增删，不引第三方库。
function diffLines(a, b) {
  const A = (a || '').split('\n');
  const B = (b || '').split('\n');
  const n = A.length, m = B.length;
  // LCS 动态规划表
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0, oldNo = 1, newNo = 1;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ kind: 'ctx', sign: ' ', text: A[i], oldNo: oldNo++, newNo: newNo++ });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: 'del', sign: '-', text: A[i], oldNo: oldNo++, newNo: '' });
      i++;
    } else {
      out.push({ kind: 'add', sign: '+', text: B[j], oldNo: '', newNo: newNo++ });
      j++;
    }
  }
  while (i < n) out.push({ kind: 'del', sign: '-', text: A[i++], oldNo: oldNo++, newNo: '' });
  while (j < m) out.push({ kind: 'add', sign: '+', text: B[j++], oldNo: '', newNo: newNo++ });
  return out;
}

const rows = computed(() => {
  if (!props.newText && !props.oldText) return [];
  return diffLines(props.oldText, props.newText);
});
const addCount = computed(() => rows.value.filter((r) => r.kind === 'add').length);
const delCount = computed(() => rows.value.filter((r) => r.kind === 'del').length);

const onApprove = () => emit('approve');
const onReject = () => emit('reject');
</script>

<style scoped>
.diff-overlay {
  position: fixed; inset: 0; z-index: 8000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  padding: 24px;
}
.diff-card {
  width: min(920px, 100%);
  max-height: 82vh;
  display: flex; flex-direction: column;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
  overflow: hidden;
}
.diff-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ui-brand-soft);
}
.diff-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; color: var(--ui-brand-dark);
  background: hsl(var(--primary) / 10%);
  padding: 3px 9px; border-radius: 999px; white-space: nowrap;
}
.diff-path {
  font-size: 12.5px; color: var(--ui-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.diff-stat { font-size: 12px; font-family: ui-monospace, monospace; white-space: nowrap; }
.diff-stat .add { color: #16a34a; margin-right: 8px; }
.diff-stat .del { color: #dc2626; }
.diff-body {
  flex: 1; overflow: auto;
  background: var(--ui-ink);
}
.diff-table { width: 100%; border-collapse: collapse; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; }
.diff-table td { padding: 0 8px; vertical-align: top; }
.diff-table .ln { color: var(--ui-text-2); text-align: right; user-select: none; width: 40px; }
.diff-table .sign { color: var(--ui-text-3); width: 12px; text-align: center; user-select: none; }
.diff-table .code pre { margin: 0; white-space: pre-wrap; word-break: break-word; color: var(--ui-line-2); }
.r-add { background: rgba(22, 163, 74, 0.18); }
.r-add .code pre { color: #bbf7d0; }
.r-del { background: rgba(220, 38, 38, 0.16); }
.r-del .code pre { color: #fecaca; }
.diff-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 200px; color: var(--ui-text-3); font-size: 13px;
}
.diff-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 12px 16px; border-top: 1px solid var(--ui-brand-soft);
}
.diff-hint { font-size: 12px; color: var(--ui-text-3); display: flex; align-items: center; gap: 6px; margin: 0; }
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 9px; font-size: 13px; font-weight: 500;
  cursor: pointer; border: none; transition: background 0.15s;
}
.btn-ghost { background: var(--ui-bg-2); color: var(--ui-text); }
.btn-ghost:hover { background: var(--ui-line-2); }
.btn-primary { background: var(--ui-brand); color: #fff; }
.btn-primary:hover { background: var(--ui-brand-dark); }
</style>
