// JSON 结构比较工具

// 虚拟空行占位符标记（使用空行，通过CSS样式显示）
export const PLACEHOLDER_LINE = ''

/**
 * 递归比较两个 JSON 对象,生成差异列表
 * @param {*} leftObj - 左侧对象
 * @param {*} rightObj - 右侧对象
 * @param {string} path - 当前 JSONPath
 * @param {number} depth - 当前递归深度
 * @returns {Array} 差异列表
 */
export function compareJson(leftObj, rightObj, path = '$', depth = 0) {
  const diffs = []
  const MAX_DEPTH = 50 // 防止栈溢出

  if (depth > MAX_DEPTH) {
    console.warn(`Max recursion depth reached at path: ${path}`)
    return diffs
  }

  // null 特殊处理
  if (leftObj === null || rightObj === null) {
    if (leftObj !== rightObj) {
      diffs.push({
        path,
        type: leftObj === null && rightObj === null ? 'equal' : 'type-changed',
        leftValue: leftObj,
        rightValue: rightObj
      })
    }
    return diffs
  }

  // 类型不同
  if (typeof leftObj !== typeof rightObj) {
    diffs.push({
      path,
      type: 'type-changed',
      leftValue: leftObj,
      rightValue: rightObj
    })
    return diffs
  }

  // 基本类型值比较
  if (leftObj !== Object(leftObj)) {
    if (leftObj !== rightObj) {
      diffs.push({
        path,
        type: 'modified',
        leftValue: leftObj,
        rightValue: rightObj
      })
    }
    return diffs
  }

  // 数组比较 - 智能对齐比较
  if (Array.isArray(leftObj) && Array.isArray(rightObj)) {
    const leftLen = leftObj.length
    const rightLen = rightObj.length
    
    // 性能优化：对于超大数组使用简单算法
    if (leftLen > 200 || rightLen > 200) {
      const maxLen = Math.max(leftLen, rightLen)
      for (let i = 0; i < maxLen; i++) {
        const itemPath = `${path}[${i}]`
        if (i < leftLen && i < rightLen) {
          diffs.push(...compareJson(leftObj[i], rightObj[i], itemPath, depth + 1))
        } else if (i < leftLen) {
          diffs.push({ path: itemPath, type: 'removed', leftValue: leftObj[i], rightValue: undefined })
        } else {
          diffs.push({ path: itemPath, type: 'added', leftValue: undefined, rightValue: rightObj[i] })
        }
      }
      return diffs
    }
    
    // 使用动态规划找出最佳对齐
    const dp = Array.from({ length: leftLen + 1 }, () => new Array(rightLen + 1).fill(0))
    for (let i = 1; i <= leftLen; i++) {
      for (let j = 1; j <= rightLen; j++) {
        const sim = calculateSimilarity(leftObj[i-1], rightObj[j-1])
        if (sim > 0.4) {
          dp[i][j] = dp[i-1][j-1] + sim
        } else {
          dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1])
        }
      }
    }
    
    // 回溯生成差异
    let i = leftLen, j = rightLen
    const result = []
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0) {
        const sim = calculateSimilarity(leftObj[i-1], rightObj[j-1])
        if (sim > 0.4 && dp[i][j] === dp[i-1][j-1] + sim) {
          // 对齐的一对，递归比较
          result.unshift(...compareJson(leftObj[i-1], rightObj[j-1], `${path}[${i-1}]`, depth + 1))
          i--; j--
          continue
        }
      }
      
      if (i > 0 && (j === 0 || dp[i][j] === dp[i-1][j])) {
        // 左侧多出 (删除)
        result.unshift({
          path: `${path}[${i-1}]`,
          type: 'removed',
          leftValue: leftObj[i-1],
          rightValue: undefined
        })
        i--
      } else {
        // 右侧多出 (新增)
        result.unshift({
          path: `${path}[${j-1}]`, // 注意：这里的路径索引可能需要根据实际显示位置调整，但原始路径通常按索引
          type: 'added',
          leftValue: undefined,
          rightValue: rightObj[j-1]
        })
        j--
      }
    }
    
    diffs.push(...result)
    return diffs
  }

  // 数组和对象类型不匹配
  if (Array.isArray(leftObj) !== Array.isArray(rightObj)) {
    diffs.push({
      path,
      type: 'type-changed',
      leftValue: leftObj,
      rightValue: rightObj
    })
    return diffs
  }

  // 对象比较 - 按键比较
  const leftKeys = new Set(Object.keys(leftObj))
  const rightKeys = new Set(Object.keys(rightObj))
  const allKeys = new Set([...leftKeys, ...rightKeys])

  for (const key of allKeys) {
    // 处理特殊字符的键名 (JSONPath 转义)
    const escapedKey = key.includes('.') || key.includes('[') ? `["${key}"]` : `.${key}`
    const newPath = path === '$' ? `$${escapedKey}` : `${path}${escapedKey}`

    if (!rightKeys.has(key)) {
      // 左侧有,右侧无
      diffs.push({
        path: newPath,
        type: 'removed',
        leftValue: leftObj[key],
        rightValue: undefined
      })
    } else if (!leftKeys.has(key)) {
      // 右侧有,左侧无
      diffs.push({
        path: newPath,
        type: 'added',
        leftValue: undefined,
        rightValue: rightObj[key]
      })
    } else {
      // 递归比较对象属��
      diffs.push(...compareJson(leftObj[key], rightObj[key], newPath, depth + 1))
    }
  }

  return diffs
}

