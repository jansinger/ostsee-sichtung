/**
 * Baut aus den Fundstellen den Vorschlag: geänderte Quelle, Diff, Bericht.
 *
 * **Diese Datei schreibt nichts.** Sie gibt Zeichenketten zurück; ob und wann
 * etwas auf die Platte kommt, entscheiden Aufgabe 3 und 4.
 */
import type { ExtractionSite, SkippedSite } from './collect';

/** Der Aufruf, der an die Stelle des Literals tritt. */
function messageCall(key: string): string {
	return `m.${key}({}, { locale })`;
}

/**
 * Ersetzt alle Fundstellen einer Datei.
 *
 * **Von hinten nach vorn.** Jede Ersetzung ändert die Länge des Textes; würde
 * vorn begonnen, zeigten alle späteren Offsets ins Leere. Das ist auch der
 * Grund, warum `collect.ts` Offsets liefert und keine Suchtexte: Bei 19
 * Dubletten träfe ein Suchen-und-Ersetzen die falsche Stelle.
 */
export function applySitesToSource(source: string, sites: ExtractionSite[]): string {
	const ordered = [...sites].sort((a, b) => b.start - a.start);
	let result = source;
	for (const site of ordered) {
		result = result.slice(0, site.start) + messageCall(site.key) + result.slice(site.end);
	}
	return result;
}

/**
 * Ein knapper Unified Diff — nur geänderte Zeilen, keine Hunk-Kopfzeilen.
 *
 * Bewusst keine Diff-Bibliothek: Die Änderungen sind zeilenweise 1:1 (eine
 * Zeile geht rein, eine Zeile kommt raus), weil ein Literal nie eine Zeile
 * hinzufügt oder entfernt. Ein Zeilenvergleich ist dafür vollständig — und
 * lesbar, ohne dass jemand eine weitere Abhängigkeit prüfen muss.
 *
 * **Unausgesprochene Annahme:** Kein ersetztes Literal enthält einen echten
 * Zeilenumbruch. Träfe das nicht mehr zu, verschöbe sich der 1:1-Zeilenvergleich
 * gegenüber dem echten Text — der Diff zeigte dann falsche `-`/`+`-Paare.
 */
export function renderUnifiedDiff(relativeFilePath: string, before: string, after: string): string {
	if (before === after) {
		return '';
	}
	const beforeLines = before.split('\n');
	const afterLines = after.split('\n');
	const lines: string[] = [`--- ${relativeFilePath}`, `+++ ${relativeFilePath}`];
	for (let i = 0; i < Math.max(beforeLines.length, afterLines.length); i++) {
		const b = beforeLines[i];
		const a = afterLines[i];
		if (b === a) {
			continue;
		}
		if (b !== undefined) {
			lines.push(`-${b}`);
		}
		if (a !== undefined) {
			lines.push(`+${a}`);
		}
	}
	return lines.join('\n');
}

export interface ExtractionPlan {
	files: Array<{
		file: string;
		before: string;
		after: string;
		sites: ExtractionSite[];
	}>;
	skipped: SkippedSite[];
}

export function renderDryRunReport(plan: ExtractionPlan): string {
	const lines: string[] = [];
	const totalSites = plan.files.reduce((sum, f) => sum + f.sites.length, 0);

	lines.push('# i18n-Extraktion — TROCKENLAUF (es wurde nichts geschrieben)');
	lines.push('');
	lines.push(`Botschaften: ${totalSites} — übersprungen: ${plan.skipped.length}`);
	lines.push('');

	lines.push('## Botschaften je Datei');
	lines.push('');
	for (const f of plan.files) {
		lines.push(`- ${f.file}: ${f.sites.length}`);
	}
	lines.push('');

	lines.push('## Geplante Diffs');
	lines.push('');
	for (const f of plan.files) {
		const diff = renderUnifiedDiff(f.file, f.before, f.after);
		if (diff) {
			lines.push('```diff');
			lines.push(diff);
			lines.push('```');
			lines.push('');
		}
	}

	lines.push('## Geplante Einträge für messages/de.json und messages/en.json');
	lines.push('');
	lines.push('```json');
	const messages: Record<string, string> = {};
	for (const f of plan.files) {
		for (const site of f.sites) {
			messages[site.key] = site.text;
		}
	}
	lines.push(JSON.stringify(messages, null, '\t'));
	lines.push('```');
	lines.push('');
	lines.push(
		'`en.json` bekommt denselben deutschen Wortlaut — Etappe 1 liefert die Mechanik, ' +
			'nicht die Übersetzung (Entwurf Abschnitt 1).'
	);
	lines.push('');

	// Der wichtigste Abschnitt des Berichts: die einzige Stelle, an der ein
	// Mensch eine zu enge Allowlist bemerken kann.
	lines.push('## Übersprungen — bitte durchsehen');
	lines.push('');
	for (const s of plan.skipped) {
		lines.push(`- ${s.file}:${s.line} (${s.aspect}) \`${s.text}\` — ${s.explanation}`);
	}
	lines.push('');

	return lines.join('\n');
}
