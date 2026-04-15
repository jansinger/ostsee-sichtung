/**
 * @fileoverview Tests für die Validierungen von "Sonstiges"-Textfeldern im sightingSchema
 *
 * sightingFromText: required wenn sightingFrom === 0 (OTHER)
 *
 * distributionText, behaviorText, boatDriveText: generell optional (auch bei OTHER),
 * akzeptieren null und leeren String — Altdaten aus der DB können NULL enthalten.
 */

import { describe, it, expect } from 'vitest';
import { sightingSchema } from './sightingSchema';
import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
import { DistributionEnum } from '$lib/report/formOptions/distribution';
import { AnimalBehaviorEnum } from '$lib/report/formOptions/animalBehavior';
import { BoatDriveEnum } from '$lib/report/formOptions/boatDrive';

// Kein Mock nötig — sightingSchema importiert weder $lib/logger noch $lib/report/formConfig

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
		it('ist optional wenn distribution die Zahl 0 (OTHER) ist und Text leer (Altdaten)', async () => {
			const hatFehler = await fieldHasError('distributionText', {
				distribution: DistributionEnum.OTHER, // 0 als Zahl
				distributionText: ''
			});
			expect(hatFehler).toBe(false);
		});

		it('ist optional wenn distribution der String "0" (OTHER aus HTML-Select) ist und Text leer', async () => {
			const hatFehler = await fieldHasError('distributionText', {
				distribution: '0', // "0" als String (HTML <select>-Verhalten)
				distributionText: ''
			});
			expect(hatFehler).toBe(false);
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

		it('akzeptiert null (Legacy-DB-Wert)', async () => {
			const hatFehler = await fieldHasError('distributionText', {
				distribution: DistributionEnum.OTHER,
				distributionText: null
			});
			expect(hatFehler).toBe(false);
		});
	});

	// ── behaviorText ───────────────────────────────────────────────────────────

	describe('behaviorText', () => {
		it('ist optional wenn behavior die Zahl 0 (OTHER) ist und Text leer (Altdaten)', async () => {
			const hatFehler = await fieldHasError('behaviorText', {
				behavior: AnimalBehaviorEnum.OTHER, // 0 als Zahl
				behaviorText: ''
			});
			expect(hatFehler).toBe(false);
		});

		it('ist optional wenn behavior der String "0" (OTHER aus HTML-Select) ist und Text leer', async () => {
			const hatFehler = await fieldHasError('behaviorText', {
				behavior: '0', // "0" als String (HTML <select>-Verhalten)
				behaviorText: ''
			});
			expect(hatFehler).toBe(false);
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

		it('akzeptiert null (Legacy-DB-Wert)', async () => {
			const hatFehler = await fieldHasError('behaviorText', {
				behavior: AnimalBehaviorEnum.OTHER,
				behaviorText: null
			});
			expect(hatFehler).toBe(false);
		});
	});

	// ── boatDriveText ──────────────────────────────────────────────────────────

	describe('boatDriveText', () => {
		it('ist optional wenn boatDrive die Zahl 0 (OTHER) ist und Text leer (Altdaten)', async () => {
			const hatFehler = await fieldHasError('boatDriveText', {
				boatDrive: BoatDriveEnum.OTHER, // 0 als Zahl
				boatDriveText: ''
			});
			expect(hatFehler).toBe(false);
		});

		it('ist optional wenn boatDrive der String "0" (OTHER aus HTML-Select) ist und Text leer', async () => {
			const hatFehler = await fieldHasError('boatDriveText', {
				boatDrive: '0', // "0" als String (HTML <select>-Verhalten)
				boatDriveText: ''
			});
			expect(hatFehler).toBe(false);
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

		it('akzeptiert null (Legacy-DB-Wert)', async () => {
			const hatFehler = await fieldHasError('boatDriveText', {
				boatDrive: BoatDriveEnum.OTHER,
				boatDriveText: null
			});
			expect(hatFehler).toBe(false);
		});
	});
});
