<template>
  <div class="template-library-overlay" @click="$emit('close')">
    <div class="template-library" @click.stop>
      <div class="library-header">
        <h3>📚 Schema 模板库</h3>
        <button class="close-btn" @click="$emit('close')" title="关闭">✕</button>
      </div>
      
      <div class="library-content">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索模板..."
            class="search-input"
          />
          <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">✕</button>
        </div>
        
        <!-- 分类筛选 -->
        <div class="category-tabs">
          <button
            v-for="cat in categories"
            :key="cat"
            :class="['category-btn', { active: currentCategory === cat }]"
            @click="currentCategory = cat"
          >
            {{ cat }}
          </button>
        </div>
        
        <!-- 模板列表 -->
        <div class="template-list">
          <div v-if="filteredTemplates.length === 0" class="empty-state">
            未找到匹配的模板
          </div>
          
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            class="template-card"
          >
            <div class="template-header">
              <span class="template-icon">{{ template.icon }}</span>
              <span class="template-name">{{ template.name }}</span>
              <span v-if="template.isCustom" class="custom-badge">自定义</span>
            </div>
            
            <p class="template-desc">{{ template.description }}</p>
            
            <div class="template-actions">
              <button @click="previewTemplate(template)" class="btn-preview">预览</button>
              <button @click="selectTemplate(template)" class="btn-use">使用</button>
              <button v-if="template.isCustom" @click="deleteTemplate(template)" class="btn-delete">删除</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 预览弹窗 -->
      <div v-if="previewingTemplate" class="preview-modal" @click="previewingTemplate = null">
        <div class="preview-content" @click.stop>
          <div class="preview-header">
            <h4>{{ previewingTemplate.name }}</h4>
            <button @click="previewingTemplate = null" class="close-btn">✕</button>
          </div>
          
          <pre class="preview-schema">{{ previewingTemplate.schemaString }}</pre>
          
          <div class="preview-actions">
            <button @click="selectTemplate(previewingTemplate)" class="btn-primary">使用此模板</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  getAllTemplates,
  getCustomTemplates,
  getCategories,
  deleteCustomTemplate
} from '../utils/schemaTemplates'

const emit = defineEmits(['select', 'close'])

const searchQuery = ref('')
const currentCategory = ref('全部')
const builtinTemplates = ref([])
const customTemplates = ref([])
const previewingTemplate = ref(null)

const categories = computed(() => {
  const cats = ['全部', ...getCategories()]
  if (customTemplates.value.length > 0) {
    cats.push('自定义')
  }
  return cats
})

const allTemplates = computed(() => {
  return [...builtinTemplates.value, ...customTemplates.value]
})

const filteredTemplates = computed(() => {
  let templates = allTemplates.value
  
  // 按分类筛选
  if (currentCategory.value !== '全部') {
    if (currentCategory.value === '自定义') {
      templates = customTemplates.value
    } else {
      templates = templates.filter(t => t.category === currentCategory.value)
    }
  }
  
  // 按搜索词筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    templates = templates.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    )
  }
  
  return templates
})

onMounted(() => {
  builtinTemplates.value = getAllTemplates()
  customTemplates.value = getCustomTemplates()
})

const selectTemplate = (template) => {
  emit('select', template)
}

const previewTemplate = (template) => {
  previewingTemplate.value = template
}

const deleteTemplate = async (template) => {
  if (!confirm(`确定要删除模板 "${template.name}" 吗？`)) {
    return
  }
  
  const success = deleteCustomTemplate(template.id)
  if (success) {
    customTemplates.value = customTemplates.value.filter(t => t.id !== template.id)
  }
}
</script>

<style scoped>
.template-library-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.template-library {
  background: #fff;
  border-radius: 8px;
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.library-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.library-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

/* 搜索栏 */
.search-bar {
  position: relative;
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
}

.clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 12px;
}

/* 分类标签 */
.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.category-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  transition: all 0.2s;
}

.category-btn:hover {
  border-color: #007bff;
  color: #007bff;
}

.category-btn.active {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

/* 模板列表 */
.template-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 14px;
}

.template-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.template-card:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
}

.template-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.template-icon {
  font-size: 20px;
}

.template-name {
  font-weight: 600;
  font-size: 15px;
  color: #333;
  flex: 1;
}

.custom-badge {
  background: #28a745;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
}

.template-desc {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.template-actions {
  display: flex;
  gap: 8px;
}

.template-actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn-preview {
  background: #f0f0f0;
  color: #666;
}

.btn-preview:hover {
  background: #e0e0e0;
}

.btn-use {
  background: #007bff;
  color: white;
}

.btn-use:hover {
  background: #0056b3;
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-delete:hover {
  background: #c82333;
}

/* 预览弹窗 */
.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
}

.preview-content {
  background: #fff;
  border-radius: 8px;
  width: 700px;
  max-width: 95vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.preview-header h4 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.preview-schema {
  flex: 1;
  overflow: auto;
  padding: 16px 20px;
  margin: 0;
  background: #f8f9fa;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  max-height: 400px;
}

.preview-actions {
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary:hover {
  background: #0056b3;
}
</style>
