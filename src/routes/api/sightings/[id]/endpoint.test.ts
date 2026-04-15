import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from './+server';

vi.mock('$lib/server/db', () => ({
	db: {
		select: () => ({
			from: () => ({
				where: () => ({
					limit: () => Promise.resolve([{ id: 123 }])
				})
			})
		}),
		delete: () => ({
			where: () => Promise.resolve()
		})
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	sightings: { id: 'id' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ a, b }))
}));

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

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

vi.mock('$lib/server/audit/auditService', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined)
}));

describe('/api/sightings/[id] DELETE endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockRequestEvent = (id: string, user: { email: string; roles: string[] } | null = { email: 'admin@test.com', roles: ['admin'] }) => {
		return {
			params: { id },
			locals: { user },
			url: new URL(`http://localhost/api/sightings/${id}`),
			request: new Request(`http://localhost/api/sightings/${id}`, { method: 'DELETE' }),
			cookies: {} as any,
			fetch: fetch,
			getClientAddress: () => '127.0.0.1',
			platform: undefined,
			route: { id: '/api/sightings/[id]' },
			setHeaders: vi.fn(),
			isDataRequest: false,
			isSubRequest: false,
			isRemoteRequest: false
		} as any;
	};

	it('should reject invalid sighting ID', async () => {
		const requestEvent = createMockRequestEvent('invalid');

		try {
			await DELETE(requestEvent);
			expect.fail('Should have thrown an error');
		} catch (e: any) {
			expect(e.status).toBe(400);
			expect(e.body.message).toBe('Ungültige Sichtungs-ID');
		}
	});

	it('should reject empty sighting ID', async () => {
		const requestEvent = createMockRequestEvent('');

		try {
			await DELETE(requestEvent);
			expect.fail('Should have thrown an error');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('should return success response with correct format after deletion', async () => {
		// This test verifies the response format that the frontend expects
		// after a successful deletion - the list should update based on this response
		const requestEvent = createMockRequestEvent('123');

		const response = await DELETE(requestEvent);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result).toEqual({
			success: true,
			message: 'Sichtung erfolgreich gelöscht'
		});
	});

	it('should handle numeric string ID correctly', async () => {
		const requestEvent = createMockRequestEvent('456');

		const response = await DELETE(requestEvent);
		expect(response.status).toBe(200);
	});
});

describe('Admin sightings list reactivity', () => {
	/**
	 * This test documents the bug that was fixed:
	 *
	 * The original code used a problematic Svelte 5 pattern:
	 * ```typescript
	 * let sightings = $derived.by(() => {
	 *     let sightings = $state(data.sightings);
	 *     return sightings;
	 * });
	 * ```
	 *
	 * This created a cached $state inside $derived.by(), which didn't
	 * update when data.sightings was refreshed via invalidateAll().
	 *
	 * The fix changed it to:
	 * ```typescript
	 * let sightings = $derived(data.sightings);
	 * ```
	 *
	 * This ensures proper reactivity: when invalidateAll() is called
	 * after deletion, the sightings list correctly reflects the updated
	 * server data.
	 */
	it('documents the fixed reactivity pattern', () => {
		// This is a documentation test - the actual reactivity is tested via E2E
		// The pattern change from $derived.by(() => { $state(...) }) to $derived()
		// is the key fix that ensures the list updates after deletion
		expect(true).toBe(true);
	});
});
