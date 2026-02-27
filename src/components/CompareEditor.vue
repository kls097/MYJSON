<template>
  <div class="compare-editor">
    <div class="editor-header">
      <span class="editor-label">{{ title }}</span>
    </div>
    <div class="editor-container">
      <div ref="editorContainer"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import { Decoration } from '@codemirror/view'

const props = defineProps({
  modelValue: String,
  default: () => '',
  title: String,
  side: String,
  displayContent: String,
  lineTypes: Array,
  diffs: Array,
  currentDiffIndex: Number,
  scrollTop: Number,
  scrollLeft: Number
})

const emit = defineEmits(['update:modelValue', 'userEditComplete'])

const editorContainer = ref(null)
let editorView = null
let scrollerElement = null
let scrollTimeout = null
let isUserEditing = false // 跟踪用户是否正在编辑
let isProgrammaticUpdate = false // 跟踪是否是程序更新（非用户编辑）

// 当前装饰集的响应式引用
const currentDecorations = ref(Decoration.none)

// 定义 StateEffect 用于更新装饰器
const setDecorationsEffect = StateEffect.define()

// 定义 StateField 来管理装饰器
const decorationField = StateField.define({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    // 检查是否有 setDecorationsEffect
    for (let effect of tr.effects) {
      if (effect.is(setDecorationsEffect)) {
        return effect.value
      }
    }
    // 如果文档变化，需要映射装饰器位置
    return decorations.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f)
})

// 从对齐内容提取原始JSON（去掉占位符行）
const extractOriginalJson = () => {
  // 检查编辑器的实际内容
  const editorContent = editorView ? editorView.state.doc.toString() : ''

  // 如果没有 lineTypes，直接返回编辑器内容
  if (!props.lineTypes || props.lineTypes.length === 0) {
    return editorContent
  }

  // 使用对齐后的内容（displayContent）
  const alignedContent = props.displayContent || ''

  // 如果编辑器内容与对齐内容不同，说明用户编辑了
  if (editorContent !== alignedContent) {
    const editorLines = editorContent.split('\n')
    // 如果行数与 lineTypes 匹配，按类型过滤占位符行
    // 但首先检测是否是全量替换（粘贴操作）：
    // 如果内容与上次的 displayContent 差异巨大，说明用户粘贴了全新内容
    if (editorLines.length === props.lineTypes.length) {
      // 检查内容是否与 alignedContent 相似度很低（全量替换检测）
      // 如果编辑器内容长度变化超过 80%，视为全量替换
      const lenDiff = Math.abs(editorContent.length - alignedContent.length)
      const maxLen = Math.max(editorContent.length, alignedContent.length, 1)
      if (lenDiff / maxLen > 0.8) {
        return editorContent
      }
      const filtered = []
      for (let i = 0; i < editorLines.length; i++) {
        const type = props.lineTypes[i]
        const isPlaceholder =
          (type === 'added' && props.side === 'left') ||
          (type === 'removed' && props.side === 'right')
        if (!isPlaceholder) {
          filtered.push(editorLines[i])
        }
      }
      return filtered.join('\n')
    }
    // 行数不匹配时回退到直接返回
    return editorContent
  }

  // 检查是否全部都是 equal 类型
  const allEqual = props.lineTypes.every(type => type === 'equal')
  if (allEqual) {
    // 如果全部相同，直接返回编辑器内容
    return editorContent
  }

  // 分离成行
  const lines = alignedContent.split('\n')

  // 检查是否全是占位符行（全删除或全添加）
  const allPlaceholder = lines.every((line, i) => {
    const type = props.lineTypes[i]
    if (type === 'removed') {
      return props.side === 'left' ? line.trim() === '' : false
    } else if (type === 'added') {
      return props.side === 'right' ? line.trim() === '' : false
    } else {
      return false
    }
  })

  // 如果全是占位符行，说明这一侧为空
  if (allPlaceholder) {
    return ''
  }

  // 否则按类型提取
  const originalLines = []
  for (let i = 0; i < lines.length; i++) {
    const type = props.lineTypes[i]
    const line = lines[i]

    if (type === 'equal') {
      originalLines.push(line)
    } else if (type === 'removed') {
      if (props.side === 'left' && line.trim() !== '') {
        originalLines.push(line)
      }
    } else if (type === 'added') {
      if (props.side === 'right' && line.trim() !== '') {
        originalLines.push(line)
      }
    } else {
      originalLines.push(line)
    }
  }

  return originalLines.length > 0 ? originalLines.join('\n') : ''
}

