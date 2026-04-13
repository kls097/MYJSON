import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue'],
          'monaco-editor': ['monaco-editor'],
          'json-tools': ['jsonpath-plus', 'jmespath', 'json5', 'jsonrepair'],
          'excel': ['xlsx'],
          'quicktype': ['quicktype-core'],
          'jsoncrack': ['react', 'react-dom', 'jsoncrack-react', 'reaflow']
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'quicktype-core',
      'jsoncrack-react',
      'react',
      'react-dom',
      'react-dom/client',
      'human-format'
    ],
    exclude: []
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
})
