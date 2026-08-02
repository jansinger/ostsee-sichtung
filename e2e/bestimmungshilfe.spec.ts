import { expect, test } from '@playwright/test';

/**
 * Die Bestimmungshilfe existierte lange nur hinter einem zugeklappten Toggle im
 * Sichtungsformular — nicht verlinkbar, nicht auffindbar, nicht indexierbar.
 * Diese Route macht sie zur eigenständigen Seite. Was hier geprüft wird, ist
 * genau das, was den Unterschied ausmacht: Inhalt ohne Klick, eine saubere
 * Überschriften-Hierarchie und Wege hin und zurück.
 */
test.describe('Bestimmungshilfe', () => {
	test('zeigt den Inhalt ohne einen einzigen Klick', async ({ page }) => {
		await page.goto('/bestimmungshilfe');

		await expect(page.getByText('Wal oder Robbe?')).toBeVisible();
		await expect(page.getByText('Im Zweifel nicht raten')).toBeVisible();
		await expect(page.getByText('Schweinswal').first()).toBeVisible();
	});

	test('hat genau eine h1', async ({ page }) => {
		await page.goto('/bestimmungshilfe');

		const h1 = page.locator('h1');
		await expect(h1).toHaveCount(1);
		await expect(h1).toBeVisible();
	});

	/**
	 * Der Toggle ist das Bedienelement der eingebetteten Variante. Steht er auf
	 * der Seite, ist die Variante nicht durchgereicht worden — und der Nutzer
	 * landet auf einer Seite mit einem einzigen Button.
	 */
	test('bietet keinen Aufklapp-Toggle an', async ({ page }) => {
		await page.goto('/bestimmungshilfe');

		await expect(page.getByRole('button', { name: 'Hilfe bei der Tiererkennung' })).toHaveCount(0);
	});

	test('trägt die allgemeingültigen Hinweise aus der Formularhilfe', async ({ page }) => {
		await page.goto('/bestimmungshilfe');

		await expect(page.getByRole('heading', { name: /Totfunde/ })).toBeVisible();
		await expect(page.getByText('Bitte nicht berühren')).toBeVisible();
		await expect(
			page.getByRole('heading', { name: 'Wofür die Daten gebraucht werden' })
		).toBeVisible();
		await expect(page.getByText('HELCOM')).toBeVisible();
		await expect(page.getByText('ASCOBANS')).toBeVisible();
	});

	/**
	 * Die Bedienhilfe für das Formular („Schritt 1" … „Schritt 4") gehört ans
	 * Formular, nicht auf eine Artbestimmungsseite.
	 */
	test('übernimmt die Formular-Bedienhilfe nicht', async ({ page }) => {
		await page.goto('/bestimmungshilfe');

		await expect(page.getByText('Schritt 1: Position & Zeitpunkt')).toHaveCount(0);
		await expect(page.getByText('Schritt 4: Kontaktdaten')).toHaveCount(0);
	});

	test('setzt Seitentitel und Description für die Suche', async ({ page }) => {
		await page.goto('/bestimmungshilfe');

		await expect(page).toHaveTitle(/Bestimmungshilfe/);

		/* Ohne `.first()`/`.last()`: Seit `app.html` keine eigenen SEO-Tags mehr
		   setzt, gibt es jeden genau einmal. Dass das so bleibt, prüft
		   `e2e/seo-meta.spec.ts` für alle öffentlichen Routen — hier steht nur,
		   was diese Seite inhaltlich beiträgt. */
		await expect(page.locator('meta[name="description"]')).toHaveAttribute(
			'content',
			/Schweinswal oder Robbe/
		);
		await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
			'content',
			/Bestimmungshilfe/
		);
	});

	test('führt zurück zum Meldeformular', async ({ page }) => {
		await page.goto('/bestimmungshilfe');

		const cta = page.getByRole('link', { name: /Sichtung melden/i }).first();
		await expect(cta).toBeVisible();
		await cta.click();

		/* `waitForURL` statt `toHaveURL`: Das Ziel ist das Mehrschritt-Formular,
		   die schwerste Seite der Anwendung. Im vollen Suite-Lauf hat diese
		   Navigation die Standard-Assertionsfrist einmal gerissen, isoliert nie —
		   `waitForURL` wartet auf das Navigationsereignis statt auf ein Zeitfenster.

		   Und die Überschrift zusätzlich zur URL: Ein Pfadwechsel allein belegt
		   nicht, dass der Melder beim Formular angekommen ist. Genau das soll der
		   Rückweg leisten. */
		await page.waitForURL((url) => url.pathname === '/');
		await expect(page.getByRole('heading', { name: /Sichtung.*melden/i }).first()).toBeVisible();
	});

	test.describe('Verlinkung', () => {
		test('ist über die Navigation erreichbar', async ({ page }) => {
			await page.goto('/');

			// Unterhalb lg liegt das Menü hinter dem Burger; auf Desktop-Viewport
			// steht es direkt in der Navbar.
			const navLink = page.locator('header').getByRole('link', { name: 'Bestimmungshilfe' });
			await expect(navLink.first()).toBeVisible();
			await navLink.first().click();
			await expect(page).toHaveURL(/\/bestimmungshilfe$/);
		});

		test('ist über den Footer erreichbar', async ({ page }) => {
			await page.goto('/');

			const footerLink = page.locator('footer').getByRole('link', { name: 'Bestimmungshilfe' });
			await expect(footerLink).toBeVisible();
			await footerLink.click();
			await expect(page).toHaveURL(/\/bestimmungshilfe$/);
		});
	});

	/**
	 * Regressionsschutz für die Variante: Im Formular muss die Hilfe weiterhin
	 * zugeklappt starten. Sonst schiebt sich ein 500-Zeilen-Panel zwischen das
	 * Tierart-Feld und alles darunter.
	 */
	test('bleibt im Formular zugeklappt', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByText('Wal oder Robbe?')).toHaveCount(0);
	});
});
