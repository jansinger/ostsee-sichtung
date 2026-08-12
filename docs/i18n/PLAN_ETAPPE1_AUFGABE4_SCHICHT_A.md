# Etappe 1, Aufgabe 4 — Schicht A (`sightingSchema.ts`)

**Ziel:** Die rund 259 deutschen Zeichenketten in
`src/lib/form/validation/sightingSchema.ts` kommen aus dem Botschaftskatalog, und
das Schema wird je Locale gebaut statt einmal beim Modulladen.

**Der Prüfstein bleibt** `src/lib/form/validation/germanBaseline.json`: 56
Schema-Felder, 17 Label-Dateien, 65 Validierungsmeldungen im heutigen Wortlaut.
Er darf sich nicht ändern.

## Globale Randbedingungen

- `germanBaseline.json` wird **nicht angefasst**. Wird der Schnappschuss rot, ist
  der Umbau falsch — Abweichung melden, nicht die Erwartung anpassen.
- Deutsche Texte werden **verschoben, nicht umformuliert**.
- Kein `any`, explizite Rückgabetypen, `noUncheckedIndexedAccess` ist aktiv.
- Bezeichner englisch, Kommentare und Testnamen deutsch.
- Conventional Commits; `i18n` ist **kein** erlaubter Scope — `report`, `api`,
  `test`, `types` sind es.
- Nach jedem Commit: `npm run test:quick` grün.

## Bereits gemessen — nicht neu herleiten

- Die 259 Schlüssel (`sighting_*`) stehen **bereits** in `messages/de.json` und
  `en.json`, geschrieben in Aufgabe 3.1. Sie müssen nicht neu vergeben werden.
- **Die Legacy-API benutzt dieses Schema nicht.** `requestValidation.ts` ist der
  einzige serverseitige Verbraucher von `sightingSchemaBase` und wird
  ausschließlich von `src/routes/api/sightings/+server.ts` gerufen. `/api` ist
  laut Entwurf 4.2 von der Lokalisierung ausgenommen. Die Falle aus Aufgabe 3
  droht hier also **nicht** — trotzdem selbst nachprüfen, siehe 4.2 Schritt 1.
- Laufzeit-Verbraucher (ohne Tests): `formConfig.ts`, `types/Form.ts` (nur
  `yup.InferType`, keine Laufzeit), `requestValidation.ts`,
  `routes/api/sightings/+server.ts`, `routes/api/sightings/[id]/+server.ts`,
  `ModernReportForm.svelte`, `AdminSightingEditForm.svelte`.
- `formConfig.ts` hält **drei Modulkonstanten** aus `describe()` (Zeilen 16, 18,
  20). Das ist die eigentliche Arbeit dieser Aufgabe.

---

## Aufgabe 4.1 — Der fehlende Beweis: wirkt der Sprachwechsel überhaupt?

**Diese Teilaufgabe kommt zuerst, und sie ist die wichtigste.**

Alle siebzehn Locale-Zusicherungen im Projekt sind **negativ** formuliert
(`expect(x).not.toBe(DIVERGED_EN_LABEL)`). Sie belegen, dass Deutsch dort
erhalten bleibt, wo es erhalten bleiben muss. **Keine einzige belegt, dass
Englisch ankommt.**

Die Folge: Würde `memoizePerLocale` sein Locale-Argument ignorieren, würden alle
Botschaftsfunktionen `{ locale }` verwerfen, oder wäre der ganze Mechanismus tot —
der Schnappschuss bliebe grün, die 479 E2E-Tests blieben grün, alle
Pinning-Guards blieben grün. Die Anwendung wäre einsprachig, und nichts würde es
sagen.

