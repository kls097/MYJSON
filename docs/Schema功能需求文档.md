# JSON Schema 功能需求文档

## 文档信息
- **版本**: v1.0
- **创建日期**: 2026-02-02
- **项目**: MYJSON uTools 插件
- **当前版本**: v4.0.0

---

## 一、项目现状分析

### 1.1 已实现功能

根据 `docs/Schema验证功能使用指南.md` 和 `docs/功能优化报告.md`，当前项目已实现：

✅ **Schema 生成**（通过转换功能）
- 集成在"转换"面板中
- 使用 quicktype-core 库
- 从 JSON 数据生成 JSON Schema (Draft-07)
- 入口：工具栏 → 转换按钮 → 选择 "JSON Schema"

✅ **Schema 验证**
- 独立的 Schema 验证面板（右侧滑出，500px 宽）
- 使用 ajv (v8.12.0) + ajv-formats (v2.1.1)
- 支持详细错误提示（路径、描述、类型）
- 入口：工具栏 → Schema 按钮

✅ **Mock 数据生成**
- 集成在 Schema 验证面板中
- 使用 json-schema-faker (v0.5.3)
- 根据 Schema 自动生成测试数据
- 入口：Schema 面板 → 生成 Mock 数据按钮

### 1.2 技术架构

**核心文件**:
- `src/utils/schemaValidator.js` - 核心逻辑
- `src/composables/useSchemaValidator.js` - Vue Composable
- `src/components/SchemaValidatorPanel.vue` - UI 组件

**依赖库**:
- ajv: JSON Schema 验证
- ajv-formats: 格式验证扩展
- json-schema-faker: Mock 数据生成
- quicktype-core: Schema 生成（已有）

### 1.3 存在的问题

根据功能优化报告，当前存在以下问题：

❌ **功能分散**
- Schema 生成在"转换"面板
- Schema 验证在独立面板
- 用户需要在多个面板间切换

❌ **交互不连贯**
- 生成 Schema 后需要手动复制到验证面板
- 验证和 Mock 生成分离
- 缺少一键式工作流

❌ **功能入口不明确**
- 新用户难以发现 Schema 功能
- 三个功能的关联性不强

❌ **缺少高级特性**
- 无 Schema 编辑器（语法高亮、自动补全）
- 无 Schema 模板库
- 无批量验证
- 无验证规则可视化编辑

---

## 二、功能需求

### 2.1 Schema 验证功能

#### 2.1.1 核心需求

**功能描述**: 验证 JSON 数据是否符合 JSON Schema 规范

**当前实现**: ✅ 已实现基础功能

**优化需求**:

1. **增强错误提示**
   - 当前: 显示错误路径、描述、类型
   - 优化:
     - 在编辑器中高亮错误位置（CodeMirror 标记）
     - 点击错误跳转到对应行
     - 提供修复建议（如类型转换、格式修正）

2. **Schema 编辑器增强**
   - 当前: 普通文本框
   - 优化:
     - 使用 CodeMirror 6 编辑器（与主编辑器一致）
     - JSON Schema 语法高亮
     - 实时语法检查
     - 自动补全（type、properties、required 等关键字）

3. **验证模式**
   - 新增: 严格模式 / 宽松模式切换
   - 新增: 部分验证（仅验证指定路径）
   - 新增: 批量验证（多个 JSON 文件）

4. **验证结果导出**
   - 新增: 导出验证报告（JSON/HTML/Markdown）
   - 新增: 验证历史记录

#### 2.1.2 技术实现

**依赖库**: ajv (已集成)

**核心 API**:
```javascript
// src/utils/schemaValidator.js
validateJsonWithSchema(jsonData, schema, options)
// options: { strict: boolean, path: string, format: 'full' | 'simple' }
```

**UI 组件**: `SchemaValidatorPanel.vue` (已有，需增强)

**集成点**:
- 工具栏 "Schema" 按钮
- 右键菜单 "验证 Schema"
- 快捷键: Ctrl+Shift+V

---

### 2.2 Schema 生成功能

#### 2.2.1 核心需求

**功能描述**: 从 JSON 数据自动生成 JSON Schema 定义

**当前实现**: ✅ 已实现（在转换面板中）

**优化需求**:

1. **独立入口**
   - 当前: 隐藏在"转换"面板中
   - 优化:
     - 在 Schema 面板中添加"生成 Schema"按钮
     - 支持从当前 JSON 一键生成
     - 生成后自动填充到 Schema 编辑器

