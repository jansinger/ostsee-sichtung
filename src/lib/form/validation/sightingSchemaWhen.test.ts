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
import { AnimalConditionEnum } from '$lib/report/formOptions/animalCondition';

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

describe('sightingSchema - Sonstiges-Textfeld-Validierung', () => {
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

	// ── deadSex — Analyse-Punkt C4 ────────────────────────────────────────────
	//
	// Das Deutsche Meeresmuseum hat das Geschlecht beim Totfund am 2026-08-04
	// aus dem Meldeformular abbestellt (PR 2, Teil b, siehe
	// docs/MEERESMUSEUM_FORMULAR_PLAN_2026-08-04.md). Der technische Blocker:
	// `deadSex` ist heute über `.when('isDead', { is: true, then: required })`
	// Pflichtfeld, sobald `isDead` gesetzt ist. Würde nur das Markup entfernt
	// (`<FormField name="deadSex" />` hinter `{#if adminMode}`), wäre danach
	// KEINE Totfund-Meldung mehr absendbar — das Feld existiert im DOM des
	// Meldeformulars nicht mehr, die Validierung verlangt es aber weiterhin.
	//
	// Dieser Test ist deshalb VOR der Schema-Änderung absichtlich ROT: Ein
	// sonst gültiger Datensatz mit `isDead: true` und ohne `deadSex` muss die
	// Validierung bestehen. Grün wird er erst, wenn der `.when('isDead', …)`
	// Block bei `deadSex` in sightingSchema.ts ersatzlos entfernt ist (Feld
	// bleibt optional, `.test('is-valid-dead-sex')`, Label und `meta` bleiben
	// unverändert — die Admin-Maske rendert daraus weiter).
	describe('deadSex — entfällt als Pflichtfeld bei Totfund (C4, 2026-08-04)', () => {
		const validesteBasis = {
			referenceId: 'test-ref-dead-sex',
			firstName: 'Jane',
			lastName: 'Doe',
			email: 'jane@example.com',
			privacyConsent: true,
			species: 0,
			totalCount: 1,
			distance: 1,
			sightingFrom: SightingFromEnum.SAILBOAT,
			boatDrive: BoatDriveEnum.MOTOR,
			entryChannel: 0,
			hasPosition: true,
			latitude: 54.5,
			longitude: 13.5,
			sightingDate: new Date().toISOString().split('T')[0]
		};

		async function validatesFully(formData: Record<string, unknown>): Promise<boolean> {
			try {
				await sightingSchema.validate(formData, { abortEarly: false });
				return true;
			} catch {
				return false;
			}
		}

		it('validiert einen sonst gültigen Totfund OHNE deadSex erfolgreich (der Blocker)', async () => {
			const totfundOhneGeschlecht = {
				...validesteBasis,
				isDead: true,
				deadCondition: AnimalConditionEnum.FRESH_BEGINNING_DECOMPOSITION
				// deadSex bewusst NICHT gesetzt — genau der Fall, den das
				// entfernte Markup danach erzeugt.
			};

			expect(await validatesFully(totfundOhneGeschlecht)).toBe(true);
		});

		it('validiert deadSex jetzt einzeln (validateAt) ohne Fehler — Schema-Änderung gelandet', async () => {
			// Vor der Schema-Änderung warf dieselbe Zeile mit /Geschlecht/ (siehe
			// Git-Historie dieser Datei) — genau das war der Blocker, den der Test
			// oben in dieser describe-Gruppe reproduziert. Nach dem Entfernen des
			// `.when('isDead', …)`-Blocks bei `deadSex` validiert das Feld einzeln
			// erfolgreich, wie hier festgehalten.
			await expect(sightingSchema.validateAt('deadSex', { isDead: true })).resolves.not.toThrow();
		});

		it('deadCondition bleibt bei isDead=true weiterhin Pflichtfeld', async () => {
			// Gegenprobe zum Blocker-Test: Die Schema-Änderung darf ausschließlich
			// `deadSex` betreffen. Würde `deadCondition` versehentlich mit
			// entschärft, wiche die Änderung weiter auf als vom Museum verlangt.
			const totfundOhneZustand = {
				...validesteBasis,
				isDead: true,
				deadSex: 1
				// deadCondition bewusst NICHT gesetzt
			};

			expect(await validatesFully(totfundOhneZustand)).toBe(false);
		});

		it('deadCondition-Fehler bleibt am eigenen Feld bestehen (validateAt)', async () => {
			await expect(sightingSchema.validateAt('deadCondition', { isDead: true })).rejects.toThrow(
				/Zustand/
			);
		});
	});
});
