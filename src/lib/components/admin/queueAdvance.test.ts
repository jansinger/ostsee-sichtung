/**
 * @fileoverview Der Sprung nach einer Entscheidung im Warteschlangen-Modus.
 *
 * Der Undo-Toast ist hier kein Beiwerk. Heute steht in ihm nur „Status:
 * Freigegeben" — im Auto-Advance wäre das eine Aussage über eine Meldung, die
 * nicht mehr auf dem Bildschirm steht. Er muss die Sichtung benennen **und**
 * einen Rückweg zu ihr tragen, sonst ist er eine Falle statt einer Sicherung.
 */
import { describe, expect, it } from 'vitest';
import { planAdvance } from './queueAdvance';
import type { SightingQueue } from './sightingQueue';

const QUEUE: SightingQueue = {
	prev: { id: 499, referenceId: 'REF-499' },
	next: { id: 501, referenceId: 'REF-501' },
	position: 17,
	total: 653
};

const BASIS = { sightingId: 500, queue: QUEUE, queueFailed: false, order: 'desc' as const };

describe('planAdvance', () => {
	it('zielt auf die nächste offene Sichtung', () => {
		const plan = planAdvance({ ...BASIS, verdict: 'approve' });

		expect(plan.target).toEqual({ kind: 'sighting', href: '/admin/501?from=inbox&order=desc' });
	});

	it('benennt die entschiedene Sichtung im Toast', () => {
		expect(planAdvance({ ...BASIS, verdict: 'approve' }).toastMessage).toBe(
			'Sichtung #500 freigegeben'
		);
		expect(planAdvance({ ...BASIS, verdict: 'reject' }).toastMessage).toBe(
			'Sichtung #500 abgelehnt'
		);
	});

	it('trägt einen Rückweg zur entschiedenen Sichtung', () => {
		expect(planAdvance({ ...BASIS, verdict: 'approve' }).undoHref).toBe(
			'/admin/500?from=inbox&order=desc'
		);
	});

	it('bleibt beim Zurücksetzen stehen — es verlässt den Stapel nicht', () => {
		expect(planAdvance({ ...BASIS, verdict: 'reset' }).target).toEqual({ kind: 'stay' });
	});

	it('bleibt bei unbekannter Warteschlange stehen', () => {
		expect(planAdvance({ ...BASIS, verdict: 'approve', queueFailed: true }).target).toEqual({
			kind: 'stay'
		});
	});

	it('geht am Stapelende in den Eingang', () => {
		const plan = planAdvance({ ...BASIS, verdict: 'approve', queue: { ...QUEUE, next: null } });

		expect(plan.target).toEqual({ kind: 'inbox' });
	});

	it('vergibt keinen Rückweg außerhalb des Warteschlangen-Modus', () => {
		// Aus der Tabelle geöffnet: queue === null, queueFailed === false. Ein
		// undoHref stempelte hier über `inboxDetailHref` bedingungslos
		// `?from=inbox` — der Klick auf „Rückgängig" schriebe damit die Herkunft
		// der Tabellenansicht auf den Eingang um, obwohl gar kein Advance
		// stattfand (target bleibt `stay`).
		const plan = planAdvance({
			sightingId: 500,
			verdict: 'approve',
			queue: null,
			queueFailed: false,
			order: 'desc'
		});

		expect(plan.target).toEqual({ kind: 'stay' });
		expect(plan.undoHref).toBeNull();
	});

	it('vergibt einen Rückweg, wenn die Warteschlange nur fehlgeschlagen ist', () => {
		const plan = planAdvance({ ...BASIS, verdict: 'approve', queueFailed: true });

		expect(plan.target).toEqual({ kind: 'stay' });
		expect(plan.undoHref).toBe('/admin/500?from=inbox&order=desc');
	});
});
