<template>
  <div class="schema-validator-panel" :style="{ width: panelWidth + 'px' }">
    <!-- 拖动调整宽度手柄 -->
    <div class="resize-handle" @mousedown="startResize"></div>
    
    <div class="panel-header">
      <h3>Schema 工作台</h3>
      <div class="header-actions">
        <button class="icon-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
          {{ isFullscreen ? '🗗' : '🗖' }}
        </button>
        <button class="icon-btn" @click="$emit('close')" title="关闭">✕</button>
      </div>
    </div>

    <div class="panel-content">
      <!-- 功能 Tab 切换 -->
      <div class="tab-bar">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          :class="['tab-btn', { active: currentTab === tab.key }]"
          @click="currentTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 生成 Schema 面板 -->
      <div v-if="currentTab === 'generate'" class="tab-panel">
        <div class="panel-section">
          <div class="section-header">
            <h4>从 JSON 生成 Schema</h4>
            <p class="section-desc">根据当前 JSON 数据自动生成 JSON Schema</p>
          </div>
          
          <div class="options-group">
            <div class="option-row">
              <label>Schema 版本:</label>
              <select v-model="generateOptions.version">
                <option v-for="opt in versionOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="option-row">
              <label>必需字段:</label>
              <select v-model="generateOptions.required">
                <option v-for="opt in requiredOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="option-row">
              <label class="checkbox-label">
                <input type="checkbox" v-model="generateOptions.addExamples" />
                添加示例值
              </label>
            </div>
            <div class="option-row">
              <label class="checkbox-label">
                <input type="checkbox" v-model="generateOptions.addDescriptions" />
                添加描述
              </label>
            </div>
          </div>
          
          <button @click="handleGenerateSchema" :disabled="isGenerating" class="btn-primary btn-large">
            {{ isGenerating ? '生成中...' : '从当前 JSON 生成 Schema' }}
          </button>
          
          <div v-if="generateError" class="error-alert">
            {{ generateError }}
          </div>
        </div>
        
        <div class="panel-divider"></div>
        
        <div class="panel-section">
          <h4>快速操作</h4>
          <div class="quick-actions">
            <button @click="handleLoadExample" class="btn-secondary">
              📋 加载示例 Schema
            </button>
            <button @click="showTemplateLibrary = true" class="btn-secondary">
              📚 打开模板库
            </button>
          </div>
        </div>
      </div>

      <!-- 验证数据面板 -->
      <div v-if="currentTab === 'validate'" class="tab-panel">
        <div class="panel-section">
          <div class="validation-config">
            <label class="checkbox-label">
              <input type="checkbox" v-model="strictMode" />
              严格模式
            </label>
          </div>
          
          <button @click="handleValidate" :disabled="isValidating || !schemaInput.trim()" class="btn-primary btn-large">
            {{ isValidating ? '验证中...' : '验证当前 JSON' }}
          </button>
          
          <div v-if="validationResult" class="validation-result">
            <div v-if="validationResult.valid" class="result-success">
              <span class="success-icon">✓</span>
              <span>验证通过！JSON 数据符合 Schema 定义</span>
            </div>
            <div v-else class="result-error">
              <div class="error-summary">
                <span class="error-icon">✗</span>
                <span>发现 {{ validationResult.errors?.length || 0 }} 个错误</span>
              </div>
              <div class="error-list" v-if="validationResult.errors">
                <div
                  v-for="(error, index) in validationResult.errors"
                  :key="index"
                  class="error-item"
                  @click="jumpToError(error)"
                >
                  <div class="error-path">{{ error.path || '/' }}</div>
                  <div class="error-message">{{ error.description || error.message }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="schemaError" class="error-alert">
            {{ schemaError }}
          </div>
        </div>
      </div>

      <!-- Mock 数据面板 -->
      <div v-if="currentTab === 'mock'" class="tab-panel">
        <div class="panel-section">
          <div class="options-group">
            <div class="option-row">
              <label>生成数量:</label>
              <select v-model="mockOptions.count">
                <option v-for="opt in countOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="option-row">
              <label>数据语言:</label>
              <select v-model="mockOptions.locale">
                <option v-for="opt in localeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="option-row">
              <label>输出格式:</label>
              <select v-model="mockOptions.asArray">
                <option :value="false">单个对象</option>
                <option :value="true">数组</option>
              </select>
            </div>
            <div class="option-row" v-if="mockOptions.count > 1">
              <label class="checkbox-label">
                <input type="checkbox" v-model="mockOptions.previewOnly" />
                仅预览（不应用到编辑器）
              </label>
            </div>
          </div>
          
          <button @click="handleGenerateMock" :disabled="isGeneratingMock || !schemaInput.trim()" class="btn-primary btn-large">
            {{ isGeneratingMock ? '生成中...' : '生成 Mock 数据' }}
          </button>
          
          <div v-if="mockPreview" class="mock-preview">
            <h5>生成预览</h5>
            <div class="preview-stats">
              <span>将生成 {{ mockOptions.count }} 条数据</span>
              <span>预计大小: {{ formatBytes(mockPreview.estimatedSize) }}</span>
            </div>
            <pre v-if="mockPreview.samples" class="preview-json">{{ JSON.stringify(mockPreview.samples[0], null, 2) }}</pre>
          </div>
          
          <div v-if="mockError" class="error-alert">
            {{ mockError }}
          </div>
        </div>
      </div>

      <div class="panel-divider"></div>

      <!-- Schema 编辑器 -->
      <div class="editor-section">
        <div class="editor-header">
          <label>Schema 编辑器</label>
          <div class="editor-actions">
            <button @click="formatSchema" class="btn-icon" title="格式化">🔧</button>
            <button @click="clearSchema" class="btn-icon" title="清空">🗑️</button>
            <button @click="saveSchema" class="btn-icon" title="保存">💾</button>
          </div>
        </div>
        <div ref="schemaEditorRef" class="schema-editor"></div>
        <div v-if="schemaParseError" class="editor-error">{{ schemaParseError }}</div>
      </div>

      <!-- 使用说明 -->
      <div class="help-section">
        <details>
          <summary>💡 使用说明</summary>
          <div class="help-content">
            <h4>快速开始</h4>
            <ol>
              <li><strong>生成 Schema</strong>：切换到"生成"标签，点击"从当前 JSON 生成 Schema"</li>
              <li><strong>验证数据</strong>：切换到"验证"标签，点击"验证当前 JSON"检查数据是否符合 Schema</li>
              <li><strong>生成 Mock</strong>：切换到"Mock"标签，配置选项后生成测试数据</li>
            </ol>
            
            <h4>工作流</h4>
            <ul>
              <li>JSON → 生成 Schema → 调整 Schema → 验证 → 生成 Mock</li>
            </ul>
            
            <h4>快捷键</h4>
            <ul>
              <li>Ctrl+Shift+G: 生成 Schema</li>
              <li>Ctrl+Shift+V: 验证数据</li>
              <li>Ctrl+Shift+M: 生成 Mock</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
    
    <!-- 模板库弹窗 -->
    <SchemaTemplateLibrary
      v-if="showTemplateLibrary"
      @select="handleSelectTemplate"
      @close="showTemplateLibrary = false"
    />
    
    <!-- 保存 Schema 弹窗 -->
    <SaveSchemaDialog
      v-if="showSaveDialog"
      :schema="schemaInput"
      @save="handleSaveSchema"
      @close="showSaveDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { json } from '@codemirror/lang-json'
import { linter, lintGutter } from '@codemirror/lint'

import { useSchemaValidator } from '../composables/useSchemaValidator'
import { generateSchema, getDefaultGenerateOptions, schemaVersionOptions, requiredFieldOptions } from '../utils/schemaGenerator'
import { generateMockData, getDefaultMockOptions, localeOptions, countOptions, generateMockPreview } from '../utils/mockGenerator'
import { getSchemaExample } from '../utils/schemaValidator'
import SchemaTemplateLibrary from './SchemaTemplateLibrary.vue'
import SaveSchemaDialog from './SaveSchemaDialog.vue'

const props = defineProps({
  currentJson: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'apply-mock', 'jump-to-error'])

// ============ 状态管理 ============
const currentTab = ref('validate') // generate, validate, mock
const tabs = [
  { key: 'generate', label: '📝 生成 Schema' },
  { key: 'validate', label: '✓ 验证数据' },
  { key: 'mock', label: '🔧 生成 Mock' }
]

// 面板尺寸
const panelWidth = ref(500)
const isFullscreen = ref(false)
const isResizing = ref(false)

// 生成选项
const generateOptions = ref(getDefaultGenerateOptions())
const isGenerating = ref(false)
const generateError = ref('')

// 验证选项
const strictMode = ref(false)
const isValidating = ref(false)
const validationResult = ref(null)
const schemaError = ref('')

// Mock 选项
const mockOptions = ref(getDefaultMockOptions())
const isGeneratingMock = ref(false)
const mockPreview = ref(null)
const mockError = ref('')

// Schema 编辑器
const schemaInput = ref('')
const schemaParseError = ref('')
const schemaEditorRef = ref(null)
let schemaEditor = null

// 弹窗
const showTemplateLibrary = ref(false)
const showSaveDialog = ref(false)

// 选项列表
const versionOptions = schemaVersionOptions
const requiredOptions = requiredFieldOptions

// ============ Schema 编辑器 ============
const createSchemaEditor = () => {
  if (!schemaEditorRef.value) return
  
  // 创建 JSON linter
  const jsonLinter = linter((view) => {
    const doc = view.state.doc.toString()
    const errors = []
    
    try {
      JSON.parse(doc)
      schemaParseError.value = ''
    } catch (e) {
      const match = e.message.match(/at position (\d+)/)
      if (match) {
        const pos = parseInt(match[1])
        const line = view.state.doc.lineAt(pos)
        errors.push({
          from: line.from,
          to: line.to,
          severity: 'error',
          message: e.message
        })
      }
      schemaParseError.value = e.message
    }
    
    return errors
  })
  
  schemaEditor = new EditorView({
    doc: schemaInput.value,
    extensions: [
      basicSetup,
      json(),
      jsonLinter,
      lintGutter(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          schemaInput.value = update.state.doc.toString()
        }
      }),
      EditorView.theme({
        '&': { height: '300px' },
        '.cm-scroller': { overflow: 'auto' }
      })
    ],
    parent: schemaEditorRef.value
  })
}

