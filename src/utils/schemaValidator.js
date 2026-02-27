/**
 * JSON Schema 验证工具
 * 使用 Ajv 进行 JSON Schema 验证
 * 使用 json-schema-faker 生成 Mock 数据
 */
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import jsf from 'json-schema-faker'

/**
 * 创建 Ajv 验证器实例
 */
function createValidator() {
  const ajv = new Ajv({
    allErrors: true, // 返回所有错误，不只是第一个
    verbose: true, // 包含更详细的错误信息
    strict: false // 不严格模式，兼容更多 schema
  })

  // 添加格式验证支持（email, uri, date-time 等）
  addFormats(ajv)

  return ajv
}

/**
 * 验证 JSON 数据是否符合 Schema
 * @param {string} jsonString - JSON 数据字符串
 * @param {string} schemaString - JSON Schema 字符串
 * @returns {Object} { valid: boolean, errors: Array|null }
 */
export function validateJsonWithSchema(jsonString, schemaString) {
  try {
    // 解析 JSON 数据
    const jsonData = JSON.parse(jsonString)

    // 解析 Schema
    const schema = JSON.parse(schemaString)

    console.log('=== Schema 验证调试 ===')
    console.log('JSON 数据:', jsonData)
    console.log('Schema:', schema)

    // 创建验证器（支持 $ref 引用）
    const ajv = createValidator()

    // 直接编译整个 schema，Ajv 会自动处理 $ref 和 definitions
    const validate = ajv.compile(schema)

    // 执行验证
    const valid = validate(jsonData)

    console.log('验证结果:', valid)
    console.log('错误信息:', validate.errors)

    if (valid) {
      return {
        valid: true,
        errors: null
      }
    } else {
      // 格式化错误信息
      const errors = validate.errors.map(err => ({
        path: err.instancePath || '/',
        message: err.message,
        keyword: err.keyword,
        params: err.params,
        // 生成友好的错误描述
        description: formatErrorMessage(err)
      }))

      return {
        valid: false,
        errors
      }
    }
  } catch (error) {
    console.error('验证异常:', error)
    throw new Error(`验证失败: ${error.message}`)
  }
}

/**
 * 格式化错误信息为友好的描述
 * @param {Object} error - Ajv 错误对象
 * @returns {string} 友好的错误描述
 */
function formatErrorMessage(error) {
  const path = error.instancePath || '根节点'

  switch (error.keyword) {
    case 'type':
      return `${path} 应该是 ${error.params.type} 类型`
    case 'required':
      return `${path} 缺少必需字段: ${error.params.missingProperty}`
    case 'enum':
      return `${path} 的值必须是以下之一: ${error.params.allowedValues.join(', ')}`
    case 'minimum':
      return `${path} 的值不能小于 ${error.params.limit}`
    case 'maximum':
      return `${path} 的值不能大于 ${error.params.limit}`
    case 'minLength':
      return `${path} 的长度不能小于 ${error.params.limit}`
    case 'maxLength':
      return `${path} 的长度不能大于 ${error.params.limit}`
    case 'pattern':
      return `${path} 的格式不符合要求`
    case 'format':
      return `${path} 的格式应该是 ${error.params.format}`
    case 'additionalProperties':
      return `${path} 不允许额外的属性: ${error.params.additionalProperty}`
    default:
      return `${path} ${error.message}`
  }
}

/**
 * 从 Schema 生成 Mock 数据
 * @param {string} schemaString - JSON Schema 字符串
 * @returns {string} 生成的 Mock JSON 数据
 */
export function generateMockData(schemaString) {
  try {
    // 解析 Schema
    const schema = JSON.parse(schemaString)

    // 配置 json-schema-faker
    jsf.option({
      alwaysFakeOptionals: true, // 总是生成可选字段
      useDefaultValue: true, // 使用默认值
      useExamplesValue: true, // 使用示例值
      fixedProbabilities: true, // 固定概率，生成更一致的数据
      random: Math.random // 使用随机数
    })

    // 生成 Mock 数据
    const mockData = jsf.generate(schema)

    // 返回格式化的 JSON 字符串
    return JSON.stringify(mockData, null, 2)
  } catch (error) {
    throw new Error(`生成 Mock 数据失败: ${error.message}`)
  }
}

/**
 * 验证 Schema 本身是否合法
 * @param {string} schemaString - JSON Schema ��符串
 * @returns {Object} { valid: boolean, error: string|null }
 */
export function validateSchema(schemaString) {
  try {
    const schema = JSON.parse(schemaString)

    // 创建验证器
    const ajv = createValidator()

    // 尝试编译 Schema
    ajv.compile(schema)

    return {
      valid: true,
      error: null
    }
  } catch (error) {
    return {
      valid: false,
      error: error.message
    }
  }
}

/**
 * 获取 Schema 验证示例
 * @returns {Object} { schema: string, validJson: string, invalidJson: string }
 */
export function getSchemaExample() {
  const schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "minLength": 1
      },
      "age": {
        "type": "integer",
        "minimum": 0,
        "maximum": 150
      },
      "email": {
        "type": "string",
        "format": "email"
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    },
    "required": ["name", "email"]
  }

  const validJson = {
    "name": "张三",
    "age": 25,
    "email": "zhangsan@example.com",
    "tags": ["开发者", "设计师"]
  }

  const invalidJson = {
    "name": "",
    "age": 200,
    "email": "invalid-email",
    "tags": "not-an-array"
  }

  return {
    schema: JSON.stringify(schema, null, 2),
    validJson: JSON.stringify(validJson, null, 2),
    invalidJson: JSON.stringify(invalidJson, null, 2)
  }
}
