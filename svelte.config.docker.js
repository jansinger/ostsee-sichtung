import adapter from '@sveltejs/adapter-node';
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
		// Use Node.js adapter for Docker deployment
		adapter: adapter({
			// Output directory for built application
			out: 'build',
			// Precompress files for better performance
			precompress: {
				brotli: true,
				gzip: true
			},
			// Environment variable configuration
			envPrefix: '',
			// Polyfills for Node.js compatibility
			polyfill: true
		}),

		// Development-specific configurations
		version: {
			pollInterval: process.env.NODE_ENV === 'development' ? 0 : 5000
		},

		// CSP configuration (same as Vercel deployment)
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ["'self'"],
				'script-src': [
					"'self'",
					"'wasm-unsafe-eval'",
					"'unsafe-inline'", // Required for Scalar API documentation
					...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : [])
				],
				'style-src': ["'self'", "'unsafe-inline'", 'https://openlayers.org'],
				'img-src': [
					"'self'",
					'data:',
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
					'https://blob.vercel-storage.com',
					'https://ostsee-tiere.de',
					'https://*.ostsee-tiere.de',
					'https://archive-api.open-meteo.com',
					// Development origins
					'http://localhost:*',
					'https://localhost:*',
					'http://127.0.0.1:*',
					'https://127.0.0.1:*'
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
					// Development - Safari requires explicit ports
					'http://localhost:*',
					'https://localhost:*',
					'http://localhost:4000',
					'https://localhost:4000',
					'http://127.0.0.1:*',
					'https://127.0.0.1:*',
					'http://127.0.0.1:4000',
					'https://127.0.0.1:4000',
					'file:' // Allows file: URLs for local HTML files with iframes
				],
				'upgrade-insecure-requests': process.env.NODE_ENV === 'production'
			},
			reportOnly: {
				// Report-Only directives for monitoring new CSP violations
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
					'file:' // Monitor also file: accesses
				],
				'report-uri': ['/api/csp-report']
			}
		}
	}
};

export default config;
