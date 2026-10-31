import { defineConfig } from 'vitest/config'

// Unit tests: pure logic only (paywall rules, AI-response validation, webhook signatures, popularity).
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
