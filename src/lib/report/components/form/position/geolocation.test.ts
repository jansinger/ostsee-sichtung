import { describe, expect, it } from 'vitest';
import { describeGeolocationError, requestCurrentPosition } from './geolocation';

describe('describeGeolocationError', () => {
	it('erklärt eine verweigerte Freigabe', () => {
		expect(describeGeolocationError({ code: 1 })).toContain('nicht freigegeben');
	});

	it('erklärt einen nicht ermittelbaren Standort', () => {
		expect(describeGeolocationError({ code: 2 })).toContain('nicht ermittelt');
	});

	it('erklärt eine Zeitüberschreitung', () => {
		expect(describeGeolocationError({ code: 3 })).toContain('zu lange');
	});

	it('fällt auf eine allgemeine Meldung zurück', () => {
		expect(describeGeolocationError({ code: 99 })).toContain('nicht abrufen');
	});
});

describe('requestCurrentPosition', () => {
	it('meldet einen Fehler, wenn der Browser keine Ortung anbietet', async () => {
		const result = await requestCurrentPosition(undefined);
		expect(result).toEqual({
			ok: false,
			message: 'Dieser Browser unterstützt keine Standortbestimmung.'
		});
	});

	it('liefert die Koordinaten bei Erfolg', async () => {
		const geolocation = {
			getCurrentPosition: (onSuccess: PositionCallback) =>
				onSuccess({ coords: { latitude: 54.31, longitude: 12.09 } } as GeolocationPosition)
		};
		expect(await requestCurrentPosition(geolocation)).toEqual({
			ok: true,
			latitude: 54.31,
			longitude: 12.09
		});
	});

	it('übersetzt einen Fehler in eine lesbare Meldung', async () => {
		const geolocation = {
			getCurrentPosition: (_onSuccess: PositionCallback, onError?: PositionErrorCallback) =>
				onError?.({ code: 1, message: 'denied' } as GeolocationPositionError)
		};
		const result = await requestCurrentPosition(geolocation);
		expect(result.ok).toBe(false);
		expect(result.ok === false && result.message).toContain('nicht freigegeben');
	});
});
