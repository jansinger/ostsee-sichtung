import { beforeEach, describe, expect, it, vi } from 'vitest';

// GeoJSON.readFeatures benötigt OL-Geometrie-Parsing — mock verhindert Canvas-Zugriff
vi.mock('ol/format/GeoJSON', () => {
	class GeoJSON {
		readFeatures(_data: unknown, _opts?: unknown) {
			return [{ id: 'mocked-feature' }];
		}
	}
	return { default: GeoJSON };
});

vi.mock('ol', () => ({
	Feature: class Feature {
		constructor(_opts?: unknown) {}
	}
}));

import { MapDataLoader } from './dataLoader';

const mockGeoJson = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			id: 1,
			geometry: { type: 'Point', coordinates: [13.2, 54.5] },
			properties: {}
		}
	]
};

describe('MapDataLoader', () => {
	let loader: MapDataLoader;

	beforeEach(() => {
		loader = new MapDataLoader();
		vi.stubGlobal('fetch', vi.fn());
	});

	describe('loadSightings()', () => {
		it('lädt Sichtungen ohne Parameter (keine Query-String)', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockGeoJson)
			} as Response);

			await loader.loadSightings();

			expect(fetch).toHaveBeenCalledWith('/api/map/sightings');
		});

		it('fügt year-Parameter korrekt an', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockGeoJson)
			} as Response);

			await loader.loadSightings({ year: 2024 });

			expect(fetch).toHaveBeenCalledWith('/api/map/sightings?year=2024');
		});

		it('fügt search-Parameter korrekt an', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockGeoJson)
			} as Response);

			await loader.loadSightings({ search: 'Schweinswal' });

			expect(fetch).toHaveBeenCalledWith('/api/map/sightings?search=Schweinswal');
		});

		it('kombiniert year und search korrekt', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockGeoJson)
			} as Response);

			await loader.loadSightings({ year: 2023, search: 'Robbe' });

			const calledUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string;
			expect(calledUrl).toContain('year=2023');
			expect(calledUrl).toContain('search=Robbe');
		});

		it('gibt geparste Features zurück', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockGeoJson)
			} as Response);

			const features = await loader.loadSightings();

			expect(features).toHaveLength(1);
			expect(features[0]).toEqual({ id: 'mocked-feature' });
		});

		it('wirft Fehler bei HTTP-Fehler-Status', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500
			} as Response);

			await expect(loader.loadSightings()).rejects.toThrow('HTTP error! status: 500');
		});

		it('wirft Fehler bei Netzwerkfehler', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			await expect(loader.loadSightings()).rejects.toThrow('Network error');
		});
	});

	describe('loadSightingsForYear()', () => {
		it('delegiert an loadSightings mit year-Parameter', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockGeoJson)
			} as Response);

			await loader.loadSightingsForYear(2022);

			expect(fetch).toHaveBeenCalledWith('/api/map/sightings?year=2022');
		});
	});
});
