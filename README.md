# Bilibili Subtitle Fetcher

从B站（Bilibili）视频中提取字幕的命令行工具。支持AI生成字幕和CC字幕，输出纯文本格式。

## 功能特性

- 支持BV号和完整URL两种输入方式
- 自动识别视频信息并提取字幕
- 支持多语言字幕（中文、英文、日文等）
- 自动获取Cookie（通过Edge浏览器CDP协议）
- 纯Node.js实现，无外部依赖
- 字幕自动解码（无需手动处理URL编码）

## 环境要求

- Node.js >= 14.0
- Microsoft Edge浏览器（用于自动获取Cookie）

## 安装

```bash
git clone git@github.com:invork/project.git
cd project
```

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

**方式二：手动获取Cookie**

1. 在浏览器中登录 bilibili.com
2. 打开开发者工具 → Application → Cookies
3. 复制 `SESSDATA` 的值（注意勾选"Show decoded"）
4. 使用Cookie：

```bash
node .mimocode/skills/bilibili-subtitle/scripts/bilibili-subtitle.js BV1xxxxxx --cookie="SESSDATA=你的Cookie值"
```

## 工作原理

### 字幕获取流程

1. **获取视频信息**：调用 `/x/web-interface/view` API获取视频基本信息（标题、分P等）
2. **获取字幕列表**：调用 `/x/player/v2` API获取可用字幕列表
3. **下载字幕内容**：从字幕URL下载JSON格式的字幕数据
4. **提取纯文本**：将字幕JSON转换为纯文本输出

### Cookie自动获取流程

1. **检测调试端口**：检查Edge浏览器是否已开启CDP调试端口（9222）
2. **启动Edge**：如果未开启，自动以调试模式启动Edge
3. **连接CDP**：通过WebSocket连接到Edge的CDP协议
4. **提取Cookie**：调用 `Network.getAllCookies` 获取所有Cookie
5. **解码输出**：找到bilibili.com的SESSDATA并解码URL编码

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
└── subtitle_BV*.txt                        # 生成的字幕文件
```

## API说明

### bilibili-subtitle.js

| 参数 | 说明 |
|------|------|
| `<url-or-bvid>` | BV号或完整URL（必填） |
| `--cookie=SESSDATA=xxx` | B站Cookie（获取AI字幕时需要） |

**输出：**
- stdout：纯文本字幕内容
- stderr：视频信息、错误提示、使用说明

### get-bilibili-cookie.js

无参数，自动完成以下操作：
1. 检测/启动Edge调试端口
2. 等待用户登录bilibili.com
3. 输出解码后的SESSDATA值

**输出：**
- stdout：SESSDATA Cookie值
- stderr：操作状态提示

## 常见问题

### Q: 提示"No CC subtitles found"

该视频没有CC字幕，需要使用Cookie获取AI字幕。运行 `get-bilibili-cookie.js` 获取Cookie后重试。

### Q: Cookie获取超时

确保：
1. Edge浏览器已打开bilibili.com页面
2. 已登录B站账号
3. 没有其他程序占用9222端口

### Q: 字幕内容为空

可能原因：
- 视频没有字幕
- Cookie已过期，需要重新获取
- 网络连接问题

### Q: 如何获取多语言字幕

脚本默认获取第一种字幕。如需其他语言，可修改脚本中 `subtitles[0]` 为其他索引。

## 示例

```bash
# 获取视频字幕并保存到文件
$cookie = node .mimocode/skills/bilibili-subtitle/scripts/get-bilibili-cookie.js 2>$null
node .mimocode/skills/bilibili-subtitle/scripts/bilibili-subtitle.js BV19a9HBEEJx --cookie="SESSDATA=$cookie" > subtitle.txt

# 批量获取（PowerShell）
$cookie = node .mimocode/skills/bilibili-subtitle/scripts/get-bilibili-cookie.js 2>$null
@("BV1xxxxxx", "BV1yyyyyy") | ForEach-Object {
    node .mimocode/skills/bilibili-subtitle/scripts/bilibili-subtitle.js $_ --cookie="SESSDATA=$cookie" > "$_.txt"
}
```

## 许可

MIT License
