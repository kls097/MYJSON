<template>
  <div class="json-merge-panel">
    <!-- 工具栏 -->
    <div class="merge-toolbar">
      <div class="strategy-selector">
        <label>合并策略:</label>
        <select v-model="mergeStrategy" @change="onStrategyChange">
          <option value="deep">深度合并</option>
          <option value="override">覆盖合并</option>
        </select>
      </div>

      <div class="strategy-selector" v-if="mergeStrategy === 'deep'">
        <label>数组合并:</label>
        <select v-model="arrayStrategy">
          <option value="append">追加</option>
          <option value="dedupe">去重</option>
          <option value="replace">替换</option>
        </select>
      </div>

      <div class="toolbar-actions">
        <button class="btn-primary" @click="handleMerge" :disabled="!canMerge">
          执行合并
        </button>
        <button class="btn-secondary" @click="handleFormatBoth" :disabled="!canFormat">
          格式化
        </button>
        <button class="btn-secondary" @click="handleCopyResult" :disabled="!mergeResult">
          复制结果
        </button>
        <button class="btn-secondary" @click="handleReset">
          重置
        </button>
        <button class="btn-secondary" @click="handleClose">
          关闭
        </button>
      </div>
    </div>

    <!-- 编辑器区域 -->
    <div class="merge-editors">
      <div class="editor-panel">
        <div class="panel-header">
          <span>左侧 JSON</span>
          <div class="header-actions">
            <span v-if="!isValidLeft" class="error-badge">JSON 格式错误</span>
          </div>
        </div>
        <div class="editor-container">
          <vue-monaco-editor
            ref="leftMonacoRef"
            v-model:value="leftContent"
            language="json"
            :theme="editorTheme"
            :options="editableOptions"
            @mount="(e) => leftEditor = e"
            @change="onLeftChange"
          />
        </div>
      </div>

      <div class="editor-panel">
        <div class="panel-header">
          <span>右侧 JSON</span>
          <div class="header-actions">
            <span v-if="!isValidRight" class="error-badge">JSON 格式错误</span>
          </div>
        </div>
        <div class="editor-container">
          <vue-monaco-editor
            ref="rightMonacoRef"
            v-model:value="rightContent"
            language="json"
            :theme="editorTheme"
            :options="editableOptions"
            @mount="(e) => rightEditor = e"
            @change="onRightChange"
          />
        </div>
      </div>
    </div>

    <!-- 冲突列表 -->
    <div v-if="conflicts.length > 0" class="conflicts-section">
      <div class="section-header">
        <span class="warning-icon">⚠️</span>
        <span>检测到 {{ conflicts.length }} 个冲突</span>
      </div>
      <div class="conflict-list">
        <div
          v-for="(conflict, index) in conflicts"
          :key="index"
          class="conflict-item"
        >
          <div class="conflict-path">{{ conflict.path }}</div>
          <div class="conflict-message">{{ conflict.message }}</div>
          <div class="conflict-values">
            <span class="conflict-left" :title="JSON.stringify(conflict.leftValue)">
              左侧: {{ truncate(JSON.stringify(conflict.leftValue)) }}
            </span>
            <span class="conflict-right" :title="JSON.stringify(conflict.rightValue)">
              右侧: {{ truncate(JSON.stringify(conflict.rightValue)) }}
            </span>
          </div>
          <div class="conflict-actions">
            <button @click="resolveConflictKeepLeft(conflict.path)">保留左侧</button>
            <button @click="resolveConflictKeepRight(conflict.path)">保留右侧</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 合并结果 -->
    <div v-if="mergeResult" class="result-section">
      <div class="section-header">
        <span>合并结果</span>
        <span class="result-info">{{ resultSize }} 字符</span>
      </div>
      <div class="result-editor-container">
        <vue-monaco-editor
          v-model:value="resultContent"
          language="json"
          :theme="editorTheme"
          :options="readonlyOptions"
        />
      </div>
      <div class="result-legend">
        <span class="legend-item"><span class="legend-color added"></span> 新增</span>
        <span class="legend-item"><span class="legend-color modified"></span> 覆盖</span>
        <span class="legend-item"><span class="legend-color unchanged"></span> 未变</span>
      </div>
      <div class="result-actions">
        <button class="btn-primary" @click="handleApply">
          应用到编辑器
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { VueMonacoEditor, loader } from '@guolao/vue-monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import { useJsonMerge } from '../composables/useJsonMerge'

import 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/language/json/monaco.contribution'

const monaco = window.monaco
loader.config({ monaco })

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker()
    }
    return new editorWorker()
  }
}

const props = defineProps({
  initialLeft: {
    type: String,
    default: ''
  },
  initialRight: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'apply'])

const leftMonacoRef = ref(null)
const rightMonacoRef = ref(null)
let leftEditor = null
let rightEditor = null

const leftContent = ref('')
const rightContent = ref('')
const resultContent = ref('')
let isProgrammaticUpdate = false

const editorTheme = 'vs'

const editableOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 13,
  fontFamily: "'Monaco', 'Menlo', 'Consolas', monospace",
  tabSize: 2,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: 'off',
  stickyScroll: { enabled: false },
  guides: { indentation: true, bracketPairs: true }
}

const readonlyOptions = {
  ...editableOptions,
  readOnly: true
}

const {
  leftJson,
  rightJson,
  mergeStrategy,
  arrayStrategy,
  mergeResult,
  mergeChanges,
  conflicts,
  error,
  isValidLeft,
  isValidRight,
  executeMerge,
  resolveConflictKeepLeft,
  resolveConflictKeepRight,
  formatResult,
  copyResult,
  reset,
  setInitialData
} = useJsonMerge()

