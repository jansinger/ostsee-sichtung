/**
 * @fileoverview Legacy REST API endpoint for response options
 * 
 * GET /api/legacy/rest_sichtungen/antworten.json
 * 
 * Returns all dropdown options in legacy API format for mobile app compatibility.
 * Maps current form options to legacy field names and value formats.
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
import type { LegacyResponseOptions } from '../../field-mapping/types.js';

const logger = createLogger('api:legacy:antworten');

/**
 * GET handler for retrieving response options in legacy format
 * 
 * Returns all dropdown options with legacy field names and value mappings
 * to ensure compatibility with the mobile app.
 * 
 * @param event - SvelteKit request event
 * @returns JSON response with all form options
 */
export async function GET(event: RequestEvent): Promise<Response> {
	const clientIp = event.getClientAddress();
	
	logger.debug({ ip: clientIp }, 'Legacy response options requested');

	try {
		// Build response options in legacy format
		const responseOptions: LegacyResponseOptions = {
			// Species mapping (tierart)
			tierart: Object.entries(SpeciesEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.map(([_key, value]) => ({
					value: value as number,
					label: speciesLabels[value as SpeciesEnum]
				}))
				.sort((a, b) => a.value - b.value),

			// Observation location mapping (vonwo)
			vonwo: Object.entries(SightingFromEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.map(([_key, value]) => ({
					value: value as number,
					label: sightingFromLabels[value as SightingFromEnum]
				}))
				.sort((a, b) => a.value - b.value),

			// Distance mapping (entfernung)
			entfernung: Object.entries(DistanceEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.map(([_key, value]) => ({
					value: value as number,
					label: distanceLabels[value as DistanceEnum]
				}))
				.sort((a, b) => a.value - b.value),

			// Distribution mapping (verteilung)
			verteilung: Object.entries(DistributionEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.map(([_key, value]) => ({
					value: value as number,
					label: distributionLabels[value as DistributionEnum]
				}))
				.sort((a, b) => a.value - b.value),

			// Animal behavior mapping (verhalten)
			verhalten: Object.entries(AnimalBehaviorEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.map(([_key, value]) => ({
					value: value as number,
					label: animalBehaviorLabels[value as AnimalBehaviorEnum]
				}))
				.sort((a, b) => a.value - b.value),

			// Sea state mapping (seegang)
			seegang: Object.entries(SeaStateEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.map(([_key, value]) => ({
					value: value as number,
					label: seaStateLabels[value as SeaStateEnum]
				}))
				.sort((a, b) => a.value - b.value),

			// Wind direction mapping (windrichtung)
			windrichtung: Object.entries(WindDirectionEnum)
				.filter(([_key, value]) => typeof value === 'string')
				.map(([_key, value]) => ({
					value: value as string,
					label: windDirectionLabels[value as WindDirectionEnum]
				}))
				.sort((a, b) => a.label.localeCompare(b.label)),

			// Wind strength mapping (windstaerke)
			windstaerke: Object.entries(WindStrengthEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.map(([_key, value]) => ({
					value: String(value),
					label: windStrengthLabels[value as WindStrengthEnum]
				}))
				.sort((a, b) => {
					// Sort numerically by value
					const aNum = parseInt(a.value);
					const bNum = parseInt(b.value);
					return aNum - bNum;
				}),

			// Visibility mapping (sichtweite)
			sichtweite: Object.entries(VisibilityEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.map(([_key, value]) => ({
					value: value as number,
					label: visibilityLabels[value as VisibilityEnum]
				}))
				.sort((a, b) => a.value - b.value),

			// Boat drive mapping (bootsantrieb)
			bootsantrieb: Object.entries(BoatDriveEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.map(([_key, value]) => ({
					value: value as number,
					label: boatDriveLabels[value as BoatDriveEnum]
				}))
				.sort((a, b) => a.value - b.value),

			// Entry channel mapping (eingangskanal)
			eingangskanal: Object.entries(EntryChannelEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.map(([_key, value]) => ({
					value: value as number,
					label: entryChannelLabels[value as EntryChannelEnum]
				}))
				.sort((a, b) => a.value - b.value),

			// Dead animal condition mapping (totfund_zustand)
			totfund_zustand: Object.entries(AnimalConditionEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.map(([_key, value]) => ({
					value: value as number,
					label: animalConditionLabels[value as AnimalConditionEnum]
				}))
				.sort((a, b) => a.value - b.value),

			// Dead animal sex mapping (totfund_geschlecht)
			totfund_geschlecht: Object.entries(SexEnum)
				.filter(([_key, value]) => typeof value === 'number')
				.map(([_key, value]) => ({
					value: value as number,
					label: sexLabels[value as SexEnum]
				}))
				.sort((a, b) => a.value - b.value)
		};

		logger.info({ 
			optionCounts: {
				tierart: responseOptions.tierart.length,
				vonwo: responseOptions.vonwo.length,
				entfernung: responseOptions.entfernung.length,
				verteilung: responseOptions.verteilung.length,
				verhalten: responseOptions.verhalten.length,
				seegang: responseOptions.seegang.length,
				windrichtung: responseOptions.windrichtung.length,
				windstaerke: responseOptions.windstaerke.length,
				sichtweite: responseOptions.sichtweite.length,
				bootsantrieb: responseOptions.bootsantrieb.length,
				eingangskanal: responseOptions.eingangskanal.length,
				totfund_zustand: responseOptions.totfund_zustand.length,
				totfund_geschlecht: responseOptions.totfund_geschlecht.length
			},
			ip: clientIp 
		}, 'Legacy response options generated successfully');

		return json(responseOptions, {
			headers: {
				'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
				'Content-Type': 'application/json'
			}
		});

	} catch (error: unknown) {
		const isError = error instanceof Error;
		logger.error({ 
			error: isError ? error.message : 'Unknown error',
			stack: isError ? error.stack : undefined,
			ip: clientIp 
		}, 'Failed to generate legacy response options');

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