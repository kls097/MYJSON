// JSON formatter utility

function sortObjectKeysRecursive(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sortObjectKeysRecursive)

  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObjectKeysRecursive(obj[key])
      return result
    }, {})
}

/**
 * 从字符串中提取有效的 JSON 部分
 * 支持处理带有前缀和后缀的 JSON，如：
 *   - 后缀: [...] [ trace_id ]
 *   - 前缀: 2024-01-01 10:00:00 {...}
 *   - 前后缀: INFO: {...} // end
 *   - 复杂前缀: [ trace_id ][{...}] [ trace_id ]
 * @param {string} str - 输入字符串
 * @returns {Object} { prefix, jsonPart, suffix, parsed }
 */
function extractJson(str) {
  const trimmed = str.trim()
  
  // 先尝试直接解析
  try {
    const parsed = JSON.parse(trimmed)
    return { prefix: '', jsonPart: trimmed, suffix: '', parsed }
  } catch (e) {
    // 继续尝试提取
  }
  
  // 找到所有可能的 JSON 起始位置（{ 或 [）
  const possibleStarts = []
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '{' || trimmed[i] === '[') {
      possibleStarts.push(i)
    }
  }
  
  if (possibleStarts.length === 0) {
    throw new Error('Invalid JSON: no { or [ found')
  }
  
  // 从每个可能的起始位置尝试提取有效的 JSON
  for (const startIndex of possibleStarts) {
    const prefix = trimmed.substring(0, startIndex)
    const jsonStart = trimmed.substring(startIndex)
    
    // 使用括号匹配找到 JSON 结束位置
    const result = tryExtractJsonAt(jsonStart)
    if (result) {
      return {
        prefix,
        jsonPart: result.jsonPart,
        suffix: result.suffix,
        parsed: result.parsed
      }
    }
  }
  
  throw new Error('Invalid JSON: no valid JSON found')
}

/**
 * 从给定位置尝试提取 JSON
 */
function tryExtractJsonAt(str) {
  let depth = 0
  let inString = false
  let escape = false
  let jsonEndIndex = -1
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    
    if (escape) {
      escape = false
      continue
    }
    
    if (char === '\\' && inString) {
      escape = true
      continue
    }
    
    if (char === '"' && !escape) {
      inString = !inString
      continue
    }
    
    if (inString) continue
    
    if (char === '{' || char === '[') {
      depth++
    } else if (char === '}' || char === ']') {
      depth--
      if (depth === 0) {
        jsonEndIndex = i
        break
      }
    }
  }
  
  if (jsonEndIndex === -1) {
    return null
  }
  
  const jsonPart = str.substring(0, jsonEndIndex + 1)
  const suffix = str.substring(jsonEndIndex + 1)
  
  // 验证提取的 JSON 是否有效
  try {
    const parsed = JSON.parse(jsonPart)
    return { jsonPart, suffix, parsed }
  } catch (e) {
    return null
  }
}

export function formatJson(jsonStr, indent = 2, sortKeys = false) {
  try {
    const { prefix, parsed, suffix } = extractJson(jsonStr)
    
    let result = parsed
    if (sortKeys) {
      result = sortObjectKeysRecursive(parsed)
    }
    
    const formatted = JSON.stringify(result, null, indent)
    
    // 保留前缀和后缀
    return prefix + formatted + suffix
  } catch (error) {
    throw new Error(`Format error: ${error.message}`)
  }
}

export function minifyJson(jsonStr) {
  try {
    const { prefix, parsed, suffix } = extractJson(jsonStr)
    const minified = JSON.stringify(parsed)
    
    // 保留前缀和后缀
    return prefix + minified + suffix
  } catch (error) {
    throw new Error(`Minify error: ${error.message}`)
  }
}
