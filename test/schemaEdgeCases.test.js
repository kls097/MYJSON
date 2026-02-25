/**
 * JSON Schema 边界情况和高级功能测试
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');

// 模拟浏览器环境
const mockDbStorage = new Map();
global.window = {
  utools: {
    db: {
      get: (id) => mockDbStorage.get(id) || null,
      put: (doc) => { mockDbStorage.set(doc._id, doc); },
      allDocs: () => Array.from(mockDbStorage.values())
    }
  }
};

const {
  validateJsonWithSchema,
  generateMockData,
  validateSchema,
  getSchemaExample
} = require('../src/utils/schemaValidator.js');

const {
  generateSchema,
  generateSchemaFromSamples,
  mergeSchemas
} = require('../src/utils/schemaGenerator.js');

const {
  getAllTemplates,
  getTemplateById,
  searchTemplates
} = require('../src/utils/schemaTemplates.js');

describe('JSON Schema 边界情况测试', () => {
  describe('validateJsonWithSchema 边界情况', () => {
    it('应该处理深层嵌套对象', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: {
                    type: 'object',
                    properties: {
                      value: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      });
      
      const validJson = JSON.stringify({
        level1: { level2: { level3: { value: 'deep' } } }
      });
      
      const result = validateJsonWithSchema(validJson, schema);
      assert.strictEqual(result.valid, true);
    });

    it('应该验证 URI 格式', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' }
        }
      });
      
      const validJson = JSON.stringify({ url: 'https://example.com/path' });
      const invalidJson = JSON.stringify({ url: 'not-a-uri' });
      
      assert.strictEqual(validateJsonWithSchema(validJson, schema).valid, true);
      assert.strictEqual(validateJsonWithSchema(invalidJson, schema).valid, false);
    });

    it('应该验证日期格式', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          createdAt: { type: 'string', format: 'date-time' }
        }
      });
      
      const validJson = JSON.stringify({ createdAt: '2024-01-01T00:00:00Z' });
      const invalidJson = JSON.stringify({ createdAt: 'not-a-date' });
      
      assert.strictEqual(validateJsonWithSchema(validJson, schema).valid, true);
      assert.strictEqual(validateJsonWithSchema(invalidJson, schema).valid, false);
    });

    it('应该验证正则表达式模式', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          phone: { 
            type: 'string', 
            pattern: '^1[3-9]\\d{9}$'
          }
        }
      });
      
      const validJson = JSON.stringify({ phone: '13800138000' });
      const invalidJson = JSON.stringify({ phone: '123' });
      
      assert.strictEqual(validateJsonWithSchema(validJson, schema).valid, true);
      assert.strictEqual(validateJsonWithSchema(invalidJson, schema).valid, false);
    });

    it('应该验证数组长度限制', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          items: {
            type: 'array',
            minItems: 2,
            maxItems: 5,
            items: { type: 'string' }
          }
        }
      });
      
      const validJson = JSON.stringify({ items: ['a', 'b', 'c'] });
      const tooFew = JSON.stringify({ items: ['a'] });
      const tooMany = JSON.stringify({ items: ['a', 'b', 'c', 'd', 'e', 'f'] });
      
      assert.strictEqual(validateJsonWithSchema(validJson, schema).valid, true);
      assert.strictEqual(validateJsonWithSchema(tooFew, schema).valid, false);
      assert.strictEqual(validateJsonWithSchema(tooMany, schema).valid, false);
    });

    it('应该验证字符串长度限制', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          name: { 
            type: 'string',
            minLength: 3,
            maxLength: 10
          }
        }
      });
      
      const validJson = JSON.stringify({ name: 'Alice' });
      const tooShort = JSON.stringify({ name: 'Al' });
      const tooLong = JSON.stringify({ name: 'AlexanderTheGreat' });
      
      assert.strictEqual(validateJsonWithSchema(validJson, schema).valid, true);
      assert.strictEqual(validateJsonWithSchema(tooShort, schema).valid, false);
      assert.strictEqual(validateJsonWithSchema(tooLong, schema).valid, false);
    });

    it('应该验证数值范围', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          age: { 
            type: 'integer',
            minimum: 0,
            maximum: 150
          },
          score: {
            type: 'number',
            exclusiveMinimum: 0,
            exclusiveMaximum: 100
          }
        }
      });
      
      const validJson = JSON.stringify({ age: 25, score: 85.5 });
      const tooYoung = JSON.stringify({ age: -1, score: 50 });
      const tooOld = JSON.stringify({ age: 200, score: 50 });
      
      assert.strictEqual(validateJsonWithSchema(validJson, schema).valid, true);
      assert.strictEqual(validateJsonWithSchema(tooYoung, schema).valid, false);
      assert.strictEqual(validateJsonWithSchema(tooOld, schema).valid, false);
    });

    it('应该验证枚举值', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending']
          }
        }
      });
      
      const validJson = JSON.stringify({ status: 'active' });
      const invalidJson = JSON.stringify({ status: 'deleted' });
      
      assert.strictEqual(validateJsonWithSchema(validJson, schema).valid, true);
      assert.strictEqual(validateJsonWithSchema(invalidJson, schema).valid, false);
    });

    it('应该验证额外属性', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        additionalProperties: false
      });
      
      const validJson = JSON.stringify({ name: '张三' });
      const withExtra = JSON.stringify({ name: '张三', extra: 'value' });
      
      assert.strictEqual(validateJsonWithSchema(validJson, schema).valid, true);
      assert.strictEqual(validateJsonWithSchema(withExtra, schema).valid, false);
    });

    it('应该验证 anyOf', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          value: {
            anyOf: [
              { type: 'string' },
              { type: 'integer' }
            ]
          }
        }
      });
      
      const stringJson = JSON.stringify({ value: 'test' });
      const intJson = JSON.stringify({ value: 123 });
      const invalidJson = JSON.stringify({ value: true });
      
      assert.strictEqual(validateJsonWithSchema(stringJson, schema).valid, true);
      assert.strictEqual(validateJsonWithSchema(intJson, schema).valid, true);
      assert.strictEqual(validateJsonWithSchema(invalidJson, schema).valid, false);
    });
  });

  describe('generateMockData 边界情况', () => {
    it('应该处理复杂嵌套 Schema', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              profile: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  settings: {
                    type: 'object',
                    properties: {
                      theme: { type: 'string' },
                      notifications: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        }
      });
      
      const mock = generateMockData(schema);
      const parsed = JSON.parse(mock);
      
      assert.ok(parsed.user);
      assert.ok(parsed.user.profile);
      assert.ok(typeof parsed.user.profile.name === 'string');
    });

    it('应该处理数组中的对象', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' }
              }
            }
          }
        }
      });
      
      const mock = generateMockData(schema);
      const parsed = JSON.parse(mock);
      
      assert.ok(Array.isArray(parsed.items));
      // 如果数组非空，验证第一项的类型
      if (parsed.items.length > 0) {
        assert.ok(typeof parsed.items[0].id === 'number');
      }
    });

    it('应该处理带有默认值的 Schema', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          status: { 
            type: 'string',
            default: 'active'
          },
          count: {
            type: 'integer',
            default: 0
          }
        }
      });
      
      const mock = generateMockData(schema);
      const parsed = JSON.parse(mock);
      
      assert.ok(typeof parsed.status === 'string');
      assert.ok(typeof parsed.count === 'number');
    });
  });

  describe('generateSchema 边界情况', () => {
    it('应该处理包含 null 值的 JSON', async () => {
      const json = JSON.stringify({ name: 'test', value: null });
      const schema = await generateSchema(json);
      const parsed = JSON.parse(schema);
      
      assert.strictEqual(parsed.type, 'object');
    });

    it('应该处理包含特殊字符的 JSON', async () => {
      const json = JSON.stringify({ 
        name: '测试 "引号" 和 \\ 反斜杠',
        emoji: '🎉🎊'
      });
      const schema = await generateSchema(json);
      const parsed = JSON.parse(schema);
      
      assert.strictEqual(parsed.type, 'object');
    });

    it('应该处理空数组', async () => {
      const json = JSON.stringify([]);
      const schema = await generateSchema(json);
      const parsed = JSON.parse(schema);
      
      assert.strictEqual(parsed.type, 'array');
    });

    it('应该处理混合类型数组', async () => {
      const json = JSON.stringify([1, 'string', true, null]);
      const schema = await generateSchema(json);
      const parsed = JSON.parse(schema);
      
      assert.strictEqual(parsed.type, 'array');
    });
  });

  describe('模板功能边界情况', () => {
    it('应该返回所有内置模板', () => {
      const templates = getAllTemplates();
      
      assert.ok(templates.length >= 7);
      
      // 检查关键模板
      const ids = templates.map(t => t.id);
      assert.ok(ids.includes('user'));
      assert.ok(ids.includes('order'));
      assert.ok(ids.includes('product'));
      assert.ok(ids.includes('apiResponse'));
    });

    it('应该正确处理不存在的模板 ID', () => {
      const template = getTemplateById('non_existent_template');
      assert.strictEqual(template, null);
    });

    it('应该支持大小写不敏感的搜索', () => {
      const results1 = searchTemplates('USER');
      const results2 = searchTemplates('user');
      
      assert.ok(results1.length > 0);
      assert.ok(results2.length > 0);
    });

    it('应该支持中文搜索', () => {
      const results = searchTemplates('用户');
      assert.ok(results.some(t => t.id === 'user'));
    });
  });
});
