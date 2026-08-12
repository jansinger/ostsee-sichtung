# iframe-Einbettung auf meeresmuseum.de (Stand 2026-08-04)

> **Zur Herkunft dieses Dokuments.** Der Formularplan vom 2026-08-04 liegt
> **außerhalb des Repositories**: `.gitignore` schließt `docs/MEERESMUSEUM_*`
> bewusst aus, weil Analysen mit Personen- und Compliance-Bezug nicht in dieses
> öffentliche Repository gehören (PR #676). Diese Datei hält nur den **technischen
> Teil** fest, der hierher gehört und den der Code braucht — rekonstruiert aus den
> Fundstellen selbst. Jede Tatsachenbehauptung unten ist belegt; wo etwas nur
> mündlich vorliegt, steht das ausdrücklich dabei. Siehe „Was hier nicht steht".

---

## Überblick

Die Anwendung läuft auf **meeresmuseum.de in einem iframe**. Sie ist damit kein
eigenständiger Auftritt, sondern ein Baustein einer fremden Seite: Marke,
Navigation und Footer gehören der Elternseite, nicht uns.

Erkannt wird das zur Laufzeit über `isNotIFrame`
([isNotIFrame.ts](../src/lib/utils/client/isNotIFrame.ts)) — eine Modulkonstante
mit `browser && window === window.top`. Das Layout hängt daran die Klasse
`.iframe-mode` ([+layout.svelte:12](../src/routes/+layout.svelte#L12)), und drei
Stellen blenden im eingebetteten Zustand aus:

| Element        | Mechanismus                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Navigation     | `{#if isNotIFrame}` in [PublicNavbar.svelte:63](../src/lib/components/PublicNavbar.svelte#L63)                  |
| Footer         | `{#if isNotIFrame}` in [PublicFooter.svelte:7](../src/lib/components/PublicFooter.svelte#L7)                    |
| Formular-Titel | `{#if isNotIFrame}` in [ModernReportForm.svelte:394](../src/lib/report/components/ModernReportForm.svelte#L394) |

Dazu kommt als **Sicherheitsnetz** die CSS-Regel
`.iframe-mode .navbar, .iframe-mode footer { display: none }`
([app.css:224](../src/app.css#L224)). Sie ist nicht der eigentliche Mechanismus —
der Kommentar dort hält sie für eine mögliche serverseitige Variante über
`data-embed` offen und begründet, warum sie auf das **Element** `<footer>` zielt
und nicht auf die Klasse `.footer`.

**Das Museum hat am 2026-08-04 bestätigt, dass der iframe bleibt.** (Mündlich,
kein schriftlicher Beleg im Repository.)

### Ohne Arbeit

Wenn an dieser Stelle niemand etwas ändert, gilt Folgendes — und das ist der
Grund, aus dem die Bestimmungshilfe mehrfach eingebunden ist:

**`/bestimmungshilfe` ist für eingebettete Nutzer nicht erreichbar.** Die Seite
existiert ([+page.svelte](../src/routes/bestimmungshilfe/+page.svelte), seit
`cc08affd`, PR #710), aber jeder Weg dorthin führt über Navigation oder Footer:

| Verweis auf `/bestimmungshilfe`                                         | Im iframe sichtbar?                         |
| ----------------------------------------------------------------------- | ------------------------------------------- |
| [PublicNavbar.svelte:45](../src/lib/components/PublicNavbar.svelte#L45) | nein — Navigation ausgeblendet              |
| [PublicFooter.svelte:35](../src/lib/components/PublicFooter.svelte#L35) | nein — Footer ausgeblendet                  |
| [about/+page.svelte:526](../src/routes/about/+page.svelte#L526)         | nein — `/about` selbst nur über Navi/Footer |

Es gibt keinen vierten Weg. Für die **Mehrheit der Nutzer** — die über
meeresmuseum.de kommen — ist die eigenständige Seite damit tote Fläche.

**Folge:** Die Einbindung von `SpeciesIdentificationHelp` **im Formular** ist der
einzige Zugang zur Bestimmungshilfe. Die drei Aufrufstellen sind deshalb kein
Duplikat:

| Aufrufstelle                                                                                   | Variante | Zweck                                     |
| ---------------------------------------------------------------------------------------------- | -------- | ----------------------------------------- |
| [FormHelp.svelte:151](../src/lib/report/components/FormHelp.svelte#L151)                       | `inline` | Hilfeblock unter dem Formular             |
| [FieldRenderer.svelte:367](../src/lib/report/components/form/fields/FieldRenderer.svelte#L367) | `inline` | direkt unter der Artauswahl, im Kontext   |
| [bestimmungshilfe/+page.svelte:47](../src/routes/bestimmungshilfe/+page.svelte#L47)            | `page`   | eigenständige Seite, SEO und Direktaufruf |

Die Darstellung unterscheidet sich über **eine** Prop (`variant`), die Fachtexte
liegen in geteilten Datenmodulen — es wird also kein Inhalt doppelt gepflegt.
Begründung der Ein-Prop-Lösung im Kopf von
[SpeciesIdentificationHelp.svelte](../src/lib/report/components/form/fields/SpeciesIdentificationHelp.svelte),
der geteilte Typ in [info/variant.ts](../src/lib/components/info/variant.ts).

**Wer beim Aufräumen zwei der drei Stellen entfernt, nimmt der Mehrheit der
Nutzer die Bestimmungshilfe ersatzlos weg.** Genau dagegen stehen die Kommentare
an den beiden Formular-Aufrufstellen, die hierher verweisen.

### Was daraus sonst noch folgt

- **Neue Seiten-Level-Elemente** (Header, Navigation, Footer, Banner) müssen
  prüfen, ob sie im iframe gehören — sonst erscheinen sie doppelt neben denen der
  Elternseite. Steht auch in [.claude/rules/daisyui.md](../.claude/rules/daisyui.md),
  Abschnitt „iframe-Einbettung".
- **Ein neuer Inhalt, der nur als eigene Route existiert, ist im iframe
  unsichtbar.** Wer etwas ergänzt, das eingebettete Nutzer erreichen sollen,
  braucht einen Einstieg innerhalb des Formulars oder der Karte.
- **Die Karte bremst im iframe das Mausrad** (`onFocusOnly: !isNotIFrame`,
  [optimizedMapController.ts:333](../src/lib/map/optimizedMapController.ts#L333)),
  damit das Scrollen der Elternseite nicht in der Karte hängenbleibt.

---

## Größe der Einbettung (Breite & Höhe)

Empfehlung ans Museum, live verifiziert am 2026-08-12 (Testaufbau:
[docs/test-iframe.html](test-iframe.html), echte Cross-Origin-Einbettung über zwei
verschiedene Ports, `isNotIFrame` per Debug-Ausgabe direkt im Quellcode gemessen).

### Breite: max. 650–700px, nicht 100 % der Spaltenbreite

Das Formular begrenzt sich im iframe-Modus selbst auf `max-width: 600px`
([+page.svelte:363-366](../src/routes/+page.svelte#L363-L366)), mit `p-6`-Innenabstand
also 648px Gesamtbreite — das greift bei echter Cross-Origin-Einbettung nachweislich
zuverlässig (`isNotIFrame=false`, Wrapper misst exakt `width: 600`).

**Wichtig:** Der App-Seitenhintergrund (`bg-base-100`, helles Blaugrau) füllt dabei
immer die **komplette** iframe-Breite, unabhängig von der 600px-Begrenzung des
Formulars selbst. Ist das iframe deutlich breiter als 648px, entsteht dadurch sichtbar
eine „Box in der Box“ — heller App-Hintergrund, darin zentriert ein schmaleres
Formular. Das ist kein Fehler, sieht auf einer breiten Museumsseite aber wie ein
Darstellungsproblem aus und war in einer früheren Testrunde selbst schon Anlass für
einen Fehlalarm. Deshalb: iframe-Breite fest auf ca. 650–700px begrenzen. Fluid nach
unten (bis `min-width: 320px`) ist unkritisch, die App skaliert dort mobil-tauglich.

### Höhe: keine automatische Anpassung — feste 3350px

Die App sendet **kein** `resize`-`postMessage` an die Elternseite — das ist im
Quellcode nirgends implementiert (auch nicht als Rest eines früheren Anlaufs; das
frühere, inzwischen gelöschte `docs/test-iframe.html` wartete auf ein Signal, das nie
gesendet wurde). Eine mit dem Formularinhalt mitwachsende Höhe ist damit aktuell
**nicht** möglich, ohne das Feature erst zu bauen.

Gemessen wurde deshalb am 2026-08-12 durch Klicken durch alle vier Formularschritte
(inkl. Validierungsfehler-Zuständen), bei 648px Breite:

| Zustand                                             | Höhe       |
| --------------------------------------------------- | ---------- |
| Einstiegsseite („Was möchten Sie melden?“)          | 436px      |
| Schritt 1 · Position & Zeitpunkt (mit Karte)        | 2266px     |
| Schritt 1 · mit Validierungsfehlern                 | 2358px     |
| Schritt 2 · Angaben zum Tier                        | 2167px     |
| Schritt 2 · mit Validierungsfehlern                 | 2360px     |
| Schritt 2 · mit Bootsantrieb-Zusatzfeld (bedingt)   | 2237px     |
| Schritt 3 · Weitere Informationen                   | 2484px     |
| Schritt 4 · Kontaktdaten                            | 2981px     |
| **Schritt 4 · mit allen Validierungsfehlern (Max)** | **3264px** |
| Erfolgsseite („Vielen Dank!“)                       | 2296px     |

Die Höhe schwankt zwischen 436px und 3264px — Faktor 7,5. Eine einzelne feste Höhe ist
deshalb immer ein Kompromiss zwischen „oben abgeschnitten“ (zu niedrig) und „viel
Leerraum“ (zu hoch, sichtbar z. B. auf der kurzen Einstiegsseite). Entschieden für die
erste Museums-Abstimmung: **feste Höhe von 3350px** (Maximum aus Schritt 4 mit Fehlern
plus Puffer), mit iframe-internem Scrollen als Fallback für alles Unvorhergesehene
(z. B. sehr lange Freitexte im Notizfeld).

**Sauberer, aber noch nicht umgesetzt:** Ein `resize`-`postMessage` von der App an die
Elternseite (Vorbild: das damals gelöschte `docs/test-iframe.html` erwartete genau so
ein Signal, ohne dass die App es je gesendet hätte). Bis das gebaut ist, gilt die feste
Höhe oben.

---

## Fallstrick: `export const csr = false` kippt die Erkennung

`isNotIFrame` ist eine **Modulkonstante**, kein reaktiver Wert. Ohne Client-JS
bleibt sie auf ihrem SSR-Wert `false` — die Seite rendert dann im `.iframe-mode`,
**auch wenn sie gar nicht eingebettet ist**.

Auf `/about` war das bereits passiert und wurde am 2026-07-30 zurückgenommen:
Navigation und Footer fehlten mit 0 Elementen im DOM, womit von der Seite kein Weg
zurück in die Anwendung führte — und die Pflichtangaben (Impressum nach § 5 DDG,
Datenschutzhinweis) im Footer ausgerechnet auf „Über uns" unerreichbar waren.
Vollständige Begründung inklusive der verworfenen Alternative:
[about/+page.ts](../src/routes/about/+page.ts).

**Regel:** Kein `csr = false` auf Routen, die Navigation oder Footer brauchen.

---

## Was hier nicht steht

Dieses Dokument beschreibt **nur** die iframe-Einbettung und ihre Folge für die
Bestimmungshilfe. Formular-Umbauplan, Termine und Absprachen mit dem Museum
stehen im Plandokument außerhalb des Repositories (`docs/MEERESMUSEUM_*`, per
`.gitignore` ausgeschlossen — siehe Kopf). Was von dort **technisch** relevant
wird, gehört hierher übertragen, nicht verlinkt: ein Verweis auf eine nicht
versionierte Datei läuft in jedem Klon ins Leere.
