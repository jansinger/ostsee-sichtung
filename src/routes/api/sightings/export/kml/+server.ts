import { createLogger } from '$lib/logger.server';
import { getSpeciesLabel } from '$lib/report/formOptions/species';
import { requireUserRole } from '$lib/server/auth/auth';
import { logAuditEvent } from '$lib/server/audit/auditService';
import { db } from '$lib/server/db';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { text } from '@sveltejs/kit';
import { and, between, eq, isNotNull } from 'drizzle-orm';
import { isValidDateParam } from '../../../../admin/dateParam';
import type { RequestHandler } from './$types';

const logger = createLogger('api:sightings:export:kml');

export const GET: RequestHandler = async ({ url, locals }) => {
	// Authorization check
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	// Filter-Parameter aus der URL extrahieren
	const fromDate = url.searchParams.get('fromDate') || '';
	const toDate = url.searchParams.get('toDate') || '';
	const verified = url.searchParams.get('verified');
	const entryChannel = url.searchParams.get('entryChannel');
	const mediaUpload = url.searchParams.get('mediaUpload');

	// Datum-Parameter einzeln validieren (nur wenn gesetzt)
	if (fromDate && !isValidDateParam(fromDate)) {
		return text(
			'<?xml version="1.0" encoding="UTF-8"?><error>Ungültiges fromDate-Format. Erwartet: YYYY-MM-DD</error>',
			{ status: 400, headers: { 'Content-Type': 'application/xml' } }
		);
	}
	if (toDate && !isValidDateParam(toDate)) {
		return text(
			'<?xml version="1.0" encoding="UTF-8"?><error>Ungültiges toDate-Format. Erwartet: YYYY-MM-DD</error>',
			{ status: 400, headers: { 'Content-Type': 'application/xml' } }
		);
	}

	try {
		// Erstellen der Abfrage-Bedingungen
		const conditions = [
			// Nur Sichtungen mit Koordinaten für KML
			isNotNull(sightingsTable.latitude),
			isNotNull(sightingsTable.longitude)
		];

		// Datumsbereich hinzufügen, wenn vorhanden
		if (isValidDateParam(fromDate) && isValidDateParam(toDate)) {
			conditions.push(between(sightingsTable.sightingDate, new Date(fromDate), new Date(toDate)));
		}

		// Verifizierungsstatus hinzufügen, wenn erforderlich
		if (verified === '1') {
			conditions.push(eq(sightingsTable.verified, 1));
		} else if (verified === '0') {
			conditions.push(eq(sightingsTable.verified, 0));
		}

		// Eingangskanal-Filter
		if (entryChannel && entryChannel !== 'all') {
			const channelId = parseInt(entryChannel, 10);
			if (!isNaN(channelId)) {
				conditions.push(eq(sightingsTable.entryChannel, channelId));
			}
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
			.where(and(...conditions))
			.orderBy(sightingsTable.sightingDate);

		// KML-Placemarks erstellen
		const placemarks = sightings
			.map((sighting) => {
				const species = getSpeciesLabel(sighting.species || 0);
				const description = `
				<![CDATA[
				<b>Tierart:</b> ${species}<br/>
				<b>Anzahl:</b> ${sighting.totalCount || 'Unbekannt'}<br/>
				<b>Sichtungsdatum:</b> ${sighting.sightingDate || 'Unbekannt'}<br/>
				<b>Ort:</b> ${sighting.city || 'Unbekannt'}<br/>
				${sighting.notes ? `<b>Kommentar:</b> ${sighting.notes}<br/>` : ''}
				<b>Referenz-ID:</b> ${sighting.referenceId || ''}<br/>
				<b>Verifiziert:</b> ${sighting.verified ? 'Ja' : 'Nein'}
				]]>
			`;

				return `
			<Placemark>
				<name>${species} - ${sighting.referenceId || sighting.id}</name>
				<description>${description}</description>
				<Point>
					<coordinates>${sighting.longitude},${sighting.latitude},0</coordinates>
				</Point>
				<ExtendedData>
					<Data name="species">
						<value>${species}</value>
					</Data>
					<Data name="totalCount">
						<value>${sighting.totalCount || ''}</value>
					</Data>
					<Data name="sightingDate">
						<value>${sighting.sightingDate || ''}</value>
					</Data>
					<Data name="verified">
						<value>${sighting.verified ? 'true' : 'false'}</value>
					</Data>
				</ExtendedData>
			</Placemark>`;
			})
			.join('');

		// Vollständige KML-Datei erstellen
		const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
	<Document>
		<name>Ostsee-Sichtungen Export</name>
		<description>Exportierte Meerestier-Sichtungen aus der Ostsee-Datenbank</description>
		<Style id="defaultStyle">
			<IconStyle>
				<Icon>
					<href>http://maps.google.com/mapfiles/kml/shapes/marine.png</href>
				</Icon>
			</IconStyle>
		</Style>
		${placemarks}
	</Document>
</kml>`;

		// Audit-Log schreiben
		await logAuditEvent({
			action: 'export.download',
			resourceType: 'export',
			...(locals.user?.email ? { userEmail: locals.user.email } : {}),
			details: {
				format: 'kml',
				fromDate: fromDate || null,
				toDate: toDate || null
			}
		});

		// KML-Datei zurückgeben
		return text(kmlContent, {
			headers: {
				'Content-Type': 'application/vnd.google-earth.kml+xml;charset=utf-8',
				'Content-Disposition': 'attachment; filename="sichtungen-export.kml"'
			}
		});
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : error },
			'Fehler beim KML-Export'
		);

		return text('<?xml version="1.0" encoding="UTF-8"?><error>Fehler beim KML-Export</error>', {
			status: 500,
			headers: {
				'Content-Type': 'application/xml'
			}
		});
	}
};
