import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // мок-сервер тримає стан у пам'яті, паралельні тести можуть конфліктувати
  workers: 1, // примусово один воркер: різні test-файли інакше виконуються паралельно і "збивають" токени один одному
  retries: 0,
  reporter: 'html',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4000',
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },

  // Автоматично піднімає мок-сервер перед прогоном тестів і гасить після
  webServer: {
    command: 'npm run mock-server',
    url: 'http://localhost:4000/health',
    reuseExistingServer: true,
    timeout: 10_000,
  },
});