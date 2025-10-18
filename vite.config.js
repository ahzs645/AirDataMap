import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
})
