import { describe, expect, it, vi } from 'vitest';
import { buildBulkSummary, runBulkVerdict } from './bulkVerdict';

describe('bulkVerdict — sequentielle Ausführung über den verify-Endpunkt', () => {
	it('ruft submitVerdict für jede ID mit demselben Verdict auf', async () => {
		const submit = vi.fn(() => Promise.resolve(true));

		const ergebnis = await runBulkVerdict([1, 2, 3], 'approve', { submit });

		expect(submit.mock.calls).toEqual([
			[1, 'approve'],
			[2, 'approve'],
			[3, 'approve']
		]);
		expect(ergebnis.succeeded).toEqual([1, 2, 3]);
		expect(ergebnis.failed).toEqual([]);
	});

	/* Sequentiell und nicht parallel: Der verify-Endpunkt schreibt pro Aufruf, und
	   eine Welle gleichzeitiger PATCHes wäre für den Server ein Lastspitzen-Risiko
	   ohne Gegenwert — die Liste ist auf eine Tabellenseite begrenzt. */
	it('arbeitet die IDs nacheinander ab, nicht gleichzeitig', async () => {
		let laufend = 0;
		let maxGleichzeitig = 0;
		const submit = vi.fn(async () => {
			laufend += 1;
			maxGleichzeitig = Math.max(maxGleichzeitig, laufend);
			await Promise.resolve();
			laufend -= 1;
			return true;
		});

		await runBulkVerdict([1, 2, 3], 'reject', { submit });

		expect(maxGleichzeitig).toBe(1);
	});

	it('blockiert bei einem Teilfehler die übrigen Zeilen nicht', async () => {
		const submit = vi.fn((id: number) => Promise.resolve(id !== 2));

		const ergebnis = await runBulkVerdict([1, 2, 3], 'approve', { submit });

		expect(submit).toHaveBeenCalledTimes(3);
		expect(ergebnis.succeeded).toEqual([1, 3]);
		expect(ergebnis.failed).toEqual([2]);
	});

	/* Ein geworfener Fehler (Netzwerkabbruch mitten in der Schleife) darf die
	   Schleife nicht abbrechen — sonst bliebe der Rest der Auswahl unbearbeitet,
	   ohne dass irgendwo stünde, wo abgebrochen wurde. */
	it('behandelt eine geworfene Ausnahme wie einen Fehlschlag', async () => {
		const submit = vi.fn((id: number) => {
			if (id === 2) return Promise.reject(new Error('Netzwerk weg'));
			return Promise.resolve(true);
		});

		const ergebnis = await runBulkVerdict([1, 2, 3], 'approve', { submit });

		expect(ergebnis.succeeded).toEqual([1, 3]);
		expect(ergebnis.failed).toEqual([2]);
	});

	it('meldet den Fortschritt nach jeder Zeile', async () => {
		const fortschritt: Array<[number, number]> = [];

		await runBulkVerdict([1, 2, 3], 'approve', {
			submit: () => Promise.resolve(true),
			onProgress: (erledigt, gesamt) => fortschritt.push([erledigt, gesamt])
		});

		expect(fortschritt).toEqual([
			[1, 3],
			[2, 3],
			[3, 3]
		]);
	});

	/* Die Undo-IDs sind genau die Erfolge: Ein `reset` auf eine Zeile, deren
	   Freigabe nie ankam, würde einen fremden Zustand überschreiben. */
	it('liefert als Undo-Grundlage nur die erfolgreich geänderten IDs', async () => {
		const ergebnis = await runBulkVerdict([10, 11, 12], 'approve', {
			submit: (id: number) => Promise.resolve(id === 11)
		});

		expect(ergebnis.succeeded).toEqual([11]);
	});

	it('kommt mit einer leeren Auswahl aus, ohne zu senden', async () => {
		const submit = vi.fn(() => Promise.resolve(true));

		const ergebnis = await runBulkVerdict([], 'approve', { submit });

		expect(submit).not.toHaveBeenCalled();
		expect(ergebnis).toEqual({ succeeded: [], failed: [] });
	});
});

describe('buildBulkSummary — ein Toast statt N Toasts', () => {
	it('nennt bei vollem Erfolg nur die Zahl', () => {
		const zusammenfassung = buildBulkSummary({ succeeded: [1, 2, 3], failed: [] }, 'approve');

		expect(zusammenfassung.message).toBe('3 Sichtungen freigegeben');
		expect(zusammenfassung.hasFailures).toBe(false);
	});

	it('setzt den Singular richtig', () => {
		expect(buildBulkSummary({ succeeded: [1], failed: [] }, 'reject').message).toBe(
			'1 Sichtung abgelehnt'
		);
	});

	it('nennt bei Teilfehlern beide Zahlen', () => {
		const zusammenfassung = buildBulkSummary({ succeeded: [1, 2], failed: [3] }, 'approve');

		expect(zusammenfassung.message).toBe('2 von 3 Sichtungen freigegeben — 1 fehlgeschlagen');
		expect(zusammenfassung.hasFailures).toBe(true);
	});

	it('benennt den Totalausfall als solchen', () => {
		const zusammenfassung = buildBulkSummary({ succeeded: [], failed: [1, 2] }, 'reject');

		expect(zusammenfassung.message).toBe('Keine Sichtung abgelehnt — 2 fehlgeschlagen');
		expect(zusammenfassung.hasFailures).toBe(true);
	});

	it('weist übersprungene Zeilen aus', () => {
		const zusammenfassung = buildBulkSummary({ succeeded: [1], failed: [] }, 'reset', 2);

		expect(zusammenfassung.message).toBe(
			'1 Sichtung zurückgesetzt (2 übersprungen — Einzelaktion lief noch)'
		);
	});
});
