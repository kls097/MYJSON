<template>
  <div class="json-editor">
    <div class="editor-container" ref="editorContainerRef">
      <vue-monaco-editor
        ref="monacoRef"
        v-model:value="content"
        language="json"
        :theme="theme"
        :options="editorOptions"
        @mount="handleMount"
        @change="handleChange"
      />
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="showContextMenu"
      class="context-menu"
      :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"
    >
      <button
        class="context-menu-item"
        :disabled="!canExtractPath"
        @click="extractPath"
      >
        提取路径 ({{ currentPath || '$' }})
      </button>
      <button
        class="context-menu-item"
        :disabled="!canExtractPath"
        @click="extractPathContent"
      >
        提取路径内容到编辑器
      </button>
      <button
        class="context-menu-item"
        :disabled="!hasSelection"
        @click="extractSelection"
      >
        提取选中
      </button>
      <button
        class="context-menu-item"
        :disabled="!hasSelection"
        @click="formatSelection"
      >
        格式化选中
      </button>
      <button class="context-menu-item" @click="copySelection">
        复制{{ hasSelection ? '' : '全部' }}
      </button>
      <div v-if="currentPath && currentPath !== '$'" class="context-menu-divider"></div>
      <button
        v-if="currentPath && currentPath !== '$'"
        class="context-menu-item"
        @click="copyJsonPath"
      >
        复制 JSONPath
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { VueMonacoEditor, loader } from '@guolao/vue-monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import { useClipboard } from '../composables/useClipboard'

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
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'validate', 'extract-to-editor', 'extract-path'])

const { copyToClipboard } = useClipboard()

const editorContainerRef = ref(null)
const monacoRef = ref(null)
const content = ref(props.modelValue)
const showContextMenu = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })
const selectedText = ref('')
const hasSelection = ref(false)
const currentPath = ref('')
const canExtractPath = ref(false)
let editorInstance = null
let isProgrammaticUpdate = false
let savedState = null

const theme = 'vs'

const editorOptions = {
  automaticLayout: true,
  formatOnPaste: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 13,
  fontFamily: "'Monaco', 'Menlo', 'Consolas', monospace",
  lineNumbers: 'on',
  renderLineHighlight: 'line',
  bracketPairColorization: { enabled: true },
  autoClosingBrackets: 'always',
  autoIndent: 'full',
  tabSize: 2,
  insertSpaces: true,
  scrollbar: {
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10
  },
  padding: { top: 12 },
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  parameterHints: { enabled: false },
  wordBasedSuggestions: 'off',
  stickyScroll: { enabled: false },
  guides: {
    indentation: true,
    bracketPairs: true
  }
}

function handleMount(editor) {
  editorInstance = editor

  editor.getDomNode().addEventListener('contextmenu', (e) => {
    e.preventDefault()
    e.stopPropagation()
    handleContextMenu(e)
  })

  editor.onDidChangeModelContent(() => {
    if (isProgrammaticUpdate) {
      isProgrammaticUpdate = false
      return
    }
    const value = editor.getValue()
    validateJson(value)
  })

  editor.onDidPaste(() => {
    const value = editor.getValue()
    try {
      const parsed = JSON.parse(value)
      const formatted = JSON.stringify(parsed, null, 2)
      if (formatted !== value) {
        const position = editor.getPosition()
        const model = editor.getModel()
        editor.pushUndoStop()
        model.setValue(formatted)
        editor.setPosition(position)
      }
    } catch {
      // not valid JSON, ignore
    }
  })

  validateJson(editor.getValue())
}

function handleChange(value) {
  if (isProgrammaticUpdate) return
  emit('update:modelValue', value)
}

function validateJson(content) {
  if (!content || !content.trim()) {
    emit('validate', { valid: true, data: null })
    return
  }
  try {
    const parsed = JSON.parse(content)
    emit('validate', { valid: true, data: parsed })
  } catch (error) {
    emit('validate', { valid: false, error: error.message })
  }
}

