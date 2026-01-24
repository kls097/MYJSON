<template>
  <div class="query-result-panel">
    <!-- 关闭按钮 -->
    <button class="close-button" @click="$emit('close')" title="关闭查询结果">✕</button>

    <!-- 错误提示 -->
    <div v-if="error" class="error-state">
      <div class="error-header">
        <span class="error-icon">✗</span>
        <span class="error-title">查询错误</span>
      </div>
      <div class="error-message">{{ error }}</div>
    </div>

    <!-- 查询结果 -->
    <div v-else class="result-display">
      <div class="result-header">
        <span class="success-icon">✓</span>
        <span class="result-title">查询结果</span>
        <!-- 提取到主输入域按钮 -->
        <button class="extract-button" @click="extractToEditor" title="提取到主输入域">
          提取到编辑器
        </button>
      </div>
      <pre class="result-content">{{ formattedResult }}</pre>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  result: {
    type: [Object, Array, String, Number, Boolean, null],
    default: null
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'extract'])

// 提取结果到编辑器
const extractToEditor = () => {
  emit('extract', formattedResult.value)
}

// 格式化查询结果为 JSON 字符串
const formattedResult = computed(() => {
  if (props.result === null || props.result === undefined) {
    return 'null'
  }

  // 如果是字符串,尝试检测是否为 JSON 字符串并格式化
  if (typeof props.result === 'string') {
    try {
      // 尝试解析字符串为 JSON
      const parsed = JSON.parse(props.result)
      // 解析成功,说明是 JSON 字符串,格式化输出
      return JSON.stringify(parsed, null, 2)
    } catch {
      // 不是 JSON 字符串,直接返回原字符串
      return props.result
    }
  }

  // 如果是基本类型(非对象非字符串),直接转字符串
  if (typeof props.result !== 'object') {
    return String(props.result)
  }

  // 对象或数组,格式化输出
  return JSON.stringify(props.result, null, 2)
})
</script>

<style scoped>
.query-result-panel {
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

/* 查询结果显示 */
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

.extract-button {
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

.extract-button:hover {
  background: var(--primary-hover);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.extract-button:active {
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
