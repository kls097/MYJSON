import { createApp } from 'vue'
import App from './App.vue'

// 禁用 Monaco Editor 的 source map 加载
// 在 Vite 开发模式下，Monaco 会尝试从 CDN 加载 source map
// 拦截这些请求以避免 404 错误
if (import.meta.env.DEV) {
  const originalFetch = window.fetch;
  window.fetch = function(url, ...args) {
    if (typeof url === 'string' && url.includes('cdn.jsdelivr.net/npm/monaco-editor') && url.endsWith('.map')) {
      // 返回空的 source map 响应
      return Promise.resolve(new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    return originalFetch(url, ...args);
  };
}

createApp(App).mount('#app')
