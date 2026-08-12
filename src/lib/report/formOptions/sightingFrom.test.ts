import { describe, expect, it } from 'vitest';
import {
	SightingFromEnum,
	getSightingFromLabel,
	getSightingFromOptions,
	isValidSightingFrom
} from './sightingFrom';

/**
 * Hintergrund: Die Spalte `vonwo` ist `integer default(0) notNull`, und `0`
 * bedeutet "Sonstiges" — eine echte, aktiv wählbare Kategorie. Wurde nichts
 * angegeben, landete der Datensatz bislang trotzdem auf `0` und behauptete
 * damit eine Antwort, die nie gegeben wurde.
 *
 * `UNKNOWN = 5` trennt "nicht angegeben" von "Sonstiges".
 *
 * Anders als beim Bootsantrieb wurden die Altdaten NICHT korrigiert: 713 der
 * 1.833 `vonwo = 0`-Zeilen tragen einen Freitext (Kajak, SUP, Mehrzweckschiff
 * …) und sind damit belegbar echte "Sonstiges"-Antworten. Für die restlichen
 * Zeilen gibt es keine ableitbare Wahrheit (Messung 2026-07-29).
 */
describe('SightingFromEnum.UNKNOWN', () => {
	it('existiert als eigener Wert 5', () => {
		expect(SightingFromEnum.UNKNOWN).toBe(5);
	});

	it('unterscheidet sich von OTHER (0)', () => {
		expect(SightingFromEnum.UNKNOWN).not.toBe(SightingFromEnum.OTHER);
	});

	it('hat ein eigenes Label, das sich vom Fallback abhebt', () => {
		expect(getSightingFromLabel(SightingFromEnum.UNKNOWN)).toBe('Keine Angabe');
		// Der Fallback für wirklich unbekannte Zahlen bleibt "Unbekannt" —
		// die beiden dürfen sich nicht überlagern.
		expect(getSightingFromLabel(99)).toBe('Unbekannt');
	});

	it('wird von getSightingFromLabel aufgelöst', () => {
		expect(getSightingFromLabel(SightingFromEnum.UNKNOWN)).toBe('Keine Angabe');
		expect(getSightingFromLabel(5)).toBe('Keine Angabe');
	});

	it('gilt als gültiger Wert — auch als String (so ruft das Yup-Schema)', () => {
		expect(isValidSightingFrom(5)).toBe(true);
		expect(isValidSightingFrom('5')).toBe(true);
	});

	// Reihenfolge nach gemessener Häufigkeit, "Sonstiges" ans Ende — Begründung
	// und Messwerte stehen an `SELECTABLE_SIGHTING_FROM` in `sightingFrom.ts`.
	it('erscheint NICHT in den auswählbaren Optionen', () => {
		// "Keine Angabe" ist keine Wahl, die ein Melder trifft — der Wert
		// entsteht ausschließlich serverseitig in `mapFormToSighting`.
		const values = getSightingFromOptions().map((option) => option.value);
		expect(values).not.toContain(SightingFromEnum.UNKNOWN);
		expect(values).toEqual([
			SightingFromEnum.SAILBOAT,
			SightingFromEnum.LAND,
			SightingFromEnum.MOTORBOAT,
			SightingFromEnum.FERRY,
			SightingFromEnum.OTHER
		]);
	});
});

describe('getSightingFromLabel — bestehende Werte bleiben unverändert', () => {
	it('löst alle Alt-Werte weiterhin auf', () => {
		expect(getSightingFromLabel(0)).toBe('Sonstiges');
		expect(getSightingFromLabel(1)).toBe('Segelschiff');
		expect(getSightingFromLabel(2)).toBe('Motorboot');
		expect(getSightingFromLabel(3)).toBe('Land');
		expect(getSightingFromLabel(4)).toBe('Fähre');
	});

	it('bleibt bei null/undefined robust', () => {
		expect(getSightingFromLabel(null)).toBe('Nicht angegeben');
		expect(getSightingFromLabel(undefined)).toBe('Nicht angegeben');
	});
});
