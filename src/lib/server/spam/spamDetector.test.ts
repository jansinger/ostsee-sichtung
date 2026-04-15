import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SightingFormValues } from '$lib/types/Form';

// Shared mockScan function — controlled per-test via mockResolvedValue
const mockScan = vi.fn();

// Mock spamscanner before importing spamDetector
vi.mock('spamscanner', () => {
	return {
		default: vi.fn().mockImplementation(function () {
			return { scan: mockScan };
		})
	};
});

// Mock logger
vi.mock('$lib/logger.server', () => ({
	createLogger: vi.fn().mockReturnValue({
		warn: vi.fn(),
		debug: vi.fn(),
		info: vi.fn(),
		error: vi.fn()
	})
}));

// Mock isUnknownOrMissingSpecies
vi.mock('$lib/utils/format/sightingFormatter', () => ({
	isUnknownOrMissingSpecies: vi.fn().mockReturnValue(false)
}));

import { detectSpamIndicators } from './spamDetector';
import { isUnknownOrMissingSpecies } from '$lib/utils/format/sightingFormatter';

const mockIsUnknownOrMissingSpecies = vi.mocked(isUnknownOrMissingSpecies);

const HAM_RESULT = {
	isSpam: false,
	message: 'Not spam',
	results: { classification: { category: 'ham', probability: 0.5 } }
};

const SPAM_RESULT = {
	isSpam: true,
	message: 'Classified as spam',
	results: { classification: { category: 'spam', probability: 0.9 } }
};

function buildSighting(overrides: Partial<SightingFormValues> = {}): SightingFormValues {
	return {
		firstName: 'Max',
		lastName: 'Muster',
		email: 'max@example.com',
		species: 0,
		totalCount: 1,
		sightingDate: '2024-01-15',
		sightingTime: '14:30',
		notes: '',
		waterway: '',
		seaMark: '',
		latitude: undefined,
		longitude: undefined,
		...overrides
	} as unknown as SightingFormValues;
}

