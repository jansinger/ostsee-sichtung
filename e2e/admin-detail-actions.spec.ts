import { expect, test } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { DistanceEnum } from '../src/lib/report/formOptions/distance';
import { SightingFromEnum } from '../src/lib/report/formOptions/sightingFrom';
import { seedAdminSession } from './helpers/adminSession';

/**
 * admin-detail-actions.spec.ts — die Detailansicht trägt dieselben Aktionen wie
 * die Tabellenzeile.
 *
 * **Der Anlass:** In `/admin/sichtungen` hat jede Zeile vier Aktionen (Details, Test-E-Mail,
 * Spam-Check, Löschen). Öffnete man die Sichtung, blieben davon nur Spam-Check
 * und Bearbeiten — zum Löschen musste man zurück in die Tabelle und die Zeile
 * dort wiederfinden. Genau dabei erwischt man die falsche.
 *
 * **Warum das Löschen bis zum Ende gefahren wird:** Die Detailansicht ist der
 * einzige Ort, an dem der Datensatz unter den eigenen Füßen verschwindet. Die
 * Tabelle lädt danach nur neu; hier muss die Seite die gelöschte Sichtung
 * verlassen, sonst steht der Admin vor einem 404. Ein Test, der nur die Existenz
 * des Buttons prüft, ginge an dem Teil vorbei, der schiefgehen kann.
 *
 * Eigene Testzeile mit `kommentar_intern = 'e2e-seed'`, Begründung wie in
 * `admin-edit-preserves-record.spec.ts`.
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

async function createSighting(referenceId: string): Promise<number> {
	const sql = connect();
	try {
		const [row] = await sql<{ id: number }[]>`
			INSERT INTO sichtungen (
				sichtungsdatum, created, tierart, anzahl_gesamt,
				vonwo, entfernung, referenz_id,
				vorname, name, email,
				datenschutz_einverstaendnis, kommentar_intern
			) VALUES (
				'2024-06-01T08:30:00.000Z', NOW(), 1, 2,
				${SightingFromEnum.LAND}, ${DistanceEnum.FROM_10_TO_50M}, ${referenceId},
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

async function countSighting(id: number): Promise<number> {
	const sql = connect();
	try {
		const rows = await sql`SELECT id FROM sichtungen WHERE id = ${id}`;
		return rows.length;
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

/** Die Mail-Aktion — beschriftet nach Empfänger, nicht nach „Test" (#621). */
const MAIL_ACTION = 'Benachrichtigung zu dieser Sichtung an das Team senden';

test.describe('Admin-Detailansicht — Aktionen', () => {
	const createdIds: number[] = [];

	test.afterEach(async () => {
		while (createdIds.length > 0) {
			await removeSighting(createdIds.pop()!);
		}
	});

	test('bietet dieselben Aktionen wie die Tabellenzeile', async ({ page, context, baseURL }) => {
		await seedAdminSession(context, baseURL!, ['superadmin']);
		const id = await createSighting('e2e-detail-aktionen');
		createdIds.push(id);

		await page.goto(`/admin/${id}`);

		await expect(page.getByRole('button', { name: 'Spam-Check für diese Sichtung' })).toBeVisible();
		await expect(page.getByRole('button', { name: MAIL_ACTION })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Sichtung löschen' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Sichtung bearbeiten' })).toBeVisible();
	});

	/**
	 * Die Mail geht an das Team-Postfach und ist dort von einer echten Neu-Meldung
	 * nicht zu unterscheiden — deshalb `superadmin`. Das Gate steht am Endpunkt
	 * (`admin.contract.test.ts`); hier wird geprüft, dass ein Admin das
	 * Bedienelement gar nicht erst angeboten bekommt. Die übrigen drei Aktionen
	 * bleiben ihm, sonst prüfte der Test nur eine leere Seite.
	 */
	test('zeigt einem Admin ohne superadmin die Mail-Aktion nicht', async ({
		page,
		context,
		baseURL
	}) => {
		await seedAdminSession(context, baseURL!, ['admin']);
		const id = await createSighting('e2e-detail-rolle');
		createdIds.push(id);

		await page.goto(`/admin/${id}`);

		await expect(page.getByRole('button', { name: 'Sichtung löschen' })).toBeVisible();
		await expect(page.getByRole('button', { name: MAIL_ACTION })).toHaveCount(0);
	});

	test('löscht die Sichtung und verlässt die Seite', async ({ page, context, baseURL }) => {
		await seedAdminSession(context, baseURL!, ['admin']);
		const id = await createSighting('e2e-detail-loeschen');
		createdIds.push(id);

		await page.goto(`/admin/${id}`);
		await page.getByRole('button', { name: 'Sichtung löschen' }).click();

		// Ohne Bestätigung wird nichts gelöscht (design-system.md).
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Löschen' }).click();

		/* Ziel ist die Tabelle, und die liegt seit dem Umbau der Verwaltung auf
		   `/admin/sichtungen` — `/admin` ist jetzt der Eingang. Ein gelöschter
		   Datensatz gehört in die Liste zurück, aus der man ihn geöffnet hat,
		   nicht in die Task-Liste der offenen Meldungen. */
		await expect(page).toHaveURL(/\/admin\/sichtungen$/);
		expect(await countSighting(id)).toBe(0);
	});
});