// 监听 schemaInput 变化，同步到编辑器
watch(schemaInput, (newVal) => {
  if (schemaEditor && newVal !== schemaEditor.state.doc.toString()) {
    schemaEditor.dispatch({
      changes: {
        from: 0,
        to: schemaEditor.state.doc.length,
        insert: newVal
      }
    })
  }
})

// ============ 功能方法 ============

// 生成 Schema
const handleGenerateSchema = async () => {
  if (!props.currentJson?.trim()) {
    generateError.value = '请先输入 JSON 数据'
    return
  }
  
  isGenerating.value = true
  generateError.value = ''
  
  try {
    const schema = await generateSchema(props.currentJson, generateOptions.value)
    schemaInput.value = schema
    currentTab.value = 'validate'
  } catch (error) {
    generateError.value = error.message
  } finally {
    isGenerating.value = false
  }
}

// 验证数据
const handleValidate = async () => {
  if (!schemaInput.value.trim()) {
    schemaError.value = '请先输入 JSON Schema'
    return
  }
  
  if (!props.currentJson?.trim()) {
    schemaError.value = '请先输入要验证的 JSON 数据'
    return
  }
  
  isValidating.value = true
  validationResult.value = null
  schemaError.value = ''
  
  try {
    const { validateJsonWithSchema, validateSchema } = await import('../utils/schemaValidator.js')
    
    // 先验证 Schema 本身
    const schemaValidation = validateSchema(schemaInput.value)
    if (!schemaValidation.valid) {
      schemaError.value = `Schema 格式错误: ${schemaValidation.error}`
      return
    }
    
    // 验证 JSON 数据
    const result = validateJsonWithSchema(props.currentJson, schemaInput.value)
    validationResult.value = result
  } catch (error) {
    schemaError.value = error.message
  } finally {
    isValidating.value = false
  }
}

