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
			output: {
				assetFileNames: (assetInfo) => {
					// Stelle sicher, dass Schriftarten in den assets-Ordner kopiert werden
					if (assetInfo.names && assetInfo.names[0] && /\.(woff2?|eot|ttf|otf)$/.test(assetInfo.names[0])) {
						return 'assets/[name]-[hash][extname]';
					}
					return 'assets/[name]-[hash][extname]';
				}
			}
		}
	},
	assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.eot', '**/*.ttf', '**/*.otf'],
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
