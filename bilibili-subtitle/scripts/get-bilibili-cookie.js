import { request } from 'undici';
import WebSocket from 'ws';
import { exec, execSync } from 'child_process';
import net from 'net';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DEBUG_PORT = 9222;
const BILIBILI_URL = 'https://www.bilibili.com';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function launchAndWaitForCDP() {
  return new Promise((resolve, reject) => {
    const child = exec(
      `"${EDGE_PATH}" --remote-debugging-port=${DEBUG_PORT} ${BILIBILI_URL}`,
      () => {}
    );
    child.unref();

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
  } catch (e) {}
  await sleep(2000);

  console.error('Launching Edge with debugging port...');
  await launchAndWaitForCDP();
}

async function getCookieViaWebSocket(wsUrl) {
  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    let resolved = false;

    const done = (value) => {
      if (!resolved) {
        resolved = true;
        ws.close();
        resolve(value);
      }
    };

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Network.getAllCookies' }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.id === 1 && msg.result?.cookies) {
          const session = msg.result.cookies.find(
            c => c.name === 'SESSDATA' && c.domain.includes('bilibili')
          );
          done(session ? decodeURIComponent(session.value) : null);
        }
      } catch {}
    });

    ws.on('error', () => done(null));
    ws.on('close', () => done(null));

    setTimeout(() => done(null), 5000);
  });
}

async function tryGetCookie() {
  try {
    const { body } = await request(`http://localhost:${DEBUG_PORT}/json`);
    const targets = await body.json();
    const bilibiliPage = targets.find(t => t.type === 'page' && t.url.includes('bilibili'));
    if (!bilibiliPage?.webSocketDebuggerUrl) return null;
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
    await request(`http://localhost:${DEBUG_PORT}/json/version`);
    return true;
  } catch {
    return false;
  }
}

const cdpActive = await isCDPActive();

if (cdpActive) {
  console.error('Edge is running with debugging port.');
} else {
  console.error('Edge not running with debugging port.');

  let edgeRunning = false;
  try {
    const result = execSync('tasklist /FI "IMAGENAME eq msedge.exe" /NH', { encoding: 'utf8' });
    edgeRunning = result.includes('msedge.exe');
  } catch (e) {}

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