2. **生成选项**
   - 新增: Schema 版本选择（Draft-04/07/2019-09/2020-12）
   - 新增: 必需字段推断（全部必需 / 智能推断 / 全部可选）
   - 新增: 类型推断精度（严格 / 宽松）
   - 新增: 添加描述和示例

3. **Schema 优化**
   - 新增: 合并相似结构
   - 新增: 提取公共定义（$defs）
   - 新增: 生成 title 和 description

4. **增量生成**
   - 新增: 从多个 JSON 样本生成 Schema
   - 新增: 合并现有 Schema

#### 2.2.2 技术实现

**依赖库**: quicktype-core (已集成)

**核心 API**:
```javascript
// src/utils/schemaGenerator.js (新建)
generateSchema(jsonData, options)
// options: {
//   version: 'draft-07',
//   required: 'all' | 'infer' | 'none',
//   strict: boolean,
//   addExamples: boolean
// }

mergeSchemas(schemas) // 合并多个 Schema
```

**UI 组件**: 集成到 `SchemaValidatorPanel.vue`

**集成点**:
- Schema 面板 "生成 Schema" 按钮
- 工具栏快捷按钮
- 快捷键: Ctrl+Shift+G

---

### 2.3 Mock 数据生成功能

#### 2.3.1 核心需求

**功能描述**: 根据 JSON Schema 自动生成符合规范的测试数据

**当前实现**: ✅ 已实现基础功能

**优化需求**:

1. **生成选项**
   - 当前: 单次生成一个对象
   - 优化:
     - 批量生成（生成 N 条数据）
     - 生成数组或单个对象
     - 自定义数据规模（数组长度、字符串长度等）

2. **数据真实性**
   - 新增: 中文数据支持（姓名、地址、公司等）
   - 新增: 自定义 Faker 配置
   - 新增: 使用真实数据源（如 Chance.js、Faker.js）

3. **Mock 模板**
   - 新增: 常用 Mock 模板库（用户信息、订单、商品等）
   - 新增: 自定义模板保存
   - 新增: 模板分享和导入

4. **高级特性**
   - 新增: 关联数据生成（如 userId 关联 user 表）
   - 新增: 自定义生成规则（正则、函数）
   - 新增: 增量 Mock（基于现有数据生成）

#### 2.3.2 技术实现

**依赖库**:
- json-schema-faker (已集成)
- 可选: @faker-js/faker (中文支持更好)

**核心 API**:
```javascript
// src/utils/mockGenerator.js (新建)
generateMockData(schema, options)
// options: {
//   count: number,        // 生成数量
//   locale: 'zh_CN',      // 语言
//   seed: number,         // 随机种子（可复现）
//   template: string      // 模板名称
// }

saveMockTemplate(name, schema, config)
loadMockTemplate(name)
```

**UI 组件**: 集成到 `SchemaValidatorPanel.vue`

**集成点**:
- Schema 面板 "生成 Mock 数据" 按钮
- 支持配置弹窗
- 快捷键: Ctrl+Shift+M

---

## 三、用户体验优化

### 3.1 统一工作流

**目标**: 将三个功能整合为连贯的工作流

**方案**:

1. **Schema 面板重构**
   ```
   ┌─────────────────────────────────────┐
   │  Schema 工作台                       │
   ├─────────────────────────────────────┤
   │  [生成Schema] [验证数据] [生成Mock]  │
   ├─────────────────────────────────────┤
   │  Schema 编辑器 (CodeMirror)          │
   │  {                                   │
   │    "type": "object",                 │
   │    "properties": {...}               │
   │  }                                   │
   ├─────────────────────────────────────┤
   │  验证结果 / Mock 配置                │
   │  ✅ 验证通过                         │
   │  或                                  │
   │  ❌ 3 个错误:                        │
   │     1. /name: 长度不能小于 1         │
   │     2. /age: 值不能大于 150          │
   ├─────────────────────────────────────┤
   │  [加载示例] [保存Schema] [导出报告]  │
   └─────────────────────────────────────┘
   ```

2. **快速操作流程**
   - 流程 A: JSON → 生成 Schema → 验证 → 调整 Schema
   - 流程 B: Schema → 生成 Mock → 验证 Mock → 导出
   - 流程 C: 加载示例 → 学习 → 自定义

3. **智能提示**
   - 首次使用显示引导
   - 操作失败时提供建议
   - 快捷键提示

