import { describe, expect, it } from 'vitest';
import { PUBLIC_MAP_STATUSES, resolveMapStatuses } from './statusFilter';

describe('resolveMapStatuses', () => {
	it('ohne Parameter die öffentliche Grundmenge — auch ohne Anmeldung', () => {
		const result = resolveMapStatuses(null, false);
		expect(result).toEqual({ ok: true, statuses: ['approved'], isPublicDefault: true });
		expect(PUBLIC_MAP_STATUSES).toEqual(['approved']);
	});

	it('ohne Parameter die öffentliche Grundmenge — auch als Admin', () => {
		expect(resolveMapStatuses(null, true)).toEqual({
			ok: true,
			statuses: ['approved'],
			isPublicDefault: true
		});
	});

	it('lehnt jeden Statusparameter ohne Admin-Rechte mit 403 ab', () => {
		// Auch der Parameter, der die öffentliche Menge beschreibt: Der Endpunkt
		// soll nicht danach unterscheiden, WAS angefragt wurde, sondern OB
		// gefiltert werden darf. Sonst entsteht ein zweiter, stiller Codepfad.
		for (const raw of ['approved', 'open', 'rejected', 'open,approved,rejected', '']) {
			const result = resolveMapStatuses(raw, false);
			expect(result.ok, `raw=${JSON.stringify(raw)}`).toBe(false);
			expect(result.ok === false && result.status).toBe(403);
		}
	});

	it('nimmt eine kommaseparierte Auswahl an', () => {
		expect(resolveMapStatuses('open,rejected', true)).toEqual({
			ok: true,
			statuses: ['open', 'rejected'],
			isPublicDefault: false
		});
	});

	it('trimmt und dedupliziert', () => {
		expect(resolveMapStatuses(' open , open ,approved', true)).toEqual({
			ok: true,
			statuses: ['open', 'approved'],
			isPublicDefault: false
		});
	});

	it('erkennt die Auswahl, die der öffentlichen Menge entspricht', () => {
		expect(resolveMapStatuses('approved', true)).toEqual({
			ok: true,
			statuses: ['approved'],
			isPublicDefault: true
		});
	});

	it('weist unbekannte Werte mit 400 ab', () => {
		const result = resolveMapStatuses('open,verified', true);
		expect(result.ok).toBe(false);
		expect(result.ok === false && result.status).toBe(400);
	});

	it('weist eine leere Auswahl mit 400 ab', () => {
		// Kein stilles "dann eben alles": Eine leere Auswahl ist ein Bedienfehler
		// im Client, und eine Karte ohne Marker sieht aus wie ein Datenverlust.
		const result = resolveMapStatuses(' , ', true);
		expect(result.ok).toBe(false);
		expect(result.ok === false && result.status).toBe(400);
	});
});
