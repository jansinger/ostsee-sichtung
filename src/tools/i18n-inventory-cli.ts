/**
 * CLI für das i18n-Inventar (`src/tools/i18n-inventory.ts`).
 *
 * Liest nur, schreibt ausschließlich die beiden Berichtsdateien unter `docs/`:
 *  - `docs/i18n-inventory.json` (maschinenlesbar, alle Funde)
 *  - `docs/i18n-inventory.md`   (menschenlesbar, gruppiert nach Kategorie/Datei)
 *
 * `docs/` statt `src/tools/out/` (wie bei `render-baltic-review.ts`), weil dieser
 * Bericht kein Zwischenergebnis eines Build-Schritts ist, sondern die
 * Entscheidungsgrundlage für die Übersetzungs-Planung — an derselben Stelle wie die
 * übrige Projektdokumentation, damit er beim nächsten `docs/`-Blick auffindbar bleibt.
 *
 * Optionen:
 *   --include-admin   Bezieht /admin-Routen und src/lib/components/admin/ mit ein
 *                      (Default: ausgeschlossen — siehe Auftrag "öffentlicher Bereich")
 *   --root=<pfad>      Repository-Wurzel (Default: zwei Ebenen über dieser Datei)
 *
 * Ausführung: `npm run i18n:inventory` (tsx, wie die übrigen `.ts`-Werkzeuge hier).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderMarkdownReport, runInventory } from './i18n-inventory';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '..', '..');

interface CliOptions {
	root: string;
	includeAdmin: boolean;
}

export function parseCliOptions(argv: string[]): CliOptions {
	let root = DEFAULT_ROOT;
	let includeAdmin = false;
	for (const arg of argv) {
		if (arg === '--include-admin') {
			includeAdmin = true;
		} else if (arg.startsWith('--root=')) {
			root = resolve(arg.slice('--root='.length));
		}
	}
	return { root, includeAdmin };
}

export function main(argv: string[]): void {
	const options = parseCliOptions(argv);
	const result = runInventory({ root: options.root, includeAdmin: options.includeAdmin });

	const outDir = resolve(options.root, 'docs');
	mkdirSync(outDir, { recursive: true });

	const jsonPath = resolve(outDir, 'i18n-inventory.json');
	const markdownPath = resolve(outDir, 'i18n-inventory.md');

	writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
	writeFileSync(markdownPath, renderMarkdownReport(result), 'utf-8');

	const { summary } = result;
	console.log(
		[
			`i18n-Inventar: ${summary.totalFindings} Funde` +
				(options.includeAdmin ? ' (inkl. Admin-Bereich)' : ' (öffentlicher Bereich)'),
			`  uebersetzbar: ${summary.byCategory.uebersetzbar}`,
			`  technisch:    ${summary.byCategory.technisch}`,
			`  unklar:       ${summary.byCategory.unklar}`,
			`  → uebersetzbar + unklar: ${summary.byCategory.uebersetzbar + summary.byCategory.unklar}`,
			'',
			`JSON:     ${jsonPath}`,
			`Markdown: ${markdownPath}`
		].join('\n')
	);
}

// `pathToFileURL` statt Zeichenkettenbau: `import.meta.url` ist eine korrekt
// kodierte `file://`-URL, ein selbstgebauter String wäre es unter Windows/mit
// Sonderzeichen im Pfad nicht zuverlässig — siehe cleanup-orphaned-uploads.ts.
const isMainModule =
	typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
	main(process.argv.slice(2));
}
