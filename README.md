# JSON工具箱 - uTools插件

一个功能强大的 JSON 处理工具,为 uTools 平台开发。支持格式化、压缩、验证、查询和历史记录管理等功能。

![Logo](logo.png)

## 功能特性

- **JSON编辑器** - 主编辑器界面,支持完整的 JSON 编辑功能
- **格式化/压缩** - 一键美化或压缩 JSON 代码
- **智能验证** - 实时检测 JSON 语法错误
- **JSONPath查询** - 支持 JSONPath 和 JMESPath 两种查询语法
- **历史记录** - 自动保存历史记录,支持云同步
- **注释移除** - 支持移除 JSON5 风格的注释
- **反转义** - 处理转义字符

## 技术栈

- **前端框架**: Vue 3 + Vite
- **编辑器**: CodeMirror 6
- **查询引擎**: JSONPath Plus, JMESPath
- **平台**: uTools 插件框架

## 开发

### 环境要求

- Node.js 16+
- npm 或 yarn
- uTools 客户端

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

开发服务器将在 `http://localhost:5173` 启动。在 uTools 开发者工具中添加本项目目录即可进行调试。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

### 打包为 uTools 插件

```bash
npm run pack
```

将生成 `myjson-plugin.upx` 文件,可以通过 uTools 开发者工具进行安装测试。

## 使用说明

### 功能入口

1. **主编辑器**: 在 uTools 中输入 `json`、`JSON编辑器`、`JSON工具` 等关键词
2. **快速格式化**: 选中任意 JSON 文本,在 uTools 中会自动匹配"格式化JSON"功能
3. **查询JSON**: 在 uTools 中选中任意文本,通过 over 匹配进入查询模式
4. **历史记录**: 输入 `JSON历史`、`历史记录` 查看已保存的 JSON

### 快捷键

- 格式化: 点击工具栏"格式化"按钮
- 压缩: 点击"压缩"按钮,自动复制到剪贴板
- 保存: 点击"保存"按钮,输入名称保存到历史记录

## 项目结构

```
/MYJSON
├── plugin.json          # uTools 插件配置文件
├── preload.js           # 预加载脚本(Node.js API)
├── index.html           # 主页��
├── logo.png             # 插件图标
├── package.json         # 项目配置
├── vite.config.js       # Vite 配置
└── src/
    ├── App.vue          # 主应用组件
    ├── main.js          # 入口文件
    ├── components/      # Vue 组件
    ├── composables/     # 组合式函数
    ├── utils/           # 工具函数
    └── styles/          # 样式文件
```

## 开发指南

详细的开发指南请参考 [CLAUDE.md](CLAUDE.md)。

## 发布

### 打包为离线安装包

使用 uTools 开发者工具的打包功能,生成 UPXS 格式的离线安装包。

### 发布到应用市场

参考 uTools 官方文档: [发布到应用市场](https://www.u-tools.cn/docs/developer/basic/publish-plugin.html)

## 许可证

MIT License

## 作者

guguangyi

## 相关链接

- [uTools 官网](https://www.u-tools.cn/)
- [uTools 开发者文档](https://www.u-tools.cn/docs/developer/)
