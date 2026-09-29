#!/usr/bin/env node
// 打包前置校验：确认 hermes-acp 引擎（PyInstaller onedir）在 extraResources 的
// 来源路径就位。electron-builder 对缺失的 extraResources `from` 目录只警告不报错，
// 会静默产出一个没有引擎的 exe —— 打出来的包"智能体跑不起来"多半是这一步。
const fs = require('fs');
const path = require('path');

const isWin = process.platform === 'win32';
const exeName = isWin ? 'hermes-acp.exe' : 'hermes-acp';
const engineDir = path.resolve(__dirname, '..', '..', 'hermes-agent', 'dist', 'hermes-acp');
const exePath = path.join(engineDir, exeName);
// PyInstaller onedir：可执行文件 + _internal 运行时目录缺一不可。
// 只拷 hermes-acp.exe 不带 _internal 会直接启动失败。
const internalDir = path.join(engineDir, '_internal');

const problems = [];
if (!fs.existsSync(engineDir)) {
  problems.push(`找不到引擎目录：${engineDir}`);
} else {
  if (!fs.existsSync(exePath)) {
    problems.push(`缺少引擎可执行文件：${exePath}`);
  }
  if (!fs.existsSync(internalDir)) {
    problems.push(`缺少引擎运行时目录：${internalDir}（PyInstaller onedir 需要 exe 与 _internal 一起拷贝）`);
  }
}

if (problems.length) {
  console.error('[check-engine] 引擎缺失，终止打包：');
  for (const p of problems) console.error('  - ' + p);
  console.error('');
  console.error('引擎是平台相关二进制，必须在「当前系统」用 PyInstaller 重新构建：');
  console.error('  npm run build:hermes   （在 hermes-agent 下建好 .venv 并 pip install pyinstaller）');
  console.error('产物会落在 hermes-agent/dist/hermes-acp/，然后重新打包即可。');
  console.error('若你已有现成的 Windows 引擎，请把「hermes-acp.exe + _internal/」一起放到：');
  console.error(`  ${engineDir}`);
  process.exit(1);
}

console.log(`[check-engine] OK: ${exePath} + _internal/ 已就位`);
