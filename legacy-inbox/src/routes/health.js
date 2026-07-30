// @ts-nocheck — reines JavaScript ohne Typdeklarationen (siehe CLAUDE.md, Legacy REST API);
// erst seit Aufgabe 9 von src/tests/contract importiert und damit von tsc erreichbar.
/**
 * Health-Endpunkt für die externe Überwachung.
 *
 * Prüft ausdrücklich die Beschreibbarkeit des Datenverzeichnisses und nicht
 * nur, ob der Prozess antwortet: Ein Dienst, der läuft aber nicht schreiben
 * kann, ist für diesen Zweck genauso kaputt wie einer, der tot ist.
 */
import { antworteJson } from '../respond.js';

export async function health(_req, res, { store }) {
	const beschreibbar = await store.istBeschreibbar();

	if (!beschreibbar) {
		antworteJson(res, 503, { status: 'fehler', datenverzeichnis: 'nicht beschreibbar' });
		return;
	}

	const freiMB = Math.round((await store.freierPlatzBytes()) / (1024 * 1024));

	antworteJson(res, 200, {
		status: 'ok',
		datenverzeichnis: 'beschreibbar',
		frei_mb: freiMB
	});
}
