<template>
  <div class="compare-editor">
    <div class="editor-header">
      <span class="editor-label">{{ title }}</span>
    </div>
    <div class="editor-container" ref="editorContainerRef">
      <vue-monaco-editor
        ref="monacoRef"
        v-model:value="content"
        language="json"
        :theme="theme"
        :options="editorOptions"
        @mount="handleMount"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { VueMonacoEditor, loader } from '@guolao/vue-monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
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
  modelValue: { type: String, default: '' },
  title: String,
  side: String,
  displayContent: String,
  lineTypes: Array,
  diffs: Array,
  currentDiffIndex: Number,
  scrollTop: Number,
  scrollLeft: Number
})

const emit = defineEmits(['update:modelValue', 'userEditComplete', 'scroll'])

const editorContainerRef = ref(null)
const monacoRef = ref(null)
const content = ref(props.displayContent || props.modelValue || '')
let editorInstance = null
let isUserEditing = false
let isProgrammaticUpdate = false
let decorationsCollection = null

const theme = 'vs'

const editorOptions = {
  automaticLayout: true,
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
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: 'off',
  stickyScroll: { enabled: false },
  guides: {
    indentation: true,
    bracketPairs: true
  }
}

const extractOriginalJson = () => {
  const editorContent = editorInstance ? editorInstance.getValue() : ''

  if (!props.lineTypes || props.lineTypes.length === 0) {
    return editorContent
  }

  const alignedContent = props.displayContent || ''

  if (editorContent !== alignedContent) {
    const editorLines = editorContent.split('\n')
    if (editorLines.length === props.lineTypes.length) {
      const lenDiff = Math.abs(editorContent.length - alignedContent.length)
      const maxLen = Math.max(editorContent.length, alignedContent.length, 1)
      if (lenDiff / maxLen > 0.8) {
        return editorContent
      }
      const filtered = []
      for (let i = 0; i < editorLines.length; i++) {
        const type = props.lineTypes[i]
        const isPlaceholder =
          (type === 'added' && props.side === 'left') ||
          (type === 'removed' && props.side === 'right')
        if (!isPlaceholder) {
          filtered.push(editorLines[i])
        }
      }
      return filtered.join('\n')
    }
    return editorContent
  }

  const allEqual = props.lineTypes.every(type => type === 'equal')
  if (allEqual) {
    return editorContent
  }

  const lines = alignedContent.split('\n')
  const originalLines = []
  for (let i = 0; i < lines.length; i++) {
    const type = props.lineTypes[i]
    const line = lines[i]

    if (type === 'equal') {
      originalLines.push(line)
    } else if (type === 'removed') {
      if (props.side === 'left' && line.trim() !== '') {
        originalLines.push(line)
      }
    } else if (type === 'added') {
      if (props.side === 'right' && line.trim() !== '') {
        originalLines.push(line)
      }
    } else {
      originalLines.push(line)
    }
  }

  return originalLines.length > 0 ? originalLines.join('\n') : ''
}

function updateDecorations() {
  if (!editorInstance || !props.lineTypes || props.lineTypes.length === 0) {
    if (decorationsCollection) {
      decorationsCollection.clear()
    }
    return
  }

  const model = editorInstance.getModel()
  if (!model) return

  const newDecorations = []
  const currentDiff = props.currentDiffIndex >= 0 && props.diffs && props.diffs[props.currentDiffIndex]
    ? props.diffs[props.currentDiffIndex]
    : null
  const currentDiffStartLine = currentDiff?.line ?? -1
  const currentDiffEndLine = currentDiff?.endLine ?? currentDiffStartLine

  for (let i = 0; i < props.lineTypes.length; i++) {
    const type = props.lineTypes[i]
    if (type === 'equal') continue

    const lineNumber = i + 1
    if (lineNumber > model.getLineCount()) continue

    let className = ''
    let isPlaceholder = false

    if (type === 'added') {
      if (props.side === 'left') {
        className = 'diff-placeholder'
        isPlaceholder = true
      } else {
        className = 'diff-added'
      }
    } else if (type === 'removed') {
      if (props.side === 'left') {
        className = 'diff-removed'
      } else {
        className = 'diff-placeholder'
        isPlaceholder = true
      }
    } else if (type === 'modified') {
      className = 'diff-modified'
    }

    if (className) {
      newDecorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: className,
          glyphMarginClassName: className + '-glyph'
        }
      })
    }

    if (currentDiff && i >= currentDiffStartLine && i <= currentDiffEndLine && !isPlaceholder && type !== 'equal') {
      newDecorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'diff-current',
          overviewRuler: {
            color: '#ff9800',
            position: monaco.editor.OverviewRulerLane.Full
          }
        }
      })
    }
  }

  decorationsCollection = editorInstance.createDecorationsCollection(newDecorations)
}

