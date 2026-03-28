<template>
  <Transition name="toast">
    <div v-if="visible" class="toast" :class="[`toast--${type}`, { 'toast--closable': closable }]">
      <div class="toast__icon">
        <span v-if="type === 'success'">✅</span>
        <span v-else-if="type === 'error'">❌</span>
        <span v-else-if="type === 'warning'">⚠️</span>
        <span v-else>ℹ️</span>
      </div>
      <div class="toast__body">
        <div v-if="title" class="toast__title">{{ title }}</div>
        <div class="toast__message" v-html="formattedMessage"></div>
      </div>
      <button v-if="closable" class="toast__close" @click="close">✕</button>
      <button v-if="action" class="toast__action" @click="onAction">{{ action.text }}</button>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  type: { type: String, default: 'info' },       // success | error | warning | info
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  duration: { type: Number, default: 5000 },       // 0 = 不自动关闭
  closable: { type: Boolean, default: true },
  action: { type: Object, default: null },          // { text: '撤销', onClick: () => {} }
})

const emit = defineEmits(['update:modelValue', 'action'])

const visible = ref(props.modelValue)
let timer = null

const formattedMessage = computed(() => {
  return props.message.replace(/\n/g, '<br>')
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.duration > 0) {
    clearTimeout(timer)
    timer = setTimeout(close, props.duration)
  }
})

const close = () => {
  visible.value = false
  clearTimeout(timer)
  emit('update:modelValue', false)
}

const onAction = () => {
  if (props.action?.onClick) props.action.onClick()
  if (props.action?.autoClose !== false) close()
  emit('action')
}

onUnmounted(() => clearTimeout(timer))
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--bg-color, #1e1e2e);
  color: var(--text-color, #cdd6f4);
  border: 1px solid var(--border-color, #313244);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: 420px;
  font-size: 13px;
  line-height: 1.5;
  backdrop-filter: blur(10px);
}

.toast--success {
  border-color: #a6e3a1;
  background: rgba(166, 227, 161, 0.1);
}

.toast--error {
  border-color: #f38ba8;
  background: rgba(243, 139, 168, 0.1);
}

.toast--warning {
  border-color: #f9e2af;
  background: rgba(249, 226, 175, 0.1);
}

.toast__icon {
  flex-shrink: 0;
  font-size: 16px;
  margin-top: 1px;
}

.toast__body {
  flex: 1;
  min-width: 0;
}

.toast__title {
  font-weight: 600;
  margin-bottom: 2px;
}

.toast__message {
  word-break: break-word;
}

.toast__message :deep(br) {
  display: block;
  content: '';
  margin-top: 2px;
}

.toast__close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #6c7086;
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
  line-height: 1;
  transition: color 0.2s;
}

.toast__close:hover {
  color: #cdd6f4;
}

.toast__action {
  flex-shrink: 0;
  background: rgba(137, 180, 250, 0.15);
  border: 1px solid rgba(137, 180, 250, 0.3);
  color: #89b4fa;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.toast__action:hover {
  background: rgba(137, 180, 250, 0.25);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
