import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';

/**
 * admin-table-breakpoint.spec.ts — Kopf und Inhaltsfläche der Sichtungstabelle
 * schalten an derselben Grenze.
 *
 * **Der Befund (Admin-Review, Befund 12):** `/admin/sichtungen` schaltete den
 * Seitenkopf bei `sm` (640px) und die Inhaltsfläche bei `md` (768px). Zwischen
 * 640 und 767 Pixeln stand damit der Desktop-Kopf — mit Spalten-Dropdown und
 * Bulk-Kontext — über einer Kartenliste, die weder Spalten noch Bulk-Auswahl
 * kennt. Betroffen waren Hochkant-Tablets.
 *
 * `design-system.md` („Breakpoint-Vertrag") kennt genau zwei Grenzen: `md`
 * schaltet alles Inhaltliche, `lg` ausschließlich die Navigation. `sm` ist
 * keine Layout-Grenze.
 *
 * **Warum ein E2E-Test und kein Quelltext-Scan:** Ein Scan auf die
 * Klassennamen wäre eine zweite Quelle neben dem Markup und altert mit ihm. Der
 * Test hier misst die Wirkung — welche Variante der Browser bei einer gegebenen
 * Breite tatsächlich zeigt — und bleibt damit auch dann gültig, wenn die
 * Umschaltung eines Tages anders gebaut wird.
 *
 * Die 700px sind bewusst gewählt: mitten im vorher kaputten Fenster. 900px ist
 * die Gegenprobe, ohne die ein Grün nur belegte, dass beide Flächen dieselbe
 * Variante zeigen — nicht, dass die Umschaltung überhaupt stattfindet.
 */

/** Das Spalten-Dropdown gibt es nur im weiten Kopf. */
const WEITER_KOPF = 'Spalten ein-/ausblenden';

async function erwarteVariante(
	page: Page,
	variante: 'kompakt' | 'weit',
	breite: number
): Promise<void> {
	const weiterKopf = page.getByTitle(WEITER_KOPF);
	const tabelle = page.locator('table.table-zebra');
	// „Gemeldet:" steht ausschließlich in der Mobilkarte.
	const karte = page.getByText('Gemeldet:').first();

	if (variante === 'weit') {
		await expect(weiterKopf, `${breite}px: weiter Kopf fehlt`).toBeVisible();
		await expect(tabelle, `${breite}px: Tabelle fehlt`).toBeVisible();
		await expect(karte, `${breite}px: Mobilkarte steht neben dem weiten Kopf`).toBeHidden();
	} else {
		await expect(weiterKopf, `${breite}px: weiter Kopf steht über der Kartenliste`).toBeHidden();
		await expect(tabelle, `${breite}px: Tabelle steht neben dem kompakten Kopf`).toBeHidden();
		await expect(karte, `${breite}px: Mobilkarte fehlt`).toBeVisible();
	}
}

test.describe('Admin-Sichtungstabelle — Breakpoint-Vertrag', () => {
	for (const { breite, variante } of [
		{ breite: 700, variante: 'kompakt' as const },
		{ breite: 900, variante: 'weit' as const }
	]) {
		test(`bei ${breite}px zeigen Kopf und Inhaltsfläche die ${variante}e Variante`, async ({
			browser,
			baseURL
		}) => {
			if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

			let context: BrowserContext | undefined;
			try {
				context = await browser.newContext({ viewport: { width: breite, height: 900 } });
				await seedAdminSession(context, baseURL);
				const page = await context.newPage();

				await page.goto('/admin/sichtungen');
				/* `.first()`: Beide Kopf-Varianten stehen gleichzeitig im DOM und tragen
				   dieselbe Überschrift. Ohne die Einschränkung bricht schon diese
				   Vorprüfung mit einer Strict-Mode-Verletzung ab, sobald der Breakpoint
				   auseinanderläuft — die Meldung benennt dann Playwrights Regel statt
				   des Befunds, um den es hier geht. */
				await expect(page.getByRole('heading', { name: 'Sichtungen' }).first()).toBeVisible();

				/* Ohne mindestens eine Sichtung wären Tabelle und Kartenliste beide leer
				   und der Fall „Mobilkarte sichtbar" trivial rot bzw. „Tabelle sichtbar"
				   trivial grün. Kein eigener Seed dafür: Die Referenz-Links stehen in
				   beiden Layouts, und der Bestand der Entwicklungs-DB trägt sie. Ein
				   Seed auf `NEWEST_ROW_DATE` kollidierte zudem mit
				   `admin-table-mobile-reference-overflow.spec.ts`, das denselben Wert
				   für seine `?perPage=1`-Zeile beansprucht. */
				await expect(page.locator('a[href^="/admin/ref/"]').first()).toBeAttached();

				await erwarteVariante(page, variante, breite);
			} finally {
				await context?.close();
			}
		});
	}
});
