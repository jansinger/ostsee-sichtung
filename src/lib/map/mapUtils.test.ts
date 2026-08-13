// @ts-nocheck - Test file with mock data that may not match exact types
import { describe, it, expect } from 'vitest';
import { areExtentsColocated, sightingsToGeoJSON } from './mapUtils';
import type { DBSighting } from './mapUtils';

describe('mapUtils', () => {
	const mockDBSighting: DBSighting = {
		id: 123,
		sightingDate: '2024-03-15T14:30:00.000Z',
		longitude: 13.5,
		latitude: 54.5,
		species: 0,
		totalCount: 2,
		juvenileCount: 1,
		isDead: false,
		firstName: 'John',
		lastName: 'Doe',
		nameConsent: true,
		shipName: 'Test Ship',
		shipNameConsent: true,
		waterway: 'Ostsee',
		seaMark: 'Leuchtturm'
	};

	describe('sightingsToGeoJSON', () => {
		it('should convert single sighting to GeoJSON', () => {
			const result = sightingsToGeoJSON([mockDBSighting]);

			expect(result.type).toBe('FeatureCollection');
			expect(result.features).toHaveLength(1);

			const feature = result.features[0]!;
			expect(feature.type).toBe('Feature');
			expect(feature.id).toBe(123);
			expect(feature.geometry.type).toBe('Point');
			expect(feature.geometry.coordinates).toEqual([13.5, 54.5]);
		});

		it('should convert multiple sightings to GeoJSON', () => {
			const sighting2: DBSighting = {
				...mockDBSighting,
				id: 456,
				longitude: 14.0,
				latitude: 55.0
			};

			const result = sightingsToGeoJSON([mockDBSighting, sighting2]);

			expect(result.features).toHaveLength(2);
			expect(result.features[0]!.id).toBe(123);
			expect(result.features[1]!.id).toBe(456);
			expect(result.features[1]!.geometry.coordinates).toEqual([14.0, 55.0]);
		});

		it('should handle empty array', () => {
			const result = sightingsToGeoJSON([]);

			expect(result.type).toBe('FeatureCollection');
			expect(result.features).toHaveLength(0);
		});

		it('should convert timestamps correctly', () => {
			const result = sightingsToGeoJSON([mockDBSighting]);
			const feature = result.features[0];

			const expectedTimestamp = new Date('2024-03-15T14:30:00.000Z').getTime() / 1000;
			expect(feature.properties.ts).toBe(expectedTimestamp);
		});

		it('should handle string coordinates', () => {
			const sightingWithStringCoords: DBSighting = {
				...mockDBSighting,
				longitude: '13.5',
				latitude: '54.5'
			};

			const result = sightingsToGeoJSON([sightingWithStringCoords]);
			const feature = result.features[0];

			expect(feature.geometry.coordinates).toEqual([13.5, 54.5]);
		});

		it('should handle invalid string coordinates', () => {
			const sightingWithInvalidCoords: DBSighting = {
				...mockDBSighting,
				longitude: 'invalid',
				latitude: 'invalid'
			};

			const result = sightingsToGeoJSON([sightingWithInvalidCoords]);
			const feature = result.features[0];

			// parseFloat('invalid') returns NaN, but mapUtils uses || 0 fallback for safer coordinates
			expect(feature.geometry.coordinates).toEqual([0, 0]);
		});

		it('should handle null coordinates', () => {
			const sightingWithNullCoords: DBSighting = {
				...mockDBSighting,
				longitude: null as any,
				latitude: null as any
			};

			const result = sightingsToGeoJSON([sightingWithNullCoords]);
			const feature = result.features[0];

			expect(feature.geometry.coordinates).toEqual([0, 0]);
		});

		it('should respect name consent', () => {
			const sightingWithNameConsent: DBSighting = {
				...mockDBSighting,
				nameConsent: true
			};

			const sightingWithoutNameConsent: DBSighting = {
				...mockDBSighting,
				id: 456,
				nameConsent: false
			};

			const result = sightingsToGeoJSON([sightingWithNameConsent, sightingWithoutNameConsent]);

			expect(result.features[0].properties.name).toBe('Doe');
			expect(result.features[0].properties.firstname).toBe('John');
			expect(result.features[1].properties.name).toBeUndefined();
			expect(result.features[1].properties.firstname).toBeUndefined();
		});

		it('should respect ship name consent', () => {
			const sightingWithShipConsent: DBSighting = {
				...mockDBSighting,
				shipNameConsent: true
			};

			const sightingWithoutShipConsent: DBSighting = {
				...mockDBSighting,
				id: 456,
				shipNameConsent: false
			};

			const result = sightingsToGeoJSON([sightingWithShipConsent, sightingWithoutShipConsent]);

			expect(result.features[0].properties.shipname).toBe('Test Ship');
			expect(result.features[1].properties.shipname).toBeUndefined();
		});

		it('should include all required properties', () => {
			const result = sightingsToGeoJSON([mockDBSighting]);
			const properties = result.features[0].properties;

			expect(properties.id).toBe(123);
			expect(properties.ta).toBe(0); // species
			expect(properties.ct).toBe(2); // totalCount
			expect(properties.jt).toBe(1); // juvenileCount
			expect(properties.tf).toBe(false); // isDead
		});

		it('should include optional properties when present', () => {
			const result = sightingsToGeoJSON([mockDBSighting]);
			const properties = result.features[0].properties;

			expect(properties.waterway).toBe('Ostsee');
			expect(properties.seaMark).toBe('Leuchtturm');
		});

		it('should handle missing optional properties', () => {
			const sightingWithoutOptionals: DBSighting = {
				id: 123,
				sightingDate: '2024-03-15T14:30:00.000Z',
				longitude: 13.5,
				latitude: 54.5,
				species: 0,
				totalCount: 2,
				juvenileCount: 1,
				isDead: false,
				nameConsent: false,
				shipNameConsent: false
			};

			const result = sightingsToGeoJSON([sightingWithoutOptionals]);
			const properties = result.features[0].properties;

			expect(properties.waterway).toBeUndefined();
			expect(properties.seaMark).toBeUndefined();
			expect(properties.name).toBeUndefined();
			expect(properties.firstname).toBeUndefined();
			expect(properties.shipname).toBeUndefined();
		});

		it('should handle dead sightings', () => {
			const deadSighting: DBSighting = {
				...mockDBSighting,
				isDead: true
			};

			const result = sightingsToGeoJSON([deadSighting]);
			const properties = result.features[0].properties;

			expect(properties.tf).toBe(true);
		});

		it('should handle different species values', () => {
			const species1 = { ...mockDBSighting, species: 0 };
			const species2 = { ...mockDBSighting, id: 456, species: 5 };

			const result = sightingsToGeoJSON([species1, species2]);

			expect(result.features[0].properties.ta).toBe(0);
			expect(result.features[1].properties.ta).toBe(5);
		});

		it('should handle zero counts', () => {
			const zeroCountSighting: DBSighting = {
				...mockDBSighting,
				totalCount: 0,
				juvenileCount: 0
			};

			const result = sightingsToGeoJSON([zeroCountSighting]);
			const properties = result.features[0].properties;

			expect(properties.ct).toBe(0);
			expect(properties.jt).toBe(0);
		});

		it('should handle large numbers', () => {
			const largeSighting: DBSighting = {
				...mockDBSighting,
				id: 999999,
				totalCount: 1000,
				juvenileCount: 500
			};

			const result = sightingsToGeoJSON([largeSighting]);
			const feature = result.features[0];

			expect(feature.id).toBe(999999);
			expect(feature.properties.id).toBe(999999);
			expect(feature.properties.ct).toBe(1000);
			expect(feature.properties.jt).toBe(500);
		});

		it('should preserve coordinates precision', () => {
			const precisionSighting: DBSighting = {
				...mockDBSighting,
				longitude: 13.123456789,
				latitude: 54.987654321
			};

			const result = sightingsToGeoJSON([precisionSighting]);
			const coordinates = result.features[0].geometry.coordinates;

			expect(coordinates[0]).toBe(13.123456789);
			expect(coordinates[1]).toBe(54.987654321);
		});

		it('should handle different date formats', () => {
			const dateFormats = [
				'2024-03-15T14:30:00.000Z',
				'2024-03-15T14:30:00Z',
				'2024-03-15 14:30:00',
				'2024-03-15'
			];

			dateFormats.forEach((dateFormat, index) => {
				const sighting: DBSighting = {
					...mockDBSighting,
					id: index,
					sightingDate: dateFormat
				};

				const result = sightingsToGeoJSON([sighting]);
				const timestamp = result.features[0].properties.ts;

				expect(typeof timestamp).toBe('number');
				expect(timestamp).toBeGreaterThan(0);
			});
		});
	});
});