// --- Context Menu Handlers ---

function handleContextMenu(event) {
  if (!editorInstance) return

  const selection = editorInstance.getSelection()
  if (selection && !selection.isEmpty()) {
    selectedText.value = editorInstance.getModel().getValueInRange(selection)
    hasSelection.value = true
  } else {
    selectedText.value = ''
    hasSelection.value = false
  }

  const model = editorInstance.getModel()
  const position = editorInstance.getPosition()
  const offset = model.getOffsetAt(position)
  const path = getJsonPathAtPosition(model.getValue(), offset)
  currentPath.value = path || ''
  canExtractPath.value = !!path && path !== '$'

  contextMenuPos.value = { x: event.clientX, y: event.clientY }
  showContextMenu.value = true
}

function extractSelection() {
  if (selectedText.value) {
    try {
      const parsed = JSON.parse(selectedText.value)
      emit('extract-to-editor', JSON.stringify(parsed, null, 2))
    } catch {
      emit('extract-to-editor', selectedText.value)
    }
  }
  showContextMenu.value = false
}

function copySelection() {
  if (selectedText.value) {
    copyToClipboard(selectedText.value)
  } else if (editorInstance) {
    copyToClipboard(editorInstance.getValue())
  }
  showContextMenu.value = false
}

function extractPath() {
  if (currentPath.value) {
    emit('extract-path', currentPath.value)
  }
  showContextMenu.value = false
}

function extractPathContent() {
  if (currentPath.value && editorInstance) {
    try {
      const parsed = JSON.parse(editorInstance.getValue())
      const value = getValueByPath(parsed, currentPath.value)
      if (value !== undefined) {
        emit('extract-to-editor', JSON.stringify(value, null, 2))
      }
    } catch (e) {
      console.error('Failed to extract path content:', e)
    }
  }
  showContextMenu.value = false
}

function formatSelection() {
  if (!editorInstance || !selectedText.value) return
  try {
    const parsed = JSON.parse(selectedText.value)
    const formatted = JSON.stringify(parsed, null, 2)
    const selection = editorInstance.getSelection()
    editorInstance.executeEdits('format-selection', [{
      range: selection,
      text: formatted
    }])
  } catch {
    // not valid JSON
  }
  showContextMenu.value = false
}

function copyJsonPath() {
  if (currentPath.value) {
    copyToClipboard(currentPath.value)
  }
  showContextMenu.value = false
}

function closeContextMenu() {
  if (showContextMenu.value) {
    showContextMenu.value = false
  }
}

// --- JSON Path Utilities ---

