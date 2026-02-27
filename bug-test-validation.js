/**
 * JSON Schema 验证功能 Bug 测试
 * 测试步骤：
 * 1. 输入复杂 JSON
 * 2. 生成 JSON Schema
 * 3. 修改 JSON 字段类型
 * 4. 验证是否能捕获错误
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5173';

// 测试用的复杂 JSON
const complexJson = {
  user: {
    id: 12345,
    username: "zhangsan",
    email: "zhangsan@example.com",
    profile: {
      name: "张三",
      age: 28,
      avatar: "https://example.com/avatar.jpg",
      address: {
        province: "广东省",
        city: "深圳市",
        detail: "南山区科技园"
      }
    },
    roles: ["admin", "user"],
    settings: {
      theme: "dark",
      notifications: true,
      language: "zh-CN"
    },
    createdAt: "2024-01-15T08:30:00Z",
    score: 95.5
  },
  orders: [
    {
      orderId: "ORD20240001",
      total: 299.99,
      items: [
        { productId: "P001", name: "商品A", price: 99.99, quantity: 2 },
        { productId: "P002", name: "商品B", price: 100.01, quantity: 1 }
      ]
    }
  ]
};

// 修改后的 JSON（字段类型错误）
const modifiedJson = JSON.parse(JSON.stringify(complexJson));
modifiedJson.user.id = true; // 从 number 改为 boolean
modifiedJson.user.profile.age = "28"; // 从 number 改为 string

async function testValidation() {
  console.log('🐛 JSON Schema 验证 Bug 测试\n');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  try {
    // 步骤 1: 打开页面
    console.log('\n📄 步骤 1: 打开页面');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('   ✅ 页面加载成功');
    
    // 步骤 2: 在编辑器中输入复杂 JSON
    console.log('\n📝 步骤 2: 输入复杂 JSON');
    await page.click('.cm-content');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(JSON.stringify(complexJson, null, 2));
    console.log('   ✅ 已输入复杂 JSON');
    
    // 截图记录
    await page.screenshot({ path: '/Users/guguangyi/.openclaw/workspace/step1-original-json.png' });
    
    // 步骤 3: 打开 Schema 面板并生成 Schema
    console.log('\n🔧 步骤 3: 生成 JSON Schema');
    await page.click('button:has-text("Schema")');
    await page.waitForTimeout(1000);
    
    // 确保在生成标签
    await page.click('.tab-btn:has-text("生成")');
    await page.waitForTimeout(500);
    
    // 点击生成按钮
    await page.click('button:has-text("从当前 JSON 生成 Schema")');
    await page.waitForTimeout(3000);
    
    console.log('   ✅ 已生成 Schema');
    await page.screenshot({ path: '/Users/guguangyi/.openclaw/workspace/step2-generated-schema.png' });
    
    // 步骤 4: 切换到验证标签
    console.log('\n✅ 步骤 4: 切换到验证功能');
    await page.click('.tab-btn:has-text("验证")');
    await page.waitForTimeout(500);
    console.log('   ✅ 已切换到验证标签');
    await page.screenshot({ path: '/Users/guguangyi/.openclaw/workspace/step3-validate-tab.png' });
    
    // 步骤 5: 先验证原始 JSON（应该通过）
    console.log('\n🧪 步骤 5: 验证原始 JSON（应该通过）');
    await page.click('button:has-text("验证当前 JSON")');
    await page.waitForTimeout(1500);
    
    const originalResult = await page.locator('.validation-result, .result-success, .result-error').first().textContent().catch(() => '');
    console.log(`   验证结果: ${originalResult.substring(0, 100)}`);
    
    if (originalResult.includes('✓') || originalResult.includes('通过') || originalResult.includes('success')) {
      console.log('   ✅ 原始 JSON 验证通过（符合预期）');
    } else {
      console.log('   ⚠️ 原始 JSON 验证未通过（可能有问题）');
    }
    
    await page.screenshot({ path: '/Users/guguangyi/.openclaw/workspace/step4-original-valid.png' });
    
    // 步骤 6: 修改 JSON，将 id 从 number 改为 boolean
    console.log('\n🔴 步骤 6: 修改 JSON 字段类型（制造错误）');
    console.log('   - 将 user.id 从 12345 (number) 改为 true (boolean)');
    console.log('   - 将 user.profile.age 从 28 (number) 改为 "28" (string)');
    
    // 关闭 Schema 面板，回到编辑器修改 JSON
    await page.click('button[title="关闭"]');
    await page.waitForTimeout(500);
    
    // 修改 JSON
    await page.click('.cm-content');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(JSON.stringify(modifiedJson, null, 2));
    console.log('   ✅ 已修改 JSON');
    
    await page.screenshot({ path: '/Users/guguangyi/.openclaw/workspace/step5-modified-json.png' });
    
    // 步骤 7: 重新打开 Schema 面板并验证
    console.log('\n🧪 步骤 7: 验证修改后的 JSON（应该失败）');
    await page.click('button:has-text("Schema")');
    await page.waitForTimeout(1000);
    
    // 确保在验证标签
    await page.click('.tab-btn:has-text("验证")');
    await page.waitForTimeout(500);
    
    // 点击验证按钮
    await page.click('button:has-text("验证当前 JSON")');
    await page.waitForTimeout(1500);
    
    const modifiedResult = await page.locator('.validation-result, .result-success, .result-error').first().textContent().catch(() => '');
    console.log(`   验证结果: ${modifiedResult.substring(0, 200)}`);
    
    await page.screenshot({ path: '/Users/guguangyi/.openclaw/workspace/step6-modified-validated.png' });
    
    // 分析结果
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果分析');
    console.log('='.repeat(60));
    
    const hasError = modifiedResult.includes('✗') || 
                     modifiedResult.includes('错误') || 
                     modifiedResult.includes('失败') ||
                     modifiedResult.includes('error') ||
                     modifiedResult.includes('invalid');
    
    if (hasError) {
      console.log('✅ 验证功能正常：成功检测到类型错误');
      console.log('   修改后的 JSON 被正确识别为不符合 Schema');
    } else {
      console.log('❌ 发现 BUG：验证功能未能检测到类型错误！');
      console.log('   修改后的 JSON 应该验证失败，但实际通过了验证');
    }
    
    // 检查是否有具体的错误信息
    const errorDetails = await page.locator('.error-item, .error-list').allTextContents().catch(() => []);
    if (errorDetails.length > 0) {
      console.log('\n📝 检测到的错误详情：');
      errorDetails.forEach((detail, i) => {
        console.log(`   ${i + 1}. ${detail.substring(0, 100)}`);
      });
    }
    
    console.log('\n📸 所有截图已保存到 ~/.openclaw/workspace/');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    await page.screenshot({ path: '/Users/guguangyi/.openclaw/workspace/test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testValidation();
