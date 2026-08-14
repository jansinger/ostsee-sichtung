import { expect, test } from '@playwright/test';

/**
 * accessibility-statement.spec.ts — die Erklärung zur Barrierefreiheit existiert
 * und ist auffindbar.
 *
 * **Warum es die Seite gibt:** Das Deutsche Meeresmuseum ist eine öffentliche
 * Stelle in M-V; für öffentlich zugängliche Web-Angebote verlangen § 14 LBGG M-V
 * und die BITVO M-V (Umsetzung der EU-Richtlinie 2016/2102) neben der
 * Barrierefreiheit selbst eine **Erklärung zur Barrierefreiheit** mit
 * Feedback-Mechanismus und Hinweis auf das Durchsetzungsverfahren. Wie bei
 * Impressum und Datenschutz (siehe Kommentar in `PublicFooter.svelte`) deckt
 * die iframe-Einbettung auf meeresmuseum.de die Pflicht unter eigener Domain
 * nicht ab — die Erklärung muss in der App selbst stehen und beschreibt deren
 * konkreten Stand, nicht den der Museums-Hauptseite.
 *
 * Der Test prüft die drei Pflicht-Bausteine (Stand der Vereinbarkeit,
 * Feedback-Kontakt, Durchsetzungsverfahren) über sichtbare Inhalte und die
 * Auffindbarkeit über den Footer — nicht den Wortlaut, der darf sich ändern.
 */

test.describe('Erklärung zur Barrierefreiheit', () => {
	test('Seite existiert und trägt die drei Pflicht-Bausteine', async ({ page }) => {
		await page.goto('/barrierefreiheit');

		await expect(
			page.getByRole('heading', { level: 1, name: /Erklärung zur Barrierefreiheit/i })
		).toBeVisible();

		// Stand der Vereinbarkeit (EU-Mustererklärung: vollständig/teilweise/nicht vereinbar)
		await expect(
			page.getByRole('heading', { level: 2, name: /Stand der Vereinbarkeit/i })
		).toBeVisible();
		await expect(page.getByText(/teilweise vereinbar/i).first()).toBeVisible();

		// Feedback-Mechanismus: erreichbarer Kontakt für Barriere-Meldungen
		const feedbackLink = page.locator('a[href^="mailto:sichtungen@meeresmuseum.de"]');
		await expect(feedbackLink).toBeVisible();

		// Durchsetzungsverfahren: die Überwachungsstelle M-V ist benannt
		await expect(page.getByText(/Überwachungsstelle/i).first()).toBeVisible();
	});

	test('englische Fassung ist über den Sprachpräfix erreichbar', async ({ page }) => {
		await page.goto('/en/barrierefreiheit');

		await expect(
			page.getByRole('heading', { level: 1, name: /Accessibility statement/i })
		).toBeVisible();
	});

	test('Footer verlinkt die Erklärung in der Gruppe „Rechtliches"', async ({ page }) => {
		await page.goto('/?meldung=lebend');

		const rechtliches = page.locator('footer nav', { has: page.locator('#footer-rechtliches') });
		const link = rechtliches.getByRole('link', { name: /Barrierefreiheit/i });
		await expect(link).toBeVisible();

		await link.click();
		await expect(
			page.getByRole('heading', { level: 1, name: /Erklärung zur Barrierefreiheit/i })
		).toBeVisible();
	});
});
