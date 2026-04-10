// JSON ↔ XML 双向转换工具

/**
 * JSON 转 XML
 * @param {string} jsonString - JSON 字符串
 * @param {Object} options - 转换选项
 * @param {string} options.rootTag - 根标签名称，默认 'root'
 * @param {number} options.indent - 缩进空格数，默认 2
 * @param {string} options.attributePrefix - 属性前缀，默认 '@_'
 * @param {string} options.textContentKey - 文本内容键名，默认 '#text'
 * @returns {{ result: string, error: string|null }}
 */
export function jsonToXml(jsonString, options = {}) {
  try {
    const data = JSON.parse(jsonString)
    const {
      rootTag = 'root',
      indent = 2,
      attributePrefix = '@_',
      textContentKey = '#text'
    } = options

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += objToXml(data, rootTag, 0, indent, attributePrefix, textContentKey)
    return { result: xml, error: null }
  } catch (e) {
    return { result: '', error: `JSON 解析失败: ${e.message}` }
  }
}

/**
 * XML 转 JSON
 * @param {string} xmlString - XML 字符串
 * @param {Object} options - 转换选项
 * @param {string} options.attributePrefix - 属性前缀，默认 '@_'
 * @param {string} options.textContentKey - 文本内容键名，默认 '#text'
 * @param {boolean} options.pretty - 是否格式化输出，默认 true
 * @returns {{ result: string, error: string|null }}
 */
export function xmlToJson(xmlString, options = {}) {
  try {
    const {
      attributePrefix = '@_',
      textContentKey = '#text',
      pretty = true
    } = options

    if (typeof DOMParser !== 'undefined') {
      // Browser environment
      const parser = new DOMParser()
      const doc = parser.parseFromString(xmlString, 'text/xml')
      const parseError = doc.querySelector('parsererror')
      if (parseError) {
        return { result: '', error: `XML 解析失败: ${parseError.textContent}` }
      }
      const data = xmlNodeToObjBrowser(doc.documentElement, attributePrefix, textContentKey)
      const rootTag = doc.documentElement.tagName
      const wrapped = { [rootTag]: data }
      const jsonStr = pretty ? JSON.stringify(wrapped, null, 2) : JSON.stringify(wrapped)
      return { result: jsonStr, error: null }
    } else {
      // Node.js environment
      const parsed = parseXmlToObj(xmlString, attributePrefix, textContentKey)
      const rootTag = parsed._rootTag
      const wrapped = { [rootTag]: parsed._data }
      const jsonStr = pretty ? JSON.stringify(wrapped, null, 2) : JSON.stringify(wrapped)
      return { result: jsonStr, error: null }
    }
  } catch (e) {
    return { result: '', error: `XML 转换失败: ${e.message}` }
  }
}

function xmlNodeToObjBrowser(node, attrPrefix, textKey) {
  if (node.nodeType === 3) {
    const text = node.textContent.trim()
    return text || null
  }
  if (node.nodeType !== 1) return null
  const result = {}
  if (node.attributes && node.attributes.length > 0) {
    for (const attr of node.attributes) {
      result[attrPrefix + attr.name] = attr.value
    }
  }
  const childElements = []
  let textContent = ''
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      textContent += child.textContent
    } else if (child.nodeType === 1) {
      childElements.push(child)
    }
  }
  textContent = textContent.trim()
  if (childElements.length === 0) {
    if (textContent) {
      if (Object.keys(result).length > 0) {
        result[textKey] = textContent
      } else {
        return textContent
      }
    } else if (Object.keys(result).length === 0) {
      return null
    }
    return result
  }
  const groups = {}
  for (const child of childElements) {
    const name = child.tagName
    if (!groups[name]) groups[name] = []
    groups[name].push(xmlNodeToObjBrowser(child, attrPrefix, textKey))
  }
  for (const [name, values] of Object.entries(groups)) {
    result[name] = values.length === 1 ? values[0] : values
  }
  if (textContent) result[textKey] = textContent
  return result
}

// ============ 内部辅助函数 ============

/**
 * 将 JS 对象转为 XML 字符串
 */
