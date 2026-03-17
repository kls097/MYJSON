<template>
  <div class="json-editor">
    <div ref="editorRef" class="editor-container" @contextmenu="handleContextMenu"></div>
    
    <!-- 右键菜单 -->
    <div 
      v-if="showContextMenu" 
      class="context-menu"
      :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"
    >
      <button 
        class="context-menu-item" 
        @click="extractPath"
        :disabled="!canExtractPath"
      >
        提取Path {{ currentPath ? `(${currentPath})` : '' }}
      </button>
      <button 
        class="context-menu-item" 
        @click="extractPathContent"
        :disabled="!canExtractPath"
      >
        提取Path内容到编辑器
      </button>
      <button 
        class="context-menu-item" 
        @click="extractSelection"
        :disabled="!hasSelection"
      >
        提取选中内容
      </button>
      <button 
        class="context-menu-item" 
        @click="copySelection"
      >
        复制
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { json } from '@codemirror/lang-json'
import { lintGutter, linter } from '@codemirror/lint'
import { search, searchKeymap, SearchQuery, getSearchQuery, setSearchQuery, findNext, findPrevious, closeSearchPanel, openSearchPanel, replaceNext, replaceAll } from '@codemirror/search'
import { keymap } from '@codemirror/view'
import { useClipboard } from '../composables/useClipboard'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'validate', 'extract-to-editor', 'extract-path'])

const editorRef = ref(null)
let editorView = null

// 标记是否为程序化更新（防止循环触发）
let isProgrammaticUpdate = false

// 右键菜单状态
const showContextMenu = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })
const hasSelection = ref(false)
const selectedText = ref('')
const currentPath = ref('')
const canExtractPath = ref(false)

const { copyToClipboard } = useClipboard()

