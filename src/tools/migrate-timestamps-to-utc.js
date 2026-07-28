#!/usr/bin/env node

/**
 * @fileoverview Einmal-Migration: naive Ortszeit-Zeitstempel → echtes UTC
 *
 * Die Zeitstempelspalten sind `timestamp without time zone` und enthielten
 * bisher deutsche Ortszeit als Wanduhrzeit — ein Erbe des PHP-Vorgängersystems,
 * das auf einem Server in Europe/Berlin lief. Die SvelteKit-Anwendung schreibt
 * dagegen echte UTC-Zeitpunkte (Drizzle serialisiert mit `toISOString()`).
 *
 * Ohne diese Migration enthielte die Spalte zwei unvereinbare Auslegungen:
 * Frontend und Legacy-API würden sich um genau den MEZ/MESZ-Offset
 * widersprechen. Details: docs/ENVIRONMENT.md → TZ.
 *
 * Die Legacy-API-Ausgabe bleibt für Altdatensätze UNVERÄNDERT: die Migration
 * zieht den Offset ab, die Formatter (`Europe/Berlin`) addieren ihn wieder.
 * Abgesichert durch src/lib/legacy-api/date-utils.timezone.test.ts.
 *
 * Migriert werden `sichtungen` (sichtungsdatum, created, freigegeben_am) und
 * `sichtungen_dateien` (hochgeladen_am, erstellt_am).
 *
 * Verwendung:
 *   node src/tools/migrate-timestamps-to-utc.js --cutover=<ISO> [--exclude-ids=…] [--dry-run] [--verbose] [--force]
 *
 * Parameter:
 *   --cutover=<ISO>    PFLICHT. Zeitpunkt, ab dem Datensätze bereits UTC sind
 *                      (Go-Live der SvelteKit-App). Alles mit created < cutover
 *                      wird migriert, alles danach bleibt unangetastet.
 *   --exclude-ids=…    Kommagetrennte Sichtungs-IDs, die bereits UTC enthalten
 *                      und deshalb übersprungen werden.
 *   --dry-run          Simulation ohne Schreibzugriff
 *   --verbose          Zeigt Beispieldatensätze vor/nach der Umrechnung
 *   --force            Überschreibt den Wiederholungsschutz (NUR nach Restore!)
 *
 * Vor dem Lauf: Backup ziehen. Die Umrechnung ist nicht ohne Weiteres umkehrbar,
 * weil `--force` und ein zweiter Lauf die Werte erneut verschieben würden.
 *
 * @author Ostsee-Tiere Team
 */

import { config } from 'dotenv';
import postgres from 'postgres';

config();

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');
const isForced = args.includes('--force');
const cutoverArg = args.find((arg) => arg.startsWith('--cutover='))?.split('=')[1];

/** Sichtungs-IDs, die vom Umfang ausgenommen bleiben (bereits UTC). */
const excludedIds = (args.find((arg) => arg.startsWith('--exclude-ids='))?.split('=')[1] ?? '')
	.split(',')
	.filter(Boolean)
	.map(Number);

if (excludedIds.some(Number.isNaN)) {
	console.error('❌ --exclude-ids erwartet eine kommagetrennte Liste numerischer IDs.');
	process.exit(1);
}

/** Zeitzone, in der die Altdaten als Wanduhrzeit vorliegen. */
const SOURCE_TIME_ZONE = 'Europe/Berlin';

/** Schlüssel in `app_config`, der eine bereits erfolgte Migration markiert. */
const MARKER_KEY = 'timestamps_migrated_to_utc';

if (!cutoverArg) {
	console.error('❌ --cutover=<ISO> ist erforderlich.');
	console.error('   Beispiel: --cutover=2026-08-01T00:00:00Z');
	console.error('   Der Zeitpunkt muss dem Go-Live der SvelteKit-App entsprechen:');
	console.error('   davor angelegte Datensätze sind Ortszeit, danach angelegte bereits UTC.');
	process.exit(1);
}

const cutover = new Date(cutoverArg);
if (isNaN(cutover.getTime())) {
	console.error(`❌ Ungültiger --cutover-Wert: ${cutoverArg}`);
	process.exit(1);
}

// Kein stiller Fallback auf eine Standard-Verbindung: andere Tools in diesem
// Verzeichnis dürfen das, weil sie idempotent sind. Diese Migration verschiebt
// Zeitstempel unumkehrbar — sie darf niemals auf einer Datenbank landen, die
// der Aufrufer nicht ausdrücklich benannt hat. In einem Git-Worktree ohne
// verlinkte .env wäre genau das passiert.
const connectionString = process.env.DATABASE_POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
	console.error('❌ Keine Datenbankverbindung gefunden.');
	console.error('   DATABASE_POSTGRES_URL muss gesetzt sein — entweder in der Umgebung');
	console.error('   oder in einer .env im Arbeitsverzeichnis.');
	console.error('   In einem Git-Worktree fehlt die .env oft:');
	console.error('     bash scripts/new-worktree.sh --link-env "$(pwd)"');
	console.error('   Diese Migration rät nicht — sie verschiebt Zeitstempel unumkehrbar.');
	process.exit(1);
}