/**
 * 在 JSON 字符串中查找指定 JSONPath 的位置
 * 全新实现:使用更简单可靠的逐行扫描算法
 */
export function findPathPosition(jsonStr, path, fallbackToParent = true) {
  if (!jsonStr || !path || path === '$') return null

  try {
    const pathParts = parseJsonPath(path)
    if (pathParts.length === 0) return null

    const lines = jsonStr.split('\n')
    let searchStartLine = 0
    let lastFoundPosition = null // 记录最后找到的位置（用于回退）

    // 逐层处理路径的每一部分
    for (let partIdx = 0; partIdx < pathParts.length; partIdx++) {
      const part = pathParts[partIdx]
      const isLastPart = partIdx === pathParts.length - 1

      if (part.type === 'key') {
        // 查找键名
        const keyPattern = new RegExp(`^\\s*"${escapeRegex(part.value)}"\\s*:`)
        let found = false

        for (let lineIdx = searchStartLine; lineIdx < lines.length; lineIdx++) {
          const line = lines[lineIdx]
          if (keyPattern.test(line)) {
            const charPos = calculateCharPos(lines, lineIdx)
            const match = line.match(keyPattern)
            const keyOffset = line.indexOf('"', match.index)
            
            lastFoundPosition = {
              from: charPos + keyOffset,
              to: charPos + line.length,
              line: lineIdx
            }

            if (isLastPart) {
              return lastFoundPosition
            }
            searchStartLine = lineIdx + 1
            found = true
            break
          }
        }
        
        // 找不到当前部分，返回上一个找到的位置
        if (!found && fallbackToParent && lastFoundPosition) {
          return lastFoundPosition
        }
      } else if (part.type === 'index') {
        // 查找数组元素
        const targetIdx = part.value
        let arrayFound = false
        let elementCount = 0
        let depth = 0
        let foundLine = -1
        const arraySearchStart = Math.max(0, searchStartLine - 1)

        for (let lineIdx = arraySearchStart; lineIdx < lines.length; lineIdx++) {
          const line = lines[lineIdx]

          // 找到数组开始
          if (!arrayFound && line.includes('[')) {
            arrayFound = true
            lastFoundPosition = {
              from: calculateCharPos(lines, lineIdx),
              to: calculateCharPos(lines, lineIdx) + line.length,
              line: lineIdx
            }
            continue
          }

          if (!arrayFound) continue

          // 逐字符扫描,计数数组元素
          for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const char = line[charIdx]

            if (char === '{' || char === '[') {
              if (depth === 0) {
                if (elementCount === targetIdx) {
                  foundLine = lineIdx
                  const charPos = calculateCharPos(lines, lineIdx)
                  const trimStart = line.length - line.trimStart().length
                  
                  lastFoundPosition = {
                    from: charPos + trimStart,
                    to: charPos + line.length,
                    line: lineIdx
                  }

                  if (isLastPart) {
                    return lastFoundPosition
                  } else {
                    searchStartLine = lineIdx + 1
                    break
                  }
                }
                elementCount++
              }
              depth++
            } else if (char === '}' || char === ']') {
              depth--
              if (depth < 0) {
                arrayFound = false
                break
              }
            } else if (depth === 0 && (char === '"' || /[0-9\-]/.test(char))) {
              // 简单类型的数组元素
              if (elementCount === targetIdx) {
                foundLine = lineIdx
                const charPos = calculateCharPos(lines, lineIdx)
                const trimStart = line.length - line.trimStart().length
                
                lastFoundPosition = {
                  from: charPos + trimStart,
                  to: charPos + line.length,
                  line: lineIdx
                }

                if (isLastPart) {
                  return lastFoundPosition
                }
              }
              // 跳过整个值
              if (char === '"') {
                // 跳过字符串
                let j = charIdx + 1
                while (j < line.length && line[j] !== '"') {
                  if (line[j] === '\\') j++
                  j++
                }
                charIdx = j
              } else {
                // 跳过数字
                while (charIdx < line.length && /[0-9.\-eE]/.test(line[charIdx])) {
                  charIdx++
                }
                charIdx--
              }
              
              // 检查是否有逗号
              const remaining = line.slice(charIdx + 1).trim()
              if (remaining.startsWith(',')) {
                elementCount++
              }
            }
          }

          if (foundLine >= 0) break
          if (!arrayFound) break
        }

        if (foundLine === -1 && fallbackToParent && lastFoundPosition) {
          return lastFoundPosition
        }
      }
    }

    return lastFoundPosition
  } catch (error) {
    console.error(`Error finding path position for ${path}:`, error)
    return null
  }
}

