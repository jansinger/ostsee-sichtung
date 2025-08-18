/**
 * @fileoverview Geografische Typen und Interfaces für Koordinaten und räumliche Validierung
 * 
 * Dieses Modul definiert alle TypeScript-Typen für die geografische Validierung
 * von GPS-Koordinaten im Ostsee-Bereich. Es umfasst Koordinaten-Limits,
 * Validierungsergebnisse und PostGIS-spezifische Datenstrukturen.
 * 
 * Die Typen unterstützen sowohl WGS84-Standard-Koordinaten als auch
 * Natural Earth Geodaten für präzise räumliche Abfragen.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.0.0
 */

/**
 * GPS-Koordinate mit Längen- und Breitengrad nach WGS84-Standard
 * 
 * Repräsentiert eine geografische Position mit optionaler Höhenangabe.
 * Verwendet das World Geodetic System 1984 (WGS84) als Referenzsystem.
 */
export interface GPSCoordinate {
	/** Längengrad (-180° bis +180°, Ost-West Position) */
	longitude: number;
	
	/** Breitengrad (-90° bis +90°, Nord-Süd Position) */
	latitude: number;
	
	/** Optionale Höhe über dem Meeresspiegel in Metern */
	altitude?: number;
}

/**
 * Gültigkeitsbereich für geografische Koordinaten nach WGS84-Standard
 * 
 * Definiert die absoluten Grenzen für Längen- und Breitengrade entsprechend
 * der WGS84-Spezifikation für globale Positionsbestimmung.
 */
export interface GeoLimits {
	/** Westlichste Position (-180°) */
	MIN_LONGITUDE: -180;
	
	/** Östlichste Position (+180°) */
	MAX_LONGITUDE: 180;
	
	/** Südlichste Position (-90°, Südpol) */
	MIN_LATITUDE: -90;
	
	/** Nördlichste Position (+90°, Nordpol) */
	MAX_LATITUDE: 90;
}

/**
 * Ergebnis der geografischen Validierung für Ostsee-Koordinaten
 * 
 * Enthält die Ergebnisse der PostGIS-basierten räumlichen Abfrage gegen
 * die Natural Earth Ostsee-Geometrie und den erweiterten Kartenbereich.
 */
export interface BalticSeaValidationResult {
	/** 
	 * Liegt die Position innerhalb der exakten Ostsee-Polygone?
	 * 
	 * Basiert auf PostGIS ST_Contains() Funktion mit Natural Earth
	 * Geometriedaten für präzise Grenzerkennung.
	 */
	inBaltic: boolean;
	
	/**
	 * Liegt die Position im erweiterten Kartenbereich?
	 * 
	 * Prüft die Bounding Box des Ostsee-Kartenbereichs (9.4°-30.2° E, 53°-66° N).
	 * Nützlich für Kartendarstellung und Navigation außerhalb der exakten Ostsee-Grenzen.
	 */
	inChartArea: boolean;
}

/**
 * Bounding Box Definition für geografische Bereiche
 * 
 * Definiert einen rechteckigen geografischen Bereich durch
 * minimale und maximale Koordinaten.
 */
export interface BoundingBox {
	/** Westlichste Längengrad-Grenze */
	minLongitude: number;
	
	/** Östlichste Längengrad-Grenze */
	maxLongitude: number;
	
	/** Südlichste Breitengrad-Grenze */
	minLatitude: number;
	
	/** Nördlichste Breitengrad-Grenze */
	maxLatitude: number;
}

/**
 * Ostsee-spezifische geografische Konstanten
 * 
 * Enthält vordefinierte Werte für die Ostsee-Region basierend auf
 * Natural Earth Daten und wissenschaftlichen Referenzen.
 */
export interface BalticSeaConstants {
	/** 
	 * Natural Earth Datenbank-ID für die Ostsee
	 * Referenziert den spezifischen Polygondatensatz in der ne_10m_ocean Tabelle
	 */
	NATURAL_EARTH_BALTIC_ID: 2;
	
	/**
	 * Erweiterter Kartenbereich für Ostsee-Darstellung
	 * Umfasst auch angrenzende Küstenbereiche für bessere Navigation
	 */
	CHART_AREA_BOUNDS: BoundingBox;
	
