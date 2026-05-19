<p align="center">
  <br>
  <img src="https://img.shields.io/badge/build-bookmarklet-red?style=for-the-badge" alt="bookmarklet">
  <img src="https://img.shields.io/badge/dependencies-zero-brightgreen?style=for-the-badge" alt="zero deps">
  <img src="https://img.shields.io/badge/vanilla-JS-yellow?style=for-the-badge" alt="vanilla JS">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT">
  <br><br>
</p>

<h1 align="center">Web Action Recorder</h1>

<p align="center">
  <b>零成本 · 无安装 · 点击即用</b><br>
  一个拖拽到书签栏即可在<strong>任意网页</strong>上录制用户点击行为的开源工具
</p>

<br>

---

## 目录

- [这是什么](#这是什么)
- [为什么需要它](#为什么需要它)
- [核心特性](#核心特性)
- [快速开始](#快速开始)
- [完整使用指南](#完整使用指南)
  - [安装书签](#安装书签)
  - [录制点击](#录制点击)
  - [面板操作](#面板操作)
  - [导出数据](#导出数据)
- [导出数据格式](#导出数据格式)
- [典型应用场景](#典型应用场景)
- [架构设计](#架构设计)
  - [整体架构](#整体架构)
  - [CSS 选择器引擎](#css-选择器引擎)
  - [Shadow DOM 隔离](#shadow-dom-隔离)
  - [事件处理流程](#事件处理流程)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [浏览器兼容性](#浏览器兼容性)
- [本地开发](#本地开发)
- [部署 GitHub Pages](#部署-github-pages)
- [FAQ](#faq)
- [路线图](#路线图)
- [贡献指南](#贡献指南)
- [License](#license)

---

## 这是什么

**Web Action Recorder** 是一个浏览器书签工具（Bookmarklet）。你只需要将一个按钮拖到浏览器的书签栏，之后访问任意网页时点击这个书签，页面右下角就会弹出一个精美的悬浮控制面板，开始实时录制你在该网页上的每一次鼠标点击。

每次点击都会被解析为一条**唯一的 CSS 选择器路径**，并显示在面板中。你可以随时复制单条路径，或一键导出所有记录为 JSON 格式。

> **全程无痕**：不依赖任何第三方库，不上传任何数据到服务器，所有逻辑都在你的浏览器本地执行。

---

## 为什么需要它

| 角色 | 典型痛点 | 本工具如何解决 |
|------|---------|---------------|
| **测试工程师** | 写自动化脚本时，手动写 CSS 选择器耗时且易错 | 点击元素自动生成，直接复制到 Playwright / Selenium 脚本 |
| **产品经理** | 想看用户在页面上点了哪些地方，但接入埋点太重 | 打开页面点一遍操作流程，导出 JSON 即可分析交互路径 |
| **前端开发** | 排查 "这里点不动" 类 bug 时需要快速定位元素 | 激活录制器点一下，瞬间得到 DOM 路径，粘贴到 DevTools 直接定位 |
| **数据分析师** | 需要采集网页点击热力图数据 | 重复走一遍用户操作流程，导出结构化数据做分析 |

核心价值：**将"点击一个网页元素 → 得到它的唯一选择器"这个操作，从 30 秒（右键检查 → 复制 Selector → 粘贴）压缩到 1 秒（点一下 → 自动记录）。**

---

## 核心特性

### 录制能力

- **全局点击监听** — 在页面捕获阶段拦截所有点击事件
- **精准 DOM 路径** — 自动计算被点击元素的唯一 CSS 选择器
- **点击高亮反馈** — 被记录的元素出现红色闪烁边框（约 800ms），确认录制成功
- **链接保护** — 录制模式下自动阻止 `<a>` 标签的默认跳转，避免离开当前页面
- **暂停/恢复** — 可随时暂停录制正常浏览，恢复后继续记录
- **内存上限** — 最多保留 300 条记录，超出时自动裁剪到最近 200 条

### 悬浮窗 UI

- **Shadow DOM 隔离** — 所有样式封装在 Shadow Root 内，不受宿主页面 CSS 干扰，也不污染宿主页面
- **拖拽移动** — 按住标题栏可将面板拖动到屏幕任意位置，边界自动夹持
- **最小化/展开** — 点击 `−` 收起面板主体，点击 `+` 恢复
- **完全关闭** — 点击 `✕` 彻底移除面板并解绑监听器
- **最近 10 条** — 列表始终显示最近 10 条记录，支持滚动查看更多
- **Toast 提示** — 操作反馈以半透明浮动消息提示，不打断操作流

### 回放

- **网页内回放** — 点击 `▶ Play` 在当前页依次重播所有记录的点击，按钮变为 `⏹ Stop` 可随时中止
- **真实模拟** — 使用 `dispatchEvent(MouseEvent)` 而非 `.click()`，更接近真实用户点击
- **智能延迟** — 优先按原始记录的 `time` 差值等待（上限 5s），兜底 800ms
- **容错跳过** — 回放中某选择器在当前页找不到时，Toast 提示并跳过，不中断流程
- **录制守卫** — 回放期间的点击不会被录制，避免二次污染

### 导出

- **单条复制** — 每条记录旁边有一个 📋 按钮，一键复制该选择器
- **全量导出 JSON** — `⎘ JSON` 按钮将所有记录导出为格式化的 JSON 数组
- **导出 Playwright 脚本** — `📄 Playwright` 按钮生成完整的、可直接 `node` 运行的 Playwright 自动化脚本
- **导出 Puppeteer 脚本** — `📄 Puppeteer` 按钮生成完整的 Puppeteer 自动化脚本
- **清空** — `✗ Clear` 按钮一键清空所有记录

---

## 快速开始

### 方式一：GitHub Pages（推荐，无需克隆）

1. 访问 **[nb4747.github.io/flow-tools](https://nb4747.github.io/flow-tools/)**
2. 将页面中央的红色大按钮**直接拖到浏览器的书签栏**
3. 如果没看到书签栏，按 `Ctrl+Shift+B`（Windows）/ `Cmd+Shift+B`（Mac）显示
4. 完成。打开任意网页，点击书签栏里的「Web Action Recorder」即可开始录制

### 方式二：克隆仓库本地使用

```bash
# 克隆项目
git clone https://github.com/NB4747/flow-tools.git
cd flow-tools/action-recorder

# 启动本地服务器（三选一）
npx serve .                # Node.js
python -m http.server 8080 # Python
php -S localhost:8080      # PHP

# 浏览器打开 http://localhost:3000，拖拽按钮到书签栏
```

> **注意**：不要直接用 `file://` 协议打开 `index.html`，浏览器可能阻止 `javascript:` 链接的正常执行。

### 方式三：手动创建书签

1. 打开 `recorder.js`，复制**全部代码**
2. 打开一个在线 JS 压缩工具（如 [javascript-minifier.com](https://javascript-minifier.com)），粘贴代码并压缩
3. 在压缩后的代码前后加上 `javascript:(function(){` 和 `})()`
4. 在浏览器书签栏新建书签，名称随意，URL 粘贴上一步的结果
5. 保存即可

---

## 完整使用指南

### 安装书签

1. 打开引导页（GitHub Pages 或本地服务器）
2. 确保浏览器**书签栏可见**（`Ctrl+Shift+B` / `Cmd+Shift+B`）
3. **按住鼠标**拖拽页面中央的红色按钮到书签栏
4. 松开鼠标，书签栏中出现「Web Action Recorder」书签
5. 安装完成，该引导页可以关闭

### 录制点击

1. 打开任意你想测试的网页（百度、淘宝、内部 Web 系统、H5 活动页等）
2. 点击书签栏的「Web Action Recorder」
3. 页面右下角弹出录制面板，状态显示 "Recording…"
4. 点击页面上的任意元素（按钮、链接、输入框、文本、图片等）
5. 被点击的元素出现**红色边框闪烁**，确认已被记录
6. 继续点击更多元素，列表实时更新

### 面板操作

| 操作 | 说明 |
|------|------|
| **拖拽标题栏** | 按住面板顶部的标题栏（`● Web Action Recorder`），拖动到任意位置 |
| **最小化** | 点击 `−` 按钮收起面板内容区域，仅保留标题栏 |
| **展开** | 最小化后点击 `+` 按钮恢复面板完整显示 |
| **暂停** | 点击 `⏸ Pause` 按钮暂停录制。暂停期间可正常浏览网页、点击链接跳转 |
| **恢复** | 暂停后按钮变为 `▶ Resume`，点击恢复录制 |
| **回放** | 点击 `▶ Play` 在当前页依次回放所有点击。按钮变 `⏹ Stop`（紫色高亮）可中止。状态栏显示 `Replaying (X/Y)…` |
| **关闭** | 点击 `✕` 按钮完全移除录制器（如需再次使用，重新点击书签栏书签） |
| **复制单条** | 鼠标悬停在某条记录上，点击右侧的 📋 按钮，选择器即复制到剪贴板 |
| **复制全部 JSON** | 点击 `⎘ JSON` 将所有记录以 JSON 格式复制到剪贴板 |
| **导出 Playwright** | 点击 `📄 Playwright` 生成完整 Playwright 脚本并复制到剪贴板，直接 `node` 运行 |
| **导出 Puppeteer** | 点击 `📄 Puppeteer` 生成完整 Puppeteer 脚本并复制到剪贴板，直接 `node` 运行 |
| **清空** | 点击 `✗ Clear` 清除所有已记录的数据 |

### 导出数据

**JSON 格式**可直接用于数据分析、Excel 导入、Bug 报告等。

**Playwright / Puppeteer 脚本**为完整可执行代码：包含浏览器启动、页面导航、逐步点击（自动等待）、错误处理，复制后保存为 `.js` 文件，执行 `npm install playwright && node script.js` 即可自动化重现操作流程。

---

## 导出数据格式

```json
[
  {
    "id": 1,
    "selector": "#root > main:nth-child(2) > button.submit-btn:nth-child(1)",
    "tag": "button",
    "url": "https://example.com/dashboard",
    "time": "2026-05-19T10:23:15.000Z"
  },
  {
    "id": 2,
    "selector": "#navbar > a.nav-link.active:nth-child(3)",
    "tag": "a",
    "url": "https://example.com/dashboard",
    "time": "2026-05-19T10:23:18.000Z"
  },
  {
    "id": 3,
    "selector": "body > div.container:nth-child(2) > input:nth-child(1)",
    "tag": "input",
    "url": "https://example.com/dashboard",
    "time": "2026-05-19T10:23:22.000Z"
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `number` | 自增 ID，跨会话不重复（单次注入内） |
| `selector` | `string` | 元素在 DOM 树中的唯一 CSS 路径 |
| `tag` | `string` | 被点击元素的 HTML 标签名（小写） |
| `url` | `string` | 录制时所在页面的完整 URL |
| `time` | `string` | ISO 8601 时间戳 |

---

## 典型应用场景

### 场景一：写自动化测试脚本

```
痛点：手工写 CSS 选择器经常不准，运行时报 "element not found"
流程：
  1. 本地启动被测应用
  2. 激活录制器
  3. 按测试用例逐一点击页面元素
  4. 点击 "Copy All (JSON)"
  5. 将 selectors 直接用于 page.click() → 零出错
```

### 场景二：产品走查 / 用户行为复盘

```
痛点：想知道用户在产品页上的点击顺序，但接入 GA 埋点太麻烦
流程：
  1. 打开产品页面
  2. 激活录制器
  3. 模拟用户操作路径（点击按钮 → 填写输入框 → 提交表单等）
  4. 导出 JSON 保存为操作流程文档
```

### 场景三：Bug 复现与报告

```
痛点：测试说"那个按钮点了没反应"，但开发找不到是哪个按钮
流程：
  1. 测试在页面上激活录制器
  2. 点击有问题的按钮
  3. 复制选择器 → 粘贴到 Jira / GitHub Issue
  4. 开发拿到选择器，在 DevTools 中用 document.querySelector('...') 一键定位
```

### 场景四：网页竞品分析

```
痛点：想快速了解竞品页面的交互元素布局
流程：
  1. 打开竞品页面
  2. 激活录制器
  3. 逐个点击页面上的交互元素
  4. 导出 JSON 得到完整的交互元素结构
```

---

## 架构设计

### 整体架构

```
┌──────────────────────────────────────────────────┐
│                   宿主网页                         │
│  ┌────────────────────────────────────────────┐  │
│  │              <body>                         │  │
│  │    <div id="__war_container__">             │  │
│  │    ┌──────────────────────────────────┐    │  │
│  │    │      Shadow Root (mode:open)     │    │  │
│  │    │  ┌────────────────────────────┐  │    │  │
│  │    │  │   <style> (isolated CSS)   │  │    │  │
│  │    │  │   .war-panel { ... }        │  │    │  │
│  │    │  │   .war-header { ... }       │  │    │  │
│  │    │  │   .war-body { ... }         │  │    │  │
│  │    │  │   ...                       │  │    │  │
│  │    │  └────────────────────────────┘  │    │  │
│  │    │  ┌────────────────────────────┐  │    │  │
│  │    │  │   Panel DOM (UI elements)  │  │    │  │
│  │    │  │   Header · Status · List   │  │    │  │
│  │    │  │   Footer · Toast           │  │    │  │
│  │    │  └────────────────────────────┘  │    │  │
│  │    └──────────────────────────────────┘    │  │
│  │    </div>                                   │  │
│  │                                              │  │
│  │    <button> ← 用户点击 → 全局监听器捕获      │  │
│  │    <a href="..."> ← 录制模式下阻止跳转       │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### CSS 选择器引擎

选择器的生成遵循一套优先级规则，确保**唯一性和可读性**的平衡：

```
1. 元素有 ID？
   → 是：直接返回 #the-id（ID 在页面中唯一，无需继续查找）
   → 否：继续

2. 构建路径段：
   a) 取 tagName（小写）
   b) 附加有意义的 class（过滤掉 ng-* / js-* / svelte-* 等框架类名，最多 2 个）
   c) 附加 :nth-child(n) 做精确定位

3. 向上遍历父节点：
   a) 将当前路径段插入结果数组头部
   b) 如果已构建的路径在页面中唯一 → 提前结束遍历
   c) 否则继续向上，直到 <body> 或 <html>

4. 用 " > " 连接所有路径段，返回最终选择器
```

**示例**：点击一个没有 ID 的按钮：

```
HTML:   <body>                                  → 最终: "body"
          <div>                                  → "div:nth-child(2)"
            <button class="btn primary">点击</button>  → "button.btn.primary:nth-child(1)"

结果: body > div:nth-child(2) > button.btn.primary:nth-child(1)
```

**健壮性设计**：
- 如果中间选择器不合法（极端情况），`try/catch` 捕获并继续向上遍历
- 框架动态类名（`ng-*`、`js-*`、`_*`、`svelte-*`、`css-*`）被自动过滤
- `CSS.escape()` 确保选择器字符串中的特殊字符被正确转义（含旧浏览器 polyfill）

### Shadow DOM 隔离

不使用 iframe，而是利用 Web 标准的 Shadow DOM 实现完全样式隔离：

| 方案 | 优点 | 缺点 | 是否采用 |
|------|------|------|---------|
| iframe | 天然隔离 | 跨域限制、通信复杂、尺寸笨重 | ❌ |
| CSS-in-JS + 高特异性选择器 | 简单 | 仍可能被宿主 `!important` 覆盖 | ❌ |
| Shadow DOM (`mode:open`) | 标准隔离、事件冒泡可控 | 需手动构建 UI | ✅ |

- `mode: 'open'` — Shadow Root 内部元素可以被 DevTools 检查（方便调试），事件冒泡到宿主文档时 target 被重定向为宿主节点
- `:host { all: initial }` — 彻底重置 Shadow Host 上的所有继承样式
- 所有 CSS 通过 `<style>` 标签注入 Shadow Root，不依赖外部样式表
- 悬浮窗内部的点击事件通过 `container.contains(e.target)` 判断过滤，不会触发录制

### 事件处理流程

```
用户点击页面元素
        │
        ▼
  document 捕获阶段 (addEventListener(click, handler, true))
        │
        ├── 点击来自录制器面板内部？ ──→ 忽略
        │
        ├── 当前已暂停录制？ ──→ 忽略（正常浏览）
        │
        ├── target 不是元素节点？ ──→ 忽略
        │
        ▼
  执行录制逻辑：
    0. isReplaying?         — 回放中 → 忽略（防止回放产生的 click 被二次录制）
    1. flash(el)            — 红色边框闪烁高亮
    2. getSelector(el)      — 计算唯一 CSS 路径
    3. addRecord(...)       — 存入记录数组
    4. renderRecords()      — 更新面板列表
    5. 如果是 <a> 标签？    — preventDefault() 阻止跳转
```

---

## 项目结构

```
flow-tools/
├── .gitignore                  # 忽略 .env 等敏感文件
└── action-recorder/
    ├── index.html              # GitHub Pages 引导主页 (~1215 行)
    │   ├── Tailwind CSS CDN     # 暗黑极简 UI
    │   ├── <script type="text/plain" id="recorder-source">
    │   │   └── recorder.js 内嵌源码（同步维护）
    │   └── 主脚本               # 动态编码 → 生成 bookmarklet href
    ├── recorder.js              # 核心录制器脚本 (~700+ 行)
    │   ├── getSelector()        # CSS 选择器引擎
    │   ├── flash()              # 点击高亮效果
    │   ├── replay()             # 网页内回放引擎（async/await）
    │   ├── exportToPlaywright() # 生成 Playwright 脚本
    │   ├── exportToPuppeteer()  # 生成 Puppeteer 脚本
    │   ├── copyToClipboard()    # 剪贴板操作（含回退方案）
    │   ├── Shadow DOM UI 构建   # 完整悬浮窗 HTML + CSS
    │   ├── renderRecords()      # 列表渲染（最近 10 条）
    │   ├── 事件处理             # 录制 / 回放 / 拖拽 / 按钮操作
    │   └── 重复注入检测         # 二次点击切换显示/隐藏
    └── README.md                # 本文件
```

### 两个核心文件的同步关系

`recorder.js` 是**唯一源码**。`index.html` 通过 `<script type="text/plain">` 标签内嵌了 `recorder.js` 的完整副本（浏览器不会执行 `type="text/plain"` 的脚本，但 JS 可以通过 `.textContent` 读取）。

这是因为 `index.html` 需要动态生成 bookmarklet 的 `href` 属性：它读取内嵌的源码 → 去除注释/压缩空白 → 拼接为 `javascript:...` → 设置到按钮上。

修改录制器逻辑时，**两个文件需要同步更新**。

---

## 技术栈

### recorder.js（零依赖）

| 技术 | 用途 |
|------|------|
| **Shadow DOM v1** | 悬浮窗样式隔离 |
| **Pointer Events API** | 面板拖拽移动（同时支持鼠标和触控） |
| **Clipboard API + execCommand** | 剪贴板写入（新 API 优先，旧方法回退） |
| **CSS.escape()** | 选择器特殊字符转义 |
| **Capture Phase Listener** | 在捕获阶段拦截点击，优先级高于页面自身监听器 |
| **CSS Transitions** | 高亮闪烁、面板动画 |

### index.html

| 技术 | 用途 |
|------|------|
| **Tailwind CSS (CDN)** | 引导页 UI 框架 |
| **IntersectionObserver** | 滚动到视口时触发渐显动画 |
| **CSS @keyframes** | 按钮脉冲发光动画、浮动动画 |

---

## 浏览器兼容性

| 浏览器 | 最低版本 | 备注 |
|--------|---------|------|
| Chrome | 54+ | 完全支持 |
| Firefox | 63+ | 完全支持 |
| Safari | 10.1+ | 完全支持 |
| Edge | 79+ | 完全支持 |
| Opera | 41+ | 完全支持 |
| IE 11 | ❌ | 不支持 Shadow DOM |

核心依赖兼容性：
- Shadow DOM v1：Chrome 53+ / Firefox 63+ / Safari 10+ / Edge 79+
- Pointer Events：Chrome 55+ / Firefox 59+ / Safari 13+ / Edge 12+
- CSS.escape：Chrome 46+ / Firefox 31+ / Safari 10+ / Edge 79+

---

## 本地开发

```bash
# 克隆仓库
git clone https://github.com/NB4747/flow-tools.git
cd flow-tools/action-recorder

# 启动开发服务器
npx serve . --port 3000

# 在浏览器中打开
# Windows: start http://localhost:3000
# Mac:     open http://localhost:3000
```

### 修改录制器

1. 编辑 `recorder.js`
2. 将修改后的代码**同步**到 `index.html` 中 `<script type="text/plain" id="recorder-source">` 标签内
3. 刷新页面测试

### 调试技巧

- 打开 DevTools → Elements，找到 `#__war_container__` → 展开 Shadow Root 查看面板 DOM
- 所有录制器内部日志使用 `showToast()` 在前端显示，无需打开 Console
- 如需调试选择器生成，可在 `getSelector()` 函数中添加 `console.log()`

---

## 部署 GitHub Pages

1. 将代码推送到 GitHub 仓库的 `main` 分支
2. 进入仓库 Settings → Pages
3. Source 选择 **Deploy from a branch**，Branch 选 `main`，目录选 `/ (root)`
4. 点击 Save，等待 1-2 分钟
5. 访问 `https://<用户名>.github.io/<仓库名>/action-recorder/`

> 如果希望根目录直接访问引导页，可以将 `index.html` 放在仓库根目录。

---

## FAQ

<details>
<summary><b>Q: 为什么我点击页面上的链接还是跳转了？</b></summary>

A: 检查录制器的状态栏 — 如果显示 "Paused"（橙色圆点），说明录制已暂停，链接会正常跳转。点击 "▶ Resume" 恢复录制后，链接跳转会被阻止。
</details>

<details>
<summary><b>Q: 导出的选择器在 Selenium/Playwright 中找不到元素？</b></summary>

A: 动态页面（React/Vue/Angular）的元素 class 名可能在每次渲染时变化。本工具优先使用 `:nth-child()` 做结构化定位，不受 class 名影响。如果页面结构也动态变化，建议在录制后尽快使用导出的选择器。
</details>

<details>
<summary><b>Q: 录制器能跨页面工作吗？</b></summary>

A: 不能。Bookmarklet 只在当前页面注入，刷新或跳转后录制器和数据都会丢失。建议在录制完成后先导出数据再离开页面。
</details>

<details>
<summary><b>Q: 能否录制 iframe 内的点击？</b></summary>

A: 同源 iframe 理论上可以，但需要额外处理。跨域 iframe 由于浏览器安全策略限制，无法捕获其内部点击事件。
</details>

<details>
<summary><b>Q: 录制器的数据会被上传到服务器吗？</b></summary>

A: **不会。** 所有数据仅存储在浏览器内存的 JavaScript 数组中，不会有任何网络请求。关闭页面或关闭录制器后数据即被销毁。
</details>

<details>
<summary><b>Q: 如果页面本身也有 Shadow DOM，能录制其中的元素吗？</b></summary>

A: 部分支持。点击事件会冒泡出来，但 `event.target` 会被重定向为宿主节点。生成的 CSS 选择器只能定位到 Shadow Host，无法穿透到 Shadow Root 内部的元素。
</details>

<details>
<summary><b>Q: 书签栏没有显示怎么办？</b></summary>

A: Windows/Linux 按 `Ctrl+Shift+B`，Mac 按 `Cmd+Shift+B`。或者在浏览器设置中搜索 "书签栏" 开启。
</details>

<details>
<summary><b>Q: 回放时某些元素点击没反应？</b></summary>

A: 录制和回放必须在**同一个页面**上进行。如果页面内容动态变化（DOM 结构改变），录制的选择器可能失效。建议录制完立即回放。如果元素确实不存在，回放会跳过该步骤并继续执行。
</details>

<details>
<summary><b>Q: 导出的 Playwright/Puppeteer 脚本如何运行？</b></summary>

A: 复制代码保存为 `.js` 文件（如 `test.js`），安装依赖后在终端执行：

```bash
npm install playwright   # 或用 puppeteer
node test.js
```

脚本会启动浏览器，自动导航到录制时的页面，并逐步执行所有点击操作。
</details>

---

## 路线图

- [x] 录制回放功能（高亮依次重播点击位置，支持中止）
- [x] 导出为 Playwright 脚本（直接生成可执行代码）
- [x] 导出为 Puppeteer 脚本（直接生成可执行代码）
- [ ] 支持键盘事件录制（keydown / input）
- [ ] 点击热力图可视化
- [ ] 自定义高亮颜色
- [ ] 面板大小可调整
- [ ] 录制计时器（显示已录制时长）

---

## 贡献指南

欢迎贡献！无论是 Bug 报告、功能请求还是代码 PR。

1. **Fork** 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交改动：`git commit -m 'feat: add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 发起 **Pull Request** 到 `main` 分支

**提交规范**：遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式（`feat:` / `fix:` / `docs:` / `refactor:` 等）。

**代码风格**：
- `recorder.js`：ES6 `var` 声明（兼容性考虑）、2 空格缩进、单引号
- `index.html`：2 空格缩进、Tailwind 优先

---

## License

[MIT](LICENSE) © 2025

---

<p align="center">
  <br>
  <a href="https://github.com/NB4747/flow-tools">
    <img src="https://img.shields.io/badge/View_on-GitHub-24292e?style=for-the-badge&logo=github" alt="View on GitHub">
  </a>
</p>
