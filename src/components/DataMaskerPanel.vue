<template>
  <div class="masker-panel">
    <div class="masker-header">
      <span class="panel-title">🔒 数据脱敏</span>
      <button class="btn-close" @click="$emit('close')" title="关闭">✕</button>
    </div>

    <!-- 自动检测结果 -->
    <div v-if="detectedFields.length > 0" class="detected-section">
      <div class="section-label">检测到 {{ detectedFields.length }} 个敏感字段</div>
      <div class="field-list">
        <label
          v-for="field in detectedFields"
          :key="field.path"
          class="field-item"
        >
          <input
            type="checkbox"
            :checked="enabledFields.has(field.path)"
            @change="toggleField(field.path)"
          />
          <span class="field-path">{{ field.path }}</span>
          <span class="field-rule">{{ field.ruleName }}</span>
        </label>
      </div>
    </div>

    <!-- 规则选择 -->
    <div class="rules-section">
      <div class="section-label">脱敏规则</div>
      <div class="rule-list">
        <label
          v-for="rule in rules"
          :key="rule.id"
          class="rule-item"
        >
          <input
            type="checkbox"
            :checked="enabledRules[rule.id]"
            @change="toggleRule(rule.id)"
          />
          <span>{{ rule.name }}</span>
        </label>
      </div>
    </div>

    <!-- 自定义字段名 -->
    <div class="custom-section">
      <div class="section-label">自定义字段名（逗号分隔）</div>
      <input
        v-model="customFields"
        class="custom-input"
        placeholder="例如: myPhone, user_email"
      />
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn-preview" @click="handlePreview" :disabled="!hasEnabledRules">
        预览
      </button>
      <button class="btn-apply" @click="handleApply" :disabled="!hasEnabledRules">
        应用脱敏
      </button>
    </div>

    <!-- 预览/统计 -->
    <div v-if="stats" class="stats-section">
      <div class="stats-info">
        共脱敏 <strong>{{ stats.total }}</strong> 个字段
        <span v-for="(count, ruleId) in stats.byRule" :key="ruleId" class="stat-item">
          | {{ getRuleName(ruleId) }}: {{ count }}
        </span>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted } from 'vue'
import { getBuiltInRules, detectSensitiveFields, maskJson } from '../utils/dataMasker'

const currentJson = inject('currentJson')
const emit = defineEmits(['close', 'apply'])

const rules = ref(getBuiltInRules())
const enabledRules = ref({})
const enabledFields = ref(new Set())
const detectedFields = ref([])
const customFields = ref('')
const stats = ref(null)
const error = ref('')
const previewResult = ref(null)

const hasEnabledRules = computed(() => {
  return Object.values(enabledRules.value).some(v => v)
})

// 初始化时自动启用所有规则
onMounted(() => {
  const autoRules = {}
  rules.value.forEach(r => { autoRules[r.id] = true })
  enabledRules.value = autoRules
  detectFields()
})

// 监听 JSON 变化重新检测
watch(currentJson, () => {
  detectFields()
  stats.value = null
  previewResult.value = null
})

function detectFields() {
  if (!currentJson.value || !currentJson.value.trim()) {
    detectedFields.value = []
    return
  }
  const { fields, error: err } = detectSensitiveFields(currentJson.value)
  if (err) {
    error.value = err
    return
  }
  detectedFields.value = fields
  // 默认启用所有检测到的字段
  const newEnabled = new Set(enabledFields.value)
  fields.forEach(f => newEnabled.add(f.path))
  enabledFields.value = newEnabled
}

function toggleRule(ruleId) {
  enabledRules.value = {
    ...enabledRules.value,
    [ruleId]: !enabledRules.value[ruleId]
  }
}

function toggleField(path) {
  const newSet = new Set(enabledFields.value)
  if (newSet.has(path)) {
    newSet.delete(path)
  } else {
    newSet.add(path)
  }
  enabledFields.value = newSet
}

function buildRuleConfig() {
  const config = {}
  for (const rule of rules.value) {
    const customFieldList = customFields.value
      ? customFields.value.split(',').map(f => f.trim()).filter(Boolean)
      : []
    config[rule.id] = {
      enabled: !!enabledRules.value[rule.id],
      customFields: customFieldList
    }
  }
  return config
}

function handlePreview() {
  error.value = ''
  if (!currentJson.value || !currentJson.value.trim()) {
    error.value = '请先输入 JSON 内容'
    return
  }
  const { result, error: err, stats: s } = maskJson(currentJson.value, buildRuleConfig())
  if (err) {
    error.value = err
    return
  }
  previewResult.value = result
  stats.value = s
}

function handleApply() {
  error.value = ''
  if (!currentJson.value || !currentJson.value.trim()) {
    error.value = '请先输入 JSON 内容'
    return
  }
  const { result, error: err, stats: s } = maskJson(currentJson.value, buildRuleConfig())
  if (err) {
    error.value = err
    return
  }
  stats.value = s
  emit('apply', result)
}

function getRuleName(ruleId) {
  const rule = rules.value.find(r => r.id === ruleId)
  return rule ? rule.name : ruleId
}
</script>

<style scoped>
.masker-panel {
  position: fixed;
  right: 0;
  top: 48px;
  bottom: 28px;
  width: 320px;
  background: var(--bg-primary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.masker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close {
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
}

.btn-close:hover {
  color: var(--text-primary);
}

.section-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.detected-section,
.rules-section,
.custom-section,
.stats-section {
  padding: 0;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 150px;
  overflow-y: auto;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 0;
}

.field-path {
  color: var(--text-primary);
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-rule {
  color: var(--primary);
  font-size: 11px;
  flex-shrink: 0;
}

.rule-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  border: 1px solid var(--border);
}

.custom-input {
  width: 100%;
  height: 32px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
}

.custom-input:focus {
  outline: none;
  border-color: var(--primary);
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-preview,
.btn-apply {
  flex: 1;
  padding: 8px;
  font-size: 13px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-preview {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-primary);
}

.btn-preview:hover:not(:disabled) {
  background: var(--bg-hover);
}

.btn-apply {
  background: var(--primary);
  color: white;
}

.btn-apply:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-preview:disabled,
.btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats-section {
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.stats-info {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-item {
  color: var(--primary);
}

.error-msg {
  color: var(--error);
  font-size: 12px;
  padding: 6px 8px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
}
</style>
