/**
 * Enum für Windstärken (Beaufort-Skala)
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum WindStrengthEnum {
	WINDSTILL = 0,
	LEISER_ZUG = 1,
	LEICHTE_BRISE = 2,
	SCHWACHE_BRISE = 3,
	MAESSIGE_BRISE = 4,
	FRISCHE_BRISE = 5,
	STARKER_WIND = 6,
	STEIFER_WIND = 7,
	STUERMISCHER_WIND = 8,
	STURM = 9,
	SCHWERER_STURM = 10,
	ORKANARTIGER_STURM = 11,
	ORKAN = 12
}

/**
 * Deutsche Bezeichnungen für die Windstärken
 */
export const windStrengthLabels: Record<WindStrengthEnum, string> = {
	[WindStrengthEnum.WINDSTILL]: '0 - Windstille (< 1 km/h)',
	[WindStrengthEnum.LEISER_ZUG]: '1 - Leiser Zug (1-5 km/h)',
	[WindStrengthEnum.LEICHTE_BRISE]: '2 - Leichte Brise (6-11 km/h)',
	[WindStrengthEnum.SCHWACHE_BRISE]: '3 - Schwache Brise (12-19 km/h)',
	[WindStrengthEnum.MAESSIGE_BRISE]: '4 - Mäßige Brise (20-28 km/h)',
	[WindStrengthEnum.FRISCHE_BRISE]: '5 - Frische Brise (29-38 km/h)',
	[WindStrengthEnum.STARKER_WIND]: '6 - Starker Wind (39-49 km/h)',
	[WindStrengthEnum.STEIFER_WIND]: '7 - Steifer Wind (50-61 km/h)',
	[WindStrengthEnum.STUERMISCHER_WIND]: '8 - Stürmischer Wind (62-74 km/h)',
	[WindStrengthEnum.STURM]: '9 - Sturm (75-88 km/h)',
	[WindStrengthEnum.SCHWERER_STURM]: '10 - Schwerer Sturm (89-102 km/h)',
	[WindStrengthEnum.ORKANARTIGER_STURM]: '11 - Orkanartiger Sturm (103-117 km/h)',
	[WindStrengthEnum.ORKAN]: '12 - Orkan (> 117 km/h)'
};

export type WindStrength = WindStrengthEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
export function getWindStrengthOptions(): Array<{ value: number; label: string }> {
	return Object.entries(windStrengthLabels).map(([value, label]) => ({
		value: Number(value),
		label
	}));
}

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getWindStrengthLabel(value: WindStrengthEnum | number | null | undefined): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return windStrengthLabels[numericValue as WindStrengthEnum] || 'Unbekannt';
}
