<template>
  <div id="app">
    <!-- 比较模式 -->
    <JsonCompareView
      v-if="showCompareMode"
      ref="compareViewRef"
      @close="showCompareMode = false"
    />

    <!-- 表格视图模式 -->
    <TableView
      v-else-if="showTableMode"
      :data="tableData"
      @close="showTableMode = false"
      @apply="handleTableApply"
      @download="handleDownloadTableExcel"
    />

    <!-- 原有编辑模式 -->
    <template v-else>
      <ToolbarActions
        :has-content="!!currentJson"
        :show-query="showQueryPanel"
        :show-convert="showConvertPanel"
        :view-mode="currentViewMode"
        :can-undo="canUndo"
        :can-redo="canRedo"
        :needs-fix="needsFixJson"
        :can-open-table="canOpenTable"
        @format="handleFormat"
        @compress="handleCompress"
        @remove-comments="handleRemoveComments"
        @unescape="handleUnescape"
        @fix-json="handleFixJson"
        @save="handleSave"
        @toggle-history="showHistory = !showHistory"
        @toggle-query="showQueryPanel = !showQueryPanel"
        @toggle-convert="showConvertPanel = !showConvertPanel"
        @change-view="handleViewChange"
        @import-json="handleImportJson"
        @import-excel="handleImportExcel"
        @export-excel="handleExportExcel"
        @open-compare="handleOpenCompare"
        @undo="handleUndo"
        @redo="handleRedo"
      />

      <div class="main-content">
        <!-- 路径查询面板(独立出来,两种视图都可以使用) -->
        <div class="content-area">
          <PathQueryPanel
            v-if="showQueryPanel"
            @query-result="handleQueryResult"
            @query-error="handleQueryError"
            @query-clear="handleQueryClear"
          />
          <JsonConvertPanel
            v-if="showConvertPanel"
            @convert-result="handleConvertResult"
            @convert-error="handleConvertError"
            @convert-clear="handleConvertClear"
          />
          <JsonEditor
            v-if="viewMode === 'code'"
            v-model="currentJson"
            @validate="handleValidation"
            @extract-to-editor="handleEditorExtract"
            @extract-path="handleExtractPath"
          />
          <JsonTreeView
            v-else
            :data="parsedJson"
            @extract-path="handleExtractPath"
            @extract-to-editor="handleExtractToEditor"
          />
        </div>
        <QueryResultPanel
          v-if="hasQueryResult"
          :result="queryResult"
          :error="queryError"
          @close="handleCloseQueryResult"
          @extract="handleExtractQueryResult"
        />
        <ConvertResultPanel
          v-if="hasConvertResult"
          :result="convertResult"
          :error="convertError"
          :language="convertLanguage"
          @close="handleCloseConvertResult"
        />
      </div>

      <HistoryPanel
        v-if="showHistory"
        @close="showHistory = false"
        @load="handleLoadFromHistory"
        @compare="handleCompareFromHistory"
        @compare-with-current="handleCompareWithCurrent"
      />

      <SaveDialog
        :is-open="showSaveDialog"
        :default-name="defaultSaveName"
        @save="handleSaveConfirm"
        @cancel="handleSaveCancel"
      />

      <StatusBar
        :stats="stats"
        :validation-result="validationResult"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, provide, onMounted, onUnmounted, nextTick, reactive } from 'vue'
import ToolbarActions from './components/ToolbarActions.vue'
import JsonEditor from './components/JsonEditor.vue'
import JsonTreeView from './components/JsonTreeView.vue'
import PathQueryPanel from './components/PathQueryPanel.vue'
import QueryResultPanel from './components/QueryResultPanel.vue'
import JsonConvertPanel from './components/JsonConvertPanel.vue'
import ConvertResultPanel from './components/ConvertResultPanel.vue'
import HistoryPanel from './components/HistoryPanel.vue'
import StatusBar from './components/StatusBar.vue'
import SaveDialog from './components/SaveDialog.vue'
import JsonCompareView from './components/JsonCompareView.vue'
import TableView from './components/TableView.vue'
import { useJsonOperations } from './composables/useJsonOperations'
import { useJsonStorage } from './composables/useJsonStorage'
import { useClipboard } from './composables/useClipboard'
import { useHistory } from './composables/useHistory'
import { excelToJson, jsonToExcel, validateJsonArray, getExportExample } from './utils/excelConverter'
import { fixJson, needsFix as checkNeedsFix } from './utils/jsonFixer'

