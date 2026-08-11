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
		// Befund 2: eine Datei ohne jeden Fund fiel bisher ganz aus dem Bericht —
		// nicht einmal als Zeile mit 0. Jede gescannte Datei erscheint jetzt im
		// Abschnitt "Botschaften je Datei", auch ohne Fundstellen oder
		// Übersprungene.
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

/** Alle Fundstellen des Plans zu einem Botschaftskatalog zusammengefasst, alphabetisch sortiert. */
export function collectMessages(plan: ExtractionPlan): Record<string, string> {
	const messages: Record<string, string> = {};
	for (const f of plan.files) {
		for (const site of f.sites) {
			messages[site.key] = site.text;
		}
	}
	return sortByKey(messages);
}

export interface MessageConflict {
	key: string;
	existingValue: string;
	incomingValue: string;
}

export interface MessageMergeResult {
	merged: Record<string, string>;
	conflicts: MessageConflict[];
}

/**
 * Fügt einen neuen Katalog in einen bestehenden ein.
 *
 * Ein bestehender Schlüssel mit ABWEICHENDEM Wert wird nicht überschrieben,
 * sondern als Konflikt gemeldet — sonst ginge eine bereits gepflegte
 * Übersetzung (etwa in `messages/en.json`) beim nächsten Lauf still verloren.
 * Gleicher Wert oder ein neuer Schlüssel sind kein Konflikt.
 */
export function mergeMessageCatalogue(
	existing: Record<string, string>,
	incoming: Record<string, string>
): MessageMergeResult {
	const conflicts: MessageConflict[] = [];
	const merged: Record<string, string> = { ...existing };
	for (const [key, value] of Object.entries(incoming)) {
		const currentValue = merged[key];
		if (currentValue !== undefined && currentValue !== value) {
			conflicts.push({ key, existingValue: currentValue, incomingValue: value });
			continue;
		}
		merged[key] = value;
	}
	return { merged: sortByKey(merged), conflicts };
}

/**
 * Sortiert nach Codepoint, nicht nach lokalisiertem Vergleich.
 *
 * `localeCompare` ohne gebundenes Locale hängt vom Default-Locale und
 * ICU-Build der ausführenden Node-Umgebung ab — derselbe Lauf kann auf zwei
 * Maschinen zwei verschiedene Schlüsselreihenfolgen in `messages/*.json`
 * erzeugen, ohne dass sich der Inhalt ändert (Befund A). Der einfache
 * `<`/`>`-Vergleich auf Strings vergleicht UTF-16-Codeeinheiten und ist damit
 * überall deterministisch gleich.
 */
function sortByKey(record: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
	);
}
