/**
 * @fileoverview Tests der zentralen Datums-/Zeitformatierung.
 *
 * Zusammengeführt aus `dateTime.test.ts` (lief unter `Europe/Berlin`) und
 * `dateTime.UTC.test.ts` (lief unter `UTC`). Beide setzten `process.env.TZ` in
 * `beforeEach` und hingen damit an globalem Prozess-Zustand. Statt zweier
 * Dateien prüft diese eine die zeitzonenkritischen Fälle über `withTimeZone`
 * unter mehreren Zeitzonen.
 */

import { TEST_TIME_ZONES, withTimeZone } from '$lib/server/datetime/withTimeZone.testutil';
import { describe, expect, it } from 'vitest';
import {
	combineToDate,
	formatForExport,
	formatForKmlExport,
	formatForXmlExport,
	formatLocalDateTime,
	isValidDate,
	splitDateTime
} from './dateTime';

/**
 * Zeitzonen, in denen die Anwendung tatsächlich läuft: UTC in Produktion
 * (Dockerfile, docker-compose.production.yml) und Europe/Berlin in Entwicklung.
 *
 * `combineToDate` ist — anders als die Formatter — bewusst **nicht**
 * zeitzonenunabhängig: es setzt die Uhrzeit über `setHours()` als Ortszeit.
 * In Zonen mit negativem UTC-Offset rutscht dadurch der Kalendertag zurück
 * (`America/New_York`: '2024-01-15' → 14.01.). Die vollen `TEST_TIME_ZONES` sind
 * für diese Funktion daher kein erfüllbarer Vertrag; die Zeitzonen-Invarianz der
 * Schreib-Pipeline sichert stattdessen `correctCestOffsetUTC.test.ts` ab.
 */
const DEPLOYMENT_TIME_ZONES = ['UTC', 'Europe/Berlin'];

/**
 * Führt `fn` unter mehreren Zeitzonen aus und stellt sicher, dass das Ergebnis
 * in allen identisch ist — die eigentliche Zusicherung dieser Suite.
 *
 * @returns Das (in allen Zeitzonen gleiche) Ergebnis, für weitere Assertions.
 */
function zeitzonenInvariant<T>(fn: () => T, zones: string[] = TEST_TIME_ZONES): T {
	const [erstes, ...weitere] = zones.map((tz) => withTimeZone(tz, fn));

	weitere.forEach((ergebnis, i) => {
		expect(ergebnis, `${zones[i + 1]} weicht von ${zones[0]} ab`).toEqual(erstes);
	});

	return erstes as T;
}

/** Wanduhrzeit in der **Prozess**-Zeitzone — Gegenstück zum Berlin-fixen `splitDateTime`. */
function localWallClock(date: Date): { date: string; time: string } {
	const pad = (value: number) => String(value).padStart(2, '0');
	return {
		date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
		time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
	};
}

