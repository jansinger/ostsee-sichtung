/**
 * @fileoverview Eingangsseite `/admin`: Load-Verhalten der Task-Liste.
 *
 * Die Seite ist keine Tabelle mehr, sondern eine Arbeitsliste offener
 * Sichtungen. Vier Dinge muss `load()` leisten, und jedes davon ist schon
 * einmal falsch gewesen oder kann es leicht werden:
 *
 * 1. Gemerkte Tabellen-URLs (`/admin?page=…`) landen per 301 auf
 *    `/admin/sichtungen` — mitsamt Query, sonst verlieren geteilte Filter-Links
 *    ihren Inhalt.
 * 2. Default-Sortierung ist `created` **aufsteigend** (FIFO): Die älteste offene
 *    Meldung steht oben, damit nichts liegen bleibt.
 * 3. `?order=` kennt genau zwei gültige Werte; alles andere fällt auf `asc`
 *    zurück statt in die SQL zu wandern.
 * 4. Bildvorschauen kommen aus **einem** Query und werden in JS nach
 *    Sichtungs-ID gruppiert.
 *
 * Mock-Harnisch wie `src/routes/admin/sichtungen/page.server.test.ts`: ein
 * aufzeichnender `db.select`-Mock, dessen WHERE/ORDER-BY-Ausdrücke über den
 * echten `PgDialect` zu SQL kompiliert werden.
 */
import type { SQL, SQLWrapper } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openOnly } from '$lib/server/db/approvalFilter';

const dialect = new PgDialect();
const toSqlText = (condition: SQLWrapper): string => dialect.sqlToQuery(condition.getSQL()).sql;

/** Ein `db.select(...)`-Aufruf, wie ihn `load()` erzeugt. */
type RecordedSelect = {
	columns: Record<string, unknown> | undefined;
	whereSql?: string;
	orderBySql?: string;
	limit?: number;
};

let recordedSelects: RecordedSelect[] = [];
/** Rückgabewerte in Aufrufreihenfolge: Liste, Zähler, Foto-Zähler, Bilddateien. */
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
		limit: (value: number) => {
			record.limit = value;
			return builder;
		},
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

function makeUrl(params: Record<string, string> = {}): URL {
	const url = new URL('https://example.com/admin');
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	return url;
}

/** Die Load-Daten der Eingangsseite. */
type InboxData = {
	open: { id: number }[];
	openTotal: number;
	order: 'asc' | 'desc';
	imagesBySighting: Record<number, { id: number; filePath: string; originalName: string }[]>;
	pendingPhotoAnnouncements: number;
};

const { load } = await import('./+page.server');

/**
 * `PageServerLoad` erlaubt generisch auch `void` (Redirects o. ä.); für diese
 * Tests ist die tatsächliche Rückgabe bekannt, deshalb der Cast.
 */
const runLoad = async (url: URL): Promise<InboxData> =>
	(await load({ url } as unknown as Parameters<typeof load>[0])) as unknown as InboxData;

