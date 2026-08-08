import { expect, test } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';
import { deleteSighting, FIRST_PAGE_DATE, seedSighting } from './helpers/seedSighting';

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
 * Eigene Testzeilen über `e2e/helpers/seedSighting.ts`, mit einem
 * Sichtungsdatum in der Zukunft: Die Tabelle sortiert per Vorgabe nach
 * `sichtungsdatum desc`, damit stehen beide Zeilen sicher auf Seite 1 — sonst
 * hinge der Test daran, wie viele Sichtungen die Datenbank sonst noch trägt.
 */

/**
 * Gesetzt wird nur `totfund` — der Marker soll allein daran hängen. Trüge der
 * Seed zusätzlich Art und Melderdaten, bliebe offen, ob die Tabelle nicht
 * daraus schließt.
 *
 * `FIRST_PAGE_DATE`, weil beiden Zeilen „auf Seite 1" genügt; die neueste Zeile
 * ist reserviert (siehe `seedSighting.ts`).
 */
function seedDeadFinding(referenceId: string, isDead: boolean): Promise<number> {
	return seedSighting({ referenceId, sightingDate: FIRST_PAGE_DATE, isDead });
}

test.describe('Admin-Sichtungstabelle — Totfund-Marker', () => {
	const createdIds: number[] = [];

	test.afterEach(async () => {
		while (createdIds.length > 0) {
			await deleteSighting(createdIds.pop()!);
		}
	});

	test('markiert den Totfund und lässt die Lebendsichtung unmarkiert', async ({
		page,
		context,
		baseURL
	}) => {
		await seedAdminSession(context, baseURL!, ['admin']);
		createdIds.push(await seedDeadFinding('e2e-tot', true));
		createdIds.push(await seedDeadFinding('e2e-lebend', false));

		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/admin/sichtungen');

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
		await page.goto('/admin/sichtungen');

		await expect(page.getByRole('columnheader', { name: 'Tierart' })).toBeVisible();
		await expect(page.getByLabel('Totfund', { exact: true })).toHaveCount(0);
	});
});
