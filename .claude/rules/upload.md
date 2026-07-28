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

## Löschen: erst die DB-Zeile, dann die Datei

Wer eine `sichtungen_dateien`-Zeile entfernt, muss auch die Datei im Storage
entfernen — der Fremdschlüssel-Cascade tut das **nicht**. Reihenfolge ist
vorgeschrieben:

```typescript
import { deleteStoredFiles } from '$lib/server/storage/deleteStoredFiles';

// 1. Pfade lesen, solange die Zeilen existieren
// 2. Zeilen löschen (direkt oder per Cascade über `sichtungen`)
// 3. erst danach:
await deleteStoredFiles(paths);
```

Bricht Schritt 3 ab, bleibt eine verwaiste Datei liegen — folgenlos, weil nichts
mehr auf sie zeigt. In der umgekehrten Reihenfolge entstünde eine DB-Zeile, die
auf eine fehlende Datei verweist, und die sieht der Nutzer als kaputtes Bild.
`deleteStoredFiles()` wirft deshalb nie: der DB-Vorgang ist bereits committet.

**Ausnahme (Altlast):** `POST /api/files/delete` löscht noch in umgekehrter
Reihenfolge und meldet auch dann Erfolg, wenn die DB-Zeile stehen bleibt.

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
