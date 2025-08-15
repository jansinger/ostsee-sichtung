import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	globalSetup: './e2e/global-setup.ts',
	webServer: {
		command: process.env.CI 
			? 'npm run dev -- --config vite.config.e2e.ts' 
			: 'npm run dev',
		port: 4000,
		reuseExistingServer: !process.env.CI,
		timeout: 120000
	},
	testDir: 'e2e',
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : undefined,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: process.env.CI ? 'github' : 'html',
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: process.env.CI ? 'http://localhost:4000' : 'https://localhost:4000',
		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',
		/* Screenshot on failure */
		screenshot: 'only-on-failure',
		/* Ignore HTTPS errors for local development */
		ignoreHTTPSErrors: !process.env.CI
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
