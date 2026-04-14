import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as testEmailPOST } from '../../routes/api/admin/test-email/+server';
import { POST as weatherRefreshPOST } from '../../routes/api/admin/weather/[id]/refresh/+server';
import { createEvent, mockAdminUser } from './helpers/createEvent';
import { asApiResponse } from './helpers/asApiResponse';

vi.mock('$lib/server/services/emailService', () => ({
	EmailService: {
		sendTestEmail: vi.fn().mockResolvedValue(true),
		sendNewSightingNotification: vi.fn().mockResolvedValue(true)
	}
}));

vi.mock('$lib/server/db/sightingRepository', () => ({
	getSightingById: vi.fn(),
	updateSightingWeatherData: vi.fn().mockResolvedValue(true)
}));

vi.mock('$lib/server/services/weatherRefreshService', () => ({
	fetchWeatherData: vi.fn()
}));

vi.mock('$lib/server/auth/auth', () => ({
	requireUserRole: vi.fn()
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

const { getSightingById } = await import('$lib/server/db/sightingRepository');
const { fetchWeatherData } = await import('$lib/server/services/weatherRefreshService');

const mockWeatherData = {
	data_type: 'historical',
	provider: 'open-meteo',
	fetched_at: new Date().toISOString(),
	temperature: 18.5,
	windSpeed: 12.3
};

const mockSighting = {
	id: 42,
	latitude: '54.5',
	longitude: '13.5',
	sightingDate: new Date('2024-06-15T14:30:00Z')
};

describe('Contract: POST /api/admin/test-email', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 for testType=simple and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/admin/test-email', {
			method: 'POST',
			locals: { user: mockAdminUser },
			body: { testType: 'simple', recipient: 'test@example.com' }
		});
		const res = await testEmailPOST(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});

	it('returns 400 when sightingId is missing for testType=sighting', async () => {
		const event = createEvent('/api/admin/test-email', {
			method: 'POST',
			locals: { user: mockAdminUser },
			body: { testType: 'sighting' }
		});
		const res = await testEmailPOST(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(400);
		expect(apiRes).toSatisfyApiSpec();
	});
});

describe('Contract: POST /api/admin/weather/{id}/refresh', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getSightingById).mockResolvedValue(mockSighting as any);
		vi.mocked(fetchWeatherData).mockResolvedValue(mockWeatherData as any);
	});

	it('returns 200 and satisfies the OpenAPI spec', async () => {
		const event = createEvent('/api/admin/weather/42/refresh', {
			method: 'POST',
			params: { id: '42' },
			locals: { user: mockAdminUser }
		});
		const res = await weatherRefreshPOST(event);
		const apiRes = await asApiResponse(res, event);

		expect(apiRes.status).toBe(200);
		expect(apiRes).toSatisfyApiSpec();
	});

	it('returns 400 for invalid id', async () => {
		const event = createEvent('/api/admin/weather/abc/refresh', {
			method: 'POST',
			params: { id: 'abc' },
			locals: { user: mockAdminUser }
		});
		const res = await weatherRefreshPOST(event);

		expect(res.status).toBe(400);
	});

	it('returns 404 when sighting not found', async () => {
		vi.mocked(getSightingById).mockResolvedValueOnce(null);
		const event = createEvent('/api/admin/weather/999/refresh', {
			method: 'POST',
			params: { id: '999' },
			locals: { user: mockAdminUser }
		});
		const res = await weatherRefreshPOST(event);

		expect(res.status).toBe(404);
	});
});
