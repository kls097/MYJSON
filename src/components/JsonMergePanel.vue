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
          <span v-if="!isValidLeft" class="error-badge">JSON 格式错误</span>
        </div>
        <textarea
          v-model="leftJson"
          class="json-input"
          placeholder="输入左侧 JSON..."
          @input="validateLeft"
        ></textarea>
      </div>
      
      <div class="editor-panel">
        <div class="panel-header">
          <span>右侧 JSON</span>
          <span v-if="!isValidRight" class="error-badge">JSON 格式错误</span>
        </div>
        <textarea
          v-model="rightJson"
          class="json-input"
          placeholder="输入右侧 JSON..."
          @input="validateRight"
        ></textarea>
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
      <textarea
        :value="formattedResult"
        class="result-output"
        readonly
      ></textarea>
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
import { ref, computed, onMounted } from 'vue'
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

const {
  leftJson,
  rightJson,
  mergeStrategy,
  arrayStrategy,
  mergeResult,
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

// 初始化数据
onMounted(() => {
  if (props.initialLeft || props.initialRight) {
    setInitialData(props.initialLeft, props.initialRight)
  }
})

// 格式化结果
const formattedResult = computed(() => formatResult(true))
const resultSize = computed(() => formattedResult.value.length)

// 是否可以合并
const canMerge = computed(() => {
  return leftJson.value.trim() && rightJson.value.trim()
})

// 验证
function validateLeft() {
  if (!leftJson.value.trim()) {
    isValidLeft.value = true
    return
  }
  try {
    JSON.parse(leftJson.value)
    isValidLeft.value = true
  } catch (e) {
    isValidLeft.value = false
  }
}

function validateRight() {
  if (!rightJson.value.trim()) {
    isValidRight.value = true
    return
  }
  try {
    JSON.parse(rightJson.value)
    isValidRight.value = true
  } catch (e) {
    isValidRight.value = false
  }
}

// 事件处理
function onStrategyChange() {
  // 策略变更时清空结果
  if (mergeResult.value) {
    mergeResult.value = null
    conflicts.value = []
  }
}

function handleMerge() {
  executeMerge()
}

async function handleCopyResult() {
  await copyResult()
  alert('已复制到剪贴板')
}

function handleReset() {
  reset()
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
  background: #f5f5f5;
  border-radius: 4px;
}

.strategy-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.strategy-selector label {
  font-size: 13px;
  color: #333;
}

.strategy-selector select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.btn-primary {
  padding: 6px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-primary:hover:not(:disabled) {
  background: #40a9ff;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 6px 16px;
  background: white;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-secondary:hover:not(:disabled) {
  background: #f5f5f5;
}

.btn-secondary:disabled {
  color: #ccc;
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
  background: #eee;
  border-radius: 4px 4px 0 0;
  font-size: 13px;
  font-weight: 500;
}

.error-badge {
  font-size: 11px;
  color: #ff4d4f;
  background: #fff1f0;
  padding: 2px 6px;
  border-radius: 2px;
}

.json-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  resize: none;
}

.json-input:focus {
  outline: none;
  border-color: #1890ff;
}

.conflicts-section {
  background: #fffbe6;
  border: 1px solid #ffe58f;
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
  background: white;
  border: 1px solid #ffd591;
  border-radius: 4px;
  padding: 8px;
}

.conflict-path {
  font-family: monospace;
  font-size: 12px;
  color: #1890ff;
  margin-bottom: 4px;
}

.conflict-message {
  font-size: 12px;
  color: #666;
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
  border: 1px solid #ddd;
  border-radius: 2px;
  cursor: pointer;
  background: white;
}

.conflict-actions button:hover {
  background: #f5f5f5;
}

.result-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 150px;
}

.result-info {
  font-size: 12px;
  color: #999;
  font-weight: normal;
}

.result-output {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  resize: none;
  background: #fafafa;
}

.result-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}

.error-message {
  padding: 12px;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  color: #ff4d4f;
  font-size: 13px;
}
</style>
