import { expect, test } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';
import { deleteSighting, seedSighting, sightingExists } from './helpers/seedSighting';

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
 * Eigene Testzeile über `e2e/helpers/seedSighting.ts`, Begründung wie in
 * `admin-edit-preserves-record.spec.ts`.
 */

/** Die Mail-Aktion — beschriftet nach Empfänger, nicht nach „Test" (#621). */
const MAIL_ACTION = 'Benachrichtigung zu dieser Sichtung an das Team senden';

/**
 * Der Seed bleibt hier auf dem Pflichtteil: Geprüft werden Bedienelemente, und
 * keines davon hängt an Art, Anzahl oder Melderdaten. Ein Datensatz, der nur
 * Spaltendefaults trägt, ist für diese Tests sogar der schärfere Fall.
 */
function seedDetailSighting(referenceId: string): Promise<number> {
	return seedSighting({ referenceId, sightingDate: new Date('2024-06-01T08:30:00.000Z') });
}

test.describe('Admin-Detailansicht — Aktionen', () => {
	const createdIds: number[] = [];

	test.afterEach(async () => {
		while (createdIds.length > 0) {
			await deleteSighting(createdIds.pop()!);
		}
	});

	test('bietet dieselben Aktionen wie die Tabellenzeile', async ({ page, context, baseURL }) => {
		await seedAdminSession(context, baseURL!, ['superadmin']);
		const id = await seedDetailSighting('e2e-detail-aktionen');
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
		const id = await seedDetailSighting('e2e-detail-rolle');
		createdIds.push(id);

		await page.goto(`/admin/${id}`);

		await expect(page.getByRole('button', { name: 'Sichtung löschen' })).toBeVisible();
		await expect(page.getByRole('button', { name: MAIL_ACTION })).toHaveCount(0);
	});

	test('löscht die Sichtung und verlässt die Seite', async ({ page, context, baseURL }) => {
		await seedAdminSession(context, baseURL!, ['admin']);
		const id = await seedDetailSighting('e2e-detail-loeschen');
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
		expect(await sightingExists(id)).toBe(false);
	});
});
