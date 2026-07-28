/**
 * Container-Startup-Migrationen für Ostsee-Tiere.
 *
 * Wendet die in `drizzle/` committeten, im PR reviewten SQL-Migrationen auf die
 * Datenbank an (drizzle-orm Migrator, Journal `drizzle.__drizzle_migrations`).
 * Läuft beim Container-Start VOR dem App-Start (siehe scripts/docker-entrypoint.sh)
 * und ist bewusst KEIN `drizzle-kit push`: push erzeugt den Schema-Diff zur
 * Laufzeit und würde destruktive Statements ohne Review ausführen.
 *
 * Sicherheitsgarantien:
 * - Advisory Lock: parallele Container-Starts migrieren nie gleichzeitig.
 * - Baseline: eine bestehende, per `db:push` aufgebaute DB (Journal leer, Tabelle
 *   `sichtungen` existiert) wird nicht erneut migriert, sondern als Stand der im
 *   Image enthaltenen Migrationen markiert. Voraussetzung: DB-Schema entspricht
 *   dem Release des Images (beim Cutover gegeben).
 * - Destruktiv-Guard: ausstehende Migrationen mit DROP TABLE / DROP COLUMN /
 *   TRUNCATE werden nur mit ALLOW_DESTRUCTIVE_MIGRATIONS=true ausgeführt.
 * - Alle ausstehenden Migrationen laufen in einer Transaktion (Drizzle-Migrator);
 *   bei Fehlern wird vollständig zurückgerollt und der Container startet nicht.
 *
 * Ausführung: `node scripts/docker-migrate.ts` (Node ≥ 22.18 — natives Type
 * Stripping; im Runtime-Image läuft Node 24).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export interface JournalEntry {
	idx: number;
	when: number;
	tag: string;
}

export type StartupAction = 'migrate' | 'baseline';

export interface StartupState {
	appliedCount: number;
	journalCount: number;
	coreTableExists: boolean;
}

/**
 * Fester Advisory-Lock-Key für Migrationen (beliebige, projektweite Konstante).
 * Muss in das signed-int4-Spektrum passen.
 */
export const MIGRATION_LOCK_KEY = 1330860883;

/**
 * Parst den Inhalt von `drizzle/meta/_journal.json` und liefert die Einträge
 * aufsteigend nach `when` sortiert.
 */
