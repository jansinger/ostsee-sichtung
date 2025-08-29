import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';

// Mock dependencies
vi.mock('$lib/server/db/sightingRepository', () => ({
	saveSighting: vi.fn().mockResolvedValue({ id: 'test-id-123' })
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
		sendTestSightingEmail: vi.fn().mockResolvedValue(true),
		initialize: vi.fn().mockResolvedValue(undefined),
		clearTemplateCache: vi.fn()
	}
}));

describe('/api/sightings POST endpoint', () => {
	const createMockRequestEvent = (body: unknown) => {
		return {
			request: {
				json: async () => body
			} as Request,
			cookies: {} as any,
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
		} as any; // Use any to bypass strict type checking for test mocks
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
		expect(result.id).toBe('test-id-123');
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

	it('should reject non-object request bodies', async () => {
		const invalidRequest = createMockRequestEvent('not an object');

		const response = await POST(invalidRequest);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.code).toBe('INVALID_FIELDS');
	});
});