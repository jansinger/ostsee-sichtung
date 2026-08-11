/**
 * CLI für den i18n-Extraktor.
 *
 * **Diese Betriebsart ist der Trockenlauf, und in Aufgabe 1 die einzige.** Es
 * gibt keinen Schreib-Schalter (kein „apply", keinen Schreibpfad und keinen
 * Schalter, der einen erzeugt). Der Bericht geht nach stdout; wer ihn behalten
 * will, leitet um.
 *
 * Der Grund steht im Auftrag: erst ein Trockenlauf mit Diff-Vorschau, dann die
 * Anwendung. Ein Werkzeug, das beides von Anfang an kann, wird beim ersten
 * ungeduldigen Lauf mit einem Schreib-Schalter benutzt, bevor jemand den Diff
 * gelesen hat.
 *
 * Ausführung: `npm run i18n:extract`
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectFormOptionsSites, collectSchemaSites } from './i18n-extract/collect';
import { createKeyRegistry } from './i18n-extract/messageKey';
import { applySitesToSource, renderDryRunReport, type ExtractionPlan } from './i18n-extract/render';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '..', '..');

const SCHEMA_FILE = 'src/lib/form/validation/sightingSchema.ts';
const FORM_OPTIONS_DIR = 'src/lib/report/formOptions';

/** Minimal-Schnittstelle für Dateizugriff — austauschbar für Tests. */
export interface ExtractFileSystem {
	readFile(relativePath: string): string;
	listFormOptionFiles(): string[];
}

export function createNodeFileSystem(root: string): ExtractFileSystem {
	return {
		readFile: (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf-8'),
		listFormOptionFiles: () =>
			readdirSync(resolve(root, FORM_OPTIONS_DIR))
				.filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
				.sort()
				.map((name) => `${FORM_OPTIONS_DIR}/${name}`)
	};
}

/**
 * Plant die Extraktion. Liest, rechnet, gibt zurück — schreibt nichts.
 *
 * Schema und formOptions teilen sich EIN Schlüsselregister. Sonst könnten
 * `sighting_…` und `formoptions_…` zwar nicht kollidieren, aber der
 * Kollisionszähler liefe je Quelle getrennt und wäre nicht mehr reproduzierbar.
 */
export function planExtraction(
	root: string,
	fs: ExtractFileSystem = createNodeFileSystem(root)
): ExtractionPlan {
	const taken = createKeyRegistry();
	const files: ExtractionPlan['files'] = [];
	const skipped: ExtractionPlan['skipped'] = [];

	const schemaSource = fs.readFile(SCHEMA_FILE);
	const schemaResult = collectSchemaSites(schemaSource, SCHEMA_FILE, taken);
	files.push({
		file: SCHEMA_FILE,
		before: schemaSource,
		after: applySitesToSource(schemaSource, schemaResult.sites),
		sites: schemaResult.sites
	});
	skipped.push(...schemaResult.skipped);

	for (const relativePath of fs.listFormOptionFiles()) {
		const source = fs.readFile(relativePath);
		const result = collectFormOptionsSites(source, relativePath, taken);
		if (result.sites.length === 0 && result.skipped.length === 0) {
			continue;
		}
		files.push({
			file: relativePath,
			before: source,
			after: applySitesToSource(source, result.sites),
			sites: result.sites
		});
		skipped.push(...result.skipped);
	}

	return { files, skipped };
}

export function main(argv: string[]): void {
	const rootArg = argv.find((arg) => arg.startsWith('--root='));
	const root = rootArg ? resolve(rootArg.slice('--root='.length)) : DEFAULT_ROOT;
	console.log(renderDryRunReport(planExtraction(root)));
}

const isMainModule =
	typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
	main(process.argv.slice(2));
}
