import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  expect: {
    timeout: 5000
  },
  reporter: [['list']],
  use: {
    headless: true,
    actionTimeout: 10000,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'
  },
  webServer: [
    {
      command: 'cmd /c "cd .. && python -m pybnf.webservice"',
      url: 'http://127.0.0.1:8000/health',
      reuseExistingServer: true,
      timeout: 120000
    },
    {
      command: 'npm run dev:frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120000
    }
  ]
})
