/**
 * @fileoverview Räumt verwaiste Medien-Uploads auf.
 *
 * Zwei Waisen-Klassen:
 *   A) Zeilen in `sichtungen_dateien` mit `sichtung_id IS NULL`, deren Upload
 *      länger zurückliegt als die Frist — abgebrochene Formularläufe. Der
 *      Upload legt die Zeile an, bevor die Sichtung existiert; verknüpft wird
 *      erst beim Absenden. Wird nie abgeschickt, bleibt sie auf NULL stehen.
 *   B) Dateien unter `uploads/`, zu denen es keine Zeile gibt.
 *
 * Verwendung:
 *   node src/tools/cleanup-orphaned-uploads.ts [--older-than=24h] [--execute] [--verbose]
 *
 * Parameter:
 *   --older-than=<n>h|<n>d  Aufbewahrungsfrist (Default 24h)
 *   --execute               Löscht wirklich. Ohne dieses Flag: reiner Dry-Run.
 *   --verbose               Listet jeden Fund einzeln
 *   --uploads-dir=<pfad>    Überschreibt das Upload-Verzeichnis
 *
 * Vor dem ersten Lauf mit --execute: Backup von Datenbank UND Upload-Verzeichnis.
 * Gelöschte Dateien fängt kein Papierkorb auf. `DATABASE_POSTGRES_URL` steht
 * üblicherweise nur in der `.env` — für pg_dump vorher `set -a && . ./.env`.
 *
 * Ausführung: `node src/tools/cleanup-orphaned-uploads.ts` (Node ≥ 22.18 —
 * natives Type Stripping, wie scripts/docker-migrate.ts).
 *
 * @author Ostsee-Tiere Team
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from 'dotenv';
import postgres from 'postgres';

/** Erlaubte Fristangaben: positive Ganzzahl plus Einheit `h` oder `d`. */
const RETENTION_PATTERN = /^(\d+)([hd])$/i;

const MILLIS_PER_HOUR = 60 * 60 * 1000;
const MILLIS_PER_DAY = 24 * MILLIS_PER_HOUR;

/**
 * Vorgabe: einen Tag. Formularentwürfe liegen in sessionStorage und überstehen
 * das Schließen des Tabs nicht — was 24 Stunden unverknüpft liegt, kann nicht
 * mehr abgesendet werden.
 */
export const DEFAULT_RETENTION = '24h';

/** Verzeichnis mit Altbestand aus der Migration des Vorgängersystems. */
const EXCLUDED_DIRS = new Set(['_old_uploads']);

/**
 * Wandelt eine Fristangabe wie `24h` oder `7d` in Millisekunden um.
 * Wirft bei allem anderen — ein stiller Default wäre hier gefährlich,
 * weil die Frist bestimmt, was gelöscht wird.
 */
export function parseRetention(input: string): number {
	const match = RETENTION_PATTERN.exec(input.trim());
	if (!match) {
		throw new Error(`Ungültige Frist: ${JSON.stringify(input)}. Erwartet z. B. "24h" oder "7d".`);
	}

	const [, rawAmount = '', rawUnit = ''] = match;

	const amount = Number(rawAmount);
	if (amount <= 0) {
		throw new Error(`Ungültige Frist: ${JSON.stringify(input)}. Muss größer als 0 sein.`);
	}

	return rawUnit.toLowerCase() === 'h' ? amount * MILLIS_PER_HOUR : amount * MILLIS_PER_DAY;
}

/**
 * Bildet den Grenzzeitpunkt. Alles, was strikt davor liegt, gilt als verwaist.
 * Bewusst eine einzige Stelle: Klasse A und Klasse B müssen dieselbe Grenze
 * verwenden, sonst räumt ein Lauf die Datei ab und lässt die Zeile stehen.
 */
export function computeCutoff(now: Date, retentionMs: number): Date {
	return new Date(now.getTime() - retentionMs);
}

/** Eine Zeile aus `sichtungen_dateien` ohne verknüpfte Sichtung. */
export interface OrphanRow {
	id: number;
	/** Pfad relativ zum Upload-Verzeichnis, wie in `datei_pfad` gespeichert. */
	filePath: string;
	uploadedAt: Date;
}

