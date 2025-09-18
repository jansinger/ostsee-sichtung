import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		Icons({
			compiler: 'svelte',
			autoInstall: true,
			iconCustomizer(_collection, _icon, props) {
				// Set default width and height
				props.width = props.width || '20';
				props.height = props.height || '20';
			}
		}),
		sveltekit(),
		devtoolsJson(),
		basicSsl({
			name: 'localhost',
			domains: ['localhost', '*.local.dev'],
			certDir: './certs'
		})
	],
	server: {
		host: 'localhost',
		port: parseInt(process.env.VITE_DEV_PORT || '4000'),
		hmr: {
			overlay: true
		},
		// Warmup critical modules for faster initial page load
		warmup: {
			clientFiles: [
				'./src/routes/+layout.svelte',
				'./src/routes/+page.svelte',
				'./src/app.css',
				'./src/lib/report/components/ModernReportForm.svelte'
			]
		}
	},
	build: {
		rollupOptions: {
			// Suppresses some warnings for better build logs
			onwarn(warning, warn) {
				// Ignore CommonJS plugin warnings
				if (warning.code === 'PLUGIN_WARNING' && warning.plugin === 'commonjs--resolver') {
					return;
				}
				// Keep other warnings
				warn(warning);
			}
		}
	},
	optimizeDeps: {
		// Pre-bundle these dependencies to avoid CommonJS issues and improve startup performance
		include: [
			'@fontsource/inter',
			'@fontsource/roboto',
			'svelte-forms-lib',
			'yup',
			'ol',
			'@turf/boolean-point-in-polygon',
			'@turf/helpers',
			'drizzle-orm',
			'exifr',
			'tailwind-variants',
			'rbush'
		],
		// Exclude large packages that are only used in specific routes
		exclude: ['@scalar/sveltekit', 'handlebars']
	},
	resolve: {
		// Ensure consistent module resolution
		conditions: ['browser', 'import', 'module', 'default']
	},
	test: {
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
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
