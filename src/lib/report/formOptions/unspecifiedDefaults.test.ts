import { describe, expect, it } from 'vitest';
import {
	AnimalBehaviorEnum,
	animalBehaviorLabels,
	getAnimalBehaviorLabel,
	getAnimalBehaviorOptions,
	isValidAnimalBehavior
} from './animalBehavior';
import {
	DistributionEnum,
	distributionLabels,
	getDistributionLabel,
	getDistributionOptions,
	isValidDistribution
} from './distribution';

/**
 * Hintergrund: `verteilung` und `verhalten` sind `integer default(0) notNull`,
 * und `0` bedeutet dort "Sonstige Verteilung" bzw. "Sonstiges Verhalten" —
 * eine echte Kategorie. Beide Felder sind im Schema NICHT `.required()`, eine
 * fehlende Antwort wurde also als aktive Aussage gespeichert.
 *
 * Messung 2026-07-29 (19.880 Zeilen):
 *   - `verteilung = 0`: 15.129 Zeilen (76,1 %), nur 4,2 % mit Freitext
 *   - `verhalten = 0`:   9.192 Zeilen (46,2 %), nur 9,7 % mit Freitext
 *   - alle übrigen Werte derselben Spalten: 0,0–0,6 % mit Freitext
 *
 * Die niedrige Freitext-Quote belegt, dass die Mehrheit dieser Nullen keine
 * bewusste "Sonstige"-Wahl ist. `UNKNOWN = 4` trennt beides für neue Daten.
 *
 * Der Bestand wird NICHT umgeschrieben: Die 632 bzw. 892 Zeilen MIT Freitext
 * sind echte Antworten, und es gibt keine Spalte, aus der hervorginge, welche
 * der übrigen Nullen nie beantwortet wurden.
 */
describe('DistributionEnum.UNKNOWN', () => {
	it('existiert als eigener Wert 4 und unterscheidet sich von OTHER', () => {
		expect(DistributionEnum.UNKNOWN).toBe(4);
		expect(DistributionEnum.UNKNOWN).not.toBe(DistributionEnum.OTHER);
	});

	it('hat das Label "Keine Angabe"', () => {
		expect(distributionLabels[DistributionEnum.UNKNOWN]).toBe('Keine Angabe');
		expect(getDistributionLabel(4)).toBe('Keine Angabe');
	});

	it('gilt als gültiger Wert', () => {
		expect(isValidDistribution(4)).toBe(true);
		expect(isValidDistribution('4')).toBe(true);
	});

	it('erscheint NICHT in den auswählbaren Optionen', () => {
		const values = getDistributionOptions().map((option) => option.value);
		expect(values).not.toContain(DistributionEnum.UNKNOWN);
		expect(values).toEqual([
			DistributionEnum.OTHER,
			DistributionEnum.SINGLE,
			DistributionEnum.MOTHER_WITH_YOUNG,
			DistributionEnum.SCHOOLS
		]);
	});

	it('lässt die Alt-Werte unverändert', () => {
		expect(getDistributionLabel(0)).toBe('Sonstige Verteilung');
		expect(getDistributionLabel(1)).toBe('Einzeln');
		expect(getDistributionLabel(2)).toBe('Mutter mit Jungtier');
		expect(getDistributionLabel(3)).toBe('Deutliche Schulen');
	});
});

describe('AnimalBehaviorEnum.UNKNOWN', () => {
	it('existiert als eigener Wert 4 und unterscheidet sich von OTHER', () => {
		expect(AnimalBehaviorEnum.UNKNOWN).toBe(4);
		expect(AnimalBehaviorEnum.UNKNOWN).not.toBe(AnimalBehaviorEnum.OTHER);
	});

	it('hat das Label "Keine Angabe"', () => {
		expect(animalBehaviorLabels[AnimalBehaviorEnum.UNKNOWN]).toBe('Keine Angabe');
		expect(getAnimalBehaviorLabel(4)).toBe('Keine Angabe');
	});

	it('gilt als gültiger Wert', () => {
		expect(isValidAnimalBehavior(4)).toBe(true);
		expect(isValidAnimalBehavior('4')).toBe(true);
	});

	// `OTHER` steht am ENDE, obwohl sein Enum-Wert `0` ist: Die Auffangkategorie
	// gehört hinter die konkreten Antworten, nicht davor (Wunsch des Deutschen
	// Meeresmuseums). Der gespeicherte Wert bleibt `0`.
	it('erscheint NICHT in den auswählbaren Optionen, "Sonstiges" steht am Ende', () => {
		const values = getAnimalBehaviorOptions().map((option) => option.value);
		expect(values).not.toContain(AnimalBehaviorEnum.UNKNOWN);
		expect(values).toEqual([
			AnimalBehaviorEnum.CONSTANT_COURSE,
			AnimalBehaviorEnum.VARYING_COURSE,
			AnimalBehaviorEnum.SLOW_SWIMMING,
			AnimalBehaviorEnum.OTHER
		]);
	});

	it('lässt die Alt-Werte unverändert', () => {
		expect(getAnimalBehaviorLabel(0)).toBe('Sonstiges Verhalten');
		expect(getAnimalBehaviorLabel(1)).toBe(
			'Konstanter Kurs, regelmäßiges Tauchen (schwimmen, ziehen)'
		);
	});
});
