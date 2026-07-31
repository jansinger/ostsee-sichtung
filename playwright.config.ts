import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	globalSetup: './e2e/global-setup.ts',
	webServer: {
		command: process.env.CI ? 'npx vite dev --config vite.config.ci.ts' : 'npm run dev',
		url: process.env.CI ? 'http://localhost:4000' : 'https://localhost:4001',
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
		ignoreHTTPSErrors: true
	},
	testDir: 'e2e',
	/* e2e/helpers/bannedClasses.test.ts ist ein Vitest-Unit-Test (läuft über
	   test:unit, siehe vitest.config.ts) und hat kein Playwright-`test()`.
	   Ohne testIgnore sammelt Playwright die Datei trotzdem ein und bricht
	   beim ersten `describe()` mit "Cannot read properties of undefined
	   (reading 'config')" ab — noch bevor ein einziger E2E-Test läuft. */
	testIgnore: '**/helpers/**',
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 1 : 0,
	/* CI: 1 worker — Vite dev server can't handle parallel page compilation reliably */
	workers: process.env.CI ? 1 : undefined,
	/* Global test timeout */
	timeout: 30000,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: process.env.CI ? 'github' : 'html',
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: process.env.CI ? 'http://localhost:4000' : 'https://localhost:4001',
		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',
		/* Screenshot on failure */
		screenshot: 'only-on-failure',
		/* Ignore HTTPS errors for local development */
		ignoreHTTPSErrors: !process.env.CI,
		actionTimeout: 15000,
		navigationTimeout: 15000
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
