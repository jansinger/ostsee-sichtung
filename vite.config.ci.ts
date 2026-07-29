/**
 * Vite config for CI/E2E tests (no HTTPS, SKIP_DB_CHECK, no HMR).
 * See also: vite.config.ts (development), vite.config.preview.ts (preview server)
 */
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { createRequire } from 'node:module';
import path from 'node:path';
import Icons from 'unplugin-icons/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { stableDepHash } from './src/tools/vite-stable-dep-hash';

/**
 * In Git-Worktrees liegt das installierte node_modules außerhalb des
 * Worktree-Roots (Node löst es per Verzeichnis-Aufstieg aus dem Haupt-Repo
 * auf). Vites server.fs.allow blockt dann die Auslieferung z. B. von
 * vitest-browser-svelte an die Browser-Tests. Deshalb das reale
 * node_modules über Nodes eigene Auflösung ermitteln — ein bloßer
 * Existenz-Check reicht nicht, weil Vite im Worktree ein Cache-Stub
 * (node_modules/.vite) ohne Pakete anlegt.
 */
const require = createRequire(import.meta.url);
const nodeModulesDir = path.dirname(path.dirname(require.resolve('vite/package.json')));

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
		// No basicSsl plugin for CI to avoid HTTPS certificate issues
		// Zuletzt: sortiert resolve.external/noExternal nach allen anderen Plugins.
		stableDepHash()
	],
	server: {
		host: '0.0.0.0',
		port: 4000,
		strictPort: true,
		// Disable HMR overlay for CI
		hmr: false,
		fs: {
			// fs.allow ersetzt Vites Default (Workspace-Root) — daher beides angeben
			allow: [searchForWorkspaceRoot(process.cwd()), nodeModulesDir]
		}
	},
	optimizeDeps: {
		// Pre-bundle these dependencies to avoid CommonJS issues
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
