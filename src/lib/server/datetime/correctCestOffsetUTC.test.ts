/**
 * @fileoverview Sicherheitsnetz für die Zeitzonen-Abhängigkeit der Sichtungs-Datumsverarbeitung.
 *
 * Hintergrund: Im Docker-Setup war lange kein `TZ` gesetzt, der Container lief
 * also UTC. `correctCestOffsetUTC` steigt bei `getTimezoneOffset() !== 0` sofort
 * wieder aus — die Funktion tut also **nur** auf einem UTC-Server etwas.
 *
 * Bevor `TZ=Europe/Berlin` gesetzt wird, muss bewiesen sein, dass die Pipeline
 * `combineToDate` → `correctCestOffsetUTC` unter beiden Zeitzonen denselben
 * UTC-Zeitpunkt liefert. Sonst verschiebt das Pinnen still alle neu erfassten
 * Sichtungszeiten um 1–2 Stunden.
 */

import { describe, expect, it } from 'vitest';
import { combineToDate } from '$lib/utils/format/dateTime';
import { correctCestOffsetUTC } from './correctCestOffsetUTC';
import { withTimeZone } from './withTimeZone.testutil';

/** Bildet eine Formulareingabe (deutsche Ortszeit) auf den gespeicherten UTC-Zeitpunkt ab. */
function speichereSichtungszeit(datum: string, uhrzeit: string): string {
	return correctCestOffsetUTC(combineToDate(datum, uhrzeit)).toISOString();
}

