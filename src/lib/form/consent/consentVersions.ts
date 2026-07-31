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
 * **Regel:** Wird der Wortlaut einer Einwilligung in `sightingSchema.ts`
 * inhaltlich geändert, muss die zugehörige Kennung auf das Datum der Änderung
 * gesetzt werden. Altbestände behalten dadurch die Fassung, der sie tatsächlich
 * zugestimmt haben. `consentTextVersions.test.ts` erzwingt das über gepinnte
 * Hashes der Texte — ein Kommentar allein trägt diese Zusicherung nicht.
 *
 * Die Datumswerte stammen aus der Historie des Wortlauts, nicht aus dem Tag der
 * Einführung dieser Spalten: `nameConsent` und `shipNameConsent` sind seit
 * f7f9c10d (2025-08-12) unverändert, `privacyConsent` wurde zuletzt mit der
 * Medien-Einwilligung überarbeitet (6ec70dc4, 2026-07-28).
 */

/** Fassung des Textes zu `nameConsent` (Veröffentlichung von Vor- und Nachname). */
export const NAME_CONSENT_VERSION = '2025-08-12';

/** Fassung des Textes zu `shipNameConsent` (Veröffentlichung des Schiffsnamens). */
export const SHIP_NAME_CONSENT_VERSION = '2025-08-12';

/** Fassung des Textes zu `privacyConsent` (Pflicht-Einwilligung der Meldung). */
export const PRIVACY_CONSENT_VERSION = '2026-07-28';
