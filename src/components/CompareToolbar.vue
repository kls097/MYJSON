<template>
  <div class="compare-toolbar">
    <div class="toolbar-group">
      <button @click="$emit('format')" class="btn btn-sm" title="格式化左右两边的 JSON">
        格式化
      </button>
      <button @click="$emit('sort')" class="btn btn-sm" title="按键名字母排序">
        排序
      </button>
      <button @click="$emit('swap')" class="btn btn-sm" title="交换左右两边">
        ⇄ 交换
      </button>
      <button @click="$emit('compare-immediate')" class="btn btn-sm" title="重新比较">
        重新比较
      </button>
    </div>

    <div class="toolbar-group">
      <button
        @click="$emit('prev')"
        class="btn btn-sm"
        :disabled="stats.total === 0"
        title="上一个差异"
      >
        ← 上一个
      </button>
      <span class="diff-counter">
        <template v-if="stats.total > 0">
          {{ currentIndex + 1 }} / {{ stats.total }}
        </template>
        <template v-else>
          无差异
        </template>
      </span>
      <button
        @click="$emit('next')"
        class="btn btn-sm"
        :disabled="stats.total === 0"
        title="下一个差异"
      >
        下一个 →
      </button>
    </div>

    <div class="toolbar-group">
      <button @click="$emit('close')" class="btn btn-sm btn-secondary" title="关闭比较模式">
        关闭比较
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  stats: {
    type: Object,
    default: () => ({ total: 0, added: 0, removed: 0, modified: 0 })
  },
  currentIndex: {
    type: Number,
    default: 0
  }
})

defineEmits(['format', 'sort', 'swap', 'compare-immediate', 'prev', 'next', 'close'])
</script>

<style scoped>
.compare-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
  gap: 16px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diff-counter {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
  min-width: 80px;
  text-align: center;
  padding: 0 8px;
}

/* 按钮禁用状态 */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
