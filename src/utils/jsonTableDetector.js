/**
 * JSON 数组智能检测与路径操作工具
 * 在 JSON 结构中自动发现可作为表格展示的数组，并提供路径读写能力
 * 纯函数模块，无 Vue 依赖，无外部依赖
 */

/** @typedef {{ path: string, data: any[], columns: string[], rowCount: number, depth: number }} TableCandidate */

/**
 * 检测 JSON 字符串中所有可作为表格展示的数组
 * @param {string} jsonString - 原始 JSON 字符串
 * @returns {TableCandidate[]} 检测到的表格候选数组列表
 */
export function detectTableCandidates(jsonString) {
  let parsed
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return []
  }

  const results = []

  // 使用 WeakSet 检测循环引用
  const seen = new WeakSet()

  /**
   * @param {any} value - 当前值
   * @param {string} path - 当前路径
   * @param {number} depth - 当前深度
   */
  function walk(value, path, depth) {
    if (depth > 10) return
    if (value === null || typeof value !== 'object') return
    if (seen.has(value)) return // 跳过循环引用
    seen.add(value)

    if (Array.isArray(value)) {
      if (isTableCandidate(value)) {
        results.push({
          path,
          data: value,
          columns: extractColumns(value),
          rowCount: value.length,
          depth
        })
      }
      // 继续遍历数组元素（可能嵌套对象里还有数组）
      for (let i = 0; i < value.length; i++) {
        walk(value[i], `${path}[${i}]`, depth + 1)
      }
    } else if (isPlainObject(value)) {
      const keys = Object.keys(value)
      for (const key of keys) {
        walk(value[key], path === '$' ? `$.${key}` : `${path}.${key}`, depth + 1)
      }
    }
  }

  if (Array.isArray(parsed)) {
    // 顶层是数组，从 $ 开始
    walk(parsed, '$', 0)
  } else if (isPlainObject(parsed)) {
    // 顶层是对象，遍历其属性
    walk(parsed, '$', 0)
  }

  return results
}

/**
 * 判断数组是否可作为表格候选
 * 条件：长度 ≥ 2，所有元素都是非 null 的普通对象，所有键的并集 ≤ 50
 * @param {any[]} arr - 待检测数组
 * @returns {boolean} 是否符合表格候选条件
 */
export function isTableCandidate(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return false

  const keySet = new Set()
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    if (item === null || typeof item !== 'object' || Array.isArray(item) || !isPlainObject(item)) {
      return false
    }
    // 大数组仅采样前 100 个元素检测键数（性能优化）
    const sample = i < 100
    if (sample) {
      const keys = Object.keys(item)
      for (const k of keys) {
        keySet.add(k)
        if (keySet.size > 50) return false
      }
    }
  }
  return keySet.size > 0
}

/**
 * 将嵌套对象的键扁平化为点分隔路径
 * @param {Object} obj - 要扁平化的对象
 * @param {number} [maxDepth=3] - 最大扁平化深度
 * @param {string} [prefix=''] - 键前缀（递归用）
 * @returns {Record<string, any>} 扁平化后的键值对
 */
export function flattenObjectKeys(obj, maxDepth = 3, prefix = '') {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return {}
  }

  const result = {}

  /**
   * @param {any} current - 当前值
   * @param {string} currentPrefix - 当前前缀
   * @param {number} currentDepth - 当前深度
   */
  function recurse(current, currentPrefix, currentDepth) {
    if (current === null || typeof current !== 'object') {
      result[currentPrefix] = current
      return
    }

    // 数组保持原样，不展开
    if (Array.isArray(current)) {
      result[currentPrefix] = current
      return
    }

    if (!isPlainObject(current)) {
      result[currentPrefix] = current
      return
    }

    // 达到最大深度，停止扁平化
    if (currentDepth >= maxDepth) {
      result[currentPrefix] = current
      return
    }

    const keys = Object.keys(current)
    if (keys.length === 0) {
      result[currentPrefix] = current
      return
    }

    for (const key of keys) {
      const childPrefix = currentPrefix === '' ? key : `${currentPrefix}.${key}`
      recurse(current[key], childPrefix, currentDepth + 1)
    }
  }

  recurse(obj, prefix, 0)
  return result
}

