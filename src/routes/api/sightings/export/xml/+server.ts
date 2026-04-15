import { createLogger } from '$lib/logger.server';
import { getDistanceLabel } from '$lib/report/formOptions/distance';
import { getDistributionLabel } from '$lib/report/formOptions/distribution';
import { getSpeciesLabel } from '$lib/report/formOptions/species';
import { requireUserRole } from '$lib/server/auth/auth';
import { logAuditEvent } from '$lib/server/audit/auditService';
import { db } from '$lib/server/db';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { text } from '@sveltejs/kit';
import { and } from 'drizzle-orm';
import { buildExportConditions, parseExportFilterParams, xmlEscape } from '../exportFilterParams';
import type { RequestHandler } from './$types';

const logger = createLogger('api:sightings:export:xml');

export const GET: RequestHandler = async ({ url, locals }) => {
	// Authorization check
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	const filterResult = parseExportFilterParams(url);
	if ('error' in filterResult) {
		return text(
			`<?xml version="1.0" encoding="UTF-8"?><error>${xmlEscape(filterResult.error.message)}</error>`,
			{ status: 400, headers: { 'Content-Type': 'application/xml' } }
		);
	}
	const { fromDate, toDate, verified, entryChannel, mediaUpload } = filterResult.params;

	try {
		// Erstellen der Abfrage-Bedingungen
		const conditions = buildExportConditions(filterResult.params);

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
			<sichtungsdatum>${xmlEscape(sighting.sightingDate.toISOString())}</sichtungsdatum>
			<meldedatum>${xmlEscape(sighting.created.toISOString())}</meldedatum>
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

		// Audit-Log schreiben
		await logAuditEvent({
			action: 'export.download',
			resourceType: 'export',
			...(locals.user?.email ? { userEmail: locals.user.email } : {}),
			details: {
				format: 'xml',
				fromDate: fromDate || null,
				toDate: toDate || null
			}
		});

		// XML-Datei zurückgeben
		return text(xmlContent, {
			headers: {
				'Content-Type': 'application/xml;charset=utf-8',
				'Content-Disposition': 'attachment; filename="sichtungen-export.xml"'
			}
		});
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : error },
			'Fehler beim XML-Export'
		);

		return text(`<?xml version="1.0" encoding="UTF-8"?><error>Fehler beim XML-Export</error>`, {
			status: 500,
			headers: {
				'Content-Type': 'application/xml'
			}
		});
	}
};
