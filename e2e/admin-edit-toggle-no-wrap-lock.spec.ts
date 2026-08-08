import { expect, test } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { DistanceEnum } from '../src/lib/report/formOptions/distance';
import { SightingFromEnum } from '../src/lib/report/formOptions/sightingFrom';
import { seedAdminSession } from './helpers/adminSession';

loadEnv();

/**
 * admin-edit-toggle-no-wrap-lock.spec.ts — `BaseToggle` sperrt seinen Text
 * nicht auf eine Zeile.
 *
 * **Umgezogen aus `e2e/admin-table-verified-column.spec.ts` (2026-08-07):**
 * Der Toggle „Geprüft" in der Sichtungstabelle wurde durch das Segmented
 * Control `SightingStatusControl` ersetzt (`sighting-status-${id}`,
 * `SightingStatusControl.svelte`) — `input[name^="verified-"]` gibt es nicht
 * mehr, beide Tests der alten Datei liefen ins Leere.
 *
 * Der erste Test dort („Spalte bricht nicht um") ist ersatzlos entfallen: Das
 * Desktop-Statuscontrol ist `size="sm"` und rendert gar keinen Text mehr, die
 * Fehlerklasse (Toggle-Label trennt sich mitten im Wort und zieht die Zeile
 * hoch) ist damit an dieser Aufrufstelle strukturell verschwunden.
 *
 * Dieser zweite Test bleibt nötig: `BaseToggle` selbst existiert weiter und
 * bedient die Bearbeitungsmaske (`sections/Location.svelte`, Feld „Position
 * verfügbar", `data-testid="field-hasPosition"`). Er ist eine Gegenprobe zur
 * eigentlichen Fix-Richtung des alten Bugs — dort stand `whitespace-nowrap` am
 * `<td>` der Tabellenzelle, nicht an `BaseToggle`. Der naheliegende, aber
 * falsche Fix wäre gewesen, die Umbruchsperre in `BaseToggle` selbst zu
 * setzen — dann könnte kein Toggle-Label in der App mehr umbrechen, auch nicht
 * bei langen Labels auf einem schmalen Bildschirm.
 *
 * Bewusst als E2E- und nicht als Komponententest: Die Client-Testumgebung lädt
 * `app.css` nicht — `white-space: nowrap` bliebe dort wirkungslos und die
 * Assertion wäre grün, egal was die Komponente setzt.
 */

function connect() {
	const databaseUrl = process.env.DATABASE_POSTGRES_URL;
	if (!databaseUrl) {
		throw new Error(
			'DATABASE_POSTGRES_URL fehlt — ohne Datenbank lässt sich keine Testsichtung anlegen. ' +
				'Lokal steht sie in .env, in CI entsteht sie aus .env.example (ci.yml).'
		);
	}
	return postgres(databaseUrl, { max: 1 });
}

/** Dieselbe Konstruktion wie `admin-edit-preserves-record.spec.ts`: eigene
 *  Zeile statt Bestandsdaten, weil die lokale DB über alle Worktrees geteilt
 *  ist (`docs/WORKTREES.md`). Der `e2e-seed`-Marker macht sie für
 *  `npm run db:seed:e2e -- --purge` auffindbar, falls ein Lauf abbricht. */
async function createSighting(referenceId: string): Promise<number> {
	const sql = connect();
	try {
		const [row] = await sql<{ id: number }[]>`
			INSERT INTO sichtungen (
				sichtungsdatum, created, tierart, anzahl_gesamt,
				vonwo, entfernung, referenz_id,
				datenschutz_einverstaendnis, kommentar_intern
			) VALUES (
				NOW(), NOW(), 1, 1,
				${SightingFromEnum.LAND}, ${DistanceEnum.FROM_10_TO_50M}, ${referenceId},
				1, 'e2e-seed'
			)
			RETURNING id
		`;
		return Number(row.id);
	} finally {
		await sql.end({ timeout: 5 });
	}
}

async function deleteSighting(id: number): Promise<void> {
	const sql = connect();
	try {
		await sql`DELETE FROM sichtungen WHERE id = ${id}`;
	} finally {
		await sql.end({ timeout: 5 });
	}
}

test.describe('Bearbeitungsmaske — Toggle „Position verfügbar"', () => {
	let sightingId: number;

	test.beforeEach(async ({ context, baseURL }) => {
		await seedAdminSession(context, baseURL!);
		sightingId = await createSighting('e2e-toggle-no-wrap');
	});

	test.afterEach(async () => {
		await deleteSighting(sightingId);
	});

	test('BaseToggle sperrt sein Label nicht auf eine Zeile', async ({ page }) => {
		await page.goto(`/admin/${sightingId}/edit`);

		const label = page.locator('input[data-testid="field-hasPosition"] ~ span').first();
		await expect(label).toBeVisible();

		const whiteSpace = await label.evaluate((el) => getComputedStyle(el).whiteSpace);

		expect(
			whiteSpace,
			'Eine Umbruchsperre in BaseToggle selbst ließe lange Labels aus ihrem Feld laufen'
		).not.toBe('nowrap');
	});
});
