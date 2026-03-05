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
          <div ref="baseEditorRef"></div>
        </div>
      </div>

      <div class="editor-panel">
        <div class="panel-header">
          <span>左侧 (Left / My)</span>
          <span v-if="!isValidLeft" class="error-badge">JSON 错误</span>
        </div>
        <div class="editor-container">
          <div ref="leftEditorRef"></div>
        </div>
      </div>

      <div class="editor-panel">
        <div class="panel-header">
          <span>右侧 (Right / Theirs)</span>
          <span v-if="!isValidRight" class="error-badge">JSON 错误</span>
        </div>
        <div class="editor-container">
          <div ref="rightEditorRef"></div>
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
        <div ref="resultEditorRef"></div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { json } from '@codemirror/lang-json'
import { useJsonMerge } from '../composables/useJsonMerge'

const baseEditorRef = ref(null)
const leftEditorRef = ref(null)
const rightEditorRef = ref(null)
const resultEditorRef = ref(null)

let baseEditorView = null
let leftEditorView = null
let rightEditorView = null
let resultEditorView = null

// 标记是否为程序化更新
let isProgrammaticUpdate = false

const {
  baseJson,
  leftJson,
  rightJson,
  mergeStrategy,
  arrayStrategy,
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

// 初始化编辑器
function initEditor(container, initialContent, readonly = false, onChange = null) {
  if (!container) return null

  const extensions = [
    basicSetup,
    json(),
    EditorView.lineWrapping
  ]

  if (readonly) {
    extensions.push(EditorState.readOnly.of(true))
  } else {
    extensions.push(EditorView.editable.of(true))
    if (onChange) {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            if (!isProgrammaticUpdate) {
              onChange(update.state.doc.toString())
            }
          }
        })
      )
    }
    // 粘贴时自动格式化
    extensions.push(
      EditorView.domEventHandlers({
        paste: (event, view) => {
          const text = event.clipboardData?.getData('text/plain')
          if (!text) return false

          try {
            const parsed = JSON.parse(text)
            const formatted = JSON.stringify(parsed, null, 2)
            if (formatted !== text) {
              event.preventDefault()
              const { from, to } = view.state.selection.main
              view.dispatch({
                changes: { from, to, insert: formatted }
              })
              return true
            }
          } catch {
            // 不是有效 JSON
          }
          return false
        }
      })
    )
  }

  return new EditorView({
    doc: initialContent || '',
    extensions,
    parent: container
  })
}

// 初始化编辑器
onMounted(() => {
  nextTick(() => {
    baseEditorView = initEditor(
      baseEditorRef.value,
      baseJson.value,
      false,
      (content) => {
        baseJson.value = content
        validateBase(content)
      }
    )

    leftEditorView = initEditor(
      leftEditorRef.value,
      leftJson.value,
      false,
      (content) => {
        leftJson.value = content
        validateLeft(content)
      }
    )

    rightEditorView = initEditor(
      rightEditorRef.value,
      rightJson.value,
      false,
      (content) => {
        rightJson.value = content
        validateRight(content)
      }
    )
  })
})

onBeforeUnmount(() => {
  if (baseEditorView) {
    baseEditorView.destroy()
    baseEditorView = null
  }
  if (leftEditorView) {
    leftEditorView.destroy()
    leftEditorView = null
  }
  if (rightEditorView) {
    rightEditorView.destroy()
    rightEditorView = null
  }
  if (resultEditorView) {
    resultEditorView.destroy()
    resultEditorView = null
  }
})

// 格式化结果
const formattedResult = computed(() => formatResult(true))
const resultSize = computed(() => formattedResult.value.length)

// 是否可以合并
const canMerge = computed(() => {
  return baseJson.value.trim() && leftJson.value.trim() && rightJson.value.trim()
})

// 是否可以格式化
const canFormat = computed(() => {
  return baseJson.value.trim() || leftJson.value.trim() || rightJson.value.trim()
})

// 验证
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

// 格式化 JSON
function formatJson(content) {
  if (!content || !content.trim()) return content
  try {
    const parsed = JSON.parse(content)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return content
  }
}

// 格式化所有编辑器
function handleFormatAll() {
  const baseContent = baseEditorView ? baseEditorView.state.doc.toString() : baseJson.value
  const leftContent = leftEditorView ? leftEditorView.state.doc.toString() : leftJson.value
  const rightContent = rightEditorView ? rightEditorView.state.doc.toString() : rightJson.value

  const formattedBase = formatJson(baseContent)
  const formattedLeft = formatJson(leftContent)
  const formattedRight = formatJson(rightContent)

  isProgrammaticUpdate = true
  if (baseEditorView) {
    baseEditorView.dispatch({
      changes: { from: 0, to: baseEditorView.state.doc.length, insert: formattedBase }
    })
  }
  baseJson.value = formattedBase

  isProgrammaticUpdate = true
  if (leftEditorView) {
    leftEditorView.dispatch({
      changes: { from: 0, to: leftEditorView.state.doc.length, insert: formattedLeft }
    })
  }
  leftJson.value = formattedLeft

  isProgrammaticUpdate = true
  if (rightEditorView) {
    rightEditorView.dispatch({
      changes: { from: 0, to: rightEditorView.state.doc.length, insert: formattedRight }
    })
  }
  rightJson.value = formattedRight

  isProgrammaticUpdate = false
}

// 事件处理
function handleMerge() {
  // 从编辑器获取最新内容
  if (baseEditorView) {
    baseJson.value = baseEditorView.state.doc.toString()
  }
  if (leftEditorView) {
    leftJson.value = leftEditorView.state.doc.toString()
  }
  if (rightEditorView) {
    rightJson.value = rightEditorView.state.doc.toString()
  }

  const result = executeThreeWayMerge()

  if (result && result.result) {
    const formatted = formatResult(true)

    nextTick(() => {
      if (!resultEditorView && resultEditorRef.value) {
        resultEditorView = initEditor(
          resultEditorRef.value,
          formatted,
          true
        )
      } else if (resultEditorView) {
        isProgrammaticUpdate = true
        resultEditorView.dispatch({
          changes: { from: 0, to: resultEditorView.state.doc.length, insert: formatted }
        })
        isProgrammaticUpdate = false
      }
    })
  }
}

async function handleCopyResult() {
  await copyResult()
  alert('已复制到剪贴板')
}

function handleReset() {
  reset()

  // 清空编辑器
  isProgrammaticUpdate = true
  if (baseEditorView) {
    baseEditorView.dispatch({
      changes: { from: 0, to: baseEditorView.state.doc.length, insert: '' }
    })
  }
  if (leftEditorView) {
    leftEditorView.dispatch({
      changes: { from: 0, to: leftEditorView.state.doc.length, insert: '' }
    })
  }
  if (rightEditorView) {
    rightEditorView.dispatch({
      changes: { from: 0, to: rightEditorView.state.doc.length, insert: '' }
    })
  }
  if (resultEditorView) {
    resultEditorView.dispatch({
      changes: { from: 0, to: resultEditorView.state.doc.length, insert: '' }
    })
  }
  isProgrammaticUpdate = false
}

// 工具函数
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

.editor-container :deep(.cm-editor) {
  height: 100%;
}

.editor-container :deep(.cm-scroller) {
  overflow-y: auto;
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

.result-editor-container :deep(.cm-editor) {
  height: 100%;
}

.result-editor-container :deep(.cm-scroller) {
  overflow-y: auto;
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
