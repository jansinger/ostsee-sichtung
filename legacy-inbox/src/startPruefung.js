// @ts-nocheck — reines JavaScript ohne Typdeklarationen (siehe CLAUDE.md, Legacy REST API);
// erst seit Aufgabe 9 von src/tests/contract importiert und damit von tsc erreichbar.
import { protokolliere } from './logger.js';

/**
 * Schwelle für die Platzwarnung. Kein Abbruchkriterium — siehe unten.
 */
export const MINDEST_FREI_MB = 500;

/**
 * Die beiden Prüfungen beim Start. Sie stehen hier statt in app.js, weil ein
 * Abbruchpfad, der sich nicht testen lässt, genau dann falsch ist, wenn er
 * gebraucht wird.
 *
 * Sie behandeln zwei Lagen bewusst verschieden:
 *
 * **Nicht beschreibbar → Abbruch.** store.initialisiere() allein beweist
 * nichts: mkdir(…, { recursive: true }) meldet auf einem vorhandenen
 * Verzeichnis auch dann Erfolg, wenn es 0o500 ist. Ein Rechtefehler nach
 * einem Plesk-Update ergäbe sonst einen gesund aussehenden Prozess, der jede
 * Sichtung mit 500 beantwortet — tagelang, ohne dass es auffällt. Das soll
 * beim Deploy krachen, nicht bei der ersten echten Meldung (Entwurf,
 * Abschnitt 5).
 *
 * **Wenig Platz → laut melden, weiterlaufen.** Bei rund 1–2 KB je Umschlag
 * sind 500 MB über 250.000 Sichtungen Vorrat. Auf einer Plesk-Domain mit
 * Kontingent nähme ein Abbruch den Posteingang komplett vom Netz, und jede
 * eintreffende Sichtung wäre ohne jede Ablage verloren — ein weit größerer
 * Bruch des Leitsatzes als der, den ein Abbruch verhindern soll. Der Entwurf
 * verlangt an dieser Stelle „eine Prüfung beim Start, eine laufende
 * Überwachung und einen Alarm mit genug Vorlauf" (Abschnitt 11), keine
 * Startverweigerung. Die laufende Hälfte liefert /health mit frei_mb.
 */
export async function pruefeStartbedingungen({ store, datenVerzeichnis }) {
	if (!(await store.istBeschreibbar())) {
		throw new Error(
			`Das Datenverzeichnis ${datenVerzeichnis} ist nicht beschreibbar. ` +
				'Der Posteingang startet nicht — bitte Rechte und Eigentümer prüfen ' +
				'(erwartet: chmod 700, Eigentümer ist der Anwendungsbenutzer der Domain).'
		);
	}

	const freiMB = Math.round((await store.freierPlatzBytes()) / (1024 * 1024));
	if (freiMB < MINDEST_FREI_MB) {
		protokolliere('fehler', 'plattenplatz_knapp', {
			frei_mb: freiMB,
			schwelle_mb: MINDEST_FREI_MB,
			datenverzeichnis: datenVerzeichnis
		});
	}

	return { freiMB };
}
