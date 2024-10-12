import { defineConfig } from 'vite'

export default defineConfig({
  root: './client',
  build: {
    outDir: './dist',
    emptyOutDir: true
  },
  server: {
    host: true, // listen on all network interfaces
    port: 5200
  }
})