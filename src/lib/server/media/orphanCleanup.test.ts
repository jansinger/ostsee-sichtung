/**
 * Tests der reinen Auswahl-Logik. Aus `src/tools/cleanup-orphaned-uploads.test.ts`
 * übernommen, als die Logik in den gemeinsamen Kern wanderte — unverändert, damit
 * der Umzug nachweislich nichts am Verhalten geändert hat.
 */
import { describe, expect, it, vi } from 'vitest';
import {
	cleanupOrphans,
	computeCutoff,
	normalizeRelativePath,
	parseRetention,
	resolveSafeTarget,
	selectOrphanedFiles,
	selectOrphanedRows,
	type CleanupPorts,
	type DiskEntry,
	type OrphanRow
} from './orphanCleanup';

describe('parseRetention', () => {
	it('rechnet Stunden in Millisekunden um', () => {
		expect(parseRetention('24h')).toBe(24 * 60 * 60 * 1000);
	});

	it('rechnet Tage in Millisekunden um', () => {
		expect(parseRetention('7d')).toBe(7 * 24 * 60 * 60 * 1000);
	});

	it('akzeptiert Großschreibung', () => {
		expect(parseRetention('12H')).toBe(12 * 60 * 60 * 1000);
	});

	it.each(['24', 'h', '-1h', '0h', 'abc', '', '1.5h', '1h2d'])(
		'weist ungültige Eingabe %j zurück',
		(input) => {
			expect(() => parseRetention(input)).toThrow(/Ungültige Frist/);
		}
	);
});

describe('computeCutoff', () => {
	it('zieht die Frist vom Bezugszeitpunkt ab', () => {
		const now = new Date('2026-07-28T12:00:00.000Z');

		const cutoff = computeCutoff(now, 24 * 60 * 60 * 1000);

		expect(cutoff.toISOString()).toBe('2026-07-27T12:00:00.000Z');
	});

	it('verändert den übergebenen Bezugszeitpunkt nicht', () => {
		const now = new Date('2026-07-28T12:00:00.000Z');

		computeCutoff(now, 1000);

		expect(now.toISOString()).toBe('2026-07-28T12:00:00.000Z');
	});
});

/** Baut eine Zeile mit sinnvollen Vorgaben; nur Abweichungen angeben. */
function buildRow(overrides: Partial<OrphanRow> = {}): OrphanRow {
	return {
		id: 1,
		filePath: 'a0vaw9b811s6mb1ma79cmlzc/abc.jpg',
		uploadedAt: new Date('2026-07-01T00:00:00.000Z'),
		...overrides
	};
}

describe('selectOrphanedRows', () => {
	const cutoff = new Date('2026-07-27T12:00:00.000Z');

	it('wählt Zeilen, die älter als der Grenzzeitpunkt sind', () => {
		const rows = [buildRow({ id: 42, uploadedAt: new Date('2026-07-26T00:00:00.000Z') })];

		expect(selectOrphanedRows(rows, cutoff).map((row) => row.id)).toEqual([42]);
	});

	it('schont Zeilen innerhalb der Frist', () => {
		const rows = [buildRow({ uploadedAt: new Date('2026-07-28T00:00:00.000Z') })];

		expect(selectOrphanedRows(rows, cutoff)).toEqual([]);
	});

	it('schont eine Zeile exakt auf dem Grenzzeitpunkt', () => {
		const rows = [buildRow({ uploadedAt: new Date(cutoff) })];

		expect(selectOrphanedRows(rows, cutoff)).toEqual([]);
	});

	it('wählt die vier bekannten Altlasten vom 26.12.2025', () => {
		const rows = [866, 867, 874, 875].map((id) =>
			buildRow({ id, uploadedAt: new Date('2025-12-26T10:00:00.000Z') })
		);

		expect(selectOrphanedRows(rows, cutoff).map((row) => row.id)).toEqual([866, 867, 874, 875]);
	});

	it('liefert bei leerer Eingabe eine leere Liste', () => {
		expect(selectOrphanedRows([], cutoff)).toEqual([]);
	});
});