/**
 * Wählt die Zeilen, deren Upload strikt vor dem Grenzzeitpunkt liegt.
 * Strikt, damit ein Datensatz exakt auf der Grenze geschont wird.
 */
export function selectOrphanedRows(rows: OrphanRow[], cutoff: Date): OrphanRow[] {
	return rows.filter((row) => row.uploadedAt.getTime() < cutoff.getTime());
}

/** Eine Datei, die beim Durchlaufen des Upload-Verzeichnisses gefunden wurde. */
export interface DiskEntry {
	/** Pfad relativ zum Upload-Verzeichnis, mit `/` als Trennzeichen. */
	relativePath: string;
	modifiedAt: Date;
}

/**
 * Bringt einen Pfad in die Form, in der `datei_pfad` gespeichert wird:
 * Schrägstriche als Trennzeichen, kein führendes `/` oder `./`, Unicode als NFC.
 *
 * Die NFC-Angleichung ist der kritische Teil: macOS liefert Dateinamen zerlegt
 * (NFD), PostgreSQL zusammengesetzt (NFC). Ohne sie gilt jede Datei mit Umlaut
 * als verwaist, obwohl ihre Zeile existiert — am echten Bestand waren das 10
 * Dateien echter Sichtungen, die das Tool gelöscht hätte.
 */
export function normalizeRelativePath(input: string): string {
	return input.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '').normalize('NFC');
}

/** Alles, was als „gehört zu einer Sichtung" gilt und deshalb tabu ist. */
export interface KnownState {
	/** Alle `datei_pfad`-Werte der Tabelle, auch die verknüpften. */
	paths: Iterable<string>;
	/** Alle `referenz_id`-Werte aus `sichtungen`. */
	referenceIds: Iterable<string>;
}

/**
 * Wählt Dateien, zu denen es keine Zeile gibt und die strikt älter als der
 * Grenzzeitpunkt sind.
 *
 * Der Altersfilter ist hier kein Komfort, sondern Schutz: Der Upload schreibt
 * erst die Datei und danach die DB-Zeile. Ohne Filter würde genau diese Lücke
 * als Waise gedeutet und ein laufender Upload zerstört.
 */
export function selectOrphanedFiles(
	entries: DiskEntry[],
	known: KnownState,
	cutoff: Date
): DiskEntry[] {
	const knownPaths = new Set<string>();
	for (const path of known.paths) {
		knownPaths.add(normalizeRelativePath(path));
	}

	const knownReferenceIds = new Set<string>();
	for (const referenceId of known.referenceIds) {
		knownReferenceIds.add(referenceId.normalize('NFC'));
	}

	return entries.filter((entry) => {
		const normalized = normalizeRelativePath(entry.relativePath);

		if (entry.modifiedAt.getTime() >= cutoff.getTime()) return false;
		if (knownPaths.has(normalized)) return false;

		// Zweite, unabhängige Absicherung: Der erste Pfadabschnitt ist die
		// `referenz_id`. Gehört sie zu einer echten Sichtung, ist die Datei
		// tabu — auch ohne Zeile. Genau dann ist sie die einzige Kopie.
		const referenceId = normalized.split('/')[0];
		if (referenceId && knownReferenceIds.has(referenceId)) return false;

		return true;
	});
}

/**
 * Löst einen relativen Pfad gegen das Upload-Verzeichnis auf und gibt `null`
 * zurück, wenn das Ergebnis die Basis verlässt.
 *
 * `datei_pfad` kommt aus der Datenbank, nicht aus dem Code — dieselbe
 * Absicherung wie in `LocalStorageProvider.validatePath()`.
 */
