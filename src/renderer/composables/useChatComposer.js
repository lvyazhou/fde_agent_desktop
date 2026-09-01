// Shared chat-composer multimodal logic: image upload, file upload, voice input.
//
// Each chat input area creates its own instance via useChatComposer(). It owns an
// `attachments` ref and returns the pick/record handlers plus recording UI state.
// The attachments array uses the same shape the main process expects in
// hermes:prompt — {type:'image'|'file', data?, text?, media_type, name} — so send
// handlers just pass `attachments.value` straight through to window.api.hermes.prompt.
import { ref, onBeforeUnmount } from 'vue';

// ACP embedded-resource cap is 512KB on the server side; keep uploads within it so
// text/binary resources pass through whole rather than being truncated/omitted.
const MAX_FILE_BYTES = 512 * 1024;
const MIN_RECORD_MS = 800;

const TEXT_EXT = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'log', 'yaml', 'yml', 'xml', 'html', 'htm',
  'css', 'js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'go',
  'rs', 'rb', 'php', 'sh', 'sql', 'ini', 'conf', 'toml', 'env',
]);

function isTextFile(file) {
  const idx = file.name.lastIndexOf('.');
  const ext = idx >= 0 ? file.name.slice(idx + 1).toLowerCase() : '';
  return TEXT_EXT.has(ext) || (file.type || '').startsWith('text/');
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useChatComposer(options = {}) {
  const onTranscribe = options.onTranscribe; // (text) => void, fills the input box
  const getSlug = options.getSlug; // () => string | undefined, current project slug (optional)

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
          attachments.value.push({ type: 'image', data: base64, media_type: file.type || 'image/png', name: file.name });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const pickFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.markdown,.json,.csv,.log,.yaml,.yml,.xml,.html,.htm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.epub';
    input.multiple = true;
    input.onchange = async (e) => {
      for (const file of e.target.files) {
        if (file.size > MAX_FILE_BYTES) {
          alert(`「${file.name}」超过 ${Math.round(MAX_FILE_BYTES / 1024)}KB，已跳过`);
          continue;
        }
        if (isTextFile(file)) {
          const text = await file.text();
          attachments.value.push({ type: 'file', text, media_type: file.type || 'text/plain', name: file.name });
        } else {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const base64 = ev.target.result.split(',')[1];
            attachments.value.push({ type: 'file', data: base64, media_type: file.type || 'application/octet-stream', name: file.name });
          };
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  };

  const removeAttachment = (idx) => { attachments.value.splice(idx, 1); };
  const clearAttachments = () => { attachments.value = []; };

  // ===== Voice input: record → 360 ASR → onTranscribe(text) =====
  const recordingSupported = typeof window !== 'undefined'
    && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    && typeof window.MediaRecorder !== 'undefined';
  const isRecording = ref(false);
  const isTranscribing = ref(false);
  const recordSeconds = ref(0);
  let mediaRecorder = null;
  let mediaStream = null;
  let recordChunks = [];
  let recordTimer = null;
  let recordStartAt = 0;

  const stopTracks = () => {
    if (mediaStream) { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; }
    if (recordTimer) { clearInterval(recordTimer); recordTimer = null; }
  };

  // 识别失败时把录音落盘兜底，避免录音丢失；提示用户并可打开所在文件夹。
  const handleTranscribeFailure = async (base64, mime, errMsg) => {
    const reason = errMsg || '语音识别失败';
    if (!base64) { alert(reason); return; }
    const ext = (mime.split('/')[1] || 'webm').split(';')[0];
    let saved = null;
    try {
      saved = await window.api.hermes.saveRecording(getSlug?.() || '', base64, ext);
    } catch { /* ignore save errors, fall through to plain alert */ }
    if (saved?.success) {
      const open = confirm(`${reason}\n\n录音已保存到：\n${saved.filePath}\n\n点击“确定”打开所在文件夹。`);
      if (open) {
        try { await window.api.shell.openPath(saved.dirPath); } catch { /* ignore */ }
      }
    } else {
      alert(`${reason}（录音保存失败：${saved?.error || '未知错误'}）`);
    }
  };

  const toggleRecording = async () => {
    if (!recordingSupported) return;
    if (isRecording.value) { mediaRecorder?.stop(); return; }
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alert('无法访问麦克风，请检查权限设置');
      return;
    }
    recordChunks = [];
    try {
      mediaRecorder = new MediaRecorder(mediaStream);
    } catch {
      alert('当前环境不支持录音');
      stopTracks();
      return;
    }
    recordStartAt = performance.now();
    mediaRecorder.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) recordChunks.push(ev.data); };
    mediaRecorder.onstop = async () => {
      const durationMs = performance.now() - recordStartAt;
      const mime = mediaRecorder?.mimeType || 'audio/webm';
      stopTracks();
      isRecording.value = false;
      const blob = new Blob(recordChunks, { type: mime });
      if (durationMs < MIN_RECORD_MS || blob.size === 0) return;
      isTranscribing.value = true;
      let base64 = '';
      try {
        base64 = await blobToBase64(blob);
        const res = await window.api.hermes.transcribe(base64, mime);
        if (res?.success && res.text) {
          onTranscribe?.(res.text);
        } else {
          await handleTranscribeFailure(base64, mime, res?.error);
        }
      } catch (err) {
        await handleTranscribeFailure(base64, mime, err?.message);
      } finally {
        isTranscribing.value = false;
      }
    };
    mediaRecorder.start();
    isRecording.value = true;
    recordSeconds.value = 0;
    // 不限录音时长：只更新计时显示，由用户手动点停。
    recordTimer = setInterval(() => {
      recordSeconds.value = Math.floor((performance.now() - recordStartAt) / 1000);
    }, 250);
  };

  onBeforeUnmount(() => {
    try { if (mediaRecorder && isRecording.value) mediaRecorder.stop(); } catch { /* ignore */ }
    stopTracks();
  });

  return {
    attachments,
    pickImage,
    pickFile,
    removeAttachment,
    clearAttachments,
    recordingSupported,
    isRecording,
    isTranscribing,
    recordSeconds,
    toggleRecording,
  };
}
