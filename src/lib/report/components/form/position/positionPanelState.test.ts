import { describe, expect, it } from 'vitest';
import {
	descriptionCollapsed,
	photoStatus,
	shouldOpenMapOnCoordinateChange,
	type PositionCapableFile
} from './positionPanelState';

/**
 * `analyzed = false` bildet den Zustand direkt nach dem Drop ab: `MediaFile`
 * liegt bereits im Store (DropzoneEnhanced.svelte:264, synchron), die
 * EXIF-Auswertung läuft aber noch (MediaFile.ts — `metadata.then` im Konstruktor).
 */
function makeMediaFile(withGps: boolean, analyzed: boolean = true): PositionCapableFile {
	return { hasPosition: () => withGps, isAnalyzed: () => analyzed, isFromPositionStep: true };
}

/** Datei aus Schritt 3 (Medien) — liegt im selben Store, gehört aber nicht hierher. */
function makeMediaStepFile(withGps: boolean, analyzed: boolean = true): PositionCapableFile {
	return { hasPosition: () => withGps, isAnalyzed: () => analyzed, isFromPositionStep: false };
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

	it('meldet "analyzing", solange die EXIF-Auswertung des Fotos noch läuft', () => {
		expect(photoStatus([makeMediaFile(false, false)])).toBe('analyzing');
	});

	it('behauptet während der Auswertung NICHT, dass GPS fehlt', () => {
		expect(photoStatus([makeMediaFile(false, false)])).not.toBe('no-gps');
	});

	it('meldet "no-gps" erst, wenn die Auswertung abgeschlossen ist', () => {
		expect(photoStatus([makeMediaFile(false, true)])).toBe('no-gps');
	});

	it('meldet "position-applied", sobald eine Datei GPS trägt — auch wenn eine andere noch läuft', () => {
		expect(photoStatus([makeMediaFile(false, false), makeMediaFile(true)])).toBe(
			'position-applied'
		);
	});

	it('wartet, solange auch nur eine Datei des Positions-Schritts noch ausgewertet wird', () => {
		expect(photoStatus([makeMediaFile(false, true), makeMediaFile(false, false)])).toBe(
			'analyzing'
		);
	});
});

/**
 * `mediaStore` wird einmal pro Formular angelegt (Form.svelte:40) und von allen
 * Schritten geteilt. Ohne Eingrenzung entschiede ein Foto aus Schritt 3
 * (Medien) mit darüber, was das Panel in Schritt 1 über „dieses Foto" behauptet.
 */
describe('photoStatus — Eingrenzung auf den Positions-Schritt', () => {
	it('ignoriert Dateien aus dem Medien-Schritt vollständig', () => {
		expect(photoStatus([makeMediaStepFile(false), makeMediaStepFile(true)])).toBe('none');
	});

	it('behauptet nicht „kein GPS", wenn nur im Medien-Schritt Fotos ohne GPS liegen', () => {
		expect(photoStatus([makeMediaStepFile(false)])).not.toBe('no-gps');
	});

	it('lässt eine laufende Auswertung im Medien-Schritt den Zustand C nicht blockieren', () => {
		expect(photoStatus([makeMediaFile(false, true), makeMediaStepFile(false, false)])).toBe(
			'no-gps'
		);
	});

	it('übernimmt keine GPS-Position aus einem Foto des Medien-Schritts', () => {
		expect(photoStatus([makeMediaFile(false, true), makeMediaStepFile(true)])).toBe('no-gps');
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
