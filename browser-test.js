/**
 * JSON Schema 功能快速浏览器测试
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5174';

async function runTests() {
  console.log('🚀 启动浏览器测试...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  try {
    // 测试 1: 页面加载
    console.log('📄 测试 1: 页面加载');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log(`   页面标题: ${await page.title()}`);
    console.log('   ✅ 页面加载成功\n');
    
    // 测试 2: 打开 Schema 面板
    console.log('🧭 测试 2: 打开 JSON Schema 面板');
    await page.click('button:has-text("Schema")');
    await page.waitForTimeout(1000);
    console.log('   ✅ Schema 面板已打开\n');
    
    // 测试 3: 检查面板标签
    console.log('📑 测试 3: 检查功能标签');
    for (const tab of ['生成', '验证', 'Mock']) {
      const found = await page.locator('.tab-btn', { hasText: tab }).isVisible().catch(() => false);
      console.log(`   ${found ? '✅' : '⚠️'} ${tab}`);
    }
    console.log('');
    
    // 测试 4: 使用当前 JSON 生成 Schema
    console.log('🔧 测试 4: 从当前 JSON 生成 Schema');
    
    // 设置编辑器中的 JSON
    await page.evaluate(() => {
      const app = document.querySelector('#app').__vue_app__;
      if (app) {
        const instance = app._instance;
        if (instance && instance.refs && instance.refs.compareViewRef) {
          // 通过 Vue 实例设置数据
        }
      }
    });
    
    // 点击编辑器并输入测试数据
    await page.click('.cm-content');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(`{"name":"张三","age":25,"email":"test@example.com"}`);
    console.log('   已设置测试 JSON');
    
    // 点击生成按钮
    await page.click('button:has-text("从当前 JSON 生成 Schema")');
    await page.waitForTimeout(3000);
    console.log('   已点击生成按钮');
    
    // 检查是否有结果显示
    const hasOutput = await page.locator('pre, .schema-output').isVisible().catch(() => false);
    console.log(`   ${hasOutput ? '✅' : '⚠️'} Schema 输出区域${hasOutput ? '可见' : '未找到'}`);
    console.log('');
    
    // 测试 5: Mock 生成
    console.log('🎲 测试 5: Mock 数据生成');
    await page.click('.tab-btn:has-text("Mock")');
    await page.waitForTimeout(500);
    
    // 检查 Mock 面板元素
    const hasMockOptions = await page.locator('select').count() > 0;
    console.log(`   ${hasMockOptions ? '✅' : '⚠️'} Mock 选项${hasMockOptions ? '可用' : '未找到'}`);
    console.log('');
    
    // 测试 6: 验证功能
    console.log('✅ 测试 6: JSON Schema 验证');
    await page.click('.tab-btn:has-text("验证")');
    await page.waitForTimeout(500);
    
    const hasValidateBtn = await page.locator('button:has-text("验证")').isVisible().catch(() => false);
    console.log(`   ${hasValidateBtn ? '✅' : '⚠️'} 验证按钮${hasValidateBtn ? '可用' : '未找到'}`);
    console.log('');
    
    // 截图
    await page.screenshot({ path: '/Users/guguangyi/.openclaw/workspace/browser-test-result.png', fullPage: false });
    console.log('📸 截图已保存\n');
    
    console.log('✨ 浏览器测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    await page.screenshot({ path: '/Users/guguangyi/.openclaw/workspace/browser-test-error.png', fullPage: false });
  } finally {
    await browser.close();
  }
}

runTests();
