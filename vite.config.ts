import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/cmms-app/',
  plugins: [react()],
  resolve: {
    alias: { '@': 'C:/Users/vicen/CMMS/frontend/src' }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true }
    }
  }
})
