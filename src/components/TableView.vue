<template>
  <div class="table-view" @click="closeAllDropdowns">
    <!-- 工具栏 -->
    <div class="table-toolbar">
      <div class="toolbar-left">
        <button class="btn btn-sm" @click="$emit('close')" title="返回">
          ← 返回
        </button>
        <span class="table-info">
          共 {{ filteredData.length }} / {{ data.length }} 条数据
          <span v-if="activeFilterCount > 0" class="filter-badge">
            ({{ activeFilterCount }} 个筛选)
          </span>
        </span>
      </div>
      <div class="toolbar-right">
        <div class="search-box">
          <input
            v-model="searchText"
            type="text"
            placeholder="全局搜索..."
            class="search-input"
          />
          <button v-if="searchText" class="clear-btn" @click="searchText = ''">×</button>
        </div>
        <button class="btn btn-sm" @click="resetFilters" title="重置所有筛选和排序">
          重置筛选
        </button>
        <button class="btn btn-sm btn-success" @click="downloadExcel" title="导出为 Excel">
          下载
        </button>
        <button class="btn btn-sm btn-primary" @click="applyChanges" :disabled="!hasChanges" title="应用修改到编辑器">
          应用修改
        </button>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="table-container" ref="tableContainer">
      <table class="data-table">
        <thead>
          <tr>
            <th class="row-number-header">#</th>
            <th
              v-for="column in columns"
              :key="column"
              class="column-header"
              :style="{ minWidth: getColumnWidth(column) + 'px' }"
            >
              <div class="header-content">
                <span class="header-title">{{ column }}</span>
                <div class="header-actions">
                  <!-- 排序按钮 -->
                  <button
                    class="header-btn sort-btn"
                    :class="{ active: sortColumn === column }"
                    @click.stop="toggleSort(column)"
                    :title="getSortTitle(column)"
                  >
                    <span v-if="sortColumn !== column">⇅</span>
                    <span v-else-if="sortDirection === 'asc'">↑</span>
                    <span v-else>↓</span>
                  </button>
                  <!-- 筛选按钮 -->
                  <button
                    class="header-btn filter-btn"
                    :class="{ active: hasColumnFilter(column) }"
                    @click.stop="toggleFilterDropdown(column, $event)"
                    title="筛选"
                  >
                    <span>▼</span>
                  </button>
                </div>
              </div>
              <!-- 筛选下拉框 -->
              <div
                v-if="activeDropdown === column"
                class="filter-dropdown"
                @click.stop
              >
                <div class="filter-dropdown-header">
                  <span>筛选: {{ column }}</span>
                  <button class="dropdown-close" @click="closeFilterDropdown">×</button>
                </div>
                
                <!-- 范围筛选 -->
                <div class="filter-section">
                  <div class="filter-section-title">条件筛选</div>
                  <div class="condition-row">
                    <select v-model="tempFilter.operator" class="condition-select">
                      <option value="">无条件</option>
                      <option value="contains">包含</option>
                      <option value="not_contains">不包含</option>
                      <option value="=">=（等于）</option>
                      <option value="!=">≠（不等于）</option>
                      <option value=">">＞（大于）</option>
                      <option value=">=">≥（大于等于）</option>
                      <option value="<">＜（小于）</option>
                      <option value="<=">≤（小于等于）</option>
                    </select>
                    <input
                      v-model="tempFilter.value"
                      type="text"
                      class="condition-input"
                      placeholder="输入值"
                      :disabled="!tempFilter.operator"
                    />
                  </div>
                </div>
                
                <!-- 值列表筛选 -->
                <div class="filter-section">
                  <div class="filter-section-title">
                    值筛选
                    <span class="select-actions">
                      <a @click="selectAllValues(column)">全选</a>
                      <a @click="deselectAllValues(column)">清除</a>
                    </span>
                  </div>
                  <div class="value-search">
                    <input
                      v-model="valueSearchText"
                      type="text"
                      placeholder="搜索值..."
                      class="value-search-input"
                    />
                  </div>
                  <div class="value-list">
                    <label
                      v-for="val in getFilteredUniqueValues(column)"
                      :key="val.key"
                      class="value-item"
                    >
                      <input
                        type="checkbox"
                        :checked="isValueSelected(column, val.value)"
                        @change="toggleValueSelection(column, val.value)"
                      />
                      <span class="value-label" :title="val.display">{{ val.display }}</span>
                      <span class="value-count">({{ val.count }})</span>
                    </label>
                    <div v-if="getFilteredUniqueValues(column).length === 0" class="no-values">
                      无匹配值
                    </div>
                  </div>
                </div>
                
                <!-- 操作按钮 -->
                <div class="filter-dropdown-footer">
                  <button class="btn btn-sm" @click="clearColumnFilter(column)">清除</button>
                  <button class="btn btn-sm btn-primary" @click="applyColumnFilter(column)">确定</button>
                </div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in paginatedData" :key="getRowKey(row, rowIndex)">
            <td class="row-number">{{ (currentPage - 1) * pageSize + rowIndex + 1 }}</td>
            <td
              v-for="column in columns"
              :key="column"
              class="data-cell"
              :class="{ 'modified': isCellModified(rowIndex, column) }"
            >
              <div class="cell-content" @dblclick="startEdit(rowIndex, column)">
                <template v-if="editingCell?.row === rowIndex && editingCell?.column === column">
                  <input
                    ref="editInput"
                    v-model="editValue"
                    type="text"
                    class="cell-edit-input"
                    @blur="finishEdit"
                    @keyup.enter="finishEdit"
                    @keyup.escape="cancelEdit"
                  />
                </template>
                <template v-else>
                  <span class="cell-value" :title="getCellDisplayValue(row, column)">
                    {{ getCellDisplayValue(row, column) }}
                  </span>
                </template>
              </div>
            </td>
          </tr>
          <tr v-if="filteredData.length === 0">
            <td :colspan="columns.length + 1" class="empty-row">
              暂无数据
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <button class="btn btn-sm" @click="goToPage(1)" :disabled="currentPage === 1">
        首页
      </button>
      <button class="btn btn-sm" @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">
        上一页
      </button>
      <span class="page-info">
        第 {{ currentPage }} / {{ totalPages }} 页
      </span>
      <button class="btn btn-sm" @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">
        下一页
      </button>
      <button class="btn btn-sm" @click="goToPage(totalPages)" :disabled="currentPage === totalPages">
        末页
      </button>
      <select v-model.number="pageSize" class="page-size-select" @change="currentPage = 1">
        <option :value="20">20条/页</option>
        <option :value="50">50条/页</option>
        <option :value="100">100条/页</option>
        <option :value="200">200条/页</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, reactive } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['close', 'apply', 'download'])

