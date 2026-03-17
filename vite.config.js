import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  clearScreen: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better performance
          'vendor': ['vue'],
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
    host: host || '0.0.0.0',
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**']
    }
  }
})
