// SichtungenMap (aus optimizedMapController) braucht echtes OpenLayers.
// Wir mocken den Import des Controllers vollständig und testen MapCountManager isoliert.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../logger', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

// styleUtils.getFeatureColorGroup ist eine reine Funktion — nicht mocken,
// aber ol/style muss gemockt werden damit der Import nicht fehlschlägt.
vi.mock('ol/style', () => {
	class Stroke {
		constructor(_opts?: unknown) {}
		getColor() {
			return 'black';
		}
	}
	class Fill {
		private color: string;
		constructor(opts?: { color?: string }) {
			this.color = opts?.color ?? '#000';
		}
		getColor() {
			return this.color;
		}
	}
	class Style {
		constructor(_opts?: unknown) {}
	}
	class Circle {
		constructor(_opts?: unknown) {}
	}
	class RegularShape {
		constructor(_opts?: unknown) {}
	}
	class Text {
		constructor(_opts?: unknown) {}
	}
	return { Stroke, Fill, Style, Circle, RegularShape, Text };
});

// optimizedMapController wird nur als Typ referenziert — Mock verhindert OL-Import
vi.mock('./optimizedMapController', () => ({}));

import { MapCountManager } from './countManager';

// Minimales Mock-Interface für SichtungenMap
function createMockMap(featuresOverride: ReturnType<typeof createMockFeature>[] = []) {
	return {
		setLegendUpdateCallback: vi.fn(),
		getHidden: vi.fn(() => ({
			species: {} as Record<string, boolean>,
			colors: {} as Record<string, boolean>
		})),
		getTimeFilter: vi.fn(() => ({ lower: 0, upper: Date.now() + 1e12 })),
		getFeatures: vi.fn(() => featuresOverride),
		setSpeciesVisibility: vi.fn(),
		setColorVisibility: vi.fn(),
		getDisplayedYear: vi.fn(() => 2024),
		setFilter: vi.fn()
	};
}

function createMockFeature(speciesId: string, ct: number, tf = false, ts = 1700000000) {
	return {
		get: vi.fn((key: string) => {
			if (key === 'speciesKey') return speciesId;
			if (key === 'ta') return speciesId;
			return undefined;
		}),
		getProperties: vi.fn(() => ({ ta: Number(speciesId), ct, tf, ts }))
	};
}

const defaultTranslations = {
	overview: 'Übersicht',
	zoom_title: 'Zoom',
	zoom: 'Zoom',
	report_date: 'Datum',
	language: 'Sprache',
	species: 'Tierart',
	species_legend: 'Legende',
	position: 'Position',
	count: 'Anzahl',
	young: 'Jungtiere',
	ship: 'Schiff',
	name: 'Name',
	area: 'Gebiet',
	latitude: 'Breitengrad',
	longitude: 'Längengrad',
	found_dead: 'Totfund',
	speciesMap: { '0': 'Schweinswal', '1': 'Kegelrobbe' }
};

