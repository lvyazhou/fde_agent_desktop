/**
 * 在线取证:向 claw 管控中心用企业授权码换取 .lic。
 * 只负责取回字节,校验与落盘仍走 verifier / store,断网或内网客户继续用「导入授权文件」兜底。
 */
const http = require('http');
const https = require('https');
const os = require('os');
const { URL } = require('url');
const { computeSN } = require('./fingerprint');

const TIMEOUT_MS = 15000;
const ACTIVATE_PATH = '/api/v1/fde/activate';

// 正式环境地址,可用环境变量 FDE_LICENSE_SERVER 或授权页手填覆盖
const DEFAULT_SERVER_URL = 'https://clawsec.mss.360.net';

function defaultServerUrl() {
  return process.env.FDE_LICENSE_SERVER || DEFAULT_SERVER_URL;
}

function postJson(endpoint, payload) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(endpoint);
    } catch {
      reject(new Error('授权服务地址格式不正确'));
      return;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      reject(new Error('授权服务地址必须是 http 或 https'));
      return;
    }

    const client = url.protocol === 'https:' ? https : http;
    const body = Buffer.from(JSON.stringify(payload), 'utf-8');
    const req = client.request(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8');
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch {
            reject(new Error(`授权服务返回异常 (HTTP ${res.statusCode})`));
            return;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );

    req.on('timeout', () => req.destroy(new Error('连接授权服务超时,请检查网络或服务地址')));
    req.on('error', (err) => reject(new Error(err.message || '无法连接授权服务')));
    req.end(body);
  });
}

function osUsername() {
  try {
    return os.userInfo().username;
  } catch {
    return '';
  }
}

/**
 * @param {{serverUrl?: string, secretKey: string, clientVersion?: string}} opts
 * @returns {Promise<{ sn: string, licenseBytes: Buffer, info: object }>}
 */
async function activateOnline(opts = {}) {
  const base = String(opts.serverUrl || defaultServerUrl() || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('未配置授权服务地址');

  const secretKey = String(opts.secretKey || '').trim();
  if (!secretKey) throw new Error('请填写企业授权码');

  const sn = computeSN();
  const { status, body } = await postJson(base + ACTIVATE_PATH, {
    secret_key: secretKey,
    machine_code: sn,
    hostname: os.hostname(),
    os_version: `${os.platform()} ${os.release()}`,
    os_username: osUsername(),
    client_version: opts.clientVersion || '',
  });

  if (body && typeof body.code === 'number' && body.code !== 0) {
    throw new Error(body.message || `激活失败 (HTTP ${status})`);
  }
  if (status !== 200) throw new Error(`激活失败 (HTTP ${status})`);

  const data = body && body.data;
  if (!data || !data.license_b64) throw new Error('授权服务未返回授权内容');

  // .lic 存的就是 base64 文本,这里不能再解一层
  return { sn, licenseBytes: Buffer.from(data.license_b64, 'utf-8'), info: data };
}

module.exports = { activateOnline, defaultServerUrl };
