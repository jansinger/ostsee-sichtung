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
	// Welche Anfragen gerade in einem eigenen Handler stecken. 'clientError'
	// bekommt nur den rohen Socket; ohne dieses Verzeichnis lässt sich nicht
	// unterscheiden, ob überhaupt jemand da ist, der noch antworten wird.
	const inFlug = new Map();

	const server = http.createServer(async (req, res) => {
		inFlug.set(req.socket, { req, res });
		res.on('close', () => inFlug.delete(req.socket));

		// Schutz-Listener: Der clientError-Handler unten meldet einen Abbruch
		// über req.emit('error', …). Ein 'error' ohne Zuhörer beendet den
		// Prozess — und zwar genau dann, wenn der Abbruch außerhalb des
		// Lesevorgangs eintrifft, also während bereits geschrieben wird. Der
		// Fehler selbst ist an dieser Stelle schon protokolliert.
		req.on('error', () => {});

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

	// 'clientError' deckt zwei grundverschiedene Lagen ab, und nur die
	// Unterscheidung hält die Zusage „nie antworten, bevor geschrieben ist".
	//
	// (1) Die Kopfzeilen waren vollständig, der Body bricht mitten in der
	//     Übertragung ab (HPE_INVALID_EOF_STATE). Node hat das 'request'-
	//     Ereignis dann längst ausgelöst: Ein Handler läuft, hat den Teil-Body
	//     bereits gelesen und wird gleich schreiben und antworten. Antwortete
	//     hier zusätzlich der clientError-Handler, käme beim Client ein 400 an,
	//     bevor irgendetwas auf der Platte liegt — und scheiterte das Schreiben
	//     danach, wäre das dafür vorgesehene 500 nicht mehr zustellbar.
	//     Deshalb: nicht antworten. Der Socket bleibt unangetastet, damit die
	//     Antwort des Handlers ihren Weg noch findet.
	//
	//     Der Lesevorgang muss aber beendet werden. Ohne Zutun bleibt
	//     `for await (… of req)` in leseBody für dieses Fehlerbild für immer
	//     hängen (per Repro bestätigt, siehe .superpowers/sdd/task-5-report.md):
	//     Node reicht den Parser-Fehler nicht an den Request-Strom durch. Ein
	//     req.destroy(fehler) scheidet aus — das reißt den Socket mit und damit
	//     die Antwort. Bleibt, den Fehler dem Strom selbst zuzustellen; der
	//     Async-Iterator bricht darauf ab, leseBody gibt das Gelesene zurück.
	//
	//     Connection: close ist nötig, weil die Verbindung nach einem
	//     Framing-Fehler nicht wiederverwendbar ist: Ohne die Kopfzeile hält
	//     Node sie als Keep-Alive offen und der Client wartet auf ein Ende,
	//     das erst der Zeitablauf bringt.
	//
	// (2) Schon die Kopfzeilen waren unbrauchbar (etwa HPE_INVALID_METHOD).
	//     Es gibt keinen Handler und keine Sichtung — hier muss geantwortet
	//     werden, sonst gewinnt Nodes eingebaute Klartext-400-Antwort, die
	//     weder JSON noch die Vertragsform ist.
	server.on('clientError', (fehler, socket) => {
		protokolliere('fehler', 'client_error', { meldung: fehler.message });

		const laufend = inFlug.get(socket);
		if (laufend && !laufend.res.writableEnded) {
			if (!laufend.res.headersSent) {
				laufend.res.setHeader('Connection', 'close');
			}
			laufend.req.emit('error', fehler);
			return;
		}

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
