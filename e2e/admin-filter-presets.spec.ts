import { expect, test } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';

/**
 * admin-filter-presets.spec.ts — gespeicherte Filteransichten (Spec B4).
 *
 * Die Preset-Logik selbst (Serialisierung, Vergleich, tolerantes Parsen) ist in
 * `src/routes/admin/sichtungen/filterPresets.test.ts` als Unit-Test abgedeckt.
 * Hier läuft nur die Strecke, die dort nicht prüfbar ist: dass die Chips den
 * Filterzustand aus der **URL** aufnehmen, dass ein Klick wirklich navigiert,
 * dass die aktive Ansicht markiert wird — und dass das Ganze einen Neuaufbau
 * der Seite überlebt, also tatsächlich in `localStorage` liegt.
 */

/**
 * Öffnet das Formular „Ansicht speichern" und trägt den Namen ein.
 *
 * Der Klick läuft in `toPass`, nicht einfach direkt: Die Leiste kommt aus dem
 * SSR-Durchlauf, der Knopf ist also sichtbar und klickbar, **bevor** die
 * Hydration seinen `onclick` angehängt hat. Ein einzelner Klick landet dann im
 * Leeren, und der Test scheitert an der ausbleibenden Eingabezeile — mit einer
 * Fehlermeldung, die nach einem kaputten Feature aussieht statt nach einem
 * Timing-Problem.
 */
async function ansichtAnlegen(page: import('@playwright/test').Page, name: string): Promise<void> {
	const nameFeld = page.getByLabel('Name der Ansicht');
	await expect(async () => {
		await page.getByRole('button', { name: 'Ansicht speichern' }).click();
		await expect(nameFeld).toBeVisible({ timeout: 1000 });
	}).toPass();
	await nameFeld.fill(name);
	await page.getByRole('button', { name: 'Speichern', exact: true }).click();
}

test.describe('Admin-Sichtungstabelle — gespeicherte Filteransichten', () => {
	test.beforeEach(async ({ page, context, baseURL }) => {
		await seedAdminSession(context, baseURL!, ['admin']);
		/* Sauberer Ausgangszustand: Die Ansichten sind pro Browser gespeichert,
		   ein Rest aus einem vorherigen Lauf ließe die Zählungen unten wandern. */
		await page.goto('/admin/sichtungen');
		await page.evaluate(() => window.localStorage.removeItem('admin.sichtungen.filterPresets'));
	});

	test('speichert den aktuellen Filterzustand, wendet ihn an und markiert ihn', async ({
		page
	}) => {
		await page.goto('/admin/sichtungen?verified=open');

		await ansichtAnlegen(page, 'Offene Meldungen');

		const chip = page.getByRole('button', { name: 'Offene Meldungen' });
		await expect(chip).toBeVisible();
		// Die URL trägt den Filter, den das Preset beschreibt → aktiv markiert.
		await expect(chip).toHaveAttribute('aria-current', 'true');

		// Ein anderer Filterzustand hebt die Markierung auf …
		await page.goto('/admin/sichtungen?verified=approved');
		await expect(chip).not.toHaveAttribute('aria-current', 'true');

		// … und ein Klick auf den Chip stellt den gespeicherten Zustand her.
		await chip.click();
		await expect(page).toHaveURL(/verified=open/);
		await expect(chip).toHaveAttribute('aria-current', 'true');
	});

	test('überlebt einen Neuaufbau der Seite', async ({ page }) => {
		await page.goto('/admin/sichtungen?deadFinding=1');
		await ansichtAnlegen(page, 'Totfunde');
		await expect(page.getByRole('button', { name: 'Totfunde' })).toBeVisible();

		await page.reload();
		await expect(page.getByRole('button', { name: 'Totfunde' })).toBeVisible();
	});

	test('lehnt einen bereits vergebenen Namen sichtbar ab', async ({ page }) => {
		await page.goto('/admin/sichtungen?verified=open');
		await ansichtAnlegen(page, 'Offene Meldungen');
		await expect(page.getByRole('button', { name: 'Offene Meldungen' })).toHaveCount(1);

		/* Anderer Filter, gleicher Name — und bewusst in anderer Schreibweise:
		   Groß-/Kleinschreibung unterscheidet zwei Chips nicht brauchbar. */
		await page.goto('/admin/sichtungen?deadFinding=1');
		await ansichtAnlegen(page, 'offene meldungen');

		await expect(page.getByText('Es gibt bereits eine Ansicht')).toBeVisible();
		/* `exact`, weil `getByRole` sonst ohne Rücksicht auf Groß-/Kleinschreibung
		   vergleicht — die abgelehnte Schreibweise träfe dann den vorhandenen Chip. */
		await expect(page.getByRole('button', { name: 'offene meldungen', exact: true })).toHaveCount(
			0
		);
		await expect(page.getByRole('button', { name: 'Offene Meldungen', exact: true })).toHaveCount(
			1
		);
	});

	test('benennt eine Ansicht um und löscht sie', async ({ page }) => {
		await page.goto('/admin/sichtungen?verified=open');
		await ansichtAnlegen(page, 'Erster Name');

		/* `getByLabel` statt `getByRole('button')`: Das Verwalten-Element ist ein
		   `summary` (DaisyUI-Dropdown wie die Spaltenauswahl daneben) und trägt
		   deshalb nicht die Rolle `button`. */
		await page.getByLabel('Ansicht „Erster Name“ verwalten').click();
		await page.getByRole('button', { name: 'Umbenennen' }).click();
		await page.getByLabel('Ansicht umbenennen').fill('Zweiter Name');
		await page.getByRole('button', { name: 'Übernehmen' }).click();

		await expect(page.getByRole('button', { name: 'Zweiter Name' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Erster Name' })).toHaveCount(0);

		await page.getByLabel('Ansicht „Zweiter Name“ verwalten').click();
		/* `exact`, sonst trifft der Name auch die „Eintrag löschen"-Knöpfe der
		   Tabellenzeilen darunter. */
		await page.getByRole('button', { name: 'Löschen', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Zweiter Name' })).toHaveCount(0);

		// Auch das Löschen ist persistiert, nicht nur im Speicher der Seite.
		await page.reload();
		await expect(page.getByRole('button', { name: 'Zweiter Name' })).toHaveCount(0);
	});
});
