import { describe, expect, it } from 'vitest';
import { buildActivityHeatmap } from './activityHeatmap';

/** 2026-08-09 ist ein Sonntag — der Anker liegt damit am Wochenende. */
const HEUTE = new Date('2026-08-09T10:00:00Z');

describe('buildActivityHeatmap', () => {
	it('liefert genau `tage` Zellen mit Datum, jüngster Tag zuletzt', () => {
		const wochen = buildActivityHeatmap([], HEUTE, 30);
		const tage = wochen.flat().filter((tag) => tag !== null);

		expect(tage).toHaveLength(30);
		expect(tage[0]?.iso).toBe('2026-07-11');
		expect(tage[29]?.iso).toBe('2026-08-09');
	});

	it('richtet die Spalten an echten Wochentagen aus (Montag zuerst)', () => {
		const wochen = buildActivityHeatmap([], HEUTE, 30);

		// 2026-07-11 ist ein Samstag → Spalte 5, davor fünf Leerzellen.
		expect(wochen[0]?.slice(0, 5)).toEqual([null, null, null, null, null]);
		expect(wochen[0]?.[5]?.iso).toBe('2026-07-11');
		expect(wochen[0]?.[6]?.iso).toBe('2026-07-12');
		// Jede Zeile ist eine volle Woche, aufgefüllt mit Leerzellen.
		expect(wochen.every((woche) => woche.length === 7)).toBe(true);
		// Der Sonntag 2026-08-09 schließt die letzte Woche ab.
		expect(wochen.at(-1)?.[6]?.iso).toBe('2026-08-09');
	});

	it('trägt Zählwerte aus der Aktivitätsliste ein, fehlende Tage als 0', () => {
		const wochen = buildActivityHeatmap(
			[
				{ date: '2026-08-09', count: 4 },
				{ date: '2026-08-07', count: '2' }
			],
			HEUTE,
			30
		);
		const nachIso = new Map(
			wochen
				.flat()
				.filter((tag) => tag !== null)
				.map((tag) => [tag.iso, tag])
		);

		expect(nachIso.get('2026-08-09')?.count).toBe(4);
		expect(nachIso.get('2026-08-07')?.count).toBe(2);
		expect(nachIso.get('2026-08-08')?.count).toBe(0);
	});

	it('benennt jede Zelle vollständig — auch die ohne Meldung', () => {
		const wochen = buildActivityHeatmap([{ date: '2026-08-09', count: 1 }], HEUTE, 30);
		const nachIso = new Map(
			wochen
				.flat()
				.filter((tag) => tag !== null)
				.map((tag) => [tag.iso, tag])
		);

		expect(nachIso.get('2026-08-09')?.label).toBe('Sonntag, 9. August: 1 Sichtung');
		expect(nachIso.get('2026-08-08')?.label).toBe('Samstag, 8. August: keine Sichtungen');
	});

	it('staffelt die Intensität in fünf Stufen relativ zum Maximum', () => {
		const wochen = buildActivityHeatmap(
			[
				{ date: '2026-08-09', count: 100 }, // Maximum → Vollstufe
				{ date: '2026-08-08', count: 80 }, // 0,80
				{ date: '2026-08-07', count: 60 }, // 0,60
				{ date: '2026-08-06', count: 30 }, // 0,30
				{ date: '2026-08-05', count: 10 } // 0,10
			],
			HEUTE,
			30
		);
		const stufe = (iso: string) => wochen.flat().find((tag) => tag?.iso === iso)?.step;

		expect(stufe('2026-08-09')).toBe(4);
		expect(stufe('2026-08-08')).toBe(4);
		expect(stufe('2026-08-07')).toBe(3);
		expect(stufe('2026-08-06')).toBe(2);
		expect(stufe('2026-08-05')).toBe(1);
		expect(stufe('2026-08-04')).toBe(0);
	});

	it('setzt ohne jede Meldung alle Stufen auf 0 (keine Division durch 0)', () => {
		const wochen = buildActivityHeatmap([], HEUTE, 30);

		expect(wochen.flat().every((tag) => tag === null || tag.step === 0)).toBe(true);
	});

	it('liefert für einen leeren Zeitraum gar kein Raster', () => {
		// Ohne Abfangen liefe die Rückwärtsrechnung auf `isoVor(-1)` — das Raster
		// richtete sich am Wochentag von *morgen* aus und bestünde aus lauter
		// Leerzellen. Ein Raster ohne einen einzigen Tag ist keine Ausgabe.
		expect(buildActivityHeatmap([], HEUTE, 0)).toEqual([]);
		expect(buildActivityHeatmap([], HEUTE, -3)).toEqual([]);
	});

	it('rechnet über die Sommerzeitumstellung in Kalendertagen', () => {
		// 2026-10-25 ist der Rückstellungstag (25 h Ortszeit). Eine Rechnung mit
		// festen 24-h-Schritten würde hier einen Kalendertag doppelt liefern.
		const wochen = buildActivityHeatmap([], new Date('2026-10-27T10:00:00Z'), 5);
		const iso = wochen
			.flat()
			.filter((tag) => tag !== null)
			.map((tag) => tag.iso);

		expect(iso).toEqual(['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27']);
	});
});
