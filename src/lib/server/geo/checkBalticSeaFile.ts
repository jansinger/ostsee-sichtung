/**
 * Baltic Sea geographic validation utilities
 * Server-side implementation using rbush spatial index with Turf.js
 */

import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { multiPolygon, point, polygon } from '@turf/helpers';
import RBush from 'rbush';
import rbushIndex from './rbush-index.json';

// Ensure correct typing for rbushIndex
type RBushIndexJson = {
	tree: unknown;
};
const rbushIndexTyped = rbushIndex as RBushIndexJson;

export interface BalticSeaResult {
	inBaltic: boolean;
	inChartArea: boolean;
	longitude: number;
	latitude: number;
}

// Approximate Baltic Sea bounding box
const BALTIC_SEA_BBOX = {
	minLng: 9.0,
	maxLng: 30.0,
	minLat: 53.0,
	maxLat: 66.0
};

interface SpatialIndexItem {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	featureIndex: number;
	id: string;
	geometry: {
		type: 'Polygon' | 'MultiPolygon';
		coordinates: number[][][] | number[][][][]; // Polygon or MultiPolygon
	};
}

let spatialIndex: RBush<SpatialIndexItem> | null = null;

/**
			spatialIndex.fromJSON(rbushIndexTyped.tree);
 */
function loadSpatialIndex() {
	if (spatialIndex === null) {
		try {
			spatialIndex = new RBush<SpatialIndexItem>();
			spatialIndex.fromJSON(rbushIndexTyped.tree);

			console.log('RBush spatial index loaded successfully (Turf.js variant)');
		} catch (error) {
			console.error(
				'Failed to load spatial index:',
				error instanceof Error ? error.message : String(error)
			);
			spatialIndex = null;
		}
	}
}

/**
 * Check if a point is within the Baltic Sea bounding box
 */
function isInBalticArea(lng: number, lat: number): boolean {
	return (
		lng >= BALTIC_SEA_BBOX.minLng &&
		lng <= BALTIC_SEA_BBOX.maxLng &&
		lat >= BALTIC_SEA_BBOX.minLat &&
		lat <= BALTIC_SEA_BBOX.maxLat
	);
}

/**
 * Turf.js optimized point-in-polygon test
 * More standardized than manual ray casting, good accuracy
 */
function isPointInPolygonTurf(x: number, y: number, polygonCoords: number[][][]): boolean {
	try {
		// Validate input
		if (!Array.isArray(polygonCoords) || polygonCoords.length === 0) {
			return false;
		}

		// Create Turf.js geometries
		const testPoint = point([x, y]);
		const testPolygon = polygon(polygonCoords);

		// Use Turf.js boolean point in polygon
		return booleanPointInPolygon(testPoint, testPolygon);
	} catch (error) {
		console.warn(
			'Error in Turf.js point-in-polygon test:',
			error instanceof Error ? error.message : String(error)
		);
		return false;
	}
}

/**
 * Turf.js optimized point-in-multipolygon test
 */
function isPointInMultiPolygonTurf(
	x: number,
	y: number,
	multiPolygonCoords: number[][][][]
): boolean {
	try {
		// Validate input
		if (!Array.isArray(multiPolygonCoords) || multiPolygonCoords.length === 0) {
			return false;
		}

		// Create Turf.js geometries
		const testPoint = point([x, y]);
		const testMultiPolygon = multiPolygon(multiPolygonCoords);

		// Use Turf.js boolean point in polygon for MultiPolygon
		return booleanPointInPolygon(testPoint, testMultiPolygon);
	} catch (error) {
		console.warn(
			'Error in Turf.js point-in-multipolygon test:',
			error instanceof Error ? error.message : String(error)
		);
		return false;
	}
}

/**
 * Check if a point is within any of the Baltic Sea polygons
 * Using rbush spatial index + Turf.js for accurate geometric operations
 */
function isInBalticShape(lng: number, lat: number): boolean {
	try {
		loadSpatialIndex();

		if (!spatialIndex) {
			console.warn('Spatial index not available');
			return false;
		}

		// Search for candidates using the spatial index
		const candidates = spatialIndex.search({
			minX: lng,
			minY: lat,
			maxX: lng,
			maxY: lat
		});

		if (!candidates || candidates.length === 0) {
			return false;
		}

		// Check each candidate with Turf.js point-in-polygon test
		for (const candidate of candidates) {
			try {
				const { geometry } = candidate;

				if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates)) {
					continue;
				}

				// Process Polygon and MultiPolygon geometries with Turf.js
				if (geometry.type === 'Polygon') {
					const polygonCoords = geometry.coordinates as number[][][];
					if (isPointInPolygonTurf(lng, lat, polygonCoords)) {
						return true;
					}
				} else if (geometry.type === 'MultiPolygon') {
					const multiPolygonCoords = geometry.coordinates as number[][][][];
					if (isPointInMultiPolygonTurf(lng, lat, multiPolygonCoords)) {
						return true;
					}
				}
			} catch (error) {
				// Skip invalid geometries and continue with next candidate
				console.warn(
					'Invalid geometry in candidate, skipping:',
					error instanceof Error ? error.message : String(error)
				);
				continue;
			}
		}

		return false;
	} catch (error) {
		console.error(
			'Error in isInBalticShape:',
			error instanceof Error ? error.message : String(error)
		);
		return false;
	}
}

/**
 * Server-side Baltic Sea check using rbush spatial index + Turf.js
 */
export function checkBalticSeaFile(longitude: number, latitude: number): BalticSeaResult {
	// Validate input parameters
	if (typeof longitude !== 'number' || typeof latitude !== 'number') {
		return {
			inBaltic: false,
			inChartArea: false,
			longitude,
			latitude
		};
	}

	// Check coordinate bounds
	if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
		return {
			inBaltic: false,
			inChartArea: false,
			longitude,
			latitude
		};
	}

	// Check if point is in Baltic area (bounding box)
	const inBalticArea = isInBalticArea(longitude, latitude);

	// Check if point is in Baltic shape using rbush spatial index + Turf.js
	const inBalticShape = isInBalticShape(longitude, latitude);

	return {
		inChartArea: inBalticArea,
		inBaltic: inBalticShape,
		longitude,
		latitude
	};
}
