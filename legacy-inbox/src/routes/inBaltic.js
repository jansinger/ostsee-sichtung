// @ts-nocheck — reines JavaScript ohne Typdeklarationen (siehe CLAUDE.md, Legacy REST API);
// erst seit Aufgabe 9 von src/tests/contract importiert und damit von tsc erreichbar.
import { checkBalticSea } from '../geo/checkBalticSea.js';
import { antworteJson } from '../respond.js';

/**
 * GET /rest_sichtungen/inBaltic.json?location=<breite>,<laenge>
 *
 * Die Antwortfelder sind vertraglich kleingeschrieben: inbaltic, inchartarea.
 * Fehlerstruktur und -texte folgen der Hauptanwendung
 * (src/routes/rest_sichtungen/inBaltic.json/+server.ts).
 */
export async function inBaltic(req, res) {
	const url = new URL(req.url, 'http://localhost');
	const location = url.searchParams.get('location');

	if (!location) {
		antworteJson(res, 400, {
			error: 'MissingParameter',
			message: 'Parameter "location" is required in format "latitude,longitude"'
		});
		return;
	}

	const teile = location.split(',');
	if (teile.length !== 2) {
		antworteJson(res, 400, {
			error: 'InvalidFormat',
			message: 'Parameter "location" must be in format "latitude,longitude"'
		});
		return;
	}

	const breite = parseFloat(teile[0].trim());
	const laenge = parseFloat(teile[1].trim());

	if (Number.isNaN(breite) || Number.isNaN(laenge)) {
		antworteJson(res, 400, {
			error: 'InvalidCoordinates',
			message: 'Coordinates must be valid numbers'
		});
		return;
	}

	if (breite < -90 || breite > 90) {
		antworteJson(res, 400, {
			error: 'InvalidLatitude',
			message: 'Latitude must be between -90 and 90'
		});
		return;
	}

	if (laenge < -180 || laenge > 180) {
		antworteJson(res, 400, {
			error: 'InvalidLongitude',
			message: 'Longitude must be between -180 and 180'
		});
		return;
	}

	// Auf sechs Nachkommastellen normalisieren, wie die Hauptanwendung.
	const runde = (wert) => Math.round(wert * 1000000) / 1000000;
	const ergebnis = checkBalticSea(runde(laenge), runde(breite));

	antworteJson(
		res,
		200,
		{ inbaltic: ergebnis.inBaltic, inchartarea: ergebnis.inChartArea },
		{ 'Cache-Control': 'public, max-age=300' }
	);
}
