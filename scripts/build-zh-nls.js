// Build zh-CN NLS messages array for Monaco Editor ESM
// Usage: node scripts/build-zh-nls.js > src/monaco-zh-nls.json
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const monacoDir = 'node_modules/monaco-editor/esm/vs';
const zhLocale = JSON.parse(readFileSync('node_modules/monaco-editor-nls/locale/zh-hans.json', 'utf-8'));

// 1. Scan all .js files for localize(N, "default") calls
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

// Collect localize(index, "defaultMsg") from source
const indexToDefault = new Map();
const indexToFile = new Map();
const files = walkDir(monacoDir);

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  // Match localize(NNN, "...")
  const re = /localize\((\d+),\s*"([^"]*)"\)/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    const idx = parseInt(match[1], 10);
    const defaultMsg = match[2];
    indexToDefault.set(idx, defaultMsg);
    indexToFile.set(idx, file);
  }
}

// 2. Build zh-hans reverse map: English default -> Chinese translation
// The zh-hans.json has structure: { "vs/module/path": { "key": "中文" } }
// We need to match English defaults to Chinese translations
const enToZh = new Map();
for (const [modulePath, entries] of Object.entries(zhLocale)) {
  for (const [key, zhMsg] of Object.entries(entries)) {
    enToZh.set(key, zhMsg);
    // Also try the part after last dot as fallback
    const lastPart = key.split('.').pop();
    if (!enToZh.has(lastPart)) {
      enToZh.set(lastPart, zhMsg);
    }
  }
}

// 3. Build the NLS messages array
const maxIndex = Math.max(...indexToDefault.keys());
const messages = new Array(maxIndex + 1).fill(null);

let translated = 0;
for (const [idx, defaultMsg] of indexToDefault) {
  // Try exact match first
  if (enToZh.has(defaultMsg)) {
    messages[idx] = enToZh.get(defaultMsg);
    translated++;
    continue;
  }
  
  // Try lowercase match
  const lower = defaultMsg.toLowerCase();
  if (enToZh.has(lower)) {
    messages[idx] = enToZh.get(lower);
    translated++;
    continue;
  }

  // Fallback: keep English
  messages[idx] = defaultMsg;
}

console.error(`Translated ${translated}/${indexToDefault.size} messages (max index: ${maxIndex})`);

// 4. Write JSON
writeFileSync('src/monaco-zh-nls.json', JSON.stringify(messages));
console.error('Written to src/monaco-zh-nls.json');