// 生成 Mock 数据
const handleGenerateMock = async () => {
  if (!schemaInput.value.trim()) {
    mockError.value = '请先输入 JSON Schema'
    return
  }
  
  isGeneratingMock.value = true
  mockError.value = ''
  
  try {
    const mockData = generateMockData(schemaInput.value, mockOptions.value)
    
    if (!mockOptions.value.previewOnly || mockOptions.value.count === 1) {
      emit('apply-mock', mockData)
    }
    
    // 更新预览
    mockPreview.value = generateMockPreview(schemaInput.value, Math.min(mockOptions.value.count, 3))
  } catch (error) {
    mockError.value = error.message
  } finally {
    isGeneratingMock.value = false
  }
}

// 跳转到错误位置
const jumpToError = (error) => {
  emit('jump-to-error', error)
}

// 加载示例
const handleLoadExample = () => {
  const example = getSchemaExample()
  schemaInput.value = example.schema
}

// 选择模板
const handleSelectTemplate = (template) => {
  schemaInput.value = template.schemaString
  showTemplateLibrary.value = false
}

// 格式化 Schema
const formatSchema = () => {
  try {
    const parsed = JSON.parse(schemaInput.value)
    schemaInput.value = JSON.stringify(parsed, null, 2)
  } catch (e) {
    // 解析错误，忽略
  }
}

