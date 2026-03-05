// JSON 智能合并工具

/**
 * 深度合并两个 JSON 对象
 * @param {*} target - 目标对象
 * @param {*} source - 源对象
 * @param {Object} options - 合并选项
 * @param {string} options.arrayStrategy - 数组合并策略: append/dedupe/replace
 * @param {boolean} options.ignoreNull - 是否忽略 null 值
 * @param {boolean} options.ignoreEmpty - 是否忽略空对象/数组
 * @returns {Object} { result, conflicts }
 */
export function deepMerge(target, source, options = {}) {
  const {
    arrayStrategy = 'append',
    ignoreNull = false,
    ignoreEmpty = false
  } = options

  const conflicts = []
  const result = _deepMerge(target, source, '$', conflicts, {
    arrayStrategy,
    ignoreNull,
    ignoreEmpty
  })

  return { result, conflicts }
}

/**
 * 深度合并内部实现
 */
function _deepMerge(target, source, path, conflicts, options) {
  // 处理 null
  if (target === null || source === null) {
    if (ignoreNull && (target === null || source === null)) {
      return target !== null ? target : source
    }
    if (target !== null && source !== null) {
      return source
    }
    return target !== null ? target : source
  }

  // 处理基本类型
  if (typeof target !== 'object' || typeof source !== 'object') {
    if (target !== source) {
      conflicts.push({
        path,
        type: 'type-conflict',
        leftValue: target,
        rightValue: source,
        message: `类型冲突: ${typeof target} vs ${typeof source}`
      })
    }
    return source
  }

  // 处理数组
  if (Array.isArray(target) && Array.isArray(source)) {
    return mergeArrays(target, source, options.arrayStrategy)
  }

  // 处理对象
  const result = Array.isArray(target) ? [] : { ...target }
  const allKeys = new Set([...Object.keys(target || {}), ...Object.keys(source || {})])

  for (const key of allKeys) {
    const newPath = path === '$' ? `$.${key}` : `${path}.${key}`
    const targetValue = target?.[key]
    const sourceValue = source?.[key]

    // 忽略空值选项
    if (options.ignoreEmpty) {
      if (isEmpty(targetValue) && !isEmpty(sourceValue)) {
        result[key] = sourceValue
        continue
      }
      if (isEmpty(sourceValue) && !isEmpty(targetValue)) {
        result[key] = targetValue
        continue
      }
    }

    // 忽略 null 选项
    if (options.ignoreNull) {
      if (targetValue === null && sourceValue !== null) {
        result[key] = sourceValue
        continue
      }
      if (sourceValue === null && targetValue !== null) {
        result[key] = targetValue
        continue
      }
    }

    // 递归合并 - 嵌套对象
    if (typeof targetValue === 'object' && typeof sourceValue === 'object' &&
        targetValue !== null && sourceValue !== null &&
        !Array.isArray(targetValue) && !Array.isArray(sourceValue)) {
      result[key] = _deepMerge(targetValue, sourceValue, newPath, conflicts, options)
    } 
    // 数组合并
    else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      result[key] = mergeArrays(targetValue, sourceValue, options.arrayStrategy)
    }
    else if (targetValue !== undefined && sourceValue !== undefined) {
      // 类型不同，检测冲突
      if (typeof targetValue !== typeof sourceValue ||
          Array.isArray(targetValue) !== Array.isArray(sourceValue)) {
        conflicts.push({
          path: newPath,
          type: 'type-conflict',
          leftValue: targetValue,
          rightValue: sourceValue,
          message: `类型冲突: ${Array.isArray(targetValue) ? 'array' : typeof targetValue} vs ${Array.isArray(sourceValue) ? 'array' : typeof sourceValue}`
        })
      }
      // 深度合并策略：非对象类型直接覆盖
      result[key] = sourceValue
    } else {
      result[key] = sourceValue !== undefined ? sourceValue : targetValue
    }
  }

  return result
}

/**
 * 覆盖合并 - 右侧完全覆盖左侧
 * @param {*} target - 目标对象
 * @param {*} source - 源对象
 * @returns {Object} { result, conflicts }
 */
export function overrideMerge(target, source) {
  const conflicts = []

  // 检测直接冲突
  if (typeof target === 'object' && typeof source === 'object' &&
      target !== null && source !== null) {
    const targetKeys = new Set(Object.keys(target))
    const sourceKeys = new Set(Object.keys(source))

    for (const key of sourceKeys) {
      if (targetKeys.has(key)) {
        const targetValue = target[key]
        const sourceValue = source[key]

        // 检测类型冲突
        if (typeof targetValue !== typeof sourceValue ||
            Array.isArray(targetValue) !== Array.isArray(sourceValue)) {
          conflicts.push({
            path: `$.${key}`,
            type: 'override-conflict',
            leftValue: targetValue,
            rightValue: sourceValue,
            message: `键 "${key}" 存在类型冲突`
          })
        }
      }
    }
  }

  return {
    result: JSON.parse(JSON.stringify(source)),
    conflicts
  }
}

