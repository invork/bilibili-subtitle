---
name: bilibili-subtitle
description: Use when user wants to fetch, extract, or download subtitles/captions from Bilibili videos. Supports BV IDs and full URLs, outputs plain text.
---

# Bilibili Subtitle Fetcher

Fetch subtitles from Bilibili (B站) videos as plain text.

## When to Use

- User wants to get subtitles from a Bilibili video
- User provides a BV ID (e.g., `BV1GJ411x7h7`) or full URL
- User wants to extract video transcript for analysis, translation, or study

## Quick Start

```bash
node scripts/bilibili-subtitle.js <url-or-bvid> [--cookie=SESSDATA=xxx]
```

## Examples

```bash
# Basic usage (CC subtitles)
node scripts/bilibili-subtitle.js BV1GJ411x7h7
node scripts/bilibili-subtitle.js https://www.bilibili.com/video/BV1GJ411x7h7

# With cookie for AI subtitles
node scripts/bilibili-subtitle.js BV1GJ411x7h7 --cookie=SESSDATA=xxxx
```

## Cookie for AI Subtitles

Most Bilibili videos use AI-generated subtitles, which require authentication.

### Auto Get Cookie (Recommended)

```bash
node scripts/get-bilibili-cookie.js
```

This script will:
1. Auto-launch Edge with debugging port
2. Wait for you to login to bilibili.com
3. Extract and output the decoded SESSDATA value

Then use it directly:
```bash
node scripts/bilibili-subtitle.js BV1xxxxxx --cookie=SESSDATA=$(node scripts/get-bilibili-cookie.js)
```

### Manual Get Cookie

1. Login to bilibili.com in browser
2. Open DevTools → Application → Cookies
3. Copy the `SESSDATA` value (check "Show decoded" if needed)

## Output

- **stdout**: Plain subtitle text (no timestamps)
- **stderr**: Video info, errors, instructions

## Implementation

The script (`scripts/bilibili-subtitle.js`) uses Bilibili's public API:
1. Fetches video info via `/x/web-interface/view`
2. Gets subtitle list via `/x/player/v2`
3. Downloads subtitle content from the returned URL

No external dependencies required (uses Node.js built-in `https`).