// 编辑状态
const editingCell = ref(null)
const editValue = ref('')
const editInput = ref(null)
const modifications = ref(new Map())

// 筛选和排序状态
const searchText = ref('')
const sortColumn = ref(null)
const sortDirection = ref('asc')

// 列筛选状态 { column: { operator, value, selectedValues: Set } }
const columnFilters = reactive({})

// 下拉框状态
const activeDropdown = ref(null)
const valueSearchText = ref('')
const tempFilter = reactive({ operator: '', value: '' })
const tempSelectedValues = ref(new Set())

// 分页状态
const currentPage = ref(1)
const pageSize = ref(50)

// 表格容器引用
const tableContainer = ref(null)

// 提取所有列名
const columns = computed(() => {
  const columnSet = new Set()
  props.data.forEach(item => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach(key => columnSet.add(key))
    }
  })
  return Array.from(columnSet)
})

// 获取列的唯一值（用于值筛选）
const getColumnUniqueValues = (column) => {
  const valueMap = new Map()
  props.data.forEach(row => {
    const value = row[column]
    const display = getCellDisplayValue(row, column)
    const key = JSON.stringify(value)
    if (valueMap.has(key)) {
      valueMap.get(key).count++
    } else {
      valueMap.set(key, { value, display, count: 1, key })
    }
  })
  return Array.from(valueMap.values()).sort((a, b) => a.display.localeCompare(b.display))
}

// 获取筛选后的唯一值列表
const getFilteredUniqueValues = (column) => {
  const values = getColumnUniqueValues(column)
  if (!valueSearchText.value.trim()) return values
  const search = valueSearchText.value.toLowerCase()
  return values.filter(v => v.display.toLowerCase().includes(search))
}

