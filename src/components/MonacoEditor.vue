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
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { VueMonacoEditor, loader } from '@guolao/vue-monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import { useClipboard } from '../composables/useClipboard'
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

function getCurrentJsonPath() {
  if (!editorInstance) return null
  const model = editorInstance.getModel()
  const position = editorInstance.getPosition()
  const offset = model.getOffsetAt(position)
  return getJsonPathAtPosition(model.getValue(), offset)
}

function registerCustomActions(editor) {
  const actions = [
    {
      id: 'json-extract-path',
      label: '提取路径',
      keybindings: [],
      contextMenuGroupId: 'json-tools',
      contextMenuOrder: 1,
      run(ed) {
        const path = getJsonPathAtPosition(ed.getModel().getValue(), ed.getModel().getOffsetAt(ed.getPosition()))
        if (path) {
          emit('extract-path', path)
        }
      }
    },
    {
      id: 'json-extract-path-content',
      label: '提取路径内容到编辑器',
      keybindings: [],
      contextMenuGroupId: 'json-tools',
      contextMenuOrder: 2,
      run(ed) {
        const path = getJsonPathAtPosition(ed.getModel().getValue(), ed.getModel().getOffsetAt(ed.getPosition()))
        if (path) {
          try {
            const parsed = JSON.parse(ed.getValue())
            const value = getValueByPath(parsed, path)
            if (value !== undefined) {
              emit('extract-to-editor', JSON.stringify(value, null, 2))
            }
          } catch (_) {}
        }
      }
    },
    {
      id: 'json-extract-selection',
      label: '提取选中',
      keybindings: [],
      contextMenuGroupId: 'json-tools',
      contextMenuOrder: 3,
      run(ed) {
        const selection = ed.getSelection()
        if (selection && !selection.isEmpty()) {
          const text = ed.getModel().getValueInRange(selection)
          try {
            const parsed = JSON.parse(text)
            emit('extract-to-editor', JSON.stringify(parsed, null, 2))
          } catch {
            emit('extract-to-editor', text)
          }
        }
      },
      precondition: 'editorHasSelection'
    },
    {
      id: 'json-format-selection',
      label: '格式化选中',
      keybindings: [],
      contextMenuGroupId: 'json-tools',
      contextMenuOrder: 4,
      run(ed) {
        const selection = ed.getSelection()
        if (selection && !selection.isEmpty()) {
          const text = ed.getModel().getValueInRange(selection)
          try {
            const parsed = JSON.parse(text)
            const formatted = JSON.stringify(parsed, null, 2)
            ed.executeEdits('format-selection', [{ range: selection, text: formatted }])
          } catch (_) {}
        }
      },
      precondition: 'editorHasSelection'
    },
    {
      id: 'json-copy-all',
      label: '复制全部',
      keybindings: [],
      contextMenuGroupId: 'json-tools',
      contextMenuOrder: 5,
      run(ed) {
        copyToClipboard(ed.getValue())
      }
    },
    {
      id: 'json-copy-jsonpath',
      label: '复制 JSONPath',
      keybindings: [],
      contextMenuGroupId: 'json-tools',
      contextMenuOrder: 6,
      run(ed) {
        const path = getJsonPathAtPosition(ed.getModel().getValue(), ed.getModel().getOffsetAt(ed.getPosition()))
        if (path && path !== '$') {
          copyToClipboard(path)
        }
      }
    }
  ]

  actions.forEach(action => editor.addAction(action))
}

function handleMount(editor) {
  editorInstance = editor

  registerCustomActions(editor)

  editor.onDidChangeModelContent(() => {
    if (isProgrammaticUpdate) {
      isProgrammaticUpdate = false
      return
    }
    const value = editor.getValue()
    validateJson(value)
  })

  editor.onDidPaste(() => {
    editor.getAction('editor.action.formatDocument')?.run()
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

onBeforeUnmount(() => {
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
</style>
