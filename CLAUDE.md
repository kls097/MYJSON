# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 macOS 桌面 JSON 工具箱应用，功能包括格式化、压缩、验证、查询、比较和 Excel 转换。使用 Vue 3 + Vite + Tauri v2 构建，作为原生 macOS 应用运行。

## 开发命令

### 纯前端开发模式
```bash
npm run dev
```
启动 Vite 开发服务器，地址为 `http://localhost:5173`。可在浏览器中直接使用（文件对话框等功能会回退到浏览器 API）。

### Tauri 开发模式
```bash
npm run tauri:dev
```
启动 Tauri 开发模式，同时运行 Vite 开发服务器和 Tauri 原生窗口。支持热重载。

### 构建前端
```bash
npm run build:web
```
构建前端生产版本到 `dist/` 目录。

### 构建 macOS 应用
```bash
npm run tauri:build
```
构建完整的 macOS 应用，产出 `.app` 和 `.dmg` 文件到 `src-tauri/target/release/bundle/`。

## 架构设计

### Tauri v2 + Vue 3 架构

这是一个 **Tauri v2 macOS 桌面应用**，使用系统 WebKit 渲染前端。

- **src-tauri/**：Rust 后端，管理窗口、插件注册、文件关联
- **src-tauri/tauri.conf.json**：应用配置（窗口大小、文件关联、打包选项）
- **src-tauri/capabilities/default.json**：权限配置（文件系统、剪贴板、对话框）
- **src/platform/**：平台抽象层，统一封装文件对话框、I/O、剪贴板、数据库操作
- **index.html**：Tauri WebView 加载的主入口

### 应用入口

应用启动后默认进入 JSON 编辑器模式。其他模式（比较、合并、表格等）通过工具栏按钮进入。

支持的功能模式：
- 编辑器模式（默认）：格式化、压缩、验证、查询
- 比较模式：JSON diff 对比
- 合并模式：智能合并 / 三方合并
- 转换模式：JSON 转代码（TypeScript、Go、Java 等）
- 表格模式：JSON 数组的表格视图

文件打开方式：
- Finder 中双击 .json 文件（通过 macOS 文件关联）
- 拖拽 .json 文件到应用窗口
- 工具栏导入按钮

### Vue 3 Composition API 架构

**主组件**：`src/App.vue` 协调所有功能并管理全局状态。

**Composables**（可复用逻辑）：
- `useJsonOperations`：核心 JSON 操作（格式化、压缩、验证、反转义、移除注释）
- `useJsonStorage`：通过平台抽象层保存/加载文档
- `useClipboard`：通过平台抽象层进行剪贴板操作
- `useHistory`：撤销/重做，历史栈（最多 50 条记录）
- `useJsonPath`：JSONPath 和 JMESPath 查询执行
- `useJsonComparison`：JSON 差异比较
- `useJsonConverter`：将 JSON 转换为编程语言类型（使用 quicktype-core）

**Platform**（平台抽象层 `src/platform/`）：
- `index.js`：平台检测 + 统一导出
- `tauri.js`：Tauri v2 实现（对话框、文件 I/O、剪贴板）
- `browser.js`：浏览器回退实现（开发模式用）

**Utils**（纯函数）：
- `jsonFormatter.js`：格式化/压缩 JSON
- `jsonCompressor.js`：压缩，可选转义
- `jsonValidator.js`：验证并计算统计信息
- `jsonFixer.js`：多级 JSON 修复（6 个级别：标准解析 → jsonrepair → JSON5 → 深度预处理）
- `jsonComparer.js`：两个 JSON 对象的结构差异
- `jsonConverter.js`：quicktype-core 的包装器
- `commentRemover.js`：移除 JSON5 风格的注释
- `jsonUnescaper.js`：智能反转义已转义的 JSON 字符串
- `excelConverter.js`：双向 JSON ↔ Excel 转换（使用 xlsx 库）

**Components**（组件）：
- `JsonEditor.vue`：带 JSON 语法检查的 CodeMirror 6 编辑器
- `JsonTreeView.vue`：可折叠的树形可视化
- `TableView.vue`：JSON 数组的可编辑表格
- `JsonCompareView.vue`：并排差异视图
- `PathQueryPanel.vue`：JSONPath/JMESPath 查询界面
- `JsonConvertPanel.vue`：语言选择和转换 UI
- `HistoryPanel.vue`：已保存文档浏览器
- `ToolbarActions.vue`：包含所有操作按钮的主工具栏
- `StatusBar.vue`：显示验证错误和 JSON 统计信息

### 状态管理

不使用 Vuex/Pinia。状态通过以下方式管理：
1. Composables 返回响应式 refs
2. Vue `provide/inject` 用于深层组件树（例如 `currentJson`、`parsedJson`、树节点的 `expanded` map）
3. 组件特定状态直接通过 props 传递

### 文件 I/O 模式

通过平台抽象层（`src/platform/`）统一封装，前端代码无需关心底层平台：

```javascript
import { showSaveDialog, showOpenDialog, copyToClipboard } from './platform/index.js'

// 自动检测 Tauri 或浏览器环境
await showSaveDialog({ defaultPath: 'data.json', content: jsonStr })
const result = await showOpenDialog({ filters: [{ name: 'JSON', extensions: ['json'] }] })
await copyToClipboard(text)
```

Tauri 模式使用：`@tauri-apps/plugin-dialog`、`@tauri-apps/plugin-fs`、`@tauri-apps/plugin-clipboard-manager`
浏览器模式使用：Blob 下载、`<input type="file">`、`navigator.clipboard`

### 历史记录管理

撤销/重做通过 `useHistory` composable 实现：
- 维护最多 50 个内容快照的栈
- `pushHistory(content)` 添加到栈（在操作前后调用）
- `undo()` / `redo()` 在栈中导航
- `isUndoRedo` 标志防止在撤销/重做操作期间记录
- 快捷键：Ctrl+Z（撤销）、Ctrl+Y 或 Ctrl+Shift+Z（重做）

### JSON 修复策略

`jsonFixer.js` 实现 6 级渐进式修复：
1. 标准 `JSON.parse()` - 已经有效
2. `jsonrepair` 库 - 修复引号、逗号、括号
3. JSON5 解析 - 处理单引号、注释、尾随逗号、无引号键
4. 基础预处理 + jsonrepair
5. JSON5 + jsonrepair
6. 深度预处理 + JSON5 + jsonrepair

每个级别依次尝试直到成功。UI 会显示哪个级别成功以及修复了什么。

## 关键技术细节

### Vite 配置
- `base: './'` 对于 Tauri 本地文件加载至关重要
- `clearScreen: false` 避免清除 Tauri 输出
- `strictPort: true` 确保端口固定（Tauri 需要）
- 手动分块拆分 vendor 代码以提高性能
- 开发服务器在端口 5173，支持 `TAURI_DEV_HOST`
- `watch.ignored: ['**/src-tauri/**']` 避免监视 Rust 文件

### CodeMirror 6 集成
`JsonEditor.vue` 使用 CodeMirror 6：
- `@codemirror/lang-json` 用于语法高亮
- `@codemirror/lint` 用于实时验证
- 自定义 linter 解析 JSON 并报告带行/列的错误

### uTools 数据库 → localStorage

数据存储使用 localStorage（数据量小，足够使用）：
- 通过 `src/platform/index.js` 的 `dbPut/dbGet/dbGetAll/dbRemove` 封装
- 前端���码无需直接操作 localStorage

### 查询引擎
支持两种查询语法：
- **JSONPath**：使用 `jsonpath-plus` 库（默认）
- **JMESPath**：使用 `jmespath` 库（UI 中切换）

两者都针对 `parsedJson` 执行并在 `QueryResultPanel` 中显示结果。

## 常见模式

### 添加新的 JSON 操作

1. 在 `src/utils/` 中添加工具函数（纯函数）
2. 如果可复用，集成到 `useJsonOperations` composable 中
3. 在 `App.vue` 中添加处理器：
   - 操作前调用 `pushHistory(currentJson.value)`
   - 执行操作
   - 操作后调用 `pushHistory(currentJson.value)`
   - 调用 `validate()` 更新 UI
4. 在 `ToolbarActions.vue` 中添加按钮并发出事件
5. 在 `App.vue` 模板中连接事件处理器

### 使用平台 API

通过平台抽象层调用原生功能：
```javascript
import { showSaveDialog, showOpenDialog, copyToClipboard, dbPut, dbGet, dbGetAll, dbRemove } from '../platform/index.js'

// 文件对话框
const result = await showOpenDialog({ filters: [...], binary: false })
await showSaveDialog({ defaultPath: 'file.json', content: text })

// 剪贴板
await copyToClipboard(text)

// 数据存储
dbPut('key', data)
const data = dbGet('key')
const all = dbGetAll('prefix_')
dbRemove('key')
```

## 构建输出结构

执行 `npm run build:web` 后：
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   ├── vendor-[hash].js
│   ├── json-tools-[hash].js
│   ├── excel-[hash].js
│   └── quicktype-[hash].js
└── fonts/
```

执行 `npm run tauri:build` 后：
```
src-tauri/target/release/bundle/
├── macos/JSON工具箱.app
└── dmg/JSON工具箱_4.0.0_aarch64.dmg
```
