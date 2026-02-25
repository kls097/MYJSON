const { chromium } = require('playwright');
const BASE_URL = 'http://localhost:5173';
const testSchema = JSON.stringify({"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"id":{"type":"integer"},"name":{"type":"string"}},"required":["id","name"]}, null, 2);
const validJson = JSON.stringify({id:123,name:"测试"}, null, 2);
const invalidJson = JSON.stringify({id:true,name:"测试"}, null, 2);

async function test() {
  console.log('🐛 JSON Schema 验证 Bug 测试');
  const browser = await chromium.launch({headless:false});
  const page = await browser.newPage({viewport:{width:1400,height:900}});
  
  await page.goto(BASE_URL, {waitUntil:'networkidle'});
  await page.waitForTimeout(2000);
  console.log('✅ 页面加载成功');
  
  await page.click('.cm-content');
  await page.keyboard.press('Control+a');
  await page.keyboard.type(validJson);
  console.log('✅ 已输入正确的 JSON');
  
  await page.click('button:has-text(\"Schema\")');
  await page.waitForTimeout(1000);
  console.log('✅ Schema 面板已打开');
  
  await page.click('.tab-btn:has-text(\"验证\")');
  await page.waitForTimeout(500);
  
  const schemaEditors = await page.locator('.cm-content').all();
  console.log(`找到 ${schemaEditors.length} 个编辑器`);
  
  if (schemaEditors.length >= 2) {
    await schemaEditors[1].click();
    await schemaEditors[1].type(testSchema);
    console.log('✅ Schema 已输入');
  }
  
  await page.waitForTimeout(1000);
  
  const validateBtn = await page.locator('button:has-text(\"验证当前 JSON\")');
  const isEnabled = await validateBtn.isEnabled().catch(()=>false);
  console.log(`验证按钮: ${isEnabled?'可用':'禁用'}`);
  
  if (isEnabled) {
    await validateBtn.click();
    await page.waitForTimeout(2000);
    const result = await page.locator('.validation-result, .result-success, .result-error').first().textContent().catch(()=>'');
    console.log('验证结果:', result.substring(0,200)||'(空)');
  }
  
  console.log('\n🔴 修改为错误的 JSON');
  await page.click('.cm-content');
  await page.keyboard.press('Control+a');
  await page.keyboard.type(invalidJson);
  console.log('✅ 已输入错误的 JSON');
  
  const validateBtn2 = await page.locator('button:has-text(\"验证当前 JSON\")');
  if (await validateBtn2.isEnabled().catch(()=>false)) {
    await validateBtn2.click();
    await page.waitForTimeout(2000);
    const result2 = await page.locator('.validation-result, .result-success, .result-error').first().textContent().catch(()=>'');
    console.log('验证结果:', result2.substring(0,200)||'(空)');
    
    const detectedError = result2.includes('✗') || result2.includes('错误') || result2.includes('类型');
    console.log(detectedError ? '✅ 检测到错误' : '❌ 未检测到错误');
  }
  
  await page.waitForTimeout(10000);
  await browser.close();
}
test().catch(console.error);
