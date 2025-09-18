import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig({
	plugins: [
		tailwindcss(),
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
			'flowbite-svelte-icons',
			'@fontsource/inter',
			'@fontsource/roboto',
			'svelte-forms-lib',
			'yup',
			'ol',
			'@turf/boolean-point-in-polygon',
			'@turf/helpers',
			'drizzle-orm',
			'exifr',
			'@steeze-ui/lucide-icons',
			'@steeze-ui/svelte-icon',
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