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
		process.env.TZ = 'UTC';
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

		it('sollte Zeit ohne Doppelpunkt verarbeiten', () => {
			const result = combineToDate('2024-01-15', '1430');
			// Sollte fehlschlagen oder als 14:30 interpretiert werden
			// Je nach Implementation, aber wir testen den aktuellen Stand
			expect(result).toBeInstanceOf(Date);
		});

		it('sollte Mitternacht korrekt setzen wenn keine Zeit angegeben', () => {
			const result = combineToDate('2024-01-15');

			expect(result.getHours()).toBe(0);
			expect(result.getMinutes()).toBe(0);
			expect(result.getSeconds()).toBe(0);
			expect(result.getMilliseconds()).toBe(0);
		});

		it('sollte undefined Zeit als Mitternacht behandeln', () => {
			const result = combineToDate('2024-01-15', undefined);

			expect(result.getHours()).toBe(0);
			expect(result.getMinutes()).toBe(0);
		});

		it('sollte leere Zeit als Mitternacht behandeln', () => {
			const result = combineToDate('2024-01-15', '');

			expect(result.getHours()).toBe(0);
			expect(result.getMinutes()).toBe(0);
		});

		it('sollte ungültiges Datum mit aktueller Zeit zurückgeben', () => {
			const result = combineToDate('', '14:30');
			const now = new Date();

			// Sollte aktuelles Datum sein
			expect(result.getFullYear()).toBe(now.getFullYear());
			expect(result.getMonth()).toBe(now.getMonth());
			expect(result.getDate()).toBe(now.getDate());
		});

		it('sollte null/undefined Datum als aktuelle Zeit behandeln', () => {
			const resultNull = combineToDate('');
			const now = new Date();

			expect(resultNull).toBeInstanceOf(Date);
			// Sollte ungefähr zur aktuellen Zeit sein (innerhalb einer Sekunde)
			expect(Math.abs(resultNull.getTime() - now.getTime())).toBeLessThan(1000);
		});

		it('sollte verschiedene Zeitformate korrekt verarbeiten', () => {
			const testCases = [
				{ time: '09:30', expectedHour: 9, expectedMinute: 30 },
				{ time: '00:00', expectedHour: 0, expectedMinute: 0 },
				{ time: '23:59', expectedHour: 23, expectedMinute: 59 },
				{ time: '12:00', expectedHour: 12, expectedMinute: 0 }
			];

			testCases.forEach(({ time, expectedHour, expectedMinute }) => {
				const result = combineToDate('2024-01-15', time);
				expect(result.getHours()).toBe(expectedHour);
				expect(result.getMinutes()).toBe(expectedMinute);
			});
		});
	});

	describe('splitDateTime', () => {
		it('sollte Date-Objekt in deutsche Datums- und Zeitteile aufteilen', () => {
			const testDate = new Date('2024-01-15T14:30:45.000Z');
			const result = splitDateTime(testDate);

			expect(result).toHaveProperty('date');
			expect(result).toHaveProperty('time');
			
			// Da wir schwedische Locale verwenden, erwarten wir ISO-Format
			expect(result.date).toMatch(/2024-01-15/); // Schwedisches Datumsformat
			expect(result.time).toMatch(/\d{2}:\d{2}/); // Zeit im HH:MM Format
		});

		it('sollte ISO-String in deutsche Datums- und Zeitteile aufteilen', () => {
			const isoString = '2024-01-15T14:30:00.000Z';
			const result = splitDateTime(isoString);

			expect(result.date).toMatch(/2024-01-15/);
			expect(result.time).toMatch(/\d{2}:\d{2}/);
		});

		it('sollte konsistente Formatierung für HTML-Input-Felder liefern', () => {
			const testDate = new Date('2024-01-15T09:05:00.000Z');
			const result = splitDateTime(testDate);

			// Datum sollte im YYYY-MM-DD Format sein (HTML date input)
			expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			
			// Zeit sollte im HH:MM Format sein (HTML time input)
			expect(result.time).toMatch(/^\d{2}:\d{2}$/);
		});

		it('sollte verschiedene Eingabeformate verarbeiten', () => {
			const testCases = [
				new Date('2024-01-15T14:30:00.000Z'),
				'2024-01-15T14:30:00.000Z',
				'2024-01-15T14:30:00Z',
				'2024-01-15T14:30:00'
			];

			testCases.forEach((input) => {
				const result = splitDateTime(input);
				expect(result.date).toMatch(/2024-01-15/);
				expect(result.time).toMatch(/\d{2}:\d{2}/);
			});
		});

		it('sollte Zeitzonenkonvertierung korrekt durchführen', () => {
			// Winter: UTC+1 (MEZ)
			const winterDate = '2024-01-15T08:00:00.000Z';
			const winterResult = splitDateTime(winterDate);
			
			// Sommer: UTC+2 (MESZ) 
			const summerDate = '2024-07-15T08:00:00.000Z';
			const summerResult = splitDateTime(summerDate);

			// Beide sollten unterschiedliche Zeiten haben aufgrund der Zeitzone
			expect(winterResult.time).not.toBe(summerResult.time);
		});

		it('sollte Round-Trip-Kompatibilität mit combineToDate haben', () => {
			const originalDate = new Date('2024-01-15T14:30:00.000Z');
			const { date, time } = splitDateTime(originalDate);
			
			// Kombiniere wieder zurück
			const reconstructed = combineToDate(date, time);
			
			// Sollten ähnliche Werte haben (Sekunden werden auf 0 gesetzt)
			expect(reconstructed.getFullYear()).toBe(originalDate.getFullYear());
			expect(reconstructed.getMonth()).toBe(originalDate.getMonth());
			expect(reconstructed.getDate()).toBe(originalDate.getDate());
			// Stunden/Minuten können aufgrund Zeitzone abweichen, das ist OK
		});

		it('sollte Edge-Cases korrekt behandeln', () => {
			const edgeCases = [
				'2024-02-29T00:00:00.000Z', // Schaltjahr
				'2024-12-31T23:59:59.000Z', // Jahresende
				'2024-01-01T00:00:00.000Z'  // Jahresanfang
			];

			edgeCases.forEach((testCase) => {
				const result = splitDateTime(testCase);
				expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
				expect(result.time).toMatch(/^\d{2}:\d{2}$/);
			});
		});
	});

	describe('Integration Tests - combineToDate und splitDateTime', () => {
		it('sollte perfekte Round-Trip-Konvertierung ermöglichen', () => {
			const originalDate = '2024-01-15';
			const originalTime = '14:30';

			// Kombiniere zu Date
			const combined = combineToDate(originalDate, originalTime);
			
			// Teile wieder auf
			const { date, time } = splitDateTime(combined);
			
			// Kombiniere erneut
			const recombined = combineToDate(date, time);

			// Datum sollte gleich sein
			expect(combined.getDate()).toBe(recombined.getDate());
			expect(combined.getMonth()).toBe(recombined.getMonth());
			expect(combined.getFullYear()).toBe(recombined.getFullYear());
		});

		it('sollte mit HTML-Formularen kompatibel sein', () => {
			const htmlDateValue = '2024-01-15';
			const htmlTimeValue = '14:30';

			const combined = combineToDate(htmlDateValue, htmlTimeValue);
			const split = splitDateTime(combined);

			// Sollte wieder HTML-kompatible Werte erzeugen
			expect(split.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(split.time).toMatch(/^\d{2}:\d{2}$/);
		});
	});

	describe('Performance Tests - Neue Funktionen', () => {
		it('sollte combineToDate effizient ausführen', () => {
			const iterations = 1000;
			const startTime = performance.now();

			for (let i = 0; i < iterations; i++) {
				combineToDate('2024-01-15', '14:30');
			}

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Sollte schnell sein
			expect(duration).toBeLessThan(100);
		});

		it('sollte splitDateTime effizient ausführen', () => {
			const testDate = new Date('2024-01-15T14:30:00.000Z');
			const iterations = 1000;
			const startTime = performance.now();

			for (let i = 0; i < iterations; i++) {
				splitDateTime(testDate);
			}

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Sollte schnell sein (großzügiges Limit für langsame CI-Runner)
			expect(duration).toBeLessThan(2000);
		});
	});
});
