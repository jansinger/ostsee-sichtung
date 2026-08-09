import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';
import type { SightingSelect } from '$lib/server/db/schema';
import type { PageData } from './$types';

/**
 * activeFilters.svelte.test.ts — der Puffer im Panel ist noch kein Filter.
 *
 * Gegenstück zu `activeFilters.test.ts`, das die reine Ableitung aus der URL
 * prüft: Hier hängt die Verdrahtung dran. Ein ins Panel getipptes Datum, das
 * nicht angewendet wurde, darf die Filter-Schaltfläche nicht markieren — die
 * Tabelle darunter zeigt weiterhin die ungefilterte Menge, und derselbe Wert
 * ging vorher auch in den Export.
 *
 * Eigene Datei mit eigenem `$app/state`-Mock (URL ohne Filterparameter), aus
 * demselben Grund wie bei `statusFilterParam.svelte.test.ts`: `vi.mock` gilt
 * für das ganze Modul.
 */

vi.mock('$app/navigation', () => ({
	goto: vi.fn(() => Promise.resolve()),
	invalidateAll: vi.fn(() => Promise.resolve())
}));
vi.mock('$app/state', () => ({
	page: { url: new URL('https://localhost:4000/admin/sichtungen') }
}));
vi.mock('$lib/components/admin/sightingVerdict', () => ({
	submitVerdict: vi.fn(() => Promise.resolve(true))
}));

const SichtungenSeite = (await import('./+page.svelte')).default;

function daten(rows: SightingSelect[]): PageData {
	return {
		sightings: rows,
		pagination: { page: 1, perPage: 20, total: rows.length, totalPages: 1, maxPerPage: 100 }
	} as unknown as PageData;
}

describe('Sichtungstabelle — aktive Filter kommen aus der URL', () => {
	it('markiert die Filter-Schaltfläche nicht, solange ein Datum nur getippt ist', async () => {
		const screen = render(SichtungenSeite, { data: daten([]) });

		// Filter-Panel ist standardmäßig zu — Mobile- UND Desktop-Button stehen im
		// Test-DOM (nur per CSS getrennt), `.first()` genügt für beide.
		await screen.getByRole('button', { name: 'Filter' }).first().click();

		await screen.getByLabelText('Von').fill('2026-01-01');
		await expect.element(screen.getByLabelText('Von')).toHaveValue('2026-01-01');

		expect(screen.container.querySelectorAll('.badge-accent')).toHaveLength(0);
	});
});
