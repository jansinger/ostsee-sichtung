import { describe, expect, it } from 'vitest';
import {
	COLUMN_PREFERENCES_STORAGE_KEY,
	isDefaultVisibility,
	loadColumnPreferences,
	mergeColumnPreferences,
	serializeColumnPreferences
} from './columnPreferences';

const DEFAULTS = { a: true, b: false, c: true };

describe('COLUMN_PREFERENCES_STORAGE_KEY', () => {
	it('ist der vereinbarte Schlüssel', () => {
		expect(COLUMN_PREFERENCES_STORAGE_KEY).toBe('admin.sichtungen.columns');
	});
});

describe('mergeColumnPreferences', () => {
	it('übernimmt gespeicherte Werte für bekannte Schlüssel', () => {
		expect(mergeColumnPreferences(DEFAULTS, { a: false, c: false })).toEqual({
			a: false,
			b: false,
			c: false
		});
	});

	it('ignoriert unbekannte gespeicherte Schlüssel (entfernte Spalte)', () => {
		expect(mergeColumnPreferences(DEFAULTS, { a: false, removedColumn: true })).toEqual({
			a: false,
			b: false,
			c: true
		});
	});

	it('füllt eine im gespeicherten Wert fehlende (neue) Spalte mit ihrem Default', () => {
		// `b` fehlt im gespeicherten Objekt, weil die Spalte erst nach dem
		// letzten Speichern hinzugekommen ist — sie darf nicht als false
		// interpretiert werden, sondern muss ihren eigenen Default behalten.
		expect(mergeColumnPreferences(DEFAULTS, { a: false, c: false })).toEqual({
			a: false,
			b: false,
			c: false
		});
		expect(mergeColumnPreferences(DEFAULTS, { c: false })).toEqual({
			a: true,
			b: false,
			c: false
		});
	});

	it('liefert die Defaults, wenn nichts gespeichert ist', () => {
		expect(mergeColumnPreferences(DEFAULTS, null)).toEqual(DEFAULTS);
		expect(mergeColumnPreferences(DEFAULTS, undefined)).toEqual(DEFAULTS);
	});

	it('ignoriert einen gespeicherten Wert, der kein boolean ist', () => {
		expect(mergeColumnPreferences(DEFAULTS, { a: 'ja' as unknown as boolean })).toEqual(DEFAULTS);
	});
});

describe('loadColumnPreferences', () => {
	it('fällt bei fehlendem Wert (kein Eintrag) auf die Defaults zurück', () => {
		expect(loadColumnPreferences(null, DEFAULTS)).toEqual(DEFAULTS);
	});

	it('fällt bei kaputtem JSON still auf die Defaults zurück', () => {
		expect(loadColumnPreferences('{nicht valides json', DEFAULTS)).toEqual(DEFAULTS);
	});

	it('fällt bei falscher/fehlender Version still auf die Defaults zurück', () => {
		expect(
			loadColumnPreferences(JSON.stringify({ v: 2, columns: { a: false } }), DEFAULTS)
		).toEqual(DEFAULTS);
		expect(loadColumnPreferences(JSON.stringify({ columns: { a: false } }), DEFAULTS)).toEqual(
			DEFAULTS
		);
	});

	it('fällt zurück, wenn "columns" fehlt oder kein Objekt ist', () => {
		expect(loadColumnPreferences(JSON.stringify({ v: 1 }), DEFAULTS)).toEqual(DEFAULTS);
		expect(loadColumnPreferences(JSON.stringify({ v: 1, columns: 'x' }), DEFAULTS)).toEqual(
			DEFAULTS
		);
	});

	it('mergt gültige gespeicherte Werte mit den Defaults (unbekannte Schlüssel raus, neue Spalten drin)', () => {
		const raw = JSON.stringify({ v: 1, columns: { a: false, removedColumn: true } });
		expect(loadColumnPreferences(raw, DEFAULTS)).toEqual({ a: false, b: false, c: true });
	});

	it('Roundtrip: serializeColumnPreferences → loadColumnPreferences liefert dieselbe Auswahl', () => {
		const auswahl = { a: false, b: true, c: false };
		const raw = serializeColumnPreferences(auswahl);
		expect(loadColumnPreferences(raw, DEFAULTS)).toEqual(auswahl);
	});
});

describe('serializeColumnPreferences', () => {
	it('schreibt das versionierte Format', () => {
		expect(JSON.parse(serializeColumnPreferences({ a: true }))).toEqual({
			v: 1,
			columns: { a: true }
		});
	});
});

describe('isDefaultVisibility', () => {
	it('liefert true, wenn die aktuelle Auswahl dem Default entspricht', () => {
		expect(isDefaultVisibility(DEFAULTS, DEFAULTS)).toBe(true);
		expect(isDefaultVisibility({ a: true, b: false, c: true }, DEFAULTS)).toBe(true);
	});

	it('liefert false, wenn eine Spalte vom Default abweicht', () => {
		expect(isDefaultVisibility({ a: false, b: false, c: true }, DEFAULTS)).toBe(false);
	});

	it('liefert false, wenn die aktuelle Auswahl einen Schlüssel weniger als der Default hat', () => {
		const { a: _a, ...rest } = DEFAULTS;
		expect(isDefaultVisibility(rest as unknown as typeof DEFAULTS, DEFAULTS)).toBe(false);
	});

	it('liefert false, wenn die aktuelle Auswahl einen Schlüssel mehr als der Default hat', () => {
		expect(
			isDefaultVisibility({ ...DEFAULTS, extra: true } as unknown as typeof DEFAULTS, DEFAULTS)
		).toBe(false);
	});
});
