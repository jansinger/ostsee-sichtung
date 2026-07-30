import { describe, it, expect } from 'vitest';
import { leseKonfiguration } from './config.js';

describe('leseKonfiguration', () => {
	it('wirft ohne LEGACY_INBOX_DATA_DIR', () => {
		expect(() => leseKonfiguration({})).toThrow(/LEGACY_INBOX_DATA_DIR/);
	});

	it('übernimmt den Datenpfad und setzt die Vorgabewerte', () => {
		const k = leseKonfiguration({ LEGACY_INBOX_DATA_DIR: '/daten' });
		expect(k.datenVerzeichnis).toBe('/daten');
		expect(k.rateLimitProIp).toBe(100);
		expect(k.rateLimitGlobal).toBe(1000);
		expect(k.maxBodyBytes).toBe(262144);
	});

	it('lässt die Grenzwerte per Umgebungsvariable überschreiben', () => {
		const k = leseKonfiguration({
			LEGACY_INBOX_DATA_DIR: '/daten',
			LEGACY_INBOX_RATE_LIMIT_GLOBAL: '5000'
		});
		expect(k.rateLimitGlobal).toBe(5000);
	});
});
