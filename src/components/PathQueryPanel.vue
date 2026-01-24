<template>
  <div class="query-panel">
    <select v-model="syntax" class="syntax-selector">
      <option value="jsonpath">JSONPath</option>
      <option value="jmespath">JMESPath</option>
    </select>

    <div class="input-wrapper">
      <span v-if="syntax === 'jsonpath'" class="input-prefix">$.</span>
      <input
        v-model="pathInput"
        type="text"
        :placeholder="placeholderText"
        class="query-input"
        :class="{ 'with-prefix': syntax === 'jsonpath' }"
        @keyup.enter="runQuery"
      />
    </div>

    <button @click="runQuery" class="btn btn-sm">执行</button>
    <button @click="copyResult" class="btn btn-sm btn-secondary" :disabled="!hasResult">复制</button>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted, onBeforeUnmount } from 'vue'
import { useJsonPath } from '../composables/useJsonPath'
import { useClipboard } from '../composables/useClipboard'

const currentJson = inject('currentJson')
const syntax = ref('jsonpath')
const pathInput = ref('')  // 用户输入的内容(不包含 $. 前缀)
const result = ref(null)
const error = ref('')

const emit = defineEmits(['query-result', 'query-error', 'query-clear'])

const { queryJson } = useJsonPath()
const { copyToClipboard } = useClipboard()

// 监听路径提取事件
const handlePathExtracted = (event) => {
  const path = event.detail
  if (path) {
    // 移除开头的 $. 前缀(如果有)
    const cleanPath = path.startsWith('$.') ? path.substring(2) : (path === '$' ? '' : path)
    pathInput.value = cleanPath

    // 自动执行查询
    setTimeout(() => {
      runQuery()
    }, 100)
  }
}

onMounted(() => {
  // 注册事件监听器
  window.addEventListener('path-extracted', handlePathExtracted)
})

onBeforeUnmount(() => {
  // 清理事件监听器
  window.removeEventListener('path-extracted', handlePathExtracted)
})

// 实际的查询字符串(包含 $. 前缀)
const query = computed(() => {
  if (syntax.value === 'jsonpath' && pathInput.value) {
    // 如果用户输入已经以 $ 开头,不添加前缀
    if (pathInput.value.startsWith('$')) {
      return pathInput.value
    }
    // 自动添加 $. 前缀
    return '$.' + pathInput.value
  }
  return pathInput.value
})

const placeholderText = computed(() => {
  if (syntax.value === 'jsonpath') {
    return 'store.book[*].author'
  } else {
    return 'people[?age > `20`].name'
  }
})

const hasResult = computed(() => result.value !== null)

// 监听查询输入框,为空时清空结果
watch(pathInput, (newValue) => {
  if (!newValue.trim()) {
    // 输入框为空,清空结果
    result.value = null
    error.value = ''
    emit('query-clear')
  }
})

// 切换语法时清空输入
watch(syntax, () => {
  pathInput.value = ''
  result.value = null
  error.value = ''
  emit('query-clear')
})

const runQuery = () => {
  if (!pathInput.value.trim()) {
    error.value = '请输入查询表达式'
    emit('query-error', error.value)
    return
  }

  try {
    const data = JSON.parse(currentJson.value)
    result.value = queryJson(data, query.value, syntax.value)
    error.value = ''
    // 通知父组件查询成功
    emit('query-result', result.value)
  } catch (err) {
    error.value = err.message
    result.value = null
    // 通知父组件查询错误
    emit('query-error', err.message)
  }
}

const copyResult = () => {
  if (result.value !== null) {
    const text = JSON.stringify(result.value, null, 2)
    copyToClipboard(text)
  }
}
</script>

<style scoped>
.query-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.syntax-selector {
  width: 110px;
  height: 32px;
}

.input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  min-width: 200px;
}

.input-prefix {
  position: absolute;
  left: 12px;
  color: var(--primary);
  font-weight: 600;
  font-size: 13px;
  pointer-events: none;
  z-index: 1;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}

.query-input {
  flex: 1;
  height: 32px;
  width: 100%;
}

.query-input.with-prefix {
  padding-left: 26px;
}

.btn {
  height: 32px;
  white-space: nowrap;
}
</style>
