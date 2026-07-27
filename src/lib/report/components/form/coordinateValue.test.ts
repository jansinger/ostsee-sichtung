import { describe, expect, it } from 'vitest';
import { hasCoordinates, toCoordinate } from './coordinateValue';

describe('toCoordinate', () => {
	it('gibt undefined für undefined zurück (kein Phantom-Default)', () => {
		expect(toCoordinate(undefined)).toBeUndefined();
	});

	it('gibt undefined für null zurück', () => {
		expect(toCoordinate(null)).toBeUndefined();
	});

	it('gibt undefined für einen leeren String zurück (geleertes Eingabefeld)', () => {
		expect(toCoordinate('')).toBeUndefined();
		expect(toCoordinate('   ')).toBeUndefined();
	});

	it('gibt undefined für nicht-numerische Strings zurück', () => {
		expect(toCoordinate('keine Zahl')).toBeUndefined();
	});

	it('gibt undefined für Booleans zurück', () => {
		expect(toCoordinate(true)).toBeUndefined();
		expect(toCoordinate(false)).toBeUndefined();
	});

	it('übernimmt Zahlen unverändert', () => {
		expect(toCoordinate(54.5042)).toBe(54.5042);
	});

	it('akzeptiert die Null als gültige Koordinate', () => {
		expect(toCoordinate(0)).toBe(0);
		expect(toCoordinate('0')).toBe(0);
	});

	it('wandelt EXIF-Strings der Form "54.5000" in Zahlen um', () => {
		expect(toCoordinate('54.5000')).toBe(54.5);
		expect(toCoordinate('-13.2500')).toBe(-13.25);
	});

	it('gibt undefined für NaN und Infinity zurück', () => {
		expect(toCoordinate(Number.NaN)).toBeUndefined();
		expect(toCoordinate(Number.POSITIVE_INFINITY)).toBeUndefined();
	});
});

describe('hasCoordinates', () => {
	it('ist true, wenn Breite und Länge echte Zahlen sind', () => {
		expect(hasCoordinates(54.5, 13.5)).toBe(true);
		expect(hasCoordinates('54.5000', '13.5000')).toBe(true);
	});

	it('ist false, wenn eine der beiden Koordinaten fehlt', () => {
		expect(hasCoordinates(54.5, undefined)).toBe(false);
		expect(hasCoordinates(undefined, 13.5)).toBe(false);
		expect(hasCoordinates('', '')).toBe(false);
	});

	it('ist true für den Nullmeridian/Äquator (0 ist kein "leerer" Wert)', () => {
		expect(hasCoordinates(0, 0)).toBe(true);
	});
});

describe('Koordinaten-Emission an das Formular (Regression)', () => {
	it('leeres Koordinatenfeld darf keinen leeren String im Formular hinterlassen', () => {
		// Regression: emitField schrieb '' statt undefined. Da createForm.handleChange
		// target.value unverändert speichert, landete '' im State — yup castet das zu
		// NaN und meldet "Breitengrad must be a `number` type", obwohl die Koordinate
		// ohne GPS-Position optional ist.
		expect(toCoordinate('')).toBeUndefined();
		expect(toCoordinate(undefined)).toBeUndefined();
		expect(hasCoordinates('', '')).toBe(false);
	});
});
