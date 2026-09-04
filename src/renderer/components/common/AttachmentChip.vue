<template>
  <div class="relative group/att inline-flex flex-col">
    <div
      class="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-sm max-w-[240px] cursor-pointer hover:border-blue-300 transition-colors"
      @click="preview"
    >
      <i class="fa-solid text-sm shrink-0" :class="iconClass"></i>
      <span class="text-[12px] text-slate-600 truncate flex-1">{{ att.name || '附件' }}</span>
      <div class="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          class="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
          title="预览"
          @click.stop="preview"
        >
          <i class="fa-regular fa-eye text-[12px]"></i>
        </button>
        <button
          type="button"
          class="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
          :title="downloading ? '保存中…' : '下载'"
          @click.stop="download"
        >
          <i class="text-[12px]" :class="downloading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'"></i>
        </button>
      </div>
    </div>

    <!-- Text preview modal -->
    <transition name="att-fade">
      <div
        v-if="showText"
        class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-6"
        @click.self="showText = false"
      >
        <div class="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden" @click.stop>
          <div class="flex items-center gap-2 px-5 py-3 border-b border-slate-100 shrink-0">
            <i class="fa-solid text-sm" :class="iconClass"></i>
            <span class="text-[13px] font-semibold text-slate-700 truncate flex-1">{{ att.name || '文本预览' }}</span>
            <button type="button" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer" @click="showText = false">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <pre class="flex-1 overflow-auto px-5 py-4 text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap break-words font-mono">{{ att.text }}</pre>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  att: { type: Object, required: true },
});
const emit = defineEmits(['preview-image']);

const showText = ref(false);
const downloading = ref(false);

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];

function ext() {
  const n = props.att && props.att.name ? String(props.att.name) : '';
  const i = n.lastIndexOf('.');
  return i >= 0 ? n.slice(i + 1).toLowerCase() : '';
}

const isImage = computed(() => {
  const a = props.att || {};
  if (a.type === 'image') return true;
  if ((a.media_type || '').startsWith('image/')) return true;
  return IMAGE_EXT.includes(ext());
});

const iconClass = computed(() => {
  const e = ext();
  const mt = (props.att && props.att.media_type) || '';
  if (isImage.value) return 'fa-image text-purple-500';
  if (e === 'pdf' || mt.includes('pdf')) return 'fa-file-pdf text-rose-500';
  if (['doc', 'docx'].includes(e) || mt.includes('word')) return 'fa-file-word text-blue-500';
  if (['xls', 'xlsx', 'csv'].includes(e) || mt.includes('sheet') || mt.includes('excel')) return 'fa-file-excel text-emerald-600';
  if (['ppt', 'pptx'].includes(e) || mt.includes('presentation')) return 'fa-file-powerpoint text-orange-500';
  if (['zip', 'rar', '7z', 'gz', 'tar'].includes(e)) return 'fa-file-zipper text-amber-500';
  if (['js', 'ts', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'json', 'html', 'css', 'sh', 'vue', 'jsx', 'tsx'].includes(e)) return 'fa-file-code text-indigo-500';
  if (typeof (props.att && props.att.text) === 'string') return 'fa-file-lines text-blue-500';
  return 'fa-file text-slate-400';
});

function imageSrc() {
  const a = props.att || {};
  if (!a.data) return '';
  return 'data:' + (a.media_type || 'image/png') + ';base64,' + a.data;
}

async function preview() {
  const a = props.att || {};
  // Image file → hand off to the shared lightbox
  if (isImage.value && a.data) {
    emit('preview-image', imageSrc());
    return;
  }
  // Text/code → in-app modal
  if (typeof a.text === 'string') {
    showText.value = true;
    return;
  }
  // Binary (pdf/docx/...) → write temp file and open with system default app
  if (a.data) {
    try {
      const res = await window.api.hermes.saveAttachment({ name: a.name, data: a.data, toTemp: true });
      if (res && res.success && res.filePath) {
        await window.api.shell.openPath(res.filePath);
      } else {
        alert('无法预览该文件：' + ((res && res.error) || '未知错误'));
      }
    } catch (err) {
      alert('预览失败：' + (err && err.message ? err.message : String(err)));
    }
    return;
  }
  alert('该附件没有可预览的内容。');
}

async function download() {
  const a = props.att || {};
  if (!a.data && typeof a.text !== 'string') {
    alert('该附件没有可下载的内容。');
    return;
  }
  downloading.value = true;
  try {
    const res = await window.api.hermes.saveAttachment({
      name: a.name,
      ...(a.data ? { data: a.data } : { text: a.text }),
    });
    if (res && res.error) {
      alert('保存失败：' + res.error);
    }
  } catch (err) {
    alert('保存失败：' + (err && err.message ? err.message : String(err)));
  } finally {
    downloading.value = false;
  }
}
</script>

<style scoped>
.att-fade-enter-active,
.att-fade-leave-active {
  transition: opacity 0.15s ease;
}
.att-fade-enter-from,
.att-fade-leave-to {
  opacity: 0;
}
</style>
