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
 *
 * Auf 2026-08-06 gehoben, obwohl der **Ankreuztext** (`meta.helpText`)
 * unverändert ist: `mediaConsent` ist seit dem 2026-08-05 von der Dropzone
 * auf Schritt 2 (`sections/Media.svelte`) in die gemeinsame
 * Einwilligungsgruppe auf Schritt 4 gezogen (`Step4Contact.svelte`) — neue
 * Überschrift „Optionale Veröffentlichung von Namen und Aufnahmen", neuer
 * Umgebungstext, und das Feld erscheint dort seit Task 15 nur noch, solange
 * `$form.uploadedFiles` tatsächlich eine abgeschlossene Aufnahme enthält
 * (`hasUploadedMedia`). Der Geltungsbereich der Kennung ist die gelesene
 * Einwilligungsfläche, nicht die Zeichenkette im Schema — wie bei
 * `PRIVACY_CONSENT_VERSION` in `consentVersions.ts`.
 * `consentTextVersions.test.ts` sagt das im Kopfkommentar ausdrücklich, kann
 * es aber nicht prüfen.
 *
 * **Am selben Tag ein zweites Mal geändert** (UX-Review, Punkt 2): Über dem
 * Ankreuzfeld stehen seither die hochgeladenen Aufnahmen namentlich („Ihre 2
 * hochgeladenen Aufnahmen: …", `Step4Contact.svelte`) — bis dahin musste der
 * Melder zwei Schritte nach dem Upload aus dem Gedächtnis wissen, worüber er
 * entscheidet. Die Kennung bleibt `2026-08-06`, weil beide Änderungen an
 * dieselbe Fassung gehen; wäre die vorherige an einem früheren Tag gewesen,
 * müsste hier gehoben werden.
 */
export const MEDIA_CONSENT_VERSION = '2026-08-06';
