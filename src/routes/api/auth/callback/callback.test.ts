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

import { GET } from './+server';

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
