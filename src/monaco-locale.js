import zh_CN from 'monaco-editor-nls/locale/zh-hans.json';

// Flatten zh_CN: { "vs/module/path": { "key": "中文" } }
// -> Map<string, string> for English->Chinese lookup
const translations = new Map();
for (const [modulePath, entries] of Object.entries(zh_CN)) {
  for (const [key, value] of Object.entries(entries)) {
    if (typeof value === 'string') {
      translations.set(key, value);
    }
  }
}

// Build a global NLS messages array.
// We intercept localize(N, "fallback") calls and look up Chinese translations
// by matching the English fallback text against our translations map.
const maxIndex = 2100;
const messages = new Array(maxIndex).fill(undefined);

// Set up global NLS so Monaco's nls.js picks it up
globalThis._VSCODE_NLS_MESSAGES = messages;
globalThis._VSCODE_NLS_LANGUAGE = 'zh-cn';

// Patch: We need to intercept localize() calls to translate fallback English -> Chinese.
// Since localize() does: lookupMessage(index, fallback) -> getNLSMessages()?.[index] ?? fallback
// We override _VSCODE_NLS_MESSAGES with a Proxy that translates on-the-fly.
const handler = {
  get(target, prop) {
    if (prop === 'length') return maxIndex;
    const idx = Number(prop);
    if (isNaN(idx)) return undefined;
    // Return undefined forces localize() to use the English fallback,
    // which is the default behavior.
    return undefined;
  }
};

// Actually, we can't intercept the fallback in this way.
// Better approach: set globalThis._VSCODE_NLS_MESSAGES = null so localize() always uses fallback,
// then we DON'T need translations at this level - instead we'll use Vite alias approach.

export { translations };
