import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	compilerOptions: {
		// Enable development mode for better debugging
		dev: process.env.NODE_ENV === 'development'
	},
	kit: {
		adapter: adapter(),

		// CSP-Konfiguration
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ["'self'"],
				'script-src': [
					"'self'",
					"'wasm-unsafe-eval'",
					...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : [])
				],
				'style-src': ["'self'", "'unsafe-inline'", 'https://openlayers.org'],
				'img-src': [
					"'self'",
					'data:', // Korrekt mit Doppelpunkt
					'blob:',
					'https://tile.openstreetmap.org',
					'https://tiles.openseamap.org',
					'https://*.tile.openstreetmap.org',
					'https://4i7mo0wwc3lp8d1e.public.blob.vercel-storage.com',
					'https://blob.vercel-storage.com',
					'https://*.gravatar.com'
				],
				'font-src': ["'self'", 'data:'],
				'connect-src': [
					"'self'",
					'https://tile.openstreetmap.org',
					'https://*.tile.openstreetmap.org',
					'https://api.openstreetmap.org',
					'https://4i7mo0wwc3lp8d1e.public.blob.vercel-storage.com',
					'https://blob.vercel-storage.com'
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
					// Für Development und lokale Dateien - Safari benötigt explizite Ports
					'http://localhost:*',
					'https://localhost:*',
					'http://localhost:4000',
					'https://localhost:4000',
					'http://127.0.0.1:*',
					'https://127.0.0.1:*',
					'http://127.0.0.1:4000',
					'https://127.0.0.1:4000',
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
					'http://localhost:4000',
					'https://localhost:4000',
					'http://127.0.0.1:*',
					'https://127.0.0.1:*',
					'http://127.0.0.1:4000',
					'https://127.0.0.1:4000',
					'file:' // Monitor auch file:-Zugriffe
				],
				'report-uri': ['/api/csp-report']
			}
		}
	}
};

export default config;
