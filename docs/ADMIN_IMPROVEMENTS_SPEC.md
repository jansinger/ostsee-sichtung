# Spec: Admin-Bereich — Verbesserungen aus dem Review vom 2026-08-08

Grundlage ist das Admin-Review vom 2026-08-08 (Usability, UX, Function-Check).
Die vier Function-Bugs daraus (Filterverlust Zurück-Link, „1 Fotos ausstehend",
Datumsfilter nur mit beiden Grenzen, Statistik zählt Abgelehnte als offen) sind
bereits separat in Arbeit und **nicht** Teil dieser Spec.

Jeder Punkt nennt seinen Umsetzungsweg:

- **Agent (sonnet)** — klar umrissen, wenig Entscheidungsspielraum.
- **Agent (opus)** — Schema-/API-Änderungen, A11y-Muster oder heikles CSS.
- **Follow-Up-Chip** — größerer Wurf, eigene Session mit eigenem Review.

Für alle Agent-Punkte gilt das Projekt-Reglement: Test-First (RED→GREEN),
Svelte 5 Runes, Design-System-Regeln (`.claude/rules/design-system.md`),
deutsche Warum-Kommentare, kein Commit durch den Agenten.

**Reihenfolge/Konflikte:** U2, U5 und X1 ändern alle
`src/routes/admin/sichtungen/+page.svelte` — sie dürfen nicht parallel laufen.
Empfohlene Wellen: zuerst U1, U4, X2, X3, X4 (disjunkte Dateien, parallel),
danach sequenziell X1 → U2 → U5.

---

## Usability

### U1 — `freigegeben_von` einführen (Agent: opus)

**Befund:** Ablehnungen speichern `abgelehnt_von` und zeigen „Abgelehnt am …
durch X"; Freigaben speichern nur `freigegeben_am`. Im Team ist nicht
nachvollziehbar, wer freigegeben hat.

**Umsetzung:**

1. Schema (`src/lib/server/db/schema.ts`): neue nullable Spalte
   `freigegeben_von` (`text`), symmetrisch zu `abgelehnt_von`. Migration mit
   `npm run db:generate` erzeugen und **committen** (CLAUDE.md-Pflicht).
   Altbestand bleibt `NULL` — das Altsystem liegt auf derselben DB, eine
   nullable Zusatzspalte ist rückwärtskompatibel.
2. `PATCH /api/sightings/[id]/verify`: beim Verdict `approve` zusätzlich
   `freigegeben_von` mit derselben Identität stempeln, die heute
   `abgelehnt_von` bekommt; `reset` löscht beide `_von`-Spalten mit.
   **Nur** dieser Endpunkt schreibt die Spalte (Zwei-Spalten-ein-Vorgang-Regel
   aus CLAUDE.md gilt sinngemäß weiter).
3. Anzeige: Detailansicht (`AdminSightingView.svelte`, Status-Leiste) und
   Edit-Kopf (`AdminSightingEditForm.svelte`) zeigen „Freigegeben am … durch X"
   analog zum Abgelehnt-Fall; `FrontendSighting`-Typ und API-Mapping ergänzen.

