import http from 'node:http';
import { health } from './routes/health.js';
import { createSighting } from './routes/createSighting.js';
import { antworteJson } from './respond.js';

/**
 * Die vier bedienten Pfade. Alles andere ist 404 — insbesondere
 * /sichtungen/showreports.json, das ohne Datenbank nur ein falsches
 * leeres Array liefern könnte (siehe Entwurf, Abschnitt 1).
 */
const ROUTEN = [
	{ pfad: '/health', methode: 'GET', behandeln: health },
	{ pfad: '/rest_sichtungen', methode: 'POST', behandeln: createSighting },
	{ pfad: '/rest_sichtungen/antworten.json', methode: 'GET', behandeln: null },
	{ pfad: '/en/rest_sichtungen/antworten.json', methode: 'GET', behandeln: null },
	{ pfad: '/rest_sichtungen/inBaltic.json', methode: 'GET', behandeln: null }
];

export function erstelleServer(abhaengigkeiten) {
	return http.createServer(async (req, res) => {
		const pfad = new URL(req.url, 'http://localhost').pathname;
		const treffer = ROUTEN.filter((r) => r.pfad === pfad);

		if (treffer.length === 0) {
			antworteJson(res, 404, { error: 'NotFound', message: 'Unknown endpoint' });
			return;
		}

		const route = treffer.find((r) => r.methode === req.method);
		if (!route) {
			antworteJson(res, 405, {
				error: 'MethodNotAllowed',
				message: `Only ${treffer.map((r) => r.methode).join(', ')} is supported for this endpoint`
			});
			return;
		}

		if (!route.behandeln) {
			antworteJson(res, 501, { error: 'NotImplemented', message: 'Not implemented yet' });
			return;
		}

		try {
			await route.behandeln(req, res, abhaengigkeiten);
		} catch (fehler) {
			console.error('Unbehandelter Fehler', fehler);
			if (!res.headersSent) {
				antworteJson(res, 500, { error: 'InternalError', message: 'Internal server error' });
			}
		}
	});
}
