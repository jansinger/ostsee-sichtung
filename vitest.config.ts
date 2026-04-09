import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/lib/**/*.ts'],
			exclude: [
				// Enum/Option definitions — pure data, no logic
				'src/lib/report/formOptions/**',
				// Test files
				'**/*.test.ts',
				'**/*.spec.ts',
				// Type-only files
				'src/**/*.d.ts',
				// OpenLayers map controllers — instantiate OL Map/View/Layer/Canvas, need real DOM+WebGL
				'src/lib/map/optimizedMapController.ts',
				'src/lib/map/simpleMapController.ts',
				'src/lib/map/popup.ts',
				'src/lib/map/controls/**',
				// OpenLayers helper utilities — import OL modules, require real DOM+WebGL
				'src/lib/utils/map/**',
				// Type definition files only
				'src/lib/types/**',
				// Svelte context / form wiring — Svelte runtime deps
				'src/lib/report/formContext.ts',
				// CLI tools — not unit-testable
				'src/tools/**',
				// Browser-only utilities — require browser APIs (Blob, URL, DOM, File, FormData)
				'src/lib/utils/download.ts',
				'src/lib/utils/fieldNavigation.ts',
				'src/lib/utils/client/**',
				'src/lib/utils/media/**',
				'src/lib/utils/upload/**',
				'src/lib/utils/uploadUtils.ts',
				// Server infrastructure — Svelte context wiring, no testable logic
				'src/lib/report/formContext.ts'
			],
			thresholds: {
				statements: 70,
				branches: 65,
				functions: 75,
				lines: 70
			}
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['./vitest-setup-server.ts'],
					// Force UTC timezone for consistent date/time tests across environments
					env: {
						TZ: 'UTC',
						NODE_ENV: 'test'
					}
				}
			}
		]
	}
});
