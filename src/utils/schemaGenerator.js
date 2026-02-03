/**
 * JSON Schema 生成工具
 * 使用 quicktype-core 从 JSON 数据生成 JSON Schema
 */
import { quicktype, InputData, JSONSchemaTargetLanguage } from 'quicktype-core'

/**
 * 生成选项
 * @typedef {Object} GenerateOptions
 * @property {string} version - Schema 版本 (draft-04, draft-06, draft-07, 2019-09, 2020-12)
 * @property {string} required - 必需字段策略 (all, infer, none)
 * @property {boolean} strict - 严格类型推断
 * @property {boolean} addExamples - 添加示例
 * @property {boolean} addDescriptions - 添加描述
 */

const defaultOptions = {
  version: 'draft-07',
  required: 'infer',
  strict: false,
  addExamples: false,
  addDescriptions: false
}

/**
 * 从 JSON 数据生成 JSON Schema
 * @param {string|Object} jsonData - JSON 数据字符串或对象
 * @param {GenerateOptions} options - 生成选项
 * @returns {Promise<string>} 生成的 JSON Schema 字符串
 */
export async function generateSchema(jsonData, options = {}) {
  const opts = { ...defaultOptions, ...options }
  
  try {
    // 确保是字符串
    const jsonString = typeof jsonData === 'string' 
      ? jsonData 
      : JSON.stringify(jsonData)
    
    // 解析 JSON 以验证格式
    const parsed = JSON.parse(jsonString)
    
    // 准备输入数据
    const inputData = new InputData()
    inputData.addSource({
      kind: 'json',
      name: 'Root',
      samples: [JSON.stringify(parsed)]
    })

    // 使用 quicktype 生成 Schema
    const result = await quicktype({
      inputData,
      lang: new JSONSchemaTargetLanguage(),
      alphabetizeProperties: true,
      allPropertiesOptional: opts.required === 'none',
      inferMaps: !opts.strict,
      inferEnums: opts.strict,
      inferDates: true,
      inferIntegerStrings: false,
      inferUuids: false,
      inferUrls: false
    })

    let schema = result.lines.join('\n')
    
    // 后处理 Schema
    schema = postProcessSchema(schema, opts)
    
    return schema
  } catch (error) {
    throw new Error(`生成 Schema 失败: ${error.message}`)
  }
}

/**
 * 从多个 JSON 样本生成 Schema
 * @param {Array<string|Object>} samples - JSON 数据样本数组
 * @param {GenerateOptions} options - 生成选项
 * @returns {Promise<string>} 生成的 JSON Schema 字符串
 */
export async function generateSchemaFromSamples(samples, options = {}) {
  const opts = { ...defaultOptions, ...options }
  
  try {
    if (!samples || samples.length === 0) {
      throw new Error('至少需要提供一个 JSON 样本')
    }

    // 准备输入数据
    const inputData = new InputData()
    
    samples.forEach((sample, index) => {
      const jsonString = typeof sample === 'string' ? sample : JSON.stringify(sample)
      // 验证 JSON 格式
      JSON.parse(jsonString)
      
      inputData.addSource({
        kind: 'json',
        name: `Sample${index + 1}`,
        samples: [jsonString]
      })
    })

    // 使用 quicktype 生成 Schema
    const result = await quicktype({
      inputData,
      lang: new JSONSchemaTargetLanguage(),
      alphabetizeProperties: true,
      allPropertiesOptional: opts.required === 'none',
      inferMaps: !opts.strict,
      mergeSimilarClasses: true,
      combineClasses: true
    })

    let schema = result.lines.join('\n')
    schema = postProcessSchema(schema, opts)
    
    return schema
  } catch (error) {
    throw new Error(`从样本生成 Schema 失败: ${error.message}`)
  }
}

/**
 * 后处理生成的 Schema
 * @param {string} schema - 原始 Schema 字符串
 * @param {GenerateOptions} options - 选项
 * @returns {string} 处理后的 Schema 字符串
 */
function postProcessSchema(schema, options) {
  try {
    const schemaObj = JSON.parse(schema)
    
    // 设置 $schema 版本
    const versionMap = {
      'draft-04': 'http://json-schema.org/draft-04/schema#',
      'draft-06': 'http://json-schema.org/draft-06/schema#',
      'draft-07': 'http://json-schema.org/draft-07/schema#',
      '2019-09': 'https://json-schema.org/draft/2019-09/schema',
      '2020-12': 'https://json-schema.org/draft/2020-12/schema'
    }
    schemaObj.$schema = versionMap[options.version] || versionMap['draft-07']
    
    // 添加标题和描述
    if (options.addDescriptions && !schemaObj.title) {
      schemaObj.title = 'Generated Schema'
      schemaObj.description = '自动生成的 JSON Schema'
    }
    
    // 处理必需字段
    if (options.required === 'all') {
      markAllPropertiesRequired(schemaObj)
    } else if (options.required === 'none') {
      removeAllRequired(schemaObj)
    }
    
    // 添加示例
    if (options.addExamples) {
      addExamplesToSchema(schemaObj)
    }
    
    return JSON.stringify(schemaObj, null, 2)
  } catch (error) {
    console.warn('Schema 后处理失败:', error)
    return schema
  }
}

