import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as jsonGET } from '../../routes/api/sightings/export/json/+server';
import { GET as csvGET } from '../../routes/api/sightings/export/csv/+server';
import { GET as xmlGET } from '../../routes/api/sightings/export/xml/+server';
import { GET as kmlGET } from '../../routes/api/sightings/export/kml/+server';
import { createEvent, mockAdminUser } from './helpers/createEvent';

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockResolvedValue([])
				}),
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
		entryChannel: 'entryChannel',
		mediaUpload: 'mediaUpload'
	}
}));

vi.mock('drizzle-orm', () => ({
	and: vi.fn((...args) => args),
	between: vi.fn((a, b, c) => ({ a, b, c })),
	eq: vi.fn((a, b) => ({ a, b })),
	isNotNull: vi.fn((a) => ({ a }))
}));

vi.mock('$lib/server/auth/auth', () => ({
	requireUserRole: vi.fn()
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

const mockSighting = {
	id: 1,
	referenceId: 'REF-001',
	sightingDate: new Date('2024-06-15T14:30:00Z'),
	created: new Date('2024-06-15T15:00:00Z'),
	species: 0,
	totalCount: 2,
	juvenileCount: 0,
	latitude: '54.5',
	longitude: '13.5',
	isDead: false,
	email: 'max@example.com',
	lastName: 'Muster',
	phone: null,
	distance: 1,
	distribution: 1,
	city: 'Rostock',
	notes: null,
	seaState: null,
	windForce: null,
	visibility: null,
	mediaUpload: 0,
	inBalticSeaGeo: true,
	verified: 1,
	entryChannel: 0
};

async function mockDbWithSighting(sighting: object) {
	const { db } = vi.mocked(await import('$lib/server/db'));
	(db.select as any).mockReturnValueOnce({
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				orderBy: vi.fn().mockResolvedValue([sighting])
			}),
			orderBy: vi.fn().mockResolvedValue([sighting])
		})
	});
}

describe('Contract: GET /api/sightings/export/json', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with application/json content-type', async () => {
		const event = createEvent('/api/sightings/export/json', {
			locals: { user: mockAdminUser }
		});
		const res = await jsonGET(event);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('application/json');
	});

	it('returns 200 with fromDate/toDate filter applied', async () => {
		const event = createEvent('/api/sightings/export/json', {
			locals: { user: mockAdminUser },
			searchParams: { fromDate: '2024-01-01', toDate: '2024-12-31' }
		});
		const res = await jsonGET(event);

		expect(res.status).toBe(200);
	});

	it('response body contains metadata and sichtungen keys', async () => {
		const event = createEvent('/api/sightings/export/json', {
			locals: { user: mockAdminUser }
		});
		const res = await jsonGET(event);
		const text = await res.text();
		const body = JSON.parse(text);

		expect(body).toHaveProperty('metadata');
		expect(body).toHaveProperty('sichtungen');
		expect(Array.isArray(body.sichtungen)).toBe(true);
	});

	it('sichtungen array contains records when DB has data', async () => {
		await mockDbWithSighting(mockSighting);

		const event = createEvent('/api/sightings/export/json', {
			locals: { user: mockAdminUser }
		});
		const res = await jsonGET(event);
		const body = JSON.parse(await res.text());

		expect(body.sichtungen).toHaveLength(1);
		expect(body.metadata.recordCount).toBe(1);
	});
});

describe('Contract: GET /api/sightings/export/csv', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with text/csv content-type', async () => {
		const event = createEvent('/api/sightings/export/csv', {
			locals: { user: mockAdminUser }
		});
		const res = await csvGET(event);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('text/csv');
	});

	it('returns non-empty CSV body', async () => {
		const event = createEvent('/api/sightings/export/csv', {
			locals: { user: mockAdminUser }
		});
		const res = await csvGET(event);
		const body = await res.text();

		expect(body.length).toBeGreaterThan(0);
	});

	it('CSV body contains data row when DB has records', async () => {
		await mockDbWithSighting(mockSighting);

		const event = createEvent('/api/sightings/export/csv', {
			locals: { user: mockAdminUser }
		});
		const res = await csvGET(event);
		const body = await res.text();

		expect(body.split('\n').length).toBeGreaterThanOrEqual(2);
		expect(body).toContain('REF-001');
	});
});

describe('Contract: GET /api/sightings/export/xml', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with application/xml content-type', async () => {
		const event = createEvent('/api/sightings/export/xml', {
			locals: { user: mockAdminUser }
		});
		const res = await xmlGET(event);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('application/xml');
	});

	it('XML body contains sichtung element when DB has records', async () => {
		await mockDbWithSighting(mockSighting);

		const event = createEvent('/api/sightings/export/xml', {
			locals: { user: mockAdminUser }
		});
		const res = await xmlGET(event);
		const body = await res.text();

		expect(body).toContain('<sichtung>');
		expect(body).toContain('REF-001');
	});
});

describe('Contract: GET /api/sightings/export/kml', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with kml content-type', async () => {
		const event = createEvent('/api/sightings/export/kml', {
			locals: { user: mockAdminUser }
		});
		const res = await kmlGET(event);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('kml');
	});

	it('KML body contains Placemark when DB has records', async () => {
		await mockDbWithSighting(mockSighting);

		const event = createEvent('/api/sightings/export/kml', {
			locals: { user: mockAdminUser }
		});
		const res = await kmlGET(event);
		const body = await res.text();

		expect(body).toContain('<Placemark>');
		expect(body).toContain('13.5,54.5,0');
	});
});
