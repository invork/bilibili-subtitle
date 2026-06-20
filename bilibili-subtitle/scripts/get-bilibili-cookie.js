const http = require('http');
const { exec, execSync } = require('child_process');
const net = require('net');
const crypto = require('crypto');
const { URL } = require('url');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DEBUG_PORT = 9222;
const BILIBILI_URL = 'https://www.bilibili.com';

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => { server.close(); resolve(true); });
    server.listen(port);
  });
}

// Fire-and-forget Edge launch, then poll until CDP port is ready (max 30s).
// Uses spawn with detached+unref so Edge runs independently — exec callback
// would hang forever because Edge as the main browser instance never exits.
async function launchAndWaitForCDP() {
  return new Promise((resolve, reject) => {
    const child = exec(
      `"${EDGE_PATH}" --remote-debugging-port=${DEBUG_PORT} ${BILIBILI_URL}`,
      (error) => {
        // Edge exiting early means it attached to an existing instance
        // (singleton model) — the CDP flag was ignored. That's not an error
        // from exec's perspective, but we'll detect it during polling.
      }
    );
    // Don't wait for the child process — Edge stays running
    child.unref();

    // Poll for CDP port to become available
    let attempts = 0;
    const maxAttempts = 30;
    const poll = setInterval(async () => {
      attempts++;
      if (await isCDPActive()) {
        clearInterval(poll);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(poll);
        reject(new Error('CDP port did not become available within 30s'));
      }
    }, 1000);
  });
}

async function launchEdge() {
  console.error('Launching Edge with debugging port...');
  await launchAndWaitForCDP();
}

async function restartEdgeWithCDP() {
  console.error('Closing all Edge processes...');
  try {
    execSync('taskkill /F /IM msedge.exe /T 2>nul', { stdio: 'ignore' });
  } catch (e) {
    // Ignore errors if Edge is not running
  }
  // Give processes a moment to fully exit
  await sleep(2000);

  console.error('Launching Edge with debugging port...');
  await launchAndWaitForCDP();
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    http.get({ hostname: parsed.hostname, port: parsed.port, path: parsed.pathname + parsed.search }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Parse error')); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createWebSocketFrame(data) {
  const payload = Buffer.from(JSON.stringify(data));
  const mask = crypto.randomBytes(4);
  let header;

  if (payload.length < 126) {
    header = Buffer.alloc(6);
    header[0] = 0x81;
    header[1] = 0x80 | payload.length;
    mask.copy(header, 2);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(8);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
    mask.copy(header, 4);
  } else {
    header = Buffer.alloc(14);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(payload.length, 6);
    mask.copy(header, 10);
  }

  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) {
    masked[i] = payload[i] ^ mask[i % 4];
  }

  return Buffer.concat([header, masked]);
}

function parseWebSocketFrame(buffer) {
  if (buffer.length < 2) return null;

  const opcode = buffer[0] & 0x0f;
  const masked = (buffer[1] & 0x80) !== 0;
  let payloadLength = buffer[1] & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    payloadLength = buffer.readUInt32BE(6);
    offset = 10;
  }

  if (masked) offset += 4;
  if (buffer.length < offset + payloadLength) return null;

  let payload = buffer.slice(offset, offset + payloadLength);
  if (masked) {
    const maskKey = buffer.slice(offset - 4, offset);
    for (let i = 0; i < payload.length; i++) {
      payload[i] = payload[i] ^ maskKey[i % 4];
    }
  }

  return { opcode, payload: payload.toString(), totalLength: offset + payloadLength };
}

async function getCookieViaWebSocket(wsUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(wsUrl);
    const key = crypto.randomBytes(16).toString('base64');

    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Key': key,
        'Sec-WebSocket-Version': '13'
      }
    });

    req.on('upgrade', (res, socket) => {
      let buffer = Buffer.alloc(0);
      let resolved = false;

      socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);

        while (buffer.length > 0) {
          const frame = parseWebSocketFrame(buffer);
          if (!frame) break;

          buffer = buffer.slice(frame.totalLength);

          if (frame.opcode === 1) {
            try {
              const msg = JSON.parse(frame.payload);
              if (msg.id === 1 && msg.result && msg.result.cookies) {
                const cookies = msg.result.cookies;
                const session = cookies.find(c => c.name === 'SESSDATA' && c.domain.includes('bilibili'));
                if (!resolved) {
                  resolved = true;
                  socket.end();
                  // Bilibili's server expects the decoded SESSDATA (with literal
                  // commas, not %2C). The percent-encoded form returns
                  // wrong/different AI subtitles than the decoded form.
                  resolve(session ? decodeURIComponent(session.value) : null);
                }
              }
            } catch {}
          }
        }
      });

      socket.on('error', () => { if (!resolved) { resolved = true; resolve(null); } });
      socket.on('close', () => { if (!resolved) { resolved = true; resolve(null); } });

      socket.write(createWebSocketFrame({ id: 1, method: 'Network.getAllCookies' }));
      setTimeout(() => { if (!resolved) { resolved = true; socket.end(); resolve(null); } }, 5000);
    });

    req.on('error', () => resolve(null));
    req.end();
  });
}

async function tryGetCookie() {
  try {
    const targets = await httpGet(`http://localhost:${DEBUG_PORT}/json`);
    const bilibiliPage = targets.find(t => t.type === 'page' && t.url.includes('bilibili'));
    if (!bilibiliPage || !bilibiliPage.webSocketDebuggerUrl) return null;

    return await getCookieViaWebSocket(bilibiliPage.webSocketDebuggerUrl);
  } catch {
    return null;
  }
}

async function waitForSESSDATA(maxWait = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const value = await tryGetCookie();
    if (value) return value;
    await sleep(2000);
  }
  return null;
}

async function isCDPActive() {
  try {
    await httpGet(`http://localhost:${DEBUG_PORT}/json/version`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const cdpActive = await isCDPActive();

  if (cdpActive) {
    console.error('Edge is running with debugging port.');
  } else {
    console.error('Edge not running with debugging port.');
    
    // Check if Edge is already running without CDP
    let edgeRunning = false;
    try {
      const result = execSync('tasklist /FI "IMAGENAME eq msedge.exe" /NH', { encoding: 'utf8' });
      edgeRunning = result.includes('msedge.exe');
    } catch (e) {
      // Ignore errors in tasklist command
    }
    
    if (edgeRunning) {
      console.error('Edge is already running without CDP port.');
      console.error('Closing Edge and restarting with debugging port...');
      await restartEdgeWithCDP();
    } else {
      await launchEdge();
    }
    console.error('Edge is ready with CDP port.');
  }

  console.error('Waiting for SESSDATA cookie...');
  console.error('If not logged in, please login to bilibili.com in the Edge window.');
  const sessdata = await waitForSESSDATA();

  if (sessdata) {
    console.log(sessdata);
  } else {
    console.error('Timeout: SESSDATA not found. Make sure you are logged in to bilibili.com.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
