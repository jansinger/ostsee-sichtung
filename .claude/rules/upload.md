---
paths:
  - 'src/lib/server/storage/**'
  - 'src/lib/server/media/**'
  - 'src/lib/server/uploads.ts'
  - 'src/routes/api/files/**'
---

# File Upload & Storage

Regeln für Datei-Upload, EXIF-Extraktion und Storage-Backends.

---

## Storage Factory (Singleton)

```typescript
// src/lib/server/storage/factory.ts
getStorageProvider(): StorageProvider
```

**Provider-Auswahl:**

1. `STORAGE_PROVIDER` Env-Variable (explizit)
2. `VERCEL` Env erkannt → `vercel-blob`
3. Development → `local`
4. Fallback → `local`

---

## StorageProvider Interface

```typescript
upload(file, buffer, options): Promise<UploadedFileInfo>
delete(filePath): Promise<void>
getUrl(filePath): string
exists(filePath): Promise<boolean>
list(prefix?): Promise<UploadedFileInfo[]>
```

**Local:** Dateien in `uploads/`, Path-Traversal-Schutz via `normalize()` + `relative()`
**Vercel Blob:** Token aus `BLOB_READ_WRITE_TOKEN`, öffentliche URLs

---

## Upload API (`POST /api/files/upload`)

**FormData-Felder:** `file`, `referenceId` (CUID), `uid` (CUID)

**Validierungs-Pipeline:**

1. MIME-Type Whitelist (image/\*, video/\*, application/pdf)
2. Magic Bytes Prüfung (verhindert Type-Spoofing)
3. Größenlimit: 5MB anonym, 50MB authentifiziert
4. Rate Limit: 20/h anonym, 50/h authentifiziert
5. EXIF-Extraktion (`exifr` Library)

---

## EXIF-Extraktion

```typescript
// src/lib/server/media/exifUtils.ts
readImageExifData(buffer): Promise<ExifData | null>
```

Extrahiert: GPS-Koordinaten, Kamera, Datum, Belichtung, ISO.
CEST-Zeitzonenkorrektur via `correctCestOffsetUTC()`.

---

## Aufbewahrung unverknüpfter Uploads

Ein Upload legt sofort eine Zeile mit `sichtung_id = NULL` an; verknüpft wird erst
beim Absenden. Abgebrochene Formularläufe hinterlassen deshalb Zeilen und Dateien,
die niemand mehr erreicht — samt EXIF-GPS.

**Frist: 24 Stunden.** Formulardaten liegen in `sessionStorage` und überstehen das
Schließen des Tabs nicht; was länger unverknüpft ist, kann nicht mehr abgesendet
werden.

Durchgesetzt wird die Frist derzeit **von Hand** über
`npm run media:cleanup-orphans:dry-run` (Details: `src/tools/README.md`).

**Offen:** Es gibt keinen automatischen Job — der Bestand wächst nach. Außerdem
entfernen `DELETE /api/sightings/[id]` und `saveSightingFiles()` DB-Zeilen, ohne die
Dateien zu löschen, und erzeugen so laufend neue Waisen.

---

## Best Practices

- Dateinamen basieren auf CUID, Original separat gespeichert
- Lokaler Storage: absolute Pfade via `resolve()` gegen Path-Escape
- Vercel Blob URLs sind permanent (kein Recovery nach Delete)
- EXIF-GPS muss separat mit Baltic-Sea-Geometrie validiert werden
