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

    console.log('[Debug calculateAlignedRanges] types:', types)
    console.log('[Debug calculateAlignedRanges] leftLines.length:', leftLines.length)
    console.log('[Debug calculateAlignedRanges] rightLines.length:', rightLines.length)

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

      console.log(`[Debug calculateAlignedRanges] Found ${type} block from ${startLine} to ${endLine - 1}`)

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
        console.log(`[Debug calculateAlignedRanges] hasLeftContent: ${hasLeftContent}`)
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
          console.log(`[Debug calculateAlignedRanges] leftRange:`, leftRange)
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
        console.log(`[Debug calculateAlignedRanges] hasRightContent: ${hasRightContent}`)
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
          console.log(`[Debug calculateAlignedRanges] rightRange:`, rightRange)
        }
      }

      // 至少一侧有实际内容才添加到结果
      if (leftRange || rightRange) {
        result.push({
          type,
          line: startLine,
          endLine: Math.max(leftRange?.endLine ?? startLine, rightRange?.endLine ?? startLine),
          leftRange,
          rightRange
        })
      } else {
        console.log(`[Debug calculateAlignedRanges] Skipping block - no content found`)
      }

      i = endLine
    }

    console.log('[Debug calculateAlignedRanges] result:', result)
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
  const formatBoth = () => {
    try {
      // 只有在JSON有效时才格式化
      let leftValid = true, rightValid = true

      try {
        if (leftJson.value.trim()) {
          JSON.parse(leftJson.value)
          leftJson.value = formatJson(leftJson.value, 2, false)
        }
      } catch (error) {
        leftValid = false
      }

      try {
        if (rightJson.value.trim()) {
          JSON.parse(rightJson.value)
          rightJson.value = formatJson(rightJson.value, 2, false)
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

  // 排序两边 (按键名字母排序)
  const sortBoth = () => {
    try {
      // 只有在JSON有效时才排序
      let leftValid = true, rightValid = true

      try {
        if (leftJson.value.trim()) {
          JSON.parse(leftJson.value)
          leftJson.value = formatJson(leftJson.value, 2, true)
        }
      } catch (error) {
        leftValid = false
      }

      try {
        if (rightJson.value.trim()) {
          JSON.parse(rightJson.value)
          rightJson.value = formatJson(rightJson.value, 2, true)
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
    const modified = diffs.value.filter(d => d.type === 'modified' || d.type === 'type-changed').length

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

  // 立即比较（跳过 debounce）
  const compareImmediate = () => {
    console.log('[Debug Compare] *** compareImmediate() called ***')
    compare()
  }

  // 监听 JSON 变化自动重新比较
  let debounceTimer = null
  let skipNextCompare = false

  const compare = () => {
    // 每次比较前清除错误状态
    compareError.value = ''

    console.log('[Debug Compare] *** compare() called ***')
    console.log('[Debug Compare] leftJson:', leftJson.value?.substring(0, 100))
    console.log('[Debug Compare] rightJson:', rightJson.value?.substring(0, 100))

    // 清空时重置
    if (!leftJson.value.trim() && !rightJson.value.trim()) {
      console.log('[Debug Compare] Both empty, resetting')
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

      console.log('[Debug Compare] Parsing JSON...')

      try {
        leftObj = leftJson.value.trim() ? JSON.parse(leftJson.value) : {}
        console.log('[Debug Compare] leftJson parsed successfully, content:', leftJson.value?.substring(0, 200))
      } catch (error) {
        leftValid = false
        leftObj = null
        console.log('[Debug Compare] leftJson parse failed:', error.message)
        console.log('[Debug Compare] leftJson content:', leftJson.value)
      }

      try {
        rightObj = rightJson.value.trim() ? JSON.parse(rightJson.value) : {}
        console.log('[Debug Compare] rightJson parsed successfully')
      } catch (error) {
        rightValid = false
        rightObj = null
        console.log('[Debug Compare] rightJson parse failed:', error.message)
      }

      console.log('[Debug Compare] leftValid:', leftValid, 'rightValid:', rightValid)

      // 如果两边都有效，执行深度比较
      if (leftValid && rightValid) {
        console.log('[Debug Compare] Calling compareJson...')
        const rawDiffs = compareJson(leftObj, rightObj)
        console.log('[Debug Compare] compareJson returned, diffs:', rawDiffs.length)

        // 生成对齐的diff视图
        console.log('[Debug Compare] Calling generateAlignedDiff...')
        const aligned = generateAlignedDiff(leftJson.value, rightJson.value)
        console.log('[Debug Compare] generateAlignedDiff returned')

        console.log('[Debug Compare] aligned.leftLines:', aligned.leftLines)
        console.log('[Debug Compare] aligned.rightLines:', aligned.rightLines)
        console.log('[Debug Compare] aligned.lineTypes:', aligned.lineTypes)
        console.log('[Debug Compare] aligned.success:', aligned.success)

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

        console.log('[Debug Compare] Comparison successful, diffs:', diffs.value.length)
        return { success: true, count: diffs.value.length }
      }

      // 有一边或两边无效 - 保持当前视图不变，不刷新焦点
      if (!leftValid && !rightValid) {
        // 格式错误时保持静默，不更新显示内容，保持光标位置
        console.log('[Debug Compare] Both invalid, keeping current state')
        return { success: false, count: 0, keepState: true }
      }

      // 只有左侧有效
      if (!leftValid && rightValid) {
        // 格式错误时保持静默，不更新显示内容，保持光标位置
        console.log('[Debug Compare] Left invalid, keeping current state')
        return { success: false, count: 0, keepState: true }
      }

      // 只有右侧有效
      if (leftValid && !rightValid) {
        // 格式错误时保持静默，不更新显示内容，保持光标位置
        console.log('[Debug Compare] Right invalid, keeping current state')
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
