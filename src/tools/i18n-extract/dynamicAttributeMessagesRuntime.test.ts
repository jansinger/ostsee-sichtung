/**
 * Laufzeit-Nachweis für die mechanisierten Gruppe-2-Botschaften (Stage-2-Review
 * der 44 `dynamic-attribute`-Fundstellen, 2026-08-12): eine parametrisierte
 * ICU-Botschaft muss den richtigen, interpolierten Text liefern — nicht nur
 * im Werkzeug-Bericht (das prüfen die `collectSvelte.test.ts`-Fälle), sondern
 * kompiliert, über den echten Paraglide-Runtime-Pfad, in BEIDEN Sprachen.
 *
 * Positiv formuliert (nicht „bleibt deutsch"): jede Assertion prüft, dass der
 * erwartete, interpolierte Text ankommt — für `de` UND für `en`. Etappe 1
 * liefert dieselbe deutsche Formulierung in beiden Katalogen (Mechanik, keine
 * Übersetzung, siehe `docs/i18n/PLAN_ETAPPE2.md`); englisch bleibt deshalb
 * textgleich zu deutsch, aber der Test läuft trotzdem über den `locale: 'en'`-
 * Codepfad — das ist der Unterschied zu einem Test, der nur `de` aufruft und
 * stillschweigend hofft, dass `en` genauso funktioniert.
 */
import { describe, expect, it } from 'vitest';
import * as m from '$lib/paraglide/messages';

describe('mechanisierte dynamic-attribute-Botschaften — Laufzeit, beide Sprachen', () => {
	it('setzt einen einzelnen Parameter korrekt ein (Suchfilter {query} entfernen)', () => {
		const params = { query: 'Schweinswal' };
		expect(
			m.components_map_sightingsmapview_aria_label_suchfilter_query_entfernen(params, {
				locale: 'de'
			})
		).toBe('Suchfilter Schweinswal entfernen');
		expect(
			m.components_map_sightingsmapview_aria_label_suchfilter_query_entfernen(params, {
				locale: 'en'
			})
		).toBe('Suchfilter Schweinswal entfernen');
	});

	it('setzt zwei Parameter an ihren jeweils richtigen Stellen ein (Filter Jahr {year} … {apiDefaultYear})', () => {
		const params = { year: '2024', apiDefaultYear: '2026' };
		const expected = 'Filter Jahr 2024 entfernen und zum Standard-Jahr 2026 wechseln';
		expect(
			m.components_map_sightingsmapview_aria_label_filter_jahr_year_entfernen_und(params, {
				locale: 'de'
			})
		).toBe(expected);
		expect(
			m.components_map_sightingsmapview_aria_label_filter_jahr_year_entfernen_und(params, {
				locale: 'en'
			})
		).toBe(expected);
	});

	it('setzt drei Parameter aus dem naming-Kollisionsfall korrekt ein (Sichtbarkeit für {value} …)', () => {
		const params = { value: 'Schweinswal', visible: 3, total: 7 };
		const expected =
			'Sichtbarkeit für Schweinswal umschalten. Aktuell 3 von 7 Sichtungen sichtbar.';
		expect(
			m.components_map_panel_legendpanel_aria_label_sichtbarkeit_fuer_value_umschalten_aktue(
				params,
				{
					locale: 'de'
				}
			)
		).toBe(expected);
		expect(
			m.components_map_panel_legendpanel_aria_label_sichtbarkeit_fuer_value_umschalten_aktue(
				params,
				{
					locale: 'en'
				}
			)
		).toBe(expected);
	});

	it('setzt den aus einem JS-Template-Literal mechanisierten Parameter korrekt ein ({originalName} öffnen)', () => {
		const params = { originalName: 'strand-foto.jpg' };
		expect(
			m.components_media_mediathumbnail_aria_label_originalname_oeffnen(params, { locale: 'de' })
		).toBe('strand-foto.jpg öffnen');
		expect(
			m.components_media_mediathumbnail_aria_label_originalname_oeffnen(params, { locale: 'en' })
		).toBe('strand-foto.jpg öffnen');
	});
});