// 创建带计数功能的自定义搜索面板
function createSearchPanel(view) {
  const dom = document.createElement('div')
  dom.className = 'cm-search-panel'

  // 搜索行
  const searchRow = document.createElement('div')
  searchRow.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;'

  const searchField = document.createElement('input')
  searchField.className = 'cm-search-field'
  searchField.placeholder = '搜索...'
  searchField.type = 'text'
  searchField.style.cssText = 'flex: 0 1 180px; min-width: 100px; padding: 4px 8px; border: 1px solid var(--border, #ccc); border-radius: 4px; background: var(--bg-primary, #fff); color: var(--text-primary, #333); font-size: 13px; font-family: inherit; outline: none;'

  const countDisplay = document.createElement('span')
  countDisplay.className = 'cm-search-count'
  countDisplay.style.cssText = 'font-size: 12px; color: var(--text-secondary, #666); white-space: nowrap; min-width: 50px; text-align: center; padding: 2px 6px;'
  countDisplay.textContent = ''

  const prevBtn = document.createElement('button')
  prevBtn.className = 'cm-search-btn'
  prevBtn.textContent = '▲'
  prevBtn.title = '上一个 (Shift+Enter)'
  prevBtn.type = 'button'
  prevBtn.style.cssText = 'padding: 4px 8px; border: none; border-radius: 4px; background: var(--bg-secondary, #f0f0f0); color: var(--text-primary, #333); cursor: pointer; font-size: 12px;'

  const nextBtn = document.createElement('button')
  nextBtn.className = 'cm-search-btn'
  nextBtn.textContent = '▼'
  nextBtn.title = '下一个 (Enter)'
  nextBtn.type = 'button'
  nextBtn.style.cssText = 'padding: 4px 8px; border: none; border-radius: 4px; background: var(--bg-secondary, #f0f0f0); color: var(--text-primary, #333); cursor: pointer; font-size: 12px;'

  const caseBtn = document.createElement('button')
  caseBtn.className = 'cm-search-btn cm-search-toggle'
  caseBtn.textContent = 'Aa'
  caseBtn.title = '区分大小写'
  caseBtn.type = 'button'
  caseBtn.style.cssText = 'padding: 4px 8px; border: none; border-radius: 4px; background: var(--bg-secondary, #f0f0f0); color: var(--text-primary, #333); cursor: pointer; font-size: 12px; font-weight: bold;'

  const reBtn = document.createElement('button')
  reBtn.className = 'cm-search-btn cm-search-toggle'
  reBtn.textContent = '.*'
  reBtn.title = '正则表达式'
  reBtn.type = 'button'
  reBtn.style.cssText = 'padding: 4px 8px; border: none; border-radius: 4px; background: var(--bg-secondary, #f0f0f0); color: var(--text-primary, #333); cursor: pointer; font-size: 12px;'

  const closeBtn = document.createElement('button')
  closeBtn.className = 'cm-search-btn cm-search-close'
  closeBtn.textContent = '✕'
  closeBtn.title = '关闭 (Escape)'
  closeBtn.type = 'button'
  closeBtn.style.cssText = 'padding: 4px 8px; border: none; border-radius: 4px; background: var(--bg-secondary, #f0f0f0); color: var(--text-primary, #333); cursor: pointer; font-size: 12px;'

  searchRow.appendChild(searchField)
  searchRow.appendChild(countDisplay)
  searchRow.appendChild(prevBtn)
  searchRow.appendChild(nextBtn)
  searchRow.appendChild(caseBtn)
  searchRow.appendChild(reBtn)
  searchRow.appendChild(closeBtn)

  // 替换行
  const replaceRow = document.createElement('div')
  replaceRow.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;'

  const replaceField = document.createElement('input')
  replaceField.className = 'cm-replace-field'
  replaceField.placeholder = '替换为...'
  replaceField.type = 'text'
  replaceField.style.cssText = 'flex: 0 1 180px; min-width: 100px; padding: 4px 8px; border: 1px solid var(--border, #ccc); border-radius: 4px; background: var(--bg-primary, #fff); color: var(--text-primary, #333); font-size: 13px; font-family: inherit; outline: none;'

  const replaceBtn = document.createElement('button')
  replaceBtn.className = 'cm-replace-btn'
  replaceBtn.textContent = '替换'
  replaceBtn.title = '替换当前 (Ctrl+Shift+1)'
  replaceBtn.type = 'button'
  replaceBtn.style.cssText = 'padding: 4px 12px; border: none; border-radius: 4px; background: var(--primary, #4a9eff); color: #fff; cursor: pointer; font-size: 12px;'

  const replaceAllBtn = document.createElement('button')
  replaceAllBtn.className = 'cm-replace-btn'
  replaceAllBtn.textContent = '全部替换'
  replaceAllBtn.title = '全部替换 (Ctrl+Shift+2)'
  replaceAllBtn.type = 'button'
  replaceAllBtn.style.cssText = 'padding: 4px 12px; border: none; border-radius: 4px; background: var(--primary, #4a9eff); color: #fff; cursor: pointer; font-size: 12px;'

  replaceRow.appendChild(replaceField)
  replaceRow.appendChild(replaceBtn)
  replaceRow.appendChild(replaceAllBtn)

  dom.appendChild(searchRow)
  dom.appendChild(replaceRow)

  let caseSensitive = false
  let regexp = false
  let currentMatchIndex = 0

  function countMatches() {
    try {
      const query = getSearchQuery(view.state)
      if (!query || !query.valid || !query.search) {
        return { count: 0, currentIdx: 0 }
      }
      let count = 0
      let currentIdx = 0
      const cursor = query.getCursor(view.state.doc)
      const sel = view.state.selection.main
      while (!cursor.next().done) {
        count++
        if (cursor.value.from <= sel.from && cursor.value.to >= sel.from) {
          currentIdx = count
        }
      }
      return { count, currentIdx }
    } catch (e) {
      return { count: 0, currentIdx: 0 }
    }
  }

  function updateCount() {
    const { count, currentIdx } = countMatches()
    if (count === 0) {
      countDisplay.textContent = searchField.value ? '无匹配' : ''
      countDisplay.style.color = '#e74c3c'
    } else if (currentIdx > 0) {
      countDisplay.textContent = `${currentIdx} / ${count}`
      countDisplay.style.color = 'var(--primary, #4a9eff)'
    } else {
      countDisplay.textContent = `${count} 个`
      countDisplay.style.color = 'var(--text-secondary, #666)'
    }
  }

  function commit() {
    try {
      const query = new SearchQuery({
        search: searchField.value,
        caseSensitive,
        regexp
      })
      view.dispatch({ effects: setSearchQuery.of(query) })
      updateCount()
    } catch (e) {
      console.error('commit error:', e)
    }
  }

  searchField.addEventListener('input', commit)
  searchField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        findPrevious(view)
      } else {
        findNext(view)
      }
      updateCount()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeSearchPanel(view)
      view.focus()
    }
  })

  prevBtn.addEventListener('click', () => {
    findPrevious(view)
    updateCount()
  })
  nextBtn.addEventListener('click', () => {
    findNext(view)
    updateCount()
  })

  caseBtn.addEventListener('click', () => {
    caseSensitive = !caseSensitive
    caseBtn.classList.toggle('active', caseSensitive)
    caseBtn.style.background = caseSensitive ? 'var(--primary, #4a9eff)' : 'var(--bg-secondary, #f0f0f0)'
    caseBtn.style.color = caseSensitive ? '#fff' : 'var(--text-primary, #333)'
    commit()
  })
  reBtn.addEventListener('click', () => {
    regexp = !regexp
    reBtn.classList.toggle('active', regexp)
    reBtn.style.background = regexp ? 'var(--primary, #4a9eff)' : 'var(--bg-secondary, #f0f0f0)'
    reBtn.style.color = regexp ? '#fff' : 'var(--text-primary, #333)'
    commit()
  })

  closeBtn.addEventListener('click', () => {
    closeSearchPanel(view)
    view.focus()
  })

  // 替换功能
  replaceBtn.addEventListener('click', () => {
    if (!searchField.value) return
    replaceNext(view, replaceField.value)
    updateCount()
  })

  replaceAllBtn.addEventListener('click', () => {
    if (!searchField.value) return
    replaceAll(view, replaceField.value)
    updateCount()
  })

  replaceField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      replaceNext(view, replaceField.value)
      updateCount()
    }
  })

  return {
    dom,
    top: true,
    mount() {
      setTimeout(() => searchField.focus(), 0)
    },
    update(update) {
      if (update.docChanged || update.selectionSet) {
        setTimeout(updateCount, 0)
      }
    }
  }
}

