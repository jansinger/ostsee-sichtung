export interface MapTranslations {
	overview: string;
	zoom_title: string;
	zoom: string;
	report_date: string;
	language: string;
	species: string;
	species_legend: string;
	position: string;
	count: string;
	young: string;
	ship: string;
	name: string;
	area: string;
	latitude: string;
	longitude: string;
	found_dead: string;
	speciesMap: Record<string, string>;
}

export interface SightingFeature {
	type: 'Feature';
	id: number;
	geometry: {
		type: 'Point';
		coordinates: [number, number]; // [longitude, latitude]
	};
	properties: {
		id: number;
		ts: number; // timestamp
		ta: number; // tierart (species)
		ct: number; // count
		jt: number; // juvenile count
		tf: boolean; // totfund (dead)
		// Weitere Eigenschaften je nach Bedarf
		name?: string | undefined;
		firstname?: string | undefined;
		shipname?: string | undefined;
		waterway?: string | undefined;
		seaMark?: string | undefined;
	};
}

export interface GeoJSONResponse {
	type: 'FeatureCollection';
	features: SightingFeature[];
}

// Definiert die Sichtung aus der Datenbank
export interface DBSighting {
	id: number;
	sightingDate: string;
	longitude: number | string;
	latitude: number | string;
	species: number;
	totalCount: number;
	juvenileCount: number;
	isDead: boolean;
	firstName?: string;
	lastName?: string;
	nameConsent: boolean;
	shipName?: string;
	shipNameConsent: boolean;
	waterway?: string;
	seaMark?: string;
	[key: string]: unknown;
}

/**
 * Konvertiert Sichtungen aus der Datenbank in ein GeoJSON-Format für OpenLayers
 */
export function sightingsToGeoJSON(sightingsFromDB: DBSighting[]): GeoJSONResponse {
	const features: SightingFeature[] = sightingsFromDB.map((dbSighting) => {
		// Zeitstempel aus dem Datum erzeugen
		const timestamp = new Date(dbSighting.sightingDate).getTime() / 1000;

		// Stelle sicher, dass Koordinaten als Zahlen vorliegen
		const longitude =
			typeof dbSighting.longitude === 'string'
				? parseFloat(dbSighting.longitude)
				: dbSighting.longitude || 0;

		const latitude =
			typeof dbSighting.latitude === 'string'
				? parseFloat(dbSighting.latitude)
				: dbSighting.latitude || 0;

		return {
			type: 'Feature' as const,
			id: dbSighting.id,
			geometry: {
				type: 'Point' as const,
				coordinates: [longitude, latitude]
			},
			properties: {
				id: dbSighting.id,
				ts: timestamp,
				ta: dbSighting.species,
				ct: dbSighting.totalCount,
				jt: dbSighting.juvenileCount,
				tf: dbSighting.isDead,
				name: dbSighting.nameConsent ? dbSighting.lastName : undefined,
				firstname: dbSighting.nameConsent ? dbSighting.firstName : undefined,
				shipname: dbSighting.shipNameConsent ? dbSighting.shipName : undefined,
				waterway: dbSighting.waterway,
				seaMark: dbSighting.seaMark
			}
		};
	});

	return {
		type: 'FeatureCollection',
		features
	};
}
