import { createLogger } from '$lib/logger';
import { ConfigRepository, type ConfigItem } from '$lib/server/db/configRepository';

const logger = createLogger('configInitializer');

const defaultConfigurations: ConfigItem[] = [
	// Email Settings
	{
		key: 'notification.email.enabled',
		value: false,
		description: 'E-Mail Benachrichtigungen für neue Sichtungen aktivieren',
		category: 'email'
	},
	{
		key: 'notification.email.recipient',
		value: '',
		description: 'E-Mail Adresse für Benachrichtigungen über neue Sichtungen',
		category: 'email'
	},
	{
		key: 'notification.email.sender',
		value: 'noreply@ostsee-tiere.de',
		description: 'Absender E-Mail Adresse',
		category: 'email'
	},
	{
		key: 'notification.email.senderName',
		value: 'Ostsee-Tiere',
		description: 'Name des E-Mail Absenders',
		category: 'email'
	},
	{
		key: 'notification.email.template',
		value: `<!DOCTYPE html>
<html lang="de">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Neue Sichtung - {{referenceId}}</title>
	<style>
		.alert-warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; }
		.alert-success { background: #dcfce7; border-left: 4px solid #10b981; padding: 12px; margin: 16px 0; }
		.alert-info { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 12px; margin: 16px 0; }
		.badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
		.badge-success { background: #10b981; color: white; }
		.badge-warning { background: #f59e0b; color: white; }
		.badge-error { background: #ef4444; color: white; }
		.coordinates { font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; }
	</style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333;">
	<!-- Header -->
	<div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
		<h1 style="margin: 0; font-size: 24px;">🐋 Neue Sichtung eingegangen</h1>
		<p style="margin: 8px 0 0 0; opacity: 0.9;">Referenz: <strong>{{referenceId}}</strong></p>
		<p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.8;">{{currentDate}} um {{currentTime}}</p>
	</div>

	<!-- Spam Check Warning -->
	{{#if spamCheck.isHighRisk}}
	<div class="alert-warning">
		<h4 style="margin: 0 0 8px 0; color: #f59e0b;">⚠️ Spam-Verdacht (Score: {{spamCheck.score}})</h4>
		<ul style="margin: 8px 0 0 20px; padding: 0;">
			{{#each spamCheck.indicators}}
			<li style="margin: 4px 0;">{{this}}</li>
			{{/each}}
		</ul>
		<p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Hinweis:</strong> Bitte prüfen Sie diese Sichtung besonders sorgfältig.</p>
	</div>
	{{/if}}

	<!-- Geographic Validation -->
	{{#if sighting.coordinatesFormatted}}
	<div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
		<h3 style="margin: 0 0 16px 0; color: #1e293b; display: flex; align-items: center;">
			📍 Positionsangabe
			{{#if sighting.inBalticSeaGeo}}
				<span class="badge badge-success" style="margin-left: 12px;">Ostsee ✓</span>
			{{else}}
				{{#if sighting.inBalticSea}}
					<span class="badge badge-warning" style="margin-left: 12px;">Ostsee-Rand</span>
				{{else}}
					<span class="badge badge-error" style="margin-left: 12px;">Außerhalb Ostsee</span>
				{{/if}}
			{{/if}}
		</h3>
		<p><strong>Koordinaten:</strong> <span class="coordinates">{{sighting.coordinatesFormatted}}</span></p>
		{{#if sighting.waterway}}
		<p><strong>Gewässer:</strong> {{sighting.waterway}}</p>
		{{/if}}
		{{#if sighting.seaMark}}
		<p><strong>Seezeichen:</strong> {{sighting.seaMark}}</p>
		{{/if}}
		
		{{#unless sighting.inBalticSeaGeo}}
		<div class="alert-info">
			<p style="margin: 0; font-size: 14px;">
				{{#if sighting.inBalticSea}}
				<strong>Info:</strong> Position liegt am Rand der Ostsee - bitte Plausibilität prüfen.
				{{else}}
				<strong>Achtung:</strong> Position liegt außerhalb der Ostsee - möglicherweise fehlerhaft!
				{{/if}}
			</p>
		</div>
		{{/unless}}
	</div>
	{{/if}}

	<!-- Sighting Details -->
	<div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
		<h3 style="margin: 0 0 16px 0; color: #1e293b;">🔍 Sichtungsdetails</h3>
		<table style="width: 100%; border-collapse: collapse;">
			<tr>
				<td style="padding: 8px 12px 8px 0; font-weight: bold; vertical-align: top; width: 120px;">Datum:</td>
				<td style="padding: 8px 0;">{{sighting.sightingDate}}</td>
			</tr>
			{{#if sighting.species}}
			<tr>
				<td style="padding: 8px 12px 8px 0; font-weight: bold; vertical-align: top;">Tierart:</td>
				<td style="padding: 8px 0;">{{sighting.species}}</td>
			</tr>
			{{/if}}
			{{#if sighting.totalCount}}
			<tr>
				<td style="padding: 8px 12px 8px 0; font-weight: bold; vertical-align: top;">Anzahl:</td>
				<td style="padding: 8px 0;">{{sighting.totalCount}}</td>
			</tr>
			{{/if}}
			{{#if sighting.distance}}
			<tr>
				<td style="padding: 8px 12px 8px 0; font-weight: bold; vertical-align: top;">Entfernung:</td>
				<td style="padding: 8px 0;">{{sighting.distance}}</td>
			</tr>
			{{/if}}
			{{#if sighting.behavior}}
			<tr>
				<td style="padding: 8px 12px 8px 0; font-weight: bold; vertical-align: top;">Verhalten:</td>
				<td style="padding: 8px 0;">{{sighting.behavior}}</td>
			</tr>
			{{/if}}
		</table>
	</div>

	<!-- Contact Information -->
	{{#if sighting.email}}
	<div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
		<h3 style="margin: 0 0 16px 0; color: #1e293b;">👤 Kontaktdaten</h3>
		{{#if sighting.firstName}}
		<p><strong>Name:</strong> {{sighting.firstName}} {{sighting.lastName}}</p>
		{{/if}}
		<p><strong>E-Mail:</strong> <a href="mailto:{{sighting.email}}" style="color: #0ea5e9;">{{sighting.email}}</a></p>
		{{#if sighting.phone}}
		<p><strong>Telefon:</strong> <a href="tel:{{sighting.phone}}" style="color: #0ea5e9;">{{sighting.phone}}</a></p>
		{{/if}}
	</div>
	{{/if}}

	<!-- Notes -->
	{{#if sighting.notes}}
	<div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
		<h3 style="margin: 0 0 12px 0; color: #92400e;">💬 Bemerkungen</h3>
		<p style="margin: 0; white-space: pre-wrap;">{{sighting.notes}}</p>
	</div>
	{{/if}}

	<!-- Additional Spam Indicators -->
	{{#if spamCheck.indicators}}
	{{#unless spamCheck.isHighRisk}}
	{{#if spamCheck.score}}
	<div style="background: #fef3c7; padding: 16px; border-radius: 6px; margin: 20px 0; font-size: 14px;">
		<p style="margin: 0 0 8px 0;"><strong>Hinweise zur Qualitätsprüfung (Score: {{spamCheck.score}}):</strong></p>
		<ul style="margin: 0; padding-left: 20px;">
			{{#each spamCheck.indicators}}
			<li style="margin: 2px 0;">{{this}}</li>
			{{/each}}
		</ul>
	</div>
	{{/if}}
	{{/unless}}
	{{/if}}
	
	<!-- Action Button -->
	<div style="text-align: center; margin: 32px 0;">
		<a href="{{adminUrl}}" style="display: inline-block; background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 12px rgba(29, 78, 216, 0.3);">
			🔍 Sichtung im Admin-Bereich prüfen
		</a>
	</div>

	<!-- Footer -->
	<div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
		<p style="margin: 0;">Ostsee-Tiere · Sichtungsmeldungen für den Meeresschutz</p>
		<p style="margin: 8px 0 0 0;">Diese E-Mail wurde automatisch generiert am {{currentDate}} um {{currentTime}}</p>
	</div>
</body>
</html>`,
		description: 'HTML Template für E-Mail Benachrichtigungen (Handlebars Syntax)',
		category: 'email'
	},
	{
		key: 'email.smtp.host',
		value: '',
		description: 'SMTP Server Hostname',
		category: 'email'
	},
	{
		key: 'email.smtp.port',
		value: 587,
		description: 'SMTP Server Port',
		category: 'email'
	},
	{
		key: 'email.smtp.secure',
		value: false,
		description: 'SMTP SSL/TLS verwenden',
		category: 'email'
	},
	{
		key: 'email.smtp.user',
		value: '',
		description: 'SMTP Benutzername',
		category: 'email'
	},
	{
		key: 'email.smtp.password',
		value: '',
		description: 'SMTP Passwort',
		category: 'email'
	},

	// Display Settings
	{
		key: 'display.maxSightingsPerPage',
		value: 50,
		description: 'Maximale Anzahl Sichtungen pro Seite in der Admin-Übersicht',
		category: 'display'
	},
	{
		key: 'display.defaultMapCenter',
		value: { lat: 54.5, lng: 13.5 },
		description: 'Standard Kartenzentrum (Ostsee)',
		category: 'display'
	},
	{
		key: 'display.defaultMapZoom',
		value: 7,
		description: 'Standard Zoom-Level für Karten',
		category: 'display'
	},
	{
		key: 'display.showUnapprovedOnMap',
		value: false,
		description: 'Ungeprüfte Sichtungen auf öffentlicher Karte anzeigen',
		category: 'display'
	},
	{
		key: 'display.dateFormat',
		value: 'DD.MM.YYYY',
		description: 'Standard Datumsformat',
		category: 'display'
	},
	{
		key: 'display.maintenanceMode',
		value: false,
		description: 'Wartungsmodus aktivieren',
		category: 'display'
	},
	{
		key: 'display.maintenanceMessage',
		value: 'Die Anwendung wird gewartet. Bitte versuchen Sie es später erneut.',
		description: 'Nachricht für Wartungsmodus',
		category: 'display'
	},

	// Security Settings
	{
		key: 'security.maxFileSize',
		value: 10,
		description: 'Maximale Dateigröße für Uploads in MB',
		category: 'security'
	},
	{
		key: 'security.allowedFileTypes',
		value: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'],
		description: 'Erlaubte MIME-Typen für Datei-Uploads',
		category: 'security'
	},
	{
		key: 'security.rateLimitPerIP',
		value: 10,
		description: 'Maximale Anzahl Requests pro IP pro Minute',
		category: 'security'
	},
	{
		key: 'security.requireEmailVerification',
		value: false,
		description: 'E-Mail Verifikation für neue Sichtungen erforderlich',
		category: 'security'
	},
	{
		key: 'security.autoApproveThreshold',
		value: 5,
		description: 'Auto-Genehmigung nach X verifizierten Meldungen vom selben Benutzer',
		category: 'security'
	},

	// Data Processing Settings
	{
		key: 'data.autoVerifyBalticSea',
		value: true,
		description: 'Automatische Verifizierung von Sichtungen in Ostsee-Gebieten',
		category: 'data'
	},
	{
		key: 'data.duplicateCheckRadius',
		value: 1,
		description: 'Radius für Duplikatsprüfung in Kilometern',
		category: 'data'
	},
	{
		key: 'data.duplicateCheckTimeframe',
		value: 24,
		description: 'Zeitfenster für Duplikatsprüfung in Stunden',
		category: 'data'
	},
	{
		key: 'data.exportFormats',
		value: ['csv', 'json', 'kml', 'xml'],
		description: 'Verfügbare Export-Formate',
		category: 'data'
	},
	{
		key: 'data.archiveAfterDays',
		value: 0,
		description: 'Sichtungen archivieren nach X Tagen (0 = nie)',
		category: 'data'
	},

	// Integration Settings
	{
		key: 'integration.mapTileProvider',
		value: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
		description: 'URL Template für Karten-Tiles',
		category: 'integration'
	},
	{
		key: 'integration.weatherApiKey',
		value: '',
		description: 'API Schlüssel für Wetterdaten',
		category: 'integration'
	},
	{
		key: 'integration.geoApiKey',
		value: '',
		description: 'API Schlüssel für Geocoding',
		category: 'integration'
	},
	{
		key: 'integration.webhookUrl',
		value: '',
		description: 'Webhook URL für neue Sichtungen (optional)',
		category: 'integration'
	},

	// Mobile App Settings
	{
		key: 'mobile.minAppVersion',
		value: '1.0.0',
		description: 'Minimale unterstützte App-Version',
		category: 'mobile'
	},
	{
		key: 'mobile.updateMessage',
		value:
			'Eine neue Version der App ist verfügbar. Bitte aktualisieren Sie für die beste Erfahrung.',
		description: 'Nachricht für App-Updates',
		category: 'mobile'
	},
	{
		key: 'mobile.apiRateLimit',
		value: 100,
		description: 'API Rate-Limit für Mobile Apps pro Minute',
		category: 'mobile'
	}
];

