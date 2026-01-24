<template>
  <div class="status-bar">
    <div class="status-item">
      <span v-if="stats">
        {{ stats.lines }} 行 | {{ stats.characters }} 字符 | {{ stats.sizeKB }} KB
      </span>
      <span v-else>-</span>
    </div>

    <div class="status-item">
      <span v-if="validationResult.valid" class="text-success">
        ✓ 有效的 JSON
      </span>
      <span v-else class="text-error">
        ✗ {{ validationResult.error }}
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  stats: {
    type: Object,
    default: null
  },
  validationResult: {
    type: Object,
    default: () => ({ valid: true, error: null })
  }
})
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  font-size: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
