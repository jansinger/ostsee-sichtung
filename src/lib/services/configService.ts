import { browser } from '$app/environment';
import { createLogger } from '$lib/logger';
import { ConfigRepository } from '$lib/server/db/configRepository';

const logger = createLogger('configService');

// Default fallback values - these ensure the app works without database configurations
const DEFAULT_VALUES = {
	// Email Settings
	'notification.email.enabled': false,
	'notification.email.recipient': '',
	'notification.email.sender': 'noreply@ostsee-tiere.de',
	'notification.email.senderName': 'Ostsee-Tiere',
	'notification.email.template': '',
	
	// Display Settings
	'display.maxSightingsPerPage': 50,
	'display.defaultMapCenter': { lat: 54.5, lng: 13.5 },
	'display.defaultMapZoom': 7,
	'display.showUnapprovedOnMap': false,
	'display.dateFormat': 'DD.MM.YYYY',
	'display.maintenanceMode': false,
	'display.maintenanceMessage': 'Die Anwendung wird gewartet. Bitte versuchen Sie es später erneut.',
	
	// Security Settings
	'security.maxFileSize': 10,
	'security.allowedFileTypes': ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'],
	'security.rateLimitPerIP': 10,
	'security.requireEmailVerification': false,
	'security.autoApproveThreshold': 5,
	
	// Data Processing Settings
	'data.autoVerifyBalticSea': true,
	'data.duplicateCheckRadius': 1,
	'data.duplicateCheckTimeframe': 24,
	'data.exportFormats': ['csv', 'json', 'kml', 'xml'],
	'data.archiveAfterDays': 0,
	
	// Integration Settings
	'integration.mapTileProvider': 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	'integration.weatherApiKey': '',
	'integration.geoApiKey': '',
	'integration.webhookUrl': '',
	
	// Mobile App Settings
	'mobile.minAppVersion': '1.0.0',
	'mobile.updateMessage': 'Eine neue Version der App ist verfügbar. Bitte aktualisieren Sie für die beste Erfahrung.',
	'mobile.apiRateLimit': 100
} as const;

// In-memory cache for client-side usage
let clientConfigCache: Record<string, ConfigValue> = {};
let clientCacheTimestamp = 0;
const CLIENT_CACHE_TTL = 300000; // 5 minutes

/**
 * Server-side configuration service with database access
 */
export class ServerConfigService {
	/**
	 * Get a configuration value with fallback to default
	 */
	static async get<T>(key: keyof typeof DEFAULT_VALUES): Promise<T> {
		try {
			const value = await ConfigRepository.get(key);
			return value !== null ? (value as T) : (DEFAULT_VALUES[key] as T);
		} catch (error) {
			logger.error({ error, key }, 'Failed to get config, using default');
			return DEFAULT_VALUES[key] as unknown as T;
		}
	}

	/**
	 * Get typed configuration values with proper fallbacks
	 */
	static async getString(key: keyof typeof DEFAULT_VALUES): Promise<string> {
		const value = await this.get(key);
		return String(value);
	}

	static async getNumber(key: keyof typeof DEFAULT_VALUES): Promise<number> {
		const value = await this.get(key);
		return Number(value);
	}

	static async getBoolean(key: keyof typeof DEFAULT_VALUES): Promise<boolean> {
		const value = await this.get(key);
		return Boolean(value);
	}

	static async getArray<T>(key: keyof typeof DEFAULT_VALUES): Promise<T[]> {
		const value = await this.get(key);
		return Array.isArray(value) ? value : [];
	}

	static async getObject<T extends Record<string, unknown>>(key: keyof typeof DEFAULT_VALUES): Promise<T> {
		const value = await this.get(key);
		return typeof value === 'object' && value !== null && !Array.isArray(value) 
			? value as T 
			: DEFAULT_VALUES[key] as unknown as T;
	}

	/**
	 * Check if maintenance mode is enabled
	 */
	static async isMaintenanceModeEnabled(): Promise<boolean> {
		try {
			return await this.getBoolean('display.maintenanceMode');
		} catch (error) {
			logger.error({ error }, 'Error checking maintenance mode - defaulting to false');
			return false;
		}
	}

