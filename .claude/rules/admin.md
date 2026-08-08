---
paths:
  - 'src/routes/admin/**'
  - 'src/lib/components/admin/**'
---

# Admin Panel

Regeln für das Admin-Interface.

---

## Auth Pattern

Auth wird im Layout enforced -- alle Child-Routes sind automatisch geschützt:

```typescript
// src/routes/admin/+layout.server.ts
requireUserRole(url, locals.user, ['admin']);
```

**Wichtig:** Keine zusätzliche Auth-Prüfung in einzelnen Routen nötig.

---

## Routen-Struktur

```
src/routes/admin/
├── +layout.server.ts      # Auth Guard (requireUserRole)
├── +page.server.ts        # Eingang (Task-Liste offener Sichtungen, Sortierung nur per `order`-Param)
├── sichtungen/              # Tabelle (alle Sichtungen, Filter inkl. `verified=rejected`)
├── [id]/
│   ├── +page.svelte       # Sichtung anzeigen
│   └── edit/+page.svelte  # Sichtung bearbeiten
├── ref/[refId]/            # Referenz-ID Lookup
├── settings/               # Konfiguration (DB-basiert)
├── statistics/             # Statistiken
└── docs/                   # Dokumentation
```

`/admin` ist die Eingangsseite: eine Task-Liste der offenen (weder freigegebenen
noch abgelehnten) Sichtungen. Alte Tabellen-URLs mit `page`/`sort`/`verified`/…
werden per 301 auf `/admin/sichtungen` umgeleitet. **Die Eingangsseite ist eine
Task-Liste — keine Filter/Spalten dorthin bauen, dafür gibt es
`/admin/sichtungen`.**

### Der Rückweg aus der Detailansicht kennt zwei Ziele

`/admin/[id]` wird aus der Tabelle **und** aus dem Eingang geöffnet. Woher,
steht in der URL: Die Tabelle verrät sich über ihre Filter-Parameter, der
Eingang über `?from=inbox` (`$lib/components/admin/adminReturn.ts`).
`returnTarget()` in `[id]/tableReturnUrl.ts` wertet beides aus und liefert Ziel
**und** Beschriftung; der Rückweg in den Eingang trägt zusätzlich den Anker
`#sichtung-<id>` auf die Karte, von der man kam.

Zwei Dinge dabei nicht zurückdrehen:

- **Kein `history.back()`.** Die Detailansicht lädt per `invalidateAll()` neu,
  löscht ggf. den Datensatz und führt über „Bearbeiten" weiter — der Eintrag
  hinter uns ist danach nicht verlässlich derselbe. Ein URL-Parameter überlebt
  Reload, Bookmark und Direktaufruf.
- **Jede weiterführende Route reicht die Parameter durch** (`carryReturnParams`).
  `edit/` sprang bis 2026-08 auf `/admin/${id}` ohne Query-String; damit verlor
  schon der Weg Tabelle → Detail → Bearbeiten → zurück die Filter. Wer eine
  weitere Unterroute anlegt, muss dasselbe tun — sonst endet der Rückweg dort.

**Bekannte Ausnahme:** `/admin/ref/[refId]` leitet auf `/admin/${id}` ohne
Query-String um und verwirft damit den Kontext. Das war vor dem Rückweg-Umbau
schon so; der Einstieg dorthin kommt aus der Tabelle, deren Filter der Umweg
ohnehin nicht kennt. Wer den Lookup anfasst, kann es mitziehen.

Der Eingang führt außerdem **einen eigenen** Parameter: `order`. Er steht
bewusst nicht in `istTabellenUrl` (`admin/tableRedirect.ts`) und darf beim
Rückweg nach `/admin` als einziger mitgegeben werden — die übrigen
TABELLEN_PARAMETER lösten dort sofort die 301 auf die Tabelle aus.

## Admin-Komponenten

| Komponente                     | Zweck                                      |
| ------------------------------ | ------------------------------------------ |
| `AdminSightingEditForm.svelte` | Sichtung bearbeiten                        |
| `AdminSightingView.svelte`     | Sichtung anzeigen (read-only)              |
| `SightingInboxCard.svelte`     | Karte der Eingangsseite (`/admin`)         |
| `inboxVerdict.ts`              | Verdict-Logik der Eingangsseite            |
| `inboxShortcuts.ts`            | Tastatur-Triage des Eingangs (J/K/A/R/U/?) |
| `InboxShortcutHelp.svelte`     | Overlay mit der Kürzel-Übersicht           |
| `adminReturn.ts`               | Herkunft `?from=inbox` + Karten-Anker      |
| `DataTableRow.svelte`          | Tabellen-Zeile                             |
| `BooleanStatus.svelte`         | Boolean-Status Anzeige                     |
| `ExportModal.svelte`           | Export-Dialog                              |
| `deadFinding.ts`               | Totfund-Auszeichnung                       |
| `sightingStatus.ts`            | Statusableitung + Wort/Farbe/Icon/Verdict  |
| `sightingStatusFilter.ts`      | Statuswert ↔ Filter-Query (`?verified=`)   |
| `SightingStatusControl.svelte` | Segmented Control für den Statuswechsel    |

### Totfund vs. Lebendsichtung

Wort und Icon der Totfund-Kennzeichnung kommen aus `deadFinding.ts` — für
Tabelle, Mobilkarte und Detailansicht gemeinsam, nach dem Vorbild von
`BALTIC_SEA_STATUS_PRESENTATION`. Die Farbklassen stehen bewusst an den
Aufrufstellen (Begründung im Docblock des Moduls). Zwei Dinge dabei nicht
zurückdrehen:

- **Der Marker in der Tabelle steht in einer festen Spalte ganz links** und
  gehört nicht in `availableColumns`. Als abschaltbare Spalte „Totfund
  (Ja/Nein)" am rechten Rand war er genau dann unsichtbar, wenn viele Spalten
  aktiv waren.
- **Die Lebendsichtung bleibt neutral.** Kein Gegen-Badge — sie ist der
  Normalfall, und ein zweites Badge in jeder Zeile ebnete den Kontrast wieder
  ein, um den es geht.

---

## Best Practices

- Auth NUR serverseitig (`+layout.server.ts`), keine Client-Rollen
- `locals.user.roles` nie an Frontend senden
- Admin-Aktionen immer über API-Routes mit eigener Auth-Prüfung
