import { describe, expect, it } from 'vitest';
import {
	LOCATION_LABEL_IDLE,
	LOCATION_LABEL_TRACKING,
	geolocationErrorMessage,
	locationButtonState
} from './locationControlState';

describe('locationButtonState', () => {
	it('liefert im Ruhezustand aria-pressed=false und das Start-Label', () => {
		const state = locationButtonState(false);
		expect(state.pressed).toBe(false);
		expect(state.label).toBe(LOCATION_LABEL_IDLE);
		expect(state.label).toBe('GPS-Position anzeigen');
	});

	it('liefert beim Tracking aria-pressed=true und das Stopp-Label', () => {
		const state = locationButtonState(true);
		expect(state.pressed).toBe(true);
		expect(state.label).toBe(LOCATION_LABEL_TRACKING);
		expect(state.label).toBe('GPS-Tracking stoppen');
	});
});

describe('geolocationErrorMessage', () => {
	it('erklärt bei PERMISSION_DENIED (1) die Standortfreigabe', () => {
		const message = geolocationErrorMessage(1);
		expect(message).toContain('Standortfreigabe');
		expect(message).toContain('verweigert');
	});

	it('meldet bei POSITION_UNAVAILABLE (2) eine nicht ermittelbare Position', () => {
		expect(geolocationErrorMessage(2)).toContain('konnte nicht ermittelt werden');
	});

	it('meldet bei TIMEOUT (3) eine Zeitüberschreitung', () => {
		expect(geolocationErrorMessage(3)).toContain('Zeitüberschreitung');
	});

	it('fällt bei unbekanntem oder fehlendem Code auf eine generische Meldung zurück', () => {
		expect(geolocationErrorMessage(undefined)).toContain('konnte nicht ermittelt werden');
		expect(geolocationErrorMessage(99)).toContain('konnte nicht ermittelt werden');
	});

	it('liefert immer eine deutschsprachige, nicht-leere Meldung', () => {
		for (const code of [1, 2, 3, undefined]) {
			const message = geolocationErrorMessage(code);
			expect(message.length).toBeGreaterThan(10);
		}
	});
});
