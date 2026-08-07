/**
 * @fileoverview Technik-Karte der Bearbeitungsmaske zeigt den abgeleiteten
 * Status (Task 8, Nachtrag).
 *
 * Die Maske zeigte hier bisher „Verifiziert: Ja/Nein" — eine Lesestelle von
 * `sighting.verified`, die Task 9 (Guard gegen genau diese Lesestelle) sonst
 * blockiert hätte — und separat „Freigegeben am …". Beides ersetzt eine
 * einzelne Statuszeile aus der gemeinsamen Quelle `sightingStatus.ts`, wie in
 * der Metazeile von `AdminSightingView.svelte`.
 */
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import AdminSightingEditForm from './AdminSightingEditForm.svelte';
import { SIGHTING_STATUS_PRESENTATION } from './sightingStatus';
import type { FrontendSighting } from '$lib/types';

function baseSighting(overrides: Record<string, unknown> = {}): FrontendSighting {
	return {
		id: 1,
		species: 0,
		totalCount: 1,
		sightingDate: new Date('2026-07-30T10:00:00Z'),
		created: new Date('2026-07-30T09:00:00Z'),
		verified: false,
		approvedAt: null,
		rejectedAt: null,
		rejectedBy: null,
		uploadedFiles: [],
		...overrides
	} as unknown as FrontendSighting;
}

describe('AdminSightingEditForm — Technik-Karte', () => {
	it('zeigt den abgeleiteten Status statt „Verifiziert" und keine Bedienelemente', async () => {
		render(AdminSightingEditForm, {
			sighting: baseSighting(),
			onSave: vi.fn(),
			onCancel: vi.fn()
		});

		expect(document.body.textContent).not.toContain('Verifiziert');
		await expect
			.element(page.getByText(SIGHTING_STATUS_PRESENTATION.open.label, { exact: true }))
			.toBeVisible();
		// Die Maske bearbeitet Sachdaten — der Status ändert sich in Tabelle
		// oder Detailansicht, nicht hier.
		expect(page.getByRole('radiogroup', { name: /status/i }).elements()).toHaveLength(0);
	});

	it('zeigt den Freigabe-Zeitpunkt bei freigegebenen Sichtungen', async () => {
		render(AdminSightingEditForm, {
			sighting: baseSighting({ approvedAt: new Date('2026-03-12T09:00:00Z') }),
			onSave: vi.fn(),
			onCancel: vi.fn()
		});

		await expect
			.element(page.getByText(SIGHTING_STATUS_PRESENTATION.approved.label, { exact: true }))
			.toBeVisible();
		expect(document.body.textContent).toContain('Freigegeben am');
	});

	it('zeigt Zeitpunkt und Bearbeiter bei abgelehnten Sichtungen', async () => {
		render(AdminSightingEditForm, {
			sighting: baseSighting({
				rejectedAt: new Date('2026-03-12T09:00:00Z'),
				rejectedBy: 'anna@example.org'
			}),
			onSave: vi.fn(),
			onCancel: vi.fn()
		});

		await expect
			.element(page.getByText(SIGHTING_STATUS_PRESENTATION.rejected.label, { exact: true }))
			.toBeVisible();
		expect(document.body.textContent).toContain('anna@example.org');
	});
});
