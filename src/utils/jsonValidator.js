// JSON validator utility

/**
 * 根据字符位置计算行号
 * @param {string} str - 原始字符串
 * @param {number} position - 字符位置
 * @returns {number} 行号（从1开始）
 */
function getLineNumber(str, position) {
  if (!str || position <= 0) return 1
  
  const substring = str.substring(0, position)
  const lines = substring.split('\n')
  return lines.length
}

export function validateJson(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr)
    return {
      valid: true,
      data: parsed,
      error: null
    }
  } catch (error) {
    // 提取位置信息
    const match = error.message.match(/position (\d+)/)
    const position = match ? parseInt(match[1]) : 0
    
    // 计算行号
    const lineNumber = getLineNumber(jsonStr, position)
    
    // 构建友好的错误信息，只显示行号
    let friendlyError = error.message
    if (position > 0) {
      // 移除原始的 position 信息，替换为行号
      friendlyError = error.message.replace(/at position \d+/, `在第 ${lineNumber} 行`)
    } else {
      friendlyError = `${error.message} (第 ${lineNumber} 行)`
    }

    return {
      valid: false,
      data: null,
      error: friendlyError,
      position,
      line: lineNumber
    }
  }
}

export function getJsonStats(jsonStr) {
  try {
    const charCount = jsonStr.length
    const lineCount = jsonStr.split('\n').length
    const size = new Blob([jsonStr]).size

    // Try to parse for additional stats
    let depth = 0
    let objectCount = 0
    let arrayCount = 0

    try {
      const parsed = JSON.parse(jsonStr)
      const stats = analyzeStructure(parsed)
      depth = stats.depth
      objectCount = stats.objects
      arrayCount = stats.arrays
    } catch (e) {
      // If parsing fails, just return basic stats
    }

    return {
      characters: charCount,
      lines: lineCount,
      size,
      sizeKB: (size / 1024).toFixed(2),
      sizeMB: (size / 1024 / 1024).toFixed(2),
      depth,
      objects: objectCount,
      arrays: arrayCount
    }
  } catch (error) {
    return null
  }
}

function analyzeStructure(obj, currentDepth = 0) {
  let maxDepth = currentDepth
  let objects = 0
  let arrays = 0

  if (obj === null || typeof obj !== 'object') {
    return { depth: maxDepth, objects, arrays }
  }

  if (Array.isArray(obj)) {
    arrays++
    for (const item of obj) {
      const stats = analyzeStructure(item, currentDepth + 1)
      maxDepth = Math.max(maxDepth, stats.depth)
      objects += stats.objects
      arrays += stats.arrays
    }
  } else {
    objects++
    for (const value of Object.values(obj)) {
      const stats = analyzeStructure(value, currentDepth + 1)
      maxDepth = Math.max(maxDepth, stats.depth)
      objects += stats.objects
      arrays += stats.arrays
    }
  }

  return { depth: maxDepth, objects, arrays }
}
