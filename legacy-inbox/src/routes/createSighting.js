import { leseBody, parseBody } from '../readBody.js';
import { validiere, fehlerAntwort } from '../validate.js';
import { antworteJson } from '../respond.js';

/**
 * POST /rest_sichtungen
 *
 * Reihenfolge ist die Zusage dieses Dienstes: lesen, parsen, validieren,
 * SCHREIBEN, antworten. Die Validierung bestimmt nur Antwort und
 * Zielverzeichnis — nie, ob geschrieben wird (Entwurf, Abschnitt 4).
 */
export async function createSighting(req, res, { konfiguration, store, rateLimit }) {
	const ip = ermittleIp(req);

	// Die einzige Regel, die ohne Schreiben abweist: Sie schützt nicht vor
	// Missbrauch, sondern davor, dass eine Flut die Platte füllt und damit
	// alle nachfolgenden Sichtungen unschreibbar macht.
	if (!rateLimit.pruefeGlobal()) {
		antworteJson(res, 429, { error: 'TooManyRequests', message: 'Too many requests' });
		return;
	}

	const { roh, abgeschnitten } = await leseBody(req, { maxBytes: konfiguration.maxBodyBytes });
	const contentType = req.headers['content-type'] || '';
	const { payload, parseFehler } = parseBody(roh, contentType);

	const validierung = payload
		? await validiere(payload)
		: {
				gueltig: false,
				fehler: { _general: [parseFehler ?? 'Body konnte nicht gelesen werden.'] }
			};

	const umschlag = {
		empfangen_am: new Date().toISOString(),
		quelle: {
			ip,
			user_agent: req.headers['user-agent'] || '',
			content_type: contentType
		},
		roh,
		abgeschnitten,
		payload,
		validierung
	};

	// Ab hier gibt es keinen Weg mehr, der die Daten fallen lässt.
	let geschrieben;
	try {
		geschrieben = await store.schreibe(
			umschlag,
			validierung.gueltig && !abgeschnitten ? 'posteingang' : 'abgewiesen'
		);
	} catch (fehler) {
		console.error('Schreiben fehlgeschlagen', fehler);
		antworteJson(res, 500, {
			error: 'Failed to save sighting',
			message: 'Internal server error occurred'
		});
		return;
	}

	// Das Rate-Limit pro IP weist erst hier ab — der Request ist bereits
	// sicher abgelegt. Mobilfunkanbieter setzen CGNAT ein; ein 429 an eine
	// echte Meldewelle wäre derselbe stille Verlust wie ein falsches 400.
	if (!rateLimit.pruefeIp(ip)) {
		antworteJson(res, 429, { error: 'TooManyRequests', message: 'Too many requests' });
		return;
	}

	if (!validierung.gueltig) {
		antworteJson(res, 400, fehlerAntwort(validierung.fehler));
		return;
	}

	antworteJson(
		res,
		201,
		{ message: 'Saved' },
		{ Location: `/rest_sichtungen/view/${geschrieben.lfdNr}.json` }
	);
}

/**
 * Ermittelt die Absender-IP.
 *
 * X-Forwarded-For wird NICHT verwendet: Die Kopfzeile kommt vom Client. Hängt
 * der Proxy den echten Wert nur an, statt zu ersetzen, genügt ein zufälliges
 * X-Forwarded-For je Request, um das Rate-Limit pro IP auszuhebeln — jeder
 * Request zählte dann als neue IP.
 *
 * Stattdessen X-Real-IP, das nginx setzt und das ein Client nicht durchreichen
 * kann (Plesk-Direktive siehe README), sonst die Adresse der Verbindung selbst.
 */
function ermittleIp(req) {
	const vomProxy = req.headers['x-real-ip'];
	if (typeof vomProxy === 'string' && vomProxy.length > 0) {
		return vomProxy.trim();
	}
	return req.socket.remoteAddress || '';
}