describe('correctCestOffsetUTC', () => {
	describe('Zeitzonen-Invarianz der Sichtungs-Pipeline', () => {
		it('liefert unter UTC und Europe/Berlin denselben Zeitpunkt (Winter, CET)', () => {
			const utc = withTimeZone('UTC', () => speichereSichtungszeit('2024-01-15', '14:30'));
			const berlin = withTimeZone('Europe/Berlin', () =>
				speichereSichtungszeit('2024-01-15', '14:30')
			);

			expect(utc).toBe(berlin);
			// 14:30 MEZ (UTC+1) == 13:30 UTC
			expect(utc).toBe('2024-01-15T13:30:00.000Z');
		});

		it('liefert unter UTC und Europe/Berlin denselben Zeitpunkt (Sommer, CEST)', () => {
			const utc = withTimeZone('UTC', () => speichereSichtungszeit('2024-07-15', '14:30'));
			const berlin = withTimeZone('Europe/Berlin', () =>
				speichereSichtungszeit('2024-07-15', '14:30')
			);

			expect(utc).toBe(berlin);
			// 14:30 MESZ (UTC+2) == 12:30 UTC
			expect(utc).toBe('2024-07-15T12:30:00.000Z');
		});

		it('ist für alle 24 Stunden eines Wintertages zeitzonenunabhängig', () => {
			for (let stunde = 0; stunde < 24; stunde++) {
				const uhrzeit = `${String(stunde).padStart(2, '0')}:00`;
				const utc = withTimeZone('UTC', () => speichereSichtungszeit('2024-01-15', uhrzeit));
				const berlin = withTimeZone('Europe/Berlin', () =>
					speichereSichtungszeit('2024-01-15', uhrzeit)
				);

				expect(utc, `Abweichung bei ${uhrzeit} (Winter)`).toBe(berlin);
			}
		});

		it('ist für alle 24 Stunden eines Sommertages zeitzonenunabhängig', () => {
			for (let stunde = 0; stunde < 24; stunde++) {
				const uhrzeit = `${String(stunde).padStart(2, '0')}:00`;
				const utc = withTimeZone('UTC', () => speichereSichtungszeit('2024-07-15', uhrzeit));
				const berlin = withTimeZone('Europe/Berlin', () =>
					speichereSichtungszeit('2024-07-15', uhrzeit)
				);

				expect(utc, `Abweichung bei ${uhrzeit} (Sommer)`).toBe(berlin);
			}
		});
	});

	describe('Sommerzeit-Grenzen', () => {
		it('behandelt den Tag vor der Zeitumstellung als MEZ', () => {
			// Sommerzeit 2024 beginnt am 31.03.2024
			const ergebnis = withTimeZone('UTC', () => speichereSichtungszeit('2024-03-30', '12:00'));
			expect(ergebnis).toBe('2024-03-30T11:00:00.000Z');
		});

		it('behandelt den Tag nach der Zeitumstellung als MESZ', () => {
			const ergebnis = withTimeZone('UTC', () => speichereSichtungszeit('2024-04-01', '12:00'));
			expect(ergebnis).toBe('2024-04-01T10:00:00.000Z');
		});

		it('behandelt den Tag nach dem Ende der Sommerzeit als MEZ', () => {
			// Sommerzeit 2024 endet am 27.10.2024
			const ergebnis = withTimeZone('UTC', () => speichereSichtungszeit('2024-10-28', '12:00'));
			expect(ergebnis).toBe('2024-10-28T11:00:00.000Z');
		});
	});

	/**
	 * Die Tests oben prüfen die Pipeline an Tagen *neben* der Umstellung und nur
	 * für 2024. Das lässt zwei Dinge offen, die hier direkt an der Funktion
	 * geprüft werden:
	 *
	 * 1. Beide Grenzen liegen bei 01:00 UTC, und die MESZ-Spanne ist am Beginn
	 *    einschließlich, am Ende ausschließlich (`time >= cestStart && time <
	 *    cestEnd`). Ein Vertauschen von `>=` und `>` fällt bei einem 12:00-Test
	 *    nicht auf.
	 * 2. 2024 ist der Sonderfall, in dem der letzte Sonntag im März tatsächlich
	 *    der 31. ist. Würde `lastMarchSunday` fest auf 31 stehen, wäre das mit
	 *    Testdaten aus 2024 allein nicht zu erkennen.
	 */
	describe('Umstellungszeitpunkt auf die Millisekunde', () => {
		/** Wendet die Korrektur auf einen UTC-Zeitpunkt an (immer unter TZ=UTC). */
		function korrigiere(utcMillis: number): number {
			return withTimeZone('UTC', () => correctCestOffsetUTC(new Date(utcMillis)).getTime());
		}

		const EINE_STUNDE = 3_600_000;
		const ZWEI_STUNDEN = 7_200_000;

		// Reale EU-Umstellungstermine: letzter Sonntag im März bzw. Oktober.
		// `monatIndex` ist 0-basiert wie in `Date.UTC` — März = 2, Oktober = 9.
		const sommerzeitBeginn: Array<[jahr: number, monatIndex: number, tag: number]> = [
			[2023, 2, 26],
			[2024, 2, 31],
			[2025, 2, 30],
			[2026, 2, 29]
		];

		it.each(sommerzeitBeginn)(
			'%i: 01:00 UTC im März schaltet exakt von MEZ auf MESZ',
			(jahr, monatIndex, tag) => {
				const grenze = Date.UTC(jahr, monatIndex, tag, 1, 0, 0, 0);

				// Eine Millisekunde davor gilt noch MEZ (−1 h) …
				expect(korrigiere(grenze - 1)).toBe(grenze - 1 - EINE_STUNDE);
				// … exakt auf der Grenze bereits MESZ (−2 h).
				expect(korrigiere(grenze)).toBe(grenze - ZWEI_STUNDEN);
			}
		);

		const sommerzeitEnde: Array<[jahr: number, monatIndex: number, tag: number]> = [
			[2023, 9, 29],
			[2024, 9, 27],
			[2025, 9, 26],
			[2026, 9, 25]
		];

		it.each(sommerzeitEnde)(
			'%i: 01:00 UTC im Oktober schaltet exakt von MESZ auf MEZ',
			(jahr, monatIndex, tag) => {
				const grenze = Date.UTC(jahr, monatIndex, tag, 1, 0, 0, 0);

				// Eine Millisekunde davor gilt noch MESZ (−2 h) …
				expect(korrigiere(grenze - 1)).toBe(grenze - 1 - ZWEI_STUNDEN);
				// … exakt auf der Grenze wieder MEZ (−1 h).
				expect(korrigiere(grenze)).toBe(grenze - EINE_STUNDE);
			}
		);
	});
});