function objToXml(obj, tagName, depth, indent, attrPrefix, textKey) {
  const pad = ' '.repeat(depth * indent)

  if (obj === null || obj === undefined) {
    return `${pad}<${tagName}/>\n`
  }

  // 基本类型
  if (typeof obj !== 'object') {
    const escaped = escapeXml(String(obj))
    return `${pad}<${tagName}>${escaped}</${tagName}>\n`
  }

  // 数组
  if (Array.isArray(obj)) {
    return obj.map(item => objToXml(item, tagName, depth, indent, attrPrefix, textKey)).join('')
  }

  // 对象：提取属性和子元素
  const attributes = []
  const children = []
  let textContent = null

  for (const [key, value] of Object.entries(obj)) {
    if (key === textKey) {
      textContent = value
    } else if (key.startsWith(attrPrefix)) {
      const attrName = key.slice(attrPrefix.length)
      attributes.push(`${attrName}=\"${escapeXml(String(value))}\"`)
    } else {
      children.push({ key, value })
    }
  }

  const attrStr = attributes.length > 0 ? ' ' + attributes.join(' ') : ''

  if (children.length === 0 && textContent === null) {
    // 无子元素无文本
    if (attributes.length > 0) {
      return `${pad}<${tagName}${attrStr}/>\n`
    }
    return `${pad}<${tagName}/>\n`
  }

  if (children.length === 0 && textContent !== null) {
    // 只有文本
    const escaped = escapeXml(String(textContent))
    return `${pad}<${tagName}${attrStr}>${escaped}</${tagName}>\n`
  }

  // 有子元素
  let xml = `${pad}<${tagName}${attrStr}>\n`

  if (textContent !== null) {
    xml += `${pad}${' '.repeat(indent)}${escapeXml(String(textContent))}\n`
  }

  for (const { key, value } of children) {
    xml += objToXml(value, key, depth + 1, indent, attrPrefix, textKey)
  }

  xml += `${pad}</${tagName}>\n`
  return xml
}

/**
 * 将 XML DOM 节点转为 JS 对象
 */
function parseXmlToObj(xmlString, attrPrefix, textKey) {
  // Pure JS XML parser - works in both browser and Node.js
  const stack = []
  let current = { _tag: null, _attrs: {}, _children: [], _text: '' }
  const rootElements = []

  const tagRegex = /<(\/?)\s*([\w:._-]+)(\s[^>]*)?\s*(\/)?>|([^<]+)/g
  const attrRegex = /([\w:._-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

  let match
  while ((match = tagRegex.exec(xmlString)) !== null) {
    if (match[5] !== undefined) {
      // Text content
      current._text += match[5]
    } else if (match[1] === '/') {
      // Closing tag
      const obj = buildObj(current, attrPrefix, textKey)
      stack.pop()
      if (stack.length > 0) {
        stack[stack.length - 1]._children.push({ _tag: current._tag, _data: obj })
      } else {
        rootElements.push({ _tag: current._tag, _data: obj })
      }
      current = stack.length > 0 ? stack[stack.length - 1] : { _tag: null, _attrs: {}, _children: [], _text: '' }
    } else {
      // Opening tag
      const tag = { _tag: match[2], _attrs: {}, _children: [], _text: '' }
      const attrStr = match[3] || ''
      let attrMatch
      attrRegex.lastIndex = 0
      while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
        tag._attrs[attrMatch[1]] = attrMatch[2] !== undefined ? attrMatch[2] : attrMatch[3]
      }
      stack.push(tag)
      current = tag
      if (match[4] === '/') {
        // Self-closing tag
        const obj = buildObj(current, attrPrefix, textKey)
        stack.pop()
        if (stack.length > 0) {
          stack[stack.length - 1]._children.push({ _tag: current._tag, _data: obj })
        } else {
          rootElements.push({ _tag: current._tag, _data: obj })
        }
        current = stack.length > 0 ? stack[stack.length - 1] : { _tag: null, _attrs: {}, _children: [], _text: '' }
      }
    }
  }

  if (rootElements.length === 0) throw new Error('No root element found')
  return { _rootTag: rootElements[0]._tag, _data: rootElements[0]._data }
}

function buildObj(node, attrPrefix, textKey) {
  const result = {}
  const text = node._text.trim()

  // Add attributes
  for (const [name, value] of Object.entries(node._attrs)) {
    result[attrPrefix + name] = value
  }

  // No children
  if (node._children.length === 0) {
    if (text) {
      if (Object.keys(result).length > 0) {
        result[textKey] = decodeXml(text)
      } else {
        return decodeXml(text)
      }
    } else if (Object.keys(result).length === 0) {
      return null
    }
    return result
  }

  // Group children by tag
  const groups = {}
  for (const child of node._children) {
    if (!groups[child._tag]) groups[child._tag] = []
    groups[child._tag].push(child._data)
  }

  for (const [name, values] of Object.entries(groups)) {
    result[name] = values.length === 1 ? values[0] : values
  }

  if (text) {
    result[textKey] = decodeXml(text)
  }

  return result
}

function decodeXml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

/**
 * XML 特殊字符转义
 */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
