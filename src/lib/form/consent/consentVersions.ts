/**
 * Fassungen der übrigen Einwilligungstexte des Sichtungsformulars.
 *
 * Art. 7 Abs. 1 DSGVO verlangt, dass sich eine Einwilligung nachweisen lässt.
 * Ein gespeichertes „ja“ allein belegt weder **wann** noch **wozu** zugestimmt
 * wurde — deshalb wandern diese Kennungen zusammen mit dem Zeitpunkt in die
 * Sichtung (siehe `mapFormToSighting`).
 *
 * Die Medien-Einwilligung führt denselben Nachweis seit dem 2026-07-28, hat aber
 * einen eigenen Lebenszyklus und bleibt deshalb in `mediaConsentVersion.ts`.
 *
 * **Regel:** Wird der Wortlaut einer Einwilligung inhaltlich geändert, muss die
 * zugehörige Kennung auf das Datum der Änderung gesetzt werden. Altbestände
 * behalten dadurch die Fassung, der sie tatsächlich zugestimmt haben. Gemeint
 * ist die **gelesene Fläche** — Überschrift und umgebender Text im Markup
 * genauso wie der Ankreuztext in `sightingSchema.ts`.
 * `consentSurfaces.svelte.test.ts` erzwingt das über gepinnte Hashes der
 * gerenderten Flächen — ein Kommentar allein trägt diese Zusicherung nicht.
 *
 * Die Datumswerte stammen aus der Historie des Wortlauts, nicht aus dem Tag der
 * Einführung dieser Spalten: `privacyConsent` wurde zuletzt mit der
 * Medien-Einwilligung überarbeitet (6ec70dc4, 2026-07-28), `nameConsent` und
 * `shipNameConsent` zuletzt mit der Einstiegsseiten-Einführung (2026-08-06,
 * siehe unten).
 */

/**
 * Fassung des Textes zu `nameConsent` (Veröffentlichung von Vor- und Nachname).
 *
 * Auf 2026-08-06 gehoben, obwohl der **Ankreuztext** (`meta.helpText`)
 * unverändert ist: `nameConsent` teilt sich auf Schritt 4 seither eine
 * gemeinsame Überschrift mit `shipNameConsent` und `mediaConsent`
 * (`Step4Contact.svelte`, „Optionale Veröffentlichung von Namen und
 * Aufnahmen" statt vorher „… Ihres Namens"). Der Geltungsbereich der Kennung
 * ist die gelesene Einwilligungsfläche, nicht die Zeichenkette im Schema —
 * wie bei `PRIVACY_CONSENT_VERSION` unten. Seit dem 2026-08-06 ist genau das
 * gepinnt (`consentSurfaces.svelte.test.ts`); zur Zeit dieser Änderung war es
 * nur ein Kommentar, und die Kennung fiel deshalb erst einem Review auf.
 */
export const NAME_CONSENT_VERSION = '2026-08-06';

/**
 * Fassung des Textes zu `shipNameConsent` (Veröffentlichung des Schiffsnamens).
 *
 * Auf 2026-08-06 gehoben — dieselbe Überschriften-Änderung wie bei
 * `NAME_CONSENT_VERSION` oben, plus: `shipNameConsent` wird seither
 * bedingt ausgeblendet, sobald von Land gemeldet wird (`isFromLand`,
 * `Step4Contact.svelte`). Der Ankreuztext selbst ist unverändert.
 */
export const SHIP_NAME_CONSENT_VERSION = '2026-08-06';

/**
 * Fassung des Textes zu `privacyConsent` (Pflicht-Einwilligung der Meldung).
 *
 * Auf 2026-08-04 gehoben, obwohl der **Ankreuztext** (`meta.helpText`)
 * unverändert ist: Geändert wurde der Rahmentext in `RequiredConsent.svelte`
 * („um Ihre Meldung zu speichern", „Ohne diese Zustimmung kann Ihre Meldung
 * nicht gespeichert werden" — vorher jeweils „Sichtung", Änderungswunsch A5.3).
 * Der Geltungsbereich der Kennung ist die gelesene Einwilligungsfläche, nicht
 * die Zeichenkette im Schema. Seit dem 2026-08-06 deckt der gepinnte Hash in
 * `consentSurfaces.svelte.test.ts` genau diese Fläche ab; der frühere Hash über
 * den bloßen `helpText` hätte diese Änderung nicht bemerkt.
 */
export const PRIVACY_CONSENT_VERSION = '2026-08-04';
