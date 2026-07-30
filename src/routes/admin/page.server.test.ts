/**
 * @fileoverview Admin-Dashboard: Arbeitsliste „Foto angekündigt, fehlt noch".
 *
 * Der rebuilte iOS-Client setzt `aufnahmeHochladen`, kann aber kein Foto
 * hochladen — es kommt per E-Mail nach (`$lib/utils/media/photoAnnouncement.ts`).
 * `load()` muss zwei Dinge leisten:
 *
 * 1. Der Filterwert `mediaUpload=announced_missing` muss dieselbe Bedingung
 *    erzeugen wie `mediaUploadCondition()` — sonst driftet die Admin-Liste vom
 *    zentral getesteten Filter auseinander.
 * 2. Unabhängig vom aktiven Filter liefert `load()` einen globalen Zähler
 *    `pendingPhotoAnnouncements`, damit Admins die Arbeitsliste sehen, ohne
 *    den Filter erst öffnen zu müssen.
 *
 * Testansatz wie `statisticsApprovalScope.test.ts`: ein aufzeichnender
 * `db.select`-Mock, das WHERE-Prädikat wird über den echten `PgDialect` zu SQL
 * kompiliert.
 */
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL, SQLWrapper } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	MEDIA_UPLOAD_ANNOUNCED_MISSING,
	mediaUploadCondition
} from '$lib/server/db/mediaUploadFilter';

const dialect = new PgDialect();
const toSqlText = (condition: SQLWrapper): string => dialect.sqlToQuery(condition.getSQL()).sql;

/** Ein `db.select(...)`-Aufruf, wie ihn `load()` erzeugt. */
type RecordedSelect = { columns: Record<string, unknown> | undefined; whereSql?: string };

let recordedSelects: RecordedSelect[] = [];
/** Rückgabewerte in Aufrufreihenfolge — `load()` ruft `db.select` dreimal auf. */
let resolvedRows: unknown[][] = [];

function createRecordingBuilder(record: RecordedSelect) {
	const builder = {
		from: () => builder,
		where: (predicate?: SQL) => {
			if (predicate) record.whereSql = toSqlText(predicate);
			return builder;
		},
		orderBy: () => builder,
		limit: () => builder,
		offset: () => builder,
		then: (resolve: (rows: unknown[]) => unknown, reject?: (error: unknown) => unknown) =>
			Promise.resolve(resolvedRows[recordedSelects.indexOf(record)] ?? []).then(resolve, reject)
	};
	return builder;
}

vi.mock('$lib/server/db', () => ({
	db: {
		select: (columns?: Record<string, unknown>) => {
			const record: RecordedSelect = { columns };
			recordedSelects.push(record);
			return createRecordingBuilder(record);
		}
	}
}));

vi.mock('$lib/services/configService', () => ({
	ServerConfigService: {
		getPaginationConfig: vi
			.fn()
			.mockResolvedValue({ defaultPageSize: 20, maxSightingsPerPage: 100 })
	}
}));

function makeUrl(params: Record<string, string> = {}): URL {
	const url = new URL('https://example.com/admin');
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	return url;
}

const { load } = await import('./+page.server');

describe('admin/+page.server load() — Foto-Ankündigungs-Arbeitsliste', () => {
	beforeEach(() => {
		recordedSelects = [];
		resolvedRows = [[{ id: 1 }], [{ count: 5 }], [{ count: 2 }]];
	});

	it('liefert pendingPhotoAnnouncements unabhängig vom aktiven Filter', async () => {
		// `PageServerLoad` erlaubt generisch auch `void` als Rückgabe (Redirects
		// o.ä.); für diesen Test ist das tatsächlich zurückgegebene Objekt
		// bekannt, deshalb der Cast statt eines Guards gegen `void`.
		const result = (await load({
			url: makeUrl()
		} as unknown as Parameters<typeof load>[0])) as { pendingPhotoAnnouncements: number };

		expect(result.pendingPhotoAnnouncements).toBe(2);
	});

	it('das dritte select() trägt exakt die Bedingung von mediaUploadCondition(announced_missing)', async () => {
		await load({ url: makeUrl() } as unknown as Parameters<typeof load>[0]);

		const expected = toSqlText(
			mediaUploadCondition(MEDIA_UPLOAD_ANNOUNCED_MISSING) as unknown as SQLWrapper
		);
		const thirdSelect = recordedSelects[2];
		expect(thirdSelect?.whereSql).toBe(expected);
	});

	it('?mediaUpload=announced_missing filtert die Hauptliste mit derselben Bedingung', async () => {
		// Ohne weitere Filter ruft nur die neue Arbeitslisten-Abfrage where()
		// auf — mit diesem Query-Parameter tut es zusätzlich die Hauptliste.
		await load({
			url: makeUrl({ mediaUpload: MEDIA_UPLOAD_ANNOUNCED_MISSING })
		} as unknown as Parameters<typeof load>[0]);

		const expected = toSqlText(
			mediaUploadCondition(MEDIA_UPLOAD_ANNOUNCED_MISSING) as unknown as SQLWrapper
		);
		// Erster Select = Hauptliste, zweiter = Pagination-Count — beide
		// müssen jetzt dieselbe Bedingung tragen wie die Arbeitslisten-Abfrage.
		expect(recordedSelects[0]?.whereSql).toBe(expected);
		expect(recordedSelects[1]?.whereSql).toBe(expected);
	});
});
