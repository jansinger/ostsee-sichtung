/**
 * @fileoverview Admin-Dashboard: Arbeitsliste „Foto angekündigt, fehlt noch".
 *
 * Der neu gebaute iOS-Client setzt `aufnahmeHochladen`, kann aber kein Foto
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
import { and, sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { isRedirect, type Redirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchCondition } from '$lib/server/db/sightingSearchFilter';
import {
	MEDIA_UPLOAD_ANNOUNCED_MISSING,
	mediaUploadCondition
} from '$lib/server/db/mediaUploadFilter';
import { balticSeaCondition } from '$lib/server/db/balticSeaFilter';
import { deadFindingCondition } from '$lib/server/db/deadFindingFilter';
import { rejectedOnly } from '$lib/server/db/approvalFilter';
import { berlinCalendarDate } from '$lib/server/db/sqlTimeZone';
import { sightings } from '$lib/server/db/schema';

const dialect = new PgDialect();
const toSqlText = (condition: SQLWrapper): string => dialect.sqlToQuery(condition.getSQL()).sql;

/** Ein `db.select(...)`-Aufruf, wie ihn `load()` erzeugt. */
type RecordedSelect = {
	columns: Record<string, unknown> | undefined;
	whereSql?: string;
	orderBySql?: string;
};

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
		orderBy: (expression?: SQLWrapper) => {
			if (expression) record.orderBySql = toSqlText(expression);
			return builder;
		},
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

	it('sortiert die Spam-Spalte absteigend mit NULLS LAST (sonst stünde Altbestand oben)', async () => {
		await load({
			url: makeUrl({ sort: 'spamScore', order: 'desc' })
		} as unknown as Parameters<typeof load>[0]);

		// Erstes select() ist die Hauptliste. Postgres sortiert DESC per Default
		// NULLS FIRST — die 19.000+ unbewerteten Zeilen lägen vor den Treffern.
		expect(recordedSelects[0]?.orderBySql).toMatch(/nulls last/i);
	});

	it('sortiert auch aufsteigend explizit mit NULLS LAST', async () => {
		await load({
			url: makeUrl({ sort: 'spamScore', order: 'asc' })
		} as unknown as Parameters<typeof load>[0]);

		expect(recordedSelects[0]?.orderBySql).toMatch(/nulls last/i);
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

	// Der Filter selbst ist in `balticSeaFilter.test.ts` gegen `getBalticSeaStatus()`
	// abgesichert. Hier geht es nur um die Verdrahtung: dass `?balticSea=…`
	// überhaupt bis in die WHERE-Klausel durchschlägt. Alle vier Werte, damit ein
	// vergessener `switch`-Zweig nicht durchrutscht.
	it.each(['baltic', 'edge', 'outside', 'noPosition'] as const)(
		'?balticSea=%s filtert die Hauptliste mit derselben Bedingung',
		async (status) => {
			await load({
				url: makeUrl({ balticSea: status })
			} as unknown as Parameters<typeof load>[0]);

			const expected = toSqlText(balticSeaCondition(status) as unknown as SQLWrapper);
			expect(recordedSelects[0]?.whereSql).toBe(expected);
			expect(recordedSelects[1]?.whereSql).toBe(expected);
		}
	);

	// Wie beim Ostsee-Status: Die Bedingung selbst ist in `deadFindingFilter.test.ts`
	// abgesichert, hier zählt nur die Verdrahtung von `?deadFinding=…` in die WHERE-Klausel.
	it.each(['1', '0'] as const)(
		'?deadFinding=%s filtert die Hauptliste mit derselben Bedingung',
		async (value) => {
			await load({
				url: makeUrl({ deadFinding: value })
			} as unknown as Parameters<typeof load>[0]);

			const expected = toSqlText(deadFindingCondition(value) as unknown as SQLWrapper);
			expect(recordedSelects[0]?.whereSql).toBe(expected);
			expect(recordedSelects[1]?.whereSql).toBe(expected);
		}
	);

	it('ein unbekannter deadFinding-Wert filtert die Hauptliste gar nicht', async () => {
		await load({
			url: makeUrl({ deadFinding: 'quatsch' })
		} as unknown as Parameters<typeof load>[0]);

		expect(recordedSelects[0]?.whereSql).toBeUndefined();
	});

	it('ein unbekannter balticSea-Wert filtert die Hauptliste gar nicht', async () => {
		await load({
			url: makeUrl({ balticSea: 'quatsch' })
		} as unknown as Parameters<typeof load>[0]);

		expect(recordedSelects[0]?.whereSql).toBeUndefined();
	});

	// verified=rejected ist die Triage-Sicht auf abgelehnte Sichtungen und muss
	// exakt die Bedingung von rejectedOnly() tragen. Seit der Umstellung auf
	// statusCondition() (statusFilter.ts) laufen auch verified=0/1 über
	// dieselben Prädikate (openOnly()/approvedOnly()) statt über die Spalte
	// `geprueft` — siehe sightingStatusFilter.test.ts und statusFilter.test.ts.
	it('verified=rejected filtert über rejectedOnly()', async () => {
		await load({
			url: makeUrl({ verified: 'rejected' })
		} as unknown as Parameters<typeof load>[0]);

		const expected = toSqlText(rejectedOnly());
		expect(recordedSelects[0]?.whereSql).toBe(expected);
		expect(recordedSelects[1]?.whereSql).toBe(expected);
	});
});

