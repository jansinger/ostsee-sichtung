/**
 * Cluster-Distanz-Konfiguration für die Sichtungskarte (M2).
 *
 * `distance` steuert, ab welchem Pixel-Abstand Features zu einem Cluster
 * zusammengefasst werden; `minDistance` hält fertige Cluster auf Abstand.
 * Ein fixes `minDistance: 10` bei `distance: 40-50` ließ Cluster bei
 * Zoom ≤ 8 fast deckungsgleich übereinander liegen — deshalb ist
 * minDistance hier an ~60 % der jeweiligen distance gekoppelt.
 */
export const CLUSTER_MIN_DISTANCE_RATIO = 0.6;

/** Cluster-Distanz je Zoomstufe — enger clustern, je weiter hineingezoomt ist. */
export function clusterDistanceForZoom(zoom: number): number {
	if (zoom < 8) return 50;
	if (zoom < 10) return 40;
	if (zoom < 12) return 30;
	return 20;
}

/** Mindestabstand zwischen Clustern, gekoppelt an die aktuelle Distanz. */
export function clusterMinDistanceFor(distance: number): number {
	return Math.round(distance * CLUSTER_MIN_DISTANCE_RATIO);
}