/**
 * 数组合并
 * @param {Array} target - 目标数组
 * @param {Array} source - 源数组
 * @param {string} strategy - 策略: append/dedupe/replace
 * @returns {Array} 合并后的数组
 */
export function mergeArrays(target = [], source = [], strategy = 'append') {
  if (!Array.isArray(target) || !Array.isArray(source)) {
    return source || target
  }

  switch (strategy) {
    case 'append':
      // 追加模式：合并所有元素
      return [...target, ...source]

    case 'dedupe':
      // 去重模式：基于 JSON 字符串比较去重
      const seen = new Set()
      const deduplicated = []
      for (const item of [...target, ...source]) {
        const key = JSON.stringify(item)
        if (!seen.has(key)) {
          seen.add(key)
          deduplicated.push(item)
        }
      }
      return deduplicated

    case 'replace':
      // 替换模式：完全使用源数组
      return [...source]

    default:
      return [...target, ...source]
  }
}

/**
 * 检测冲突
 * @param {*} left - 左侧 JSON
 * @param {*} right - 右侧 JSON
 * @param {Object} options - 选项
 * @returns {Array} 冲突列表
 */
export function detectConflicts(left, right, options = {}) {
  const conflicts = []
  _detectConflicts(left, right, '$', conflicts, options)
  return conflicts
}

/**
 * 检测冲突内部实现
 */
function _detectConflicts(left, right, path, conflicts, options) {
  // 类型不同
  if (typeof left !== typeof right ||
      Array.isArray(left) !== Array.isArray(right)) {
    conflicts.push({
      path,
      type: 'type-conflict',
      leftValue: left,
      rightValue: right,
      message: `类型不同`
    })
    return
  }

  // 基本类型
  if (typeof left !== 'object' || left === null) {
    if (left !== right) {
      conflicts.push({
        path,
        type: 'value-conflict',
        leftValue: left,
        rightValue: right,
        message: `值不同`
      })
    }
    return
  }

  // 数组
  if (Array.isArray(left)) {
    if (left.length !== right.length) {
      conflicts.push({
        path,
        type: 'length-conflict',
        leftValue: left,
        rightValue: right,
        message: `数组长度不同: ${left.length} vs ${right.length}`
      })
    }
    // 简单比较数组元素
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      _detectConflicts(left[i], right[i], `${path}[${i}]`, conflicts, options)
    }
    return
  }

  // 对象
  const leftKeys = new Set(Object.keys(left))
  const rightKeys = new Set(Object.keys(right))
  const allKeys = new Set([...leftKeys, ...rightKeys])

  for (const key of allKeys) {
    const newPath = path === '$' ? `$.${key}` : `${path}.${key}`

    if (!leftKeys.has(key)) {
      conflicts.push({
        path: newPath,
        type: 'added-in-right',
        leftValue: undefined,
        rightValue: right[key],
        message: `右侧新增键: ${key}`
      })
    } else if (!rightKeys.has(key)) {
      conflicts.push({
        path: newPath,
        type: 'removed-in-right',
        leftValue: left[key],
        rightValue: undefined,
        message: `右侧删除键: ${key}`
      })
    } else {
      _detectConflicts(left[key], right[key], newPath, conflicts, options)
    }
  }
}

/**
 * 三方合并
 * @param {*} base - 基础版本
 * @param {*} left - 左侧版本
 * @param {*} right - 右侧版本
 * @param {Object} options - 合并选项
 * @returns {Object} { result, conflicts, status }
 */
export function threeWayMerge(base, left, right, options = {}) {
  const conflicts = []
  const statusMap = {}

  // 比较 base vs left
  const leftChanges = detectChanges(base, left)
  // 比较 base vs right
  const rightChanges = detectChanges(base, right)

  // 计算合并结果
  const result = _threeWayMerge(base, left, right, '$', conflicts, statusMap, options)

  // 生成状态摘要
  const status = summarizeStatus(statusMap, conflicts)

  return { result, conflicts, status }
}

/**
 * 检测变化
 */
function detectChanges(base, target) {
  if (base === target) return []
  if (base === null || target === null) return ['value-changed']

  if (typeof base !== 'object' || typeof target !== 'object') {
    return base === target ? [] : ['value-changed']
  }

  if (Array.isArray(base) !== Array.isArray(target)) {
    return ['type-changed']
  }

  const changes = []
  const baseKeys = new Set(Object.keys(base || {}))
  const targetKeys = new Set(Object.keys(target || {}))

  for (const key of targetKeys) {
    if (!baseKeys.has(key)) {
      changes.push({ type: 'added', key })
    }
  }

  for (const key of baseKeys) {
    if (!targetKeys.has(key)) {
      changes.push({ type: 'removed', key })
    }
  }

  return changes
}

