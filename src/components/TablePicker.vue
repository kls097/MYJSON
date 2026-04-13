<template>
  <div class="table-picker">
    <div class="picker-header">
      <button class="btn btn-sm" @click="emit('close')" title="返回">
        ← 返回
      </button>
      <span class="picker-title">选择表格数据源</span>
    </div>

    <div class="picker-body">
      <p class="picker-hint">
        找到 {{ candidates.length }} 个可表格化的数组：
      </p>

      <div class="candidate-list">
        <div
          v-for="(candidate, index) in candidates"
          :key="candidate.path"
          class="candidate-card"
          :class="{ selected: selectedIndex === index }"
          @click="selectedIndex = index"
          @dblclick="handleSelect(candidate)"
        >
          <div class="card-radio">
            <span class="radio-dot" :class="{ active: selectedIndex === index }"></span>
          </div>
          <div class="card-body">
            <div class="card-path">{{ candidate.path }}</div>
            <div class="card-meta">
              {{ candidate.rowCount }} 行 · {{ candidate.columns.length }} 列
            </div>
            <div class="card-desc">{{ getDescription(candidate) }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="picker-footer">
      <button
        class="btn btn-sm btn-primary"
        :disabled="selectedIndex === null"
        @click="handleSelect(candidates[selectedIndex])"
      >
        打开表格
      </button>
      <button class="btn btn-sm" @click="emit('close')">
        取消
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  candidates: {
    type: Array,
    required: true
    // Each item: { path: string, data: any[], columns: string[], rowCount: number }
  }
})

const emit = defineEmits(['select', 'close'])

const selectedIndex = ref(props.candidates.length > 0 ? 0 : null)

const getDescription = (candidate) => {
  if (candidate.path === '$') return '顶级数组'
  const segments = candidate.path.split('.')
  return segments[segments.length - 1] + ' 数组'
}

const handleSelect = (candidate) => {
  if (!candidate) return
  emit('select', candidate)
}
</script>

<style scoped>
.table-picker {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.picker-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.picker-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.picker-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.picker-hint {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.candidate-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.candidate-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition);
}

.candidate-card:hover {
  border-color: var(--primary);
  background: var(--bg-hover);
}

.candidate-card.selected {
  border-color: var(--primary);
  background: rgba(33, 150, 243, 0.08);
}

.card-radio {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  border: 2px solid var(--border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.candidate-card:hover .card-radio {
  border-color: var(--primary);
}

.candidate-card.selected .card-radio {
  border-color: var(--primary);
}

.radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  transition: var(--transition);
}

.radio-dot.active {
  background: var(--primary);
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-path {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-code);
  word-break: break-all;
}

.card-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.card-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
  opacity: 0.8;
}

.picker-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
