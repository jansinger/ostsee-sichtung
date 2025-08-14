import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig({
	plugins: [
		tailwindcss(),
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
		port: 4000
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
		// Pre-bundle these dependencies to avoid CommonJS issues
		include: ['flowbite-svelte-icons', '@fontsource/inter', '@fontsource/roboto']
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
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
