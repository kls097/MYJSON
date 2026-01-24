// JSON to multiple programming languages converter
import {
  quicktype,
  InputData,
  jsonInputForTargetLanguage
} from 'quicktype-core'

// 支持的编程语言映射
const LANGUAGE_MAP = {
  'TypeScript': 'typescript',
  'Java': 'java',
  'Go': 'go',
  'Swift': 'swift',
  'Kotlin': 'kotlin',
  'Dart': 'dart',
  'Rust': 'rust',
  'C#': 'csharp',
  'C++': 'cplusplus',
  'Flow': 'flow',
  'JSON Schema': 'schema',
  'Python': 'python',
  'Ruby': 'ruby',
  'Scala3': 'scala3',
  'Objective-C': 'objective-c'
}

/**
 * 获取支持的编程语言列表
 * @returns {string[]} 语言名称数组
 */
export function getSupportedLanguages() {
  return Object.keys(LANGUAGE_MAP)
}

/**
 * 将 JSON 转换为指定编程语言的类型定义
 * @param {string} jsonString - JSON 字符串
 * @param {string} targetLang - 目标语言（如 'TypeScript', 'Java' 等）
 * @param {string} typeName - 生成的类型名称，默认 'Root'
 * @returns {Promise<string>} 转换后的代码
 */
export async function convertJsonToLanguage(jsonString, targetLang, typeName = 'Root') {
  // 验证目标语言
  if (!LANGUAGE_MAP[targetLang]) {
    throw new Error(`不支持的目标语言: ${targetLang}`)
  }

  // 验证 JSON 格式
  try {
    JSON.parse(jsonString)
  } catch (error) {
    throw new Error(`无效的 JSON 格式: ${error.message}`)
  }

  try {
    const lang = LANGUAGE_MAP[targetLang]

    // 创建 JSON 输入
    const jsonInput = jsonInputForTargetLanguage(lang)

    // 添加 JSON 示例
    await jsonInput.addSource({
      name: typeName,
      samples: [jsonString]
    })

    // 创建输入数据
    const inputData = new InputData()
    inputData.addInput(jsonInput)

    // 执行转换
    const result = await quicktype({
      inputData,
      lang: lang,
      rendererOptions: {
        // 通用选项
        'just-types': 'true',
        // TypeScript 特定选项
        'nice-property-names': 'true',
        'explicit-unions': 'true',
        // Java 特定选项
        'package': targetLang === 'Java' ? 'com.example' : undefined,
        // C# 特定选项
        'namespace': targetLang === 'C#' ? 'Example' : undefined,
        // Python 特定选项
        'python-version': targetLang === 'Python' ? '3.7' : undefined
      }
    })

    // 返回生成的代码
    return result.lines.join('\n')
  } catch (error) {
    throw new Error(`转换失败: ${error.message}`)
  }
}

/**
 * 获取语言的文件扩展名
 * @param {string} targetLang - 目标语言
 * @returns {string} 文件扩展名
 */
export function getLanguageExtension(targetLang) {
  const extensionMap = {
    'TypeScript': '.ts',
    'Java': '.java',
    'Go': '.go',
    'Swift': '.swift',
    'Kotlin': '.kt',
    'Dart': '.dart',
    'Rust': '.rs',
    'C#': '.cs',
    'C++': '.cpp',
    'Flow': '.js',
    'JSON Schema': '.json',
    'Python': '.py',
    'Ruby': '.rb',
    'Scala3': '.scala',
    'Objective-C': '.h'
  }
  return extensionMap[targetLang] || '.txt'
}
