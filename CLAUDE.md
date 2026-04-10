# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

uTools 平台的 JSON 处理插件，使用 Vue 3 + Vite 构建。支持格式化、压缩、验证、查询、比较、合并、Schema 工作台、多格式转换、数据脱敏等功能。

## 开发命令

```bash
npm run dev          # 启动开发服务器 (http://localhost:5173)
npm run build        # 构建生产版本到 dist/
npm run pack         # 打包为 myjson-plugin.upx
npm run test         # 运行 test/*.test.js 测试
```

## 架构设计

### uTools 插件结构

- **plugin.json**: 定义插件元数据、features 和入口点。每个 feature 有 `code` 决定应用模式
- **preload.js**: Node.js 上下文脚本，通过 `window.preloadUtils` 暴露文件 I/O API
- **index.html**: 主入口点，从开发服务器或构建文件加载

### 入口模式

- `json_editor`: 主编辑器
- `json_format`: 自动格式化选中文本
- `json_compare`: JSON 比较视图
- `json_merge`: 智能合并
- `json_three_way_merge`: 三方合并
- `json_convert`: 类型转换
- `json_table`: 表格视图

入口处理在 `App.vue:onMounted` 通过 `window.utools.onPluginEnter()` 实现。

### Vue 3 Composition API 架构

**主组件**: `src/App.vue` 协调所有功能并管理全局状态

**Composables** (`src/composables/`):
- `useJsonOperations`: 核心操作（格式化、压缩、验证、反转义、移除注释）
- `useJsonStorage`: uTools 数据库存储
- `useClipboard`: 剪贴板操作
- `useHistory`: 撤销/重做（最多 50 条）
- `useJsonPath`: JSONPath 和 JMESPath 查询
- `useJsonComparison`: JSON 差异比较
- `useJsonMerge`: 智能合并（深度合并、覆盖合并、数组合并策略）
- `useJsonConverter`: 类型转换（quicktype-core）
- `useSchemaValidator`: Schema 验证工作台
- `useBookmarks`: 书签管理
- `useSnapshots`: 编辑快照

**Utils** (`src/utils/`):
- `jsonFormatter.js`: 格式化 + 键名递归排序
- `jsonCompressor.js`: 压缩
- `jsonValidator.js`: 验证 + 统计
- `jsonFixer.js`: 6 级渐进式修复
- `jsonComparer.js`: 结构差异对比（动态规划对齐）
- `jsonMerger.js`: 智能合并引擎
- `jsonConverter.js`: 类型转换
- `commentRemover.js`: JSON5 注释移除
- `jsonUnescaper.js`: 反转义
- `excelConverter.js`: JSON ↔ Excel
- `xmlConverter.js`: JSON ↔ XML
- `yamlConverter.js`: JSON ↔ YAML
- `csvConverter.js`: JSON ↔ CSV
- `tomlConverter.js`: JSON ↔ TOML
- `dataMasker.js`: 数据脱敏（手机号/邮箱/身份证/银行卡/IP/姓名）
- `schemaValidator.js`: Schema 验证（Ajv）
- `schemaGenerator.js`: Schema 生成（多版本支持）
- `mockGenerator.js`: Mock 数据生成
- `schemaTemplates.js`: Schema 模板库

**Components** (`src/components/`):
- `JsonEditor.vue`: CodeMirror 6 编辑器（语法高亮、实时验证）
- `JsonTreeView.vue`: 可折叠树形视图
- `TableView.vue`: JSON 数组可编辑表格
- `JsonCompareView.vue`: 并排差异视图
- `CompareEditor.vue`: 比较编辑器
- `CompareToolbar.vue`: 比较工具栏
- `ThreeWayMergeView.vue`: 三方合并视图
- `JsonMergePanel.vue`: 合并面板
- `PathQueryPanel.vue`: JSONPath/JMESPath 查询
- `JsonConvertPanel.vue`: 类型转换
- `FormatConvertPanel.vue`: 格式转换（XML/YAML/CSV/TOML）
- `DataMaskerPanel.vue`: 数据脱敏面板
- `SchemaValidatorPanel.vue`: Schema 工作台
- `SchemaTemplateLibrary.vue`: Schema 模板库
- `HistoryPanel.vue`: 历史记录
- `BookmarkPanel.vue`: 书签管理
- `ToolbarActions.vue`: 主工具栏
- `StatusBar.vue`: 状态栏

### 状态管理

不使用 Vuex/Pinia。状态通过：
1. Composables 返回响应式 refs
2. Vue `provide/inject` 用于深层组件树（`currentJson`、`parsedJson`、树节点 `expanded` map）
3. 组件 props 直接传递

### 文件 I/O 模式

同时支持 uTools 环境和浏览器回退：

```javascript
if (window.utools && window.utools.showSaveDialog) {
  // uTools 原生 API
  const filePath = window.utools.showSaveDialog({...})
  window.preloadUtils.writeFile(filePath, content)
} else {
  // 浏览器回退（Blob 下载）
}
```

用于：`handleSaveToLocal()`、`handleImportJson()`、Excel 导入导出等。

### JSON 修复策略

`jsonFixer.js` 实现 6 级渐进式修复：
1. 标准 `JSON.parse()`
2. `jsonrepair` 库（修复引号、逗号、括号）
3. JSON5 解析（单引号、注释、尾随逗号、无引号键）
4. 基础预处理 + jsonrepair
5. JSON5 + jsonrepair
6. 深度预处理 + JSON5 + jsonrepair

每个级别依次尝试，UI 显示哪个级别成功。

## 关键技术细节

### Vite 配置
- `base: './'` 对于 uTools 本地文件加载至关重要
- 手动分块：vendor、json-tools、excel、quicktype、yaml-toml

### CodeMirror 6 集成
- `@codemirror/lang-json`: 语法高亮
- `@codemirror/lint`: 实时验证
- 自定义 linter 解析 JSON 并报告错误位置

### uTools 数据库
```javascript
window.utools.db.put({ _id, data, _rev })  // 保存
window.utools.db.get(id)                    // 读取
window.utools.db.remove(doc)                // 删除
```

### 测试
- 测试文件位于 `test/` 目录
- 使用 Node.js 原生测试运行器：`node --test test/*.test.js`
- 测试覆盖：格式转换、数据脱敏、JSON 比较、合并等

## 添加新功能

1. 在 `src/utils/` 添加工具函数（纯函数）
2. 可复用逻辑集成到 composables
3. 在 `App.vue` 添加处理器（操作前后调用 `pushHistory()`）
4. 在 `ToolbarActions.vue` 添加按钮
5. 在 `App.vue` 模板连接事件

### uTools API 使用

```javascript
if (window.utools && window.utools.someAPI) {
  // uTools 环境
} else {
  // 浏览器回退
}
```

常用 API：
- `window.utools.onPluginEnter(callback)`: 入口处理器
- `window.utools.showSaveDialog/showOpenDialog`: 原生对话框
- `window.utools.db.*`: 数据库操作
- `window.preloadUtils.*`: 文件 I/O

## 构建输出

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js/css
│   ├── vendor-[hash].js
│   ├── json-tools-[hash].js
│   ├── excel-[hash].js
│   ├── quicktype-[hash].js
│   └── yaml-toml-[hash].js
├── fonts/
├── plugin.json
├── preload.js
└── logo.png
```
