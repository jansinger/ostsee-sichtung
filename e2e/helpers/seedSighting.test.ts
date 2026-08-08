import { describe, expect, it } from 'vitest';
import {
	deleteSighting,
	E2E_REFERENCE_PREFIX,
	FIRST_PAGE_DATE,
	NEWEST_ROW_DATE
} from './seedSighting';

/**
 * seedSighting.test.ts — hält die Reihenfolge der Seed-Datumswerte fest.
 *
 * Ohne diese Zusicherung ist die Regel bloß ein Kommentar. Sie kostet den
 * nächsten Autor sonst einen Debug-Lauf: Wer für einen neuen Test wieder ein
 * Datum oberhalb von `NEWEST_ROW_DATE` wählt, verdeckt damit die Zeile von
 * `admin-table-mobile-reference-overflow.spec.ts` (`?perPage=1` rendert genau
 * die neueste). Der Fehlschlag steht dann in einer *fremden* Datei und tritt
 * nur auf, wenn beide Specs im selben Lauf parallel liegen — genau die
 * Flakiness-Klasse, die schwer zu finden ist. Hier fällt sie sofort auf, und
 * zwar an der Stelle, an der die Datumswerte gepflegt werden.
 */
describe('Seed-Datumswerte', () => {
	it('hält die Seite-1-Zeilen unterhalb der neuesten Zeile', () => {
		expect(FIRST_PAGE_DATE.getTime()).toBeLessThan(NEWEST_ROW_DATE.getTime());
	});

	it('liegt mit beiden Werten in der Zukunft', () => {
		// Sonst greift die Default-Sortierung `sichtungsdatum desc` nicht mehr und
		// die Zeile verschwindet zwischen 30.000 Bestandsmeldungen.
		expect(FIRST_PAGE_DATE.getTime()).toBeGreaterThan(Date.now());
	});

	/**
	 * `app-shell-height.spec.ts` filtert auf `2099-01-01..2099-01-02` und braucht
	 * dort eine leere Trefferliste — die einzige kurze Admin-Seite, an der eine
	 * zu groß geratene Mindesthöhe überhaupt auffällt.
	 */
	it('legt keine Zeile in das Filterfenster von app-shell-height', () => {
		const fensterStart = new Date('2099-01-01T00:00:00.000Z').getTime();
		const fensterEnde = new Date('2099-01-03T00:00:00.000Z').getTime();

		for (const datum of [NEWEST_ROW_DATE, FIRST_PAGE_DATE]) {
			const zeitpunkt = datum.getTime();
			expect(zeitpunkt < fensterStart || zeitpunkt >= fensterEnde).toBe(true);
		}
	});
});

/**
 * `deleteSighting` erlaubt als zweites Erkennungsmerkmal eine Referenz-ID —
 * für den einen Test, der den Aufräum-Marker über die Oberfläche überschreibt.
 * Ohne Schranke wäre das ein Weg am Marker-Guard vorbei: Die Referenz-ID einer
 * echten Meldung, versehentlich übergeben, löschte sie.
 *
 * Die Prüfung liegt vor dem Verbindungsaufbau — deshalb kommen diese Fälle
 * ohne Datenbank aus.
 */
describe('deleteSighting — Schranke für die Referenz-ID', () => {
	it('weist eine Referenz-ID ohne E2E-Präfix ab', async () => {
		await expect(deleteSighting(157, { referenceId: 'clx8k2p9q000108l4h3v2b1c7' })).rejects.toThrow(
			/Präfix/
		);
	});

	it('nennt die abgelehnte Referenz-ID, damit der Fehler auffindbar ist', async () => {
		await expect(deleteSighting(157, { referenceId: 'fremde-id' })).rejects.toThrow('fremde-id');
	});

	/* Die Gegenprobe — eine zugelassene Referenz-ID — braucht eine Datenbank und
	   läuft in `admin-edit-preserves-record.spec.ts`: Dessen Zeilen tragen das
	   Präfix und werden nach jedem Fall entfernt. */
	it('kennt das Präfix, das die Specs verwenden', () => {
		expect(E2E_REFERENCE_PREFIX).toBe('e2e-');
	});
});
