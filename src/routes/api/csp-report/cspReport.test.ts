import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLoggerWarn, mockEnforceRateLimit } = vi.hoisted(() => ({
	mockLoggerWarn: vi.fn(),
	mockEnforceRateLimit: vi.fn().mockReturnValue({ remaining: 10, resetTime: Date.now() + 1000 })
}));

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: mockLoggerWarn, error: vi.fn() })
}));

vi.mock('$lib/server/middleware/rateLimit', () => ({
	enforceRateLimit: mockEnforceRateLimit,
	createRateLimitIdentifier: vi.fn().mockReturnValue('ip:10.0.0.1')
}));

import { POST } from './+server';

function makeEvent(body: unknown, headers: Record<string, string> = {}) {
	const payload = JSON.stringify(body);
	return {
		request: new Request('http://localhost/api/csp-report', {
			method: 'POST',
			headers: { 'content-type': 'application/json', ...headers },
			body: payload
		}),
		getClientAddress: () => '10.0.0.1'
	};
}

describe('POST /api/csp-report', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEnforceRateLimit.mockReturnValue({ remaining: 10, resetTime: Date.now() + 1000 });
	});

	it('erzwingt Rate-Limiting', async () => {
		await POST(makeEvent({ 'csp-report': {} }) as never);
		expect(mockEnforceRateLimit).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(Object),
			'csp_report'
		);
	});

	it('loggt nur bekannte CSP-Felder, keinen fullReport', async () => {
		const report = {
			'csp-report': {
				'blocked-uri': 'https://evil.example/script.js',
				'violated-directive': 'script-src',
				'document-uri': 'https://app.example/page',
				'source-file': 'https://app.example/inline',
				'line-number': 42,
				'secret-field': 'sollte-nicht-geloggt-werden'
			}
		};

		const res = await POST(makeEvent(report) as never);
		expect(res.status).toBe(204);

		expect(mockLoggerWarn).toHaveBeenCalledOnce();
		const [logged] = mockLoggerWarn.mock.calls[0] as [Record<string, unknown>, string];
		expect(logged).toMatchObject({
			blockedUri: 'https://evil.example/script.js',
			violatedDirective: 'script-src',
			documentUri: 'https://app.example/page',
			sourceFile: 'https://app.example/inline',
			lineNumber: 42
		});
		expect(logged).not.toHaveProperty('fullReport');
		expect(logged).not.toHaveProperty('secret-field');
	});

	it('verwirft übergroße Payloads mit 204 ohne zu loggen', async () => {
		const res = await POST(
			makeEvent({ 'csp-report': {} }, { 'content-length': String(9 * 1024) }) as never
		);
		expect(res.status).toBe(204);
		// Nur die "zu groß"-Warnung, kein CSP-Verstoß-Log mit Feldern
		const cspViolationLogs = mockLoggerWarn.mock.calls.filter(
			(call) => call[1] === 'CSP-Verstoß erkannt'
		);
		expect(cspViolationLogs).toHaveLength(0);
	});

	it('gibt 429 zurück, wenn das Rate-Limit greift', async () => {
		const { error } = await import('@sveltejs/kit');
		mockEnforceRateLimit.mockImplementation(() => {
			throw error(429, 'Rate limit exceeded');
		});

		await expect(POST(makeEvent({ 'csp-report': {} }) as never)).rejects.toMatchObject({
			status: 429
		});
	});
});
