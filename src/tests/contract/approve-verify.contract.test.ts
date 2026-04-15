import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	PATCH as approvePATCH,
	GET as approveGET
} from '../../routes/api/sightings/[id]/approve/+server';
import {
	PATCH as verifyPATCH,
	GET as verifyGET
} from '../../routes/api/sightings/[id]/verify/+server';
import { createEvent, mockAdminUser } from './helpers/createEvent';
import { asApiResponse } from './helpers/asApiResponse';

const { mockSelectLimit, mockUpdateWhere } = vi.hoisted(() => {
	const mockSelectLimit = vi
		.fn()
		.mockResolvedValue([{ id: 1, approvedAt: null, internalComment: null, verified: 0 }]);
	const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
	return { mockSelectLimit, mockUpdateWhere };
});

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: mockSelectLimit
				})
			})
		}),
		update: vi.fn().mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: mockUpdateWhere
			})
		})
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	sightings: {
		id: 'id',
		approvedAt: 'approvedAt',
		internalComment: 'internalComment',
		verified: 'verified'
	}
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ a, b }))
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

describe('Contract: PATCH /api/sightings/{id}/approve', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectLimit.mockResolvedValue([{ id: 1, approvedAt: null, internalComment: null }]);
		mockUpdateWhere.mockResolvedValue(undefined);
	});

	it('returns 200 approve=true and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/sightings/1/approve', {
			method: 'PATCH',
			params: { id: '1' },
			locals: { user: mockAdminUser },
			body: { approve: true }
		});
		const res = await approvePATCH(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});

	it('returns 200 approve=false and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/sightings/1/approve', {
			method: 'PATCH',
			params: { id: '1' },
			locals: { user: mockAdminUser },
			body: { approve: false }
		});
		const res = await approvePATCH(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});

	it('returns 200 with internalComment and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/sightings/1/approve', {
			method: 'PATCH',
			params: { id: '1' },
			locals: { user: mockAdminUser },
			body: { approve: true, internalComment: 'Koordinaten geprüft' }
		});
		const res = await approvePATCH(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
		expect((apiRes.body as any).internalComment).toBe('Koordinaten geprüft');
	});

	it('throws 400 when approve is not a boolean', async () => {
		const event = createEvent('/api/sightings/1/approve', {
			method: 'PATCH',
			params: { id: '1' },
			locals: { user: mockAdminUser },
			body: { approve: 'yes' }
		});

		try {
			await approvePATCH(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('throws 400 for invalid id', async () => {
		const event = createEvent('/api/sightings/abc/approve', {
			method: 'PATCH',
			params: { id: 'abc' },
			locals: { user: mockAdminUser },
			body: { approve: true }
		});

		try {
			await approvePATCH(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('throws 302 when unauthenticated', async () => {
		const { requireUserRole } = vi.mocked(await import('$lib/server/auth/auth'));
		requireUserRole.mockImplementationOnce(() => {
			throw { status: 302, location: '/api/auth/login' };
		});
		const event = createEvent('/api/sightings/1/approve', {
			method: 'PATCH',
			params: { id: '1' },
			locals: { user: mockAdminUser },
			body: { approve: true }
		});
		try {
			await approvePATCH(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(302);
		}
	});

	it('throws 403 when role is insufficient', async () => {
		const { requireUserRole } = vi.mocked(await import('$lib/server/auth/auth'));
		requireUserRole.mockImplementationOnce(() => {
			throw { status: 403, body: { message: 'Forbidden' } };
		});
		const event = createEvent('/api/sightings/1/approve', {
			method: 'PATCH',
			params: { id: '1' },
			locals: { user: mockAdminUser },
			body: { approve: true }
		});
		try {
			await approvePATCH(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(403);
		}
	});
});

describe('Contract: GET /api/sightings/{id}/approve', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectLimit.mockResolvedValue([{ id: 1, approvedAt: null, internalComment: null }]);
	});

	it('returns 200 and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/sightings/1/approve', {
			params: { id: '1' },
			locals: { user: mockAdminUser }
		});
		const res = await approveGET(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});

	it('throws 404 when sighting not found', async () => {
		mockSelectLimit.mockResolvedValueOnce([]);
		const event = createEvent('/api/sightings/999/approve', {
			params: { id: '999' },
			locals: { user: mockAdminUser }
		});

		try {
			await approveGET(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(404);
		}
	});

	it('throws 302 when unauthenticated', async () => {
		const { requireUserRole } = vi.mocked(await import('$lib/server/auth/auth'));
		requireUserRole.mockImplementationOnce(() => {
			throw { status: 302, location: '/api/auth/login' };
		});
		const event = createEvent('/api/sightings/1/approve', {
			params: { id: '1' },
			locals: { user: mockAdminUser }
		});
		try {
			await approveGET(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(302);
		}
	});

	it('throws 403 when role is insufficient', async () => {
		const { requireUserRole } = vi.mocked(await import('$lib/server/auth/auth'));
		requireUserRole.mockImplementationOnce(() => {
			throw { status: 403, body: { message: 'Forbidden' } };
		});
		const event = createEvent('/api/sightings/1/approve', {
			params: { id: '1' },
			locals: { user: mockAdminUser }
		});
		try {
			await approveGET(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(403);
		}
	});
});

describe('Contract: PATCH /api/sightings/{id}/verify', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectLimit.mockResolvedValue([{ id: 1, verified: 0 }]);
		mockUpdateWhere.mockResolvedValue(undefined);
	});

	it('returns 200 verified=1 and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/sightings/1/verify', {
			method: 'PATCH',
			params: { id: '1' },
			locals: { user: mockAdminUser },
			body: { verified: 1 }
		});
		const res = await verifyPATCH(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});

	it('returns 200 verified=0 and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/sightings/1/verify', {
			method: 'PATCH',
			params: { id: '1' },
			locals: { user: mockAdminUser },
			body: { verified: 0 }
		});
		const res = await verifyPATCH(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});

	it('throws 400 for invalid verified value', async () => {
		const event = createEvent('/api/sightings/1/verify', {
			method: 'PATCH',
			params: { id: '1' },
			locals: { user: mockAdminUser },
			body: { verified: 2 }
		});

		try {
			await verifyPATCH(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('throws 400 for invalid id', async () => {
		const event = createEvent('/api/sightings/abc/verify', {
			method: 'PATCH',
			params: { id: 'abc' },
			locals: { user: mockAdminUser },
			body: { verified: 1 }
		});

		try {
			await verifyPATCH(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('throws 302 when unauthenticated', async () => {
		const { requireUserRole } = vi.mocked(await import('$lib/server/auth/auth'));
		requireUserRole.mockImplementationOnce(() => {
			throw { status: 302, location: '/api/auth/login' };
		});
		const event = createEvent('/api/sightings/1/verify', {
			method: 'PATCH',
			params: { id: '1' },
			locals: { user: mockAdminUser },
			body: { verified: 1 }
		});
		try {
			await verifyPATCH(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(302);
		}
	});

	it('throws 403 when role is insufficient', async () => {
		const { requireUserRole } = vi.mocked(await import('$lib/server/auth/auth'));
		requireUserRole.mockImplementationOnce(() => {
			throw { status: 403, body: { message: 'Forbidden' } };
		});
		const event = createEvent('/api/sightings/1/verify', {
			method: 'PATCH',
			params: { id: '1' },
			locals: { user: mockAdminUser },
			body: { verified: 1 }
		});
		try {
			await verifyPATCH(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(403);
		}
	});
});

describe('Contract: GET /api/sightings/{id}/verify', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectLimit.mockResolvedValue([{ id: 1, verified: 1 }]);
	});

	it('returns 200 and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/sightings/1/verify', {
			params: { id: '1' },
			locals: { user: mockAdminUser }
		});
		const res = await verifyGET(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});

	it('throws 404 when sighting not found', async () => {
		mockSelectLimit.mockResolvedValueOnce([]);
		const event = createEvent('/api/sightings/999/verify', {
			params: { id: '999' },
			locals: { user: mockAdminUser }
		});

		try {
			await verifyGET(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(404);
		}
	});

	it('throws 302 when unauthenticated', async () => {
		const { requireUserRole } = vi.mocked(await import('$lib/server/auth/auth'));
		requireUserRole.mockImplementationOnce(() => {
			throw { status: 302, location: '/api/auth/login' };
		});
		const event = createEvent('/api/sightings/1/verify', {
			params: { id: '1' },
			locals: { user: mockAdminUser }
		});
		try {
			await verifyGET(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(302);
		}
	});

	it('throws 403 when role is insufficient', async () => {
		const { requireUserRole } = vi.mocked(await import('$lib/server/auth/auth'));
		requireUserRole.mockImplementationOnce(() => {
			throw { status: 403, body: { message: 'Forbidden' } };
		});
		const event = createEvent('/api/sightings/1/verify', {
			params: { id: '1' },
			locals: { user: mockAdminUser }
		});
		try {
			await verifyGET(event);
			expect.fail('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(403);
		}
	});
});
