import { describe, expect, it } from 'vitest';
import { berlinDayRangeUtc, berlinMidnightUtc } from './berlinDayRange';
import { TEST_TIME_ZONES, withTimeZone } from './withTimeZone.testutil';

describe('berlinMidnightUtc', () => {
	it('liefert für einen Sommertag 22:00 UTC des Vortags', () => {
		expect(berlinMidnightUtc('2026-07-15').toISOString()).toBe('2026-07-14T22:00:00.000Z');
	});

	it('liefert für einen Wintertag 23:00 UTC des Vortags', () => {
		expect(berlinMidnightUtc('2026-01-15').toISOString()).toBe('2026-01-14T23:00:00.000Z');
	});

	it('liefert für Neujahr denselben Instant wie die Legacy-Jahresgrenze', () => {
		expect(berlinMidnightUtc('2027-01-01').toISOString()).toBe('2026-12-31T23:00:00.000Z');
	});

	it('behandelt den Tag der Sommerzeit-Umstellung korrekt (Mitternacht noch MEZ)', () => {
		// 29.03.2026 ist der letzte März-Sonntag: Mitternacht liegt vor der
		// Umstellung um 02:00, der Offset ist also noch +1.
		expect(berlinMidnightUtc('2026-03-29').toISOString()).toBe('2026-03-28T23:00:00.000Z');
	});

	it('behandelt den Tag der Winterzeit-Umstellung korrekt (Mitternacht noch MESZ)', () => {
		// 25.10.2026 ist der letzte Oktober-Sonntag: Mitternacht liegt vor der
		// Umstellung um 03:00, der Offset ist also noch +2. Dieser Fall braucht
		// die zweite Fixpunkt-Iteration — eine einzelne Offset-Ablesung am
		// UTC-Mitternachts-Schätzwert liefert bereits den Winter-Offset.
		expect(berlinMidnightUtc('2026-10-25').toISOString()).toBe('2026-10-24T22:00:00.000Z');
	});

	it('ist unabhängig von der Prozess-Zeitzone', () => {
		for (const zone of TEST_TIME_ZONES) {
			withTimeZone(zone, () => {
				expect(berlinMidnightUtc('2026-07-15').toISOString()).toBe('2026-07-14T22:00:00.000Z');
				expect(berlinMidnightUtc('2026-10-25').toISOString()).toBe('2026-10-24T22:00:00.000Z');
			});
		}
	});

	it('weist Eingaben außerhalb von YYYY-MM-DD zurück', () => {
		expect(() => berlinMidnightUtc('15.07.2026')).toThrow();
		expect(() => berlinMidnightUtc('2026-7-5')).toThrow();
		expect(() => berlinMidnightUtc('2026-07-15T12:00')).toThrow();
	});
});

describe('berlinDayRangeUtc', () => {
	it('liefert ein halboffenes Intervall über Berlin-Kalendertage', () => {
		const { start, endExclusive } = berlinDayRangeUtc('2026-07-01', '2026-07-31');
		expect(start.toISOString()).toBe('2026-06-30T22:00:00.000Z');
		// Obergrenze exklusiv: Mitternacht des Folgetags — der 31.07. gehört
		// damit vollständig zum Intervall.
		expect(endExclusive.toISOString()).toBe('2026-07-31T22:00:00.000Z');
	});

	it('deckt einen einzelnen Tag vollständig ab', () => {
		const { start, endExclusive } = berlinDayRangeUtc('2026-12-31', '2026-12-31');
		expect(start.toISOString()).toBe('2026-12-30T23:00:00.000Z');
		expect(endExclusive.toISOString()).toBe('2026-12-31T23:00:00.000Z');
	});

	it('überspannt den Jahreswechsel inklusive Silvester-Randstunde', () => {
		const { start, endExclusive } = berlinDayRangeUtc('2026-01-01', '2026-12-31');
		// Eine Sichtung am 01.01. um 00:30 Berlin (= 31.12. 23:30 UTC des
		// Vorjahrs) muss im Intervall liegen.
		const neujahrsnacht = new Date('2025-12-31T23:30:00.000Z');
		expect(neujahrsnacht.getTime()).toBeGreaterThanOrEqual(start.getTime());
		expect(neujahrsnacht.getTime()).toBeLessThan(endExclusive.getTime());
		// Eine Sichtung am 31.12. um 23:30 Berlin (= 22:30 UTC) ebenfalls.
		const silvesterabend = new Date('2026-12-31T22:30:00.000Z');
		expect(silvesterabend.getTime()).toBeLessThan(endExclusive.getTime());
	});
});
