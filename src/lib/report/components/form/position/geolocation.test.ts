import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	GEOLOCATION_TIMEOUT_MS,
	describeGeolocationError,
	requestCurrentPosition
} from './geolocation';

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

/**
 * Der `timeout`-Parameter der Geolocation-API läuft laut Spezifikation erst an,
 * nachdem der Nutzer den Berechtigungsdialog beantwortet hat. Bleibt der Dialog
 * offen, kommt weder Erfolg noch Fehler — ohne eigenen Wächter würde die Promise
 * nie aufgelöst und der Button im Ladezustand hängen bleiben.
 */
describe('requestCurrentPosition — eigener Zeitwächter', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('löst nach Ablauf der Wartezeit auf, wenn gar kein Callback kommt', async () => {
		vi.useFakeTimers();
		const geolocation = { getCurrentPosition: (): void => {} };

		const pending = requestCurrentPosition(geolocation);
		await vi.advanceTimersByTimeAsync(GEOLOCATION_TIMEOUT_MS);
		const result = await pending;

		expect(result.ok).toBe(false);
		expect(result.ok === false && result.message).toContain('zu lange');
	});

	it('räumt den Zeitwächter nach einem Erfolg wieder ab', async () => {
		vi.useFakeTimers();
		const geolocation = {
			getCurrentPosition: (onSuccess: PositionCallback) =>
				onSuccess({ coords: { latitude: 54.31, longitude: 12.09 } } as GeolocationPosition)
		};

		await requestCurrentPosition(geolocation);

		expect(vi.getTimerCount()).toBe(0);
	});
});
