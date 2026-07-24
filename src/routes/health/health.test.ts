/**
 * Unit-Tests für den /health-Endpoint.
 *
 * Prüft die Readiness-Semantik: DB erreichbar → 200 healthy,
 * DB nicht erreichbar oder Fehler → 503 unhealthy.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testDatabaseConnection = vi.fn();

vi.mock('$env/dynamic/private', () => ({
	env: { NODE_ENV: 'test', npm_package_version: '0.0.0' }
}));

vi.mock('$lib/server/db', () => ({
	testDatabaseConnection: (...args: unknown[]) => testDatabaseConnection(...args)
}));

import { GET } from './+server';

// Minimales RequestEvent-Mock (GET nutzt keine Event-Argumente)
const event = {} as Parameters<typeof GET>[0];

describe('GET /health', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('liefert 200 und status "healthy" wenn die DB erreichbar ist', async () => {
		testDatabaseConnection.mockResolvedValue(true);

		const res = await GET(event);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.status).toBe('healthy');
		expect(body.database).toBe('connected');
	});

	it('liefert 503 und status "unhealthy" wenn die DB nicht erreichbar ist', async () => {
		testDatabaseConnection.mockResolvedValue(false);

		const res = await GET(event);
		const body = await res.json();

		expect(res.status).toBe(503);
		expect(body.status).toBe('unhealthy');
		expect(body.database).toBe('disconnected');
	});

	it('liefert 503 wenn der DB-Check eine Exception wirft', async () => {
		testDatabaseConnection.mockRejectedValue(new Error('connection refused'));

		const res = await GET(event);
		const body = await res.json();

		expect(res.status).toBe(503);
		expect(body.status).toBe('unhealthy');
	});

	it('setzt no-cache Header auch im Fehlerfall', async () => {
		testDatabaseConnection.mockResolvedValue(false);

		const res = await GET(event);

		expect(res.headers.get('cache-control')).toContain('no-cache');
	});
});
