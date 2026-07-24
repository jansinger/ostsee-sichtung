import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
	mockLogAuditEvent,
	mockGetToken,
	mockVerifyToken,
	mockGetTokenClaims,
	mockSetAuthCookie,
	mockGetPKCEVerifier,
	mockLoggerWarn
} = vi.hoisted(() => ({
	mockLogAuditEvent: vi.fn().mockResolvedValue(undefined),
	mockGetToken: vi.fn(),
	mockVerifyToken: vi.fn(),
	mockGetTokenClaims: vi.fn(),
	mockSetAuthCookie: vi.fn().mockResolvedValue(undefined),
	mockGetPKCEVerifier: vi.fn().mockReturnValue('pkce-verifier'),
	mockLoggerWarn: vi.fn()
}));

vi.mock('$lib/server/audit/auditService', () => ({
	logAuditEvent: mockLogAuditEvent
}));

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: mockLoggerWarn, error: vi.fn() })
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: mockLoggerWarn, error: vi.fn() })
}));

vi.mock('$env/dynamic/private', () => ({
	env: { API_AUDIENCE: 'https://api.test', COOKIE_NAME: 'auth-cookie' }
}));

vi.mock('$lib/server/auth/auth.js', () => ({
	getPKCEVerifierFromCookie: mockGetPKCEVerifier,
	getToken: mockGetToken,
	getTokenClaims: mockGetTokenClaims,
	verifyToken: mockVerifyToken,
	setAuthCookie: mockSetAuthCookie
}));

import { GET, sanitizeReturnUrl } from './+server';

function makeCookies() {
	return {
		get: vi.fn().mockImplementation((name: string) => {
			if (name === 'csrfState') return 'valid-csrf';
			return undefined;
		}),
		delete: vi.fn()
	};
}

describe('GET /api/auth/callback — Audit Logging', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetPKCEVerifier.mockReturnValue('pkce-verifier');
	});

	it('loggt auth.login_success bei erfolgreichem Login', async () => {
		mockGetToken.mockResolvedValue({ id_token: 'id-tok', access_token: 'access-tok' });
		mockVerifyToken.mockResolvedValue({ email: 'user@test.com', sub: 'auth0|123' });
		mockGetTokenClaims.mockResolvedValue({ 'https://api.test/roles': ['admin'] });

		await GET({
			url: new URL('http://localhost/api/auth/callback?code=auth-code&state=valid-csrf'),
			cookies: makeCookies()
		} as never).catch(() => {});

		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'auth.login_success',
				resourceType: 'auth',
				userEmail: 'user@test.com'
			})
		);
	});

	it('loggt auth.login_failure bei fehlgeschlagenem Token-Tausch', async () => {
		mockGetToken.mockRejectedValue(new Error('invalid_grant'));

		await GET({
			url: new URL('http://localhost/api/auth/callback?code=bad-code&state=valid-csrf'),
			cookies: makeCookies()
		} as never).catch(() => {});

		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'auth.login_failure',
				resourceType: 'auth',
				status: 'failure'
			})
		);
	});

	it('loggt KEIN auth.login_failure bei erfolgreichem Login (redirect wird nicht als Fehler behandelt)', async () => {
		mockGetToken.mockResolvedValue({ id_token: 'id-tok', access_token: 'access-tok' });
		mockVerifyToken.mockResolvedValue({ email: 'user@test.com', sub: 'auth0|123' });
		mockGetTokenClaims.mockResolvedValue({ 'https://api.test/roles': ['admin'] });

		await GET({
			url: new URL('http://localhost/api/auth/callback?code=auth-code&state=valid-csrf'),
			cookies: makeCookies()
		} as never).catch(() => {});

		const loginFailureCalls = mockLogAuditEvent.mock.calls.filter(
			(call) => call[0]?.action === 'auth.login_failure'
		);
		expect(loginFailureCalls).toHaveLength(0);
	});

	it('normalisiert eine externe returnUrl auf / (Open-Redirect-Schutz)', async () => {
		mockGetToken.mockResolvedValue({ id_token: 'id-tok', access_token: 'access-tok' });
		mockVerifyToken.mockResolvedValue({ email: 'user@test.com', sub: 'auth0|123' });
		mockGetTokenClaims.mockResolvedValue({ 'https://api.test/roles': ['admin'] });

		let thrown: unknown;
		await GET({
			url: new URL(
				'http://localhost/api/auth/callback?code=auth-code&state=valid-csrf&returnUrl=https://evil.com'
			),
			cookies: makeCookies()
		} as never).catch((e) => {
			thrown = e;
		});

		expect((thrown as { status?: number; location?: string })?.status).toBe(302);
		expect((thrown as { location?: string })?.location).toBe('/');
	});

	it('lässt einen legitimen relativen Pfad durch (/admin)', async () => {
		mockGetToken.mockResolvedValue({ id_token: 'id-tok', access_token: 'access-tok' });
		mockVerifyToken.mockResolvedValue({ email: 'user@test.com', sub: 'auth0|123' });
		mockGetTokenClaims.mockResolvedValue({ 'https://api.test/roles': ['admin'] });

		let thrown: unknown;
		await GET({
			url: new URL(
				'http://localhost/api/auth/callback?code=auth-code&state=valid-csrf&returnUrl=/admin'
			),
			cookies: makeCookies()
		} as never).catch((e) => {
			thrown = e;
		});

		expect((thrown as { location?: string })?.location).toBe('/admin');
	});

	it('loggt security.csrf_mismatch warn bei ungültigem State', async () => {
		const cookiesWithMismatch = {
			get: vi.fn().mockImplementation((name: string) => {
				if (name === 'csrfState') return 'expected-csrf';
				return undefined;
			}),
			delete: vi.fn()
		};

		await GET({
			url: new URL('http://localhost/api/auth/callback?code=auth-code&state=wrong-csrf'),
			cookies: cookiesWithMismatch
		} as never).catch(() => {});

		expect(mockLoggerWarn).toHaveBeenCalledWith(
			expect.objectContaining({ event: 'security.csrf_mismatch' }),
			expect.any(String)
		);
	});
});

describe('sanitizeReturnUrl', () => {
	it('normalisiert externe und protokoll-relative URLs auf /', () => {
		expect(sanitizeReturnUrl('https://evil.com')).toBe('/');
		expect(sanitizeReturnUrl('//evil.com')).toBe('/');
		expect(sanitizeReturnUrl('/\\evil.com')).toBe('/');
		expect(sanitizeReturnUrl('http://evil.com/pfad')).toBe('/');
	});

	it('normalisiert leere/ungültige Werte auf /', () => {
		expect(sanitizeReturnUrl(null)).toBe('/');
		expect(sanitizeReturnUrl(undefined)).toBe('/');
		expect(sanitizeReturnUrl('')).toBe('/');
		expect(sanitizeReturnUrl('admin')).toBe('/');
	});

	it('lässt legitime relative Pfade durch', () => {
		expect(sanitizeReturnUrl('/admin')).toBe('/admin');
		expect(sanitizeReturnUrl('/map')).toBe('/map');
		expect(sanitizeReturnUrl('/')).toBe('/');
		expect(sanitizeReturnUrl('/admin/sightings?year=2024')).toBe('/admin/sightings?year=2024');
	});
});
