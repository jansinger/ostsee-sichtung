/**
 * @fileoverview Tests für die Koordinaten-Validierung in Schritt 1
 *
 * Eine Position außerhalb der Ostsee darf die Meldung **nicht blockieren**.
 * Sie war bis 2026-07-31 ein harter Validierungsfehler: `latitude`/`longitude`
 * trugen `min`/`max` aus `BALTIC_SEA_BBOX`, sobald `hasPosition` gesetzt war.
 *
 * Praktische Folge: Wer ein Foto mit GPS-Daten von außerhalb hochlud, bekam
 * eine Position ins Formular geschrieben, kam damit aber nicht weiter — und der
 * Schritt-Stepper meldete nur „Bitte füllen Sie zuerst die vorherigen Schritte
 * aus", ohne das klemmende Feld zu nennen. Eine Sackgasse.
 *
 * Die Bereichsprüfung bleibt als **Hinweis** erhalten (`VerifyLocation`,
 * `/api/geo/inBaltic`) — der Melder soll sehen, dass die Position ungewöhnlich
 * ist, und sie korrigieren können. Blockiert wird er nicht mehr.
 *
 * Unverändert bleibt die Grundplausibilität: Werte außerhalb des
 * Koordinatensystems sind weiterhin ein Fehler.
 */

import { describe, expect, it } from 'vitest';
import { validateStep } from './stepValidation';

const step1 = {
	sightingDate: '2026-07-31',
	sightingTime: '12:00',
	waterway: ''
};

describe('Position außerhalb der Ostsee blockiert Schritt 1 nicht', () => {
	it('Mittelmeer (Barcelona, 41.39 / 2.17) ist gültig', () => {
		const result = validateStep(0, {
			...step1,
			hasPosition: true,
			latitude: 41.39,
			longitude: 2.17
		});
		expect(result.errors).not.toHaveProperty('latitude');
		expect(result.errors).not.toHaveProperty('longitude');
		expect(result.isValid).toBe(true);
	});

	it('Nordsee westlich der Ostsee-Grenze (54.0 / 8.0) ist gültig', () => {
		const result = validateStep(0, { ...step1, hasPosition: true, latitude: 54.0, longitude: 8.0 });
		expect(result.isValid).toBe(true);
	});

	it('Südlich der Ostsee-Grenze (52.5 / 13.4, Berlin) ist gültig', () => {
		const result = validateStep(0, {
			...step1,
			hasPosition: true,
			latitude: 52.5,
			longitude: 13.4
		});
		expect(result.isValid).toBe(true);
	});

	it('Position in der Ostsee bleibt selbstverständlich gültig', () => {
		const result = validateStep(0, {
			...step1,
			hasPosition: true,
			latitude: 54.31,
			longitude: 12.09
		});
		expect(result.isValid).toBe(true);
	});
});

describe('Grundplausibilität der Koordinaten bleibt', () => {
	it('Breitengrad über 90 ist ein Fehler', () => {
		const result = validateStep(0, { ...step1, hasPosition: true, latitude: 91, longitude: 12 });
		expect(result.errors).toHaveProperty('latitude');
	});

	it('Breitengrad unter -90 ist ein Fehler', () => {
		const result = validateStep(0, { ...step1, hasPosition: true, latitude: -91, longitude: 12 });
		expect(result.errors).toHaveProperty('latitude');
	});

	it('Längengrad über 180 ist ein Fehler', () => {
		const result = validateStep(0, { ...step1, hasPosition: true, latitude: 54, longitude: 181 });
		expect(result.errors).toHaveProperty('longitude');
	});

	it('Längengrad unter -180 ist ein Fehler', () => {
		const result = validateStep(0, { ...step1, hasPosition: true, latitude: 54, longitude: -181 });
		expect(result.errors).toHaveProperty('longitude');
	});

	it('Fehlende Koordinate bei hasPosition bleibt Pflicht', () => {
		const result = validateStep(0, { ...step1, hasPosition: true, longitude: 12 });
		expect(result.errors).toHaveProperty('latitude');
	});
});
