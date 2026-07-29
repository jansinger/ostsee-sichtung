import { describe, expect, it } from 'vitest';
import {
	BoatDriveEnum,
	boatDriveLabels,
	getBoatDriveLabel,
	getBoatDriveOptions,
	isValidBoatDrive
} from './boatDrive';

/**
 * Hintergrund: Die Spalte `bootsantrieb` ist `integer default(0) notNull`, und
 * `0` bedeutet "Sonstiger Bootsantrieb" — nicht "kein Boot". Land-Sichtungen
 * trugen dadurch die aktive Behauptung, es habe ein Boot mit ungewöhnlichem
 * Antrieb gegeben (5.858 von 19.880 Zeilen, Stand 2026-07-29).
 *
 * `NONE = 5` macht "kein Boot" explizit unterscheidbar.
 */
describe('BoatDriveEnum.NONE', () => {
	it('existiert als eigener Wert 5', () => {
		expect(BoatDriveEnum.NONE).toBe(5);
	});

	it('unterscheidet sich von OTHER (0)', () => {
		expect(BoatDriveEnum.NONE).not.toBe(BoatDriveEnum.OTHER);
	});

	it('hat ein eigenes Label', () => {
		expect(boatDriveLabels[BoatDriveEnum.NONE]).toBe('Kein Boot');
	});

	it('wird von getBoatDriveLabel aufgelöst statt als "Unbekannt" zu enden', () => {
		expect(getBoatDriveLabel(BoatDriveEnum.NONE)).toBe('Kein Boot');
		expect(getBoatDriveLabel(5)).toBe('Kein Boot');
	});

	it('gilt als gültiger Wert (Yup-Validierung, Legacy-API-Eingang)', () => {
		expect(isValidBoatDrive(5)).toBe(true);
		expect(isValidBoatDrive('5')).toBe(true);
	});

	it('erscheint NICHT in den auswählbaren Optionen', () => {
		// Das Antriebsfeld wird nur bei Segelschiff/Motorboot abgefragt — dort
		// wäre "Kein Boot" widersprüchlich. Der Wert entsteht ausschließlich
		// serverseitig beim Speichern einer Land-Sichtung.
		const values = getBoatDriveOptions().map((option) => option.value);
		expect(values).not.toContain(BoatDriveEnum.NONE);
		expect(values).toEqual([
			BoatDriveEnum.OTHER,
			BoatDriveEnum.MOTOR,
			BoatDriveEnum.SAIL,
			BoatDriveEnum.DRIFTING,
			BoatDriveEnum.ANCHORED
		]);
	});
});

describe('getBoatDriveLabel — bestehende Werte bleiben unverändert', () => {
	it('löst alle Alt-Werte weiterhin auf', () => {
		expect(getBoatDriveLabel(0)).toBe('Sonstiger Bootsantrieb');
		expect(getBoatDriveLabel(1)).toBe('Motor');
		expect(getBoatDriveLabel(2)).toBe('Segel');
		expect(getBoatDriveLabel(3)).toBe('Treibend');
		expect(getBoatDriveLabel(4)).toBe('Vor Anker');
	});

	it('bleibt bei null/undefined und unbekannten Werten robust', () => {
		expect(getBoatDriveLabel(null)).toBe('Nicht angegeben');
		expect(getBoatDriveLabel(undefined)).toBe('Nicht angegeben');
		expect(getBoatDriveLabel(99)).toBe('Unbekannt');
	});
});
