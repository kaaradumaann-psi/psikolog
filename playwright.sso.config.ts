import { defineConfig } from '@playwright/test';

const executablePath = process.env.CHROMIUM_PATH;
const libPath = process.env.CHROMIUM_LIB;

export default defineConfig({
  testDir: './e2e',
  testMatch: 'sso-live.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
    headless: true,
    ...(executablePath
      ? {
          launchOptions: {
            executablePath,
            args: ['--no-sandbox', '--disable-gpu', '--headless=shell'],
            env: {
              ...process.env,
              LD_LIBRARY_PATH: [libPath, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':'),
            },
          },
        }
      : {}),
  },
});
