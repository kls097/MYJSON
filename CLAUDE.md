# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 uTools 平台的 JSON 处理插件，功能包括格式化、压缩、验证、查询、比较、合并、Schema 验证、表格视图和图谱可视化。使用 Vue 3 + Vite 构建，运行在 uTools 桌面应用框架内。

## 开发命令

```bash
npm run dev        # 启动 Vite 开发服务器 (localhost:5173)
npm run build      # 构建生产版本到 dist/ 目录
npm run pack       # 打包为 myjson-plugin.upx (uTools 安装包)
npm test           # 运行 Node.js 测试
```

开发模式：在 uTools 开发者工具中添加本项目目录，插件从 `http://localhost:5173` 加载（配置在 `plugin.json` 的 `development.main`）。

## 架构设计

### uTools 插件结构

- **plugin.json**：定义插件元数据、功能特性（features）和入口点。每个 feature 的 `code` 决定进入哪个模式。
- **preload.js**：Node.js 上下文脚本，通过 `window.preloadUtils` 暴露文件 I/O API。必须保持未压缩状态。
- **index.html**：uTools 主入口点。

### 入口模式（plugin.json features）

- `json_editor`：主编辑器（关键词："JSON"、"json"、"JSON编辑器"）
- `json_file`：打开文件作为 JSON 处理
- `json_format`：自动格式化选中的 JSON 文本（正则匹配）
- `json_compare`：JSON 比较视图
- `json_merge`：智能合并（多种策略）
- `json_three_way_merge`：三方合并（base + left + right）
- `json_table`：JSON 数组表格视图

入口处理在 `App.vue:onMounted` 中通过 `window.utools.onPluginEnter()` 实现。

### Vue 3 Composition API 架构

**主组件**：`src/App.vue` 协调所有功能，管理全局状态和模式切换。

**Composables**（可复用逻辑）：
- `useJsonOperations`：核心 JSON 操作（格式化、压缩、验证、反转义、移除注释）
- `useJsonStorage`：uTools 数据库保存/加载
- `useClipboard`：剪贴板操作
- `useHistory`：撤销/重做（最多 50 条记录）
- `useJsonPath`：JSONPath 和 JMESPath 查询
- `useJsonComparison`：JSON 差异比较
- `useJsonConverter`：JSON → 代码类型转换（quicktype-core）
- `useJsonMerge`：两方/三方合并（deep/override 策略）
- `useSchemaValidator`：Schema 验证、生成、Mock 数据
- `useBookmarks`：书签/收藏管理
- `useSnapshots`：操作快照（用于对比）

**Utils**（纯函数）：
- `jsonFormatter.js`：格式化/压缩 JSON
- `jsonCompressor.js`：压缩（可选转义）
- `jsonValidator.js`：验证并计算统计信息
- `jsonFixer.js`：6 级渐进式 JSON 修复
- `jsonComparer.js`：结构差异计算
- `jsonMerger.js`：合并策略实现
- `jsonConverter.js`：quicktype-core 包装器
- `jsonTableDetector.js`：智能检测可表格化的数组
- `excelConverter.js`：双向 JSON ↔ Excel（xlsx 库）
- `schemaValidator.js`、`schemaGenerator.js`、`mockGenerator.js`：Schema 相关

**Components**：
- `MonacoEditor.vue`：Monaco 编辑器（替代原 CodeMirror）
- `JsonTreeView.vue`：可折叠树形可视化
- `JsonGraphView.vue`：图谱可视化（jsoncrack-react）
- `TableView.vue`：JSON 数组可编辑表格
- `JsonCompareView.vue`：并排差异视图
- `ThreeWayMergeView.vue`：三方合并界面
- `JsonMergePanel.vue`：两方合并界面
- `TablePicker.vue`：多候选表格选择
- `SchemaValidatorPanel.vue`：Schema 验证面板
- `BookmarkPanel.vue`：收藏管理
- `ToolbarActions.vue`：主工具栏
- `StatusBar.vue`：状态栏

### 状态管理

不使用 Vuex/Pinia。状态通过：
1. Composables 返回响应式 refs
2. Vue `provide/inject` 用于深层组件树（`currentJson`、`parsedJson`、`expanded`）
3. Props 直接传递

### 文件 I/O 模式

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

### JSON 修复策略（jsonFixer.js）

6 级渐进式修复：
1. 标准 `JSON.parse()` - 已有效
2. `jsonrepair` 库 - 引号、逗号、括号
3. JSON5 解析 - 单引号、注释、尾随逗号、无引号键
4. 基础预处理 + jsonrepair
5. JSON5 + jsonrepair
6. 深度预处理 + JSON5 + jsonrepair

## 关键技术细节

### Monaco Editor 集成

使用 `@guolao/vue-monaco-editor`，替代了原 CodeMirror 6：
- 中文本地化：`monaco-locale-init.js` 设置 `globalThis._VSCODE_NLS_MESSAGES`
- 自定义右键菜单：提取路径、提取选中、格式化选中、复制 JSONPath
- 粘贴自动格式化：`onDidPaste` 时尝试解析并格式化
- Worker 配置：`jsonWorker` 和 `editorWorker`

### JsonGraphView（图谱可视化）

使用 `jsoncrack-react` + React 19：
- **AMD 冲突处理**：Monaco 的 AMD `define` 与 jsoncrack 的 UMD 冲突，通过 `suppressAmdDefine()` 临时移除 `window.define.amd` 解决
- 懒加载：动态 `import('react')`、`import('jsoncrack-react')`
- 路径提取：点击节点生成 JSONPath

### Vite 配置

- `base: './'` - uTools 本地文件加载必需
- 手动分块：`vendor`、`monaco-editor`、`json-tools`、`excel`、`quicktype`、`jsoncrack`
- 开发服务器：端口 5173，host `0.0.0.0`

### uTools API

常用 API（始终检查 `window.utools` 存在）：
- `window.utools.onPluginEnter(callback)`：入口处理器
- `window.utools.showSaveDialog/showOpenDialog(options)`：原生对话框
- `window.utools.db.*`：数据库操作
- `window.preloadUtils.readFile/writeFile`：文件 I/O

## 常见模式

### 添加新的 JSON 操作

1. 在 `src/utils/` 添加纯函数
2. 可选：集成到 `useJsonOperations` composable
3. 在 `App.vue` 添加处理器（前后调用 `pushHistory`）
4. 在 `ToolbarActions.vue` 添加按钮
5. 连接事件处理器

### 添加新的视图模式

1. 创建新组件
2. 在 `App.vue` 添加条件渲染（`v-if="showXxxMode"`）
3. 在 `plugin.json` 添加 feature 入口
4. 在 `onPluginEnter` 处理对应 `code`

## 构建输出

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── vendor-[hash].js
│   ├── monaco-editor-[hash].js
│   ├── json-tools-[hash].js
│   ├── excel-[hash].js
│   ├── quicktype-[hash].js
│   └── jsoncrack-[hash].js
├── plugin.json
├── preload.js
└── logo.png
```