const {
  currentJson,
  parsedJson,
  validationResult,
  stats,
  format,
  compress,
  stripComments,
  unescape,
  validate
} = useJsonOperations()

const { saveDocument } = useJsonStorage()
const { copyToClipboard } = useClipboard()
const { canUndo, canRedo, pushHistory, undo, redo, initHistory, isUndoRedo } = useHistory()

const showHistory = ref(false)
const showSaveDialog = ref(false)
const showQueryPanel = ref(false)  // 默认隐藏查询面板
const showConvertPanel = ref(false)  // 默认隐藏转换面板
const viewMode = ref('code')  // 视图模式: 'code' 或 'tree'
const activeFeature = ref('')
const showCompareMode = ref(false)
const showTableMode = ref(false)
const tableData = ref([])
const compareViewRef = ref(null)

// 检测是否需要修复
const needsFixJson = computed(() => {
  if (!currentJson.value || !currentJson.value.trim()) return false
  return checkNeedsFix(currentJson.value)
})

// 检测是否可以打开表格视图（JSON必须是有效数组）
const canOpenTable = computed(() => {
  if (!currentJson.value || !currentJson.value.trim()) return false
  const validation = validateJsonArray(currentJson.value)
  return validation.valid
})

// 当前视图模式（统一 viewMode 和 showTableMode）
const currentViewMode = computed(() => {
  if (showTableMode.value) return 'table'
  return viewMode.value
})

// 树状视图展开状态
const expanded = reactive(new Map())
provide('expanded', expanded)

// 生成默认保存名称
const defaultSaveName = computed(() => {
  const now = new Date()
  return `JSON_${now.toLocaleString()}`
})

// 查询结果状态
const queryResult = ref(null)
const queryError = ref('')

// 转换结果状态
const convertResult = ref('')
const convertError = ref('')
const convertLanguage = ref('')

// 判断是否有查询结果或错误(用于控制右侧面板显示)
const hasQueryResult = computed(() => {
  return queryResult.value !== null || queryError.value !== ''
})

// 判断是否有转换结果或错误
const hasConvertResult = computed(() => {
  return convertResult.value !== '' || convertError.value !== ''
})

// Provide state for child components
provide('currentJson', currentJson)
provide('parsedJson', parsedJson)

// Handle plugin entry from uTools
onMounted(() => {
  // 添加全局快捷键监听
  document.addEventListener('keydown', handleKeydown)

  if (window.utools && window.utools.onPluginEnter) {
    window.utools.onPluginEnter(({ code, type, payload }) => {
      activeFeature.value = code

      // 比较模式入口
      if (code === 'json_compare') {
        showCompareMode.value = true
        // 如果有 payload,可以设置初始数据
        if (payload && type === 'regex') {
          nextTick(() => {
            if (compareViewRef.value) {
              compareViewRef.value.setInitialData(payload, '')
            }
          })
        }
        return
      }

      // 表格视图入口
      if (code === 'json_table') {
        if (payload && type === 'regex') {
          currentJson.value = payload
          initHistory(payload)
          // 自动格式化
          nextTick(() => {
            try {
              JSON.parse(payload)
              if (format()) {
                pushHistory(currentJson.value)
              }
              // 尝试打开表格视图
              handleOpenTable()
            } catch (error) {
              console.log('Input is not valid JSON')
            }
          })
        } else {
          // 如果当前有数据，尝试打开表格视图
          if (currentJson.value) {
            handleOpenTable()
          }
        }
        return
      }

      // 转换模式入口
      if (code === 'json_convert') {
        showConvertPanel.value = true
        // 如果有 payload,设置为当前JSON
        if (payload && type === 'regex') {
          currentJson.value = payload
          initHistory(payload)
          // 自动格式化
          nextTick(() => {
            try {
              JSON.parse(payload)
              if (format()) {
                pushHistory(currentJson.value)
              }
            } catch (error) {
              console.log('Input is not valid JSON')
            }
          })
        }
        return
      }

      // Handle text detection (regex or over type)
      if (type === 'regex' || type === 'over') {
        currentJson.value = payload
        // 初始化历史记录
        initHistory(payload)

        // Auto-format JSON if input is valid JSON string
        // Use nextTick to ensure the editor has updated
        nextTick(() => {
          try {
            // Try to parse and validate the input
            JSON.parse(payload)

            // If parsing succeeds, format the JSON
            if (format()) {
              pushHistory(currentJson.value)
            }
          } catch (error) {
            // If not valid JSON, just display as-is
            console.log('Input is not valid JSON, displaying as-is')
          }
        })
      }

      // Show history panel for json_history feature
      if (code === 'json_history') {
        showHistory.value = true
      }
    })

    // Listen for cloud sync events
    window.utools.onDbPull && window.utools.onDbPull(() => {
      console.log('Data synced from cloud')
    })
  } else {
    // Development mode - load sample JSON
    const sampleJson = JSON.stringify({
      name: "Sample JSON",
      version: "1.0.0",
      features: ["format", "compress", "query"],
      nested: {
        level1: {
          level2: {
            level3: "Deep nesting"
          }
        }
      }
    }, null, 2)
    currentJson.value = sampleJson
    // 初始化历史记录
    initHistory(sampleJson)
  }
})

