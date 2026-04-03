import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/bmad-viewer/',
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
  },
  build: {
    outDir: 'dist'
  }
})
