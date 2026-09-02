// Shared image preparation for chat attachments.
//
// Large photos (phone captures are commonly 1–5MB) break the vision path: the
// ACP image block has NO server-side size cap, so a multi-MB base64 payload
// (base64 inflates ~33%) either times out the upstream request or is rejected
// by the endpoint, and the model "can't see" the picture. Downscale the long
// edge to <=IMAGE_MAX_EDGE and re-encode as JPEG so any image sends small
// enough to be seen. Small images (already under the byte budget) pass through
// untouched so screenshots keep their exact pixels.
//
// Used by useChatComposer.js and the inline chat inputs in ChatPanel.vue /
// WelcomeHero.vue — keep a single copy here so the three don't drift.

const IMAGE_MAX_EDGE = 1600;
const IMAGE_TARGET_BYTES = 500 * 1024;

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Returns {data, media_type} — base64 (no `data:` prefix) plus the mime type
// actually produced. Falls back to the original bytes if the canvas path fails.
export async function prepareImage(file) {
  const origDataUrl = await fileToDataUrl(file);
  const origBase64 = String(origDataUrl).split(',')[1] || '';
  const origMime = file.type || 'image/png';

  // Small enough already, or a format we shouldn't recompress (GIF loses
  // animation, SVG is vector) → pass through as-is.
  const smallEnough = file.size <= IMAGE_TARGET_BYTES;
  const recompressable = /^image\/(png|jpe?g|webp|bmp)$/i.test(origMime);
  if (smallEnough || !recompressable) {
    return { data: origBase64, media_type: origMime };
  }

  try {
    const img = await loadImage(origDataUrl);
    let { width, height } = img;
    const longEdge = Math.max(width, height);
    if (longEdge > IMAGE_MAX_EDGE) {
      const scale = IMAGE_MAX_EDGE / longEdge;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    // Step quality down until under the target byte budget.
    let quality = 0.85;
    let out = canvas.toDataURL('image/jpeg', quality);
    while (out.length * 0.75 > IMAGE_TARGET_BYTES && quality > 0.4) {
      quality -= 0.15;
      out = canvas.toDataURL('image/jpeg', quality);
    }
    const outBase64 = out.split(',')[1] || '';
    // Guard against a pathological case where re-encoding grew the payload.
    if (outBase64 && outBase64.length < origBase64.length) {
      return { data: outBase64, media_type: 'image/jpeg' };
    }
  } catch (err) {
    console.warn('[imagePrep] compress failed, sending original', err);
  }
  return { data: origBase64, media_type: origMime };
}
