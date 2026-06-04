/**
 * 文件保存工具
 * 统一 uTools 文件保存对话框 + 浏览器 Blob 下载的回退模式
 */

/**
 * 生成基于时间戳的文件名
 * @param {string} prefix - 文件名前缀，如 'json_export'
 * @param {string} ext - 文件扩展名，如 '.xlsx'
 * @returns {string} 格式如 'json_export_2026-05-15T12-30-45.xlsx'
 */
export function generateTimestampName(prefix, ext) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  return `${prefix}_${timestamp}${ext}`
}

/**
 * 格式化 JSON 内容用于保存（如果是有效 JSON 则美化，否则原样返回）
 * @param {string} content - 要保存的内容
 * @returns {string} 格式化后的内容
 */
export function formatContentForSave(content) {
  try {
    const parsed = JSON.parse(content)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return content
  }
}

/**
 * 将文件保存到本地（uTools 优先，浏览器回退）
 * @param {object} options
 * @param {ArrayBuffer|Blob|string} options.buffer - 文件内容
 * @param {string} options.filename - 默认文件名
 * @param {string} options.mimeType - MIME 类型
 * @param {string} options.title - 保存对话框标题
 * @param {Array} [options.filters] - 文件类型过滤器
 * @returns {boolean|null} true=成功, false=失败, null=用户取消
 */
export function saveFile({ buffer, filename, mimeType, title, filters }) {
  const utools = typeof window !== 'undefined' ? window.utools : undefined
  const preloadUtils = typeof window !== 'undefined' ? window.preloadUtils : undefined

  if (utools?.showSaveDialog) {
    const filePath = utools.showSaveDialog({
      title,
      defaultPath: filename,
      buttonLabel: '保存',
      filters: filters || []
    })

    if (!filePath) return null

    if (preloadUtils?.writeFile) {
      const success = preloadUtils.writeFile(filePath, buffer)
      return !!success
    }
  }

  // Browser fallback
  const blob = new Blob([buffer], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return true
}
