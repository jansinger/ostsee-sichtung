// @ts-nocheck — reines JavaScript ohne Typdeklarationen (siehe CLAUDE.md, Legacy REST API);
// erst seit Aufgabe 9 von src/tests/contract importiert und damit von tsc erreichbar.
import http from 'node:http';
import { health } from './routes/health.js';
import { createSighting } from './routes/createSighting.js';
import { antworten } from './routes/antworten.js';
import { inBaltic } from './routes/inBaltic.js';
import { antworteJson } from './respond.js';
import { fehlerAntwort } from './validate.js';
import { protokolliere } from './logger.js';

/**
 * Antwort für 'clientError' — dieselbe flache Fehlerform wie jede andere
 * abgewiesene Sichtung (siehe createSighting.js, Umgang mit einem
 * Lese-/Parse-Fehler). 'clientError' liefert nur einen rohen Socket, kein
 * res-Objekt (siehe Node-Doku zu diesem Event) — antworteJson greift hier
 * also nicht, die Bytes müssen von Hand geschrieben werden.
 */
const KLIENTFEHLER_KOERPER = JSON.stringify(
	fehlerAntwort({
		_general: [
			'Beim Lesen der Übertragung ist ein Fehler aufgetreten, die Daten sind unvollständig.'
		]
	})
);

/**
 * Die fünf bedienten Pfade. Alles andere ist 404 — insbesondere
 * /sichtungen/showreports.json, das ohne Datenbank nur ein falsches
 * leeres Array liefern könnte (siehe Entwurf, Abschnitt 1).
 */
const ROUTEN = [
	{ pfad: '/health', methode: 'GET', behandeln: health },
	{ pfad: '/rest_sichtungen', methode: 'POST', behandeln: createSighting },
	{ pfad: '/rest_sichtungen/antworten.json', methode: 'GET', behandeln: antworten },
	{ pfad: '/en/rest_sichtungen/antworten.json', methode: 'GET', behandeln: antworten },
	{ pfad: '/rest_sichtungen/inBaltic.json', methode: 'GET', behandeln: inBaltic }
];

export function erstelleServer(abhaengigkeiten) {
	const server = http.createServer(async (req, res) => {
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

	// Ohne eigenen Handler beantwortet Node ein fehlerhaftes oder mitten in der
	// Übertragung abgebrochenes Request selbst — mit seiner eingebauten
	// Klartext-400-Antwort ("HTTP/1.1 400 Bad Request\r\nConnection:
	// close\r\n\r\n"), die weder JSON noch die Vertragsform ist, und die dem
	// eigentlichen Request-Handler den Socket unter den Füßen wegzieht, bevor
	// dessen eigene antworteJson-Antwort dort ankommt (siehe
	// .superpowers/sdd/task-5-report.md, Abschnitt "Fix: flakiger
	// Stream-Abbruch-Test"). Ein Versuch, dem bereits laufenden Handler die
	// Antwort zu überlassen (nur protokollieren, Socket unangetastet lassen),
	// wurde geprüft und verworfen: Genau das Beenden des Sockets ist es, was
	// den hängenden Lesevorgang in createSighting.js (for await über req)
	// überhaupt erst mit einem Fehler abschließt — ohne eigenes Handling
	// bliebe die Verbindung sonst unbeantwortet offen (per Repro bestätigt,
	// siehe Bericht). Diese Antwort hier gewinnt also weiterhin das Rennen
	// gegen den eigenen Schreibvorgang — anders als Node's Default betrifft
	// das aber nur die Antwort, nie das Schreiben selbst.
	server.on('clientError', (fehler, socket) => {
		protokolliere('fehler', 'client_error', { meldung: fehler.message });

		// Node-Doku zu 'clientError': der Socket kann bereits zerstört sein
		// oder nicht mehr beschreibbar — ein Schreibversuch würde dann werfen.
		if (socket.destroyed || !socket.writable) {
			return;
		}

		socket.end(
			'HTTP/1.1 400 Bad Request\r\n' +
				'Content-Type: application/json; charset=utf-8\r\n' +
				`Content-Length: ${Buffer.byteLength(KLIENTFEHLER_KOERPER)}\r\n` +
				'X-Content-Type-Options: nosniff\r\n' +
				'Connection: close\r\n' +
				'\r\n' +
				KLIENTFEHLER_KOERPER
		);
	});

	return server;
}
