/**
 * Rate Limiting Middleware für API-Endpunkte
 *
 * Implementiert verschiedene Rate Limits basierend auf User-Status und Endpunkt-Typ.
 * Nutzt In-Memory-Storage mit automatischer Cleanup-Funktionalität.
 */

import { createLogger } from '$lib/logger';
import { error } from '@sveltejs/kit';

const logger = createLogger('middleware:rateLimit');

interface RateLimitEntry {
	count: number;
	resetTime: number;
	firstRequest: number;
}

interface RateLimitConfig {
	windowMs: number; // Zeit-Fenster in Millisekunden
	maxRequests: number; // Maximale Anfragen pro Fenster
	skipSuccessful?: boolean; // Nur fehlgeschlagene Requests zählen
}

// In-Memory Storage für Rate Limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup alle 10 Minuten
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 Minuten
setInterval(() => {
	const now = Date.now();
	const keysToDelete: string[] = [];

	for (const [key, entry] of rateLimitStore.entries()) {
		if (entry.resetTime < now) {
			keysToDelete.push(key);
		}
	}

	keysToDelete.forEach((key) => rateLimitStore.delete(key));

	if (keysToDelete.length > 0) {
		logger.debug({ cleanedKeys: keysToDelete.length }, 'Rate limit entries cleaned up');
	}
}, CLEANUP_INTERVAL);

/**
 * Rate Limiting Konfigurationen für verschiedene Endpunkt-Typen
 */
export const RATE_LIMITS = {
	// File Upload - strenge Limits
	FILE_UPLOAD_ANONYMOUS: {
		windowMs: 60 * 60 * 1000, // 1 Stunde
		maxRequests: 20 // 20 Uploads pro Stunde für anonyme User
	},
	FILE_UPLOAD_AUTHENTICATED: {
		windowMs: 60 * 60 * 1000, // 1 Stunde
		maxRequests: 50 // 25 Uploads pro Stunde für authentifizierte User
	},

	// Media Access - moderate Limits
	MEDIA_ACCESS_ANONYMOUS: {
		windowMs: 60 * 1000, // 1 Minute
		maxRequests: 30 // 30 Media-Zugriffe pro Minute für anonyme User
	},
	MEDIA_ACCESS_AUTHENTICATED: {
		windowMs: 60 * 1000, // 1 Minute
		maxRequests: 100 // 100 Media-Zugriffe pro Minute für authentifizierte User
	},

	// Sichtung Submission - bereits implementiert, hier zur Vollständigkeit
	SIGHTING_SUBMISSION: {
		windowMs: 60 * 60 * 1000, // 1 Stunde
		maxRequests: 20 // 20 Sichtungen pro Stunde
	}
} as const;

/**
 * Prüft und aktualisiert Rate Limit für einen gegebenen Schlüssel
 */
export function checkRateLimit(
	identifier: string,
	config: RateLimitConfig,
	endpoint: string
): { allowed: boolean; remaining: number; resetTime: number } {
	const now = Date.now();
	const key = `${endpoint}:${identifier}`;

	let entry = rateLimitStore.get(key);

	// Neuer Eintrag oder Fenster abgelaufen
	if (!entry || entry.resetTime <= now) {
		entry = {
			count: 1,
			resetTime: now + config.windowMs,
			firstRequest: now
		};
		rateLimitStore.set(key, entry);

		logger.debug(
			{
				action: 'rate_limit_new_window',
				identifier,
				endpoint,
				resetTime: new Date(entry.resetTime).toISOString()
			},
			'New rate limit window started'
		);

		return {
			allowed: true,
			remaining: config.maxRequests - 1,
			resetTime: entry.resetTime
		};
	}

	// Rate limit erreicht
	if (entry.count >= config.maxRequests) {
		logger.warn(
			{
				event: 'security.rate_limit_hit',
				action: 'rate_limit_exceeded',
				identifier,
				endpoint,
				currentCount: entry.count,
				maxRequests: config.maxRequests,
				resetTime: new Date(entry.resetTime).toISOString(),
				windowStart: new Date(entry.firstRequest).toISOString()
			},
			'Rate limit exceeded'
		);

		return {
			allowed: false,
			remaining: 0,
			resetTime: entry.resetTime
		};
	}

	// Request erlaubt, Counter erhöhen
	entry.count++;
	rateLimitStore.set(key, entry);

	logger.debug(
		{
			action: 'rate_limit_incremented',
			identifier,
			endpoint,
			currentCount: entry.count,
			maxRequests: config.maxRequests,
			remaining: config.maxRequests - entry.count
		},
		'Rate limit incremented'
	);

	return {
		allowed: true,
		remaining: config.maxRequests - entry.count,
		resetTime: entry.resetTime
	};
}

/**
 * Erstellt einen eindeutigen Identifier basierend auf User und IP
 */
export function createRateLimitIdentifier(
	userSub: string | undefined,
	clientIp: string,
	isAuthenticated: boolean
): string {
	// Für authentifizierte User: Nutze User-ID
	if (isAuthenticated && userSub) {
		return `user:${userSub}`;
	}

	// Für anonyme User: Nutze IP-Adresse
	return `ip:${clientIp}`;
}

/**
 * Rate Limiting Middleware-Funktion
 */
export function enforceRateLimit(
	identifier: string,
	config: RateLimitConfig,
	endpoint: string
): { remaining: number; resetTime: number } {
	const result = checkRateLimit(identifier, config, endpoint);

	if (!result.allowed) {
		const resetDate = new Date(result.resetTime);
		const resetTimeFormatted = resetDate.toLocaleTimeString('de-DE');
		const retryAfterSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);

		throw error(
			429,
			`Rate limit exceeded. Try again after ${resetTimeFormatted} (${retryAfterSeconds}s)`
		);
	}

	return { remaining: result.remaining, resetTime: result.resetTime };
}

/**
 * Builds rate limit headers from an already-computed result.
 * Pure function — no side effects, no counter increment.
 */
export function buildRateLimitHeaders(
	config: RateLimitConfig,
	result: { remaining: number; resetTime: number }
): Record<string, string> {
	return {
		'X-RateLimit-Limit': config.maxRequests.toString(),
		'X-RateLimit-Remaining': result.remaining.toString(),
		'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
		'X-RateLimit-Window': Math.ceil(config.windowMs / 1000).toString()
	};
}