**Akzeptanz:** Approve stempelt Zeit + Person; Reset räumt beides; Altbestand
ohne Person zeigt weiterhin nur das Datum (kein „durch null").
**Tests:** Endpunkt-Tests am verify-Endpoint (approve/reset), Anzeige-Test in
`AdminSightingView.svelte.test.ts`. `verifiedReadScan.test.ts` muss grün
bleiben.

### U2 — Spaltenauswahl merken (Agent: sonnet, nach X1)

**Befund:** `columnVisibility` in `src/routes/admin/sichtungen/+page.svelte`
ist reiner Komponenten-State — jeder Reload setzt auf den Default zurück.

**Umsetzung:** Persistenz in `localStorage` (Schlüssel z. B.
`admin.sichtungen.columns`, versioniert: `{ v: 1, columns: {...} }`).
Beim Laden mergen mit dem Default (neue Spalten erscheinen mit ihrem
Default-Wert, entfernte Schlüssel werden ignoriert) — sonst versteckt ein
alter Eintrag künftige Spalten für immer. SSR-sicher: Zugriff nur im Browser
(`$effect` bzw. `typeof window`-Guard, Regel aus `architecture.md`).

**Akzeptanz:** Auswahl übersteht Reload; ungültiges/altes JSON fällt still auf
den Default zurück; SSR rendert ohne Fehler.
**Tests:** Extraktion der Merge-/Parse-Logik in ein TS-Modul
(`columnPreferences.ts`) mit Unit-Tests (kaputtes JSON, unbekannte Schlüssel,
neue Spalte).

**Umgesetzt (2026-08-10)** in `src/routes/admin/sichtungen/columnPreferences.ts`
plus Spalten-Dropdown in `+page.svelte`; Regressionstest in
`tableColumns.svelte.test.ts`.

Das Akzeptanzkriterium „Auswahl übersteht Reload" galt bis dahin **nicht** —
und zwar nicht, weil die Persistenz fehlte, sondern weil sie nie lief. Der eine
`$effect`, der schreiben sollte, kehrte in seinem ersten Durchlauf zurück,
_bevor_ er `columnVisibility` gelesen hatte. Svelte 5 ermittelt die
Abhängigkeiten eines Effekts aus den Werten, die er tatsächlich gelesen hat —
der Effekt hatte damit gar keine, lief genau einmal und schrieb nie nach
`localStorage`. Die Spalten fielen für jeden Bearbeiter bei jedem Reload auf den
Default zurück, ohne dass irgendetwas brach. Drei Festlegungen aus der
Umsetzung:

- **Zwei Effekte statt einem.** Einer lädt (einmalig), einer schreibt (bei
  Änderung). Die Trennung ist nicht Kosmetik: Sie ist die einzige Form, in der
  der schreibende Effekt seinen Wert unbedingt liest und damit überhaupt
  abonniert. Wer sie wieder zusammenlegt, stellt den Bug her.
- **Der Lesezugriff steht vor jedem `return`.** Auch im getrennten Effekt gilt
  das: Ein Guard oberhalb des `serializeColumnPreferences(columnVisibility)`
  bringt denselben Fehler zurück, nur unauffälliger.
- **Ein bloßer Seitenaufruf schreibt nichts.** Der Speicher wird erst berührt,
  wenn der Bearbeiter etwas ändert (`letzterPersistierterStand`). Sonst würde
  der Default beim ersten Besuch festgeschrieben, und eine spätere Änderung an
  `DEFAULT_COLUMN_VISIBILITY` erreichte niemanden mehr, der die Seite je offen
  hatte — `mergeColumnPreferences` behält gespeicherte Schlüssel.

### U3 — Suche über Sichtungen (**Follow-Up-Chip**)

**Befund:** Es gibt keinen Weg, eine Sichtung per E-Mail, Name, Referenz-ID
oder Ortstext zu finden. Der Ref-Lookup (`/admin/ref/[refId]`) existiert, hat
aber kein Eingabefeld in der UI.

**Umsetzung (Skizze für die eigene Session):**

- Ein Suchfeld im Kopf von `/admin/sichtungen`, URL-Parameter `q`, serverseitig
  `ILIKE`-Suche über `referenz_id`, `email`, `vorname`/`nachname`,
  `fahrwasser` (parametrisiert via Drizzle, kein SQL-String).
- `q` muss in **drei** bestehende Parameterlisten: Export
  (`exportFilterParams.ts`), Rückweg (`tableReturnUrl.ts` — dessen
  Abgleich-Test wird sonst rot, das ist gewollt) und Filteranzeige im
  Export-Modal.
- Trefferanzeige: normale Tabelle mit aktivem `q`; Referenz-ID-Exakt-Treffer
  darf direkt auf die Detailseite weiterleiten (Verhalten wie Ref-Lookup).
- Performance: `ILIKE '%…%'` auf 20k Zeilen ist vertretbar; Index-Frage
  (`pg_trgm`) in der Session prüfen, nicht vorab entscheiden.

### U4 — Eingang: Standardsortierung neueste zuerst (Agent: sonnet)

**Befund:** Der Eingang sortiert per Default älteste zuerst (FIFO). Mit
~650 offenen Meldungen inkl. Altbestand ab 2013 sieht ein Bearbeiter zuerst
13 Jahre alte Meldungen; Aktuelles ist nur über den Toggle erreichbar.

**Entscheidung (Jan, 2026-08-08):** Default wird `desc` (neueste zuerst); der
Toggle bleibt.

**Umsetzung:** In `src/routes/admin/+page.server.ts` den Default von `asc` auf
`desc` drehen (`?order=asc` bleibt als bewusste Wahl erhalten) und den
FIFO-Begründungskommentar ersetzen (neue Begründung: Backlog macht FIFO
unbrauchbar, Entscheidung dokumentieren). Toggle-Beschriftung in
`src/routes/admin/+page.svelte` prüfen — sie zeigt die **aktive** Richtung an
und muss mit dem neuen Default weiterhin stimmen.

**Akzeptanz:** `/admin` ohne Parameter zeigt neueste zuerst; `?order=asc`
zeigt älteste zuerst; Toggle wechselt korrekt.
**Tests:** `inboxPage.server.test.ts` erweitern (Default-Richtung, explizites
`asc`).

### U5 — Bulk-Aktionen in der Tabelle (Agent: opus, nach U2)

**Befund:** Offensichtliche Spam-Wellen oder Altbestand lassen sich nur
zeilenweise abarbeiten.

**Umsetzung:**

- Checkbox-Spalte links (fester Platz wie der Totfund-Marker, **nicht** in
  `availableColumns`), „Alle auf dieser Seite"-Checkbox im Kopf
  (indeterminate-Zustand bei Teilauswahl).
- Aktionsleiste erscheint bei Auswahl > 0 (über der Tabelle): „N ausgewählt —
  Freigeben / Ablehnen / Auswahl aufheben".
- Ausführung client-seitig sequenziell über den bestehenden
  `submitVerdict(id, verdict)` (kein neuer Bulk-Endpunkt — der
  verify-Endpunkt bleibt der einzige Schreibweg). Fortschrittsanzeige,
  Fehler je Zeile einsammeln und am Ende als Toast zusammenfassen.
- Undo: ein Toast „N Sichtungen freigegeben — Rückgängig" mit
  `SIGHTING_STATUS_UNDO_MS`, Rückgängig schickt `reset` für alle erfolgreichen
  IDs (gleiches Muster wie Einzel-Undo).
- Auswahl wird bei Seitenwechsel/Filterwechsel geleert (kein
  Cross-Page-Gedächtnis — bewusst, sonst löst „Freigeben" Unsichtbares aus).

**Akzeptanz:** Teilfehler blockieren die übrigen nicht; Undo stellt alle
erfolgreich geänderten zurück; Mobile-Kartenansicht bleibt unverändert
(Bulk nur Desktop-Tabelle).
**Tests:** Auswahl-State-Logik als Modul testen (selectAll/teilweise/leeren
bei Datenwechsel); Verdict-Schleife mit gemocktem `submitVerdict`
(Teilfehler-Fall).

---

## UX

### X1 — Status- und Aktionsspalte erreichbar machen (Agent: opus, vor U2/U5)

**Befund:** Bei Standard-Spaltenauswahl laufen Status-Control und Aktionen auf
1456 px aus dem Viewport — genau die Spalten, wegen derer man die Tabelle
öffnet, erfordern horizontales Scrollen.

**Umsetzung, zwei Teile:**

1. **Default-Spaltenauswahl bereinigen:** `email`, `distance` und
   `distribution` per Default auf `false` (bleiben über „Spalten" zuschaltbar).
   Referenz-ID, Datum×2, Tierart, Anzahl, Jung, Aufnahme, Spam, Ostsee,
   Status, Aktionen bleiben an.
2. **Fixieren prüfen:** Status + Aktionen als sticky-rechts
   (`position: sticky; right: 0`) im Scroll-Container. Achtung Zebra/Hover:
   sticky-Zellen brauchen einen opaken Hintergrund, der Zeilen-Hover und
   Zebra mitmacht — mit Theme-Tokens lösen (`bg-base-100`/`bg-base-200`),
   keine Hex-Werte. Wenn das mit `table-zebra` nicht sauber hinzubekommen ist
   (Kanten, Schatten), ist Teil 1 allein akzeptabel — dann den Verzicht im
   Code begründen.
   Zusätzlich: `hover:bg-base-300` von den **nicht** sortierbaren `<th>`
   entfernen (suggeriert Klickbarkeit).

**Akzeptanz:** Auf 1440 px mit Default-Spalten sind Status + Aktionen ohne
horizontales Scrollen sicht- und bedienbar.
**Tests:** bestehende Tabellen-Tests grün; visuelle Verifikation im Browser
(Screenshot) gehört zur Abnahme.

### X2 — Einstellungen: „Zurücksetzen" entschärfen (Agent: sonnet)

**Befund:** Der Reset-Button ist als voller Warn-Button oben rechts das
prominenteste Element der Seite — für eine destruktive Aktion die falsche
Hierarchie (`design-system.md`: destruktiv = `btn btn-outline btn-error`,
immer mit Bestätigung).

**Umsetzung:** In `src/routes/admin/settings/+page.svelte`: Variante auf
`btn btn-outline btn-error btn-sm` ändern und aus der Kopfzeile ans Ende der
Seite (unter die Kategorien) verschieben; Bestätigungsdialog davor — prüfen,
ob bereits einer existiert (`confirm()` o. ä.): falls nur `confirm()`, auf den
projektüblichen Dialog (`DeleteDialog.svelte`-Muster) umstellen; der Dialog
benennt konkret, was passiert („Alle Einstellungen auf die Vorbelegung
zurücksetzen — gespeicherte Werte gehen verloren").

**Akzeptanz:** Kein Reset ohne expliziten Dialog; Button folgt der
Destruktiv-Konvention; Primärplatz oben rechts gehört wieder dem Toggle.
**Tests:** bestehende Settings-Tests grün; Dialog-Flow als Component-Test,
falls ohne großen Aufwand möglich (sonst begründen).

### X3 — Edit-Seite aufräumen (Agent: opus)

**Befund:** Überschrift sagt „Sichtung Details" statt „bearbeiten";
„Abbrechen" und der Layout-Button „Zurück zur Tabelle" verwerfen Änderungen
kommentarlos; der Speichern-Button nutzt `disabled` entgegen dem
`aria-disabled`-Muster aus `design-system.md`.

**Umsetzung** (`src/routes/admin/[id]/edit/+page.svelte`,
`AdminSightingEditForm.svelte`):

1. Überschrift und `<title>` auf „Sichtung bearbeiten".
2. Unsaved-Changes-Guard: Dirty-Zustand aus dem Form-Context ableiten
   (`createForm` prüfen — gibt es `isDirty`? Sonst Werte-Vergleich gegen
   `initialValues`). Bei Navigation mit ungespeicherten Änderungen
   (`beforeNavigate` aus `$app/navigation`) Bestätigung verlangen; erfolgreiches
   Speichern und „Abbrechen"-Bestätigung setzen den Guard außer Kraft.
3. Speichern-Button: `disabled={$isSubmitting || !$isValid}` ersetzen nach dem
   Muster aus `design-system.md` („Gesperrte Schaltflächen"): Wächter in der
   Handler-Funktion, `aria-disabled` nur für den Laufend-Zustand ist hier
   **falsch** (fehlende Eingabe → Fehlermeldung zeigen/fokussieren statt
   sperren; nur der laufende Submit bleibt hart `disabled`). Die Regel-Datei
   dazu vollständig lesen und das dortige `StepNavigation`-Muster übernehmen.

**Akzeptanz:** Wegnavigieren mit Änderungen fragt nach; Speichern mit
Validierungsfehlern springt zur Fehlerliste statt still gesperrt zu sein;
Tastatur-Fokus geht bei laufendem Submit nicht verloren.
**Tests:** Dirty-Ableitung als Unit-Test; Guard-Verhalten als Component-Test
soweit machbar, sonst dokumentierte manuelle Verifikation.

### X4 — Statistik-Seite: Beschriftung und Zahlenformat (Agent: sonnet)

**Befund:** (a) Spaltenlabel „Mortalität" behauptet eine Kennzahl, deren
Nicht-Herleitbarkeit im Kommentar derselben Datei begründet ist (nur Anteil
der Totfund-_Meldungen_). (b) `formatPercentage` liefert `9.2%` mit
Dezimalpunkt, direkt neben deutsch formatierten Zahlen (`19.284`).

**Umsetzung** (`src/routes/admin/statistics/+page.svelte`):

1. Spaltenkopf „Mortalität" → „Totfund-Anteil"; die Zellen-Schwellwerte
   (30 %/15 %) bleiben.
2. `formatPercentage` auf `Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 1 })`
   bzw. äquivalent mit Komma umstellen (Achtung: `style: 'percent'`
   multipliziert mit 100 — Eingabewerte entsprechend teilen oder
   `minimumFractionDigits` mit manueller Division nutzen; Tests entscheiden).
3. Kurz prüfen, ob weitere „Mortalität"-Wörter auf der Seite stehen (Tabelle
   Artenverteilung) und mitziehen.

**Akzeptanz:** Alle Prozentwerte der Seite mit Komma; kein „Mortalität" mehr.
**Tests:** `formatPercentage` als reine Funktion extrahieren + Unit-Tests
(0, 9.2, 100, String-Input).

---

### X5 — Statusreiter, Filter-Chips und URL als einzige Filterquelle

Nachgetragen aus dem UX-Review der Sichtungstabelle vom 2026-08-09; nicht Teil
des ursprünglichen Reviews vom 2026-08-08.

**Umgesetzt (2026-08-10)** in `activeFilters.ts`, `statusTabs.ts` /
`StatusTabs.svelte` und `filterChips.ts`, jeweils neben `+page.svelte`; E2E in
`e2e/admin-status-tabs.spec.ts`.

- **Der Filterzustand steht ausschließlich in `page.url`.** `currentFilters` las
  vorher nur `q` aus der URL und die übrigen sieben Filter aus dem Feld-State
  des Panels. Wer ein Datum eintippte, nicht „Anwenden" klickte und dann
  exportierte, exportierte eine Menge, die die Tabelle nie gezeigt hatte. Die
  Feld-States sind seither reiner Editier-Puffer und speisen nur `applyFilters()`.
- **Die Statusreiter zählen über die gefilterte Menge _ohne_ den Statusfilter
  selbst** — sonst stünde auf jedem inaktiven Reiter eine 0. Die Bedingungen
  kommen aus `approvalFilter.ts`; „offen" ist nicht ein zweites Mal formuliert.
- **Die Reiter sind kein zweiter Zustand.** Sie schreiben denselben
  `?verified=`-Parameter wie das `<select>` im Panel, das bewusst stehen bleibt.
- **Chips zeigen keinen Status-Chip**, solange die Reiter eingebunden sind
  (`skipVerified`) — der aktive Reiter sagt dasselbe bereits.
- **Beschriftungen haben genau eine Quelle.** Chips, Reiter und die
  `<option>`-Listen des Panels lesen aus denselben Presentation-Modulen;
  `AUFNAHME_LABEL`/`MELDEART_LABEL` liegen in `filterChips.ts`, und das Panel
  rendert daraus, statt die Wörter ein zweites Mal zu tippen.

Bewusst **nicht** umgesetzt (Entscheidung aus dem Review): Löschen-Knopf in ein
Overflow-Menü, Zeilenklick → Detail, „Springe zu Seite N", Schnellbereiche im
Datumsfilter.

---

## Brainstorming (alle als **Follow-Up-Chip**)

Diese fünf sind bewusst keine Agent-Aufgaben: Sie brauchen Produkt- und
Design-Entscheidungen, teils Schema-Erweiterungen, und verdienen eigene
Sessions mit eigenem Review.

### B1 — Tastatur-Triage im Eingang

J/K = nächste/vorherige Karte (Fokus-Ring sichtbar), A = Freigeben,
R = Ablehnen, U = Rückgängig der letzten Aktion, ? = Hilfe-Overlay.
Nur wenn kein Eingabefeld fokussiert ist. A11y: Fokus-Management beim
Verschwinden einer Karte (Fokus auf die nächste), Shortcuts im UI entdeckbar
machen. Undo-Fenster-Logik des Eingangs wiederverwenden.

### B2 — Duplikat-Hinweis

Heuristik: gleiche E-Mail ± gleiche Kalenderstunde, oder Position < 1 km +
Sichtungszeit < 2 h Abstand. Anzeige als Badge auf der Inbox-Karte
(„2 ähnliche Meldungen") mit Aufklapper/Link zu den Kandidaten. Serverseitig
als Zusatz-Query im Inbox-Loader (nur für die 50 gelisteten). Kein
Auto-Merge — nur Hinweis.

### B3 — Status-Historie pro Sichtung

Neue Tabelle `sichtung_status_log` (sichtung_id, verdict, wer, wann),
geschrieben ausschließlich vom verify-Endpunkt. Anzeige als Zeitleiste in der
Detailansicht. Ersetzt perspektivisch die Einzelfelder nicht (Legacy-DB!),
ergänzt sie. Aufbewahrung/Datenschutz klären (Bearbeiter-Identität).

**Entscheidungen (2026-08-08).**

- **Bearbeiter-Identität: dieselbe Kennung wie `abgelehnt_von`** — die
  E-Mail-Adresse aus der Auth0-Anmeldung (`locals.user.email`). Es entsteht
  damit keine neue Datenkategorie, nur eine längere Reihe derselben. Ohne
  angemeldete Identität bleibt die Spalte `NULL`; ein Platzhalter behauptete
  eine Person, die es nie gab (dieselbe Begründung wie bei `freigegeben_von`).
  Sichtbar ist die Historie ausschließlich im Admin-Bereich, nie öffentlich.
- **Keine eigene Aufbewahrungsgrenze.** Die Einträge hängen per
  `ON DELETE CASCADE` an der Sichtung und teilen deren Schicksal. Eine kürzere
  Frist würde die Historie genau dann leeren, wenn die Sichtung noch öffentlich
  steht — und die Frage „wer hat das freigegeben" unbeantwortbar machen,
  obwohl `freigegeben_von` sie weiterhin beantwortet. Eine eigene Frist wird
  erst sinnvoll, wenn die Sichtungen selbst eine bekommen; das ist der offene
  Punkt §2.1 in `docs/DATENSCHUTZ_ABGLEICH_DMM_2026-08-02.md`.
- **Eigene Tabelle statt `audit_logs`.** Das Audit-Log hält denselben Vorgang
  fest, taugt aber nicht als Anzeigequelle: `logAuditEvent` schluckt
  Schreibfehler bewusst, `details` ist formloses JSONB, und es gibt keinen
  Index auf `resource_id` — die Historie einer Sichtung wäre ein Full Scan über
  alle Aktionen aller Ressourcen.
- **Spalten und Eintrag in einer Transaktion.** Eine Historie, die einen
  stattgefundenen Wechsel verschweigt, sieht vollständig aus und ist es nicht —
  sie wäre damit schlechter als gar keine.
- **Leere Historie wird erklärt, nicht wortlos gezeigt.** Der Altbestand
  (19.262 Freigaben aus dem Altsystem) hat keine Einträge; ohne Hinweis liest
  sich das als „nie bearbeitet".

Der einzige Schreibweg ist mechanisch abgesichert:
`src/lib/server/db/statusLogWriteScan.test.ts` meldet jeden Schreibzugriff auf
die Tabelle außerhalb des Verify-Endpunkts.

### B4 — Gespeicherte Filteransichten

Benannte Filter-Presets als Chips über der Tabelle. Persistenz zunächst
`localStorage` (pro Bearbeiter, kein Schema nötig); Inhalt ist die
Query-String-Teilmenge aus `tableReturnUrl.ts`-Parameterliste. Verwaltung:
anlegen aus aktuellem Zustand, umbenennen, löschen. Später optional
serverseitig teilbar.

**Umgesetzt (2026-08-08)** in `src/routes/admin/sichtungen/filterPresets.ts`
(Logik, unit-getestet) plus Chip-Leiste in `+page.svelte`; E2E in
`e2e/admin-filter-presets.spec.ts`.

Drei Festlegungen, die die Spec offenlässt:

- **`page` gehört nicht ins Preset.** `PRESET_PARAMETER` leitet sich aus
  `TABELLEN_PARAMETER` ab und lässt genau diesen einen aus: Eine Ansicht
  beschreibt eine Menge, keine Position darin — gespeichert stünde man beim
  Anwenden auf Seite 7 einer inzwischen dreiseitigen Liste.
- **Anwenden ersetzt den Filterzustand, es ergänzt ihn nicht.** Die Ziel-URL
  wird von `/admin/sichtungen` aus neu gebaut; sonst bliebe ein davor aktiver
  Filter (typisch: die Freitext-Suche) heimlich stehen, und die angezeigte
  Menge wäre eine andere als die, auf deren Chip man geklickt hat.
- **Aktiv ist abgeleitet, nicht gemerkt.** Der markierte Chip ergibt sich aus
  dem Vergleich mit der aktuellen URL. Ein gemerkter „zuletzt geklickter Chip"
  liefe bei Filterwechsel, Zurück-Button und geteiltem Link daneben.
- **Namen sind eindeutig, ohne Rücksicht auf Groß-/Kleinschreibung.** Der Name
  ist das einzige Unterscheidungsmerkmal der Chips; bei zwei gleichnamigen
  entschiede die Reihenfolge, welche man anwendet. Abgelehnt wird sichtbar per
  Toast — ein stilles `return` ließe den Knopf wirkungslos aussehen. Den leeren
  Namen fängt das `required` am Feld ab, also die Browser-Meldung dort, wo die
  Eingabe entsteht.

### B5 — Statistik: Jahresfilter + echte Charts

Jahres-Auswahl (URL-Parameter) für alle Abschnitte; Saisonalität und
Jahrestrends als richtige Diagramme statt Progress-Balken. Vorher klären:
Chart-Bibliothek vs. handgebautes SVG (Projekt hat bisher keine
Chart-Dependency — Bundle-Abwägung dokumentieren). Museums-Regel beachten:
keine vermischten Freigabe-Mengen, jede Zahl mit Freigabebezug.

**Entscheidung (2026-08-08): handgebautes SVG, keine Chart-Abhängigkeit.**
Gebraucht werden zwei Diagramme derselben Form — kategoriale Balken über einer
linearen Achse. Chart.js (~60 kB gzip), ApexCharts (~130 kB) oder LayerChart
(zieht d3-Module nach) wären dafür die größte Einzelabhängigkeit im Bundle,
obwohl nur eine Admin-Seite sie braucht. Drei Punkte gaben zusätzlich den
Ausschlag:

- **Theme-Tokens statt Canvas-Farben.** Die Bibliotheken zeichnen überwiegend
  auf Canvas und brauchen Farben als Zeichenketten — genau der Fall, für den
  `mapTokens.ts` bei OpenLayers Hex-Werte am Theme vorbei pflegen muss
  (`design-system.md`, „Randbereiche"). SVG-Elemente tragen Utility-Klassen und
  damit dieselben Tokens wie der Rest der Seite; ein vierter Hex-Randbereich
  entsteht nicht.
- **Serverseitig gerendert.** Das Markup entsteht im SSR-Durchlauf, das
  Diagramm ist ohne JavaScript da.
- **Textalternative aus denselben Daten** (WCAG 1.1.1): eine aufklappbare
  Wertetabelle aus derselben Datenreihe statt einer zweiten, driftenden
  Aufbereitung.

Umgesetzt in `src/lib/components/charts/` — Geometrie als reine Funktionen
(`barChartScale.ts`, unit-getestet), Darstellung in `BarChart.svelte`.

**Zwei Abfragen tragen die Jahresauswahl bewusst nicht:** die Jahrestrends (auf
ein Jahr gefiltert bliebe ein einzelner Balken — das gewählte Jahr wird darin
stattdessen hervorgehoben) und die Liste der auswählbaren Jahre (sonst ließe
sich die Auswahl nach dem ersten Wechsel nicht mehr verlassen). Beides ist an
den Abfragen begründet und in `page.server.test.ts` festgehalten.
