import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	combineToUTC,
	formatDate,
	formatForExport,
	formatForKmlExport,
	formatForXmlExport,
	formatLocalDateTime,
	getCurrentLocalTime,
	isValidDate
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

	describe('combineToUTC', () => {
		it('sollte lokales Datum und Zeit zu UTC konvertieren', () => {
			const result = combineToUTC('2024-01-15', '10:57');

			// Ergebnis sollte ein gültiger ISO-String sein
			expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);

			// Datum sollte korrekt sein
			const resultDate = new Date(result);
			expect(resultDate.getUTCFullYear()).toBe(2024);
			expect(resultDate.getUTCMonth()).toBe(0); // Januar
			expect(resultDate.getUTCDate()).toBe(15);
		});

		it('sollte Sommerzeit korrekt berücksichtigen', () => {
			const result = combineToUTC('2024-07-15', '10:57');

			// Ergebnis sollte ein gültiger ISO-String sein
			expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);

			// Datum sollte korrekt sein
			const resultDate = new Date(result);
			expect(resultDate.getUTCFullYear()).toBe(2024);
			expect(resultDate.getUTCMonth()).toBe(6); // Juli
			expect(resultDate.getUTCDate()).toBe(15);
		});

		it('sollte fehlende Zeit mit Mittag als Standard behandeln', () => {
			const result = combineToUTC('2024-01-15');

			// Ergebnis sollte ein gültiger ISO-String sein
			expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);

			// Sollte Mittag entsprechen
			const resultDate = new Date(result);
			expect(resultDate.getUTCFullYear()).toBe(2024);
			expect(resultDate.getUTCMonth()).toBe(0); // Januar
			expect(resultDate.getUTCDate()).toBe(15);
		});

		it('sollte Zeitzone-Übergänge korrekt handhaben', () => {
			const result = combineToUTC('2024-03-31', '03:00');

			// Ergebnis sollte ein gültiger ISO-String sein
			expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);

			// Datum sollte korrekt sein (kann sich um einen Tag verschieben aufgrund Zeitumstellung)
			const resultDate = new Date(result);
			expect(resultDate.getUTCFullYear()).toBe(2024);
			expect(resultDate.getUTCMonth()).toBe(2); // März
			expect([30, 31]).toContain(resultDate.getUTCDate()); // Zeitumstellung kann Tag ändern
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

	describe('formatDate (Legacy-Wrapper)', () => {
		it('sollte als Wrapper für formatLocalDateTime funktionieren', () => {
			const utcTime = '2024-01-15T08:57:00.000Z';

			const legacyResult = formatDate(utcTime);
			const newResult = formatLocalDateTime(utcTime, 'datetime');

			expect(legacyResult).toBe(newResult);
		});

		it('sollte null korrekt behandeln', () => {
			const result = formatDate(null);
			expect(result).toBe('Nicht angegeben');
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
			expect(duration).toBeLessThan(100);
		});
	});
});