describe('sightingsToGeoJSON — Bearbeitungszustand', () => {
	const base = {
		id: 1,
		sightingDate: new Date('2026-06-01T10:00:00Z'),
		longitude: 12.5,
		latitude: 54.5,
		species: 1,
		totalCount: 2,
		juvenileCount: 0,
		isDead: false,
		nameConsent: false,
		shipNameConsent: false
	};

	it('markiert freigegebene Sichtungen als approved', () => {
		const result = sightingsToGeoJSON([
			{ ...base, approvedAt: new Date('2026-06-02T08:00:00Z'), rejectedAt: null }
		] as never);
		expect(result.features[0].properties.st).toBe('approved');
	});

	it('markiert abgelehnte Sichtungen als rejected', () => {
		const result = sightingsToGeoJSON([
			{ ...base, approvedAt: null, rejectedAt: new Date('2026-06-02T08:00:00Z') }
		] as never);
		expect(result.features[0].properties.st).toBe('rejected');
	});

	it('markiert unbearbeitete Sichtungen als open', () => {
		const result = sightingsToGeoJSON([{ ...base, approvedAt: null, rejectedAt: null }] as never);
		expect(result.features[0].properties.st).toBe('open');
	});

	it('behandelt fehlende Spalten wie offen, nicht wie freigegeben', () => {
		// Eine Projektion ohne die beiden Spalten darf nicht versehentlich als
		// "öffentlich" durchgehen — gleiche verweigernde Richtung wie
		// isSightingApproved() in approvalFilter.ts.
		const result = sightingsToGeoJSON([base] as never);
		expect(result.features[0].properties.st).toBe('open');
	});
});

