// JSON Table View Composable
// Enhanced table view functionality for uTools JSON plugin

import { ref, computed, watch } from 'vue'
import { detectTablePaths, flattenArrayForTable, updateJsonFromTable } from '../utils/jsonTableViewDetector'
import { tableViewRenderer } from '../utils/jsonTableViewRenderer'

export function useJsonTableView() {
  const jsonData = ref(null)
  const detectedTables = ref([])
  const selectedTable = ref(null)
  const tableOptions = ref({
    maxDepth: 3,
    minArrayLength: 3,
    maxArrayLength: 1000,
    detectNestedObjects: true,
    enableEdit: true,
    enableSort: true,
    enableFilter: true,
    virtualScroll: true,
    maxHeight: 500,
    rowSelection: false
  })
  
  const uiState = ref({
    isEditing: false,
    selectedCell: null,
    currentSort: null,
    currentFilter: null,
    editHistory: [],
    showTable: false,
    loading: false
  })

  // Computed properties
  const hasTables = computed(() => detectedTables.value.length > 0)
  const tableCount = computed(() => detectedTables.value.length)
  const currentTableData = computed(() => {
    if (!selectedTable.value) return null
    
    const array = this._getArrayByPath(selectedTable.value.path)
    if (!array) return null
    
    return flattenArrayForTable(array, selectedTable.value.columns)
  })

  // Methods
  const detectTables = () => {
    if (!jsonData.value) return
    
    try {
      uiState.value.loading = true
      detectedTables.value = detectTablePaths(jsonData.value, tableOptions.value)
      
      // Auto-select first table if available
      if (detectedTables.value.length > 0 && !selectedTable.value) {
        selectedTable.value = detectedTables.value[0]
        uiState.value.showTable = true
      }
    } catch (error) {
      console.error('Error detecting tables:', error)
    } finally {
      uiState.value.loading = false
    }
  }

  const selectTable = (tableId) => {
    const table = detectedTables.value.find(t => t.id === tableId)
    if (table) {
      selectedTable.value = table
      uiState.value.showTable = true
    }
  }

  const closeTableView = () => {
    selectedTable.value = null
    uiState.value.showTable = false
    uiState.value.isEditing = false
    uiState.value.selectedCell = null
  }

  const renderTable = () => {
    if (!selectedTable.value || !currentTableData.value) return null
    
    return tableViewRenderer.renderTable(
      currentTableData.value,
      selectedTable.value.columns,
      {
        ...tableOptions.value,
        rowSelection: uiState.value.rowSelection
      }
    )
  }

  const toggleEditMode = () => {
    uiState.value.isEditing = !uiState.value.isEditing
    return uiState.value.isEditing
  }

  const handleTableEvent = (event) => {
    const { detail } = event
    if (!detail) return

    switch (detail.type) {
      case 'cellEdited':
        handleCellEdit(detail.data)
        break
      case 'sorted':
        handleSort(detail.data)
        break
      case 'filtered':
        handleFilter(detail.data)
        break
      case 'editModeChanged':
        uiState.value.isEditing = detail.data.isEditing
        break
      case 'rowSelected':
        handleRowSelection(detail.data)
        break
    }
  }

  const handleCellEdit = ({ rowIndex, columnIndex, newValue }) => {
    if (!selectedTable.value) return
    
    const array = this._getArrayByPath(selectedTable.value.path)
    if (!array) return
    
    const column = selectedTable.value.columns[columnIndex]
    const item = array[rowIndex]
    
    if (item && column) {
      // Save to history
      addToHistory({
        type: 'cellEdit',
        path: selectedTable.value.path,
        rowIndex,
        columnKey: column.key,
        oldValue: item[column.key],
        newValue
      })
      
      // Update the data
      item[column.key] = newValue
      
      // Update the original JSON
      updateJsonFromTable(jsonData.value, selectedTable.value.path, array)
    }
  }

  const handleSort = ({ column, direction }) => {
    if (!selectedTable.value) return
    
    const array = this._getArrayByPath(selectedTable.value.path)
    if (!array) return
    
    // Save to history
    addToHistory({
      type: 'sort',
      path: selectedTable.value.path,
      column,
      direction,
      previousArray: [...array]
    })
    
    // Sort the array
    array.sort((a, b) => {
      const aVal = a[column]
      const bVal = b[column]
      
      if (aVal === undefined && bVal === undefined) return 0
      if (aVal === undefined) return 1
      if (bVal === undefined) return -1
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal
      }
      
      return 0
    })
    
    // Update original JSON
    updateJsonFromTable(jsonData.value, selectedTable.value.path, array)
  }

  const handleFilter = ({ column, value }) => {
    if (!selectedTable.value) return
    
    // This would implement filtering logic
    // For now, just update the current filter state
    uiState.value.currentFilter = { column, value }
  }

  const handleRowSelection = ({ rowIndex, isSelected }) => {
    // This would implement row selection logic
    // For now, just update the UI state
    console.log('Row selected:', rowIndex, isSelected)
  }

  const addToHistory = (change) => {
    uiState.value.editHistory.unshift(change)
    
    // Limit history size
    if (uiState.value.editHistory.length > 50) {
      uiState.value.editHistory = uiState.value.editHistory.slice(0, 50)
    }
  }

  const undoChange = () => {
    if (uiState.value.editHistory.length === 0) return
    
    const lastChange = uiState.value.editHistory.shift()
    
    switch (lastChange.type) {
      case 'cellEdit':
        undoCellEdit(lastChange)
        break
      case 'sort':
        undoSort(lastChange)
        break
      default:
        console.warn('Unknown change type:', lastChange.type)
    }
  }

  const undoCellEdit = (change) => {
    const array = this._getArrayByPath(change.path)
    if (!array) return
    
    const item = array[change.rowIndex]
    if (item && item[change.columnKey] !== undefined) {
      item[change.columnKey] = change.oldValue
      updateJsonFromTable(jsonData.value, change.path, array)
    }
  }

  const undoSort = (change) => {
    const array = this._getArrayByPath(change.path)
    if (!array) return
    
    // Restore previous array state
    array.splice(0, array.length, ...change.previousArray)
    updateJsonFromTable(jsonData.value, change.path, array)
  }

  const _getArrayByPath = (path) => {
    if (!jsonData.value || !path) return null
    
    const pathParts = path.split('.')
    let current = jsonData.value
    
    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return null
      }
    }
    
    return Array.isArray(current) ? current : null
  }

  const getTableStats = () => {
    if (!selectedTable.value) return null
    
    return {
      ...selectedTable.value,
      stats: {
        totalRows: selectedTable.value.totalRows,
        columns: selectedTable.value.columns.length,
        estimatedSize: JSON.stringify(selectedTable.value.sampleItems[0]).length * selectedTable.value.totalRows / 1024 / 1024
      }
    }
  }

  // Watch for JSON data changes
  watch(jsonData, (newData) => {
    if (newData) {
      detectTables()
    }
  }, { deep: true })

  return {
    // State
    jsonData,
    detectedTables,
    selectedTable,
    tableOptions,
    uiState,
    currentTableData,
    
    // Computed
    hasTables,
    tableCount,
    
    // Methods
    detectTables,
    selectTable,
    closeTableView,
    renderTable,
    toggleEditMode,
    handleTableEvent,
    undoChange,
    getTableStats,
    
    // Actions
    updateTableOptions: (options) => {
      tableOptions.value = { ...tableOptions.value, ...options }
      if (jsonData.value) detectTables()
    }
  }
}
