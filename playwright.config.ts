import { defineConfig, devices } from '@playwright/test';

const adminBaseUrl = 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'admin-chromium',
      testMatch: /admin\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: adminBaseUrl },
    },
  ],
  webServer: {
    command: 'yarn workspace @app/admin dev --host 127.0.0.1 --port 5173 --strictPort',
    url: adminBaseUrl,
    reuseExistingServer: !process.env.CI,
    stdout: process.env.CI ? 'pipe' : 'ignore',
    stderr: 'pipe',
    timeout: 120_000,
  },
});