/**
 * 计算字符在文本中的绝对位置
 */
function calculateCharPos(lines, lineIdx) {
  let pos = 0
  for (let i = 0; i < lineIdx; i++) {
    pos += lines[i].length + 1
  }
  return pos
}

/**
 * 解析 JSONPath 为路径部分数组
 * @param {string} path - JSONPath 字符串
 * @returns {Array} 路径部分数组
 */
function parseJsonPath(path) {
  if (!path || path === '$') return []

  const parts = []
  // 移除开头的 $
  let remaining = path.startsWith('$') ? path.substring(1) : path

  while (remaining.length > 0) {
    // 处理 .key 格式
    if (remaining.startsWith('.')) {
      const match = remaining.match(/^\.([^.\[]+)/)
      if (match) {
        parts.push({ type: 'key', value: match[1] })
        remaining = remaining.substring(match[0].length)
        continue
      }
    }

    // 处理 ["key"] 格式
    if (remaining.startsWith('["')) {
      const match = remaining.match(/^\["([^"]+)"\]/)
      if (match) {
        parts.push({ type: 'key', value: match[1] })
        remaining = remaining.substring(match[0].length)
        continue
      }
    }

    // 处理 [index] 格式
    if (remaining.startsWith('[')) {
      const match = remaining.match(/^\[(\d+)\]/)
      if (match) {
        parts.push({ type: 'index', value: parseInt(match[1]) })
        remaining = remaining.substring(match[0].length)
        continue
      }
    }

    // 无法解析,跳出
    break
  }

  return parts
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 为差异列表计算编辑器中的位置范围
 * @param {Array} diffs - 差异列表
 * @param {string} leftJson - 左侧 JSON 字符串
 * @param {string} rightJson - 右侧 JSON 字符串
 * @returns {Array} 带位置信息的差异列表
 */
export function calculateEditorRanges(diffs, leftJson, rightJson) {
  return diffs.map(diff => {
    let leftRange = null
    let rightRange = null
    
    // 获取父路径用于回退
    const parentPath = getParentPath(diff.path)
    
    if (diff.type === 'added') {
      // 新增: 左侧没有，使用父路径位置
      rightRange = findPathPosition(rightJson, diff.path)
      // 左侧使用父路径位置作为参考
      leftRange = parentPath ? findPathPosition(leftJson, parentPath) : null
      if (!leftRange && leftJson.trim()) {
        // 回退到第一行
        leftRange = { from: 0, to: leftJson.indexOf('\n') || leftJson.length, line: 0, isFallback: true }
      }
    } else if (diff.type === 'removed') {
      // 删除: 右侧没有，使用父路径位置
      leftRange = findPathPosition(leftJson, diff.path)
      // 右侧使用父路径位置作为参考
      rightRange = parentPath ? findPathPosition(rightJson, parentPath) : null
      if (!rightRange && rightJson.trim()) {
        // 回退到第一行
        rightRange = { from: 0, to: rightJson.indexOf('\n') || rightJson.length, line: 0, isFallback: true }
      }
    } else {
      // 修改/类型变更: 两侧都有
      leftRange = findPathPosition(leftJson, diff.path)
      rightRange = findPathPosition(rightJson, diff.path)
    }

    return {
      ...diff,
      leftRange,
      rightRange
    }
  })
}

/**
 * 获取父路径
 */
function getParentPath(path) {
  if (!path || path === '$') return null
  
  // 移除最后一个部分
  // $.foo.bar -> $.foo
  // $.foo[0] -> $.foo
  // $[0].bar -> $[0]
  const lastDotIdx = path.lastIndexOf('.')
  const lastBracketIdx = path.lastIndexOf('[')
  
  const lastIdx = Math.max(lastDotIdx, lastBracketIdx)
  if (lastIdx <= 0) return '$'
  
  return path.substring(0, lastIdx)
}

/**
 * 序列化值用于显示
 * @param {*} value - 要序列化的值
 * @returns {string} 序列化后的字符串
 */
export function serializeValue(value) {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2).substring(0, 100) + (JSON.stringify(value).length > 100 ? '...' : '')
  }
  return String(value)
}

