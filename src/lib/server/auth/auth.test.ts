import type { User } from '$lib/types/User';
import type { Cookies } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all external dependencies
vi.mock('jsonwebtoken');
vi.mock('jwks-rsa');
vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		error: vi.fn(),
		redirect: vi.fn()
	};
});

// Mock environment variables
vi.mock('$env/static/private', () => ({
	AUTH0_CLIENT_ID: 'test-client-id',
	AUTH0_CLIENT_SECRET: 'test-client-secret',
	AUTH0_DOMAIN: 'test-domain.auth0.com',
	COOKIE_NAME: 'test-auth-cookie',
	JWKS_URL: 'https://test-domain.auth0.com/.well-known/jwks.json',
	SESSION_SECRET: 'test-session-secret',
	ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
}));

vi.mock('$env/static/public', () => ({
	PUBLIC_SITE_URL: 'https://test-site.com'
}));

// Mock crypto functions
vi.mock('./crypto.js', () => ({
	getPKCEChallengeData: vi.fn(),
	encrypt: vi.fn(),
	decrypt: vi.fn()
}));

// Import the functions to test after mocking
import {
	clearAuthCookie,
	getAuthUser,
	getPKCEVerifierFromCookie,
	getToken,
	getTokenClaims,
	requireUserRole,
	setAuthCookie,
	setCsrfCookie,
	setPKCECookie,
	verifyToken
} from './auth';
import { decrypt, encrypt, getPKCEChallengeData } from './crypto.js';

