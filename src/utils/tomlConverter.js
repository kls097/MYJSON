// JSON ↔ TOML 双向转换工具
import * as TOML from 'smol-toml'

/**
 * JSON 转 TOML
 * @param {string} jsonString - JSON 字符串
 * @returns {{ result: string, error: string|null }}
 */
export function jsonToToml(jsonString) {
  try {
    const data = JSON.parse(jsonString)

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return { result: '', error: 'TOML 的顶层必须是对象（不能是数组或基本类型）' }
    }

    const result = TOML.stringify(data)
    return { result, error: null }
  } catch (e) {
    return { result: '', error: `JSON 转 TOML 失败: ${e.message}` }
  }
}

/**
 * TOML 转 JSON
 * @param {string} tomlString - TOML 字符串
 * @param {Object} options - 转换选项
 * @param {boolean} options.pretty - 是否格式化输出，默认 true
 * @returns {{ result: string, error: string|null }}
 */
export function tomlToJson(tomlString, options = {}) {
  try {
    const { pretty = true } = options

    const data = TOML.parse(tomlString)
    const jsonStr = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data)

    return { result: jsonStr, error: null }
  } catch (e) {
    return { result: '', error: `TOML 转 JSON 失败: ${e.message}` }
  }
}
