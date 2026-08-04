import { describe, expect, it } from 'vitest';
import {
	BoatDriveEnum,
	boatDriveLabels,
	getBoatDriveLabel,
	getBoatDriveOptions,
	isValidBoatDrive,
	PUBLIC_BOAT_DRIVE_OPTIONS
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
			BoatDriveEnum.ANCHORED,
			BoatDriveEnum.MOTOR_OFF
		]);
	});
});

/**
 * Hintergrund (PR 4, Museum am 2026-08-04): Bei Motorboot/Segelschiff wird die
 * Folgefrage zum Antrieb auf "Motor an / Motor aus" verengt. "Motor an" bleibt
 * `MOTOR = 1`; "Motor aus" bekommt einen eigenen Wert `MOTOR_OFF = 6`, weil
 * DRIFTING/ANCHORED etwas fachlich anderes behaupten (treibend/vor Anker), was
 * ein Melder mit "Motor aus" nie gesagt hat.
 */
describe('BoatDriveEnum.MOTOR_OFF (PR 4 — Motor an/aus)', () => {
	it('existiert als eigener Wert 6', () => {
		expect(BoatDriveEnum.MOTOR_OFF).toBe(6);
	});

	it('gilt als gültiger Wert (Yup-Validierung, Legacy-Antworten-Tabelle)', () => {
		expect(isValidBoatDrive(BoatDriveEnum.MOTOR_OFF)).toBe(true);
		expect(isValidBoatDrive(String(BoatDriveEnum.MOTOR_OFF))).toBe(true);
	});

	it('wird von getBoatDriveLabel als "Motor aus" aufgelöst statt als "Unbekannt" zu enden', () => {
		expect(getBoatDriveLabel(BoatDriveEnum.MOTOR_OFF)).toBe('Motor aus');
	});

	it('erscheint in den auswählbaren Optionen (Admin-Auswahl leitet sich aus Object.values ab)', () => {
		const values = getBoatDriveOptions().map((option) => option.value);
		expect(values).toContain(BoatDriveEnum.MOTOR_OFF);

		const entry = getBoatDriveOptions().find((option) => option.value === BoatDriveEnum.MOTOR_OFF);
		expect(entry?.label).toBe('Motor aus');
	});

	it('lässt NONE (5) weiterhin außerhalb der auswählbaren Optionen — kein neuer dritter Zustand', () => {
		const values = getBoatDriveOptions().map((option) => option.value);
		expect(values).not.toContain(BoatDriveEnum.NONE);
	});
});

/**
 * Die öffentliche Zweier-Auswahl im Meldeformular. Sie ist bewusst eine eigene
 * Konstante und keine gefilterte Sicht auf `getBoatDriveOptions()`: die Labels
 * ("Motor lief" statt "Motor") sind auf die Frage zugeschnitten.
 */
describe('PUBLIC_BOAT_DRIVE_OPTIONS (Meldeformular)', () => {
	it('bietet genau zwei Antworten an — Motor an und Motor aus', () => {
		expect(PUBLIC_BOAT_DRIVE_OPTIONS).toEqual([
			{ value: BoatDriveEnum.MOTOR, label: 'Motor lief' },
			{ value: BoatDriveEnum.MOTOR_OFF, label: 'Motor lief nicht' }
		]);
	});

	it('enthält keinen der feineren Alt-Werte, die nur die Admin-Maske führt', () => {
		const values = PUBLIC_BOAT_DRIVE_OPTIONS.map((option) => option.value);
		expect(values).not.toContain(BoatDriveEnum.OTHER);
		expect(values).not.toContain(BoatDriveEnum.SAIL);
		expect(values).not.toContain(BoatDriveEnum.DRIFTING);
		expect(values).not.toContain(BoatDriveEnum.ANCHORED);
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
