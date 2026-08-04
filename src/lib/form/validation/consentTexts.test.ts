/**
 * Die Einwilligungstexte müssen zueinander passen.
 *
 * Entscheidung des Museums (2026-07-28): Upload und fachliche Prüfung eines
 * Fotos gehören zur Sichtungsmeldung selbst und sind von `privacyConsent`
 * gedeckt. `mediaConsent` betrifft ausschließlich die **Veröffentlichung**.
 *
 * Diese Tests halten genau diese Arbeitsteilung fest — der frühere Zustand
 * (Pflichttext zählt abschließend auf und nennt Medien nicht; optionaler Text
 * mischt Wissenschaft und Öffentlichkeitsarbeit) war widersprüchlich.
 *
 * Siehe docs/archive/MEDIENEINWILLIGUNG_ANALYSE_2026-07-28.md
 */
import { describe, expect, it } from 'vitest';
import { sightingSchema } from './sightingSchema';

type FieldMeta = { helpText?: string; valueText?: string };

function metaOf(field: string): FieldMeta {
	const described = sightingSchema.describe().fields[field];
	if (!described || !('meta' in described)) {
		throw new Error(`Feld ${field} hat keine Beschreibung`);
	}
	return (described.meta ?? {}) as FieldMeta;
}

function textOf(field: string): string {
	const meta = metaOf(field);
	return `${meta.helpText ?? ''} ${meta.valueText ?? ''}`.toLowerCase();
}

describe('Einwilligungstexte', () => {
	describe('privacyConsent — Pflicht, deckt Upload und fachliche Prüfung', () => {
		it('erwähnt hochgeladene Aufnahmen', () => {
			expect(textOf('privacyConsent')).toMatch(/aufnahme|foto|bild/);
		});

		it('sagt, dass Aufnahmen zur Prüfung der Meldung verwendet werden', () => {
			expect(textOf('privacyConsent')).toMatch(/prüfung|bestimmung|auswertung/);
		});

		it('erklärt die Veröffentlichung der Aufnahmen nicht für beschlossen', () => {
			// Die Aussage "öffentlich" darf sich nur auf die Sichtungsdaten
			// beziehen. Über die Aufnahmen entscheidet mediaConsent.
			expect(metaOf('privacyConsent').helpText ?? '').not.toMatch(
				/Aufnahmen\s+werden[^.;]*veröffentlicht/i
			);
		});

		it('verweist die Entscheidung über eine Veröffentlichung an eine eigene Wahl', () => {
			expect(textOf('privacyConsent')).toMatch(/gesondert|separat|eigene entscheidung/);
		});
	});

	describe('mediaConsent — optional, ausschließlich Veröffentlichung', () => {
		it('benennt die Veröffentlichung als Zweck', () => {
			expect(textOf('mediaConsent')).toMatch(/veröffentlich/);
		});

		it('bündelt die wissenschaftliche Auswertung nicht mehr mit ein', () => {
			// Die Auswertung ist Teil der Meldung (privacyConsent). Sie hier
			// erneut zur Bedingung zu machen, war die alte Zwecke-Kopplung.
			expect(textOf('mediaConsent')).not.toMatch(/wissenschaftlich/);
		});

		it('bleibt optional — eine Meldung ohne Veröffentlichungswunsch ist gültig', async () => {
			const field = sightingSchema.describe().fields['mediaConsent'];
			expect(field && 'optional' in field ? field.optional : false).toBe(true);
		});
	});

	/**
	 * `persistentDataConsent` beschreibt denselben Vorgang zweimal — einmal im
	 * Ankreuztext (`helpText`), einmal im Tooltip (`valueText`). Beide standen
	 * bis A5.3 auseinander: „bei zukünftigen **Sichtungs**meldungen" gegen „bei
	 * zukünftigen **Meldungen**".
	 *
	 * Anders als die vier Einwilligungen mit Fassungskennung trägt dieses Feld
	 * **keinen** Nachweis nach Art. 7 DSGVO: Es kommt weder in
	 * `consentVersions.ts` noch in `mapFormToSighting.ts` oder `schema.ts` vor
	 * und steuert allein, ob die Kontaktdaten im Browser-Speicher überleben
	 * (`localStorage.ts`). Eine Umformulierung entwertet hier also keine
	 * gespeicherte Kennung — es gibt keine.
	 */
	describe('persistentDataConsent — Ankreuztext und Tooltip sagen dasselbe', () => {
		it('nennt den Vorgang in beiden Texten „Meldung"', () => {
			const meta = metaOf('persistentDataConsent');

			expect(meta.helpText).toMatch(/zukünftigen Meldungen/);
			expect(meta.valueText).toMatch(/zukünftigen Meldungen/);
		});

		it('nennt ihn in keinem der beiden „Sichtungsmeldung"', () => {
			// Kleingeschrieben, weil `textOf` den Text bereits normalisiert — wie in
			// den Blöcken darüber. Der Regex greift damit auf „Sichtungsmeldung"
			// und „Sichtungsmeldungen" gleichermaßen.
			expect(textOf('persistentDataConsent')).not.toMatch(/sichtungsmeldung/);
		});
	});
});
