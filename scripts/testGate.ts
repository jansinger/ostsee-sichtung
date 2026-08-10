/**
 * Rechnet nach, welche Vitest-Projekte ein npm-Skript tatsächlich fährt.
 *
 * Hintergrund: `test:quick` ist in `CLAUDE.md` und `.claude/rules/testing.md` als
 * das Gate vor jedem Commit benannt, fuhr aber nur `vitest run --project server`.
 * Alle `*.svelte.test.ts` (Projekt `client`) lagen außerhalb — am 2026-08-10 legte
 * ein Branch sieben davon an, die als "grün" galten, ohne dass das Gate sie je
 * angefasst hätte. Der Fehlermodus ist der gefährlichere von beiden: Das Kommando
 * meldet Erfolg für eine Prüfung, die nicht gelaufen ist.
 *
 * Deshalb wird die Abdeckung hier ausgerechnet statt zugesichert — `testGate.test.ts`
 * vergleicht sie mit den Projekten aus `vitest.config.ts`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');

export function readScripts(): Record<string, string> {
	const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
		scripts?: Record<string, string>;
	};
	return pkg.scripts ?? {};
}

/**
 * Löst ein npm-Skript rekursiv in die Liste der Kommandos auf, die am Ende laufen.
 *
 * Bewusst nur `&&` und `npm run <name>`: Genau daraus bestehen die Gate-Skripte.
 * Ein Parser für die volle Shell-Grammatik wäre hier mehr Fehlerquelle als Nutzen —
 * kommt etwas Komplexeres dazu, fällt es über die Tests zu diesem Modul auf, nicht
 * über ein still falsches Ergebnis.
 */
export function flattenScript(
	name: string,
	scripts: Record<string, string> = readScripts(),
	stack: readonly string[] = []
): string[] {
	if (stack.includes(name)) {
		throw new Error(`Zyklus in den npm-Skripten: ${[...stack, name].join(' → ')}`);
	}
	const body = scripts[name];
	if (body === undefined) throw new Error(`Kein npm-Skript namens "${name}" in package.json`);

	return body
		.split('&&')
		.map((part) => part.trim())
		.filter(Boolean)
		.flatMap((command) => {
			const nested = /^npm run ([\w:.-]+)$/.exec(command);
			return nested
				? flattenScript(nested[1], scripts, [...stack, name])
				: [command.replace(/^npx\s+/, '')];
		});
}

/**
 * Die Vitest-Projekte, die ein einzelnes Kommando fährt — oder `null`, wenn es
 * gar kein Vitest-Lauf ist.
 *
 * `'all'` statt einer Namensliste, wenn kein `--project` gesetzt ist: Vitest fährt
 * dann jedes Projekt der Config, auch ein später hinzugefügtes. Diese Unterscheidung
 * ist der Grund, warum das Modul nicht einfach Namen zählt.
 */
export function vitestProjectsIn(command: string): string[] | 'all' | null {
	if (!/(^|\s)vitest\s+run(\s|$)/.test(command)) return null;
	const named = [...command.matchAll(/--project[= ]([\w-]+)/g)].map((match) => match[1]);
	return named.length > 0 ? named : 'all';
}

/** Die Vitest-Projekte, die ein npm-Skript insgesamt abdeckt. */
export function projectsCoveredBy(
	name: string,
	scripts: Record<string, string> = readScripts()
): string[] | 'all' {
	const covered = new Set<string>();
	for (const command of flattenScript(name, scripts)) {
		const projects = vitestProjectsIn(command);
		if (projects === 'all') return 'all';
		projects?.forEach((project) => covered.add(project));
	}
	return [...covered];
}