/**
 * 将所有属性标记为必需
 * @param {Object} schema - Schema 对象
 */
function markAllPropertiesRequired(schema) {
  if (schema.type === 'object' && schema.properties) {
    schema.required = Object.keys(schema.properties)
    
    // 递归处理嵌套对象
    Object.values(schema.properties).forEach(prop => {
      markAllPropertiesRequired(prop)
    })
  }
  
  if (schema.type === 'array' && schema.items) {
    markAllPropertiesRequired(schema.items)
  }
  
  // 处理 $defs 或 definitions
  const defs = schema.$defs || schema.definitions
  if (defs) {
    Object.values(defs).forEach(def => markAllPropertiesRequired(def))
  }
}

/**
 * 移除所有 required 字段
 * @param {Object} schema - Schema 对象
 */
function removeAllRequired(schema) {
  delete schema.required
  
  if (schema.properties) {
    Object.values(schema.properties).forEach(prop => {
      removeAllRequired(prop)
    })
  }
  
  if (schema.type === 'array' && schema.items) {
    removeAllRequired(schema.items)
  }
  
  const defs = schema.$defs || schema.definitions
  if (defs) {
    Object.values(defs).forEach(def => removeAllRequired(def))
  }
}

/**
 * 为 Schema 添加示例
 * @param {Object} schema - Schema 对象
 */
function addExamplesToSchema(schema) {
  if (schema.type === 'string' && !schema.examples) {
    if (schema.format === 'email') {
      schema.examples = ['user@example.com']
    } else if (schema.format === 'date-time') {
      schema.examples = ['2024-01-01T00:00:00Z']
    } else if (schema.format === 'uri') {
      schema.examples = ['https://example.com']
    } else if (schema.pattern) {
      schema.examples = ['匹配模式的字符串']
    } else {
      schema.examples = ['示例字符串']
    }
  }
  
  if (schema.type === 'number' || schema.type === 'integer') {
    if (!schema.examples) {
      const min = schema.minimum ?? 0
      const max = schema.maximum ?? (min + 100)
      schema.examples = [Math.floor((min + max) / 2)]
    }
  }
  
  if (schema.type === 'boolean' && !schema.examples) {
    schema.examples = [true]
  }
  
  if (schema.type === 'object' && schema.properties) {
    Object.values(schema.properties).forEach(prop => {
      addExamplesToSchema(prop)
    })
  }
  
  if (schema.type === 'array' && schema.items) {
    addExamplesToSchema(schema.items)
  }
}

/**
 * 合并多个 Schema
 * @param {Array<string>} schemas - Schema 字符串数组
 * @returns {string} 合并后的 Schema
 */
export function mergeSchemas(schemas) {
  if (!schemas || schemas.length === 0) {
    throw new Error('至少需要提供一个 Schema')
  }
  
  if (schemas.length === 1) {
    return schemas[0]
  }
  
  try {
    const parsedSchemas = schemas.map(s => JSON.parse(s))
    
    // 以第一个 Schema 为基础
    const baseSchema = parsedSchemas[0]
    
    // 合并其他 Schema 的属性
    for (let i = 1; i < parsedSchemas.length; i++) {
      mergeSchemaObjects(baseSchema, parsedSchemas[i])
    }
    
    return JSON.stringify(baseSchema, null, 2)
  } catch (error) {
    throw new Error(`合并 Schema 失败: ${error.message}`)
  }
}

/**
 * 递归合并两个 Schema 对象
 * @param {Object} target - 目标 Schema
 * @param {Object} source - 源 Schema
 */
function mergeSchemaObjects(target, source) {
  if (source.type && target.type !== source.type) {
    // 类型冲突，使用 anyOf
    if (!target.anyOf) {
      target.anyOf = [{ ...target }]
      delete target.type
      delete target.properties
    }
    target.anyOf.push({ ...source })
    return
  }
  
  if (source.properties) {
    if (!target.properties) {
      target.properties = {}
    }
    
    Object.entries(source.properties).forEach(([key, propSchema]) => {
      if (target.properties[key]) {
        // 属性已存在，递归合并
        mergeSchemaObjects(target.properties[key], propSchema)
      } else {
        // 新属性
        target.properties[key] = propSchema
      }
    })
  }
  
  // 合并 required
  if (source.required) {
    if (!target.required) {
      target.required = []
    }
    source.required.forEach(field => {
      if (!target.required.includes(field)) {
        target.required.push(field)
      }
    })
  }
}

/**
 * 获取生成选项的默认值
 * @returns {GenerateOptions}
 */
export function getDefaultGenerateOptions() {
  return { ...defaultOptions }
}

/**
 * Schema 版本选项
 */
export const schemaVersionOptions = [
  { value: 'draft-04', label: 'Draft 04' },
  { value: 'draft-06', label: 'Draft 06' },
  { value: 'draft-07', label: 'Draft 07 (推荐)' },
  { value: '2019-09', label: '2019-09' },
  { value: '2020-12', label: '2020-12' }
]

/**
 * 必需字段选项
 */
export const requiredFieldOptions = [
  { value: 'all', label: '全部必需' },
  { value: 'infer', label: '智能推断 (推荐)' },
  { value: 'none', label: '全部可选' }
]
