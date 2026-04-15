import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH, GET } from './+server';

const { mockWhere, mockSet, mockUpdate, mockLimit } = vi.hoisted(() => {
	const mockWhere = vi.fn().mockResolvedValue(undefined);
	const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
	const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
	const mockLimit = vi.fn().mockResolvedValue([{ id: 1, verified: 0 }]);
	return { mockWhere, mockSet, mockUpdate, mockLimit };
});

vi.mock('$lib/server/audit/auditService', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined)
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

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: mockLimit
				})
			})
		}),
		update: mockUpdate
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	sightings: { id: 'id', verified: 'verified' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ a, b }))
}));

const createMockEvent = (
	id: string,
	body: Record<string, unknown>,
	options?: { userEmail?: string; ip?: string }
) => ({
	params: { id },
	locals: {
		user: { email: options?.userEmail ?? 'admin@test.com', roles: ['admin'] }
	},
	url: new URL(`http://localhost/api/sightings/${id}/verify`),
	request: {
		json: () => Promise.resolve(body),
		headers: {
			get: (name: string) => {
				if (name === 'x-forwarded-for' && options?.ip) return options.ip;
				return null;
			}
		}
	} as unknown as Request
});

describe('/api/sightings/[id]/verify PATCH endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWhere.mockResolvedValue(undefined);
		mockSet.mockReturnValue({ where: mockWhere });
		mockUpdate.mockReturnValue({ set: mockSet });
		mockLimit.mockResolvedValue([{ id: 1, verified: 0 }]);
	});

	it('gibt erfolgreiche Antwort zurück bei verified=1', async () => {
		const event = createMockEvent('1', { verified: 1 });
		const response = await PATCH(event as Parameters<typeof PATCH>[0]);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.verified).toBe(1);
	});

	it('gibt erfolgreiche Antwort zurück bei verified=0', async () => {
		const event = createMockEvent('1', { verified: 0 });
		const response = await PATCH(event as Parameters<typeof PATCH>[0]);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.verified).toBe(0);
	});

	it('lehnt ungültigen verified-Wert ab', async () => {
		const event = createMockEvent('1', { verified: 2 });
		try {
			await PATCH(event as Parameters<typeof PATCH>[0]);
			expect.fail('Sollte einen Fehler werfen');
		} catch (e: unknown) {
			expect((e as { status: number }).status).toBe(400);
		}
	});

	it('wirft 404 wenn Sichtung nicht existiert', async () => {
		mockLimit.mockResolvedValueOnce([]);
		const event = createMockEvent('99', { verified: 1 });

		try {
			await PATCH(event as Parameters<typeof PATCH>[0]);
			expect.fail('Sollte 404 werfen');
		} catch (e: unknown) {
			expect((e as { status: number }).status).toBe(404);
		}
	});

	it('ruft logAuditEvent mit action sighting.verify und resourceType sighting auf', async () => {
		const { logAuditEvent } = await import('$lib/server/audit/auditService');
		const event = createMockEvent('42', { verified: 1 });

		await PATCH(event as Parameters<typeof PATCH>[0]);

		expect(logAuditEvent).toHaveBeenCalledOnce();
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'sighting.verify',
				resourceType: 'sighting',
				resourceId: '42'
			})
		);
	});

	it('übergibt userEmail an logAuditEvent wenn vorhanden', async () => {
		const { logAuditEvent } = await import('$lib/server/audit/auditService');
		const event = createMockEvent('5', { verified: 1 }, { userEmail: 'pruefer@test.com' });

		await PATCH(event as Parameters<typeof PATCH>[0]);

		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				userEmail: 'pruefer@test.com'
			})
		);
	});

	it('übergibt ipAddress an logAuditEvent wenn x-forwarded-for vorhanden', async () => {
		const { logAuditEvent } = await import('$lib/server/audit/auditService');
		const event = createMockEvent('7', { verified: 0 }, { ip: '10.0.0.1' });

		await PATCH(event as Parameters<typeof PATCH>[0]);

		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				ipAddress: '10.0.0.1'
			})
		);
	});

	it('übergibt verified-Wert in details an logAuditEvent', async () => {
		const { logAuditEvent } = await import('$lib/server/audit/auditService');
		const event = createMockEvent('3', { verified: 1 });

		await PATCH(event as Parameters<typeof PATCH>[0]);

		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				details: expect.objectContaining({ verified: 1 })
			})
		);
	});
});

describe('/api/sightings/[id]/verify GET endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockLimit.mockResolvedValue([{ id: 1, verified: 1 }]);
	});

	it('gibt Verifizierungsstatus zurück', async () => {
		const event = createMockEvent('1', {});
		const response = await GET(event as Parameters<typeof GET>[0]);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.id).toBe(1);
		expect(body.verified).toBe(1);
	});

	it('wirft 404 wenn Sichtung nicht existiert', async () => {
		mockLimit.mockResolvedValueOnce([]);
		const event = createMockEvent('99', {});

		try {
			await GET(event as Parameters<typeof GET>[0]);
			expect.fail('Sollte 404 werfen');
		} catch (e: unknown) {
			expect((e as { status: number }).status).toBe(404);
		}
	});
});
