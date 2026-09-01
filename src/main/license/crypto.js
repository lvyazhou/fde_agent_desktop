/**
 * license 加解密 + 验签(验签端 / 运行时)。
 * 与签发端 license-toolkit/signer.js 的 canonicalize / AES-GCM 实现必须字节一致。
 *
 * 存储格式:
 *   .lic      = base64( nonce[12] ‖ ciphertext ‖ tag[16] )     (AES-256-GCM 外层)
 *   inner_blob= canonical(payload) ‖ 0x00 ‖ ed25519_sig         (解密后)
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEYS_DIR = path.join(__dirname, 'keys');
const SEP = 0x00;

function keysDir() {
  // 打包后优先用 resources/license-keys(extraResources,asar 外,二进制读取可靠);
  // 开发或未找到时回退源码目录 src/main/license/keys。
  const candidates = [
    process.resourcesPath ? path.join(process.resourcesPath, 'license-keys') : null,
    KEYS_DIR,
  ].filter(Boolean);
  for (const d of candidates) {
    if (fs.existsSync(path.join(d, 'aes.key'))) return d;
  }
  return KEYS_DIR;
}

function loadAesKey() {
  return fs.readFileSync(path.join(keysDir(), 'aes.key')); // 32 字节
}
function loadPublicKeyPem() {
  return fs.readFileSync(path.join(keysDir(), 'public_key.pem'));
}

// 递归按 key 排序 → 稳定序列化(无多余空格,UTF-8)
function sortDeep(obj) {
  if (Array.isArray(obj)) return obj.map(sortDeep);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj).sort()) out[k] = sortDeep(obj[k]);
    return out;
  }
  return obj;
}
function canonicalize(payload) {
  return Buffer.from(JSON.stringify(sortDeep(payload)), 'utf-8');
}

// AES-256-GCM 解密:输入 base64(nonce ‖ ct ‖ tag) → 明文 Buffer
function aesGcmDecrypt(licB64) {
  const raw = Buffer.from(licB64.toString('utf-8').trim(), 'base64');
  const nonce = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const ct = raw.subarray(12, raw.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', loadAesKey(), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]); // 篡改会在 final 抛错
}

// 解密 .lic → { payload, signature }
function decryptLicense(licBytes) {
  const inner = aesGcmDecrypt(licBytes);
  const sepIdx = inner.indexOf(SEP);
  if (sepIdx < 0) throw new Error('inner blob 无分隔符');
  const canon = inner.subarray(0, sepIdx);
  const sig = inner.subarray(sepIdx + 1);
  return { payload: JSON.parse(canon.toString('utf-8')), signature: sig };
}

// Ed25519 验签:对 canonical(payload) 验 sig,返回 bool
function verifyPayload(payload, signature) {
  const pub = crypto.createPublicKey(loadPublicKeyPem());
  return crypto.verify(null, canonicalize(payload), pub, signature);
}

function pubkeyFingerprint() {
  return 'sha256:' + crypto.createHash('sha256').update(loadPublicKeyPem()).digest('hex');
}

module.exports = { canonicalize, aesGcmDecrypt, decryptLicense, verifyPayload, pubkeyFingerprint, keysDir, loadAesKey };