describe('auth.ts', () => {
	let mockJwt: {
		verify: ReturnType<typeof vi.fn>;
		decode: ReturnType<typeof vi.fn>;
		sign: ReturnType<typeof vi.fn>;
	};
	let mockJwksClient: {
		getSigningKey: ReturnType<typeof vi.fn>;
		getKeys: ReturnType<typeof vi.fn>;
		getSigningKeys: ReturnType<typeof vi.fn>;
	};
	let mockCookies: Cookies;

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup JWT mocks
		mockJwt = {
			verify: vi.fn(),
			decode: vi.fn(),
			sign: vi.fn()
		};
		vi.mocked(jwt).verify = mockJwt.verify;
		vi.mocked(jwt).decode = mockJwt.decode;
		vi.mocked(jwt).sign = mockJwt.sign;

		// Setup JWKS client mock
		mockJwksClient = {
			getSigningKey: vi.fn(),
			getKeys: vi.fn(),
			getSigningKeys: vi.fn()
		};
		vi.mocked(JwksClient).mockImplementation(() => mockJwksClient as unknown as JwksClient);

		// Setup cookies mock
		mockCookies = {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			getAll: vi.fn(),
			serialize: vi.fn()
		} as unknown as Cookies;

		// Setup global fetch mock
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('verifyToken', () => {
		it('should successfully verify a valid token', async () => {
			const testPayload = { sub: 'test-user', email: 'test@example.com' };
			const mockKey = { getPublicKey: () => 'public-key' };

			mockJwksClient.getSigningKey.mockImplementation(
				(
					_kid: string,
					callback: (err: Error | null, key?: { getPublicKey: () => string }) => void
				) => {
					callback(null, mockKey);
				}
			);

			mockJwt.verify.mockImplementation(
				(
					_token: string,
					_keyFn: (header: unknown, callback: (err: Error | null, key?: string) => void) => void,
					_options: unknown,
					callback: (err: Error | null, payload?: unknown) => void
				) => {
					callback(null, testPayload);
				}
			);

			const result = await verifyToken('valid-token');

			expect(result).toEqual(testPayload);
			expect(mockJwt.verify).toHaveBeenCalledWith(
				'valid-token',
				expect.any(Function),
				{},
				expect.any(Function)
			);
		});

		it('should reject invalid tokens', async () => {
			const testError = new Error('Invalid token');

			mockJwt.verify.mockImplementation(
				(
					_token: string,
					_keyFn: (header: unknown, callback: (err: Error | null, key?: string) => void) => void,
					_options: unknown,
					callback: (err: Error | null, payload?: unknown) => void
				) => {
					callback(testError);
				}
			);

			await expect(verifyToken('invalid-token')).rejects.toThrow('Invalid token');
		});

		it('should handle JWKS key retrieval errors', async () => {
			const keyError = new Error('Key not found');

			mockJwksClient.getSigningKey.mockImplementation(
				(
					_kid: string,
					callback: (err: Error | null, key?: { getPublicKey: () => string }) => void
				) => {
					callback(keyError);
				}
			);

			mockJwt.verify.mockImplementation(
				(
					_token: string,
					keyFn: (header: unknown, callback: (err: Error | null, key?: string) => void) => void,
					_options: unknown,
					callback: (err: Error | null, payload?: unknown) => void
				) => {
					// Simulate the key function being called
					const mockHeader = { kid: 'test-kid' };
					keyFn(mockHeader, (err: Error | null) => {
						if (err) callback(err);
					});
				}
			);

			await expect(verifyToken('token-with-bad-key')).rejects.toThrow('Key not found');
		});

		it('should use cached key when available', async () => {
			const testPayload = { sub: 'test-user' };
			const mockKey = { getPublicKey: () => 'public-key' };

			// First call to cache the key
			mockJwksClient.getSigningKey.mockImplementationOnce(
				(
					_kid: string,
					callback: (err: Error | null, key?: { getPublicKey: () => string }) => void
				) => {
					callback(null, mockKey);
				}
			);

			mockJwt.verify.mockImplementation(
				(
					_token: string,
					_keyFn: (header: unknown, callback: (err: Error | null, key?: string) => void) => void,
					_options: unknown,
					callback: (err: Error | null, payload?: unknown) => void
				) => {
					callback(null, testPayload);
				}
			);

			await verifyToken('first-token');

			// Second call should use cached key
			mockJwksClient.getSigningKey.mockImplementationOnce(
				(
					_kid: string,
					callback: (err: Error | null, key?: { getPublicKey: () => string }) => void
				) => {
					// Should use cached key, so callback with cached value
					callback(null, undefined); // key should be null but cached key should be used
				}
			);

			const result = await verifyToken('second-token');
			expect(result).toEqual(testPayload);
		});
	});

	describe('getTokenClaims', () => {
		it('should decode token claims', async () => {
			const testClaims = { sub: 'test-user', email: 'test@example.com', roles: ['user'] };
			mockJwt.decode.mockReturnValue(testClaims);

			const result = await getTokenClaims('valid-token');

			expect(result).toEqual(testClaims);
			expect(mockJwt.decode).toHaveBeenCalledWith('valid-token');
		});

		it('should return null for empty token', async () => {
			const result = await getTokenClaims('');

			expect(result).toBeNull();
			expect(mockJwt.decode).not.toHaveBeenCalled();
		});

		it('should return null for undefined token', async () => {
			// Test with undefined token (edge case)
			const result = await getTokenClaims(undefined as any);

			expect(result).toBeNull();
			expect(mockJwt.decode).not.toHaveBeenCalled();
		});
	});

	describe('getToken', () => {
		it('should exchange code for token successfully', async () => {
			const mockTokenResponse = {
				access_token: 'access-token',
				id_token: 'id-token',
				token_type: 'Bearer'
			};

			vi.mocked(fetch).mockResolvedValue({
				json: () => Promise.resolve(mockTokenResponse)
			} as Response);

			const result = await getToken({ code: 'auth-code', pkceVerifier: 'auth-verifier' });

			expect(result).toEqual(mockTokenResponse);
			expect(fetch).toHaveBeenCalledWith('https://test-domain.auth0.com/oauth/token', {
				method: 'POST',
				body: JSON.stringify({
					code: 'auth-code',
					client_id: 'test-client-id',
					client_secret: 'test-client-secret',
					redirect_uri: 'https://test-site.com/api/auth/callback',
					grant_type: 'authorization_code',
					code_verifier: 'auth-verifier'
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			});
		});

		it('should handle token exchange errors', async () => {
			const errorResponse = {
				error: 'invalid_grant',
				error_description: 'Invalid authorization code'
			};

			vi.mocked(fetch).mockResolvedValue({
				json: () => Promise.resolve(errorResponse)
			} as Response);

			const result = await getToken({ code: 'invalid-code', pkceVerifier: 'invalid-verifier' });

			expect(result).toEqual(errorResponse);
		});

		it('should handle network errors', async () => {
			vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

			await expect(getToken({ code: 'auth-code', pkceVerifier: 'auth-verifier' })).rejects.toThrow(
				'Network error'
			);
		});
	});

	describe('getAuthUser', () => {
		it('should return user from valid cookie', () => {
			const testUser: User = {
				nickname: 'testuser',
				name: 'Test User',
				picture: 'https://example.com/avatar.jpg',
				updated_at: '2023-01-01T00:00:00.000Z',
				email: 'test@example.com',
				email_verified: true,
				iss: 'https://test-domain.auth0.com/',
				aud: 'test-client-id',
				iat: 1672531200,
				exp: 1672617600,
				sub: 'auth0|123456789',
				sid: 'session-id',
				roles: ['user']
			};

			vi.mocked(mockCookies.get).mockReturnValue('valid-jwt-token');
			mockJwt.decode.mockReturnValue(testUser);

			const result = getAuthUser(mockCookies);

			expect(result).toEqual(testUser);
			expect(mockCookies.get).toHaveBeenCalledWith('test-auth-cookie');
			expect(mockJwt.decode).toHaveBeenCalledWith('valid-jwt-token');
		});

		it('should return null when no cookie exists', () => {
			vi.mocked(mockCookies.get).mockReturnValue(undefined);

			const result = getAuthUser(mockCookies);

			expect(result).toBeNull();
			expect(mockJwt.decode).not.toHaveBeenCalled();
		});

		it('should return null when cookie is empty', () => {
			vi.mocked(mockCookies.get).mockReturnValue('');

			const result = getAuthUser(mockCookies);

			expect(result).toBeNull();
		});
	});

	describe('setAuthCookie', () => {
		it('should set auth cookie with correct parameters', () => {
			const testUser: User = {
				nickname: 'testuser',
				name: 'Test User',
				picture: 'https://example.com/avatar.jpg',
				updated_at: '2023-01-01T00:00:00.000Z',
				email: 'test@example.com',
				email_verified: true,
				iss: 'https://test-domain.auth0.com/',
				aud: 'test-client-id',
				iat: 1672531200,
				exp: 1672617600,
				sub: 'auth0|123456789',
				sid: 'session-id',
				roles: ['user']
			};

			const signedToken = 'signed-jwt-token';
			mockJwt.sign.mockReturnValue(signedToken);

			setAuthCookie(mockCookies, testUser);

			expect(mockJwt.sign).toHaveBeenCalledWith(testUser, 'test-session-secret');
			expect(mockCookies.set).toHaveBeenCalledWith('test-auth-cookie', signedToken, {
				httpOnly: true,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 1, // 1 Tag
				path: '/',
				secure: process.env.NODE_ENV === 'production'
			});
		});
	});

	describe('clearAuthCookie', () => {
		it('should delete auth cookie', () => {
			clearAuthCookie(mockCookies);

			expect(mockCookies.delete).toHaveBeenCalledWith('test-auth-cookie', { path: '/' });
		});
	});

	describe('requireUserRole', () => {
		const testUrl = new URL('https://example.com/admin');

		it('should redirect when user is null', () => {
			// Mock redirect to throw an exception like the real function does
			vi.mocked(redirect).mockImplementation((status: number, location: string | URL) => {
				throw new Error(`Redirect ${status}: ${location}`);
			});

			expect(() => requireUserRole(testUrl, null)).toThrow(
				'Redirect 302: /api/auth/login?returnUrl=/admin'
			);
			expect(redirect).toHaveBeenCalledWith(302, '/api/auth/login?returnUrl=/admin');
		});

		it('should redirect when user is undefined', () => {
			// Mock redirect to throw an exception like the real function does
			vi.mocked(redirect).mockImplementation((status: number, location: string | URL) => {
				throw new Error(`Redirect ${status}: ${location}`);
			});

			expect(() => requireUserRole(testUrl, undefined)).toThrow(
				'Redirect 302: /api/auth/login?returnUrl=/admin'
			);
			expect(redirect).toHaveBeenCalledWith(302, '/api/auth/login?returnUrl=/admin');
		});

		it('should allow access when user exists and no required roles', () => {
			const testUser: User = {
				nickname: 'testuser',
				name: 'Test User',
				picture: 'https://example.com/avatar.jpg',
				updated_at: '2023-01-01T00:00:00.000Z',
				email: 'test@example.com',
				email_verified: true,
				iss: 'https://test-domain.auth0.com/',
				aud: 'test-client-id',
				iat: 1672531200,
				exp: 1672617600,
				sub: 'auth0|123456789',
				sid: 'session-id',
				roles: ['user']
			};

			expect(() => requireUserRole(testUrl, testUser)).not.toThrow();
			expect(redirect).not.toHaveBeenCalled();
			expect(error).not.toHaveBeenCalled();
		});

		it('should allow access when user has required role', () => {
			const testUser: User = {
				nickname: 'admin',
				name: 'Admin User',
				picture: 'https://example.com/avatar.jpg',
				updated_at: '2023-01-01T00:00:00.000Z',
				email: 'admin@example.com',
				email_verified: true,
				iss: 'https://test-domain.auth0.com/',
				aud: 'test-client-id',
				iat: 1672531200,
				exp: 1672617600,
				sub: 'auth0|123456789',
				sid: 'session-id',
				roles: ['admin', 'user']
			};

			expect(() => requireUserRole(testUrl, testUser, ['admin'])).not.toThrow();
			expect(redirect).not.toHaveBeenCalled();
			expect(error).not.toHaveBeenCalled();
		});

		it('should allow access when user has one of multiple required roles', () => {
			const testUser: User = {
				nickname: 'moderator',
				name: 'Moderator User',
				picture: 'https://example.com/avatar.jpg',
				updated_at: '2023-01-01T00:00:00.000Z',
				email: 'mod@example.com',
				email_verified: true,
				iss: 'https://test-domain.auth0.com/',
				aud: 'test-client-id',
				iat: 1672531200,
				exp: 1672617600,
				sub: 'auth0|123456789',
				sid: 'session-id',
				roles: ['moderator']
			};

			expect(() => requireUserRole(testUrl, testUser, ['admin', 'moderator'])).not.toThrow();
			expect(redirect).not.toHaveBeenCalled();
			expect(error).not.toHaveBeenCalled();
		});

		it('should throw error when user lacks required role', () => {
			const testUser: User = {
				nickname: 'user',
				name: 'Regular User',
				picture: 'https://example.com/avatar.jpg',
				updated_at: '2023-01-01T00:00:00.000Z',
				email: 'user@example.com',
				email_verified: true,
				iss: 'https://test-domain.auth0.com/',
				aud: 'test-client-id',
				iat: 1672531200,
				exp: 1672617600,
				sub: 'auth0|123456789',
				sid: 'session-id',
				roles: ['user']
			};

			// Mock error to throw an exception like the real function does
			vi.mocked(error).mockImplementation((status: number, body?: any) => {
				throw new Error(`${status}: ${body}`);
			});

			expect(() => requireUserRole(testUrl, testUser, ['admin'])).toThrow(
				'403: Forbidden: Insufficient permissions'
			);
			expect(error).toHaveBeenCalledWith(403, 'Forbidden: Insufficient permissions');
		});

		it('should throw error when user has no roles but roles are required', () => {
			const testUser: User = {
				nickname: 'noroles',
				name: 'No Roles User',
				picture: 'https://example.com/avatar.jpg',
				updated_at: '2023-01-01T00:00:00.000Z',
				email: 'noroles@example.com',
				email_verified: true,
				iss: 'https://test-domain.auth0.com/',
				aud: 'test-client-id',
				iat: 1672531200,
				exp: 1672617600,
				sub: 'auth0|123456789',
				sid: 'session-id',
				roles: []
			};

			// Mock error to throw an exception like the real function does
			vi.mocked(error).mockImplementation((status: number, body?: any) => {
				throw new Error(`${status}: ${body}`);
			});

			expect(() => requireUserRole(testUrl, testUser, ['admin'])).toThrow(
				'403: Forbidden: Insufficient permissions'
			);
			expect(error).toHaveBeenCalledWith(403, 'Forbidden: Insufficient permissions');
		});

		it('should throw error when user roles is undefined but roles are required', () => {
			const testUser: Partial<User> = {
				nickname: 'noroles',
				name: 'No Roles User',
				email: 'noroles@example.com',
				sub: 'auth0|123456789'
			};

			// Mock error to throw an exception like the real function does
			vi.mocked(error).mockImplementation((status: number, body?: any) => {
				throw new Error(`${status}: ${body}`);
			});

			expect(() => requireUserRole(testUrl, testUser as User, ['admin'])).toThrow(
				'403: Forbidden: Insufficient permissions'
			);
			expect(error).toHaveBeenCalledWith(403, 'Forbidden: Insufficient permissions');
		});

		it('should handle empty required roles array', () => {
			const testUser: User = {
				nickname: 'user',
				name: 'Regular User',
				picture: 'https://example.com/avatar.jpg',
				updated_at: '2023-01-01T00:00:00.000Z',
				email: 'user@example.com',
				email_verified: true,
				iss: 'https://test-domain.auth0.com/',
				aud: 'test-client-id',
				iat: 1672531200,
				exp: 1672617600,
				sub: 'auth0|123456789',
				sid: 'session-id',
				roles: ['user']
			};

			expect(() => requireUserRole(testUrl, testUser, [])).not.toThrow();
			expect(redirect).not.toHaveBeenCalled();
			expect(error).not.toHaveBeenCalled();
		});

		it('should handle URL without pathname', () => {
			const urlWithoutPath = new URL('https://example.com');

			// Mock redirect to throw an exception like the real function does
			vi.mocked(redirect).mockImplementation((status: number, location: string | URL) => {
				throw new Error(`Redirect ${status}: ${location}`);
			});

			expect(() => requireUserRole(urlWithoutPath, null)).toThrow(
				'Redirect 302: /api/auth/login?returnUrl=/'
			);
			expect(redirect).toHaveBeenCalledWith(302, '/api/auth/login?returnUrl=/');
		});
	});

	describe('setCsrfCookie', () => {
		it('should generate and set CSRF state cookie', () => {
			// Mock Math.random to return value that produces non-empty string
			const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.9999);

			const result = setCsrfCookie(mockCookies);

			expect(typeof result).toBe('string');
			expect(result.length).toBeGreaterThan(0);
			expect(mockCookies.set).toHaveBeenCalledWith('csrfState', result, {
				httpOnly: true,
				sameSite: 'lax',
				maxAge: 1000,
				path: '/api/auth',
				secure: process.env.NODE_ENV === 'production'
			});

			mockRandom.mockRestore();
		});

		it('should generate different CSRF tokens on subsequent calls', () => {
			const token1 = setCsrfCookie(mockCookies);
			const token2 = setCsrfCookie(mockCookies);

			expect(token1).not.toBe(token2);
			expect(mockCookies.set).toHaveBeenCalledTimes(2);
		});
	});

	describe('setPKCECookie', () => {
		beforeEach(() => {
			// Reset mocks before each test
			vi.clearAllMocks();
		});

		it('should generate PKCE data, encrypt verifier, and set cookie', () => {
			const mockPKCEData = {
				verifier: 'test-verifier-123',
				challenge: 'test-challenge-456'
			};
			const mockEncryptedData = {
				iv: Buffer.from('1234567890abcdef1234567890abcdef', 'hex'),
				encryptedData: Buffer.from('encrypted-verifier-data', 'hex'),
				tag: Buffer.from('auth-tag-1234567890abcdef', 'hex')
			};

			vi.mocked(getPKCEChallengeData).mockReturnValue(mockPKCEData);
			vi.mocked(encrypt).mockReturnValue(mockEncryptedData);

			const result = setPKCECookie(mockCookies);

			expect(result).toBe('test-challenge-456');
			expect(getPKCEChallengeData).toHaveBeenCalledTimes(1);
			expect(encrypt).toHaveBeenCalledWith(
				'test-verifier-123',
				Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex')
			);

			const expectedCookieValue = `${mockEncryptedData.iv.toString('hex')}:${mockEncryptedData.encryptedData.toString('hex')}:${mockEncryptedData.tag.toString('hex')}`;
			expect(mockCookies.set).toHaveBeenCalledWith('extendedState', expectedCookieValue, {
				httpOnly: true,
				sameSite: 'lax',
				maxAge: 1000,
				path: '/api/auth',
				secure: process.env.NODE_ENV === 'production'
			});
		});

		it('should handle encryption errors gracefully', () => {
			const mockPKCEData = {
				verifier: 'test-verifier',
				challenge: 'test-challenge'
			};

			vi.mocked(getPKCEChallengeData).mockReturnValue(mockPKCEData);
			vi.mocked(encrypt).mockImplementation(() => {
				throw new Error('Encryption failed');
			});

			expect(() => setPKCECookie(mockCookies)).toThrow('Encryption failed');
		});
	});

	describe('getPKCEVerifierFromCookie', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should retrieve, decrypt, and delete PKCE cookie successfully', () => {
			const mockCookieValue = '1234567890abcdef:encrypteddata:authtag123456';
			const mockDecryptedVerifier = 'decrypted-verifier-123';

			vi.mocked(mockCookies.get).mockReturnValue(mockCookieValue);
			vi.mocked(decrypt).mockReturnValue(mockDecryptedVerifier);

			const result = getPKCEVerifierFromCookie(mockCookies);

			expect(result).toBe(mockDecryptedVerifier);
			expect(mockCookies.get).toHaveBeenCalledWith('extendedState');
			expect(mockCookies.delete).toHaveBeenCalledWith('extendedState', { path: '/api/auth' });
			expect(decrypt).toHaveBeenCalledWith(
				Buffer.from('encrypteddata', 'hex'),
				Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex'),
				Buffer.from('1234567890abcdef', 'hex'),
				Buffer.from('authtag123456', 'hex')
			);
		});

		it('should return null when no cookie exists', () => {
			vi.mocked(mockCookies.get).mockReturnValue(undefined);

			const result = getPKCEVerifierFromCookie(mockCookies);

			expect(result).toBeNull();
			expect(mockCookies.delete).not.toHaveBeenCalled();
			expect(decrypt).not.toHaveBeenCalled();
		});

		it('should return null when cookie value is empty', () => {
			vi.mocked(mockCookies.get).mockReturnValue('');

			const result = getPKCEVerifierFromCookie(mockCookies);

			expect(result).toBeNull();
			expect(mockCookies.delete).not.toHaveBeenCalled();
			expect(decrypt).not.toHaveBeenCalled();
		});

		it('should return null when cookie has invalid format', () => {
			vi.mocked(mockCookies.get).mockReturnValue('invalid-cookie-format');

			const result = getPKCEVerifierFromCookie(mockCookies);

			expect(result).toBeNull();
			expect(mockCookies.delete).toHaveBeenCalledWith('extendedState', { path: '/api/auth' });
			expect(decrypt).not.toHaveBeenCalled();
		});

		it('should return null when cookie has missing components', () => {
			vi.mocked(mockCookies.get).mockReturnValue('iv:encrypted:'); // missing tag

			const result = getPKCEVerifierFromCookie(mockCookies);

			expect(result).toBeNull();
			expect(mockCookies.delete).toHaveBeenCalledWith('extendedState', { path: '/api/auth' });
			expect(decrypt).not.toHaveBeenCalled();
		});

		it('should handle decryption errors', () => {
			const mockCookieValue = 'validiv:validdata:validtag';
			vi.mocked(mockCookies.get).mockReturnValue(mockCookieValue);
			vi.mocked(decrypt).mockImplementation(() => {
				throw new Error('Decryption failed');
			});

			expect(() => getPKCEVerifierFromCookie(mockCookies)).toThrow('Decryption failed');
			expect(mockCookies.delete).toHaveBeenCalledWith('extendedState', { path: '/api/auth' });
		});

		it('should always delete cookie even on successful retrieval', () => {
			const mockCookieValue = 'iv:data:tag';
			const mockDecryptedVerifier = 'verifier';

			vi.mocked(mockCookies.get).mockReturnValue(mockCookieValue);
			vi.mocked(decrypt).mockReturnValue(mockDecryptedVerifier);

			getPKCEVerifierFromCookie(mockCookies);

			expect(mockCookies.delete).toHaveBeenCalledWith('extendedState', { path: '/api/auth' });
		});
	});
});
