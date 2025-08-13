import type { Sighting } from '$lib/types/types';
import { getSpeciesLabel } from '$lib/report/formOptions/species';
import { getAnimalBehaviorLabel } from '$lib/report/formOptions/animalBehavior';
import { getSeaStateLabel } from '$lib/report/formOptions/seaState';
import { getDistributionLabel } from '$lib/report/formOptions/distribution';
import { getDistanceLabel } from '$lib/report/formOptions/distance';
import { getSightingFromLabel } from '$lib/report/formOptions/sightingFrom';
import { getVisibilityLabel } from '$lib/report/formOptions/visibility';
import { getBoatDriveLabel } from '$lib/report/formOptions/boatDrive';

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

		// Labels aus den Form-Options abrufen
		const speciesName = getSpeciesLabel(sighting.species);
		const behaviorText = getAnimalBehaviorLabel(sighting.behavior);

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
			getDistributionLabel(sighting.distribution),
			sighting.latitude,
			sighting.longitude,
			behaviorText,
			sighting.reaction || '',
			getDistanceLabel(sighting.distance),
			getSightingFromLabel(sighting.sightingFrom),
			sighting.isDead ? 'Ja' : 'Nein',
			sighting.deadCondition || '',
			sighting.deadSex || '',
			sighting.deadSize || '',
			sighting.waterway || '',
			sighting.seaMark || '',
			getSeaStateLabel(sighting.seaState),
			getVisibilityLabel(sighting.visibility),
			sighting.windDirection || '',
			sighting.windForce || '',
			sighting.shipNameConsent ? sighting.shipName || '' : '',
			sighting.homePort || '',
			sighting.boatType || '',
			getBoatDriveLabel(sighting.boatDrive),
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