describe('dateTime - Zentrale Zeitzonenverwaltung', () => {
	describe('formatLocalDateTime', () => {
		it('sollte UTC-Zeit korrekt in deutsche Zeit konvertieren (Winter)', () => {
			// UTC-Zeit im Winter (MEZ = UTC+1)
			const result = zeitzonenInvariant(() =>
				formatLocalDateTime('2024-01-15T08:57:00.000Z', 'datetime')
			);

			expect(result).toMatch(/15\.01\.2024.*09:57/);
		});

		it('sollte UTC-Zeit korrekt in deutsche Zeit konvertieren (Sommer)', () => {
			// UTC-Zeit im Sommer (MESZ = UTC+2)
			const result = zeitzonenInvariant(() =>
				formatLocalDateTime('2024-07-15T08:57:00.000Z', 'datetime')
			);

			expect(result).toMatch(/15\.07\.2024.*10:57/);
		});

		it('sollte verschiedene Format-Optionen unterstützen', () => {
			const utcTime = '2024-01-15T08:57:30.000Z';

			const formate = zeitzonenInvariant(() => ({
				full: formatLocalDateTime(utcTime, 'full'),
				date: formatLocalDateTime(utcTime, 'date'),
				time: formatLocalDateTime(utcTime, 'time'),
				datetime: formatLocalDateTime(utcTime, 'datetime')
			}));

			expect(formate.full).toMatch(/15\.01\.2024.*09:57:30/);
			expect(formate.date).toBe('15.01.2024');
			expect(formate.time).toBe('09:57');
			expect(formate.datetime).toMatch(/15\.01\.2024.*09:57/);
		});

		it('sollte null/undefined korrekt behandeln', () => {
			expect(zeitzonenInvariant(() => formatLocalDateTime(null))).toBe('Nicht angegeben');
			expect(zeitzonenInvariant(() => formatLocalDateTime(undefined))).toBe('Nicht angegeben');
			expect(zeitzonenInvariant(() => formatLocalDateTime(''))).toBe('Nicht angegeben');
		});

		it('sollte ungültige Daten abfangen', () => {
			expect(zeitzonenInvariant(() => formatLocalDateTime('invalid-date'))).toBe(
				'Ungültiges Datum'
			);
		});

		it('sollte Date-Objekte korrekt verarbeiten', () => {
			const result = zeitzonenInvariant(() =>
				formatLocalDateTime(new Date('2024-01-15T08:57:00.000Z'), 'datetime')
			);

			expect(result).toMatch(/15\.01\.2024.*09:57/);
		});

		it('sollte Standard-Format "datetime" verwenden', () => {
			const utcTime = '2024-01-15T08:57:00.000Z';

			const { withDefault, withExplicit } = zeitzonenInvariant(() => ({
				withDefault: formatLocalDateTime(utcTime),
				withExplicit: formatLocalDateTime(utcTime, 'datetime')
			}));

			expect(withDefault).toBe(withExplicit);
		});
	});

	describe('formatForKmlExport', () => {
		it('sollte KML-Legacy-Format korrekt erstellen', () => {
			// Erwarte Format: "DD.MM.YY HH:MM"
			expect(zeitzonenInvariant(() => formatForKmlExport('2024-01-15T08:57:00.000Z'))).toBe(
				'15.01.24 09:57'
			);
		});

		it('sollte Sommer-/Winterzeit korrekt berücksichtigen', () => {
			const { winter, sommer } = zeitzonenInvariant(() => ({
				winter: formatForKmlExport('2024-01-15T08:57:00.000Z'),
				sommer: formatForKmlExport('2024-07-15T08:57:00.000Z')
			}));

			expect(winter).toBe('15.01.24 09:57'); // UTC+1
			expect(sommer).toBe('15.07.24 10:57'); // UTC+2
		});

		it('sollte 2-stelliges Jahr korrekt formatieren', () => {
			// 22:00 UTC = 23:00 MEZ (noch 31.12.)
			expect(zeitzonenInvariant(() => formatForKmlExport('2024-12-31T22:00:00.000Z'))).toMatch(
				/31\.12\.24/
			);
		});

		it('sollte Padding für einstellige Werte verwenden', () => {
			expect(zeitzonenInvariant(() => formatForKmlExport('2024-03-05T06:09:00.000Z'))).toBe(
				'05.03.24 07:09'
			);
		});

		it('sollte ungültige Daten abfangen', () => {
			expect(zeitzonenInvariant(() => formatForKmlExport('invalid-date'))).toBe('Ungültiges Datum');
		});
	});

	describe('formatForXmlExport', () => {
		it('sollte separate Datum- und Zeit-Strings erstellen', () => {
			expect(zeitzonenInvariant(() => formatForXmlExport('2024-01-15T08:57:00.000Z'))).toEqual({
				date: '15.01.24',
				time: '0957' // Ohne Doppelpunkt
			});
		});

		it('sollte Zeit ohne Doppelpunkt formatieren', () => {
			const result = zeitzonenInvariant(() => formatForXmlExport('2024-01-15T08:57:00.000Z'));

			expect(result.time).toBe('0957');
			expect(result.time).not.toContain(':');
		});

		it('sollte Mitternacht korrekt formatieren', () => {
			// 23:00 UTC = 00:00 MEZ
			const result = zeitzonenInvariant(() => formatForXmlExport('2024-01-14T23:00:00.000Z'));

			expect(result.time).toBe('0000');
		});

		it('sollte ungültige Daten abfangen', () => {
			expect(zeitzonenInvariant(() => formatForXmlExport('invalid-date'))).toEqual({
				date: 'Ungültiges Datum',
				time: 'Ungültige Zeit'
			});
		});
	});

	describe('formatForExport', () => {
		const utcTime = '2024-01-15T08:57:00.000Z';

		it('sollte CSV-Format korrekt erstellen', () => {
			expect(zeitzonenInvariant(() => formatForExport(utcTime, 'csv'))).toMatch(
				/15\.01\.2024.*09:57/
			);
		});

		it('sollte JSON-Format korrekt erstellen', () => {
			expect(zeitzonenInvariant(() => formatForExport(utcTime, 'json'))).toMatch(
				/15\.01\.2024.*09:57/
			);
		});

		it('sollte KML-Format korrekt erstellen', () => {
			expect(zeitzonenInvariant(() => formatForExport(utcTime, 'kml'))).toBe('15.01.24 09:57');
		});

		it('sollte XML-Datum korrekt erstellen', () => {
			expect(zeitzonenInvariant(() => formatForExport(utcTime, 'xml-date'))).toBe('15.01.24');
		});

		it('sollte XML-Zeit korrekt erstellen', () => {
			expect(zeitzonenInvariant(() => formatForExport(utcTime, 'xml-time'))).toBe('0957');
		});

		it('sollte unbekannten Typ mit Standard-Format behandeln', () => {
			expect(zeitzonenInvariant(() => formatForExport(utcTime, 'unknown' as never))).toMatch(
				/15\.01\.2024.*09:57/
			);
		});
	});

	describe('isValidDate', () => {
		it('sollte gültige Daten erkennen', () => {
			expect(zeitzonenInvariant(() => isValidDate('2024-01-15T08:57:00.000Z'))).toBe(true);
			expect(zeitzonenInvariant(() => isValidDate('2024-01-15'))).toBe(true);
			expect(isValidDate(new Date())).toBe(true);
		});

		it('sollte ungültige Daten erkennen', () => {
			expect(zeitzonenInvariant(() => isValidDate('invalid-date'))).toBe(false);
			expect(zeitzonenInvariant(() => isValidDate(null))).toBe(false);
			expect(zeitzonenInvariant(() => isValidDate(undefined))).toBe(false);
			expect(zeitzonenInvariant(() => isValidDate(''))).toBe(false);
		});
	});

	describe('Zeitzone-Edge-Cases', () => {
		it('sollte Schaltjahr korrekt handhaben', () => {
			expect(
				zeitzonenInvariant(() => formatLocalDateTime('2024-02-29T12:00:00.000Z', 'date'))
			).toBe('29.02.2024');
		});

		it('sollte Jahreswechsel korrekt handhaben', () => {
			// 23:00 UTC = 00:00 MEZ (nächster Tag)
			expect(
				zeitzonenInvariant(() => formatLocalDateTime('2023-12-31T23:00:00.000Z', 'datetime'))
			).toMatch(/01\.01\.2024/);
		});

		it('sollte verschiedene ISO-Formate akzeptieren', () => {
			const formats = [
				'2024-01-15T08:57:00.000Z',
				'2024-01-15T08:57:00Z',
				'2024-01-15T08:57:00',
				'2024-01-15'
			];

			// '2024-01-15T08:57:00' (ohne Zonenangabe) wird als Ortszeit gelesen und ist
			// daher bewusst nur unter den Deployment-Zeitzonen invariant.
			const results = zeitzonenInvariant(
				() => formats.map((format) => formatLocalDateTime(format, 'date')),
				DEPLOYMENT_TIME_ZONES
			);

			results.forEach((result) => expect(result).toMatch(/15\.01\.2024/));
		});
	});

	describe('combineToDate', () => {
		it('sollte Datum und Zeit korrekt kombinieren', () => {
			const felder = zeitzonenInvariant(() => {
				const result = combineToDate('2024-01-15', '14:30');
				return {
					istDate: result instanceof Date,
					jahr: result.getFullYear(),
					monat: result.getMonth(), // Januar = 0
					tag: result.getDate(),
					stunde: result.getHours(),
					minute: result.getMinutes(),
					sekunde: result.getSeconds(),
					ms: result.getMilliseconds()
				};
			}, DEPLOYMENT_TIME_ZONES);

			expect(felder).toEqual({
				istDate: true,
				jahr: 2024,
				monat: 0,
				tag: 15,
				stunde: 14,
				minute: 30,
				sekunde: 0,
				ms: 0
			});
		});

		it('sollte die Uhrzeit als Ortszeit der Prozess-Zeitzone setzen', () => {
			// setHours() arbeitet in Ortszeit — der resultierende UTC-Zeitpunkt hängt
			// daher von process.env.TZ ab. Genau das gleicht correctCestOffsetUTC im
			// Schreibpfad (mapFormToSighting.ts) wieder aus.
			const wanduhr = zeitzonenInvariant(
				() => localWallClock(combineToDate('2024-01-15', '14:30')),
				DEPLOYMENT_TIME_ZONES
			);

			expect(wanduhr).toEqual({ date: '2024-01-15', time: '14:30' });
		});

		it('sollte ohne Uhrzeit bei UTC-Mitternacht des ISO-Datums bleiben', () => {
			// "YYYY-MM-DD" wird von new Date() laut Spezifikation als UTC gelesen.
			// Ohne Uhrzeit greift setHours() nie — das Ergebnis ist deshalb sogar
			// über alle TEST_TIME_ZONES hinweg identisch.
			const zeitpunkte = zeitzonenInvariant(() => ({
				ohne: combineToDate('2024-01-15').toISOString(),
				undef: combineToDate('2024-01-15', undefined).toISOString(),
				nullwert: combineToDate('2024-01-15', null).toISOString(),
				leer: combineToDate('2024-01-15', '').toISOString()
			}));

			expect(zeitpunkte).toEqual({
				ohne: '2024-01-15T00:00:00.000Z',
				undef: '2024-01-15T00:00:00.000Z',
				nullwert: '2024-01-15T00:00:00.000Z',
				leer: '2024-01-15T00:00:00.000Z'
			});
		});

		it('sollte aktuelles Datum zurückgeben bei leerem Datum', () => {
			const beforeCall = new Date();
			const result = combineToDate('');
			const afterCall = new Date();

			expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
			expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime());
		});

		it('sollte bei leerem Datum die Uhrzeit ignorieren', () => {
			const result = combineToDate('', '14:30');
			const now = new Date();

			expect(Math.abs(result.getTime() - now.getTime())).toBeLessThan(1000);
		});

		it('sollte verschiedene Datumsformate akzeptieren', () => {
			const formats = ['2024-01-15', '2024/01/15', '2024-1-15'];

			const felder = zeitzonenInvariant(
				() =>
					formats.map((format) => {
						const result = combineToDate(format, '12:30');
						return {
							jahr: result.getFullYear(),
							monat: result.getMonth(),
							tag: result.getDate(),
							stunde: result.getHours(),
							minute: result.getMinutes()
						};
					}),
				DEPLOYMENT_TIME_ZONES
			);

			felder.forEach((feld) =>
				expect(feld).toEqual({ jahr: 2024, monat: 0, tag: 15, stunde: 12, minute: 30 })
			);
		});

		it('sollte ungültige Zeitangaben graceful handhaben', () => {
			// Das Zeit-Pattern ist auf "HH:MM" verankert. Alles andere wird verworfen,
			// statt das Date via setHours(NaN) zu zerstören.
			const invalidTimes = ['invalid:time', '1430', '14:30:45.123', '7:5'];

			const zeitpunkte = zeitzonenInvariant(() =>
				invalidTimes.map((time) => combineToDate('2024-01-15', time).toISOString())
			);

			zeitpunkte.forEach((zeitpunkt) => expect(zeitpunkt).toBe('2024-01-15T00:00:00.000Z'));
		});

		it('sollte Sekunden und Millisekunden auf 0 setzen', () => {
			const result = zeitzonenInvariant(() => {
				const date = combineToDate('2024-01-15', '14:30');
				return { sekunde: date.getSeconds(), ms: date.getMilliseconds() };
			}, DEPLOYMENT_TIME_ZONES);

			expect(result).toEqual({ sekunde: 0, ms: 0 });
		});

		it('sollte 24-Stunden-Format korrekt handhaben', () => {
			const testCases = ['00:00', '09:30', '12:00', '14:30', '23:59'];

			const stunden = zeitzonenInvariant(
				() =>
					testCases.map((time) => {
						const result = combineToDate('2024-01-15', time);
						return `${String(result.getHours()).padStart(2, '0')}:${String(result.getMinutes()).padStart(2, '0')}`;
					}),
				DEPLOYMENT_TIME_ZONES
			);

			expect(stunden).toEqual(testCases);
		});
	});

	describe('splitDateTime', () => {
		it('sollte Date-Objekt in separate Datum- und Zeit-Strings aufteilen', () => {
			const result = zeitzonenInvariant(() => splitDateTime(new Date('2024-01-15T14:30:45.000Z')));

			expect(result).toEqual({ date: '2024-01-15', time: '15:30' });
		});

		it('sollte sv-SE Locale für ISO-kompatible Formate verwenden', () => {
			const result = zeitzonenInvariant(() => splitDateTime('2024-01-15T14:30:00.000Z'));

			// sv-SE liefert YYYY-MM-DD und 24h HH:MM
			expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(result.time).toMatch(/^\d{2}:\d{2}$/);
		});

		it('sollte verschiedene Eingabeformate akzeptieren', () => {
			const formats = [
				'2024-01-15T14:30:00.000Z',
				'2024-01-15T14:30:00Z',
				new Date('2024-01-15T14:30:00.000Z')
			];

			const results = zeitzonenInvariant(() => formats.map((format) => splitDateTime(format)));

			results.forEach((result) => {
				expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
				expect(result.time).toMatch(/^\d{2}:\d{2}$/);
			});
		});

		it('sollte Zeitzone korrekt für deutsche Zeit berücksichtigen', () => {
			const { winter, sommer } = zeitzonenInvariant(() => ({
				winter: splitDateTime('2024-01-15T14:30:00.000Z'),
				sommer: splitDateTime('2024-07-15T14:30:00.000Z')
			}));

			expect(winter).toEqual({ date: '2024-01-15', time: '15:30' }); // +1h
			expect(sommer).toEqual({ date: '2024-07-15', time: '16:30' }); // +2h
		});

		it('sollte Mitternacht und Mittag korrekt handhaben', () => {
			const { midnight, noon } = zeitzonenInvariant(() => ({
				midnight: splitDateTime('2024-01-15T23:00:00.000Z'), // = 00:00 MEZ
				noon: splitDateTime('2024-01-15T11:00:00.000Z') // = 12:00 MEZ
			}));

			expect(midnight.time).toBe('00:00');
			expect(noon.time).toBe('12:00');
		});

		it('sollte Edge-Cases korrekt behandeln', () => {
			const edgeCases = [
				'2024-02-29T00:00:00.000Z', // Schaltjahr
				'2024-12-31T23:59:59.000Z', // Jahresende
				'2024-01-01T00:00:00.000Z' // Jahresanfang
			];

			const results = zeitzonenInvariant(() => edgeCases.map((input) => splitDateTime(input)));

			results.forEach((result) => {
				expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
				expect(result.time).toMatch(/^\d{2}:\d{2}$/);
			});
		});
	});

	describe('Integration: combineToDate und splitDateTime', () => {
		it('sollte die zerlegten Werte als Prozess-Ortszeit wieder zusammensetzen', () => {
			// Dokumentierte Asymmetrie: splitDateTime formatiert nach Europe/Berlin,
			// combineToDate liest die Strings als Ortszeit der Prozess-Zeitzone zurück.
			// Verlustfrei ist der Round-Trip daher nur in Europe/Berlin; der
			// Schreibpfad gleicht das über correctCestOffsetUTC wieder aus.
			const { split, wanduhr } = zeitzonenInvariant(() => {
				const split = splitDateTime('2024-01-15T14:30:00.000Z');
				return { split, wanduhr: localWallClock(combineToDate(split.date, split.time)) };
			}, DEPLOYMENT_TIME_ZONES);

			expect(split).toEqual({ date: '2024-01-15', time: '15:30' });
			expect(wanduhr).toEqual(split);
		});

		it('sollte bei combine -> split -> combine das Datum erhalten', () => {
			const felder = zeitzonenInvariant(() => {
				const combined = combineToDate('2024-01-15', '14:30');
				const { date, time } = splitDateTime(combined);
				const recombined = combineToDate(date, time);

				return {
					gleichesJahr: recombined.getFullYear() === combined.getFullYear(),
					gleicherMonat: recombined.getMonth() === combined.getMonth(),
					gleicherTag: recombined.getDate() === combined.getDate()
				};
			}, DEPLOYMENT_TIME_ZONES);

			expect(felder).toEqual({ gleichesJahr: true, gleicherMonat: true, gleicherTag: true });
		});

		it('sollte mit HTML-Formularwerten kompatibel bleiben', () => {
			// Hier ist bewusst nur die FORM invariant, nicht der Wert: combineToDate
			// liest '14:30' als Prozess-Ortszeit, splitDateTime gibt Berlin zurück —
			// unter UTC also '15:30', unter Europe/Berlin '14:30'.
			DEPLOYMENT_TIME_ZONES.forEach((timeZone) => {
				const split = withTimeZone(timeZone, () =>
					splitDateTime(combineToDate('2024-01-15', '14:30'))
				);

				// Ergebnis muss wieder in input[type="date"]/input[type="time"] passen
				expect(split.date, timeZone).toMatch(/^\d{4}-\d{2}-\d{2}$/);
				expect(split.time, timeZone).toMatch(/^\d{2}:\d{2}$/);
			});
		});

		it('sollte verschiedene Zeitpunkte konsistent handhaben', () => {
			const testTimes = [
				'2024-01-15T00:00:00.000Z', // Mitternacht UTC
				'2024-01-15T12:00:00.000Z', // Mittag UTC
				'2024-01-15T23:59:00.000Z', // Kurz vor Mitternacht UTC
				'2024-07-15T12:00:00.000Z' // Sommer-Zeit
			];

			const paare = zeitzonenInvariant(
				() =>
					testTimes.map((time) => {
						const split = splitDateTime(time);
						return { split, wanduhr: localWallClock(combineToDate(split.date, split.time)) };
					}),
				DEPLOYMENT_TIME_ZONES
			);

			paare.forEach(({ split, wanduhr }) => expect(wanduhr).toEqual(split));
		});
	});

	// Laufzeit-Schranken sind zeitzonenunabhängig und werden daher nur einmal geprüft.
	describe('Performance und Speicher', () => {
		it('sollte große Mengen von Daten effizient verarbeiten', () => {
			const testData = Array.from(
				{ length: 1000 },
				(_, i) => `2024-01-${(i % 28) + 1}T08:57:00.000Z`
			);

			const startTime = performance.now();
			testData.forEach((date) => formatLocalDateTime(date, 'datetime'));
			const duration = performance.now() - startTime;

			expect(duration).toBeLessThan(500);
		});

		it('sollte combineToDate und splitDateTime performant ausführen', () => {
			const iterations = 1000;

			const combineStart = performance.now();
			for (let i = 0; i < iterations; i++) {
				combineToDate('2024-01-15', '14:30');
			}
			const combineDuration = performance.now() - combineStart;

			const splitStart = performance.now();
			for (let i = 0; i < iterations; i++) {
				splitDateTime('2024-01-15T14:30:00.000Z');
			}
			const splitDuration = performance.now() - splitStart;

			// Großzügige Limits für langsame CI-Runner
			expect(combineDuration).toBeLessThan(100);
			expect(splitDuration).toBeLessThan(2000);
		});
	});
});
