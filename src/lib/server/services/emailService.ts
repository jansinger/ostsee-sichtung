import { SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { createLogger } from '$lib/logger';
import type { SightingFormValues } from '$lib/types/Form';
import { formatLocalDateTime } from '$lib/utils/format/dateTime';
import {
	formatSightingForDisplay,
	isUnknownOrMissingSpecies
} from '$lib/utils/format/sightingFormatter';
import { readFileSync } from 'fs';
import Handlebars from 'handlebars';
import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ConfigRepository } from '../db/configRepository';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger('emailService');

export interface EmailNotificationData {
	sighting: SightingFormValues;
	referenceId: string;
	adminUrl: string;
}

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
	 * Send notification email for new sighting
	 */
	static async sendNewSightingNotification(data: EmailNotificationData): Promise<boolean> {
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
			const spamIndicators = this.detectSpamIndicators(data.sighting);

			// Prepare template data with formatted enum values
			const formattedSighting = formatSightingForDisplay(data.sighting);
			const templateData = {
				referenceId: data.referenceId,
				sighting: formattedSighting,
				adminUrl: data.adminUrl,
				currentDate: formatLocalDateTime(new Date(), 'date'),
				currentTime: formatLocalDateTime(new Date(), 'time'),
				spamCheck: spamIndicators
			};

			// Compile template
			const template = await this.getCompiledTemplate(config.template);
			const htmlContent = template(templateData);

			// Prepare mail options
			const mailOptions: SendMailOptions = {
				from: {
					name: config.senderName,
					address: config.sender
				},
				to: config.recipient,
				cc: config.cc,
				bcc: config.bcc,
				subject: `Neue Sichtung: ${data.referenceId}`,
				html: htmlContent,
				text: this.htmlToText(htmlContent)
			};

			// Send email
			const info = await this.transporter.sendMail(mailOptions);

			logger.info(
				{
					messageId: info.messageId,
					referenceId: data.referenceId,
					recipient: config.recipient
				},
				'Notification email sent successfully'
			);

			return true;
		} catch (error) {
			logger.error({ error, referenceId: data.referenceId }, 'Failed to send notification email');
			return false;
		}
	}

	/**
	 * Send test email for an existing sighting
	 * Uses the actual sighting data with the notification template
	 */
	static async sendTestSightingEmail(sightingId: number, recipient?: string): Promise<boolean> {
		try {
			// Get sighting from database
			const { db } = await import('$lib/server/db');
			const { sightings } = await import('$lib/server/db/schema');
			const { eq } = await import('drizzle-orm');

			const sightingResult = await db
				.select()
				.from(sightings)
				.where(eq(sightings.id, sightingId))
				.limit(1);

			if (!sightingResult || sightingResult.length === 0) {
				logger.error({ sightingId }, 'Sighting not found for test email');
				return false;
			}

			const sighting = sightingResult[0];

			if (!sighting) {
				logger.error({ sightingId }, 'Sighting data is null');
				return false;
			}

			// Convert database sighting to a simpler format for email template
			const sightingFormValues: any = {
				latitude: sighting.latitude ? parseFloat(sighting.latitude) : 0,
				longitude: sighting.longitude ? parseFloat(sighting.longitude) : 0,
				sightingDatetime: sighting.sightingDate || undefined,
				species: sighting.species || 0,
				totalCount: sighting.totalCount || 1,
				behavior: sighting.behavior || undefined,
				distance: sighting.distance || 0,
				waterway: sighting.waterway || undefined,
				seaMark: sighting.seaMark || undefined,
				notes: sighting.notes || undefined,
				firstName: sighting.firstName || '',
				lastName: sighting.lastName || '',
				email: sighting.email || '',
				phone: sighting.phone || undefined,
				isDead: !!sighting.isDead,
				deadCondition: sighting.deadCondition || undefined,
				deadSize: sighting.deadSize || undefined,
				inBalticSea: !!sighting.inBalticSea,
				inBalticSeaGeo: !!sighting.inBalticSeaGeo
			};

			// Build admin URL with correct format
			const adminUrl = `${PUBLIC_SITE_URL}/admin/${sightingId}`;

			// Send notification with test recipient
			if (recipient) {
				// Override recipient for test
				const config = await this.getEmailConfig();
				const originalRecipient = config.recipient;

				// Temporarily set test recipient
				await ConfigRepository.set('notification.email.recipient', recipient);

				try {
					const result = await this.sendNewSightingNotification({
						sighting: sightingFormValues,
						referenceId: sighting.referenceId || `TEST-${sightingId}`,
						adminUrl
					});

					// Restore original recipient
					if (originalRecipient) {
						await ConfigRepository.set('notification.email.recipient', originalRecipient);
					}

					return result;
				} catch (error) {
					// Restore original recipient on error
					if (originalRecipient) {
						await ConfigRepository.set('notification.email.recipient', originalRecipient);
					}
					throw error;
				}
			} else {
				// Use configured recipient
				return await this.sendNewSightingNotification({
					sighting: sightingFormValues,
					referenceId: sighting.referenceId || `TEST-${sightingId}`,
					adminUrl
				});
			}
		} catch (error) {
			logger.error({ error, sightingId, recipient }, 'Failed to send test sighting email');
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
	 * Get email configuration from database
	 */
	private static async getEmailConfig(): Promise<EmailConfig> {
		return {
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
	}

	/**
	 * Get compiled Handlebars template
	 */
	private static async getCompiledTemplate(
		templateString: string
	): Promise<HandlebarsTemplateDelegate> {
		const cacheKey = templateString;

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
	 * Convert HTML to plain text for email
	 */
	private static htmlToText(html: string): string {
		return html
			.replace(/<[^>]*>/g, '')
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/\s+/g, ' ')
			.trim();
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
			// Fallback template if file cannot be loaded
			return `
<!DOCTYPE html>
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
		}
	}

	/**
	 * Clear template cache
	 */
	static clearTemplateCache(): void {
		this.templateCache.clear();
		logger.debug('Email template cache cleared');
	}

	/**
	 * Simple spam detection heuristics
	 */
	private static detectSpamIndicators(sighting: SightingFormValues): {
		score: number;
		indicators: string[];
		isHighRisk: boolean;
	} {
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
	}
}

// Initialize service on module load
EmailService.initialize().catch((error) => {
	logger.error({ error }, 'Failed to initialize email service on startup');
});
