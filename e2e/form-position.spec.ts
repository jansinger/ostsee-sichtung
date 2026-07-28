import { test, expect } from '@playwright/test';
import { FormPage } from './pages/FormPage';

// ── Phase 4A → Task 8: PositionAndTime, Single-Panel-Positionseingabe ──────
//
// Die dreiteilige Methodenwahl (Foto/Karte/Beschreibung) ist entfallen
// (Task 7) — `PositionPanel` zeigt jetzt einen einzigen Weg: Foto-Upload
// prominent, darunter GPS-Button, aufklappbare Karte und Ortsbeschreibung,
// alle gleichzeitig erreichbar. Diese Tests decken das neue Verhalten über
// die stabilen `data-testid`-Hooks ab (kein Prosa-Matching, s. Task-8-Brief).

test.describe('PositionAndTime — Single-Panel-Positionseingabe', () => {
	test.beforeEach(async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();
	});

	test('Datum- und Uhrzeit-Felder sind immer sichtbar', async ({ page }) => {
		await expect(page.locator('[data-testid="field-sightingDate"]')).toBeVisible();
		await expect(page.locator('[data-testid="field-sightingTime"]')).toBeVisible();
	});

	test('zeigt den Foto-Weg prominent und ohne Methodenwahl', async ({ page }) => {
		await expect(page.locator('[data-testid="photo-position-card"]')).toBeVisible();

		// Die Methodenwahl ist ersatzlos entfallen.
		await expect(page.locator('#method-photo')).toHaveCount(0);
		await expect(page.locator('#method-map')).toHaveCount(0);
		await expect(page.locator('#method-manual')).toHaveCount(0);

		// Der Standort-Button ist im Startzustand sichtbar — er darf nicht in der
		// zugeklappten Karte verschwinden (Spec, Zustand A).
		await expect(page.locator('[data-testid="use-current-position"]')).toBeVisible();

		// Zustand C (Foto ohne GPS) ist nur nach einem Upload erreichbar — im
		// Startzustand darf der Block nicht existieren.
		await expect(page.locator('[data-testid="photo-no-gps"]')).toHaveCount(0);
	});

	test('Ortsbeschreibung ist ohne Moduswechsel erreichbar und Pflicht', async ({ page }) => {
		await expect(page.locator('[data-testid="field-waterway"]')).toBeVisible({ timeout: 3000 });
		await expect(page.locator('[data-testid="field-seaMark"]')).toBeVisible({ timeout: 3000 });

		// Ohne Koordinaten ist das Fahrwasser Pflicht — sichtbar am Sternchen
		// und semantisch an aria-required. Kein nachgestelltes ` input`: das
		// data-testid hängt bereits am Input (FieldRenderer.svelte:188).
		await expect(page.locator('[data-testid="field-waterway"]')).toHaveAttribute(
			'aria-required',
			'true'
		);
	});

	test('Karte ist initial zugeklappt und lässt sich öffnen', async ({ page }) => {
		const disclosure = page.locator('[data-testid="map-disclosure"]');
		await expect(disclosure).toBeVisible();
		// Korrektur ggü. Brief: ein zugeklapptes <details> ist selbst weiterhin
		// sichtbar (nur der Inhalt ist per content-visibility versteckt) — der
		// Zustand gehört ans `open`-Attribut, nicht an toBeVisible().
		await expect(disclosure).not.toHaveAttribute('open', '');

		// LocationInput (und damit die Koordinatenfelder-Disclosure) wird erst
		// gemountet, wenn die Karten-Disclosure offen ist
		// (PositionPanel.svelte: `{#if mapOpen}` im collapse-content). Vor dem
		// Öffnen existiert das Element also gar nicht.
		await expect(page.locator('[data-testid="coordinate-fields"]')).toHaveCount(0);

		await disclosure.locator('summary').click();
		await expect(disclosure).toHaveAttribute('open', '');

		// Die Koordinatenfelder liegen im Meldeformular hinter einer eigenen
		// Disclosure (collapsibleCoordinates={true}) — anders als in der Admin-
		// Maske. Sie existieren jetzt, sind aber selbst noch zugeklappt.
		const coordinateFields = page.locator('[data-testid="coordinate-fields"]');
		await expect(coordinateFields).toBeVisible();
		await expect(coordinateFields).not.toHaveAttribute('open', '');

		// Und lassen sich unabhängig von der Karten-Disclosure öffnen.
		await coordinateFields.locator('summary').click();
		await expect(coordinateFields).toHaveAttribute('open', '');
	});
});
