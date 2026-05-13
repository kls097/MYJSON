<template>
  <div class="json-merge-panel">
    <!-- 工具栏 -->
    <div class="merge-toolbar">
      <div class="toolbar-group">
        <button class="btn btn-sm" @click="handleFormat" title="格式化右侧">
          格式化
        </button>
        <button class="btn btn-sm" @click="handleSwap" title="交换左右">
          ⇄ 交换
        </button>
        <button class="btn btn-sm" @click="handleCopyResult" :disabled="!rightContent.trim()">
          复制结果
        </button>
      </div>

      <div class="toolbar-group">
        <button class="btn-primary" @click="handleApply" :disabled="!hasValidRight">
          应用到编辑器
        </button>
        <button class="btn btn-sm btn-secondary" @click="handleClose">
          关闭
        </button>
      </div>
    </div>

    <!-- DiffEditor: 左侧原始(只读), 右侧可编辑(合并结果) -->
    <div class="diff-editor-container">
      <vue-monaco-diff-editor
        ref="diffEditorRef"
        :original="leftContent"
        :modified="rightContent"
        language="json"
        :theme="editorTheme"
        :options="diffOptions"
        @mount="handleMount"
      />
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { VueMonacoDiffEditor, loader } from '@guolao/vue-monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
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

const emit = defineEmits(['close', 'apply'])

const diffEditorRef = ref(null)
const leftContent = ref('')
const rightContent = ref('')
const error = ref('')
let diffEditorInstance = null

const editorTheme = 'vs'

const diffOptions = {
  automaticLayout: true,
  renderSideBySide: true,
  readOnly: false,
  originalEditable: false,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 13,
  fontFamily: "'Monaco', 'Menlo', 'Consolas', monospace",
  lineNumbers: 'on',
  renderLineHighlight: 'line',
  bracketPairColorization: { enabled: true },
  tabSize: 2,
  insertSpaces: true,
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

const hasValidRight = computed(() => {
  if (!rightContent.value.trim()) return false
  try {
    JSON.parse(rightContent.value)
    return true
  } catch {
    return false
  }
})

function handleMount(editor) {
  diffEditorInstance = editor

  const modifiedEditor = editor.getModifiedEditor()
  modifiedEditor.onDidChangeModelContent(() => {
    rightContent.value = modifiedEditor.getValue()
    error.value = ''
  })
}

function handleFormat() {
  if (!diffEditorInstance) return
  const modifiedEditor = diffEditorInstance.getModifiedEditor()
  try {
    const parsed = JSON.parse(rightContent.value)
    const formatted = JSON.stringify(parsed, null, 2)
    rightContent.value = formatted
    error.value = ''
  } catch (e) {
    error.value = '右侧 JSON 格式错误，无法格式化'
  }
}

function handleSwap() {
  const temp = leftContent.value
  leftContent.value = rightContent.value
  rightContent.value = temp
}

async function handleCopyResult() {
  const text = rightContent.value
  if (!text.trim()) return

  if (window.utools && window.utools.writeClipboardText) {
    window.utools.writeClipboardText(text)
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
  }
  alert('已复制到剪贴板')
}

function handleApply() {
  try {
    JSON.parse(rightContent.value)
    emit('apply', rightContent.value)
  } catch (e) {
    error.value = '右侧 JSON 格式错误: ' + e.message
  }
}

function handleClose() {
  emit('close')
}

onMounted(() => {
  leftContent.value = props.initialLeft || ''
  rightContent.value = props.initialRight || ''
})

onBeforeUnmount(() => {
  if (diffEditorInstance) {
    diffEditorInstance.dispose()
    diffEditorInstance = null
  }
})
</script>

<style scoped>
.json-merge-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0;
}

.merge-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
  gap: 16px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn {
  padding: 6px 16px;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn:hover:not(:disabled) {
  background: var(--bg-secondary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
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
  background: var(--bg-secondary);
  border: 1px solid var(--border);
}

.diff-editor-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.diff-editor-container :deep(.monaco-diff-editor) {
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