Das ist dieselbe Fehlerklasse wie in Etappe 0 („acht Tests grün, die die
geschützte Funktion gar nicht sahen"), nur eine Ebene höher: Hier ist nicht ein
Test blind, sondern die gesamte Testmenge in eine Richtung.

- [ ] **Schritt 1: Den Gegenbeweis schreiben**

Ein Test, der für Schicht B (bereits umgebaut) belegt, dass eine **abweichende
englische Botschaft auch wirklich ankommt**:

- dieselbe Divergenz-Mechanik wie in den vorhandenen `*LocalePinning.test.ts`
  (englische Botschaft auf einen Sentinel setzen),
- dann `getSpeciesLabel(…, 'en')`, `getSeaStateLabel(…, 'en')` und mindestens
  eine Options-Liste unter `'en'` abfragen,
- und `toBe(SENTINEL)` erwarten — **positiv**, nicht `not.toBe`.

Dazu die Gegenrichtung im selben Test: unter `'de'` kommt weiterhin der deutsche
Text. Erst beide Richtungen zusammen belegen einen Schalter.

- [ ] **Schritt 2: Rot bestätigen — und zwar am echten Mechanismus**

Mutation: In `src/lib/i18n/localeMemo.ts` das Locale-Argument ignorieren
(`build(baseLocale)` statt `build(locale)`). Erwartet: der neue Test wird rot,
**und alle anderen Tests bleiben grün** — das ist der Beleg für die Lücke.
Ergebnis wörtlich in den Bericht, danach zurücksetzen.

- [ ] **Schritt 3: Commit**

Betreff: `test(report): prove the locale switch actually changes the output`

---

## Aufgabe 4.2 — Die Schema-Fabrik

**Dateien:** `src/lib/form/validation/sightingSchema.ts`, `src/lib/report/formConfig.ts`,
die sechs Laufzeit-Aufrufstellen, deren Tests.

- [ ] **Schritt 1: Verbraucher selbst prüfen, bevor irgendetwas umgebaut wird**

Such über den ganzen `src/`-Baum nach Verbrauchern von `sightingSchema`,
`sightingSchemaBase`, `adminSightingSchema`, `sightingSchemaDescription`,
`sightingSchemaFields` und `initialFormState` — mehrzeilige Importe
eingeschlossen. **Verlass dich auf die Liste oben nicht.** In Aufgabe 3 lag genau
so eine Liste dreimal falsch, zuletzt bei der Benachrichtigungsmail ans Museum.

Findet sich ein Verbraucher in der Legacy-API (`src/routes/rest_sichtungen/`,
`src/routes/sichtungen/`) oder in den vier Export-Dateien
(`src/lib/server/export/`), dann muss er auf `baseLocale` festgenagelt werden —
mit einem Guard nach dem Muster der vorhandenen `*LocalePinning.test.ts`, also
mit künstlich abweichender englischer Botschaft.

- [ ] **Schritt 2: `buildSightingSchema(locale)`**

Die 259 Literale werden zu `m.sighting_*({}, { locale })`. Der Trockenlauf
`npm run i18n:extract` zeigt Fundstellen und Schlüssel — **für Schicht A ist die
dort gezeigte Ersetzungsform richtig** (anders als bei Schicht B, wo sie in eine
Modulkonstante gezeigt hätte).

Nicht ersetzt werden, wie im Trockenlauf unter „Übersprungen" ausgewiesen:
`meta.type`, `meta.icon`, `meta.options`, `meta.autocomplete`, `meta.step`, die
Testnamen in `.test(name, …)`, die drei rein numerischen Platzhalter, die leere
Meldung und `.label(other.spec.label ?? 'Sonstiger Ort')` (Zeile ~1421, ein
Ausdruck — von Hand entscheiden und im Bericht begründen).

Exportiert werden drei je Locale memoisierte Fabriken über `memoizePerLocale`:
`getSightingSchemaBase`, `getSightingSchema`, `getAdminSightingSchema`. Die
bisherigen Modulkonstanten entfallen — ein `export const sightingSchema =
getSightingSchema(baseLocale)` als Übergangslösung ist **verboten**: Es wäre für
Deutsch richtig, für Englisch still falsch, und alle Tests blieben grün.

`berlinToday()` bleibt unverändert (`sv-SE` ist bewusst gewählt, siehe Entwurf
5.6). `toCalendarDay` fasst keinen Text an.

- [ ] **Schritt 3: `formConfig.ts`**

`sightingSchemaDescription` und `sightingSchemaFields` werden Funktionen mit
Locale-Parameter. `initialFormState` trägt nur Vorgabewerte und **soll eine
Konstante bleiben** — leitet es sich nicht locale-frei ableiten, dann aus
`baseLocale` bauen und das im Quelltext begründen.

- [ ] **Schritt 4: Nachweise**

- `germanBaseline.test.ts` grün, `git diff --stat` auf `germanBaseline.json` leer.
- Mutation: einen `sighting_*`-Wert in `messages/de.json` ändern,
  `npm run i18n:compile` → Schnappschuss rot → zurücksetzen.
- Der Gegenbeweis aus 4.1 auf **Schicht A** erweitern: unter `'en'` liefert eine
  divergierte Schema-Botschaft den Sentinel.
- `npm run test:quick` grün.

- [ ] **Schritt 5: Commit**

Betreff: `refactor(report): build the sighting schema per locale`

---

## Aufgabe 4.3 — Abnahme

- [ ] Vollständiger E2E-Lauf, **ohne** `CI=1`, isoliert (kein zweiter Lauf
      daneben — im letzten Durchgang erzeugte das zwei Fehlschläge, die reine
      Lastartefakte waren). Erwartet: 479 grün.
- [ ] `grep` über `sightingSchema.ts`: kein deutsches Anzeigetext-Literal mehr,
      ausgenommen die im Bericht begründeten Ausnahmen.
- [ ] Protokoll `docs/i18n/ARBEITSPROTOKOLL_ETAPPE1.md` fortschreiben.

## Abnahme von Aufgabe 4

1. `germanBaseline.json` bitgleich.
2. Positiver Sprachwechsel-Nachweis vorhanden, für Schicht A **und** B.
3. Kein Verbraucher in Legacy-API oder Export ungepinnt.
4. `test:quick` grün, E2E 479 grün.
5. Jede Teilaufgabe mit Mutation im Commit-Body.
