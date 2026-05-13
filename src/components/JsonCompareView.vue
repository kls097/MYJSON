<template>
  <div class="compare-view">
    <CompareToolbar
      :stats="stats"
      :current-index="currentDiffIndex"
      @format="handleFormat"
      @sort="handleSort"
      @swap="handleSwap"
      @next="handleNext"
      @prev="handlePrev"
      @merge-to-left="handleMergeToLeft"
      @merge-to-right="handleMergeToRight"
      @compare-immediate="handleCompareImmediate"
      @close="$emit('close')"
    />

    <div class="diff-editor-container">
      <vue-monaco-diff-editor
        ref="diffEditorRef"
        :original="leftJson"
        :modified="rightJson"
        language="json"
        :theme="editorTheme"
        :options="diffOptions"
        @mount="handleMount"
      />
    </div>

    <CompareStatusBar
      :stats="stats"
      :current-diff="currentDiff"
    />

    <div v-if="compareError" class="error-toast">
      {{ compareError }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { VueMonacoDiffEditor, loader } from '@guolao/vue-monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import CompareToolbar from './CompareToolbar.vue'
import CompareStatusBar from './CompareStatusBar.vue'
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

const emit = defineEmits(['close', 'merge'])

const diffEditorRef = ref(null)
const leftJson = ref('')
const rightJson = ref('')
const compareError = ref('')
const currentDiffIndex = ref(-1)
const diffList = ref([])
let diffEditorInstance = null

const editorTheme = 'vs'

const diffOptions = {
  automaticLayout: true,
  readOnly: false,
  renderSideBySide: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 13,
  fontFamily: "'Monaco', 'Menlo', 'Consolas', monospace",
  lineNumbers: 'on',
  renderLineHighlight: 'line',
  bracketPairColorization: { enabled: true },
  tabSize: 2,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: 'off',
  stickyScroll: { enabled: false },
  guides: { indentation: true, bracketPairs: true },
  scrollbar: {
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10
  }
}

function handleMount(editor) {
  diffEditorInstance = editor

  const modifiedEditor = editor.getModifiedEditor()
  modifiedEditor.onDidChangeModelContent(() => {
    rightJson.value = modifiedEditor.getValue()
  })

  const originalEditor = editor.getOriginalEditor()
  originalEditor.onDidChangeModelContent(() => {
    leftJson.value = originalEditor.getValue()
  })

  editor.onDidUpdateDiff(() => {
    updateDiffInfo()
  })

  updateDiffInfo()
}

function updateDiffInfo() {
  if (!diffEditorInstance) return

  const changes = diffEditorInstance.getLineChanges()
  if (!changes || changes.length === 0) {
    diffList.value = []
    currentDiffIndex.value = -1
    return
  }

  diffList.value = changes.map((change, i) => ({
    index: i,
    originalStartLine: change.originalStartLineNumber,
    originalEndLine: change.originalEndLineNumber,
    modifiedStartLine: change.modifiedStartLineNumber,
    modifiedEndLine: change.modifiedEndLineNumber,
    type: change.originalEndLineNumber === 0 ? 'added' :
          change.modifiedEndLineNumber === 0 ? 'removed' : 'modified'
  }))

  if (currentDiffIndex.value >= diffList.value.length) {
    currentDiffIndex.value = diffList.value.length > 0 ? 0 : -1
  } else if (diffList.value.length > 0 && currentDiffIndex.value < 0) {
    currentDiffIndex.value = 0
  }
}

const stats = computed(() => {
  const added = diffList.value.filter(d => d.type === 'added').length
  const removed = diffList.value.filter(d => d.type === 'removed').length
  const modified = diffList.value.filter(d => d.type === 'modified').length
  return { total: diffList.value.length, added, removed, modified }
})

const currentDiff = computed(() => {
  if (diffList.value.length === 0 || currentDiffIndex.value < 0) return null
  return diffList.value[currentDiffIndex.value]
})

function handleFormat() {
  if (!diffEditorInstance) return
  const originalEditor = diffEditorInstance.getOriginalEditor()
  const modifiedEditor = diffEditorInstance.getModifiedEditor()
  try {
    const leftVal = originalEditor.getValue()
    if (leftVal.trim()) {
      const formatted = formatJson(leftVal, 2, false)
      originalEditor.setValue(formatted)
    }
  } catch (_) {}
  try {
    const rightVal = modifiedEditor.getValue()
    if (rightVal.trim()) {
      const formatted = formatJson(rightVal, 2, false)
      modifiedEditor.setValue(formatted)
    }
  } catch (_) {}
}

function handleSort() {
  if (!diffEditorInstance) return
  const originalEditor = diffEditorInstance.getOriginalEditor()
  const modifiedEditor = diffEditorInstance.getModifiedEditor()
  try {
    const leftVal = originalEditor.getValue()
    if (leftVal.trim()) {
      const formatted = formatJson(leftVal, 2, true)
      originalEditor.setValue(formatted)
    }
  } catch (_) {}
  try {
    const rightVal = modifiedEditor.getValue()
    if (rightVal.trim()) {
      const formatted = formatJson(rightVal, 2, true)
      modifiedEditor.setValue(formatted)
    }
  } catch (_) {}
}

function handleSwap() {
  if (!diffEditorInstance) return
  const originalEditor = diffEditorInstance.getOriginalEditor()
  const modifiedEditor = diffEditorInstance.getModifiedEditor()
  const temp = originalEditor.getValue()
  originalEditor.setValue(modifiedEditor.getValue())
  modifiedEditor.setValue(temp)
}

function handleNext() {
  if (diffList.value.length === 0) return
  currentDiffIndex.value = (currentDiffIndex.value + 1) % diffList.value.length
  navigateToDiff(currentDiffIndex.value)
}

function handlePrev() {
  if (diffList.value.length === 0) return
  currentDiffIndex.value = (currentDiffIndex.value - 1 + diffList.value.length) % diffList.value.length
  navigateToDiff(currentDiffIndex.value)
}

function navigateToDiff(index) {
  const diff = diffList.value[index]
  if (!diff || !diffEditorInstance) return

  const modifiedEditor = diffEditorInstance.getModifiedEditor()
  const targetLine = diff.modifiedStartLine > 0 ? diff.modifiedStartLine : diff.modifiedEndLine
  if (targetLine > 0) {
    modifiedEditor.revealLineInCenter(targetLine)
  }
}

function handleCompareImmediate() {
  updateDiffInfo()
}

function handleMergeToLeft() {
  if (!diffEditorInstance) return
  const originalEditor = diffEditorInstance.getOriginalEditor()
  const modifiedEditor = diffEditorInstance.getModifiedEditor()
  const rightVal = modifiedEditor.getValue()
  if (!rightVal.trim()) return
  try {
    const formatted = formatJson(rightVal, 2, false)
    originalEditor.setValue(formatted)
    leftJson.value = formatted
  } catch (e) {
    compareError.value = '合并失败: ' + e.message
    setTimeout(() => { compareError.value = '' }, 3000)
  }
}

function handleMergeToRight() {
  if (!diffEditorInstance) return
  const originalEditor = diffEditorInstance.getOriginalEditor()
  const modifiedEditor = diffEditorInstance.getModifiedEditor()
  const leftVal = originalEditor.getValue()
  if (!leftVal.trim()) return
  try {
    const formatted = formatJson(leftVal, 2, false)
    modifiedEditor.setValue(formatted)
    rightJson.value = formatted
  } catch (e) {
    compareError.value = '合并失败: ' + e.message
    setTimeout(() => { compareError.value = '' }, 3000)
  }
}

onMounted(() => {
  leftJson.value = props.initialLeft || ''
  rightJson.value = props.initialRight || ''
})

onBeforeUnmount(() => {
  if (diffEditorInstance) {
    diffEditorInstance.dispose()
    diffEditorInstance = null
  }
})

function setInitialData(left, right) {
  leftJson.value = left || ''
  rightJson.value = right || ''
  if (diffEditorInstance) {
    const originalEditor = diffEditorInstance.getOriginalEditor()
    const modifiedEditor = diffEditorInstance.getModifiedEditor()
    originalEditor.setValue(leftJson.value)
    modifiedEditor.setValue(rightJson.value)
  }
}

defineExpose({
  setInitialData,
  compareImmediate: handleCompareImmediate,
  leftJson,
  rightJson
})
</script>

<style scoped>
.compare-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
}

.diff-editor-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.diff-editor-container :deep(.monaco-editor) {
  height: 100% !important;
}

.error-toast {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: var(--error);
  color: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  font-size: 13px;
  z-index: 1000;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
