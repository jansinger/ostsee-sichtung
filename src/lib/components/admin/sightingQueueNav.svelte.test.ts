/**
 * @fileoverview Navigationsleiste des Warteschlangen-Modus.
 *
 * Browser-Test, weil die Zusagen im DOM liegen: Ziel-Hrefs, Zähler, und die
 * Enden des Stapels. Die Enden des Stapels sind reiner Text, kein
 * `role="button"` — sie haben nichts auszuführen, nur einen Zustand zu
 * benennen.
 */
import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import SightingQueueNav from './SightingQueueNav.svelte';
import type { SightingQueue } from './sightingQueue';

const QUEUE: SightingQueue = {
	prev: { id: 499, referenceId: 'REF-499' },
	next: { id: 501, referenceId: 'REF-501' },
	position: 17,
	total: 653
};

describe('SightingQueueNav', () => {
	it('nennt Position und Gesamtzahl', async () => {
		const screen = render(SightingQueueNav, { queue: QUEUE, queueFailed: false, order: 'desc' });

		await expect.element(screen.getByText('17 von 653 offen')).toBeInTheDocument();
	});

	it('verlinkt beide Nachbarn mit Herkunft und Sortierung — order: asc', async () => {
		const screen = render(SightingQueueNav, { queue: QUEUE, queueFailed: false, order: 'asc' });

		const naechste = screen.getByRole('link', { name: /Nächste/ });
		await expect.element(naechste).toHaveAttribute('href', '/admin/501?from=inbox&order=asc');

		const vorherige = screen.getByRole('link', { name: /Vorherige/ });
		await expect.element(vorherige).toHaveAttribute('href', '/admin/499?from=inbox&order=asc');
	});

	it('verlinkt beide Nachbarn mit Herkunft und Sortierung — order: desc', async () => {
		const screen = render(SightingQueueNav, { queue: QUEUE, queueFailed: false, order: 'desc' });

		const naechste = screen.getByRole('link', { name: /Nächste/ });
		await expect.element(naechste).toHaveAttribute('href', '/admin/501?from=inbox&order=desc');

		const vorherige = screen.getByRole('link', { name: /Vorherige/ });
		await expect.element(vorherige).toHaveAttribute('href', '/admin/499?from=inbox&order=desc');
	});

	it('zeigt das hintere Stapelende als Text statt als Knopf-Attrappe', async () => {
		const screen = render(SightingQueueNav, {
			queue: { ...QUEUE, next: null },
			queueFailed: false,
			order: 'desc'
		});

		await expect.element(screen.getByText('Letzte offene Sichtung')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: /Letzte offene Sichtung/ }))
			.not.toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: /Letzte offene Sichtung/ }))
			.not.toBeInTheDocument();
	});

	it('zeigt das vordere Stapelende als Text statt als Knopf-Attrappe', async () => {
		const screen = render(SightingQueueNav, {
			queue: { ...QUEUE, prev: null },
			queueFailed: false,
			order: 'desc'
		});

		await expect.element(screen.getByText('Erste offene Sichtung')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: /Erste offene Sichtung/ }))
			.not.toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: /Erste offene Sichtung/ }))
			.not.toBeInTheDocument();
	});

	it('sagt bei einem Fehlschlag, dass die Position unbekannt ist', async () => {
		const screen = render(SightingQueueNav, { queue: null, queueFailed: true, order: 'desc' });

		await expect
			.element(screen.getByText(/nicht geladen — Position unbekannt/i))
			.toBeInTheDocument();
	});

	it('zeigt für eine entschiedene Sichtung keine Position, aber die Nachbarn', async () => {
		const screen = render(SightingQueueNav, {
			queue: { ...QUEUE, position: null },
			queueFailed: false,
			order: 'desc'
		});

		await expect.element(screen.getByText('653 offen')).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: /Nächste/ })).toBeInTheDocument();
	});

	it('rendert nichts, solange die Warteschlange weder geladen noch fehlgeschlagen ist', () => {
		const screen = render(SightingQueueNav, { queue: null, queueFailed: false, order: 'desc' });

		expect(screen.container.querySelector('nav')).toBeNull();
	});
});
