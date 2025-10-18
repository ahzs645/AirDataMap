import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ command }) => {
  const base = process.env.VITE_BASE_PATH ?? (command === 'build' ? './' : '/')

  return {
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
  }
})
