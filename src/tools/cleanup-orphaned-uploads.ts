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
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
	DEFAULT_RETENTION,
	cleanupOrphans,
	computeCutoff,
	parseRetention,
	resolveSafeTarget,
	scanUploadDir,
	selectOrphanedFiles,
	selectOrphanedRows,
	type OrphanRow
} from '../lib/server/media/orphanCleanup.ts';

// Für den Fristen-Vertragstest und externe Aufrufer weiterhin von hier lesbar
export { DEFAULT_RETENTION, parseRetention };
import { config } from 'dotenv';
import postgres from 'postgres';

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

/** Verdeckt das Passwort in einer Verbindungszeichenfolge für die Ausgabe. */
function maskConnection(connectionString: string): string {
	return connectionString.replace(/:[^:@]*@/, ':****@');
}

/**
 * Löscht eine Datei und meldet, ob sie tatsächlich entfernt wurde.
 *
 * Eine bereits fehlende Datei ist **kein** Fehler — das Ziel ist erreicht, also
 * `false` ohne Ausnahme. Echte Fehler werden dagegen geworfen, damit der
 * Aufräum-Lauf sie als Fehlschlag zählen kann statt sie zu verschlucken.
 */
export async function removeFile(target: string): Promise<boolean> {
	try {
		await unlink(target);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false;
		}
		throw error;
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

		// Ein Lesestand, ein Grenzzeitpunkt — die Ports reichen die bereits
		// geladenen Momentaufnahmen durch, statt erneut abzufragen.
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

		/** Löscht eine Datei über den geprüften Pfad; außerhalb der Basis: überspringen. */
		async function deleteViaSafePath(relativePath: string): Promise<void> {
			const target = resolveSafeTarget(options.uploadsDir, relativePath);
			if (!target) {
				console.warn(`⚠️  Pfad außerhalb des Upload-Verzeichnisses, übersprungen: ${relativePath}`);
				return;
			}
			// Wirft nur bei echten Fehlern. Eine bereits fehlende Datei gilt als
			// Erfolg — „gelöscht" heißt hier „nicht mehr vorhanden", genau wie
			// beim Endpunkt, dessen Storage-Provider ebenfalls nicht wirft.
			await removeFile(target);
		}

		const report = await cleanupOrphans({
			now: new Date(),
			retentionMs: options.retentionMs,
			execute: true,
			// Der Deckel schützt HTTP-Aufrufe vor Timeouts, nicht einen manuellen Lauf.
			limit: Number.POSITIVE_INFINITY,
			ports: {
				findOrphanRows: async () => orphanedRows,
				findOrphanFiles: async () => orphanedFiles,
				deleteRow: async (id) => {
					await sql`DELETE FROM sichtungen_dateien WHERE id = ${id}`;
				},
				deleteFile: deleteViaSafePath
			},
			onError: (subject, error) =>
				console.warn(
					`⚠️  ${subject}: ${error instanceof Error ? error.message : String(error)}`
				)
		});

		console.log(
			`\n✅ ${report.rowsDeleted} Zeilen und ${report.filesDeleted} Dateien gelöscht.`
		);
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
