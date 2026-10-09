import { defineConfig } from "@playwright/test";

// E2E tests start their own app + API on separate ports with a throwaway database,
// so they never touch your real progress. CORTA_CHROMIUM: optional Chromium binary path
// (sandboxes/CI); otherwise run `npx playwright install chromium` once.
const executablePath = process.env.CORTA_CHROMIUM || undefined;
const appPort = Number(process.env.CORTA_TEST_APP_PORT || 5174);
const apiPort = Number(process.env.CORTA_TEST_API_PORT || 8788);
const env = {
  CORTA_APP_PORT: String(appPort),
  CORTA_PORT: String(apiPort),
  CORTA_DB: "server/data/e2e.db",
  CORTA_E2E: "1",
  VITE_CORTA_TEST_CONTENT: "1",
  CORTA_LLM_PROVIDER: "mock",
};

export default defineConfig({
  testDir: "tests",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${appPort}`,
    launchOptions: { executablePath },
  },
  webServer: [
    { command: "npm run start:server", url: `http://localhost:${apiPort}/api/health`, reuseExistingServer: true, timeout: 120_000, env },
    { command: "npm run dev:app", url: `http://localhost:${appPort}`, reuseExistingServer: true, timeout: 180_000, env },
  ],
});
