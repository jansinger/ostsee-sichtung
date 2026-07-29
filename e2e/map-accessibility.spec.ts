import { expect, test, type Page } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { MAP_TEST_TIMEOUTS } from './config/testTimeouts';
import { setupMapPage } from './fixtures/mapSetup';

test.describe.serial('Map Accessibility', () => {
	let mapPage: MapPage;
	let sharedPage: Page;

	test.beforeAll(async ({ browser }) => {
		sharedPage = await browser.newPage();
		mapPage = await setupMapPage(sharedPage);
	});

	test.afterAll(async () => {
		await sharedPage.close();
	});

	test('Karten-Container hat role="application"', async () => {
		await expect(mapPage.getMapContainer()).toHaveAttribute('role', 'application');
	});

	test('Karten-Container hat aria-label mit Sichtungskarte', async () => {
		const label = await mapPage.getMapContainer().getAttribute('aria-label');
		expect(label).toMatch(/Sichtungskarte/i);
	});

	test('Tastatur-Shortcut H öffnet Hilfe-Modal', async () => {
		await sharedPage.locator('body').click();
		await sharedPage.keyboard.press('h');

		const dialog = sharedPage.getByRole('dialog', { name: /tastaturkürzel/i });
		await expect(dialog).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
		await sharedPage.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
	});

	test('Tastatur-Shortcut ? öffnet Hilfe-Modal', async () => {
		await sharedPage.locator('body').click();
		await sharedPage.keyboard.press('?');

		const dialog = sharedPage.getByRole('dialog', { name: /tastaturkürzel/i });
		await expect(dialog).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
		await sharedPage.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
	});

	test('Escape schließt Hilfe-Modal', async () => {
		await sharedPage.locator('body').click();
		await sharedPage.keyboard.press('h');
		const dialog = sharedPage.getByRole('dialog', { name: /tastaturkürzel/i });
		await expect(dialog).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });

		await sharedPage.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
	});

	test('ESC schließt offenes Filter-Panel', async () => {
		await mapPage.openFilter();
		await expect(mapPage.getFilterPanel()).toHaveAttribute('aria-hidden', 'false');

		await sharedPage.locator('body').click();
		await sharedPage.keyboard.press('Escape');
		await expect(mapPage.getFilterPanel()).toHaveAttribute('aria-hidden', 'true');
	});

	test('ESC schließt offene Legende', async () => {
		await mapPage.openLegend();
		await expect(mapPage.getLegendPanel()).toHaveAttribute('aria-hidden', 'false');

		await sharedPage.locator('body').click();
		await sharedPage.keyboard.press('Escape');
		await expect(mapPage.getLegendPanel()).toHaveAttribute('aria-hidden', 'true');
	});

	// ─── Befund K3: Barrierefreie Sichtungskarte ───────────────────────────────

	test('Karten-Container ist per Tastatur fokussierbar (tabindex=0)', async () => {
		await expect(mapPage.getMapContainer()).toHaveAttribute('tabindex', '0');
	});

	test('Skip-Link "Karte überspringen" ist vorhanden und springt hinter die Karte', async () => {
		const skipLink = sharedPage.getByRole('link', { name: /Karte überspringen/i });
		await expect(skipLink).toHaveCount(1);

		// Der Link ist sr-only — Existenz und Ziel-Anker prüfen
		const href = await skipLink.getAttribute('href');
		expect(href).toMatch(/^#.+/);

		// Das Sprungziel hinter der Karte muss im DOM existieren
		const target = sharedPage.locator(`[id="${href?.slice(1)}"]`);
		await expect(target).toHaveCount(1);
	});

	test('Umschalter Karte/Liste zeigt Tabellenansicht', async () => {
		await sharedPage.getByRole('button', { name: /Liste/i }).click();

		// Datenlage unbekannt: entweder eine Tabelle mit Einträgen oder der
		// Leer-Zustand mit role="status" ("Keine Sichtungen") ist akzeptabel.
		const tableOrEmptyState = sharedPage
			.getByRole('table')
			.or(sharedPage.getByRole('status').filter({ hasText: /Keine Sichtungen/i }));
		await expect(tableOrEmptyState.first()).toBeVisible();

		// Zurück zur Kartenansicht wechseln
		await sharedPage.getByRole('button', { name: /^Karte$/ }).click();
		await expect(mapPage.getMapContainer()).toBeVisible();
	});

	test('Listenansicht nimmt die Karte samt Controls aus der Fokus-Reihenfolge (inert)', async () => {
		await sharedPage.getByRole('button', { name: /Liste/i }).click();

		// aria-hidden allein würde die OL-Controls (Zoom-Buttons) fokussierbar
		// lassen — WCAG-4.1.2-Fail (axe „aria-hidden-focus"). inert entfernt
		// Fokus- und AT-Erreichbarkeit für den ganzen Subtree.
		await expect(mapPage.getMapContainer()).toHaveAttribute('inert', '');
		const zoomInButton = sharedPage.locator('.ol-zoom-in');
		const focusable = await zoomInButton.evaluate((el) => {
			(el as HTMLButtonElement).focus();
			return document.activeElement === el;
		});
		expect(focusable).toBe(false);

		await sharedPage.getByRole('button', { name: /^Karte$/ }).click();
		await expect(mapPage.getMapContainer()).not.toHaveAttribute('inert', '');
	});

	test('Karten-Container behält role=application nur mit Tastaturbedienbarkeit', async () => {
		const container = mapPage.getMapContainer();

		// role="application" ohne Tastaturzugang wäre eine A11y-Falle —
		// beide Attribute müssen gemeinsam vorhanden sein.
		await expect(container).toHaveAttribute('role', 'application');
		await expect(container).toHaveAttribute('tabindex', '0');
	});
});
