#!/usr/bin/env node
/**
 * spike-acp.js — ACP integration smoke test
 *
 * Spawns hermes-acp, sends initialize + session/new + session/prompt,
 * and prints streaming notifications. Used to verify that the ACP
 * protocol works before building the full Electron UI.
 *
 * Usage:
 *   node scripts/spike-acp.js
 *
 * Prerequisites:
 *   - hermes-agent installed with ACP extra: pip install hermes-agent[acp]
 *   - API key configured in ~/.product-lobster/.env
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PRODUCT_LOBSTER_HOME = path.join(os.homedir(), '.product-lobster');
const PROJECTS_DIR = path.join(PRODUCT_LOBSTER_HOME, 'projects');
const SPIKE_PROJECT_DIR = path.join(PROJECTS_DIR, 'spike-test');

// Ensure directories exist
for (const dir of [PRODUCT_LOBSTER_HOME, PROJECTS_DIR, SPIKE_PROJECT_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Find hermes-acp
function findHermesAcp() {
  const hermesAgentDir = path.resolve(__dirname, '..', '..', 'hermes-agent');
  const ext = process.platform === 'win32' ? 'Scripts' : 'bin';
  const exe = process.platform === 'win32' ? 'hermes-acp.exe' : 'hermes-acp';
  const venvPath = path.join(hermesAgentDir, '.venv', ext, exe);
  if (fs.existsSync(venvPath)) return venvPath;
  return 'hermes-acp';
}

const command = findHermesAcp();
console.log(`[spike] Using hermes-acp: ${command}`);
console.log(`[spike] HERMES_HOME: ${PRODUCT_LOBSTER_HOME}`);
console.log(`[spike] Project dir: ${SPIKE_PROJECT_DIR}`);

// Spawn hermes-acp
const proc = spawn(command, [], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, HERMES_HOME: PRODUCT_LOBSTER_HOME },
  ...(process.platform === 'win32' ? { windowsHide: true } : {}),
});

proc.stderr.on('data', (d) => process.stderr.write(`[hermes:stderr] ${d}`));

// Simple JSON-RPC client
let nextId = 1;
const pending = new Map();
let buffer = '';

proc.stdout.setEncoding('utf-8');
proc.stdout.on('data', (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id != null && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.id == null) {
        handleNotification(msg);
      }
    } catch (e) {
      console.error('[spike] Non-JSON line:', line);
    }
  }
});

function request(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const frame = JSON.stringify({ jsonrpc: '2.0', id, method, params: params || {} }) + '\n';
    pending.set(id, { resolve, reject });
    proc.stdin.write(frame);
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }
    }, 120_000);
  });
}

let fullResponse = '';

function handleNotification(msg) {
  const params = msg.params || {};
  // ACP notifications: {sessionId, update: {sessionUpdate, content, ...}}
  const update = params.update || params;
  const updateType = update.sessionUpdate || params.sessionUpdate;

  if (updateType === 'agent_message_chunk') {
    const text = update.content?.text || '';
    process.stdout.write(text);
    fullResponse += text;
  } else if (updateType === 'tool_call_start') {
    console.log(`\n[tool] Starting: ${update.title || update.kind || 'unknown'}`);
  } else if (updateType === 'tool_call_progress') {
    console.log(`[tool] ${update.status || 'progress'}: ${update.title || ''}`);
  } else if (updateType === 'usage_update') {
    console.log(`[usage] context: ${update.used}/${update.size}`);
  } else if (updateType === 'agent_thought_chunk') {
    // Thinking tokens — optionally display
    const text = update.content?.text || '';
    process.stderr.write(text);
  } else if (updateType) {
    console.log(`[notification] ${updateType}:`, JSON.stringify(params).slice(0, 120));
  }
}

async function main() {
  try {
    // Step 1: Initialize
    console.log('\n=== Step 1: initialize ===');
    const initResult = await request('initialize', {
      protocolVersion: 1,
      clientInfo: { name: 'spike-test', version: '1.0.0' },
    });
    console.log('Initialize OK:', JSON.stringify(initResult).slice(0, 200));

    // Step 2: New session
    console.log('\n=== Step 2: session/new ===');
    const sessionResult = await request('session/new', { cwd: SPIKE_PROJECT_DIR, mcpServers: [] });
    const sessionId = sessionResult.sessionId;
    console.log('Session created:', sessionId);

    // Step 3: Prompt (simple test — don't invoke skill yet)
    console.log('\n=== Step 3: session/prompt (simple test) ===');
    console.log('[AI response]:');
    const promptResult = await request('session/prompt', {
      sessionId,
      prompt: [{ type: 'text', text: '你好，请用一句话介绍你自己。' }],
    });
    console.log('\n\n[prompt result]:', JSON.stringify(promptResult).slice(0, 200));

    console.log('\n\n=== Spike test PASSED ===');
    console.log('Full response length:', fullResponse.length, 'chars');

  } catch (err) {
    console.error('\n=== Spike test FAILED ===');
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    // Cleanup
    proc.stdin.end();
    setTimeout(() => {
      try { proc.kill(); } catch (_) {}
      process.exit(process.exitCode || 0);
    }, 3000);
  }
}

proc.on('error', (err) => {
  console.error(`[spike] Failed to start hermes-acp: ${err.message}`);
  console.error('[spike] Make sure hermes-agent is installed: pip install hermes-agent[acp]');
  process.exit(1);
});

// Give hermes-acp a moment to start up
setTimeout(main, 1000);
