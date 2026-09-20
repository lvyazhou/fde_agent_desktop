// 按 slug 记录还没返回的 prompt；放模块级，离开项目页再回来（组件重建）也能接上这一轮。
const inflight = new Map();

export function trackPrompt(slug, info, promise) {
  const entry = { ...info, done: promise.then(() => {}, () => {}) };
  inflight.set(slug, entry);
  entry.done.then(() => { if (inflight.get(slug) === entry) inflight.delete(slug); });
}

export function getInflightPrompt(slug) {
  return inflight.get(slug) || null;
}