/** Baut einen Dateisystem-Eintrag; nur Abweichungen angeben. */
function buildEntry(overrides: Partial<DiskEntry> = {}): DiskEntry {
	return {
		relativePath: 'a0vaw9b811s6mb1ma79cmlzc/abc.jpg',
		modifiedAt: new Date('2026-07-01T00:00:00.000Z'),
		...overrides
	};
}

describe('normalizeRelativePath', () => {
	it('wandelt Backslashes in Schrägstriche', () => {
		expect(normalizeRelativePath('ref\\datei.jpg')).toBe('ref/datei.jpg');
	});

	it('entfernt einen führenden Schrägstrich', () => {
		expect(normalizeRelativePath('/ref/datei.jpg')).toBe('ref/datei.jpg');
	});

	it('entfernt ein führendes ./', () => {
		expect(normalizeRelativePath('./ref/datei.jpg')).toBe('ref/datei.jpg');
	});

	it('lässt einen bereits normalisierten Pfad unverändert', () => {
		expect(normalizeRelativePath('ref/datei.jpg')).toBe('ref/datei.jpg');
	});

	it('setzt zerlegte Umlaute zu NFC zusammen', () => {
		// macOS liefert Dateinamen zerlegt (u + kombinierendes Trema),
		// PostgreSQL zusammengesetzt. Ohne diese Angleichung gilt eine Datei
		// mit Umlaut als verwaist, obwohl ihre Zeile existiert.
		// ̈ ist das kombinierende Trema — bewusst als Escape geschrieben,
		// weil NFD und NFC im Quelltext sonst identisch aussehen.
		const decomposed = 'ref/Rügen.jpg';
		const composed = 'ref/Rügen.jpg';

		expect(decomposed).not.toBe(composed);
		expect(normalizeRelativePath(decomposed)).toBe(composed);
	});

	it('lässt zusammengesetzte Umlaute unverändert', () => {
		expect(normalizeRelativePath('ref/Rügen.jpg')).toBe('ref/Rügen.jpg');
	});
});

describe('selectOrphanedFiles', () => {
	const cutoff = new Date('2026-07-27T12:00:00.000Z');

	it('wählt eine alte Datei ohne DB-Zeile', () => {
		const entries = [buildEntry({ relativePath: 'ref/waise.jpg' })];

		const result = selectOrphanedFiles(
			entries,
			{ paths: ['ref/andere.jpg'], referenceIds: [] },
			cutoff
		);

		expect(result.map((entry) => entry.relativePath)).toEqual(['ref/waise.jpg']);
	});

	it('schont eine Datei, die in der Datenbank steht', () => {
		const entries = [buildEntry({ relativePath: 'ref/bekannt.jpg' })];

		expect(
			selectOrphanedFiles(entries, { paths: ['ref/bekannt.jpg'], referenceIds: [] }, cutoff)
		).toEqual([]);
	});

	it('schont eine junge Datei ohne DB-Zeile — das ist ein laufender Upload', () => {
		const entries = [
			buildEntry({
				relativePath: 'ref/gerade-hochgeladen.jpg',
				modifiedAt: new Date('2026-07-28T11:59:00.000Z')
			})
		];

		expect(selectOrphanedFiles(entries, { paths: [], referenceIds: [] }, cutoff)).toEqual([]);
	});

	it('schont eine Datei exakt auf dem Grenzzeitpunkt', () => {
		const entries = [buildEntry({ relativePath: 'ref/grenze.jpg', modifiedAt: new Date(cutoff) })];

		expect(selectOrphanedFiles(entries, { paths: [], referenceIds: [] }, cutoff)).toEqual([]);
	});

	it('vergleicht Pfade unabhängig vom Trennzeichen', () => {
		const entries = [buildEntry({ relativePath: 'ref\\bekannt.jpg' })];

		expect(
			selectOrphanedFiles(entries, { paths: ['ref/bekannt.jpg'], referenceIds: [] }, cutoff)
		).toEqual([]);
	});

	it('erkennt einen zerlegt geschriebenen Dateinamen als bekannt', () => {
		// Der reale Datenverlust-Fall: macOS liefert NFD, die Datenbank NFC.
		// Ohne Normalisierung gälte diese Datei als verwaist und würde gelöscht.
		const entries = [buildEntry({ relativePath: 'ref/Rügen.jpg' })];

		expect(
			selectOrphanedFiles(entries, { paths: ['ref/Rügen.jpg'], referenceIds: [] }, cutoff)
		).toEqual([]);
	});

	it('schont eine Datei, deren Ordner zu einer echten Sichtung gehört', () => {
		// Der Ordnername ist die referenz_id der Sichtung. Fehlt die Zeile,
		// ist die Datei die EINZIGE verbliebene Kopie — sie zu löschen wäre
		// der schlimmstmögliche Ausgang dieses Tools.
		const entries = [buildEntry({ relativePath: 'echteref/bild.jpg' })];

		expect(selectOrphanedFiles(entries, { paths: [], referenceIds: ['echteref'] }, cutoff)).toEqual(
			[]
		);
	});

	it('liefert bei leerer Eingabe eine leere Liste', () => {
		expect(
			selectOrphanedFiles([], { paths: ['ref/bekannt.jpg'], referenceIds: [] }, cutoff)
		).toEqual([]);
	});
});