/**
 * 生成对齐的diff视图内容
 * 在缺失节点的位置插入空行，使两侧行号对齐
 * @param {string} leftJson - 左侧JSON字符串
 * @param {string} rightJson - 右侧JSON字符串
 * @returns {Object} 包含对齐后的左右内容和差异信息
 */
export function generateAlignedDiff(leftJson, rightJson) {
  try {
    // 如果两边都为空，直接返回
    if (!leftJson.trim() && !rightJson.trim()) {
      return {
        leftLines: [''],
        rightLines: [''],
        lineTypes: [],
        success: true
      }
    }

    // 如果有一边为空，生成一边全占位符的对齐视图
    const leftEmpty = !leftJson.trim()
    const rightEmpty = !rightJson.trim()

    if (leftEmpty && !rightEmpty) {
      const rightLines = rightJson.split('\n')
      const leftLines = new Array(rightLines.length).fill('')
      const lineTypes = new Array(rightLines.length).fill('added')
      return {
        leftLines,
        rightLines,
        lineTypes,
        success: true
      }
    }

    if (!leftEmpty && rightEmpty) {
      const leftLines = leftJson.split('\n')
      const rightLines = new Array(leftLines.length).fill('')
      const lineTypes = new Array(leftLines.length).fill('removed')
      return {
        leftLines,
        rightLines,
        lineTypes,
        success: true
      }
    }

    // 两边都有内容，正常解析并递归对齐
    const leftObj = JSON.parse(leftJson)
    const rightObj = JSON.parse(rightJson)

    // 递归生成对齐的行
    const result = alignObjects(leftObj, rightObj, 0)

    return {
      leftLines: result.leftLines,
      rightLines: result.rightLines,
      lineTypes: result.lineTypes, // 'equal' | 'added' | 'removed' | 'modified' | 'placeholder'
      success: true
    }
  } catch (error) {
    console.error('Failed to generate aligned diff:', error)
    return {
      leftLines: leftJson.split('\n'),
      rightLines: rightJson.split('\n'),
      lineTypes: [],
      success: false
    }
  }
}

/**
 * 递归对齐两个对象
 */
function alignObjects(leftObj, rightObj, indent) {
  const leftLines = []
  const rightLines = []
  const lineTypes = []
  const indentStr = '  '.repeat(indent)
  
  // 处理 null
  if (leftObj === null && rightObj === null) {
    leftLines.push(`${indentStr}null`)
    rightLines.push(`${indentStr}null`)
    lineTypes.push('equal')
    return { leftLines, rightLines, lineTypes }
  }
  
  // 处理基本类型
  if (typeof leftObj !== 'object' || typeof rightObj !== 'object' ||
      leftObj === null || rightObj === null) {
    const leftVal = formatValue(leftObj, indentStr)
    const rightVal = formatValue(rightObj, indentStr)
    leftLines.push(leftVal)
    rightLines.push(rightVal)
    lineTypes.push(leftVal === rightVal ? 'equal' : 'modified')
    return { leftLines, rightLines, lineTypes }
  }
  
  // 处理数组
  if (Array.isArray(leftObj) && Array.isArray(rightObj)) {
    return alignArrays(leftObj, rightObj, indent)
  }
  
  // 处理对象
  if (!Array.isArray(leftObj) && !Array.isArray(rightObj)) {
    return alignObjectProps(leftObj, rightObj, indent)
  }
  
  // 类型不匹配
  const leftVal = JSON.stringify(leftObj, null, 2).split('\n').map(l => indentStr + l)
  const rightVal = JSON.stringify(rightObj, null, 2).split('\n').map(l => indentStr + l)
  
  const maxLen = Math.max(leftVal.length, rightVal.length)
  for (let i = 0; i < maxLen; i++) {
    leftLines.push(leftVal[i] || '')
    rightLines.push(rightVal[i] || '')
    lineTypes.push('modified')
  }
  
  return { leftLines, rightLines, lineTypes }
}

