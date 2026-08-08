/**
 * @fileoverview Der nutzersichtbare Teil des Critical-Fixes (Rückweg aus der
 * Tabelle navigiert nicht mehr) war ungetestet — E2E deckt ihn nicht ab. Nach
 * dem Vorbild von `src/routes/admin/inboxUndo.svelte.test.ts`: Seite mit
 * gemocktem `$app/navigation` und gemocktem `submitVerdict` rendern, den
 * Toast-Store mocken, um an den „Rückgängig"-Callback zu kommen (der Toast
 * selbst wird an dieser Stelle nicht gerendert), und `zurueckNehmen` über den
 * echten Ablauf treiben — nicht durch direkten Aufruf einer internen Funktion.
 */
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FrontendSighting } from '$lib/types';
import type { SightingQueue } from '$lib/components/admin/sightingQueue';
import { EntryChannelEnum } from '$lib/report/formOptions/entryChannel';
import type { PageData } from './$types';

const goto = vi.fn(() => Promise.resolve());
const invalidateAll = vi.fn(() => Promise.resolve());
const preloadData = vi.fn(() => Promise.resolve());
const submitVerdict = vi.fn(() => Promise.resolve(true));
const toastSuccess = vi.fn();

vi.mock('$app/navigation', () => ({
	goto,
	invalidateAll,
	preloadData
}));
vi.mock('$app/state', () => ({
	page: { url: new URL('https://localhost:4000/admin/42') }
}));
vi.mock('$lib/components/admin/sightingVerdict', () => ({
	submitVerdict
}));
vi.mock('$lib/stores/toastState.svelte', () => ({
	toast: {
		success: (...args: unknown[]) => toastSuccess(...args),
		info: vi.fn()
	}
}));

// Erst nach den Mocks importieren, sonst zieht die Seite die echten Module.
const AdminSightingDetail = (await import('./+page.svelte')).default;

function sichtung(overrides: { id: number } & Partial<FrontendSighting>): FrontendSighting {
	return {
		species: 0,
		totalCount: 1,
		sightingDate: new Date('2026-07-30T10:00:00Z'),
		created: new Date('2026-07-30T09:00:00Z'),
		referenceId: null,
		mediaFile: null,
		mediaUpload: 0,
		mediaConsent: 0,
		entryChannel: EntryChannelEnum.APP,
		uploadedFiles: [],
		approvedAt: null,
		rejectedAt: null,
		...overrides
	} as unknown as FrontendSighting;
}

function daten(
	sighting: FrontendSighting,
	opts: { queue?: SightingQueue | null; queueFailed?: boolean } = {}
): PageData {
	return {
		sighting,
		statusLog: [],
		statusLogFailed: false,
		queue: opts.queue ?? null,
		queueFailed: opts.queueFailed ?? false,
		queueOrder: 'asc' as const,
		isSuperAdmin: false
	} as unknown as PageData;
}

/** Klickt das „Freigegeben"-Segment der Status-Kontrolle. */
async function freigeben() {
	await page.getByRole('radio', { name: 'Freigegeben' }).click();
	await vi.advanceTimersByTimeAsync(0);
}

/** Ruft den zuletzt registrierten Toast-Undo-Callback auf. */
function loeseUndoAus() {
	const [, options] = toastSuccess.mock.calls.at(-1) as [
		string,
		{ action: { onClick: () => void } }
	];
	options.action.onClick();
}

describe('Detailansicht — Rückgängig', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		goto.mockClear();
		invalidateAll.mockClear();
		submitVerdict.mockClear();
		toastSuccess.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('aus der Tabelle geöffnet (kein Warteschlangen-Modus): Undo ruft submitVerdict mit der entschiedenen ID auf und navigiert nicht', async () => {
		render(AdminSightingDetail, { data: daten(sichtung({ id: 42 })) });

		await freigeben();
		expect(submitVerdict).toHaveBeenCalledWith(42, 'approve');

		loeseUndoAus();
		await vi.advanceTimersByTimeAsync(0);

		expect(submitVerdict).toHaveBeenCalledWith(42, 'reset');
		expect(goto).not.toHaveBeenCalled();
		expect(invalidateAll).toHaveBeenCalled();
	});

	it('im Warteschlangen-Modus nach einem Advance: Undo führt zur entschiedenen Sichtung zurück und lässt die vorgesprungene Sichtung unangetastet', async () => {
		const queue: SightingQueue = {
			prev: null,
			next: { id: 43, referenceId: 'REF-43' },
			position: 1,
			total: 2
		};
		const screen = render(AdminSightingDetail, {
			data: daten(sichtung({ id: 42 }), { queue, queueFailed: false })
		});

		await freigeben();
		expect(submitVerdict).toHaveBeenCalledWith(42, 'approve');
		// Advance zur nächsten offenen Sichtung.
		expect(goto).toHaveBeenCalledWith(expect.stringContaining('/admin/43'));

		/* Dieselbe Route (`/admin/[id]`) — SvelteKit behält die Komponente beim
		   bloßen Wechsel des Parameters, `letzteEntscheidung` (State) überlebt
		   den Sprung. `rerender` bildet genau das nach: gleiche Instanz, neue
		   `data`. Ohne diesen Schritt könnte ein Bug, der `sighting.id` statt der
		   gemerkten ID verwendet, hier nicht auffallen — die angezeigte Sichtung
		   wäre sonst die ganze Zeit über dieselbe wie die entschiedene. */
		await screen.rerender({
			data: daten(sichtung({ id: 43 }), { queue: null, queueFailed: false })
		});

		loeseUndoAus();
		await vi.advanceTimersByTimeAsync(0);

		// Der Verdict geht an die entschiedene Sichtung (42) — nicht an die
		// vorgesprungene (43), die gerade angezeigt wird.
		expect(submitVerdict).toHaveBeenCalledWith(42, 'reset');
		expect(submitVerdict).not.toHaveBeenCalledWith(43, 'reset');
		// Und die Navigation führt zurück zur entschiedenen Sichtung.
		expect(goto).toHaveBeenLastCalledWith(expect.stringContaining('/admin/42'));
	});
});
