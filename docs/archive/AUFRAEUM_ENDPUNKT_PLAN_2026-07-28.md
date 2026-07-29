# Aufräum-Endpunkt für verwaiste Uploads — Implementierungsplan

> **Für agentische Bearbeiter:** Dieser Plan wird Aufgabe für Aufgabe abgearbeitet.
> Schritte nutzen Checkbox-Syntax (`- [ ]`) zur Verfolgung.

**Ziel:** Das Aufräumen verwaister Uploads wird über einen tokengesicherten
Endpunkt auslösbar — aus der Admin-UI und per externem Web-Cron — ohne das
vorhandene CLI-Werkzeug zu verlieren.

**Architektur:** Die bereits sauber getrennten reinen Funktionen des Tools wandern
in ein Kernmodul unter `$lib/server/media/`. Ein neuer Orchestrator dort führt
sie über injizierte Ports aus. Tool und Endpunkt hängen jeweils ihre eigene I/O
ein — das Tool über `postgres` und `node:fs`, der Endpunkt über Drizzle und den
Storage-Provider.

**Tech-Stack:** SvelteKit 5, TypeScript, Drizzle, Vitest, Node ≥ 22.18
(Type Stripping).

**Entwurf:** `docs/archive/AUFRAEUM_ENDPUNKT_ENTWURF_2026-07-28.md`

## Globale Vorgaben

- Test-First ist Pflicht (`.claude/rules/testing.md`): erst der fehlschlagende
  Test, dann der Code.
- `npm run test:quick` muss vor jedem Commit durchlaufen.
- Commit-Format `<type>(<scope>): <beschreibung>`, Subject englisch und
  kleingeschrieben; erlaubte Scopes u. a. `api`, `media`, `admin`, `docs`, `test`.
- Löschreihenfolge ist unverhandelbar: **erst die DB-Zeile, dann die Datei**
  (`.claude/rules/upload.md`).
- Mindestfrist ist `ORPHAN_RETENTION_HOURS` aus `$lib/constants/uploadRetention`
  (aktuell `24`). Kleinere Angaben werden geklemmt, nicht abgelehnt.
- Löschdeckel pro Aufruf: `500` **Fundstücke** (eine Zeile samt Datei zählt als eins).
- Name der Umgebungsvariablen: `CLEANUP_TOKEN`, Mindestlänge 32 Zeichen.
- Bei jeder Änderung an einer API-Route muss `static/openapi.yml` mit demselben
  Commit aktualisiert werden (`.claude/rules/api.md`).
- Keine hartkodierten Farben, `*-content` nur auf Vollton-Flächen, Touch-Targets
  ≥ 44 px (`.claude/rules/design-system.md`).

---

## Dateiübersicht

| Datei                                                                                                         | Verantwortung                                                                                                        |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/media/orphanCleanup.ts`                                                                       | **neu** — reine Auswahl-Logik plus Orchestrator mit injizierten Ports. Frei von `$lib`-Aliassen, Drizzle, SvelteKit. |
| `src/lib/server/media/orphanCleanup.test.ts`                                                                  | **neu** — übernimmt die Tests der verschobenen Funktionen, ergänzt Orchestrator-Tests.                               |
| `src/tools/cleanup-orphaned-uploads.ts`                                                                       | behält CLI, dotenv, `postgres`, `node:fs`, Konsolenausgabe; ruft den Kern.                                           |
| `src/tools/cleanup-orphaned-uploads.test.ts`                                                                  | behält nur noch Tests zu CLI und Umgebung.                                                                           |
| `src/lib/server/media/cleanupAuth.ts`                                                                         | **neu** — Prüfung des Bearer-Tokens, konstantzeitig.                                                                 |
| `src/lib/server/media/cleanupAuth.test.ts`                                                                    | **neu**                                                                                                              |
| `src/lib/server/media/cleanupPorts.ts`                                                                        | **neu** — Drizzle- und Storage-Ports für den Endpunkt.                                                               |
| `src/routes/api/admin/cleanup-orphans/+server.ts`                                                             | **neu** — Auth, Parameter, Bericht als JSON.                                                                         |
| `src/routes/api/admin/cleanup-orphans/endpoint.test.ts`                                                       | **neu**                                                                                                              |
| `src/lib/server/audit/auditService.ts`                                                                        | `AuditAction` um `file.cleanup_orphans` erweitern.                                                                   |
| `src/lib/server/middleware/rateLimit.ts`                                                                      | `RATE_LIMITS.ADMIN_CLEANUP` ergänzen.                                                                                |
| `src/routes/admin/settings/+page.svelte`                                                                      | Abschnitt „Verwaiste Uploads“.                                                                                       |
| `tsconfig.json`                                                                                               | `allowImportingTsExtensions: true`.                                                                                  |
| `static/openapi.yml`, `.env.example`, `docs/ENVIRONMENT.md`, `.claude/rules/upload.md`, `src/tools/README.md` | Dokumentation.                                                                                                       |

---

## Task 1: Reine Logik in den Kern verschieben

Reiner Umzug ohne Verhaltensänderung. Etabliert den relativen `.ts`-Import.

**Dateien:**

- Anlegen: `src/lib/server/media/orphanCleanup.ts`
- Anlegen: `src/lib/server/media/orphanCleanup.test.ts`
- Ändern: `src/tools/cleanup-orphaned-uploads.ts`
- Ändern: `src/tools/cleanup-orphaned-uploads.test.ts`
- Ändern: `src/tools/cleanupRetentionContract.test.ts`
- Ändern: `tsconfig.json`

**Schnittstellen:**

- Liefert: `parseRetention`, `computeCutoff`, `selectOrphanedRows`,
  `normalizeRelativePath`, `selectOrphanedFiles`, `resolveSafeTarget`,
  `DEFAULT_RETENTION`, sowie die Typen `OrphanRow`, `DiskEntry`, `KnownState` —
  alle aus `$lib/server/media/orphanCleanup`, unverändert in Signatur und
  Verhalten.

- [ ] **Schritt 1: `allowImportingTsExtensions` aktivieren**

In `tsconfig.json` unter `compilerOptions` direkt nach `"moduleResolution": "bundler",` einfügen:

```json
		"allowImportingTsExtensions": true,