const sql = postgres(connectionString);

console.log(`🔗 Datenbank: ${connectionString.replace(/:[^:@]*@/, ':****@')}`);
console.log(`🕓 Cutover:   ${cutover.toISOString()} (created davor wird migriert)`);
console.log(
	isDryRun ? '🧪 Modus:     DRY RUN — keine Änderungen\n' : '✍️  Modus:     SCHREIBEND\n'
);

/** Bricht ab, wenn die Migration bereits gelaufen ist. */
async function assertNotAlreadyMigrated() {
	const [marker] = await sql`SELECT value FROM app_config WHERE key = ${MARKER_KEY}`;
	if (!marker) return;

	if (!isForced) {
		console.error('❌ Migration wurde bereits ausgeführt:');
		console.error(`   ${JSON.stringify(marker.value)}`);
		console.error('   Ein zweiter Lauf würde die Zeitstempel ein weiteres Mal verschieben.');
		console.error('   Nur nach einem Restore aus dem Backup mit --force wiederholen.');
		process.exit(1);
	}
	console.warn('⚠️  Marker vorhanden, --force gesetzt — fahre trotzdem fort.\n');
}

/**
 * Prüft auf Zeitstempel, die in der Quellzeitzone nicht eindeutig sind.
 * In der Wiederholstunde der Rückstellung existiert dieselbe Wanduhrzeit zweimal;
 * Postgres wählt beim Umrechnen eine Auslegung. Solche Werte müssen bekannt sein.
 */
async function reportAmbiguousTimestamps() {
	// Nicht existente Ortszeiten (Frühjahrs-Lücke): der Hin- und Rückweg durch die
	// Zeitzone liefert einen anderen Wert. Diese Datensätze verschieben sich.
	const [{ nichtExistent }] = await sql`
		SELECT count(*)::int AS "nichtExistent" FROM sichtungen
		WHERE sichtungsdatum IS NOT NULL
		  AND ((sichtungsdatum AT TIME ZONE ${SOURCE_TIME_ZONE}) AT TIME ZONE ${SOURCE_TIME_ZONE})
		      <> sichtungsdatum`;

	// Mehrdeutige Ortszeiten (Wiederholstunde am Ende der Sommerzeit): dieselbe
	// Wanduhrzeit existiert zweimal. Postgres wählt beim Umrechnen die spätere
	// Auslegung (MEZ) — liegt eine Stunde davor dieselbe Wanduhrzeit, ist der
	// Wert mehrdeutig. Nur die Stunde grob über Monat und Uhrzeit einzugrenzen
	// würde alle Oktober-Sichtungen um 02:xx melden und die Warnung entwerten.
	const [{ mehrdeutig }] = await sql`
		SELECT count(*)::int AS mehrdeutig FROM sichtungen
		WHERE sichtungsdatum IS NOT NULL
		  AND ((sichtungsdatum AT TIME ZONE ${SOURCE_TIME_ZONE}) - interval '1 hour')
		      AT TIME ZONE ${SOURCE_TIME_ZONE} = sichtungsdatum`;

	if (nichtExistent > 0) {
		console.warn(`⚠️  ${nichtExistent} Zeitstempel liegen in der Frühjahrs-Zeitlücke.`);
		console.warn('   Diese Werte verschieben sich bei der Umrechnung.');
	}
	if (mehrdeutig > 0) {
		console.warn(`⚠️  ${mehrdeutig} Zeitstempel liegen in der Oktober-Wiederholstunde.`);
		console.warn('   Postgres wählt beim Umrechnen eine der beiden Auslegungen.');
	}
	if (nichtExistent === 0 && mehrdeutig === 0) {
		console.log('✅ Keine mehrdeutigen oder nicht existenten Ortszeiten gefunden.');
	}
	console.log();
}

/** Zeigt Beispiele der geplanten Umrechnung. */
async function showSamples() {
	const samples = await sql`
		SELECT id, sichtungsdatum AS vorher,
		       (sichtungsdatum AT TIME ZONE ${SOURCE_TIME_ZONE}) AT TIME ZONE 'UTC' AS nachher
		FROM sichtungen
		WHERE created < ${cutover}
		  AND id <> ALL(${excludedIds})
		  AND sichtungsdatum >= '1990-01-01'
		ORDER BY sichtungsdatum DESC LIMIT 5`;

	console.log('📋 Beispiele (neueste 5):');
	for (const row of samples) {
		console.log(`   #${row.id}  ${row.vorher.toISOString()}  →  ${row.nachher.toISOString()}`);
	}
	console.log();
}

