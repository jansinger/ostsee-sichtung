import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';
import type { SightingSelect } from '$lib/server/db/schema';
import type { PageData } from './$types';

/**
 * searchParam.svelte.test.ts — Freitext-Suche (U3).
 *
 * Das Suchfeld steht im Kopf der Tabelle, nicht im Filter-Panel: Wer eine
 * Referenz-ID oder eine E-Mail sucht, soll dafür kein Panel aufklappen müssen.
 * Geprüft wird die Verdrahtung mit der URL in beide Richtungen — Feldwert aus
 * `?q=`, und Absenden schreibt `?q=` zurück (inkl. Rücksprung auf Seite 1,
 * sonst stünde man mit einer neuen Suche auf einer leeren Seite 7).
 *
 * Eigene Datei mit eigenem `$app/state`-Mock, aus demselben Grund wie bei
 * `statusFilterParam.svelte.test.ts`: `vi.mock` gilt für das ganze Modul.
 */

const goto = vi.fn<(url: URL) => Promise<void>>(() => Promise.resolve());

vi.mock('$app/navigation', () => ({
	goto: (url: URL | string) => goto(url as URL),
	invalidateAll: vi.fn(() => Promise.resolve())
}));
vi.mock('$app/state', () => ({
	page: { url: new URL('https://localhost:4000/admin/sichtungen?q=m%C3%BCller&page=7') }
}));
vi.mock('$lib/components/admin/sightingVerdict', () => ({
	submitVerdict: vi.fn(() => Promise.resolve(true))
}));

const SichtungenSeite = (await import('./+page.svelte')).default;

function daten(rows: SightingSelect[]): PageData {
	return {
		sightings: rows,
		pagination: { page: 1, perPage: 20, total: rows.length, totalPages: 1, maxPerPage: 100 },
		pendingPhotoAnnouncements: 0
	} as unknown as PageData;
}

describe('Sichtungstabelle — Freitext-Suche', () => {
	it('übernimmt den Suchbegriff aus der URL ins Feld', async () => {
		const screen = render(SichtungenSeite, { data: daten([]) });

		await expect.element(screen.getByRole('searchbox', { name: /suche/i })).toHaveValue('müller');
	});

	it('schreibt den Suchbegriff in die URL und springt auf Seite 1', async () => {
		goto.mockClear();
		const screen = render(SichtungenSeite, { data: daten([]) });

		const feld = screen.getByRole('searchbox', { name: /suche/i });
		await feld.fill('ostsee');
		await screen.getByRole('button', { name: 'Suchen' }).click();

		const ziel = goto.mock.lastCall?.[0];
		if (!ziel) throw new Error('goto wurde nicht aufgerufen');
		expect(ziel.searchParams.get('q')).toBe('ostsee');
		expect(ziel.searchParams.get('page')).toBe('1');
	});

	it('entfernt den Parameter, wenn das Feld geleert wird', async () => {
		goto.mockClear();
		const screen = render(SichtungenSeite, { data: daten([]) });

		await screen.getByRole('searchbox', { name: /suche/i }).fill('');
		await screen.getByRole('button', { name: 'Suchen' }).click();

		const ziel = goto.mock.lastCall?.[0];
		if (!ziel) throw new Error('goto wurde nicht aufgerufen');
		expect(ziel.searchParams.has('q')).toBe(false);
	});
});
