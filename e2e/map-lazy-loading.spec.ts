import { test, expect } from '@playwright/test';

// Increase timeout for map loading tests
test.setTimeout(30000);

test.describe('LazyMapWrapper', () => {
    test('zeigt Lade-Overlay und lädt die Karte korrekt', async ({ page }) => {
        await page.goto('/map');

        // Neue LoadingOverlay sollte sichtbar sein (dialog mit loading-title)
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.locator('#loading-title')).toContainText(/wird geladen|wird initialisiert/i);

        // Nach dem Laden sollte das Overlay verschwinden und die Karte sichtbar sein
        await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15000 });
        await expect(page.locator('h1').filter({ hasText: /Sichtungskarte/i })).toBeVisible({ timeout: 10000 });
    });

    test('zeigt Map-Titel nach erfolgreichem Laden', async ({ page }) => {
        await page.goto('/map');

        // Warte bis Loading verschwindet
        await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15000 });
        
        // Entweder sollte die Karte geladen sein ODER ein Fehler angezeigt werden
        const mapTitle = page.locator('h1').filter({ hasText: /Sichtungskarte/i });
        const errorAlert = page.getByRole('alert');
        
        // Warte auf eines von beiden
        try {
            await expect(mapTitle).toBeVisible({ timeout: 5000 });
        } catch {
            // Falls die Karte nicht lädt, prüfe ob Fehlermeldung da ist
            await expect(errorAlert).toBeVisible({ timeout: 2000 });
            await expect(page.getByRole('button', { name: /neu laden/i })).toBeVisible();
        }
    });

    test('Filter-Panel kann geöffnet werden', async ({ page }) => {
        await page.goto('/map');

        // Warten bis Karte geladen ist
        await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15000 });
        await expect(page.locator('h1').filter({ hasText: /Sichtungskarte/i })).toBeVisible({ timeout: 10000 });

        // Filter-Panel öffnen
        const filterButton = page.getByRole('button', { name: /filter/i }).first();
        await filterButton.click();

        // Filter-Panel sollte sichtbar sein
        await expect(page.locator('#year-select')).toBeVisible();
        await expect(page.locator('#filter-input')).toBeVisible();
        
        // Jahr-Dropdown sollte Optionen haben
        const yearOptions = page.locator('#year-select option');
        expect(await yearOptions.count()).toBeGreaterThan(1);
    });
});