/**
 * 计算两个值的相似度 (0-1)
 */
function calculateSimilarity(a, b, depth = 0) {
  if (a === b) return 1
  if (typeof a !== typeof b || a === null || b === null || depth > 10) return 0
  
  if (typeof a !== 'object') return a === b ? 1 : 0
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length === 0 && b.length === 0) return 1
    const minLen = Math.min(a.length, b.length)
    if (minLen === 0) return 0
    let matches = 0
    const checkLen = Math.min(minLen, 5) // 数组相似度只检查前5个元素，避免性能问题
    for (let i = 0; i < checkLen; i++) {
      matches += calculateSimilarity(a[i], b[i], depth + 1)
    }
    return matches / Math.max(a.length, b.length, checkLen)
  }
  
  if (!Array.isArray(a) && !Array.isArray(b)) {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length === 0 && bKeys.length === 0) return 1
    
    // 检查是否有共同的标识符键
    const idKeys = ['id', '_id', 'key', 'name', 'code']
    for (const k of idKeys) {
      if (k in a && k in b && a[k] === b[k] && a[k] !== undefined && a[k] !== null) {
        return 0.9 // 标识符相同，高度相似
      }
    }
    
    const commonKeys = aKeys.filter(k => k in b)
    if (commonKeys.length === 0) return 0
    
    let matches = 0
    const checkKeys = commonKeys.slice(0, 10) // 限制检查的键数量
    for (const k of checkKeys) {
      matches += calculateSimilarity(a[k], b[k], depth + 1)
    }
    return (matches / Math.max(aKeys.length, bKeys.length, checkKeys.length)) * 0.8
  }
  
  return 0
}

/**
 * 对齐数组
 */
