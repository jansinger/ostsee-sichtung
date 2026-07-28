/**
 * @fileoverview Absicherung des Test-Helfers selbst.
 *
 * `withTimeZone` trägt inzwischen mehrere Zeitzonen-Invarianz-Suites
 * (date-utils.timezone, yearRange, csvExport.timezone, hourIndex, dateTime).
 * Alle prüfen „Ergebnis in jeder Zeitzone gleich". Würde Node das Neusetzen von
 * `process.env.TZ` zur Laufzeit nicht mehr honorieren, liefen sie sämtlich in
 * derselben Zeitzone und wären damit still wirkungslos — ohne dass ein einziger
 * Test rot würde. Genau das fängt diese Datei ab.
 */

import { describe, expect, it } from 'vitest';
import { TEST_TIME_ZONES, withTimeZone } from './withTimeZone.testutil';

/** Referenzzeitpunkt: 15.01.2024, 00:00 UTC — Winter, also MEZ = UTC+1. */
const REFERENCE_UTC = '2024-01-15T00:00:00.000Z';

/** Ortszeit-Stunde von REFERENCE_UTC je Zeitzone. */
const EXPECTED_LOCAL_HOUR: Record<string, number> = {
	UTC: 0,
	'Europe/Berlin': 1,
	'America/New_York': 19,
	'Pacific/Kiritimati': 14
};

describe('withTimeZone', () => {
	it('ändert die Ortszeit-Auslegung von Date tatsächlich', () => {
		TEST_TIME_ZONES.forEach((timeZone) => {
			const stunde = withTimeZone(timeZone, () => new Date(REFERENCE_UTC).getHours());

			expect(stunde, `${timeZone} wurde nicht wirksam gesetzt`).toBe(EXPECTED_LOCAL_HOUR[timeZone]);
		});
	});

	it('deckt Zeitzonen mit positivem und negativem UTC-Offset ab', () => {
		// Ein Satz aus lauter nicht-negativen Offsets würde Tagesgrenzen-Fehler
		// (Kalendertag rutscht zurück) nicht aufdecken.
		const offsets = TEST_TIME_ZONES.map((timeZone) =>
			withTimeZone(timeZone, () => new Date(REFERENCE_UTC).getTimezoneOffset())
		);

		expect(offsets.some((offset) => offset > 0)).toBe(true); // westlich von UTC
		expect(offsets.some((offset) => offset < 0)).toBe(true); // östlich von UTC
	});

	it('stellt die vorherige Zeitzone wieder her', () => {
		const vorher = process.env.TZ;

		withTimeZone('Pacific/Kiritimati', () => undefined);

		expect(process.env.TZ).toBe(vorher);
	});

	it('stellt die Zeitzone auch bei einer Ausnahme wieder her', () => {
		const vorher = process.env.TZ;

		expect(() =>
			withTimeZone('Pacific/Kiritimati', () => {
				throw new Error('absichtlich');
			})
		).toThrow('absichtlich');

		expect(process.env.TZ).toBe(vorher);
	});

	it('reicht den Rückgabewert durch', () => {
		expect(withTimeZone('UTC', () => 'ergebnis')).toBe('ergebnis');
	});
});