function onLeftChange(value) {
  if (isProgrammaticUpdate) return
  leftJson.value = value
  validateLeft(value)
}

function onRightChange(value) {
  if (isProgrammaticUpdate) return
  rightJson.value = value
  validateRight(value)
}

onMounted(() => {
  nextTick(() => {
    leftContent.value = props.initialLeft || leftJson.value
    rightContent.value = props.initialRight || rightJson.value

    if (props.initialLeft || props.initialRight) {
      setInitialData(props.initialLeft, props.initialRight)
    }
  })
})

const formattedResult = computed(() => formatResult(true))
const resultSize = computed(() => formattedResult.value.length)

const canMerge = computed(() => {
  return leftJson.value.trim() && rightJson.value.trim() && isValidLeft.value && isValidRight.value
})

const canFormat = computed(() => {
  return leftJson.value.trim() || rightJson.value.trim()
})

function validateLeft(content) {
  if (!content || !content.trim()) {
    isValidLeft.value = true
    return
  }
  try {
    JSON.parse(content)
    isValidLeft.value = true
  } catch (e) {
    isValidLeft.value = false
  }
}

function validateRight(content) {
  if (!content || !content.trim()) {
    isValidRight.value = true
    return
  }
  try {
    JSON.parse(content)
    isValidRight.value = true
  } catch (e) {
    isValidRight.value = false
  }
}

function formatJson(content) {
  if (!content || !content.trim()) return content
  try {
    const parsed = JSON.parse(content)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return content
  }
}

function handleFormatBoth() {
  const formattedLeft = formatJson(leftContent.value)
  const formattedRight = formatJson(rightContent.value)

  isProgrammaticUpdate = true
  leftContent.value = formattedLeft
  leftJson.value = formattedLeft

  rightContent.value = formattedRight
  rightJson.value = formattedRight
  isProgrammaticUpdate = false
}

function onStrategyChange() {
  if (mergeResult.value) {
    mergeResult.value = null
    conflicts.value = []
    resultContent.value = ''
  }
}

function handleMerge() {
  leftJson.value = leftContent.value
  rightJson.value = rightContent.value

  const result = executeMerge()

  if (result && result.result) {
    const formatted = formatResult(true)
    nextTick(() => {
      resultContent.value = formatted
    })
  }
}

async function handleCopyResult() {
  await copyResult()
  alert('已复制到剪贴板')
}

function handleReset() {
  reset()
  isProgrammaticUpdate = true
  leftContent.value = ''
  rightContent.value = ''
  resultContent.value = ''
  isProgrammaticUpdate = false
}

function handleApply() {
  const result = applyResult()
  if (result) {
    emit('apply', result)
  }
}

function handleClose() {
  reset()
  emit('close')
}

function truncate(str, maxLen = 50) {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.substring(0, maxLen) + '...'
}
</script>

<style scoped>
.json-merge-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  gap: 12px;
}

.merge-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  flex-wrap: wrap;
}

.strategy-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.strategy-selector label {
  font-size: 13px;
  color: var(--text-secondary);
}

.strategy-selector select {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.btn-primary {
  padding: 6px 16px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 6px 16px;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-secondary);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.merge-editors {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 200px;
}

.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: var(--bg-secondary);
  border-radius: 4px 4px 0 0;
  font-size: 13px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-badge {
  font-size: 11px;
  color: var(--error);
  background: var(--error-bg);
  padding: 2px 6px;
  border-radius: 2px;
}

.editor-container {
  flex: 1;
  overflow: hidden;
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 4px 4px;
  min-height: 150px;
}

.editor-container :deep(.monaco-editor) {
  height: 100% !important;
}

.conflicts-section {
  background: var(--warning-bg);
  border: 1px solid var(--warning-border);
  border-radius: 4px;
  padding: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
}

.warning-icon {
  font-size: 16px;
}

.conflict-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.conflict-item {
  background: var(--bg-primary);
  border: 1px solid var(--warning-border);
  border-radius: 4px;
  padding: 8px;
}

.conflict-path {
  font-family: monospace;
  font-size: 12px;
  color: var(--accent-color);
  margin-bottom: 4px;
}

.conflict-message {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.conflict-values {
  display: flex;
  gap: 12px;
  font-size: 11px;
  margin-bottom: 6px;
}

.conflict-left {
  color: #fa8c16;
}

.conflict-right {
  color: #52c41a;
}

.conflict-actions {
  display: flex;
  gap: 8px;
}

.conflict-actions button {
  padding: 2px 8px;
  font-size: 11px;
  border: 1px solid var(--border);
  border-radius: 2px;
  cursor: pointer;
  background: var(--bg-primary);
}

.conflict-actions button:hover {
  background: var(--bg-secondary);
}

.result-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 150px;
}

.result-info {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: normal;
}

.result-editor-container {
  flex: 1;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 4px;
  min-height: 100px;
}

.result-editor-container :deep(.monaco-editor) {
  height: 100% !important;
}

.result-legend {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-color.added {
  background: #e6ffed;
}

.legend-color.modified {
  background: #ffe089;
}

.legend-color.unchanged {
  background: #f5f5f5;
}

.result-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}

.error-message {
  padding: 12px;
  background: var(--error-bg);
  border: 1px solid var(--error-border);
  border-radius: 4px;
  color: var(--error);
  font-size: 13px;
}
</style>
