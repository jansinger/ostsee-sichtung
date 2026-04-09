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
├── +page.server.ts        # Dashboard (Sichtungsliste, Filter, Sortierung)
├── [id]/
│   ├── +page.svelte       # Sichtung anzeigen
│   └── edit/+page.svelte  # Sichtung bearbeiten
├── ref/[refId]/            # Referenz-ID Lookup
├── settings/               # Konfiguration (DB-basiert)
├── statistics/             # Statistiken
└── docs/                   # Dokumentation
```

## Admin-Komponenten

| Komponente                     | Zweck                         |
| ------------------------------ | ----------------------------- |
| `AdminSightingEditForm.svelte` | Sichtung bearbeiten           |
| `AdminSightingView.svelte`     | Sichtung anzeigen (read-only) |
| `DataTableRow.svelte`          | Tabellen-Zeile                |
| `BooleanStatus.svelte`         | Boolean-Status Anzeige        |
| `ExportModal.svelte`           | Export-Dialog                 |

---

## Best Practices

- Auth NUR serverseitig (`+layout.server.ts`), keine Client-Rollen
- `locals.user.roles` nie an Frontend senden
- Admin-Aktionen immer über API-Routes mit eigener Auth-Prüfung
