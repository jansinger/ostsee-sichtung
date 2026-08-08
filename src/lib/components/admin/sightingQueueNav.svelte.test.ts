/**
 * @fileoverview Navigationsleiste des Warteschlangen-Modus.
 *
 * Browser-Test, weil die Zusagen im DOM liegen: Ziel-Hrefs, Zähler, und die
 * Enden des Stapels. Gesperrte Enden tragen `aria-disabled`, nicht `disabled` —
 * wer per Tastatur arbeitet, soll seine Position nicht verlieren.
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

	it('verlinkt beide Nachbarn mit Herkunft und Sortierung', async () => {
		const screen = render(SightingQueueNav, { queue: QUEUE, queueFailed: false, order: 'asc' });

		const naechste = screen.getByRole('link', { name: /Nächste/ });
		await expect.element(naechste).toHaveAttribute('href', '/admin/501?from=inbox&order=asc');

		const vorherige = screen.getByRole('link', { name: /Vorherige/ });
		await expect.element(vorherige).toHaveAttribute('href', '/admin/499?from=inbox&order=asc');
	});

	it('sperrt das Stapelende ohne den Fokus zu nehmen', async () => {
		const screen = render(SightingQueueNav, {
			queue: { ...QUEUE, next: null },
			queueFailed: false,
			order: 'desc'
		});

		const naechste = screen.getByRole('button', { name: /Nächste/ });
		await expect.element(naechste).toHaveAttribute('aria-disabled', 'true');
		await expect.element(naechste).not.toHaveAttribute('disabled');
	});

	it('sagt bei einem Fehlschlag, dass die Position unbekannt ist', async () => {
		const screen = render(SightingQueueNav, { queue: null, queueFailed: true, order: 'desc' });

		await expect.element(screen.getByRole('status')).toHaveTextContent(/nicht geladen/i);
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
});