```

Zulässig, weil das Projekt ausschließlich `tsc --noEmit` fährt.

- [ ] **Schritt 2: Prüfen, dass das Projekt weiterhin type-checkt**

Ausführen: `npm run type-check`
Erwartet: keine Ausgabe, Exit 0.

- [ ] **Schritt 3: Kernmodul anlegen**

Aus `src/tools/cleanup-orphaned-uploads.ts` unverändert nach
`src/lib/server/media/orphanCleanup.ts` verschieben: `RETENTION_PATTERN`,
`MILLIS_PER_HOUR`, `MILLIS_PER_DAY`, `DEFAULT_RETENTION`, `EXCLUDED_DIRS`,
`parseRetention`, `computeCutoff`, `OrphanRow`, `selectOrphanedRows`,
`DiskEntry`, `normalizeRelativePath`, `KnownState`, `selectOrphanedFiles`,
`resolveSafeTarget` **und `scanUploadDir`** (dort `export` ergänzen).

`scanUploadDir` muss mit, obwohl es `node:fs` anfasst: Es trägt drei
Absicherungen, die keine Zweitimplementierung verlieren darf — den Ausschluss
von `_old_uploads` (Altbestand der Migration), das Überspringen von Punktdateien
(`.DS_Store`, `.gitkeep` lägen sonst als Waisen im Ergebnis) und die
ENOENT-Toleranz für ein fehlendes Upload-Verzeichnis. Tool und Endpunkt laufen
beide unter Node; nur der Vercel-Pfad hat kein Dateisystem, und der ist über die
Provider-Prüfung in Task 5 ausgeschlossen. Kopfkommentar:

```typescript
/**
 * Reine Auswahl-Logik für verwaiste Uploads.
 *
 * Bewusst frei von `$lib`-Aliassen, Drizzle und SvelteKit: Das CLI-Werkzeug
 * `src/tools/cleanup-orphaned-uploads.ts` lädt dieses Modul unter Node-Type-
 * Stripping über einen relativen `.ts`-Import und muss ohne Anwendungslaufzeit
 * auskommen. Die I/O-gebundenen Teile stehen im Aufrufer.
 */
