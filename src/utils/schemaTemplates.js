/**
 * JSON Schema 模板库
 * 提供常用的 JSON Schema 模板
 */

/**
 * 内置模板列表
 */
export const builtinTemplates = {
  // 用户信息
  user: {
    name: '用户信息',
    description: '用户数据模型，包含基本信息',
    icon: '👤',
    category: '用户管理',
    schema: {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "User",
      "type": "object",
      "properties": {
        "id": {
          "type": "integer",
          "description": "用户ID",
          "minimum": 1
        },
        "username": {
          "type": "string",
          "description": "用户名",
          "minLength": 3,
          "maxLength": 20,
          "pattern": "^[a-zA-Z0-9_]+$"
        },
        "email": {
          "type": "string",
          "description": "邮箱地址",
          "format": "email"
        },
        "phone": {
          "type": "string",
          "description": "手机号",
          "pattern": "^1[3-9]\\d{9}$"
        },
        "nickname": {
          "type": "string",
          "description": "昵称",
          "maxLength": 50
        },
        "avatar": {
          "type": "string",
          "description": "头像URL",
          "format": "uri"
        },
        "gender": {
          "type": "string",
          "description": "性别",
          "enum": ["male", "female", "other", "unknown"]
        },
        "birthday": {
          "type": "string",
          "description": "生日",
          "format": "date"
        },
        "age": {
          "type": "integer",
          "description": "年龄",
          "minimum": 0,
          "maximum": 150
        },
        "address": {
          "type": "object",
          "description": "地址信息",
          "properties": {
            "province": { "type": "string", "description": "省份" },
            "city": { "type": "string", "description": "城市" },
            "district": { "type": "string", "description": "区县" },
            "detail": { "type": "string", "description": "详细地址" },
            "zipCode": { "type": "string", "description": "邮编" }
          }
        },
        "roles": {
          "type": "array",
          "description": "角色列表",
          "items": {
            "type": "string",
            "enum": ["admin", "user", "vip", "guest"]
          }
        },
        "status": {
          "type": "string",
          "description": "用户状态",
          "enum": ["active", "inactive", "suspended", "deleted"],
          "default": "active"
        },
        "createdAt": {
          "type": "string",
          "description": "创建时间",
          "format": "date-time"
        },
        "updatedAt": {
          "type": "string",
          "description": "更新时间",
          "format": "date-time"
        }
      },
      "required": ["id", "username", "email"]
    }
  },

  // 订单信息
  order: {
    name: '订单信息',
    description: '电商订单数据模型 (Order)',
    icon: '📦',
    category: '电商',
    schema: {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "Order",
      "type": "object",
      "properties": {
        "orderId": {
          "type": "string",
          "description": "订单编号",
          "pattern": "^ORD[0-9]{10}$"
        },
        "userId": {
          "type": "integer",
          "description": "用户ID"
        },
        "items": {
          "type": "array",
          "description": "订单商品列表",
          "items": {
            "type": "object",
            "properties": {
              "productId": {
                "type": "string",
                "description": "商品ID"
              },
              "productName": {
                "type": "string",
                "description": "商品名称"
              },
              "sku": {
                "type": "string",
                "description": "SKU编码"
              },
              "quantity": {
                "type": "integer",
                "description": "数量",
                "minimum": 1
              },
              "unitPrice": {
                "type": "number",
                "description": "单价",
                "minimum": 0
              },
              "totalPrice": {
                "type": "number",
                "description": "小计",
                "minimum": 0
              }
            },
            "required": ["productId", "productName", "quantity", "unitPrice"]
          },
          "minItems": 1
        },
        "subtotal": {
          "type": "number",
          "description": "商品小计",
          "minimum": 0
        },
        "discount": {
          "type": "number",
          "description": "折扣金额",
          "minimum": 0,
          "default": 0
        },
        "shippingFee": {
          "type": "number",
          "description": "运费",
          "minimum": 0,
          "default": 0
        },
        "tax": {
          "type": "number",
          "description": "税费",
          "minimum": 0,
          "default": 0
        },
        "totalAmount": {
          "type": "number",
          "description": "订单总额",
          "minimum": 0
        },
        "currency": {
          "type": "string",
          "description": "货币",
          "enum": ["CNY", "USD", "EUR", "JPY"],
          "default": "CNY"
        },
        "status": {
          "type": "string",
          "description": "订单状态",
          "enum": ["pending", "paid", "shipped", "delivered", "completed", "cancelled", "refunded"]
        },
        "shippingAddress": {
          "type": "object",
          "description": "收货地址",
          "properties": {
            "recipient": { "type": "string", "description": "收件人" },
            "phone": { "type": "string", "description": "联系电话" },
            "province": { "type": "string", "description": "省份" },
            "city": { "type": "string", "description": "城市" },
            "district": { "type": "string", "description": "区县" },
            "detail": { "type": "string", "description": "详细地址" },
            "zipCode": { "type": "string", "description": "邮编" }
          },
          "required": ["recipient", "phone", "detail"]
        },
        "payment": {
          "type": "object",
          "description": "支付信息",
          "properties": {
            "method": {
              "type": "string",
              "description": "支付方式",
              "enum": ["alipay", "wechat", "card", "cash"]
            },
            "transactionId": { "type": "string", "description": "交易号" },
            "paidAt": { "type": "string", "format": "date-time" }
          }
        },
        "remark": {
          "type": "string",
          "description": "订单备注",
          "maxLength": 500
        },
        "createdAt": {
          "type": "string",
          "description": "创建时间",
          "format": "date-time"
        },
        "updatedAt": {
          "type": "string",
          "description": "更新时间",
          "format": "date-time"
        }
      },
      "required": ["orderId", "userId", "items", "totalAmount", "status"]
    }
  },

  // 商品信息
  product: {
    name: '商品信息',
    description: '商品数据模型',
    icon: '🛍️',
    category: '电商',
    schema: {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "Product",
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "商品ID"
        },
        "name": {
          "type": "string",
          "description": "商品名称",
          "minLength": 1,
          "maxLength": 200
        },
        "description": {
          "type": "string",
          "description": "商品描述",
          "maxLength": 5000
        },
        "category": {
          "type": "object",
          "description": "商品分类",
          "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" },
            "parentId": { "type": "string" }
          }
        },
        "brand": {
          "type": "object",
          "description": "品牌信息",
          "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" },
            "logo": { "type": "string", "format": "uri" }
          }
        },
        "price": {
          "type": "number",
          "description": "售价",
          "minimum": 0
        },
        "originalPrice": {
          "type": "number",
          "description": "原价",
          "minimum": 0
        },
        "cost": {
          "type": "number",
          "description": "成本价",
          "minimum": 0
        },
        "currency": {
          "type": "string",
          "description": "货币",
          "enum": ["CNY", "USD", "EUR"],
          "default": "CNY"
        },
        "stock": {
          "type": "integer",
          "description": "库存数量",
          "minimum": 0
        },
        "sku": {
          "type": "string",
          "description": "SKU编码"
        },
        "barcode": {
          "type": "string",
          "description": "条形码"
        },
        "images": {
          "type": "array",
          "description": "商品图片",
          "items": {
            "type": "string",
            "format": "uri"
          }
        },
        "attributes": {
          "type": "array",
          "description": "商品属性",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string", "description": "属性名" },
              "value": { "type": "string", "description": "属性值" }
            }
          }
        },
        "specifications": {
          "type": "array",
          "description": "商品规格",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string", "description": "规格名" },
              "options": {
                "type": "array",
                "items": { "type": "string" },
                "description": "选项列表"
              }
            }
          }
        },
        "weight": {
          "type": "number",
          "description": "重量(kg)",
          "minimum": 0
        },
        "dimensions": {
          "type": "object",
          "description": "尺寸",
          "properties": {
            "length": { "type": "number", "description": "长(cm)" },
            "width": { "type": "number", "description": "宽(cm)" },
            "height": { "type": "number", "description": "高(cm)" }
          }
        },
        "tags": {
          "type": "array",
          "description": "标签",
          "items": { "type": "string" }
        },
        "status": {
          "type": "string",
          "description": "商品状态",
          "enum": ["on_sale", "out_of_stock", "discontinued", "draft"],
          "default": "on_sale"
        },
        "isHot": {
          "type": "boolean",
          "description": "是否热销",
          "default": false
        },
        "isNew": {
          "type": "boolean",
          "description": "是否新品",
          "default": false
        },
        "rating": {
          "type": "number",
          "description": "评分",
          "minimum": 0,
          "maximum": 5
        },
        "reviewCount": {
          "type": "integer",
          "description": "评价数量",
          "minimum": 0
        },
        "salesCount": {
          "type": "integer",
          "description": "销量",
          "minimum": 0
        },
        "createdAt": {
          "type": "string",
          "format": "date-time"
        },
        "updatedAt": {
          "type": "string",
          "format": "date-time"
        }
      },
      "required": ["id", "name", "price"]
    }
  },

  // API 响应
  apiResponse: {
    name: 'API 响应',
    description: '标准 API 响应格式',
    icon: '🔌',
    category: '开发',
    schema: {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "ApiResponse",
      "type": "object",
      "properties": {
        "code": {
          "type": "integer",
          "description": "状态码",
          "default": 200
        },
        "message": {
          "type": "string",
          "description": "消息",
          "default": "success"
        },
        "data": {
          "type": "object",
          "description": "响应数据"
        },
        "timestamp": {
          "type": "integer",
          "description": "时间戳(毫秒)"
        },
        "requestId": {
          "type": "string",
          "description": "请求ID"
        },
        "pagination": {
          "type": "object",
          "description": "分页信息",
          "properties": {
            "page": { "type": "integer", "description": "当前页", "minimum": 1 },
            "pageSize": { "type": "integer", "description": "每页数量", "minimum": 1 },
            "total": { "type": "integer", "description": "总数", "minimum": 0 },
            "totalPages": { "type": "integer", "description": "总页数", "minimum": 0 }
          }
        },
        "errors": {
          "type": "array",
          "description": "错误列表",
          "items": {
            "type": "object",
            "properties": {
              "field": { "type": "string", "description": "字段名" },
              "message": { "type": "string", "description": "错误信息" },
              "code": { "type": "string", "description": "错误码" }
            }
          }
        }
      },
      "required": ["code", "message"]
    }
  },

  // 分页查询
  pagination: {
    name: '分页查询',
    description: '分页查询参数',
    icon: '📄',
    category: '开发',
    schema: {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "Pagination",
      "type": "object",
      "properties": {
        "page": {
          "type": "integer",
          "description": "当前页码",
          "minimum": 1,
          "default": 1
        },
        "pageSize": {
          "type": "integer",
          "description": "每页数量",
          "minimum": 1,
          "maximum": 100,
          "default": 20
        },
        "sortBy": {
          "type": "string",
          "description": "排序字段"
        },
        "sortOrder": {
          "type": "string",
          "description": "排序方向",
          "enum": ["asc", "desc"],
          "default": "desc"
        },
        "keyword": {
          "type": "string",
          "description": "搜索关键词"
        },
        "filters": {
          "type": "array",
          "description": "过滤条件",
          "items": {
            "type": "object",
            "properties": {
              "field": { "type": "string", "description": "字段名" },
              "operator": {
                "type": "string",
                "description": "操作符",
                "enum": ["eq", "ne", "gt", "gte", "lt", "lte", "contains", "startsWith", "endsWith", "in", "between"]
              },
              "value": { "description": "值" }
            }
          }
        },
        "dateRange": {
          "type": "object",
          "description": "日期范围",
          "properties": {
            "start": { "type": "string", "format": "date" },
            "end": { "type": "string", "format": "date" }
          }
        }
      }
    }
  },

  // 文件上传
  fileUpload: {
    name: '文件上传',
    description: '文件上传信息',
    icon: '📎',
    category: '文件',
    schema: {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "FileUpload",
      "type": "object",
      "properties": {
        "fileId": {
          "type": "string",
          "description": "文件ID"
        },
        "fileName": {
          "type": "string",
          "description": "文件名"
        },
        "originalName": {
          "type": "string",
          "description": "原始文件名"
        },
        "mimeType": {
          "type": "string",
          "description": "MIME类型"
        },
        "size": {
          "type": "integer",
          "description": "文件大小(字节)",
          "minimum": 0
        },
        "sizeFormatted": {
          "type": "string",
          "description": "格式化大小"
        },
        "extension": {
          "type": "string",
          "description": "文件扩展名"
        },
        "url": {
          "type": "string",
          "description": "文件URL",
          "format": "uri"
        },
        "thumbnailUrl": {
          "type": "string",
          "description": "缩略图URL",
          "format": "uri"
        },
        "checksum": {
          "type": "string",
          "description": "文件校验值(MD5/SHA)"
        },
        "uploadedAt": {
          "type": "string",
          "description": "上传时间",
          "format": "date-time"
        },
        "uploadedBy": {
          "type": "integer",
          "description": "上传者ID"
        },
        "status": {
          "type": "string",
          "description": "文件状态",
          "enum": ["uploading", "uploaded", "processing", "ready", "error"],
          "default": "uploaded"
        },
        "metadata": {
          "type": "object",
          "description": "文件元数据"
        }
      },
      "required": ["fileId", "fileName", "size"]
    }
  },

  // 评论
  comment: {
    name: '评论',
    description: '评论/评价数据模型',
    icon: '💬',
    category: '内容',
    schema: {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "Comment",
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "评论ID"
        },
        "parentId": {
          "type": ["string", "null"],
          "description": "父评论ID(回复)"
        },
        "targetId": {
          "type": "string",
          "description": "目标ID(文章/商品等)"
        },
        "targetType": {
          "type": "string",
          "description": "目标类型",
          "enum": ["article", "product", "video", "comment"]
        },
        "author": {
          "type": "object",
          "description": "作者信息",
          "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" },
            "avatar": { "type": "string", "format": "uri" },
            "isVerified": { "type": "boolean" }
          }
        },
        "content": {
          "type": "string",
          "description": "评论内容",
          "minLength": 1,
          "maxLength": 2000
        },
        "images": {
          "type": "array",
          "description": "评论图片",
          "items": { "type": "string", "format": "uri" }
        },
        "rating": {
          "type": "integer",
          "description": "评分(1-5)",
          "minimum": 1,
          "maximum": 5
        },
        "likeCount": {
          "type": "integer",
          "description": "点赞数",
          "minimum": 0,
          "default": 0
        },
        "replyCount": {
          "type": "integer",
          "description": "回复数",
          "minimum": 0,
          "default": 0
        },
        "isTop": {
          "type": "boolean",
          "description": "是否置顶",
          "default": false
        },
        "status": {
          "type": "string",
          "description": "状态",
          "enum": ["pending", "approved", "rejected", "deleted"],
          "default": "pending"
        },
        "createdAt": {
          "type": "string",
          "format": "date-time"
        },
        "updatedAt": {
          "type": "string",
          "format": "date-time"
        },
        "replies": {
          "type": "array",
          "description": "回复列表",
          "items": { "$ref": "#" }
        }
      },
      "required": ["id", "targetId", "targetType", "author", "content"]
    }
  }
}

