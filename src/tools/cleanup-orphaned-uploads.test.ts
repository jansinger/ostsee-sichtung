import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	assertLocalStorage,
	computeCutoff,
	normalizeRelativePath,
	parseCliOptions,
	parseRetention,
	resolveConnectionString,
	resolveSafeTarget,
	selectOrphanedFiles,
	selectOrphanedRows,
	type DiskEntry,
	type OrphanRow
} from './cleanup-orphaned-uploads';

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

describe('parseCliOptions', () => {
	it('verwendet 24h und Dry-Run als Vorgabe', () => {
		const options = parseCliOptions([], {});

		expect(options.retentionMs).toBe(24 * 60 * 60 * 1000);
		expect(options.execute).toBe(false);
		expect(options.verbose).toBe(false);
	});

	it('übernimmt --older-than', () => {
		expect(parseCliOptions(['--older-than=7d'], {}).retentionMs).toBe(7 * 24 * 60 * 60 * 1000);
	});

	it('schaltet mit --execute scharf', () => {
		expect(parseCliOptions(['--execute'], {}).execute).toBe(true);
	});

	it('erkennt --verbose', () => {
		expect(parseCliOptions(['--verbose'], {}).verbose).toBe(true);
	});

	it('löst das Upload-Verzeichnis wie die Anwendung auf', () => {
		expect(parseCliOptions([], {}).uploadsDir).toBe(resolve('uploads'));
	});

	it('übernimmt --uploads-dir', () => {
		expect(parseCliOptions(['--uploads-dir=/data/uploads'], {}).uploadsDir).toBe('/data/uploads');
	});

	it('weist ein unbekanntes Argument zurück', () => {
		expect(() => parseCliOptions(['--force'], {})).toThrow(/Unbekanntes Argument/);
	});

	it('weist eine ungültige Frist zurück', () => {
		expect(() => parseCliOptions(['--older-than=morgen'], {})).toThrow(/Ungültige Frist/);
	});
});

describe('resolveConnectionString', () => {
	it('bevorzugt DATABASE_POSTGRES_URL', () => {
		const env = {
			DATABASE_POSTGRES_URL: 'postgresql://a/1',
			DATABASE_URL: 'postgresql://b/2'
		};

		expect(resolveConnectionString(env)).toBe('postgresql://a/1');
	});

	it('fällt auf DATABASE_URL zurück', () => {
		expect(resolveConnectionString({ DATABASE_URL: 'postgresql://b/2' })).toBe('postgresql://b/2');
	});

	it('wirft, wenn keine Verbindung gesetzt ist — es wird nicht geraten', () => {
		expect(() => resolveConnectionString({})).toThrow(/DATABASE_POSTGRES_URL/);
	});

	it('nennt in der Fehlermeldung beide akzeptierten Variablen', () => {
		// Die Meldung nannte nur DATABASE_POSTGRES_URL, obwohl DATABASE_URL
		// ebenfalls akzeptiert wird — im Betrieb irreführend.
		expect(() => resolveConnectionString({})).toThrow(/DATABASE_URL/);
	});
});

describe('assertLocalStorage', () => {
	it('lässt einen leeren STORAGE_PROVIDER durch', () => {
		expect(() => assertLocalStorage({})).not.toThrow();
	});

	it('lässt local durch', () => {
		expect(() => assertLocalStorage({ STORAGE_PROVIDER: 'local' })).not.toThrow();
	});

	it('bricht bei vercel-blob ab', () => {
		expect(() => assertLocalStorage({ STORAGE_PROVIDER: 'vercel-blob' })).toThrow(
			/nur für local storage/i
		);
	});
});
