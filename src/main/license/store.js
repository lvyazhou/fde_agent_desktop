/**
 * license 落盘 + 加密 meta(时钟防拨事实)。
 * 位置:<HERMES_HOME>/license/  { license.lic, license.meta.json(AES-GCM 加密) }
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadAesKey } = require('./crypto');

function homeDir() {
  return process.env.HERMES_HOME || path.join(os.homedir(), '.product-lobster');
}
function licenseDir() {
  return path.join(homeDir(), 'license');
}
function licPath() { return path.join(licenseDir(), 'license.lic'); }
function metaPath() { return path.join(licenseDir(), 'license.meta.json'); }

function ensureDir() { fs.mkdirSync(licenseDir(), { recursive: true }); }

// --- license 文件 ---
function hasLicense() { return fs.existsSync(licPath()); }
function readLicense() { return fs.existsSync(licPath()) ? fs.readFileSync(licPath()) : null; }
function saveLicense(bytes) {
  ensureDir();
  fs.writeFileSync(licPath(), bytes);
}

// --- 加密 meta(防止改文件绕过时钟防拨) ---
function encryptMeta(obj) {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', loadAesKey(), nonce);
  const ct = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(obj), 'utf-8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, ct, tag]).toString('base64');
}
function decryptMeta(b64) {
  const raw = Buffer.from(b64, 'base64');
  const nonce = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const ct = raw.subarray(12, raw.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', loadAesKey(), nonce);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(pt.toString('utf-8'));
}

function readMeta() {
  try {
    if (!fs.existsSync(metaPath())) return {};
    return decryptMeta(fs.readFileSync(metaPath(), 'utf-8'));
  } catch { return {}; } // 被篡改/损坏 → 视为空,后续逻辑会重新锚定
}
function writeMeta(obj) {
  ensureDir();
  fs.writeFileSync(metaPath(), encryptMeta(obj), 'utf-8');
}

module.exports = { licenseDir, licPath, metaPath, hasLicense, readLicense, saveLicense, readMeta, writeMeta };
