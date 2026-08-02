import { defineConfig, devices } from '@playwright/test';
import { worktreeDevPort } from './src/tools/dev-server-identity';

/**
 * Lokal bekommt jedes Arbeitsverzeichnis seinen eigenen Port.
 *
 * Vorher stand hier für *alle* Worktrees fest 4001 (`VITE_DEV_PORT=4001` im
 * `test:e2e`-Skript). Zusammen mit `reuseExistingServer` benutzte ein Lauf damit
 * kommentarlos den Dev-Server eines anderen Worktrees — gemessen am 2026-08-02, als
 * 4000 *und* 4001 einem fremden Branch gehörten. Ein manuell gesetztes `VITE_DEV_PORT`
 * hat weiterhin Vorrang (nützlich, um den Abbruch in `e2e/global-setup.ts` vorzuführen).
 *
 * CI bleibt bei 4000: dort läuft genau ein Job in einem eigenen Container. Der Port
 * steht dort bewusst *hier* und wird nicht aus dem Hash abgeleitet — sonst bekäme der
 * Server ein `VITE_DEV_PORT`, das nur deshalb folgenlos bleibt, weil
 * `vite.config.ci.ts` den Port hart auf 4000 setzt. Zieht jemand die CI-Config später
 * mit `vite.config.ts` gleich, liefe der Server auf dem Hash-Port, während Playwright
 * auf 4000 wartet — Ausgang wäre ein webServer-Timeout ohne verwertbare Meldung.
 */
const devPort = process.env.CI
	? 4000
	: Number(process.env.VITE_DEV_PORT) || worktreeDevPort(process.cwd());
const baseURL = `${process.env.CI ? 'http' : 'https'}://localhost:${devPort}`;

export default defineConfig({
	globalSetup: './e2e/global-setup.ts',
	webServer: {
		command: process.env.CI ? 'npx vite dev --config vite.config.ci.ts' : 'npm run dev',
		url: baseURL,
		env: { VITE_DEV_PORT: String(devPort) },
		/**
		 * Bleibt lokal an: Ein übrig gebliebener Server *dieses* Worktrees spart bei
		 * jedem Lauf den Kaltstart. Dass er auch wirklich aus diesem Verzeichnis
		 * ausliefert, prüft `e2e/global-setup.ts` — Wiederverwendung ist damit
		 * überprüft statt geraten.
		 */
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
		ignoreHTTPSErrors: true
	},
	testDir: 'e2e',
	/* e2e/helpers/*.test.ts are vitest unit tests (collected separately by vitest.config.ts's
	 * `server` project) that happen to live under e2e/ — Playwright's default glob would
	 * otherwise pick them up too and crash at collection time. */
	testIgnore: ['**/helpers/**'],
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
		baseURL,
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