// 快捷键处理
const handleKeydown = (event) => {
  // Ctrl+S 或 Cmd+S (Mac)
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    handleSave()
  }
  // Ctrl+Z 或 Cmd+Z (Mac) - 撤销
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    handleUndo()
  }
  // Ctrl+Y 或 Cmd+Shift+Z (Mac) - 重做
  if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
    event.preventDefault()
    handleRedo()
  }
}

// 撤销操作
const handleUndo = () => {
  const content = undo()
  if (content !== null) {
    currentJson.value = content
    validate()
  }
}

// 重做操作
const handleRedo = () => {
  const content = redo()
  if (content !== null) {
    currentJson.value = content
    validate()
  }
}

// 清理事件监听器
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Event handlers
const handleFormat = () => {
  const oldContent = currentJson.value
  if (format()) {
    pushHistory(oldContent)
    pushHistory(currentJson.value)
  }
}

const handleCompress = (escape) => {
  const oldContent = currentJson.value
  if (compress(escape)) {
    pushHistory(oldContent)
    pushHistory(currentJson.value)
    copyToClipboard(currentJson.value)
  }
}

const handleRemoveComments = () => {
  const oldContent = currentJson.value
  if (stripComments()) {
    pushHistory(oldContent)
    pushHistory(currentJson.value)
  }
}

const handleUnescape = () => {
  const oldContent = currentJson.value
  if (unescape()) {
    pushHistory(oldContent)
    // 去转义成功后，尝试自动格式化
    format()
    pushHistory(currentJson.value)
  }
}

// 美化修复提示信息
const getFixMessage = (result) => {
  const levelDescriptions = {
    1: '✓ JSON格式正确',
    2: '✓ 智能修复完成',
    3: '✓ JSON5格式修复完成',
    4: '✓ 深度修复完成',
    5: '✓ 高级修复完成',
    6: '✓ 激进修复完成'
  }

  const fixTypeMap = {
    'JSON格式正确，无需修复': '格式验证通过',
    'jsonrepair修复(专业修复库)': '自动修复格式错误',
    'JSON5修复(单引号/注释/尾随逗号/无引号键名)': '修复JSON5格式',
    '基础预处理': '预处理特殊格式',
    'jsonrepair修复': '智能修复',
    'JSON5解析': '兼容性解析',
    '深度预处理': '深度格式处理'
  }

  let message = levelDescriptions[result.level] || '✓ 修复完成'
  message += '\n\n'

  // 根据层级给出不同的说明
  if (result.level === 1) {
    message += '您的JSON格式正确，无需修复。'
  } else if (result.level === 2) {
    message += '已自动修复以下问题：\n'
    const issues = [
      '• 缺少或多余的引号',
      '• 逗号和冒号错误',
      '• 括号不匹配',
      '• 特殊字符处理'
    ]
    message += issues.join('\n')
  } else if (result.level === 3) {
    message += '已处理JSON5格式：\n'
    message += '• 单引号转双引号\n'
    message += '• 移除注释\n'
    message += '• 处理尾随逗号\n'
    message += '• 为键名添加引号'
  } else {
    message += '已应用高级修复策略：\n'
    const friendlyFixes = result.fixes.map(fix =>
      fixTypeMap[fix] || fix
    )
    message += friendlyFixes.map(fix => `• ${fix}`).join('\n')
  }

  message += '\n\n是否应用修复结果？'
  return message
}

