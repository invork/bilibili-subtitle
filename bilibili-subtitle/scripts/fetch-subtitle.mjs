import { request } from 'undici';
import { writeFileSync } from 'fs';

const cookie = 'SESSDATA=9084012a,1797684972,f1ea0*62CjAEQeIAVbvCFlDj5E8nEoBnS9Ov8hax3ogv0bO8Vb0bGpHZOapwhCGQF_toVODc0i8SVmlWdWE5dkNSeUFXNVN2Xy1od0F0Zjh5NEdVNDVHM21EMUxsazhFYnNjUFlkOWZXS080ZFZSZzVNVkY2YWtLWGFOZ3dEOEZKVm50aVRPTERLUTZyS3BBIIEC';
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://www.bilibili.com',
  'Cookie': cookie
};

for (let attempt = 1; attempt <= 10; attempt++) {
  const { body: playerBody } = await request('https://api.bilibili.com/x/player/v2?bvid=BV1Nu4m1G7SK&cid=1466113804', { headers });
  const playerData = await playerBody.json();
  const subtitleUrl = playerData.data.subtitle.subtitles[0]?.subtitle_url;
  
  if (!subtitleUrl) {
    console.log('Attempt ' + attempt + ': No subtitle URL');
    continue;
  }
  
  const fullUrl = subtitleUrl.startsWith('//') ? 'https:' + subtitleUrl : subtitleUrl;
  
  try {
    const { body } = await request(fullUrl);
    const data = await body.json();
    const firstContent = data.body[0]?.content || '';
    const totalEntries = data.body?.length || 0;
    const contentStr = data.body.map(e => e.content).join('');
    const hasCorrectContent = contentStr.includes('柏格森') || contentStr.includes('绵延') || contentStr.includes('记忆') || contentStr.includes('时间哲学');
    
    console.log('Attempt ' + attempt + ': ' + totalEntries + ' entries, first: ' + firstContent.substring(0, 40) + '..., correct: ' + hasCorrectContent);
    
    if (hasCorrectContent && totalEntries > 10) {
      const title = '【时间哲学】柏格森的"绵延"理论与"记忆本体论"';
      const markdown = '# ' + title + '\n\n' + data.body.map(e => e.content).join('\n');
      writeFileSync('D:\\project\\柏格森绵延理论字幕.md', markdown, 'utf8');
      console.log('Saved correct content!');
      break;
    }
  } catch (e) {
    console.log('Attempt ' + attempt + ': Error - ' + e.message);
  }
}
