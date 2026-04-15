import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH, GET } from './+server';

const { mockWhere, mockSet, mockUpdate, mockLimit } = vi.hoisted(() => {
	const mockWhere = vi.fn().mockResolvedValue(undefined);
	const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
	const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
	const mockLimit = vi.fn().mockResolvedValue([{ id: 1, approvedAt: null, internalComment: null }]);
	return { mockWhere, mockSet, mockUpdate, mockLimit };
});

vi.mock('$lib/server/audit/auditService', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined)
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
	sightings: { id: 'id', approvedAt: 'approvedAt', internalComment: 'internalComment' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ a, b }))
}));

const createMockEvent = (id: string, body: Record<string, unknown>) => ({
	params: { id },
	locals: { user: { email: 'admin@test.com', roles: ['admin'] } },
	url: new URL(`http://localhost/api/sightings/${id}/approve`),
	request: {
		json: () => Promise.resolve(body),
		headers: { get: () => null }
	} as unknown as Request
});

describe('/api/sightings/[id]/approve PATCH endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWhere.mockResolvedValue(undefined);
		mockSet.mockReturnValue({ where: mockWhere });
		mockUpdate.mockReturnValue({ set: mockSet });
		mockLimit.mockResolvedValue([{ id: 1, approvedAt: null, internalComment: null }]);
	});

	it('übergibt Date-Objekt an Drizzle (nicht ISO-String)', async () => {
		const event = createMockEvent('1', { approve: true });
		await PATCH(event as Parameters<typeof PATCH>[0]);

		expect(mockSet).toHaveBeenCalledOnce();
		const updateArg = mockSet.mock.calls[0]?.[0];
		expect(updateArg.approvedAt).toBeInstanceOf(Date);
		expect(typeof updateArg.approvedAt).not.toBe('string');
	});

	it('setzt approvedAt auf null bei approve=false', async () => {
		const event = createMockEvent('1', { approve: false });
		await PATCH(event as Parameters<typeof PATCH>[0]);

		const updateArg = mockSet.mock.calls[0]?.[0];
		expect(updateArg.approvedAt).toBeNull();
	});

	it('gibt erfolgreiche Antwort zurück', async () => {
		const event = createMockEvent('1', { approve: true });
		const response = await PATCH(event as Parameters<typeof PATCH>[0]);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.approved).toBe(true);
	});

	it('lehnt fehlenden approve-Parameter ab', async () => {
		const event = createMockEvent('1', { approve: 'yes' });
		try {
			await PATCH(event as Parameters<typeof PATCH>[0]);
			expect.fail('Sollte einen Fehler werfen');
		} catch (e: unknown) {
			expect((e as { status: number }).status).toBe(400);
		}
	});
});

describe('/api/sightings/[id]/approve GET endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockLimit.mockResolvedValue([{ id: 1, approvedAt: null, internalComment: null }]);
	});

	it('gibt Genehmigungsstatus zurück', async () => {
		const event = createMockEvent('1', {});
		const response = await GET(event as Parameters<typeof GET>[0]);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.id).toBe(1);
		expect(body.approved).toBe(false);
	});

	it('wirft 404 wenn Sichtung nicht existiert — wird nicht als 500 verschluckt', async () => {
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
