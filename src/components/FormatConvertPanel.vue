<template>
  <div class="format-convert-panel">
    <div class="panel-controls">
      <select v-model="targetFormat" class="format-selector" @change="resetResult">
        <option value="" disabled>选择目标格式</option>
        <option value="xml">XML</option>
        <option value="yaml">YAML</option>
        <option value="csv">CSV</option>
        <option value="toml">TOML</option>
      </select>

      <div class="direction-toggle">
        <button
          :class="['btn-dir', { active: direction === 'to' }]"
          @click="direction = 'to'"
          :disabled="!targetFormat"
        >
          JSON → {{ formatLabel }}
        </button>
        <button
          :class="['btn-dir', { active: direction === 'from' }]"
          @click="direction = 'from'"
          :disabled="!targetFormat"
        >
          {{ formatLabel }} → JSON
        </button>
      </div>

      <button
        class="btn-execute"
        @click="handleConvert"
        :disabled="!targetFormat || isConverting"
      >
        {{ isConverting ? '转换中...' : '转换' }}
      </button>

      <button class="btn-close" @click="$emit('close')" title="关闭">✕</button>
    </div>

    <div v-if="direction === 'from'" class="input-area">
      <textarea
        v-model="inputText"
        :placeholder="inputPlaceholder"
        class="format-input"
        rows="3"
      ></textarea>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { jsonToXml, xmlToJson } from '../utils/xmlConverter'
import { jsonToYaml, yamlToJson } from '../utils/yamlConverter'
import { jsonToCsv, csvToJson } from '../utils/csvConverter'
import { jsonToToml, tomlToJson } from '../utils/tomlConverter'

const currentJson = inject('currentJson')
const emit = defineEmits(['close', 'convert-result', 'convert-error'])

const targetFormat = ref('')
const direction = ref('to')
const isConverting = ref(false)
const inputText = ref('')
const error = ref('')

const formatLabel = computed(() => {
  const map = { xml: 'XML', yaml: 'YAML', csv: 'CSV', toml: 'TOML' }
  return map[targetFormat.value] || ''
})

const inputPlaceholder = computed(() => {
  const map = {
    xml: '请输入 XML 内容...',
    yaml: '请输入 YAML 内容...',
    csv: '请输入 CSV 内容...',
    toml: '请输入 TOML 内容...'
  }
  return map[targetFormat.value] || '请输入内容...'
})

function resetResult() {
  error.value = ''
  inputText.value = ''
}

async function handleConvert() {
  error.value = ''
  isConverting.value = true

  try {
    let result

    if (direction.value === 'to') {
      const json = currentJson.value
      if (!json || !json.trim()) {
        error.value = '请先输入 JSON 内容'
        return
      }
      result = convertJsonTo(json)
    } else {
      const input = inputText.value
      if (!input || !input.trim()) {
        error.value = `请输入 ${formatLabel.value} 内容`
        return
      }
      result = convertToJsJson(input)
    }

    if (result.error) {
      error.value = result.error
      emit('convert-error', result.error)
    } else {
      emit('convert-result', {
        result: result.result,
        language: direction.value === 'to' ? formatLabel.value : 'JSON',
        format: targetFormat.value,
        direction: direction.value
      })
    }
  } catch (e) {
    error.value = e.message
    emit('convert-error', e.message)
  } finally {
    isConverting.value = false
  }
}

function convertJsonTo(json) {
  switch (targetFormat.value) {
    case 'xml': return jsonToXml(json)
    case 'yaml': return jsonToYaml(json)
    case 'csv': return jsonToCsv(json)
    case 'toml': return jsonToToml(json)
    default: return { result: '', error: '未知的格式' }
  }
}

function convertToJsJson(input) {
  switch (targetFormat.value) {
    case 'xml': return xmlToJson(input)
    case 'yaml': return yamlToJson(input)
    case 'csv': return csvToJson(input)
    case 'toml': return tomlToJson(input)
    default: return { result: '', error: '未知的格式' }
  }
}
</script>

<style scoped>
.format-convert-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.panel-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.format-selector {
  width: 130px;
  height: 32px;
}

.direction-toggle {
  display: flex;
  gap: 0;
}

.btn-dir {
  padding: 4px 12px;
  font-size: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-dir:first-child {
  border-radius: 4px 0 0 4px;
}

.btn-dir:last-child {
  border-radius: 0 4px 4px 0;
  border-left: none;
}

.btn-dir.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.btn-dir:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-execute {
  padding: 4px 16px;
  font-size: 12px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-execute:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-execute:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-close {
  margin-left: auto;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: var(--text-primary);
}

.input-area {
  margin-top: 4px;
}

.format-input {
  width: 100%;
  min-height: 60px;
  padding: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  resize: vertical;
}

.format-input:focus {
  outline: none;
  border-color: var(--primary);
}

.error-msg {
  color: var(--error);
  font-size: 12px;
  padding: 4px 8px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
}
</style>
