import { expect, test } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { DistanceEnum } from '../src/lib/report/formOptions/distance';
import { SightingFromEnum } from '../src/lib/report/formOptions/sightingFrom';
import { seedAdminSession } from './helpers/adminSession';

/**
 * admin-table-dead-finding.spec.ts — der Totfund ist in der Tabelle erkennbar,
 * ohne dass eine Spalte dafür eingeschaltet sein muss.
 *
 * **Der Befund:** Die einzige Unterscheidung war eine Spalte „Totfund" mit
 * „Ja"/„Nein". Sie war über die Spaltenauswahl abschaltbar — war sie aus, sah
 * ein Totfund exakt aus wie eine Lebendsichtung —, und sie stand ganz rechts im
 * horizontal scrollbaren Bereich, also bei vielen aktiven Spalten außer Sicht.
 *
 * **Was hier geprüft wird:** Der Marker sitzt in einer festen Spalte ganz links,
 * die nicht in der Spaltenauswahl steht. Der Test schaltet deshalb bewusst
 * *keine* Spalte um — er verlässt sich darauf, dass es keinen Schalter gibt, und
 * die zweite Assertion belegt genau das.
 *
 * Eigene Testzeilen mit `kommentar_intern = 'e2e-seed'` und einem
 * Sichtungsdatum in der Zukunft: Die Tabelle sortiert per Vorgabe nach
 * `sichtungsdatum desc`, damit stehen beide Zeilen sicher auf Seite 1 — sonst
 * hinge der Test daran, wie viele Sichtungen die Datenbank sonst noch trägt.
 */

/* Playwright lädt .env nicht von sich aus — dieselbe Begründung wie in
   e2e/helpers/adminSession.ts. */
loadEnv();

const SEED_MARKER = 'e2e-seed';

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

async function createSighting(referenceId: string, dead: boolean): Promise<number> {
	const sql = connect();
	try {
		const [row] = await sql<{ id: number }[]>`
			INSERT INTO sichtungen (
				sichtungsdatum, created, tierart, anzahl_gesamt,
				vonwo, entfernung, referenz_id, totfund,
				vorname, name, email,
				datenschutz_einverstaendnis, kommentar_intern
			) VALUES (
				'2099-06-01T08:30:00.000Z', NOW(), 1, 2,
				${SightingFromEnum.LAND}, ${DistanceEnum.FROM_10_TO_50M}, ${referenceId},
				${dead ? 1 : 0},
				'Erika', 'Mustermann', 'erika.e2e@example.invalid',
				1, ${SEED_MARKER}
			)
			RETURNING id
		`;
		return Number(row!.id);
	} finally {
		await sql.end({ timeout: 5 });
	}
}

async function removeSighting(id: number): Promise<void> {
	const sql = connect();
	try {
		await sql`DELETE FROM sichtungen WHERE id = ${id} AND kommentar_intern = ${SEED_MARKER}`;
	} finally {
		await sql.end({ timeout: 5 });
	}
}

test.describe('Admin-Sichtungstabelle — Totfund-Marker', () => {
	const createdIds: number[] = [];

	test.afterEach(async () => {
		while (createdIds.length > 0) {
			await removeSighting(createdIds.pop()!);
		}
	});

	test('markiert den Totfund und lässt die Lebendsichtung unmarkiert', async ({
		page,
		context,
		baseURL
	}) => {
		await seedAdminSession(context, baseURL!, ['admin']);
		createdIds.push(await createSighting('e2e-tot', true));
		createdIds.push(await createSighting('e2e-lebend', false));

		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/admin');

		const totfundZeile = page.getByRole('row').filter({ hasText: 'e2e-tot' });
		const lebendZeile = page.getByRole('row').filter({ hasText: 'e2e-lebend' });

		// Über den Text und nicht über eine Test-ID: Was der Marker einem
		// Screenreader mitteilt, ist hier die eigentliche Zusage — ein rein
		// farbiges Zeichen wäre kein Merkmal (WCAG 1.4.1).
		//
		// `toHaveCount` und nicht `toBeVisible`: Träger des Textes ist der
		// `sr-only`-Span der Markerzelle. Der ist heute „sichtbar" im Sinne von
		// Playwright, weil Tailwinds `sr-only` eine 1×1-px-Box stehen lässt — ein
		// Implementierungsdetail, an das dieser Test sich nicht binden soll.
		await expect(totfundZeile.getByText('Totfund')).toHaveCount(1);
		await expect(lebendZeile.getByText('Totfund')).toHaveCount(0);
	});

	/**
	 * Gegenprobe zur Fix-Richtung: Die alte Spalte „Totfund" war abschaltbar, und
	 * genau daran hing der Befund. Stünde der Marker wieder in der Spaltenauswahl,
	 * wäre er wieder ausschaltbar — dieser Test wird dann rot, auch wenn die
	 * Assertion oben weiter grün ist.
	 */
	test('bietet keinen Schalter an, der die Kennzeichnung ausblenden könnte', async ({
		page,
		context,
		baseURL
	}) => {
		await seedAdminSession(context, baseURL!, ['admin']);

		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/admin');

		await expect(page.getByRole('columnheader', { name: 'Tierart' })).toBeVisible();
		await expect(page.getByLabel('Totfund', { exact: true })).toHaveCount(0);
	});
});
