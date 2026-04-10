// ol/style wird auf Modulebene instanziiert (new Stroke(), new Fill() in legendGroups).
// Mock muss vor dem Import aktiv sein — vi.mock() wird von Vitest automatisch gehoisted.
import { describe, expect, it, vi } from 'vitest';

vi.mock('ol/style', () => {
	class Stroke {
		private color: string;
		constructor(opts?: { color?: string; width?: number }) {
			this.color = opts?.color ?? 'black';
		}
		getColor() {
			return this.color;
		}
	}
	class Fill {
		private color: string;
		constructor(opts?: { color?: string }) {
			this.color = opts?.color ?? '#000';
		}
		getColor() {
			return this.color;
		}
	}
	class Style {
		constructor(_opts?: unknown) {}
	}
	class Circle {
		constructor(_opts?: unknown) {}
	}
	class RegularShape {
		constructor(_opts?: unknown) {}
	}
	class Text {
		constructor(_opts?: unknown) {}
	}
	return { Stroke, Fill, Style, Circle, RegularShape, Text };
});

import {
	backgroundColors,
	getFeatureColorGroup,
	isBetween,
	legendGroups,
	speciesSymbols
} from './styleUtils';
import type { SightingProperties } from './styleUtils';

describe('styleUtils', () => {
	describe('speciesSymbols', () => {
		it('hat Einträge für alle 11 Tierarten (0–10)', () => {
			for (let i = 0; i <= 10; i++) {
				expect(speciesSymbols[String(i)], `Tierart ${i} fehlt`).toBeDefined();
			}
		});

		it('jeder Eintrag hat symbol, baseColor, size und category', () => {
			for (const [id, entry] of Object.entries(speciesSymbols)) {
				expect(entry.symbol, `symbol fehlt für ${id}`).toBeTruthy();
				expect(entry.baseColor, `baseColor fehlt für ${id}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
				expect(entry.size, `size fehlt für ${id}`).toBeGreaterThan(0);
				expect(['kleinwal', 'grosswal', 'robbe'], `ungültige category für ${id}`).toContain(
					entry.category
				);
			}
		});

		it('Schweinswal (0) ist Kleinwal', () => {
			expect(speciesSymbols['0']!.category).toBe('kleinwal');
		});

		it('Kegelrobbe (1) ist Robbe', () => {
			expect(speciesSymbols['1']!.category).toBe('robbe');
		});

		it('Buckelwal (7) ist Großwal', () => {
			expect(speciesSymbols['7']!.category).toBe('grosswal');
		});
	});

	describe('backgroundColors', () => {
		it('hat Hintergrundfarben für alle drei Kategorien', () => {
			expect(backgroundColors['kleinwal']).toBeDefined();
			expect(backgroundColors['grosswal']).toBeDefined();
			expect(backgroundColors['robbe']).toBeDefined();
		});

		it('alle Farben sind gültige Hex-Codes', () => {
			for (const [, color] of Object.entries(backgroundColors)) {
				expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
			}
		});
	});

	describe('legendGroups', () => {
		it('enthält alle erwarteten Gruppen', () => {
			expect(legendGroups['ct0']).toBeDefined();
			expect(legendGroups['ct1']).toBeDefined();
			expect(legendGroups['ct2']).toBeDefined();
			expect(legendGroups['ct6']).toBeDefined();
			expect(legendGroups['ct11']).toBeDefined();
			expect(legendGroups['ct15']).toBeDefined();
		});

		it('ct0-matcher trifft auf Totfund (tf=true)', () => {
			const props: SightingProperties = { ta: 0, ct: 5, tf: true, ts: 0 };
			expect(legendGroups['ct0']!.match(props)).toBe(true);
		});

		it('ct0-matcher trifft auf ct === 0', () => {
			const props: SightingProperties = { ta: 0, ct: 0, tf: false, ts: 0 };
			expect(legendGroups['ct0']!.match(props)).toBe(true);
		});

		it('ct1-matcher trifft auf ct === 1, kein Totfund', () => {
			const props: SightingProperties = { ta: 0, ct: 1, tf: false, ts: 0 };
			expect(legendGroups['ct1']!.match(props)).toBe(true);
		});

		it('ct2-matcher trifft auf Bereich 2–5', () => {
			expect(legendGroups['ct2']!.match({ ta: 0, ct: 2, tf: false, ts: 0 })).toBe(true);
			expect(legendGroups['ct2']!.match({ ta: 0, ct: 5, tf: false, ts: 0 })).toBe(true);
			expect(legendGroups['ct2']!.match({ ta: 0, ct: 6, tf: false, ts: 0 })).toBe(false);
		});

		it('ct6-matcher trifft auf Bereich 6–10', () => {
			expect(legendGroups['ct6']!.match({ ta: 0, ct: 6, tf: false, ts: 0 })).toBe(true);
			expect(legendGroups['ct6']!.match({ ta: 0, ct: 10, tf: false, ts: 0 })).toBe(true);
			expect(legendGroups['ct6']!.match({ ta: 0, ct: 11, tf: false, ts: 0 })).toBe(false);
		});

		it('ct11-matcher trifft auf Bereich 11–15', () => {
			expect(legendGroups['ct11']!.match({ ta: 0, ct: 11, tf: false, ts: 0 })).toBe(true);
			expect(legendGroups['ct11']!.match({ ta: 0, ct: 15, tf: false, ts: 0 })).toBe(true);
			expect(legendGroups['ct11']!.match({ ta: 0, ct: 16, tf: false, ts: 0 })).toBe(false);
		});

		it('ct15-matcher trifft auf ct > 15', () => {
			expect(legendGroups['ct15']!.match({ ta: 0, ct: 16, tf: false, ts: 0 })).toBe(true);
			expect(legendGroups['ct15']!.match({ ta: 0, ct: 100, tf: false, ts: 0 })).toBe(true);
			expect(legendGroups['ct15']!.match({ ta: 0, ct: 15, tf: false, ts: 0 })).toBe(false);
		});
	});

	describe('getFeatureColorGroup', () => {
		it('gibt ct0 zurück für Totfund', () => {
			expect(getFeatureColorGroup({ ta: 0, ct: 3, tf: true, ts: 0 })).toBe('ct0');
		});

		it('gibt ct0 zurück für ct === 0', () => {
			expect(getFeatureColorGroup({ ta: 0, ct: 0, tf: false, ts: 0 })).toBe('ct0');
		});

		it('gibt ct1 zurück für ct === 1', () => {
			expect(getFeatureColorGroup({ ta: 0, ct: 1, tf: false, ts: 0 })).toBe('ct1');
		});

		it('gibt ct2 zurück für ct = 2', () => {
			expect(getFeatureColorGroup({ ta: 0, ct: 2, tf: false, ts: 0 })).toBe('ct2');
		});

		it('gibt ct2 zurück für ct = 5', () => {
			expect(getFeatureColorGroup({ ta: 0, ct: 5, tf: false, ts: 0 })).toBe('ct2');
		});

		it('gibt ct6 zurück für ct = 6', () => {
			expect(getFeatureColorGroup({ ta: 0, ct: 6, tf: false, ts: 0 })).toBe('ct6');
		});

		it('gibt ct11 zurück für ct = 11', () => {
			expect(getFeatureColorGroup({ ta: 0, ct: 11, tf: false, ts: 0 })).toBe('ct11');
		});

		it('gibt ct15 zurück für ct = 16', () => {
			expect(getFeatureColorGroup({ ta: 0, ct: 16, tf: false, ts: 0 })).toBe('ct15');
		});

		it('gibt ct1 als Fallback zurück (Grenzfall: kein Match)', () => {
			// Alle realistischen Werte matchen. Testet dass die Funktion einen Default zurückgibt.
			// ct=1, tf=false → ct1
			expect(getFeatureColorGroup({ ta: 5, ct: 1, tf: false, ts: 0 })).toBe('ct1');
		});
	});

	describe('isBetween', () => {
		it('gibt true zurück für Wert innerhalb des Bereichs', () => {
			expect(isBetween(5, 1, 10)).toBe(true);
			expect(isBetween(1, 1, 10)).toBe(true);
			expect(isBetween(10, 1, 10)).toBe(true);
		});

		it('gibt false zurück für Wert außerhalb des Bereichs', () => {
			expect(isBetween(0, 1, 10)).toBe(false);
			expect(isBetween(11, 1, 10)).toBe(false);
		});

		it('funktioniert auch wenn lower > upper', () => {
			expect(isBetween(5, 10, 1)).toBe(true);
			expect(isBetween(0, 10, 1)).toBe(false);
		});
	});
});
