/**
 * @fileoverview Tests für die entfernten Schema-Defaults (Datenqualitäts-Fix K1/K2)
 *
 * Hintergrund: Ein leeres Formular darf keine "gültige" Phantom-Position (54.5, 13.5)
 * und keine vorausgewählte Tierart mehr haben. hasPosition ist genau dann gültig,
 * wenn echte Koordinaten ODER eine Fahrwasser-Beschreibung vorliegen.
 */

import { describe, it, expect } from 'vitest';
import { sightingSchema } from './sightingSchema';

async function validates(formData: Record<string, unknown>): Promise<boolean> {
	try {
		await sightingSchema.validate(formData, { abortEarly: false });
		return true;
	} catch {
		return false;
	}
}

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

describe('sightingSchema — entfernte Defaults', () => {
	const description = sightingSchema.describe();
	const defaults = description.default as Record<string, unknown>;

	it('hat keinen numerischen Default für latitude', () => {
		expect(defaults.latitude).toBeUndefined();
	});

	it('hat keinen numerischen Default für longitude', () => {
		expect(defaults.longitude).toBeUndefined();
	});

	it('setzt hasPosition standardmäßig auf false', () => {
		expect(defaults.hasPosition).toBe(false);
	});

	it('hat keinen Default für species (Nutzer muss aktiv wählen)', () => {
		expect(defaults.species).toBeUndefined();
	});

	it('behält den Default für totalCount (=1)', () => {
		expect(defaults.totalCount).toBe(1);
	});

	it('behält einen Default für sightingDate (heute in Berlin)', () => {
		// Maßgeblich ist der Berliner Kalendertag, nicht der UTC-Tag — siehe
		// sightingSchemaDate.test.ts. Läuft der Test über Mitternacht, liegen
		// Default und Vergleichswert einen Tag auseinander; deshalb gilt
		// "heute oder gestern" als korrekt.
		const alsBerlinerTag = (d: Date) =>
			d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
		const heute = new Date();
		const gestern = new Date(heute.getTime() - 24 * 60 * 60 * 1000);

		expect([alsBerlinerTag(heute), alsBerlinerTag(gestern)]).toContain(defaults.sightingDate);
	});
});

describe('sightingSchema — Position/Fahrwasser-Gating', () => {
	it('waterway ist erforderlich, wenn keine GPS-Position vorliegt (hasPosition=false)', async () => {
		expect(await fieldHasError('waterway', { hasPosition: false, waterway: '' })).toBe(true);
	});

	it('waterway ist erforderlich, wenn hasPosition undefined ist', async () => {
		expect(await fieldHasError('waterway', { waterway: '' })).toBe(true);
	});

	it('waterway ist optional, wenn hasPosition=true', async () => {
		expect(await fieldHasError('waterway', { hasPosition: true, waterway: '' })).toBe(false);
	});

	it('latitude ist erforderlich, wenn hasPosition=true', async () => {
		expect(await fieldHasError('latitude', { hasPosition: true })).toBe(true);
	});
});

describe('sightingSchema — Vollformular-Validierung', () => {
	const baseContact = {
		referenceId: 'test-ref-123',
		firstName: 'Jane',
		lastName: 'Doe',
		email: 'jane@example.com',
		privacyConsent: true,
		species: 0,
		totalCount: 1,
		distance: 1,
		sightingFrom: 1,
		boatDrive: 1,
		entryChannel: 0,
		sightingDate: new Date().toISOString().split('T')[0]
	};

	it('ein leeres Formular ist ungültig (keine Phantom-Position)', async () => {
		expect(await validates({})).toBe(false);
	});

	it('gültig mit echten Koordinaten (hasPosition=true)', async () => {
		expect(
			await validates({
				...baseContact,
				hasPosition: true,
				latitude: 54.5,
				longitude: 13.5
			})
		).toBe(true);
	});

	it('gültig mit Fahrwasser-Beschreibung ohne Koordinaten (hasPosition=false)', async () => {
		expect(
			await validates({
				...baseContact,
				hasPosition: false,
				waterway: 'Kieler Bucht'
			})
		).toBe(true);
	});

	it('ungültig ohne Koordinaten und ohne Fahrwasser', async () => {
		expect(
			await validates({
				...baseContact,
				hasPosition: false
			})
		).toBe(false);
	});

	it('lässt fehlende Koordinaten beim Cast aus (bleiben undefined)', async () => {
		const result = await sightingSchema.validate(
			{ ...baseContact, hasPosition: false, waterway: 'Kieler Bucht' },
			{ abortEarly: false }
		);
		expect(result.latitude).toBeUndefined();
		expect(result.longitude).toBeUndefined();
	});
});
