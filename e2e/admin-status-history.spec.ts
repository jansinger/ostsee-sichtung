import { expect, test } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';
import { deleteSighting, seedSighting } from './helpers/seedSighting';

/**
 * admin-status-history.spec.ts — die Status-Historie entsteht am Bedienelement.
 *
 * **Warum E2E und nicht nur Unit-Tests.** Die Historie hängt an drei Teilen, die
 * je einzeln geprüft sind: der Verify-Endpunkt schreibt (`verify.test.ts`), die
 * Zeitleiste stellt dar (`SightingStatusTimeline.svelte.test.ts`), und `+page.ts`
 * lädt. Was keiner der drei prüft, ist die **Strecke** — dass ein Klick auf
 * „Freigeben" am Ende als Eintrag in der Zeitleiste ankommt. Genau dort sitzen
 * die Fehler, die keiner der Einzeltests sieht: eine nicht neu geladene Seite,
 * ein vergessenes `history` in der Antwort, ein Prop, das nicht durchgereicht
 * wird (Präzedenz: `FieldRenderer`, `design-system.md`).
 *
 * Eigene Testzeile über `e2e/helpers/seedSighting.ts` — die Historie schreibt in
 * die Datenbank, und ein fremder Datensatz behielte die Einträge.
 */
test.describe('Admin-Detailansicht — Status-Historie', () => {
	const createdIds: number[] = [];

	test.afterEach(async () => {
		// Die Einträge verschwinden per ON DELETE CASCADE mit der Sichtung.
		while (createdIds.length > 0) {
			await deleteSighting(createdIds.pop()!);
		}
	});

	test('hält jede Entscheidung mit Zeitpunkt und Bearbeiter fest', async ({
		page,
		context,
		baseURL
	}) => {
		await seedAdminSession(context, baseURL!, ['admin']);
		const id = await seedSighting({
			referenceId: 'e2e-status-historie',
			sightingDate: new Date('2024-06-01T08:30:00.000Z')
		});
		createdIds.push(id);

		await page.goto(`/admin/${id}`);

		const historie = page.getByRole('group', { name: /Bearbeitungs-Historie/ });

		// Vor der ersten Entscheidung: leer — und der Grund steht dabei, sonst
		// liest sich das wie „nie bearbeitet".
		// Aufgeklappt wird über das `summary`, nicht über das `details`: Letzteres
		// trifft nur deshalb, weil der Inhalt zugeklappt Höhe 0 hat — der Test
		// hinge damit an einer Layout-Eigenschaft statt am Bedienelement.
		await historie.locator('summary').click();
		await expect(historie.getByText(/Aufzeichnung beginnt/)).toBeVisible();

		/* `evaluate(el => el.click())` wie in `admin-sighting-status.spec.ts`: Der
		   Radio-Input liegt unter seinem Label, ein Playwright-Klick landet auf
		   der sticky Navbar, sobald die Seite gescrollt ist. */
		await page
			.getByRole('radio', { name: 'Freigegeben' })
			.evaluate((el: HTMLInputElement) => el.click());
		await expect(historie.getByRole('listitem')).toHaveCount(1);

		await page
			.getByRole('radio', { name: 'Abgelehnt' })
			.evaluate((el: HTMLInputElement) => el.click());
		await expect(historie.getByRole('listitem')).toHaveCount(2);

		// Älteste zuerst: Die Zeitleiste wird von oben nach unten gelesen.
		const eintraege = historie.getByRole('listitem');
		await expect(eintraege.nth(0)).toContainText('Freigegeben');
		await expect(eintraege.nth(1)).toContainText('Abgelehnt');

		// Die Bearbeiter-Kennung ist dieselbe wie in `freigegeben_von`/
		// `abgelehnt_von` — die E-Mail aus der Anmeldung, kein Platzhalter.
		await expect(eintraege.nth(1)).toContainText('@');
	});
});