describe('MapCountManager', () => {
	let manager: MapCountManager;

	beforeEach(() => {
		manager = new MapCountManager();
		vi.stubGlobal('document', {
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		});
	});

	describe('getCounts() — vor initialize()', () => {
		it('gibt leere Zähler zurück wenn nicht initialisiert', () => {
			const counts = manager.getCounts();
			expect(counts.speciesCounts).toEqual({});
			expect(counts.colorCounts).toEqual({});
		});

		it('gibt einen Klon zurück (keine direkten Referenzen)', () => {
			const counts1 = manager.getCounts();
			const counts2 = manager.getCounts();
			expect(counts1).not.toBe(counts2);
		});
	});

	describe('onCountsUpdated()', () => {
		it('registriert einen Callback', () => {
			const callback = vi.fn();
			manager.onCountsUpdated(callback);
			// Callback sollte nicht sofort aufgerufen werden
			expect(callback).not.toHaveBeenCalled();
		});

		it('überschreibt vorherigen Callback', () => {
			const cb1 = vi.fn();
			const cb2 = vi.fn();
			manager.onCountsUpdated(cb1);
			manager.onCountsUpdated(cb2);
			// Nach updateCounts() sollte nur cb2 aufgerufen werden
			const mockMap = createMockMap();
			manager['mapInstance'] = mockMap as any;
			manager.updateCounts();
			expect(cb1).not.toHaveBeenCalled();
			expect(cb2).toHaveBeenCalledOnce();
		});
	});

	describe('initialize()', () => {
		it('initialisiert Zähler für alle Arten in speciesMap', () => {
			const mockMap = createMockMap();
			manager.initialize(mockMap as any, defaultTranslations as any);
			const counts = manager.getCounts();
			expect(counts.speciesCounts['0']).toEqual({ visible: 0, total: 0 });
			expect(counts.speciesCounts['1']).toEqual({ visible: 0, total: 0 });
		});

		it('initialisiert alle Farbgruppen', () => {
			const mockMap = createMockMap();
			manager.initialize(mockMap as any, defaultTranslations as any);
			const counts = manager.getCounts();
			for (const group of ['ct0', 'ct1', 'ct2', 'ct6', 'ct11', 'ct15']) {
				expect(counts.colorCounts[group]).toBe(0);
			}
		});

		it('registriert einen Legend-Update-Callback in der Map', () => {
			const mockMap = createMockMap();
			manager.initialize(mockMap as any, defaultTranslations as any);
			expect(mockMap.setLegendUpdateCallback).toHaveBeenCalledOnce();
		});
	});

	describe('updateCounts()', () => {
		it('zählt ein sichtbares Feature korrekt', () => {
			const feature = createMockFeature('0', 1, false, 1700000000);
			const mockMap = createMockMap([feature]);
			manager.initialize(mockMap as any, defaultTranslations as any);
			manager.updateCounts();
			const counts = manager.getCounts();
			expect(counts.speciesCounts['0']!.total).toBe(1);
			expect(counts.speciesCounts['0']!.visible).toBe(1);
		});

		it('zählt Totfund in ct0', () => {
			const feature = createMockFeature('0', 0, true, 1700000000);
			const mockMap = createMockMap([feature]);
			manager.initialize(mockMap as any, defaultTranslations as any);
			manager.updateCounts();
			const counts = manager.getCounts();
			expect(counts.colorCounts['ct0']).toBe(1);
		});

		it('blendet nach Species-Filter aus', () => {
			const feature = createMockFeature('0', 2, false, 1700000000);
			const mockMap = createMockMap([feature]);
			mockMap.getHidden.mockReturnValue({ species: { '0': true }, colors: {} });
			manager.initialize(mockMap as any, defaultTranslations as any);
			manager.updateCounts();
			const counts = manager.getCounts();
			expect(counts.speciesCounts['0']!.total).toBe(1);
			expect(counts.speciesCounts['0']!.visible).toBe(0);
		});

		it('blendet nach Zeitfilter aus', () => {
			const oldTimestamp = 1000; // weit in der Vergangenheit
			const feature = createMockFeature('0', 1, false, oldTimestamp);
			const mockMap = createMockMap([feature]);
			// Zeitfilter: nur Timestamps ab jetzt
			mockMap.getTimeFilter.mockReturnValue({ lower: Date.now(), upper: Date.now() + 1e10 });
			manager.initialize(mockMap as any, defaultTranslations as any);
			manager.updateCounts();
			const counts = manager.getCounts();
			expect(counts.speciesCounts['0']!.total).toBe(1);
			expect(counts.speciesCounts['0']!.visible).toBe(0);
		});

		it('ruft Callback nach Update auf', () => {
			const callback = vi.fn();
			manager.onCountsUpdated(callback);
			const mockMap = createMockMap();
			manager.initialize(mockMap as any, defaultTranslations as any);
			manager.updateCounts();
			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith(
				expect.objectContaining({ speciesCounts: expect.any(Object) })
			);
		});

		it('tut nichts wenn mapInstance fehlt', () => {
			// Kein initialize() aufgerufen
			expect(() => manager.updateCounts()).not.toThrow();
		});

		it('setzt Zähler bei jedem Aufruf zurück', () => {
			const feature = createMockFeature('0', 1, false, 1700000000);
			const mockMap = createMockMap([feature]);
			manager.initialize(mockMap as any, defaultTranslations as any);
			manager.updateCounts();
			manager.updateCounts();
			// Zähler dürfen nicht akkumulieren
			expect(manager.getCounts().speciesCounts['0']!.total).toBe(1);
		});
	});

	describe('dispose()', () => {
		it('entfernt den Change-Event-Listener vom Document', () => {
			const mockMap = createMockMap();
			manager.initialize(mockMap as any, defaultTranslations as any);

			// Nach initialize() wurde addEventListener aufgerufen
			expect(document.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

			manager.dispose();

			// Nach dispose() wurde removeEventListener mit demselben Handler aufgerufen
			expect(document.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
		});

		it('setzt mapInstance und updateCallback auf undefined', () => {
			const mockMap = createMockMap();
			const callback = vi.fn();
			manager.initialize(mockMap as any, defaultTranslations as any);
			manager.onCountsUpdated(callback);

			manager.dispose();

			// updateCounts() sollte den Callback nicht mehr aufrufen
			manager.updateCounts();
			expect(callback).not.toHaveBeenCalled();
		});

		it('wirft keinen Fehler wenn ohne initialize() aufgerufen', () => {
			expect(() => manager.dispose()).not.toThrow();
		});
	});

	describe('setSpeciesVisibility() / setColorVisibility()', () => {
		it('delegiert setSpeciesVisibility an mapInstance', () => {
			const mockMap = createMockMap();
			manager.initialize(mockMap as any, defaultTranslations as any);
			manager.setSpeciesVisibility('0', false);
			expect(mockMap.setSpeciesVisibility).toHaveBeenCalledWith('0', false);
		});

		it('delegiert setColorVisibility an mapInstance', () => {
			const mockMap = createMockMap();
			manager.initialize(mockMap as any, defaultTranslations as any);
			manager.setColorVisibility('ct1', false);
			expect(mockMap.setColorVisibility).toHaveBeenCalledWith('ct1', false);
		});

		it('tut nichts ohne mapInstance', () => {
			expect(() => manager.setSpeciesVisibility('0', false)).not.toThrow();
			expect(() => manager.setColorVisibility('ct1', false)).not.toThrow();
		});
	});
});