// 计算活跃筛选数量
const activeFilterCount = computed(() => {
  let count = 0
  for (const col of columns.value) {
    if (hasColumnFilter(col)) count++
  }
  return count
})

// 检查列是否有筛选
const hasColumnFilter = (column) => {
  const filter = columnFilters[column]
  if (!filter) return false
  if (filter.operator && filter.value) return true
  if (filter.selectedValues && filter.selectedValues.size > 0) {
    const allValues = getColumnUniqueValues(column)
    return filter.selectedValues.size < allValues.length
  }
  return false
}

// 获取当前工作数据
const workingData = computed(() => {
  return props.data.map((row, index) => {
    const modified = { ...row }
    const rowModifications = modifications.value.get(index)
    if (rowModifications) {
      Object.assign(modified, rowModifications)
    }
    return modified
  })
})

// 筛选后的数据
const filteredData = computed(() => {
  let result = workingData.value

  // 全局搜索
  if (searchText.value.trim()) {
    const search = searchText.value.toLowerCase()
    result = result.filter(row => {
      return columns.value.some(col => {
        const value = getCellDisplayValue(row, col)
        return value.toLowerCase().includes(search)
      })
    })
  }

  // 列筛选
  columns.value.forEach(col => {
    const filter = columnFilters[col]
    if (!filter) return
    
    // 条件筛选
    if (filter.operator && filter.value !== undefined && filter.value !== '') {
      result = result.filter(row => {
        return matchCondition(row[col], filter.operator, filter.value)
      })
    }
    
    // 值筛选
    if (filter.selectedValues && filter.selectedValues.size > 0) {
      const allValues = getColumnUniqueValues(col)
      if (filter.selectedValues.size < allValues.length) {
        result = result.filter(row => {
          const key = JSON.stringify(row[col])
          return filter.selectedValues.has(key)
        })
      }
    }
  })

  // 排序
  if (sortColumn.value) {
    result = [...result].sort((a, b) => {
      const aVal = a[sortColumn.value]
      const bVal = b[sortColumn.value]
      
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
      }
      
      const aStr = String(aVal)
      const bStr = String(bVal)
      const compare = aStr.localeCompare(bStr)
      return sortDirection.value === 'asc' ? compare : -compare
    })
  }

  return result
})

// 匹配条件
const matchCondition = (cellValue, operator, filterValue) => {
  const displayValue = cellValue === null ? 'null'
    : cellValue === undefined ? ''
    : typeof cellValue === 'object' ? JSON.stringify(cellValue)
    : String(cellValue)
  
  const numCell = Number(cellValue)
  const numFilter = Number(filterValue)
  const isNumeric = !isNaN(numCell) && !isNaN(numFilter)
  
  switch (operator) {
    case 'contains':
      return displayValue.toLowerCase().includes(filterValue.toLowerCase())
    case 'not_contains':
      return !displayValue.toLowerCase().includes(filterValue.toLowerCase())
    case '=':
      return isNumeric ? numCell === numFilter : displayValue.toLowerCase() === filterValue.toLowerCase()
    case '!=':
      return isNumeric ? numCell !== numFilter : displayValue.toLowerCase() !== filterValue.toLowerCase()
    case '>':
      return isNumeric ? numCell > numFilter : displayValue > filterValue
    case '>=':
      return isNumeric ? numCell >= numFilter : displayValue >= filterValue
    case '<':
      return isNumeric ? numCell < numFilter : displayValue < filterValue
    case '<=':
      return isNumeric ? numCell <= numFilter : displayValue <= filterValue
    default:
      return true
  }
}

// 分页数据
const totalPages = computed(() => Math.max(1, Math.ceil(filteredData.value.length / pageSize.value)))

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

// 检查是否有修改
const hasChanges = computed(() => modifications.value.size > 0)

// 获取行的唯一键
const getRowKey = (row, index) => `row-${index}`

