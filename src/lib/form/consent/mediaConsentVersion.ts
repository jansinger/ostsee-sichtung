/**
 * Fassung des Einwilligungstextes zur Veröffentlichung von Aufnahmen.
 *
 * Art. 7 Abs. 1 DSGVO verlangt, dass sich eine Einwilligung nachweisen lässt.
 * Ein gespeichertes „ja“ allein belegt nicht, **wozu** zugestimmt wurde —
 * deshalb wandert diese Kennung zusammen mit dem Zeitpunkt in die Sichtung.
 *
 * **Regel:** Wird der Wortlaut von `mediaConsent` in `sightingSchema.ts`
 * inhaltlich geändert, muss diese Kennung auf das Datum der Änderung gesetzt
 * werden. Altbestände behalten dadurch die Fassung, der sie tatsächlich
 * zugestimmt haben.
 */
export const MEDIA_CONSENT_VERSION = '2026-07-28';
