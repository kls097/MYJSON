<template>
  <div class="three-way-merge-panel">
    <!-- 工具栏 -->
    <div class="merge-toolbar">
      <div class="toolbar-actions">
        <button class="btn-primary" @click="handleMerge" :disabled="!canMerge">
          执行三方合并
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
        <textarea
          v-model="baseJson"
          class="json-input"
          placeholder="输入基础版本 JSON..."
          @input="validateBase"
        ></textarea>
      </div>
      
      <div class="editor-panel">
        <div class="panel-header">
          <span>左侧 (Left / My)</span>
          <span v-if="!isValidLeft" class="error-badge">JSON 错误</span>
        </div>
        <textarea
          v-model="leftJson"
          class="json-input"
          placeholder="输入左侧版本 JSON..."
          @input="validateLeft"
        ></textarea>
      </div>
      
      <div class="editor-panel">
        <div class="panel-header">
          <span>右侧 (Right / Theirs)</span>
          <span v-if="!isValidRight" class="error-badge">JSON 错误</span>
        </div>
        <textarea
          v-model="rightJson"
          class="json-input"
          placeholder="输入右侧版本 JSON..."
          @input="validateRight"
        ></textarea>
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
      <textarea
        :value="formattedResult"
        class="result-output"
        readonly
      ></textarea>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useJsonMerge } from '../composables/useJsonMerge'

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

// 格式化结果
const formattedResult = computed(() => formatResult(true))
const resultSize = computed(() => formattedResult.value.length)

// 是否可以合并
const canMerge = computed(() => {
  return baseJson.value.trim() && leftJson.value.trim() && rightJson.value.trim()
})

// 验证
function validateBase() {
  if (!baseJson.value.trim()) {
    isValidBase.value = true
    return
  }
  try {
    JSON.parse(baseJson.value)
    isValidBase.value = true
  } catch (e) {
    isValidBase.value = false
  }
}

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
function handleMerge() {
  executeThreeWayMerge()
}

async function handleCopyResult() {
  await copyResult()
  alert('已复制到剪贴板')
}

function handleReset() {
  reset()
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
  background: #f5f5f5;
  border-radius: 4px;
  flex-wrap: wrap;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
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
  color: #666;
}

.status-count {
  font-weight: 600;
  color: #52c41a;
}

.status-count.left {
  color: #fa8c16;
}

.status-count.right {
  color: #1890ff;
}

.status-item.conflict .status-count {
  color: #ff4d4f;
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
  background: #eee;
  border-radius: 4px 4px 0 0;
  font-size: 12px;
  font-weight: 500;
}

.error-badge {
  font-size: 10px;
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
  font-size: 11px;
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
  max-height: 120px;
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
  color: #1890ff;
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
  min-height: 120px;
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

.error-message {
  padding: 12px;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  color: #ff4d4f;
  font-size: 13px;
}
</style>
