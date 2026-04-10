// JSON 数据脱敏工具

/**
 * 内置脱敏规则
 */
const BUILT_IN_RULES = [
  {
    id: 'phone',
    name: '手机号',
    patterns: [/phone/i, /mobile/i, /tel/i, /cell/i, /\u624b\u673a/, /\u7535\u8bdd/],
    mask: maskPhone,
    regex: /1[3-9]\d{9}/
  },
  {
    id: 'email',
    name: '邮箱',
    patterns: [/email/i, /mail/i, /\u90ae\u7bb1/],
    mask: maskEmail,
    regex: /[\w.-]+@[\w.-]+\.\w{2,}/
  },
  {
    id: 'idCard',
    name: '身份证号',
    patterns: [/id.?card/i, /identity/i, /id.?no/i, /\u8eab\u4efd\u8bc1/],
    mask: maskIdCard,
    regex: /\d{17}[\dXx]/
  },
  {
    id: 'bankCard',
    name: '银行卡号',
    patterns: [/bank/i, /card.?no/i, /\u94f6\u884c\u5361/, /\u5361\u53f7/],
    mask: maskBankCard,
    regex: /\d{16,19}/
  },
  {
    id: 'ip',
    name: 'IP 地址',
    patterns: [/ip/i, /ip.?addr/i, /\u5730\u5740/i],
    mask: maskIp,
    regex: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/
  },
  {
    id: 'name',
    name: '姓名',
    patterns: [/name$/i, /\u59d3\u540d/, /username/i, /real.?name/i],
    mask: maskName
  }
]

/**
 * 获取内置脱敏规则
 * @returns {Array} 规则列表
 */
export function getBuiltInRules() {
  return BUILT_IN_RULES.map(rule => ({
    id: rule.id,
    name: rule.name,
    patterns: rule.patterns.map(p => p.toString())
  }))
}

/**
 * 自动检测敏感字段
 * @param {string} jsonString - JSON 字符串
 * @returns {{ fields: Array, error: string|null }}
 */
export function detectSensitiveFields(jsonString) {
  try {
    const data = JSON.parse(jsonString)
    const fields = []
    const visited = new Set()

    function scan(obj, path = '') {
      if (!obj || typeof obj !== 'object' || visited.has(obj)) return
      visited.add(obj)

      if (Array.isArray(obj)) {
        obj.forEach((item, i) => scan(item, `${path}[${i}]`))
      } else {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key
          // 检查字段名是否匹配规则
          for (const rule of BUILT_IN_RULES) {
            if (rule.patterns.some(p => p.test(key))) {
              fields.push({
                path: currentPath,
                key,
                ruleId: rule.id,
                ruleName: rule.name,
                sampleValue: typeof value === 'string' ? value.substring(0, 30) : String(value).substring(0, 30)
              })
              break
            }
          }
          // 递归扫描
          if (value && typeof value === 'object') {
            scan(value, currentPath)
          }
        }
      }
    }

    scan(data)
    return { fields, error: null }
  } catch (e) {
    return { fields: [], error: `JSON 解析失败: ${e.message}` }
  }
}

/**
 * 执行数据脱敏
 * @param {string} jsonString - JSON 字符串
 * @param {Object} rules - 启用的规则 { ruleId: true/false } 或 { ruleId: { enabled, customFields: [] } }
 * @returns {{ result: string, error: string|null, stats: Object }}
 */
export function maskJson(jsonString, rules = {}) {
  try {
    const data = JSON.parse(jsonString)
    const stats = { total: 0, byRule: {} }

    // 构建启用的规则映射
    const enabledRules = new Map()
    for (const rule of BUILT_IN_RULES) {
      const ruleConfig = rules[rule.id]
      if (ruleConfig === true || (ruleConfig && ruleConfig.enabled)) {
        const customFields = (ruleConfig && ruleConfig.customFields) || []
        enabledRules.set(rule.id, {
          rule,
          extraPatterns: customFields.map(f => new RegExp(f, 'i'))
        })
      }
    }

    function maskValue(value, key) {
      if (typeof value !== 'string') return { value, masked: false }

      for (const [ruleId, { rule, extraPatterns }] of enabledRules) {
        const allPatterns = [...rule.patterns, ...extraPatterns]
        if (allPatterns.some(p => p.test(key))) {
          const masked = rule.mask(value)
          if (masked !== value) {
            stats.total++
            stats.byRule[ruleId] = (stats.byRule[ruleId] || 0) + 1
            return { value: masked, masked: true }
          }
        }
      }
      return { value, masked: false }
    }

    function process(obj) {
      if (!obj || typeof obj !== 'object') return obj

      if (Array.isArray(obj)) {
        return obj.map(item => process(item))
      }

      const result = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object') {
          result[key] = process(value)
        } else {
          const { value: maskedValue } = maskValue(value, key)
          result[key] = maskedValue
        }
      }
      return result
    }

    const maskedData = process(data)
    const result = JSON.stringify(maskedData, null, 2)

    return { result, error: null, stats }
  } catch (e) {
    return { result: '', error: `脱敏处理失败: ${e.message}`, stats: {} }
  }
}

// ============ 脱敏函数 ============

function maskPhone(value) {
  return value.replace(/(1[3-9]\d)\d{4}(\d{4})/, '$1****$2')
}

function maskEmail(value) {
  const match = value.match(/^([^@]{1,2})[^@]*(@.+)$/) || value.match(/^(.)[^@]*(@.+)$/) 
  if (match) return match[1] + '***' + match[2]
  return value
}

function maskIdCard(value) {
  return value.replace(/^(\d{3})\d{11}(\d{4})$/, '$1***********$2')
}

function maskBankCard(value) {
  return value.replace(/^(\d{4})\d+(\d{4})$/, '$1****$2')
}

function maskIp(value) {
  const parts = value.split('.')
  if (parts.length === 4) {
    return parts[0] + '.' + parts[1] + '.*.*'
  }
  return value
}

function maskName(value) {
  if (!value || typeof value !== 'string') return value
  if (value.length <= 1) return value
  if (value.length === 2) return value[0] + '*'
  return value[0] + '*'.repeat(value.length - 1)
}