export function resolveSafeTarget(baseDir: string, relativePath: string): string | null {
	// Ein absoluter Pfad in `datei_pfad` ist eine Datenanomalie. Ihn durch
	// Abschneiden des führenden Schrägstrichs als relativ umzudeuten wäre
	// stillschweigendes Raten — dann zeigte `/etc/passwd` auf
	// `uploads/etc/passwd`. Lieber ablehnen und melden.
	if (isAbsolute(relativePath) || relativePath.startsWith('/') || relativePath.startsWith('\\')) {
		return null;
	}

	const normalized = normalizeRelativePath(relativePath);
	if (normalized === '') {
		return null;
	}

	const resolvedBase = resolve(baseDir);
	const target = resolve(resolvedBase, normalized);
	const rel = relative(resolvedBase, target);

	if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
		return null;
	}

	return target;
}

export interface CliOptions {
	retentionMs: number;
	execute: boolean;
	verbose: boolean;
	uploadsDir: string;
}

/**
 * Liest die Kommandozeile. Unbekannte Argumente sind ein Fehler — ein
 * vertipptes `--execute` darf nicht stillschweigend zum Dry-Run werden,
 * und ein vertipptes `--dry-run` nicht stillschweigend zum Löschen.
 */
export function parseCliOptions(argv: string[], env: NodeJS.ProcessEnv): CliOptions {
	void env;

	let retention = DEFAULT_RETENTION;
	let execute = false;
	let verbose = false;
	let uploadsDir: string | null = null;

	for (const arg of argv) {
		if (arg === '--execute') {
			execute = true;
		} else if (arg === '--verbose') {
			verbose = true;
		} else if (arg === '--dry-run') {
			// Ausdrücklich erlaubt, obwohl es der Vorgabe entspricht: Aufrufe aus
			// den npm-Skripten sollen die Absicht sichtbar machen.
			execute = false;
		} else if (arg.startsWith('--older-than=')) {
			retention = arg.slice('--older-than='.length);
		} else if (arg.startsWith('--uploads-dir=')) {
			uploadsDir = arg.slice('--uploads-dir='.length);
		} else {
			throw new Error(`Unbekanntes Argument: ${arg}`);
		}
	}

	return {
		retentionMs: parseRetention(retention),
		execute,
		verbose,
		// Wie die Anwendung: `resolve('uploads')` gegen das Arbeitsverzeichnis.
		// UPLOAD_PATH wird bewusst NICHT gelesen — die Anwendung liest es auch
		// nicht (src/lib/server/storage/factory.ts übergibt das Literal
		// 'uploads'). Würde das Tool der Variablen folgen, räumte es einen
		// Ordner ab, in den nie jemand geschrieben hat.
		uploadsDir: uploadsDir ?? resolve('uploads')
	};
}

/**
 * Liefert die Verbindungszeichenfolge oder wirft. Kein Fallback auf eine
 * Standardverbindung: Dieses Tool löscht, es darf die Zieldatenbank nie raten.
 * In einem Git-Worktree fehlt die `.env` regelmäßig — genau dort wäre ein
 * geratener Fallback auf die falsche Datenbank gegangen.
 */
export function resolveConnectionString(env: NodeJS.ProcessEnv): string {
	const connectionString = env.DATABASE_POSTGRES_URL || env.DATABASE_URL;
	if (!connectionString) {
		throw new Error(
			'Keine Datenbankverbindung gefunden. DATABASE_POSTGRES_URL (bevorzugt) oder ' +
				'DATABASE_URL muss gesetzt sein — in der Umgebung oder in einer .env im ' +
				'Arbeitsverzeichnis.'
		);
	}
	return connectionString;
}

/**
 * Bricht ab, wenn ein anderer Storage-Provider als `local` konfiguriert ist.
 * Der Dateisystem-Scan gilt nur für lokalen Storage; bei `vercel-blob` fände
 * er nichts und meldete „0 Waisen" — eine Falschaussage.
 */
export function assertLocalStorage(env: NodeJS.ProcessEnv): void {
	const provider = env.STORAGE_PROVIDER;
	if (provider && provider !== 'local') {
		throw new Error(
			`STORAGE_PROVIDER ist "${provider}". Dieses Tool arbeitet nur für local storage.`
		);
	}
}

/**
 * Läuft das Upload-Verzeichnis rekursiv ab und liefert alle Dateien mit
 * ihrem relativen Pfad und ihrer Änderungszeit.
 */
