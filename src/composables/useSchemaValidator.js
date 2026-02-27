/**
 * Schema 验证 Composable (增强版)
 * 提供 Schema 验证、生成、Mock 数据生成等功能
 */
import { ref } from 'vue'
import {
  validateJsonWithSchema,
  generateMockData as generateMock,
  validateSchema,
  getSchemaExample
} from '../utils/schemaValidator'
import { generateSchema, generateSchemaFromSamples } from '../utils/schemaGenerator'
import { generateMockData } from '../utils/mockGenerator'

export function useSchemaValidator() {
  const isValidating = ref(false)
  const validationResult = ref(null)
  const schemaError = ref(null)
  const isGenerating = ref(false)
  const isGeneratingMock = ref(false)

  /**
   * 验证 JSON 数据
   * @param {string} jsonString - JSON 数据
   * @param {string} schemaString - JSON Schema
   * @param {Object} options - 选项 { strict: boolean }
   * @returns {Object} 验证结果
   */
  const validate = async (jsonString, schemaString, options = {}) => {
    isValidating.value = true
    validationResult.value = null
    schemaError.value = null

    try {
      // 先验证 Schema 本身是否合法
      const schemaValidation = validateSchema(schemaString)
      if (!schemaValidation.valid) {
        schemaError.value = `Schema 格式错误: ${schemaValidation.error}`
        return { valid: false, error: schemaError.value }
      }

      // 验证 JSON 数据
      const result = validateJsonWithSchema(jsonString, schemaString)
      validationResult.value = result

      return result
    } catch (error) {
      const errorMsg = error.message || '验证失败'
      schemaError.value = errorMsg
      return { valid: false, error: errorMsg }
    } finally {
      isValidating.value = false
    }
  }

  /**
   * 生成 Schema
   * @param {string|Object} jsonData - JSON 数据
   * @param {Object} options - 生成选项
   * @returns {Promise<string>} 生成的 Schema 字符串
   */
  const generate = async (jsonData, options = {}) => {
    isGenerating.value = true
    schemaError.value = null

    try {
      const schema = await generateSchema(jsonData, options)
      return schema
    } catch (error) {
      const errorMsg = error.message || '生成 Schema 失败'
      schemaError.value = errorMsg
      throw new Error(errorMsg)
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * 从多个样本生成 Schema
   * @param {Array} samples - JSON 样本数组
   * @param {Object} options - 生成选项
   * @returns {Promise<string>} 生成的 Schema 字符串
   */
  const generateFromSamples = async (samples, options = {}) => {
    isGenerating.value = true
    schemaError.value = null

    try {
      const schema = await generateSchemaFromSamples(samples, options)
      return schema
    } catch (error) {
      const errorMsg = error.message || '从样本生成 Schema 失败'
      schemaError.value = errorMsg
      throw new Error(errorMsg)
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * 生成 Mock 数据
   * @param {string} schemaString - JSON Schema
   * @param {Object} options - Mock 选项
   * @returns {Promise<string>} 生成的 Mock JSON 字符串
   */
  const generateMock = async (schemaString, options = {}) => {
    isGeneratingMock.value = true
    schemaError.value = null

    try {
      // 先验证 Schema 本身是否合法
      const schemaValidation = validateSchema(schemaString)
      if (!schemaValidation.valid) {
        throw new Error(`Schema 格式错误: ${schemaValidation.error}`)
      }

      return generateMockData(schemaString, options)
    } catch (error) {
      const errorMsg = error.message || '生成 Mock 数据失败'
      schemaError.value = errorMsg
      throw new Error(errorMsg)
    } finally {
      isGeneratingMock.value = false
    }
  }

  /**
   * 验证 Schema 本身是否合法
   * @param {string} schemaString - JSON Schema 字符串
   * @returns {Object} { valid: boolean, error: string|null }
   */
  const checkSchema = (schemaString) => {
    return validateSchema(schemaString)
  }

  /**
   * 清除验证结果
   */
  const clearResult = () => {
    validationResult.value = null
    schemaError.value = null
  }

  /**
   * 清除所有状态
   */
  const clearAll = () => {
    validationResult.value = null
    schemaError.value = null
    isValidating.value = false
    isGenerating.value = false
    isGeneratingMock.value = false
  }

  /**
   * 获取示例
   */
  const getExample = () => {
    return getSchemaExample()
  }

  return {
    // 状态
    isValidating,
    validationResult,
    schemaError,
    isGenerating,
    isGeneratingMock,
    
    // 方法
    validate,
    generate,
    generateFromSamples,
    generateMock,
    checkSchema,
    clearResult,
    clearAll,
    getExample
  }
}