function alignArrays(leftArr, rightArr, indent) {
  const leftLines = []
  const rightLines = []
  const lineTypes = []
  const indentStr = '  '.repeat(indent)

  // 开括号
  leftLines.push(`${indentStr}[`)
  rightLines.push(`${indentStr}[`)
  lineTypes.push('equal')

  const nArr = leftArr.length
  const mArr = rightArr.length

  // 性能优化：对于超大数组使用简单算法
  if (nArr > 200 || mArr > 200) {
    const maxLen = Math.max(nArr, mArr)
    for (let i = 0; i < maxLen; i++) {
      const leftComma = (i < nArr && i < nArr - 1) ? ',' : ''
      const rightComma = (i < mArr && i < mArr - 1) ? ',' : ''
      if (i < nArr && i < mArr) {
        const result = alignObjects(leftArr[i], rightArr[i], indent + 1)
        for (let l = 0; l < result.leftLines.length; l++) {
          const isLastLine = l === result.leftLines.length - 1
          const lLine = result.leftLines[l] + (isLastLine ? leftComma : '')
          const rLine = result.rightLines[l] + (isLastLine ? rightComma : '')
          leftLines.push(lLine)
          rightLines.push(rLine)
          const origType = result.lineTypes[l]
          lineTypes.push((origType === 'equal' && lLine !== rLine) ? 'modified' : origType)
        }
      } else if (i < nArr) {
        const lines = formatValueLines(leftArr[i], indent + 1)
        for (let l = 0; l < lines.length; l++) {
          const isLastLine = l === lines.length - 1
          leftLines.push(lines[l] + (isLastLine ? leftComma : ''))
          rightLines.push('')
          lineTypes.push('removed')
        }
      } else {
        const lines = formatValueLines(rightArr[i], indent + 1)
        for (let l = 0; l < lines.length; l++) {
          const isLastLine = l === lines.length - 1
          leftLines.push('')
          rightLines.push(lines[l] + (isLastLine ? rightComma : ''))
          lineTypes.push('added')
        }
      }
    }
    // 闭括号
    leftLines.push(`${indentStr}]`)
    rightLines.push(`${indentStr}]`)
    lineTypes.push('equal')
    return { leftLines, rightLines, lineTypes }
  }

  // 使用动态规划进行对齐 (类似 LCS，但考虑相似度)
  const dp = Array.from({ length: nArr + 1 }, () => new Array(mArr + 1).fill(0))

  for (let i = 1; i <= nArr; i++) {
    for (let j = 1; j <= mArr; j++) {
      const sim = calculateSimilarity(leftArr[i-1], rightArr[j-1])
      if (sim > 0.4) { // 只有相似度足够高才考虑对齐
        dp[i][j] = dp[i-1][j-1] + sim
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1])
      }
    }
  }

  // 回溯找出对齐路径
  const alignment = []
  let i = nArr, j = mArr
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const sim = calculateSimilarity(leftArr[i-1], rightArr[j-1])
      if (sim > 0.4 && dp[i][j] === dp[i-1][j-1] + sim) {
        alignment.unshift({ leftIdx: i-1, rightIdx: j-1 })
        i--; j--
        continue
      }
    }

    if (i > 0 && (j === 0 || dp[i][j] === dp[i-1][j])) {
      alignment.unshift({ leftIdx: i-1, rightIdx: null })
      i--
    } else {
      alignment.unshift({ leftIdx: null, rightIdx: j-1 })
      j--
    }
  }

  // Pre-compute: find the index of the last alignment entry that has a real left/right element
  let lastLeftAlignIdx = -1
  let lastRightAlignIdx = -1
  for (let k = alignment.length - 1; k >= 0; k--) {
    if (lastLeftAlignIdx === -1 && alignment[k].leftIdx !== null) lastLeftAlignIdx = k
    if (lastRightAlignIdx === -1 && alignment[k].rightIdx !== null) lastRightAlignIdx = k
    if (lastLeftAlignIdx !== -1 && lastRightAlignIdx !== -1) break
  }

  // 根据对齐结果生成行
  for (let k = 0; k < alignment.length; k++) {
    const { leftIdx, rightIdx } = alignment[k]
    const leftComma = (leftIdx !== null && k < lastLeftAlignIdx) ? ',' : ''
    const rightComma = (rightIdx !== null && k < lastRightAlignIdx) ? ',' : ''

    if (leftIdx !== null && rightIdx !== null) {
      // 对齐的一对
      const result = alignObjects(leftArr[leftIdx], rightArr[rightIdx], indent + 1)
      for (let l = 0; l < result.leftLines.length; l++) {
        const isLastLine = l === result.leftLines.length - 1
        const lLine = result.leftLines[l] + (isLastLine ? leftComma : '')
        const rLine = result.rightLines[l] + (isLastLine ? rightComma : '')
        leftLines.push(lLine)
        rightLines.push(rLine)
        const origType = result.lineTypes[l]
        lineTypes.push((origType === 'equal' && lLine !== rLine) ? 'modified' : origType)
      }
    } else if (leftIdx !== null) {
      // 只有左侧
      const lines = formatValueLines(leftArr[leftIdx], indent + 1)
      for (let l = 0; l < lines.length; l++) {
        const isLastLine = l === lines.length - 1
        leftLines.push(lines[l] + (isLastLine ? leftComma : ''))
        rightLines.push('')
        lineTypes.push('removed')
      }
    } else {
      // 只有右侧
      const lines = formatValueLines(rightArr[rightIdx], indent + 1)
      for (let l = 0; l < lines.length; l++) {
        const isLastLine = l === lines.length - 1
        leftLines.push('')
        rightLines.push(lines[l] + (isLastLine ? rightComma : ''))
        lineTypes.push('added')
      }
    }
  }

  // 闭括号
  leftLines.push(`${indentStr}]`)
  rightLines.push(`${indentStr}]`)
  lineTypes.push('equal')

  return { leftLines, rightLines, lineTypes }
}

/**
 * 对齐对象属性
 */
