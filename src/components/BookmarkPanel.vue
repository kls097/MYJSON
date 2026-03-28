<template>
  <div v-if="visible" class="bookmark-panel">
    <div class="bookmark-panel__header">
      <h3>📁 收藏夹</h3>
      <div class="bookmark-panel__actions">
        <button class="btn btn-sm btn-primary" @click="showSaveForm = true">
          + 保存当前
        </button>
        <button class="btn btn-sm" @click="$emit('close')">✕</button>
      </div>
    </div>

    <!-- 保存表单 -->
    <div v-if="showSaveForm" class="bookmark-save-form">
      <input
        v-model="newName"
        class="bookmark-input"
        placeholder="输入收藏名称..."
        @keydown.enter="handleSave"
        ref="nameInputRef"
      />
      <div class="bookmark-save-actions">
        <button class="btn btn-sm btn-primary" @click="handleSave" :disabled="!newName.trim()">保存</button>
        <button class="btn btn-sm" @click="showSaveForm = false">取消</button>
      </div>
    </div>

    <!-- 书签列表 -->
    <div class="bookmark-list" v-if="bookmarks.length">
      <div
        v-for="bookmark in bookmarks"
        :key="bookmark.id"
        class="bookmark-item"
      >
        <div class="bookmark-info">
          <div class="bookmark-name">{{ bookmark.name }}</div>
          <div class="bookmark-meta">{{ bookmark.createdAt }}</div>
        </div>
        <div class="bookmark-actions">
          <button class="btn btn-sm" @click="handleLoad(bookmark)" title="加载">📋</button>
          <button class="btn btn-sm btn-danger" @click="handleRemove(bookmark.id)" title="删除">🗑️</button>
        </div>
      </div>
    </div>
    <div v-else class="bookmark-empty">
      还没有收藏，点击「保存当前」收藏常用 JSON 模板
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  bookmarks: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'load', 'save', 'remove'])

const showSaveForm = ref(false)
const newName = ref('')
const nameInputRef = ref(null)

const handleSave = () => {
  if (!newName.value.trim()) return
  emit('save', newName.value.trim())
  newName.value = ''
  showSaveForm.value = false
}

const handleLoad = (bookmark) => {
  emit('load', bookmark.content)
}

const handleRemove = (id) => {
  emit('remove', id)
}
</script>

<style scoped>
.bookmark-panel {
  position: fixed;
  top: 48px;
  right: 16px;
  width: 320px;
  max-height: 400px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 900;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bookmark-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}

.bookmark-panel__header h3 {
  margin: 0;
  font-size: 14px;
}

.bookmark-panel__actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.bookmark-save-form {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bookmark-input {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}

.bookmark-input:focus {
  border-color: var(--accent-color, #4a9eff);
}

.bookmark-save-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.bookmark-list {
  overflow-y: auto;
  flex: 1;
}

.bookmark-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.bookmark-item:last-child {
  border-bottom: none;
}

.bookmark-item:hover {
  background: var(--bg-secondary);
}

.bookmark-info {
  flex: 1;
  min-width: 0;
}

.bookmark-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookmark-meta {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.bookmark-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.bookmark-empty {
  padding: 20px 14px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.btn-danger:hover {
  background: rgba(243, 139, 168, 0.15);
}
</style>
