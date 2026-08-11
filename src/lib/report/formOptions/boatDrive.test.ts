import { describe, expect, it } from 'vitest';
import {
	BoatDriveEnum,
	getBoatDriveLabel,
	getBoatDriveOptions,
	getPublicBoatDriveOptions,
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
		expect(getBoatDriveLabel(BoatDriveEnum.NONE)).toBe('Kein Boot');
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
		// `OTHER` steht am Ende, obwohl sein Enum-Wert `0` ist — Auffangkategorie
		// hinter die konkreten Antworten (siehe `SELECTABLE_BOAT_DRIVES`).
		expect(values).toEqual([
			BoatDriveEnum.MOTOR,
			BoatDriveEnum.SAIL,
			BoatDriveEnum.DRIFTING,
			BoatDriveEnum.ANCHORED,
			BoatDriveEnum.MOTOR_OFF,
			BoatDriveEnum.OTHER
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
describe('getPublicBoatDriveOptions() (Meldeformular)', () => {
	it('bietet genau zwei Antworten an — Motor an und Motor aus', () => {
		expect(getPublicBoatDriveOptions()).toEqual([
			{ value: BoatDriveEnum.MOTOR, label: 'Motor lief' },
			{ value: BoatDriveEnum.MOTOR_OFF, label: 'Motor lief nicht' }
		]);
	});

	it('enthält keinen der feineren Alt-Werte, die nur die Admin-Maske führt', () => {
		const values = getPublicBoatDriveOptions().map((option) => option.value);
		expect(values).not.toContain(BoatDriveEnum.OTHER);
		expect(values).not.toContain(BoatDriveEnum.SAIL);
		expect(values).not.toContain(BoatDriveEnum.DRIFTING);
		expect(values).not.toContain(BoatDriveEnum.ANCHORED);
	});
});

/**
 * Gemeldet am 2026-08-06: Im Meldeformular sei die Option „Motor lief" mit
 * `value="undefined"` im DOM gelandet, und „Weiter" habe die rohe Yup-Meldung
 * „Bootsantrieb must be a `number` type, but the final value was: `NaN` (cast
 * from the value `"undefined"`)" gezeigt. Am Bestand ließ sich das nicht
 * nachstellen (Browser-Prüfung gegen den Dev-Server, beide Radios trugen
 * `value="1"` bzw. `value="6"`).
 *
 * Warum trotzdem ein Test: `getPublicBoatDriveOptions()` ist zwar per `toEqual`
 * oben festgenagelt, die aus `Object.values(BoatDriveEnum)` **abgeleitete**
 * Admin-Liste aber nur auf Vollständigkeit geprüft, nie auf die Beschaffenheit
 * ihrer Werte. Der Optionswert macht auf dem Weg zur Validierung eine DOM-Runde
 * (`value`-Attribut → `handleChange` liest `target.value` als String → Yup
 * castet zurück); ein nicht-numerischer Eintrag überlebt `toBeDefined()`
 * problemlos und wird erst dort zu NaN. Geprüft wird deshalb der String-Zustand,
 * nicht der Startwert.
 */
describe('Optionswerte überstehen die DOM-Runde (value-Attribut → Yup-Cast)', () => {
	const optionsListen = [
		['getPublicBoatDriveOptions() (Meldeformular)', getPublicBoatDriveOptions()],
		['getBoatDriveOptions() (Admin-Maske)', getBoatDriveOptions()]
	] as const;

	it.each(optionsListen)('%s trägt in jedem Eintrag eine endliche Zahl', (_name, options) => {
		expect(options.length).toBeGreaterThan(0);

		for (const option of options) {
			expect(typeof option.value, `Option "${option.label}"`).toBe('number');
			expect(Number.isFinite(option.value), `Option "${option.label}"`).toBe(true);
		}
	});

	// Der Test mit Aussagekraft: `isValidBoatDrive` prüft die Enum-Zugehörigkeit,
	// und zwar am String — also an dem, was aus dem DOM zurückkommt. Ein
	// `Number(String(n)) === n` daneben wäre tautologisch (gilt für jede endliche
	// Zahl) und ist deshalb bewusst nicht da.
	it.each(optionsListen)('%s gilt auch als String noch als gültiger Antrieb', (_name, options) => {
		for (const option of options) {
			expect(isValidBoatDrive(String(option.value)), `Option "${option.label}"`).toBe(true);
		}
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
