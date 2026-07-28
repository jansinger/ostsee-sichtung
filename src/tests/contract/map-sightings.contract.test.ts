import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../routes/api/map/sightings/+server';
import { createEvent, mockAdminUser } from './helpers/createEvent';
import { asApiResponse } from './helpers/asApiResponse';

const { mockWhere } = vi.hoisted(() => {
	const mockWhere = vi.fn().mockReturnValue({
		orderBy: vi.fn().mockResolvedValue([])
	});
	return { mockWhere };
});

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: mockWhere,
				orderBy: vi.fn().mockResolvedValue([])
			})
		})
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	sightings: {
		id: 'id',
		sightingDate: 'sightingDate',
		verified: 'verified',
		approvedAt: 'approvedAt',
		firstName: 'firstName',
		lastName: 'lastName',
		nameConsent: 'nameConsent',
		shipName: 'shipName',
		shipNameConsent: 'shipNameConsent',
		waterway: 'waterway',
		seaMark: 'seaMark',
		longitude: 'longitude',
		latitude: 'latitude',
		species: 'species',
		totalCount: 'totalCount',
		juvenileCount: 'juvenileCount',
		isDead: 'isDead'
	}
}));

vi.mock('drizzle-orm', () => ({
	and: vi.fn((...args) => args),
	between: vi.fn((a, b, c) => ({ a, b, c })),
	gte: vi.fn((a, b) => ({ a, b })),
	lt: vi.fn((a, b) => ({ a, b })),
	eq: vi.fn((a, b) => ({ a, b })),
	isNotNull: vi.fn((a) => ({ isNotNull: a })),
	sql: Object.assign(
		vi.fn((strings: TemplateStringsArray) => String(strings.raw[0])),
		{
			raw: vi.fn((s: string) => s)
		}
	)
}));

vi.mock('$lib/map/mapUtils', () => ({
	sightingsToGeoJSON: vi.fn().mockReturnValue({
		type: 'FeatureCollection',
		features: []
	})
}));

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

describe('Contract: GET /api/map/sightings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/map/sightings', {
			locals: { user: mockAdminUser }
		});
		const res = await GET(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});

	it('returns 200 with year filter and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/map/sightings', {
			locals: { user: mockAdminUser },
			searchParams: { year: '2024' }
		});
		const res = await GET(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});

	it('returns GeoJSON FeatureCollection', async () => {
		const event = createEvent('/api/map/sightings', {
			locals: { user: mockAdminUser }
		});
		const res = await GET(event);
		const body = await res.json();

		expect(body.type).toBe('FeatureCollection');
		expect(Array.isArray(body.features)).toBe(true);
	});

	it('filtert auf approvedAt IS NOT NULL statt auf verified=1 (gleiche Grundmenge wie Legacy-API)', async () => {
		const { isNotNull, eq } = vi.mocked(await import('drizzle-orm'));
		const event = createEvent('/api/map/sightings', {
			locals: { user: mockAdminUser }
		});

		await GET(event);

		// Die öffentliche Grundmenge der modernen Karte muss dieselbe Spalte nutzen
		// wie /sichtungen/showreports.json, an die die Legacy-API vertraglich
		// gebunden ist: approvedAt. `verified` und `approvedAt` werden zwar immer
		// gemeinsam geschrieben, aber zwei verschiedene Filterspalten für zwei
		// öffentliche Flächen können auseinanderlaufen — deshalb hier nur eine.
		expect(isNotNull).toHaveBeenCalledWith('approvedAt');
		expect(eq).not.toHaveBeenCalledWith('verified', 1);
	});
});
