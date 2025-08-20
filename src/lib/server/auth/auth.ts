import {
	AUTH0_CLIENT_ID,
	AUTH0_CLIENT_SECRET,
	AUTH0_DOMAIN,
	COOKIE_NAME,
	ENCRYPTION_KEY,
	JWKS_URL,
	SESSION_SECRET
} from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';

import type { User } from '$lib/types/index';
import { isUserInRole } from '$lib/utils/auth';
import { error, redirect, type Cookies } from '@sveltejs/kit';
import crypto from 'crypto';
import type { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

let cachedKey: string | undefined = undefined;

const COOKIE_DURATION_SECONDS = 60 * 60 * 24 * 7; // 1 week

function base64URLEncode(randomString: Buffer): string {
	return randomString.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generates a Proof Key for Code Exchange (PKCE) verifier.
 *
 * This function creates a cryptographically random string that can be used
 * as a PKCE verifier in OAuth 2.0 authorization flows. The verifier is
 * generated using 32 random bytes, which are then base64url encoded.
 *
 * @returns {string} A base64url encoded string to be used as the PKCE verifier.
 */
function getPKCEVerifier(): string {
	return base64URLEncode(crypto.randomBytes(32));
}

function sha256(buffer: string): Buffer {
	return crypto.createHash('sha256').update(buffer).digest();
}

/**
 * Generates a Proof Key for Code Exchange (PKCE) challenge.
 *
 * This function creates a cryptographically random string that can be used
 * as a PKCE challenge in OAuth 2.0 authorization flows. The challenge is
 * generated using 32 random bytes, which are then base64url encoded.
 *
 * @returns {string} A base64url encoded string to be used as the PKCE challenge.
 */
function getPKCEChallengeData() {
	const verifier = getPKCEVerifier();
	const challenge = base64URLEncode(sha256(verifier));
	return { verifier, challenge };
}

function getKey(header: JwtHeader, callback: SigningKeyCallback) {
	const client = new JwksClient({ jwksUri: JWKS_URL });

	client.getSigningKey(header.kid, function (err, key) {
		if (err) {
			callback(err);
		}
		if (cachedKey) {
			callback(null, cachedKey);
		} else {
			const signingKey = key?.getPublicKey();
			cachedKey = signingKey;
			callback(null, signingKey);
		}
	});
}

export async function verifyToken<T>(token: string): Promise<T> {
	return new Promise((resolve, reject) => {
		jwt.verify(token, getKey, {}, (err, payload) => {
			if (err) {
				reject(err);
			} else {
				resolve(payload as T);
			}
		});
	});
}

export async function getTokenClaims<T>(token: string): Promise<T> {
	if (!token) {
		return <T>null;
	}

	return <T>jwt.decode(token);
}

export async function getToken({ code, pkceVerifier }: { code: string; pkceVerifier: string }) {
	const resp = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
		method: 'POST',
		body: JSON.stringify({
			code,
			client_id: AUTH0_CLIENT_ID,
			client_secret: AUTH0_CLIENT_SECRET,
			redirect_uri: `${PUBLIC_SITE_URL}/api/auth/callback`,
			grant_type: 'authorization_code',
			code_verifier: pkceVerifier
		}),
		headers: {
			'Content-Type': 'application/json'
		}
	});
	return await resp.json();
}

export const getAuthUser = (cookies: Cookies) => {
	const jwtToken = cookies.get(COOKIE_NAME);

	if (!jwtToken) {
		return null;
	}

	return jwt.decode(jwtToken) as User;
};

export const setAuthCookie = (cookies: Cookies, user: User) => {
	const cookieValue = jwt.sign(user, SESSION_SECRET);
	cookies.set(COOKIE_NAME, cookieValue, {
		httpOnly: true,
		sameSite: 'lax',
		maxAge: COOKIE_DURATION_SECONDS,
		path: '/',
		secure: process.env.NODE_ENV === 'production'
	});
};

export const clearAuthCookie = (cookies: Cookies) => {
	cookies.delete(COOKIE_NAME, { path: '/' });
};

export const requireUserRole = (
	url: URL,
	user: User | null | undefined,
	requiredRoles?: string[]
): void => {
	if (!user) {
		return redirect(302, `/api/auth/login?returnUrl=${url?.pathname}`);
	}
	if (!isUserInRole(user, requiredRoles)) {
		throw error(403, 'Forbidden: Insufficient permissions');
	}
};

export const setCsrfCookie = (cookies: Cookies) => {
	const csrfState = Math.random().toString(36).substring(7);
	cookies.set('csrfState', csrfState, {
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 1000,
		path: '/api/auth',
		secure: process.env.NODE_ENV === 'production'
	});
	return csrfState;
};

const ALGORITHM = 'aes-256-gcm';

const encrypt = (text: string, key: Buffer): { iv: Buffer; encryptedData: Buffer; tag: Buffer } => {
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
	const encryptedData = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return { iv, encryptedData, tag };
};

const decrypt = (encryptedData: Buffer, key: Buffer, iv: Buffer, tag: Buffer): string => {
	const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(tag);
	const decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
	return decryptedData.toString('utf8');
};

export const setPKCECookie = (cookies: Cookies) => {
	const { verifier, challenge } = getPKCEChallengeData();
	const encryptedVerifier = encrypt(verifier, Buffer.from(ENCRYPTION_KEY, 'hex'));
	const cookieValue = `${encryptedVerifier.iv.toString('hex')}:${encryptedVerifier.encryptedData.toString('hex')}:${encryptedVerifier.tag.toString('hex')}`;
	cookies.set('extendedState', cookieValue, {
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 1000,
		path: '/api/auth',
		secure: process.env.NODE_ENV === 'production'
	});
	return challenge;
};

export const getPKCEVerifierFromCookie = (cookies: Cookies): string | null => {
	const cookieValue = cookies.get('extendedState');
	if (!cookieValue) {
		return null;
	}
	cookies.delete('extendedState', { path: '/api/auth' });
	const [ivHex, encryptedDataHex, tagHex] = cookieValue.split(':');
	if (!ivHex || !encryptedDataHex || !tagHex) {
		return null;
	}
	const iv = Buffer.from(ivHex, 'hex');
	const encryptedData = Buffer.from(encryptedDataHex, 'hex');
	const tag = Buffer.from(tagHex, 'hex');

	const decryptedVerifier = decrypt(encryptedData, Buffer.from(ENCRYPTION_KEY, 'hex'), iv, tag);
	return decryptedVerifier;
};
