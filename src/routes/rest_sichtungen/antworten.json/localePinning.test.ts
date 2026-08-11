/**
 * @fileoverview Guard-Test: Legacy-Endpunkt bleibt deutsch, egal welche
 * Locale gerade aktiv ist.
 *
 * Hintergrund: `getSpeciesLabel()` hat seit dem Paraglide-Umbau von
 * `species.ts` einen optionalen Locale-Parameter mit Default `getLocale()`.
 * `+server.ts` ruft ihn seither mit explizitem `baseLocale` auf (siehe
 * Kommentar dort und CLAUDE.md, Abschnitt "Legacy REST API — 100 %
 * Kompatibilität") — dieser Test beweist, dass das so bleibt.
 *
 * Seit Aufgabe 3.3 (Gruppe 1) gilt dieselbe Pinnung zusätzlich für
 * `getSeaStateLabel()`, `getSexLabel()`, `getVisibilityLabel()` und
 * `getWindStrengthLabel()` — je ein Feld unten, nach demselben Muster.
 *
 * Ein Test, der sich auf den heutigen Wortlaut von `messages/en.json`
 * verlässt, wäre nutzlos: die Datei trägt vorerst denselben deutschen Text
 * wie `de.json`, ein ungepinnter Aufruf sähe also identisch aus. Deshalb wird
 * die englische Botschaftsfunktion für die Dauer des Tests durch einen Wert
 * ersetzt, der sich sichtbar vom deutschen unterscheidet — nur so kann der
 * Test tatsächlich rot werden, wenn die Pinnung verschwindet.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const DIVERGED_EN_LABEL = 'TEST-ONLY-DIVERGED-ENGLISH-LABEL';

function divergeInEnglish(
	actualFn: (inputs?: Record<string, never>, options?: { locale?: 'de' | 'en' }) => string
) {
	return (inputs?: Record<string, never>, options?: { locale?: 'de' | 'en' }) =>
		options?.locale === 'en' ? DIVERGED_EN_LABEL : actualFn(inputs, options);
}

vi.mock('$lib/paraglide/messages', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/paraglide/messages')>();
	return {
		...actual,
		// Zwingt die englische Botschaft auseinander, egal was messages/en.json
		// heute tatsächlich enthält (siehe Docblock oben).
		formoptions_species_harbor_porpoise: divergeInEnglish(
			actual.formoptions_species_harbor_porpoise
		),
		formoptions_seastate_smooth: divergeInEnglish(actual.formoptions_seastate_smooth),
		formoptions_sex_female: divergeInEnglish(actual.formoptions_sex_female),
		formoptions_visibility_clear: divergeInEnglish(actual.formoptions_visibility_clear),
		formoptions_windstrength_windstill: divergeInEnglish(actual.formoptions_windstrength_windstill)
	};
});

describe('GET /rest_sichtungen/antworten.json — Locale-Pinnung', () => {
	afterEach(async () => {
		// overwriteGetLocale() überschreibt die Modul-Funktion dauerhaft ohne
		// eingebauten Reset — auf den echten Default zurückschalten, damit
		// andere Tests im selben Prozess nicht die englische Locale erben.
		const { overwriteGetLocale, baseLocale } = await import('$lib/paraglide/runtime');
		overwriteGetLocale(() => baseLocale);
	});

	it('liefert die deutsche Artbezeichnung, obwohl die aktive Locale Englisch ist und die englische Botschaft nachweislich abweicht', async () => {
		const { overwriteGetLocale } = await import('$lib/paraglide/runtime');
		// Simuliert eine Anfrage, deren Locale-Kontext auf Englisch steht — genau
		// der Fall, den ein ungepinnter getSpeciesLabel()-Aufruf übernehmen würde.
		overwriteGetLocale(() => 'en');

		const { GET } = await import('./+server');
		const response = await GET({
			url: new URL('https://localhost/rest_sichtungen/antworten.json'),
			getClientAddress: () => '127.0.0.1',
			request: new Request('https://localhost/rest_sichtungen/antworten.json')
		} as never);
		const body = await response.json();

		expect(body.tierart['0']).toBe('Schweinswal');
		expect(body.tierart['0']).not.toBe(DIVERGED_EN_LABEL);
	});

	it('liefert den deutschen Seegang-Text, obwohl die aktive Locale Englisch ist und die englische Botschaft nachweislich abweicht', async () => {
		const { overwriteGetLocale } = await import('$lib/paraglide/runtime');
		overwriteGetLocale(() => 'en');

		const { GET } = await import('./+server');
		const response = await GET({
			url: new URL('https://localhost/rest_sichtungen/antworten.json'),
			getClientAddress: () => '127.0.0.1',
			request: new Request('https://localhost/rest_sichtungen/antworten.json')
		} as never);
		const body = await response.json();

		expect(body.seegang['1']).toBe('Glatte See, keine Wellen');
		expect(body.seegang['1']).not.toBe(DIVERGED_EN_LABEL);
	});

	it('liefert die deutsche Geschlechtsbezeichnung (totfund_geschlecht), obwohl die aktive Locale Englisch ist und die englische Botschaft nachweislich abweicht', async () => {
		const { overwriteGetLocale } = await import('$lib/paraglide/runtime');
		overwriteGetLocale(() => 'en');

		const { GET } = await import('./+server');
		const response = await GET({
			url: new URL('https://localhost/rest_sichtungen/antworten.json'),
			getClientAddress: () => '127.0.0.1',
			request: new Request('https://localhost/rest_sichtungen/antworten.json')
		} as never);
		const body = await response.json();

		expect(body.totfund_geschlecht['1']).toBe('Weiblich');
		expect(body.totfund_geschlecht['1']).not.toBe(DIVERGED_EN_LABEL);
	});

	it('liefert den deutschen Sichtweiten-Text, obwohl die aktive Locale Englisch ist und die englische Botschaft nachweislich abweicht', async () => {
		const { overwriteGetLocale } = await import('$lib/paraglide/runtime');
		overwriteGetLocale(() => 'en');

		const { GET } = await import('./+server');
		const response = await GET({
			url: new URL('https://localhost/rest_sichtungen/antworten.json'),
			getClientAddress: () => '127.0.0.1',
			request: new Request('https://localhost/rest_sichtungen/antworten.json')
		} as never);
		const body = await response.json();

		expect(body.sichtweite['2']).toBe('Klar (bis 20km)');
		expect(body.sichtweite['2']).not.toBe(DIVERGED_EN_LABEL);
	});

	it('liefert den deutschen Windstärke-Text, obwohl die aktive Locale Englisch ist und die englische Botschaft nachweislich abweicht', async () => {
		const { overwriteGetLocale } = await import('$lib/paraglide/runtime');
		overwriteGetLocale(() => 'en');

		const { GET } = await import('./+server');
		const response = await GET({
			url: new URL('https://localhost/rest_sichtungen/antworten.json'),
			getClientAddress: () => '127.0.0.1',
			request: new Request('https://localhost/rest_sichtungen/antworten.json')
		} as never);
		const body = await response.json();

		expect(body.windstaerke['0']).toBe('0 - Windstille (< 1 km/h)');
		expect(body.windstaerke['0']).not.toBe(DIVERGED_EN_LABEL);
	});
});