import { readdir, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
```

`DEFAULT_RETENTION` bezieht seinen Wert aus der geteilten Konstante:

```typescript
import { ORPHAN_RETENTION } from '../../constants/uploadRetention.ts';

/** Vorgabefrist. Siehe `$lib/constants/uploadRetention` für die Begründung. */
export const DEFAULT_RETENTION = ORPHAN_RETENTION;
```

- [ ] **Schritt 4: Tool auf den Kern umstellen**

In `src/tools/cleanup-orphaned-uploads.ts` die verschobenen Deklarationen
entfernen und ersetzen durch:

```typescript
import {
	DEFAULT_RETENTION,
	computeCutoff,
	normalizeRelativePath,
	parseRetention,
	resolveSafeTarget,
	scanUploadDir,
	selectOrphanedFiles,
	selectOrphanedRows,
	type DiskEntry,
	type KnownState,
	type OrphanRow
} from '../lib/server/media/orphanCleanup.ts';
```

`DEFAULT_RETENTION` bleibt re-exportiert, damit der Vertragstest greift:

```typescript
export { DEFAULT_RETENTION, parseRetention };
```

- [ ] **Schritt 5: Tests des Kerns umziehen**

Die `describe`-Blöcke `parseRetention`, `computeCutoff`, `selectOrphanedRows`,
`normalizeRelativePath`, `selectOrphanedFiles` und `resolveSafeTarget` aus
`src/tools/cleanup-orphaned-uploads.test.ts` nach
`src/lib/server/media/orphanCleanup.test.ts` verschieben; dort importieren aus
`./orphanCleanup`. In der Tool-Testdatei bleiben nur `parseCliOptions`,
`resolveConnectionString` und `assertLocalStorage`.

- [ ] **Schritt 6: Alle Tests laufen lassen**

Ausführen: `npm run test:quick`
Erwartet: alle Tests grün, keine Typfehler.

- [ ] **Schritt 7: Standalone-Lauf des Tools verifizieren**

Ausführen: `npm run media:cleanup-orphans:dry-run`
Erwartet: derselbe Befundtext wie vor dem Umzug, Exit 0. Dieser Schritt ist der
eigentliche Beweis, dass der relative `.ts`-Import unter Node funktioniert.

- [ ] **Schritt 8: Commit**

```bash
git add -A
git commit -m "refactor(media): move orphan selection logic into shared core"
```

---

## Task 2: Orchestrator mit injizierten Ports

**Dateien:**

- Ändern: `src/lib/server/media/orphanCleanup.ts`
- Ändern: `src/lib/server/media/orphanCleanup.test.ts`

**Schnittstellen:**

- Nutzt: die reinen Funktionen aus Task 1.
- Liefert: `cleanupOrphans(options: CleanupOptions): Promise<CleanupReport>`
  sowie die Typen `CleanupPorts`, `CleanupOptions`, `CleanupReport` — von
  Task 3 (Tool) und Task 5 (Endpunkt) genutzt. Klasse-B-Fundstücke sind
  `DiskEntry` aus Task 1, kein eigener Typ.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

An `src/lib/server/media/orphanCleanup.test.ts` anhängen:

```typescript
describe('cleanupOrphans', () => {
	const NOW = new Date('2026-07-28T12:00:00.000Z');
	const HOUR = 60 * 60 * 1000;

	function ports(rows: OrphanRow[] = [], files: DiskEntry[] | null = []) {
		const order: string[] = [];
		return {
			order,
			findOrphanRows: vi.fn(async () => rows),
			findOrphanFiles: vi.fn(async () => files),
			deleteRow: vi.fn(async (id: number) => {
				order.push(`row:${id}`);
			}),
			deleteFile: vi.fn(async (path: string) => {
				order.push(`file:${path}`);
			})
		};
	}

	const row = (id: number, filePath: string): OrphanRow => ({
		id,
		filePath,
		uploadedAt: new Date('2026-07-01T00:00:00.000Z')
	});

	it('fragt Zeilen mit der aus der Frist gebildeten Grenze ab', async () => {
		const p = ports();
		await cleanupOrphans({
			now: NOW,
			retentionMs: 24 * HOUR,
			execute: false,
			limit: 500,
			ports: p
		});
		expect(p.findOrphanRows).toHaveBeenCalledWith(new Date('2026-07-27T12:00:00.000Z'));
	});

	it('löscht im Vorschaumodus nichts und liefert die Fundstücke', async () => {
		const p = ports([row(1, 'a/b.jpg')]);
		const report = await cleanupOrphans({
			now: NOW,
			retentionMs: 24 * HOUR,
			execute: false,
			limit: 500,
			ports: p
		});
		expect(p.deleteRow).not.toHaveBeenCalled();
		expect(p.deleteFile).not.toHaveBeenCalled();
		expect(report.rowsFound).toBe(1);
		expect(report.preview?.rows).toHaveLength(1);
	});

	it('löscht erst die Zeile, dann die Datei', async () => {
		const p = ports([row(1, 'a/b.jpg')]);
		await cleanupOrphans({ now: NOW, retentionMs: 24 * HOUR, execute: true, limit: 500, ports: p });
		expect(p.order).toEqual(['row:1', 'file:a/b.jpg']);
	});

	it('zählt die Zeile als gelöscht, auch wenn die Datei nicht weggeht', async () => {
		// Die Zeile ist bereits weg — der Lauf darf sie nicht als Fehlschlag führen.
		const p = ports([row(1, 'a/b.jpg')]);
		p.deleteFile.mockRejectedValue(new Error('storage weg'));
		const report = await cleanupOrphans({
			now: NOW,
			retentionMs: 24 * HOUR,
			execute: true,
			limit: 500,
			ports: p
		});
		expect(report.rowsDeleted).toBe(1);
		expect(report.filesDeleted).toBe(0);
		expect(report.failed).toBe(1);
	});

	it('macht nach einem Fehler mit den übrigen Fundstücken weiter', async () => {
		const p = ports([row(1, 'kaputt.jpg'), row(2, 'ok.jpg')]);
		p.deleteRow.mockImplementation(async (id: number) => {
			if (id === 1) throw new Error('DB weg');
			p.order.push(`row:${id}`);
		});
		const report = await cleanupOrphans({
			now: NOW,
			retentionMs: 24 * HOUR,
			execute: true,
			limit: 500,
			ports: p
		});
		expect(report.rowsDeleted).toBe(1);
		expect(report.failed).toBe(1);
	});

	it('deckelt die Anzahl und meldet den Rest', async () => {
		const p = ports([row(1, 'a.jpg'), row(2, 'b.jpg'), row(3, 'c.jpg')]);
		const report = await cleanupOrphans({
			now: NOW,
			retentionMs: 24 * HOUR,
			execute: true,
			limit: 2,
			ports: p
		});
		expect(report.rowsDeleted).toBe(2);
		expect(report.remaining).toBe(1);
	});

	it('behandelt einen Provider ohne Dateisystem als erfolgreichen Lauf', async () => {
		const p = ports([], null);
		const report = await cleanupOrphans({
			now: NOW,
			retentionMs: 24 * HOUR,
			execute: true,
			limit: 500,
			ports: p
		});
		expect(report.filesFound).toBeNull();
		expect(report.failed).toBe(0);
	});
});
```

Importe der Testdatei ergänzen um `vi` aus `vitest` sowie `cleanupOrphans` und
`type DiskEntry` aus `./orphanCleanup`.

- [ ] **Schritt 2: Tests laufen lassen und Fehlschlag prüfen**

Ausführen: `npx vitest run --project server src/lib/server/media/orphanCleanup.test.ts`
Erwartet: FAIL — `cleanupOrphans` ist nicht exportiert.

- [ ] **Schritt 3: Orchestrator implementieren**

An `src/lib/server/media/orphanCleanup.ts` anhängen:

```typescript
export interface CleanupPorts {
	/** Zeilen ohne Sichtung, deren Upload vor `cutoff` liegt. */
	findOrphanRows(cutoff: Date): Promise<OrphanRow[]>;
	/**
	 * Dateien ohne Zeile, älter als `cutoff`. `null`, wenn der Provider kein
	 * Dateisystem bietet.
	 *
	 * `cutoff` ist hier kein Komfort, sondern Schutz: Der Upload schreibt erst
	 * die Datei und danach die DB-Zeile. Ohne Altersfilter gälte genau diese
	 * Lücke als Waise — ein laufender Upload würde zerstört.
	 */
	findOrphanFiles(cutoff: Date): Promise<DiskEntry[] | null>;
	deleteRow(id: number): Promise<void>;
	deleteFile(relativePath: string): Promise<void>;
}

export interface CleanupOptions {
	now: Date;
	retentionMs: number;
	/** `false` ermittelt nur und fasst nichts an. */
	execute: boolean;
	/** Obergrenze bearbeiteter **Fundstücke** pro Lauf. Eine Zeile samt ihrer
	 * Datei zählt als eins. */
	limit: number;
	ports: CleanupPorts;
	onError?: (subject: string, error: unknown) => void;
}

export interface CleanupReport {
	rowsFound: number;
	/** `null` = Klasse B für diesen Provider nicht anwendbar. */
	filesFound: number | null;
	rowsDeleted: number;
	filesDeleted: number;
	failed: number;
	/** Vom Deckel übrig gelassene Fundstücke. */
	remaining: number;
	preview?: { rows: OrphanRow[]; files: DiskEntry[] };
}

/**
 * Ermittelt verwaiste Uploads und entfernt sie, wenn `execute` gesetzt ist.
 *
 * Reihenfolge: erst die DB-Zeile, dann die Datei. Bricht der zweite Schritt ab,
 * bleibt eine Datei liegen, auf die nichts mehr zeigt — folgenlos. Andersherum
 * entstünde eine Zeile ohne Datei, die der Nutzer als kaputtes Bild sieht.
 * Siehe `.claude/rules/upload.md`.
 */
export async function cleanupOrphans(options: CleanupOptions): Promise<CleanupReport> {
	const { now, retentionMs, execute, limit, ports, onError } = options;

	const cutoff = computeCutoff(now, retentionMs);
	const rows = await ports.findOrphanRows(cutoff);
	const files = await ports.findOrphanFiles(cutoff);

	const report: CleanupReport = {
		rowsFound: rows.length,
		filesFound: files === null ? null : files.length,
		rowsDeleted: 0,
		filesDeleted: 0,
		failed: 0,
		remaining: 0
	};

	if (!execute) {
		report.preview = { rows, files: files ?? [] };
		return report;
	}

	const budget = { left: limit };

	for (const row of rows) {
		if (budget.left <= 0) break;
		budget.left--;
		try {
			await ports.deleteRow(row.id);
			report.rowsDeleted++;
		} catch (error) {
			report.failed++;
			onError?.(`row:${row.id}`, error);
			continue;
		}
		// Die Zeile ist weg; ein Fehlschlag hier hinterlässt nur eine
		// unerreichbare Datei und macht den Zeilen-Löschvorgang nicht ungültig.
		try {
			await ports.deleteFile(row.filePath);
			report.filesDeleted++;
		} catch (error) {
			report.failed++;
			onError?.(`file:${row.filePath}`, error);
		}
	}

	for (const file of files ?? []) {
		if (budget.left <= 0) break;
		budget.left--;
		try {
			await ports.deleteFile(file.relativePath);
			report.filesDeleted++;
		} catch (error) {
			report.failed++;
			onError?.(`file:${file.relativePath}`, error);
		}
	}

	report.remaining = Math.max(0, rows.length + (files?.length ?? 0) - limit);
	return report;
}
```

- [ ] **Schritt 4: Tests laufen lassen**

Ausführen: `npx vitest run --project server src/lib/server/media/orphanCleanup.test.ts`
Erwartet: PASS.

- [ ] **Schritt 5: Commit**

```bash
git add -A
git commit -m "feat(media): add orphan cleanup orchestrator with injected ports"
```

---

## Task 3: Tool auf den Orchestrator umstellen

**Dateien:**

- Ändern: `src/tools/cleanup-orphaned-uploads.ts`

**Schnittstellen:**

- Nutzt: `cleanupOrphans`, `CleanupPorts` aus Task 2.
- Liefert: unverändertes CLI-Verhalten.

- [ ] **Schritt 1: `main()` auf den Orchestrator umbauen**

Die bisherige Schleife in `main()` durch einen Aufruf ersetzen, der die Ports
über den vorhandenen `postgres`-Client und `node:fs` bereitstellt:

```typescript
const report = await cleanupOrphans({
	now: new Date(),
	retentionMs: parseRetention(options.retention),
	execute: options.execute,
	limit: Number.POSITIVE_INFINITY,
	ports: {
		findOrphanRows: async (cutoff) =>
			selectOrphanedRows(
				await sql<OrphanRow[]>`
					SELECT id, datei_pfad AS "filePath", hochgeladen_am AS "uploadedAt"
					FROM sichtungen_dateien WHERE sichtung_id IS NULL`,
				cutoff
			),
		findOrphanFiles: async (cutoff) =>
			selectOrphanedFiles(await scanUploadDir(options.uploadsDir), known, cutoff),
		deleteRow: async (id) => {
			await sql`DELETE FROM sichtungen_dateien WHERE id = ${id}`;
		},
		deleteFile: async (relativePath) => {
			const target = resolveSafeTarget(options.uploadsDir, relativePath);
			if (!target) {
				console.warn(`⚠️  Pfad außerhalb des Upload-Verzeichnisses, übersprungen: ${relativePath}`);
				return;
			}
			await removeFile(target);
		}
	},
	onError: (subject, error) =>
		console.warn(`⚠️  ${subject}: ${error instanceof Error ? error.message : String(error)}`)
});
```

`limit` ist im CLI bewusst unbegrenzt — der Deckel schützt HTTP-Aufrufe vor
Timeouts, nicht einen manuellen Lauf. Die Konsolenausgabe liest ihre Zahlen
danach aus `report`.

- [ ] **Schritt 2: Standalone-Lauf verifizieren**

Ausführen: `npm run media:cleanup-orphans:dry-run`
Erwartet: identischer Befund wie vor Task 1 (aktuell 4 Zeilen, 0 Dateien), Exit 0.

- [ ] **Schritt 3: Alle Tests laufen lassen**

Ausführen: `npm run test:quick`
Erwartet: alles grün.

- [ ] **Schritt 4: Commit**

```bash
git add -A
git commit -m "refactor(media): drive cleanup tool through shared orchestrator"
```

---

## Task 4: Token-Prüfung

**Dateien:**

- Anlegen: `src/lib/server/media/cleanupAuth.ts`
- Anlegen: `src/lib/server/media/cleanupAuth.test.ts`

**Schnittstellen:**

- Liefert: `isValidCleanupToken(header: string | null, expected: string | undefined): boolean`
  und `MIN_TOKEN_LENGTH` — von Task 5 genutzt.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

```typescript
/**
 * Prüfung des M2M-Tokens für den Aufräum-Endpunkt.
 * Siehe docs/archive/AUFRAEUM_ENDPUNKT_ENTWURF_2026-07-28.md, § 5.
 */
import { describe, expect, it } from 'vitest';
import { MIN_TOKEN_LENGTH, isValidCleanupToken } from './cleanupAuth';

const VALID = 'a'.repeat(MIN_TOKEN_LENGTH);

describe('isValidCleanupToken', () => {
	it('akzeptiert das erwartete Token', () => {
		expect(isValidCleanupToken(`Bearer ${VALID}`, VALID)).toBe(true);
	});

	it('weist ein abweichendes Token zurück', () => {
		expect(isValidCleanupToken(`Bearer ${'b'.repeat(MIN_TOKEN_LENGTH)}`, VALID)).toBe(false);
	});

	it('weist ab, wenn kein Token konfiguriert ist', () => {
		// Ohne gesetzte Variable ist der externe Weg abgeschaltet, nicht offen.
		expect(isValidCleanupToken(`Bearer ${VALID}`, undefined)).toBe(false);
		expect(isValidCleanupToken(`Bearer ${VALID}`, '')).toBe(false);
	});

	it('behandelt ein zu kurzes konfiguriertes Token wie keins', () => {
		const short = 'a'.repeat(MIN_TOKEN_LENGTH - 1);
		expect(isValidCleanupToken(`Bearer ${short}`, short)).toBe(false);
	});

	it('weist fehlenden oder falsch aufgebauten Header ab', () => {
		expect(isValidCleanupToken(null, VALID)).toBe(false);
		expect(isValidCleanupToken(VALID, VALID)).toBe(false);
		expect(isValidCleanupToken('Basic ' + VALID, VALID)).toBe(false);
	});

	it('weist ein Token ab, das nur ein Präfix des erwarteten ist', () => {
		expect(isValidCleanupToken(`Bearer ${VALID.slice(0, -1)}`, VALID)).toBe(false);
	});
});
```

- [ ] **Schritt 2: Tests laufen lassen und Fehlschlag prüfen**

Ausführen: `npx vitest run --project server src/lib/server/media/cleanupAuth.test.ts`
Erwartet: FAIL — Modul nicht gefunden.

- [ ] **Schritt 3: Implementieren**

```typescript
/**
 * Prüft das M2M-Token des Aufräum-Endpunkts.
 *
 * Konstantzeitiger Vergleich, damit die Laufzeit nicht verrät, wie viele
 * Zeichen stimmen. Ein nicht oder zu kurz gesetztes `CLEANUP_TOKEN` schaltet
 * den externen Weg ab — es darf nie „alles erlaubt“ bedeuten.
 */
import { timingSafeEqual } from 'node:crypto';

/** Kürzere Geheimnisse sind nicht brauchbar und gelten als nicht gesetzt. */
export const MIN_TOKEN_LENGTH = 32;

export function isValidCleanupToken(header: string | null, expected: string | undefined): boolean {
	if (!expected || expected.length < MIN_TOKEN_LENGTH) return false;
	if (!header?.startsWith('Bearer ')) return false;

	const provided = Buffer.from(header.slice('Bearer '.length));
	const reference = Buffer.from(expected);

	// timingSafeEqual wirft bei ungleicher Länge — die Länge selbst ist kein
	// schützenswertes Geheimnis, der Inhalt schon.
	if (provided.length !== reference.length) return false;
	return timingSafeEqual(provided, reference);
}
```

- [ ] **Schritt 4: Tests laufen lassen**

Ausführen: `npx vitest run --project server src/lib/server/media/cleanupAuth.test.ts`
Erwartet: PASS.

- [ ] **Schritt 5: Commit**

```bash
git add -A
git commit -m "feat(security): add constant-time token check for cleanup endpoint"
```

---

## Task 5: Endpunkt

**Dateien:**

- Anlegen: `src/lib/server/media/cleanupPorts.ts`
- Anlegen: `src/lib/server/media/cleanupPorts.test.ts`
- Anlegen: `src/lib/server/media/scanLocalUploads.ts`
- Anlegen: `src/routes/api/admin/cleanup-orphans/+server.ts`
- Anlegen: `src/routes/api/admin/cleanup-orphans/endpoint.test.ts`
- Ändern: `src/lib/server/audit/auditService.ts`
- Ändern: `src/lib/server/middleware/rateLimit.ts`
- Ändern: `static/openapi.yml`

**Schnittstellen:**

- Nutzt: `cleanupOrphans` (Task 2), `isValidCleanupToken` (Task 4).
- Liefert: `POST /api/admin/cleanup-orphans` mit `CleanupReport` als JSON;
  `createDbPorts(): CleanupPorts` aus `cleanupPorts.ts` für Task 7.

- [ ] **Schritt 1: Audit-Aktion und Rate-Limit ergänzen**

In `src/lib/server/audit/auditService.ts` die Union erweitern:

```typescript
	| 'file.delete'
	| 'file.cleanup_orphans'
```

In `src/lib/server/middleware/rateLimit.ts` bei den übrigen Einträgen:

```typescript
	// Aufräum-Endpunkt: ein Cron braucht wenige Aufrufe, ein Angreifer viele
	ADMIN_CLEANUP: {
		windowMs: 60 * 60 * 1000, // 1 Stunde
		maxRequests: 30
	},
```

- [ ] **Schritt 2: Fehlschlagende Endpunkt-Tests schreiben**

```typescript
/**
 * Der Aufräum-Endpunkt ist über HTTP löschend — die Zugangs- und
 * Klemmungsregeln aus dem Entwurf (§ 4, § 5) sind hier festgeschrieben.
 */
import { ORPHAN_RETENTION_HOURS } from '$lib/constants/uploadRetention';
import { MIN_TOKEN_LENGTH } from '$lib/server/media/cleanupAuth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const TOKEN = 'z'.repeat(MIN_TOKEN_LENGTH);
const cleanupOrphans = vi.fn();
const logAuditEvent = vi.fn();

vi.mock('$lib/server/media/orphanCleanup', () => ({ cleanupOrphans }));
vi.mock('$lib/server/media/cleanupPorts', () => ({ createDbPorts: () => ({}) }));
vi.mock('$lib/server/audit/auditService', () => ({ logAuditEvent }));
vi.mock('$env/dynamic/private', () => ({ env: { CLEANUP_TOKEN: TOKEN } }));

import { POST } from './+server';

function event(init: { token?: string; query?: string; user?: unknown } = {}) {
	return {
		request: new Request('https://x/api/admin/cleanup-orphans', {
			method: 'POST',
			headers: init.token ? { Authorization: `Bearer ${init.token}` } : {}
		}),
		url: new URL(`https://x/api/admin/cleanup-orphans?${init.query ?? ''}`),
		locals: { user: init.user },
		getClientAddress: () => '127.0.0.1'
	} as never;
}

describe('POST /api/admin/cleanup-orphans', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		cleanupOrphans.mockResolvedValue({
			rowsFound: 0,
			filesFound: 0,
			rowsDeleted: 0,
			filesDeleted: 0,
			failed: 0,
			remaining: 0
		});
	});

	it('weist einen Aufruf ohne Ausweis ab', async () => {
		const response = await POST(event());
		expect(response.status).toBe(401);
	});

	it('weist ein falsches Token ab', async () => {
		const response = await POST(event({ token: 'y'.repeat(MIN_TOKEN_LENGTH) }));
		expect(response.status).toBe(401);
	});

	it('lässt ein gültiges Token durch', async () => {
		const response = await POST(event({ token: TOKEN }));
		expect(response.status).toBe(200);
	});

	it('lässt eine Admin-Session ohne Token durch', async () => {
		const response = await POST(event({ user: { sub: 'u1', roles: ['admin'] } }));
		expect(response.status).toBe(200);
	});

	it('läuft ohne mode als Vorschau', async () => {
		await POST(event({ token: TOKEN }));
		expect(cleanupOrphans).toHaveBeenCalledWith(expect.objectContaining({ execute: false }));
	});

	it('führt nur bei mode=execute wirklich aus', async () => {
		await POST(event({ token: TOKEN, query: 'mode=execute' }));
		expect(cleanupOrphans).toHaveBeenCalledWith(expect.objectContaining({ execute: true }));
	});

	it('klemmt eine zu kurze Frist, statt sie abzulehnen', async () => {
		// Ein geleaktes Token darf mit hours=0 keine frischen Uploads abräumen.
		const response = await POST(event({ token: TOKEN, query: 'hours=0&mode=execute' }));
		expect(response.status).toBe(200);
		expect(cleanupOrphans).toHaveBeenCalledWith(
			expect.objectContaining({ retentionMs: ORPHAN_RETENTION_HOURS * 60 * 60 * 1000 })
		);
	});

	it('lässt eine längere Frist zu', async () => {
		await POST(event({ token: TOKEN, query: 'hours=48' }));
		expect(cleanupOrphans).toHaveBeenCalledWith(
			expect.objectContaining({ retentionMs: 48 * 60 * 60 * 1000 })
		);
	});

	it('deckelt limit auf 500', async () => {
		await POST(event({ token: TOKEN, query: 'limit=99999' }));
		expect(cleanupOrphans).toHaveBeenCalledWith(expect.objectContaining({ limit: 500 }));
	});

	it('schreibt bei execute einen Audit-Eintrag', async () => {
		await POST(event({ token: TOKEN, query: 'mode=execute' }));
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'file.cleanup_orphans' })
		);
	});

	it('schreibt bei der Vorschau keinen Audit-Eintrag', async () => {
		await POST(event({ token: TOKEN }));
		expect(logAuditEvent).not.toHaveBeenCalled();
	});
});
```

- [ ] **Schritt 3: Tests laufen lassen und Fehlschlag prüfen**

Ausführen: `npx vitest run --project server src/routes/api/admin/cleanup-orphans/endpoint.test.ts`
Erwartet: FAIL — `./+server` existiert nicht.

- [ ] **Schritt 4: Ports implementieren**

`src/lib/server/media/cleanupPorts.ts`:

```typescript
/**
 * Bindet den Aufräum-Kern an Datenbank und Storage der laufenden Anwendung.
 *
 * Klasse B (Datei ohne Zeile) setzt ein Dateisystem voraus. Bei jedem anderen
 * Provider liefert `findOrphanFiles` `null` — der Lauf gilt dann als
 * erfolgreich und meldet die Klasse als nicht anwendbar, statt zu scheitern.
 */
