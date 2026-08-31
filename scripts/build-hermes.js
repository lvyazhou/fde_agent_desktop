#!/usr/bin/env node
/**
 * 跨平台构建 hermes-acp 引擎(PyInstaller)。
 * 替代原 package.json 里写死 Windows 语法的 build:hermes。
 *
 * 用法: node scripts/build-hermes.js
 * 依赖: ../hermes-agent 下已建好 .venv 且装了 pyinstaller,存在 hermes-acp.spec
 * 产物: ../hermes-agent/dist/hermes-acp/  (electron-builder 的 extraResources 引用它)
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWin = process.platform === 'win32';
const hermesDir = path.resolve(__dirname, '..', '..', 'hermes-agent');
const venvBin = path.join(hermesDir, '.venv', isWin ? 'Scripts' : 'bin');
const pyinstaller = path.join(venvBin, isWin ? 'pyinstaller.exe' : 'pyinstaller');
const spec = path.join(hermesDir, 'hermes-acp.spec');

if (!fs.existsSync(hermesDir)) { console.error('[build-hermes] 找不到 hermes-agent 目录:', hermesDir); process.exit(1); }
if (!fs.existsSync(pyinstaller)) { console.error('[build-hermes] 找不到 pyinstaller,请先在 hermes-agent 建 .venv 并 pip install pyinstaller:', pyinstaller); process.exit(1); }
if (!fs.existsSync(spec)) { console.error('[build-hermes] 找不到 spec 文件:', spec); process.exit(1); }

console.log('[build-hermes] 构建引擎:', pyinstaller, spec);
const res = spawnSync(pyinstaller, ['hermes-acp.spec', '--noconfirm'], {
  cwd: hermesDir,
  stdio: 'inherit',
});
if (res.status !== 0) { console.error('[build-hermes] PyInstaller 构建失败,退出码', res.status); process.exit(res.status || 1); }

const out = path.join(hermesDir, 'dist', 'hermes-acp', isWin ? 'hermes-acp.exe' : 'hermes-acp');
if (!fs.existsSync(out)) { console.error('[build-hermes] 构建完成但未找到产物:', out); process.exit(1); }
console.log('[build-hermes] ✓ 引擎产物就绪:', out);
