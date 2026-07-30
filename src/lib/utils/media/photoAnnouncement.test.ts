/**
 * @fileoverview Der neu gebaute iOS-Client (`OstSeeTiere/8`) setzt `aufnahmeHochladen`
 * (→ `mediaUpload`), kann aber selbst keine Datei hochladen — Melder werden
 * gebeten, das Foto per E-Mail nachzureichen. Bis dahin liest „Upload: ja" ohne
 * angehängte Datei wie ein defekter Datensatz.
 *
 * `isPhotoAnnouncementPending()` ist die einzige Stelle, an der dieser Zustand
 * entsteht — analog zu `getBalticSeaStatus()` in `balticSeaStatus.ts`. Admin-
 * Detailansicht und Admin-Arbeitsliste (DB-Filter) müssen dieselbe Aussage
 * treffen, sonst laufen sie auseinander wie zuvor der Ostsee-Status.
 */
import { describe, expect, it } from 'vitest';
import {
	isPhotoAnnouncementPending,
	MEDIA_UPLOAD_ANNOUNCED_MISSING,
	PHOTO_ANNOUNCEMENT_LABEL
} from './photoAnnouncement';

describe('isPhotoAnnouncementPending', () => {
	it('ist wahr, wenn ein Foto angekündigt ist und keine Datei angehängt wurde', () => {
		expect(isPhotoAnnouncementPending(1, 0)).toBe(true);
	});

	it('ist falsch, sobald mindestens eine Datei angehängt ist', () => {
		expect(isPhotoAnnouncementPending(1, 1)).toBe(false);
		expect(isPhotoAnnouncementPending(1, 3)).toBe(false);
	});

	it('ist falsch, wenn kein Foto angekündigt wurde — unabhängig von der Dateizahl', () => {
		expect(isPhotoAnnouncementPending(0, 0)).toBe(false);
		expect(isPhotoAnnouncementPending(null, 0)).toBe(false);
		expect(isPhotoAnnouncementPending(undefined, 0)).toBe(false);
	});

	it('behandelt einen booleschen mediaUpload-Wert genauso wie das DB-Integer-Flag', () => {
		expect(isPhotoAnnouncementPending(true, 0)).toBe(true);
		expect(isPhotoAnnouncementPending(false, 0)).toBe(false);
	});

	it('exportiert einen stabilen deutschen Hinweistext', () => {
		expect(PHOTO_ANNOUNCEMENT_LABEL).toBe('Foto angekündigt, folgt per E-Mail');
	});

	it('exportiert einen stabilen Filterwert für die Admin-Arbeitsliste', () => {
		expect(MEDIA_UPLOAD_ANNOUNCED_MISSING).toBe('announced_missing');
	});
});
