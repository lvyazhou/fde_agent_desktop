#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, '..', 'src', 'main', 'license', 'keys');
const aesPath = path.join(keysDir, 'aes.key');
const publicPath = path.join(keysDir, 'public_key.pem');

if (!fs.existsSync(aesPath)) {
  console.error(`[license-keys] 缺少 ${aesPath}`);
  process.exit(1);
}
if (!fs.existsSync(publicPath)) {
  console.error(`[license-keys] 缺少 ${publicPath}`);
  process.exit(1);
}
const aesSize = fs.statSync(aesPath).size;
if (aesSize !== 32) {
  console.error(`[license-keys] aes.key 应为 32 字节，实际 ${aesSize} 字节`);
  process.exit(1);
}
console.log(`[license-keys] OK: aes.key=${aesSize} bytes, public_key.pem=${fs.statSync(publicPath).size} bytes`);
