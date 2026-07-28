/**
 * @fileoverview H2 — GET /api/sightings muss `dt`/`ti` in Europe/Berlin liefern
 * (nicht UTC) und die Jahresgrenzen über `getYearRange` (Berlin-Mitternacht,
 * halboffenes Intervall) statt über prozesszonen-abhängige `Date`-Konstruktoren
 * bilden. Die Feldnamen sind identisch mit `showreports.json`, das bereits
 * korrekt in Berlin formatiert — beide Endpunkte dürfen nicht mehr auseinanderlaufen.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockOrderBy, mockWhere } = vi.hoisted(() => {
	const mockOrderBy = vi.fn().mockResolvedValue([]);
	const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
	return { mockOrderBy, mockWhere };
});

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({ where: mockWhere, orderBy: mockOrderBy })
		})
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	sightings: {
		id: 'id',
		created: 'created',
		sightingDate: 'sightingDate',
		latitude: 'latitude',
		longitude: 'longitude',
		totalCount: 'totalCount',
		juvenileCount: 'juvenileCount',
		species: 'species',
		isDead: 'isDead',
		nameConsent: 'nameConsent',
		firstName: 'firstName',
		lastName: 'lastName',
		waterway: 'waterway',
		shipNameConsent: 'shipNameConsent',
		shipName: 'shipName'
	}
}));

// Drizzle wird durch Marker-Objekte ersetzt, damit die erzeugten Grenz-Instants
// und Feld-Ausdrücke direkt geprüft werden können statt über generiertes SQL
// (gleiches Muster wie `api/map/sightings/yearFilter.test.ts`).
vi.mock('drizzle-orm', () => ({
	and: vi.fn((...conditions) => conditions),
	gte: vi.fn((column, value) => ({ op: 'gte', column, value })),
	lt: vi.fn((column, value) => ({ op: 'lt', column, value })),
	sql: Object.assign(
		vi.fn(() => 'sql-fragment'),
		{ raw: vi.fn((s: string) => s) }
	)
}));

vi.mock('$lib/legacy-api/date-utils', () => ({
	getYearRange: vi.fn((year: number) => ({
		startDate: new Date(Date.UTC(year - 1, 11, 31, 23, 0, 0)),
		endDate: new Date(Date.UTC(year, 11, 31, 23, 0, 0))
	}))
}));

vi.mock('$lib/server/db/sqlTimeZone', () => ({
	berlinToChar: vi.fn((column: string, pattern: string) => `berlinToChar(${column},${pattern})`)
}));

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

import { GET } from './+server';

type Condition = { op: string; column: string; value?: Date };

const createMockGetEvent = (url: string) =>
	({
		url: new URL(url),
		setHeaders: vi.fn()
	}) as unknown as Parameters<typeof GET>[0];

describe('GET /api/sightings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWhere.mockReturnValue({ orderBy: mockOrderBy });
		mockOrderBy.mockResolvedValue([]);
	});

	it('nutzt getYearRange (Berlin-Mitternacht) statt lokaler Date-Konstruktoren', async () => {
		const { getYearRange } = await import('$lib/legacy-api/date-utils');

		await GET(createMockGetEvent('http://localhost/api/sightings?year=2024'));

		expect(getYearRange).toHaveBeenCalledWith(2024);

		const conditions = mockWhere.mock.calls.at(-1)?.[0] as Condition[];
		expect(conditions.map((c) => c.op)).toEqual(['gte', 'lt']);
		expect(conditions[0]?.value?.toISOString()).toBe('2023-12-31T23:00:00.000Z');
		expect(conditions[1]?.value?.toISOString()).toBe('2024-12-31T23:00:00.000Z');
	});

	it('formatiert dt/ti über berlinToChar (Europe/Berlin), nicht über rohes to_char', async () => {
		const { berlinToChar } = await import('$lib/server/db/sqlTimeZone');
		const { db } = await import('$lib/server/db');

		await GET(createMockGetEvent('http://localhost/api/sightings?year=2024'));

		expect(berlinToChar).toHaveBeenCalledWith('sightingDate', 'DD.MM.YYYY');
		expect(berlinToChar).toHaveBeenCalledWith('sightingDate', 'HH24:MI');

		const selectArg = vi.mocked(db.select).mock.calls.at(-1)?.[0] as unknown as {
			dt: string;
			ti: string;
		};
		expect(selectArg.dt).toBe('berlinToChar(sightingDate,DD.MM.YYYY)');
		expect(selectArg.ti).toBe('berlinToChar(sightingDate,HH24:MI)');
	});
});
