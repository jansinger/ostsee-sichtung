import { StringDecoder } from 'node:string_decoder';

/**
 * Liest den Request-Body mit harter Obergrenze.
 *
 * Die Grenze wird am Stream durchgesetzt, nicht anhand von Content-Length —
 * der Header ist eine Behauptung des Clients. Wird sie erreicht, behalten wir
 * das bereits Gelesene und markieren es als abgeschnitten; verworfen wird nie
 * etwas (siehe Entwurf, Leitsatz in Abschnitt 4).
 *
 * Eine fehlende oder nicht-positive maxBytes ist ein Programmierfehler am
 * Aufrufort (nicht Client-Input) — dafür wird geworfen, statt die Grenze
 * stillschweigend zu deaktivieren.
 *
 * Die Dekodierung läuft über StringDecoder statt Buffer#toString: der
 * Schnitt bei maxBytes kann mitten in ein mehrbytiges UTF-8-Zeichen fallen,
 * und StringDecoder hält ein unvollständiges Zeichen am Ende zurück statt es
 * als Ersatzzeichen (U+FFFD) auszugeben. So bleibt roh sauber auf einer
 * vollständigen Zeichengrenze, ohne dass davor etwas verloren geht.
 */
export async function leseBody(req, { maxBytes } = {}) {
	if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
		throw new Error('leseBody benötigt eine positive maxBytes-Obergrenze.');
	}

	const decoder = new StringDecoder('utf8');
	let roh = '';
	let gelesen = 0;
	let abgeschnitten = false;

	for await (const stueck of req) {
		if (gelesen >= maxBytes) {
			abgeschnitten = true;
			break;
		}
		const rest = maxBytes - gelesen;
		if (stueck.length > rest) {
			roh += decoder.write(stueck.subarray(0, rest));
			gelesen = maxBytes;
			abgeschnitten = true;
			break;
		}
		roh += decoder.write(stueck);
		gelesen += stueck.length;
	}

	// Nur bei vollständig gelesenem Body flushen: end() würde ein am Rand
	// abgeschnittenes Zeichen als Ersatzzeichen ausgeben. Bei abgeschnitten
	// wird das zurückgehaltene Rest-Byte bewusst verworfen (siehe oben).
	if (!abgeschnitten) {
		roh += decoder.end();
	}

	return { roh, abgeschnitten };
}

/**
 * Parst nach Kräften: JSON, sonst Formulardaten.
 *
 * Wirft nie — ein Parse-Fehler ist ein Vermerk im Umschlag, keine
 * Abbruchbedingung. Die Hauptanwendung akzeptiert beide Formate ausdrücklich
 * für Mobile-Clients ohne Content-Type
 * (src/routes/rest_sichtungen/+server.ts:54).
 */
export function parseBody(roh, contentType) {
	// Nicht-stringiger roh (undefined, null, Zahl, Array …) ist kein
	// gültiger Body-Text — wie ein leerer Body behandeln statt zu werfen.
	if (typeof roh !== 'string') {
		return { payload: null, parseFehler: 'Body konnte nicht als Text gelesen werden.' };
	}

	if (roh.trim() === '') {
		return { payload: null, parseFehler: 'Leerer Request-Body.' };
	}

	// Ein truthy, aber nicht-stringiger Content-Type (z.B. ein Array) würde
	// an toLowerCase() sonst werfen — wie fehlend behandeln.
	const typ = typeof contentType === 'string' ? contentType.toLowerCase() : '';

	if (typ.includes('application/x-www-form-urlencoded')) {
		return { payload: formularZuObjekt(roh), parseFehler: null };
	}

	try {
		const geparst = JSON.parse(roh);
		if (geparst === null || typeof geparst !== 'object' || Array.isArray(geparst)) {
			return { payload: null, parseFehler: 'JSON ist kein Objekt.' };
		}
		return { payload: geparst, parseFehler: null };
	} catch (fehler) {
		// Kein gültiges JSON — als Formulardaten versuchen, bevor aufgegeben wird.
		if (roh.includes('=')) {
			return { payload: formularZuObjekt(roh), parseFehler: null };
		}
		return { payload: null, parseFehler: `JSON konnte nicht gelesen werden: ${fehler.message}` };
	}
}

function formularZuObjekt(roh) {
	return Object.fromEntries(new URLSearchParams(roh).entries());
}
