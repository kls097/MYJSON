// JSON unescaper utility - 反转义 JSON 字符串

/**
 * 反转义 JSON 字符串
 * 将转义的 JSON 字符串恢复为正常的 JSON
 * 例如: "{\"name\":\"value\"}" -> {"name":"value"}
 * 支持多层嵌套转义的正确处理
 */
export function unescapeJson(jsonStr) {
  if (!jsonStr || typeof jsonStr !== 'string') {
    throw new Error('输入必须是字符串')
  }

  // 先去除首尾空白
  let content = jsonStr.trim()

  // 如果字符串被引号包裹,先移除外层引号
  if ((content.startsWith('"') && content.endsWith('"')) ||
      (content.startsWith("'") && content.endsWith("'"))) {
    content = content.slice(1, -1)
  }

  // 使用状态机进行精确的反转义处理
  let result = ''
  let i = 0
  
  while (i < content.length) {
    if (content[i] === '\\' && i + 1 < content.length) {
      const nextChar = content[i + 1]
      switch (nextChar) {
        case '"':
          result += '"'
          i += 2
          break
        case "'":
          result += "'"
          i += 2
          break
        case '\\':
          result += '\\'
          i += 2
          break
        case 'n':
          result += '\n'
          i += 2
          break
        case 'r':
          result += '\r'
          i += 2
          break
        case 't':
          result += '\t'
          i += 2
          break
        case 'b':
          result += '\b'
          i += 2
          break
        case 'f':
          result += '\f'
          i += 2
          break
        case 'u':
          // 处理 Unicode 转义 \uXXXX
          if (i + 5 < content.length) {
            const hex = content.substring(i + 2, i + 6)
            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
              result += String.fromCharCode(parseInt(hex, 16))
              i += 6
              break
            }
          }
          // 不是有效的 Unicode 转义，保留原样
          result += content[i]
          i++
          break
        default:
          // 未知转义序列，保留反斜杠和下一个字符
          result += content[i]
          i++
      }
    } else {
      result += content[i]
      i++
    }
  }

  return result
}

/**
 * 智能反转义 - 直接执行反转义操作
 * 去转义功能不判断输入是否为标准JSON，直接将转义字符串转换
 */
export function smartUnescape(jsonStr) {
  if (!jsonStr || typeof jsonStr !== 'string') {
    throw new Error('输入必须是字符串')
  }

  // 直接执行反转义操作
  return unescapeJson(jsonStr)
}
