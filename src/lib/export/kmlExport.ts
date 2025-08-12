import type { Sighting } from '$lib/types/types';

interface KmlPlacemark {
	name: string;
	description: string;
	coordinates: string;
	styleUrl: string;
	timestamp: string;
}

/**
 * Erzeugt KML-Daten aus Sichtungen
 * Basiert auf der ursprünglichen PHP-Funktion getForKml
 */
export function generateKmlData(sightings: Sighting[]): string {
	const placemarks = sightings.map(sightingToKmlPlacemark);

	// Zählen der verschiedenen Kategorien für Statistiken
	const counts = {
		eq_1: 0,
		'2_5': 0,
		'5_10': 0,
		'11_15': 0,
		gt_15: 0,
		dead: 0
	};

	// Style-URLs für Placemarks festlegen und Zähler aktualisieren
	placemarks.forEach((placemark, index) => {
		const sighting = sightings[index];

		if (sighting?.isDead) {
			placemark.styleUrl = '#style0';
			counts.dead++;
		} else {
			const count = sighting?.totalCount || 0;

			if (count === 1) {
				placemark.styleUrl = '#style1';
				counts.eq_1++;
			} else if (count < 6) {
				placemark.styleUrl = '#style2';
				counts['2_5']++;
			} else if (count < 11) {
				placemark.styleUrl = '#style3';
				counts['5_10']++;
			} else if (count < 16) {
				placemark.styleUrl = '#style4';
				counts['11_15']++;
			} else {
				placemark.styleUrl = '#style5';
				counts.gt_15++;
			}
		}
	});

	// KML-Dokument erstellen
	let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Style id="style0">
      <IconStyle>
        <Icon>
          <href>https://maps.google.com/mapfiles/ms/icons/red-dot.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="style1">
      <IconStyle>
        <Icon>
          <href>https://maps.google.com/mapfiles/ms/icons/blue-dot.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="style2">
      <IconStyle>
        <Icon>
          <href>https://maps.google.com/mapfiles/ms/icons/green-dot.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="style3">
      <IconStyle>
        <Icon>
          <href>https://maps.google.com/mapfiles/ms/icons/yellow-dot.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="style4">
      <IconStyle>
        <Icon>
          <href>https://maps.google.com/mapfiles/ms/icons/purple-dot.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="style5">
      <IconStyle>
        <Icon>
          <href>https://maps.google.com/mapfiles/ms/icons/orange-dot.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Folder>
      <name>Sichtungen</name>`;

	// Placemarks hinzufügen
	placemarks.forEach((placemark) => {
		kmlContent += `
      <Placemark>
        <name>${escapeXml(placemark.name)}</name>
        <description>${placemark.description}</description>
        <Point>
          <coordinates>${placemark.coordinates}</coordinates>
        </Point>
        <TimeStamp>
          <when>${placemark.timestamp}</when>
        </TimeStamp>
        <styleUrl>${placemark.styleUrl}</styleUrl>
      </Placemark>`;
	});

	// Statistiken hinzufügen
	kmlContent += `
      <ExtendedData>
        <Data name="counts">
          <value>${counts.eq_1},${counts['2_5']},${counts['5_10']},${counts['11_15']},${counts.gt_15},${counts.dead}</value>
        </Data>
      </ExtendedData>
    </Folder>
  </Document>
</kml>`;

	return kmlContent;
}

/**
 * Konvertiert eine Sichtung in ein KML-Placemark
 */
function sightingToKmlPlacemark(sighting: Sighting): KmlPlacemark {
	const date = new Date(sighting.sightingDate);
	const formattedDate = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear().toString().slice(-2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

	// Name des Placemarks (Datum und Uhrzeit)
	const name = formattedDate;

	// Beschreibung des Placemarks
	let description = '<![CDATA[';

	if (sighting.species) {
		description += `<p><label>Tierart: </label>${getSpeciesName(sighting.species)}</p>`;
	}

	const lat = typeof sighting.latitude === 'number' ? sighting.latitude : 0;
	const lon = typeof sighting.longitude === 'number' ? sighting.longitude : 0;
	description += `<p><label>Position: </label>${formatDMS(lat, lon)}</p>`;
	description += `<p><label>Anzahl Tiere: </label>${sighting.totalCount}</p>`;

	if (sighting.juvenileCount && sighting.juvenileCount > 0) {
		description += `<p><label>Davon Jungtiere: </label>${sighting.juvenileCount}</p>`;
	}

	if (sighting.shipName && (sighting.nameConsent || sighting.shipNameConsent)) {
		description += `<p><label>Schiffsname: </label>${sighting.shipName}</p>`;
	}

	if (sighting.nameConsent && sighting.firstName && sighting.lastName) {
		description += `<p><label>Name: </label>${sighting.firstName} ${sighting.lastName}</p>`;
	}

	if (sighting.waterway) {
		description += `<p><label>Fahrwasser: </label>${sighting.waterway}</p>`;
	}

	description += ']]>';

	// Koordinaten
	const coordinates = `${sighting.longitude},${sighting.latitude}`;

	// Zeitstempel im KML-Format
	const timestamp = formatKmlTimestamp(sighting.sightingDate);

	return {
		name,
		description,
		coordinates,
		styleUrl: '#style1', // Standardwert, wird später basierend auf der Anzahl aktualisiert
		timestamp
	};
}

/**
 * Formatiert ein Datum als KML-Timestamp
 */
function formatKmlTimestamp(dateString: string): string {
	const date = new Date(dateString);
	return date.toISOString();
}

/**
 * Formatiert Koordinaten im DMS-Format (Grad, Minuten, Sekunden)
 */
function formatDMS(latitude: number, longitude: number): string {
	function _formatDMS(dec: number): { deg: number; min: number; sec: number } {
		const deg = Math.floor(Math.abs(dec));
		const minFloat = (Math.abs(dec) - deg) * 60;
		const min = Math.floor(minFloat);
		const sec = (minFloat - min) * 60;

		return { deg: dec < 0 ? -deg : deg, min, sec };
	}

	const latDMS = _formatDMS(latitude);
	const lonDMS = _formatDMS(longitude);

	// Format: 00° 00' 00.00"N - 000° 00' 00.00"E
	const latStr = `${latDMS.deg.toString().padStart(2, '0')}° ${latDMS.min.toString().padStart(2, '0')}' ${latDMS.sec.toFixed(2)}"${latDMS.deg < 0 ? 'S' : 'N'}`;
	const lonStr = `${lonDMS.deg.toString().padStart(3, '0')}° ${lonDMS.min.toString().padStart(2, '0')}' ${lonDMS.sec.toFixed(2)}"${lonDMS.deg < 0 ? 'W' : 'E'}`;

	return `${latStr} - ${lonStr}`;
}

/**
 * Hilfsfunktion zum Escapen von XML-Zeichen
 */
function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/**
 * Gibt den Namen einer Tierart basierend auf der ID zurück
 */
function getSpeciesName(speciesId: number): string {
	const speciesMap: Record<number, string> = {
		0: 'Schweinswal',
		1: 'Kegelrobbe',
		2: 'Seehund',
		3: 'Delphin (mehrere Arten)',
		4: 'Beluga',
		5: 'Zwergwal',
		6: 'Finnwal',
		7: 'Buckelwal',
		8: 'Unbekannte Walart',
		9: 'Ringelrobbe',
		10: 'Unbekannte Robbenart'
	};

	return speciesMap[speciesId] || 'Unbekannt';
}

/**
 * Generiert einen KML-Download für die gegebenen Sichtungen
 */
export function downloadKml(sightings: Sighting[], filename = 'sichtungen-export.kml'): void {
	const kmlContent = generateKmlData(sightings);
	const blob = new Blob([kmlContent], {
		type: 'application/vnd.google-earth.kml+xml;charset=utf-8;'
	});
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
