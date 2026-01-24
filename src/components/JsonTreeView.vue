<template>
  <div class="json-tree-view">
    <div v-if="!data" class="empty-tree">
      <p>No valid JSON to display</p>
    </div>
    <template v-else>
      <!-- 搜索框 -->
      <div class="tree-search-box">
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          placeholder="搜索节点..."
          class="search-input"
          @input="handleSearch"
          @keydown.down.prevent="navigateResults(1)"
          @keydown.up.prevent="navigateResults(-1)"
          @keydown.enter.prevent="navigateResults(1)"
        />
        <span v-if="searchResults.length > 0" class="search-count">
          {{ currentResultIndex + 1 }} / {{ searchResults.length }}
        </span>
        <button
          v-if="searchQuery"
          class="search-clear"
          @click="clearSearch"
          title="清除搜索"
        >
          ✕
        </button>
      </div>

      <!-- 树形视图 -->
      <div class="tree-container">
        <TreeNode
          :data="data"
          :path="'$'"
          :depth="0"
          :expanded="expanded"
          :highlighted-path="currentResultPath"
          :search-query="searchQuery"
          @toggle="toggleNode"
          @copy="copyValue"
          @extract-path="handleExtractPath"
          @extract-to-editor="handleExtractToEditor"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { inject, ref, computed, watch, nextTick } from 'vue'
import TreeNode from './TreeNode.vue'
import { useClipboard } from '../composables/useClipboard'

const props = defineProps({
  data: {
    type: [Object, Array, String, Number, Boolean, null],
    default: null
  }
})

const emit = defineEmits(['extract-path', 'extract-to-editor'])

const expanded = inject('expanded')
const { copyToClipboard } = useClipboard()

// 搜索相关状态
const searchQuery = ref('')
const searchResults = ref([])
const currentResultIndex = ref(0)
const searchInput = ref(null)

// 当前高亮的路径
const currentResultPath = computed(() => {
  if (searchResults.value.length === 0) return null
  return searchResults.value[currentResultIndex.value]?.path || null
})

// 递归搜索节点
const searchInNode = (data, path, query, results = []) => {
  if (!query || query.trim() === '') return results

  const queryLower = query.toLowerCase()

  // 检查当前节点的 key（如果是根节点则跳过）
  if (path !== '$') {
    // 从路径中提取 key
    const lastBracket = path.lastIndexOf('[')
    const lastDot = path.lastIndexOf('.')
    let key = ''

    if (lastBracket > lastDot) {
      // 数组索引 [数字]
      key = path.substring(lastBracket)
    } else if (lastDot > 0) {
      // 对象属性 .key 或 ['key']
      key = path.substring(lastDot)
      if (key.startsWith("['")) {
        key = key.substring(2, key.length - 2)
      } else {
        key = key.substring(1)
      }
    }

    if (key && key.toLowerCase().includes(queryLower)) {
      results.push({ path, type: 'key', key })
    }
  }

  // 检查当前节点的值（如果是原始类型）
  if (typeof data !== 'object' || data === null) {
    const valueStr = String(data)
    if (valueStr.toLowerCase().includes(queryLower)) {
      // 避免重复添加（如果已经因为 key 匹配添加过）
      if (!results.find(r => r.path === path)) {
        results.push({ path, type: 'value', value: valueStr })
      }
    }
    return results
  }

  // 递归搜索子节点
  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      searchInNode(item, `${path}[${index}]`, query, results)
    })
  } else {
    Object.entries(data).forEach(([key, value]) => {
      // 检查 key 是否需要括号表示法
      const specialChars = /[.\@\[\]\(\)'"$\*,:\s]/
      const childPath = specialChars.test(key)
        ? `${path}['${key.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}']`
        : `${path}.${key}`
      searchInNode(value, childPath, query, results)
    })
  }

  return results
}

// 展开包含搜索结果的所有父级节点
const expandPathTo = (targetPath) => {
  if (!targetPath || targetPath === '$') return

  let currentPath = '$'
  let i = 1 // 跳过开头的 '$'

  while (i < targetPath.length) {
    // 检查下一个字符
    const char = targetPath[i]

    if (char === '[') {
      // 数组索引格式: [0] 或 ['key']
      const closeBracket = targetPath.indexOf(']', i)
      if (closeBracket === -1) break

      const content = targetPath.substring(i + 1, closeBracket)
      currentPath += `[${content}]`
      expanded.set(currentPath, true)
      i = closeBracket + 1
    } else if (char === '.') {
      // 点号访问: .key
      const nextBracket = targetPath.indexOf('[', i)
      const nextDot = targetPath.indexOf('.', i + 1)

      let endPos = targetPath.length
      if (nextBracket !== -1 && nextBracket < endPos) endPos = nextBracket
      if (nextDot !== -1 && nextDot < endPos) endPos = nextDot

      const key = targetPath.substring(i + 1, endPos)
      currentPath += `.${key}`
      expanded.set(currentPath, true)
      i = endPos
    } else {
      break
    }
  }
}

// 处理搜索输入
const handleSearch = () => {
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    searchResults.value = []
    currentResultIndex.value = 0
    return
  }

  // 执行搜索
  searchResults.value = searchInNode(props.data, '$', searchQuery.value)
  currentResultIndex.value = 0

  // 展开第一个结果
  if (searchResults.value.length > 0) {
    expandPathTo(searchResults.value[0].path)
    scrollToHighlightedNode()
  }
}

// 导航搜索结果
const navigateResults = (direction) => {
  if (searchResults.value.length === 0) return

  currentResultIndex.value += direction

  // 循环导航
  if (currentResultIndex.value < 0) {
    currentResultIndex.value = searchResults.value.length - 1
  } else if (currentResultIndex.value >= searchResults.value.length) {
    currentResultIndex.value = 0
  }

  // 展开到当前结果并滚动
  const result = searchResults.value[currentResultIndex.value]
  if (result) {
    expandPathTo(result.path)
    nextTick(() => scrollToHighlightedNode())
  }
}

// 滚动到高亮的节点
const scrollToHighlightedNode = () => {
  nextTick(() => {
    const highlightedElement = document.querySelector('.node-highlighted')
    if (highlightedElement) {
      highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

// 清除搜索
const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  currentResultIndex.value = 0
}

const toggleNode = (path) => {
  expanded.set(path, !expanded.get(path))
}

const copyValue = (value) => {
  copyToClipboard(value)
}

const handleExtractPath = (path) => {
  emit('extract-path', path)
}

const handleExtractToEditor = (data) => {
  emit('extract-to-editor', data)
}

// 监听数据变化，清除搜索结果
watch(() => props.data, () => {
  clearSearch()
})
</script>

<style scoped>
.json-tree-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
}

/* 搜索框样式 */
.tree-search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--primary);
}

.search-count {
  padding: 4px 8px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-primary);
  border-radius: 4px;
  white-space: nowrap;
}

.search-clear {
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-clear:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 树容器 */
.tree-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.empty-tree {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}
</style>
