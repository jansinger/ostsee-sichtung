import {
	AUTH0_CLIENT_ID,
	AUTH0_CLIENT_SECRET,
	AUTH0_DOMAIN,
	COOKIE_NAME,
	ENCRYPTION_KEY,
	JWKS_URL,
	SESSION_SECRET,
	NODE_ENV
} from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';

import type { User } from '$lib/types/index';
import { isUserInRole } from '$lib/utils/auth';
import { error, redirect, type Cookies } from '@sveltejs/kit';
import type { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { decrypt, encrypt, getPKCEChallengeData } from './crypto.js';

/**
 * Cache für den öffentlichen Schlüssel von Auth0's JWT-Signierung.
 * Wird gespeichert um wiederholte Netzwerkanfragen zu vermeiden.
 */
let cachedKey: string | undefined = undefined;

/**
 * Dauer der Session-Cookies in Sekunden.
 * Standard: 1 Tag (86400 Sekunden)
 */
const COOKIE_DURATION_SECONDS = 60 * 60 * 24 * 1; // 1 Tag

/**
 * Dauer der authorization code flow Cookies in Sekunden.
 * Standard: 10 Minuten (600 Sekunden)
 */
const COOKIE_AUTHORIZE_DURATION_SECONDS = 60 * 10; // 10 Minuten

/**
 * Holt den öffentlichen Schlüssel von Auth0's JWKS (JSON Web Key Set) Endpoint.
 *
 * Diese Funktion wird von der JWT-Verifizierung verwendet, um den korrekten
 * öffentlichen Schlüssel basierend auf der Key ID (kid) im JWT-Header zu finden.
 * Der Schlüssel wird gecacht, um redundante Netzwerkanfragen zu vermeiden.
 *
 * @param header - Der JWT-Header, der die Key ID (kid) enthält
 * @param callback - Callback-Funktion, die mit dem Schlüssel oder Fehler aufgerufen wird
 */
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

/**
 * Verifiziert ein JWT-Token von Auth0.
 *
 * Diese Funktion überprüft die Signatur des Tokens gegen den öffentlichen
 * Schlüssel von Auth0's JWKS-Endpoint. Sie stellt sicher, dass:
 * - Das Token von Auth0 ausgestellt wurde
 * - Das Token nicht manipuliert wurde
 * - Das Token noch gültig ist (nicht abgelaufen)
 *
 * @template T - Der erwartete Typ des decodierten Token-Payloads
 * @param token - Das zu verifizierende JWT-Token
 * @returns Ein Promise mit dem verifizierten und decodierten Token-Payload
 * @throws Wirft einen Fehler wenn die Verifizierung fehlschlägt
 *
 * @example
 * ```typescript
 * try {
 *   const user = await verifyToken<User>(idToken);
 *   console.log('Verified user:', user.email);
 * } catch (error) {
 *   console.error('Token verification failed:', error);
 * }
 * ```
 */
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

/**
 * Extrahiert die Claims aus einem JWT-Token ohne Verifizierung.
 *
 * WICHTIG: Diese Funktion verifiziert NICHT die Signatur des Tokens!
 * Sie sollte nur verwendet werden, wenn die Token-Verifizierung bereits
 * an anderer Stelle erfolgt ist oder wenn nur die Claims-Struktur
 * benötigt wird (z.B. um Rollen aus dem Access Token zu extrahieren).
 *
 * @template T - Der erwartete Typ der Token-Claims
 * @param token - Das JWT-Token, aus dem die Claims extrahiert werden sollen
 * @returns Die decodierten Claims oder null wenn kein Token vorhanden
 *
 * @example
 * ```typescript
 * const claims = await getTokenClaims<{ roles: string[] }>(accessToken);
 * const userRoles = claims?.roles || [];
 * ```
 */
export async function getTokenClaims<T>(token: string): Promise<T> {
	if (!token) {
		return <T>null;
	}

	return <T>jwt.decode(token);
}

/**
 * Tauscht einen Authorization Code gegen Access und ID Tokens.
 *
 * Diese Funktion implementiert den Token-Exchange-Schritt des OAuth 2.0
 * Authorization Code Flow mit PKCE. Sie sendet den Authorization Code
 * zusammen mit dem PKCE Verifier an Auth0's Token-Endpoint und erhält
 * im Gegenzug die Tokens.
 *
 * Der Flow:
 * 1. User wird zu Auth0 redirected mit PKCE Challenge
 * 2. Nach erfolgreicher Authentifizierung redirected Auth0 zurück mit Code
 * 3. Diese Funktion tauscht Code + Verifier gegen Tokens
 *
 * @param params - Objekt mit Authorization Code und PKCE Verifier
 * @param params.code - Der Authorization Code von Auth0
 * @param params.pkceVerifier - Der ursprüngliche PKCE Verifier (muss zum Challenge passen)
 * @returns Token-Response von Auth0 mit access_token, id_token, etc.
 *
 * @example
 * ```typescript
 * const tokens = await getToken({
 *   code: 'abc123...',
 *   pkceVerifier: 'stored_verifier_from_cookie'
 * });
 * console.log('Access Token:', tokens.access_token);
 * console.log('ID Token:', tokens.id_token);
 * ```
 */
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

/**
 * Holt den authentifizierten Benutzer aus dem Session-Cookie.
 *
 * Diese Funktion liest das JWT-Token aus dem HTTP-Only Cookie und
 * decodiert es, um die Benutzerinformationen zu erhalten. Das Token
 * wurde bereits bei der Anmeldung verifiziert und mit unserem
 * Session-Secret signiert.
 *
 * Hinweis: Diese Funktion verifiziert das Session-Token NICHT erneut,
 * da es mit unserem eigenen Secret signiert wurde (nicht Auth0's).
 *
 * @param cookies - SvelteKit's Cookies-Objekt
 * @returns Der Benutzer oder null wenn nicht angemeldet
 *
 * @example
 * ```typescript
 * // In einem +page.server.ts oder +server.ts
 * export async function load({ cookies }) {
 *   const user = getAuthUser(cookies);
 *   if (!user) {
 *     throw redirect(302, '/login');
 *   }
 *   return { user };
 * }
 * ```
 */
export const getAuthUser = (cookies: Cookies) => {
	const jwtToken = cookies.get(COOKIE_NAME);

	if (!jwtToken) {
		return null;
	}

	return jwt.decode(jwtToken) as User;
};

/**
 * Setzt den Authentifizierungs-Cookie mit den Benutzerdaten.
 *
 * Diese Funktion erstellt ein JWT-Token mit den Benutzerdaten, signiert
 * es mit unserem Session-Secret und speichert es als HTTP-Only Cookie.
 * Das Cookie wird verwendet, um den Benutzer bei nachfolgenden Anfragen
 * zu identifizieren.
 *
 * Sicherheitsmerkmale:
 * - httpOnly: Verhindert JavaScript-Zugriff (XSS-Schutz)
 * - sameSite: 'lax' - CSRF-Schutz
 * - secure: HTTPS-only in Produktion
 * - Signiert mit eigenem Secret (nicht Auth0's)
 *
 * @param cookies - SvelteKit's Cookies-Objekt
 * @param user - Die zu speichernden Benutzerdaten
 *
 * @example
 * ```typescript
 * // Nach erfolgreicher Auth0-Authentifizierung
 * const authUser = await verifyToken<User>(idToken);
 * authUser.roles = ['user', 'admin'];
 * setAuthCookie(cookies, authUser);
 * ```
 */
export const setAuthCookie = (cookies: Cookies, user: User) => {
	const cookieValue = jwt.sign(user, SESSION_SECRET);
	cookies.set(COOKIE_NAME, cookieValue, {
		httpOnly: true,
		sameSite: 'lax',
		maxAge: COOKIE_DURATION_SECONDS,
		path: '/',
		secure: NODE_ENV === 'production'
	});
};

/**
 * Löscht den Authentifizierungs-Cookie (Logout).
 *
 * Diese Funktion entfernt den Session-Cookie, wodurch der Benutzer
 * effektiv ausgeloggt wird. Wichtig ist, dass der path-Parameter
 * mit dem beim Setzen des Cookies übereinstimmt.
 *
 * @param cookies - SvelteKit's Cookies-Objekt
 *
 * @example
 * ```typescript
 * // In einem Logout-Handler
 * export async function POST({ cookies }) {
 *   clearAuthCookie(cookies);
 *   throw redirect(302, '/');
 * }
 * ```
 */
export const clearAuthCookie = (cookies: Cookies) => {
	cookies.delete(COOKIE_NAME, { path: '/' });
};

/**
 * Überprüft ob ein Benutzer angemeldet ist und die erforderlichen Rollen hat.
 *
 * Diese Utility-Funktion wird in +page.server.ts und +server.ts Dateien
 * verwendet, um Routen zu schützen. Sie prüft:
 * 1. Ob der Benutzer angemeldet ist (redirect zu Login wenn nicht)
 * 2. Ob der Benutzer die erforderlichen Rollen hat (403 Fehler wenn nicht)
 *
 * @param url - Die aktuelle URL (für Return-URL nach Login)
 * @param user - Der aktuelle Benutzer oder null/undefined
 * @param requiredRoles - Optional: Array von erforderlichen Rollen
 * @throws Redirect zu Login wenn nicht angemeldet
 * @throws 403 Fehler wenn Rollen nicht vorhanden
 *
 * @example
 * ```typescript
 * // In +page.server.ts für Admin-Bereich
 * export async function load({ url, cookies }) {
 *   const user = getAuthUser(cookies);
 *   requireUserRole(url, user, ['admin']);
 *   // Code wird nur ausgeführt wenn User Admin ist
 *   return { adminData: await loadAdminData() };
 * }
 * ```
 */
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

/**
 * Setzt einen CSRF-Schutz-Cookie für den OAuth-Flow.
 *
 * Diese Funktion generiert einen zufälligen State-Parameter, der sowohl
 * im Cookie als auch in der OAuth-Authorization-URL gespeichert wird.
 * Bei der Callback-Verarbeitung wird geprüft, ob beide übereinstimmen,
 * um CSRF-Angriffe zu verhindern.
 *
 * Der Cookie hat eine kurze Lebensdauer (1000 Sekunden = ~16 Minuten),
 * da er nur während des Auth-Flows benötigt wird.
 *
 * @param cookies - SvelteKit's Cookies-Objekt
 * @returns Der generierte CSRF-State-String für die Auth-URL
 *
 * @example
 * ```typescript
 * // Im Login-Handler
 * const csrfState = setCsrfCookie(cookies);
 * const authUrl = `https://auth0.com/authorize?state=${csrfState}&...`;
 * ```
 */
export const setCsrfCookie = (cookies: Cookies) => {
	const csrfState = Math.random().toString(36).substring(7);
	cookies.set('csrfState', csrfState, {
		httpOnly: true,
		sameSite: 'lax',
		maxAge: COOKIE_AUTHORIZE_DURATION_SECONDS,
		path: '/api/auth',
		secure: NODE_ENV === 'production'
	});
	return csrfState;
};

/**
 * Generiert und speichert PKCE-Daten für den OAuth 2.0 Flow.
 *
 * PKCE (Proof Key for Code Exchange) ist eine Sicherheitserweiterung für
 * OAuth 2.0, die Man-in-the-Middle-Angriffe verhindert. Diese Funktion:
 *
 * 1. Generiert ein Verifier/Challenge-Paar
 * 2. Verschlüsselt den Verifier mit AES-256-GCM
 * 3. Speichert den verschlüsselten Verifier im Cookie
 * 4. Gibt den Challenge für die Auth-URL zurück
 *
 * Der Verifier muss geheim bleiben und wird später beim Token-Exchange
 * benötigt. Die Verschlüsselung schützt vor Cookie-Diebstahl.
 *
 * Cookie-Format: "IV:EncryptedData:AuthTag" (alle hex-encoded)
 *
 * @param cookies - SvelteKit's Cookies-Objekt
 * @returns Der PKCE Challenge (SHA256-Hash des Verifiers, base64url-encoded)
 *
 * @example
 * ```typescript
 * // Im Login-Handler
 * const challenge = setPKCECookie(cookies);
 * const authUrl = `https://auth0.com/authorize?
 *   code_challenge=${challenge}&
 *   code_challenge_method=S256&...`;
 * ```
 */
export const setPKCECookie = (cookies: Cookies) => {
	const { verifier, challenge } = getPKCEChallengeData();
	const encryptedVerifier = encrypt(verifier, Buffer.from(ENCRYPTION_KEY, 'hex'));
	const cookieValue = `${encryptedVerifier.iv.toString('hex')}:${encryptedVerifier.encryptedData.toString('hex')}:${encryptedVerifier.tag.toString('hex')}`;
	cookies.set('extendedState', cookieValue, {
		httpOnly: true,
		sameSite: 'lax',
		maxAge: COOKIE_AUTHORIZE_DURATION_SECONDS,
		path: '/api/auth',
		secure: NODE_ENV === 'production'
	});
	return challenge;
};

/**
 * Holt und entschlüsselt den PKCE Verifier aus dem Cookie.
 *
 * Diese Funktion wird im OAuth-Callback verwendet, um den ursprünglichen
 * PKCE Verifier zu erhalten, der für den Token-Exchange benötigt wird.
 *
 * Sicherheitsaspekte:
 * - Cookie wird sofort nach dem Lesen gelöscht (Single-Use)
 * - Verifier ist mit AES-256-GCM verschlüsselt
 * - Entschlüsselung schlägt fehl bei Manipulation (Auth-Tag)
 *
 * @param cookies - SvelteKit's Cookies-Objekt
 * @returns Der entschlüsselte PKCE Verifier oder null bei Fehler
 *
 * @example
 * ```typescript
 * // Im OAuth-Callback-Handler
 * const pkceVerifier = getPKCEVerifierFromCookie(cookies);
 * if (!pkceVerifier) {
 *   throw error(403, 'Invalid PKCE state');
 * }
 * const tokens = await getToken({ code, pkceVerifier });
 * ```
 */
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
