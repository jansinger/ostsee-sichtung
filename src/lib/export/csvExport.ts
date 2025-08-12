import type { Sighting } from '$lib/types/types';

/**
 * Erzeugt CSV-Daten aus Sichtungen
 * Basiert auf der ursprünglichen PHP-Funktion getCsvData
 */
export function generateCsvData(sightings: Sighting[]): string {
	// CSV-Header definieren
	const headers = [
		'ID',
		'Datum',
		'Uhrzeit',
		'Tierart',
		'Anzahl',
		'Jungtiere',
		'Verteilung',
		'Lat',
		'Lon',
		'Verhalten',
		'Reaktion',
		'Entfernung',
		'Sichtung von',
		'Toter Fund',
		'Zustand',
		'Geschlecht',
		'Größe',
		'Fahrwasser',
		'Seezeichen',
		'Seegang',
		'Sicht',
		'Windrichtung',
		'Windstärke',
		'Schiffsname',
		'Heimathafen',
		'Bootstyp',
		'Bootsantrieb',
		'Schiffsanzahl',
		'Foto',
		'Name',
		'Email',
		'Telefon',
		'Fax',
		'Straße',
		'PLZ',
		'Stadt',
		'Anmerkungen',
		'Andere Beobachtungen',
		'Beschreibung',
		'Verifiziert',
		'Verifiziert am',
		'Verifiziert von',
		'Erstellt am',
		'Geändert am'
	];

	// CSV-Header als erste Zeile
	let csvContent = headers.join(';') + '\n';

	// Daten für jede Sichtung hinzufügen
	sightings.forEach((sighting) => {
		const sdt = new Date(sighting.sightingDate);
		const date = `${sdt.getDate().toString().padStart(2, '0')}.${(sdt.getMonth() + 1).toString().padStart(2, '0')}.${sdt.getFullYear()}`;
		const time = `${sdt.getHours().toString().padStart(2, '0')}:${sdt.getMinutes().toString().padStart(2, '0')}`;

		// Speziesname basierend auf der ID
		const speciesName = getSpeciesName(sighting.species);

		// Verhalten umwandeln
		const behaviorText = getBehaviorText(sighting.behavior);

		// Name (falls Einwilligung vorhanden)
		const name =
			sighting.nameConsent && sighting.firstName && sighting.lastName
				? `${sighting.firstName} ${sighting.lastName}`
				: '';

		// Werte für die CSV-Zeile
		const row = [
			sighting.id,
			date,
			time,
			speciesName,
			sighting.totalCount,
			sighting.juvenileCount || '',
			getDistributionText(sighting.distribution),
			sighting.latitude,
			sighting.longitude,
			behaviorText,
			sighting.reaction || '',
			getDistanceText(sighting.distance),
			getSightingFromText(sighting.sightingFrom),
			sighting.isDead ? 'Ja' : 'Nein',
			sighting.deadCondition || '',
			sighting.deadSex || '',
			sighting.deadSize || '',
			sighting.waterway || '',
			sighting.seaMark || '',
			getSeaStateText(sighting.seaState),
			getVisibilityText(sighting.visibility),
			sighting.windDirection || '',
			sighting.windForce || '',
			sighting.shipNameConsent ? sighting.shipName || '' : '',
			sighting.homePort || '',
			sighting.boatType || '',
			getBoatDriveText(sighting.boatDrive),
			sighting.shipCount || '',
			sighting.mediaUpload ? 'Ja' : 'Nein',
			name,
			sighting.email || '',
			sighting.phone || '',
			sighting.fax || '',
			sighting.street || '',
			sighting.zipCode || '',
			sighting.city || '',
			sighting.notes || '',
			sighting.otherObservations || '',
			sighting.verified ? 'Ja' : 'Nein',
			new Date(sighting.created).toLocaleString('de-DE')
		];

		// Werte mit Anführungszeichen versehen und zur CSV hinzufügen
		csvContent += row.map((value) => `"${value}"`).join(';') + '\n';
	});

	return csvContent;
}

/**
 * Generiert einen CSV-Download für die gegebenen Sichtungen
 */
export function downloadCsv(sightings: Sighting[], filename = 'sichtungen-export.csv'): void {
	const csvContent = generateCsvData(sightings);
	const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

// Hilfsfunktionen zur Umwandlung von IDs in lesbare Texte
// Diese sollten mit den tatsächlichen Werten aus den Konstanten-Dateien ersetzt werden

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

function getDistributionText(distributionId: number): string {
	const distributionMap: Record<number, string> = {
		0: 'Einzeltier',
		1: 'Mutter-Kalb-Paar',
		2: 'Gruppe, eng beieinander',
		3: 'Gruppe, verstreut',
		4: 'Gemischte Gruppe'
	};

	return distributionMap[distributionId] || 'Unbekannt';
}

function getDistanceText(distanceId: number): string {
	const distanceMap: Record<number, string> = {
		0: '0-50m',
		1: '50-100m',
		2: '100-500m',
		3: '500-1000m',
		4: '>1000m'
	};

	return distanceMap[distanceId] || 'Unbekannt';
}

function getSightingFromText(sightingFromId: number): string {
	const sightingFromMap: Record<number, string> = {
		0: 'Schiff/Boot',
		1: 'Land',
		2: 'Luft',
		3: 'Sonstiges'
	};

	return sightingFromMap[sightingFromId] || 'Unbekannt';
}

function getSeaStateText(seaStateId: number): string {
	const seaStateMap: Record<number, string> = {
		0: '0 - spiegelglatt',
		1: '1 - gekräuselt',
		2: '2 - leicht bewegt',
		3: '3 - schwach bewegt',
		4: '4 - mäßig bewegt',
		5: '5 - grob',
		6: '6 - sehr grob',
		7: '7 - hoch',
		8: '8 - sehr hoch',
		9: '9 - außerordentlich hoch'
	};

	return seaStateMap[seaStateId] || 'Unbekannt';
}

function getVisibilityText(visibilityId?: number): string {
	if (visibilityId === undefined) return '';

	const visibilityMap: Record<number, string> = {
		0: 'sehr gut',
		1: 'gut',
		2: 'mäßig',
		3: 'schlecht'
	};

	return visibilityMap[visibilityId] || 'Unbekannt';
}

function getBoatDriveText(boatDriveId: number): string {
	const boatDriveMap: Record<number, string> = {
		0: 'Motor',
		1: 'Segel',
		2: 'Paddel/Ruder',
		3: 'Sonstiges'
	};

	return boatDriveMap[boatDriveId] || 'Unbekannt';
}

function getBehaviorText(behaviorId?: number): string {
	if (behaviorId === undefined) return '';

	const behaviorMap: Record<number, string> = {
		0: 'Schwimmen',
		1: 'Jagen',
		2: 'Ruhen',
		3: 'Springen',
		4: 'Fischen',
		5: 'Sonstiges'
	};

	return behaviorMap[behaviorId] || 'Unbekannt';
}