/**
 * 获取所有模板
 * @returns {Array} 模板列表
 */
export function getAllTemplates() {
  return Object.entries(builtinTemplates).map(([key, template]) => ({
    id: key,
    ...template,
    schemaString: JSON.stringify(template.schema, null, 2)
  }))
}

/**
 * 按分类获取模板
 * @returns {Object} 分类映射
 */
export function getTemplatesByCategory() {
  const templates = getAllTemplates()
  const categories = {}
  
  templates.forEach(template => {
    const category = template.category || '其他'
    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push(template)
  })
  
  return categories
}

/**
 * 根据 ID 获取模板
 * @param {string} id - 模板ID
 * @returns {Object|null} 模板对象
 */
export function getTemplateById(id) {
  const template = builtinTemplates[id]
  if (!template) return null
  
  return {
    id,
    ...template,
    schemaString: JSON.stringify(template.schema, null, 2)
  }
}

/**
 * 搜索模板
 * @param {string} keyword - 关键词
 * @returns {Array} 匹配的模板
 */
export function searchTemplates(keyword) {
  if (!keyword) return getAllTemplates()
  
  const lowerKeyword = keyword.toLowerCase()
  return getAllTemplates().filter(template => {
    // 搜索名称、描述、分类
    const basicMatch = (
      template.name.toLowerCase().includes(lowerKeyword) ||
      template.description.toLowerCase().includes(lowerKeyword) ||
      template.category.toLowerCase().includes(lowerKeyword)
    )
    
    // 同时搜索 schema 的 title（支持英文关键词）
    const schemaTitle = template.schema?.title || ''
    const schemaMatch = schemaTitle.toLowerCase().includes(lowerKeyword)
    
    return basicMatch || schemaMatch
  })
}

