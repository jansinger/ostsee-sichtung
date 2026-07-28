import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	GEOLOCATION_TIMEOUT_MS,
	GEOLOCATION_WATCHDOG_MS,
	describeGeolocationError,
	requestCurrentPosition
} from './geolocation';

/** Speichert die Callbacks, statt sie sofort aufzurufen — für zeitgesteuerte Tests. */
function deferredGeolocation(): {
	geolocation: Pick<Geolocation, 'getCurrentPosition'>;
	succeed: () => void;
} {
	let onSuccess: PositionCallback | undefined;
	return {
		geolocation: {
			getCurrentPosition: (success: PositionCallback): void => {
				onSuccess = success;
			}
		},
		succeed: (): void => {
			onSuccess?.({
				coords: { latitude: 54.31, longitude: 12.09 }
			} as GeolocationPosition);
		}
	};
}

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

	it('löst nach Ablauf der Wächter-Frist auf, wenn gar kein Callback kommt', async () => {
		vi.useFakeTimers();
		const geolocation = { getCurrentPosition: (): void => {} };

		const pending = requestCurrentPosition(geolocation);
		await vi.advanceTimersByTimeAsync(GEOLOCATION_WATCHDOG_MS);
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

	it('wartet länger als die API-Frist, damit ein offener Dialog nicht mitzählt', () => {
		expect(GEOLOCATION_WATCHDOG_MS).toBeGreaterThan(GEOLOCATION_TIMEOUT_MS);
	});

	/**
	 * Der Regressionsfall: Erstnutzer auf dem Handy braucht Sekunden für den
	 * Berechtigungsdialog, danach dauert der kalte GPS-Fix noch einmal Sekunden.
	 * Die API-Frist läuft erst ab der Antwort — der Wächter dagegen ab Aufruf.
	 * Ein Erfolg jenseits der API-Frist ist deshalb völlig normal und darf nicht
	 * als Zeitüberschreitung ausgegeben werden.
	 */
	it('lässt einen Erfolg gewinnen, der nach der API-Frist, aber vor dem Wächter eintrifft', async () => {
		vi.useFakeTimers();
		const { geolocation, succeed } = deferredGeolocation();

		const pending = requestCurrentPosition(geolocation);
		await vi.advanceTimersByTimeAsync(GEOLOCATION_TIMEOUT_MS + 3_000);
		succeed();

		expect(await pending).toEqual({ ok: true, latitude: 54.31, longitude: 12.09 });
	});

	/**
	 * Was dieser Test hält — und was nicht: Er sichert die Zusage des Moduls, dass
	 * genau ein Ergebnis herauskommt und das erste gewinnt. Diese Zusage entsteht
	 * NICHT aus einer Fallunterscheidung im Code, sondern aus der Promise-Semantik
	 * selbst; ein `if (settled) return;` wäre wirkungslos und wurde deshalb
	 * entfernt (siehe `finish` in geolocation.ts). Der Test schlägt an, wenn jemand
	 * `requestCurrentPosition` auf einen Callback- oder Event-Rückkanal umbaut, bei
	 * dem die Idempotenz verloren ginge.
	 */
	it('verwirft einen Callback, der erst nach dem Wächter eintrifft, ohne doppelt aufzulösen', async () => {
		vi.useFakeTimers();
		const { geolocation, succeed } = deferredGeolocation();
		const settled = vi.fn();

		const pending = requestCurrentPosition(geolocation);
		void pending.then(settled);

		await vi.advanceTimersByTimeAsync(GEOLOCATION_WATCHDOG_MS);
		succeed();
		await vi.advanceTimersByTimeAsync(0);

		expect(settled).toHaveBeenCalledTimes(1);
		expect(settled).toHaveBeenCalledWith({
			ok: false,
			message: describeGeolocationError({ code: 3 })
		});
		expect(await pending).toEqual({ ok: false, message: describeGeolocationError({ code: 3 }) });
	});
});