	/**
	 * SRID (Spatial Reference System Identifier) für WGS84
	 * PostGIS-Standard für geografische Koordinaten
	 */
	WGS84_SRID: 4326;
}

/**
 * PostGIS-Datenbank-Antwort für räumliche Abfragen
 * 
 * Repräsentiert die Rückgabe der PostGIS ST_Contains und Bounding-Box Abfragen
 * aus der Datenbank in typsicherer Form.
 */
export interface PostGISValidationRow {
	/** Ergebnis der ST_Contains() Abfrage (exakte Geometrie-Prüfung) */
	in_baltic: boolean | null;
	
	/** Ergebnis der Bounding-Box Operator (&&) Abfrage */
	in_chart_area: boolean | null;
}

/**
 * Validierungsparameter für geografische Koordinaten
 * 
 * Konfiguration für die Koordinaten-Validierung mit optionalen
 * benutzerdefinierten Limits und Toleranzen.
 */
export interface CoordinateValidationParams {
	/** Zu validierende GPS-Koordinate */
	coordinate: GPSCoordinate;
	
	/** Optionale benutzerdefinierte Gültigkeitsgrenzen */
	limits?: Partial<GeoLimits>;
	
	/** Toleranz für Gleitkomma-Vergleiche (Standard: 0.000001°) */
	tolerance?: number;
	
	/** Soll nur der Kartenbereich geprüft werden? */
	chartAreaOnly?: boolean;
}

/**
 * Detailliertes Validierungsergebnis mit zusätzlichen Metadaten
 * 
 * Erweitert das grundlegende Validierungsergebnis um diagnostische
 * Informationen und Performance-Metriken.
 */
export interface DetailedValidationResult extends BalticSeaValidationResult {
	/** Verwendete GPS-Koordinate */
	coordinate: GPSCoordinate;
	
	/** Zeitstempel der Validierung */
	validatedAt: Date;
	
	/** Ausführungszeit der Datenbankabfrage in Millisekunden */
	queryDurationMs: number;
	
	/** Wurde die Abfrage aus dem Cache beantwortet? */
	fromCache: boolean;
	
	/** Zusätzliche Metadaten zur Validierung */
	metadata?: {
		/** Entfernung zur nächsten Ostsee-Grenze in Kilometern */
		distanceToBalticKm?: number;
		
		/** Nächster bekannter Ostsee-Ort */
		nearestBalticLocation?: string;
		
		/** Verwendete Natural Earth Datenversion */
		dataVersion?: string;
	};
}

/**
 * Fehlertypen für geografische Validierung
 * 
 * Kategorisiert verschiedene Arten von Validierungsfehlern
 * für bessere Fehlerbehandlung und Debugging.
 */
export enum GeographicValidationError {
	/** Ungültige Koordinaten-Parameter */
	INVALID_COORDINATES = 'INVALID_COORDINATES',
	
	/** Koordinaten außerhalb der WGS84-Grenzen */
	OUT_OF_BOUNDS = 'OUT_OF_BOUNDS',
	
	/** PostGIS-Datenbankfehler */
	DATABASE_ERROR = 'DATABASE_ERROR',
	
	/** Natural Earth Daten nicht verfügbar */
	GEODATA_UNAVAILABLE = 'GEODATA_UNAVAILABLE',
	
	/** Timeout bei der Datenbankabfrage */
	QUERY_TIMEOUT = 'QUERY_TIMEOUT'
}

/**
 * Strukturierte Fehlerinformation für geografische Validierung
 * 
 * Erweitert den Standard-Error um geografisch-spezifische
 * Kontext-Informationen und Lösungsvorschläge.
 */
export interface GeographicValidationErrorInfo {
	/** Fehlertyp aus der GeographicValidationError Enumeration */
	type: GeographicValidationError;
	
	/** Menschenlesbare Fehlerbeschreibung */
	message: string;
	
	/** Fehlgeschlagene GPS-Koordinate */
	coordinate?: GPSCoordinate;
	
	/** Zusätzliche Kontext-Informationen */
	context?: {
		/** Erwartete Wertebereiche */
		expectedBounds?: BoundingBox;
		
		/** Vorgeschlagene Korrektur */
		suggestion?: string;
		
		/** Technische Fehlerdetails */
		technicalDetails?: string;
	};
}