/**
 * 获取分类列表
 * @returns {Array} 分类名称列表
 */
export function getCategories() {
  const templates = getAllTemplates()
  const categories = [...new Set(templates.map(t => t.category || '其他'))]
  return categories.sort()
}

/**
 * 保存用户自定义模板
 * @param {string} name - 模板名称
 * @param {Object} schema - Schema 对象
 * @param {Object} meta - 元数据
 */
export function saveCustomTemplate(name, schema, meta = {}) {
  try {
    const storageKey = `custom_schema_template_${name}`
    const data = {
      name,
      schema,
      description: meta.description || '',
      category: meta.category || '自定义',
      icon: meta.icon || '📝',
      createdAt: Date.now()
    }
    
    if (window.utools) {
      window.utools.db.put({
        _id: storageKey,
        data
      })
    } else {
      localStorage.setItem(storageKey, JSON.stringify(data))
    }
    
    return true
  } catch (error) {
    console.error('保存自定义模板失败:', error)
    return false
  }
}

/**
 * 获取所有自定义模板
 * @returns {Array} 自定义模板列表
 */
export function getCustomTemplates() {
  try {
    const templates = []
    
    if (window.utools) {
      const docs = window.utools.db.allDocs()
      docs.forEach(doc => {
        if (doc._id.startsWith('custom_schema_template_')) {
          templates.push({
            id: doc._id.replace('custom_schema_template_', ''),
            ...doc.data,
            isCustom: true,
            schemaString: JSON.stringify(doc.data.schema, null, 2)
          })
        }
      })
    } else {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('custom_schema_template_')) {
          const data = JSON.parse(localStorage.getItem(key))
          templates.push({
            id: key.replace('custom_schema_template_', ''),
            ...data,
            isCustom: true,
            schemaString: JSON.stringify(data.schema, null, 2)
          })
        }
      }
    }
    
    return templates.sort((a, b) => b.createdAt - a.createdAt)
  } catch (error) {
    console.error('获取自定义模板失败:', error)
    return []
  }
}

/**
 * 删除自定义模板
 * @param {string} name - 模板名称
 */
export function deleteCustomTemplate(name) {
  try {
    const storageKey = `custom_schema_template_${name}`
    
    if (window.utools) {
      const doc = window.utools.db.get(storageKey)
      if (doc) {
        window.utools.db.remove(doc._id)
      }
    } else {
      localStorage.removeItem(storageKey)
    }
    
    return true
  } catch (error) {
    console.error('删除自定义模板失败:', error)
    return false
  }
}
