import { getDistanceLabel } from '$lib/report/formOptions/distance';
import { getDistributionLabel } from '$lib/report/formOptions/distribution';
import { getSpeciesLabel } from '$lib/report/formOptions/species';
import { requireUserRole } from '$lib/server/auth/auth';
import { db } from '$lib/server/db';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { text } from '@sveltejs/kit';
import { and, between, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

function xmlEscape(str: string | null | undefined): string {
	if (!str) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

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

		// XML-Einträge für Sichtungen erstellen
		const sightingXml = sightings
			.map(
				(sighting) => `
		<sichtung>
			<referenzId>${xmlEscape(sighting.referenceId)}</referenzId>
			<sichtungsdatum>${xmlEscape(sighting.sightingDate)}</sichtungsdatum>
			<meldedatum>${xmlEscape(sighting.created)}</meldedatum>
			<kontakt>
				<email>${xmlEscape(sighting.email)}</email>
				<name>${xmlEscape(sighting.lastName)}</name>
				<telefon>${xmlEscape(sighting.phone)}</telefon>
			</kontakt>
			<tierart>${xmlEscape(getSpeciesLabel(sighting.species || 0))}</tierart>
			<anzahl>
				<total>${sighting.totalCount || 0}</total>
				<jungtiere>${sighting.juvenileCount || 0}</jungtiere>
			</anzahl>
			<entfernung>${xmlEscape(getDistanceLabel(sighting.distance || 0))}</entfernung>
			<verteilung>${xmlEscape(getDistributionLabel(sighting.distribution || 0))}</verteilung>
			<position>
				<laengengrad>${sighting.longitude || ''}</laengengrad>
				<breitengrad>${sighting.latitude || ''}</breitengrad>
				<ort>${xmlEscape(sighting.city)}</ort>
				<unsicher>false</unsicher>
			</position>
			<totfund>${sighting.isDead ? 'true' : 'false'}</totfund>
			<kommentar>${xmlEscape(sighting.notes)}</kommentar>
			<umweltbedingungen>
				<seegang>${sighting.seaState || ''}</seegang>
				<wind>${sighting.windForce || ''}</wind>
				<sicht>${sighting.visibility || ''}</sicht>
			</umweltbedingungen>
			<aufnahme>${sighting.mediaUpload ? 'true' : 'false'}</aufnahme>
			<ostsee>${sighting.inBalticSeaGeo ? 'true' : 'false'}</ostsee>
			<verifiziert>${sighting.verified ? 'true' : 'false'}</verifiziert>
			<eingangskanal>${sighting.entryChannel || ''}</eingangskanal>
		</sichtung>`
			)
			.join('');

		// Vollständige XML-Datei erstellen
		const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<ostsee-sichtungen>
	<metadaten>
		<exportDatum>${new Date().toISOString()}</exportDatum>
		<anzahlDatensaetze>${sightings.length}</anzahlDatensaetze>
		<filter>
			<datumVon>${xmlEscape(fromDate)}</datumVon>
			<datumBis>${xmlEscape(toDate)}</datumBis>
			<verifiziert>${xmlEscape(verified)}</verifiziert>
			<eingangskanal>${xmlEscape(entryChannel)}</eingangskanal>
			<aufnahme>${xmlEscape(mediaUpload)}</aufnahme>
		</filter>
	</metadaten>
	<sichtungen>${sightingXml}
	</sichtungen>
</ostsee-sichtungen>`;

		// XML-Datei zurückgeben
		return text(xmlContent, {
			headers: {
				'Content-Type': 'application/xml;charset=utf-8',
				'Content-Disposition': 'attachment; filename="sichtungen-export.xml"'
			}
		});
	} catch (error) {
		console.error('Fehler beim XML-Export:', error);

		return text(`<?xml version="1.0" encoding="UTF-8"?><error>Fehler beim XML-Export</error>`, {
			status: 500,
			headers: {
				'Content-Type': 'application/xml'
			}
		});
	}
};