function getJsonPathAtPosition(content, position) {
  if (!content.trim()) return null
  try {
    JSON.parse(content)
  } catch {
    return null
  }

  const path = ['$']
  let inString = false
  let escapeNext = false
  let currentKey = ''
  let isCollectingKey = false
  const contextStack = []
  const keyStack = []
  let arrayIndex = 0
  const arrayIndexStack = []
  const openBracePositions = []

  for (let i = 0; i < position && i < content.length; i++) {
    const char = content[i]

    if (escapeNext) {
      escapeNext = false
      if (isCollectingKey) currentKey += char
      continue
    }

    if (char === '\\' && inString) {
      escapeNext = true
      if (isCollectingKey) currentKey += char
      continue
    }

    if (char === '"') {
      if (!inString) {
        inString = true
        const afterColon = content.slice(0, i).trimEnd()
        const lastNonSpace = afterColon[afterColon.length - 1]
        const isAfterColon = lastNonSpace === ':'

        if (contextStack[contextStack.length - 1] === 'object' && !isAfterColon) {
          isCollectingKey = true
          currentKey = ''
        }
      } else {
        inString = false
        if (isCollectingKey) {
          isCollectingKey = false
          const remaining = content.slice(i + 1).trimStart()
          if (remaining[0] === ':') {
            keyStack[contextStack.length - 1] = currentKey
          }
        }
      }
      continue
    }

    if (inString) {
      if (isCollectingKey) currentKey += char
      continue
    }

    if (char === '{') {
      contextStack.push('object')
      keyStack.push('')
      arrayIndexStack.push(-1)
      openBracePositions.push(i)
    } else if (char === '[') {
      contextStack.push('array')
      keyStack.push('')
      arrayIndexStack.push(0)
      openBracePositions.push(i)
    } else if (char === '}' || char === ']') {
      contextStack.pop()
      keyStack.pop()
      arrayIndexStack.pop()
      openBracePositions.pop()
    } else if (char === ',') {
      if (contextStack[contextStack.length - 1] === 'array') {
        arrayIndexStack[arrayIndexStack.length - 1]++
      }
    }
  }

  const resultPath = ['$']
  for (let i = 0; i < contextStack.length; i++) {
    if (contextStack[i] === 'object' && keyStack[i]) {
      const key = keyStack[i]
      const needsBracket = /[.\@\[\]\(\)'"$\*,:\s]/.test(key)
      if (needsBracket) {
        const escapedKey = key.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
        resultPath.push(`['${escapedKey}']`)
      } else {
        resultPath.push(`.${key}`)
      }
    } else if (contextStack[i] === 'array') {
      const openBracePos = openBracePositions[i]
      const contentBeforeCursor = content.slice(openBracePos + 1, position)
      const isArrayStartLine = /^\s*$/.test(contentBeforeCursor)
      if (!isArrayStartLine) {
        resultPath.push(`[${arrayIndexStack[i]}]`)
      }
    }
  }

  return resultPath.join('')
}

function getValueByPath(obj, path) {
  if (!path || path === '$') return obj

  let normalizedPath = path.startsWith('$.') ? path.slice(2) : path.startsWith('$') ? path.slice(1) : path

  const parts = []
  let current = ''
  let inBracket = false

  for (let i = 0; i < normalizedPath.length; i++) {
    const char = normalizedPath[i]
    if (char === '[') {
      if (current) {
        parts.push(current)
        current = ''
      }
      inBracket = true
    } else if (char === ']') {
      if (current) {
        parts.push(parseInt(current, 10))
        current = ''
      }
      inBracket = false
    } else if (char === '.' && !inBracket) {
      if (current) {
        parts.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }
  if (current) parts.push(current)

  let result = obj
  for (const part of parts) {
    if (result === null || result === undefined) return undefined
    result = result[part]
  }
  return result
}

// --- Exposed Methods ---

function saveCursorState() {
  if (editorInstance) {
    savedState = {
      viewState: editorInstance.saveViewState(),
      scrollPosition: editorInstance.getScrollTop()
    }
  }
}

function restoreCursorState() {
  if (editorInstance && savedState) {
    nextTick(() => {
      if (savedState.viewState) {
        editorInstance.restoreViewState(savedState.viewState)
      }
      savedState = null
    })
  }
}

function openSearch() {
  if (editorInstance) {
    editorInstance.trigger('keyboard', 'actions.find')
    editorInstance.focus()
  }
}

defineExpose({ openSearch, saveCursorState, restoreCursorState })

// --- Lifecycle ---

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeContextMenu)
  if (editorInstance) {
    editorInstance.dispose()
    editorInstance = null
  }
})

// --- Watch external changes ---

watch(() => props.modelValue, (newValue) => {
  if (editorInstance && editorInstance.getValue() !== newValue) {
    isProgrammaticUpdate = true
    editorInstance.setValue(newValue || '')
  }
})
</script>

<style scoped>
.json-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--border);
}

.editor-container {
  flex: 1;
  overflow: hidden;
}

.editor-container :deep(.monaco-editor) {
  height: 100% !important;
}

.context-menu {
  position: fixed;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 4px 0;
  min-width: 180px;
}

.context-menu-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: background-color 0.2s;
}

.context-menu-item:hover:not(:disabled) {
  background: var(--bg-secondary);
}

.context-menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}
</style>
