#!/usr/bin/env node
/**
 * Create spatial index using pure rbush library
 * This avoids GeoJSON validation issues from geojson-rbush
 */

import { readFileSync, writeFileSync } from 'fs';
import RBush from 'rbush';

/**
 * Calculate bounding box for a polygon coordinate array
 */
function getBoundingBox(coordinates, geometryType) {
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	
	function processRing(ring) {
		if (!Array.isArray(ring)) {
			console.warn('Ring is not an array:', typeof ring);
			return;
		}
		
		for (const coord of ring) {
			if (Array.isArray(coord) && coord.length >= 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
				const [x, y] = coord;
				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				maxX = Math.max(maxX, x);
				maxY = Math.max(maxY, y);
			}
		}
	}
	
	if (geometryType === 'Polygon') {
		// Polygon: coordinates is an array of linear rings
		if (Array.isArray(coordinates) && coordinates.length > 0) {
			processRing(coordinates[0]); // Exterior ring
		}
	} else if (geometryType === 'MultiPolygon') {
		// MultiPolygon: coordinates is an array of Polygon coordinate arrays
		if (Array.isArray(coordinates)) {
			for (const polygon of coordinates) {
				if (Array.isArray(polygon) && polygon.length > 0) {
					processRing(polygon[0]); // Exterior ring of each polygon
				}
			}
		}
	}
	
	const result = {
		minX: isFinite(minX) ? minX : 0,
		minY: isFinite(minY) ? minY : 0,
		maxX: isFinite(maxX) ? maxX : 0,
		maxY: isFinite(maxY) ? maxY : 0
	};
	
	// Debug logging
	console.log(`   Geometry type: ${geometryType}, bbox calculated: [${result.minX}, ${result.minY}, ${result.maxX}, ${result.maxY}]`);
	
	return result;
}

/**
 * Create spatial index from GeoJSON features
 */
export async function createRBushIndex(inputFile, outputFile) {
	try {
		console.log('Loading GeoJSON data from:', inputFile);
		const geojsonData = JSON.parse(readFileSync(inputFile, 'utf8'));
		
		if (!geojsonData.features || !Array.isArray(geojsonData.features)) {
			throw new Error('Invalid GeoJSON: missing features array');
		}
		
		console.log(`Found ${geojsonData.features.length} features`);
		
		// Create rbush index
		const tree = new RBush();
		const indexItems = [];
		
		// Process each feature
		for (let i = 0; i < geojsonData.features.length; i++) {
			const feature = geojsonData.features[i];
			
			if (!feature.geometry || !feature.geometry.coordinates) {
				console.warn(`Feature ${i} missing geometry, skipping`);
				continue;
			}
			
			const { geometry } = feature;
			
			// Only process Polygon and MultiPolygon
			if (!['Polygon', 'MultiPolygon'].includes(geometry.type)) {
				console.warn(`Feature ${i} has unsupported geometry type: ${geometry.type}`);
				continue;
			}
			
			try {
				// Calculate bounding box
				const bbox = getBoundingBox(geometry.coordinates, geometry.type);
				
				// Create index item with bounding box and original feature data
				const item = {
					minX: bbox.minX,
					minY: bbox.minY,
					maxX: bbox.maxX,
					maxY: bbox.maxY,
					// Store the feature data for later point-in-polygon tests
					featureIndex: i,
					id: feature.id,
					geometry: {
						type: geometry.type,
						coordinates: geometry.coordinates
					}
				};
				
				indexItems.push(item);
				console.log(`Processed feature ${i} (${feature.id}): bbox [${bbox.minX.toFixed(3)}, ${bbox.minY.toFixed(3)}, ${bbox.maxX.toFixed(3)}, ${bbox.maxY.toFixed(3)}]`);
				
			} catch (error) {
				console.warn(`Error processing feature ${i}:`, error.message);
				continue;
			}
		}
		
		console.log(`Created ${indexItems.length} spatial index items`);
		
		// Bulk load into rbush
		tree.load(indexItems);
		
		// Convert to JSON for serialization
		const indexData = {
			type: 'RBushIndex',
			version: '1.0',
			created: new Date().toISOString(),
			itemCount: indexItems.length,
			tree: tree.toJSON()
		};
		
		// Save index
		writeFileSync(outputFile, JSON.stringify(indexData, null, 2));
		console.log(`Spatial index saved to: ${outputFile}`);
		console.log(`Index contains ${indexItems.length} items`);
		
		// Verify the index works
		console.log('\nVerifying index...');
		const testTree = new RBush();
		testTree.fromJSON(indexData.tree);
		
		// Test search
		const testResults = testTree.search({ minX: 14, minY: 54, maxX: 15, maxY: 55 });
		console.log(`Test search found ${testResults.length} candidates`);
		
		console.log('\n✅ RBush index created successfully!');
		
	} catch (error) {
		console.error('Error creating RBush index:', error.message);
		console.error('Stack:', error.stack);
		process.exit(1);
	}
}

// Usage: node create-rbush-index.js input.geojson rbush-index.json
if (import.meta.url === `file://${process.argv[1]}`) {
	const inputFile = process.argv[2] || 'iho.json';
	const outputFile = process.argv[3] || 'rbush-index.json';
	createRBushIndex(inputFile, outputFile);
}