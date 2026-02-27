# JSON 比较功能 Bug 测试报告

> **测试时间**: 2026-02-27 12:05  
> **测试分支**: feature/小黑  
> **测试人员**: 小黑 (AI 助手)  
> **测试工具**: 自动化脚本 `test/compare-bug-test.js`

---

## 📊 测试概览

| 指标 | 数值 |
|------|------|
| 总测试数 | 20 |
| 通过 | 2 (10%) |
| 失败 | 18 (90%) |

---

## 🔥 核心 Bug：对齐输出 JSON 尾部逗号（Trailing Comma）问题

### Bug 描述

`generateAlignedDiff()` 函数（位于 `src/utils/jsonComparer.js`）在生成对齐的 diff 视图时，**会在不该有逗号的地方添加逗号**，导致去掉占位行后的 JSON 无法通过 `JSON.parse()` 验证。

### 根因分析

问题出在 `alignObjectProps()` 和 `alignArrays()` 两个函数中的逗号计算逻辑。

#### 场景一：对侧有新增/删除属性时，逗号计算基于 `allKeys` 而非实际可见属性

**文件**: `src/utils/jsonComparer.js` → `alignObjectProps()` 函数

```javascript
// 当前逻辑（有 bug）
for (let i = 0; i < allKeys.length; i++) {
    const key = allKeys[i]
    const isLast = i === allKeys.length - 1  // ❌ 这里用的是 allKeys 的索引
    const comma = isLast ? '' : ','           // ❌ 逗号判断基于合并后的键列表
    ...
}
```

**问题**：`allKeys` 包含了左右两侧合并后的所有键名。当某个键只存在于一侧时，对侧的占位行不应影响逗号的添加。但当前逻辑是按照 `allKeys` 中的位置决定是否添加逗号，导致：

- **一侧的最后一个实际属性后面被加了逗号**（因为 `allKeys` 中它后面还有只属于对侧的键）
- **嵌套对象闭括号后被加了逗号**（因为后面有只属于对侧的键）

**示例**：

```
左侧: { "a": 1, "b": 2 }
右侧: { "a": 1, "b": 2, "c": 3 }
```

对齐后左侧输出（去掉占位行后）：
```json
{
  "a": 1,
  "b": 2,   ← 这里不应该有逗号！因为 "c" 只在右侧，左侧的 "b" 是最后一个属性
}
```

#### 场景二：数组元素增删时，同样的逗号错误

**文件**: `src/utils/jsonComparer.js` → `alignArrays()` 函数

```javascript
for (let k = 0; k < alignment.length; k++) {
    const isLast = k === alignment.length - 1  // ❌ 同样问题
    const comma = isLast ? '' : ','
    ...
}
```

数组中如果一侧有多余元素（占位行），对侧最后一个实际元素后面也会被错误地加上逗号。

#### 场景三：嵌套结构中逗号错误层层传播

在嵌套对象中，每一层都可能出现上述问题，导致：
- 嵌套对象的闭括号 `}` 后面多逗号
- 嵌套数组的闭括号 `]` 后面多逗号
- 多层嵌套时，错误被放大

---

## 🧪 详细测试结果

### ❌ 失败用例

| # | 测试名称 | 失败侧 | 具体错误 |
|---|---------|--------|---------|
| 1 | 基本对象比较 - 部分键不同 | 左侧 | `"city": "Beijing",` 后多逗号（右侧无 city，有 country） |
| 2 | 嵌套对象 - 深层属性差异 | 左侧 | 嵌套对象内部属性末尾多逗号 |
| 3 | 数组比较 - 元素增删 | 左侧 | 数组最后一个元素后多逗号，`]` 前有 trailing comma |
| 4 | 大型复杂 JSON - API 响应 | 两侧 | 多处嵌套结构逗号错误 |
| 5 | 末尾逗号 - 左侧多键 | 右侧 | `"b": 2,` 后不该有逗号 |
| 6 | 末尾逗号 - 右侧多键 | 左侧 | `"b": 2,` 后不该有逗号 |
| 7 | 中间插入键 | 左侧 | `"last": 3,` 变成了非最后属性 |
| 8 | 嵌套数组中的对象差异 | 左侧 | 对象内新增属性导致对侧多逗号 + `enabled` 后多逗号 |
| 10 | 电商订单数据 | 左侧 | 大量嵌套导致多处逗号错误 |
| 11 | 顶层数组比较 | 左侧 | 数组元素对象内部 + 数组末尾多逗号 |
| 12 | 特殊字符键名 | 左侧 | 末尾属性后多逗号 |
| 13 | 多层嵌套数组 | 两侧 | 嵌套数组末尾多逗号 |
| 15 | 最后属性删除 | 右侧 | `"b": 2,` 后多逗号 |
| 16 | 深层嵌套 5+ 层 | 左侧 | 每层嵌套闭括号前多逗号 |
| 17 | 大量键对象 | 左侧 | 最后一个属性后多逗号 |
| 18 | 混合数组 | 两侧 | 数组元素增删导致 trailing comma |
| 19 | 长字符串值 | 左侧 | 最后属性后多逗号 |
| 20 | 完全不同的对象 | 左侧 | 闭括号前多逗号 |

### ✅ 通过用例

| # | 测试名称 | 说明 |
|---|---------|------|
| 9 | 空对象和空数组比较 | 两侧都从空变非空��没有混合增删 |
| 14 | 值类型变化 | 所有键两侧都存在，只是值不同，不触发逗号问题 |

---

## 🔧 修复建议

### 核心修复思路

逗号是否添加，应该基于**该侧实际可见的属性列表**，而不是合并后的 `allKeys`。

#### 方案 A：为每侧独立计算 `isLast`

```javascript
// alignObjectProps() 中
// 预计算每侧的最后一个实际属性索引
const leftLastIndex = findLastIndex(allKeys, key => key in leftObj)
const rightLastIndex = findLastIndex(allKeys, key => key in rightObj)

for (let i = 0; i < allKeys.length; i++) {
    const key = allKeys[i]
    const hasLeft = key in leftObj
    const hasRight = key in rightObj
    
    // 每侧独立决定逗号
    const leftComma = (hasLeft && i < leftLastIndex) ? ',' : ''
    const rightComma = (hasRight && i < rightLastIndex) ? ',' : ''
    
    // ... 分别使用 leftComma 和 rightComma
}
```

#### 方案 B：后处理 - 对齐完成后修正逗号

在 `generateAlignedDiff()` 返回前，遍历每侧的行，根据 `lineTypes` 重新计算逗号：
1. 找出每侧所有非占位行
2. 对于每个 `}` 或 `]` 的闭括号前一行，如果它是该侧最后一个属性/元素，去掉尾部逗号
3. 对于非最后一个属性/元素，确保有逗号

推荐**方案 A**，从根本上解决问题，而不是事后打补丁。

`alignArrays()` 函数也需要做同样的修改。

---

## 📎 附件

- 测试脚本: `test/compare-bug-test.js`（可用 `node test/compare-bug-test.js` 运行）
- 涉及源码: `src/utils/jsonComparer.js` → `alignObjectProps()`, `alignArrays()`

---

## 💡 其他观察

1. **逗号问题是目前最严重的 bug**，几乎所有涉及键增删的场景都会触发
2. **UI 层面**：`CompareEditor.vue` 的 `extractOriginalJson()` 虽然会过滤占位行，但无法修复逗号问题，因为逗号已经写在了实际内容行中
3. **用户感知**：在比较视图中编辑后重新比较，会因为 trailing comma 导致 JSON 解析失败，出现"JSON 格式错误"提示
