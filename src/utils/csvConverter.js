// JSON ↔ CSV 双向转换工具

/**
 * JSON 转 CSV
 * @param {string} jsonString - JSON 字符串（需为数组）
 * @param {Object} options - 转换选项
 * @param {string} options.separator - 分隔符，默认 ','
 * @param {boolean} options.header - 是否包含表头，默认 true
 * @param {boolean} options.flatten - 是否扁平化嵌套对象，默认 true
 * @param {string} options.flattenSeparator - 扁平化分隔符，默认 '.'
 * @returns {{ result: string, error: string|null }}
 */
export function jsonToCsv(jsonString, options = {}) {
  try {
    const data = JSON.parse(jsonString)
    const {
      separator = ',',
      header = true,
      flatten = true,
      flattenSeparator = '.'
    } = options

    if (!Array.isArray(data)) {
      return { result: '', error: 'JSON 必须是数组格式才能转换为 CSV' }
    }

    if (data.length === 0) {
      return { result: '', error: null }
    }

    // 扁平化数据
    const flatData = flatten ? data.map(item => flattenObject(item, flattenSeparator)) : data

    // 收集所有键（表头）
    const headers = new Set()
    for (const item of flatData) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        for (const key of Object.keys(item)) {
          headers.add(key)
        }
      }
    }

    const headerList = [...headers]
    const lines = []

    // 表头行
    if (header) {
      lines.push(headerList.map(h => escapeCsvField(h, separator)).join(separator))
    }

    // 数据行
    for (const item of flatData) {
      const row = headerList.map(h => {
        const value = item && typeof item === 'object' ? item[h] : ''
        if (value === null || value === undefined) return ''
        if (Array.isArray(value) || typeof value === 'object') {
          return escapeCsvField(JSON.stringify(value), separator)
        }
        return escapeCsvField(String(value), separator)
      })
      lines.push(row.join(separator))
    }

    return { result: lines.join('\n'), error: null }
  } catch (e) {
    return { result: '', error: `JSON 转 CSV 失败: ${e.message}` }
  }
}

/**
 * CSV 转 JSON
 * @param {string} csvString - CSV 字符串
 * @param {Object} options - 转换选项
 * @param {string} options.separator - 分隔符，默认 ','（自动检测）
 * @param {boolean} options.header - 是否包含表头，默认 true
 * @param {boolean} options.pretty - 是否格式化输出，默认 true
 * @returns {{ result: string, error: string|null }}
 */
export function csvToJson(csvString, options = {}) {
  try {
    let { separator = ',', pretty = true } = options

    if (!csvString || !csvString.trim()) {
      return { result: '[]', error: null }
    }

    // 自动检测分隔符
    const firstLine = csvString.split('\n')[0]
    const tabCount = (firstLine.match(/\t/g) || []).length
    const commaCount = (firstLine.match(/,/g) || []).length
    const semicolonCount = (firstLine.match(/;/g) || []).length
    if (tabCount > commaCount && tabCount > semicolonCount) separator = '\t'
    else if (semicolonCount > commaCount) separator = ';'

    const rows = parseCsvRows(csvString, separator)
    if (rows.length === 0) {
      return { result: '[]', error: null }
    }

    // 第一行作为表头
    const headers = rows[0]
    const result = []

    for (let i = 1; i < rows.length; i++) {
      const obj = {}
      for (let j = 0; j < headers.length; j++) {
        const value = rows[i][j] || ''
        obj[headers[j]] = parseCsvValue(value)
      }
      result.push(obj)
    }

    const jsonStr = pretty
      ? JSON.stringify(result, null, 2)
      : JSON.stringify(result)

    return { result: jsonStr, error: null }
  } catch (e) {
    return { result: '', error: `CSV 转 JSON 失败: ${e.message}` }
  }
}

// ============ 内部辅助函数 ============

/**
 * 扁平化嵌套对象
 */
function flattenObject(obj, sep = '.', prefix = '') {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { [prefix]: obj }
  }

  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${sep}${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, sep, newKey))
    } else {
      result[newKey] = value
    }
  }
  return result
}

/**
 * 转义 CSV 字段
 */
function escapeCsvField(field, separator) {
  if (field === null || field === undefined) return ''
  const str = String(field)
  if (str.includes(separator) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

/**
 * 解析 CSV 行
 */
function parseCsvRows(csvString, separator) {
  const rows = []
  let current = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < csvString.length; i++) {
    const char = csvString[i]
    const nextChar = csvString[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else {
      if (char === '"' && field === '') {
        inQuotes = true
      } else if (char === separator) {
        current.push(field)
        field = ''
      } else if (char === '\r' && nextChar === '\n') {
        current.push(field)
        field = ''
        if (current.length > 0 && current.some(f => f !== '')) {
          rows.push(current)
        }
        current = []
        i++
      } else if (char === '\n') {
        current.push(field)
        field = ''
        if (current.length > 0 && current.some(f => f !== '')) {
          rows.push(current)
        }
        current = []
      } else {
        field += char
      }
    }
  }

  // 处理最后一个字段
  if (field || current.length > 0) {
    current.push(field)
    if (current.some(f => f !== '')) {
      rows.push(current)
    }
  }

  return rows
}

/**
 * 解析 CSV 值，尝试自动转换类型
 */
function parseCsvValue(value) {
  if (value === '') return ''
  if (value === 'null') return null
  if (value === 'true') return true
  if (value === 'false') return false

  // 尝试数字
  const num = Number(value)
  if (!isNaN(num) && value.trim() !== '') {
    return num
  }

  return value
}
