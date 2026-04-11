// Build Chinese NLS messages for Monaco Editor
// Run: node scripts/build-zh-nls.mjs
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const monacoDir = 'node_modules/monaco-editor/esm/vs';

// Manual English -> Chinese translations for Monaco context menu & UI
const enToZh = {
  // Clipboard
  'Cu&&t': '剪切',
  'Cut': '剪切',
  '&&Copy': '复制',
  'Copy': '复制',
  '&&Paste': '粘贴',
  'Paste': '粘贴',
  'Copy As': '复制为',

  // Find/Replace
  '&&Find': '查找',
  'Find': '查找',
  '&&Replace': '替换',
  'Replace': '替换',
  'Replace All': '全部替换',
  'Find / Replace': '查找 / 替换',
  'Previous Match': '上一个匹配',
  'Next Match': '下一个匹配',
  'Find in Selection': '在选定内容中查找',
  'Close': '关闭',
  'Toggle Replace': '切换替换',
  'No matches. Try searching for something else.': '未找到匹配项',
  'No results': '无结果',
  'No results found': '未找到结果',
  '{0} of {1}': '{0} / {1}',

  // Context menu
  'Go to &&Bracket': '转到括号',
  'Minimap': '缩略图',
  'Render Characters': '渲染字符',
  'Vertical size': '垂直大小',
  'Proportional': '按比例',
  'Fill': '填充',
  'Fit': '适应',
  'Slider': '滑块',
  'Mouse Over': '鼠标悬停',
  'Always': '始终',
  'Show Code Actions': '显示代码操作',
  'Select a command': '选择命令',
  'More Actions...': '更多操作...',

  // Comments
  '&&Toggle Line Comment': '切换行注释',
  'Toggle &&Block Comment': '切换块注释',

  // Problems
  'Next &&Problem': '下一个问题',
  'Previous &&Problem': '上一个问题',
  'Error': '错误',
  'Warning': '警告',
  'Info': '信息',
  'Hint': '提示',

  // Peek / Go to
  'Peek': '查看',
  'Go to &&Definition': '转到定义',
  'Go to &&Declaration': '转到声明',
  'Go to &&Type Definition': '转到类型定义',
  'Go to &&Implementations': '转到实现',
  'Go to &&References': '转到引用',
  'No definition found': '未找到定义',
  'No declaration found': '未找到声明',
  'No type definition found': '未找到类型定义',
  'No implementation found': '未找到实现',
  'No references found': '未找到引用',
  'References': '引用',
  'Loading...': '加载中...',
  'no preview available': '无可用预览',

  // Fold
  'Click to expand the range.': '点击展开',
  'Click to collapse the range.': '点击折叠',

  // General
  'input': '输入',
  'Match Case': '区分大小写',
  'Match Whole Word': '全字匹配',
  'Use Regular Expression': '使用正则表达式',
  'Preserve Case': '保留大小写',
  'Type to search': '输入搜索',
  'Type to filter': '输入筛选',
  'Filter': '筛选',
  'Fuzzy Match': '模糊匹配',
  'Select Box': '选择框',
  'Cleared Input': '已清除输入',
  'Unbound': '未绑定',

  // Code action
  'No code actions available': '无可用代码操作',
  'No preferred code actions available': '无首选代码操作',

  // Paste
  'Show paste options...': '显示粘贴选项...',
  'Insert Plain Text': '插入纯文本',
  'Configure default paste action': '配置默认粘贴操作',

  // Inspect
  'Inspect this in the accessible view via the command Open Accessible View which is currently not triggerable via keybinding.': '通过"打开无障碍视图"命令进行检查',

  // Source actions
  'No source actions available': '无可用源操作',
  'No refactorings available': '无可用重构',
  'No preferred refactorings available': '无首选重构',
  'No organize imports action available': '无可用整理导入操作',
  'No fix all action available': '无可用修复全部操作',
  'No auto fixes available': '无可用自动修复',

  // Color picker
  'Click to toggle color options (rgb/hsl/hex)': '点击切换颜色选项 (rgb/hsl/hex)',
  '&&Show or Focus Standalone Color Picker': '显示或聚焦独立颜色选择器',

  // Format
  'Format Document': '格式化文档',
  'Format Selection': '格式化选定内容',

  // Undo/Redo  
  'Undo': '撤销',
  'Redo': '重做',

  // Select
  'Select All': '全选',

  // Peek actions
  'Close Peek': '关闭预览',

  // Line operations
  'Delete Line': '删除行',
  'Indent Line': '增加缩进',
  'Outdent Line': '减少缩进',
  'Move Line Up': '上移行',
  'Move Line Down': '下移行',
  'Copy Line Up': '向上复制行',
  'Copy Line Down': '向下复制行',
  'Sort Lines Ascending': '升序排列行',
  'Sort Lines Descending': '降序排列行',
  'Trim Trailing Whitespace': '删除行尾空白',
  'Transform to Uppercase': '转换为大写',
  'Transform to Lowercase': '转换为小写',
  'Transform to Title Case': '转换为标题大小写',
  'Transform to Snake Case': '转换为蛇形命名',
  'Insert Line Above': '在上方插入行',
  'Insert Line Below': '在下方插入行',

  // Cursor
  'Add Cursor Above': '在上方添加光标',
  'Add Cursor Below': '在下方添加光标',
  'Add Cursors to Line Ends': '在行尾添加光标',

  // Fold
  'Fold': '折叠',
  'Unfold': '展开',
  'Fold All': '全部折叠',
  'Unfold All': '全部展开',

  // Word wrap
  'Toggle Word Wrap': '切换自动换行',
};

// Scan all localize calls
function walkDir(dir) {
  let results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walkDir(monacoDir);
const indexToEnglish = new Map();

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  const re = /localize\((\d+),\s*"([^"]*)"\)/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    const idx = parseInt(match[1], 10);
    const defaultMsg = match[2];
    // Keep first occurrence (some indices have multiple defaults, first is usually primary)
    if (!indexToEnglish.has(idx)) {
      indexToEnglish.set(idx, defaultMsg);
    }
  }
}

const maxIndex = Math.max(...indexToEnglish.keys());
const messages = new Array(maxIndex + 1);

let translated = 0;
for (const [idx, english] of indexToEnglish) {
  const zh = enToZh[english];
  if (zh) {
    messages[idx] = zh;
    translated++;
  }
  // Leave undefined entries -> Monaco falls back to English
}

console.error(`Translated ${translated}/${indexToEnglish.size} messages (max index: ${maxIndex})`);

writeFileSync('src/monaco-zh-nls.json', JSON.stringify(messages));
console.error('Written to src/monaco-zh-nls.json');
