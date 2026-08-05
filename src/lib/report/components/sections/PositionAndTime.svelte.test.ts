import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';
import type { SightingFormData } from '$lib/types';
import PositionAndTime from './PositionAndTime.svelte';

/**
 * Deckt Befund 1 aus dem Task-6-Review ab: `DateTime.svelte` gehört
 * ausschließlich der Admin-Maske (`AdminSightingEditForm.svelte`) — der
 * Bürger sieht auf Schritt 1 diese Karte hier. Ein reiner Funktionstest auf
 * `dateSectionTitle()` (siehe `wording.test.ts`) hätte die falsche Verdrahtung
 * nicht bemerkt, weil er nie rendert, was der Melder tatsächlich sieht.
 *
 * Verbindliche Entscheidung des Auftraggebers: Der Lebend-Zweig behält
 * wörtlich „Datum und Uhrzeit" — deshalb hier eine Gegenprobe für BEIDE
 * Zweige, nicht nur für den Totfund.
 */
function renderPositionAndTime(overrides: Partial<SightingFormData> = {}): void {
	renderWithFormContext(PositionAndTime, { overrides });
}

describe('PositionAndTime — Kartentitel der Datumskarte am Zweig (Bürgerformular)', () => {
	it('zeigt beim Lebend-Zweig weiterhin „Datum und Uhrzeit"', async () => {
		renderPositionAndTime({ isDead: false });

		await expect
			.element(page.getByRole('heading', { name: 'Datum und Uhrzeit', exact: true }))
			.toBeVisible();
	});

	it('zeigt beim Totfund „Funddatum" statt „Datum und Uhrzeit"', async () => {
		renderPositionAndTime({ isDead: true });

		await expect
			.element(page.getByRole('heading', { name: 'Funddatum', exact: true }))
			.toBeVisible();
	});
});
