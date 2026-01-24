<template>
  <div class="convert-panel">
    <select v-model="selectedLanguage" class="language-selector">
      <option value="" disabled>选择目标语言</option>
      <option v-for="lang in languages" :key="lang" :value="lang">
        {{ lang }}
      </option>
    </select>

    <div class="input-wrapper">
      <input
        v-model="typeName"
        type="text"
        placeholder="类型名称 (默认: Root)"
        class="type-input"
      />
    </div>

    <div v-if="isConverting" class="loading-indicator">
      转换中...
    </div>
    <div v-else-if="selectedLanguage" class="info-text">
      已选择: {{ selectedLanguage }}
    </div>
  </div>
</template>

<script setup>
import { ref, inject, watch } from 'vue'
import { useJsonConverter } from '../composables/useJsonConverter'

const currentJson = inject('currentJson')
const selectedLanguage = ref('')
const typeName = ref('Root')

const emit = defineEmits(['convert-result', 'convert-error', 'convert-clear'])

const { isConverting, languages, convertToLanguage } = useJsonConverter()

// 监听语言选择变化,自动执行转换
watch(selectedLanguage, async (newLang) => {
  if (!newLang) {
    // 清空选择时,清除结果
    emit('convert-clear')
    return
  }

  if (!currentJson.value || !currentJson.value.trim()) {
    emit('convert-error', '请先输入有效的 JSON')
    return
  }

  try {
    // 验证 JSON 格式
    JSON.parse(currentJson.value)

    // 执行转换
    const result = await convertToLanguage(
      currentJson.value,
      newLang,
      typeName.value || 'Root'
    )

    // 通知父组件转换成功
    emit('convert-result', { result, language: newLang })
  } catch (error) {
    // 通知父组件转换错误
    emit('convert-error', error.message)
  }
})

// 监听类型名称变化,如果已选择语言则重新转换
watch(typeName, async (newTypeName) => {
  if (selectedLanguage.value && newTypeName) {
    try {
      const result = await convertToLanguage(
        currentJson.value,
        selectedLanguage.value,
        newTypeName
      )
      emit('convert-result', { result, language: selectedLanguage.value })
    } catch (error) {
      emit('convert-error', error.message)
    }
  }
})
</script>

<style scoped>
.convert-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.language-selector {
  width: 150px;
  height: 32px;
}

.input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 150px;
  max-width: 300px;
}

.type-input {
  flex: 1;
  height: 32px;
  width: 100%;
}

.loading-indicator {
  color: var(--primary);
  font-size: 13px;
  font-weight: 500;
}

.info-text {
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