async function scanUploadDir(baseDir: string, prefix = ''): Promise<DiskEntry[]> {
	let dirEntries;
	try {
		dirEntries = await readdir(join(baseDir, prefix), { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return [];
		}
		throw error;
	}

	const results: DiskEntry[] = [];
	for (const entry of dirEntries) {
		// Punktdateien sind nie Uploads (`.DS_Store`, `.gitkeep`). Sie liegen
		// real im Verzeichnis und wären sonst als Waise gelöscht worden.
		if (entry.name.startsWith('.')) {
			continue;
		}

		const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

		if (entry.isDirectory()) {
			if (EXCLUDED_DIRS.has(entry.name) && prefix === '') {
				continue;
			}
			results.push(...(await scanUploadDir(baseDir, relativePath)));
		} else if (entry.isFile()) {
			const stats = await stat(join(baseDir, relativePath));
			results.push({ relativePath, modifiedAt: stats.mtime });
		}
	}
	return results;
}

/** Verdeckt das Passwort in einer Verbindungszeichenfolge für die Ausgabe. */
function maskConnection(connectionString: string): string {
	return connectionString.replace(/:[^:@]*@/, ':****@');
}

/**
 * Löscht eine Datei und meldet, ob sie tatsächlich entfernt wurde.
 * Eine bereits fehlende Datei ist kein Fehler — das Ziel ist erreicht.
 */
async function removeFile(target: string): Promise<boolean> {
	try {
		await unlink(target);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false;
		}
		console.error(`❌ Konnte ${target} nicht löschen: ${(error as Error).message}`);
		return false;
	}
}

