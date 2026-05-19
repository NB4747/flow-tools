# Web Action Recorder

> 零成本、无安装、点击即用的网页点击行为录制器

一个开源的书签工具（Bookmarklet），拖拽到浏览器书签栏后，可在**任意网页**一键激活。右下角弹出精美悬浮窗，实时录制用户点击轨迹，自动生成唯一的 CSS 选择器路径，所有数据留在本地。

<p align="center">
  <img src="https://img.shields.io/badge/zero-dependencies-brightgreen" alt="zero dependencies">
  <img src="https://img.shields.io/badge/vanilla-JS-yellow" alt="vanilla JS">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license">
</p>

---

## 特性

- **Shadow DOM 隔离** — 悬浮窗样式不会污染宿主页面，也不被宿主页面样式影响
- **精准选择器** — 自动生成唯一 CSS 路径（优先 ID → class → nth-child），可直接用于自动化测试
- **点击高亮** — 被记录的元素闪烁红色边框，1 秒后渐隐
- **拖拽移动** — 悬浮窗可随意拖拽到屏幕任意位置
- **最小化/关闭** — 不遮挡视野，随时恢复
- **录制控制** — 暂停/恢复录制，录制模式下自动阻止链接跳转
- **一键导出** — 支持复制单条选择器，或导出全部记录为 JSON
- **零依赖** — 纯原生 ES6 JavaScript，兼容所有现代浏览器
- **不上传数据** — 所有数据留在本地，不向任何服务器发送请求

---

## 快速开始

### 方式一：线上直接使用（推荐）

访问 **[GitHub Pages](https://nb4747.github.io/flow-tools/)**，将页面中的红色按钮拖到浏览器书签栏即可。

### 方式二：本地运行

```bash
git clone https://github.com/NB4747/flow-tools.git
cd flow-tools/action-recorder
npx serve .
# 打开 http://localhost:3000
```

### 方式三：直接复制源码

打开 `recorder.js`，复制全部代码，粘贴到浏览器书签的 URL 栏（前面加 `javascript:`），保存即可。

---

## 使用指南

| 步骤 | 操作 |
|------|------|
| **1** | 将红色按钮拖入浏览器书签栏（如果没有显示书签栏，按 `Ctrl+Shift+B`） |
| **2** | 打开任意你想测试的网页（内部系统、Landing Page、H5 活动页均可） |
| **3** | 点击书签栏中的「Web Action Recorder」，右下角弹出录制面板 |
| **4** | 点击页面上的任意元素，观察列表实时记录并高亮反馈 |
| **5** | 点击「Copy All (JSON)」导出全部记录，或单条复制 |

### 录制面板说明

```
┌─────────────────────────────────┐
│  ● Web Action Recorder    − ✕  │  ← 标题栏（可拖拽移动）
├─────────────────────────────────┤
│  🟢 Recording…          0 clicks│  ← 状态栏
├─────────────────────────────────┤
│  #1  body > main > button.submit│  ← 最近 10 条记录
│  #2  body > header > nav > a    │     (每行可单独复制)
├─────────────────────────────────┤
│  [⏸ Pause] [Copy All] [Clear]  │  ← 操作栏
└─────────────────────────────────┘
```

---

## 导出数据格式

```json
[
  {
    "id": 1,
    "selector": "body > main:nth-child(2) > button.btn-primary:nth-child(1)",
    "tag": "button",
    "url": "https://example.com/page",
    "time": "2026-05-19T12:00:00.000Z"
  },
  {
    "id": 2,
    "selector": "#nav > a:nth-child(3)",
    "tag": "a",
    "url": "https://example.com/page",
    "time": "2026-05-19T12:00:05.000Z"
  }
]
```

---

## 项目结构

```
flow-tools/
└── action-recorder/
    ├── index.html      # GitHub Pages 引导主页（暗黑极简风）
    ├── recorder.js      # 核心录制器脚本（纯原生 JS）
    └── README.md        # 本文件
```

- **recorder.js** — 约 580 行，包含 Shadow DOM UI、CSS 选择器引擎、全局事件监听、悬浮窗拖拽等全部逻辑
- **index.html** — 约 950 行，Tailwind CSS 暗黑主题的引导页，通过 `<script type="text/plain">` 内嵌录制器源码，动态生成 bookmarklet 链接

---

## 技术实现

| 模块 | 方案 |
|------|------|
| 样式隔离 | Shadow DOM (`mode: 'open'`)，所有 CSS 内联在 shadow root |
| 选择器生成 | 递归爬取 DOM 树，优先 ID，附加有意义 class，nth-child 保唯一 |
| 悬浮窗 UI | 原生 DOM 操作，CSS Flexbox 布局 |
| 拖拽移动 | Pointer Events API，带视口边界夹持 |
| 剪贴板 | Clipboard API 优先，`execCommand('copy')` 回退 |
| 重复注入检测 | 唯一 ID 标记，二次点击切换显示/隐藏 |
| 高亮反馈 | 保存/恢复 `outline` 样式，CSS transition 渐隐 |

---

## 浏览器兼容性

所有支持 Shadow DOM v1、Pointer Events、CSS.escape 的现代浏览器：

- Chrome 54+
- Firefox 63+
- Safari 10.1+
- Edge 79+

---

## License

MIT © 2025

---

## 贡献

欢迎提交 Issue 和 Pull Request。

**开发相关项目链接：**
- [View on GitHub](https://github.com/NB4747/flow-tools)
