import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SightingSelect } from '$lib/server/db/schema';
import type { PageData } from './$types';

/**
 * @fileoverview Tastatur-Triage des Eingangs (Spec B1) — die Strecke von der
 * echten Taste bis zum Fokus und zum Verdict.
 *
 * Die Tastenzuordnung selbst prüft `inboxShortcuts.test.ts` im Node-Runner.
 * Hier geht es um das, was nur ein Browser zeigt: Wer hat den Fokus, wandert er
 * nach einer Entscheidung weiter, und öffnet „?" das Overlay.
 */

const invalidateAll = vi.fn(() => Promise.resolve());
const submitVerdict = vi.fn(() => Promise.resolve(true));

vi.mock('$app/navigation', () => ({
	goto: vi.fn(() => Promise.resolve()),
	invalidateAll
}));
vi.mock('$app/state', () => ({
	page: { url: new URL('https://localhost:4000/admin') }
}));
vi.mock('$lib/components/admin/sightingVerdict', () => ({
	submitVerdict
}));

const AdminInbox = (await import('./+page.svelte')).default;

function sichtung(id: number): SightingSelect {
	return {
		id,
		created: new Date('2026-08-01T10:00:00Z'),
		sightingDate: new Date('2026-07-30T08:00:00Z'),
		species: 0,
		totalCount: 1,
		juvenileCount: 0,
		isDead: 0,
		email: `melder${id}@example.com`,
		firstName: 'Kim',
		lastName: 'Muster',
		spamScore: null,
		inBalticSea: 1,
		inBalticSeaGeo: 1
	} as unknown as SightingSelect;
}

function daten(ids: number[]): PageData {
	return {
		open: ids.map(sichtung),
		openTotal: ids.length,
		order: 'asc' as const,
		imagesBySighting: {},
		pendingPhotoAnnouncements: 0,
		duplicatesBySighting: {}
	} as unknown as PageData;
}

/** Die Position der fokussierten Karte — `null`, wenn keine den Fokus hat. */
function fokussierteKarte(): string | null {
	return (
		document.activeElement?.closest('[data-inbox-index]')?.getAttribute('data-inbox-index') ?? null
	);
}

describe('Eingangsseite — Tastatur-Triage', () => {
	beforeEach(() => {
		invalidateAll.mockClear();
		submitVerdict.mockClear();
	});

	it('fokussiert mit J vorwärts und mit K zurück', async () => {
		render(AdminInbox, { data: daten([1, 2, 3]) });

		await userEvent.keyboard('j');
		expect(fokussierteKarte()).toBe('0');

		await userEvent.keyboard('j');
		expect(fokussierteKarte()).toBe('1');

		await userEvent.keyboard('k');
		expect(fokussierteKarte()).toBe('0');

		// Am oberen Ende bleibt der Fokus stehen, statt umzulaufen.
		await userEvent.keyboard('k');
		expect(fokussierteKarte()).toBe('0');
	});

	it('gibt die fokussierte Karte mit A frei und rückt den Fokus nach', async () => {
		const screen = render(AdminInbox, { data: daten([11, 12]) });

		await userEvent.keyboard('j');
		await userEvent.keyboard('a');

		expect(submitVerdict).toHaveBeenCalledWith(11, 'approve');
		await expect.element(screen.getByRole('button', { name: 'Rückgängig' })).toBeInTheDocument();
		/* Die bearbeitete Karte bleibt als Undo-Zeile stehen — der Fokus darf dort
		   nicht kleben bleiben, sonst tut das nächste A nichts. */
		await vi.waitFor(() => expect(fokussierteKarte()).toBe('1'));
	});

	it('lehnt die fokussierte Karte mit R ab', async () => {
		render(AdminInbox, { data: daten([21, 22]) });

		await userEvent.keyboard('j');
		await userEvent.keyboard('j');
		await userEvent.keyboard('r');

		expect(submitVerdict).toHaveBeenCalledWith(22, 'reject');
	});

	it('nimmt die letzte Entscheidung mit U zurück', async () => {
		const screen = render(AdminInbox, { data: daten([31, 32]) });

		await userEvent.keyboard('j');
		await userEvent.keyboard('a');
		await expect.element(screen.getByRole('button', { name: 'Rückgängig' })).toBeInTheDocument();

		await userEvent.keyboard('u');

		await vi.waitFor(() => expect(submitVerdict).toHaveBeenCalledWith(31, 'reset'));
	});

	it('tut bei A nichts, solange keine Karte fokussiert ist', async () => {
		render(AdminInbox, { data: daten([41]) });

		await userEvent.keyboard('a');

		expect(submitVerdict).not.toHaveBeenCalled();
	});

	it('macht die Shortcuts ohne Overlay entdeckbar', async () => {
		const screen = render(AdminInbox, { data: daten([51]) });

		await expect.element(screen.getByText(/Tastatur/)).toBeInTheDocument();
	});

	it('öffnet mit ? die Übersicht und schließt sie mit Escape', async () => {
		const screen = render(AdminInbox, { data: daten([61]) });

		await userEvent.keyboard('?');
		const overlay = screen.getByRole('dialog', { name: /Tastaturkürzel/ });
		await expect.element(overlay).toBeInTheDocument();
		await expect.element(screen.getByText('Nächste Meldung')).toBeInTheDocument();

		await userEvent.keyboard('{Escape}');
		await expect.element(overlay).not.toBeInTheDocument();
	});

	it('entscheidet nichts, während die Übersicht offen ist', async () => {
		render(AdminInbox, { data: daten([71]) });

		await userEvent.keyboard('j');
		await userEvent.keyboard('?');
		await userEvent.keyboard('a');

		expect(submitVerdict).not.toHaveBeenCalled();
	});
});