describe('resolveSafeTarget', () => {
	const baseDir = '/srv/app/uploads';

	it('löst einen normalen relativen Pfad unterhalb der Basis auf', () => {
		expect(resolveSafeTarget(baseDir, 'ref/datei.jpg')).toBe('/srv/app/uploads/ref/datei.jpg');
	});

	it.each(['../etc/passwd', 'ref/../../etc/passwd', '/etc/passwd', 'ref/../../../', '..', ''])(
		'weist %j zurück',
		(relativePath) => {
			expect(resolveSafeTarget(baseDir, relativePath)).toBeNull();
		}
	);

	it('weist einen Pfad zurück, der die Basis nur als Präfix teilt', () => {
		expect(resolveSafeTarget(baseDir, '../uploads-backup/datei.jpg')).toBeNull();
	});

	it('erlaubt einen internen Rücksprung, der die Basis nicht verlässt', () => {
		expect(resolveSafeTarget(baseDir, 'ref/unter/../datei.jpg')).toBe(
			'/srv/app/uploads/ref/datei.jpg'
		);
	});

	it('behandelt einen doppelten Punkt im Dateinamen als gewöhnlichen Namen', () => {
		// Real im Bestand: `1538584452187..jpg` gehört zu einer echten Sichtung.
		// `..` hat nur als vollständiger Pfadabschnitt Bedeutung.
		expect(resolveSafeTarget(baseDir, 'ref/1538584452187..jpg')).toBe(
			'/srv/app/uploads/ref/1538584452187..jpg'
		);
	});
});

