<template>
  <div class="toolbar">
    <div class="toolbar-section undo-redo-section">
      <button 
        class="btn btn-icon" 
        @click="$emit('undo')" 
        :disabled="!canUndo"
        title="撤销 (Ctrl+Z)"
      >
        ↶
      </button>
      <button 
        class="btn btn-icon" 
        @click="$emit('redo')" 
        :disabled="!canRedo"
        title="重做 (Ctrl+Y)"
      >
        ↷
      </button>
    </div>

    <div class="toolbar-section view-section">
      <div class="dropdown" ref="viewDropdownRef">
        <button class="btn btn-sm" @click="toggleViewDropdown">
          {{ viewModeLabel }} ▾
        </button>
        <div v-if="showViewDropdown" class="dropdown-menu dropdown-menu-left">
          <button 
            class="dropdown-item" 
            @click="handleViewChange('code')"
          >
            <span class="dropdown-item-icon">📝</span>
            代码视图
          </button>
          <button 
            class="dropdown-item" 
            @click="handleViewChange('tree')"
          >
            <span class="dropdown-item-icon">🌳</span>
            树形视图
          </button>
          <button 
            class="dropdown-item" 
            @click="handleViewChange('table')"
            :disabled="!canOpenTable"
          >
            <span class="dropdown-item-icon">📊</span>
            表格视图
            <span v-if="!canOpenTable" class="dropdown-item-hint">(需数组)</span>
          </button>
        </div>
      </div>
    </div>

    <div class="toolbar-section format-section">
      <!-- 格式化: 花括号+缩进 -->
      <button class="btn btn-icon has-tooltip" @click="$emit('format')" :disabled="!hasContent">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 4v4c0 1.5-1 2-2 2s2 .5 2 2v4"/>
          <path d="M16 4v4c0 1.5 1 2 2 2s-2 .5-2 2v4"/>
          <line x1="10" y1="9" x2="14" y2="9"/>
          <line x1="10" y1="12" x2="12" y2="12"/>
        </svg>
        <span class="tooltip">格式化</span>
      </button>
      <!-- 压缩: 紧凑花括号 -->
      <button class="btn btn-icon has-tooltip" @click="$emit('compress', false)" :disabled="!hasContent">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M6 6c-2 0-2 2-2 3s0 2 2 3c-2 1-2 2-2 3s0 3 2 3"/>
          <path d="M18 6c2 0 2 2 2 3s0 2-2 3c2 1 2 2 2 3s0 3-2 3"/>
          <circle cx="10" cy="12" r="1" fill="currentColor" stroke="none"/>
          <circle cx="14" cy="12" r="1" fill="currentColor" stroke="none"/>
        </svg>
        <span class="tooltip">压缩</span>
      </button>
      <!-- 压缩并转义: 引号包裹 -->
      <button class="btn btn-icon has-tooltip" @click="$emit('compress', true)" :disabled="!hasContent">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <text x="3" y="16" font-size="14" fill="currentColor" stroke="none" font-family="serif">"</text>
          <path d="M9 8c-1 0-1 1-1 1.5s0 1 1 1.5c-1 .5-1 1-1 1.5s0 1.5 1 1.5"/>
          <path d="M15 8c1 0 1 1 1 1.5s0 1-1 1.5c1 .5 1 1 1 1.5s0 1.5-1 1.5"/>
          <text x="18" y="18" font-size="14" fill="currentColor" stroke="none" font-family="serif">"</text>
        </svg>
        <span class="tooltip">压缩并转义</span>
      </button>
      <!-- 去转义: 引号展开 -->
      <button class="btn btn-icon has-tooltip" @click="$emit('unescape')" :disabled="!hasContent">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <text x="2" y="10" font-size="10" fill="currentColor" stroke="none" font-family="serif" text-decoration="line-through">""</text>
          <path d="M6 18l4-4"/>
          <path d="M10 18l4-4"/>
          <path d="M12 20v-4c0-1 .5-2 1.5-2s1.5 1 1.5 2v4"/>
          <path d="M19 20v-4c0-1-.5-2-1.5-2s-1.5 1-1.5 2v4"/>
        </svg>
        <span class="tooltip">去转义</span>
      </button>
      <!-- 修复JSON: 仅当JSON格式错误时显示 -->
      <button 
        v-if="needsFix" 
        class="btn btn-icon has-tooltip btn-fix" 
        @click="$emit('fix-json')" 
        :disabled="!hasContent"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        <span class="tooltip">修复JSON</span>
      </button>
    </div>

    <div class="toolbar-section">
      <button class="btn btn-sm btn-secondary" @click="$emit('toggle-query')" title="显示/隐藏Path查询面板">
        {{ showQuery ? '隐藏Path' : 'Path' }}
      </button>
      <button class="btn btn-sm btn-secondary" @click="$emit('toggle-convert')" title="显示/隐藏转换面板">
        {{ showConvert ? '隐藏转换' : '转换' }}
      </button>
      <button 
        class="btn btn-sm btn-schema" 
        @click="$emit('toggle-schema')" 
        :class="{ active: showSchema }"
        title="Schema 工作台"
      >
        {{ showSchema ? '隐藏Schema' : 'Schema' }}
      </button>
    </div>

    <div class="toolbar-section dropdown-section">
      <div class="dropdown" ref="dropdownRef">
        <button class="btn btn-sm btn-secondary" @click="toggleDropdown">
          更多 ▾
        </button>
        <div v-if="showDropdown" class="dropdown-menu">
          <button class="dropdown-item" @click="handleDropdownAction('save')" :disabled="!hasContent">
            <span class="dropdown-item-icon">💾</span>
            保存
            <span class="dropdown-item-shortcut">Ctrl+S</span>
          </button>
          <button class="dropdown-item" @click="handleDropdownAction('toggle-history')">
            <span class="dropdown-item-icon">📜</span>
            历史记录
          </button>
          <button class="dropdown-item" @click="handleDropdownAction('open-compare')">
            <span class="dropdown-item-icon">⚖️</span>
            比较视图
          </button>
          <button class="dropdown-item" @click="handleDropdownAction('remove-comments')" :disabled="!hasContent">
            <span class="dropdown-item-icon">🗑️</span>
            移除注释
          </button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" @click="handleDropdownAction('import-json')">
            <span class="dropdown-item-icon">📥</span>
            导入 JSON
          </button>
          <button class="dropdown-item" @click="handleDropdownAction('save-to-local')" :disabled="!hasContent">
            <span class="dropdown-item-icon">💾</span>
            保存到本地
          </button>
          <button class="dropdown-item" @click="handleDropdownAction('import-excel')">
            <span class="dropdown-item-icon">📊</span>
            从表格导入
          </button>
          <button class="dropdown-item" @click="handleDropdownAction('export-excel')" :disabled="!hasContent">
            <span class="dropdown-item-icon">📤</span>
            导出为表格
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  hasContent: {
    type: Boolean,
    default: false
  },
  showQuery: {
    type: Boolean,
    default: false
  },
  showConvert: {
    type: Boolean,
    default: false
  },
  showSchema: {
    type: Boolean,
    default: false
  },
  viewMode: {
    type: String,
    default: 'code'
  },
  canUndo: {
    type: Boolean,
    default: false
  },
  canRedo: {
    type: Boolean,
    default: false
  },
  needsFix: {
    type: Boolean,
    default: false
  },
  canOpenTable: {
    type: Boolean,
    default: false
  }
})

