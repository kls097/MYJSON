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
          <div ref="leftEditorRef"></div>
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
          <div ref="rightEditorRef"></div>
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
        <div ref="resultEditorRef"></div>
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { json } from '@codemirror/lang-json'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import { Decoration } from '@codemirror/view'
import { useJsonMerge } from '../composables/useJsonMerge'

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

const leftEditorRef = ref(null)
const rightEditorRef = ref(null)
const resultEditorRef = ref(null)

let leftEditorView = null
let rightEditorView = null
let resultEditorView = null

// 标记是否为程序化更新
let isProgrammaticUpdate = false

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

// 定义 StateEffect 用于更新装饰器
const setDecorationsEffect = StateEffect.define()

// 定义 StateField 来管理装饰器
const decorationField = StateField.define({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    for (let effect of tr.effects) {
      if (effect.is(setDecorationsEffect)) {
        return effect.value
      }
    }
    return decorations.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f)
})

// 创建结果编辑器装饰器
function createResultDecorations(changeList) {
  const decorations = []

  if (!changeList || changeList.length === 0) {
    return Decoration.none
  }

  // 将路径转换为行号并添加装饰
  const resultContent = resultEditorView ? resultEditorView.state.doc.toString() : ''
  const resultLines = resultContent.split('\n')

  for (const change of changeList) {
    const { path, type } = change
    if (!path || type === 'unchanged') continue

    let className = ''
    if (type === 'added') {
      className = 'cm-merge-added'
    } else if (type === 'modified') {
      className = 'cm-merge-modified'
    } else if (type === 'unchanged') {
      className = 'cm-merge-unchanged'
    }

    if (className) {
      // 查找对应路径的行号
      for (let i = 0; i < resultLines.length; i++) {
        const line = resultLines[i]
        // 检查该行是否包含路径中的键
        const pathKey = path.split('.').pop()
        if (line.includes(`"${pathKey}"`)) {
          if (resultEditorView && i + 1 <= resultEditorView.state.doc.lines) {
            const cmLine = resultEditorView.state.doc.line(i + 1)
            decorations.push(
              Decoration.line({
                class: className
              }).range(cmLine.from)
            )
          }
          break
        }
      }
    }
  }

  return Decoration.set(decorations.sort((a, b) => a.from - b.from))
}

// 更新结果编辑器装饰器
function updateResultDecorations() {
  if (!resultEditorView) return

  const decorations = createResultDecorations(mergeChanges.value)
  resultEditorView.dispatch({
    effects: setDecorationsEffect.of(decorations)
  })
}

// 初始化编辑器
function initEditor(container, initialContent, readonly = false, onChange = null) {
  if (!container) return null

  const extensions = [
    basicSetup,
    json(),
    EditorView.lineWrapping,
    decorationField
  ]

  if (readonly) {
    extensions.push(EditorState.readOnly.of(true))
  } else {
    extensions.push(EditorView.editable.of(true))
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange) {
          if (!isProgrammaticUpdate) {
            onChange(update.state.doc.toString())
          }
        }
      })
    )
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
    leftEditorView = initEditor(
      leftEditorRef.value,
      props.initialLeft || leftJson.value,
      false,
      (content) => {
        leftJson.value = content
        validateLeft(content)
      }
    )

    rightEditorView = initEditor(
      rightEditorRef.value,
      props.initialRight || rightJson.value,
      false,
      (content) => {
        rightJson.value = content
        validateRight(content)
      }
    )

    if (props.initialLeft || props.initialRight) {
      setInitialData(props.initialLeft, props.initialRight)
    }
  })
})

onBeforeUnmount(() => {
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
  return leftJson.value.trim() && rightJson.value.trim() && isValidLeft.value && isValidRight.value
})

// 是否可以格式化
const canFormat = computed(() => {
  return leftJson.value.trim() || rightJson.value.trim()
})

// 验证
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

// 格式化两侧
function handleFormatBoth() {
  const leftContent = leftEditorView ? leftEditorView.state.doc.toString() : leftJson.value
  const rightContent = rightEditorView ? rightEditorView.state.doc.toString() : rightJson.value

  const formattedLeft = formatJson(leftContent)
  const formattedRight = formatJson(rightContent)

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
function onStrategyChange() {
  if (mergeResult.value) {
    mergeResult.value = null
    conflicts.value = []
    // 清除结果编辑器
    if (resultEditorView) {
      resultEditorView.dispatch({
        changes: { from: 0, to: resultEditorView.state.doc.length, insert: '' }
      })
    }
  }
}

function handleMerge() {
  // 先从编辑器获取最新内容
  if (leftEditorView) {
    leftJson.value = leftEditorView.state.doc.toString()
  }
  if (rightEditorView) {
    rightJson.value = rightEditorView.state.doc.toString()
  }

  const result = executeMerge()

  if (result && result.result) {
    const formatted = formatResult(true)

    // 创建结果编辑器（如果还没有）
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

      // 更新装饰器
      updateResultDecorations()
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

// 工具函数
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

.result-editor-container :deep(.cm-editor) {
  height: 100%;
}

.result-editor-container :deep(.cm-scroller) {
  overflow-y: auto;
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

/* 合并结果高亮样式 */
:deep(.cm-merge-added) {
  background-color: #e6ffed !important;
}

:deep(.cm-merge-modified) {
  background-color: #ffe089 !important;
}

:deep(.cm-merge-unchanged) {
  background-color: #f5f5f5 !important;
  color: #999 !important;
}
</style>
