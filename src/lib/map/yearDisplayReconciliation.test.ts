import { describe, expect, it } from 'vitest';
import { reconcileDisplayedYear } from './yearDisplayReconciliation';

/**
 * Pre-Merge-Review, zweimal unabhängig gefunden: Nach einem Statuswechsel
 * (z. B. "Offen" angehakt) kann das bisher angezeigte Jahr aus der neu
 * geladenen, wählbaren Jahresliste fallen — das Dropdown zeigt dann
 * kommentarlos ein anderes Jahr als die Karte tatsächlich lädt, weil
 * `<option selected={year === selectedYear}>` für kein Jahr mehr zutrifft.
 * Siehe Docblock in yearDisplayReconciliation.ts für die volle Herleitung.
 */
describe('reconcileDisplayedYear', () => {
	it('lässt das angezeigte Jahr unverändert, wenn es weiterhin wählbar ist', () => {
		expect(reconcileDisplayedYear(2024, [2026, 2025, 2024], 2026)).toBeNull();
	});

	it('liefert das Fallback-Jahr, wenn das angezeigte Jahr aus der Liste gefallen ist (schrumpfende Liste)', () => {
		// Der konkrete Szenario aus dem Review: Admin steht auf 2024, hakt
		// "Offen" an — 2024 hat dort keine Treffer und fällt aus der Liste.
		expect(reconcileDisplayedYear(2024, [2026, 2025], 2026)).toBe(2026);
	});

	it('wechselt auf das Fallback-Jahr, wenn gar keine Jahre mehr wählbar sind', () => {
		// Grenzfall: Eine leere Liste enthält das angezeigte Jahr nicht, also
		// gilt dieselbe Regel wie bei der schrumpfenden Liste — kein Sonderfall,
		// der "unverändert lassen" rechtfertigte.
		expect(reconcileDisplayedYear(2024, [], 2026)).toBe(2026);
	});

	it('bleibt beim angezeigten Jahr, wenn es das einzige wählbare ist', () => {
		expect(reconcileDisplayedYear(2023, [2023], 2026)).toBeNull();
	});
});
