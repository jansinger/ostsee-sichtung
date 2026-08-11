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
 * Diese Datei ist bewusst eine dünne Hülle: Argumente lesen, `planExtraction`
 * rufen, Bericht ausgeben. Die eigentliche API steht in
 * `i18n-extract/plan.ts`.
 *
 * Ausführung: `npm run i18n:extract`
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { planExtraction } from './i18n-extract/plan';
import { renderDryRunReport } from './i18n-extract/render';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '..', '..');

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
