# bili_live_average_bitrate_display

## 描述

这是一个猴油脚本，用于在哔哩哔哩直播页面上显示直播流的平均码率。通过计算一段时间内的平均码率，帮助用户了解当前直播的清晰度和稳定性。

## 功能

*   在哔哩哔哩直播间显示实时平均码率。
*   帮助用户判断当前网络环境下最佳的观看画质。

## 安装

- 确保你的浏览器安装了用户脚本管理器，例如 Tampermonkey (Chrome) 或 Greasemonkey (Firefox)。
- 安装地址：
  - [GitHub](https://github.com/Raven-tu/bili_live_bitrate_ug/raw/refs/heads/master/dist/bili_live_average_bitrate_display.user.js)

## 使用方法

安装脚本后，在哔哩哔哩直播间观看直播时，右击直播画面，选择 “视频统计信息”。
在弹出的统计信息窗口中，你将看到在 Video Info 栏后增加的信息。

例如 `Video Info: 1920x1080, [60s] 2106.85 Kbps. 30FPS`，其中 `2106.85 Kbps` 就是当前直播的平均码率，
`[60s]` 表示计算平均码率的时间段为 60 秒。

## 开发

本项目使用 Vite进行构建。

### 环境准备

确保你已安装 Node.js 和 pnpm。

### 依赖安装

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

该命令会在本地启动一个开发服务器。

### 构建

```bash
pnpm build
```

该命令会将项目构建到 `dist` 文件夹。

### Lint

```bash
pnpm lint
```

使用 ESLint 检查代码规范。

### Lint 并修复

```bash
pnpm lint:fix
```

使用 ESLint 检查并自动修复代码规范问题。

该命令会在本地启动一个服务器，用于预览构建后的应用。

### 版本发布

本项目使用 `standard-version` 进行版本管理和发布。

*   发布补丁版本：`pnpm release-patch`
*   发布次版本：`pnpm release-minor`
*   发布主版本：`pnpm release-major`
*   自定义发布：`pnpm release` (会根据 conventional commits 规范自动判断版本)

## 贡献

欢迎提交 Pull Request 或 Issue 来改进此项目。

## 许可证

[MIT](./LICENSE)
