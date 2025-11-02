import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['client/src/**/*.test.js', 'shared/**/*.test.js', 'server/**/*.test.js'],
    environment: 'node',
  },
})
