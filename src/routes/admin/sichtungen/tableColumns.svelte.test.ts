import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { SightingSelect } from '$lib/server/db/schema';
import type { PageData } from './$types';

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

/* Wie in `statusColumn.svelte.test.ts`: die Seite liest `data.pagination.*` und
   stürzt ohne das Objekt schon an der Seitenzahl-Auswahl ab. */
function daten(rows: SightingSelect[]): PageData {
	return {
		sightings: rows,
		pagination: { page: 1, perPage: 20, total: rows.length, totalPages: 1, maxPerPage: 100 },
		pendingPhotoAnnouncements: 0
	} as unknown as PageData;
}

function kopfzeilen(container: HTMLElement): string[] {
	return [...container.querySelectorAll('thead th')].map((th) => th.textContent?.trim() ?? '');
}

/* Die Client-Testumgebung lädt kein `app.css` — die Theme-Tokens existieren dort
   also nicht, und `var(--color-base-100)` fiele auf „transparent" zurück. Die
   Sticky-Zellen sind aber genau dann kaputt, wenn ihr Hintergrund durchsichtig
   ist. Deshalb werden die beiden Tokens hier gesetzt: dann misst der Test die
   tatsächlich gewählte Fläche statt nur die Existenz einer Deklaration. */
const BASE_100 = 'rgb(255, 255, 255)';
const BASE_200 = 'rgb(240, 240, 240)';

describe('Sichtungstabelle — Spalten', () => {
	beforeEach(() => {
		document.documentElement.style.setProperty('--color-base-100', BASE_100);
		document.documentElement.style.setProperty('--color-base-200', BASE_200);
	});

	afterEach(() => {
		document.documentElement.style.removeProperty('--color-base-100');
		document.documentElement.style.removeProperty('--color-base-200');
	});

	it('zeigt E-Mail, Entfernung und Verteilung per Default nicht', () => {
		const screen = render(SichtungenSeite, { data: daten([sichtung({})]) });

		const kopf = kopfzeilen(screen.container);
		expect(kopf).not.toContain('E-Mail');
		expect(kopf).not.toContain('Entfernung');
		expect(kopf).not.toContain('Verteilung');
	});

	it('behält Status und Aktionen in der Default-Auswahl', () => {
		const screen = render(SichtungenSeite, { data: daten([sichtung({})]) });

		const kopf = kopfzeilen(screen.container);
		expect(kopf).toContain('Status');
		expect(kopf).toContain('Aktionen');
	});

	it('friert Status und Aktionen am rechten Rand fest', () => {
		const screen = render(SichtungenSeite, { data: daten([sichtung({})]) });

		const zellen = [...screen.container.querySelectorAll('tbody tr td')];
		const aktionen = zellen.at(-1) as HTMLElement;
		const status = zellen.at(-2) as HTMLElement;

		expect(getComputedStyle(aktionen).position).toBe('sticky');
		expect(getComputedStyle(aktionen).right).toBe('0px');

		// Die Statusspalte rastet links neben den Aktionen ein, nicht darunter.
		expect(getComputedStyle(status).position).toBe('sticky');
		expect(parseFloat(getComputedStyle(status).right)).toBeCloseTo(aktionen.offsetWidth, 0);
	});

	it('gibt den fixierten Zellen einen opaken Hintergrund, der Zebra mitmacht', () => {
		const screen = render(SichtungenSeite, {
			data: daten([sichtung({ id: 1 }), sichtung({ id: 2 })])
		});

		const zellen = [...screen.container.querySelectorAll('tbody tr td:last-child')];
		const ersteAktionen = zellen.at(0) as HTMLElement;
		const zweiteAktionen = zellen.at(1) as HTMLElement;

		expect(getComputedStyle(ersteAktionen).backgroundColor).toBe(BASE_100);
		// `table-zebra` färbt das <tr>, nicht die Zelle — ohne eigene Regel bliebe
		// die fixierte Zelle hier durchsichtig und der Inhalt liefe darunter durch.
		expect(getComputedStyle(zweiteAktionen).backgroundColor).toBe(BASE_200);
	});

	it('verspricht an nicht sortierbaren Spaltenköpfen keine Klickbarkeit', () => {
		const screen = render(SichtungenSeite, { data: daten([sichtung({})]) });

		const nichtSortierbar = [...screen.container.querySelectorAll('thead th')].filter(
			(th) => !th.querySelector('button')
		);

		expect(nichtSortierbar.length).toBeGreaterThan(0);
		for (const th of nichtSortierbar) {
			expect([...th.classList]).not.toContain('hover:bg-base-300');
		}
	});
});