describe('Eingangs-Load', () => {
	beforeEach(() => {
		recordedSelects = [];
		resolvedRows = [[{ id: 1 }, { id: 2 }], [{ count: 7 }], [{ count: 3 }], []];
	});

	it('leitet Tabellen-URLs mit 301 nach /admin/sichtungen weiter (Query bleibt erhalten)', async () => {
		const fehler = await runLoad(makeUrl({ page: '2', verified: '0' })).then(
			() => null,
			(error: unknown) => error as { status?: number; location?: string }
		);

		expect(fehler).not.toBeNull();
		expect(fehler?.status).toBe(301);
		expect(fehler?.location).toBe('/admin/sichtungen?page=2&verified=0');
		// Der Redirect steht vor jeder Abfrage — sonst kostet jeder Bookmark-Aufruf
		// vier Queries für eine Antwort, die niemand liest.
		expect(recordedSelects).toHaveLength(0);
	});

	it('Default-Sortierung ist created aufsteigend (älteste zuerst)', async () => {
		const result = await runLoad(makeUrl());

		expect(result.order).toBe('asc');
		expect(recordedSelects[0]?.orderBySql).toMatch(/"created"/);
		expect(recordedSelects[0]?.orderBySql).toMatch(/\basc\b/i);
	});

	it('?order=desc dreht die Richtung, alles andere fällt auf asc zurück', async () => {
		const absteigend = await runLoad(makeUrl({ order: 'desc' }));
		expect(absteigend.order).toBe('desc');
		expect(recordedSelects[0]?.orderBySql).toMatch(/\bdesc\b/i);

		recordedSelects = [];
		const kaputt = await runLoad(makeUrl({ order: 'kaputt' }));
		expect(kaputt.order).toBe('asc');
		expect(recordedSelects[0]?.orderBySql).toMatch(/\basc\b/i);
	});

	it('gruppiert Bilddateien nach Sichtungs-ID', async () => {
		resolvedRows = [
			[{ id: 1 }, { id: 2 }],
			[{ count: 7 }],
			[{ count: 3 }],
			[
				{ id: 10, sightingId: 1, filePath: 'a.jpg', originalName: 'A.jpg' },
				{ id: 11, sightingId: 1, filePath: 'b.jpg', originalName: 'B.jpg' },
				{ id: 12, sightingId: 2, filePath: 'c.jpg', originalName: 'C.jpg' }
			]
		];

		const result = await runLoad(makeUrl());

		expect(result.imagesBySighting[1]).toHaveLength(2);
		expect(result.imagesBySighting[2]).toHaveLength(1);
		expect(result.imagesBySighting[1]?.[0]).toEqual({
			id: 10,
			filePath: 'a.jpg',
			originalName: 'A.jpg'
		});
	});

	it('lässt Sichtungen ohne Datei einfach weg statt sie mit undefined zu belegen', async () => {
		// Die Vorschau-Abfrage liefert nur Zeilen zu Sichtungen mit Bild. Task 7
		// iteriert über `imagesBySighting[id] ?? []` — ein Schlüssel mit
		// `undefined`-Wert wäre unauffällig falsch, ein fehlender ist korrekt.
		const result = await runLoad(makeUrl());

		expect(result.imagesBySighting).toEqual({});
		expect(Object.keys(result.imagesBySighting)).toHaveLength(0);
	});

	it('liefert Gesamtzahl und Foto-Ankündigungs-Zähler aus getrennten Abfragen', async () => {
		const result = await runLoad(makeUrl());

		expect(result.openTotal).toBe(7);
		expect(result.pendingPhotoAnnouncements).toBe(3);
		expect(result.open).toHaveLength(2);
	});

	/**
	 * Der Hinweis steht auf einer **Arbeitsliste**, also über Meldungen, die
	 * noch zu tun sind. Übernommen war er aus dem alten Tabellen-Dashboard, wo
	 * er bewusst über den gesamten Bestand zählte — dort war das richtig, hier
	 * nicht: Auf der lokalen DB nannte er vier Meldungen, von denen zwei längst
	 * freigegeben waren. Erledigte Arbeit als offen auszuweisen ist genau die
	 * Sorte Zahl, die man nach dem dritten Mal ignoriert.
	 */
	it('zählt nur offene Meldungen als ausstehende Foto-Ankündigung', async () => {
		await runLoad(makeUrl());

		// Gegen `openOnly()` selbst geprüft und nicht gegen abgetippte
		// Spaltennamen: Ein Literal hier wäre ein zweites, stumm alterndes
		// Freigabe-Prädikat — genau das, was `approvalPredicateScan.test.ts`
		// im ganzen Quelltext verbietet.
		const fotoZaehler = recordedSelects[2]?.whereSql ?? '';
		expect(fotoZaehler).toContain('"aufnahmeHochladen"');
		expect(fotoZaehler).toContain(toSqlText(openOnly()));
	});

	it('begrenzt die Liste, der Zähler bleibt ungekappt', async () => {
		await runLoad(makeUrl());

		expect(recordedSelects[0]?.limit).toBeGreaterThan(0);
		expect(recordedSelects[1]?.limit).toBeUndefined();
	});
});
