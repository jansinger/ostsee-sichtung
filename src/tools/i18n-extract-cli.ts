/**
 * CLI für den i18n-Extraktor.
 *
 * **Voreinstellung ist weiterhin der Trockenlauf.** Ohne Schalter wird nichts
 * geschrieben; der Bericht geht nach stdout, wer ihn behalten will, leitet um.
 *
 * Der Grund steht im Auftrag: erst ein Trockenlauf mit Diff-Vorschau, dann die
 * Anwendung. Ein Werkzeug, das beides von Anfang an kann, wird beim ersten
 * ungeduldigen Lauf mit einem Schreib-Schalter benutzt, bevor jemand den Diff
 * gelesen hat.
 *
 * Seit Aufgabe 3.1 gibt es genau EINEN Schreib-Schalter: `--write-messages`.
 * Er schreibt ausschließlich `messages/de.json` und `messages/en.json` — die
 * Botschaften aus `planExtraction()`, einsortiert in die vorhandenen Dateien.
 * Der strukturelle Umbau der Quelldateien (17 formOptions-Module) bleibt
 * bewusst Handarbeit (Aufgabe 3.2/3.3): Er lässt sich nicht mechanisch
 * ableiten, siehe die Warnung in `render.ts` zur Modulkonstante. Diese Datei
 * kennt deshalb absichtlich keinen Schalter, der Quelldateien anfassen würde —
 * nur den einen oben für den Botschaftskatalog.
 *
 * Diese Datei ist bewusst eine dünne Hülle: Argumente lesen, `planExtraction`
 * rufen, Bericht ausgeben — und, nur mit `--write-messages`, den
 * Botschaftskatalog schreiben. Die eigentliche API steht in
 * `i18n-extract/plan.ts`.
 *
 * Ausführung: `npm run i18n:extract` (Trockenlauf) oder
 * `npm run i18n:extract -- --write-messages`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectMessages, mergeMessageCatalogue, planExtraction } from './i18n-extract/plan';
import { renderDryRunReport } from './i18n-extract/render';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '..', '..');

/** Die einzigen zwei Pfade, die `--write-messages` je anfasst. */
const DE_MESSAGES_PATH = 'messages/de.json';
const EN_MESSAGES_PATH = 'messages/en.json';

function readCatalogue(root: string, relativePath: string): Record<string, string> {
	const raw = readFileSync(resolve(root, relativePath), 'utf-8');
	return JSON.parse(raw) as Record<string, string>;
}

function formatConflict(c: { key: string; existingValue: string; incomingValue: string }): string {
	return `  - ${c.key}: vorhanden "${c.existingValue}" ≠ neu "${c.incomingValue}"`;
}

/**
 * Schreibt den Botschaftskatalog aus `plan` in `messages/de.json` und
 * `messages/en.json`, einsortiert in die vorhandenen Dateien.
 *
 * Bricht ohne zu schreiben ab, wenn ein bestehender Schlüssel in einer der
 * beiden Dateien einen abweichenden Wert trägt (siehe `mergeMessageCatalogue`
 * in `plan.ts`) — sonst ginge z. B. eine gepflegte englische Übersetzung in
 * `en.json` beim nächsten Lauf still verloren.
 */
export function writeMessageCatalogue(
	root: string,
	plan: ReturnType<typeof planExtraction>
): { written: boolean; conflicts: string[] } {
	const incoming = collectMessages(plan);
	const existingDe = readCatalogue(root, DE_MESSAGES_PATH);
	const existingEn = readCatalogue(root, EN_MESSAGES_PATH);

	const de = mergeMessageCatalogue(existingDe, incoming);
	// en.json bekommt denselben deutschen Wortlaut — Etappe 1 liefert die
	// Mechanik, nicht die Übersetzung.
	const en = mergeMessageCatalogue(existingEn, incoming);

	const conflictLines = [...de.conflicts, ...en.conflicts].map(formatConflict);
	if (conflictLines.length > 0) {
		return { written: false, conflicts: conflictLines };
	}

	writeFileSync(resolve(root, DE_MESSAGES_PATH), `${JSON.stringify(de.merged, null, '\t')}\n`);
	writeFileSync(resolve(root, EN_MESSAGES_PATH), `${JSON.stringify(en.merged, null, '\t')}\n`);
	return { written: true, conflicts: [] };
}

export function main(argv: string[]): void {
	const rootArg = argv.find((arg) => arg.startsWith('--root='));
	const root = rootArg ? resolve(rootArg.slice('--root='.length)) : DEFAULT_ROOT;
	const plan = planExtraction(root);
	console.log(renderDryRunReport(plan));

	if (argv.includes('--write-messages')) {
		const result = writeMessageCatalogue(root, plan);
		if (!result.written) {
			console.error('Abgebrochen — bestehende Schlüssel mit abweichendem Wert:');
			for (const line of result.conflicts) {
				console.error(line);
			}
			process.exitCode = 1;
			return;
		}
		console.log(`Geschrieben: ${DE_MESSAGES_PATH}, ${EN_MESSAGES_PATH}`);
	}
}

const isMainModule =
	typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
	main(process.argv.slice(2));
}
