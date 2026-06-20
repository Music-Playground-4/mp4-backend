import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// @/* 경로 별칭(tsconfig)을 테스트에서도 동일하게 해석하도록 alias 직접 지정
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    env: {
      AUTH_SECRET: 'test-secret-for-vitest-only-do-not-use-in-prod',
    },
  },
})
