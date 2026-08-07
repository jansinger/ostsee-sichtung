import { describe, expect, it } from 'vitest';
import { AnimalConditionEnum, getAnimalConditionOptions } from './animalCondition';
import { BoatDriveEnum, getBoatDriveOptions } from './boatDrive';
import { BoatTypeEnum, getBoatTypeOptions } from './boatType';
import { MediaTypeEnum, getMediaTypeOptions } from './mediaType';
import { SeaStateEnum, getSeaStateOptions } from './seaState';
import { SexEnum, getSexOptions } from './sex';
import { VisibilityEnum, getVisibilityOptions } from './visibility';
import { WindDirectionEnum, getWindDirectionOptions } from './windDirection';

/**
 * Reihenfolge der Auswahllisten — unabhängig vom gespeicherten Wert.
 *
 * Hintergrund: Die meisten Listen entstanden aus `Object.entries(labels)`, und
 * JavaScript sortiert ganzzahlige Objekt-Schlüssel **immer** numerisch
 * aufsteigend — die Reihenfolge im Quelltext ist dabei wirkungslos. Da die
 * Auffangkategorie ("Sonstiges") historisch die `0` trägt, stand sie damit
 * überall an erster Stelle: vor allen konkreten Antworten.
 *
 * Zwei Regeln, beide auf Wunsch des Deutschen Meeresmuseums (2026-08-07),
 * beide rein kosmetisch — der gespeicherte Wert ändert sich nirgends:
 *
 *  1. Die Auffangkategorie steht am **Ende**.
 *  2. "Keine Angabe"/"Unbekannt" steht in einer Liste eines **optionalen**
 *     Feldes gar nicht mehr: `BaseSelect` rendert ohnehin einen
 *     Platzhalter ("Bitte wählen…"), solange nichts gewählt ist. Eine zweite
 *     Formulierung derselben Aussage stiftet nur Verwirrung.
 *
 * Ausgenommen von Regel 2 ist `deadCondition` (siehe `animalCondition`-Block
 * unten): Das Feld ist im Totfund-Zweig Pflicht, dort braucht "Unbekannt"
 * einen Platz — nur eben den letzten.
 *
 * Bereits vor dieser Runde umgesetzt und deshalb hier nicht wiederholt:
 * `animalBehavior` und `sightingFrom`/`distribution` (siehe
 * `unspecifiedDefaults.test.ts` und `sightingFrom.test.ts`).
 */
describe('Auffangkategorie steht am Ende', () => {
	it('animalCondition: "Unbekannt" zuletzt — das Feld ist Pflicht, der Ausweg bleibt', () => {
		const values = getAnimalConditionOptions().map((option) => option.value);
		expect(values).toEqual([
			AnimalConditionEnum.EXTREMELY_FRESH,
			AnimalConditionEnum.FRESH_BEGINNING_DECOMPOSITION,
			AnimalConditionEnum.MEDIUM_DECOMPOSITION,
			AnimalConditionEnum.ADVANCED_DECOMPOSITION,
			AnimalConditionEnum.SEVERE_DECOMPOSITION,
			AnimalConditionEnum.UNKNOWN
		]);
	});

	it('boatType: "Sonstiger Bootstyp" zuletzt', () => {
		const values = getBoatTypeOptions().map((option) => option.value);
		expect(values.at(-1)).toBe(BoatTypeEnum.OTHER);
		expect(values.at(0)).toBe(BoatTypeEnum.SAILBOAT);
		expect(values).toHaveLength(Object.keys(BoatTypeEnum).length / 2);
	});

	it('mediaType: "Sonstiges Medienformat" zuletzt', () => {
		const values = getMediaTypeOptions().map((option) => option.value);
		expect(values.at(-1)).toBe(MediaTypeEnum.OTHER);
		expect(values.at(0)).toBe(MediaTypeEnum.PHOTO);
	});

	it('boatDrive: "Sonstiger Bootsantrieb" zuletzt (Admin-Maske)', () => {
		const values = getBoatDriveOptions().map((option) => option.value);
		expect(values.at(-1)).toBe(BoatDriveEnum.OTHER);
		expect(values).not.toContain(BoatDriveEnum.NONE);
	});
});

describe('"Keine Angabe" steht in optionalen Feldern nicht mehr zur Wahl', () => {
	it('seaState: nur die fünf echten Kategorien', () => {
		const values = getSeaStateOptions().map((option) => option.value);
		expect(values).not.toContain(SeaStateEnum.NONE);
		expect(values).toEqual([
			SeaStateEnum.SMOOTH,
			SeaStateEnum.CALM,
			SeaStateEnum.SLIGHT,
			SeaStateEnum.ROUGH,
			SeaStateEnum.HIGH
		]);
	});

	it('visibility: nur die vier echten Kategorien', () => {
		const values = getVisibilityOptions().map((option) => option.value);
		expect(values).not.toContain(VisibilityEnum.NONE);
		expect(values).toEqual([
			VisibilityEnum.EXCEPTIONAL,
			VisibilityEnum.CLEAR,
			VisibilityEnum.HAZY,
			VisibilityEnum.FOGGY
		]);
	});

	it('windDirection: nur die acht Himmelsrichtungen, in Kompass-Reihenfolge', () => {
		const values = getWindDirectionOptions().map((option) => option.value);
		expect(values).not.toContain(WindDirectionEnum.NONE);
		expect(values).toEqual(['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW']);
	});

	it('sex: nur weiblich/männlich', () => {
		const values = getSexOptions().map((option) => option.value);
		expect(values).not.toContain(SexEnum.UNKNOWN);
		expect(values).toEqual([SexEnum.FEMALE, SexEnum.MALE]);
	});
});

/**
 * Die Labels bleiben vollständig — sie lösen weiterhin Bestandsdaten auf.
 * Eine Option aus der Auswahl zu nehmen darf die Anzeige eines bereits
 * gespeicherten Wertes nicht kaputt machen; `seegang`, `sichtweite` und
 * `totfund_geschlecht` sind `not null default 0`, im Bestand steht diese `0`
 * also millionenfach.
 */
describe('entfernte Optionen bleiben anzeigbar', () => {
	it('löst die Alt-Werte weiterhin auf', async () => {
		const { getSeaStateLabel } = await import('./seaState');
		const { getVisibilityLabel } = await import('./visibility');
		const { getSexLabel } = await import('./sex');
		const { getWindDirectionLabel } = await import('./windDirection');

		expect(getSeaStateLabel(0)).toBe('Keine Angabe');
		expect(getVisibilityLabel(0)).toBe('Keine Angabe');
		expect(getSexLabel(0)).toBe('Unbekannt');
		expect(getWindDirectionLabel('')).toBe('Keine Angabe');
	});
});
