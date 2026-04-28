import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
      '/scan': 'http://localhost:8000',
      '/threat-surface': 'http://localhost:8000',
      '/ai-chat': 'http://localhost:8000',
      '/nuclei-status': 'http://localhost:8000',
      '/nuclei-results': 'http://localhost:8000',
      '/run-nuclei': 'http://localhost:8000',
      '/stop-nuclei': 'http://localhost:8000',
    }
  }
})
