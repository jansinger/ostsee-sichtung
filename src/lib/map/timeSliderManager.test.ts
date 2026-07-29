// Server-Testprojekt läuft mit environment: 'node' (kein jsdom/happy-dom, siehe
// vitest.config.ts). MapTimeSliderManager braucht nur zwei <input type="range">
// als reine Werte-Träger (value/max) plus addEventListener — dafür reichen
// schlanke Objekt-Stubs, ein vollständiges DOM ist nicht nötig.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MapTimeSliderManager } from './timeSliderManager';
import type { SichtungenMap } from './optimizedMapController';

class FakeRangeInput {
	value = '0';
	max = '0';
	private listeners: Record<string, Array<() => void>> = {};

	addEventListener(type: string, handler: () => void): void {
		(this.listeners[type] ??= []).push(handler);
	}

	dispatch(type: string): void {
		(this.listeners[type] ?? []).forEach((handler) => handler());
	}

	// M10: reset() dispatcht echte input-Events — der Stub braucht die DOM-API.
	dispatchEvent(event: { type: string }): boolean {
		this.dispatch(event.type);
		return true;
	}
}

function createMockMapInstance(): SichtungenMap {
	return {
		getDisplayedYear: vi.fn(() => 2024),
		setFilter: vi.fn()
	} as unknown as SichtungenMap;
}

describe('MapTimeSliderManager', () => {
	let startSlider: FakeRangeInput;
	let endSlider: FakeRangeInput;
	let elements: Record<string, FakeRangeInput>;

	beforeEach(() => {
		startSlider = new FakeRangeInput();
		endSlider = new FakeRangeInput();
		elements = {
			'time-range-start': startSlider,
			'time-range-end': endSlider
		};

		vi.stubGlobal('document', {
			getElementById: (id: string) => elements[id] ?? null
		});
	});

	describe('reset()', () => {
		it('setzt Start auf 0, Ende auf daysInYear - 1 und passt max an (Schaltjahr)', () => {
			const manager = new MapTimeSliderManager();
			manager.initialize(createMockMapInstance());

			// Simuliere eine vorherige Nutzer-Auswahl (z. B. Juli)
			startSlider.value = '180';
			startSlider.max = '364';
			endSlider.value = '210';
			endSlider.max = '364';

			manager.reset(366);

			expect(startSlider.value).toBe('0');
			expect(startSlider.max).toBe('365');
			expect(endSlider.value).toBe('365');
			expect(endSlider.max).toBe('365');
		});

		it('setzt die Slider auch bei einem normalen Jahr (365 Tage) korrekt zurück', () => {
			const manager = new MapTimeSliderManager();
			manager.initialize(createMockMapInstance());

			manager.reset(365);

			expect(startSlider.value).toBe('0');
			expect(startSlider.max).toBe('364');
			expect(endSlider.value).toBe('364');
			expect(endSlider.max).toBe('364');
		});

		it('tut nichts, wenn die Slider-Elemente nicht im DOM sind', () => {
			vi.stubGlobal('document', { getElementById: () => null });
			const manager = new MapTimeSliderManager();

			expect(() => manager.reset(366)).not.toThrow();
		});

		// M10: Die DualRangeSlider-Komponente hält ihren State über input-Events
		// synchron. reset() muss die Events deshalb nach dem Setzen der Werte
		// dispatchen — sonst zeigen Füllbereich und Datums-Eingabefelder nach
		// Jahreswechsel (QW4) oder Chip-Reset die alte Auswahl.
		it('dispatcht input-Events auf beiden Slidern (Komponenten-Sync, M10)', () => {
			const manager = new MapTimeSliderManager();
			manager.initialize(createMockMapInstance());

			const startInputs: string[] = [];
			const endInputs: string[] = [];
			startSlider.addEventListener('input', () => startInputs.push(startSlider.value));
			endSlider.addEventListener('input', () => endInputs.push(endSlider.value));

			manager.reset(366);

			expect(startInputs).toEqual(['0']);
			expect(endInputs).toEqual(['365']);
		});

		it('propagiert nach reset() den vollen Jahresbereich an setFilter', () => {
			const mapInstance = createMockMapInstance();
			const manager = new MapTimeSliderManager();
			manager.initialize(mapInstance);

			manager.reset(366);

			// getDisplayedYear liefert 2024 (Schaltjahr): Tag 0 = 1. Januar,
			// Tag 365 = 31. Dezember, Ende des Tages.
			const setFilter = vi.mocked(mapInstance.setFilter);
			expect(setFilter).toHaveBeenCalled();
			const [start, end] = setFilter.mock.calls.at(-1)!;
			expect(start).toBe(new Date(2024, 0, 1).getTime());
			expect(end).toBe(new Date(2024, 11, 31, 23, 59, 59, 999).getTime());
		});

		it('wirft nicht, wenn reset() vor initialize() läuft (keine Listener)', () => {
			const manager = new MapTimeSliderManager();

			expect(() => manager.reset(365)).not.toThrow();
			expect(startSlider.value).toBe('0');
			expect(endSlider.value).toBe('364');
		});
	});

	describe('±1-Zwangskorrektur — Klemmen statt Verschieben', () => {
		it('erlaubt Start == Ende (klemmt Start auf den Ende-Wert)', () => {
			const mapInstance = createMockMapInstance();
			const manager = new MapTimeSliderManager();
			manager.initialize(mapInstance);

			endSlider.value = '100';
			startSlider.value = '150'; // Nutzer zieht Start über Ende hinaus
			startSlider.dispatch('input');

			expect(startSlider.value).toBe('100');
			expect(endSlider.value).toBe('100');
		});

		it('erlaubt Ende == Start (klemmt Ende auf den Start-Wert)', () => {
			const mapInstance = createMockMapInstance();
			const manager = new MapTimeSliderManager();
			manager.initialize(mapInstance);

			startSlider.value = '200';
			endSlider.value = '100'; // Nutzer zieht Ende unter Start
			endSlider.dispatch('input');

			expect(endSlider.value).toBe('200');
			expect(startSlider.value).toBe('200');
		});

		it('lässt Start und Ende unverändert, wenn Start < Ende bleibt', () => {
			const mapInstance = createMockMapInstance();
			const manager = new MapTimeSliderManager();
			manager.initialize(mapInstance);

			startSlider.value = '10';
			endSlider.value = '20';
			startSlider.dispatch('input');

			expect(startSlider.value).toBe('10');
			expect(endSlider.value).toBe('20');
		});

		it('propagiert den Zeitfilter über setFilter() an die Map-Instanz', () => {
			const mapInstance = createMockMapInstance();
			const manager = new MapTimeSliderManager();
			manager.initialize(mapInstance);

			startSlider.value = '0';
			endSlider.value = '10';
			endSlider.dispatch('input');

			expect(mapInstance.setFilter).toHaveBeenCalledOnce();
		});
	});
});
