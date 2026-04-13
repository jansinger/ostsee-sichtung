/**
 * @fileoverview Tests für die bedingten `.when()`-Validierungen im sightingSchema
 *
 * Vier Felder werden getestet, die required werden wenn ihr Elternfeld den
 * OTHER-Wert (0) hat:
 *   - sightingFromText  (wenn sightingFrom  === 0)
 *   - distributionText  (wenn distribution  === 0)
 *   - behaviorText      (wenn behavior      === 0)
 *   - boatDriveText     (wenn boatDrive     === 0)
 *
 * Besonderes Augenmerk liegt auf dem HTML-<select>-Fall, bei dem der Browser
 * immer Strings zurückgibt (z.B. "0" statt 0).
 */

import { describe, it, expect, vi } from 'vitest';
import { sightingSchema } from './sightingSchema';
import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
import { DistributionEnum } from '$lib/report/formOptions/distribution';
import { AnimalBehaviorEnum } from '$lib/report/formOptions/animalBehavior';
import { BoatDriveEnum } from '$lib/report/formOptions/boatDrive';

// Logger-Mock um Test-Output sauber zu halten
vi.mock('$lib/logger', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

// formConfig-Mock um Abhängigkeit von Laufzeit-Konfiguration zu entkoppeln
vi.mock('$lib/report/formConfig', () => ({
	formStepsConfig: [
		{
			id: 'location-time',
			title: 'Position & Zeit',
			fields: ['hasPosition', 'latitude', 'longitude', 'sightingDate']
		},
		{
			id: 'sighting-details',
			title: 'Sichtungsdetails',
			fields: ['species', 'totalCount', 'distance']
		},
		{
			id: 'observations',
			title: 'Beobachtungen',
			fields: ['behavior'],
			isOptional: true
		},
		{
			id: 'contact',
			title: 'Kontaktdaten',
			fields: ['firstName', 'lastName', 'email', 'privacyConsent']
		}
	]
}));

// ── Hilfsfunktion ─────────────────────────────────────────────────────────────

/**
 * Validiert ein einzelnes Feld im Schema und gibt an ob ein Fehler auftrat.
 * Gibt true zurück wenn die Validierung wirft (Fehler), false wenn sie besteht.
 */
async function fieldHasError(
	fieldName: string,
	formData: Record<string, unknown>
): Promise<boolean> {
	try {
		await sightingSchema.validateAt(fieldName, formData, { abortEarly: true });
		return false;
	} catch {
		return true;
	}
}

// ── sightingFromText ──────────────────────────────────────────────────────────

describe('sightingSchema - bedingte when()-Validierung', () => {
	describe('sightingFromText', () => {
		it('ist required wenn sightingFrom die Zahl 0 (OTHER) ist und Text leer', async () => {
			const hatFehler = await fieldHasError('sightingFromText', {
				sightingFrom: SightingFromEnum.OTHER, // 0 als Zahl
				sightingFromText: ''
			});
			expect(hatFehler).toBe(true);
		});

		it('ist required wenn sightingFrom der String "0" (OTHER aus HTML-Select) ist und Text leer', async () => {
			const hatFehler = await fieldHasError('sightingFromText', {
				sightingFrom: '0', // "0" als String (HTML <select>-Verhalten)
				sightingFromText: ''
			});
			expect(hatFehler).toBe(true);
		});

		it('ist NOT required wenn sightingFrom ein anderer Wert ist (z.B. 1 = Segelschiff)', async () => {
			const hatFehler = await fieldHasError('sightingFromText', {
				sightingFrom: SightingFromEnum.SAILBOAT, // 1
				sightingFromText: ''
			});
			expect(hatFehler).toBe(false);
		});

		it('ist valid wenn sightingFrom OTHER ist und Text einen Wert hat', async () => {
			const hatFehler = await fieldHasError('sightingFromText', {
				sightingFrom: SightingFromEnum.OTHER, // 0
				sightingFromText: 'Von der Hafenmole aus'
			});
			expect(hatFehler).toBe(false);
		});

		it('ist valid wenn sightingFrom OTHER als String ist und Text einen Wert hat', async () => {
			const hatFehler = await fieldHasError('sightingFromText', {
				sightingFrom: '0',
				sightingFromText: 'Von der Hafenmole aus'
			});
			expect(hatFehler).toBe(false);
		});
	});

	// ── distributionText ───────────────────────────────────────────────────────

	describe('distributionText', () => {
		it('ist required wenn distribution die Zahl 0 (OTHER) ist und Text leer', async () => {
			const hatFehler = await fieldHasError('distributionText', {
				distribution: DistributionEnum.OTHER, // 0 als Zahl
				distributionText: ''
			});
			expect(hatFehler).toBe(true);
		});

		it('ist required wenn distribution der String "0" (OTHER aus HTML-Select) ist und Text leer', async () => {
			const hatFehler = await fieldHasError('distributionText', {
				distribution: '0', // "0" als String (HTML <select>-Verhalten)
				distributionText: ''
			});
			expect(hatFehler).toBe(true);
		});

		it('ist NOT required wenn distribution ein anderer Wert ist (z.B. 1 = Einzeln)', async () => {
			const hatFehler = await fieldHasError('distributionText', {
				distribution: DistributionEnum.SINGLE, // 1
				distributionText: ''
			});
			expect(hatFehler).toBe(false);
		});

		it('ist valid wenn distribution OTHER ist und Text einen Wert hat', async () => {
			const hatFehler = await fieldHasError('distributionText', {
				distribution: DistributionEnum.OTHER, // 0
				distributionText: 'V-Formation entlang der Küste'
			});
			expect(hatFehler).toBe(false);
		});

		it('ist valid wenn distribution OTHER als String ist und Text einen Wert hat', async () => {
			const hatFehler = await fieldHasError('distributionText', {
				distribution: '0',
				distributionText: 'V-Formation entlang der Küste'
			});
			expect(hatFehler).toBe(false);
		});
	});

	// ── behaviorText ───────────────────────────────────────────────────────────

	describe('behaviorText', () => {
		it('ist required wenn behavior die Zahl 0 (OTHER) ist und Text leer', async () => {
			const hatFehler = await fieldHasError('behaviorText', {
				behavior: AnimalBehaviorEnum.OTHER, // 0 als Zahl
				behaviorText: ''
			});
			expect(hatFehler).toBe(true);
		});

		it('ist required wenn behavior der String "0" (OTHER aus HTML-Select) ist und Text leer', async () => {
			const hatFehler = await fieldHasError('behaviorText', {
				behavior: '0', // "0" als String (HTML <select>-Verhalten)
				behaviorText: ''
			});
			expect(hatFehler).toBe(true);
		});

		it('ist NOT required wenn behavior ein anderer Wert ist (z.B. 1 = Konstanter Kurs)', async () => {
			const hatFehler = await fieldHasError('behaviorText', {
				behavior: AnimalBehaviorEnum.CONSTANT_COURSE, // 1
				behaviorText: ''
			});
			expect(hatFehler).toBe(false);
		});

		it('ist valid wenn behavior OTHER ist und Text einen Wert hat', async () => {
			const hatFehler = await fieldHasError('behaviorText', {
				behavior: AnimalBehaviorEnum.OTHER, // 0
				behaviorText: 'Spielverhalten mit einem anderen Tier'
			});
			expect(hatFehler).toBe(false);
		});

		it('ist valid wenn behavior OTHER als String ist und Text einen Wert hat', async () => {
			const hatFehler = await fieldHasError('behaviorText', {
				behavior: '0',
				behaviorText: 'Spielverhalten mit einem anderen Tier'
			});
			expect(hatFehler).toBe(false);
		});
	});

	// ── boatDriveText ──────────────────────────────────────────────────────────

	describe('boatDriveText', () => {
		it('ist required wenn boatDrive die Zahl 0 (OTHER) ist und Text leer', async () => {
			const hatFehler = await fieldHasError('boatDriveText', {
				boatDrive: BoatDriveEnum.OTHER, // 0 als Zahl
				boatDriveText: ''
			});
			expect(hatFehler).toBe(true);
		});

		it('ist required wenn boatDrive der String "0" (OTHER aus HTML-Select) ist und Text leer', async () => {
			const hatFehler = await fieldHasError('boatDriveText', {
				boatDrive: '0', // "0" als String (HTML <select>-Verhalten)
				boatDriveText: ''
			});
			expect(hatFehler).toBe(true);
		});

		it('ist NOT required wenn boatDrive ein anderer Wert ist (z.B. 1 = Motor)', async () => {
			const hatFehler = await fieldHasError('boatDriveText', {
				boatDrive: BoatDriveEnum.MOTOR, // 1
				boatDriveText: ''
			});
			expect(hatFehler).toBe(false);
		});

		it('ist valid wenn boatDrive OTHER ist und Text einen Wert hat', async () => {
			const hatFehler = await fieldHasError('boatDriveText', {
				boatDrive: BoatDriveEnum.OTHER, // 0
				boatDriveText: 'Hybridantrieb Solar-Elektrisch'
			});
			expect(hatFehler).toBe(false);
		});

		it('ist valid wenn boatDrive OTHER als String ist und Text einen Wert hat', async () => {
			const hatFehler = await fieldHasError('boatDriveText', {
				boatDrive: '0',
				boatDriveText: 'Hybridantrieb Solar-Elektrisch'
			});
			expect(hatFehler).toBe(false);
		});
	});
});
