import { describe, it, expect } from 'vitest';
import { erstelleRateLimit } from './rateLimit.js';

describe('erstelleRateLimit', () => {
	it('erlaubt bis zur Grenze und weist danach ab', () => {
		const limit = erstelleRateLimit({ proIpProStunde: 3, globalProStunde: 100 });

		expect(limit.pruefeIp('1.2.3.4')).toBe(true);
		expect(limit.pruefeIp('1.2.3.4')).toBe(true);
		expect(limit.pruefeIp('1.2.3.4')).toBe(true);
		expect(limit.pruefeIp('1.2.3.4')).toBe(false);
	});

	it('zählt je IP getrennt', () => {
		const limit = erstelleRateLimit({ proIpProStunde: 1, globalProStunde: 100 });

		expect(limit.pruefeIp('1.1.1.1')).toBe(true);
		expect(limit.pruefeIp('2.2.2.2')).toBe(true);
		expect(limit.pruefeIp('1.1.1.1')).toBe(false);
	});

	it('lässt nach Ablauf der Stunde wieder zu', () => {
		let zeit = 0;
		const limit = erstelleRateLimit({
			proIpProStunde: 1,
			globalProStunde: 100,
			jetzt: () => zeit
		});

		expect(limit.pruefeIp('1.1.1.1')).toBe(true);
		expect(limit.pruefeIp('1.1.1.1')).toBe(false);

		zeit = 3_600_001;
		expect(limit.pruefeIp('1.1.1.1')).toBe(true);
	});

	it('zählt global über alle IPs', () => {
		const limit = erstelleRateLimit({ proIpProStunde: 100, globalProStunde: 2 });

		expect(limit.pruefeGlobal()).toBe(true);
		expect(limit.pruefeGlobal()).toBe(true);
		expect(limit.pruefeGlobal()).toBe(false);
	});

	it('lässt den Speicher nicht unbegrenzt wachsen', () => {
		let zeit = 0;
		const limit = erstelleRateLimit({
			proIpProStunde: 5,
			globalProStunde: 100000,
			jetzt: () => zeit
		});

		// 500 IPs, nicht mehr: pruefeIp() räumt bei jedem Aufruf die ganze Map auf,
		// die Schleife ist also quadratisch (5000 IPs ≙ 584 ms auf einer unbelasteten
		// Maschine, unter Volllast über dem 5-s-Timeout von Vitest). Die Aussage hängt
		// nicht an der Größe — sie steckt in den beiden expect() unten: Die Map wächst
		// mit jeder neuen IP und ist nach dem Stundenwechsel wieder leer.
		for (let i = 0; i < 500; i++) {
			limit.pruefeIp(`10.0.${Math.floor(i / 256)}.${i % 256}`);
		}
		expect(limit.anzahlBeobachteterIps()).toBe(500);

		zeit = 3_600_001;
		limit.pruefeIp('1.1.1.1');

		expect(limit.anzahlBeobachteterIps()).toBeLessThan(10);
	});
});
