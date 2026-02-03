/**
 * Mock 数据生成工具
 * 使用 json-schema-faker 和 faker 生成符合 Schema 的测试数据
 */
import jsf from 'json-schema-faker'

/**
 * Mock 生成选项
 * @typedef {Object} MockOptions
 * @property {number} count - 生成数量
 * @property {string} locale - 语言区域 (zh_CN, en, ja)
 * @property {number|null} seed - 随机种子
 * @property {boolean} asArray - 是否生成数组
 * @property {string|null} template - 模板名称
 * @property {Object} customValues - 自定义字段值
 * @property {Object} config - json-schema-faker 配置
 */

const defaultOptions = {
  count: 1,
  locale: 'zh_CN',
  seed: null,
  asArray: false,
  template: null,
  customValues: {},
  config: {
    alwaysFakeOptionals: true,
    useDefaultValue: true,
    useExamplesValue: true,
    fixedProbabilities: false,
    optionalsProbability: 0.8,
    maxItems: 5,
    minItems: 1,
    maxLength: 50,
    minLength: 1
  }
}

/**
 * 生成 Mock 数据
 * @param {string|Object} schema - JSON Schema 字符串或对象
 * @param {MockOptions} options - 生成选项
 * @returns {string} 生成的 Mock JSON 数据字符串
 */
export function generateMockData(schema, options = {}) {
  const opts = { ...defaultOptions, ...options }
  
  try {
    // 解析 Schema
    const schemaObj = typeof schema === 'string' ? JSON.parse(schema) : schema
    
    // 配置 jsf
    configureJsf(opts.config, opts.seed)
    
    // 如果是数组模式或 count > 1
    if (opts.asArray || opts.count > 1) {
      const count = opts.asArray ? opts.count : 1
      const result = []
      
      for (let i = 0; i < count; i++) {
        // 设置不同的种子以保证多样性
        if (opts.seed !== null) {
          jsf.seed(opts.seed + i)
        }
        
        let mockData = jsf.generate(schemaObj)
        
        // 应用自定义值
        if (opts.customValues && Object.keys(opts.customValues).length > 0) {
          mockData = applyCustomValues(mockData, opts.customValues)
        }
        
        result.push(mockData)
      }
      
      // 重置种子
      if (opts.seed !== null) {
        jsf.seed(opts.seed)
      }
      
      return JSON.stringify(opts.asArray ? result : result[0], null, 2)
    }
    
    // 生成单个对象
    let mockData = jsf.generate(schemaObj)
    
    // 应用自定义值
    if (opts.customValues && Object.keys(opts.customValues).length > 0) {
      mockData = applyCustomValues(mockData, opts.customValues)
    }
    
    return JSON.stringify(mockData, null, 2)
  } catch (error) {
    throw new Error(`生成 Mock 数据失败: ${error.message}`)
  }
}

/**
 * 配置 json-schema-faker
 * @param {Object} config - 配置对象
 * @param {number|null} seed - 随机种子
 */
function configureJsf(config, seed) {
  jsf.option(config)
  
  if (seed !== null) {
    jsf.seed(seed)
  }
}

/**
 * 应用自定义值到 Mock 数据
 * @param {Object} data - Mock 数据
 * @param {Object} customValues - 自定义值映射
 * @returns {Object} 修改后的数据
 */
function applyCustomValues(data, customValues) {
  const result = { ...data }
  
  Object.entries(customValues).forEach(([path, value]) => {
    setValueAtPath(result, path, value)
  })
  
  return result
}

/**
 * 在指定路径设置值
 * @param {Object} obj - 对象
 * @param {string} path - 路径 (如 "user.name" 或 "items[0].id")
 * @param {*} value - 值
 */
function setValueAtPath(obj, path, value) {
  const keys = path.split(/\.|\[|\]/).filter(k => k)
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current)) {
      // 如果路径不存在，创建空对象或数组
      const nextKey = keys[i + 1]
      current[key] = /^\d+$/.test(nextKey) ? [] : {}
    }
    current = current[key]
  }
  
  current[keys[keys.length - 1]] = value
}

/**
 * 批量生成 Mock 数据
 * @param {string|Object} schema - JSON Schema
 * @param {number} count - 数量
 * @param {MockOptions} options - 其他选项
 * @returns {Array} Mock 数据数组
 */
export function generateMockBatch(schema, count, options = {}) {
  const opts = { ...options, count, asArray: true }
  const result = generateMockData(schema, opts)
  return JSON.parse(result)
}