// 视图模式标签
const viewModeLabel = computed(() => {
  switch (props.viewMode) {
    case 'code': return '代码'
    case 'tree': return '树形'
    case 'table': return '表格'
    default: return '视图'
  }
})

const emit = defineEmits([
  'format',
  'compress',
  'remove-comments',
  'unescape',
  'fix-json',
  'save',
  'toggle-history',
  'toggle-query',
  'toggle-convert',
  'toggle-schema',
  'change-view',
  'import-json',
  'save-to-local',
  'import-excel',
  'export-excel',
  'open-compare',
  'undo',
  'redo'
])

const showDropdown = ref(false)
const dropdownRef = ref(null)
const showViewDropdown = ref(false)
const viewDropdownRef = ref(null)

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
  showViewDropdown.value = false
}

const toggleViewDropdown = () => {
  showViewDropdown.value = !showViewDropdown.value
  showDropdown.value = false
}

const handleViewChange = (mode) => {
  showViewDropdown.value = false
  emit('change-view', mode)
}

const handleDropdownAction = (action) => {
  showDropdown.value = false
  emit(action)
}

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    showDropdown.value = false
  }
  if (viewDropdownRef.value && !viewDropdownRef.value.contains(event.target)) {
    showViewDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 48px;
  padding: 8px 16px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-section:not(:last-child) {
  padding-right: 16px;
  border-right: 1px solid var(--border);
}

.dropdown-section {
  border-right: none !important;
  padding-right: 0 !important;
}

.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 180px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 4px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
  text-align: left;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.dropdown-item:hover:not(:disabled) {
  background: var(--bg-secondary);
}

.dropdown-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dropdown-item-icon {
  margin-right: 8px;
  font-size: 16px;
}

.dropdown-item-shortcut {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.6;
  padding-left: 16px;
}

.dropdown-divider {
  height: 1px;
  background-color: var(--border);
  margin: 4px 0;
}

.undo-redo-section {
  gap: 4px !important;
  padding-right: 12px !important;
}

.format-section {
  gap: 4px !important;
}

.btn-icon {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  transition: var(--transition);
  position: relative;
}

.btn-icon:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--primary);
  color: var(--primary);
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 自定义悬浮提示 */
.has-tooltip {
  position: relative;
}

.tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 6px;
  padding: 4px 8px;
  background: var(--text-primary, #333);
  color: var(--bg-primary, #fff);
  font-size: 12px;
  white-space: nowrap;
  border-radius: 4px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s, visibility 0.15s;
  z-index: 1000;
  pointer-events: none;
}

.tooltip::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-bottom-color: var(--text-primary, #333);
}

.has-tooltip:hover .tooltip {
  opacity: 1;
  visibility: visible;
}

/* 修复按钮特殊样式 */
.btn-fix {
  background: var(--warning-bg, #fff3cd);
  border-color: var(--warning, #ffc107);
  color: var(--warning-text, #856404);
}

.btn-fix:hover:not(:disabled) {
  background: var(--warning, #ffc107);
  border-color: var(--warning, #ffc107);
  color: #fff;
}

/* 视图下拉菜单 */
.view-section .dropdown-menu {
  min-width: 160px;
}

.dropdown-menu-left {
  left: 0;
  right: auto;
}

.dropdown-item-hint {
  margin-left: 8px;
  font-size: 11px;
  opacity: 0.5;
  flex-shrink: 0;
}

/* Schema 按钮 */
.btn-schema {
  background: #6f42c1;
  border-color: #6f42c1;
  color: white;
}

.btn-schema:hover {
  background: #5a32a3;
  border-color: #5a32a3;
}

.btn-schema.active {
  background: #5a32a3;
  border-color: #5a32a3;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}
</style>
