<template>
  <div class="tree-node" :style="{ marginLeft: `${depth * 16}px` }">
    <div class="node-line" :class="{ 'node-highlighted': isHighlighted }" @mouseenter="showExtractBtn = true" @mouseleave="showExtractBtn = false">
      <!-- Toggle icon for expandable nodes -->
      <span
        v-if="isExpandable"
        class="toggle-icon"
        @click="toggle"
      >
        {{ isExpanded ? '▼' : '▶' }}
      </span>
      <span v-else class="toggle-placeholder"></span>

      <!-- Type icon -->
      <span class="type-icon">{{ getTypeIcon(data, nodeKey) }}</span>

      <!-- Node key (only for child nodes, not root) -->
      <span v-if="nodeKey !== null && nodeKey !== undefined" class="node-key" @click="copyValue">{{ formatKey(nodeKey) }}</span>

      <!-- Extract path button (only show on hover, right after key) -->
      <button
        v-if="showExtractBtn && depth > 0 && (nodeKey !== null && nodeKey !== undefined)"
        class="extract-btn"
        @click.stop="extractPath"
        title="提取路径并查询"
      >
        提取
      </button>

      <!-- Extract to editor button -->
      <button
        v-if="showExtractBtn && depth > 0 && (nodeKey !== null && nodeKey !== undefined)"
        class="extract-btn extract-editor-btn"
        @click.stop="extractToEditor"
        title="提取到编辑器"
      >
        →编辑器
      </button>

      <!-- Node content with syntax highlighting -->
      <span class="node-content">
        <template v-if="isExpandable">
          <span class="bracket">{{ Array.isArray(data) ? '[' : '{' }}</span>
        </template>
        <template v-else>
          <span class="node-value" :class="getValueClass(data)" @click="copyValue">
            {{ formatValue(data) }}
          </span>
        </template>
      </span>
    </div>

    <!-- Children (recursive) -->
    <div v-if="isExpandable && isExpanded" class="node-children">
      <TreeNode
        v-for="entry in entries"
        :key="entry.key"
        :data="entry.value"
        :node-key="entry.key"
        :path="entry.path"
        :depth="depth + 1"
        :expanded="expanded"
        :highlighted-path="highlightedPath"
        :search-query="searchQuery"
        @toggle="$emit('toggle', $event)"
        @copy="$emit('copy', $event)"
        @extract-path="$emit('extract-path', $event)"
        @extract-to-editor="$emit('extract-to-editor', $event)"
      />

      <!-- Closing bracket -->
      <div class="closing-bracket" :style="{ marginLeft: `${depth * 16}px` }">
        <span class="toggle-placeholder"></span>
        <span class="type-icon"></span>
        <span class="bracket">{{ Array.isArray(data) ? ']' : '}' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  data: {
    type: [Object, Array, String, Number, Boolean, null],
    required: true
  },
  nodeKey: {
    type: [String, Number],
    default: null
  },
  path: {
    type: String,
    default: '$'
  },
  depth: {
    type: Number,
    default: 0
  },
  expanded: {
    type: Map,
    required: true
  },
  highlightedPath: {
    type: String,
    default: null
  },
  searchQuery: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['toggle', 'copy', 'extract-path', 'extract-to-editor'])

const showExtractBtn = ref(false)

const isExpandable = computed(() =>
  typeof props.data === 'object' && props.data !== null
)

const isExpanded = computed(() =>
  props.expanded.get(props.path) ?? (props.depth < 2)
)

// 判断当前节点是否应该高亮
const isHighlighted = computed(() => {
  if (!props.highlightedPath) return false
  return props.path === props.highlightedPath
})

// 检查 key 是否需要括号表示法（包含特殊字符）
const needsBracketNotation = (key) => {
  // JSONPath 特殊字符: . @ [ ] ( ) ' " $ * , : \s \t \n \r
  const specialChars = /[.\@\[\]\(\)'"$\*,:\s]/
  return specialChars.test(key)
}

// 转义 key 中的引号
const escapeKey = (key) => {
  return key.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

const entries = computed(() => {
  if (Array.isArray(props.data)) {
    return props.data.map((item, index) => ({
      key: index,
      value: item,
      path: `${props.path}[${index}]`
    }))
  } else if (typeof props.data === 'object' && props.data !== null) {
    return Object.entries(props.data).map(([key, value]) => ({
      key,
      value,
      path: needsBracketNotation(key)
        ? `${props.path}['${escapeKey(key)}']`
        : `${props.path}.${key}`
    }))
  }
  return []
})

const toggle = () => {
  if (isExpandable.value) {
    emit('toggle', props.path)
  }
}

const copyValue = () => {
  const value = JSON.stringify(props.data, null, 2)
  emit('copy', value)
}

const getTypeLabel = (value) => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return `Array[${value.length}]`
  if (typeof value === 'object') return `Object{${Object.keys(value).length}}`
  return typeof value
}

const getTypeIcon = (value, key) => {
  // 根节点不显示图标（key 为 null 或 undefined）
  if (key === null || key === undefined) return ''

  if (value === null) return '∅'
  if (Array.isArray(value)) return '[]'
  if (typeof value === 'object') return '{}'
  if (typeof value === 'string') return '"'
  if (typeof value === 'number') return '#'
  if (typeof value === 'boolean') return value ? '✓' : '✗'
  return '•'
}

const formatKey = (key) => {
  // 如果是数字(数组下标),直接显示 [index]
  if (typeof key === 'number') {
    return `[${key}]`
  }
  // 对象属性显示为 "key":
  return `"${key}":`
}

const getValueClass = (value) => {
  if (value === null) return 'value-null'
  if (typeof value === 'string') return 'value-string'
  if (typeof value === 'number') return 'value-number'
  if (typeof value === 'boolean') return 'value-boolean'
  return ''
}

const formatValue = (value) => {
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'boolean') return value.toString()
  if (typeof value === 'number') return value.toString()
  return JSON.stringify(value)
}

// 提取路径
const extractPath = () => {
  emit('extract-path', props.path)
}

// 提取到编辑器
const extractToEditor = () => {
  emit('extract-to-editor', props.data)
}
</script>

<style scoped>
.tree-node {
  user-select: none;
  font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.3;
}

.node-line {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 1px 4px;
  min-height: 18px;
  border-radius: 3px;
  transition: var(--transition);
}

.node-line:hover {
  background: var(--bg-hover);
}

/* 高亮搜索匹配的节点 */
.node-line.node-highlighted {
  background: rgba(33, 150, 243, 0.15);
  border: 1px solid rgba(33, 150, 243, 0.4);
  border-radius: 3px;
  animation: highlight-pulse 1.5s ease-in-out;
}

@keyframes highlight-pulse {
  0% {
    background: rgba(33, 150, 243, 0.4);
  }
  100% {
    background: rgba(33, 150, 243, 0.15);
  }
}

.toggle-icon {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 8px;
  transition: var(--transition);
  flex-shrink: 0;
}

.toggle-icon:hover {
  color: var(--primary);
}

.toggle-placeholder {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* Type icon with color coding */
.type-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  border-radius: 2px;
  padding: 2px;
  color: #2196F3; /* 蓝色 - 默认 */
}

.node-key {
  color: #d73a49;
  font-weight: normal;
  flex-shrink: 0;
  cursor: pointer;
  transition: var(--transition);
}

.node-key:hover {
  text-decoration: underline;
}

.extract-btn {
  padding: 1px 6px;
  font-size: 10px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
  flex-shrink: 0;
  opacity: 0;
  margin-left: 4px;
}

.node-line:hover .extract-btn {
  opacity: 1;
}

.extract-btn:hover {
  background: var(--primary-hover);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.extract-btn:active {
  transform: scale(0.95);
}

.extract-editor-btn {
  background: #28a745;
}

.extract-editor-btn:hover {
  background: #218838;
}

.node-content {
  cursor: pointer;
  transition: var(--transition);
  flex: 1;
  min-width: 0;
}

.node-content:hover {
  color: var(--primary);
}

.node-value {
  word-break: break-all;
}

/* 语法高亮颜色 - 保持示例图的颜色 */
.value-string {
  color: #22863a;
}

.value-number {
  color: #005cc5;
}

.value-boolean {
  color: #005cc5;
}

.value-null {
  color: #6f42c1;
}

.bracket {
  color: #6a737d;
}

.node-children {
  margin-left: 0;
}

.closing-bracket {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 1px 4px;
  min-height: 18px;
}
</style>
