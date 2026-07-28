import { describe, expect, it } from 'vitest';
import {
	descriptionCollapsed,
	photoStatus,
	shouldOpenMapOnCoordinateChange,
	type PositionCapableFile
} from './positionPanelState';

function makeMediaFile(withGps: boolean): PositionCapableFile {
	return { hasPosition: () => withGps };
}

describe('photoStatus', () => {
	it('meldet "none" ohne Dateien', () => {
		expect(photoStatus([])).toBe('none');
	});

	it('meldet "position-applied" bei einem Foto mit GPS', () => {
		expect(photoStatus([makeMediaFile(true)])).toBe('position-applied');
	});

	it('meldet "no-gps" bei einem Foto ohne GPS', () => {
		expect(photoStatus([makeMediaFile(false)])).toBe('no-gps');
	});

	it('bevorzugt ein Foto mit GPS, auch wenn ein Foto ohne GPS zuerst kommt', () => {
		expect(photoStatus([makeMediaFile(false), makeMediaFile(true)])).toBe('position-applied');
	});
});

describe('shouldOpenMapOnCoordinateChange', () => {
	it('öffnet, wenn eine Position neu entsteht', () => {
		expect(shouldOpenMapOnCoordinateChange(true, false)).toBe(true);
	});

	it('öffnet nicht erneut, solange die Position bestehen bleibt', () => {
		expect(shouldOpenMapOnCoordinateChange(true, true)).toBe(false);
	});

	it('öffnet nicht, wenn die Position entfällt', () => {
		expect(shouldOpenMapOnCoordinateChange(false, true)).toBe(false);
	});
});

describe('descriptionCollapsed', () => {
	it('bleibt offen, solange keine Koordinaten vorliegen', () => {
		expect(descriptionCollapsed(false, '', '')).toBe(false);
		expect(descriptionCollapsed(false, 'Kieler Bucht', '')).toBe(false);
	});

	it('klappt zu, wenn Koordinaten vorliegen und beide Felder leer sind', () => {
		expect(descriptionCollapsed(true, '', '')).toBe(true);
		expect(descriptionCollapsed(true, undefined, undefined)).toBe(true);
	});

	it('klappt zu, wenn die Felder nur Leerzeichen enthalten', () => {
		expect(descriptionCollapsed(true, '   ', '\t')).toBe(true);
	});

	it('bleibt offen, wenn das Fahrwasser bereits eingegeben wurde', () => {
		expect(descriptionCollapsed(true, 'Kieler Bucht', '')).toBe(false);
	});

	it('bleibt offen, wenn ein Seezeichen bereits eingegeben wurde', () => {
		expect(descriptionCollapsed(true, '', 'Tonne 14')).toBe(false);
	});
});
