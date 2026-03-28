// JSON 合并逻辑 Composable
import { ref, computed, nextTick } from 'vue'
import {
  deepMerge,
  overrideMerge,
  mergeArrays,
  detectConflicts,
  threeWayMerge
} from '../utils/jsonMerger'

export function useJsonMerge() {
  // 合并状态
  const leftJson = ref('')
  const rightJson = ref('')
  const baseJson = ref('')

  // 合并策略
  const mergeStrategy = ref('deep') // deep / override
  const arrayStrategy = ref('append') // append / dedupe / replace

  // 合并结果
  const mergeResult = ref(null)
  const mergeChanges = ref(null) // 存储合并变更类型: added/modified/unchanged
  const conflicts = ref([])
  const threeWayStatus = ref(null)
  
  // 错误状态
  const error = ref(null)
  
  // 解析状态
  const isValidLeft = ref(true)
  const isValidRight = ref(true)
  const isValidBase = ref(true)
  
  // 合并选项
  const mergeOptions = computed(() => ({
    arrayStrategy: arrayStrategy.value,
    ignoreNull: false,
    ignoreEmpty: false
  }))
  
  /**
   * 解析 JSON
   */
  function parseJson(jsonStr) {
    if (!jsonStr || jsonStr.trim() === '') {
      return { data: null, valid: false }
    }
    try {
      return { data: JSON.parse(jsonStr), valid: true }
    } catch (e) {
      return { data: null, valid: false, error: e.message }
    }
  }
  
  /**
   * 执行两方合并
   */
  function executeMerge() {
    error.value = null
    conflicts.value = []
    mergeChanges.value = null

    // 解析 JSON
    const left = parseJson(leftJson.value)
    const right = parseJson(rightJson.value)

    isValidLeft.value = left.valid
    isValidRight.value = right.valid

    if (!left.valid) {
      error.value = `左侧 JSON 解析错误: ${left.error}`
      return null
    }
    if (!right.valid) {
      error.value = `右侧 JSON 解析错误: ${right.error}`
      return null
    }

    // 执行合并
    try {
      let result
      if (mergeStrategy.value === 'deep') {
        result = deepMerge(left.data, right.data, mergeOptions.value)
      } else {
        result = overrideMerge(left.data, right.data)
      }

      mergeResult.value = result.result
      conflicts.value = result.conflicts

      // 计算变更类型
      mergeChanges.value = computeMergeChanges(left.data, right.data, result.result)

      return result
    } catch (e) {
      error.value = `合并失败: ${e.message}`
      return null
    }
  }

  /**
   * 计算合并变更类型
   * @param {*} left - 左侧原始对象
   * @param {*} right - 右侧原始对象
   * @param {*} result - 合并结果
   * @returns {Array} 变更类型数组
   */
  function computeMergeChanges(left, right, result) {
    if (!left || !right || !result) return []

    const changes = []

    // 简化逻辑：直接比较左右两侧
    collectChanges(left, right, result, '', changes)

    return changes
  }

  /**
   * 递归收集变更
   */
  function collectChanges(left, right, result, path, changes) {
    const leftObj = left || {}
    const rightObj = right || {}
    const resultObj = result || {}

    const allKeys = new Set([
      ...Object.keys(leftObj),
      ...Object.keys(rightObj),
      ...Object.keys(resultObj)
    ])

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key
      const leftVal = leftObj[key]
      const rightVal = rightObj[key]
      const resultVal = resultObj[key]

      // 比较逻辑
      if (rightVal !== undefined && leftVal === undefined) {
        // 右侧新增
        changes.push({ path: newPath, type: 'added' })
      } else if (rightVal !== undefined && leftVal !== undefined) {
        if (JSON.stringify(leftVal) !== JSON.stringify(rightVal)) {
          // 值发生变化 -> 覆盖
          changes.push({ path: newPath, type: 'modified' })
        } else {
          // 值相同 -> 未变
          changes.push({ path: newPath, type: 'unchanged' })
        }
      }

      // 递归处理对象
      if (typeof leftVal === 'object' && leftVal !== null &&
          typeof rightVal === 'object' && rightVal !== null &&
          !Array.isArray(leftVal) && !Array.isArray(rightVal)) {
        collectChanges(leftVal, rightVal, resultVal, newPath, changes)
      }
    }
  }
  
  /**
   * 检测冲突
   */
  function checkConflicts() {
    const left = parseJson(leftJson.value)
    const right = parseJson(rightJson.value)
    
    if (!left.valid || !right.valid) {
      return []
    }
    
    return detectConflicts(left.data, right.data)
  }
  
  /**
   * 执行三方合并
   */
  function executeThreeWayMerge() {
    error.value = null
    conflicts.value = []
    
    // 解析 JSON
    const base = parseJson(baseJson.value)
    const left = parseJson(leftJson.value)
    const right = parseJson(rightJson.value)
    
    isValidBase.value = base.valid
    isValidLeft.value = left.valid
    isValidRight.value = right.valid
    
    if (!base.valid) {
      error.value = `基础版本 JSON 解析错误: ${base.error}`
      return null
    }
    if (!left.valid) {
      error.value = `左侧 JSON 解析错误: ${left.error}`
      return null
    }
    if (!right.valid) {
      error.value = `右侧 JSON 解析错误: ${right.error}`
      return null
    }
    
    // 执行三方合并
    try {
      const result = threeWayMerge(base.data, left.data, right.data, mergeOptions.value)
      
      mergeResult.value = result.result
      conflicts.value = result.conflicts
      threeWayStatus.value = result.status
      
      return result
    } catch (e) {
      error.value = `三方合并失败: ${e.message}`
      return null
    }
  }
  
  /**
   * 解决冲突 - 保留左侧
   */
  function resolveConflictKeepLeft(conflictPath) {
    if (!mergeResult.value) return
    
    // 简单实现：将结果中对应路径的值设为 undefined（由左侧值替代）
    // 实际实现需要更复杂的路径处理
    const parts = conflictPath.replace(/^\$\.?/, '').split('.')
    let current = mergeResult.value
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (current && typeof current === 'object') {
        current = current[parts[i]]
      }
    }
    
    // 移除冲突项
    conflicts.value = conflicts.value.filter(c => c.path !== conflictPath)
  }
  
  /**
   * 解决冲突 - 保留右侧
   */
  function resolveConflictKeepRight(conflictPath) {
    // 右侧值已经在合并结果中，只需移除冲突标记
    conflicts.value = conflicts.value.filter(c => c.path !== conflictPath)
  }
  
  /**
   * 格式化合并结果
   */
  function formatResult(pretty = true) {
    if (!mergeResult.value) return ''
    
    if (pretty) {
      return JSON.stringify(mergeResult.value, null, 2)
    }
    return JSON.stringify(mergeResult.value)
  }
  
  /**
   * 复制结果到剪贴板
   */
  async function copyResult() {
    const text = formatResult()
    
    if (window.utools && window.utools.writeClipboardText) {
      window.utools.writeClipboardText(text)
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    }
    
    return text
  }
  
  /**
   * 重置
   */
  function reset() {
    leftJson.value = ''
    rightJson.value = ''
    baseJson.value = ''
    mergeResult.value = null
    mergeChanges.value = null
    conflicts.value = []
    threeWayStatus.value = null
    error.value = null
    isValidLeft.value = true
    isValidRight.value = true
    isValidBase.value = true
  }

  /**
   * 设置初始数据
   */
  function setInitialData(left, right) {
    leftJson.value = left || ''
    rightJson.value = right || ''
    // 自动尝试合并
    if (left && right) {
      nextTick(() => {
        executeMerge()
      })
    }
  }

  /**
   * 导入合并结果到主编辑器
   */
  function applyResult() {
    if (mergeResult.value) {
      return formatResult(true)
    }
    return null
  }

  // 辅助函数：nextTick
  function nextTick(fn) {
    setTimeout(fn, 0)
  }

  return {
    // 状态
    leftJson,
    rightJson,
    baseJson,
    mergeStrategy,
    arrayStrategy,
    mergeResult,
    mergeChanges,
    conflicts,
    threeWayStatus,
    error,
    isValidLeft,
    isValidRight,
    isValidBase,
    mergeOptions,

    // 方法
    executeMerge,
    checkConflicts,
    executeThreeWayMerge,
    resolveConflictKeepLeft,
    resolveConflictKeepRight,
    formatResult,
    copyResult,
    reset,
    setInitialData,
    applyResult
  }
}
