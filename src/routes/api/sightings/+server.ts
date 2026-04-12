import { env } from '$env/dynamic/private';
import { sightingSchema } from '$lib/form/validation/sightingSchema';
import { createLogger } from '$lib/logger';
import { EntryChannelEnum } from '$lib/report/formOptions/entryChannel';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { saveSighting } from '$lib/server/db/sightingRepository';
import { EmailService } from '$lib/server/services/emailService';
import type { StoredWeatherData } from '$lib/services/weatherService';
import {
	checkForbiddenAdminFields,
	validateSightingFormData
} from '$lib/server/validation/requestValidation';
import { ServerConfigService } from '$lib/services/configService';
import type { SightingFormValues } from '$lib/types/Form';
import { json, isHttpError, type RequestEvent } from '@sveltejs/kit';
import { and, gte, lt, sql } from 'drizzle-orm';
import { ValidationError } from 'yup';
import type { RequestHandler } from './$types';
import {
	enforceRateLimit,
	RATE_LIMITS,
	createRateLimitIdentifier
} from '$lib/server/middleware/rateLimit';

// Dynamic environment variable for Docker runtime
const NODE_ENV = env.NODE_ENV ?? 'development';

// Logger für diesen API-Endpunkt erstellen
const logger = createLogger('api:sightings');

