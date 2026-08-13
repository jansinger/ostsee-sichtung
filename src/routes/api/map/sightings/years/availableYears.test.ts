import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockWhere, mockGroupBy, mockOrderBy } = vi.hoisted(() => {
	const mockOrderBy = vi.fn().mockResolvedValue([]);
	const mockGroupBy = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
	const mockWhere = vi.fn().mockReturnValue({ groupBy: mockGroupBy });
	return { mockWhere, mockGroupBy, mockOrderBy };
});

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({ where: mockWhere })
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
// direkt geprüft werden können, statt generiertes SQL zu parsen. `sql` wird
// so gemockt, dass es (wie im Original) beliebig verschachtelt werden kann —
// berlinDatePart() aus sqlTimeZone.ts nutzt genau dieses Verhalten.
vi.mock('drizzle-orm', () => ({
	and: vi.fn((...conditions) => conditions),
	gte: vi.fn((column, value) => ({ op: 'gte', column, value })),
	lte: vi.fn((column, value) => ({ op: 'lte', column, value })),
	isNotNull: vi.fn((column) => ({ op: 'isNotNull', column })),
	sql: Object.assign(
		vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
			op: 'sql',
			strings: strings.raw,
			values
		})),
		{ raw: vi.fn((s: string) => ({ op: 'sql.raw', value: s })) }
	)
}));

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

import { GET } from './+server';

type Condition = { op: string; column: string };

function makeEvent(): Parameters<typeof GET>[0] {
	return {
		url: new URL('http://localhost/api/map/sightings/years'),
		locals: { user: null },
		setHeaders: vi.fn()
	} as unknown as Parameters<typeof GET>[0];
}

describe('GET /api/map/sightings/years', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWhere.mockReturnValue({ groupBy: mockGroupBy });
		mockGroupBy.mockReturnValue({ orderBy: mockOrderBy });
		mockOrderBy.mockResolvedValue([]);
	});

	it('nutzt dieselbe Grundmenge wie die Karte (Freigabe + Koordinatenfilter)', async () => {
		await GET(makeEvent());

		const conditions = mockWhere.mock.calls.at(-1)?.[0] as Condition[];
		const notNullColumns = conditions
			.filter((condition) => condition.op === 'isNotNull')
			.map((condition) => condition.column);

		expect(notNullColumns).toEqual(expect.arrayContaining(['approvedAt', 'latitude', 'longitude']));
		expect(conditions.filter((condition) => condition.op === 'gte')).toHaveLength(2);
		expect(conditions.filter((condition) => condition.op === 'lte')).toHaveLength(2);
	});

	it('liefert Jahre absteigend sortiert und filtert count=0 heraus', async () => {
		mockOrderBy.mockResolvedValueOnce([
			{ year: 2025, count: 42 },
			{ year: 2024, count: 0 },
			{ year: 2023, count: 7 }
		]);

		const response = await GET(makeEvent());
		const body = await response.json();

		expect(body).toEqual({
			years: [
				{ year: 2025, count: 42 },
				{ year: 2023, count: 7 }
			]
		});
	});

	it('wandelt String-Werte (bigint/numeric aus Postgres) in Zahlen um', async () => {
		mockOrderBy.mockResolvedValueOnce([{ year: '2025', count: '42' }]);

		const response = await GET(makeEvent());
		const body = await response.json();

		expect(body).toEqual({ years: [{ year: 2025, count: 42 }] });
	});

	it('liefert ein leeres Array, wenn keine Sichtungen vorhanden sind', async () => {
		mockOrderBy.mockResolvedValueOnce([]);

		const response = await GET(makeEvent());
		const body = await response.json();

		expect(body).toEqual({ years: [] });
	});

	it('fängt DB-Fehler ab und liefert 500 ohne interne Details', async () => {
		mockOrderBy.mockRejectedValueOnce(new Error('boom - interne Details'));

		const response = await GET(makeEvent());

		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body).toEqual({ error: expect.any(String) });
		expect(JSON.stringify(body)).not.toContain('boom');
	});
});