import { db } from '$lib/server/db';
import { sightingFiles } from '$lib/server/db/schema';
import {
	normalizeRelativePath,
	selectOrphanedRows,
	type CleanupPorts,
	type OrphanRow
} from '$lib/server/media/orphanCleanup';
import { getCurrentStorageProvider, getStorageProvider } from '$lib/server/storage/factory';
import { and, eq, isNull, lt } from 'drizzle-orm';

export function createDbPorts(): CleanupPorts {
	return {
		findOrphanRows: async (cutoff: Date): Promise<OrphanRow[]> => {
			const rows = await db
				.select({
					id: sightingFiles.id,
					filePath: sightingFiles.filePath,
					uploadedAt: sightingFiles.uploadedAt
				})
				.from(sightingFiles)
				.where(and(isNull(sightingFiles.sightingId), lt(sightingFiles.uploadedAt, cutoff)));
			return selectOrphanedRows(rows, cutoff);
		},

		findOrphanFiles: async (cutoff: Date) => {
			// Ohne lokales Dateisystem gibt es nichts zu scannen.
			if (getCurrentStorageProvider() !== 'local') return null;
			const { scanLocalUploads } = await import('$lib/server/media/scanLocalUploads');
			return scanLocalUploads(cutoff);
		},

		deleteRow: async (id: number) => {
			await db.delete(sightingFiles).where(eq(sightingFiles.id, id));
		},

		deleteFile: async (relativePath: string) => {
			await getStorageProvider().delete(normalizeRelativePath(relativePath));
		}
	};
}
```

`src/lib/server/media/scanLocalUploads.ts`:

```typescript
/**
 * Sucht Dateien im lokalen Upload-Verzeichnis, zu denen keine Zeile existiert.
 * Nur für `STORAGE_PROVIDER=local` — der Aufrufer stellt das sicher.
 *
 * Der Verzeichnis-Durchlauf kommt bewusst aus dem Kern (`scanUploadDir`) und
 * wird hier NICHT nachgebaut: Er trägt den Ausschluss von `_old_uploads`, das
 * Überspringen von Punktdateien und die ENOENT-Toleranz.
 */
