import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createLogger } from '$lib/logger';

// Helper to get PUBLIC_SITE_URL dynamically (runtime, not build-time)
const getPublicSiteUrl = () => publicEnv.PUBLIC_SITE_URL ?? 'http://localhost:3000';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import type { SightingFormValues } from '$lib/types/Form';
import { formatLocalDateTime } from '$lib/utils/format/dateTime';
import {
	formatSightingForDisplay,
	isUnknownOrMissingSpecies
} from '$lib/utils/format/sightingFormatter';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import Handlebars from 'handlebars';
import { htmlToText as htmlToPlainText } from 'html-to-text';
import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ConfigRepository } from '../db/configRepository';

// Dynamic environment variables for Docker runtime
const NODE_ENV = env.NODE_ENV ?? 'development';
const SMTP_HOST = env.SMTP_HOST ?? '';
const SMTP_PORT = env.SMTP_PORT ?? '587';
const SMTP_USER = env.SMTP_USER ?? '';
const SMTP_PASSWORD = env.SMTP_PASSWORD ?? '';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger('emailService');

// Default email template as constant to avoid inline HTML
const DEFAULT_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="de">
<head>
	<meta charset="UTF-8">
	<title>Neue Sichtung - {{referenceId}}</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
	<h1>🐋 Neue Sichtung: {{referenceId}}</h1>
	<p><strong>Tierart:</strong> {{sighting.species}}</p>
	<p><strong>Datum:</strong> {{sighting.sightingDate}}</p>
	<p><strong>Position:</strong> {{sighting.coordinatesFormatted}}</p>
	<p><a href="{{adminUrl}}">Sichtung im Admin-Bereich anzeigen</a></p>