/**
 * Der Datumsfilter der Tabelle hat zwei unabhängige Felder — „Von" und „Bis".
 * Bis 2026-08 griff er nur, wenn **beide** gültig gesetzt waren: Wer nur eine
 * Grenze eintrug, bekam kommentarlos die ungefilterte Liste zurück und hielt
 * das Ergebnis für gefiltert. Offene Grenzen sind der erwartete Fall („alles
 * ab dem 01.06."), nicht die Ausnahme.
 */
describe('admin/sichtungen/+page.server load() — Datumsfilter mit offenen Grenzen', () => {
	/** Kalendertag-Ausdruck der Abfrage — derselbe wie in `load()`. */
	const kalendertag = berlinCalendarDate(sightings.sightingDate);

	beforeEach(() => {
		recordedSelects = [];
		resolvedRows = [[{ id: 1 }], [{ count: 5 }], [{ count: 2 }]];
	});

	it('filtert mit beiden Grenzen weiterhin über BETWEEN', async () => {
		await load({
			url: makeUrl({ fromDate: '2024-06-01', toDate: '2024-06-30' })
		} as unknown as Parameters<typeof load>[0]);

		const expected = toSqlText(
			sql`${kalendertag} BETWEEN ${'2024-06-01'} AND ${'2024-06-30'}` as unknown as SQLWrapper
		);
		expect(recordedSelects[0]?.whereSql).toBe(expected);
		expect(recordedSelects[1]?.whereSql).toBe(expected);
	});

	it('filtert mit nur „Von" ab diesem Kalendertag', async () => {
		await load({
			url: makeUrl({ fromDate: '2024-06-01' })
		} as unknown as Parameters<typeof load>[0]);

		const expected = toSqlText(sql`${kalendertag} >= ${'2024-06-01'}` as unknown as SQLWrapper);
		expect(recordedSelects[0]?.whereSql).toBe(expected);
		expect(recordedSelects[1]?.whereSql).toBe(expected);
	});

	it('filtert mit nur „Bis" bis zu diesem Kalendertag', async () => {
		await load({
			url: makeUrl({ toDate: '2024-06-30' })
		} as unknown as Parameters<typeof load>[0]);

		const expected = toSqlText(sql`${kalendertag} <= ${'2024-06-30'}` as unknown as SQLWrapper);
		expect(recordedSelects[0]?.whereSql).toBe(expected);
		expect(recordedSelects[1]?.whereSql).toBe(expected);
	});

	it('ignoriert eine ungültige Grenze, statt sie in die Abfrage zu tragen', async () => {
		await load({
			url: makeUrl({ fromDate: 'quatsch', toDate: '2024-06-30' })
		} as unknown as Parameters<typeof load>[0]);

		const expected = toSqlText(sql`${kalendertag} <= ${'2024-06-30'}` as unknown as SQLWrapper);
		expect(recordedSelects[0]?.whereSql).toBe(expected);
	});

	it('filtert ohne gültige Grenze gar nicht', async () => {
		await load({
			url: makeUrl({ fromDate: 'quatsch', toDate: '2024-13-99' })
		} as unknown as Parameters<typeof load>[0]);

		expect(recordedSelects[0]?.whereSql).toBeUndefined();
	});
});

/**
 * Freitext-Suche (`?q=`). Die Bedingung selbst ist in `sightingSearchFilter.test.ts`
 * abgesichert; hier zählt die Verdrahtung — dass der Parameter bis in die
 * WHERE-Klausel durchschlägt — und der Sonderfall Referenz-ID.
 */