// 根据光标位置计算 JSON 路径
const getJsonPathAtPosition = (content, position) => {
  if (!content.trim()) return null

  try {
    // 解析 JSON 来验证其有效性
    JSON.parse(content)
  } catch {
    return null
  }

  // 计算路径的核心逻辑
  const path = ['$']
  let depth = 0
  let inString = false
  let escapeNext = false
  let currentKey = ''
  let keyStart = -1
  let isCollectingKey = false
  const contextStack = [] // 保存每层的上下文类型: 'object' | 'array'
  const keyStack = [] // 保存当前路径的各层 key
  let arrayIndex = 0
  const arrayIndexStack = [] // 保存每层数组的当前索引
  const openBracePositions = [] // 记录每个 [ 或 { 的位置

  for (let i = 0; i < position && i < content.length; i++) {
    const char = content[i]

    if (escapeNext) {
      escapeNext = false
      if (isCollectingKey) currentKey += char
      continue
    }

    if (char === '\\' && inString) {
      escapeNext = true
      if (isCollectingKey) currentKey += char
      continue
    }

    if (char === '"') {
      if (!inString) {
        inString = true
        // 检查是否是对象的 key（不是值）
        const afterColon = content.slice(0, i).trimEnd()
        const lastNonSpace = afterColon[afterColon.length - 1]
        const isAfterColon = lastNonSpace === ':'
        const isAfterCommaOrBrace = lastNonSpace === ',' || lastNonSpace === '{' || lastNonSpace === '['

        if (contextStack[contextStack.length - 1] === 'object' && !isAfterColon) {
          isCollectingKey = true
          currentKey = ''
          keyStart = i
        }
      } else {
        inString = false
        if (isCollectingKey) {
          isCollectingKey = false
          // 检查这个 key 后面是否跟着冒号
          const remaining = content.slice(i + 1).trimStart()
          if (remaining[0] === ':') {
            keyStack[contextStack.length - 1] = currentKey
          }
        }
      }
      continue
    }

    if (inString) {
      if (isCollectingKey) currentKey += char
      continue
    }

    if (char === '{') {
      contextStack.push('object')
      keyStack.push('')
      arrayIndexStack.push(-1)
      openBracePositions.push(i)
    } else if (char === '[') {
      contextStack.push('array')
      keyStack.push('')
      arrayIndexStack.push(0)
      openBracePositions.push(i)
    } else if (char === '}' || char === ']') {
      contextStack.pop()
      keyStack.pop()
      arrayIndexStack.pop()
      openBracePositions.pop()
    } else if (char === ',') {
      // 在数组中，逗号意味着下一个元素
      if (contextStack[contextStack.length - 1] === 'array') {
        arrayIndexStack[arrayIndexStack.length - 1]++
      }
    }
  }

  // 构建路径
  const resultPath = ['$']
  for (let i = 0; i < contextStack.length; i++) {
    if (contextStack[i] === 'object' && keyStack[i]) {
      const key = keyStack[i]
      // 检查 key 是否需要括号表示法（包含特殊字符）
      const needsBracket = /[.\@\[\]\(\)'"$\*,:\s]/.test(key)
      if (needsBracket) {
        // 转义 key 中的反斜杠和单引号
        const escapedKey = key.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
        resultPath.push(`['${escapedKey}']`)
      } else {
        resultPath.push(`.${key}`)
      }
    } else if (contextStack[i] === 'array') {
      // 检查光标是否在数组开始行（[ 之后、第一个元素之前）
      const openBracePos = openBracePositions[i]
      const contentBeforeCursor = content.slice(openBracePos + 1, position)

      // 如果从 [ 到光标位置之间只有空白字符，说明光标在数组开始行
      // 此时应该返回数组本身，而不是第一个元素
      const isArrayStartLine = /^\s*$/.test(contentBeforeCursor)

      if (!isArrayStartLine) {
        // 光标已经进入某个元素，添加索引
        resultPath.push(`[${arrayIndexStack[i]}]`)
      }
      // 如果是数组开始行，不添加索引，保持数组路径
    }
  }

  return resultPath.join('')
}

// 处理右键菜单
const handleContextMenu = (event) => {
  event.preventDefault()
  
  // 获取选中的文本
  if (editorView) {
    const { from, to } = editorView.state.selection.main
    if (from !== to) {
      selectedText.value = editorView.state.sliceDoc(from, to)
      hasSelection.value = true
    } else {
      selectedText.value = ''
      hasSelection.value = false
    }
    
    // 计算当前光标位置的 JSON 路径
    const content = editorView.state.doc.toString()
    const cursorPos = editorView.state.selection.main.head
    const path = getJsonPathAtPosition(content, cursorPos)
    currentPath.value = path || ''
    canExtractPath.value = !!path && path !== '$'
  }
  
  // 显示右键菜单
  contextMenuPos.value = { x: event.clientX, y: event.clientY }
  showContextMenu.value = true
}

// 提取选中内容到编辑器
const extractSelection = () => {
  if (selectedText.value) {
    // 尝试解析并格式化
    try {
      const parsed = JSON.parse(selectedText.value)
      const formatted = JSON.stringify(parsed, null, 2)
      emit('extract-to-editor', formatted)
    } catch {
      // 如果不是有效JSON，直接使用原文本
      emit('extract-to-editor', selectedText.value)
    }
  }
  showContextMenu.value = false
}

// 复制（选中内容或全部内容）
const copySelection = () => {
  if (selectedText.value) {
    copyToClipboard(selectedText.value)
  } else if (editorView) {
    // 没有选中内容时，复制全部
    const content = editorView.state.doc.toString()
    copyToClipboard(content)
  }
  showContextMenu.value = false
}

// 提取路径到查询面板
const extractPath = () => {
  if (currentPath.value) {
    emit('extract-path', currentPath.value)
  }
  showContextMenu.value = false
}

// 根据路径获取JSON中的值
const getValueByPath = (obj, path) => {
  if (!path || path === '$') return obj
  
  // 移除开头的 $
  let normalizedPath = path.startsWith('$.') ? path.slice(2) : path.startsWith('$') ? path.slice(1) : path
  
  // 解析路径
  const parts = []
  let current = ''
  let inBracket = false
  
  for (let i = 0; i < normalizedPath.length; i++) {
    const char = normalizedPath[i]
    if (char === '[') {
      if (current) {
        parts.push(current)
        current = ''
      }
      inBracket = true
    } else if (char === ']') {
      if (current) {
        parts.push(parseInt(current, 10))
        current = ''
      }
      inBracket = false
    } else if (char === '.' && !inBracket) {
      if (current) {
        parts.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }
  if (current) {
    parts.push(current)
  }
  
  // 遍历路径获取值
  let result = obj
  for (const part of parts) {
    if (result === null || result === undefined) return undefined
    result = result[part]
  }
  
  return result
}

// 提取Path内容到编辑器
const extractPathContent = () => {
  if (currentPath.value && editorView) {
    try {
      const content = editorView.state.doc.toString()
      const parsed = JSON.parse(content)
      const value = getValueByPath(parsed, currentPath.value)
      
      if (value !== undefined) {
        const formatted = JSON.stringify(value, null, 2)
        emit('extract-to-editor', formatted)
      }
    } catch (e) {
      console.error('Failed to extract path content:', e)
    }
  }
  showContextMenu.value = false
}

// 点击其他地方关闭右键菜单
const closeContextMenu = () => {
  if (showContextMenu.value) {
    showContextMenu.value = false
  }
}

// JSON linter for error detection
const jsonLinter = linter(view => {
  const diagnostics = []
  const content = view.state.doc.toString()

  if (!content.trim()) return diagnostics

  try {
    JSON.parse(content)
  } catch (error) {
    // Try to extract position from error message
    const match = error.message.match(/position (\d+)/)
    const pos = match ? parseInt(match[1]) : 0

    diagnostics.push({
      from: Math.max(0, pos - 1),
      to: Math.min(content.length, pos + 1),
      severity: 'error',
      message: error.message
    })
  }

  return diagnostics
})

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
  
  editorView = new EditorView({
    doc: props.modelValue,
    extensions: [
      basicSetup,
      json(),
      lintGutter(),
      jsonLinter,
      search({ top: true, createPanel: createSearchPanel }),
      keymap.of(searchKeymap),  // 添加搜索快捷键支持 (Cmd+F on macOS, Ctrl+F on Windows)
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          const content = update.state.doc.toString()
          // 如果是程序化更新，不触发 emit，避免循环
          if (!isProgrammaticUpdate) {
            emit('update:modelValue', content)
          }
          validateJson(content)
          // 重置标志
          isProgrammaticUpdate = false
        }
      }),
      // 添加粘贴事件处理
      EditorView.domEventHandlers({
        paste: (event, view) => {
          // 获取粘贴的文本
          const text = event.clipboardData?.getData('text/plain')
          if (!text) return false

          // 尝试解析为 JSON 并自动格式化
          try {
            const parsed = JSON.parse(text)
            // 格式化 JSON
            const formatted = JSON.stringify(parsed, null, 2)

            // 如果格式化后的内容与原内容不同，则使用格式化后的内容
            if (formatted !== text) {
              // 阻止默认粘贴,插入格式化后的内容
              event.preventDefault()

              const { from, to } = view.state.selection.main
              view.dispatch({
                changes: { from, to, insert: formatted }
              })

              return true
            }
          } catch {
            // 不是有效的 JSON,使用默认粘贴行为
          }

          return false
        }
      })
    ],
    parent: editorRef.value
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeContextMenu)
  if (editorView) {
    editorView.destroy()
  }
})

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (editorView && editorView.state.doc.toString() !== newValue) {
    // 标记为程序化更新，防止触发 emit 循环
    isProgrammaticUpdate = true
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: newValue
      }
    })
  }
})