/**
 * Bricht ab, wenn Datensätze im Umfang liegen, die bereits von der SvelteKit-App
 * geschrieben wurden — sie enthalten schon UTC und würden ein zweites Mal
 * verschoben. Erkennungsmerkmal ist `weather_data`: die Wetteranreicherung gibt
 * es nur in der neuen Anwendung.
 */
async function assertNoAppWrittenRecordsInScope() {
	const verdaechtig = await sql`
		SELECT id FROM sichtungen
		WHERE weather_data IS NOT NULL
		  AND created < ${cutover}
		  AND id <> ALL(${excludedIds})
		ORDER BY id`;

	if (verdaechtig.length === 0) return;

	const ids = verdaechtig.map((row) => row.id);
	console.error('❌ Im Migrationsumfang liegen Datensätze, die bereits UTC enthalten:');
	console.error(`   IDs: ${ids.join(', ')}`);
	console.error('   Erkennungsmerkmal: weather_data ist gesetzt (nur die neue App schreibt das).');
	console.error('   Sie würden ein zweites Mal um den Offset verschoben.');
	console.error(`   Entweder ausschließen:  --exclude-ids=${ids.join(',')}`);
	console.error('   oder vorher löschen, falls es reine Testdaten sind.');
	process.exit(1);
}

async function main() {
	await assertNotAlreadyMigrated();
	await assertNoAppWrittenRecordsInScope();
	await reportAmbiguousTimestamps();

	const [sichtungenUmfang] = await sql`
		SELECT count(*) FILTER (WHERE created < ${cutover} AND id <> ALL(${excludedIds}))::int AS betroffen,
		       count(*) FILTER (WHERE created >= ${cutover} OR id = ANY(${excludedIds}))::int AS uebersprungen
		FROM sichtungen`;
	const [dateienUmfang] = await sql`
		SELECT count(*) FILTER (WHERE erstellt_am < ${cutover})::int AS betroffen,
		       count(*) FILTER (WHERE erstellt_am >= ${cutover})::int AS uebersprungen
		FROM sichtungen_dateien`;

	for (const [name, umfang] of [
		['sichtungen', sichtungenUmfang],
		['sichtungen_dateien', dateienUmfang]
	]) {
		console.log(
			`📊 ${name}: ${umfang.betroffen} zu migrieren, ${umfang.uebersprungen} unangetastet`
		);
	}
	const gesamt = sichtungenUmfang.betroffen + dateienUmfang.betroffen;
	console.log();

	if (isVerbose) await showSamples();

	if (isDryRun) {
		console.log(`🧪 DRY RUN beendet — ${gesamt} Datensätze wären migriert worden.`);
		return;
	}

	// Explizit ausgeschriebene Statements: die SET-Listen sind kurz und
	// unterscheiden sich je Tabelle — dynamisch zusammengesetztes SQL wäre hier
	// nur schwerer prüfbar. Postgres wertet die WHERE-Klausel gegen die Werte VOR
	// dem Update aus, `created` darf deshalb gleichzeitig Filter und Ziel sein.
	await sql.begin(async (tx) => {
		const sichtungen = await tx`
			UPDATE sichtungen SET
				sichtungsdatum = (sichtungsdatum AT TIME ZONE ${SOURCE_TIME_ZONE}) AT TIME ZONE 'UTC',
				created        = (created        AT TIME ZONE ${SOURCE_TIME_ZONE}) AT TIME ZONE 'UTC',
				freigegeben_am = (freigegeben_am AT TIME ZONE ${SOURCE_TIME_ZONE}) AT TIME ZONE 'UTC'
			WHERE created < ${cutover} AND id <> ALL(${excludedIds})`;
		console.log(`✅ sichtungen: ${sichtungen.count} Datensätze migriert`);

		const dateien = await tx`
			UPDATE sichtungen_dateien SET
				hochgeladen_am = (hochgeladen_am AT TIME ZONE ${SOURCE_TIME_ZONE}) AT TIME ZONE 'UTC',
				erstellt_am    = (erstellt_am    AT TIME ZONE ${SOURCE_TIME_ZONE}) AT TIME ZONE 'UTC'
			WHERE erstellt_am < ${cutover}`;
		console.log(`✅ sichtungen_dateien: ${dateien.count} Datensätze migriert`);

		await tx`
			INSERT INTO app_config (key, value, description, category, updated_at)
			VALUES (
				${MARKER_KEY},
				${sql.json({ migratedAt: new Date().toISOString(), cutover: cutover.toISOString(), sourceTimeZone: SOURCE_TIME_ZONE })},
				'Einmal-Migration naiver Ortszeit-Zeitstempel nach UTC. Nicht erneut ausführen.',
				'migration',
				now()
			)
			ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
	});

	console.log('\n🎉 Migration abgeschlossen und in app_config markiert.');
}

main()
	.catch((error) => {
		console.error('❌ Migration fehlgeschlagen — Transaktion zurückgerollt:', error);
		process.exitCode = 1;
	})
	.finally(() => sql.end());
