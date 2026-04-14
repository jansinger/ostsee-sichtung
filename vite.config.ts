/**
 * Vite config for local development (HTTPS, HMR, warmup).
 * See also: vite.config.ci.ts (CI/E2E), vite.config.preview.ts (preview server)
 */
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		Icons({
			compiler: 'svelte',
			autoInstall: true,
			iconCustomizer(_collection, _icon, props) {
				// Set default width and height
				props.width = props.width || '20';
				props.height = props.height || '20';
			}
		}),
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
			'yup',
			'ol',
			'@turf/boolean-point-in-polygon',
			'@turf/helpers',
			'drizzle-orm',
			'exifr',
			'rbush'
		],
		// Exclude large packages that are only used in specific routes
		exclude: ['@scalar/sveltekit', 'handlebars']
	},
	resolve: {
		// Ensure consistent module resolution
		conditions: ['browser', 'import', 'module', 'default']
	}
});