import { db } from '$lib/server/db';
import { sightingFiles, sightings } from '$lib/server/db/schema';
import { scanUploadDir, selectOrphanedFiles, type DiskEntry } from './orphanCleanup';
import { resolveUploadBasePath } from '$lib/server/storage/uploadPath';

export async function scanLocalUploads(cutoff: Date): Promise<DiskEntry[]> {
	const [entries, knownPaths, knownRefs] = await Promise.all([
		scanUploadDir(resolveUploadBasePath()),
		db.select({ filePath: sightingFiles.filePath }).from(sightingFiles),
		db.select({ referenceId: sightings.referenceId }).from(sightings)
	]);

	return selectOrphanedFiles(
		entries,
		{
			paths: knownPaths.map((row) => row.filePath),
			referenceIds: knownRefs.map((row) => row.referenceId).filter((id): id is string => !!id)
		},
		cutoff
	);
}
```

- [ ] **Schritt 5: Endpunkt implementieren**

`src/routes/api/admin/cleanup-orphans/+server.ts`:

```typescript
/**
 * Räumt verwaiste Uploads auf.
 *
 * Zwei Zugänge: angemeldete Admin-Session oder `Authorization: Bearer` mit
 * `CLEANUP_TOKEN` für einen externen Web-Cron. Ist die Variable nicht gesetzt,
 * ist der Token-Weg abgeschaltet.
 *
 * Vorgabe ist die Vorschau; gelöscht wird nur mit `mode=execute`.
 * Entwurf: docs/archive/AUFRAEUM_ENDPUNKT_ENTWURF_2026-07-28.md
 */
