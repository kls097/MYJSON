<template>
  <div class="schema-validator-panel">
    <div class="panel-header">
      <h3>Schema 验证</h3>
      <button class="close-btn" @click="$emit('close')" title="关闭">✕</button>
    </div>

    <div class="panel-content">
      <!-- 操作按钮区 -->
      <div class="action-buttons">
        <button @click="handleValidate" :disabled="isValidating" class="btn-primary">
          {{ isValidating ? '验证中...' : '验证数据' }}
        </button>
        <button @click="handleGenerateMock" class="btn-secondary">
          生成 Mock 数据
        </button>
        <button @click="handleLoadExample" class="btn-secondary">
          加载示例
        </button>
        <button @click="handleClear" class="btn-secondary">
          清空
        </button>
      </div>

      <!-- Schema 输入区 -->
      <div class="input-section">
        <div class="section-header">
          <label>JSON Schema</label>
          <span class="hint">输入或粘贴 JSON Schema</span>
        </div>
        <textarea
          v-model="schemaInput"
          placeholder="请输入 JSON Schema..."
          class="schema-textarea"
          spellcheck="false"
        ></textarea>
      </div>

      <!-- 验证结果区 -->
      <div v-if="validationResult || schemaError" class="result-section">
        <div class="section-header">
          <label>验证结果</label>
        </div>

        <!-- Schema 错误 -->
        <div v-if="schemaError" class="error-message">
          <div class="error-icon">⚠️</div>
          <div class="error-text">{{ schemaError }}</div>
        </div>

        <!-- 验证成功 -->
        <div v-else-if="validationResult && validationResult.valid" class="success-message">
          <div class="success-icon">✓</div>
          <div class="success-text">验证通过！JSON 数据符合 Schema 定义</div>
        </div>

        <!-- 验证失败 -->
        <div v-else-if="validationResult && !validationResult.valid" class="validation-errors">
          <div class="error-summary">
            <div class="error-icon">✗</div>
            <div class="error-text">发现 {{ validationResult.errors.length }} 个错误</div>
          </div>
          <div class="error-list">
            <div
              v-for="(error, index) in validationResult.errors"
              :key="index"
              class="error-item"
            >
              <div class="error-path">{{ error.path }}</div>
              <div class="error-description">{{ error.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="help-section">
        <details>
          <summary>使用说明</summary>
          <div class="help-content">
            <h4>什么是 JSON Schema？</h4>
            <p>JSON Schema 是一种用于描述 JSON 数据结构的规范，可以用来验证数据格式、生成文档和 Mock 数据。</p>

            <h4>如何使用？</h4>
            <ol>
              <li><strong>生成 Schema</strong>：在转换面板中选择 "JSON Schema" 可以从当前 JSON 生成 Schema</li>
              <li><strong>验证数据</strong>：在此面板输入 Schema，点击"验证数据"检查当前 JSON 是否符合 Schema</li>
              <li><strong>生成 Mock</strong>：点击"生成 Mock 数据"可以根据 Schema 自动生成测试数据</li>
            </ol>

            <h4>示例</h4>
            <p>点击"加载示例"可以查看一个完整的 Schema 验证示例。</p>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useSchemaValidator } from '../composables/useSchemaValidator'

const currentJson = inject('currentJson')
const emit = defineEmits(['close', 'apply-mock'])

const schemaInput = ref('')
const {
  isValidating,
  validationResult,
  schemaError,
  validate,
  generateMock,
  clearResult,
  getExample
} = useSchemaValidator()

/**
 * 验证当前 JSON 数据
 */
const handleValidate = async () => {
  if (!schemaInput.value.trim()) {
    alert('请先输入 JSON Schema')
    return
  }

  if (!currentJson.value || !currentJson.value.trim()) {
    alert('请先输入要验证的 JSON 数据')
    return
  }

  await validate(currentJson.value, schemaInput.value)
}

/**
 * 生成 Mock 数据
 */
const handleGenerateMock = async () => {
  if (!schemaInput.value.trim()) {
    alert('请先输入 JSON Schema')
    return
  }

  try {
    const mockData = await generateMock(schemaInput.value)
    // 将 Mock 数据应用���编辑器
    emit('apply-mock', mockData)
    alert('Mock 数据已生成并应用到编辑器')
  } catch (error) {
    alert(error.message)
  }
}

/**
 * 加载示例
 */
const handleLoadExample = () => {
  const example = getExample()
  schemaInput.value = example.schema

  // 询问用户是否要加载示例 JSON
  if (confirm('是否同时加载示例 JSON 数据？')) {
    emit('apply-mock', example.validJson)
  }
}

/**
 * 清空
 */
const handleClear = () => {
  schemaInput.value = ''
  clearResult()
}
</script>

<style scoped>
.schema-validator-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 500px;
  height: 100vh;
  background: #fff;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  z-index: 1000;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #e0e0e0;
  color: #333;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.input-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-header label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.section-header .hint {
  font-size: 12px;
  color: #999;
}

.schema-textarea {
  width: 100%;
  height: 300px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  resize: vertical;
  box-sizing: border-box;
}

.schema-textarea:focus {
  outline: none;
  border-color: #007bff;
}

.result-section {
  margin-bottom: 20px;
}

.success-message,
.error-message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 4px;
  margin-top: 10px;
}

.success-message {
  background: #d4edda;
  border: 1px solid #c3e6cb;
}

.success-icon {
  color: #28a745;
  font-size: 20px;
  font-weight: bold;
}

.success-text {
  color: #155724;
  flex: 1;
}

.error-message {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
}

.error-icon {
  color: #dc3545;
  font-size: 20px;
}

.error-text {
  color: #721c24;
  flex: 1;
}

.validation-errors {
  margin-top: 10px;
}

.error-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin-bottom: 10px;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.error-item {
  padding: 10px;
  background: #fff;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

.error-path {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #dc3545;
  font-weight: 600;
  margin-bottom: 5px;
}

.error-description {
  font-size: 13px;
  color: #721c24;
}

.help-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.help-section details {
  cursor: pointer;
}

.help-section summary {
  font-weight: 600;
  color: #007bff;
  padding: 8px 0;
  user-select: none;
}

.help-section summary:hover {
  color: #0056b3;
}

.help-content {
  padding: 15px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.help-content h4 {
  margin: 15px 0 10px 0;
  color: #333;
  font-size: 14px;
}

.help-content p {
  margin: 8px 0;
}

.help-content ol {
  margin: 10px 0;
  padding-left: 20px;
}

.help-content li {
  margin: 5px 0;
}

.help-content strong {
  color: #333;
}
</style>
