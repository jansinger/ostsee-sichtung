import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	globalSetup: './e2e/global-setup.ts',
	webServer: {
		command: process.env.CI ? 'SKIP_DB_CHECK=true npx vite preview --port 4000' : 'npm run dev',
		url: process.env.CI ? 'http://localhost:4000' : 'https://localhost:4001',
		reuseExistingServer: !process.env.CI,
		timeout: process.env.CI ? 15000 : 120000,
		ignoreHTTPSErrors: true
	},
	testDir: 'e2e',
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 1 : 0,
	/* Use multiple workers on CI for parallel execution */
	workers: process.env.CI ? 4 : undefined,
	/* Global test timeout - increased for CI */
	timeout: process.env.CI ? 60000 : 30000,
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
		/* Increase timeout for CI environment */
		actionTimeout: process.env.CI ? 30000 : 15000,
		navigationTimeout: process.env.CI ? 30000 : 15000
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
