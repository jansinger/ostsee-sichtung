# Etappe 2 — Schicht C (Markup), Formatierung, Plurale, hreflang

**Stand der Planung: 2026-08-11.** Etappe 1 (Schichten A und B) ist abgeschlossen,
siehe `ARBEITSPROTOKOLL_ETAPPE1.md`.

## Umfang — gemessen, nicht aus dem Entwurf übernommen

Der Entwurf nennt für Schicht C **448 Botschaften über rund 72 Dateien**. Gemessen
über `docs/i18n-inventory.json`, ohne `/styleguide`, `/docs` und
`ApiDocumentation.svelte` (Entwurf 4.2):

|                                                           |   Funde | Dateien |
| --------------------------------------------------------- | ------: | ------: |
| Svelte gesamt im Umfang                                   | **449** |      68 |
| davon Textknoten                                          |     346 |         |
| davon Attribute                                           |     103 |         |
| mit dynamischer Interpolation — **nicht mechanisch**      |       9 |         |
| mit Ziffer — Plural-Kandidaten, menschlich zu entscheiden |      12 |         |

**Korrektur am Entwurf:** Von den 449 gehören 98 zu Dateien, die Entwurf §3 selbst
der Schicht E zuordnet — `routes/about/+page.svelte` (67),
`SpeciesIdentificationHelp.svelte` (25), `routes/bestimmungshilfe/+page.svelte` (6).
Die Zahl 448 zählt sie mit. Echte Schicht C sind **351 über 65 Dateien**.

**Entscheidung vom 2026-08-11:** Die Struktur dieser 98 wird trotzdem in Etappe 2
mitgenommen — dieselbe Mechanik, dieselben Dateien, einmal angefasst statt zweimal.
Der **Inhalt** bleibt offen: `messages/en.json` trägt weiter den deutschen
Wortlaut, die englischen Fachtexte liefert das Museum später als Diff auf einer
Datei. Etappe 4 schrumpft damit auf „Inhalt einpflegen".

## Reihenfolge (Entscheidung vom 2026-08-11)

1. **Formatierung und `en-GB`** — klein, unabhängig, berührt einen bestehenden
   Charakterisierungstest. Jetzt, damit sie nicht zwischen 65 Dateiumbauten verloren geht.
2. **Der Extraktor lernt Svelte** — Trockenlauf, Diff-Vorschau, kein Schreiben.
3. **Markup in Wellen** — 68 Dateien, nach Nutzersichtbarkeit.
4. **Plurale** — die 12 Kandidaten, ICU, von Hand.
5. **`hreflang` und `og:locale`** — je Route.

Der Rollout-Schalter `TRANSLATION_ROLLOUT_COMPLETE` bleibt `false`. Er hängt an
drei Schritten, die zusammengehören (`src/lib/i18n/translationRolloutStage.ts`);
`hreflang` ist einer davon, die englischen Inhalte fehlen weiterhin.

## Was aus Etappe 1 hier weitergilt

- **Die Locale-Falle.** Dreimal zugeschlagen (Legacy-API, CSV-Export,
  Benachrichtigungsmail). Vor jedem Umbau die echten Verbraucher selbst prüfen;
  eine Grep-Aussage von mir hat sich dreimal als falsch erwiesen.
- **Positive Nachweise.** `localeSwitchProof.test.ts` ist das Muster: Eine
  Zusicherung, die nur `not.toBe(…)` prüft, belegt nicht, dass der Sprachwechsel
  wirkt.
- **Der Hartcodiert-Guard** (`hardcodedStringScan.test.ts`) deckt heute nur
  Schicht A und B. Er ist in Teil 3 um die Markup-Dateien zu erweitern.

---

## Aufgabe 2.1 — Anzeigesprache `en-GB`

**Dateien:** `src/lib/utils/format/dateTime.ts`, `dateTime.test.ts`, die
öffentlichen `Intl.NumberFormat`-Aufrufstellen.

### Der Kern: Anzeigesprache ist nicht Zeitzone

Entwurf 5.6 nennt das die wichtigste Regel des Abschnitts, weil ihr Bruch keine
kaputte Oberfläche erzeugt, sondern **falsche Daten**: Der Sichtungstag ist
fachlich immer Berliner Ortszeit.

Etappe 0 hat dafür bereits einen Guard gebaut, und zwei Planfehler dabei
gefunden, die hier wieder drohen (`ARBEITSPROTOKOLL_ETAPPE0.md`, Task 7):

