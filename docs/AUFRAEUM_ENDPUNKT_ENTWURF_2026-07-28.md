# Aufräumen verwaister Uploads über einen tokengesicherten Endpunkt

**Stand:** 2026-07-28
**Status:** Entwurf, abgestimmt — noch nicht implementiert
**Vorgeschichte:** `docs/MEDIENEINWILLIGUNG_ANALYSE_2026-07-28.md`, PR #586

---

## 1. Ausgangslage

Ein Upload legt sofort eine Zeile in `sichtungen_dateien` mit `sichtung_id = NULL`
an; verknüpft wird sie erst beim Absenden der Sichtung. Abgebrochene
Formularläufe hinterlassen deshalb Zeilen und Dateien, die niemand mehr
erreicht — samt EXIF-GPS. Der Hinweis an der Dropzone sagt Meldern seit
`0a1007e` ausdrücklich zu, dass solche Aufnahmen nach 24 Stunden gelöscht
werden.

Eingehalten wird diese Zusage bisher nur durch einen **manuellen** Lauf von
`src/tools/cleanup-orphaned-uploads.ts` (PR #586). Ohne automatischen Job wächst
der Bestand nach, und die Zusage im Formular wird zur Falschaussage.

Das Tool selbst ist gut abgesichert — NFC-Pfadvergleich, Verschonung über
`referenz_id`, Ausschluss von `_old_uploads`, Dry-Run als Vorgabe. Was fehlt,
ist ein Auslöser, der ohne Shell-Zugang zum Container funktioniert.

### Warum ein Endpunkt

- Ein externer Web-Cron braucht nur HTTP, keinen Shell-Zugang und kein Wissen
  über den Deployment-Weg.
- Auf Vercel-Previews ist das Tool gar nicht lauffähig (`assertLocalStorage`);
  über den Endpunkt wäre dort wenigstens Klasse A erreichbar.
- Admins bekommen einen Bedienweg, statt auf einen Cron warten zu müssen.

### Was das kostet — bewusst in Kauf genommen

- Ein **neues Auth-Verfahren**: Das Projekt kennt bisher nur OIDC-Sessions.
- Eine **löschende Operation wird über HTTP erreichbar**. Begrenzt wird der
  Schaden durch Fristklemmung und Löschdeckel (§ 5), nicht durch ein Verbot.

---

## 2. Getroffene Entscheidungen

| Frage                       | Entscheidung                                                      |
| --------------------------- | ----------------------------------------------------------------- |
| Produktion                  | Docker/Node mit `STORAGE_PROVIDER=local`; Vercel nur für Previews |
| Tool vs. Endpunkt           | **Gemeinsamer Kern**, beide bleiben erhalten                      |
| M2M-Auth                    | Shared Secret im `Authorization: Bearer`-Header, konstantzeitig   |
| Admin-UI                    | Erst Vorschau, dann bestätigen                                    |
| Externes Token darf löschen | Ja — sonst ist der Web-Cron sinnlos                               |
| Name der Umgebungsvariablen | `CLEANUP_TOKEN`                                                   |

---

## 3. Architektur

Drei Einheiten, jede mit einer Aufgabe:

```
src/lib/server/media/orphanCleanup.ts   ← Kern: Logik, keine I/O-Bindung
        ▲                        ▲
        │ relativ (.ts)          │ $lib
src/tools/cleanup-orphaned-uploads.ts   src/routes/api/admin/cleanup-orphans/+server.ts
   CLI, dotenv, postgres, Konsole          Auth, Ports über Drizzle, JSON
                                                    ▲
                                          src/routes/admin/settings (UI)
```

### 3.1 Kern — `src/lib/server/media/orphanCleanup.ts`

Enthält die vollständige Aufräum-Logik und **keine** Anbindung an eine konkrete
Datenbank, ein Dateisystem oder SvelteKit. Frei von `$lib`-Aliassen, Drizzle und
`$env` — nur so kann das Tool ihn unter Node-Type-Stripping laden.

Aus dem Tool hierher verschoben:

- `parseRetention(input: string): number` — `24h`/`7d` → Millisekunden
- `computeCutoff(now: Date, retentionMs: number): Date`
- NFC-Normalisierung der Pfade (macOS liefert zerlegt, PostgreSQL zusammengesetzt)
- Verschonung einer Datei, deren Verzeichnis einer `sichtungen.referenz_id` entspricht
- Ausschluss von `_old_uploads`
- `resolveSafeTarget(baseDir, relativePath)` — Schutz gegen Pfad-Escape

Orchestrator mit injizierten Ports:

```typescript
export interface CleanupPorts {
	/** Zeilen ohne Sichtung, deren Upload vor `cutoff` liegt (Klasse A). */
	findOrphanRows(cutoff: Date): Promise<OrphanRow[]>;
	/**
	 * Dateien im Storage ohne zugehörige Zeile, älter als `cutoff` (Klasse B).
	 * `null` = Provider bietet kein Dateisystem.
	 *
	 * `cutoff` ist Schutz, kein Komfort: Der Upload schreibt erst die Datei und
	 * danach die DB-Zeile. Ohne Altersfilter gälte genau diese Lücke als Waise —
	 * ein laufender Upload würde zerstört.
	 */
	findOrphanFiles(cutoff: Date): Promise<DiskEntry[] | null>;
	deleteRow(id: number): Promise<void>;
	deleteFile(path: string): Promise<void>;
}

export interface CleanupOptions {
	now: Date;
	retentionMs: number;
	/** `false` = nur ermitteln, nichts löschen. */
	execute: boolean;
	/** Obergrenze gelöschter Objekte pro Lauf. */
	limit: number;
	ports: CleanupPorts;
	onError?: (subject: string, error: unknown) => void;
}

export interface CleanupReport {
	rowsFound: number;
	filesFound: number | null; // null = Klasse B nicht anwendbar
	rowsDeleted: number;
	filesDeleted: number;
	failed: number;
	/** Wie viele Fundstücke der Deckel übrig gelassen hat. */
	remaining: number;
	/** Nur im Vorschaumodus gefüllt. */
	preview?: { rows: OrphanRow[]; files: DiskEntry[] };
}

export async function cleanupOrphans(options: CleanupOptions): Promise<CleanupReport>;
```

**Beide Klassen aus einem Schnappschuss.** Klasse A und Klasse B werden aus
derselben Momentaufnahme berechnet, damit eine Datei nicht doppelt gezählt wird
und beide dieselbe Grenze verwenden.

**Reihenfolge beim Löschen: erst die DB-Zeile, dann die Datei.** Das ist die in
`.claude/rules/upload.md` festgeschriebene Richtung: Bricht der zweite Schritt
ab, bleibt eine verwaiste Datei liegen — folgenlos, weil nichts mehr auf sie
zeigt. Andersherum entstünde eine Zeile, die auf eine fehlende Datei verweist,
und die sieht der Nutzer als kaputtes Bild.

### 3.2 Tool — bleibt vollständig erhalten

Behält CLI-Parsing (`--dry-run`/`--execute`, `--older-than`, `--verbose`,
`--uploads-dir`), `dotenv`, den eigenen `postgres`-Client, `assertLocalStorage`
und die Konsolenausgabe. Es reicht den Kern lediglich an:

```typescript
import { cleanupOrphans } from '../lib/server/media/orphanCleanup.ts';
```

Der `.ts`-Import ist verifiziert: Node löst ihn unter Type Stripping auf, und
`tsc --noEmit` akzeptiert ihn, sobald `allowImportingTsExtensions: true` in
`tsconfig.json` steht (zulässig, weil das Projekt ausschließlich `--noEmit`
fährt; mit dem Flag type-checkt das gesamte Projekt unverändert).

Damit bleibt das Tool die Rückfallebene für den Fall, dass die Anwendung nicht
läuft.

### 3.3 Endpunkt — `POST /api/admin/cleanup-orphans`

Stellt die Ports über Drizzle und den Storage-Provider bereit und gibt den
`CleanupReport` als JSON zurück.

**Providerabhängigkeit:** Klasse A läuft immer — sie ist eine reine
DB-Abfrage. Klasse B setzt ein Dateisystem voraus; bei
`STORAGE_PROVIDER != 'local'` liefert `findOrphanFiles` `null`, der Bericht
meldet `filesFound: null`, und der Lauf gilt trotzdem als erfolgreich. Previews
auf Vercel laufen dadurch grün statt rot.

### 3.4 Admin-UI

Abschnitt „Verwaiste Uploads" unter `src/routes/admin/settings`. Ein Klick lädt
die Vorschau (Anzahl je Klasse plus Liste), ein zweiter, deutlich abgesetzter
Button führt aus. Die destruktive Aktion trägt die projektweit einheitliche
Variante `btn btn-outline btn-error btn-sm min-h-11` und verlangt eine
Bestätigung (`.claude/rules/design-system.md`).

---

## 4. API-Vertrag

```
POST /api/admin/cleanup-orphans
```

| Parameter (Query) | Werte                  | Vorgabe                  | Bedeutung                                          |
| ----------------- | ---------------------- | ------------------------ | -------------------------------------------------- |
| `mode`            | `preview` \| `execute` | `preview`                | `execute` löscht wirklich                          |
| `hours`           | positive Ganzzahl      | `ORPHAN_RETENTION_HOURS` | Aufbewahrungsfrist; kleinere Werte werden geklemmt |
| `limit`           | 1 … 500                | `500`                    | Löschdeckel pro Aufruf                             |

**Authentifizierung — genau zwei akzeptierte Wege:**

1. Angemeldete Admin-Session (`requireUserRole(url, locals.user, ['admin', 'superadmin'])`)
2. `Authorization: Bearer <CLEANUP_TOKEN>`

Ist `CLEANUP_TOKEN` nicht gesetzt, ist Weg 2 **abgeschaltet** — nicht offen.

**Antworten:**

| Status | Fall                                                          |
| ------ | ------------------------------------------------------------- |
| `200`  | Lauf durchgeführt; Body ist der `CleanupReport`               |
| `400`  | `mode`, `hours` oder `limit` unlesbar                         |
| `401`  | Kein oder falsches Token (ohne Hinweis, welches von beidem)   |
| `429`  | Rate Limit                                                    |
| `500`  | Unerwarteter Fehler; Details nur im Log, nicht in der Antwort |

**Unlesbare Parameter sind kein Fehler.** `mode` fällt auf `preview`, `hours` auf
die Mindestfrist, `limit` auf den Deckel zurück — jede Vorgabe zeigt in die
sichere Richtung. Eine zu kleine `hours`-Angabe wird geklemmt; der Bericht nennt
die tatsächlich verwendete Frist. Ein Cron soll nicht wegen eines
Konfigurationsfehlers stillstehen, und ein `400` würde hier nur eine falsche
Sicherheit suggerieren.

**Pflicht:** `static/openapi.yml` mit demselben Commit aktualisieren
(`.claude/rules/api.md`).

---

## 5. Absicherung

- **Konstantzeitiger Vergleich** über `timingSafeEqual`; vorher Längenprüfung,
  weil `timingSafeEqual` bei ungleicher Länge wirft.
- **Mindestlänge des Tokens** (32 Zeichen). Ein zu kurzes `CLEANUP_TOKEN` wird
  wie „nicht gesetzt" behandelt und beim Start als Warnung geloggt — ein
  schwaches Geheimnis darf nicht unbemerkt scharf sein.
- **Fristklemmung.** `hours` kann nur nach oben abweichen. Ohne diese Klemmung
  könnte ein geleaktes Token mit `hours=0` die Uploads gerade laufender
  Formulare abräumen.
- **Löschdeckel** von 500 Objekten pro Aufruf, `remaining` im Bericht. Begrenzt
  den Schaden eines missbräuchlichen Aufrufs und hält den Request unter
  Proxy- und Serverless-Timeouts.
- **Rate Limit** über `enforceRateLimit` wie bei den übrigen Endpunkten.
- **Audit-Eintrag** über `logAuditEvent` bei jedem `execute`-Lauf. Dafür sind
  `AuditAction` um `file.cleanup_orphans` zu erweitern (`resourceType: 'file'`);
  `details` nimmt den Bericht auf, `userEmail` bleibt beim Token-Weg leer und
  wird über `details.trigger: 'token' | 'session'` unterschieden.
- **Token nie ausgeben** — weder in Logs, Fehlermeldungen noch Antworten.

---

## 6. Fehlerbehandlung

- Scheitert das Löschen eines einzelnen Objekts, zählt der Lauf es als `failed`,
  ruft `onError` und macht weiter. Ein defekter Storage-Eintrag darf nicht den
  ganzen Lauf blockieren.
- Schlägt die DB-Verbindung fehl, bricht der Lauf mit `500` ab; der Cron
  erkennt das am Statuscode.
- Der Vorschaumodus fasst nie etwas an, auch nicht bei Teilfehlern.

---

## 7. Tests — test-first

**Kern** (`orphanCleanup.test.ts`, reine Funktionen, keine DB):

- `parseRetention` weist Unsinn zurück, statt still auf eine Vorgabe zu fallen
- Pfade mit Umlaut werden in zerlegter und zusammengesetzter Form als gleich erkannt
- Eine Datei, deren Verzeichnis einer `referenz_id` entspricht, wird verschont
- `_old_uploads` bleibt unangetastet
- `resolveSafeTarget` weist Pfade außerhalb des Basisverzeichnisses ab
- Reihenfolge: Zeile vor Datei; scheitert die Datei, bleibt die Zeile gelöscht
- Deckel: bei mehr Fundstücken als `limit` wird gedeckelt und `remaining` gemeldet
- Vorschaumodus ruft keinen Lösch-Port auf
- `findOrphanFiles` liefert `null` → `filesFound: null`, Lauf gilt als erfolgreich

**Endpunkt** (`+server.test.ts`):

- ohne Ausweis `401`
- mit falschem Token `401`
- mit gültigem Token `200`
- mit Admin-Session ohne Token `200`
- `CLEANUP_TOKEN` nicht gesetzt → Token-Weg liefert `401`
- Vorgabe ist `preview`; ohne `mode=execute` wird nichts gelöscht
- `hours` unterhalb der Mindestfrist wird geklemmt, nicht abgelehnt
- `execute` schreibt einen Audit-Eintrag, `preview` nicht

**Bestehend, bleibt:** `cleanupRetentionContract.test.ts` — die Vorgabe des Tools
und die im Formular zugesagte Frist müssen übereinstimmen.

---

## 8. Konfiguration und Dokumentation

| Datei                     | Änderung                                                      |
| ------------------------- | ------------------------------------------------------------- |
| `tsconfig.json`           | `allowImportingTsExtensions: true`                            |
| `.env.example`            | `CLEANUP_TOKEN=""` mit Erläuterung                            |
| `docs/ENVIRONMENT.md`     | `CLEANUP_TOKEN` dokumentieren                                 |
| `static/openapi.yml`      | Endpunkt und Antwortschema                                    |
| `.claude/rules/upload.md` | Abschnitt „Aufbewahrung" — der Weg ist nicht mehr nur manuell |
| `src/tools/README.md`     | Verhältnis Tool ↔ Endpunkt                                    |

Der Cron-Aufruf selbst ist ein Deployment-Schritt, kein Code:

```bash
curl -fsS -X POST -H "Authorization: Bearer $CLEANUP_TOKEN" \
  "https://<host>/api/admin/cleanup-orphans?mode=execute"
```

`-f` sorgt dafür, dass ein Fehlerstatus als Fehlschlag beim Cron-Dienst ankommt.

---

## 9. Nicht Teil dieses Entwurfs

- **Klasse B auf Vercel Blob.** Dafür bräuchte es einen Abgleich über die
  Blob-List-API. Produktion läuft auf lokalem Storage; auf Previews meldet der
  Endpunkt die Klasse als nicht anwendbar. Bleibt als eigener Schritt offen,
  falls Produktion je auf Blob wechselt.
- **Ein eingebauter Scheduler.** Der Auslöser bleibt extern.
- **Rotation des Tokens im laufenden Betrieb.** Rotation heißt: Variable tauschen
  und neu deployen.
- **Die Altlast `POST /api/files/delete`.** Sie löscht weiterhin in umgekehrter
  Reihenfolge (`storage.delete` vor `deleteFileByPath`) und meldet auch dann
  Erfolg, wenn die Zeile stehen bleibt. Das erzeugt keine Klasse-B-Waise,
  sondern den umgekehrten, **sichtbaren** Fehler: eine Zeile ohne Datei, die der
  Nutzer als kaputtes Bild sieht. Eigener Schritt, nicht Teil dieses Entwurfs.

### Nachtrag zur Häufigkeit von Klasse B

Seit PR #584 löschen die Normalwege — `saveSightingFiles()` und
`DELETE /api/sightings/[id]` — die Storage-Dateien über `deleteStoredFiles()`
mit. Klasse B ist dadurch **kein Regelfall mehr**, sondern Restmenge aus:

1. fehlgeschlagenen Storage-Löschungen (`deleteStoredFiles` wirft bewusst nie
   und versucht es nie erneut — der Vorgang ist bereits committet),
2. Altbestand von vor #584.

Der erste Dry-Run gegen die lokale Datenbank bestätigt das: 0 Dateien ohne
Zeile, 4 Zeilen ohne Sichtung. Klasse B bleibt im Entwurf, weil ein
best-effort-Löschen ohne Wiederholung genau diese Restmenge erzeugt — sie ist
nur seltener, als der ursprüngliche Aufhänger vermuten ließ.

**Zu korrigieren:** `.claude/rules/upload.md` behauptet im Abschnitt
„Aufbewahrung unverknüpfter Uploads" weiterhin, die beiden Normalwege entfernten
Zeilen „ohne die Dateien zu löschen, und erzeugen so laufend neue Waisen". Das
hat #584 behoben; der Satz kam mit #586 danach hinein.
