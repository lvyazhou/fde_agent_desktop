/**
 * 跨平台机器指纹 SN(移植自参考实现 core/license/fingerprint.py)。
 *   - macOS : ioreg 取 IOPlatformUUID + IOPlatformSerialNumber(绑定主板,重启不变)
 *   - Windows: 注册表 MachineGuid + 主板 UUID(wmic / PowerShell 备选)
 *   - Linux  : /etc/machine-id + /sys/class/dmi/id/product_uuid
 * 加盐 → 排序去重 → SHA-256 截 32 位 → 前缀 SN-。只算不存,重启重算一致。
 */
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');

// 固定盐(本产品独立盐)
const SALT = Buffer.from('fde-prodesigner-2f8b41ce9a7d0e56b3', 'utf-8');
const LINUX_PATHS = ['/etc/machine-id', '/var/lib/dbus/machine-id', '/sys/class/dmi/id/product_uuid'];

function run(cmd, timeoutMs = 5000) {
  try { return execSync(cmd, { timeout: timeoutMs, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); }
  catch { return ''; }
}

function readMac() {
  const parts = [];
  const out = run('ioreg -rd1 -c IOPlatformExpertDevice');
  for (const key of ['IOPlatformUUID', 'IOPlatformSerialNumber']) {
    const m = out.match(new RegExp('"' + key + '"\\s*=\\s*"([^"]+)"'));
    if (m && m[1] && m[1] !== '0') parts.push(m[1]);
  }
  return parts;
}

function readWindows() {
  const parts = [];
  // 注册表 MachineGuid
  const reg = run('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid');
  const rm = reg.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/);
  if (rm) parts.push(rm[1].trim());
  // 主板 UUID(wmic → PowerShell 备选)
  let uuid = '';
  const wmic = run('wmic csproduct get UUID');
  const wl = wmic.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && l !== 'UUID');
  if (wl.length) uuid = wl[0];
  if (!uuid) {
    const ps = run('powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"');
    const v = ps.trim();
    if (v && v !== '00000000-00000000-00000000-00000000') uuid = v;
  }
  if (uuid) parts.push(uuid);
  return parts;
}

function readLinux() {
  const parts = [];
  for (const p of LINUX_PATHS) {
    try {
      const raw = fs.readFileSync(p, 'utf-8').trim();
      if (raw) parts.push(raw);
    } catch { /* skip */ }
  }
  return parts;
}

function computeSN() {
  const platform = os.platform();
  let parts;
  if (platform === 'darwin') parts = readMac();
  else if (platform === 'win32') parts = readWindows();
  else parts = readLinux();

  if (!parts || !parts.length) {
    throw new Error('FINGERPRINT_UNAVAILABLE: 无法读取任何机器标识');
  }
  const canon = Array.from(new Set(parts)).sort().join('|');
  const hash = crypto.createHash('sha256').update(SALT).update(canon, 'utf-8').digest('hex');
  return 'SN-' + hash.slice(0, 32);
}

module.exports = { computeSN };
