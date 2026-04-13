import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';

vi.mock('$lib/logger', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

vi.mock('$lib/server/auth/auth', () => ({
	requireUserRole: vi.fn()
}));

vi.mock('$lib/server/db/sightingRepository', () => ({
	getSightingById: vi.fn(),
	updateSightingWeatherData: vi.fn()
}));

vi.mock('$lib/server/services/weatherRefreshService', () => ({
	fetchWeatherData: vi.fn()
}));

const createMockEvent = (id: string, user: { email: string; roles: string[] } | null = null) => ({
	params: { id },
	locals: { user },
	url: new URL(`http://localhost/api/admin/weather/${id}/refresh`)
});

describe('/api/admin/weather/[id]/refresh POST endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('ruft requireUserRole mit admin-Rolle auf', async () => {
		const { requireUserRole } = await import('$lib/server/auth/auth');
		const { getSightingById } = await import('$lib/server/db/sightingRepository');
		vi.mocked(getSightingById).mockResolvedValue(null);

		const event = createMockEvent('123', { email: 'admin@test.com', roles: ['admin'] });
		await POST(event as Parameters<typeof POST>[0]);

		expect(requireUserRole).toHaveBeenCalledWith(event.url, event.locals.user, ['admin']);
	});

	it('lehnt ungültige Sichtungs-ID ab', async () => {
		const event = createMockEvent('invalid', { email: 'admin@test.com', roles: ['admin'] });
		const response = await POST(event as Parameters<typeof POST>[0]);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
	});

	it('gibt 404 zurück wenn Sichtung nicht gefunden', async () => {
		const { getSightingById } = await import('$lib/server/db/sightingRepository');
		vi.mocked(getSightingById).mockResolvedValue(null);

		const event = createMockEvent('999', { email: 'admin@test.com', roles: ['admin'] });
		const response = await POST(event as Parameters<typeof POST>[0]);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.success).toBe(false);
	});

	it('500-Antwort enthält keine internen Fehlerdetails', async () => {
		const { getSightingById } = await import('$lib/server/db/sightingRepository');
		vi.mocked(getSightingById).mockRejectedValue(
			new Error('DB connection failed: postgresql://secret@host/db')
		);

		const event = createMockEvent('1', { email: 'admin@test.com', roles: ['admin'] });
		const response = await POST(event as Parameters<typeof POST>[0]);
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body.success).toBe(false);
		expect(body.error).not.toContain('postgresql://');
		expect(body.error).not.toContain('DB connection failed');
	});
});
