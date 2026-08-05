import { expect, test } from '@playwright/test';

test.describe('Einstiegsseite des Meldeformulars', () => {
	test('Erstbesucher sieht die Auswahl und kommt ohne sie nicht weiter', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByTestId('report-kind-choice')).toBeVisible();
		await expect(page.getByTestId('report-kind-submit')).toHaveAttribute('aria-disabled', 'true');
	});

	test('nach der Auswahl erscheint Schritt 1', async ({ page }) => {
		await page.goto('/');
		// Wie FormPage.goto(): Playwrights Actionability-Check wartet nur auf
		// Sichtbarkeit, nicht auf Hydration. Das radio's native `checked`
		// springt sonst an, bevor Sveltes `onchange` überhaupt verdrahtet ist —
		// die Auswahl bliebe dann unbemerkt und „Weiter" gesperrt.
		await page.waitForLoadState('networkidle');
		await page.getByRole('radio', { name: /toten Tieres/i }).check();
		await page.getByTestId('report-kind-submit').click();
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();
		// toBeHidden() allein wäre auch für ein gar nicht existentes Element
		// erfüllt — erst diese Zeile belegt, dass tatsächlich Schritt 1 da ist.
		await expect(page.getByRole('heading', { name: 'Position & Zeitpunkt' })).toBeVisible();
	});

	test('der Direktlink überspringt die Auswahl', async ({ page }) => {
		await page.goto('/?meldung=totfund');
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();
		await expect(page.getByRole('heading', { name: 'Position & Zeitpunkt' })).toBeVisible();
	});

	test('Totfund-Wahl kommt als isDead im Formular an', async ({ page }) => {
		// Der fachliche Zweck der ganzen Verzweigung: Die Auswahl auf der
		// Einstiegsseite muss als `isDead` im Formular ankommen, nicht nur
		// irgendeine Seite hinter der Auswahl anzeigen.
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.getByRole('radio', { name: /toten Tieres/i }).check();
		await page.getByTestId('report-kind-submit').click();

		// Schritt 1: ohne GPS-Position ist die Ortsbeschreibung Pflicht.
		await page.getByTestId('field-waterway').fill('Kieler Bucht');
		await page.getByRole('button', { name: /Nächster Schritt/i }).click();

		// Schritt 2: Der Totfund-Block (`DeadAnimal.svelte`) rendert
		// ausschließlich innerhalb von `{#if $form.isDead}` — sichtbar genau
		// dann, wenn die Wahl „Totfund" tatsächlich als `isDead` ankam.
		await expect(page.getByTestId('field-deadCondition')).toBeVisible();
	});

	test('Browser-Zurück führt auf die Auswahl, nicht aus der App', async ({ page }) => {
		// Ohne History-Eintrag verließe „Zurück" die Anwendung — im iframe
		// navigiert das die Museumsseite weg.
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.getByRole('radio', { name: /lebenden Tieres/i }).check();
		await page.getByTestId('report-kind-submit').click();
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();

		await page.goBack();
		await expect(page.getByTestId('report-kind-choice')).toBeVisible();

		// Browser-Vorwärts muss den Zweig aus der URL zurückholen — der
		// `popstate`-Handler ist bidirektional, nicht nur „kein Parameter →
		// Auswahl zeigen".
		await page.goForward();
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();
		await expect(page.getByRole('heading', { name: 'Position & Zeitpunkt' })).toBeVisible();
	});

	test('Wiederkehrer mit gespeichertem Stand wird nicht erneut gefragt', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.getByRole('radio', { name: /lebenden Tieres/i }).check();
		await page.getByTestId('report-kind-submit').click();
		await page.reload();
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();
		await expect(page.getByRole('heading', { name: 'Position & Zeitpunkt' })).toBeVisible();
	});

	/**
	 * Review-Befund 2 (Task 7): Der vierte Hop der Durchreich-Kette
	 * (`+page.svelte` → `ModernReportForm` → `Step2SightingDetails` →
	 * `AnimalInfo`) hatte keinen Test, der rot wird, wenn `onchangekind` an
	 * irgendeiner Stelle nicht mehr durchgereicht wird. Dieser Test fährt die
	 * volle Strecke bis zum Klick.
	 */
	test('„Ändern" auf Schritt 2 führt zurück auf die Auswahlseite', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.getByRole('radio', { name: /lebenden Tieres/i }).check();
		await page.getByTestId('report-kind-submit').click();
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();

		// Schritt 1 → Schritt 2, wie im Test „Totfund-Wahl kommt als isDead an".
		await page.getByTestId('field-waterway').fill('Kieler Bucht');
		await page.getByRole('button', { name: /Nächster Schritt/i }).click();
		await expect(page.getByText(/Sie melden/i)).toBeVisible();

		await page.getByRole('button', { name: /ändern/i }).click();

		await expect(page.getByTestId('report-kind-choice')).toBeVisible();
	});

	/**
	 * Review-Befund 1 (Task 7): `resolveReportKind` hat eine DRITTE Quelle
	 * neben Query-Parameter und gespeichertem Zweig — `isDead` aus den
	 * persistierten Formulardaten. `ModernReportForm` schreibt `isDead` bereits
	 * beim bloßen Öffnen des Formulars dorthin. Ein „Ändern", das nur den
	 * Query-Parameter und den gespeicherten Zweig räumt, fällt bei einem Reload
	 * über diese dritte Quelle sofort in den verlassenen Zweig zurück — bevor
	 * eine neue Auswahl getroffen wurde. Der Doc-Kommentar an `changeKind()`
	 * versprach das Gegenteil.
	 */
	test('„Ändern" hält auch nach einem Reload — die Auswahlseite bleibt stehen', async ({
		page
	}) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.getByRole('radio', { name: /toten Tieres/i }).check();
		await page.getByTestId('report-kind-submit').click();
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();

		await page.getByTestId('field-waterway').fill('Kieler Bucht');
		await page.getByRole('button', { name: /Nächster Schritt/i }).click();
		await expect(page.getByText(/Sie melden/i)).toBeVisible();

		await page.getByRole('button', { name: /ändern/i }).click();
		await expect(page.getByTestId('report-kind-choice')).toBeVisible();

		await page.reload();
		// Der Server rendert die Auswahlseite bei jedem Reload ohnehin erst kurz
		// (er kennt `localStorage`/`sessionStorage` nicht) — die eigentliche
		// Aussage steckt im Zustand NACH der Hydration, wenn der Client die
		// Storage-Quellen nachträgt. Ohne das Warten bestünde der Test allein
		// durch diesen kurzen SSR-Flash, unabhängig vom eigentlichen Fehler.
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('report-kind-choice')).toBeVisible();
	});
});
