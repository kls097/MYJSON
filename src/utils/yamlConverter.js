// JSON ↔ YAML 双向转换工具
import yaml from 'js-yaml'

/**
 * JSON 转 YAML
 * @param {string} jsonString - JSON 字符串
 * @param {Object} options - 转换选项
 * @param {number} options.indent - 缩进空格数，默认 2
 * @param {boolean} options.lineWidth - 行宽限制，默认 120
 * @param {boolean} options.noRefs - 禁用引用，默认 true
 * @returns {{ result: string, error: string|null }}
 */
export function jsonToYaml(jsonString, options = {}) {
  try {
    const data = JSON.parse(jsonString)
    const {
      indent = 2,
      lineWidth = 120,
      noRefs = true
    } = options

    const result = yaml.dump(data, {
      indent,
      lineWidth,
      noRefs,
      quotingType: "'",
      forceQuotes: false
    })

    return { result, error: null }
  } catch (e) {
    return { result: '', error: `JSON 转 YAML 失败: ${e.message}` }
  }
}

/**
 * YAML 转 JSON
 * @param {string} yamlString - YAML 字符串
 * @param {Object} options - 转换选项
 * @param {boolean} options.pretty - 是否格式化输出，默认 true
 * @returns {{ result: string, error: string|null }}
 */
export function yamlToJson(yamlString, options = {}) {
  try {
    const { pretty = true } = options

    // js-yaml 支持多文档 YAML（---分隔），返回数组
    const documents = yaml.loadAll(yamlString, undefined, {
      json: true // 兼容 JSON 语法
    })

    // 过滤 null 文档
    const filtered = documents.filter(doc => doc !== undefined)

    const data = filtered.length === 1 ? filtered[0] : filtered
    const jsonStr = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data)

    return { result: jsonStr, error: null }
  } catch (e) {
    return { result: '', error: `YAML 转 JSON 失败: ${e.message}` }
  }
}
