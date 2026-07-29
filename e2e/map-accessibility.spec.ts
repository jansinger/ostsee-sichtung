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

	test('Tastatur-Shortcut H öffnet Hilfe-Modal (bei fokussierter Karte)', async () => {
		// H7: Zeichen-Shortcuts wirken nur bei Fokus in der Karten-Region
		await mapPage.getMapContainer().focus();
		await sharedPage.keyboard.press('h');

		const dialog = sharedPage.getByRole('dialog', { name: /tastaturkürzel/i });
		await expect(dialog).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
		await sharedPage.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
	});

	test('Tastatur-Shortcut ? öffnet Hilfe-Modal', async () => {
		await mapPage.getMapContainer().focus();
		await sharedPage.keyboard.press('?');

		const dialog = sharedPage.getByRole('dialog', { name: /tastaturkürzel/i });
		await expect(dialog).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
		await sharedPage.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
	});

	test('Escape schließt Hilfe-Modal', async () => {
		await mapPage.getMapContainer().focus();
		await sharedPage.keyboard.press('h');
		const dialog = sharedPage.getByRole('dialog', { name: /tastaturkürzel/i });
		await expect(dialog).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });

		await sharedPage.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
	});

	test('ESC schließt offenes Filter-Panel', async () => {
		await mapPage.openFilter();
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', false);

		await sharedPage.keyboard.press('Escape');
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', true);
	});

	test('ESC schließt offene Legende', async () => {
		await mapPage.openLegend();
		await expect(mapPage.getLegendPanel()).toHaveJSProperty('inert', false);

		await sharedPage.keyboard.press('Escape');
		await expect(mapPage.getLegendPanel()).toHaveJSProperty('inert', true);
	});

	// ─── Befund H5: ARIA-Semantik der Seitenpanels ─────────────────────────────

	test('Panels sind nicht-modale Regionen, Toggles tragen aria-expanded/aria-controls', async () => {
		// Nicht-modales Seitenpanel: role="region" statt Fake-Dialog
		await expect(mapPage.getFilterPanel()).toHaveAttribute('role', 'region');
		await expect(mapPage.getFilterPanel()).not.toHaveAttribute('aria-modal', 'true');
		await expect(mapPage.getLegendPanel()).toHaveAttribute('role', 'region');
		await expect(mapPage.getLegendPanel()).not.toHaveAttribute('aria-modal', 'true');

		// Zustand hängt am Toggle-Button, nicht an aria-hidden am Panel
		await expect(mapPage.getFilterToggle()).toHaveAttribute('aria-expanded', 'false');
		await expect(mapPage.getFilterToggle()).toHaveAttribute('aria-controls', 'filter-panel');
		await mapPage.openFilter();
		await expect(mapPage.getFilterToggle()).toHaveAttribute('aria-expanded', 'true');
		await sharedPage.keyboard.press('Escape');
		await expect(mapPage.getFilterToggle()).toHaveAttribute('aria-expanded', 'false');
	});

	test('Geschlossene Panels sind inert — kein Element im Tab-Zyklus (WCAG 4.1.2)', async () => {
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', true);

		// Fokusversuch auf ein Element im geschlossenen Panel darf nicht greifen
		const focusable = await mapPage.getYearSelect().evaluate((el) => {
			(el as HTMLSelectElement).focus();
			return document.activeElement === el;
		});
		expect(focusable).toBe(false);
	});

	test('Fokus wandert beim Öffnen ins Panel und beim Schließen zurück zum Toggle', async () => {
		await mapPage.openFilter();
		await expect
			.poll(async () => sharedPage.evaluate(() => document.activeElement?.id))
			.toBe('filter-title');

		await mapPage.closeFilter();
		const toggleFocused = await mapPage
			.getFilterToggle()
			.evaluate((el) => document.activeElement === el);
		expect(toggleFocused).toBe(true);
	});

	// ─── Befund H7: Einzeltasten-Shortcuts nur bei Fokus in der Karte ──────────

	test('F-Shortcut wirkt nicht, wenn der Fokus außerhalb der Karte liegt (WCAG 2.1.4)', async () => {
		// Fokus auf ein Element außerhalb der Karten-Region legen
		await sharedPage.getByRole('button', { name: /Tastatur-Hilfe anzeigen/i }).focus();
		await sharedPage.keyboard.press('f');

		// Panel bleibt zu — der Shortcut darf hier nicht feuern
		await expect(mapPage.getFilterToggle()).toHaveAttribute('aria-expanded', 'false');
	});

	test('F-Shortcut öffnet das Filter-Panel bei fokussierter Karte', async () => {
		await mapPage.getMapContainer().focus();
		await sharedPage.keyboard.press('f');

		await expect(mapPage.getFilterToggle()).toHaveAttribute('aria-expanded', 'true');
		await sharedPage.keyboard.press('Escape');
		await expect(mapPage.getFilterToggle()).toHaveAttribute('aria-expanded', 'false');
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