describe('admin/sichtungen/+page.server load() — Freitext-Suche', () => {
	beforeEach(() => {
		recordedSelects = [];
		resolvedRows = [[{ id: 1 }], [{ count: 5 }], [{ count: 2 }]];
	});

	it('?q=… filtert Liste und Zähler mit derselben Bedingung', async () => {
		await load({
			url: makeUrl({ q: 'müller' })
		} as unknown as Parameters<typeof load>[0]);

		const expected = toSqlText(searchCondition('müller') as unknown as SQLWrapper);
		expect(recordedSelects[0]?.whereSql).toBe(expected);
		expect(recordedSelects[1]?.whereSql).toBe(expected);
	});

	it('ein leerer Suchbegriff filtert gar nicht', async () => {
		await load({
			url: makeUrl({ q: '   ' })
		} as unknown as Parameters<typeof load>[0]);

		expect(recordedSelects[0]?.whereSql).toBeUndefined();
	});

	it('kombiniert die Suche mit einem aktiven Statusfilter', async () => {
		await load({
			url: makeUrl({ q: 'müller', verified: 'rejected' })
		} as unknown as Parameters<typeof load>[0]);

		const expected = toSqlText(
			and(rejectedOnly(), searchCondition('müller')) as unknown as SQLWrapper
		);
		expect(recordedSelects[0]?.whereSql).toBe(expected);
	});

	it('leitet bei genau einem exakten Referenz-ID-Treffer auf die Detailseite', async () => {
		// Verhalten wie /admin/ref/[refId]: Wer eine Referenz-ID einfügt, will die
		// Sichtung sehen, nicht eine einzeilige Trefferliste.
		resolvedRows = [[{ id: 4711, referenceId: 'abc123xyz' }], [{ count: 1 }], [{ count: 0 }]];

		let fehler: unknown;
		try {
			await load({ url: makeUrl({ q: 'ABC123XYZ' }) } as unknown as Parameters<typeof load>[0]);
		} catch (err) {
			fehler = err;
		}

		expect(isRedirect(fehler)).toBe(true);
		expect((fehler as Redirect).location).toBe('/admin/4711');
	});

	it('gibt den Suchbegriff beim Weiterleiten NICHT mit', async () => {
		// Sonst führt der Rückweg aus der Detailansicht (tableReturnUrl.ts nimmt
		// `q` mit) direkt wieder in dieselbe Weiterleitung: „Zurück zur Tabelle"
		// landete erneut auf der Detailseite, und die Liste wäre ohne Handarbeit
		// an der URL nicht mehr erreichbar.
		resolvedRows = [[{ id: 4711, referenceId: 'abc123xyz' }], [{ count: 1 }], [{ count: 0 }]];

		let fehler: unknown;
		try {
			await load({
				url: makeUrl({ q: 'abc123xyz', verified: 'open' })
			} as unknown as Parameters<typeof load>[0]);
		} catch (err) {
			fehler = err;
		}

		const ziel = new URL((fehler as Redirect).location, 'https://example.com');
		expect(ziel.searchParams.has('q')).toBe(false);
		// Die übrigen Filter bleiben erhalten — der Rückweg führt damit auf die
		// Tabelle, die der Bearbeiter vor der Suche vor sich hatte.
		expect(ziel.searchParams.get('verified')).toBe('open');
	});

	it('leitet nicht weiter, wenn der Begriff nur Teil der Referenz-ID ist', async () => {
		resolvedRows = [[{ id: 4711, referenceId: 'abc123xyz' }], [{ count: 1 }], [{ count: 0 }]];

		const result = await load({
			url: makeUrl({ q: 'abc123' })
		} as unknown as Parameters<typeof load>[0]);

		expect(result).toBeDefined();
	});

	it('leitet nicht weiter, wenn die Suche mehrere Treffer hat', async () => {
		resolvedRows = [
			[
				{ id: 4711, referenceId: 'abc123xyz' },
				{ id: 4712, referenceId: 'anderes' }
			],
			[{ count: 2 }],
			[{ count: 0 }]
		];

		const result = await load({
			url: makeUrl({ q: 'abc123xyz' })
		} as unknown as Parameters<typeof load>[0]);

		expect(result).toBeDefined();
	});
});

/**
 * `count(*)` kommt je nach PG-Treiber als **String** zurück (bigint). Die Seite
 * verglich `pendingPhotoAnnouncements === 1` und zeigte deshalb „1 Fotos
 * ausstehend". Die Normalisierung gehört in den Loader, nicht in jede
 * Aufrufstelle: Ein Loader-Vertrag mit `number` gilt für alle.
 */
describe('admin/sichtungen/+page.server load() — Zähler sind Zahlen, keine Strings', () => {
	beforeEach(() => {
		recordedSelects = [];
		resolvedRows = [[{ id: 1 }], [{ count: '42' }], [{ count: '1' }]];
	});

	it('liefert pendingPhotoAnnouncements als Zahl, auch wenn der Treiber einen String liefert', async () => {
		const result = (await load({
			url: makeUrl()
		} as unknown as Parameters<typeof load>[0])) as { pendingPhotoAnnouncements: number };

		expect(result.pendingPhotoAnnouncements).toBe(1);
		expect(typeof result.pendingPhotoAnnouncements).toBe('number');
	});

	it('liefert pagination.total als Zahl und rechnet totalPages daraus', async () => {
		const result = (await load({
			url: makeUrl({ perPage: '20' })
		} as unknown as Parameters<typeof load>[0])) as {
			pagination: { total: number; totalPages: number };
		};

		expect(result.pagination.total).toBe(42);
		expect(typeof result.pagination.total).toBe('number');
		expect(result.pagination.totalPages).toBe(3);
	});
});
