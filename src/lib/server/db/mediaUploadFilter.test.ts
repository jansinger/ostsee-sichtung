/**
 * @fileoverview Gemeinsamer `mediaUpload`-Filter für Admin-Übersicht und
 * Export.
 *
 * `admin/+page.server.ts` und `api/sightings/export/exportFilterParams.ts`
 * pflegten bisher zwei unabhängige, wortgleiche `if (mediaUpload === '1') …`-
 * Verzweigungen. Für den neuen Wert `announced_missing` — Foto laut App
 * angekündigt (`aufnahmeHochladen = 1`), aber keine Datei in
 * `sichtungen_dateien` angehängt (siehe `$lib/utils/media/photoAnnouncement.ts`)
 * — reicht ein einfacher Spaltenvergleich nicht mehr; die beiden Kopien hier
 * ebenfalls zu duplizieren liefe demselben Auseinanderlaufen entgegen, das
 * `getBalticSeaStatus()` an anderer Stelle beheben sollte.
 *
 * Testansatz wie `statisticsApprovalScope.test.ts`: das Prädikat wird über den
 * echten `PgDialect` zu SQL kompiliert, keine DB-Verbindung nötig.
 */
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { MEDIA_UPLOAD_ANNOUNCED_MISSING, mediaUploadCondition } from './mediaUploadFilter';

const dialect = new PgDialect();
const toSqlText = (condition: SQL): string => dialect.sqlToQuery(condition).sql;

describe('mediaUploadCondition', () => {
	it('liefert kein Prädikat für einen unbekannten oder fehlenden Wert', () => {
		expect(mediaUploadCondition(null)).toBeUndefined();
		expect(mediaUploadCondition(undefined)).toBeUndefined();
		expect(mediaUploadCondition('all')).toBeUndefined();
		expect(mediaUploadCondition('')).toBeUndefined();
	});

	it('filtert auf "mit Aufnahme" (mediaUpload = 1)', () => {
		const condition = mediaUploadCondition('1');
		expect(condition).toBeDefined();
		expect(toSqlText(condition as SQL)).toContain('"aufnahmeHochladen" = $1');
	});

	it('filtert auf "ohne Aufnahme" (mediaUpload = 0)', () => {
		const condition = mediaUploadCondition('0');
		expect(condition).toBeDefined();
		expect(toSqlText(condition as SQL)).toContain('"aufnahmeHochladen" = $1');
	});

	// Der eigentliche neue Fall: Foto angekündigt, aber (noch) keine Datei
	// angehängt — die Arbeitsliste für Admins.
	it('kombiniert "angekündigt" (mediaUpload = 1) mit "keine Datei angehängt" (NOT EXISTS)', () => {
		const condition = mediaUploadCondition(MEDIA_UPLOAD_ANNOUNCED_MISSING);
		expect(condition).toBeDefined();

		const text = toSqlText(condition as SQL);
		expect(text).toContain('"aufnahmeHochladen" = $1');
		expect(text).toContain('not exists'.toUpperCase());
		expect(text).toContain('sichtungen_dateien');
		// Korreliert über die Fremdschlüsselspalte, nicht über eine feste ID —
		// sonst träfe die Bedingung jede Sichtung gleichermaßen.
		expect(text).toContain('sichtung_id');
	});
});
