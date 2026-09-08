const { EventEmitter } = require('events');

const DEFAULT_TIMEOUT_MS = 120_000;

class AcpClient extends EventEmitter {
  constructor(childProcess, opts = {}) {
    super();
    this._proc = childProcess;
    this._nextId = 1;
    this._pending = new Map(); // id → { resolve, reject, timer }
    this._notificationHandler = null;
    this._requestHandlers = new Map(); // method → async handler(params)
    this._buffer = '';
    this._defaultTimeout = opts.timeout || DEFAULT_TIMEOUT_MS;

    // Stderr → console only (hermes uses stderr for logging)
    this._proc.stderr.on('data', (chunk) => {
      console.error(`[hermes:stderr] ${chunk.toString().trimEnd()}`);
    });

    // Stdout → newline-delimited JSON protocol
    this._proc.stdout.setEncoding('utf-8');
    this._proc.stdout.on('data', (chunk) => {
      this._buffer += chunk;
      this._drainBuffer();
    });

    this._proc.on('error', (err) => {
      console.error('[acp-client] Process error:', err.message);
      this._rejectAll(err);
    });

    this._proc.on('exit', (code, signal) => {
      console.log(`[acp-client] Process exited (code=${code}, signal=${signal})`);
      this._rejectAll(new Error(`hermes-acp exited (code=${code}, signal=${signal})`));
    });
  }

  request(method, params, timeoutMs) {
    const id = this._nextId++;
    const timeout = timeoutMs || this._defaultTimeout;

    return new Promise((resolve, reject) => {
      const frame = JSON.stringify({ jsonrpc: '2.0', id, method, params: params || {} }) + '\n';

      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(new Error(`ACP request "${method}" timed out after ${timeout}ms`));
      }, timeout);

      this._pending.set(id, { resolve, reject, timer });

      try {
        this._proc.stdin.write(frame);
      } catch (err) {
        this._pending.delete(id);
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  notify(method, params) {
    const frame = JSON.stringify({ jsonrpc: '2.0', method, params: params || {} }) + '\n';
    try {
      this._proc.stdin.write(frame);
    } catch (err) {
      console.error('[acp-client] Failed to send notification:', err.message);
    }
  }

  onNotification(handler) {
    this._notificationHandler = handler;
  }

  /**
   * Register a handler for server → client RPC requests (reverse RPC).
   * The handler receives (params) and should return a result or throw an error.
   * Used for: request_permission, sampling/createMessage, etc.
   */
  onRequest(method, handler) {
    this._requestHandlers.set(method, handler);
  }

  shutdown() {
    return new Promise((resolve) => {
      try {
        this._proc.stdin.end();
      } catch (_) { /* ignore */ }

      const killTimer = setTimeout(() => {
        try {
          this._proc.kill('SIGKILL');
        } catch (_) { /* ignore */ }
        resolve();
      }, 3000);

      this._proc.on('exit', () => {
        clearTimeout(killTimer);
        resolve();
      });
    });
  }

  // --- Internal ---

  _drainBuffer() {
    let newlineIdx;
    while ((newlineIdx = this._buffer.indexOf('\n')) !== -1) {
      const line = this._buffer.slice(0, newlineIdx).trim();
      this._buffer = this._buffer.slice(newlineIdx + 1);
      if (!line) continue;
      this._handleLine(line);
    }
  }

  _handleLine(line) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (err) {
      console.error('[acp-client] Non-JSON line from stdout:', line);
      return;
    }

    // Case 1: Response to a pending client → server request
    if (msg.id != null && this._pending.has(msg.id)) {
      const { resolve, reject, timer } = this._pending.get(msg.id);
      this._pending.delete(msg.id);
      clearTimeout(timer);

      if (msg.error) {
        reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      } else {
        resolve(msg.result);
      }
      return;
    }

    // Case 2: Server → client RPC request (has id + method, but id NOT in pending)
    if (msg.id != null && msg.method) {
      this._handleReverseRequest(msg);
      return;
    }

    // Case 3: Server-initiated notification (no id field)
    if (msg.id == null) {
      if (this._notificationHandler) {
        try {
          this._notificationHandler(msg);
        } catch (err) {
          console.error('[acp-client] Notification handler error:', err);
        }
      }
      return;
    }

    // Stale or unexpected message
    console.warn('[acp-client] Received response for unknown id:', msg.id);
  }

  async _handleReverseRequest(msg) {
    const { id, method, params } = msg;
    const handler = this._requestHandlers.get(method);

    if (!handler) {
      // No handler registered — send error response back
      console.warn(`[acp-client] No handler for reverse RPC: ${method}`);
      this._sendResponse(id, null, { code: -32601, message: `Method not found: ${method}` });
      return;
    }

    try {
      const result = await handler(params || {});
      this._sendResponse(id, result, null);
    } catch (err) {
      this._sendResponse(id, null, { code: -32000, message: err.message || 'Handler error' });
    }
  }

  _sendResponse(id, result, error) {
    const frame = error
      ? JSON.stringify({ jsonrpc: '2.0', id, error }) + '\n'
      : JSON.stringify({ jsonrpc: '2.0', id, result: result ?? null }) + '\n';
    try {
      this._proc.stdin.write(frame);
    } catch (err) {
      console.error('[acp-client] Failed to send response:', err.message);
    }
  }

  _rejectAll(err) {
    for (const [id, entry] of this._pending) {
      clearTimeout(entry.timer);
      entry.reject(err);
    }
    this._pending.clear();
  }
}

module.exports = AcpClient;
