/**
 * @fileoverview Legacy REST API endpoint - PDF specification compliance
 * 
 * GET /rest_sichtungen/antworten.json
 * 
 * Returns dropdown options in EXACT legacy format from PDF specification.
 * This endpoint MUST maintain 100% compatibility with original schweinswalsichtung.de API.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { createLogger } from '$lib/logger';
import { AnimalBehaviorEnum, animalBehaviorLabels } from '$lib/report/formOptions/animalBehavior';
import { AnimalConditionEnum, animalConditionLabels } from '$lib/report/formOptions/animalCondition';
import { BoatDriveEnum, boatDriveLabels } from '$lib/report/formOptions/boatDrive';
import { DistanceEnum, distanceLabels } from '$lib/report/formOptions/distance';
import { DistributionEnum, distributionLabels } from '$lib/report/formOptions/distribution';
import { EntryChannelEnum, entryChannelLabels } from '$lib/report/formOptions/entryChannel';
import { SeaStateEnum, seaStateLabels } from '$lib/report/formOptions/seaState';
import { SexEnum, sexLabels } from '$lib/report/formOptions/sex';
import { SightingFromEnum, sightingFromLabels } from '$lib/report/formOptions/sightingFrom';
import { SpeciesEnum, speciesLabels } from '$lib/report/formOptions/species';
import { VisibilityEnum, visibilityLabels } from '$lib/report/formOptions/visibility';
import { WindDirectionEnum, windDirectionLabels } from '$lib/report/formOptions/windDirection';
import { WindStrengthEnum, windStrengthLabels } from '$lib/report/formOptions/windStrength';
import { json, type RequestEvent } from '@sveltejs/kit';

const logger = createLogger('api:legacy:antworten:pdf-compliant');

/**
 * GET handler for PDF-compliant response options
 * 
 * Returns options in the EXACT format specified in the PDF documentation.
 * Format: { "fieldname": { "value": "label" } } NOT array format!
 */
