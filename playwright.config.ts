import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: 'sso-live.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    ...(process.env.CHROMIUM_PATH
      ? {
          launchOptions: {
            executablePath: process.env.CHROMIUM_PATH,
            args: ['--no-sandbox', '--disable-gpu', '--headless=shell'],
            env: {
              ...process.env,
              LD_LIBRARY_PATH: [process.env.CHROMIUM_LIB, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':'),
            },
          },
        }
      : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
