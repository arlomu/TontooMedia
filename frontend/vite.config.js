import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    // Same-Origin-Support: /api/... am Frontend-Port wird ans Backend (3001)
    // weitergeleitet. Damit funktionieren auch relative API-URLs (API_BASE = '')
    // bei Reverse-Proxy-Deployments und im Dev-Betrieb.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    host: true,
  },
})
