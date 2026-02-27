/**
 * JSON Schema 验证 Bug 测试 - 直接输入 Schema 版本
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5173';

// 测试 Schema
const testSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" }
  },
  "required": ["id", "name"]
};

// 正确的 JSON
const validJson = { id: 123, name: "测试" };

// 错误的 JSON (id 类型错误)
const invalidJson = { id: true, name: "测试" };

async function testValidation() {
  console.log('🐛 JSON Schema 验证 Bug 测试 (简化版)\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✅ 页面加载成功');
    
    // 输入正确的 JSON
    console.log('\n📝 输入正确的 JSON:', JSON.stringify(validJson));
    await page.click('.cm-content');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(JSON.stringify(validJson, null, 2));
    
    // 打开 Schema 面板
    await page.click('button:has-text("Schema")');
    await page.waitForTimeout(1000);
    console.log('✅ Schema 面板已打开');
    
    // 切换到验证标签
    await page.click('.tab-btn:has-text("验证")');
    await page.waitForTimeout(500);
    
    // 在 Schema 编辑器中输入 Schema
    console.log('\n🔧 输入 Schema:', JSON.stringify(testSchema).substring(0, 80) + '...');
    const schemaEditor = await page.locator('.schema-editor .cm-content, .panel-section .cm-content').first();
    await schemaEditor.click();
    await schemaEditor.type(JSON.stringify(testSchema, null, 2));
    console.log('✅ Schema 已输入');
    
    await page.screenshot({ path: '/Users/guguangyi/.openclaw/workspace/bug-test-1-schema-input.png' });
    
    // 点击验证按钮
    console.log('\n✅ 点击验证按钮 (验证正确 JSON)');
    await page.click('button:has-text("验证当前 JSON")');
    await page.waitForTimeout(1500);
    
    const result1 = await page.locator('.validation-result, .result-success, .result-error').first().textContent().catch(() => '');
    console.log('   结果:', result1.substring(0, 100));
    await page.screenshot({ path: '/Users/guguangyi/.openclaw/workspace/bug-test-2-valid-result.png' });
    
    // 现在输入错误的 JSON
    console.log('\n🔴 修改为错误 JSON (id: true):', JSON.stringify(invalidJson));
    await page.click('.cm-content');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(JSON.stringify(invalidJson, null, 2));
    
    // 再次验证
    console.log('✅ 再次点击验证按钮');
    await page.click('button:has-text("验证当前 JSON")');
    await page.waitForTimeout(1500);
    
    const result2 = await page.locator('.validation-result, .result-success, .result-error').first().textContent().catch(() => '');
    console.log('   结果:', result2.substring(0, 200));
    await page.screenshot({ path: '/Users/guguangyi/.openclaw/workspace/bug-test-3-invalid-result.png' });
    
    // 分析
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果分析');
    console.log('='.repeat(60));
    
    const detectedError = result2.includes('✗') || result2.includes('错误') || result2.includes('error') || result2.includes('类型');
    
    if (detectedError) {
      console.log('✅ 验证功能正常：成功检测到类型错误');
    } else {
      console.log('❌ BUG 确认：验证功能未能检测到类型错误！');
      console.log('   应该报告：id 应该是 integer 类型，但实际是 boolean');
    }
    
    // 检查是否有详细的错误信息
    const errors = await page.locator('.error-item').allTextContents().catch(() => []);
    if (errors.length > 0) {
      console.log('\n📝 错误详情:');
      errors.forEach((e, i) => console.log(`   ${i+1}. ${e.substring(0, 100)}`));
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    await page.screenshot({ path: '/Users/guguangyi/.openclaw/workspace/bug-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testValidation();
