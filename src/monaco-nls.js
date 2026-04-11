// Custom nls.js for Monaco Editor that supports Chinese localization
// This replaces monaco-editor/esm/vs/nls.js via Vite alias

const isPseudo = (typeof document !== 'undefined' && document.location && typeof document.location.hash === 'string' && document.location.hash.indexOf('pseudo=true') >= 0);

function _format(message, args) {
  let result;
  if (args.length === 0) {
    result = message;
  } else {
    result = message.replace(/\{(\d+)\}/g, (match, rest) => {
      const index = rest[0];
      const arg = args[index];
      let result = match;
      if (typeof arg === 'string') {
        result = arg;
      } else if (typeof arg === 'number' || typeof arg === 'boolean' || arg === void 0 || arg === null) {
        result = String(arg);
      }
      return result;
    });
  }
  if (isPseudo) {
    result = '\uFF3B' + result.replace(/[aouei]/g, '$&$&') + '\uFF3D';
  }
  return result;
}

// Chinese translations map: English fallback -> Chinese
let _translations = null;

function initLocale(data) {
  _translations = new Map();
  for (const [, entries] of Object.entries(data)) {
    for (const [, value] of Object.entries(entries)) {
      if (typeof value === 'string') {
        _translations.set(value, value);
      }
    }
  }
}

function localize(data, message, ...args) {
  let translated = message;
  if (typeof data === 'number' && _translations) {
    translated = _translations.get(message) || message;
  }
  return _format(translated, args);
}

function localize2(data, originalMessage, ...args) {
  let message;
  if (typeof data === 'number' && _translations) {
    message = _translations.get(originalMessage) || originalMessage;
  } else {
    message = originalMessage;
  }
  const value = _format(message, args);
  return {
    value,
    original: originalMessage === message ? value : _format(originalMessage, args)
  };
}

function getNLSMessages() {
  return null;
}

function getNLSLanguage() {
  return 'zh-cn';
}

export { getNLSLanguage, getNLSMessages, initLocale, localize, localize2 };
