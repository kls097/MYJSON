<template>
  <div v-if="isOpen" class="save-dialog-overlay" @click.self="$emit('cancel')">
    <div class="save-dialog">
      <div class="dialog-header">
        <h3>保存 JSON</h3>
        <button @click="$emit('cancel')" class="close-btn">✕</button>
      </div>

      <div class="dialog-body">
        <label>
          <span class="label-text">名称</span>
          <input
            ref="inputRef"
            v-model="inputValue"
            type="text"
            placeholder="输入 JSON 名称..."
            @keydown.enter="handleConfirm"
            @keydown.esc="$emit('cancel')"
            class="dialog-input"
          />
        </label>
      </div>

      <div class="dialog-footer">
        <button @click="$emit('cancel')" class="btn btn-sm btn-secondary">
          取消
        </button>
        <button @click="handleConfirm" class="btn btn-sm btn-success">
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  defaultName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['save', 'cancel'])

const inputRef = ref(null)
const inputValue = ref('')

// 监听对话框打开事件
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    inputValue.value = props.defaultName
    await nextTick()
    inputRef.value?.focus()
    inputRef.value?.select() // 选中文本,方便用户直接输入
  }
})

const handleConfirm = () => {
  const name = inputValue.value.trim() || props.defaultName
  emit('save', name)
}
</script>

<style scoped>
.save-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn 0.2s ease;
}

.save-dialog {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: var(--text-secondary);
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.close-btn:hover {
  color: var(--text-primary);
}

.dialog-body {
  padding: 16px;
}

.label-text {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.dialog-input {
  width: 100%;
}

.dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
}
</style>
