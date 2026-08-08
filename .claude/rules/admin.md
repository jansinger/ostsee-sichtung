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

## Admin-Komponenten

| Komponente                     | Zweck                                     |
| ------------------------------ | ----------------------------------------- |
| `AdminSightingEditForm.svelte` | Sichtung bearbeiten                       |
| `AdminSightingView.svelte`     | Sichtung anzeigen (read-only)             |
| `SightingInboxCard.svelte`     | Karte der Eingangsseite (`/admin`)        |
| `inboxVerdict.ts`              | Verdict-Logik der Eingangsseite           |
| `DataTableRow.svelte`          | Tabellen-Zeile                            |
| `BooleanStatus.svelte`         | Boolean-Status Anzeige                    |
| `ExportModal.svelte`           | Export-Dialog                             |
| `deadFinding.ts`               | Totfund-Auszeichnung                      |
| `sightingStatus.ts`            | Statusableitung + Wort/Farbe/Icon/Verdict |
| `sightingStatusFilter.ts`      | Statuswert ↔ Filter-Query (`?verified=`)  |
| `SightingStatusControl.svelte` | Segmented Control für den Statuswechsel   |

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