// 创建装饰集 - 基于 lineTypes
function createDecorationsFromLineTypes(lineTypes, side, currentIndex, editorState) {
  const decorations = []
  // 获取当前选中的差异范围
  const currentDiff = currentIndex >= 0 && props.diffs && props.diffs[currentIndex]
    ? props.diffs[currentIndex]
    : null
  const currentDiffStartLine = currentDiff?.line ?? -1
  const currentDiffEndLine = currentDiff?.endLine ?? currentDiffStartLine

  for (let i = 0; i < lineTypes.length; i++) {
    const type = lineTypes[i]
    if (type === 'equal') continue

    // 确保行号在有效范围内
    if (i >= editorState.doc.lines) continue

    const line = editorState.doc.line(i + 1) // CodeMirror 行号从1开始

    let className
    let isPlaceholder = false

    // 根据类型确定基础样式
    if (type === 'added') {
      // 新增行: 左侧为空行占位符，右侧为新增
      if (side === 'left') {
        className = 'cm-diff-placeholder'
        isPlaceholder = true
      } else {
        className = 'cm-diff-added'
      }
    } else if (type === 'removed') {
      // 删除行: 左侧为删除，右侧为空行占位符
      if (side === 'left') {
        className = 'cm-diff-removed'
      } else {
        className = 'cm-diff-placeholder'
        isPlaceholder = true
      }
    } else if (type === 'modified') {
      className = 'cm-diff-modified'
    }

    if (className) {
      decorations.push(
        Decoration.line({
          class: className
        }).range(line.from)
      )
    }

    // 单独添加当前高亮样式（不覆盖基础样式）
    if (currentDiff && i >= currentDiffStartLine && i <= currentDiffEndLine && !isPlaceholder && type !== 'equal') {
      decorations.push(
        Decoration.line({
          class: 'cm-diff-current'
        }).range(line.from)
      )
    }
  }

  return Decoration.set(decorations.sort((a, b) => a.from - b.from))
}

// 更新装饰器
const updateDecorations = () => {
  if (!editorView || !props.lineTypes || props.lineTypes.length === 0) {
    // 发送空装饰器
    editorView?.dispatch({
      effects: setDecorationsEffect.of(Decoration.none)
    })
    return
  }

  // 获取当前差异索引（从父组件传入或默认为 0）
  const currentIndex = props.currentDiffIndex ?? 0

  const newDecorations = createDecorationsFromLineTypes(
    props.lineTypes,
    props.side,
    currentIndex,
    editorView.state
  )

  // 使用 StateEffect 更新装饰器（不会触发无限循环）
  editorView.dispatch({
    effects: setDecorationsEffect.of(newDecorations)
  })
}

// 初始化编辑器
onMounted(() => {
  // 优先使用对齐后的内容，如果没有则用原始内容
  const initialContent = props.displayContent || props.modelValue || ''

  if (editorContainer.value) {
    editorView = new EditorView({
      doc: initialContent,
      extensions: [
        basicSetup,
        EditorView.editable.of(true), // 可编辑模式
        EditorView.lineWrapping, // 自动换行
        decorationField, // 使用 StateField 管理装饰器
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            // 如果是程序更新（displayContent 同步），不触发 modelValue 更新
            if (isProgrammaticUpdate) {
              return
            }
            isUserEditing = true
            // 当用户编辑时，提取原始 JSON（去掉占位符行）并更新
            const originalContent = extractOriginalJson()
            emit('update:modelValue', originalContent)
            // 延迟重置编辑标志并触发编辑完成事件
            setTimeout(() => {
              isUserEditing = false
              emit('userEditComplete')
            }, 100)
          }
        })
      ],
      parent: editorContainer.value
    })

    scrollerElement = editorView.scrollDOM

    // 移除不稳定的 JS 高度设置，改为依赖 CSS

    // 滚动事件
    scrollerElement.addEventListener('scroll', () => {
      emit('scroll', {
        side: props.side,
        scrollTop: scrollerElement.scrollTop,
        scrollLeft: scrollerElement.scrollLeft
      })
    })
  }
})

// 监听滚动位置变化
watch(() => props.scrollTop, (newScrollTop) => {
  if (scrollerElement && scrollerElement.scrollTop !== newScrollTop) {
    scrollerElement.scrollTop = newScrollTop
  }
})