- Der erste Testzeitpunkt lag in einem Fenster, in dem Berlin und London
  denselben Kalendertag zeigen — die naheliegendste falsche Kopplung
  (`en` → `Europe/London`) wäre grün geblieben. Deshalb 22:30 UTC.
- Der Test prüfte `de-DE`/`en-GB`, die App reicht aber `de`/`en` durch. Eine
  Zone-Map auf die kurzen Tags mit Berlin-Fallback wäre grün geblieben.

**Beide Fallen gelten für diese Aufgabe unverändert.** `en-GB` ist eine
Anzeigesprache. Die Zone bleibt `Europe/Berlin`, für jede Locale.

- [x] **Schritt 1: Den Charakterisierungstest auf `en-GB` ziehen**

`dateTime.test.ts` hält heute für `'en'` das US-Format fest (`07/16/2026`,
`12:30 AM`) — ein bewusst dokumentierter Bestandsstand aus Etappe 0, kein
Versehen. Er wird auf `en-GB` gezogen (`16/07/2026`, `00:30`).

Der Test ist **zuerst** zu ändern und rot laufen zu lassen. Ein
Charakterisierungstest, der nach der Implementierung angepasst wird, hält nichts
fest.

- [x] **Schritt 2: Die Zuordnung**

Eine benannte Abbildung von der Paraglide-Locale auf die Anzeigesprache:
`de → de-DE`, `en → en-GB`. Sie gehört an **eine** Stelle, nicht in jede
Aufrufstelle. `APP_LOCALE` (`dateTime.ts:24`) wird ihr Default für `de`.

**`sv-SE` bleibt, wo es steht** (`dateTime.ts:304`, `:346`, `berlinToday()` in
`sightingSchema.ts`). Das ist eine Rechnung, keine Darstellung — `sv-SE` liefert
die ISO-Reihenfolge, und der Vergleich hängt danach an keiner Zeitzone.

- [x] **Schritt 3: Die Zeitzonen-Invariante schärfen**

Der vorhandene Guard aus Etappe 0 muss auch nach der Umstellung die vier
Bruch-Varianten rot machen. Zusätzlich ein Fall, den es vorher nicht geben
konnte: **`en-GB` darf nicht `Europe/London` nach sich ziehen.** Testzeitpunkt so
wählen, dass Berlin und London verschiedene Kalendertage zeigen — sonst ist der
Test grün, ohne etwas zu belegen (das ist Planfehler 8 aus Etappe 0, wörtlich).

- [x] **Schritt 4: Die öffentlichen Zahlformate**

`routes/about/+page.svelte:517` und `:532` formatieren
`Intl.NumberFormat('de-DE')` — öffentlich sichtbar, folgt also der Locale.

`routes/admin/statistics/statisticsFormat.ts` und `activityHeatmap.ts` liegen im
**Admin-Bereich** und bleiben unverändert (Entwurf 4.2: Admin wird nicht
lokalisiert). Das ist zu belegen, nicht anzunehmen — kurz prüfen, ob die Dateien
wirklich nur von `/admin` aus erreichbar sind.

Belegt: `statisticsFormat.ts`/`activityHeatmap.ts` haben genau einen Importer,
`routes/admin/statistics/+page.svelte`, unter `/admin` und damit hinter
`requireUserRole` (`admin/+layout.server.ts`). `about/+page.svelte` folgt jetzt
`resolveDisplayLocale(getLocale())` statt fest `'de-DE'`.

- [x] **Schritt 5: Nachweise**

- Beide Richtungen: unter `de` deutsches Format, unter `en` britisches. Positiv
  formuliert, nicht nur `not.toBe`.
- Mutation: die Zuordnung auf `en → en-US` ändern → Charakterisierungstest rot →
  zurücksetzen.
- Mutation: `en → Europe/London` erzwingen → Zeitzonen-Guard rot → zurücksetzen.
- `npm run test:quick` grün, `germanBaseline.json` unverändert.

**Aufgabe 2.1 abgeschlossen** (2026-08-11). Alle fünf Schritte umgesetzt und
verifiziert, siehe Nachweise oben.

---

## Aufgaben 2.2 bis 2.5

Werden einzeln geplant, sobald 2.1 abgenommen ist — nach der Lehre aus Etappe 0
(„Pläne klein schneiden. Neun Tasks in einem Dokument waren zu viel.").
