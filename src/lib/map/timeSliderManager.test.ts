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
