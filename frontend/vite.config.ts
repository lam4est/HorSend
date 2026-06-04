import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(__dirname, '..')

const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:3000',
    changeOrigin: true
  }
}

export default defineConfig({
  plugins: [react()],
  envDir: workspaceRoot,
  server: {
    port: 5173,
    strictPort: false,
    proxy: apiProxy
  },
  preview: {
    port: 5173,
    proxy: apiProxy
  }
})
