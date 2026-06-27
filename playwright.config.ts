import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for LifeOS V0.
 *
 * The suite builds and starts the production app, then drives it in Chromium.
 * In CI, browsers come from `npx playwright install`. In environments that
 * ship a pre-installed Chromium (and so can't download one), point at it with
 * `PW_EXECUTABLE_PATH=/path/to/chrome`.
 */
const PORT = Number(process.env.PORT) || 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath: process.env.PW_EXECUTABLE_PATH || undefined,
        },
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
