---
name: bilibili-subtitle
description: Use when user wants to fetch, extract, or download subtitles/captions from Bilibili videos. Supports BV IDs and full URLs, outputs markdown.
---

# Bilibili Subtitle Fetcher

Fetch subtitles from Bilibili (B站) videos as markdown.

## Setup

```bash
cd {baseDir}
npm install
```

## Usage

```bash
node {baseDir}/scripts/bilibili-subtitle.js <url-or-bvid> [--cookie=SESSDATA=xxx] [--output=file.md]
```

Accepts BV ID or full URL:
- `BV1GJ411x7h7`
- `https://www.bilibili.com/video/BV1GJ411x7h7`

### Cookie for AI Subtitles

Most Bilibili videos use AI-generated subtitles, which require authentication.

```bash
# Auto get cookie (opens Edge for login)
node {baseDir}/scripts/get-bilibili-cookie.js

# Then use with subtitle fetcher
node {baseDir}/scripts/bilibili-subtitle.js BV1xxxxxx --cookie=SESSDATA=$(node {baseDir}/scripts/get-bilibili-cookie.js)
```

## Output

- **stdout**: Plain subtitle text (no timestamps)
- **stderr**: Video info, errors, instructions
- **--output**: Save subtitles to markdown file with proper formatting

## Notes

- CC subtitles work without cookie; AI subtitles require a valid SESSDATA cookie
- Cookie auto-get requires Microsoft Edge browser
- Supports proxy via `HTTPS_PROXY` / `HTTP_PROXY` environment variables