	/**
	 * Get pagination settings
	 */
	static async getPaginationConfig() {
		return {
			maxSightingsPerPage: await this.getNumber('display.maxSightingsPerPage'),
			defaultPageSize: Math.min(await this.getNumber('display.maxSightingsPerPage'), 50)
		};
	}

	/**
	 * Get map configuration
	 */
	static async getMapConfig() {
		return {
			center: await this.getObject<{ lat: number; lng: number }>('display.defaultMapCenter'),
			zoom: await this.getNumber('display.defaultMapZoom'),
			tileProvider: await this.getString('integration.mapTileProvider'),
			showUnapprovedSightings: await this.getBoolean('display.showUnapprovedOnMap')
		};
	}

	/**
	 * Get file upload configuration
	 */
	static async getUploadConfig() {
		return {
			maxFileSize: await this.getNumber('security.maxFileSize'),
			allowedTypes: await this.getArray<string>('security.allowedFileTypes'),
			maxFileSizeBytes: (await this.getNumber('security.maxFileSize')) * 1024 * 1024
		};
	}

	/**
	 * Get email configuration
	 */
	static async getEmailConfig() {
		return {
			enabled: await this.getBoolean('notification.email.enabled'),
			recipient: await this.getString('notification.email.recipient'),
			sender: await this.getString('notification.email.sender'),
			senderName: await this.getString('notification.email.senderName'),
			template: await this.getString('notification.email.template')
		};
	}

	/**
	 * Get security configuration
	 */
	static async getSecurityConfig() {
		return {
			rateLimitPerIP: await this.getNumber('security.rateLimitPerIP'),
			requireEmailVerification: await this.getBoolean('security.requireEmailVerification'),
			autoApproveThreshold: await this.getNumber('security.autoApproveThreshold')
		};
	}
}

/**
 * Client-side configuration service (for browser usage)
 */
export class ClientConfigService {
	/**
	 * Load configurations from server for client-side usage
	 */
	static async loadConfigs(): Promise<Record<string, ConfigValue>> {
		if (!browser) return {};

		// Check cache
		if (clientConfigCache && Date.now() - clientCacheTimestamp < CLIENT_CACHE_TTL) {
			return clientConfigCache;
		}

		try {
			const response = await fetch('/api/config/public');
			if (response.ok) {
				const configs = await response.json();
				clientConfigCache = configs;
				clientCacheTimestamp = Date.now();
				return configs;
			}
		} catch (error) {
			logger.error({ error }, 'Failed to load client configs');
		}

		// Return default values if loading fails
		return DEFAULT_VALUES;
	}

	/**
	 * Get a configuration value on client-side
	 */
	static async get<T>(key: keyof typeof DEFAULT_VALUES): Promise<T> {
		const configs = await this.loadConfigs();
		return configs[key] !== undefined ? configs[key] : DEFAULT_VALUES[key] as T;
	}

	/**
	 * Get map configuration for client-side
	 */
	static async getMapConfig() {
		return {
			center: await this.get<{ lat: number; lng: number }>('display.defaultMapCenter'),
			zoom: await this.get<number>('display.defaultMapZoom'),
			tileProvider: await this.get<string>('integration.mapTileProvider'),
			showUnapprovedSightings: await this.get<boolean>('display.showUnapprovedOnMap')
		};
	}

	/**
	 * Check if maintenance mode is enabled (client-side)
	 */
	static async isMaintenanceModeEnabled(): Promise<boolean> {
		return this.get<boolean>('display.maintenanceMode');
	}
}

/**
 * Universal configuration service that works on both server and client
 */
export const ConfigService = {
	// Server-side methods (only work on server)
	server: ServerConfigService,
	
	// Client-side methods (only work in browser)
	client: ClientConfigService,
	
	// Get default value for any config key
	getDefault(key: keyof typeof DEFAULT_VALUES) {
		return DEFAULT_VALUES[key];
	},

	// Check if we're on server or client and use appropriate service
	async get<T>(key: keyof typeof DEFAULT_VALUES): Promise<T> {
		if (browser) {
			return ClientConfigService.get<T>(key);
		} else {
			return ServerConfigService.get<T>(key);
		}
	}
};

// Export default values for direct access
export { DEFAULT_VALUES };
export type ConfigKey = keyof typeof DEFAULT_VALUES;