</body>
</html>`;

export interface EmailConfig {
	enabled: boolean;
	recipient: string;
	cc?: string[];
	bcc?: string[];
	sender: string;
	senderName: string;
	template: string;
	smtpHost?: string;
	smtpPort?: number;
	smtpSecure?: boolean;
	smtpUser?: string;
	smtpPassword?: string;
}

export class EmailService {
	private static transporter: Transporter | null = null;
	private static templateCache = new Map<string, HandlebarsTemplateDelegate>();
	private static configCache: { config: EmailConfig; timestamp: number } | null = null;
	private static readonly CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

	/**
	 * Initialize email service with configuration
	 */
	static async initialize(test = false): Promise<void> {
		try {
			const enabled = await ConfigRepository.getBoolean('notification.email.enabled', false);

			if (!enabled && !test) {
				logger.info('Email notifications are disabled');
				return;
			}

			// Get SMTP configuration
			const smtpHost = await ConfigRepository.getString('email.smtp.host', SMTP_HOST || '');
			const smtpPort = await ConfigRepository.getNumber(
				'email.smtp.port',
				parseInt(SMTP_PORT || '587')
			);
			const smtpSecure = await ConfigRepository.getBoolean('email.smtp.secure', false);
			const smtpUser = await ConfigRepository.getString('email.smtp.user', SMTP_USER || '');
			const smtpPassword = await ConfigRepository.getString(
				'email.smtp.password',
				SMTP_PASSWORD || ''
			);

			if (!smtpHost) {
				logger.warn('Email service not initialized: SMTP host not configured');
				return;
			}

			// Create transporter
			this.transporter = nodemailer.createTransport({
				host: smtpHost,
				port: smtpPort,
				secure: smtpSecure,
				auth: {
					user: smtpUser,
					pass: smtpPassword
				}
			});

			// Verify connection
			await this.transporter?.verify();
			logger.info('Email service initialized successfully');
		} catch (error) {
			logger.error({ error }, 'Failed to initialize email service');
			this.transporter = null;
		}
	}

	/**
	 * Send notification email for new sighting by ID (loads from database)
	 */
	static async sendNewSightingNotification(sightingId: number): Promise<boolean> {
		const sightingData = await this.loadSightingForEmail(sightingId);
		if (!sightingData) {
			return false;
		}

		// Send email using consolidated logic
		return this.sendEmailNotification(
			sightingData.sightingFormValues,
			sightingData.referenceId,
			sightingData.adminUrl
		);
	}

	/**
	 * Load sighting from database and convert to SightingFormValues format
	 * Ensures consistent data structure and includes processed inBalticSea values
	 */
	private static async loadSightingForEmail(sightingId: number): Promise<{
		sightingFormValues: SightingFormValues;
		referenceId: string;
		adminUrl: string;
	} | null> {
		try {
			const sightingResult = await db
				.select()
				.from(sightings)
				.where(eq(sightings.id, sightingId))
				.limit(1);

			if (!sightingResult || sightingResult.length === 0) {
				logger.error({ sightingId }, 'Sighting not found in database');
				return null;
			}

			const sighting = sightingResult[0];

			if (!sighting) {
				logger.error({ sightingId }, 'Sighting data is null');
				return null;
			}

			// Convert database sighting to SightingFormValues format
			// This ensures consistent data structure and includes processed inBalticSea values
			const sightingFormValues = {
				// Required core fields
				latitude: sighting.latitude ? parseFloat(sighting.latitude) : 0,
				longitude: sighting.longitude ? parseFloat(sighting.longitude) : 0,
				sightingDate: (sighting.sightingDate || new Date()).toISOString().split('T')[0] as string,
				sightingDatetime: sighting.sightingDate || undefined,
				species: sighting.species || 0,
				totalCount: sighting.totalCount || 1,
				firstName: sighting.firstName || '',
				lastName: sighting.lastName || '',
				email: sighting.email || '',
				privacyConsent: true, // Already saved, so consent was given
				// Optional fields with defaults
				juvenileCount: sighting.juvenileCount || 0,
				sightingFrom: sighting.sightingFrom || 0,
				mediaUpload: !!sighting.mediaUpload,
				behavior: sighting.behavior || undefined,
				distance: sighting.distance || 0,
				waterway: sighting.waterway || undefined,
				seaMark: sighting.seaMark || undefined,
				notes: sighting.notes || undefined,
				phone: sighting.phone || undefined,
				isDead: !!sighting.isDead,
				deadCondition: sighting.deadCondition || undefined,
				deadSize: sighting.deadSize || undefined,
				// Additional required form fields with reasonable defaults
				distribution: sighting.distribution || 0,
				reaction: sighting.reaction || undefined,
				seaState: sighting.seaState || 0,
				visibility: sighting.visibility || 0,
				boatDrive: sighting.boatDrive || 0,
				entryChannel: sighting.entryChannel || 0,
				nameConsent: !!sighting.nameConsent,
				shipNameConsent: !!sighting.shipNameConsent,
				// Required fields for form validation
				verified: !!sighting.verified,
				deadPhoneContact: !!sighting.deadPhoneContact,
				referenceId: sighting.referenceId || `REF-${sighting.id}`,
				hasPosition: !!(sighting.latitude && sighting.longitude),
				persistentDataConsent: true, // Already saved, so consent was given
				otherObservations: sighting.otherObservations || undefined,
				// ✅ These values are correctly processed from the database
				inBalticSea: !!sighting.inBalticSea,
				inBalticSeaGeo: !!sighting.inBalticSeaGeo
			} as SightingFormValues;

			// Build admin URL and reference ID
			const adminUrl = `${getPublicSiteUrl()}/admin/${sightingId}`;
			const referenceId = sighting.referenceId || `REF-${sightingId}`;

			return {
				sightingFormValues,
				referenceId,
				adminUrl
			};
		} catch (error) {
			logger.error({ error, sightingId }, 'Failed to load sighting from database');
			return null;
		}
	}


	/**
	 * Consolidated email sending logic
	 */
	private static async sendEmailNotification(
		sightingFormValues: SightingFormValues,
		referenceId: string,
		adminUrl: string
	): Promise<boolean> {
		try {
			const enabled = await ConfigRepository.getBoolean('notification.email.enabled', false);

			if (!enabled || !this.transporter) {
				logger.debug('Email notifications disabled or service not initialized');
				return false;
			}

			// Get email configuration
			const config = await this.getEmailConfig();

			if (!config.recipient) {
				logger.warn('Email notification recipient not configured');
				return false;
			}

			// Simple spam detection heuristics
			const spamIndicators = this.detectSpamIndicators(sightingFormValues);

			// Prepare template data with formatted enum values
			const formattedSighting = formatSightingForDisplay(sightingFormValues);
			const templateData = {
				referenceId,
				sighting: formattedSighting,
				adminUrl,
				currentDate: formatLocalDateTime(new Date(), 'date'),
				currentTime: formatLocalDateTime(new Date(), 'time'),
				spamCheck: spamIndicators
			};

			// Compile template
			const template = await this.getCompiledTemplate(config.template);
			const htmlContent = template(templateData);

			// Prepare mail options
			const mailOptions = {
				from: {
					name: config.senderName,
					address: config.sender
				},
				to: config.recipient,
				cc: config.recipient ? undefined : config.cc, // Don't use cc/bcc for test emails
				bcc: config.recipient ? undefined : config.bcc,
				subject: `Neue Sichtung: ${referenceId}`,
				html: htmlContent,
				text: this.htmlToText(htmlContent)
			};

			// Send email
			const info = await this.transporter.sendMail(mailOptions);

			logger.info(
				{
					messageId: info.messageId,
					referenceId,
					recipient: config.recipient
				},
				'Notification email sent successfully'
			);

			return true;
		} catch (error) {
			logger.error({ error, referenceId }, 'Failed to send notification email');
			return false;
		}
	}


	/**
	 * Send simple test email to verify configuration
	 */
	static async sendTestEmail(recipient?: string): Promise<boolean> {
		try {
			if (!this.transporter) {
				await this.initialize(true);
			}

			if (!this.transporter) {
				throw new Error('Email service not available');
			}

			const config = await this.getEmailConfig();
			const testRecipient = recipient || config.recipient;

			if (!testRecipient) {
				throw new Error('No recipient specified');
			}

			const mailOptions: SendMailOptions = {
				from: {
					name: config.senderName,
					address: config.sender
				},
				to: testRecipient,
				subject: 'Test E-Mail - Ostsee-Tiere Konfiguration',
				html: `
					<h2>Test E-Mail</h2>
					<p>Diese Test-E-Mail wurde erfolgreich von der Ostsee-Tiere Anwendung gesendet.</p>
					<p><strong>Zeitpunkt:</strong> ${new Date().toLocaleString('de-DE')}</p>
					<p><strong>Konfiguration:</strong> Funktioniert korrekt ✅</p>
				`,
				text: 'Test E-Mail - Die Ostsee-Tiere E-Mail Konfiguration funktioniert korrekt.'
			};

			const info = await this.transporter.sendMail(mailOptions);

			logger.info(
				{
					messageId: info.messageId,
					recipient: testRecipient
				},
				'Simple test email sent successfully'
			);

			return true;
		} catch (error) {
			logger.error({ error, recipient }, 'Failed to send simple test email');
			return false;
		}
	}

	/**
	 * Get email configuration from database with caching
	 */
	private static async getEmailConfig(): Promise<EmailConfig> {
		const now = Date.now();
		
		// Return cached config if still valid
		if (this.configCache && (now - this.configCache.timestamp) < this.CONFIG_CACHE_TTL) {
			return this.configCache.config;
		}

		// Fetch fresh config from database
		const config: EmailConfig = {
			enabled: await ConfigRepository.getBoolean('notification.email.enabled', false),
			recipient: await ConfigRepository.getString('notification.email.recipient', ''),
			cc: await ConfigRepository.getArray('notification.email.cc', []),
			bcc: await ConfigRepository.getArray('notification.email.bcc', []),
			sender: await ConfigRepository.getString(
				'notification.email.sender',
				'noreply@ostsee-tiere.de'
			),
			senderName: await ConfigRepository.getString('notification.email.senderName', 'Ostsee-Tiere'),
			template: await ConfigRepository.getString(
				'notification.email.template',
				this.getDefaultTemplate()
			)
		};

		// Cache the config
		this.configCache = { config, timestamp: now };
		return config;
	}

	/**
	 * Get compiled Handlebars template with hash-based caching
	 */
	private static async getCompiledTemplate(
		templateString: string
	): Promise<HandlebarsTemplateDelegate> {
		// Use simple hash for cache key instead of full template string
		const cacheKey = this.hashString(templateString);

		if (this.templateCache.has(cacheKey)) {
			return this.templateCache.get(cacheKey)!;
		}

		try {
			const template = Handlebars.compile(templateString);
			this.templateCache.set(cacheKey, template);
			return template;
		} catch (error) {
			logger.error({ error }, 'Failed to compile email template, using default');
			const defaultTemplate = Handlebars.compile(this.getDefaultTemplate());
			return defaultTemplate;
		}
	}

	/**
	 * Simple hash function for template caching
	 */
	private static hashString(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString(36);
	}

	/**
	 * Convert HTML to plain text for email
	 */
	private static htmlToText(html: string): string {
		return htmlToPlainText(html, {
			wordwrap: false
		}).trim();
	}

	/**
	 * Get default email template from file
	 */
	private static getDefaultTemplate(): string {
		try {
			const templatePath = join(__dirname, '../templates/sightingNotificationTemplate.html');
			return readFileSync(templatePath, 'utf-8');
		} catch (error) {
			logger.error({ error }, 'Failed to load email template file, using fallback');
			// Return fallback template constant
			return DEFAULT_EMAIL_TEMPLATE;
		}
	}

	/**
	 * Clear all caches
	 */
	static clearCaches(): void {
		this.templateCache.clear();
		this.configCache = null;
		logger.debug('Email service caches cleared');
	}

	/**
	 * Clear template cache (legacy method for backward compatibility)
	 * @deprecated Use clearCaches() instead
	 */
	static clearTemplateCache(): void {
		this.clearCaches();
	}

	/**
	 * Simple spam detection heuristics
	 */
	private static detectSpamIndicators(sighting: SightingFormValues): {
		score: number;
		indicators: string[];
		isHighRisk: boolean;
	} {
		try {
			const indicators: string[] = [];
			let score = 0;

			// Check for suspicious patterns
			const textFields = [
				sighting.notes || '',
				sighting.firstName || '',
				sighting.lastName || '',
				sighting.email || '',
				sighting.waterway || '',
				sighting.seaMark || ''
			]
				.join(' ')
				.toLowerCase();

			// Skip spam detection if no meaningful text content
			if (!textFields || textFields.length < 3) {
				return { score: 0, indicators: [], isHighRisk: false };
			}

			// Suspicious URLs or links
			if (/(https?:\/\/|www\.|\.com|\.org|\.de\/|\[url\]|\[link\])/i.test(textFields)) {
				indicators.push('Enthält verdächtige URLs oder Links');
				score += 3;
			}

			// Promotional/spam keywords
			const spamKeywords = [
				'sale',
				'discount',
				'free',
				'win',
				'prize',
				'money',
				'cash',
				'deal',
				'offer',
				'viagra',
				'casino',
				'loan'
			];
			const foundKeywords = spamKeywords.filter((keyword) => textFields.includes(keyword));
			if (foundKeywords.length > 0) {
				indicators.push(`Spam-Keywords gefunden: ${foundKeywords.join(', ')}`);
				score += foundKeywords.length * 2;
			}

			// Excessive punctuation or capitals
			if (/[!]{3,}|[?]{3,}|[A-Z]{10,}/.test(textFields)) {
				indicators.push('Übermäßige Satzzeichen oder Großbuchstaben');
				score += 2;
			}

			// Very short or missing essential data - use enum-aware check
			if (isUnknownOrMissingSpecies(sighting.species)) {
				indicators.push('Keine oder unbekannte Tierart angegeben');
				score += 1;
			}

			// Suspicious email patterns
			if (sighting.email) {
				if (sighting.email.includes('noreply') || sighting.email.includes('donotreply')) {
					indicators.push('Verdächtige E-Mail-Adresse (noreply)');
					score += 2;
				}
				if (/\d{5,}@/.test(sighting.email)) {
					indicators.push('E-Mail mit vielen Zahlen (verdächtig)');
					score += 1;
				}
			}

			// Position outside reasonable Baltic Sea area
			if (sighting.latitude && sighting.longitude) {
				const lat = Number(sighting.latitude);
				const lng = Number(sighting.longitude);
				if (lat < 53.0 || lat > 66.0 || lng < 9.0 || lng > 31.0) {
					indicators.push('Position weit außerhalb der Ostsee');
					score += 2;
				}
			}

			return {
				score,
				indicators,
				isHighRisk: score >= 5
			};
		} catch (error: unknown) {
			logger.warn({ error }, 'Error in spam detection, skipping');
			return { score: 0, indicators: ['Spam-Prüfung fehlgeschlagen'], isHighRisk: false };
		}
	}
}

// Initialize service on module load (but not in test environment)
if (typeof process !== 'undefined' && NODE_ENV !== 'test') {
	EmailService.initialize().catch((error) => {
		logger.error({ error }, 'Failed to initialize email service on startup');
	});
}