export function parseJournal(journalRaw: string): JournalEntry[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(journalRaw);
	} catch (error) {
		throw new Error(
			`Migrations-Journal ist kein gültiges JSON: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error }
		);
	}

	if (parsed === null || typeof parsed !== 'object' || !('entries' in parsed)) {
		throw new Error('Migrations-Journal enthält kein Feld "entries"');
	}

	const entries = (parsed as { entries: unknown }).entries;
	if (!Array.isArray(entries)) {
		throw new Error('Migrations-Journal: "entries" ist kein Array');
	}

	const result: JournalEntry[] = entries.map((entry, index) => {
		if (
			entry === null ||
			typeof entry !== 'object' ||
			typeof (entry as { when?: unknown }).when !== 'number' ||
			typeof (entry as { tag?: unknown }).tag !== 'string'
		) {
			throw new Error(`Migrations-Journal: Eintrag ${index} ist ungültig (when/tag fehlen)`);
		}
		const { idx, when, tag } = entry as { idx?: unknown; when: number; tag: string };
		return { idx: typeof idx === 'number' ? idx : index, when, tag };
	});

	return result.sort((a, b) => a.when - b.when);
}

/**
 * Liefert alle Journal-Einträge, die noch nicht angewendet wurden.
 * Semantik identisch zum Drizzle-Migrator: angewendet ist alles mit
 * `when <= lastAppliedCreatedAt`; `null` bedeutet "noch nichts angewendet".
 */
export function findPendingMigrations(
	entries: JournalEntry[],
	lastAppliedCreatedAt: number | null
): JournalEntry[] {
	if (lastAppliedCreatedAt === null) {
		return [...entries];
	}
	return entries.filter((entry) => entry.when > lastAppliedCreatedAt);
}

const DESTRUCTIVE_PATTERNS: RegExp[] = [
	/\bDROP\s+TABLE\b[^;]*/gi,
	/\bDROP\s+COLUMN\b[^;]*/gi,
	/\bTRUNCATE\b[^;]*/gi
];

/**
 * Scannt SQL auf destruktive Statements (DROP TABLE, DROP COLUMN, TRUNCATE).
 * Zeilenkommentare (`-- …`) werden vor dem Scan entfernt, damit Hinweise in
 * Kommentaren keine Fehlalarme auslösen.
 */
export function scanForDestructiveStatements(sql: string): string[] {
	const withoutComments = sql
		.split('\n')
		.map((line) => {
			const commentStart = line.indexOf('--');
			return commentStart === -1 ? line : line.slice(0, commentStart);
		})
		.join('\n');

	const findings: string[] = [];
	for (const pattern of DESTRUCTIVE_PATTERNS) {
		pattern.lastIndex = 0;
		for (const match of withoutComments.matchAll(pattern)) {
			findings.push(match[0].replace(/\s+/g, ' ').trim());
		}
	}
	return findings;
}

/**
 * Entscheidet, wie der Container-Start mit der Datenbank umgeht.
 *
 * - Journal leer + Kern-Tabelle `sichtungen` existiert → 'baseline': Die DB wurde
 *   vor der Umstellung per `db:push` aufgebaut; die im Image enthaltenen
 *   Migrationen werden als bereits angewendet markiert, ohne sie auszuführen.
 * - Sonst → 'migrate': ausstehende Migrationen normal anwenden (auf einer
 *   frischen DB sind das alle).
 */
export function decideStartupAction(state: StartupState): StartupAction {
	if (state.journalCount === 0) {
		throw new Error(
			'Keine Migrationsdateien im Image gefunden (drizzle/meta/_journal.json ist leer). ' +
				'Wurde das drizzle/-Verzeichnis in das Image kopiert?'
		);
	}
	if (state.appliedCount === 0 && state.coreTableExists) {
		return 'baseline';
	}
	return 'migrate';
}

/**
 * SHA-256-Hex des SQL-Dateiinhalts — identisch zur Berechnung des
 * Drizzle-Migrators (drizzle-orm/migrator readMigrationFiles).
 */
export function computeMigrationHash(sqlContent: string): string {
	return createHash('sha256').update(sqlContent).digest('hex');
}

// ============================================================================
// Runtime (nur bei direkter Ausführung, nicht beim Import in Tests)
// ============================================================================

function log(message: string): void {
	console.log(`[migrate] ${message}`);
}

function fail(message: string): never {
	console.error(`[migrate] FEHLER: ${message}`);
	process.exit(1);
}

interface AppliedInfo {
	appliedCount: number;
	lastCreatedAt: number | null;
}

async function readAppliedInfo(sql: postgres.Sql): Promise<AppliedInfo> {
	const [journalTable] = await sql`
		select to_regclass('drizzle.__drizzle_migrations') as reg
	`;
	if (!journalTable || journalTable['reg'] === null) {
		return { appliedCount: 0, lastCreatedAt: null };
	}
	const [row] = await sql`
		select count(*)::int as applied_count, max(created_at)::bigint as last_created_at
		from drizzle.__drizzle_migrations
	`;
	const appliedCount = row ? Number(row['applied_count']) : 0;
	const lastRaw = row ? row['last_created_at'] : null;
	return {
		appliedCount,
		lastCreatedAt: lastRaw === null || lastRaw === undefined ? null : Number(lastRaw)
	};
}

async function main(): Promise<void> {
	const databaseUrl = process.env['DATABASE_POSTGRES_URL'];
	if (!databaseUrl) {
		fail('DATABASE_POSTGRES_URL ist nicht gesetzt');
	}

	const scriptDir = path.dirname(fileURLToPath(import.meta.url));
	const migrationsFolder = path.resolve(scriptDir, '..', 'drizzle');

	let journal: JournalEntry[];
	try {
		journal = parseJournal(
			readFileSync(path.join(migrationsFolder, 'meta', '_journal.json'), 'utf8')
		);
	} catch (error) {
		fail(
			`Migrations-Journal konnte nicht gelesen werden (${migrationsFolder}/meta/_journal.json): ` +
				`${error instanceof Error ? error.message : String(error)}`
		);
	}

	// max: 1 — Advisory Lock und Migration müssen auf derselben Session laufen.
	const sql = postgres(databaseUrl, { max: 1, onnotice: () => undefined });

	try {
		log('Warte auf Migrations-Lock…');
		await sql`select pg_advisory_lock(${MIGRATION_LOCK_KEY})`;
		log('Migrations-Lock erhalten');

		// PostGIS muss vor der ersten Migration existieren (Spalte geometry).
		const postgis = await sql`select 1 as ok from pg_extension where extname = 'postgis'`;
		if (postgis.length === 0) {
			fail(
				'PostGIS-Extension fehlt in der Datenbank. Einmalig als Superuser ausführen: ' +
					'CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_topology;'
			);
		}

		const applied = await readAppliedInfo(sql);
		const [coreTable] = await sql`select to_regclass('public.sichtungen') as reg`;
		const coreTableExists = Boolean(coreTable && coreTable['reg'] !== null);

		const action = decideStartupAction({
			appliedCount: applied.appliedCount,
			journalCount: journal.length,
			coreTableExists
		});

		if (action === 'baseline') {
			log(
				'Bestehende Datenbank ohne Migrations-Journal erkannt (Aufbau per db:push). ' +
					`Markiere ${journal.length} Migration(en) als angewendet, ohne sie auszuführen. ` +
					'Voraussetzung: Das DB-Schema entspricht dem Stand dieses Releases.'
			);
			await sql.begin(async (tx) => {
				await tx`create schema if not exists drizzle`;
				await tx`
					create table if not exists drizzle.__drizzle_migrations (
						id serial primary key,
						hash text not null,
						created_at bigint
					)
				`;
				for (const entry of journal) {
					const content = readFileSync(path.join(migrationsFolder, `${entry.tag}.sql`), 'utf8');
					const hash = computeMigrationHash(content);
					await tx`
						insert into drizzle.__drizzle_migrations (hash, created_at)
						values (${hash}, ${entry.when})
					`;
					log(`  Baseline: ${entry.tag}`);
				}
			});
			log('Baseline abgeschlossen — Datenbank ist auf dem Stand dieses Images.');
			return;
		}

		const pending = findPendingMigrations(journal, applied.lastCreatedAt);
		if (pending.length === 0) {
			log('Keine ausstehenden Migrationen — Schema ist aktuell.');
			return;
		}

		log(`${pending.length} ausstehende Migration(en): ${pending.map((p) => p.tag).join(', ')}`);

		// Destruktiv-Guard: reviewte Migrationen mit DROP/TRUNCATE nur nach
		// explizitem Opt-in ausführen (Schutz gegen versehentlichen Datenverlust).
		const allowDestructive = process.env['ALLOW_DESTRUCTIVE_MIGRATIONS'] === 'true';
		for (const entry of pending) {
			const content = readFileSync(path.join(migrationsFolder, `${entry.tag}.sql`), 'utf8');
			const findings = scanForDestructiveStatements(content);
			if (findings.length > 0 && !allowDestructive) {
				fail(
					`Migration ${entry.tag} enthält destruktive Statements:\n` +
						findings.map((f) => `  - ${f}`).join('\n') +
						'\nVor der Ausführung ein Datenbank-Backup erstellen und den Start mit ' +
						'ALLOW_DESTRUCTIVE_MIGRATIONS=true wiederholen.'
				);
			}
			if (findings.length > 0) {
				log(`ACHTUNG: ${entry.tag} enthält destruktive Statements (per Env-Variable erlaubt).`);
			}
		}

		const db = drizzle(sql);
		await migrate(db, { migrationsFolder });

		const after = await readAppliedInfo(sql);
		log(
			`Migrationen angewendet: ${after.appliedCount - applied.appliedCount} ` +
				`(gesamt ${after.appliedCount}/${journal.length}).`
		);
	} finally {
		try {
			await sql`select pg_advisory_unlock(${MIGRATION_LOCK_KEY})`;
		} catch {
			// Verbindung wird ohnehin geschlossen; Lock fällt mit der Session.
		}
		await sql.end();
	}
}

const isDirectRun =
	typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
	main()
		.then(() => {
			log('Fertig.');
			process.exit(0);
		})
		.catch((error: unknown) => {
			console.error('[migrate] FEHLER:', error instanceof Error ? error.message : error);
			process.exit(1);
		});
}
