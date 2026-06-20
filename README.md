# Bilibili Subtitle Fetcher

从B站（Bilibili）视频中提取字幕的命令行工具。支持AI生成字幕和CC字幕，支持输出纯文本或Markdown格式。

## 功能特性

- 支持BV号和完整URL两种输入方式
- 自动识别视频信息并提取字幕
- 支持多语言字幕（中文、英文、日文等）
- 自动获取Cookie（通过Edge浏览器CDP协议）
- 纯Node.js实现，无外部依赖
- 字幕自动解码（无需手动处理URL编码）
- 支持保存为Markdown文件格式（带视频标题）

## 环境要求

- Node.js >= 14.0

## 安装

将bilibili-subtitle/文件夹放置于`~/.mimocode/skilks/`中即可（claude code同理）。

## 使用方法

### 基本用法

```bash
# 使用BV号
node .mimocode/skills/bilibili-subtitle/scripts/bilibili-subtitle.js BV1GJ411x7h7

# 使用完整URL
node .mimocode/skills/bilibili-subtitle/scripts/bilibili-subtitle.js https://www.bilibili.com/video/BV1GJ411x7h7
```

### 获取AI字幕（需要Cookie）

大多数B站视频使用AI生成的字幕，需要登录Cookie才能访问。

**方式一：自动获取Cookie（推荐）**

```bash
# 获取Cookie
$cookie = node .mimocode/skills/bilibili-subtitle/scripts/get-bilibili-cookie.js 2>$null

# 使用Cookie获取字幕
node .mimocode/skills/bilibili-subtitle/scripts/bilibili-subtitle.js BV1xxxxxx --cookie="SESSDATA=$cookie"
```

**特性：**
- 自动检测Edge是否已运行
- 如果Edge已运行但未启用CDP，会自动关闭Edge并重启（保留登录态）
- Cookie存储在磁盘上，重启后登录状态不丢失

注意：由于脚步文件基于Microsoft Edge浏览器获取cookie，因此 该流程目前仅适用于Microsoft Edge浏览器

**方式二：手动获取Cookie**

1. 在浏览器中登录 bilibili.com
2. 打开开发者工具 → Application → Cookies
3. 复制 `SESSDATA` 的值（注意勾选"Show decoded"）
4. 使用Cookie：

```bash
node .mimocode/skills/bilibili-subtitle/scripts/bilibili-subtitle.js BV1xxxxxx --cookie="SESSDATA=你的Cookie值"
```

## 文件结构

```
project/
├── .mimocode/
│   └── skills/
│       └── bilibili-subtitle/
│           ├── SKILL.md                    # MiMoCode技能配置
│           └── scripts/
│               ├── bilibili-subtitle.js    # 字幕获取主脚本
│               └── get-bilibili-cookie.js  # Cookie自动提取脚本
├── README.md                               # 项目说明文档
├── subtitle_BV*.txt                        # 生成的字幕文件（纯文本）
└── subtitle_BV*.md                         # 生成的字幕文件（Markdown）
```

## API说明

### bilibili-subtitle.js

| 参数 | 说明 |
|------|------|
| `<url-or-bvid>` | BV号或完整URL（必填） |
| `--cookie=SESSDATA=xxx` | B站Cookie（获取AI字幕时需要） |
| `--output=file.md` | 保存为Markdown文件（可选） |

**输出：**
- stdout：纯文本字幕内容（未指定--output时）
- stderr：视频信息、错误提示、使用说明
- 文件：Markdown格式字幕（指定--output时）

### get-bilibili-cookie.js

无参数，自动完成以下操作：
1. 检测/启动Edge调试端口
2. 等待用户登录bilibili.com
3. 输出解码后的SESSDATA值

**输出：**
- stdout：SESSDATA Cookie值
- stderr：操作状态提示

## 常见问题

### Q: 如何获取多语言字幕

脚本默认获取第一种字幕。如需其他语言，可修改脚本中 `subtitles[0]` 为其他索引。

## 示例

```bash
# 获取视频字幕并保存到文件
$cookie = node .mimocode/skills/bilibili-subtitle/scripts/get-bilibili-cookie.js 2>$null
node .mimocode/skills/bilibili-subtitle/scripts/bilibili-subtitle.js BV19a9HBEEJx --cookie="SESSDATA=$cookie" > subtitle.txt

# 保存为Markdown格式
$cookie = node .mimocode/skills/bilibili-subtitle/scripts/get-bilibili-cookie.js 2>$null
node .mimocode/skills/bilibili-subtitle/scripts/bilibili-subtitle.js BV19a9HBEEJx --cookie="SESSDATA=$cookie" --output=subtitle.md

# 批量获取（PowerShell）
$cookie = node .mimocode/skills/bilibili-subtitle/scripts/get-bilibili-cookie.js 2>$null
@("BV1xxxxxx", "BV1yyyyyy") | ForEach-Object {
    node .mimocode/skills/bilibili-subtitle/scripts/bilibili-subtitle.js $_ --cookie="SESSDATA=$cookie" > "$_.txt"
}
```

## 许可

MIT License