### 3.2 UI/UX 改进

1. **面板布局**
   - 当前: 右侧固定 500px
   - 优化: 可调整宽度（300-800px）
   - 支持全屏模式

2. **主题适配**
   - 适配深色/浅色主题
   - Schema 编辑器与主编辑器主题一致

3. **响应式设计**
   - 小屏幕下自动调整布局
   - 移动端友好（如果支持）

### 3.3 性能优化

1. **大数据处理**
   - 验证超过 1MB 的 JSON 时显示进度条
   - 使用 Web Worker 进行后台验证
   - 分批验证大数组

2. **缓存机制**
   - 缓存最近使用的 Schema
   - 缓存验证结果
   - 缓存 Mock 模板

---

## 四、技术方案

### 4.1 架构设计

```
src/
├── utils/
│   ├── schemaValidator.js      (已有，增强)
│   ├── schemaGenerator.js      (新建)
│   ├── mockGenerator.js        (新建)
│   └── schemaTemplates.js      (新建 - 模板库)
├── composables/
│   ├── useSchemaValidator.js   (已有，增强)
│   ├── useSchemaGenerator.js   (新建)
│   └── useMockGenerator.js     (新建)
├── components/
│   ├── SchemaValidatorPanel.vue (已有，重构)
│   ├── SchemaEditor.vue         (新建 - CodeMirror)
│   ├── ValidationResult.vue     (新建 - 结果展示)
│   ├── MockConfigDialog.vue     (新建 - Mock 配置)
│   └── SchemaTemplateLibrary.vue (新建 - 模板库)
```

### 4.2 依赖管理

**需要新增的依赖**:
```json
{
  "dependencies": {
    "@faker-js/faker": "^8.4.0",  // 更好的中文支持
    "chance": "^1.1.11"            // 可选：更多数据类型
  }
}
```

**已有依赖**:
- ajv: ^8.12.0 ✅
- ajv-formats: ^2.1.1 ✅
- json-schema-faker: ^0.5.3 ✅
- quicktype-core: ^23.2.6 ✅

### 4.3 数据存储

**Schema 存储**:
```javascript
// 使用 uTools 数据库
window.utools.db.put({
  _id: 'schema_' + Date.now(),
  data: {
    name: 'User Schema',
    schema: {...},
    createdAt: Date.now()
  }
})
```

**Mock 模板存储**:
```javascript
window.utools.db.put({
  _id: 'mock_template_' + name,
  data: {
    name: 'User Template',
    schema: {...},
    config: {...},
    createdAt: Date.now()
  }
})
```

---

## 五、实施计划

### 5.1 开发阶段

**阶段 1: 核心功能增强**
- [ ] 重构 SchemaValidatorPanel 组件
- [ ] 集成 CodeMirror 到 Schema 编辑器
- [ ] 增强错误提示和高亮
- [ ] 实现 Schema 生成选项

**阶段 2: Mock 功能扩展**
- [ ] 创建 MockConfigDialog 组件
- [ ] 集成 @faker-js/faker
- [ ] 实现批量生成
- [ ] 实现中文数据支持

**阶段 3: 模板系统**
- [ ] 创建 SchemaTemplateLibrary 组件
- [ ] 实现模板保存/加载
- [ ] 内置常用模板（用户、订单、商品等）
- [ ] 实现模板导入/导出

**阶段 4: 高级特性**
- [ ] 实现批量验证
- [ ] 实现验证报告导出
- [ ] 实现 Schema 版本切换
- [ ] 实现增量 Schema 生成

**阶段 5: 优化和测试**
- [ ] 性能优化（Web Worker）
- [ ] UI/UX 优化
- [ ] 单元测试
- [ ] 用户测试和反馈

### 5.2 优先级

**P0 (必须实现)**:
- Schema 编辑器 CodeMirror 集成
- 错误高亮和跳转
- 批量 Mock 生成
- 中文数据支持

**P1 (重要)**:
- Schema 生成选项
- Mock 配置弹窗
- 模板库（内置模板）
- 验证报告导出

**P2 (可选)**:
- 批量验证
- 自定义模板
- Schema 版本切换
- 增量生成

---

## 六、验收标准

### 6.1 功能验收

**Schema 验证**:
- ✅ 支持 JSON Schema Draft-07
- ✅ 错误提示准确且详细
- ✅ 编辑器中高亮错误位置
- ✅ 支持点击错误跳转
- ✅ 验证速度 < 2 秒（1MB JSON）