// 处理JSON修复
const handleFixJson = () => {
  const oldContent = currentJson.value
  const result = fixJson(oldContent)

  if (result.success) {
    const message = getFixMessage(result)

    if (confirm(message)) {
      pushHistory(oldContent)
      currentJson.value = result.fixed
      // 尝试格式化
      format()
      pushHistory(currentJson.value)
      validate()
    }
  } else {
    // 修复失败，显示错误信息
    let message = '❌ 自动修复失败\n\n'
    message += '抱歉，无法自动修复您的JSON。\n\n'
    message += '可能的原因：\n'
    message += '• 格式严重错误\n'
    message += '• 包含不支持的语法\n'
    message += '• 数据结构不完整\n\n'
    message += '建议：请手动检查并修正格式问题。'
    alert(message)
  }
}

const handleSave = () => {
  if (!currentJson.value.trim()) return
  showSaveDialog.value = true
}

const handleSaveConfirm = (name) => {
  try {
    saveDocument(currentJson.value, name)
    showSaveDialog.value = false
  } catch (error) {
    console.error('Save error:', error)
    alert(`保存失败：${error.message}`)
  }
}

const handleSaveCancel = () => {
  showSaveDialog.value = false
}

const handleLoadFromHistory = (content) => {
  pushHistory(currentJson.value)
  currentJson.value = content
  pushHistory(content)
  validate()
}

const handleCompareFromHistory = ({ left, right }) => {
  showHistory.value = false
  showCompareMode.value = true
  nextTick(() => {
    if (compareViewRef.value) {
      compareViewRef.value.setInitialData(left, right)
    }
  })
}

const handleCompareWithCurrent = (historyContent) => {
  showHistory.value = false
  showCompareMode.value = true
  nextTick(() => {
    if (compareViewRef.value) {
      compareViewRef.value.setInitialData(currentJson.value, historyContent)
    }
  })
}

const handleOpenCompare = () => {
  showCompareMode.value = true
  nextTick(() => {
    if (compareViewRef.value) {
      // 将当前JSON设置为左侧内容,右侧为空
      compareViewRef.value.setInitialData(currentJson.value, '')
    }
  })
}

// 打开表格视图
const handleOpenTable = () => {
  try {
    // 验证当前 JSON 是否为数组格式
    const validation = validateJsonArray(currentJson.value)
    
    if (!validation.valid) {
      // 显示错误和示例
      const example = getExportExample()
      alert(`${validation.error}\n\n${example}`)
      return
    }
    
    tableData.value = validation.data
    showTableMode.value = true
  } catch (error) {
    alert(`无法打开表格视图: ${error.message}`)
  }
}

// 处理表格视图的数据修改
const handleTableApply = (newData) => {
  // 记录当前状态到历史
  pushHistory(currentJson.value)
  // 将修改后的数据格式化设置到编辑器
  const newContent = JSON.stringify(newData, null, 2)
  currentJson.value = newContent
  // 记录新状态到历史
  pushHistory(newContent)
  validate()
  // 关闭表格视图
  showTableMode.value = false
}

// 处理表格视图的 Excel 导出
const handleDownloadTableExcel = () => {
  try {
    // tableData 已经是数组格式，直接使用
    const buffer = jsonToExcel(tableData.value)

    // 生成默认文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const defaultName = `json_export_${timestamp}.xlsx`

    // 优先使用 uTools 的文件保存对话框
    if (window.utools && window.utools.showSaveDialog) {
      const filePath = window.utools.showSaveDialog({
        title: '导出到 Excel',
        defaultPath: defaultName,
        buttonLabel: '保存',
        filters: [
          { name: 'Excel 文件', extensions: ['xlsx'] }
        ]
      })

      if (!filePath) {
        // 用户取消保存
        return
      }

      // 使用 preload 提供的文件写入功能
      if (window.preloadUtils && window.preloadUtils.writeFile) {
        const success = window.preloadUtils.writeFile(filePath, buffer)

        if (!success) {
          alert('导出失败')
        }
        return
      }
    }

    // 浏览器环境下使用 Blob 和 download
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultName
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Excel 导出失败:', error)
    alert(`导出失败: ${error.message}`)
  }
}

