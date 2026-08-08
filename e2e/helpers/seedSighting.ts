import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

/**
 * seedSighting.ts — eine einzelne Sichtung für E2E-Tests anlegen und wieder
 * entfernen.
 *
 * **Warum überhaupt seeden:** Die Entwicklungs-Datenbank ist laut
 * `docs/WORKTREES.md` von allen Worktrees geteilt, und ihr Bestand ist
 * gewachsen statt gepflegt. Ein Test, der eine bestimmte Ausprägung braucht
 * (hier: eine lange Referenz-ID in der Mobilkarte), darf nicht darauf hoffen,
 * dass zufällig eine passende Zeile auf Seite 1 steht — sonst ist er entweder
 * grün ohne Aussage oder rot ohne Ursache im Code.
 *
 * **Warum ein eigener `postgres`-Client** statt `$lib/server/db`: dieselbe
 * Begründung wie in `adminSession.ts` — Playwright läuft als gewöhnliches
 * Node-Programm ohne SvelteKit-Bundler, also ohne `$lib`-Alias und ohne
 * `$env/dynamic/private`.
 *
 * **Pflichtfelder:** In `sichtungen` sind nur `sichtungsdatum` und `created`
 * NOT NULL ohne Default (`src/lib/server/db/schema.ts`). Alles andere füllt die
 * Datenbank selbst — der Seed bleibt damit klein und altert nicht mit jedem
 * neuen Feld.
 *
 * **Warum trotzdem `kommentar_intern`:** `scripts/seed-e2e.ts` räumt über genau
 * diesen Marker auf. Ohne ihn bleibt eine Zeile, deren `deleteSighting` nicht
 * mehr lief (abgebrochener Lauf, getöteter CI-Job), unauffindbar in der über
 * alle Worktrees geteilten Entwicklungs-DB liegen — und zwar mit einem
 * Sichtungsdatum in der Zukunft, also dauerhaft an der Spitze der
 * Default-Sortierung, wo sie den nächsten Test auf Seite 1 stört.
 */

/* Playwright lädt .env nicht von sich aus — siehe adminSession.ts. */
loadEnv();

/* Muss wörtlich mit `scripts/seed-e2e.ts` übereinstimmen — dessen Aufräumlauf
   löscht über `WHERE kommentar_intern = 'e2e-seed'`. */
const SEED_MARKER = 'e2e-seed';

function verbindung() {
	const databaseUrl = process.env.DATABASE_POSTGRES_URL;
	if (!databaseUrl) {
		throw new Error(
			'DATABASE_POSTGRES_URL fehlt — ohne Datenbank kann keine Test-Sichtung angelegt werden. ' +
				'Lokal steht sie in .env, in CI entsteht sie aus .env.example (ci.yml).'
		);
	}
	return postgres(databaseUrl, { max: 1 });
}

/**
 * Legt eine Sichtung an und liefert ihre `id` zurück.
 *
 * `sightingDate` bewusst als Parameter: Die Admin-Tabelle sortiert per Default
 * nach `sichtungsdatum` absteigend. Ein Datum in der Zukunft stellt die Zeile
 * damit an den Anfang der ersten Seite — zusammen mit `?perPage=1` ist sie die
 * einzige, die der Test sieht.
 */
export async function seedSighting(daten: {
	referenceId: string;
	sightingDate: Date;
}): Promise<number> {
	const sql = verbindung();
	try {
		const [zeile] = await sql<{ id: number }[]>`
			INSERT INTO sichtungen (sichtungsdatum, created, referenz_id, kommentar_intern)
			VALUES (${daten.sightingDate}, NOW(), ${daten.referenceId}, ${SEED_MARKER})
			RETURNING id
		`;
		return Number(zeile.id);
	} finally {
		// Sonst hält der offene Pool den Playwright-Prozess am Leben.
		await sql.end({ timeout: 5 });
	}
}

/** Entfernt eine mit `seedSighting` angelegte Zeile wieder. */
export async function deleteSighting(id: number): Promise<void> {
	const sql = verbindung();
	try {
		await sql`DELETE FROM sichtungen WHERE id = ${id}`;
	} finally {
		await sql.end({ timeout: 5 });
	}
}
