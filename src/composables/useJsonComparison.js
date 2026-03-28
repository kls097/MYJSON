import { ref, computed, watch } from 'vue'
import { compareJson, calculateEditorRanges, generateAlignedDiff } from '../utils/jsonComparer'
import { formatJson } from '../utils/jsonFormatter'

export function useJsonComparison() {
  const leftJson = ref('')
  const rightJson = ref('')
  const diffs = ref([])
  const currentDiffIndex = ref(0)
  const compareError = ref('')

  // 对齐后的内容
  const alignedLeft = ref('')
  const alignedRight = ref('')
  const lineTypes = ref([])

  // 根据行类型计算差异位置
  // 计算在对齐视图中的位置（编辑器显示的就是对齐内容）
  // 将连续的相同类型行合并为一个差异，提高导航体验
  const calculateAlignedRanges = (types) => {
    const result = []
    const leftLines = alignedLeft.value.split('\n')
    const rightLines = alignedRight.value.split('\n')

    let i = 0
    while (i < types.length) {
      const type = types[i]

      // 跳过相等的行
      if (type === 'equal') {
        i++
        continue
      }

      // 找到连续的相同类型行
      const startLine = i
      let endLine = i + 1

      // 向后查找，只合并同一类型的连续行
      while (endLine < types.length && types[endLine] === type) {
        endLine++
      }

      // 计算这个连续块的起始位置
      const leftCharPos = getCharPosForLine(leftLines, startLine)
      const rightCharPos = getCharPosForLine(rightLines, startLine)

      // 确定这一侧是否有实际内容
      const isLeftPlaceholder = (type === 'added')
      const isRightPlaceholder = (type === 'removed')

      let leftRange = null
      let rightRange = null

      // 检查左侧在这个块中是否有实际内容
      if (!isLeftPlaceholder) {
        let hasLeftContent = false
        for (let j = startLine; j < endLine; j++) {
          if (leftLines[j] && leftLines[j].trim() !== '') {
            hasLeftContent = true
            break
          }
        }
        if (hasLeftContent) {
          // 找到最后一行有内容的位置
          let lastContentLine = startLine
          for (let j = endLine - 1; j >= startLine; j--) {
            if (leftLines[j] && leftLines[j].trim() !== '') {
              lastContentLine = j
              break
            }
          }
          leftRange = {
            from: leftCharPos,
            to: getCharPosForLine(leftLines, lastContentLine) + (leftLines[lastContentLine] || '').length,
            line: startLine,
            endLine: lastContentLine
          }
        }
      }

      // 检查右侧在这个块中是否有实际内容
      if (!isRightPlaceholder) {
        let hasRightContent = false
        for (let j = startLine; j < endLine; j++) {
          if (rightLines[j] && rightLines[j].trim() !== '') {
            hasRightContent = true
            break
          }
        }
        if (hasRightContent) {
          // 找到最后一行有内容的位置
          let lastContentLine = startLine
          for (let j = endLine - 1; j >= startLine; j--) {
            if (rightLines[j] && rightLines[j].trim() !== '') {
              lastContentLine = j
              break
            }
          }
          rightRange = {
            from: rightCharPos,
            to: getCharPosForLine(rightLines, lastContentLine) + (rightLines[lastContentLine] || '').length,
            line: startLine,
            endLine: lastContentLine
          }
        }
      }

      // 至少一侧有实际内容才添加到结果
      if (leftRange || rightRange) {
        // 从差异行内容中提取路径信息
        const contentLines = type === 'added' ? rightLines : leftLines
        let path = ''
        for (let j = startLine; j < endLine; j++) {
          const line = contentLines[j]
          if (line && line.trim()) {
            const keyMatch = line.match(/^\s*"([^"]+)"\s*:/)
            if (keyMatch) {
              path = keyMatch[1]
              break
            }
          }
        }

        result.push({
          type,
          line: startLine,
          endLine: Math.max(leftRange?.endLine ?? startLine, rightRange?.endLine ?? startLine),
          leftRange,
          rightRange,
          path: path || `Line ${startLine + 1}`
        })
      }

      i = endLine
    }

    return result
  }

  // 计算指定行号在文本中的起始字符位置
  function getCharPosForLine(lines, lineIdx) {
    if (lineIdx < 0 || lineIdx >= lines.length) return 0
    let pos = 0
    for (let i = 0; i < lineIdx; i++) {
      pos += lines[i].length + 1 // +1 for newline
    }
    return pos
  }

  // 格式化两边
  const formatBoth = (rawLeftContent, rawRightContent) => {
    try {
      // 如果提供了原始编辑器内容，优先使用它们（避免 extractOriginalJson 导致的数据损坏）
      let leftContent = leftJson.value
      let rightContent = rightJson.value

      if (rawLeftContent !== undefined && rawLeftContent !== null) {
        leftContent = extractJsonFromAligned(rawLeftContent, alignedLeft.value, lineTypes.value, 'left')
      }
      if (rawRightContent !== undefined && rawRightContent !== null) {
        rightContent = extractJsonFromAligned(rawRightContent, alignedRight.value, lineTypes.value, 'right')
      }

      // 只有在JSON有效时才格式化
      let leftValid = true, rightValid = true

      try {
        if (leftContent.trim()) {
          JSON.parse(leftContent)
          leftJson.value = formatJson(leftContent, 2, false)
        }
      } catch (error) {
        leftValid = false
      }

      try {
        if (rightContent.trim()) {
          JSON.parse(rightContent)
          rightJson.value = formatJson(rightContent, 2, false)
        }
      } catch (error) {
        rightValid = false
      }

      if (!leftValid || !rightValid) {
        compareError.value = leftValid ? '右侧 JSON 格式错误' : (rightValid ? '左侧 JSON 格式错误' : '两侧 JSON 格式错误')
        return false
      }

      compare()
      return true
    } catch (error) {
      compareError.value = `格式化失败: ${error.message}`
      return false
    }
  }

  // 从对齐内容中提取原始 JSON（去掉占位符行）
  // 用于 formatBoth/sortBoth 直接从编辑器内容中提取
  const extractJsonFromAligned = (editorContent, alignedContent, types, side) => {
    if (!types || types.length === 0) {
      return editorContent
    }

    // 如果编辑器内容与对齐内容完全相同，按类型提取非占位符行
    if (editorContent === alignedContent) {
      const lines = alignedContent.split('\n')
      const originalLines = []
      for (let i = 0; i < lines.length; i++) {
        const type = types[i]
        const isPlaceholder =
          (type === 'added' && side === 'left') ||
          (type === 'removed' && side === 'right')
        if (!isPlaceholder) {
          if (type === 'equal' || lines[i].trim() !== '') {
            originalLines.push(lines[i])
          }
        }
      }
      return originalLines.length > 0 ? originalLines.join('\n') : ''
    }

    // 编辑器内容与对齐内容不同 — 用户做了编辑
    const editorLines = editorContent.split('\n')

    // 如果行数匹配 lineTypes，需要判断是否是行内编辑还是全量替换
    if (editorLines.length === types.length) {
      const lenDiff = Math.abs(editorContent.length - alignedContent.length)
      const maxLen = Math.max(editorContent.length, alignedContent.length, 1)
      // 内容长度变化超过 80%，视为全量替换（如粘贴操作）
      if (lenDiff / maxLen > 0.8) {
        return editorContent
      }
      // 否则按类型过滤占位符行
      const filtered = []
      for (let i = 0; i < editorLines.length; i++) {
        const type = types[i]
        const isPlaceholder =
          (type === 'added' && side === 'left') ||
          (type === 'removed' && side === 'right')
        if (!isPlaceholder) {
          filtered.push(editorLines[i])
        }
      }
      return filtered.join('\n')
    }

    // 行数不匹配，直接返回编辑器内容（全量替换）
    return editorContent
  }

  // 排序两边 (按键名字母排序)
  const sortBoth = (rawLeftContent, rawRightContent) => {
    try {
      // 如果提供了原始编辑器内容，优先使用
      let leftContent = leftJson.value
      let rightContent = rightJson.value

      if (rawLeftContent !== undefined && rawLeftContent !== null) {
        leftContent = extractJsonFromAligned(rawLeftContent, alignedLeft.value, lineTypes.value, 'left')
      }
      if (rawRightContent !== undefined && rawRightContent !== null) {
        rightContent = extractJsonFromAligned(rawRightContent, alignedRight.value, lineTypes.value, 'right')
      }

      // 只有在JSON有效时才排序
      let leftValid = true, rightValid = true

      try {
        if (leftContent.trim()) {
          JSON.parse(leftContent)
          leftJson.value = formatJson(leftContent, 2, true)
        }
      } catch (error) {
        leftValid = false
      }

      try {
        if (rightContent.trim()) {
          JSON.parse(rightContent)
          rightJson.value = formatJson(rightContent, 2, true)
        }
      } catch (error) {
        rightValid = false
      }

      if (!leftValid || !rightValid) {
        compareError.value = leftValid ? '右侧 JSON 格式错误' : (rightValid ? '左侧 JSON 格式错误' : '两侧 JSON 格式错误')
        return false
      }

      compare()
      return true
    } catch (error) {
      compareError.value = `排序失败: ${error.message}`
      return false
    }
  }

  // 导航到下一个差异
  const nextDiff = () => {
    if (diffs.value.length === 0) return null
    currentDiffIndex.value = (currentDiffIndex.value + 1) % diffs.value.length
    return diffs.value[currentDiffIndex.value]
  }

  // 导航到上一个差异
  const prevDiff = () => {
    if (diffs.value.length === 0) return null
    currentDiffIndex.value = (currentDiffIndex.value - 1 + diffs.value.length) % diffs.value.length
    return diffs.value[currentDiffIndex.value]
  }

  // 交换左右
  const swap = () => {
    const temp = leftJson.value
    leftJson.value = rightJson.value
    rightJson.value = temp
    compare()
  }

  // 设置初始数据
  const setInitialData = (left, right) => {
    leftJson.value = left || ''
    rightJson.value = right || ''
    compare()
  }

  // 清空
  const clear = () => {
    leftJson.value = ''
    rightJson.value = ''
    diffs.value = []
    currentDiffIndex.value = 0
    compareError.value = ''
    alignedLeft.value = ''
    alignedRight.value = ''
    lineTypes.value = []
  }

  // 统计信息
  const stats = computed(() => {
    const added = diffs.value.filter(d => d.type === 'added').length
    const removed = diffs.value.filter(d => d.type === 'removed').length
    const modified = diffs.value.filter(d => d.type === 'modified').length

    return {
      total: diffs.value.length,
      added,
      removed,
      modified
    }
  })

  // 当前差异
  const currentDiff = computed(() => {
    if (diffs.value.length === 0 || currentDiffIndex.value < 0) return null
    return diffs.value[currentDiffIndex.value]
  })

  // 是否有有效的比较结果
  const hasValidComparison = computed(() => {
    return !compareError.value && (leftJson.value.trim() || rightJson.value.trim())
  })

  // 监听 JSON 变化自动重新比较
  let debounceTimer = null
  let skipNextCompare = false

  // 立即比较（跳过 debounce）
  const compareImmediate = () => {
    // 清除待执行的 debounce 比较，防止双重触发
    clearTimeout(debounceTimer)
    debounceTimer = null
    compare()
  }

  const compare = () => {
    // 每次比较前清除错误状态
    compareError.value = ''

    // 清空时重置
    if (!leftJson.value.trim() && !rightJson.value.trim()) {
      diffs.value = []
      currentDiffIndex.value = 0
      alignedLeft.value = ''
      alignedRight.value = ''
      lineTypes.value = []
      return { success: true, count: 0 }
    }

    try {
      // 验证两边的 JSON
      let leftObj, rightObj
      let leftValid = true, rightValid = true

      try {
        leftObj = leftJson.value.trim() ? JSON.parse(leftJson.value) : {}
      } catch (error) {
        leftValid = false
        leftObj = null
      }

      try {
        rightObj = rightJson.value.trim() ? JSON.parse(rightJson.value) : {}
      } catch (error) {
        rightValid = false
        rightObj = null
      }

      // 如果两边都有效，执行深度比较
      if (leftValid && rightValid) {
        const rawDiffs = compareJson(leftObj, rightObj)

        // 生成对齐的diff视图
        const aligned = generateAlignedDiff(leftJson.value, rightJson.value)

        if (aligned.success) {
          alignedLeft.value = aligned.leftLines.join('\n')
          alignedRight.value = aligned.rightLines.join('\n')
          lineTypes.value = aligned.lineTypes
        } else {
          // 当对齐失败时，使用原始 JSON（可能包含格式错误）
          alignedLeft.value = leftJson.value || ''
          alignedRight.value = rightJson.value || ''
          lineTypes.value = []
        }

        // 计算每个差异在编辑器中的位置 (使用对齐后的内容)
        diffs.value = calculateAlignedRanges(aligned.lineTypes)

        // 重置到第一个差异
        currentDiffIndex.value = diffs.value.length > 0 ? 0 : -1

        return { success: true, count: diffs.value.length }
      }

      // 有一边或两边无效 - 保持当前视图不变，不刷新焦点
      if (!leftValid && !rightValid) {
        // 格式错误时保持静默，不更新显示内容，保持光标位置
        return { success: false, count: 0, keepState: true }
      }

      // 只有左侧有效
      if (!leftValid && rightValid) {
        // 格式错误时保持静默，不更新显示内容，保持光标位置
        return { success: false, count: 0, keepState: true }
      }

      // 只有右侧有效
      if (leftValid && !rightValid) {
        // 格式错误时保持静默，不更新显示内容，保持光标位置
        return { success: false, count: 0, keepState: true }
      }
    } catch (error) {
      // 异常时保持静默，不更新显示内容，保持光标位置
      console.error('Compare error:', error)
      return { success: false, count: 0, keepState: true }
    }
  }

  // 监听 JSON 变化自动重新比较
  watch([leftJson, rightJson], () => {
    // 如果设置了跳过标记，重置并跳过本次
    if (skipNextCompare) {
      skipNextCompare = false
      return
    }
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      compare()
    }, 600) // 增加到 600ms，避免粘贴过程中 JSON 不完整导致解析失败
  })

  return {
    // 状态
    leftJson,
    rightJson,
    alignedLeft,
    alignedRight,
    lineTypes,
    diffs,
    currentDiff,
    currentDiffIndex,
    stats,
    compareError,
    hasValidComparison,

    // 方法
    compare,
    compareImmediate,
    formatBoth,
    sortBoth,
    nextDiff,
    prevDiff,
    swap,
    setInitialData,
    clear
  }
}
