import { describe, expect, it } from 'vitest';
import { stripLegacyLanguagePrefix } from './languagePrefix';

describe('stripLegacyLanguagePrefix', () => {
	describe('bedient die Legacy-Pfade mit Sprachkürzel', () => {
		const legacyPfade = [
			'/rest_sichtungen',
			'/rest_sichtungen/antworten.json',
			'/rest_sichtungen/inBaltic.json',
			'/sichtungen/showreports.json'
		];

		for (const pfad of legacyPfade) {
			for (const sprache of ['de', 'en']) {
				it(`/${sprache}${pfad} → ${pfad}`, () => {
					expect(stripLegacyLanguagePrefix(`/${sprache}${pfad}`)).toBe(pfad);
				});
			}
		}
	});

	it('lässt Legacy-Pfade ohne Sprachkürzel unverändert', () => {
		expect(stripLegacyLanguagePrefix('/rest_sichtungen/antworten.json')).toBeUndefined();
		expect(stripLegacyLanguagePrefix('/sichtungen/showreports.json')).toBeUndefined();
	});

	it('behält den Trailing Slash bei', () => {
		expect(stripLegacyLanguagePrefix('/en/rest_sichtungen/')).toBe('/rest_sichtungen/');
		expect(stripLegacyLanguagePrefix('/de/sichtungen/showreports.json/')).toBe(
			'/sichtungen/showreports.json/'
		);
	});

	describe('bedient genau die vier dokumentierten Pfade, nicht deren Verzeichnisse', () => {
		// Sonst bekäme jeder künftige Pfad unter /sichtungen/ oder /rest_sichtungen/
		// das Präfix stillschweigend mit — auch ein nicht-Legacy-Pfad. Ein neuer
		// Legacy-Endpunkt gehört bewusst in die Liste eingetragen.
		const keinDokumentierterPfad = [
			'/en/sichtungen',
			'/de/sichtungen',
			// CakePHP-Actions, die es in dieser Anwendung nicht gibt (die URL steht
			// als Beispiel in der Antwort von POST /rest_sichtungen).
			'/en/rest_sichtungen/view/1840.json',
			'/de/rest_sichtungen/add'
		];

		for (const pfad of keinDokumentierterPfad) {
			it(`${pfad} bleibt unverändert`, () => {
				expect(stripLegacyLanguagePrefix(pfad)).toBeUndefined();
			});
		}
	});

	describe('greift nur bei den Legacy-Pfaden', () => {
		// Die Anwendung ist einsprachig deutsch. Ein /en/ vor der Startseite oder
		// vor /admin wäre ein Sprachversprechen, das sie nicht einlöst — und vor
		// /admin zusätzlich ein zweiter Pfad auf geschützte Routen.
		const fremdePfade = [
			'/en',
			'/de',
			'/en/',
			'/en/admin',
			'/en/admin/sightings',
			'/en/api/sightings',
			'/de/map',
			'/en/bestimmungshilfe',
			'/en/uploads/1/foto.jpg'
		];

		for (const pfad of fremdePfade) {
			it(`${pfad} bleibt unverändert`, () => {
				expect(stripLegacyLanguagePrefix(pfad)).toBeUndefined();
			});
		}
	});

	describe('greift nur bei genau einem Kürzel in Kleinschreibung', () => {
		const keineTreffer = [
			// CakePHP band das Kürzel an `de|en` — alles andere fiel schon dort durch.
			'/fr/rest_sichtungen',
			'/EN/rest_sichtungen',
			'/De/rest_sichtungen/antworten.json',
			// Zwei Kürzel hintereinander ergaben in CakePHP den Controller `de` → 404.
			'/en/de/rest_sichtungen',
			// Kein Präfix, sondern ein Namensbestandteil.
			'/enrest_sichtungen',
			'/en_rest_sichtungen',
			// Ein Legacy-Pfad muss unmittelbar folgen, nicht irgendwo enthalten sein.
			'/en/foo/rest_sichtungen',
			// Präfixe, die nur zufällig gleich beginnen.
			'/en/rest_sichtungen_alt',
			'/en/sichtungenX'
		];

		for (const pfad of keineTreffer) {
			it(`${pfad} bleibt unverändert`, () => {
				expect(stripLegacyLanguagePrefix(pfad)).toBeUndefined();
			});
		}
	});
});
