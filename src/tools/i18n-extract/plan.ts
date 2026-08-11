/**
 * Die eigentliche API des Werkzeugs: Dateien lesen, Fundstellen sammeln, den
 * Plan zurückgeben. Schreibt nichts — siehe `apply.ts` für die
 * Quelltransformation und `render.ts` für den Bericht.
 *
 * Aus `i18n-extract-cli.ts` hierher verschoben (Befund E), damit die CLI eine
 * dünne Hülle bleibt: Argumente lesen, `planExtraction` rufen, Bericht
 * ausgeben.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applySitesToSource } from './apply';
import { collectFormOptionsSites, collectSchemaSites } from './collect';
import { createKeyRegistry } from './messageKey';
import type { ExtractionPlan } from './render';

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
