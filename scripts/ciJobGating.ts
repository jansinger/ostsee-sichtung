/**
 * Welche CI-Jobs laufen für eine gegebene Menge geänderter Dateien?
 *
 * Die Antwort steht in `.github/workflows/ci.yml` — verteilt auf zwei
 * `dorny/paths-filter`-Schritte, die `outputs:` des `changes`-Jobs und die
 * `if:`-Bedingungen der übrigen Jobs. Dieses Modul liest genau diese Stellen
 * und rechnet sie nach; es hält **keine** zweite Kopie der Filterlisten.
 *
 * Der Grund für den Aufwand ist der Fehlermodus: Ein zu weit gefasster Filter
 * lässt einen Job **still** aus. Der PR wird grün, ohne dass die Prüfung lief —
 * genau so kamen #636 und #641 durch (siehe Kommentar am `e2e`-Filter in
 * ci.yml). Ein Fehlschlag hier ist die einzige Rückmeldung, die es vor dem
 * Merge gibt.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Dieselbe Glob-Implementierung wie in dorny/paths-filter, mit derselben
 * Option: `picomatch(pattern, { dot: true })`.
 *
 * Der naheliegende Weg wäre `node:path.matchesGlob` gewesen — ohne
 * Abhängigkeit, und für `src/**` oder `*.config.ts` deckungsgleich. Er ist
 * still falsch, sobald Punkt-Verzeichnisse im Spiel sind: `**` läuft dort
 * nicht hinein, `.github/PULL_REQUEST_TEMPLATE.md` gilt damit **nicht** als
 * `**\/*.md`. Der Test hätte dann „Validate läuft" behauptet, während CI den
 * Job überspringt — genau die Richtung, die ein Wächter nicht verwechseln
 * darf. `createRequire` statt `import`, weil picomatch v4 keine Typen
 * mitbringt; die Signatur steht hier lokal.
 */
const picomatch = createRequire(import.meta.url)('picomatch') as (
	pattern: string,
	options?: { dot?: boolean }
) => (input: string) => boolean;

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_PATH = join(REPO_ROOT, '.github/workflows/ci.yml');

export type PredicateQuantifier = 'some' | 'every';

export interface FilterStep {
	/** `id:` des Schritts — so wird er in den `outputs:` referenziert. */
	id: string;
	quantifier: PredicateQuantifier;
	filters: Record<string, string[]>;
}

export type EventName = 'pull_request' | 'push';

export function readWorkflow(): string {
	return readFileSync(WORKFLOW_PATH, 'utf8');
}

/**
 * Ein Muster gegen einen Pfad prüfen — das Muster geht unverändert an
 * picomatch, genau wie in paths-filter.
 *
 * Das führende `!` selbst abzuschneiden und das Ergebnis zu invertieren wäre
 * für `!**\/*.md` dasselbe, aber nicht für alles: `!(foo)` ist bei picomatch
 * ein Extglob („alles außer foo"), keine Negation. Wer es von Hand zerlegt,
 * macht daraus stillschweigend `(foo)` mit umgedrehtem Ergebnis — der Wächter
 * würde bei so einem Filter etwas anderes rechnen als CI. picomatch invertiert
 * negierte Muster ohnehin selbst; das ist die Unterscheidung, die es kennt und
 * wir nicht nachbauen sollten.
 *
 * Negationen werden erst zusammen mit `predicate-quantifier: every` sinnvoll,
 * siehe `evaluateFilters`.
 */
export function matchPattern(pattern: string, file: string): boolean {
	return picomatch(pattern, { dot: true })(file);
}

function parseFilterBlock(lines: string[], stepId: string): Record<string, string[]> {
	const filters: Record<string, string[]> = {};
	let name: string | null = null;

	for (const raw of lines) {
		const line = raw.trim();
		if (line === '' || line.startsWith('#')) continue;

		const filterName = /^([\w-]+):$/.exec(line);
		if (filterName?.[1]) {
			name = filterName[1];
			filters[name] = [];
			continue;
		}

		const pattern = /^-\s*'(.+)'$/.exec(line);
		if (pattern?.[1]) {
			if (!name) throw new Error(`Muster ohne Filternamen in Schritt "${stepId}": ${raw}`);
			filters[name]?.push(pattern[1]);
			continue;
		}

		throw new Error(`Unerwartete Zeile im filters-Block von "${stepId}": ${raw}`);
	}

	return filters;
}

/** Alle `dorny/paths-filter`-Schritte aus dem Workflow, in Reihenfolge. */
export function readFilterSteps(yamlText: string): FilterStep[] {
	const lines = yamlText.split('\n');
	const steps: FilterStep[] = [];
	let id: string | null = null;
	let quantifier: PredicateQuantifier = 'some';

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';

		const stepId = /^\s*id:\s*([\w-]+)\s*$/.exec(line);
		if (stepId?.[1]) {
			id = stepId[1];
			quantifier = 'some';
			continue;
		}

		const quant = /^\s*predicate-quantifier:\s*'?(some|every)'?\s*$/.exec(line);
		if (quant?.[1]) {
			quantifier = quant[1] as PredicateQuantifier;
			continue;
		}

		const blockStart = /^(\s*)filters:\s*\|\s*$/.exec(line);
		if (!blockStart) continue;
		if (!id) throw new Error(`filters-Block ohne vorangehendes "id:" in Zeile ${i + 1}`);

		const blockIndent = (blockStart[1] ?? '').length;
		const block: string[] = [];
		let j = i + 1;
		for (; j < lines.length; j++) {
			const current = lines[j] ?? '';
			if (current.trim() === '') {
				block.push('');
				continue;
			}
			if (current.length - current.trimStart().length <= blockIndent) break;
			block.push(current);
		}

		steps.push({ id, quantifier, filters: parseFilterBlock(block, id) });
		id = null;
		i = j - 1;
	}

	return steps;
}

