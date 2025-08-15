import { getDistanceLabel } from '$lib/report/formOptions/distance';
import { getDistributionLabel } from '$lib/report/formOptions/distribution';
import { getSpeciesLabel } from '$lib/report/formOptions/species';
import { requireUserRole } from '$lib/server/auth/auth';
import { db } from '$lib/server/db';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { text } from '@sveltejs/kit';
import { and, between, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Authorization check
	requireUserRole(url, locals.user, ['admin']);

	// Filter-Parameter aus der URL extrahieren
	const fromDate = url.searchParams.get('dateFrom') || '';
	const toDate = url.searchParams.get('dateTo') || '';
	const verified = url.searchParams.get('verified');
	const entryChannel = url.searchParams.get('entryChannel');
	const mediaUpload = url.searchParams.get('mediaUpload');

	try {
		// Erstellen der Abfrage-Bedingungen
		const conditions = [];

		// Datumsbereich hinzufügen, wenn vorhanden
		if (fromDate && toDate) {
			conditions.push(between(sightingsTable.sightingDate, fromDate, toDate));
		}

		// Verifizierungsstatus hinzufügen, wenn erforderlich
		if (verified === '1') {
			conditions.push(eq(sightingsTable.verified, 1));
		} else if (verified === '0') {
			conditions.push(eq(sightingsTable.verified, 0));
		}

		// Eingangskanal-Filter
		if (entryChannel && entryChannel !== 'all') {
			conditions.push(eq(sightingsTable.entryChannel, parseInt(entryChannel)));
		}

		// Aufnahme-Filter
		if (mediaUpload === '1') {
			conditions.push(eq(sightingsTable.mediaUpload, 1));
		} else if (mediaUpload === '0') {
			conditions.push(eq(sightingsTable.mediaUpload, 0));
		}

		// Sichtungen aus der Datenbank abrufen
		const sightings = await db
			.select()
			.from(sightingsTable)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(sightingsTable.sightingDate);

		// CSV-Header
		const headers = [
			'Referenz-ID',
			'Sichtungsdatum',
			'Meldedatum',
			'Email',
			'Name',
			'Telefon',
			'Tierart',
			'Anzahl Total',
			'Anzahl Jungtiere',
			'Entfernung',
			'Verteilung',
			'Längengrad',
			'Breitengrad',
			'Ort',
			'Position Unsicher',
			'Totfund',
			'Kommentar',
			'Seegang',
			'Wind',
			'Sicht',
			'Aufnahme',
			'Ostsee',
			'Verifiziert',
			'Eingangskanal'
		];

		// CSV-Zeilen erstellen
		const csvRows = sightings.map((sighting) => [
			sighting.referenceId || '',
			sighting.sightingDate || '',
			sighting.created || '',
			sighting.email || '',
			sighting.lastName || '',
			sighting.phone || '',
			getSpeciesLabel(sighting.species || 0),
			sighting.totalCount || '',
			sighting.juvenileCount || '',
			getDistanceLabel(sighting.distance || 0),
			getDistributionLabel(sighting.distribution || 0),
			sighting.longitude || '',
			sighting.latitude || '',
			sighting.city || '', // Using city instead of location
			'', // positionUncertain doesn't exist in schema
			sighting.isDead ? 'Ja' : 'Nein',
			(sighting.notes || '').replace(/"/g, '""'), // Using notes instead of comment
			sighting.seaState || '',
			sighting.windForce || '',
			sighting.visibility || '',
			sighting.mediaUpload ? 'Ja' : 'Nein',
			sighting.inBalticSeaGeo ? 'Ja' : 'Nein',
			sighting.verified ? 'Ja' : 'Nein',
			sighting.entryChannel || ''
		]);

		// CSV-String erstellen
		const csvContent = [
			headers.map((header) => `"${header}"`).join(','),
			...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(','))
		].join('\n');

		// CSV-Datei zurückgeben
		return text(csvContent, {
			headers: {
				'Content-Type': 'text/csv;charset=utf-8',
				'Content-Disposition': 'attachment; filename="sichtungen-export.csv"'
			}
		});
	} catch (error) {
		console.error('Fehler beim CSV-Export:', error);

		return text('Fehler beim CSV-Export', {
			status: 500,
			headers: {
				'Content-Type': 'text/plain'
			}
		});
	}
};