export async function GET(event: RequestEvent) {
	try {
		// Jahr aus Query-Parameter holen, Standard ist das aktuelle Jahr
		const year = event.url.searchParams.get('year')
			? parseInt(event.url.searchParams.get('year') as string)
			: new Date().getFullYear();

		// Zeitraum für das angegebene Jahr festlegen
		const startDate = new Date(year, 0, 1); // 1. Januar des angegebenen Jahres
		const endDate = new Date(year + 1, 0, 1); // 1. Januar des nächsten Jahres

		logger.debug({ year, startDate, endDate }, 'Sichtungen abrufen');

		// Abfrage der Sichtungen für das angegebene Jahr
		const result = await db
			.select({
				id: sightings.id,
				ts: sightings.created,
				dt: sql<string>`to_char(${sightings.sightingDate}, 'DD.MM.YYYY')`,
				ti: sql<string>`to_char(${sightings.sightingDate}, 'HH24:MI')`,
				lat: sightings.latitude,
				lon: sightings.longitude,
				ct: sightings.totalCount,
				yo: sightings.juvenileCount,
				ta: sightings.species,
				tf: sightings.isDead,
				na: sql<string>`CASE WHEN ${sightings.nameConsent} = 1 THEN 
                    CONCAT(${sightings.firstName}, ' ', ${sightings.lastName}) 
                    ELSE NULL END`,
				ar: sightings.waterway,
				sh: sql<string>`CASE WHEN ${sightings.shipNameConsent} = 1 THEN 
                     ${sightings.shipName} 
                     ELSE NULL END`
			})
			.from(sightings)
			.where(and(gte(sightings.sightingDate, startDate), lt(sightings.sightingDate, endDate)))
			.orderBy(sightings.sightingDate);

		logger.info({ year, count: result.length }, 'Sichtungen erfolgreich abgerufen');

		// Cache-Header setzen (1 Stunde)
		event.setHeaders({
			'Cache-Control': 'max-age=3600',
			'Content-Type': 'application/json'
		});

		// JSON-Antwort zurückgeben
		return json(result);
	} catch (error) {
		logger.error(error, 'Fehler beim Abrufen der Sichtungen');
		return json({ error: 'Fehler beim Abrufen der Daten' }, { status: 500 });
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const userIdentifier = locals.user?.sub || 'anonymous';
	const isAuthenticated = !!locals.user;
	const clientIp =
		request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

	// Security audit logging
	logger.info(
		{
			action: 'sighting_submission',
			user: userIdentifier,
			authenticated: isAuthenticated,
			clientIp,
			userAgent: request.headers.get('user-agent') || 'unknown'
		},
		'Sighting submission attempt'
	);

	// Rate limiting: 20 submissions per hour per user/IP
	enforceRateLimit(
		createRateLimitIdentifier(locals.user?.sub, clientIp, isAuthenticated),
		RATE_LIMITS.SIGHTING_SUBMISSION,
		'api:sightings:post'
	);

	try {
		// Daten aus dem Request-Body extrahieren
		const requestBody = await request.json();

		// Security: Check for honeypot field
		if (requestBody._honeypot) {
			logger.warn(
				{
					action: 'sighting_honeypot_triggered',
					clientIp,
					user: userIdentifier
				},
				'Honeypot field detected - likely spam'
			);
			throw new ValidationError('Invalid form submission');
		}

		logger.debug({ requestBody }, 'Sichtung speichern - Request empfangen');

		// 1. Prüfe auf verbotene Admin-Felder
		const adminFieldCheck = checkForbiddenAdminFields(requestBody);
		if (adminFieldCheck.hasForbiddenFields) {
			logger.warn(
				{ forbiddenFields: adminFieldCheck.forbiddenFields },
				'Verbotene Admin-Felder in Request'
			);

			return json(
				{
					success: false,
					code: 'FORBIDDEN_FIELDS',
					message: `Die folgenden Felder dürfen nicht von Clients gesetzt werden: ${adminFieldCheck.forbiddenFields.join(', ')}`,
					forbiddenFields: adminFieldCheck.forbiddenFields
				},
				{ status: 403 }
			);
		}

		// 2. Validiere erlaubte Felder (Whitelist)
		const fieldValidation = validateSightingFormData(requestBody);
		if (!fieldValidation.isValid) {
			logger.warn(
				{
					rejectedFields: fieldValidation.rejectedFields,
					error: fieldValidation.error
				},
				'Unerlaubte Felder in Request'
			);

			return json(
				{
					success: false,
					code: 'INVALID_FIELDS',
					message: fieldValidation.error,
					rejectedFields: fieldValidation.rejectedFields
				},
				{ status: 400 }
			);
		}

		const formData = fieldValidation.data!;
		logger.debug({ formData }, 'Bereinigte Sichtungsdaten');

		// 3. Validierung der Formulardaten mit Schema
		// Setze Server-seitige Defaults für Felder, die nicht von Clients gesetzt werden dürfen
		const formDataWithDefaults: SightingFormValues = {
			...formData,
			entryChannel: formData.entryChannel ?? EntryChannelEnum.WEB, // Default: Web (0)
			verified: false, // Immer false für neue Client-Sichtungen
			internalComment: undefined // Keine internen Kommentare von Clients
		};

		await sightingSchema.validate(formDataWithDefaults, { abortEarly: false });

		// Extract and validate weather data from form if available
		let weatherData: StoredWeatherData | undefined;
		if (formDataWithDefaults.weatherData) {
			const { validateWeatherData } = await import('$lib/server/validation/weatherDataValidation');
			const weatherResult = validateWeatherData(formDataWithDefaults.weatherData);
			if (weatherResult.valid) {
				weatherData = formDataWithDefaults.weatherData as StoredWeatherData;
				logger.info(
					{ sightingRef: formDataWithDefaults.referenceId, weatherDataType: weatherData.data_type },
					'Saving sighting with validated weather data'
				);
			} else {
				logger.warn(
					{ sightingRef: formDataWithDefaults.referenceId, reason: weatherResult.reason },
					'Client weather data rejected - saving sighting without weather'
				);
			}
		} else {
			logger.debug(
				{ sightingRef: formDataWithDefaults.referenceId },
				'No weather data provided with sighting'
			);
		}

		const { id } = await saveSighting(formDataWithDefaults, weatherData);
		const referenceId = formDataWithDefaults.referenceId || `REF-${id}`;

		logger.info({ id, referenceId }, 'Sichtung erfolgreich gespeichert');

		// Send email notification if enabled
		try {
			const emailConfig = await ServerConfigService.getEmailConfig();
			if (emailConfig.enabled && emailConfig.recipient && id) {
				// Use new ID-based email service that reads from database
				// This ensures correct Baltic Sea validation data is used
				await EmailService.sendNewSightingNotification(id);

				logger.info({ id, referenceId }, 'Email notification sent successfully');
			}
		} catch (emailError) {
			// Don't fail the request if email sending fails
			logger.error({ emailError, id }, 'Failed to send email notification, but sighting was saved');
		}

		// Erfolgreiche Antwort
		return json({ success: true, id, referenceId }, { status: 201 });
	} catch (error: unknown) {
		// Re-throw SvelteKit HTTP errors (e.g. 429 rate limit) so they propagate correctly
		if (isHttpError(error)) throw error;

		// Prüfen, ob es sich um einen Yup-Validierungsfehler handelt
		if (
			(typeof error === 'object' &&
				error !== null &&
				'name' in error &&
				error.name === 'ValidationError') ||
			error instanceof ValidationError
		) {
			// Strukturierte Fehlerausgabe für Validierungsfehler
			const validationErrors: Record<string, string> = {};

			// Yup sammelt die Fehler in einem errors-Array, wenn abortEarly: false
			if ('inner' in error && Array.isArray(error.inner)) {
				error.inner.forEach((validationError) => {
					const path = validationError.path || 'unbekanntesFeld';
					validationErrors[path] = validationError.message;
				});
			} else {
				// Fallback für den Fall, dass die Fehlerstruktur anders ist
				validationErrors.allgemein =
					'message' in error && typeof error.message === 'string'
						? error.message
						: 'Unbekannter Validierungsfehler';
			}

			logger.warn({ validationErrors }, 'Validierungsfehler bei Sichtung');

			return json(
				{
					success: false,
					code: 'VALIDATION_ERROR',
					message: 'Validierungsfehler bei der Eingabe',
					errors: validationErrors
				},
				{ status: 400 }
			);
		}

		// Datenbankfehler
		if (
			typeof error === 'object' &&
			error !== null &&
			'code' in error &&
			typeof error.code === 'string' &&
			error.code.startsWith('23')
		) {
			// PostgreSQL-Fehler mit Integritätsverletzungen (23xxx)
			logger.error(error, 'Datenbankfehler beim Speichern der Sichtung');
			return json(
				{
					success: false,
					code: 'DATABASE_ERROR',
					message: 'Die Daten konnten nicht in der Datenbank gespeichert werden',
					detail:
						NODE_ENV === 'development'
							? 'detail' in error
								? error.detail
								: String(error)
							: undefined
				},
				{ status: 422 }
			);
		}

		// Allgemeiner Fehler
		logger.error(error, 'Fehler beim Speichern der Sichtung');

		return json(
			{
				success: false,
				code: 'SERVER_ERROR',
				message: 'Ein unbekannter Fehler ist aufgetreten',
				detail:
					NODE_ENV === 'development'
						? error instanceof Error
							? error.message
							: String(error)
						: undefined
			},
			{ status: 500 }
		);
	}
};
