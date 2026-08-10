import { expect, test, type Locator, type Page } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';

/**
 * admin-status-tabs.spec.ts — Statusleiste über der Sichtungstabelle (WP2).
 *
 * Die Komponente selbst ist in `src/routes/admin/sichtungen/statusTabs.svelte.test.ts`
 * abgedeckt (Beschriftung, `aria-current`, gemeldeter Wert), die Zähler-Query in
 * `page.server.test.ts`. Hier läuft nur die Strecke, die dort nicht prüfbar ist:
 * dass ein Klick die URL wirklich setzt und wieder räumt, dass Leiste und
 * Panel-`<select>` denselben Stand zeigen (beide lesen die URL), und dass die
 * Zahl auf dem Reiter die Trefferzahl der Ansicht dahinter ist.
 */

function statusReiter(page: Page, name: RegExp): Locator {
	return page
		.getByRole('navigation', { name: 'Status der Sichtungen' })
		.getByRole('button', { name });
}

/**
 * Klickt einen Reiter und wartet auf die erwartete URL.
 *
 * In `toPass`, nicht direkt: Die Leiste kommt aus dem SSR-Durchlauf und ist
 * klickbar, **bevor** die Hydration ihren `onclick` angehängt hat. Ein einzelner
 * Klick landet dann im Leeren — und der Fehlschlag sähe nach einem kaputten
 * Feature aus statt nach einem Timing-Problem. Gleiche Begründung wie in
 * `admin-filter-presets.spec.ts`.
 */
async function reiterKlicken(page: Page, name: RegExp, ziel: RegExp | ((url: URL) => boolean)) {
	await expect(async () => {
		await statusReiter(page, name).click();
		await expect(page).toHaveURL(ziel, { timeout: 1000 });
	}).toPass();
}

test.describe('Admin-Sichtungstabelle — Statusleiste', () => {
	test.beforeEach(async ({ context, baseURL }) => {
		await seedAdminSession(context, baseURL!, ['admin']);
	});

	test('setzt und räumt den Statusfilter ohne das Filter-Panel', async ({ page }) => {
		await page.goto('/admin/sichtungen');

		// „Alle" ist der Ausgangszustand — ohne `?verified=` in der URL.
		await expect(statusReiter(page, /Alle/)).toHaveAttribute('aria-current', 'true');

		await reiterKlicken(page, /Offen/, /verified=open/);
		await expect(page).toHaveURL(/page=1/);
		await expect(statusReiter(page, /Offen/)).toHaveAttribute('aria-current', 'true');
		await expect(statusReiter(page, /Alle/)).not.toHaveAttribute('aria-current', 'true');

		// Zurück auf „Alle" heißt: Der Parameter verschwindet, er wird nicht auf
		// einen Leerwert gesetzt.
		await reiterKlicken(page, /Alle/, (url) => !url.searchParams.has('verified'));
		await expect(statusReiter(page, /Alle/)).toHaveAttribute('aria-current', 'true');
	});

	test('zeigt im Panel denselben Stand wie die Leiste', async ({ page }) => {
		await page.goto('/admin/sichtungen?verified=rejected');

		await expect(statusReiter(page, /Abgelehnt/)).toHaveAttribute('aria-current', 'true');

		/* Den Filter-Knopf gibt es zweimal im DOM — kompakter und weiter Kopf sind
		   nur per CSS getrennt. `filter({ visible: true })` nimmt den des aktuellen
		   Layouts, statt an der Strict-Mode-Verletzung zu scheitern. Der Klick läuft
		   in `toPass`, weil das Panel an Client-State hängt: Vor der Hydration
		   bewirkt er nichts (Begründung wie bei `reiterKlicken`).

		   Das `<select>` über seine `id` und nicht über `getByLabel('Status')`: Das
		   Wort steht auf dieser Seite auch an der Leiste selbst und an jedem
		   Segmented Control einer Zeile — die Abfrage träfe ein Dutzend Elemente. */
		const statusAuswahl = page.locator('select#verified');
		await expect(async () => {
			await page
				.getByRole('button', { name: /^Filter/ })
				.filter({ visible: true })
				.click();
			await expect(statusAuswahl).toBeVisible({ timeout: 1000 });
		}).toPass();
		await expect(statusAuswahl).toHaveValue('rejected');
	});

	test('nennt auf dem Reiter die Trefferzahl der Ansicht dahinter', async ({ page }) => {
		await page.goto('/admin/sichtungen');

		await reiterKlicken(page, /Offen/, /verified=open/);

		/* Beide Zahlen aus demselben gerenderten Zustand lesen — Datenbank und
		   `uploads/` sind zwischen Worktrees geteilt (docs/WORKTREES.md), und
		   parallel laufende Specs seeden/löschen Sichtungen. Ein Vorher-Nachher-
		   Vergleich (Badge vor dem Klick, Gesamtzahl danach) verglich damit
		   gelegentlich zwei verschiedene Zeitpunkte und schlug spurios fehl. Die
		   Zahl unter der Tabelle ist `pagination.total` — dieselbe Menge, die der
		   Reiter für die Ansicht ankündigt. Weichen sie ab, zählt die Reiter-Query
		   eine andere Grundmenge als die Liste. */
		const reiter = statusReiter(page, /Offen/);
		const angekuendigt = Number((await reiter.getByTestId('status-tab-count').innerText()).trim());
		await expect(page.getByText(`${angekuendigt} Einträge`)).toBeVisible();
	});
});
