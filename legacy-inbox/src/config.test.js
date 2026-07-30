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

	it('nimmt PORT=0 als Auftrag an das Betriebssystem an, statt auf 3000 zu fallen', () => {
		// 0 heißt „vergib einen freien Port" und ist ein gültiger Wert. Eine
		// Oder-Vorgabe macht daraus stillschweigend 3000 — ein Test, der
		// glaubt, auf einem eigenen Port zu lauschen, kollidiert dann mit
		// jedem anderen Lauf auf derselben Maschine.
		const k = leseKonfiguration({ LEGACY_INBOX_DATA_DIR: '/daten', PORT: '0' });
		expect(k.port).toBe(0);
	});

	it('fällt bei fehlendem oder unlesbarem PORT auf 3000 zurück', () => {
		expect(leseKonfiguration({ LEGACY_INBOX_DATA_DIR: '/daten' }).port).toBe(3000);
		expect(leseKonfiguration({ LEGACY_INBOX_DATA_DIR: '/daten', PORT: '' }).port).toBe(3000);
		expect(leseKonfiguration({ LEGACY_INBOX_DATA_DIR: '/daten', PORT: 'keine Zahl' }).port).toBe(
			3000
		);
	});

	it('lässt die Grenzwerte per Umgebungsvariable überschreiben', () => {
		const k = leseKonfiguration({
			LEGACY_INBOX_DATA_DIR: '/daten',
			LEGACY_INBOX_RATE_LIMIT_GLOBAL: '5000'
		});
		expect(k.rateLimitGlobal).toBe(5000);
	});
});