describe('areExtentsColocated', () => {
	it('gibt false zurück bei weniger als 2 Extents', () => {
		expect(areExtentsColocated([])).toBe(false);
		expect(areExtentsColocated([[0, 0, 0, 0]])).toBe(false);
	});

	it('erkennt identische Koordinaten als colocated', () => {
		const extent: [number, number, number, number] = [1000, 2000, 1000, 2000];
		expect(areExtentsColocated([extent, extent, extent])).toBe(true);
	});

	it('erkennt nahe Koordinaten innerhalb des Thresholds als colocated', () => {
		const extents: [number, number, number, number][] = [
			[1000, 2000, 1000, 2000],
			[1050, 2050, 1050, 2050],
			[1099, 2099, 1099, 2099]
		];
		expect(areExtentsColocated(extents, 100)).toBe(true);
	});

	it('erkennt entfernte Koordinaten als nicht colocated', () => {
		const extents: [number, number, number, number][] = [
			[1000, 2000, 1000, 2000],
			[1200, 2000, 1200, 2000]
		];
		expect(areExtentsColocated(extents, 100)).toBe(false);
	});

	it('erkennt Abweichung nur in Y-Achse als nicht colocated', () => {
		const extents: [number, number, number, number][] = [
			[1000, 2000, 1000, 2000],
			[1000, 2150, 1000, 2150]
		];
		expect(areExtentsColocated(extents, 100)).toBe(false);
	});

	it('verwendet Standard-Threshold von 100', () => {
		expect(
			areExtentsColocated([
				[1000, 2000, 1000, 2000],
				[1099, 2099, 1099, 2099]
			])
		).toBe(true);

		expect(
			areExtentsColocated([
				[1000, 2000, 1000, 2000],
				[1101, 2000, 1101, 2000]
			])
		).toBe(false);
	});

	it('erkennt gemischte Entfernungen korrekt (ein Outlier reicht)', () => {
		const extents: [number, number, number, number][] = [
			[1000, 2000, 1000, 2000],
			[1010, 2010, 1010, 2010],
			[5000, 6000, 5000, 6000]
		];
		expect(areExtentsColocated(extents, 100)).toBe(false);
	});
});