import { env } from '$env/dynamic/private';
import { ORPHAN_RETENTION_HOURS } from '$lib/constants/uploadRetention';
import { createLogger } from '$lib/logger.server';
import { logAuditEvent } from '$lib/server/audit/auditService';
import { isAdminUser } from '$lib/server/auth/auth';
import { cleanupOrphans } from '$lib/server/media/orphanCleanup';
import { MIN_TOKEN_LENGTH, isValidCleanupToken } from '$lib/server/media/cleanupAuth';
import { createDbPorts } from '$lib/server/media/cleanupPorts';
import {
	RATE_LIMITS,
	buildRateLimitHeaders,
	createRateLimitIdentifier,
	enforceRateLimit
} from '$lib/server/middleware/rateLimit';
import { getClientIp } from '$lib/server/utils/getClientIp';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('api:admin:cleanup-orphans');

const MAX_LIMIT = 500;
const HOUR_IN_MS = 60 * 60 * 1000;

/** Frist aus der Query, nach unten auf die Mindestfrist geklemmt. */
function resolveRetentionMs(raw: string | null): number {
	const parsed = raw === null ? NaN : Number(raw);
	const hours = Number.isFinite(parsed)
		? Math.max(parsed, ORPHAN_RETENTION_HOURS)
		: ORPHAN_RETENTION_HOURS;
	return hours * HOUR_IN_MS;
}

function resolveLimit(raw: string | null): number {
	const parsed = raw === null ? NaN : Number(raw);
	if (!Number.isFinite(parsed) || parsed < 1) return MAX_LIMIT;
	return Math.min(Math.floor(parsed), MAX_LIMIT);
}