// 清空 Schema
const clearSchema = () => {
  if (confirm('确定要清空 Schema 吗？')) {
    schemaInput.value = ''
  }
}

// 保存 Schema
const saveSchema = () => {
  if (!schemaInput.value.trim()) {
    alert('Schema 为空，无法保存')
    return
  }
  showSaveDialog.value = true
}

const handleSaveSchema = (data) => {
  // 保存逻辑在 SaveSchemaDialog 组件中处理
  showSaveDialog.value = false
}

// 格式化字节大小
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ============ 面板调整大小 ============
const startResize = (e) => {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = panelWidth.value
  
  const handleMouseMove = (e) => {
    if (!isResizing.value) return
    const diff = startX - e.clientX
    const newWidth = Math.min(Math.max(startWidth + diff, 300), 800)
    panelWidth.value = newWidth
  }
  
  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 全屏切换
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    panelWidth.value = window.innerWidth
  } else {
    panelWidth.value = 500
  }
}

// ============ 生命周期 ============
onMounted(() => {
  nextTick(() => {
    createSchemaEditor()
  })
})

onBeforeUnmount(() => {
  if (schemaEditor) {
    schemaEditor.destroy()
  }
})
</script>

<style scoped>
.schema-validator-panel {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  background: #fff;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  z-index: 1000;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.resize-handle {
  position: absolute;
  left: -3px;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  z-index: 1001;
}

.resize-handle:hover {
  background: rgba(0, 123, 255, 0.2);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #666;
  padding: 4px 8px;
  border-radius: 4px;
}

.icon-btn:hover {
  background: #e0e0e0;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Tab 栏 */
.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}

.tab-btn {
  padding: 8px 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  border-radius: 4px;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #f0f0f0;
}

.tab-btn.active {
  background: #007bff;
  color: white;
}

/* Tab 面板 */
.tab-panel {
  margin-bottom: 16px;
}

.panel-section {
  margin-bottom: 16px;
}

.section-header {
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #333;
}

.section-desc {
  margin: 0;
  font-size: 12px;
  color: #999;
}

/* 选项组 */
.options-group {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.option-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.option-row:last-child {
  margin-bottom: 0;
}

.option-row label {
  font-size: 13px;
  color: #555;
  min-width: 80px;
}

.option-row select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
}

.checkbox-label input {
  margin: 0;
}

/* 按钮 */
.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
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

.btn-large {
  width: 100%;
  padding: 10px;
  font-size: 14px;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.btn-icon:hover {
  background: #e0e0e0;
}

/* 快速操作 */
.quick-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 验证结果 */
.validation-result {
  margin-top: 12px;
  padding: 12px;
  border-radius: 6px;
}

.result-success {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 4px;
  color: #155724;
}

.success-icon {
  color: #28a745;
  font-size: 20px;
  font-weight: bold;
}

.result-error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 12px;
}

.error-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #721c24;
  margin-bottom: 12px;
}

.error-icon {
  color: #dc3545;
  font-size: 20px;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-item {
  padding: 10px;
  background: #fff;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.error-item:hover {
  background: #fff5f5;
}

.error-path {
  font-family: monospace;
  font-size: 12px;
  color: #dc3545;
  font-weight: 600;
  margin-bottom: 4px;
}

.error-message {
  font-size: 13px;
  color: #721c24;
}

/* Mock 预览 */
.mock-preview {
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.mock-preview h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #333;
}

.preview-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.preview-json {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  font-size: 11px;
  max-height: 150px;
  overflow: auto;
  margin: 0;
}

/* 错误提示 */
.error-alert {
  margin-top: 12px;
  padding: 10px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
  font-size: 13px;
}

/* 分隔线 */
.panel-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 16px 0;
}

/* 编辑器区域 */
.editor-section {
  margin-bottom: 16px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.editor-header label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.editor-actions {
  display: flex;
  gap: 4px;
}

.schema-editor {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.editor-error {
  margin-top: 4px;
  font-size: 12px;
  color: #dc3545;
}

/* 使用说明 */
.help-section {
  margin-top: 16px;
  padding-top: 16px;
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
  font-size: 13px;
}

.help-section summary:hover {
  color: #0056b3;
}

.help-content {
  padding: 12px 0;
  color: #666;
  font-size: 13px;
  line-height: 1.6;
}

.help-content h4 {
  margin: 12px 0 8px 0;
  color: #333;
  font-size: 13px;
}

.help-content ol,
.help-content ul {
  margin: 8px 0;
  padding-left: 20px;
}

.help-content li {
  margin: 4px 0;
}

.help-content strong {
  color: #333;
}
</style>
