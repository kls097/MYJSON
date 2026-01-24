/**
 * Excel 和 JSON 转换工具
 * 使用 xlsx 库处理 Excel 文件
 */
import * as XLSX from 'xlsx'

/**
 * 将 Excel 文件的 Buffer 转换为 JSON 数组
 * @param {Buffer} buffer - Excel 文件的 Buffer
 * @returns {Array} JSON 数组
 */
export function excelToJson(buffer) {
  try {
    // 读取 Excel 文件
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // 转换为 JSON,使用第一行作为属性名
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: null, // 空单元格设为 null
      raw: false // 保持原始格式而不是转换为日期等
    })

    return jsonData
  } catch (error) {
    throw new Error(`Excel 转换失败: ${error.message}`)
  }
}

/**
 * 将 JSON 数组转换为 Excel 文件的 Buffer
 * @param {Array} jsonArray - JSON 数组
 * @returns {Buffer} Excel 文件的 Buffer
 */
export function jsonToExcel(jsonArray) {
  try {
    // 验证输入是否为数组
    if (!Array.isArray(jsonArray)) {
      throw new Error('数据必须是数组格式')
    }

    if (jsonArray.length === 0) {
      throw new Error('数组不能为空')
    }

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(jsonArray)

    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

    // 转换为 Buffer
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    })

    return buffer
  } catch (error) {
    throw new Error(`JSON 转换失败: ${error.message}`)
  }
}

/**
 * 验证 JSON 字符串是否为合法的数组格式
 * @param {string} jsonString - JSON 字符串
 * @returns {Object} { valid: boolean, data: Array|null, error: string|null }
 */
export function validateJsonArray(jsonString) {
  try {
    const parsed = JSON.parse(jsonString)

    if (!Array.isArray(parsed)) {
      return {
        valid: false,
        data: null,
        error: '仅支持导出 JSON 数组格式'
      }
    }

    if (parsed.length === 0) {
      return {
        valid: false,
        data: null,
        error: 'JSON 数组不能为空'
      }
    }

    return {
      valid: true,
      data: parsed,
      error: null
    }
  } catch (error) {
    return {
      valid: false,
      data: null,
      error: `JSON 格式错误: ${error.message}`
    }
  }
}

/**
 * 获取导出示例说明
 * @returns {string} 示例说明
 */
export function getExportExample() {
  return `导出格式要求：

仅支持导出 JSON 数组，示例格式：

[
  {
    "姓名": "张三",
    "年龄": 25,
    "城市": "北京"
  },
  {
    "姓名": "李四",
    "年龄": 30,
    "城市": "上海"
  },
  {
    "姓名": "王五",
    "年龄": 28,
    "城市": "广州"
  }
]

Excel 表格将使用 JSON 对象的键作为列标题。`
}