/**
 * 通过 JSONPath 风格的路径获取对象中的值
 * @param {Object} obj - 解析后的 JSON 对象
 * @param {string} path - 路径字符串，如 '$.users' 或 '$.data.orders'
 * @returns {any} 路径对应的值，未找到返回 undefined
 */
export function getValueByPath(obj, path) {
  if (obj === null || obj === undefined) return undefined
  if (typeof path !== 'string' || path.length === 0) return undefined

  // 去除 $ 前缀
  let normalizedPath = path
  if (normalizedPath === '$') return obj
  if (normalizedPath.startsWith('$.')) {
    normalizedPath = normalizedPath.slice(2)
  } else if (normalizedPath.startsWith('$')) {
    normalizedPath = normalizedPath.slice(1)
  }

  if (normalizedPath.length === 0) return obj

  const segments = normalizedPath.split('.')
  let current = obj

  for (const segment of segments) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined

    // 支持数组索引，如 'items[0]'
    const arrayMatch = segment.match(/^(.+?)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, key, indexStr] = arrayMatch
      current = current[key]
      if (!Array.isArray(current)) return undefined
      current = current[parseInt(indexStr, 10)]
    } else {
      current = current[segment]
    }
  }

  return current
}

/**
 * 通过路径设置对象中的值（不可变，返回新对象）
 * @param {Object} obj - 原始对象
 * @param {string} path - 路径字符串
 * @param {any} value - 要设置的新值
 * @returns {Object} 新的对象（原对象不被修改）
 */
export function setValueByPath(obj, path, value) {
  if (path === '$' || path === '' || !path) {
    // 替换整个根
    return value
  }

  let normalizedPath = path
  if (normalizedPath.startsWith('$.')) {
    normalizedPath = normalizedPath.slice(2)
  } else if (normalizedPath.startsWith('$')) {
    normalizedPath = normalizedPath.slice(1)
  }

  const segments = normalizedPath.split('.')

  /**
   * 递归克隆并设置值
   * @param {any} current - 当前节点
   * @param {number} index - 当前路径段索引
   * @returns {any} 克隆后的新节点
   */
  function cloneAndSet(current, index) {
    if (index === segments.length) {
      return value
    }

    const segment = segments[index]
    const arrayMatch = segment.match(/^(.+?)\[(\d+)\]$/)

    if (arrayMatch) {
      const [, key, indexStr] = arrayMatch
      const arrIndex = parseInt(indexStr, 10)
      const clonedSource = current !== null && typeof current === 'object'
        ? { ...current }
        : {}
      const originalArray = clonedSource[key]
      if (!Array.isArray(originalArray)) {
        // 不存在则创建新数组
        const newArr = []
        newArr[arrIndex] = cloneAndSet(undefined, index + 1)
        clonedSource[key] = newArr
      } else {
        const clonedArray = [...originalArray]
        clonedArray[arrIndex] = cloneAndSet(clonedArray[arrIndex], index + 1)
        clonedSource[key] = clonedArray
      }
      return clonedSource
    }

    // 普通对象属性
    const cloned = current !== null && typeof current === 'object' && !Array.isArray(current)
      ? { ...current }
      : {}
    cloned[segment] = cloneAndSet(cloned[segment], index + 1)
    return cloned
  }

  return cloneAndSet(obj, 0)
}

/**
 * 从对象数组中提取所有列名（扁平化后的键的有序并集）
 * 大数组（>1000）仅采样前 100 个元素以优化性能
 * @param {Object[]} data - 对象数组
 * @returns {string[]} 排序后的唯一列名列表
 */
export function extractColumns(data) {
  if (!Array.isArray(data) || data.length === 0) return []

  const keySet = new Set()
  // 性能优化：大数组仅采样前 100 个
  const sampleCount = data.length > 1000 ? 100 : data.length

  for (let i = 0; i < sampleCount; i++) {
    const item = data[i]
    if (item !== null && typeof item === 'object' && !Array.isArray(item) && isPlainObject(item)) {
      const flat = flattenObjectKeys(item)
      const keys = Object.keys(flat)
      for (const k of keys) {
        keySet.add(k)
      }
    }
  }

  return Array.from(keySet).sort()
}

// ─── 内部辅助函数 ──────────────────────────────────────────

/**
 * 判断值是否为普通对象（通过 {} 或 Object.create(null) 创建）
 * @param {any} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}