const validateJson = (content) => {
  if (!content.trim()) {
    emit('validate', { valid: true, data: null })
    return
  }

  try {
    const parsed = JSON.parse(content)
    emit('validate', { valid: true, data: parsed })
  } catch (error) {
    emit('validate', { valid: false, error: error.message })
  }
}

// 暴露方法给父组件
defineExpose({
  openSearch: () => {
    if (editorView) {
      openSearchPanel(editorView)
    }
  }
})
</script>

<style scoped>
.json-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--border);
}

.editor-container {
  flex: 1;
  overflow: auto;
}

.editor-container :deep(.cm-editor) {
  height: 100%;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
}

.editor-container :deep(.cm-scroller) {
  overflow: auto;
}

.editor-container :deep(.cm-content) {
  padding: 12px 0;
}

.editor-container :deep(.cm-line) {
  padding: 0 16px;
}

.editor-container :deep(.cm-gutters) {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
}

.editor-container :deep(.cm-lint-mark-error) {
  text-decoration: wavy underline red;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 4px 0;
  min-width: 180px;
}

.context-menu-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: background-color 0.2s;
}

.context-menu-item:hover:not(:disabled) {
  background: var(--bg-secondary);
}

.context-menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 自定义搜索面板样式 */
.editor-container :deep(.cm-search-panel) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border, #ddd);
  font-size: 13px;
  flex-wrap: nowrap;
}

