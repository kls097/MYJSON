import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue'],
          'monaco-editor': ['monaco-editor'],
          'json-tools': ['jsonpath-plus', 'jmespath', 'json5', 'jsonrepair'],
          'excel': ['xlsx'],
          'quicktype': ['quicktype-core']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['quicktype-core'],
    exclude: []
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
})
