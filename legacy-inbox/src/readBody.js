/**
 * Liest den Request-Body mit harter Obergrenze.
 *
 * Die Grenze wird am Stream durchgesetzt, nicht anhand von Content-Length —
 * der Header ist eine Behauptung des Clients. Wird sie erreicht, behalten wir
 * das bereits Gelesene und markieren es als abgeschnitten; verworfen wird nie
 * etwas (siehe Entwurf, Leitsatz in Abschnitt 4).
 */
export async function leseBody(req, { maxBytes }) {
	const stuecke = [];
	let gelesen = 0;
	let abgeschnitten = false;

	for await (const stueck of req) {
		if (gelesen >= maxBytes) {
			abgeschnitten = true;
			break;
		}
		const rest = maxBytes - gelesen;
		if (stueck.length > rest) {
			stuecke.push(stueck.subarray(0, rest));
			gelesen = maxBytes;
			abgeschnitten = true;
			break;
		}
		stuecke.push(stueck);
		gelesen += stueck.length;
	}

	return { roh: Buffer.concat(stuecke).toString('utf8'), abgeschnitten };
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
	if (roh.trim() === '') {
		return { payload: null, parseFehler: 'Leerer Request-Body.' };
	}

	const typ = (contentType || '').toLowerCase();

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
