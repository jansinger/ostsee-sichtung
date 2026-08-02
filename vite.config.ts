/**
 * Vite config for local development (HTTPS, HMR, warmup).
 * See also: vite.config.ci.ts (CI/E2E), vite.config.preview.ts (preview server)
 */
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import { devServerIdentity } from './src/tools/dev-server-identity';
import { stableDepHash } from './src/tools/vite-stable-dep-hash';

const certFile = fileURLToPath(new URL('./certs/localhost.pem', import.meta.url));
const keyFile = fileURLToPath(new URL('./certs/localhost-key.pem', import.meta.url));

/**
 * Von mkcert ausgestellte Zertifikate (scripts/setup-dev-certs.mjs, läuft vor `npm run dev`)
 * akzeptiert Chrome ohne Warnung. Fehlen sie — etwa weil mkcert nicht installiert ist —
 * übernimmt basicSsl mit einem selbstsignierten Zertifikat: funktioniert, zeigt aber das
 * Chrome-Interstitial.
 */
const devCert =
	existsSync(certFile) && existsSync(keyFile)
		? { cert: readFileSync(certFile), key: readFileSync(keyFile) }
		: null;

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
		...(devCert
			? []
			: [
					basicSsl({
						name: 'localhost',
						domains: ['localhost', '*.local.dev'],
						certDir: './certs/basic-ssl'
					})
				]),
		// Meldet unter /__dev-server-identity, aus welchem Verzeichnis ausgeliefert wird.
		devServerIdentity(),
		// Zuletzt: sortiert resolve.external/noExternal nach allen anderen Plugins.
		stableDepHash()
	],
	server: {
		host: 'localhost',
		port: parseInt(process.env.VITE_DEV_PORT || '4000'),
		/**
		 * Ohne `strictPort` weicht Vite bei belegtem Port still auf den nächsten aus.
		 * Das ist hier immer ein Fehlerzustand, nie eine brauchbare Rückfallebene:
		 * `PUBLIC_SITE_URL` steht fest auf 4000 und baut daraus die Auth0-Callback-URL,
		 * ein Server auf 4001 hat also einen kaputten Login. Und weil Playwright lokal
		 * einen vorhandenen Server wiederverwendet, machte genau dieses Ausweichen
		 * E2E-Läufe gegen fremde Worktrees möglich. Abbruch mit Meldung ist richtig.
		 */
		strictPort: true,
		...(devCert ? { https: devCert } : {}),
		hmr: {
			overlay: true
		},
		/**
		 * Git-Worktrees liegen unter `.claude/worktrees/` *innerhalb* des Repo-Roots.
		 * Aktuell hält Vite sie ohnehin heraus (es beobachtet nur Dateien aus dem
		 * Modulgraph), und alle übrigen Tools schließen sie über `.gitignore` aus.
		 * Der Eintrag hier ist die Absicherung: Fällt die `.gitignore`-Zeile weg,
		 * beobachtet der Watcher sonst still ein Vielfaches an Dateien.
		 * Vite ergänzt seine Defaults (`**\/node_modules/**`, `**\/.git/**`).
		 */
		watch: {
			ignored: ['**/.claude/worktrees/**', '**/.worktrees/**']
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
