import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		devtoolsJson()
		// No basicSsl plugin for preview in CI to avoid HTTPS certificate issues
	],
	preview: {
		port: 4173,
		host: true,
		strictPort: true
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
	}
});