function handleMount(editor) {
  editorInstance = editor

  editor.onDidChangeModelContent(() => {
    if (isProgrammaticUpdate) {
      isProgrammaticUpdate = false
      return
    }
    isUserEditing = true
    const originalContent = extractOriginalJson()
    emit('update:modelValue', originalContent)
    setTimeout(() => {
      isUserEditing = false
      emit('userEditComplete')
    }, 100)
  })

  editor.onDidPaste(() => {
    const value = editor.getValue()
    try {
      const parsed = JSON.parse(value)
      const formatted = JSON.stringify(parsed, null, 2)
      if (formatted !== value) {
        isProgrammaticUpdate = true
        editor.setValue(formatted)
      }
    } catch {
      // not valid JSON
    }
  })

  editor.onDidScrollChange((e) => {
    emit('scroll', {
      side: props.side,
      scrollTop: e.scrollTop,
      scrollLeft: e.scrollLeft
    })
  })

  updateDecorations()
}

watch(() => props.scrollTop, (newVal) => {
  if (editorInstance) {
    const current = editorInstance.getScrollTop()
    if (Math.abs(current - newVal) > 1) {
      editorInstance.setScrollPosition({ scrollTop: newVal })
    }
  }
})

watch(() => props.scrollLeft, (newVal) => {
  if (editorInstance) {
    const current = editorInstance.getScrollLeft()
    if (Math.abs(current - newVal) > 1) {
      editorInstance.setScrollPosition({ scrollLeft: newVal })
    }
  }
})

watch(() => props.modelValue, (newValue) => {
  if (props.displayContent) return
  if (editorInstance && editorInstance.getValue() !== newValue) {
    isProgrammaticUpdate = true
    editorInstance.setValue(newValue || '')
  }
})

watch(() => props.displayContent, (newValue) => {
  if (!editorInstance || !newValue) return
  if (isUserEditing) return

  const currentContent = editorInstance.getValue()
  if (currentContent !== newValue) {
    isProgrammaticUpdate = true
    editorInstance.setValue(newValue)
  }
  nextTick(() => updateDecorations())
})

watch(() => props.lineTypes, () => {
  updateDecorations()
}, { deep: true })

watch(() => props.diffs, () => {
  updateDecorations()
}, { deep: true })

watch(() => props.currentDiffIndex, (newIndex) => {
  updateDecorations()

  if (editorInstance && props.diffs && props.diffs[newIndex]) {
    const diff = props.diffs[newIndex]
    const targetLine = diff.line

    if (targetLine >= 0 && targetLine < props.lineTypes?.length) {
      const lineNumber = targetLine + 1
      editorInstance.revealLineInCenter(lineNumber)
    }
  }
})

onBeforeUnmount(() => {
  if (editorInstance) {
    editorInstance.dispose()
    editorInstance = null
  }
})

defineExpose({
  setContent: (c) => {
    if (editorInstance) {
      isProgrammaticUpdate = true
      editorInstance.setValue(c)
    }
  },
  getRawContent: () => editorInstance ? editorInstance.getValue() : ''
})
</script>

<style scoped>
.compare-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-header {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.editor-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.editor-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  position: relative;
}

.editor-container :deep(.monaco-editor) {
  height: 100% !important;
}

:deep(.diff-added) {
  background-color: #e6ffed !important;
}

:deep(.diff-removed) {
  background-color: #ffcccc !important;
}

:deep(.diff-modified) {
  background-color: #ffe089 !important;
}

:deep(.diff-current) {
  border-left: 3px solid #ff9800 !important;
  padding-left: 2px !important;
}

:deep(.diff-placeholder) {
  background-color: #f5f5f5 !important;
}
</style>
