/**
 * Schema 验证 Composable
 * 提供 Schema 验证、Mock 数据生成等功能
 */
import { ref } from 'vue'
import {
  validateJsonWithSchema,
  generateMockData,
  validateSchema,
  getSchemaExample
} from '../utils/schemaValidator'

export function useSchemaValidator() {
  const isValidating = ref(false)
  const validationResult = ref(null)
  const schemaError = ref(null)

  /**
   * 验证 JSON 数据
   * @param {string} jsonString - JSON 数据
   * @param {string} schemaString - JSON Schema
   * @returns {Object} 验证结果
   */
  const validate = async (jsonString, schemaString) => {
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
   * 生成 Mock 数据
   * @param {string} schemaString - JSON Schema
   * @returns {string} Mock JSON 数据
   */
  const generateMock = async (schemaString) => {
    try {
      // 先验证 Schema 本身是否合法
      const schemaValidation = validateSchema(schemaString)
      if (!schemaValidation.valid) {
        throw new Error(`Schema 格式错误: ${schemaValidation.error}`)
      }

      return generateMockData(schemaString)
    } catch (error) {
      throw new Error(error.message || '生成 Mock 数据失败')
    }
  }

  /**
   * 清除验证结果
   */
  const clearResult = () => {
    validationResult.value = null
    schemaError.value = null
  }

  /**
   * 获取示例
   */
  const getExample = () => {
    return getSchemaExample()
  }

  return {
    isValidating,
    validationResult,
    schemaError,
    validate,
    generateMock,
    clearResult,
    getExample
  }
}
