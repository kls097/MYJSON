<template>
  <div class="save-dialog-overlay" @click="$emit('close')">
    <div class="save-dialog" @click.stop>
      <div class="dialog-header">
        <h3>💾 保存 Schema</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      
      <div class="dialog-content">
        <div class="form-group">
          <label>模板名称 <span class="required">*</span></label>
          <input
            v-model="form.name"
            type="text"
            placeholder="输入模板名称..."
            class="form-input"
            @keyup.enter="handleSave"
          />
        </div>
        
        <div class="form-group">
          <label>描述</label>
          <textarea
            v-model="form.description"
            placeholder="输入模板描述（可选）..."
            class="form-textarea"
            rows="3"
          />
        </div>
        
        <div class="form-group">
          <label>分类</label>
          <div class="category-select">
            <select v-model="form.category" class="form-input">
              <option v-for="cat in categories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
            <input
              v-if="form.category === '自定义'"
              v-model="customCategory"
              type="text"
              placeholder="输入新分类名称..."
              class="form-input"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label>图标</label>
          <div class="icon-picker">
            <button
              v-for="icon in iconOptions"
              :key="icon"
              :class="['icon-btn', { active: form.icon === icon }]"
              @click="form.icon = icon"
            >
              {{ icon }}
            </button>
          </div>
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
      
      <div class="dialog-footer">
        <button @click="$emit('close')" class="btn-secondary">取消</button>
        <button @click="handleSave" :disabled="!form.name.trim() || isSaving" class="btn-primary">
          {{ isSaving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { saveCustomTemplate, getCategories } from '../utils/schemaTemplates'

const props = defineProps({
  schema: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['save', 'close'])

const form = reactive({
  name: '',
  description: '',
  category: '自定义',
  icon: '📝'
})

const customCategory = ref('')
const isSaving = ref(false)
const error = ref('')

const categories = ref(['自定义', '用户管理', '电商', '开发', '内容', '文件'])

const iconOptions = [
  '📝', '📋', '📄', '📑', '📊', '📈', '📉',
  '👤', '👥', '🏢', '🏠', '📦', '🛍️', '🛒',
  '💬', '💭', '📢', '📣', '🔔', '🔕',
  '⚙️', '🔧', '🔨', '🛠️', '⛏️', '⚡', '🔌',
  '📎', '📌', '📍', '📏', '📐', '✂️', '🗑️',
  '🔒', '🔓', '🔐', '🔑', '🗝️',
  '💾', '💽', '💿', '📀', '📼',
  '📱', '💻', '🖥️', '🖨️', '⌨️', '🖱️'
]

onMounted(() => {
  // 加载现有分类
  const existingCategories = getCategories()
  categories.value = [...new Set([...categories.value, ...existingCategories])]
})

const handleSave = async () => {
  if (!form.name.trim()) {
    error.value = '请输入模板名称'
    return
  }

  isSaving.value = true
  error.value = ''

  try {
    // 解析 Schema
    const schemaObj = JSON.parse(props.schema)

    // 确定分类
    const category = form.category === '自定义' && customCategory.value.trim()
      ? customCategory.value.trim()
      : form.category

    // 保存模板
    const success = saveCustomTemplate(form.name.trim(), schemaObj, {
      description: form.description,
      category,
      icon: form.icon
    })

    if (success) {
      emit('save', {
        name: form.name.trim(),
        description: form.description,
        category,
        icon: form.icon
      })
    } else {
      error.value = '保存失败，请重试'
    }
  } catch (e) {
    error.value = 'Schema 格式错误: ' + e.message
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.save-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
}

.save-dialog {
  background: #fff;
  border-radius: 8px;
  width: 450px;
  max-width: 90vw;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.dialog-content {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}

.required {
  color: #dc3545;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #007bff;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.category-select {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 120px;
  overflow-y: auto;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: 2px solid transparent;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #e3f2fd;
  border-color: #90caf9;
}

.icon-btn.active {
  background: #007bff;
  border-color: #007bff;
}

.error-message {
  padding: 10px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
  font-size: 13px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
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
</style>
