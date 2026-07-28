import { describe, expect, it } from 'vitest';
import { shouldApplyExifDateTime } from './exifDateTimeApply';

const EXIF = { sightingDate: '2025-08-15', sightingTime: '10:30' };

describe('shouldApplyExifDateTime', () => {
	it('übernimmt in ein Formular, in dem noch keine Zeit steht', () => {
		expect(
			shouldApplyExifDateTime({ sightingDate: '2026-07-28', sightingTime: '' }, null, {})
		).toBe(true);
	});

	/**
	 * `sightingDate` ist NIE leer — das Schema gibt ihm `berlinToday()` als
	 * Default (`sightingSchema.ts`). Ob schon etwas gesetzt wurde, lässt sich
	 * deshalb nur an `sightingTime` ablesen.
	 */
	it('übernimmt nicht, wenn bereits eine Zeit im Formular steht', () => {
		expect(
			shouldApplyExifDateTime({ sightingDate: '2026-07-20', sightingTime: '08:15' }, null, {})
		).toBe(false);
	});

	it('behandelt reine Leerzeichen wie eine leere Zeit', () => {
		expect(
			shouldApplyExifDateTime({ sightingDate: '2026-07-28', sightingTime: '  ' }, null, {})
		).toBe(true);
	});

	it('überschreibt keine Eingabe, die der Nutzer selbst angefasst hat', () => {
		expect(
			shouldApplyExifDateTime({ sightingDate: '2026-07-20', sightingTime: '' }, null, {
				sightingDate: true
			})
		).toBe(false);
	});

	/**
	 * Der Grund, warum `touched` allein nicht reicht: Die Übernahme läuft selbst
	 * über `handleChange` und markiert die Felder damit als berührt. Ein zweites
	 * Foto (Einzeldatei-Modus ersetzt das erste) müsste sonst an der eigenen
	 * Spur des ersten scheitern. Stehen die Werte noch exakt so da, wie wir sie
	 * geschrieben haben, gehören sie uns.
	 */
	it('überschreibt die eigene vorherige Übernahme', () => {
		expect(
			shouldApplyExifDateTime({ ...EXIF }, EXIF, { sightingDate: true, sightingTime: true })
		).toBe(true);
	});

	it('überschreibt die eigene Übernahme nicht mehr, sobald der Nutzer sie geändert hat', () => {
		expect(
			shouldApplyExifDateTime({ sightingDate: '2025-08-15', sightingTime: '11:00' }, EXIF, {
				sightingTime: true
			})
		).toBe(false);
	});

	it('kommt mit fehlenden Werten zurecht', () => {
		expect(shouldApplyExifDateTime({}, null, {})).toBe(true);
	});
});