export async function GET(event: RequestEvent): Promise<Response> {
	const clientIp = event.getClientAddress();
	
	logger.debug({ ip: clientIp }, 'PDF-compliant legacy response options requested');

	try {
		// Build response options in EXACT PDF format (value-label object format)
		const responseOptions = {
			// Species mapping (tierart) - Note: PDF shows 0-10 range
			tierart: Object.entries(SpeciesEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.reduce((acc, [_key, value]) => {
					acc[value.toString()] = speciesLabels[value as SpeciesEnum];
					return acc;
				}, {} as Record<string, string>),

			// Observation location mapping (vonwo) - Note: PDF uses "vonwo" not "beobachtungsort"
			vonwo: Object.entries(SightingFromEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.reduce((acc, [_key, value]) => {
					acc[value.toString()] = sightingFromLabels[value as SightingFromEnum];
					return acc;
				}, {} as Record<string, string>),

			// Distance mapping (entfernung) - Note: PDF shows 1-5 range
			entfernung: Object.entries(DistanceEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.reduce((acc, [_key, value]) => {
					acc[value.toString()] = distanceLabels[value as DistanceEnum];
					return acc;
				}, {} as Record<string, string>),

			// Distribution mapping (verteilung) - Note: PDF shows 0-3 range
			verteilung: Object.entries(DistributionEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.reduce((acc, [_key, value]) => {
					acc[value.toString()] = distributionLabels[value as DistributionEnum];
					return acc;
				}, {} as Record<string, string>),

			// Animal behavior mapping (verhalten) - Note: PDF shows 0-3 range
			verhalten: Object.entries(AnimalBehaviorEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.reduce((acc, [_key, value]) => {
					acc[value.toString()] = animalBehaviorLabels[value as AnimalBehaviorEnum];
					return acc;
				}, {} as Record<string, string>),

			// Sea state mapping (seegang) - Note: PDF shows 0-5 range
			seegang: Object.entries(SeaStateEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.reduce((acc, [_key, value]) => {
					acc[value.toString()] = seaStateLabels[value as SeaStateEnum];
					return acc;
				}, {} as Record<string, string>),

			// Wind direction mapping (windrichtung) - Note: PDF specifies exact values including 'SO'
			windrichtung: (() => {
				const validDirections = ['', 'N', 'NW', 'W', 'SW', 'S', 'SO', 'O', 'NO'];
				const result: Record<string, string> = {};
				
				validDirections.forEach(dir => {
					if (Object.values(WindDirectionEnum).includes(dir as WindDirectionEnum)) {
						result[dir] = windDirectionLabels[dir as WindDirectionEnum];
					}
				});
				
				return result;
			})(),

			// Wind strength mapping (windstaerke) - Note: PDF shows 1-12 range as strings
			windstaerke: Object.entries(WindStrengthEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.reduce((acc, [_key, value]) => {
					acc[value.toString()] = windStrengthLabels[value as WindStrengthEnum];
					return acc;
				}, {} as Record<string, string>),

			// Visibility mapping (sichtweite) - Note: PDF shows 1-4 range
			sichtweite: Object.entries(VisibilityEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.reduce((acc, [_key, value]) => {
					acc[value.toString()] = visibilityLabels[value as VisibilityEnum];
					return acc;
				}, {} as Record<string, string>),

			// Boat drive mapping (bootsantrieb) - Note: PDF shows 0-4 range
			bootsantrieb: Object.entries(BoatDriveEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.reduce((acc, [_key, value]) => {
					acc[value.toString()] = boatDriveLabels[value as BoatDriveEnum];
					return acc;
				}, {} as Record<string, string>),

			// Entry channel mapping (eingangskanal) - Note: PDF shows 0-5 range
			eingangskanal: Object.entries(EntryChannelEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.reduce((acc, [_key, value]) => {
					acc[value.toString()] = entryChannelLabels[value as EntryChannelEnum];
					return acc;
				}, {} as Record<string, string>),

			// Dead animal condition mapping (totfund_zustand) - Note: PDF shows 0-5 range
			totfund_zustand: Object.entries(AnimalConditionEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.reduce((acc, [_key, value]) => {
					acc[value.toString()] = animalConditionLabels[value as AnimalConditionEnum];
					return acc;
				}, {} as Record<string, string>),

			// Dead animal sex mapping (totfund_geschlecht) - Note: PDF shows 0-2 range
			totfund_geschlecht: Object.entries(SexEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.reduce((acc, [_key, value]) => {
					acc[value.toString()] = sexLabels[value as SexEnum];
					return acc;
				}, {} as Record<string, string>)
		};

		logger.info({ 
			optionCounts: {
				tierart: Object.keys(responseOptions.tierart).length,
				vonwo: Object.keys(responseOptions.vonwo).length,
				entfernung: Object.keys(responseOptions.entfernung).length,
				verteilung: Object.keys(responseOptions.verteilung).length,
				verhalten: Object.keys(responseOptions.verhalten).length,
				seegang: Object.keys(responseOptions.seegang).length,
				windrichtung: Object.keys(responseOptions.windrichtung).length,
				windstaerke: Object.keys(responseOptions.windstaerke).length,
				sichtweite: Object.keys(responseOptions.sichtweite).length,
				bootsantrieb: Object.keys(responseOptions.bootsantrieb).length,
				eingangskanal: Object.keys(responseOptions.eingangskanal).length,
				totfund_zustand: Object.keys(responseOptions.totfund_zustand).length,
				totfund_geschlecht: Object.keys(responseOptions.totfund_geschlecht).length
			},
			ip: clientIp 
		}, 'PDF-compliant legacy response options generated successfully');

		return json(responseOptions, {
			headers: {
				'Cache-Control': 'public, max-age=3600', // Cache for 1 hour as per PDF
				'Content-Type': 'application/json'
			}
		});

	} catch (error: unknown) {
		const isError = error instanceof Error;
		logger.error({ 
			error: isError ? error.message : 'Unknown error',
			stack: isError ? error.stack : undefined,
			ip: clientIp 
		}, 'Failed to generate PDF-compliant legacy response options');

		const errorResponse = {
			error: 'InternalServerError',
			message: 'Failed to retrieve response options'
		};

		return json(errorResponse, { status: 500 });
	}
}

/**
 * Handle unsupported HTTP methods
 */
export async function POST() {
	return json({ 
		error: 'MethodNotAllowed',
		message: 'Only GET method is supported for this endpoint' 
	}, { status: 405 });
}

export async function PUT() {
	return json({ 
		error: 'MethodNotAllowed',
		message: 'Only GET method is supported for this endpoint' 
	}, { status: 405 });
}

export async function DELETE() {
	return json({ 
		error: 'MethodNotAllowed',
		message: 'Only GET method is supported for this endpoint' 
	}, { status: 405 });
}