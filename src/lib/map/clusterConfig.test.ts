import { describe, expect, it } from 'vitest';
import {
	CLUSTER_MIN_DISTANCE_RATIO,
	clusterDistanceForZoom,
	clusterMinDistanceFor
} from './clusterConfig';

/**
 * Tests für die Cluster-Distanz-Konfiguration (Befund M2).
 *
 * Vorher erlaubte `minDistance: 10` bei `distance: 40-50` fast vollständige
 * Überlappung der Cluster-Kreise bei niedrigen Zoomstufen. minDistance muss
 * an die jeweilige distance gekoppelt sein (~60 %), damit Cluster lesbar
 * getrennt bleiben.
 */
describe('clusterDistanceForZoom', () => {
	it('liefert die bisherige Zoom-Staffel (50/40/30/20)', () => {
		expect(clusterDistanceForZoom(5)).toBe(50);
		expect(clusterDistanceForZoom(7.9)).toBe(50);
		expect(clusterDistanceForZoom(8)).toBe(40);
		expect(clusterDistanceForZoom(9.9)).toBe(40);
		expect(clusterDistanceForZoom(10)).toBe(30);
		expect(clusterDistanceForZoom(11.9)).toBe(30);
		expect(clusterDistanceForZoom(12)).toBe(20);
		expect(clusterDistanceForZoom(18)).toBe(20);
	});
});

describe('clusterMinDistanceFor', () => {
	it('koppelt minDistance an ~60 % der distance', () => {
		expect(CLUSTER_MIN_DISTANCE_RATIO).toBeCloseTo(0.6);
		expect(clusterMinDistanceFor(50)).toBe(30);
		expect(clusterMinDistanceFor(40)).toBe(24);
		expect(clusterMinDistanceFor(30)).toBe(18);
		expect(clusterMinDistanceFor(20)).toBe(12);
	});

	it('verhindert die alte Fast-Überlappung (minDistance 10 bei distance 40+)', () => {
		for (const zoom of [5, 8, 10, 12]) {
			const distance = clusterDistanceForZoom(zoom);
			expect(clusterMinDistanceFor(distance)).toBeGreaterThanOrEqual(distance * 0.5);
		}
	});
});
