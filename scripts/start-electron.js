const { spawn } = require('child_process');
const path = require('path');

// Remove the environment variable that forces Electron into Node.js mode
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

// Find the electron executable
const electronPath = require('electron');

console.log('[launcher] Starting Electron with clean environment...');

const child = spawn(electronPath, ['.'], {
  env,
  stdio: 'inherit',
  windowsHide: false
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
