import { describe, expect, it, vi } from 'vitest';

// Drizzle wird durch Marker-Objekte ersetzt, damit die erzeugten Grenz-Instants
// direkt geprüft werden können statt über generiertes SQL.
vi.mock('drizzle-orm', () => ({
	and: vi.fn((...conditions) => ({ op: 'and', conditions })),
	between: vi.fn((column, from, to) => ({ op: 'between', column, from, to })),
	gte: vi.fn((column, value) => ({ op: 'gte', column, value })),
	lt: vi.fn((column, value) => ({ op: 'lt', column, value })),
	eq: vi.fn((column, value) => ({ op: 'eq', column, value }))
}));

vi.mock('$lib/server/db/schema', () => ({
	sightings: {
		sightingDate: 'sightingDate',
		verified: 'verified',
		entryChannel: 'entryChannel',
		mediaUpload: 'mediaUpload'
	}
}));

import { buildExportConditions } from './exportFilterParams';

type Condition = { op: string; column: string; value?: Date; from?: Date; to?: Date };

function dateRange(fromDate: string, toDate: string): { start: Date; endExclusive: Date } {
	const conditions = buildExportConditions({
		fromDate,
		toDate,
		verified: null,
		entryChannel: null,
		mediaUpload: null
	}) as unknown as Condition[];

	const onDate = conditions.filter((condition) => condition.column === 'sightingDate');
	expect(onDate.map((condition) => condition.op)).toEqual(['gte', 'lt']);

	return { start: onDate[0]!.value as Date, endExclusive: onDate[1]!.value as Date };
}

/** Bildet das halboffene Intervall der Abfrage nach: `>= start AND < endExclusive`. */
function includes(range: { start: Date; endExclusive: Date }, instant: string): boolean {
	const time = new Date(instant).getTime();
	return time >= range.start.getTime() && time < range.endExclusive.getTime();
}

describe('buildExportConditions — Datumsfilter meint Berliner Kalendertage', () => {
	it('nutzt kein BETWEEN, sondern das halboffene Intervall gte/lt', async () => {
		const { between, gte, lt } = vi.mocked(await import('drizzle-orm'));
		vi.clearAllMocks();

		buildExportConditions({
			fromDate: '2024-06-01',
			toDate: '2024-06-30',
			verified: null,
			entryChannel: null,
			mediaUpload: null
		});

		expect(between).not.toHaveBeenCalled();
		expect(gte).toHaveBeenCalledTimes(1);
		expect(lt).toHaveBeenCalledTimes(1);
	});

	it('setzt die Grenzen im Sommer auf Berliner Mitternacht (MESZ, UTC+2)', () => {
		const range = dateRange('2024-06-01', '2024-06-30');

		expect(range.start.toISOString()).toBe('2024-05-31T22:00:00.000Z');
		expect(range.endExclusive.toISOString()).toBe('2024-06-30T22:00:00.000Z');
	});

	it('setzt die Grenzen im Winter auf Berliner Mitternacht (MEZ, UTC+1)', () => {
		const range = dateRange('2024-01-01', '2024-01-31');

		expect(range.start.toISOString()).toBe('2023-12-31T23:00:00.000Z');
		expect(range.endExclusive.toISOString()).toBe('2024-01-31T23:00:00.000Z');
	});

	it('enthält den letzten Tag vollständig (23:30 Berlin) und nicht den Folgetag', () => {
		const range = dateRange('2024-06-01', '2024-06-30');

		// 30.06.2024 23:30 Berlin = 21:30Z
		expect(includes(range, '2024-06-30T21:30:00.000Z')).toBe(true);
		// 01.07.2024 00:30 Berlin = 30.06. 22:30Z
		expect(includes(range, '2024-06-30T22:30:00.000Z')).toBe(false);
	});

	it('enthält die frühen Randstunden des ersten Tages (00:30 Berlin)', () => {
		const range = dateRange('2024-01-01', '2024-01-31');

		// 01.01.2024 00:30 Berlin = 31.12.2023 23:30Z
		expect(includes(range, '2023-12-31T23:30:00.000Z')).toBe(true);
		// 31.12.2023 23:30 Berlin = 22:30Z
		expect(includes(range, '2023-12-31T22:30:00.000Z')).toBe(false);
	});

	it('deckt Silvester als Einzeltag vollständig ab', () => {
		const range = dateRange('2024-12-31', '2024-12-31');

		expect(range.start.toISOString()).toBe('2024-12-30T23:00:00.000Z');
		expect(range.endExclusive.toISOString()).toBe('2024-12-31T23:00:00.000Z');
		// 31.12.2024 14:00 Berlin = 13:00Z
		expect(includes(range, '2024-12-31T13:00:00.000Z')).toBe(true);
		// 31.12.2024 23:30 Berlin = 22:30Z
		expect(includes(range, '2024-12-31T22:30:00.000Z')).toBe(true);
		// 01.01.2025 00:30 Berlin = 31.12. 23:30Z
		expect(includes(range, '2024-12-31T23:30:00.000Z')).toBe(false);
	});

	it('lässt den Datumsfilter weg, wenn nur eine Grenze gesetzt ist', () => {
		const conditions = buildExportConditions({
			fromDate: '2024-06-01',
			toDate: '',
			verified: null,
			entryChannel: null,
			mediaUpload: null
		}) as unknown as Condition[];

		expect(conditions).toHaveLength(0);
	});
});
