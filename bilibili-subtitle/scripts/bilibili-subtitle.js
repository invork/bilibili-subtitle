const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

function fetch(urlStr, options = {}) {
  const url = new URL(urlStr);
  const mod = url.protocol === 'https:' ? https : http;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://www.bilibili.com',
    ...options.headers,
  };

  return new Promise((resolve, reject) => {
    const req = mod.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Failed to parse response')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractBvid(input) {
  const match = input.match(/BV[\w]+/i);
  return match ? match[0] : input;
}

async function getVideoInfo(bvid, cookie) {
  const headers = { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com' };
  if (cookie) headers['Cookie'] = cookie;

  const r = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, { headers });
  if (r.code !== 0) throw new Error(r.message || 'Failed to get video info');
  return r.data;
}

async function getPlayerInfo(bvid, cid, cookie) {
  const headers = { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com' };
  if (cookie) headers['Cookie'] = cookie;

  const r = await fetch(`https://api.bilibili.com/x/player/v2?bvid=${bvid}&cid=${cid}`, { headers });
  if (r.code !== 0) throw new Error(r.message || 'Failed to get player info');
  return r.data;
}

async function getSubtitleContent(url, cookie) {
  const fullUrl = url.startsWith('//') ? `https:${url}` : url;
  const headers = { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com' };
  if (cookie) headers['Cookie'] = cookie;

  const r = await fetch(fullUrl, { headers });
  return r.body?.map(item => item.content).join('\n') || '';
}

async function main() {
  const args = process.argv.slice(2);
  const input = args.find(a => !a.startsWith('--'));
  const cookieArg = args.find(a => a.startsWith('--cookie='));
  const outputArg = args.find(a => a.startsWith('--output='));

  if (!input) {
    console.error('Usage: node scripts/bilibili-subtitle.js <url-or-bvid> [--cookie=SESSDATA=xxx]');
    console.error('');
    console.error('Options:');
    console.error('  --cookie=SESSDATA=xxx   Bilibili cookie for AI subtitles');
    console.error('  --output=file.md        Save subtitles to markdown file');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/bilibili-subtitle.js BV1GJ411x7h7');
    console.error('  node scripts/bilibili-subtitle.js https://www.bilibili.com/video/BV1GJ411x7h7');
    console.error('  node scripts/bilibili-subtitle.js BV1GJ411x7h7 --cookie=SESSDATA=xxxx');
    process.exit(1);
  }

  const cookie = cookieArg ? cookieArg.split('=').slice(1).join('=') : '';

  try {
    const bvid = extractBvid(input);
    const videoInfo = await getVideoInfo(bvid, cookie);
    const { cid, title, pages } = videoInfo;

    console.error(`Title: ${title}`);
    console.error(`Video has ${pages.length} parts`);

    const playerInfo = await getPlayerInfo(bvid, cid, cookie);
    const subtitles = playerInfo.subtitle?.subtitles || [];

    if (subtitles.length === 0) {
      console.error('');
      console.error('No CC subtitles found. This video may have AI-generated subtitles.');
      console.error('To access AI subtitles, provide your cookie:');
      console.error('  node scripts/bilibili-subtitle.js ' + bvid + ' --cookie=SESSDATA=xxxx');
      console.error('');
      console.error('To get your cookie:');
      console.error('  1. Login to bilibili.com in your browser');
      console.error('  2. Open DevTools → Application → Cookies');
      console.error('  3. Copy the SESSDATA value');
      process.exit(1);
    }

    console.error(`Found ${subtitles.length} subtitle(s):`);
    for (const sub of subtitles) {
      console.error(`  - ${sub.lan_doc || sub.lan} (${sub.subtitle_url})`);
    }

    const sub = subtitles[0];
    const content = await getSubtitleContent(sub.subtitle_url, cookie);
    if (outputArg) {
      const outputPath = outputArg.split('=').slice(1).join('=');
      const absolutePath = path.resolve(outputPath);
      const markdownContent = `# ${title}\n\n${content || 'No subtitle content'}`;
      fs.writeFileSync(absolutePath, markdownContent, 'utf8');
      console.error(`Subtitles saved to ${absolutePath}`);
    } else {
      console.log(content || 'No subtitle content');
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();