const handleClear = () => {
  if (confirm('确定要清空当前的 JSON 吗?')) {
    currentJson.value = ''
    parsedJson.value = null
  }
}

const handleValidation = (result) => {
  if (result.valid) {
    parsedJson.value = result.data
  } else {
    parsedJson.value = null
  }
  validate()
}

// 处理查询结果
const handleQueryResult = (result) => {
  queryResult.value = result
  queryError.value = ''
}

const handleQueryError = (error) => {
  queryError.value = error
  queryResult.value = null
}

const handleQueryClear = () => {
  queryResult.value = null
  queryError.value = ''
}

const handleCloseQueryResult = () => {
  queryResult.value = null
  queryError.value = ''
}

// 处理转换结果
const handleConvertResult = ({ result, language }) => {
  convertResult.value = result
  convertError.value = ''
  convertLanguage.value = language
}

const handleConvertError = (error) => {
  convertError.value = error
  convertResult.value = ''
  convertLanguage.value = ''
}

const handleConvertClear = () => {
  convertResult.value = ''
  convertError.value = ''
  convertLanguage.value = ''
}

const handleCloseConvertResult = () => {
  convertResult.value = ''
  convertError.value = ''
  convertLanguage.value = ''
}

// 切换视图模式
const handleViewChange = (mode) => {
  if (mode === 'table') {
    handleOpenTable()
  } else {
    viewMode.value = mode
  }
}

const handleToggleView = () => {
  viewMode.value = viewMode.value === 'code' ? 'tree' : 'code'
}

// 处理从树节点提取路径
const handleExtractPath = (path) => {
  // 显示查询面板
  showQueryPanel.value = true

  // 等待下一帧,确保查询面板已渲染
  nextTick(() => {
    // 触发路径填充和执行(通过事件总线或其他方式)
    // 这里需要在 PathQueryPanel 中暴露一个方法来设置路径并执行
    // 暂时存储路径,让 PathQueryPanel 监听
    window.__extractedPath = path

    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('path-extracted', { detail: path }))
  })
}

// 处理从树节点提取到编辑器
const handleExtractToEditor = (data) => {
  // 记录当前状态到历史
  pushHistory(currentJson.value)
  // 将数据格式化后设置到编辑器
  const newContent = JSON.stringify(data, null, 2)
  currentJson.value = newContent
  // 记录新状态到历史
  pushHistory(newContent)
  validate()
  // 切换到代码视图
  viewMode.value = 'code'
}

// 处理从查询结果提取到编辑器
const handleExtractQueryResult = (resultText) => {
  // 记录当前状态到历史
  pushHistory(currentJson.value)
  currentJson.value = resultText
  // 记录新状态到历史
  pushHistory(resultText)
  validate()
  // 关闭查询结果面板
  handleCloseQueryResult()
  // 切换到代码视图
  viewMode.value = 'code'
}

// 处理从代码编辑器选中内容提取到编辑器
const handleEditorExtract = (content) => {
  // 记录当前状态到历史
  pushHistory(currentJson.value)
  currentJson.value = content
  // 记录新状态到历史
  pushHistory(content)
  validate()
}

// 处理Excel导入
const handleImportExcel = async () => {
  try {
    // 优先使用 uTools 的文件选择对话框
    if (window.utools && window.utools.showOpenDialog) {
      const files = window.utools.showOpenDialog({
        title: '从 Excel 导入',
        filters: [
          { name: 'Excel 文件', extensions: ['xlsx', 'xls'] }
        ],
        properties: ['openFile']
      })

      if (!files || files.length === 0) {
        // 用户取消选择
        return
      }

      const filePath = files[0]

      // ���用 preload 提供的文件读取功能
      if (window.preloadUtils && window.preloadUtils.readFile) {
        const buffer = window.preloadUtils.readFile(filePath, null)

        if (!buffer) {
          alert('读取文件失败')
          return
        }

        // 将 Excel 转换为 JSON
        const jsonArray = excelToJson(buffer)

        // 记录历史
        pushHistory(currentJson.value)
        // 格式化并设置到编辑器
        const newContent = JSON.stringify(jsonArray, null, 2)
        currentJson.value = newContent
        pushHistory(newContent)
        validate()

        return
      }
    }

    // 浏览器环境下使用 HTML5 File API
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'

    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      try {
        // 读取文件为 ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()

        // 将 Excel 转换为 JSON
        const jsonArray = excelToJson(arrayBuffer)

        // 记录历史
        pushHistory(currentJson.value)
        // 格式化并设置到编辑器
        const newContent = JSON.stringify(jsonArray, null, 2)
        currentJson.value = newContent
        pushHistory(newContent)
        validate()
      } catch (error) {
        console.error('Excel 导入失败:', error)
        alert(`导入失败: ${error.message}`)
      }
    }

    input.click()
  } catch (error) {
    console.error('Excel 导入失败:', error)
    alert(`导入失败: ${error.message}`)
  }
}

