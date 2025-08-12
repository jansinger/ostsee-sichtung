import type { Sighting } from '$lib/types/types';

interface XmlSighting {
	nr: number;
	datum: string;
	uhrzeit: string;
	tierart: number | string;
	fahrwasser?: string | undefined;
	dezigrad_n: number;
	dezigrad_e: number;
	totfund: boolean;
	media: string;
	anz_ber?: number | undefined;
	groessenklasse: string;
	jungtiere?: number | undefined;
	x: number;
	y: number;
	schiff?: string | undefined;
	person?: string | undefined;
}

/**
 * Erzeugt XML-Daten aus Sichtungen
 * Basiert auf der ursprünglichen PHP-Funktion getXmlData
 */
export function generateXmlData(sightings: Sighting[]): string {
	const xmlSightings = sightings.map(transformToXmlSighting);

	// XML-Header erstellen
	let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
	xmlContent += '<sichtungen>\n';

	// Jede Sichtung in XML umwandeln
	xmlSightings.forEach((sighting) => {
		xmlContent += '  <sichtung>\n';

		// Jedes Feld der Sichtung als XML-Element hinzufügen
		Object.entries(sighting).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				// Konvertiere true/false zu 1/0 für XML
				const xmlValue = typeof value === 'boolean' ? (value ? '1' : '0') : value;
				xmlContent += `    <${key}>${xmlValue}</${key}>\n`;
			}
		});

		xmlContent += '  </sichtung>\n';
	});

	xmlContent += '</sichtungen>';

	return xmlContent;
}

/**
 * Transformiert eine Sichtung in das XML-Format
 * Basiert auf der ursprünglichen PHP-Funktion in getXmlData
 */
function transformToXmlSighting(sighting: Sighting): XmlSighting {
	// Zeitstempel in Datum und Uhrzeit umwandeln
	const sdt = new Date(sighting.sightingDate);
	const formattedDate = `${sdt.getDate().toString().padStart(2, '0')}.${(sdt.getMonth() + 1).toString().padStart(2, '0')}.${sdt.getFullYear().toString().slice(-2)}`;
	const formattedTime = `${sdt.getHours().toString().padStart(2, '0')}${sdt.getMinutes().toString().padStart(2, '0')}`;

	// Basisfelder
	const xmlSighting: XmlSighting = {
		nr: sighting.id,
		datum: formattedDate,
		uhrzeit: formattedTime,
		tierart: sighting.species,
		fahrwasser: sighting.waterway || undefined,
		dezigrad_n: typeof sighting.latitude === 'number' ? sighting.latitude : 0,
		dezigrad_e: typeof sighting.longitude === 'number' ? sighting.longitude : 0,
		totfund: sighting.isDead ? true : false,
		media: 'Einzeltier', // Standardwert, wird später basierend auf totalCount aktualisiert
		groessenklasse: 'Einzeltier', // Standardwert, wird später aktualisiert
		x: 0, // Wird später berechnet
		y: 0 // Wird später berechnet
	};

	// Anzahl-Kategorie bestimmen
	const totalCount = sighting.totalCount;

	if (sighting.isDead) {
		xmlSighting.media = 'tot';
		xmlSighting.groessenklasse = 'tot';
	} else {
		// Größenklassen basierend auf der Anzahl
		if (totalCount !== undefined && totalCount === 1) {
			xmlSighting.media = 'Einzeltier';
			xmlSighting.anz_ber = totalCount;
			xmlSighting.groessenklasse = 'Einzeltier';
		} else if (totalCount !== undefined && totalCount < 6) {
			xmlSighting.media = '2_5';
			xmlSighting.anz_ber = totalCount;
			xmlSighting.groessenklasse = '2-5 Tiere';
		} else if (totalCount !== undefined && totalCount < 11) {
			xmlSighting.media = '6_10';
			xmlSighting.anz_ber = totalCount;
			xmlSighting.groessenklasse = '6-10 Tiere';
		} else if (totalCount !== undefined && totalCount < 16) {
			xmlSighting.media = '11_15';
			xmlSighting.anz_ber = totalCount;
			xmlSighting.groessenklasse = '11-15 Tiere';
		} else {
			xmlSighting.media = '_15';
			xmlSighting.anz_ber = totalCount;
			xmlSighting.groessenklasse = 'Mehr als 15 Tiere';
		}
	}

	// Jungtiere hinzufügen, wenn vorhanden
	if (sighting.juvenileCount && sighting.juvenileCount > 0) {
		xmlSighting.jungtiere = sighting.juvenileCount;
	}

	// X und Y Koordinaten berechnen (ähnlich wie in der PHP-Version)
	const gps_n = typeof sighting.latitude === 'number' ? sighting.latitude : 0;
	const gps_e = typeof sighting.longitude === 'number' ? sighting.longitude : 0;
	const X = gps_e !== null && gps_e !== undefined ? Math.round((gps_e * 6371000 * Math.PI) / 180) : 0;
	const Y = gps_n !== null && gps_n !== undefined ? Math.round(Math.log(Math.tan((gps_n * Math.PI) / 360 + Math.PI / 4)) * 6371000) : 0;
	xmlSighting.x = Math.round(((X - 1050792.0567911) / 628251.3355417) * 1000) / 1000;
	xmlSighting.y = Math.round(((Y - 7138521.4416712) / 909594.5299957) * 1000) / 1000;

	// Schiff und Person basierend auf Einwilligungen
	if (sighting.shipNameConsent && sighting.shipName) {
		xmlSighting.schiff = sighting.shipName;
	}

	if (sighting.nameConsent && sighting.firstName && sighting.lastName) {
		xmlSighting.person = `${sighting.firstName} ${sighting.lastName}`;
	}

	return xmlSighting;
}

/**
 * Generiert einen XML-Download für die gegebenen Sichtungen
 */
export function downloadXml(sightings: Sighting[], filename = 'sichtungen-export.xml'): void {
	const xmlContent = generateXmlData(sightings);
	const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
