<template>
  <div class="history-panel slide-in">
    <div class="history-header">
      <h3>已保存的 JSON 历史记录</h3>
      <div class="header-actions">
        <button
          @click="toggleCompareMode"
          class="btn btn-sm"
          :class="{ 'btn-primary': compareMode }"
          :title="compareMode ? '取消比较模式' : '选择记录进行对比'"
        >
          {{ compareMode ? '取消比较' : '选择比较' }}
        </button>
        <button
          v-if="compareMode && selectedDocs.length === 1"
          @click="compareWithCurrent"
          class="btn btn-sm btn-success"
          title="与当前 JSON 比较"
        >
          与当前比较
        </button>
        <button
          v-if="compareMode && selectedDocs.length === 2"
          @click="startCompare"
          class="btn btn-sm btn-success"
          title="开始比较选中的两个 JSON"
        >
          开始比较
        </button>
        <button @click="$emit('close')" class="btn btn-sm btn-secondary">✕</button>
      </div>
    </div>

    <div class="history-search">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索..."
        class="search-input"
      />
    </div>

    <div class="history-list">
      <div
        v-for="doc in filteredDocuments"
        :key="doc._id"
        class="history-item"
        :class="{ 'selected': isSelected(doc) }"
        @click="compareMode ? toggleSelection(doc) : loadDocument(doc)"
      >
        <input
          v-if="compareMode"
          type="checkbox"
          :checked="isSelected(doc)"
          @click.stop="toggleSelection(doc)"
          class="compare-checkbox"
        />
        <div class="item-content">
          <div class="item-header">
            <div class="item-name">{{ doc.name }}</div>
            <button
              @click.stop="deleteDoc(doc)"
              class="btn-delete"
              title="Delete"
            >
              🗑
            </button>
          </div>
          <div class="item-preview">{{ doc.preview }}...</div>
          <div class="item-meta">
            {{ formatDate(doc.timestamp) }} · {{ formatSize(doc.size) }}
          </div>
        </div>
      </div>

      <div v-if="filteredDocuments.length === 0" class="empty-state">
        <p v-if="searchQuery">没有匹配的文档</p>
        <p v-else>还没有保存的文档</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useJsonStorage } from '../composables/useJsonStorage'

const emit = defineEmits(['close', 'load', 'compare', 'compareWithCurrent'])

const { documents, loadDocuments, deleteDocument } = useJsonStorage()
const searchQuery = ref('')
const compareMode = ref(false)
const selectedDocs = ref([])

onMounted(() => {
  loadDocuments()
})

const filteredDocuments = computed(() => {
  if (!searchQuery.value) return documents.value

  const query = searchQuery.value.toLowerCase()
  return documents.value.filter(doc =>
    doc.name.toLowerCase().includes(query) ||
    doc.content.toLowerCase().includes(query)
  )
})

const loadDocument = (doc) => {
  emit('load', doc.content)
  emit('close')
}

const deleteDoc = (doc) => {
  if (confirm(`确定要删除 "${doc.name}" 吗?`)) {
    try {
      const success = deleteDocument(doc)
      if (!success) {
        console.error('删除失败')
      }
    } catch (error) {
      console.error('删除出错:', error)
    }
  }
}

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// 比较模式相关方法
const toggleCompareMode = () => {
  compareMode.value = !compareMode.value
  selectedDocs.value = []
}

const isSelected = (doc) => {
  return selectedDocs.value.some(d => d._id === doc._id)
}

const toggleSelection = (doc) => {
  const index = selectedDocs.value.findIndex(d => d._id === doc._id)
  if (index >= 0) {
    selectedDocs.value.splice(index, 1)
  } else if (selectedDocs.value.length < 2) {
    selectedDocs.value.push(doc)
  } else {
    // 如果已经选了2个,替换第二个
    selectedDocs.value[1] = doc
  }
}

const startCompare = () => {
  if (selectedDocs.value.length === 2) {
    emit('compare', {
      left: selectedDocs.value[0].content,
      right: selectedDocs.value[1].content
    })
  }
}

const compareWithCurrent = () => {
  if (selectedDocs.value.length === 1) {
    emit('compareWithCurrent', selectedDocs.value[0].content)
  }
}
</script>

<style scoped>
.history-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 350px;
  background: var(--bg-primary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  z-index: 100;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.history-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-search {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.search-input {
  width: 100%;
}

.history-list {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.history-item {
  padding: 12px;
  margin-bottom: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.history-item:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
}

.history-item.selected {
  background: var(--primary-light);
  border-color: var(--primary);
}

.compare-checkbox {
  margin-top: 4px;
  cursor: pointer;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.item-name {
  font-weight: 600;
  font-size: 13px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  opacity: 0.6;
  transition: var(--transition);
}

.btn-delete:hover {
  opacity: 1;
}

.item-preview {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}

.item-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: var(--text-secondary);
}
</style>
