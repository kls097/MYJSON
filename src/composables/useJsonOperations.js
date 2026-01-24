// JSON operations composable
import { ref } from 'vue'
import { formatJson, minifyJson } from '../utils/jsonFormatter'
import { compressJson } from '../utils/jsonCompressor'
import { validateJson, getJsonStats } from '../utils/jsonValidator'
import { removeComments } from '../utils/commentRemover'
import { smartUnescape } from '../utils/jsonUnescaper'

export function useJsonOperations() {
  const currentJson = ref('')
  const parsedJson = ref(null)
  const validationResult = ref({ valid: true, error: null })
  const stats = ref(null)

  // Format JSON
  const format = (sortKeys = false) => {
    try {
      currentJson.value = formatJson(currentJson.value, 2, sortKeys)
      validate()
      return true
    } catch (error) {
      console.error('Format error:', error)
      return false
    }
  }

  // Compress JSON (minify)
  const compress = (escape = false) => {
    try {
      currentJson.value = compressJson(currentJson.value, escape)
      validate()
      return true
    } catch (error) {
      console.error('Compress error:', error)
      return false
    }
  }

  // Remove comments
  const stripComments = () => {
    try {
      currentJson.value = removeComments(currentJson.value)
      validate()
      return true
    } catch (error) {
      console.error('Comment removal error:', error)
      return false
    }
  }

  // Unescape JSON - 反转义 JSON
  const unescape = () => {
    try {
      currentJson.value = smartUnescape(currentJson.value)
      validate()
      return true
    } catch (error) {
      console.error('Unescape error:', error)
      return false
    }
  }

  // Validate JSON
  const validate = () => {
    const result = validateJson(currentJson.value)
    validationResult.value = result

    if (result.valid) {
      parsedJson.value = result.data
      stats.value = getJsonStats(currentJson.value)
    } else {
      parsedJson.value = null
      stats.value = getJsonStats(currentJson.value)
    }

    return result.valid
  }

  return {
    currentJson,
    parsedJson,
    validationResult,
    stats,
    format,
    compress,
    stripComments,
    unescape,
    validate
  }
}
