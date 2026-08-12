/**
 * @fileoverview Guard-Test: Legacy-Endpunkt bleibt deutsch, egal welche
 * Locale gerade aktiv ist.
 *
 * Analog zu `../../rest_sichtungen/antworten.json/localePinning.test.ts` —
 * siehe dort für die ausführliche Begründung. `+server.ts` pinnt
 * `getSpeciesLabel()` seit dem Paraglide-Umbau von `species.ts` explizit auf
 * `baseLocale`; dieser Test beweist, dass ein aktiv englischer Locale-Kontext
 * die Antwort trotzdem nicht verändert. Die englische Botschaftsfunktion wird
 * dafür für die Dauer des Tests künstlich auseinandergezogen, weil
 * `messages/en.json` heute noch denselben deutschen Wortlaut wie `de.json`
 * trägt und ein Vergleich mit dem echten Katalog den Fehler deshalb nicht
 * sichtbar machen würde.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

const DIVERGED_EN_LABEL = 'TEST-ONLY-DIVERGED-ENGLISH-LABEL';

vi.mock('$lib/paraglide/messages', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/paraglide/messages')>();
	return {
		...actual,
		formoptions_species_harbor_porpoise: (
			inputs?: Record<string, never>,
			options?: { locale?: 'de' | 'en' }
		) =>
			options?.locale === 'en'
				? DIVERGED_EN_LABEL
				: actual.formoptions_species_harbor_porpoise(inputs, options)
	};
});

const mockSightingData = [
	{
		id: 817,
		sichtungsdatum: '2012-01-25T13:50:00.000Z',
		latitude: '54.646667',
		longitude: '11.333333',
		totalCount: 1,
		juvenileCount: 0,
		firstName: null,
		lastName: null,
		nameConsent: false,
		waterway: null,
		shipName: null,
		shipNameConsent: false,
		approvedAt: new Date('2012-01-26T10:00:00.000Z'),
		species: 0, // Schweinswal
		isDead: 0
	}
];

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => ({
					orderBy: vi.fn(() => ({
						limit: vi.fn(() => Promise.resolve(mockSightingData))
					}))
				}))
			}))
		}))
	}
}));

function createMockRequestEvent(): RequestEvent {
	return {
		url: new URL('https://example.com/sichtungen/showreports.json'),
		locals: {},
		getClientAddress: () => '127.0.0.1'
	} as never;
}

describe('GET /sichtungen/showreports.json — Locale-Pinnung', () => {
	afterEach(async () => {
		// overwriteGetLocale() überschreibt die Modul-Funktion dauerhaft ohne
		// eingebauten Reset — auf den echten Default zurückschalten, damit
		// andere Tests im selben Prozess nicht die englische Locale erben.
		const { overwriteGetLocale, baseLocale } = await import('$lib/paraglide/runtime');
		overwriteGetLocale(() => baseLocale);
	});

	it('liefert die deutsche Artbezeichnung (ta), obwohl die aktive Locale Englisch ist und die englische Botschaft nachweislich abweicht', async () => {
		const { overwriteGetLocale } = await import('$lib/paraglide/runtime');
		overwriteGetLocale(() => 'en');

		const { GET } = await import('./+server');
		const response = await GET(createMockRequestEvent());
		const body = await response.json();

		expect(body[0].ta).toBe('Schweinswal');
		expect(body[0].ta).not.toBe(DIVERGED_EN_LABEL);
	});
});
