// JSON Converter composable
import { ref } from 'vue'
import { convertJsonToLanguage, getSupportedLanguages } from '../utils/jsonConverter'

export function useJsonConverter() {
  const isConverting = ref(false)
  const convertResult = ref(null)
  const convertError = ref('')

  /**
   * 转换 JSON 到指定语言
   * @param {string} jsonString - JSON 字符串
   * @param {string} targetLang - 目标语言
   * @param {string} typeName - 类型名称
   */
  const convertToLanguage = async (jsonString, targetLang, typeName = 'Root') => {
    // 重置状态
    convertError.value = ''
    convertResult.value = null
    isConverting.value = true

    try {
      // 执行转换
      const result = await convertJsonToLanguage(jsonString, targetLang, typeName)
      convertResult.value = result
      return result
    } catch (error) {
      convertError.value = error.message
      throw error
    } finally {
      isConverting.value = false
    }
  }

  /**
   * 获取支持的语言列表
   */
  const languages = getSupportedLanguages()

  /**
   * 清除转换结果
   */
  const clearResult = () => {
    convertResult.value = null
    convertError.value = ''
  }

  return {
    isConverting,
    convertResult,
    convertError,
    languages,
    convertToLanguage,
    clearResult
  }
}
