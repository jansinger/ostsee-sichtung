import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLogAuditEvent, mockIsAdminUser, mockSelect, mockStorage } = vi.hoisted(() => ({
	mockLogAuditEvent: vi.fn().mockResolvedValue(undefined),
	mockIsAdminUser: vi.fn().mockReturnValue(true),
	mockSelect: vi.fn(),
	mockStorage: { delete: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('$lib/server/audit/auditService', () => ({
	logAuditEvent: mockLogAuditEvent
}));

vi.mock('$lib/server/auth/auth', () => ({
	isAdminUser: mockIsAdminUser
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

vi.mock('$lib/server/db/sightingFilesRepository', () => ({
	deleteFileByPath: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/server/storage/factory', () => ({
	getStorageProvider: vi.fn().mockReturnValue(mockStorage)
}));

vi.mock('$lib/server/db', () => ({
	db: { select: mockSelect }
}));

vi.mock('$lib/server/db/schema', () => ({
	sightingFiles: {}
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

import { DELETE } from './+server';

function makeEvent(filePath: string) {
	return {
		request: new Request('http://localhost/api/files/delete', {
			method: 'DELETE',
			headers: {
				'content-type': 'application/json',
				'x-forwarded-for': '10.0.0.1'
			},
			body: JSON.stringify({ filePath })
		}),
		locals: { user: { email: 'admin@test.com', sub: 'auth0|admin', roles: ['admin'] } }
	};
}

describe('DELETE /api/files/delete — Audit Logging', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockStorage.delete.mockResolvedValue(undefined);
		mockIsAdminUser.mockReturnValue(true);
	});

	it('loggt file.delete für Admin-Löschungen', async () => {
		const event = makeEvent('uploads/test-image.jpg');
		await DELETE(event as never);

		expect(mockLogAuditEvent).toHaveBeenCalledOnce();
		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'file.delete',
				resourceType: 'file',
				resourceId: 'uploads/test-image.jpg'
			})
		);
	});

	it('loggt KEIN file.delete für nicht-Admin-Löschungen', async () => {
		mockIsAdminUser.mockReturnValue(false);

		const mockLimit = vi.fn().mockResolvedValue([{ id: 1, sightingId: null }]);
		const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
		const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
		mockSelect.mockReturnValue({ from: mockFrom });

		const event = makeEvent('uploads/unassigned.jpg');
		await DELETE(event as never);

		expect(mockLogAuditEvent).not.toHaveBeenCalled();
	});
});
