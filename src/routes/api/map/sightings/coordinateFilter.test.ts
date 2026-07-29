import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockWhere, mockOrderBy } = vi.hoisted(() => {
	const mockOrderBy = vi.fn().mockResolvedValue([]);
	const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
	return { mockWhere, mockOrderBy };
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
		sightingDate: 'sightingDate',
		approvedAt: 'approvedAt',
		latitude: 'latitude',
		longitude: 'longitude'
	}
}));

// Drizzle wird durch Marker-Objekte ersetzt, damit die WHERE-Bedingungen
// direkt geprüft werden können, statt generiertes SQL zu parsen.
vi.mock('drizzle-orm', () => ({
	and: vi.fn((...conditions) => conditions),
	between: vi.fn((column, from, to) => ({ op: 'between', column, from, to })),
	gte: vi.fn((column, value) => ({ op: 'gte', column, value })),
	lte: vi.fn((column, value) => ({ op: 'lte', column, value })),
	lt: vi.fn((column, value) => ({ op: 'lt', column, value })),
	eq: vi.fn((column, value) => ({ op: 'eq', column, value })),
	isNotNull: vi.fn((column) => ({ op: 'isNotNull', column })),
	sql: Object.assign(
		vi.fn((strings: TemplateStringsArray) => String(strings.raw[0])),
		{ raw: vi.fn((s: string) => s) }
	)
}));

vi.mock('$lib/map/mapUtils', () => ({
	sightingsToGeoJSON: vi.fn().mockReturnValue({ type: 'FeatureCollection', features: [] })
}));

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

import { GET } from './+server';
import { BALTIC_SEA_BBOX } from '$lib/utils/geo/checkBalticSea';

type Condition = { op: string; column: string; value?: string };

async function queryConditions(): Promise<Condition[]> {
	const url = new URL('http://localhost/api/map/sightings');
	await GET({ url } as Parameters<typeof GET>[0]);

	return mockWhere.mock.calls.at(-1)?.[0] as Condition[];
}

describe('GET /api/map/sightings — Koordinatenfilter gegen Null Island', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWhere.mockReturnValue({ orderBy: mockOrderBy });
		mockOrderBy.mockResolvedValue([]);
	});

	it('verlangt NOT NULL für Breiten- und Längengrad', async () => {
		const conditions = await queryConditions();
		const notNullColumns = conditions
			.filter((condition) => condition.op === 'isNotNull')
			.map((condition) => condition.column);

		expect(notNullColumns).toContain('latitude');
		expect(notNullColumns).toContain('longitude');
	});

	it('klemmt den Breitengrad auf die Ostsee-Bounding-Box', async () => {
		const conditions = await queryConditions();
		const latConditions = conditions.filter((condition) => condition.column === 'latitude');

		expect(latConditions.find((condition) => condition.op === 'gte')?.value).toBe(
			BALTIC_SEA_BBOX.minLatitude.toString()
		);
		expect(latConditions.find((condition) => condition.op === 'lte')?.value).toBe(
			BALTIC_SEA_BBOX.maxLatitude.toString()
		);
	});

	it('klemmt den Längengrad auf die Ostsee-Bounding-Box', async () => {
		const conditions = await queryConditions();
		const lonConditions = conditions.filter((condition) => condition.column === 'longitude');

		expect(lonConditions.find((condition) => condition.op === 'gte')?.value).toBe(
			BALTIC_SEA_BBOX.minLongitude.toString()
		);
		expect(lonConditions.find((condition) => condition.op === 'lte')?.value).toBe(
			BALTIC_SEA_BBOX.maxLongitude.toString()
		);
	});

	it('nutzt die Konstanten aus checkBalticSea.ts (kein duplizierter Wert)', () => {
		expect(BALTIC_SEA_BBOX).toEqual({
			minLongitude: 9.4,
			maxLongitude: 30.2,
			minLatitude: 53.0,
			maxLatitude: 66.0
		});
	});

	it('behält den Freigabe-Filter bei (approvedAt)', async () => {
		const conditions = await queryConditions();

		expect(
			conditions.some(
				(condition) => condition.op === 'isNotNull' && condition.column === 'approvedAt'
			)
		).toBe(true);
	});
});