/**
 * Initialize default configurations in the database
 */
export async function initializeDefaultConfigurations(): Promise<void> {
	try {
		logger.info('Initializing default configurations...');

		const insertedCount = await ConfigRepository.insertManyIfAbsent(
			defaultConfigurations,
			'system'
		);
		const skippedCount = defaultConfigurations.length - insertedCount;

		logger.info(
			{
				total: defaultConfigurations.length,
				inserted: insertedCount,
				skipped: skippedCount
			},
			'Default configurations initialization completed'
		);
	} catch (error) {
		logger.error({ error }, 'Failed to initialize default configurations');
		throw error;
	}
}

/**
 * Reset all configurations to default values
 * WARNING: This will overwrite all existing configurations!
 */
export async function resetToDefaultConfigurations(): Promise<void> {
	try {
		logger.warn('Resetting all configurations to defaults...');

		await ConfigRepository.upsertMany(defaultConfigurations, 'system');

		// Clear cache
		ConfigRepository.clearCache();

		logger.warn('All configurations have been reset to defaults');
	} catch (error) {
		logger.error({ error }, 'Failed to reset configurations to defaults');
		throw error;
	}
}

/**
 * Get list of all available configuration keys
 */
export function getAvailableConfigurationKeys(): string[] {
	return defaultConfigurations.map((config) => config.key);
}

/**
 * Get configuration categories
 */
export function getConfigurationCategories(): string[] {
	const categories = new Set(defaultConfigurations.map((config) => config.category));
	return Array.from(categories).sort();
}

/**
 * Get default configurations grouped by category
 */
export function getDefaultConfigurationsByCategory(): Record<string, ConfigItem[]> {
	return defaultConfigurations.reduce(
		(acc, config) => {
			if (!acc[config.category]) {
				acc[config.category] = [];
			}
			acc[config.category]?.push(config);
			return acc;
		},
		{} as Record<string, ConfigItem[]>
	);
}
