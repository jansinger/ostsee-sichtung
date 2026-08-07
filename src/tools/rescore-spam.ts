/**
 * Bewertet bestehende Sichtungen nachträglich mit der Spam-Heuristik und
 * schreibt `spam_score`/`spam_indicators`.
 *
 * Aufruf: npm run spam:rescore [-- --all] [-- --limit <n>]
 *
 *   (ohne Flags)  nur Zeilen ohne Bewertung (spam_score IS NULL)
 *   --all         auch bereits bewertete Zeilen neu bewerten
 *   --limit <n>   höchstens n Zeilen (zum Ausprobieren)
 *
 * Was der Backfill NICHT kann: Die Signale, die nur zum Meldezeitpunkt
 * existieren — Formular-Token und Duplikat-Fenster („letzte 24 h") — fehlen
 * hier. Nachträglich vergebene Scores fallen deshalb systematisch milder aus
 * als die einer echten Einreichung; das ist gewollt und kein Fehler.
 *
 * Der npm-Eintrag setzt `TEST=true` vor den vite-node-Aufruf — dasselbe
 * Ventil wie bei generate-antworten-json.js, damit der Server-Import-Guard
 * des SvelteKit-Vite-Plugins außerhalb von `vite dev`/`vite build` nicht mit
 * "An impossible situation occurred" abbricht.
 *
 * `dotenv/config` lädt die `.env` ins process.env. ESM hoistet zwar alle
 * Imports, aber das trägt: `$lib/server/db` baut seine Verbindung lazy beim
 * ersten Zugriff auf (Proxy, siehe src/lib/server/db/index.ts), und kein
 * importiertes Modul liest die Verbindungszeichenfolge schon beim Laden.
 */
import 'dotenv/config';
import { isNull, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { detectSpamIndicators } from '$lib/server/spam/spamDetector';
import { resolveConnectionString, maskConnection } from './dbConnection';

function parseArgs(argv: string[]): { all: boolean; limit: number | null } {
	const all = argv.includes('--all');
	const limitIndex = argv.indexOf('--limit');
	const limit = limitIndex >= 0 ? Number(argv[limitIndex + 1]) : null;
	if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) {
		throw new Error('--limit erwartet eine positive ganze Zahl');
	}
	return { all, limit };
}

const { all, limit } = parseArgs(process.argv.slice(2));

console.log(`Datenbank: ${maskConnection(resolveConnectionString(process.env))}`);
console.log(`Modus: ${all ? 'ALLE Zeilen neu bewerten' : 'nur unbewertete Zeilen'}`);

const baseQuery = db
	.select({
		id: sightings.id,
		notes: sightings.notes,
		firstName: sightings.firstName,
		lastName: sightings.lastName,
		email: sightings.email,
		waterway: sightings.waterway,
		seaMark: sightings.seaMark,
		species: sightings.species,
		latitude: sightings.latitude,
		longitude: sightings.longitude,
		inBalticSeaGeo: sightings.inBalticSeaGeo
	})
	.from(sightings)
	.orderBy(sightings.id);

const filtered = all ? baseQuery : baseQuery.where(isNull(sightings.spamScore));
const rows = await (limit ? filtered.limit(limit) : filtered);

console.log(`${rows.length} Sichtungen zu bewerten …`);

let written = 0;
let skippedFailed = 0;
const distribution = new Map<number, number>();
const startedAt = Date.now();

for (const row of rows) {
	const result = await detectSpamIndicators({
		notes: row.notes,
		firstName: row.firstName,
		lastName: row.lastName,
		email: row.email,
		waterway: row.waterway,
		seaMark: row.seaMark,
		species: row.species,
		latitude: row.latitude != null ? Number(row.latitude) : null,
		longitude: row.longitude != null ? Number(row.longitude) : null,
		inBalticSeaGeo: row.inBalticSeaGeo
	});

	if (result.failed) {
		// Fail-Safe-Ergebnisse nicht persistieren — NULL heißt „nicht bewertet",
		// dieselbe Regel wie in saveSighting.
		skippedFailed++;
		continue;
	}

	await db
		.update(sightings)
		.set({ spamScore: result.score, spamIndicators: result.indicators })
		.where(eq(sightings.id, row.id));

	written++;
	distribution.set(result.score, (distribution.get(result.score) ?? 0) + 1);

	if (written % 500 === 0) {
		const perRow = (Date.now() - startedAt) / written;
		const remaining = Math.round(((rows.length - written) * perRow) / 1000);
		console.log(`  ${written}/${rows.length} … (Rest ~${remaining}s)`);
	}
}

console.log(
	`\nFertig: ${written} bewertet, ${skippedFailed} übersprungen (Prüfung fehlgeschlagen).`
);
console.log('Score-Verteilung:');
for (const [score, count] of [...distribution.entries()].sort(([a], [b]) => a - b)) {
	console.log(`  Score ${score}: ${count}`);
}

process.exit(0);