.editor-container :deep(.cm-search-field) {
  flex: 0 1 240px;
  min-width: 120px;
  padding: 4px 8px;
  border: 1px solid var(--border, #ccc);
  border-radius: 4px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #333);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.editor-container :deep(.cm-search-field:focus) {
  border-color: var(--accent-color, #4a9eff);
}

.editor-container :deep(.cm-search-count) {
  font-size: 12px;
  color: var(--text-secondary, #666);
  white-space: nowrap;
  min-width: 70px;
  text-align: center;
}

.editor-container :deep(.cm-search-count.no-match) {
  color: #e74c3c;
}

.editor-container :deep(.cm-search-btn) {
  padding: 3px 8px;
  border: 1px solid var(--border, #ccc);
  border-radius: 4px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #333);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  transition: background-color 0.2s;
}

.editor-container :deep(.cm-search-btn:hover) {
  background: var(--bg-hover, #e8e8e8);
}

.editor-container :deep(.cm-search-toggle.active) {
  background: var(--accent-color, #4a9eff);
  color: #fff;
  border-color: var(--accent-color, #4a9eff);
}

.editor-container :deep(.cm-search-close) {
  margin-left: auto;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-secondary, #999);
}

.editor-container :deep(.cm-search-close:hover) {
  color: var(--text-primary, #333);
  background: transparent;
}

/* 隐藏 CodeMirror 默认搜索面板样式（如果有残留） */
.editor-container :deep(.cm-panel.cm-search) {
  padding: 0;
  background: none;
  border: none;
}
</style>