/**
 * 三方合并内部实现
 */
function _threeWayMerge(base, left, right, path, conflicts, statusMap, options) {
  // 处理 null/undefined
  if (left === null || left === undefined) {
    if (right === null || right === undefined) {
      statusMap[path] = 'unchanged'
      return base
    }
    // 右侧有值，左侧没有
    if (base === null || base === undefined) {
      statusMap[path] = 'right-modified'  // 新增
    } else {
      statusMap[path] = 'right-modified'
    }
    return right
  }
  if (right === null || right === undefined) {
    // 左侧有值，右侧没有
    if (base === null || base === undefined) {
      statusMap[path] = 'left-modified'  // 新增
    } else {
      statusMap[path] = 'left-modified'
    }
    return left
  }

  // 基本类型
  if (typeof left !== 'object' || typeof right !== 'object') {
    if (left !== right) {
      // 双方修改不同，冲突
      if (base !== left && base !== right) {
        conflicts.push({
          path,
          type: 'three-way-conflict',
          baseValue: base,
          leftValue: left,
          rightValue: right,
          message: '双方都修改了值，且修改不同'
        })
        statusMap[path] = 'conflict'
      } else {
        // 只有一侧修改
        if (base === left) {
          // 左侧等于 base，说明右侧修改了
          statusMap[path] = 'right-modified'
          return right
        } else if (base === right) {
          // 右侧等于 base，说明左侧修改了
          statusMap[path] = 'left-modified'
          return left
        } else {
          statusMap[path] = 'conflict'
          return right  // 默认返回右侧
        }
      }
    } else {
      statusMap[path] = 'unchanged'
    }
    return right
  }

  // 数组 - 简单处理：使用右侧
  if (Array.isArray(left) || Array.isArray(right)) {
    if (Array.isArray(left) && Array.isArray(right)) {
      if (JSON.stringify(left) !== JSON.stringify(right)) {
        if ((base === null || base === undefined || !Array.isArray(base)) ||
            (JSON.stringify(base) !== JSON.stringify(left) &&
             JSON.stringify(base) !== JSON.stringify(right))) {
          conflicts.push({
            path,
            type: 'three-way-conflict',
            baseValue: base,
            leftValue: left,
            rightValue: right,
            message: '双方都修改了数组'
          })
          statusMap[path] = 'conflict'
        } else {
          statusMap[path] = base === left ? 'right-modified' : 'left-modified'
        }
      } else {
        statusMap[path] = 'unchanged'
      }
    } else {
      // 类型冲突
      statusMap[path] = 'conflict'
    }
    return right || left
  }

  // 对象 - 递归合并
  const result = {}
  const baseKeys = new Set(Object.keys(base || {}))
  const leftKeys = new Set(Object.keys(left || {}))
  const rightKeys = new Set(Object.keys(right || {}))
  const allKeys = new Set([...leftKeys, ...rightKeys])

  for (const key of allKeys) {
    const newPath = path === '$' ? `$.${key}` : `${path}.${key}`
    const baseValue = base?.[key]
    const leftValue = left?.[key]
    const rightValue = right?.[key]
    const baseHasKey = baseKeys.has(key)

    // 处理新增键的情况
    if (!leftKeys.has(key) && rightKeys.has(key)) {
      // 右侧新增
      if (!baseHasKey) {
        result[key] = rightValue
        statusMap[newPath] = 'right-modified'
        continue
      }
    } else if (leftKeys.has(key) && !rightKeys.has(key)) {
      // 左侧新增
      if (!baseHasKey) {
        result[key] = leftValue
        statusMap[newPath] = 'left-modified'
        continue
      }
    }

    // 对于两边都有值的键，进行三方合并
    if (leftKeys.has(key) && rightKeys.has(key)) {
      result[key] = _threeWayMerge(baseValue, leftValue, rightValue, newPath, conflicts, statusMap, options)
    } else if (leftKeys.has(key)) {
      // 左侧有，右侧没有（且 base 也没有，否则上面的新增处理了）
      result[key] = leftValue
      statusMap[newPath] = 'left-modified'
    } else if (rightKeys.has(key)) {
      // 右侧有，左侧没有（且 base 也没有）
      result[key] = rightValue
      statusMap[newPath] = 'right-modified'
    }
  }

  return result
}

/**
 * 汇总状态
 */
function summarizeStatus(statusMap, conflicts) {
  const counts = {
    unchanged: 0,
    'left-modified': 0,
    'right-modified': 0,
    conflict: 0
  }

  for (const status of Object.values(statusMap)) {
    if (counts[status] !== undefined) {
      counts[status]++
    }
  }

  return {
    counts,
    hasConflicts: conflicts.length > 0,
    conflictCount: conflicts.length
  }
}

/**
 * 判断是否为空
 */
function isEmpty(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  if (typeof value === 'object' && Object.keys(value).length === 0) return true
  return false
}
