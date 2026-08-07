import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SightingSelect } from '$lib/server/db/schema';
import type { PageData } from './$types';

const invalidateAll = vi.fn(() => Promise.resolve());
const submitVerdict = vi.fn(() => Promise.resolve(true));

vi.mock('$app/navigation', () => ({ goto: vi.fn(() => Promise.resolve()), invalidateAll }));
vi.mock('$app/state', () => ({
	page: { url: new URL('https://localhost:4000/admin/sichtungen') }
}));
vi.mock('$lib/components/admin/sightingVerdict', () => ({ submitVerdict }));

const SichtungenSeite = (await import('./+page.svelte')).default;

function sichtung(overrides: Partial<SightingSelect>): SightingSelect {
	return {
		id: 1,
		created: new Date('2026-08-01T10:00:00Z'),
		sightingDate: new Date('2026-07-30T08:00:00Z'),
		species: 0,
		totalCount: 1,
		juvenileCount: 0,
		isDead: 0,
		verified: 0,
		approvedAt: null,
		rejectedAt: null,
		inBalticSea: 1,
		inBalticSeaGeo: 1,
		...overrides
	} as unknown as SightingSelect;
}

/**
 * Abweichung vom Brief-Vorbild: Die dortige `daten()` lieferte
 * `totalCount`/`currentPage` auf oberster Ebene — die Seite liest aber
 * `data.pagination.{page,perPage,total,totalPages,maxPerPage}`
 * (`+page.server.ts`) und stürzt ohne das Objekt beim Rendern der
 * Seitenzahl-Auswahl ab, bevor die Statusspalte überhaupt geprüft wird.
 */
function daten(rows: SightingSelect[]): PageData {
	return {
		sightings: rows,
		pagination: {
			page: 1,
			perPage: 20,
			total: rows.length,
			totalPages: 1,
			maxPerPage: 100
		},
		pendingPhotoAnnouncements: 0
	} as unknown as PageData;
}

describe('Sichtungstabelle — Statusspalte', () => {
	beforeEach(() => {
		submitVerdict.mockClear();
		invalidateAll.mockClear();
	});

	/**
	 * Abweichung vom Brief-Vorbild: Die Seite rendert Mobilkarte UND
	 * Desktop-Tabelle gleichzeitig ins DOM (nur per `md:hidden`/`hidden
	 * md:block` per CSS getrennt) — beide tragen für dieselbe Sichtung
	 * dasselbe `SightingStatusControl` mit identischem `aria-label`. Die
	 * Komponententests laden `+page.svelte` isoliert ohne `app.css`
	 * (Tailwind hängt nur am Root-Layout), ein `getByRole('radio', {name})`
	 * ohne Scope trifft deshalb auf beide Layouts und meldet „strict mode
	 * violation". Skopiert wird deshalb auf die Desktop-Tabelle — das
	 * einzige `<table>`-Element der Seite.
	 */
	function desktopRadio(screen: ReturnType<typeof render>, name: string) {
		return screen.getByRole('table').getByRole('radio', { name });
	}

	it('zeigt eine abgelehnte Sichtung als „Abgelehnt", nicht als ungeprüft', async () => {
		const screen = render(SichtungenSeite, {
			data: daten([sichtung({ rejectedAt: new Date('2026-08-02T09:00:00Z') })])
		});

		await expect.element(desktopRadio(screen, 'Abgelehnt')).toBeChecked();
	});

	/* Regression zum Bestandsbefund: 9 Zeilen tragen eine Freigabe ohne
	   `geprueft = 1`. Der alte Toggle zeigte sie als ungeprüft, obwohl sie
	   öffentlich sichtbar sind. */
	it('zeigt eine freigegebene Sichtung als „Freigegeben", auch wenn geprueft = 0', async () => {
		const screen = render(SichtungenSeite, {
			data: daten([sichtung({ verified: 0, approvedAt: new Date('2026-08-02T09:00:00Z') })])
		});

		await expect.element(desktopRadio(screen, 'Freigegeben')).toBeChecked();
	});

	it('schickt beim Wechsel das passende Verdict', async () => {
		const screen = render(SichtungenSeite, { data: daten([sichtung({ id: 7 })]) });

		await desktopRadio(screen, 'Freigegeben').click();
		expect(submitVerdict).toHaveBeenCalledWith(7, 'approve');
	});

	it('hebt eine Ablehnung über das Segment „Offen" auf', async () => {
		const screen = render(SichtungenSeite, {
			data: daten([sichtung({ id: 8, rejectedAt: new Date('2026-08-02T09:00:00Z') })])
		});

		await desktopRadio(screen, 'Offen').click();
		expect(submitVerdict).toHaveBeenCalledWith(8, 'reset');
	});

	/* Der Knopf „Ablehnung aufheben" existierte nur, weil ein Toggle mit zwei
	   Stellungen den dritten Zustand nicht herstellen konnte. */
	it('hat keinen separaten Knopf „Aufheben" mehr', async () => {
		const screen = render(SichtungenSeite, {
			data: daten([sichtung({ rejectedAt: new Date('2026-08-02T09:00:00Z') })])
		});

		expect(screen.container.textContent).not.toContain('Aufheben');
	});
});
