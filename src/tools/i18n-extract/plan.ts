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
import { applySitesToSource, applySvelteSitesToSource } from './apply';
import { collectFormOptionsSites, collectSchemaSites, collectSvelteSites } from './collect';
import { createKeyRegistry } from './messageKey';
import type { ExtractionPlan } from './render';

const SCHEMA_FILE = 'src/lib/form/validation/sightingSchema.ts';
const FORM_OPTIONS_DIR = 'src/lib/report/formOptions';

/**
 * Der Umfang für Schicht C (Aufgabe 2.2/Befund): `.svelte`-Dateien unter
 * `src/`, öffentlicher Bereich — siehe `docs/i18n/PLAN_ETAPPE2.md` und
 * `docs/DESIGN_MEHRSPRACHIGKEIT_2026-08-10.md` Abschnitt 4.2.
 */
const SVELTE_SCOPE_ROOT = 'src';

/**
 * Verzeichnis-Ausschlüsse, je mit Begründung. Ein Verzeichnis unter
 * `src/routes/admin/` (etwa `src/routes/admin/docs/`) fällt bereits über den
 * `src/routes/admin/`-Eintrag heraus — kein eigener Eintrag nötig.
 */
export const SVELTE_SCOPE_EXCLUDED_PREFIXES: ReadonlyArray<{
	readonly prefix: string;
	readonly reason: string;
}> = [
	{
		prefix: 'src/routes/styleguide/',
		reason: 'Entwicklerfläche, laut Entwurf 4.2 nie lokalisiert'
	},
	{
		prefix: 'src/routes/docs/',
		reason:
			'Entwicklerfläche, laut Entwurf 4.2 nie lokalisiert (deckt auch src/routes/admin/docs/ nicht ab — das läuft über den admin-Eintrag unten)'
	},
	{
		prefix: 'src/routes/admin/',
		reason:
			'Admin wird nicht lokalisiert (Entwurf 4.2/4.3) — schließt src/routes/admin/docs/ mit ein'
	},
	{
		prefix: 'src/lib/components/admin/',
		reason: 'Admin wird nicht lokalisiert (Entwurf 4.2/4.3)'
	}
];

/** Einzelne Dateien, die keinem Verzeichnis-Ausschluss oben unterliegen. */
export const SVELTE_SCOPE_EXCLUDED_FILES: ReadonlyArray<{
	readonly path: string;
	readonly reason: string;
}> = [
	{
		path: 'src/lib/components/docs/ApiDocumentation.svelte',
		reason: 'Entwicklerfläche (API-Dokumentation), laut Entwurf 4.2 nie lokalisiert'
	}
];

/**
 * Gehört `relativePath` (posix-Trenner, ab Repo-Wurzel, z.B.
 * `src/routes/about/+page.svelte`) zum Umfang von Schicht C?
 *
 * Exportiert, damit die Ausschlussliste isoliert testbar ist — unabhängig
 * davon, ob die aktuelle Dateisystem-Bauart eine feste Liste oder ein
 * Verzeichnis-Scan ist (siehe `createNodeFileSystem.listSvelteFiles` unten).
 */
export function isSveltePathInScope(relativePath: string): boolean {
	if (SVELTE_SCOPE_EXCLUDED_FILES.some((f) => f.path === relativePath)) {
		return false;
	}
	return !SVELTE_SCOPE_EXCLUDED_PREFIXES.some((e) => relativePath.startsWith(e.prefix));
}

/**
 * Läuft `src/` rekursiv ab und sammelt jede `.svelte`-Datei als Pfad ab
 * Repo-Wurzel, mit `/` als Trenner (unabhängig vom Betriebssystem).
 *
 * Bewusst ein Verzeichnis-Scan, keine feste Liste: Eine neue öffentliche
 * `.svelte`-Datei landet automatisch im nächsten Lauf im Umfang, ohne dass
 * irgendwo eine Liste gepflegt werden müsste (Auftrag, Nachweis 3). Die
 * Ausschlussliste bleibt trotzdem explizit benannt (`isSveltePathInScope`) —
 * sie ist der einzige Ort, an dem "nicht im Umfang" eine Begründung trägt.
 */
function walkSvelteFiles(absoluteDir: string, root: string): string[] {
	const found: string[] = [];
	for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
		const absoluteChild = resolve(absoluteDir, entry.name);
		if (entry.isDirectory()) {
			found.push(...walkSvelteFiles(absoluteChild, root));
			continue;
		}
		if (entry.isFile() && entry.name.endsWith('.svelte')) {
			const relativePath = absoluteChild
				.slice(root.length + 1)
				.split(sepRegex)
				.join('/');
			found.push(relativePath);
		}
	}
	return found;
}

const sepRegex = /\\/g;

/** Minimal-Schnittstelle für Dateizugriff — austauschbar für Tests. */
export interface ExtractFileSystem {
	readFile(relativePath: string): string;
	listFormOptionFiles(): string[];
	listSvelteFiles(): string[];
}

export function createNodeFileSystem(root: string): ExtractFileSystem {
	return {
		readFile: (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf-8'),
		listFormOptionFiles: () =>
			readdirSync(resolve(root, FORM_OPTIONS_DIR))
				.filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
				.sort()
				.map((name) => `${FORM_OPTIONS_DIR}/${name}`),
		listSvelteFiles: () =>
			walkSvelteFiles(resolve(root, SVELTE_SCOPE_ROOT), resolve(root))
				.filter(isSveltePathInScope)
				.sort()
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

	// Schicht C (Aufgabe 2.2/Befund): `.svelte`-Dateien im Umfang aus
	// `fs.listSvelteFiles()` — Ausschlüsse (Admin, Styleguide, Docs,
	// ApiDocumentation.svelte) sind bereits dort herausgefiltert
	// (`isSveltePathInScope`). Eigene Ersetzungsform (`applySvelteSitesToSource`)
	// statt `applySitesToSource`: Textknoten und Attribute brauchen je eine
	// andere Zielform als ein Aufrufargument in Schema/formOptions (siehe
	// `apply.ts`).
	for (const relativePath of fs.listSvelteFiles()) {
		const source = fs.readFile(relativePath);
		const result = collectSvelteSites(source, relativePath, taken);
		files.push({
			file: relativePath,
			before: source,
			after: applySvelteSitesToSource(source, result.sites),
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