export const POST: RequestHandler = async ({ request, url, locals, getClientAddress }) => {
	const bySession = isAdminUser(locals.user);
	const byToken = isValidCleanupToken(request.headers.get('authorization'), env.CLEANUP_TOKEN);

	if (!bySession && !byToken) {
		// Ein gesetztes, aber zu kurzes Token verhält sich wie keins — das ist
		// leicht zu übersehen und muss deshalb sichtbar sein.
		if (env.CLEANUP_TOKEN && env.CLEANUP_TOKEN.length < MIN_TOKEN_LENGTH) {
			logger.warn(
				{ action: 'cleanup_token_too_short', required: MIN_TOKEN_LENGTH },
				'CLEANUP_TOKEN ist zu kurz und wird ignoriert'
			);
		}
		// Bewusst ohne Unterscheidung, welcher Weg fehlschlug.
		logger.warn({ action: 'cleanup_unauthorized' }, 'Aufräum-Lauf ohne gültigen Ausweis');
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const clientIp = getClientIp(getClientAddress, request) ?? 'unknown';
	const rateLimit = enforceRateLimit(
		createRateLimitIdentifier(locals.user?.sub, clientIp, bySession),
		RATE_LIMITS.ADMIN_CLEANUP,
		'admin_cleanup'
	);
	const headers = buildRateLimitHeaders(RATE_LIMITS.ADMIN_CLEANUP, rateLimit);

	const execute = url.searchParams.get('mode') === 'execute';
	const retentionMs = resolveRetentionMs(url.searchParams.get('hours'));
	const limit = resolveLimit(url.searchParams.get('limit'));

	try {
		const report = await cleanupOrphans({
			now: new Date(),
			retentionMs,
			execute,
			limit,
			ports: createDbPorts(),
			onError: (subject, error) => logger.error({ subject, error }, 'Löschen fehlgeschlagen')
		});

		if (execute) {
			await logAuditEvent({
				action: 'file.cleanup_orphans',
				resourceType: 'file',
				userEmail: locals.user?.email,
				ipAddress: clientIp,
				details: { ...report, trigger: bySession ? 'session' : 'token' },
				status: report.failed > 0 ? 'failure' : 'success'
			});
		}

		logger.info({ ...report, execute }, 'Aufräum-Lauf abgeschlossen');
		return json({ retentionHours: retentionMs / HOUR_IN_MS, ...report }, { headers });
	} catch (error) {
		logger.error({ error }, 'Aufräum-Lauf fehlgeschlagen');
		return json({ error: 'Aufräumen fehlgeschlagen' }, { status: 500, headers });
	}
};
```

- [ ] **Schritt 6: Ports testen**

Der Endpunkt-Test ersetzt `cleanupOrphans` durch einen Mock — die Verdrahtung in
`cleanupPorts.ts` bliebe damit ungetestet. `src/lib/server/media/cleanupPorts.test.ts`:

```typescript
/** Die Provider-Weiche entscheidet, ob Klasse B überhaupt gesucht wird. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCurrentStorageProvider = vi.fn();
const scanLocalUploads = vi.fn();

vi.mock('$lib/server/storage/factory', () => ({
	getCurrentStorageProvider,
	getStorageProvider: () => ({ delete: vi.fn() })
}));
vi.mock('$lib/server/media/scanLocalUploads', () => ({ scanLocalUploads }));
vi.mock('$lib/server/db', () => ({ db: {} }));

import { createDbPorts } from './cleanupPorts';

describe('createDbPorts.findOrphanFiles', () => {
	beforeEach(() => vi.clearAllMocks());

	it('sucht nicht im Dateisystem, wenn der Provider keins hat', async () => {
		getCurrentStorageProvider.mockReturnValue('vercel-blob');
		await expect(createDbPorts().findOrphanFiles(new Date())).resolves.toBeNull();
		expect(scanLocalUploads).not.toHaveBeenCalled();
	});

	it('reicht den Grenzzeitpunkt an den Scan durch', async () => {
		// Ohne cutoff gälte die Lücke zwischen geschriebener Datei und noch
		// fehlender DB-Zeile als Waise — ein laufender Upload würde zerstört.
		getCurrentStorageProvider.mockReturnValue('local');
		scanLocalUploads.mockResolvedValue([]);
		const cutoff = new Date('2026-07-27T12:00:00.000Z');
		await createDbPorts().findOrphanFiles(cutoff);
		expect(scanLocalUploads).toHaveBeenCalledWith(cutoff);
	});
});
```

- [ ] **Schritt 7: Tests laufen lassen**

Ausführen: `npx vitest run --project server src/routes/api/admin/cleanup-orphans src/lib/server/media`
Erwartet: PASS.

- [ ] **Schritt 8: OpenAPI ergänzen**

In `static/openapi.yml` unter `paths` einfügen:

```yaml
/api/admin/cleanup-orphans:
  post:
    tags: [Admin]
    summary: Verwaiste Uploads ermitteln und entfernen
    description: >
      Entfernt Dateizeilen ohne Sichtung, deren Upload älter als die
      Aufbewahrungsfrist ist, sowie Dateien ohne Zeile. Zugang über
      Admin-Session oder Bearer-Token (CLEANUP_TOKEN).
    security:
      - bearerAuth: []
    parameters:
      - {
          name: mode,
          in: query,
          schema: { type: string, enum: [preview, execute], default: preview }
        }
      - {
          name: hours,
          in: query,
          schema: { type: integer, minimum: 1 },
          description: Wird auf die Mindestfrist geklemmt
        }
      - {
          name: limit,
          in: query,
          schema: { type: integer, minimum: 1, maximum: 500, default: 500 }
        }
    responses:
      '200':
        description: Lauf durchgeführt
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CleanupReport' }
      '401': { description: Kein oder falsches Token }
      '429': { description: Rate Limit }
      '500': { description: Unerwarteter Fehler }
```

Unter `components/schemas`:

```yaml
CleanupReport:
  type: object
  properties:
    retentionHours: { type: number }
    rowsFound: { type: integer }
    filesFound:
      {
        type: integer,
        nullable: true,
        description: null = für diesen Storage-Provider nicht anwendbar
      }
    rowsDeleted: { type: integer }
    filesDeleted: { type: integer }
    failed: { type: integer }
    remaining: { type: integer }
```

- [ ] **Schritt 9: YAML prüfen und alles laufen lassen**

```bash
node --input-type=commonjs -e "const yaml=require('js-yaml'),fs=require('fs');yaml.load(fs.readFileSync('static/openapi.yml','utf8'));console.log('OK')"
npm run test:quick
```

Erwartet: `OK`, danach alle Tests grün.

- [ ] **Schritt 10: Commit**

```bash
git add -A
git commit -m "feat(api): add token-secured orphan cleanup endpoint"
```

---

## Task 6: Konfiguration und Dokumentation

**Dateien:**

- Ändern: `.env.example`, `docs/ENVIRONMENT.md`, `.claude/rules/upload.md`,
  `src/tools/README.md`

- [ ] **Schritt 1: `.env.example` ergänzen**

```bash
# Token für POST /api/admin/cleanup-orphans (externer Web-Cron).
# Mindestens 32 Zeichen. Nicht gesetzt = externer Zugang abgeschaltet.
CLEANUP_TOKEN=""
```

- [ ] **Schritt 2: `docs/ENVIRONMENT.md` ergänzen**

Zeile in der Variablentabelle: Name `CLEANUP_TOKEN`, Pflicht „nein“,
Beschreibung „Bearer-Token für den Aufräum-Endpunkt; ohne Wert ist der externe
Zugang abgeschaltet. Rotation: Wert tauschen und neu deployen.“

- [ ] **Schritt 3: Überholten Satz in `.claude/rules/upload.md` korrigieren**

Im Abschnitt „Aufbewahrung unverknüpfter Uploads“ den Satz ersetzen, der
behauptet, `DELETE /api/sightings/[id]` und `saveSightingFiles()` entfernten
Zeilen ohne die Dateien. Seit PR #584 löschen beide über `deleteStoredFiles()`
mit. Neuer Text:

```markdown
Durchgesetzt wird die Frist über `POST /api/admin/cleanup-orphans` — aus der
Admin-UI oder per externem Web-Cron mit `CLEANUP_TOKEN`. Für manuelle Läufe
ohne laufende Anwendung bleibt `npm run media:cleanup-orphans:dry-run`.

Dateien ohne Zeile (Klasse B) sind seit PR #584 die Ausnahme: Die Normalwege
löschen die Storage-Datei über `deleteStoredFiles()` mit. Übrig bleiben
fehlgeschlagene Storage-Löschungen — `deleteStoredFiles()` wirft bewusst nie
und versucht es nicht erneut — sowie der Altbestand von vor #584.

**Offen:** `POST /api/files/delete` löscht weiterhin in umgekehrter Reihenfolge
und meldet auch dann Erfolg, wenn die Zeile stehen bleibt.
```

- [ ] **Schritt 4: `src/tools/README.md` ergänzen**

Beim Eintrag zum Aufräum-Tool vermerken: dieselbe Logik läuft über
`POST /api/admin/cleanup-orphans`; das CLI bleibt für Läufe ohne laufende
Anwendung und für unbegrenzte Stapel.

- [ ] **Schritt 5: Commit**

```bash
git add -A
git commit -m "docs(media): document cleanup endpoint and correct stale orphan note"
```

---

## Task 7: Admin-UI mit Vorschau

**Dateien:**

- Anlegen: `src/routes/admin/settings/CleanupPanel.svelte`
- Anlegen: `src/routes/admin/settings/cleanupPanel.svelte.test.ts`
- Ändern: `src/routes/admin/settings/+page.svelte`

- [ ] **Schritt 1: Abschnitt einfügen**

```svelte
<script lang="ts">
	// … vorhandene Importe
	import Icon from '$lib/components/Icon.svelte';

	type CleanupReport = {
		retentionHours: number;
		rowsFound: number;
		filesFound: number | null;
		rowsDeleted: number;
		filesDeleted: number;
		failed: number;
		remaining: number;
	};

	let cleanupReport = $state<CleanupReport | null>(null);
	let cleanupBusy = $state(false);
	let cleanupError = $state<string | null>(null);

	async function runCleanup(execute: boolean) {
		cleanupBusy = true;
		cleanupError = null;
		try {
			const response = await fetch(
				`/api/admin/cleanup-orphans?mode=${execute ? 'execute' : 'preview'}`,
				{ method: 'POST' }
			);
			if (!response.ok) throw new Error(`Status ${response.status}`);
			cleanupReport = await response.json();
		} catch (error) {
			cleanupError = error instanceof Error ? error.message : 'Unbekannter Fehler';
		} finally {
			cleanupBusy = false;
		}
	}

	function confirmCleanup() {
		if (confirm('Verwaiste Uploads endgültig löschen? Das lässt sich nicht rückgängig machen.')) {
			runCleanup(true);
		}
	}
</script>

<section class="card bg-base-100 border-base-300 border shadow-sm">
	<div class="card-body">
		<h2 class="card-title">
			<Icon icon="lucide:trash-2" width="20" class="text-primary" aria-hidden="true" />
			Verwaiste Uploads
		</h2>
		<p class="text-base-content/70 text-sm">
			Aufnahmen, die übertragen, aber nie mit einer abgeschickten Sichtung verknüpft wurden.
		</p>

		<div class="mt-4 flex flex-wrap gap-2">
			<button
				class="btn btn-primary min-h-11"
				disabled={cleanupBusy}
				onclick={() => runCleanup(false)}
			>
				Vorschau laden
			</button>
			{#if cleanupReport && cleanupReport.rowsFound + (cleanupReport.filesFound ?? 0) > 0}
				<button
					class="btn btn-outline btn-error btn-sm min-h-11"
					disabled={cleanupBusy}
					onclick={confirmCleanup}
				>
					Endgültig löschen
				</button>
			{/if}
		</div>

		{#if cleanupError}
			<div class="alert alert-error mt-4" role="alert">
				<span class="text-sm">Aufräumen fehlgeschlagen: {cleanupError}</span>
			</div>
		{:else if cleanupReport}
			<div class="alert alert-info mt-4">
				<span class="text-sm">
					{cleanupReport.rowsFound} Zeilen ohne Sichtung,
					{cleanupReport.filesFound ?? 'nicht anwendbar'} Dateien ohne Zeile (Frist: {cleanupReport.retentionHours}
					Stunden).
					{#if cleanupReport.rowsDeleted + cleanupReport.filesDeleted > 0}
						Entfernt: {cleanupReport.rowsDeleted} Zeilen, {cleanupReport.filesDeleted} Dateien.
					{/if}
					{#if cleanupReport.remaining > 0}
						Noch {cleanupReport.remaining} übrig — erneut ausführen.
					{/if}
				</span>
			</div>
		{/if}
	</div>
</section>
```

- [ ] **Schritt 2: Komponententest schreiben**

`src/routes/admin/settings/cleanupPanel.svelte.test.ts` — Browser-Umgebung,
Suffix `.svelte.test.ts` ist Pflicht (`.claude/rules/testing.md`):

```typescript
/**
 * Der Lösch-Button darf erst erscheinen, wenn eine Vorschau vorliegt — sonst
 * löscht ein Admin blind.
 */
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import CleanupPanel from './CleanupPanel.svelte';

function respondWith(report: Record<string, unknown>) {
	globalThis.fetch = vi.fn().mockResolvedValue({
		ok: true,
		json: async () => report
	}) as unknown as typeof fetch;
}

describe('CleanupPanel', () => {
	it('zeigt vor der Vorschau keinen Lösch-Button', async () => {
		render(CleanupPanel);
		await expect.element(page.getByRole('button', { name: 'Vorschau laden' })).toBeVisible();
		expect(page.getByRole('button', { name: 'Endgültig löschen' }).elements()).toHaveLength(0);
	});

	it('zeigt den Lösch-Button erst, wenn die Vorschau Fundstücke meldet', async () => {
		respondWith({ retentionHours: 24, rowsFound: 4, filesFound: 0, rowsDeleted: 0, filesDeleted: 0, failed: 0, remaining: 0 });
		render(CleanupPanel);
		await page.getByRole('button', { name: 'Vorschau laden' }).click();
		await expect.element(page.getByRole('button', { name: 'Endgültig löschen' })).toBeVisible();
	});

	it('bietet kein Löschen an, wenn nichts gefunden wurde', async () => {
		respondWith({ retentionHours: 24, rowsFound: 0, filesFound: 0, rowsDeleted: 0, filesDeleted: 0, failed: 0, remaining: 0 });
		render(CleanupPanel);
		await page.getByRole('button', { name: 'Vorschau laden' }).click();
		await expect.element(page.getByText('0 Zeilen ohne Sichtung')).toBeVisible();
		expect(page.getByRole('button', { name: 'Endgültig löschen' }).elements()).toHaveLength(0);
	});
});
```

Dafür wird der Abschnitt als eigene Komponente
`src/routes/admin/settings/CleanupPanel.svelte` angelegt (Markup aus Schritt 1)
und in `+page.svelte` eingebunden — testbar und hält die 18 KB große Seite klein.

- [ ] **Schritt 3: Alles laufen lassen**

Ausführen: `npm run test:quick && npm run test:unit:client && npm run build`
Erwartet: Tests grün, Build ohne Fehler.

- [ ] **Schritt 4: Im Browser prüfen**

Dev-Server starten, als Admin anmelden, `admin/settings` öffnen, „Vorschau
laden“ klicken. Erwartet: Meldung mit den Zahlen aus dem Dry-Run des CLI
(aktuell 4 Zeilen, 0 Dateien). Der Lösch-Button erscheint erst danach.

- [ ] **Schritt 5: Commit**

```bash
git add -A
git commit -m "feat(admin): add orphan cleanup panel with preview before delete"
```

---

## Abschluss

- [ ] `npm run test:quick` und `npm run build` laufen durch
- [ ] `npm run media:cleanup-orphans:dry-run` liefert weiterhin denselben Befund
- [ ] `static/openapi.yml` validiert
- [ ] Cron-Aufruf beim Betreiber eingerichtet:

```bash
curl -fsS -X POST -H "Authorization: Bearer $CLEANUP_TOKEN" \
  "https://<host>/api/admin/cleanup-orphans?mode=execute"
```
