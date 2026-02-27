# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 uTools 平台的 JSON 处理插件，功能包括格式化、压缩、验证、查询、比较和 Excel 转换。使用 Vue 3 + Vite 构建，运行在 uTools 桌面应用框架内。

## 开发命令

### 开发模式
```bash
npm run dev
```
启动 Vite 开发服务器，地址为 `http://localhost:5173`。在 uTools 开发者工具中添加本项目目录，插件将从开发服务器加载（配置在 `plugin.json` 的 development.main）。

### 构建
```bash
npm run build
```
构建生产版本到 `dist/` 目录。此命令会：
1. 运行 Vite 构建，进行代码分割（vendor、json-tools、excel、quicktype 等 chunks）
2. 执行 `scripts/copy-files.js` 将 `plugin.json`、`preload.js`、`logo.png` 和字体文件复制到 `dist/`

### 打包
```bash
npm run pack
```
从 `dist/` 目录创建 `myjson-plugin.upx` 文件（ZIP 压缩包），用于 uTools 安装。

## 架构设计

### uTools 插件结构

这是一个 **uTools 插件**，不是标准的 Web 应用。关键区别：

- **plugin.json**：定义插件元数据、功能特性和入口点（cmds）。每个 feature 有一个 `code` 决定应用进入哪个模式。
- **preload.js**：Node.js 上下文脚本，通过 `window.preloadUtils` 向渲染进程暴露原生 API（文件 I/O 操作）。根据 uTools 规范必须保持未压缩状态。
- **index.html**：uTools 加载的主入口点，可以从开发服务器或构建文件加载。

### 应用入口点

应用基于 `plugin.json` 的 features 有多个入口模式：

- `json_editor`：主编辑器（关键词："JSON"、"json"、"JSON编辑器"）
- `json_format`：自动格式化选中的 JSON 文本（正则匹配）
- `json_compare`：JSON 比较视图
- `json_convert`：将 JSON 转换为代码（TypeScript、Go、Java 等）
- `json_table`：JSON 数组的表格视图

入口处理在 `App.vue:onMounted` 中通过 `window.utools.onPluginEnter()` 实现。

### Vue 3 Composition API 架构

**主组件**：`src/App.vue` 协调所有功能并管理全局状态。

**Composables**（可复用逻辑）：
- `useJsonOperations`：核心 JSON 操作（格式化、压缩、验证、反转义、移除注释）
- `useJsonStorage`：从 uTools 数据库保存/加载（`window.utools.db`）
- `useClipboard`：通过 uTools API 进行剪贴板操作
- `useHistory`：撤销/重做，历史栈（最多 50 条记录）
- `useJsonPath`：JSONPath 和 JMESPath 查询执行
- `useJsonComparison`：JSON 差异比较
- `useJsonConverter`：将 JSON 转换为编程语言类型（使用 quicktype-core）

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

插件同时支持 uTools 环境和浏览器回退：

```javascript
// uTools 环境（首选）
if (window.utools && window.utools.showSaveDialog) {
  const filePath = window.utools.showSaveDialog({...})
  window.preloadUtils.writeFile(filePath, content)
}
// 浏览器回退
else {
  const blob = new Blob([content])
  // ... 通过 <a> 元素下载
}
```

此模式用于：
- `handleSaveToLocal()`：保存 JSON 到本地文件
- `handleImportJson()`：导入 JSON/TXT 文件
- `handleImportExcel()` / `handleExportExcel()`：Excel 转换
- `handleDownloadTableExcel()`：从表格视图导出

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
- `base: './'` 对于 uTools 本地文件加载至关重要
- 手动分块拆分 vendor 代码以提高性能
- 开发服务器在端口 5173，host 为 `0.0.0.0`

### CodeMirror 6 集成
`JsonEditor.vue` 使用 CodeMirror 6：
- `@codemirror/lang-json` 用于语法高亮
- `@codemirror/lint` 用于实时验证
- 自定义 linter 解析 JSON 并报告带行/列的错误

### uTools 数据库
通过 `window.utools.db` API 访问：
- `put({ _id, data, _rev })`：保存/更新文档
- `get(id)`：检索文档
- `allDocs()`：列出所有文档
- `remove(doc)`：删除文档
- 通过 `window.utools.onDbPull` 支持云同步

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

### 使用 uTools API

始终检查 uTools 环境：
```javascript
if (window.utools && window.utools.someAPI) {
  // uTools 特定代码
} else {
  // 浏览器回退
}
```

常用 API：
- `window.utools.onPluginEnter(callback)`：入口点处理器
- `window.utools.showSaveDialog(options)`：原生保存对话框
- `window.utools.showOpenDialog(options)`：原生打开对话框
- `window.utools.db.*`：数据库操作
- `window.preloadUtils.*`：来自 preload.js 的文件 I/O

## 构建输出结构

执行 `npm run build` 后：
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
├── fonts/
├── plugin.json
├── preload.js
└── logo.png
```

`pack` 脚本将其打包为 `myjson-plugin.upx`。
