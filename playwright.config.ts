import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// By default the suite runs against a production build (`next build && next start`) so it exercises the
// same output Vercel serves. Point E2E_BASE_URL at a preview deployment to test that instead.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'mr-IN',
    // Deployment Protection bypass for a protected Vercel preview (never needed for local runs).
    extraHTTPHeaders: process.env.E2E_BYPASS ? { 'x-vercel-protection-bypass': process.env.E2E_BYPASS } : undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 900 } }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' }, grep: /@mobile/ },
    // Second engine for the layout matrix (WebKit needs system libraries that need root to install).
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 900 } }, grep: /@cross/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `npm run build && npm run start -- -p ${PORT}`, url: `http://localhost:${PORT}`, reuseExistingServer: true, timeout: 600_000 },
});
