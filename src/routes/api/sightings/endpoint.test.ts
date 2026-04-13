import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import { saveSighting } from '$lib/server/db/sightingRepository';

// Mock dependencies
vi.mock('$lib/server/db/sightingRepository', () => ({
	saveSighting: vi.fn().mockResolvedValue({ id: 123 })
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

// Mock EmailService to prevent sending real emails during tests
vi.mock('$lib/server/services/emailService', () => ({
	EmailService: {
		sendNewSightingNotification: vi.fn().mockResolvedValue(true),
		sendTestEmail: vi.fn().mockResolvedValue(true),
		initialize: vi.fn().mockResolvedValue(undefined),
		clearTemplateCache: vi.fn()
	}
}));

// Mock ServerConfigService to prevent DB access for email config
vi.mock('$lib/services/configService', () => ({
	ServerConfigService: {
		getEmailConfig: vi.fn().mockResolvedValue({
			enabled: false,
			recipient: '',
			sender: 'noreply@test.com',
			senderName: 'Test'
		})
	}
}));

const mockedSaveSighting = vi.mocked(saveSighting);

describe('/api/sightings POST endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedSaveSighting.mockResolvedValue({ id: 123 });
	});

	const createMockRequestEvent = (body: unknown) => {
		return {
			request: {
				json: async () => body,
				headers: {
					get: vi.fn((name: string) => {
						const headerMap: Record<string, string> = {
							'x-forwarded-for': '127.0.0.1',
							'x-real-ip': '127.0.0.1',
							'user-agent': 'vitest-test-agent'
						};
						return headerMap[name] || null;
					})
				}
			} as unknown as Request,
			cookies: {} as unknown as Parameters<typeof POST>[0]['cookies'],
			fetch: fetch,
			getClientAddress: () => '127.0.0.1',
			locals: {},
			params: {},
			platform: undefined,
			route: { id: '/api/sightings' },
			setHeaders: vi.fn(),
			url: new URL('http://localhost/api/sightings'),
			isDataRequest: false,
			isSubRequest: false,
			isRemoteRequest: false
		} as unknown as Parameters<typeof POST>[0];
	};

	it('should reject requests with admin fields', async () => {
		const maliciousRequest = createMockRequestEvent({
			firstName: 'John',
			lastName: 'Doe',
			email: 'john@example.com',
			species: 0,
			totalCount: 1,
			verified: true, // Admin field
			internalComment: 'This should not be allowed', // Admin field
			privacyConsent: true
		});

		const response = await POST(maliciousRequest);
		const result = await response.json();

		expect(response.status).toBe(403);
		expect(result.success).toBe(false);
		expect(result.code).toBe('FORBIDDEN_FIELDS');
		expect(result.forbiddenFields).toContain('verified');
		expect(result.forbiddenFields).toContain('internalComment');
	});

	it('should reject requests with unknown fields', async () => {
		const requestWithUnknownFields = createMockRequestEvent({
			firstName: 'John',
			lastName: 'Doe',
			email: 'john@example.com',
			species: 0,
			totalCount: 1,
			unknownField: 'should not be allowed',
			anotherBadField: 123,
			privacyConsent: true
		});

		const response = await POST(requestWithUnknownFields);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.code).toBe('INVALID_FIELDS');
		expect(result.rejectedFields).toContain('unknownField');
		expect(result.rejectedFields).toContain('anotherBadField');
	});

	it('should accept valid sighting data', async () => {
		const validRequest = createMockRequestEvent({
			referenceId: 'test-ref-123',
			firstName: 'John',
			lastName: 'Doe',
			email: 'john@example.com',
			species: 0,
			totalCount: 1,
			sightingDate: '2024-01-15',
			hasPosition: true,
			latitude: 54.5,
			longitude: 13.5,
			privacyConsent: true,
			entryChannel: 0,
			boatDrive: 1,
			sightingFrom: 1,
			distance: 1,
			isDead: false
		});

		const response = await POST(validRequest);
		const result = await response.json();

		expect(response.status).toBe(201);
		expect(result.success).toBe(true);
		expect(result.id).toBe(123);
	}, 15000);

	it('should handle validation errors properly', async () => {
		const invalidRequest = createMockRequestEvent({
			// Missing required fields like firstName, lastName, email
			species: 0,
			totalCount: 1,
			privacyConsent: true
		});

		const response = await POST(invalidRequest);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.code).toBe('VALIDATION_ERROR');
		expect(result.errors).toBeDefined();
	});

	it('should reject requests with honeypot field (spam protection)', async () => {
		const spamRequest = createMockRequestEvent({
			firstName: 'Spammer',
			lastName: 'Bot',
			email: 'spam@example.com',
			species: 0,
			totalCount: 1,
			privacyConsent: true,
			_honeypot: 'i-am-a-bot' // Honeypot field filled = spam
		});

		const response = await POST(spamRequest);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
	});

	it('should reject non-object request bodies', async () => {
		const invalidRequest = createMockRequestEvent('not an object');

		const response = await POST(invalidRequest);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.code).toBe('INVALID_FIELDS');
	});

	it('should call saveSighting on successful submission', async () => {
		const validRequest = createMockRequestEvent({
			referenceId: 'save-ref-123',
			firstName: 'Test',
			lastName: 'User',
			email: 'test@example.com',
			species: 0,
			totalCount: 1,
			sightingDate: '2024-01-15',
			hasPosition: true,
			latitude: 54.5,
			longitude: 13.5,
			privacyConsent: true,
			entryChannel: 0,
			boatDrive: 1,
			sightingFrom: 1,
			distance: 1,
			isDead: false
		});

		const response = await POST(validRequest);
		expect(response.status).toBe(201);

		// saveSighting should have been called exactly once
		expect(saveSighting).toHaveBeenCalledOnce();
	}, 15000);

	it('should accept requests with valid weather data', async () => {
		const validWeatherData = {
			provider: 'open-meteo',
			fetched_at: new Date().toISOString(),
			api_version: '1.0',
			data_type: 'historical',
			location: { latitude: 54.5, longitude: 13.5 },
			observation_time: '2024-01-15T12:00:00Z',
			raw_data: {
				temperature_2m: 8.5,
				wind_speed_10m: 15,
				wind_direction_10m: 270,
				weather_code: 3,
				visibility: 10000
			},
			processed: {
				beaufort: 4,
				seaState: 3,
				visibilityCategory: 'clear'
			},
			quality: {
				confidence: 0.85,
				source: 'historical'
			}
		};

		const requestWithWeather = createMockRequestEvent({
			referenceId: 'weather-ref-123',
			firstName: 'Test',
			lastName: 'User',
			email: 'test@example.com',
			species: 0,
			totalCount: 1,
			sightingDate: '2024-01-15',
			hasPosition: true,
			latitude: 54.5,
			longitude: 13.5,
			privacyConsent: true,
			entryChannel: 0,
			boatDrive: 1,
			sightingFrom: 1,
			distance: 1,
			isDead: false,
			weatherData: validWeatherData
		});

		const response = await POST(requestWithWeather);
		expect(response.status).toBe(201);

		// saveSighting should have been called with weather data as second argument
		expect(saveSighting).toHaveBeenCalledOnce();
		const weatherArg = vi.mocked(saveSighting).mock.calls[0]?.[1];
		expect(weatherArg).toBeDefined();
		expect(weatherArg).toHaveProperty('provider', 'open-meteo');
		expect(weatherArg).toHaveProperty('data_type', 'historical');
		expect(weatherArg).toHaveProperty('quality.confidence', 0.85);
	}, 15000);

	it('should include referenceId in valid submission', async () => {
		const validRequest = createMockRequestEvent({
			referenceId: 'ref-test-456',
			firstName: 'Test',
			lastName: 'User',
			email: 'test@example.com',
			species: 0,
			totalCount: 1,
			sightingDate: '2024-01-15',
			hasPosition: true,
			latitude: 54.5,
			longitude: 13.5,
			privacyConsent: true,
			entryChannel: 0,
			boatDrive: 1,
			sightingFrom: 1,
			distance: 1,
			isDead: false
		});

		await POST(validRequest);

		// saveSighting should be called with data including referenceId
		expect(saveSighting).toHaveBeenCalled();
		const formData = vi.mocked(saveSighting).mock.calls[0]?.[0];
		expect(formData).toHaveProperty('referenceId', 'ref-test-456');
	}, 15000);
});