async function main(): Promise<void> {
	config();

	const options = parseCliOptions(process.argv.slice(2), process.env);
	assertLocalStorage(process.env);
	const connectionString = resolveConnectionString(process.env);

	const cutoff = computeCutoff(new Date(), options.retentionMs);

	console.log(`🔗 Datenbank:  ${maskConnection(connectionString)}`);
	console.log(`📁 Uploads:    ${options.uploadsDir}`);
	console.log(`🕓 Grenze:     ${cutoff.toISOString()} (älteres gilt als verwaist)`);
	console.log(
		options.execute ? '✍️  Modus:      LÖSCHEND\n' : '🧪 Modus:      DRY RUN — keine Änderungen\n'
	);

	if (process.env.UPLOAD_PATH && resolve(process.env.UPLOAD_PATH) !== options.uploadsDir) {
		console.warn(
			`⚠️  UPLOAD_PATH ist auf ${process.env.UPLOAD_PATH} gesetzt, das Tool arbeitet aber\n` +
				`   auf ${options.uploadsDir} — wie die Anwendung, die UPLOAD_PATH nicht liest.\n` +
				`   Bei abweichendem Setup --uploads-dir=<pfad> übergeben.\n`
		);
	}

	const sql = postgres(connectionString);

	try {
		// Ein einziger Lesestand für beide Klassen. Würde Klasse B nach dem
		// Löschen von Klasse A ermittelt, tauchten deren Dateien erneut auf.
		//
		// `hochgeladen_am` ist `timestamp without time zone` und enthält UTC.
		// Als Text mit explizitem Z gelesen, damit der Treiber die Spalte nicht
		// als Ortszeit deutet — genau der Fehler, den die UTC-Vereinheitlichung
		// beseitigt hat.
		const rawRows = await sql<{ id: number; datei_pfad: string; uploaded_at_utc: string }[]>`
			SELECT
				id,
				datei_pfad,
				to_char(hochgeladen_am, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS uploaded_at_utc
			FROM sichtungen_dateien
			WHERE sichtung_id IS NULL
			ORDER BY id
		`;

		const candidateRows: OrphanRow[] = rawRows.map((row) => ({
			id: row.id,
			filePath: row.datei_pfad,
			uploadedAt: new Date(row.uploaded_at_utc)
		}));

		const allPaths = await sql<{ datei_pfad: string }[]>`
			SELECT datei_pfad FROM sichtungen_dateien
		`;
		const knownPaths = allPaths.map((row) => row.datei_pfad);

		// Zweite Absicherung für Klasse B: Ordnernamen sind `referenz_id`-Werte.
		// Eine Datei in einem Ordner, der zu einer echten Sichtung gehört, ist
		// tabu — auch wenn keine Zeile auf sie zeigt. Dann ist sie die einzige
		// verbliebene Kopie der Medien dieser Sichtung.
		const refRows = await sql<{ referenz_id: string }[]>`
			SELECT referenz_id FROM sichtungen WHERE referenz_id IS NOT NULL
		`;
		const knownReferenceIds = refRows.map((row) => row.referenz_id);

		const diskEntries = await scanUploadDir(options.uploadsDir);

		const orphanedRows = selectOrphanedRows(candidateRows, cutoff);
		const orphanedFiles = selectOrphanedFiles(
			diskEntries,
			{ paths: knownPaths, referenceIds: knownReferenceIds },
			cutoff
		);

		console.log('📊 Befund:');
		console.log(`   Zeilen ohne Sichtung insgesamt: ${candidateRows.length}`);
		console.log(`   davon älter als die Grenze:     ${orphanedRows.length}`);
		console.log(`   Dateien im Verzeichnis:         ${diskEntries.length}`);
		console.log(`   davon ohne Zeile und zu alt:    ${orphanedFiles.length}\n`);

		if (options.verbose) {
			for (const row of orphanedRows) {
				console.log(`   [Zeile] id=${row.id} ${row.filePath} (${row.uploadedAt.toISOString()})`);
			}
			for (const entry of orphanedFiles) {
				console.log(`   [Datei] ${entry.relativePath} (${entry.modifiedAt.toISOString()})`);
			}
			if (orphanedRows.length > 0 || orphanedFiles.length > 0) {
				console.log('');
			}
		}

		if (orphanedRows.length === 0 && orphanedFiles.length === 0) {
			console.log('🎉 Nichts aufzuräumen.');
			return;
		}

		if (!options.execute) {
			console.log('🔍 DRY RUN — es wurde nichts gelöscht.');
			console.log('   Mit --execute erneut aufrufen. Vorher Backup ziehen.');
			return;
		}

		let deletedRows = 0;
		let deletedFiles = 0;

		// Klasse A: erst die Zeile, dann die Datei. Scheitert das Löschen der
		// Datei, bleibt eine Klasse-B-Waise zurück, die der nächste Lauf
		// einsammelt. Umgekehrt entstünde eine Zeile ohne Datei — die findet
		// danach keine der beiden Klassen mehr.
		for (const row of orphanedRows) {
			await sql`DELETE FROM sichtungen_dateien WHERE id = ${row.id}`;
			deletedRows++;

			const target = resolveSafeTarget(options.uploadsDir, row.filePath);
			if (!target) {
				console.warn(`⚠️  Pfad außerhalb des Upload-Verzeichnisses, übersprungen: ${row.filePath}`);
				continue;
			}
			if (await removeFile(target)) {
				deletedFiles++;
			}
		}

		for (const entry of orphanedFiles) {
			const target = resolveSafeTarget(options.uploadsDir, entry.relativePath);
			if (!target) {
				console.warn(
					`⚠️  Pfad außerhalb des Upload-Verzeichnisses, übersprungen: ${entry.relativePath}`
				);
				continue;
			}
			if (await removeFile(target)) {
				deletedFiles++;
			}
		}

		console.log(`\n✅ ${deletedRows} Zeilen und ${deletedFiles} Dateien gelöscht.`);
	} finally {
		await sql.end();
	}
}

// `pathToFileURL` statt Zeichenkettenbau: `import.meta.url` ist eine korrekt
// kodierte file:-URL. Bei einem Pfad mit Leerzeichen (`%20`) schlüge der
// naive Vergleich fehl — das Tool beendete sich dann mit Code 0 und ganz ohne
// Ausgabe. Gleiches Muster wie in scripts/docker-migrate.ts.
const isDirectRun =
	typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
	main().catch((error: unknown) => {
		console.error(`\n💥 Abbruch: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	});
}