/**
 * Ein Filter ist wahr, sobald **eine** geänderte Datei ihn erfüllt. Was
 * „erfüllt" heißt, hängt am Quantor: bei `some` reicht ein passendes Muster,
 * bei `every` müssen alle passen. Letzteres ist die Kombination, die aus einer
 * Liste von Negationen ein „es gibt eine Datei, die nichts davon ist" macht.
 */
export function evaluateFilters(step: FilterStep, changedFiles: string[]): Record<string, boolean> {
	const result: Record<string, boolean> = {};

	for (const [name, patterns] of Object.entries(step.filters)) {
		result[name] = changedFiles.some((file) =>
			step.quantifier === 'every'
				? patterns.every((pattern) => matchPattern(pattern, file))
				: patterns.some((pattern) => matchPattern(pattern, file))
		);
	}

	return result;
}

/** Die `outputs:` des `changes`-Jobs als Rohausdrücke, ohne `${{ }}`. */
export function readChangesOutputs(yamlText: string): Record<string, string> {
	const outputs: Record<string, string> = {};

	for (const line of yamlText.split('\n')) {
		const match = /^ {6}([\w-]+):\s*\$\{\{\s*(.+?)\s*\}\}$/.exec(line);
		if (match?.[1] && match[2]) outputs[match[1]] = match[2];
	}

	if (Object.keys(outputs).length === 0) {
		throw new Error('Keine outputs im changes-Job gefunden — hat sich die Einrückung geändert?');
	}

	return outputs;
}

/**
 * Ein GitHub-Ausdruck der Form `a || b || c`, wobei jeder Term entweder
 * `steps.<id>.outputs.<filter> == 'true'` oder `github.event_name == 'push'`
 * ist. Alles andere ist ein Fehler statt eines stillen `false` — ein neuer
 * Ausdruckstyp soll hier auffallen, nicht durchrutschen.
 */
function evaluateExpression(
	expression: string,
	filterOutputs: Record<string, Record<string, boolean>>,
	eventName: EventName
): boolean {
	return expression
		.split('||')
		.map((term) => term.trim())
		.some((term) => {
			if (term === "github.event_name == 'push'") return eventName === 'push';

			const match = /^steps\.([\w-]+)\.outputs\.([\w-]+) == 'true'$/.exec(term);
			if (!match?.[1] || !match[2]) throw new Error(`Unbekannter Ausdruck: ${term}`);

			const step = filterOutputs[match[1]];
			if (!step) throw new Error(`Ausdruck verweist auf unbekannten Schritt: ${match[1]}`);
			if (!(match[2] in step)) throw new Error(`Filter "${match[2]}" existiert nicht`);

			return step[match[2]] === true;
		});
}

/**
 * Welche `needs.changes.outputs.*` ein Job in seinem `if:` liest. Damit prüft
 * der Test die Zuordnung Job → Output gegen die Datei, statt sie ein zweites
 * Mal zu behaupten.
 */
export function readJobGates(yamlText: string): Record<string, string[]> {
	const gates: Record<string, string[]> = {};
	const lines = yamlText.split('\n');
	let job: string | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';

		const jobName = /^ {2}([\w-]+):$/.exec(line);
		if (jobName?.[1]) {
			job = jobName[1];
			gates[job] = [];
			continue;
		}
		if (!job) continue;

		const ifStart = /^ {4}if:\s*(.*)$/.exec(line);
		if (!ifStart) continue;

		let condition = ifStart[1] ?? '';
		if (condition.trim() === '|') {
			condition = '';
			for (let j = i + 1; j < lines.length; j++) {
				const current = lines[j] ?? '';
				if (current.trim() !== '' && current.length - current.trimStart().length <= 4) break;
				condition += `\n${current}`;
			}
		}

		gates[job] = [...condition.matchAll(/needs\.changes\.outputs\.([\w-]+)/g)].map(
			(match) => match[1] as string
		);
	}

	return gates;
}

export interface JobDecision {
	/** Job-Key aus ci.yml → läuft er? */
	[job: string]: boolean;
}

/**
 * Läuft ein Job? Jeder gegatete Job verknüpft seine Outputs mit `&&` (im
 * Workflow stehen sie als `… == 'true' && … == 'true'`), ein Job ohne
 * Output-Verweis läuft immer. Die Zusatzbedingungen, die nicht von den
 * Dateien abhängen (Draft-PR, release-please-Branch, `pull_request`-only),
 * bleiben hier bewusst außen vor — sie sind nicht das, was still ausfällt.
 */
export function jobsFor(
	changedFiles: string[],
	eventName: EventName = 'pull_request'
): JobDecision {
	const yamlText = readWorkflow();

	const filterOutputs: Record<string, Record<string, boolean>> = {};
	for (const step of readFilterSteps(yamlText)) {
		filterOutputs[step.id] = evaluateFilters(step, changedFiles);
	}

	const changesOutputs = readChangesOutputs(yamlText);
	const resolved: Record<string, boolean> = {};
	for (const [name, expression] of Object.entries(changesOutputs)) {
		resolved[name] = evaluateExpression(expression, filterOutputs, eventName);
	}

	const decisions: JobDecision = {};
	for (const [job, outputs] of Object.entries(readJobGates(yamlText))) {
		if (job === 'changes') continue;
		decisions[job] = outputs.every((name) => {
			if (!(name in resolved)) throw new Error(`Job "${job}" liest unbekannten Output: ${name}`);
			return resolved[name] === true;
		});
	}

	return decisions;
}
