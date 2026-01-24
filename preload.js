/**
 * preload.js - uTools插件预加载脚本
 *
 * 本文件提供 Node.js API 的访问能力
 * 用于实现文件读写等需要本地原生能力的功能
 *
 * 注意: 根据 uTools 规范,此文件代码必须清晰可读,不能压缩/混淆
 */

// 引入 Node.js 文件系统模块
let fs
let path

try {
  fs = require('fs')
  path = require('path')
  console.log('Node.js fs module loaded successfully')
} catch (e) {
  console.log('Running in browser mode, fs module not available')
  fs = null
  path = null
}

// 缓存插件目录路径
let pluginDir = null

/**
 * 获取插件目录的绝对路径
 */
const getPluginDir = () => {
  if (!pluginDir) {
    // 尝试通过 uTools API 获取
    if (window.utools && window.utools.getPath) {
      const utoolsPath = window.utools.getPath()
      if (utoolsPath) {
        pluginDir = utoolsPath
        console.log('Plugin dir from utools API:', pluginDir)
      }
    }

    // 如果 uTools API 未返回有效路径，使用备选方案
    if (!pluginDir) {
      if (process && process.env && process.env.TMP) {
        // 备选方案1：使用系统临时目录（Windows 环境变量）
        pluginDir = process.env.TMP
        console.log('Plugin dir from TEMP:', pluginDir)
      } else if (process && process.env && process.env.TMPDIR) {
        // 备选方案2：使用系统临时目录（Unix/Linux 环境变量）
        pluginDir = process.env.TMPDIR
        console.log('Plugin dir from TMPDIR:', pluginDir)
      } else if (process && process.cwd) {
        // 备选方案3：使用当前工作目录（可能有权限问题）
        pluginDir = process.cwd()
        console.log('Plugin dir from process.cwd():', pluginDir)
      } else {
        // 浏览器环境：使用一个临时目录路径（写入会失败，但不会崩溃）
        pluginDir = path ? path.resolve('.') : '.'
        console.log('Plugin dir: default (browser/unknown environment)')
      }
    }
  }
  return pluginDir
}

/**
 * 导出工具函数到 window 对象,供前端页面调用
 * 注意: 文件对话框应该使用 utools.showOpenDialog 和 utools.showSaveDialog
 */
window.preloadUtils = {
  /**
   * 获取插件目录路径
   * @returns {string} 插件目录的绝对路径
   */
  getPluginDir: () => {
    return getPluginDir()
  },

  /**
   * 读取文件内容
   * @param {string} filePath - 文件路径（相对于插件目录）
   * @returns {string|Buffer|null} 文件内容
   */
  readFile: (filePath, encoding = 'utf-8') => {
    if (!fs) {
      console.error('fs module not available')
      return null
    }

    try {
      // 转换为绝对路径
      const absolutePath = path.resolve(getPluginDir(), filePath)
      if (encoding) {
        return fs.readFileSync(absolutePath, encoding)
      } else {
        return fs.readFileSync(absolutePath)
      }
    } catch (error) {
      console.error('读取文件失败:', error)
      return null
    }
  },

  /**
   * 写入文件内容
   * @param {string} filePath - 文件路径（相对于插件目录）
   * @param {string|Buffer} content - 文件内容
   * @returns {boolean} 是否成功
   */
  writeFile: (filePath, content) => {
    if (!fs) {
      return false
    }

    try {
      // 转换为绝对路径
      const absolutePath = path.resolve(getPluginDir(), filePath)
      const dir = path.dirname(absolutePath)

      // 确保目录存在
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(absolutePath, content)
      return true
    } catch (error) {
      // 静默失败（可能是权限问题或其他问题）
      return false
    }
  }
}
