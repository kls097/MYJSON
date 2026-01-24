<template>
  <div class="convert-result-panel">
    <!-- 关闭按钮 -->
    <button class="close-button" @click="$emit('close')" title="关闭转换结果">✕</button>

    <!-- 错误提示 -->
    <div v-if="error" class="error-state">
      <div class="error-header">
        <span class="error-icon">✗</span>
        <span class="error-title">转换错误</span>
      </div>
      <div class="error-message">{{ error }}</div>
    </div>

    <!-- 转换结果 -->
    <div v-else class="result-display">
      <div class="result-header">
        <span class="success-icon">✓</span>
        <span class="result-title">{{ language }} 代码</span>
        <!-- 复制按钮 -->
        <button class="copy-button" @click="copyResult" title="复制代码">
          复制
        </button>
      </div>
      <pre class="result-content">{{ result }}</pre>
    </div>
  </div>
</template>

<script setup>
import { useClipboard } from '../composables/useClipboard'

const props = defineProps({
  result: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

const { copyToClipboard } = useClipboard()

// 复制结果
const copyResult = () => {
  if (props.result) {
    copyToClipboard(props.result)
  }
}
</script>

<style scoped>
.convert-result-panel {
  position: relative;
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: var(--bg-primary);
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
}

/* 关闭按钮 */
.close-button {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.close-button:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
  color: var(--text-primary);
}

/* 错误状态 */
.error-state {
  padding: 16px;
  padding-top: 40px; /* 为关闭按钮留出空间 */
}

.error-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.error-icon {
  color: var(--error);
  font-size: 18px;
  font-weight: bold;
}

.error-title {
  color: var(--error);
  font-size: 14px;
  font-weight: 600;
}

.error-message {
  padding: 12px;
  background: #FFEBEE;
  border: 1px solid var(--error);
  border-radius: var(--radius);
  color: var(--error);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 转换结果显示 */
.result-display {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-top: 32px; /* 为关闭按钮留出空间 */
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.success-icon {
  color: var(--success);
  font-size: 18px;
  font-weight: bold;
}

.result-title {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  flex: 1;
}

.copy-button {
  padding: 4px 12px;
  font-size: 12px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.copy-button:hover {
  background: var(--primary-hover);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.copy-button:active {
  transform: scale(0.95);
}

.result-content {
  flex: 1;
  margin: 0;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: auto;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre;
}
</style>
