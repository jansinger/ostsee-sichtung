---
paths:
  - 'src/lib/server/export/**'
  - 'src/routes/api/sightings/export/**'
  - 'src/lib/components/admin/ExportModal.svelte'
---

# Daten-Export

Regeln für CSV, JSON, KML und XML Export.

---

## Export-Funktionen

| Datei           | Funktion                      | Format-Details                                       |
| --------------- | ----------------------------- | ---------------------------------------------------- |
| `csvExport.ts`  | `generateCsvData(sightings)`  | Semikolon-getrennt, deutsche Labels                  |
| `jsonExport.ts` | `generateJsonData(sightings)` | Pretty-Print mit Metadaten                           |
| `kmlExport.ts`  | `generateKmlData(sightings)`  | Farbcodierte Marker nach Tieranzahl, DMS-Koordinaten |
| `xmlExport.ts`  | `generateXmlData(sightings)`  | Legacy-Format mit Mercator-Projektion                |

---

## API-Endpoints (`GET /api/sightings/export/{format}`)

**Auth:** Alle Endpoints erfordern `requireUserRole(url, locals.user, ['admin'])`

**Query-Parameter:** `fromDate`, `toDate`, `verified`, `entryChannel`, `mediaUpload`

---

## Wichtige Details

- **Privacy:** Namen/Schiffsnamen nur exportiert wenn Consent-Flags gesetzt
- **KML:** Filtert Sichtungen ohne Koordinaten (`isNotNull`)
- **XML:** Enthält Mercator-Projektion (X/Y statt Lat/Lng) -- Legacy-Kompatibilität
- **CSV:** Header sind deutsche Labels, nicht DB-Feldnamen
- Fehler werden als Text/XML zurückgegeben (nicht JSON)
