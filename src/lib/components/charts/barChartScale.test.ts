/**
 * @fileoverview Geometrie der Balkendiagramme (B5)
 *
 * Die Rechnung liegt bewusst außerhalb der Svelte-Komponente: Ein Diagramm, das
 * bei leerer Datenlage `NaN` in ein `height`-Attribut schreibt, rendert stumm
 * falsch — im DOM steht dann ein Balken ohne Höhe, und kein Komponententest
 * sieht den Unterschied zu „Wert ist 0". Hier ist derselbe Fall eine Assertion.
 */

import { describe, expect, it } from 'vitest';
import { layoutBars, niceAxisMax, type BarDatum, type BarGeometry } from './barChartScale';

const GROESSE = { width: 600, height: 200, gap: 4 };

const daten = (...werte: number[]): BarDatum[] =>
	werte.map((value, index) => ({ label: `L${index}`, value }));

describe('niceAxisMax', () => {
	it('liefert für eine leere Datenlage eine Achse ohne Division durch null', () => {
		expect(niceAxisMax(0)).toBeGreaterThan(0);
	});

	it('liegt nie unter dem größten Wert', () => {
		for (const wert of [1, 3, 7, 42, 99, 100, 101, 1200, 19262]) {
			expect(niceAxisMax(wert), `Achse zu klein für ${wert}`).toBeGreaterThanOrEqual(wert);
		}
	});

	it('lässt höchstens die Hälfte an Luft über dem größten Wert', () => {
		// Eine Achse, die weit über den Daten endet, drückt alle Balken flach.
		for (const wert of [1, 3, 7, 42, 99, 101, 1200, 19262]) {
			expect(niceAxisMax(wert), `zu viel Luft über ${wert}`).toBeLessThanOrEqual(wert * 1.5);
		}
	});

	it('trifft runde Werte exakt', () => {
		expect(niceAxisMax(100)).toBe(100);
		expect(niceAxisMax(1200)).toBe(1200);
	});
});

describe('layoutBars', () => {
	it('legt für jeden Datenpunkt genau einen Balken an', () => {
		const layout = layoutBars(daten(1, 2, 3), GROESSE);

		expect(layout.bars).toHaveLength(3);
		expect(layout.bars.map((bar) => bar.label)).toEqual(['L0', 'L1', 'L2']);
	});

	it('hält alle Balken innerhalb der Zeichenfläche', () => {
		const layout = layoutBars(daten(5, 100, 60, 0, 12), GROESSE);

		for (const bar of layout.bars) {
			expect(bar.x).toBeGreaterThanOrEqual(0);
			expect(bar.x + bar.width).toBeLessThanOrEqual(GROESSE.width + 0.001);
			expect(bar.y).toBeGreaterThanOrEqual(0);
			expect(bar.y + bar.height).toBeLessThanOrEqual(GROESSE.height + 0.001);
			expect(bar.width).toBeGreaterThan(0);
		}
	});

	it('setzt die Balken auf eine gemeinsame Grundlinie', () => {
		const layout = layoutBars(daten(5, 100, 60), GROESSE);

		for (const bar of layout.bars) {
			expect(bar.y + bar.height).toBeCloseTo(GROESSE.height, 6);
		}
	});

	it('skaliert die Höhe linear auf die Achse', () => {
		const layout = layoutBars(daten(0, 50, 100), GROESSE);
		const [leer, halb, voll] = layout.bars as [BarGeometry, BarGeometry, BarGeometry];

		expect(leer.height).toBe(0);
		expect(voll.height).toBeCloseTo(GROESSE.height * (100 / layout.axisMax), 6);
		expect(halb.height).toBeCloseTo(voll.height / 2, 6);
	});

	it('erzeugt bei durchweg leeren Werten keine NaN', () => {
		const layout = layoutBars(daten(0, 0, 0), GROESSE);

		for (const bar of layout.bars) {
			expect(Number.isFinite(bar.x)).toBe(true);
			expect(Number.isFinite(bar.y)).toBe(true);
			expect(Number.isFinite(bar.width)).toBe(true);
			expect(Number.isFinite(bar.height)).toBe(true);
			expect(bar.height).toBe(0);
		}
	});

	it('kommt mit einer leeren Datenreihe aus', () => {
		const layout = layoutBars([], GROESSE);

		expect(layout.bars).toEqual([]);
		expect(layout.axisMax).toBeGreaterThan(0);
	});

	it('ordnet die Balken von links nach rechts ohne Überlappung', () => {
		const layout = layoutBars(daten(1, 2, 3, 4), GROESSE);

		for (let i = 1; i < layout.bars.length; i++) {
			const vorher = layout.bars[i - 1]!;
			expect(layout.bars[i]!.x).toBeGreaterThanOrEqual(vorher.x + vorher.width);
		}
	});

	it('dünnt die Achsenbeschriftung aus, statt sie übereinanderzuschieben', () => {
		const viele = layoutBars(daten(...Array.from({ length: 24 }, (_, i) => i + 1)), {
			...GROESSE,
			maxLabels: 12
		});

		const beschriftet = viele.bars.filter((bar) => bar.showLabel);
		expect(beschriftet.length).toBeLessThanOrEqual(12);
		expect(viele.bars[0]!.showLabel, 'der erste Balken bleibt immer beschriftet').toBe(true);
	});

	it('beschriftet jeden Balken, solange sie hineinpassen', () => {
		const layout = layoutBars(daten(1, 2, 3), { ...GROESSE, maxLabels: 12 });

		expect(layout.bars.every((bar) => bar.showLabel)).toBe(true);
	});

	it('reicht die Hervorhebung durch', () => {
		const layout = layoutBars(
			[
				{ label: '2024', value: 5 },
				{ label: '2025', value: 8, highlighted: true }
			],
			GROESSE
		);

		expect(layout.bars.map((bar) => bar.highlighted)).toEqual([false, true]);
	});
});
