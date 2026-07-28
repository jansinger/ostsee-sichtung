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

**Local:** Basisverzeichnis aus `UPLOAD_PATH` (Standard `uploads`, relativ zum Arbeitsverzeichnis).
Einzige Auswertungsstelle: `src/lib/server/storage/uploadPath.ts` — Schreibpfad (`LocalStorageProvider`)
und Lesepfad (`getUploadPath()` in `$lib/server/uploads`) beziehen ihr Verzeichnis beide von dort.
Path-Traversal-Schutz via `normalize()` + `relative()`
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

## Best Practices

- Dateinamen basieren auf CUID, Original separat gespeichert
- Lokaler Storage: absolute Pfade via `resolve()` gegen Path-Escape
- Vercel Blob URLs sind permanent (kein Recovery nach Delete)
- EXIF-GPS muss separat mit Baltic-Sea-Geometrie validiert werden
