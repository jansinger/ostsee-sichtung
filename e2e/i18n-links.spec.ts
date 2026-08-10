import { expect, test } from '@playwright/test';

/**
 * Task 8: Interne Verweise müssen die Sprache mitnehmen.
 *
 * Ohne lokalisierte `href`s zeigt auf `/en` jeder interne Link weiter auf die
 * deutschen Pfade — der Nutzer fällt beim ersten Klick zurück auf Deutsch. Im
 * iframe auf meeresmuseum.de gibt es keine Navigation, über die er zurückfände
 * (Navbar/Footer sind dort ausgeblendet), also ist das kein kosmetischer
 * Befund, sondern macht `/en` unbenutzbar.
 *
 * Review-Fund (Critical): Der erste Test hier deckte nur den `href` der
 * Navbar ab — er blieb grün, wenn `localizeHref` aus `reportKindHref()` oder
 * `returnToSelection()` in `src/routes/+page.svelte` entfernt wurde. Genau
 * dort saßen zwei echte Lücken: Der `$effect`, der den aus dem Storage
 * aufgelösten Zweig in die URL nachträgt, feuerte ohne jede Nutzeraktion und
 * schrieb `/en/` still auf `/` zurück; „Ändern"/„Formular zurücksetzen"
 * (`returnToSelection()`) taten dasselbe beim Rücksprung zur Auswahlseite.
 * Die Tests unten fahren beide Pfade tatsächlich.
 */
test.describe('Sprache bleibt bei interner Navigation erhalten', () => {
	test('bleibt beim Navigieren in der englischen Fassung', async ({ page }) => {
		await page.goto('/en');
		await page
			.getByRole('link', { name: /map|karte/i })
			.first()
			.click();
		// Nicht nur das Präfix: Ein `localizeHref` ohne Ziel-Pfad (z. B. ein
		// Tippfehler, der `/map` verliert) wäre gegen `/\/en\//` allein
		// unauffällig geblieben.
		await expect(page).toHaveURL(/\/en\/map$/);
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	});

	/**
	 * Deckt den `$effect` in `+page.svelte` ab, der den aus dem Storage
	 * aufgelösten Zweig ohne Nutzeraktion in die URL nachträgt — den einen der
	 * beiden Critical-Fund-Stellen. Ein zweiter `goto('/en')` ohne `meldung`
	 * simuliert den Wiederkehrer, dessen Zweig ausschließlich aus
	 * `sessionStorage` kommt (Lesezeichen, iframe-Reload).
	 */
	test('der aus dem Storage nachgetragene Zweig behält das Sprachpräfix', async ({ page }) => {
		await page.goto('/en');
		await page.waitForLoadState('networkidle');
		await page.getByTestId('report-kind-option-totfund').click();
		await expect(page).toHaveURL(/\/en\/\?meldung=totfund/);

		await page.goto('/en');
		await page.waitForLoadState('networkidle');

		// Der Effekt trägt den gespeicherten Zweig nach — und zwar unter `/en/`,
		// nicht unter `/`. Vor der Korrektur sprang die URL hier auf
		// `/?meldung=totfund` zurück.
		await expect(page).toHaveURL(/\/en\/\?meldung=totfund/);
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();
	});

	/**
	 * Deckt die zweite Critical-Fund-Stelle ab: `returnToSelection()`, verdrahtet
	 * hinter „Ändern" (`changeKind()`). Fährt dieselbe Strecke wie
	 * `e2e/report-kind-choice.spec.ts` → „Ändern auf Schritt 2 führt zurück auf
	 * die Auswahlseite", aber unter `/en` und mit Prüfung auf das Sprachpräfix.
	 */
	test('„Ändern" hält das Sprachpräfix beim Rücksprung zur Auswahlseite', async ({ page }) => {
		await page.goto('/en');
		await page.waitForLoadState('networkidle');
		await page.getByTestId('report-kind-option-lebend').click();
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();

		await page.getByTestId('field-waterway').fill('Kieler Bucht');
		await page.getByRole('button', { name: /Next step|Nächster Schritt/i }).click();
		await page.getByRole('button', { name: /change|ändern/i }).click();

		await expect(page.getByTestId('report-kind-choice')).toBeVisible();
		await expect(page).toHaveURL(/\/en\//);
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	});

	/**
	 * Query-Erhalt unter Lokalisierung — bisher nirgends testgedeckt (Review-
	 * Fund). `ReportKindChoice.svelte.test.ts` prüft nur einen von Hand
	 * übergebenen `buildHref` und fasst `reportKindHref()` selbst nie an; genau
	 * dort saß der ungetestete Query-Verlust, den Auflage 2 des Tasks verlangte.
	 * `campaign` steht stellvertretend für einen Kampagnen-Marker aus einem
	 * Museums-Link (Kommentar an `reportKindHref()`).
	 */
	test('Kampagnen-Parameter bleiben unter /en beim Zweig-Wechsel erhalten', async ({ page }) => {
		await page.goto('/en/?campaign=museum');
		await page.waitForLoadState('networkidle');

		await page.getByTestId('report-kind-option-lebend').click();

		await expect(page).toHaveURL(/\/en\/\?/);
		const url = new URL(page.url());
		expect(url.searchParams.get('campaign')).toBe('museum');
		expect(url.searchParams.get('meldung')).toBe('lebend');
	});
});
