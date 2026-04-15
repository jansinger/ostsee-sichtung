import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => ({
	db: {
		insert: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	auditLogs: {}
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

import { logAuditEvent } from './auditService';
import { db } from '$lib/server/db';

const mockInsert = vi.mocked(db.insert);

describe('logAuditEvent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		const mockValues = vi.fn().mockResolvedValue(undefined);
		mockInsert.mockReturnValue({ values: mockValues } as unknown as ReturnType<typeof db.insert>);
	});

	it('schreibt ein Audit-Event mit allen Pflichtfeldern in die DB', async () => {
		await logAuditEvent({
			action: 'sighting.approve',
			resourceType: 'sighting',
			resourceId: '42',
			userEmail: 'admin@example.com',
			ipAddress: '127.0.0.1'
		});

		expect(mockInsert).toHaveBeenCalledOnce();
		const valuesCall = mockInsert.mock.results[0]!.value.values;
		expect(valuesCall).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'sighting.approve',
				resourceType: 'sighting',
				resourceId: '42',
				userEmail: 'admin@example.com',
				ipAddress: '127.0.0.1',
				status: 'success'
			})
		);
	});

	it('setzt status auf "success" als Default', async () => {
		await logAuditEvent({
			action: 'sighting.delete',
			resourceType: 'sighting'
		});

		const valuesCall = mockInsert.mock.results[0]!.value.values;
		expect(valuesCall).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'success' })
		);
	});

	it('speichert optionale details als jsonb', async () => {
		await logAuditEvent({
			action: 'sighting.edit',
			resourceType: 'sighting',
			resourceId: '7',
			details: { changedFields: ['species', 'totalCount'] }
		});

		const valuesCall = mockInsert.mock.results[0]!.value.values;
		expect(valuesCall).toHaveBeenCalledWith(
			expect.objectContaining({
				details: { changedFields: ['species', 'totalCount'] }
			})
		);
	});

	it('wirft NICHT wenn die DB einen Fehler wirft', async () => {
		mockInsert.mockReturnValue({
			values: vi.fn().mockRejectedValue(new Error('DB connection lost'))
		} as unknown as ReturnType<typeof db.insert>);

		await expect(
			logAuditEvent({ action: 'sighting.approve', resourceType: 'sighting' })
		).resolves.toBeUndefined();
	});

	it('wirft NICHT wenn db.insert selbst eine Exception wirft', async () => {
		mockInsert.mockImplementation(() => {
			throw new Error('Database not configured');
		});

		await expect(
			logAuditEvent({ action: 'file.delete', resourceType: 'file' })
		).resolves.toBeUndefined();
	});
});
