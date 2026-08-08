import { describe, expect, it } from 'vitest';
import { isFormDirty } from './isFormDirty';

describe('isFormDirty — ungespeicherte Änderungen erkennen', () => {
	it('meldet keine Änderung, wenn die Werte den Startwerten entsprechen', () => {
		const initial = { species: 0, totalCount: 1, notes: 'Hallo' };
		expect(isFormDirty({ ...initial }, initial)).toBe(false);
	});

	it('meldet eine Änderung, sobald ein Wert abweicht', () => {
		const initial = { species: 0, totalCount: 1 };
		expect(isFormDirty({ ...initial, totalCount: 2 }, initial)).toBe(true);
	});

	it('hält den Eingabefeld-String für unverändert gegenüber der Startzahl', () => {
		// Ein Zahlenfeld liefert nach dem Tippen einen String zurück. Wer den
		// Originalwert wieder einträgt, hat nichts geändert.
		expect(isFormDirty({ totalCount: '1' }, { totalCount: 1 })).toBe(false);
	});

	it('behandelt null, undefined und Leerstring als denselben Leerzustand', () => {
		// Ein nie befülltes Select startet als `null` und meldet sich als `''` —
		// das ist keine Bearbeitung.
		expect(isFormDirty({ notes: '' }, { notes: null })).toBe(false);
		expect(isFormDirty({ notes: undefined }, { notes: '' })).toBe(false);
	});

	it('vergleicht Datumswerte über den Zeitpunkt, nicht über die Objektidentität', () => {
		expect(
			isFormDirty(
				{ created: new Date('2026-07-30T10:00:00Z') },
				{ created: new Date('2026-07-30T10:00:00Z') }
			)
		).toBe(false);
		expect(
			isFormDirty(
				{ created: new Date('2026-07-30T11:00:00Z') },
				{ created: new Date('2026-07-30T10:00:00Z') }
			)
		).toBe(true);
	});

	it('vergleicht Listen über ihren Inhalt', () => {
		expect(isFormDirty({ uploadedFiles: [] }, { uploadedFiles: [] })).toBe(false);
		expect(isFormDirty({ uploadedFiles: [{ id: 1 }] }, { uploadedFiles: [] })).toBe(true);
	});

	it('bemerkt ein Feld, das erst im aktuellen Zustand einen Wert hat', () => {
		expect(isFormDirty({ notes: 'neu' }, {})).toBe(true);
	});

	it('ignoriert ein zusätzliches, aber leeres Feld', () => {
		expect(isFormDirty({ notes: '' }, {})).toBe(false);
	});

	it('gilt ohne Startwerte als unverändert', () => {
		// Der Formular-Store steht beim ersten Rendern noch nicht bereit — daraus
		// darf keine Warnung „ungespeicherte Änderungen" entstehen.
		expect(isFormDirty(undefined, { totalCount: 1 })).toBe(false);
		expect(isFormDirty({ totalCount: 1 }, undefined)).toBe(false);
	});
});
