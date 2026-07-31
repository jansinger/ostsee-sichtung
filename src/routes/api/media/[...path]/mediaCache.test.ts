import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockIsAdminUser, mockSelect, mockGetStorageProvider, mockEnforceRateLimit } = vi.hoisted(
	() => ({
		mockIsAdminUser: vi.fn().mockReturnValue(false),
		mockSelect: vi.fn(),
		mockGetStorageProvider: vi.fn().mockReturnValue({
			getFileContent: vi.fn().mockResolvedValue(Buffer.from('binary-content'))
		}),
		mockEnforceRateLimit: vi.fn().mockReturnValue({ remaining: 10, resetTime: Date.now() + 1000 })
	})
);

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

vi.mock('$lib/server/storage/factory', () => ({
	getStorageProvider: mockGetStorageProvider
}));

vi.mock('$lib/server/auth/auth', () => ({
	isAdminUser: mockIsAdminUser
}));

vi.mock('$lib/server/db', () => ({
	db: { select: mockSelect }
}));

vi.mock('$lib/server/db/schema', () => ({
	sightingFiles: {
		sightingId: {},
		filePath: {},
		id: {},
		fileName: {},
		mimeType: {},
		size: {},
		originalName: {}
	},
	sightings: { id: {}, approvedAt: {}, verified: {} }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

vi.mock('$lib/server/middleware/rateLimit', () => ({
	RATE_LIMITS: {
		MEDIA_ACCESS_ANONYMOUS: { windowMs: 60000, maxRequests: 30 },
		MEDIA_ACCESS_AUTHENTICATED: { windowMs: 60000, maxRequests: 100 }
	},
	enforceRateLimit: mockEnforceRateLimit,
	createRateLimitIdentifier: vi.fn().mockReturnValue('ip:10.0.0.1'),
	buildRateLimitHeaders: vi.fn().mockReturnValue({})
}));

vi.mock('$lib/server/utils/getClientIp', () => ({
	getClientIp: vi.fn().mockReturnValue('10.0.0.1')
}));

import { GET } from './+server';

function mockDbResult(rows: Array<Record<string, unknown>>) {
	const limit = vi.fn().mockResolvedValue(rows);
	const where = vi.fn().mockReturnValue({ limit });
	const innerJoin = vi.fn().mockReturnValue({ where });
	const from = vi.fn().mockReturnValue({ innerJoin });
	mockSelect.mockReturnValue({ from });
}

function makeEvent(path: string, user: unknown = null) {
	return {
		params: { path },
		url: new URL(`http://localhost/api/media/${path}`),
		request: new Request(`http://localhost/api/media/${path}`),
		locals: { user },
		getClientAddress: () => '10.0.0.1'
	};
}

const baseFileRow = {
	id: 1,
	sightingId: 5,
	fileName: 'file.jpg',
	filePath: 'ref/file.jpg',
	mimeType: 'image/jpeg',
	size: 123,
	originalName: 'file.jpg',
	verified: 0
};

describe('GET /api/media/[...path] — Cache-Control', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdminUser.mockReturnValue(false);
		mockEnforceRateLimit.mockReturnValue({ remaining: 10, resetTime: Date.now() + 1000 });
		mockGetStorageProvider.mockReturnValue({
			getFileContent: vi.fn().mockResolvedValue(Buffer.from('binary-content'))
		});
	});

	it('markiert freigegebene Medien als öffentlich cachebar', async () => {
		mockDbResult([{ ...baseFileRow, approvedAt: new Date() }]);

		const res = await GET(makeEvent('ref/approved.jpg') as never);

		expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
	});

	it('verbietet geteilten Caches das Vorhalten unfreigegebener Admin-Medien', async () => {
		mockIsAdminUser.mockReturnValue(true);
		mockDbResult([{ ...baseFileRow, approvedAt: null }]);

		const res = await GET(
			makeEvent('ref/unapproved.jpg', { sub: 'auth0|admin', roles: ['admin'] }) as never
		);

		const cacheControl = res.headers.get('Cache-Control') ?? '';
		expect(cacheControl).not.toContain('public');
		expect(cacheControl).toMatch(/\bprivate\b|\bno-store\b/);
	});
});
