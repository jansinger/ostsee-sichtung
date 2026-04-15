import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLogAuditEvent, mockSelect, mockUpdate } = vi.hoisted(() => ({
	mockLogAuditEvent: vi.fn().mockResolvedValue(undefined),
	mockSelect: vi.fn(),
	mockUpdate: vi.fn()
}));

vi.mock('$lib/server/audit/auditService', () => ({
	logAuditEvent: mockLogAuditEvent
}));

vi.mock('$lib/server/auth/auth', () => ({
	requireUserRole: vi.fn()
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: mockSelect,
		update: mockUpdate
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	sightings: {}
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

import { PATCH } from './+server';

function makeEvent(id: string, approve: boolean, userEmail = 'admin@test.com') {
	return {
		params: { id },
		request: new Request(`http://localhost/api/sightings/${id}/approve`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ approve })
		}),
		locals: { user: { email: userEmail, roles: ['admin'], sub: 'auth0|test' } },
		url: new URL(`http://localhost/api/sightings/${id}/approve`)
	};
}

describe('PATCH /api/sightings/[id]/approve — Audit Logging', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		const mockLimit = vi.fn().mockResolvedValue([{ id: 42, approvedAt: null, internalComment: null }]);
		const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
		const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
		mockSelect.mockReturnValue({ from: mockFrom });

		const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
		const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
		mockUpdate.mockReturnValue({ set: mockSet });
	});

	it('loggt ein sighting.approve Event wenn approve=true', async () => {
		const event = makeEvent('42', true);
		await PATCH(event as never);

		expect(mockLogAuditEvent).toHaveBeenCalledOnce();
		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'sighting.approve',
				resourceType: 'sighting',
				resourceId: '42',
				userEmail: 'admin@test.com'
			})
		);
	});

	it('loggt ein sighting.reject Event wenn approve=false', async () => {
		const event = makeEvent('42', false);
		await PATCH(event as never);

		expect(mockLogAuditEvent).toHaveBeenCalledOnce();
		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'sighting.reject', resourceId: '42' })
		);
	});

	it('loggt previousStatus aus dem DB-Eintrag', async () => {
		const mockLimit = vi.fn().mockResolvedValue([{ id: 42, approvedAt: new Date(), internalComment: null }]);
		const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
		const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
		mockSelect.mockReturnValue({ from: mockFrom });

		const event = makeEvent('42', false);
		await PATCH(event as never);

		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				details: expect.objectContaining({ previousStatus: true })
			})
		);
	});
});
