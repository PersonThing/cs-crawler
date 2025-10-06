import { defineConfig } from 'vite'
import path from 'path'
// import { fileURLToPath } from 'url'
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename)

export default defineConfig({
  root: './client',
  build: {
    outDir: './dist',
    emptyOutDir: true,
  },
  server: {
    host: true, // listen on all network interfaces
    port: 5200,
  },
  resolve: {
    alias: {
      '#shared': path.resolve(__dirname, '../shared'),
    },
  },
})
