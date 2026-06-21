import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8822,
    proxy: {
      '/api': {
        target: 'http://localhost:8122',
        changeOrigin: true
      }
    }
  }
})