watch(() => props.scrollLeft, (newScrollLeft) => {
  if (scrollerElement && scrollerElement.scrollLeft !== newScrollLeft) {
    scrollerElement.scrollLeft = newScrollLeft
  }
})

// 监听原始值变化（当没有对齐内容时使用）
watch(() => props.modelValue, (newValue) => {
  // 如果有对齐内容，跳过原始内容更新
  if (props.displayContent) return

  if (editorView && editorView.state.doc.toString() !== newValue) {
    isProgrammaticUpdate = true
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: newValue
      }
    })
    isProgrammaticUpdate = false
  }
})

// 监听 displayContent 变化（优先级高）
watch(() => props.displayContent, (newValue) => {
  if (!editorView || !newValue) return

  // 如果用户正在编辑，跳过更新以避免覆盖用户输入
  if (isUserEditing) {
    return
  }

  const currentContent = editorView.state.doc.toString()
  if (currentContent !== newValue) {
    isProgrammaticUpdate = true
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: newValue
      }
    })
    isProgrammaticUpdate = false
  }

  // 更新装饰器
  updateDecorations()
})

// 监听 lineTypes 变化
watch(() => props.lineTypes, () => {
  updateDecorations()
}, { deep: true })

// 监听 diffs 变化
watch(() => props.diffs, () => {
  updateDecorations()
}, { deep: true })

// 监听 currentDiffIndex 变化 - 滚动到当前差异位置
watch(() => props.currentDiffIndex, (newIndex) => {
  updateDecorations()
  
  // BUG FIX: 滚动到当前差异位置
  if (editorView && props.diffs && props.diffs[newIndex]) {
    const diff = props.diffs[newIndex]
    const targetLine = diff.line  // 0-based line number from diff
    
    if (targetLine >= 0 && targetLine < props.lineTypes?.length) {
      // 找到对应的 CodeMirror 行 (CodeMirror 使用 1-based 行号)
      const cmLineNumber = targetLine + 1
      
      if (cmLineNumber <= editorView.state.doc.lines) {
        const line = editorView.state.doc.line(cmLineNumber)
        
        // 使用 scrollIntoView 效果滚动到行中间
        const scrollEffect = EditorView.scrollIntoView(line.from, {
          y: 'center',
          x: 'start'
        })
        
        editorView.dispatch({
          effects: scrollEffect
        })
      }
    }
  }
})

// 暴露方法给父组件，允许直接读取编辑器的原始内容
defineExpose({
  getRawContent: () => editorView ? editorView.state.doc.toString() : ''
})
</script>

<style scoped>
/* Compare Editor 样式 */
.compare-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-header {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.editor-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.editor-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}

.compare-editor .editor-container {
  width: 100%;
  height: 100%;
}

/* 确保 CodeMirror 编辑器正确填充容器并支持滚动 */
.editor-container :deep(.cm-editor) {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: auto !important;
}

/* scroller 是实际滚动的元素 */
.editor-container :deep(.cm-scroller) {
  overflow-y: auto !important;
  height: 100% !important;
}

/* 差异样式 - 使用 :deep() 穿透作用域 */
:deep(.cm-diff-added) {
  background-color: #e6ffed !important;
}

:deep(.cm-diff-removed) {
  background-color: #ffcccc !important;
}

:deep(.cm-diff-modified) {
  background-color: #ffe089 !important;
}

/* 当前高亮样式 - 使用边框而不覆盖背景色 */
:deep(.cm-diff-current) {
  border-left: 3px solid #ff9800 !important;
  padding-left: 2px !important;
}

/* 占位符行样式 - BUG FIX: 确保高度与正常行一致 */
:deep(.cm-diff-placeholder) {
  background-color: #f5f5f5 !important;
  position: relative;
  min-height: 20px !important; /* 确保最小高度与 CodeMirror 行高一致 */
}

:deep(.cm-diff-placeholder .cm-line) {
  color: transparent !important;
  min-height: 20px !important;
  line-height: 20px !important;
}

/* 确保所有行高度一致 */
:deep(.cm-line) {
  min-height: 20px !important;
  line-height: 20px !important;
}

/* 为占位符行添加提示文本 */
:deep(.cm-diff-placeholder::before) {
  content: '\2022\2022\2022 此处内容已删除 •••';
  color: #aaa !important;
  font-style: italic;
  font-size: 12px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  white-space: nowrap;
  opacity: 1 !important; /* 确保提示文本不受父元素 opacity 影响 */
}
</style>
