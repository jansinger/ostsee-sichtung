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
});
