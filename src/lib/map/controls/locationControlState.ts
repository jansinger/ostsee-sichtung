/**
 * Pure Zustands- und Fehlerlogik der LocationControl (N2) — vom DOM getrennt,
 * damit sie ohne OpenLayers/Browser testbar ist.
 */

export const LOCATION_LABEL_IDLE = 'GPS-Position anzeigen';
export const LOCATION_LABEL_TRACKING = 'GPS-Tracking stoppen';

export interface LocationButtonState {
	/** Wert für aria-pressed — der Button ist ein Toggle. */
	pressed: boolean;
	/** Gemeinsames title/aria-label des Buttons. */
	label: string;
}

export function locationButtonState(isTracking: boolean): LocationButtonState {
	return isTracking
		? { pressed: true, label: LOCATION_LABEL_TRACKING }
		: { pressed: false, label: LOCATION_LABEL_IDLE };
}

/**
 * Übersetzt GeolocationPositionError-Codes (1 = PERMISSION_DENIED,
 * 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT) in verständliche deutsche Meldungen.
 */
export function geolocationErrorMessage(code?: number): string {
	switch (code) {
		case 1:
			return 'Die Standortfreigabe wurde verweigert. Bitte erlauben Sie den Standortzugriff in Ihren Browser-Einstellungen.';
		case 2:
			return 'Ihre Position ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.';
		case 3:
			return 'Zeitüberschreitung bei der Standortbestimmung. Bitte versuchen Sie es erneut.';
		default:
			return 'Ihre Position konnte nicht ermittelt werden. Bitte versuchen Sie es später erneut.';
	}
}
