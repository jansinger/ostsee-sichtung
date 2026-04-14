import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../routes/api/maintenance-status/+server';
import { createEvent, mockAdminUser } from './helpers/createEvent';
import { asApiResponse } from './helpers/asApiResponse';

vi.mock('$lib/services/configService', () => ({
	ServerConfigService: {
		isMaintenanceModeEnabled: vi.fn().mockResolvedValue(false),
		getString: vi.fn().mockResolvedValue('Wir sind gleich wieder da.')
	}
}));

vi.mock('$lib/server/auth/auth', () => ({
	requireUserRole: vi.fn()
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

const { ServerConfigService } = await import('$lib/services/configService');

describe('Contract: GET /api/maintenance-status', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(ServerConfigService.isMaintenanceModeEnabled).mockResolvedValue(false);
		vi.mocked(ServerConfigService.getString).mockResolvedValue('Wir sind gleich wieder da.');
	});

	it('returns 200 and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/maintenance-status', {
			locals: { user: mockAdminUser }
		});
		const res = await GET(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});

	it('returns enabled=true when maintenance mode is on', async () => {
		vi.mocked(ServerConfigService.isMaintenanceModeEnabled).mockResolvedValue(true);

		const event = createEvent('/api/maintenance-status', {
			locals: { user: mockAdminUser }
		});
		const res = await GET(event);
		const body = await res.json();

		expect(body.enabled).toBe(true);
		expect(body.timestamp).toBeDefined();
	});
});
