import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
	computeMigrationHash,
	decideStartupAction,
	findPendingMigrations,
	parseJournal,
	scanForDestructiveStatements,
	type JournalEntry
} from '../../scripts/docker-migrate';

/**
 * Baut einen Journal-JSON-String im echten drizzle-kit-Format.
 */
function buildJournalRaw(entries: Array<{ idx: number; when: number; tag: string }>): string {
	return JSON.stringify({
		version: '7',
		dialect: 'postgresql',
		entries: entries.map((entry) => ({
			idx: entry.idx,
			version: '7',
			when: entry.when,
			tag: entry.tag,
			breakpoints: true
		}))
	});
}

describe('parseJournal', () => {
	it('parst ein gültiges Journal mit einem Eintrag', () => {
		// Arrange
		const raw = buildJournalRaw([{ idx: 0, when: 1722160000000, tag: '0000_initial' }]);

		// Act
		const entries = parseJournal(raw);

		// Assert
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			idx: 0,
			when: 1722160000000,
			tag: '0000_initial'
		});
	});

	it('sortiert unsortierte Einträge aufsteigend nach when', () => {
		// Arrange
		const raw = buildJournalRaw([
			{ idx: 2, when: 1722160003000, tag: '0002_third' },
			{ idx: 0, when: 1722160001000, tag: '0000_first' },
			{ idx: 1, when: 1722160002000, tag: '0001_second' }
		]);

		// Act
		const entries = parseJournal(raw);

		// Assert
		expect(entries.map((entry) => entry.tag)).toEqual(['0000_first', '0001_second', '0002_third']);
		expect(entries.map((entry) => entry.when)).toEqual([
			1722160001000, 1722160002000, 1722160003000
		]);
	});

	it('gibt ein leeres Array für ein Journal ohne Einträge zurück', () => {
		// Arrange
		const raw = buildJournalRaw([]);

		// Act
		const entries = parseJournal(raw);

		// Assert
		expect(entries).toEqual([]);
	});

	it('wirft einen Fehler bei ungültigem JSON', () => {
		// Arrange
		const raw = '{ kein valides json';

		// Act & Assert
		expect(() => parseJournal(raw)).toThrow();
	});

	it('wirft einen Fehler, wenn entries fehlt', () => {
		// Arrange
		const raw = JSON.stringify({ version: '7', dialect: 'postgresql' });

		// Act & Assert
		expect(() => parseJournal(raw)).toThrow();
	});

	it('wirft einen Fehler, wenn entries kein Array ist', () => {
		// Arrange
		const raw = JSON.stringify({ version: '7', dialect: 'postgresql', entries: 'nope' });

		// Act & Assert
		expect(() => parseJournal(raw)).toThrow();
	});
});

describe('findPendingMigrations', () => {
	const entries: JournalEntry[] = [
		{ idx: 0, when: 1722160001000, tag: '0000_first' },
		{ idx: 1, when: 1722160002000, tag: '0001_second' },
		{ idx: 2, when: 1722160003000, tag: '0002_third' }
	];

	it('gibt alle Einträge zurück, wenn lastAppliedCreatedAt null ist', () => {
		// Act
		const pending = findPendingMigrations(entries, null);

		// Assert
		expect(pending).toEqual(entries);
	});

	it('gibt nur Einträge mit when größer als lastAppliedCreatedAt zurück', () => {
		// Act
		const pending = findPendingMigrations(entries, 1722160001000);

		// Assert
		expect(pending.map((entry) => entry.tag)).toEqual(['0001_second', '0002_third']);
	});

	it('behandelt when gleich lastAppliedCreatedAt als bereits angewendet (nicht pending)', () => {
		// Act
		const pending = findPendingMigrations(entries, 1722160003000);

		// Assert
		expect(pending).toEqual([]);
	});

	it('gibt für ein leeres Array ein leeres Array zurück', () => {
		// Act
		const pending = findPendingMigrations([], null);

		// Assert
		expect(pending).toEqual([]);
	});
});

