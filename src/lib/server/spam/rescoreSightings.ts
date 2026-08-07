/**
 * Nachträgliche Spam-Bewertung bestehender Sichtungen (Backfill).
 *
 * Die Logik liegt hier und nicht im Endpunkt, damit sie testbar bleibt und
 * `src/tools/rescore-spam.ts` (lokal/Dev) dieselbe Rechnung benutzt wie der
 * Admin-Endpunkt (deployte Umgebungen, wo kein Zugang zur DB von außen
 * besteht: dmm gibt den DB-Port nicht frei, hawking hat
 * `allowtcpforwarding no`).
 *
 * Was der Backfill NICHT kann: Signale, die nur zum Meldezeitpunkt existieren
 * — Formular-Token und Duplikat-Fenster („letzte 24 h"). Nachträgliche Scores
 * fallen deshalb systematisch milder aus als die einer echten Einreichung.
 * Das ist gewollt: ein `submission: { tokenStatus: 'missing' }` wäre für
 * Altbestand ein erfundener Malus.
 */
import { createLogger } from '$lib/logger.server';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { count, eq, isNull } from 'drizzle-orm';
import { detectSpamIndicators } from './spamDetector';

const logger = createLogger('spam:rescore');

/** Obergrenze je Lauf. Hält die Antwortzeit im Rahmen (MX-Lookups!). */
export const MAX_RESCORE_BATCH = 1000;
const DEFAULT_RESCORE_BATCH = 200;

export interface RescoreReport {
	/** Zeilen, die in diesem Lauf einen Score bekommen haben. */
	scored: number;
	/** Zeilen mit fehlgeschlagener Prüfung — bleiben NULL, siehe saveSighting. */
	skippedFailed: number;
	/** Höchste bearbeitete ID (für Fortschritts-Anzeige im Log). */
	lastId: number | null;
	/** Noch unbewertete Zeilen NACH diesem Lauf. */
	remaining: number;
	/** true, wenn dieser Lauf die Menge geleert hat (weniger Zeilen als Limit). */
	done: boolean;
	/** Score → Anzahl, für einen schnellen Blick auf die Verteilung. */
	distribution: Record<string, number>;
}

export interface RescoreOptions {
	/** Zeilen je Lauf, geklemmt auf MAX_RESCORE_BATCH. */
	limit?: number | undefined;
}

/**
 * Bewertet einen Batch bislang unbewerteter Sichtungen und schreibt
 * `spam_score`/`spam_indicators`.
 *
 * Idempotent: Es werden ausschließlich Zeilen mit `spam_score IS NULL`
 * geladen — ein abgebrochener Lauf macht beim nächsten Aufruf dort weiter.
 */
export async function rescoreSightings(options: RescoreOptions): Promise<RescoreReport> {
	const requested = options.limit ?? DEFAULT_RESCORE_BATCH;
	const limit = Math.min(
		Math.max(Math.floor(requested) || DEFAULT_RESCORE_BATCH, 1),
		MAX_RESCORE_BATCH
	);

	const rows = await db
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
		.where(isNull(sightings.spamScore))
		.orderBy(sightings.id)
		.limit(limit);

	let scored = 0;
	let skippedFailed = 0;
	let lastId: number | null = null;
	const distribution: Record<string, number> = {};

	for (const row of rows) {
		lastId = row.id;

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
			skippedFailed++;
			continue;
		}

		await db
			.update(sightings)
			.set({ spamScore: result.score, spamIndicators: result.indicators })
			.where(eq(sightings.id, row.id));

		scored++;
		const key = String(result.score);
		distribution[key] = (distribution[key] ?? 0) + 1;
	}

	const [remainingRow] = await db
		.select({ count: count() })
		.from(sightings)
		.where(isNull(sightings.spamScore));
	const remaining = Number(remainingRow?.count ?? 0);

	// `done` aus der Batch-Größe, nicht aus `remaining === 0`: Zeilen mit
	// fehlgeschlagener Prüfung bleiben NULL und würden `remaining` sonst nie
	// auf 0 fallen lassen — der Aufrufer liefe endlos weiter.
	const done = rows.length < limit;

	logger.info(
		{ scored, skippedFailed, lastId, remaining, done },
		'Spam-Rescore-Batch abgeschlossen'
	);

	return { scored, skippedFailed, lastId, remaining, done, distribution };
}
