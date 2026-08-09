/**
 * `GET /rest_sichtungen` — der Index der Legacy-API.
 *
 * Der Endpunkt fehlte bis 2026-08 vollständig und antwortete mit `405`. Die
 * angebundene iOS-App (`OstSeeTiere/8`) fragt ihn an: Er ist die Datenquelle
 * ihrer Karte, nachgewiesen im Zugriffsprotokoll von schweinswalsichtung.de
 * und am Gerät bestätigt. Solange er fehlte, blieb die Karte in der App leer.
 *
 * Die Vorgänger-Anwendung liegt als Beleg unter `docs/archive/legacy-cakephp/`.
 * Entscheidend sind zwei Stellen:
 *
 * `RestSichtungenController::index()` und `SichtungenController::showReports()`
 * bestehen aus denselben zwei Zeilen — `parseList()` für die Filter und
 * `getReports()` für die Daten. `getReports()` schickt jeden Datensatz durch
 * `ReportUtils::mapReport()`, und das erzeugt die kompakte Form
 * (`ts`, `id`, `dt`, `ti`, `lat`, `lon`, `ct`, `yo`, `ta`, `tf`), die diese
 * Anwendung unter `showreports.json` bereits ausliefert.
 *
 * `GET /rest_sichtungen` und `GET /sichtungen/showreports.json` sind damit
 * derselbe Endpunkt unter zwei Namen. Genau das schreibt dieser Test fest —
 * und zwar als Identität der Funktion, nicht als Vergleich zweier Antworten:
 * Zwei getrennte Implementierungen, die heute dasselbe liefern, laufen früher
 * oder später auseinander, und die Legacy-API ist der eine Ort im Projekt, an
 * dem das niemandem auffiele, bis ein nicht mehr testbarer Client bricht.
 */
import { describe, expect, it } from 'vitest';
import { GET as showreportsGET } from '../sichtungen/showreports.json/+server';
import { GET, POST } from './+server';

describe('GET /rest_sichtungen', () => {
	it('ist dieselbe Funktion wie GET /sichtungen/showreports.json', () => {
		expect(GET).toBe(showreportsGET);
	});

	it('antwortet nicht mehr mit 405', async () => {
		// Der frühere Handler gab einen festen 405-Körper zurück, ohne die
		// Anfrage anzusehen. Ein Test, der nur `GET !== undefined` prüft, wäre
		// auch damals grün gewesen.
		expect(GET.toString()).not.toContain('Method not allowed');
	});

	it('lässt POST unangetastet', () => {
		// Der Schreibpfad ist der kritische: Er trägt das Rate-Limit von 20
		// Meldungen pro Stunde und die Yup-Validierung. Der Index darf daran
		// nichts ändern — insbesondere darf das Rate-Limit nicht für den
		// lesenden Pfad gelten, sonst schaltete sich die Karte nach 20
		// Aufrufen ab.
		expect(POST).toBeTypeOf('function');
		expect(POST).not.toBe(GET);
	});
});
