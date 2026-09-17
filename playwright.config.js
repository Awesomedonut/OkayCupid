import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: process.env.EVIDENCE_DIR ? `${process.env.EVIDENCE_DIR}/browser-results` : 'test-results',
  use: { baseURL: 'http://127.0.0.1:8799', trace: 'off', screenshot: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ],
  webServer: { command: 'node tests/e2e-server.js', url: 'http://127.0.0.1:8799/api/questions', reuseExistingServer: false, timeout: 20000 }
});