describe('scanForDestructiveStatements', () => {
	it('erkennt DROP TABLE', () => {
		// Arrange
		const sql = 'DROP TABLE "sichtungen";';

		// Act
		const findings = scanForDestructiveStatements(sql);

		// Assert
		expect(findings).toHaveLength(1);
		expect(findings[0]).toMatch(/drop table/i);
	});

	it('erkennt DROP COLUMN in einem ALTER TABLE Statement', () => {
		// Arrange
		const sql = 'ALTER TABLE "sichtungen" DROP COLUMN "alter_wert";';

		// Act
		const findings = scanForDestructiveStatements(sql);

		// Assert
		expect(findings).toHaveLength(1);
		expect(findings[0]).toMatch(/drop column/i);
	});

	it('erkennt DROP COLUMN in einem mehrzeiligen ALTER TABLE Statement', () => {
		// Arrange
		const sql = ['ALTER TABLE "sichtungen"', '  DROP COLUMN "alter_wert";'].join('\n');

		// Act
		const findings = scanForDestructiveStatements(sql);

		// Assert
		expect(findings).toHaveLength(1);
		expect(findings[0]).toMatch(/drop column/i);
	});

	it('erkennt TRUNCATE in gemischter Groß-/Kleinschreibung', () => {
		// Arrange
		const sql = 'TrUnCaTe "sichtungen";';

		// Act
		const findings = scanForDestructiveStatements(sql);

		// Assert
		expect(findings).toHaveLength(1);
		expect(findings[0]).toMatch(/truncate/i);
	});

	it('meldet mehrere Funde in einem Text als mehrere Einträge', () => {
		// Arrange
		const sql = [
			'DROP TABLE "alt_tabelle";',
			'ALTER TABLE "sichtungen" DROP COLUMN "alt";',
			'TRUNCATE "logs";'
		].join('\n');

		// Act
		const findings = scanForDestructiveStatements(sql);

		// Assert
		expect(findings).toHaveLength(3);
	});

	it('ignoriert destruktive Statements in SQL-Zeilenkommentaren', () => {
		// Arrange
		const sql = [
			'-- drop table "sichtungen";',
			'-- TRUNCATE "logs";',
			'CREATE INDEX "idx_datum" ON "sichtungen" ("sichtungsdatum");'
		].join('\n');

		// Act
		const findings = scanForDestructiveStatements(sql);

		// Assert
		expect(findings).toEqual([]);
	});

	it('gibt für nicht-destruktive Statements ein leeres Array zurück', () => {
		// Arrange
		const sql = [
			'CREATE TABLE "neu" ("id" serial PRIMARY KEY);',
			'CREATE INDEX "idx_neu" ON "neu" ("id");',
			'ALTER TABLE "sichtungen" ADD COLUMN "neues_feld" text;'
		].join('\n');

		// Act
		const findings = scanForDestructiveStatements(sql);

		// Assert
		expect(findings).toEqual([]);
	});

	it('gibt für einen leeren String ein leeres Array zurück', () => {
		// Act
		const findings = scanForDestructiveStatements('');

		// Assert
		expect(findings).toEqual([]);
	});

	it('erkennt destruktiven Code auch, wenn nur ein Teil der Zeile kommentiert ist', () => {
		// Arrange: Kommentar am Zeilenende, destruktives Statement davor
		const sql = 'DROP TABLE "sichtungen"; -- alte Tabelle entfernen';

		// Act
		const findings = scanForDestructiveStatements(sql);

		// Assert
		expect(findings).toHaveLength(1);
		expect(findings[0]).toMatch(/drop table/i);
	});
});

describe('decideStartupAction', () => {
	it('wirft einen Fehler, wenn das Journal keine Migrationen enthält', () => {
		// Arrange
		const state = { appliedCount: 0, journalCount: 0, coreTableExists: false };

		// Act & Assert
		expect(() => decideStartupAction(state)).toThrow();
	});

	it('entscheidet auf baseline für eine bestehende db:push-Datenbank ohne angewendete Migrationen', () => {
		// Arrange
		const state = { appliedCount: 0, journalCount: 3, coreTableExists: true };

		// Act
		const action = decideStartupAction(state);

		// Assert
		expect(action).toBe('baseline');
	});

	it('entscheidet auf migrate für eine frische Datenbank', () => {
		// Arrange
		const state = { appliedCount: 0, journalCount: 3, coreTableExists: false };

		// Act
		const action = decideStartupAction(state);

		// Assert
		expect(action).toBe('migrate');
	});

	it('entscheidet auf migrate bei Folge-Deploy mit bestehender Kern-Tabelle', () => {
		// Arrange
		const state = { appliedCount: 2, journalCount: 3, coreTableExists: true };

		// Act
		const action = decideStartupAction(state);

		// Assert
		expect(action).toBe('migrate');
	});

	it('entscheidet auf migrate bei Folge-Deploy auch ohne Kern-Tabelle', () => {
		// Arrange
		const state = { appliedCount: 2, journalCount: 3, coreTableExists: false };

		// Act
		const action = decideStartupAction(state);

		// Assert
		expect(action).toBe('migrate');
	});
});

describe('computeMigrationHash', () => {
	it('berechnet den SHA-256-Hex-Hash identisch zum Drizzle-Migrator', () => {
		// Arrange
		const sqlContent = 'CREATE TABLE "sichtungen" ("id" serial PRIMARY KEY);\n';
		const expected = createHash('sha256').update(sqlContent).digest('hex');

		// Act
		const hash = computeMigrationHash(sqlContent);

		// Assert
		expect(hash).toBe(expected);
	});

	it('berechnet auch für einen leeren String den korrekten Hash', () => {
		// Arrange
		const expected = createHash('sha256').update('').digest('hex');

		// Act
		const hash = computeMigrationHash('');

		// Assert
		expect(hash).toBe(expected);
	});

	it('liefert unterschiedliche Hashes für unterschiedliche Inhalte', () => {
		// Act
		const hashA = computeMigrationHash('SELECT 1;');
		const hashB = computeMigrationHash('SELECT 2;');

		// Assert
		expect(hashA).not.toBe(hashB);
	});
});
