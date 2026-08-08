/**
 * @fileoverview Zielbestimmung des Warteschlangen-Modus.
 *
 * Der wichtigste Fall steht ganz unten: `next === null` und „Endpunkt
 * fehlgeschlagen" sind **nicht** dasselbe. Ersteres heißt „Stapel zu Ende",
 * letzteres „unbekannt". Verwechselt man sie, landet man bei jedem
 * Netzwerkfehler im Eingang und hält den Stapel für abgearbeitet.
 */
import { describe, expect, it } from 'vitest';
import { advanceTarget, queueHref, type SightingQueue } from './sightingQueue';

const NACHBAR = { id: 501, referenceId: 'REF-501' };

const QUEUE: SightingQueue = {
	prev: { id: 499, referenceId: 'REF-499' },
	next: NACHBAR,
	position: 17,
	total: 653
};

describe('queueHref', () => {
	it('trägt Herkunft und Sortierung mit', () => {
		const href = queueHref(NACHBAR, 'asc');

		expect(href).toContain('/admin/501');
		expect(href).toContain('from=inbox');
		expect(href).toContain('order=asc');
	});
});

describe('advanceTarget', () => {
	it('springt zur nächsten offenen Sichtung', () => {
		expect(advanceTarget(QUEUE, false, 'desc')).toEqual({
			kind: 'sighting',
			href: queueHref(NACHBAR, 'desc')
		});
	});

	it('geht am Stapelende zurück in den Eingang', () => {
		expect(advanceTarget({ ...QUEUE, next: null }, false, 'desc')).toEqual({ kind: 'inbox' });
	});

	it('bleibt stehen, wenn die Warteschlange unbekannt ist', () => {
		expect(advanceTarget(QUEUE, true, 'desc')).toEqual({ kind: 'stay' });
		expect(advanceTarget(null, false, 'desc')).toEqual({ kind: 'stay' });
	});

	it('unterscheidet Stapelende von Fehlschlag — beide haben kein next', () => {
		const ende = advanceTarget({ ...QUEUE, next: null }, false, 'desc');
		const fehler = advanceTarget({ ...QUEUE, next: null }, true, 'desc');

		expect(ende).not.toEqual(fehler);
	});
});
