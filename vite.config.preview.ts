/**
 * Vite config for preview server (no HTTPS, port 4000).
 * See also: vite.config.ts (development), vite.config.ci.ts (CI/E2E)
 */
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
		port: 4000,
		host: true,
		strictPort: true
	},
	resolve: {
		// Ensure consistent module resolution
		conditions: ['browser', 'import', 'module', 'default']
	}
});
