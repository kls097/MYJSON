<template>
  <div class="three-way-merge-panel">
    <!-- 工具栏 -->
    <div class="merge-toolbar">
      <div class="toolbar-actions">
        <button class="btn-primary" @click="handleMerge" :disabled="!canMerge">
          执行三方合并
        </button>
        <button class="btn-secondary" @click="handleFormatAll" :disabled="!canFormat">
          格式化
        </button>
        <button class="btn-secondary" @click="handleCopyResult" :disabled="!mergeResult">
          复制结果
        </button>
        <button class="btn-secondary" @click="handleReset">
          重置
        </button>
      </div>

      <!-- 状态摘要 -->
      <div v-if="threeWayStatus" class="status-summary">
        <span class="status-item">
          <span class="status-label">未修改:</span>
          <span class="status-count">{{ threeWayStatus.counts.unchanged }}</span>
        </span>
        <span class="status-item">
          <span class="status-label">左侧修改:</span>
          <span class="status-count left">{{ threeWayStatus.counts['left-modified'] }}</span>
        </span>
        <span class="status-item">
          <span class="status-label">右侧修改:</span>
          <span class="status-count right">{{ threeWayStatus.counts['right-modified'] }}</span>
        </span>
        <span class="status-item conflict" v-if="threeWayStatus.hasConflicts">
          <span class="status-label">冲突:</span>
          <span class="status-count">{{ threeWayStatus.conflictCount }}</span>
        </span>
      </div>
    </div>

    <!-- 编辑器区域 -->
    <div class="merge-editors">
      <div class="editor-panel">
        <div class="panel-header">
          <span>基础版本 (Base)</span>
          <span v-if="!isValidBase" class="error-badge">JSON 错误</span>
        </div>
        <div class="editor-container">
          <vue-monaco-editor
            v-model:value="baseContent"
            language="json"
            :theme="editorTheme"
            :options="editableOptions"
            @change="onBaseChange"
          />
        </div>
      </div>

      <div class="editor-panel">
        <div class="panel-header">
          <span>左侧 (Left / My)</span>
          <span v-if="!isValidLeft" class="error-badge">JSON 错误</span>
        </div>
        <div class="editor-container">
          <vue-monaco-editor
            v-model:value="leftContent"
            language="json"
            :theme="editorTheme"
            :options="editableOptions"
            @change="onLeftChange"
          />
        </div>
      </div>

      <div class="editor-panel">
        <div class="panel-header">
          <span>右侧 (Right / Theirs)</span>
          <span v-if="!isValidRight" class="error-badge">JSON 错误</span>
        </div>
        <div class="editor-container">
          <vue-monaco-editor
            v-model:value="rightContent"
            language="json"
            :theme="editorTheme"
            :options="editableOptions"
            @change="onRightChange"
          />
        </div>
      </div>
    </div>

    <!-- 冲突列表 -->
    <div v-if="conflicts.length > 0" class="conflicts-section">
      <div class="section-header">
        <span class="warning-icon">⚠️</span>
        <span>检测到 {{ conflicts.length }} 个冲突需要解决</span>
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
            <div class="conflict-value base">
              <span class="label">Base:</span>
              <span class="value">{{ truncate(JSON.stringify(conflict.baseValue)) }}</span>
            </div>
            <div class="conflict-value left">
              <span class="label">Left:</span>
              <span class="value">{{ truncate(JSON.stringify(conflict.leftValue)) }}</span>
            </div>
            <div class="conflict-value right">
              <span class="label">Right:</span>
              <span class="value">{{ truncate(JSON.stringify(conflict.rightValue)) }}</span>
            </div>
          </div>
          <div class="conflict-actions">
            <button @click="resolveConflictKeepLeft(conflict.path)">用左侧</button>
            <button @click="resolveConflictKeepRight(conflict.path)">用右侧</button>
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
import { formatJson } from '../utils/jsonFormatter'
import '../monaco-locale-init.js'