describe('detectSpamIndicators', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsUnknownOrMissingSpecies.mockReturnValue(false);
		// Default: SpamScanner reports ham
		mockScan.mockResolvedValue(HAM_RESULT);
	});

	describe('URL-Erkennung', () => {
		it('erkennt https:// URL in notes und gibt score +3', async () => {
			const sighting = buildSighting({ notes: 'Schöne Sichtung auf https://spam.com' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(3);
			expect(result.indicators).toContain('Enthält verdächtige URLs oder Links');
		});

		it('erkennt www. Link in notes', async () => {
			const sighting = buildSighting({ notes: 'Besuche www.spam.de für mehr Infos' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(3);
			expect(result.indicators).toContain('Enthält verdächtige URLs oder Links');
		});

		it('erkennt .com Domain in waterway', async () => {
			const sighting = buildSighting({ waterway: 'spam.com area' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(3);
		});

		it('erkennt URL-Shortener ohne https:// (z.B. rb.gy/abc123)', async () => {
			const sighting = buildSighting({ notes: 'Hier klicken > rb.gy/34p7i3' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(3);
			expect(result.indicators).toContain('Enthält verdächtige URLs oder Links');
		});

		it('erkennt URL in HTML-kodiertem Text (&gt; statt >)', async () => {
			const sighting = buildSighting({
				notes: 'Hier klicken &gt; rb.gy/34p7i3',
				waterway: 'Hier klicken &gt; rb.gy/34p7i3'
			});
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(3);
			expect(result.indicators).toContain('Enthält verdächtige URLs oder Links');
		});

		it('erkennt URL in seaMark-Feld', async () => {
			const sighting = buildSighting({ seaMark: 'Klicken Sie hier rb.gy/spam123' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(3);
		});
	});

	describe('Englische Spam-Keywords', () => {
		it('erkennt "sale" und gibt score +2', async () => {
			const sighting = buildSighting({ notes: 'big sale today' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(2);
			expect(result.indicators.some((i) => i.includes('sale'))).toBe(true);
		});

		it('erkennt "viagra" und gibt score +2', async () => {
			const sighting = buildSighting({ notes: 'buy viagra cheap' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(2);
		});

		it('erkennt mehrere Keywords mit kumulativem Score', async () => {
			const sighting = buildSighting({ notes: 'free money win prize casino' });
			const result = await detectSpamIndicators(sighting);
			// 5 keywords × 2 = 10
			expect(result.score).toBeGreaterThanOrEqual(10);
		});
	});

	describe('Deutsche Spam-Keywords', () => {
		it('erkennt "kostenlos" und gibt score +2', async () => {
			const sighting = buildSighting({ notes: 'jetzt kostenlos testen' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(2);
			expect(result.indicators.some((i) => i.includes('kostenlos'))).toBe(true);
		});

		it('erkennt "gratis" in firstName', async () => {
			const sighting = buildSighting({ firstName: 'GratisAngebot' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(2);
		});

		it('erkennt "sonderangebot" und gibt score +2', async () => {
			const sighting = buildSighting({ notes: 'exklusives sonderangebot für sie' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(2);
		});

		it('erkennt "garantiert" in notes', async () => {
			const sighting = buildSighting({ notes: 'garantiert gewinn' });
			const result = await detectSpamIndicators(sighting);
			// "garantiert" (+2) + "gewinn" (+2) = 4
			expect(result.score).toBeGreaterThanOrEqual(4);
		});
	});

	describe('Wegwerf-Email-Domains', () => {
		it('erkennt mailinator.com und gibt score +3', async () => {
			const sighting = buildSighting({ email: 'test@mailinator.com' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(3);
			expect(result.indicators.some((i) => i.includes('Wegwerf'))).toBe(true);
		});

		it('erkennt tempmail.com und gibt score +3', async () => {
			const sighting = buildSighting({ email: 'anon@tempmail.com' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(3);
		});

		it('erkennt guerrillamail.com', async () => {
			const sighting = buildSighting({ email: 'user@guerrillamail.com' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(3);
		});

		it('erkennt yopmail.com', async () => {
			const sighting = buildSighting({ email: 'x@yopmail.com' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(3);
		});

		it('akzeptiert legitime Email-Domain', async () => {
			const sighting = buildSighting({ email: 'user@gmail.com' });
			const result = await detectSpamIndicators(sighting);
			expect(result.indicators.some((i) => i.includes('Wegwerf'))).toBe(false);
		});
	});

	describe('Noreply-Email', () => {
		it('erkennt noreply@ und gibt score +2', async () => {
			const sighting = buildSighting({ email: 'noreply@example.com' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(2);
			expect(result.indicators).toContain('Verdächtige E-Mail-Adresse (noreply)');
		});

		it('erkennt donotreply@ und gibt score +2', async () => {
			const sighting = buildSighting({ email: 'donotreply@example.com' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(2);
		});
	});

	describe('E-Mail mit 5+ Ziffern', () => {
		it('erkennt E-Mail mit 5 Ziffern vor @ und gibt score +1', async () => {
			const sighting = buildSighting({ email: '12345@example.com' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(1);
			expect(result.indicators).toContain('E-Mail mit vielen Zahlen (verdächtig)');
		});

		it('akzeptiert E-Mail mit weniger als 5 Ziffern', async () => {
			const sighting = buildSighting({ email: 'max1234@example.com' });
			const result = await detectSpamIndicators(sighting);
			expect(result.indicators).not.toContain('E-Mail mit vielen Zahlen (verdächtig)');
		});
	});

	describe('Position außerhalb Ostsee', () => {
		it('erkennt Koordinaten außerhalb Ostsee und gibt score +2', async () => {
			const sighting = buildSighting({ latitude: 10.0, longitude: 50.0 });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(2);
			expect(result.indicators).toContain('Position weit außerhalb der Ostsee');
		});

		it('akzeptiert gültige Ostsee-Koordinaten', async () => {
			const sighting = buildSighting({ latitude: 54.5, longitude: 12.0 });
			const result = await detectSpamIndicators(sighting);
			expect(result.indicators).not.toContain('Position weit außerhalb der Ostsee');
		});

		it('erkennt zu hohe Breite als außerhalb Ostsee', async () => {
			const sighting = buildSighting({ latitude: 70.0, longitude: 20.0 });
			const result = await detectSpamIndicators(sighting);
			expect(result.indicators).toContain('Position weit außerhalb der Ostsee');
		});
	});

	describe('Unbekannte Tierart', () => {
		it('gibt score +1 bei unbekannter Tierart', async () => {
			mockIsUnknownOrMissingSpecies.mockReturnValue(true);
			const sighting = buildSighting({ species: 8 }); // 8 = Unbekannte Walart
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeGreaterThanOrEqual(1);
			expect(result.indicators).toContain('Keine oder unbekannte Tierart angegeben');
		});

		it('gibt keinen Bonus bei bekannter Tierart', async () => {
			mockIsUnknownOrMissingSpecies.mockReturnValue(false);
			const sighting = buildSighting({ species: 0 }); // Schweinswal
			const result = await detectSpamIndicators(sighting);
			expect(result.indicators).not.toContain('Keine oder unbekannte Tierart angegeben');
		});
	});

	describe('Leeres Sighting', () => {
		it('gibt score 0 und isHighRisk false bei minimalem Sighting', async () => {
			const sighting = buildSighting({});
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBe(0);
			expect(result.isHighRisk).toBe(false);
			expect(result.indicators).toHaveLength(0);
		});
	});

	describe('isHighRisk', () => {
		it('ist true wenn score >= 5', async () => {
			// 5 english keywords × 2 = 10
			const sighting = buildSighting({ notes: 'free money win prize casino' });
			const result = await detectSpamIndicators(sighting);
			expect(result.isHighRisk).toBe(true);
		});

		it('ist false wenn score < 5', async () => {
			// 1 keyword × 2 = 2
			const sighting = buildSighting({ notes: 'sale item' });
			const result = await detectSpamIndicators(sighting);
			expect(result.score).toBeLessThan(5);
			expect(result.isHighRisk).toBe(false);
		});

		it('ist true wenn SpamScanner isSpam meldet (auch bei niedrigem Heuristik-Score)', async () => {
			mockScan.mockResolvedValue(SPAM_RESULT);

			const sighting = buildSighting({ notes: 'completely normal text for testing' });
			const result = await detectSpamIndicators(sighting);
			expect(result.isSpam).toBe(true);
			expect(result.isHighRisk).toBe(true);
		});
	});

	describe('SpamCheckResult Interface', () => {
		it('gibt alle Pflichtfelder zurück', async () => {
			const sighting = buildSighting({});
			const result = await detectSpamIndicators(sighting);
			expect(result).toHaveProperty('score');
			expect(result).toHaveProperty('scannerScore');
			expect(result).toHaveProperty('isSpam');
			expect(result).toHaveProperty('isHighRisk');
			expect(result).toHaveProperty('indicators');
			expect(typeof result.score).toBe('number');
			expect(typeof result.scannerScore).toBe('number');
			expect(typeof result.isSpam).toBe('boolean');
			expect(typeof result.isHighRisk).toBe('boolean');
			expect(Array.isArray(result.indicators)).toBe(true);
		});

		it('setzt scannerScore auf 100 wenn SpamScanner isSpam meldet', async () => {
			mockScan.mockResolvedValue(SPAM_RESULT);

			const sighting = buildSighting({ notes: 'this is a test sighting note' });
			const result = await detectSpamIndicators(sighting);
			expect(result.scannerScore).toBe(100);
			expect(result.isSpam).toBe(true);
		});

		it('setzt scannerScore auf 0 wenn SpamScanner kein Spam meldet', async () => {
			const sighting = buildSighting({ notes: 'this is a test sighting note' });
			const result = await detectSpamIndicators(sighting);
			expect(result.scannerScore).toBe(0);
			expect(result.isSpam).toBe(false);
		});

		it('graceful fallback wenn SpamScanner fehlschlägt', async () => {
			mockScan.mockRejectedValue(new Error('SpamScanner failed'));

			const sighting = buildSighting({ notes: 'this is a test sighting note' });
			const result = await detectSpamIndicators(sighting);
			expect(result.scannerScore).toBe(0);
			expect(result.isSpam).toBe(false);
			// isHighRisk only from heuristics
			expect(result.isHighRisk).toBe(false);
		});
	});
});
