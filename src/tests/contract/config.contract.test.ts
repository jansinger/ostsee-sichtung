import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '../../routes/api/config/+server';
import { GET as publicGET } from '../../routes/api/config/public/+server';
import { createEvent, mockAdminUser } from './helpers/createEvent';
import { asApiResponse } from './helpers/asApiResponse';

const mockConfigs = [
	{ key: 'display.maxSightings', value: 100, description: 'Max sightings', category: 'display' }
];

vi.mock('$lib/server/db/configRepository', () => ({
	ConfigRepository: {
		getAll: vi.fn().mockResolvedValue([]),
		getByCategory: vi.fn().mockResolvedValue([]),
		upsert: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
		clearCache: vi.fn()
	}
}));

vi.mock('$lib/server/config/accessControl', () => ({
	filterConfigsByUserAccess: vi.fn((configs: unknown[]) => configs),
	canUserAccessConfigKey: vi.fn().mockReturnValue(true)
}));

vi.mock('$lib/services/configService', () => ({
	ServerConfigService: {
		get: vi.fn().mockResolvedValue(null),
		getString: vi.fn().mockResolvedValue(null),
		isMaintenanceModeEnabled: vi.fn().mockResolvedValue(false)
	},
	DEFAULT_VALUES: {}
}));

vi.mock('$lib/server/auth/auth', () => ({
	requireUserRole: vi.fn()
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

describe('Contract: GET /api/config', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { ConfigRepository } = vi.mocked(await import('$lib/server/db/configRepository'));
		(ConfigRepository.getAll as any).mockResolvedValue([...mockConfigs]);
		const { filterConfigsByUserAccess } = vi.mocked(
			await import('$lib/server/config/accessControl')
		);
		(filterConfigsByUserAccess as any).mockImplementation((configs: unknown[]) => configs);
	});

	it('returns 200 and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/config', {
			locals: { user: mockAdminUser }
		});
		const res = await GET(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});
});

describe('Contract: PUT /api/config', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { canUserAccessConfigKey } = vi.mocked(await import('$lib/server/config/accessControl'));
		canUserAccessConfigKey.mockReturnValue(true);
	});

	it('returns 200 and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/config', {
			method: 'PUT',
			locals: { user: mockAdminUser },
			body: { key: 'display.maxSightings', value: 50, category: 'display' }
		});
		const res = await PUT(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});

	it('returns 400 when key is missing', async () => {
		const event = createEvent('/api/config', {
			method: 'PUT',
			locals: { user: mockAdminUser },
			body: { value: 50, category: 'display' }
		});
		const res = await PUT(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(400);
		expect(apiRes).toSatisfyApiSpec();
	});
});

describe('Contract: DELETE /api/config', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { canUserAccessConfigKey } = vi.mocked(await import('$lib/server/config/accessControl'));
		canUserAccessConfigKey.mockReturnValue(true);
	});

	it('returns 200 and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/config', {
			method: 'DELETE',
			searchParams: { key: 'display.maxSightings' },
			locals: { user: mockAdminUser }
		});
		const res = await DELETE(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});
});

describe('Contract: GET /api/config/public', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/config/public');
		const res = await publicGET(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});
});