/**
 * 生成 Mock 数据并返回数组格式
 * @param {string|Object} schema - JSON Schema
 * @param {number} count - 数量
 * @param {MockOptions} options - 其他选项
 * @returns {string} JSON 数组字符串
 */
export function generateMockArray(schema, count, options = {}) {
  const opts = { ...options, count, asArray: true }
  return generateMockData(schema, opts)
}

/**
 * 保存 Mock 配置模板
 * @param {string} name - 模板名称
 * @param {Object} config - 配置对象
 */
export function saveMockConfig(name, config) {
  try {
    const storageKey = `mock_config_${name}`
    const data = {
      name,
      config,
      createdAt: Date.now()
    }
    
    if (window.utools) {
      window.utools.db.put({
        _id: storageKey,
        data
      })
    } else {
      localStorage.setItem(storageKey, JSON.stringify(data))
    }
  } catch (error) {
    console.error('保存 Mock 配置失败:', error)
  }
}

/**
 * 加载 Mock 配置模板
 * @param {string} name - 模板名称
 * @returns {Object|null} 配置对象
 */
export function loadMockConfig(name) {
  try {
    const storageKey = `mock_config_${name}`
    
    if (window.utools) {
      const doc = window.utools.db.get(storageKey)
      return doc?.data?.config || null
    } else {
      const data = localStorage.getItem(storageKey)
      return data ? JSON.parse(data).config : null
    }
  } catch (error) {
    console.error('加载 Mock 配置失败:', error)
    return null
  }
}

/**
 * 获取所有保存的 Mock 配置
 * @returns {Array} 配置列表
 */
export function getAllMockConfigs() {
  try {
    const configs = []
    
    if (window.utools) {
      // 使用 uTools 数据库
      const docs = window.utools.db.allDocs()
      docs.forEach(doc => {
        if (doc._id.startsWith('mock_config_')) {
          configs.push({
            name: doc.data.name,
            createdAt: doc.data.createdAt
          })
        }
      })
    } else {
      // 使用 localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('mock_config_')) {
          const data = JSON.parse(localStorage.getItem(key))
          configs.push({
            name: data.name,
            createdAt: data.createdAt
          })
        }
      }
    }
    
    return configs.sort((a, b) => b.createdAt - a.createdAt)
  } catch (error) {
    console.error('获取 Mock 配置失败:', error)
    return []
  }
}

/**
 * 删除 Mock 配置
 * @param {string} name - 模板名称
 */
export function deleteMockConfig(name) {
  try {
    const storageKey = `mock_config_${name}`
    
    if (window.utools) {
      const doc = window.utools.db.get(storageKey)
      if (doc) {
        window.utools.db.remove(doc._id)
      }
    } else {
      localStorage.removeItem(storageKey)
    }
  } catch (error) {
    console.error('删除 Mock 配置失败:', error)
  }
}

/**
 * 生成 Mock 数据预览（用于显示生成结果统计）
 * @param {string|Object} schema - JSON Schema
 * @param {number} count - 数量
 * @returns {Object} 预览信息
 */
export function generateMockPreview(schema, count = 5) {
  try {
    const samples = generateMockBatch(schema, count)
    
    // 计算统计信息
    const stats = {
      totalCount: count,
      samples: samples.slice(0, 3),
      estimatedSize: JSON.stringify(samples).length,
      averageObjectSize: samples.length > 0 
        ? Math.round(JSON.stringify(samples).length / samples.length) 
        : 0
    }
    
    return stats
  } catch (error) {
    return {
      error: error.message
    }
  }
}

/**
 * 获取默认选项
 * @returns {MockOptions}
 */
export function getDefaultMockOptions() {
  return JSON.parse(JSON.stringify(defaultOptions))
}

/**
 * 语言选项
 */
export const localeOptions = [
  { value: 'zh_CN', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' }
]

/**
 * 生成数量选项
 */
export const countOptions = [
  { value: 1, label: '1 条' },
  { value: 5, label: '5 条' },
  { value: 10, label: '10 条' },
  { value: 50, label: '50 条' },
  { value: 100, label: '100 条' }
]

/**
 * 验证 Mock 配置是否有效
 * @param {Object} config - 配置对象
 * @returns {boolean}
 */
export function validateMockConfig(config) {
  if (!config) return false
  
  const requiredFields = ['count', 'locale']
  return requiredFields.every(field => field in config)
}
