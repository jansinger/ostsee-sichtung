/**
 * Vite config for CI/E2E tests (no HTTPS, SKIP_DB_CHECK, no HMR).
 * See also: vite.config.ts (development), vite.config.preview.ts (preview server)
 */
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig({
	// Set environment variable to skip database check in CI/E2E tests
	define: {
		'process.env.SKIP_DB_CHECK': JSON.stringify('true')
	},
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
		devtoolsJson()
		// No basicSsl plugin for CI to avoid HTTPS certificate issues
	],
	server: {
		host: '0.0.0.0',
		port: 4000,
		strictPort: true,
		// Disable HMR overlay for CI
		hmr: false
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
		include: [
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
	}
});
