import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),

		// CSP-Konfiguration
		csp: {
			directives: {
				'default-src': ["'self'"],
				'script-src': ["'self'", "'wasm-unsafe-eval'"],
				'style-src': ["'self'", "'unsafe-inline'", 'https://openlayers.org'],
				'img-src': [
					"'self'",
					'data:', // Korrekt mit Doppelpunkt
					'blob:',
					'https://tile.openstreetmap.org',
					'https://tiles.openseamap.org',
					'https://*.tile.openstreetmap.org'
				],
				'font-src': ["'self'"],
				'connect-src': [
					"'self'",
					'https://tile.openstreetmap.org',
					'https://*.tile.openstreetmap.org',
					'https://api.openstreetmap.org'
				],
				'worker-src': ["'self'", 'blob:'],
				'frame-src': ["'self'"],
				'object-src': ["'none'"],
				'base-uri': ["'self'"],
				'form-action': ["'self'"],
				'frame-ancestors': [
					"'self'",
					'https://meeresmuseum.de',
					'https://*.meeresmuseum.de',
					'https://deutsches-meeresmuseum.de',
					'https://*.deutsches-meeresmuseum.de',
					// Für Development und lokale Dateien
					'http://localhost:*',
					'https://localhost:*',
					'file:' // Erlaubt file:-URLs für lokale HTML-Dateien mit iframes
				],
				'upgrade-insecure-requests': process.env.NODE_ENV === 'production'
			},
			reportOnly: {
				// Report-Only Direktiven für Monitoring neuer CSP-Verletzungen
				'frame-ancestors': [
					"'self'",
					'https://meeresmuseum.de',
					'https://*.meeresmuseum.de',
					'https://deutsches-meeresmuseum.de',
					'https://*.deutsches-meeresmuseum.de',
					'http://localhost:*',
					'https://localhost:*',
					'file:' // Monitor auch file:-Zugriffe
				],
				'report-uri': ['/api/csp-report']
			}
		}
	}
};

export default config;