**Schema 生成**:
- ✅ 从 JSON 准确生成 Schema
- ✅ 支持版本选择
- ✅ 支持必需字段配置
- ✅ 生成的 Schema 可直接用于验证

**Mock 数据生成**:
- ✅ 生成的数据符合 Schema
- ✅ 支持批量生成
- ✅ 支持中文数据
- ✅ 数据真实性高

### 6.2 性能验收

- 验证 100KB JSON < 500ms
- 验证 1MB JSON < 2s
- 生成 Schema < 1s
- 生成 100 条 Mock 数据 < 3s

### 6.3 用户体验验收

- 新用户 5 分钟内学会基本操作
- 操作流程不超过 3 步
- 错误提示清晰易懂
- 界面响应流畅

---

## 七、风险和挑战

### 7.1 技术风险

1. **性能问题**
   - 风险: 大 JSON 验证可能卡顿
   - 缓解: 使用 Web Worker，分批处理

2. **依赖库兼容性**
   - 风险: ajv 和 json-schema-faker 可能冲突
   - 缓解: 充分测试，必要时降级或替换

3. **CodeMirror 集成**
   - 风险: 与现有编辑器冲突
   - 缓解: 复用现有配置，保持一致性

### 7.2 用户体验风险

1. **功能复杂度**
   - 风险: 功能太多导致用户困惑
   - 缓解: 提供引导，隐藏高级选项

2. **学习曲线**
   - 风险: JSON Schema 本身有学习成本
   - 缓解: 提供示例和模板，降低门槛

---

## 八、成功指标

### 8.1 功能指标

- Schema 验证准确率 > 99%
- Mock 数据通过验证率 > 95%
- Schema 生成准确率 > 90%

### 8.2 性能指标

- 验证响应时间 < 2s (1MB)
- Mock 生成速度 > 50 条/秒
- 内存占用 < 100MB

### 8.3 用户指标

- 功能使用率 > 30%（活跃用户）
- 用户满意度 > 4.0/5.0
- Bug 率 < 1%

---

## 九、参考资料

### 9.1 JSON Schema 规范

- [JSON Schema Official](https://json-schema.org/)
- [Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)
- [JSON Schema Draft-07](https://json-schema.org/draft-07/json-schema-release-notes.html)

### 9.2 依赖库文档

- [ajv Documentation](https://ajv.js.org/)
- [json-schema-faker](https://github.com/json-schema-faker/json-schema-faker)
- [@faker-js/faker](https://fakerjs.dev/)
- [quicktype](https://quicktype.io/)

### 9.3 竞品分析

- [JSON Schema Validator (online)](https://www.jsonschemavalidator.net/)
- [Postman Schema Validation](https://learning.postman.com/docs/sending-requests/validating-responses/)
- [Stoplight Studio](https://stoplight.io/studio)

---

## 十、附录

### 10.1 示例 Schema

**用户信�� Schema**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User",
  "type": "object",
  "properties": {
    "id": {
      "type": "integer",
      "minimum": 1
    },
    "username": {
      "type": "string",
      "minLength": 3,
      "maxLength": 20,
      "pattern": "^[a-zA-Z0-9_]+$"
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "age": {
      "type": "integer",
      "minimum": 18,
      "maximum": 100
    },
    "roles": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["admin", "user", "guest"]
      },
      "minItems": 1,
      "uniqueItems": true
    },
    "profile": {
      "type": "object",
      "properties": {
        "avatar": {
          "type": "string",
          "format": "uri"
        },
        "bio": {
          "type": "string",
          "maxLength": 500
        }
      }
    }
  },
  "required": ["id", "username", "email"]
}
```

### 10.2 Mock 模板示例

**订单模板**:
```json
{
  "name": "Order Template",
  "schema": {
    "type": "object",
    "properties": {
      "orderId": { "type": "string", "pattern": "^ORD[0-9]{10}$" },
      "userId": { "type": "integer" },
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "productId": { "type": "string" },
            "quantity": { "type": "integer", "minimum": 1 },
            "price": { "type": "number", "minimum": 0 }
          }
        }
      },
      "totalAmount": { "type": "number" },
      "status": { "type": "string", "enum": ["pending", "paid", "shipped", "completed"] },
      "createdAt": { "type": "string", "format": "date-time" }
    }
  },
  "config": {
    "locale": "zh_CN",
    "count": 10
  }
}
```

---

**文档结束**
