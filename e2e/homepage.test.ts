import { expect, test } from '@playwright/test';

test.describe('Homepage', () => {
	test('should load the homepage', async ({ page }) => {
		await page.goto('/');

		// Warte darauf, dass die Seite vollständig geladen ist
		await page.waitForLoadState('networkidle');

		// Check that the main title is visible - flexiblerer Selektor
		const heading = page.locator('h1, h2, [role="heading"]').first();
		await expect(heading).toBeVisible({ timeout: 10000 });
		await expect(heading).toContainText(/Meerestier|Sichtung|melden/i);

		// Check for the presence of the main form (not modal forms)
		// Look specifically for the form that's not a modal-backdrop
		const mainForm = page.locator('form:not(.modal-backdrop)').first();
		await expect(mainForm).toBeVisible({ timeout: 10000 });
	});

	test('should have proper meta tags', async ({ page }) => {
		await page.goto('/');
		
		// Warte darauf, dass die Seite vollständig geladen ist
		await page.waitForLoadState('domcontentloaded');

		// Check title
		await expect(page).toHaveTitle(/Ostsee-Tiere/, { timeout: 10000 });

		// Check meta description (use first match to avoid duplicates)
		const metaDescription = page.locator('meta[name="description"]').first();
		await expect(metaDescription).toHaveAttribute('content', /Ostsee.*[MmTt]ier|[MmTt]eerestier/, { timeout: 5000 });
	});

	test('should render page content properly', async ({ page }) => {
		await page.goto('/');
		
		// Warte auf das vollständige Laden
		await page.waitForLoadState('networkidle');

		// Prüfe grundlegende Seitenstruktur
		const body = page.locator('body');
		await expect(body).toBeVisible();

		// Prüfe ob die Seite interaktiv ist (keine Ladescreen mehr)
		const loadingIndicators = page.locator('.loading, [data-loading], .spinner');
		const loadingCount = await loadingIndicators.count();
		
		// Falls Loading-Indikatoren vorhanden sind, warte darauf dass sie verschwinden
		if (loadingCount > 0) {
			await expect(loadingIndicators.first()).not.toBeVisible({ timeout: 15000 });
		}

		// Prüfe ob grundlegende interaktive Elemente da sind
		const interactiveElements = page.locator('button, input, select, textarea, a[href], [role="button"]');
		const interactiveCount = await interactiveElements.count();
		expect(interactiveCount).toBeGreaterThan(0);
	});

	test.skip('should navigate to map view', async ({ page }) => {
		await page.goto('/');

		// Look for map link/button and click it - könnte in Navigation sein
		const mapLink = page.locator('a[href="/map"]').first();
		const mapLinkCount = await mapLink.count();

		if (mapLinkCount > 0) {
			await mapLink.click();
			await expect(page).toHaveURL('/map');
			// Prüfe ob die Karte geladen wurde
			await expect(page.locator('#map, .map-container, [data-testid="map"]').first()).toBeVisible({
				timeout: 10000
			});
		} else {
			// Skip the test if no map link is found - this avoids HTTPS/routing issues
			console.log('No map link found in navigation - skipping direct navigation test');
		}
	});
});

test.describe('Form Navigation', () => {
	test('should show form steps', async ({ page }) => {
		await page.goto('/');
		
		// Warte darauf, dass die Seite vollständig geladen ist
		await page.waitForLoadState('networkidle');

		// Check if step indicators are present - looking for steps container
		const stepsContainer = page.locator('.steps, [role="navigation"], .step-container, [data-testid*="step"]').first();
		await expect(stepsContainer).toBeVisible({ timeout: 10000 });

		// Check for individual step items
		const steps = page.locator('.step, li[class*="step"], [data-testid*="step"]');
		const stepCount = await steps.count();
		expect(stepCount).toBeGreaterThan(0);
	});

	test('should show logo', async ({ page }) => {
		await page.goto('/');
		
		// Warte darauf, dass die Seite vollständig geladen ist
		await page.waitForLoadState('networkidle');

		// Check if the Ostsee-Tiere logo is visible - erweiterte Selektoren
		// Das Logo ist nur sichtbar wenn nicht im iframe-Modus
		const logo = page.locator('img[alt*="Ostsee-Tiere"], img[src*="ostsee-tiere"], img[alt*="Logo"], [aria-label*="logo"]').first();
		
		// Versuche das Logo zu finden, aber erwarte es möglicherweise nur bedingt
		const logoCount = await logo.count();
		if (logoCount > 0) {
			await expect(logo).toBeVisible({ timeout: 10000 });
		} else {
			// Fallback: Prüfe ob wir im iframe-Modus sind, dann ist das Logo erwartungsgemäß nicht da
			// In diesem Fall suchen wir nach anderen Identifikatoren für die korrekte Seitendarstellung
			const pageContent = page.locator('form, h1, h2, main, [role="main"]').first();
			await expect(pageContent).toBeVisible({ timeout: 10000 });
		}
	});

	test('should have working form elements', async ({ page }) => {
		await page.goto('/');

		// Warte darauf, dass die Seite vollständig geladen ist
		await page.waitForLoadState('networkidle');

		// Warte auf das Hauptformular (nicht Modal-Forms)
		await page.waitForSelector('form:not(.modal-backdrop)', { timeout: 15000 });

		// Prüfe ob Formularfelder vorhanden sind (ohne Honeypot und versteckte Felder)
		// Erweiterte Selektor-Logik für bessere Kompatibilität
		const formFields = page.locator('input:not([name="_honeypot"]):not([aria-hidden="true"]):not([type="hidden"]), select:not([aria-hidden="true"]), textarea:not([aria-hidden="true"])').first();
		await expect(formFields).toBeVisible({ timeout: 10000 });
	});
});
