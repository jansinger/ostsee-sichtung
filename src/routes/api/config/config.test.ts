import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLogAuditEvent } = vi.hoisted(() => ({
	mockLogAuditEvent: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/server/audit/auditService', () => ({
	logAuditEvent: mockLogAuditEvent
}));

vi.mock('$lib/server/auth/auth', () => ({
	requireUserRole: vi.fn()
}));

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

vi.mock('$lib/server/db/configRepository', () => ({
	ConfigRepository: {
		upsert: vi.fn().mockResolvedValue(undefined),
		clearCache: vi.fn(),
		getAll: vi.fn().mockResolvedValue([]),
		getByCategory: vi.fn().mockResolvedValue([]),
		delete: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock('$lib/server/config/accessControl', () => ({
	filterConfigsByUserAccess: vi.fn().mockImplementation((configs: unknown[]) => configs),
	canUserAccessConfigKey: vi.fn().mockReturnValue(true)
}));

import { PUT, DELETE } from './+server';

describe('PUT /api/config — Audit Logging', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loggt config.update mit key und category', async () => {
		const event = {
			request: new Request('http://localhost/api/config', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ key: 'maintenance_mode', value: true, category: 'system' })
			}),
			locals: { user: { email: 'admin@test.com', sub: 'auth0|admin', roles: ['admin'] } },
			url: new URL('http://localhost/api/config')
		};

		await PUT(event as never);

		expect(mockLogAuditEvent).toHaveBeenCalledOnce();
		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'config.update',
				resourceType: 'config',
				resourceId: 'maintenance_mode',
				details: expect.objectContaining({ key: 'maintenance_mode', category: 'system' })
			})
		);
	});
});

describe('DELETE /api/config — Audit Logging', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loggt config.delete beim Löschen einer Einstellung', async () => {
		const event = {
			url: new URL('http://localhost/api/config?key=maintenance_mode'),
			locals: { user: { email: 'admin@test.com', sub: 'auth0|admin', roles: ['admin'] } },
			request: new Request('http://localhost/api/config?key=maintenance_mode', {
				method: 'DELETE'
			})
		};

		await DELETE(event as never);

		expect(mockLogAuditEvent).toHaveBeenCalledOnce();
		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'config.delete',
				resourceType: 'config',
				resourceId: 'maintenance_mode',
				details: expect.objectContaining({ key: 'maintenance_mode' })
			})
		);
	});
});
