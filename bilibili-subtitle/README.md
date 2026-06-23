# Bilibili Subtitle Fetcher

Fetch subtitles from Bilibili (B站) videos as markdown.

## Features

- Supports BV ID and full URL input
- AI-generated subtitles with cookie authentication
- Proxy support via `HTTPS_PROXY` / `HTTP_PROXY` environment variables
- Markdown output format
- ESM modules with modern Node.js APIs

## Setup

```bash
cd {baseDir}
npm install
```

## Usage

```bash
node {baseDir}/scripts/bilibili-subtitle.js <url-or-bvid> [--cookie=SESSDATA=xxx] [--output=file.md]
```

### Examples

```bash
# Basic usage (CC subtitles)
node {baseDir}/scripts/bilibili-subtitle.js BV1GJ411x7h7
node {baseDir}/scripts/bilibili-subtitle.js https://www.bilibili.com/video/BV1GJ411x7h7

# With cookie for AI subtitles
node {baseDir}/scripts/bilibili-subtitle.js BV1xxxxxx --cookie=SESSDATA=xxxx

# Save to markdown file
node {baseDir}/scripts/bilibili-subtitle.js BV1xxxxxx --cookie=SESSDATA=xxxx --output=subtitles.md
```

## Cookie for AI Subtitles

Most Bilibili videos use AI-generated subtitles, which require authentication.

### Auto Get Cookie

```bash
node {baseDir}/scripts/get-bilibili-cookie.js
```

This script will:
1. Check if Edge is running with CDP debugging port
2. If not, launch Edge with debugging port
3. Wait for you to login to bilibili.com
4. Extract and output the SESSDATA value

**Note:** This requires Microsoft Edge browser. If Edge is already running without CDP, the script will restart it.

### Manual Get Cookie

1. Login to bilibili.com in your browser
2. Open DevTools → Application → Cookies
3. Copy the `SESSDATA` value (check "Show decoded" if needed)

## Output

- **stdout**: Plain subtitle text (no timestamps)
- **stderr**: Video info, errors, instructions
- **--output**: Save subtitles to markdown file with proper formatting

## Dependencies

- `undici` - HTTP client with proxy support
- `ws` - WebSocket client for CDP communication
- `better-sqlite3` - SQLite database access
- `sql.js` - SQL.js for SQLite operations

## Notes

- CC subtitles work without cookie; AI subtitles require a valid SESSDATA cookie
- Cookie auto-get requires Microsoft Edge browser
- Supports proxy via `HTTPS_PROXY` / `HTTP_PROXY` environment variables
- Bilibili API may return different subtitle URLs on each request; the script retries to find correct content

## Version

2.0.0 - Refactored with ESM modules, undici for HTTP, ws for WebSocket

## License

MIT
