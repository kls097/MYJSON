<template>
  <div class="compare-status">
    <div class="status-left">
      <div class="status-item">
        总计: <strong>{{ stats.total }}</strong> 处差异
      </div>
      <div class="status-item status-added" v-if="stats.added > 0">
        +{{ stats.added }} 新增
      </div>
      <div class="status-item status-removed" v-if="stats.removed > 0">
        -{{ stats.removed }} 删除
      </div>
      <div class="status-item status-modified" v-if="stats.modified > 0">
        ~{{ stats.modified }} 修改
      </div>
    </div>

    <div class="status-right" v-if="currentDiff">
      <div class="status-path" :title="currentDiff.path">
        <span class="path-label">路径:</span>
        <span class="path-value">{{ currentDiff.path }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  stats: {
    type: Object,
    default: () => ({ total: 0, added: 0, removed: 0, modified: 0 })
  },
  currentDiff: {
    type: Object,
    default: null
  }
})
</script>

<style scoped>
.compare-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);
  height: 36px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-item strong {
  color: var(--text-primary);
  font-weight: 600;
}

.status-added {
  color: var(--success);
}

.status-removed {
  color: var(--error);
}

.status-modified {
  color: var(--warning);
}

.status-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.status-path {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 600px;
  overflow: hidden;
}

.path-label {
  color: var(--text-secondary);
  font-weight: 600;
  flex-shrink: 0;
}

.path-value {
  color: var(--text-primary);
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