// 处理JSON/TXT文件导入
const handleImportJson = async () => {
  try {
    // 优先使用 uTools 的文件选择对话框
    if (window.utools && window.utools.showOpenDialog) {
      const files = window.utools.showOpenDialog({
        title: '导入 JSON',
        filters: [
          { name: 'JSON 文件', extensions: ['json'] },
          { name: '文本文件', extensions: ['txt'] }
        ],
        properties: ['openFile']
      })

      if (!files || files.length === 0) {
        // 用户取消选择
        return
      }

      const filePath = files[0]

      // 应用 preload 提供的文件读取功能
      if (window.preloadUtils && window.preloadUtils.readFile) {
        const content = window.preloadUtils.readFile(filePath, 'utf-8')

        if (content === null || content === undefined) {
          alert('读取文件失败')
          return
        }

        // 验证是否为有效的 JSON
        try {
          JSON.parse(content)
        } catch (error) {
          alert(`文件内容不是有效的 JSON 格式: ${error.message}`)
          return
        }

        // 记录历史
        pushHistory(currentJson.value)
        // 设置到编辑器
        currentJson.value = content
        // 自动格式化
        format()
        pushHistory(currentJson.value)
        validate()

        return
      }
    }

    // 浏览器环境下使用 HTML5 File API
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.txt'

    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      try {
        // 读取文件内容
        const content = await file.text()

        // 验证是否为有效的 JSON
        try {
          JSON.parse(content)
        } catch (error) {
          alert(`文件内容不是有效的 JSON 格式: ${error.message}`)
          return
        }

        // 记录历史
        pushHistory(currentJson.value)
        // 设置到编辑器
        currentJson.value = content
        // 自动格式化
        format()
        pushHistory(currentJson.value)
        validate()
      } catch (error) {
        console.error('JSON 导入失败:', error)
        alert(`导入失败: ${error.message}`)
      }
    }

    input.click()
  } catch (error) {
    console.error('JSON 导入失败:', error)
    alert(`导入失败: ${error.message}`)
  }
}

// 处理Excel导出
const handleExportExcel = () => {
  try {
    // 验证当前 JSON 是否为数组格式
    const validation = validateJsonArray(currentJson.value)

    if (!validation.valid) {
      // 显示错误和示例
      const example = getExportExample()
      alert(`${validation.error}\n\n${example}`)
      return
    }

    // 将 JSON 转换为 Excel Buffer
    const buffer = jsonToExcel(validation.data)

    // 生成默认文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const defaultName = `json_export_${timestamp}.xlsx`

    // 优先使用 uTools 的文件保存对话框
    if (window.utools && window.utools.showSaveDialog) {
      const filePath = window.utools.showSaveDialog({
        title: '导出到 Excel',
        defaultPath: defaultName,
        buttonLabel: '保存',
        filters: [
          { name: 'Excel 文件', extensions: ['xlsx'] }
        ]
      })

      if (!filePath) {
        // 用户取消保存
        return
      }

      // 使用 preload 提供的文件写入功能
      if (window.preloadUtils && window.preloadUtils.writeFile) {
        const success = window.preloadUtils.writeFile(filePath, buffer)

        if (!success) {
          alert('导出失败')
        }
        return
      }
    }

    // 浏览器环境下使用 Blob 和 download
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultName
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Excel 导出失败:', error)
    alert(`导出失败: ${error.message}`)
  }
}
</script>

<style>
@import './styles/main.css';

#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content > * {
  flex: 1;
}
</style>