describe('cleanupOrphans', () => {
	const NOW = new Date('2026-07-28T12:00:00.000Z');
	const HOUR = 60 * 60 * 1000;

	/** Ports mit Aufzeichnung der Löschreihenfolge. */
	function ports(rows: OrphanRow[] = [], files: DiskEntry[] | null = []) {
		const order: string[] = [];
		const port = {
			order,
			findOrphanRows: vi.fn(async () => rows),
			findOrphanFiles: vi.fn(async () => files),
			deleteRow: vi.fn(async (id: number) => {
				order.push(`row:${id}`);
			}),
			deleteFile: vi.fn(async (path: string) => {
				order.push(`file:${path}`);
			})
		};
		return port;
	}

	function run(port: ReturnType<typeof ports>, over: Partial<Parameters<typeof cleanupOrphans>[0]> = {}) {
		return cleanupOrphans({
			now: NOW,
			retentionMs: 24 * HOUR,
			execute: true,
			limit: 500,
			ports: port as unknown as CleanupPorts,
			...over
		});
	}

	it('fragt beide Klassen mit derselben Grenze ab', () => {
		const p = ports();
		return run(p, { execute: false }).then(() => {
			const cutoff = new Date('2026-07-27T12:00:00.000Z');
			expect(p.findOrphanRows).toHaveBeenCalledWith(cutoff);
			expect(p.findOrphanFiles).toHaveBeenCalledWith(cutoff);
		});
	});

	it('löscht im Vorschaumodus nichts und liefert die Fundstücke', async () => {
		const p = ports([buildRow({ id: 7 })]);
		const report = await run(p, { execute: false });

		expect(p.deleteRow).not.toHaveBeenCalled();
		expect(p.deleteFile).not.toHaveBeenCalled();
		expect(report.rowsFound).toBe(1);
		expect(report.preview?.rows.map((row) => row.id)).toEqual([7]);
	});

	it('löscht erst die Zeile, dann die Datei', async () => {
		// Andersherum entstünde eine Zeile ohne Datei — die sieht der Nutzer
		// als kaputtes Bild. Siehe .claude/rules/upload.md.
		const p = ports([buildRow({ id: 1, filePath: 'a/b.jpg' })]);
		await run(p);

		expect(p.order).toEqual(['row:1', 'file:a/b.jpg']);
	});

	it('zählt die Zeile als gelöscht, auch wenn die Datei nicht weggeht', async () => {
		const p = ports([buildRow({ id: 1, filePath: 'a/b.jpg' })]);
		p.deleteFile.mockRejectedValue(new Error('storage weg'));
		const report = await run(p);

		expect(report.rowsDeleted).toBe(1);
		expect(report.filesDeleted).toBe(0);
		expect(report.failed).toBe(1);
	});

	it('macht nach einem Fehler mit den übrigen Fundstücken weiter', async () => {
		const p = ports([buildRow({ id: 1 }), buildRow({ id: 2 })]);
		p.deleteRow.mockImplementation(async (id: number) => {
			if (id === 1) throw new Error('DB weg');
			p.order.push(`row:${id}`);
		});
		const report = await run(p);

		expect(report.rowsDeleted).toBe(1);
		expect(report.failed).toBe(1);
	});

	it('deckelt die Fundstücke und meldet den Rest', async () => {
		const p = ports([buildRow({ id: 1 }), buildRow({ id: 2 }), buildRow({ id: 3 })]);
		const report = await run(p, { limit: 2 });

		expect(report.rowsDeleted).toBe(2);
		expect(report.remaining).toBe(1);
	});

	it('behandelt einen Provider ohne Dateisystem als erfolgreichen Lauf', async () => {
		const p = ports([], null);
		const report = await run(p);

		expect(report.filesFound).toBeNull();
		expect(report.failed).toBe(0);
	});

	it('deckelt auch die Vorschau-Liste, nicht nur das Löschen', async () => {
		// Sonst lieferte ein großer Rückstand eine Antwort von etlichen MB und
		// die Admin-Oberfläche müsste sie alle rendern.
		const p = ports([buildRow({ id: 1 }), buildRow({ id: 2 }), buildRow({ id: 3 })]);
		const report = await run(p, { execute: false, limit: 2 });

		expect(report.rowsFound).toBe(3);
		expect(report.preview?.rows).toHaveLength(2);
	});

	it('räumt auch Dateien ohne Zeile ab', async () => {
		const p = ports([], [buildEntry({ relativePath: 'ref/waise.jpg' })]);
		const report = await run(p);

		expect(report.filesDeleted).toBe(1);
		expect(p.order).toEqual(['file:ref/waise.jpg']);
	});
});