// 获取单元格显示值
const getCellDisplayValue = (row, column) => {
  const value = row[column]
  if (value === null) return 'null'
  if (value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// 获取列宽度
const getColumnWidth = (column) => {
  const maxLength = Math.max(
    column.length + 6,
    ...props.data.slice(0, 100).map(row => getCellDisplayValue(row, column).length)
  )
  return Math.min(Math.max(100, maxLength * 8), 300)
}

// 开始编辑
const startEdit = (rowIndex, column) => {
  const actualIndex = (currentPage.value - 1) * pageSize.value + rowIndex
  const row = workingData.value[actualIndex]
  editingCell.value = { row: rowIndex, column, actualIndex }
  editValue.value = getCellDisplayValue(row, column)
  nextTick(() => {
    if (editInput.value && editInput.value[0]) {
      editInput.value[0].focus()
      editInput.value[0].select()
    }
  })
}

// 完成编辑
const finishEdit = () => {
  if (!editingCell.value) return
  
  const { column, actualIndex } = editingCell.value
  const originalValue = props.data[actualIndex][column]
  const newValue = parseValue(editValue.value, originalValue)
  
  if (newValue !== originalValue) {
    if (!modifications.value.has(actualIndex)) {
      modifications.value.set(actualIndex, {})
    }
    modifications.value.get(actualIndex)[column] = newValue
  } else {
    if (modifications.value.has(actualIndex)) {
      delete modifications.value.get(actualIndex)[column]
      if (Object.keys(modifications.value.get(actualIndex)).length === 0) {
        modifications.value.delete(actualIndex)
      }
    }
  }
  
  editingCell.value = null
  editValue.value = ''
}

// 取消编辑
const cancelEdit = () => {
  editingCell.value = null
  editValue.value = ''
}

// 解析输入值
const parseValue = (input, originalValue) => {
  if (input === 'null') return null
  if (input === '') return ''
  if (input === 'true') return true
  if (input === 'false') return false
  
  if (typeof originalValue === 'number') {
    const num = Number(input)
    if (!isNaN(num)) return num
  }
  
  if (input.startsWith('{') || input.startsWith('[')) {
    try {
      return JSON.parse(input)
    } catch {
      return input
    }
  }
  
  return input
}

// 检查单元格是否被修改
const isCellModified = (rowIndex, column) => {
  const actualIndex = (currentPage.value - 1) * pageSize.value + rowIndex
  const rowMods = modifications.value.get(actualIndex)
  return rowMods && column in rowMods
}

// 排序相关
const toggleSort = (column) => {
  if (sortColumn.value === column) {
    if (sortDirection.value === 'asc') {
      sortDirection.value = 'desc'
    } else {
      sortColumn.value = null
      sortDirection.value = 'asc'
    }
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
  currentPage.value = 1
}

const getSortTitle = (column) => {
  if (sortColumn.value !== column) return '点击排序'
  return sortDirection.value === 'asc' ? '升序排列（点击降序）' : '降序排列（点击取消）'
}

// 筛选下拉框相关
const toggleFilterDropdown = (column, event) => {
  if (activeDropdown.value === column) {
    closeFilterDropdown()
  } else {
    openFilterDropdown(column)
  }
}

const openFilterDropdown = (column) => {
  activeDropdown.value = column
  valueSearchText.value = ''
  
  // 初始化临时筛选状态
  const filter = columnFilters[column]
  if (filter) {
    tempFilter.operator = filter.operator || ''
    tempFilter.value = filter.value || ''
    tempSelectedValues.value = new Set(filter.selectedValues || [])
  } else {
    tempFilter.operator = ''
    tempFilter.value = ''
    // 默认全选
    const allValues = getColumnUniqueValues(column)
    tempSelectedValues.value = new Set(allValues.map(v => v.key))
  }
}

const closeFilterDropdown = () => {
  activeDropdown.value = null
  valueSearchText.value = ''
}

const closeAllDropdowns = () => {
  if (activeDropdown.value) {
    closeFilterDropdown()
  }
}

// 值选择相关
const isValueSelected = (column, value) => {
  const key = JSON.stringify(value)
  return tempSelectedValues.value.has(key)
}

const toggleValueSelection = (column, value) => {
  const key = JSON.stringify(value)
  if (tempSelectedValues.value.has(key)) {
    tempSelectedValues.value.delete(key)
  } else {
    tempSelectedValues.value.add(key)
  }
}

const selectAllValues = (column) => {
  const allValues = getColumnUniqueValues(column)
  tempSelectedValues.value = new Set(allValues.map(v => v.key))
}

const deselectAllValues = (column) => {
  tempSelectedValues.value.clear()
}

// 应用列筛选
const applyColumnFilter = (column) => {
  columnFilters[column] = {
    operator: tempFilter.operator,
    value: tempFilter.value,
    selectedValues: new Set(tempSelectedValues.value)
  }
  currentPage.value = 1
  closeFilterDropdown()
}

// 清除列筛选
const clearColumnFilter = (column) => {
  delete columnFilters[column]
  tempFilter.operator = ''
  tempFilter.value = ''
  const allValues = getColumnUniqueValues(column)
  tempSelectedValues.value = new Set(allValues.map(v => v.key))
  currentPage.value = 1
  closeFilterDropdown()
}

// 重置筛选
const resetFilters = () => {
  searchText.value = ''
  columns.value.forEach(col => {
    delete columnFilters[col]
  })
  sortColumn.value = null
  sortDirection.value = 'asc'
  currentPage.value = 1
}

// 翻页
const goToPage = (page) => {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
}

// 应用修改
const applyChanges = () => {
  if (!hasChanges.value) return

  const newData = props.data.map((row, index) => {
    const rowMods = modifications.value.get(index)
    if (rowMods) {
      return { ...row, ...rowMods }
    }
    return row
  })

  emit('apply', newData)
  modifications.value.clear()
}

// 下载为 Excel
const downloadExcel = () => {
  emit('download')
}

// 重置分页
watch(filteredData, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = Math.max(1, totalPages.value)
  }
})
</script>

<style scoped>
.table-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  gap: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.filter-badge {
  color: var(--primary);
  font-weight: 500;
}

.search-box {
  position: relative;
}

.search-input {
  width: 200px;
  padding: 6px 28px 6px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.clear-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
}

.clear-btn:hover {
  color: var(--text-primary);
}

.table-container {
  flex: 1;
  overflow: auto;
  padding: 0;
  min-height: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
}

.row-number-header,
.row-number {
  width: 50px;
  text-align: center;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 12px;
}

.column-header {
  background: var(--bg-secondary);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.header-title {
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.header-btn {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.header-btn:hover {
  background: var(--bg-hover, rgba(0,0,0,0.05));
  color: var(--text-primary);
}

.header-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.sort-btn span {
  font-size: 12px;
}

.filter-btn span {
  font-size: 9px;
}

/* 筛选下拉框 */
.filter-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 280px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 100;
  margin-top: 4px;
}

.filter-dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  font-size: 13px;
}

.dropdown-close {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0 4px;
}

.dropdown-close:hover {
  color: var(--text-primary);
}

.filter-section {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.filter-section:last-of-type {
  border-bottom: none;
}

.filter-section-title {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.select-actions {
  display: flex;
  gap: 10px;
}

.select-actions a {
  color: var(--primary);
  cursor: pointer;
  font-size: 11px;
}

.select-actions a:hover {
  text-decoration: underline;
}

.condition-row {
  display: flex;
  gap: 8px;
}

.condition-select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.condition-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.condition-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.value-search {
  margin-bottom: 8px;
}

.value-search-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.value-list {
  max-height: 180px;
  overflow-y: auto;
}

.value-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  cursor: pointer;
  font-size: 12px;
}

.value-item:hover {
  background: var(--bg-secondary);
}

.value-item input[type="checkbox"] {
  flex-shrink: 0;
}

.value-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.value-count {
  color: var(--text-secondary);
  font-size: 11px;
  flex-shrink: 0;
}

.no-values {
  padding: 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
}

.filter-dropdown-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
  border-radius: 0 0 6px 6px;
}

/* 数据单元格 */
.data-cell {
  max-width: 300px;
  overflow: hidden;
}

.data-cell.modified {
  background: rgba(var(--primary-rgb, 59, 130, 246), 0.1);
}

.cell-content {
  display: flex;
  align-items: center;
  min-height: 24px;
}

.cell-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-edit-input {
  width: 100%;
  padding: 4px 6px;
  border: 2px solid var(--primary);
  border-radius: 3px;
  font-size: 13px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.cell-edit-input:focus {
  outline: none;
}

.empty-row {
  text-align: center;
  padding: 40px !important;
  color: var(--text-secondary);
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.page-info {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 0 12px;
}

.page-size-select {
  margin-left: 16px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--bg-primary);
  color: var(--text-primary);
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

.btn-success {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.btn-success:hover {
  background: #218838;
  border-color: #218838;
}
</style>
