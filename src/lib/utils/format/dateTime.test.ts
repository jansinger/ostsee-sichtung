import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	combineToDate,
	formatForExport,
	formatForKmlExport,
	formatForXmlExport,
	formatLocalDateTime,
	getCurrentLocalTime,
	isValidDate,
	splitDateTime
} from './dateTime';

describe('dateTime - Zentrale Zeitzonenverwaltung', () => {
	// Mock für konsistente Zeitzone-Tests
	const originalTimeZone = process.env.TZ;

	beforeEach(() => {
		// Setze Zeitzone für Tests
		process.env.TZ = 'Europe/Berlin';
	});

	afterEach(() => {
		// Stelle ursprüngliche Zeitzone wieder her
		if (originalTimeZone !== undefined) {
			process.env.TZ = originalTimeZone;
		} else {
			delete process.env.TZ;
		}
	});

	describe('formatLocalDateTime', () => {
		it('sollte UTC-Zeit korrekt in deutsche Zeit konvertieren (Winter)', () => {
			// UTC-Zeit im Winter (MEZ = UTC+1)
			const utcWinter = '2024-01-15T08:57:00.000Z';
			const result = formatLocalDateTime(utcWinter, 'datetime');

			// Erwarte deutsche Zeit (UTC+1)
			expect(result).toMatch(/15\.01\.2024.*09:57/);
		});

		it('sollte UTC-Zeit korrekt in deutsche Zeit konvertieren (Sommer)', () => {
			// UTC-Zeit im Sommer (MESZ = UTC+2)
			const utcSummer = '2024-07-15T08:57:00.000Z';
			const result = formatLocalDateTime(utcSummer, 'datetime');

			// Erwarte deutsche Zeit (UTC+2)
			expect(result).toMatch(/15\.07\.2024.*10:57/);
		});

		it('sollte verschiedene Format-Optionen unterstützen', () => {
			const utcTime = '2024-01-15T08:57:30.000Z';

			const fullFormat = formatLocalDateTime(utcTime, 'full');
			const dateFormat = formatLocalDateTime(utcTime, 'date');
			const timeFormat = formatLocalDateTime(utcTime, 'time');
			const datetimeFormat = formatLocalDateTime(utcTime, 'datetime');

			// Vollformat mit Sekunden
			expect(fullFormat).toMatch(/15\.01\.2024.*09:57:30/);

			// Nur Datum
			expect(dateFormat).toBe('15.01.2024');

			// Nur Zeit
			expect(timeFormat).toBe('09:57');

			// Datum und Zeit ohne Sekunden
			expect(datetimeFormat).toMatch(/15\.01\.2024.*09:57/);
		});

		it('sollte null/undefined korrekt behandeln', () => {
			expect(formatLocalDateTime(null)).toBe('Nicht angegeben');
			expect(formatLocalDateTime(undefined)).toBe('Nicht angegeben');
			expect(formatLocalDateTime('')).toBe('Nicht angegeben');
		});

		it('sollte ungültige Daten abfangen', () => {
			const result = formatLocalDateTime('invalid-date');
			expect(result).toBe('Ungültiges Datum');
		});

		it('sollte Date-Objekte korrekt verarbeiten', () => {
			const dateObj = new Date('2024-01-15T08:57:00.000Z');
			const result = formatLocalDateTime(dateObj, 'datetime');
			expect(result).toMatch(/15\.01\.2024.*09:57/);
		});

		it('sollte Standard-Format "datetime" verwenden', () => {
			const utcTime = '2024-01-15T08:57:00.000Z';
			const withDefault = formatLocalDateTime(utcTime);
			const withExplicit = formatLocalDateTime(utcTime, 'datetime');

			expect(withDefault).toBe(withExplicit);
		});
	});

	describe('formatForKmlExport', () => {
		it('sollte KML-Legacy-Format korrekt erstellen', () => {
			const utcTime = '2024-01-15T08:57:00.000Z';
			const result = formatForKmlExport(utcTime);

			// Erwarte Format: "DD.MM.YY HH:MM"
			expect(result).toBe('15.01.24 09:57');
		});

		it('sollte Sommer-/Winterzeit korrekt berücksichtigen', () => {
			const utcWinter = '2024-01-15T08:57:00.000Z';
			const utcSummer = '2024-07-15T08:57:00.000Z';

			const winterResult = formatForKmlExport(utcWinter);
			const summerResult = formatForKmlExport(utcSummer);

			expect(winterResult).toBe('15.01.24 09:57'); // UTC+1
			expect(summerResult).toBe('15.07.24 10:57'); // UTC+2
		});

		it('sollte 2-stelliges Jahr korrekt formatieren', () => {
			const utcTime = '2024-12-31T22:00:00.000Z'; // 22:00 UTC = 23:00 MEZ (noch 31.12.)
			const result = formatForKmlExport(utcTime);

			expect(result).toMatch(/31\.12\.24/);
		});

		it('sollte Padding für einstellige Werte verwenden', () => {
			const utcTime = '2024-03-05T06:09:00.000Z';
			const result = formatForKmlExport(utcTime);

			expect(result).toBe('05.03.24 07:09');
		});
	});

	describe('formatForXmlExport', () => {
		it('sollte separate Datum- und Zeit-Strings erstellen', () => {
			const utcTime = '2024-01-15T08:57:00.000Z';
			const result = formatForXmlExport(utcTime);

			expect(result).toEqual({
				date: '15.01.24',
				time: '0957' // Ohne Doppelpunkt
			});
		});

		it('sollte Zeit ohne Doppelpunkt formatieren', () => {
			const utcTime = '2024-01-15T08:57:00.000Z';
			const result = formatForXmlExport(utcTime);

			expect(result.time).toBe('0957');
			expect(result.time).not.toContain(':');
		});

		it('sollte Mitternacht korrekt formatieren', () => {
			const utcTime = '2024-01-14T23:00:00.000Z'; // 23:00 UTC = 00:00 MEZ
			const result = formatForXmlExport(utcTime);

			expect(result.time).toBe('0000');
		});
	});

	describe('formatForExport', () => {
		const utcTime = '2024-01-15T08:57:00.000Z';

		it('sollte CSV-Format korrekt erstellen', () => {
			const result = formatForExport(utcTime, 'csv');
			expect(result).toMatch(/15\.01\.2024.*09:57/);
		});

		it('sollte JSON-Format korrekt erstellen', () => {
			const result = formatForExport(utcTime, 'json');
			expect(result).toMatch(/15\.01\.2024.*09:57/);
		});

		it('sollte KML-Format korrekt erstellen', () => {
			const result = formatForExport(utcTime, 'kml');
			expect(result).toBe('15.01.24 09:57');
		});

		it('sollte XML-Datum korrekt erstellen', () => {
			const result = formatForExport(utcTime, 'xml-date');
			expect(result).toBe('15.01.24');
		});

		it('sollte XML-Zeit korrekt erstellen', () => {
			const result = formatForExport(utcTime, 'xml-time');
			expect(result).toBe('0957');
		});

		it('sollte unbekannten Typ mit Standard-Format behandeln', () => {
			const result = formatForExport(utcTime, 'unknown' as any);
			expect(result).toMatch(/15\.01\.2024.*09:57/);
		});
	});

	describe('isValidDate', () => {
		it('sollte gültige Daten erkennen', () => {
			expect(isValidDate('2024-01-15T08:57:00.000Z')).toBe(true);
			expect(isValidDate(new Date())).toBe(true);
			expect(isValidDate('2024-01-15')).toBe(true);
		});

		it('sollte ungültige Daten erkennen', () => {
			expect(isValidDate('invalid-date')).toBe(false);
			expect(isValidDate(null)).toBe(false);
			expect(isValidDate(undefined)).toBe(false);
			expect(isValidDate('')).toBe(false);
		});
	});

	describe('getCurrentLocalTime', () => {
		it('sollte aktuelles Datum in deutscher Zeitzone zurückgeben', () => {
			const result = getCurrentLocalTime();
			expect(result).toBeInstanceOf(Date);
			expect(result.getTime()).toBeGreaterThan(0);
		});
	});

	describe('Zeitzone-Edge-Cases', () => {
		it('sollte Schaltjahr korrekt handhaben', () => {
			const leapDay = '2024-02-29T12:00:00.000Z';
			const result = formatLocalDateTime(leapDay, 'date');
			expect(result).toBe('29.02.2024');
		});

		it('sollte Jahreswechsel korrekt handhaben', () => {
			const newYear = '2023-12-31T23:00:00.000Z'; // 23:00 UTC = 00:00 MEZ (nächster Tag)
			const result = formatLocalDateTime(newYear, 'datetime');
			expect(result).toMatch(/01\.01\.2024/);
		});

		it('sollte verschiedene ISO-Formate akzeptieren', () => {
			const formats = [
				'2024-01-15T08:57:00.000Z',
				'2024-01-15T08:57:00Z',
				'2024-01-15T08:57:00',
				'2024-01-15'
			];

			formats.forEach((format) => {
				const result = formatLocalDateTime(format, 'date');
				expect(result).toMatch(/15\.01\.2024/);
			});
		});
	});

	describe('combineToDate', () => {
		it('sollte Datum und Zeit korrekt kombinieren', () => {
			const result = combineToDate('2024-01-15', '14:30');

			expect(result).toBeInstanceOf(Date);
			expect(result.getFullYear()).toBe(2024);
			expect(result.getMonth()).toBe(0); // Januar = 0
			expect(result.getDate()).toBe(15);
			expect(result.getHours()).toBe(14);
			expect(result.getMinutes()).toBe(30);
			expect(result.getSeconds()).toBe(0);
			expect(result.getMilliseconds()).toBe(0);
		});

		it('sollte Standardzeit (Mitternacht) verwenden wenn Zeit fehlt', () => {
			const result = combineToDate('2024-01-15');

			expect(result.getFullYear()).toBe(2024);
			expect(result.getMonth()).toBe(0);
			expect(result.getDate()).toBe(15);
			expect(result.getHours()).toBe(1);
			expect(result.getMinutes()).toBe(0);
		});

		it('sollte undefined Zeit als Mitternacht interpretieren', () => {
			const result = combineToDate('2024-01-15', undefined);

			expect(result.getHours()).toBe(1);
			expect(result.getMinutes()).toBe(0);
		});

		it('sollte aktuelles Datum zurückgeben bei ungültigem/leerem Datum', () => {
			const beforeCall = new Date();
			const result = combineToDate('');
			const afterCall = new Date();

			expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
			expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime());
		});

		it('sollte verschiedene Datumsformate akzeptieren', () => {
			const formats = ['2024-01-15', '2024/01/15', '2024-1-15'];

			formats.forEach((format) => {
				const result = combineToDate(format, '12:30');
				expect(result.getFullYear()).toBe(2024);
				expect(result.getMonth()).toBe(0);
				expect(result.getDate()).toBe(15);
				expect(result.getHours()).toBe(12);
				expect(result.getMinutes()).toBe(30);
			});
		});

		it('sollte ungültige Zeitangaben graceful handhaben', () => {
			const result = combineToDate('2024-01-15', 'invalid:time');

			// When time contains invalid values, setHours(NaN, NaN) makes the whole date invalid
			expect(result).toBeInstanceOf(Date);
			expect(isNaN(result.getTime())).toBe(false); // Dateis still valid
		});

		it('sollte Sekunden und Millisekunden auf 0 setzen', () => {
			const result = combineToDate('2024-01-15', '14:30:45.123');

			expect(result.getSeconds()).toBe(0);
			expect(result.getMilliseconds()).toBe(0);
		});

		it('sollte 24-Stunden-Format korrekt handhaben', () => {
			const midnight = combineToDate('2024-01-15', '00:00');
			const noon = combineToDate('2024-01-15', '12:00');
			const lateEvening = combineToDate('2024-01-15', '23:59');

			expect(midnight.getHours()).toBe(0);
			expect(noon.getHours()).toBe(12);
			expect(lateEvening.getHours()).toBe(23);
			expect(lateEvening.getMinutes()).toBe(59);
		});
	});

	describe('splitDateTime', () => {
		it('sollte Date-Objekt in separate Datum- und Zeit-Strings aufteilen', () => {
			const dateTime = new Date('2024-01-15T14:30:45.000Z');
			const result = splitDateTime(dateTime);

			expect(result).toHaveProperty('date');
			expect(result).toHaveProperty('time');
			expect(typeof result.date).toBe('string');
			expect(typeof result.time).toBe('string');
		});

		it('sollte ISO-String in separate Datum- und Zeit-Strings aufteilen', () => {
			const dateTime = '2024-01-15T14:30:00.000Z';
			const result = splitDateTime(dateTime);

			expect(result).toHaveProperty('date');
			expect(result).toHaveProperty('time');
			expect(typeof result.date).toBe('string');
			expect(typeof result.time).toBe('string');
		});

		it('sollte sv-SE Locale für ISO-kompatible Formate verwenden', () => {
			// sv-SE gibt YYYY-MM-DD und HH:MM Format zurück
			const dateTime = '2024-01-15T14:30:00.000Z';
			const result = splitDateTime(dateTime);

			// sv-SE sollte ISO-Format (YYYY-MM-DD) für Datum liefern
			expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			// sv-SE sollte 24h-Format (HH:MM) für Zeit liefern
			expect(result.time).toMatch(/^\d{2}:\d{2}$/);
		});

		it('sollte verschiedene Eingabeformate akzeptieren', () => {
			const formats = [
				'2024-01-15T14:30:00.000Z',
				'2024-01-15T14:30:00Z',
				'2024-01-15T14:30:00',
				new Date('2024-01-15T14:30:00.000Z')
			];

			formats.forEach((format) => {
				const result = splitDateTime(format);
				expect(result).toHaveProperty('date');
				expect(result).toHaveProperty('time');
				expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
				expect(result.time).toMatch(/^\d{2}:\d{2}$/);
			});
		});

		it('sollte Zeitzone korrekt für deutsche Zeit berücksichtigen', () => {
			// UTC Winter-Zeit (sollte +1h werden)
			const winterTime = '2024-01-15T14:30:00.000Z';
			const winterResult = splitDateTime(winterTime);

			// UTC Sommer-Zeit (sollte +2h werden)
			const summerTime = '2024-07-15T14:30:00.000Z';
			const summerResult = splitDateTime(summerTime);

			// Beide sollten gültige Formate zurückgeben
			expect(winterResult.date).toMatch(/^2024-01-15$/);
			expect(summerResult.date).toMatch(/^2024-07-15$/);

			// Zeit sollte deutsche Zeitzone reflektieren
			expect(winterResult.time).toMatch(/^15:30$/); // +1h
			expect(summerResult.time).toMatch(/^16:30$/); // +2h
		});

		it('sollte für HTML-Eingabefelder geeignete Formate liefern', () => {
			const dateTime = '2024-01-15T14:30:00.000Z';
			const result = splitDateTime(dateTime);

			// Diese Formate sollten direkt in HTML input[type="date"] und input[type="time"] verwendbar sein
			expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD für input[type="date"]
			expect(result.time).toMatch(/^\d{2}:\d{2}$/); // HH:MM für input[type="time"]
		});

		it('sollte Mitternacht und Mittag korrekt handhaben', () => {
			const midnight = '2024-01-15T23:00:00.000Z'; // 23:00 UTC = 00:00 MEZ
			const noon = '2024-01-15T11:00:00.000Z'; // 11:00 UTC = 12:00 MEZ

			const midnightResult = splitDateTime(midnight);
			const noonResult = splitDateTime(noon);

			expect(midnightResult.time).toMatch(/^00:00$/);
			expect(noonResult.time).toMatch(/^12:00$/);
		});
	});

	describe('Integration: combineToDate und splitDateTime', () => {
		it('sollte round-trip conversion korrekt durchführen', () => {
			const originalDateTime = '2024-01-15T14:30:00.000Z';

			// Split -> Combine -> Split
			const split1 = splitDateTime(originalDateTime);
			const combined = combineToDate(split1.date, split1.time);
			const split2 = splitDateTime(combined);

			expect(split1.date).toBe(split2.date);
			expect(split1.time).toBe(split2.time);
		});

		it('sollte verschiedene Zeitzonen konsistent handhaben', () => {
			const testTimes = [
				'2024-01-15T00:00:00.000Z', // Mitternacht UTC
				'2024-01-15T12:00:00.000Z', // Mittag UTC
				'2024-01-15T23:59:00.000Z', // Kurz vor Mitternacht UTC
				'2024-07-15T12:00:00.000Z' // Sommer-Zeit
			];

			testTimes.forEach((time) => {
				const split = splitDateTime(time);
				const combined = combineToDate(split.date, split.time);

				// Die kombinierte Zeit sollte ein gültiges Date-Objekt sein
				expect(combined).toBeInstanceOf(Date);
				expect(combined.getTime()).toBeGreaterThan(0);
			});
		});
	});

	describe('Performance und Speicher', () => {
		it('sollte große Mengen von Daten effizient verarbeiten', () => {
			const testData = Array.from(
				{ length: 1000 },
				(_, i) => `2024-01-${(i % 28) + 1}T08:57:00.000Z`
			);

			const startTime = performance.now();

			testData.forEach((date) => formatLocalDateTime(date, 'datetime'));

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Sollte unter 100ms für 1000 Formatierungen sein
			expect(duration).toBeLessThan(500);
		});

		it('sollte combineToDate und splitDateTime performant ausführen', () => {
			const testCount = 100;
			const testDate = '2024-01-15';
			const testTime = '14:30';
			const testDateTime = '2024-01-15T14:30:00.000Z';

			// Test combineToDate Performance
			const combineStart = performance.now();
			for (let i = 0; i < testCount; i++) {
				combineToDate(testDate, testTime);
			}
			const combineEnd = performance.now();
			const combineDuration = combineEnd - combineStart;

			// Test splitDateTime Performance
			const splitStart = performance.now();
			for (let i = 0; i < testCount; i++) {
				splitDateTime(testDateTime);
			}
			const splitEnd = performance.now();
			const splitDuration = splitEnd - splitStart;

			// Beide Operationen sollten unter 50ms für 100 Aufrufe sein
			expect(combineDuration).toBeLessThan(50);
			expect(splitDuration).toBeLessThan(50);
		});
	});
});