function alignObjectProps(leftObj, rightObj, indent) {
  const leftLines = []
  const rightLines = []
  const lineTypes = []
  const indentStr = '  '.repeat(indent)
  const innerIndent = '  '.repeat(indent + 1)

  // 开括号
  leftLines.push(`${indentStr}{`)
  rightLines.push(`${indentStr}{`)
  lineTypes.push('equal')

  const leftKeys = Object.keys(leftObj)
  const rightKeys = Object.keys(rightObj)

  // Use LCS-like alignment on the key sequences to preserve both sides' original ordering.
  // Keys present on both sides are aligned; keys only on one side are inserted as added/removed.
  const commonLeft = leftKeys.filter(k => k in rightObj)
  const commonRight = rightKeys.filter(k => k in leftObj)

  // Build LCS of common keys (by key name equality) to find optimal alignment
  const n = commonLeft.length
  const m = commonRight.length
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (commonLeft[i-1] === commonRight[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1])
      }
    }
  }

  // Backtrack to get the ordered list of matched common keys
  const matchedKeys = []
  let ci = n, cj = m
  while (ci > 0 && cj > 0) {
    if (commonLeft[ci-1] === commonRight[cj-1]) {
      matchedKeys.unshift(commonLeft[ci-1])
      ci--; cj--
    } else if (dp[ci-1][cj] >= dp[ci][cj-1]) {
      ci--
    } else {
      cj--
    }
  }
  const matchedSet = new Set(matchedKeys)

  // Now build the alignment sequence:
  // Walk through both sides, interleaving matched keys with side-only keys.
  // For matched keys: output in matched order.
  // For left-only keys: insert at the position they appear relative to the matched keys.
  // For right-only keys: insert at the position they appear relative to the matched keys.
  // For common-but-unmatched keys (reordered): they go as removed on left + added on right.

  const sequence = [] // { key, onLeft, onRight }

  let leftPtr = 0
  let rightPtr = 0
  let matchPtr = 0

  while (matchPtr < matchedKeys.length) {
    const mk = matchedKeys[matchPtr]

    // Emit left-side keys before this matched key
    while (leftPtr < leftKeys.length && leftKeys[leftPtr] !== mk) {
      const k = leftKeys[leftPtr]
      if (k in rightObj && !matchedSet.has(k)) {
        // Common but reordered key - appears on left before its right-side position
        // Emit as left-only (removed) here; it will appear as right-only (added) later
        sequence.push({ key: k, onLeft: true, onRight: false })
      } else if (!(k in rightObj)) {
        sequence.push({ key: k, onLeft: true, onRight: false })
      }
      leftPtr++
    }

    // Emit right-side keys before this matched key
    while (rightPtr < rightKeys.length && rightKeys[rightPtr] !== mk) {
      const k = rightKeys[rightPtr]
      if (k in leftObj && !matchedSet.has(k)) {
        // Common but reordered key - appears on right before its left-side position
        sequence.push({ key: k, onLeft: false, onRight: true })
      } else if (!(k in leftObj)) {
        sequence.push({ key: k, onLeft: false, onRight: true })
      }
      rightPtr++
    }

    // Emit the matched key
    sequence.push({ key: mk, onLeft: true, onRight: true })
    leftPtr++
    rightPtr++
    matchPtr++
  }

  // Emit remaining left keys
  while (leftPtr < leftKeys.length) {
    const k = leftKeys[leftPtr]
    if (k in rightObj && !matchedSet.has(k)) {
      sequence.push({ key: k, onLeft: true, onRight: false })
    } else if (!(k in rightObj)) {
      sequence.push({ key: k, onLeft: true, onRight: false })
    }
    leftPtr++
  }

  // Emit remaining right keys
  while (rightPtr < rightKeys.length) {
    const k = rightKeys[rightPtr]
    if (k in leftObj && !matchedSet.has(k)) {
      sequence.push({ key: k, onLeft: false, onRight: true })
    } else if (!(k in leftObj)) {
      sequence.push({ key: k, onLeft: false, onRight: true })
    }
    rightPtr++
  }

  // Pre-compute last real index for each side for comma calculation
  let lastLeftSeqIdx = -1
  let lastRightSeqIdx = -1
  for (let i = sequence.length - 1; i >= 0; i--) {
    if (lastLeftSeqIdx === -1 && sequence[i].onLeft) lastLeftSeqIdx = i
    if (lastRightSeqIdx === -1 && sequence[i].onRight) lastRightSeqIdx = i
    if (lastLeftSeqIdx !== -1 && lastRightSeqIdx !== -1) break
  }

  for (let i = 0; i < sequence.length; i++) {
    const { key, onLeft, onRight } = sequence[i]
    const keyStr = `"${key}": `

    const leftComma = (onLeft && i < lastLeftSeqIdx) ? ',' : ''
    const rightComma = (onRight && i < lastRightSeqIdx) ? ',' : ''

    if (onLeft && onRight) {
      // 两侧都有
      const leftVal = leftObj[key]
      const rightVal = rightObj[key]

      if (typeof leftVal === 'object' && leftVal !== null &&
          typeof rightVal === 'object' && rightVal !== null) {
        // 嵌套对象/数组
        const result = alignObjects(leftVal, rightVal, indent + 1)

        // 第一行加上key
        const firstLeft = result.leftLines[0].trim()
        const firstRight = result.rightLines[0].trim()
        leftLines.push(`${innerIndent}${keyStr}${firstLeft}`)
        rightLines.push(`${innerIndent}${keyStr}${firstRight}`)
        lineTypes.push(result.lineTypes[0])

        // 其余行
        for (let j = 1; j < result.leftLines.length; j++) {
          const isLastLine = j === result.leftLines.length - 1
          const lLine = result.leftLines[j] + (isLastLine ? leftComma : '')
          const rLine = result.rightLines[j] + (isLastLine ? rightComma : '')
          leftLines.push(lLine)
          rightLines.push(rLine)
          const origType = result.lineTypes[j]
          lineTypes.push((origType === 'equal' && lLine !== rLine) ? 'modified' : origType)
        }
      } else {
        // 简单值
        const leftValStr = formatSimpleValue(leftVal)
        const rightValStr = formatSimpleValue(rightVal)
        const lLine = `${innerIndent}${keyStr}${leftValStr}${leftComma}`
        const rLine = `${innerIndent}${keyStr}${rightValStr}${rightComma}`
        leftLines.push(lLine)
        rightLines.push(rLine)
        lineTypes.push(lLine === rLine ? 'equal' : 'modified')
      }
    } else if (onLeft) {
      // 只有左侧 (删除) - 右侧使用虚拟占位行
      const lines = formatValueLines(leftObj[key], indent + 1)
      const firstLine = `${innerIndent}${keyStr}${lines[0].trim()}`
      leftLines.push(firstLine)
      rightLines.push('')
      lineTypes.push('removed')

      for (let j = 1; j < lines.length; j++) {
        const isLastLine = j === lines.length - 1
        leftLines.push(lines[j] + (isLastLine ? leftComma : ''))
        rightLines.push('')
        lineTypes.push('removed')
      }
      // 如果是单行，需要加逗号
      if (lines.length === 1) {
        leftLines[leftLines.length - 1] = leftLines[leftLines.length - 1].replace(/,?$/, leftComma)
      }
    } else {
      // 只有右侧 (新增) - 左侧使用虚拟占位行
      const lines = formatValueLines(rightObj[key], indent + 1)
      const firstLine = `${innerIndent}${keyStr}${lines[0].trim()}`
      leftLines.push('')
      rightLines.push(firstLine)
      lineTypes.push('added')

      for (let j = 1; j < lines.length; j++) {
        const isLastLine = j === lines.length - 1
        leftLines.push('')
        rightLines.push(lines[j] + (isLastLine ? rightComma : ''))
        lineTypes.push('added')
      }
      // 如果是单行，需要加逗号
      if (lines.length === 1) {
        rightLines[rightLines.length - 1] = rightLines[rightLines.length - 1].replace(/,?$/, rightComma)
      }
    }
  }

  // 闭括号
  leftLines.push(`${indentStr}}`)
  rightLines.push(`${indentStr}}`)
  lineTypes.push('equal')

  return { leftLines, rightLines, lineTypes }
}

/**
 * 格式化简单值
 */
function formatSimpleValue(value) {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'boolean') return value.toString()
  if (typeof value === 'number') return value.toString()
  return JSON.stringify(value)
}

/**
 * 格式化值为行数组
 */
function formatValueLines(value, indent) {
  const indentStr = '  '.repeat(indent)
  if (value === null) return [`${indentStr}null`]
  if (typeof value !== 'object') return [`${indentStr}${formatSimpleValue(value)}`]
  
  const str = JSON.stringify(value, null, 2)
  return str.split('\n').map(line => indentStr + line)
}

/**
 * 格式化值
 */
function formatValue(value, indentStr) {
  if (value === null) return `${indentStr}null`
  if (value === undefined) return `${indentStr}undefined`
  if (typeof value === 'string') return `${indentStr}${JSON.stringify(value)}`
  if (typeof value !== 'object') return `${indentStr}${value}`
  return `${indentStr}${JSON.stringify(value, null, 2)}`
}