// 直接导入 monaco 对象，避免依赖 window.monaco
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/language/json/monaco.contribution'

// 配置 loader 使用导入的 monaco 实例，不从 CDN 加载
loader.config({ monaco })

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker()
    }
    return new editorWorker()
  }
}

let isProgrammaticUpdate = false

const baseContent = ref('')
const leftContent = ref('')
const rightContent = ref('')
const resultContent = ref('')

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
  baseJson,
  leftJson,
  rightJson,
  mergeResult,
  conflicts,
  threeWayStatus,
  error,
  isValidBase,
  isValidLeft,
  isValidRight,
  executeThreeWayMerge,
  resolveConflictKeepLeft,
  resolveConflictKeepRight,
  formatResult,
  copyResult,
  reset
} = useJsonMerge()

function onBaseChange(value) {
  if (isProgrammaticUpdate) return
  baseJson.value = value
  validateBase(value)
}

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
    baseContent.value = baseJson.value
    leftContent.value = leftJson.value
    rightContent.value = rightJson.value
  })
})

const formattedResult = computed(() => formatResult(true))
const resultSize = computed(() => formattedResult.value.length)

const canMerge = computed(() => {
  return baseJson.value.trim() && leftJson.value.trim() && rightJson.value.trim()
})

const canFormat = computed(() => {
  return baseJson.value.trim() || leftJson.value.trim() || rightJson.value.trim()
})

function validateBase(content) {
  if (!content || !content.trim()) {
    isValidBase.value = true
    return
  }
  try {
    JSON.parse(content)
    isValidBase.value = true
  } catch (e) {
    isValidBase.value = false
  }
}

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

function handleFormatAll() {
  const formattedBase = formatJson(baseContent.value)
  const formattedLeft = formatJson(leftContent.value)
  const formattedRight = formatJson(rightContent.value)

  isProgrammaticUpdate = true
  baseContent.value = formattedBase
  baseJson.value = formattedBase

  leftContent.value = formattedLeft
  leftJson.value = formattedLeft

  rightContent.value = formattedRight
  rightJson.value = formattedRight
  isProgrammaticUpdate = false
}

function handleMerge() {
  baseJson.value = baseContent.value
  leftJson.value = leftContent.value
  rightJson.value = rightContent.value

  const result = executeThreeWayMerge()

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
  baseContent.value = ''
  leftContent.value = ''
  rightContent.value = ''
  resultContent.value = ''
  isProgrammaticUpdate = false
}

function truncate(str, maxLen = 40) {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.substring(0, maxLen) + '...'
}
</script>

<style scoped>
.three-way-merge-panel {
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

.toolbar-actions {
  display: flex;
  gap: 8px;
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

.status-summary {
  display: flex;
  gap: 16px;
  margin-left: auto;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.status-label {
  color: var(--text-secondary);
}

.status-count {
  font-weight: 600;
  color: #52c41a;
}

.status-count.left {
  color: #fa8c16;
}

.status-count.right {
  color: var(--accent-color);
}

.status-item.conflict .status-count {
  color: var(--error);
}

.merge-editors {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 180px;
}

.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: var(--bg-secondary);
  border-radius: 4px 4px 0 0;
  font-size: 12px;
  font-weight: 500;
}

.error-badge {
  font-size: 10px;
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
  min-height: 120px;
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
  max-height: 120px;
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
  margin-bottom: 6px;
}

.conflict-values {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.conflict-value {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 2px;
}

.conflict-value.base {
  background: #f0f0f0;
  color: #666;
}

.conflict-value.left {
  background: #fff7e6;
  color: #fa8c16;
}

.conflict-value.right {
  background: #e6f7ff;
  color: var(--accent-color);
}

.conflict-value .label {
  font-weight: 500;
  margin-right: 4px;
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
  min-height: 120px;
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

.error-message {
  padding: 12px;
  background: var(--error-bg);
  border: 1px solid var(--error-border);
  border-radius: 4px;
  color: var(--error);
  font-size: 13px;
}
</style>
