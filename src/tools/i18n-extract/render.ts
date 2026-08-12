/**
 * Baut aus den Fundstellen den Vorschlag: Diff, Bericht.
 *
 * **Diese Datei schreibt nichts.** Sie gibt Zeichenketten zurück; ob und wann
 * etwas auf die Platte kommt, entscheiden Aufgabe 3 und 4. Die eigentliche
 * Quelltransformation (`applySitesToSource`) lebt in `apply.ts` — hier bleibt
 * nur die Berichtsformatierung.
 */
import type { ExtractionSite, SkippedSite } from './collect';

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

// Befund 3: formOptions-Dateien sind Modulkonstanten (Schicht B) — eine
// Ersetzung INNERHALB der Konstante friert die Sprache beim Modulladen ein
// (Entwurf Abschnitt 2.3/4.1). sightingSchema.ts (Schicht A) hat dieses
// Problem nicht: Der Schema-Aufbau läuft bereits pro Request/Formular neu.
const FORM_OPTIONS_PATH_SEGMENT = 'formOptions/';

function isFormOptionsFile(relativeFilePath: string): boolean {
	return relativeFilePath.includes(FORM_OPTIONS_PATH_SEGMENT);
}

/**
 * Schicht C (Svelte-Markup) erkennt sich an der Dateiendung, nicht an einem
 * Pfadsegment wie `formOptions/` — die Dateien liegen über den ganzen
 * öffentlichen Baum verteilt (siehe `SVELTE_SCOPE_EXCLUDED_PREFIXES` in
 * `plan.ts`).
 */
function isSvelteFile(relativeFilePath: string): boolean {
	return relativeFilePath.endsWith('.svelte');
}

export function renderDryRunReport(plan: ExtractionPlan): string {
	const lines: string[] = [];
	const totalSites = plan.files.reduce((sum, f) => sum + f.sites.length, 0);

	lines.push('# i18n-Extraktion — TROCKENLAUF (es wurde nichts geschrieben)');
	lines.push('');
	lines.push(`Gescannte Dateien: ${plan.files.length}`);
	lines.push(`Botschaften: ${totalSites} — übersprungen: ${plan.skipped.length}`);
	lines.push('');

	// Nachweis 1 (Aufgabe 2.2/Befund): die Planungszahlen für die nächste
	// Aufgabe (Umbau der Markup-Dateien) müssen sich aus DIESEM Bericht ablesen
	// lassen — nicht aus einem Scratchpad-Skript, das den Umfang nicht kennt,
	// den das Werkzeug jetzt selbst definiert.
	lines.push('## Übersprungen je Grund');
	lines.push('');
	for (const [reason, count] of countByReason(plan.skipped)) {
		lines.push(`- ${reason}: ${count}`);
	}
	lines.push('');

	lines.push('## Botschaften je Datei');
	lines.push('');
	for (const f of plan.files) {
		lines.push(`- ${f.file}: ${f.sites.length}`);
	}
	lines.push('');

	const schemaFiles = plan.files.filter((f) => !isFormOptionsFile(f.file) && !isSvelteFile(f.file));
	const formOptionsFiles = plan.files.filter((f) => isFormOptionsFile(f.file));
	const svelteFiles = plan.files.filter((f) => isSvelteFile(f.file));

	lines.push('## Geplante Diffs');
	lines.push('');

	lines.push('### Schema (Schicht A)');
	lines.push('');
	for (const f of schemaFiles) {
		const diff = renderUnifiedDiff(f.file, f.before, f.after);
		if (diff) {
			lines.push('```diff');
			lines.push(diff);
			lines.push('```');
			lines.push('');
		}
	}

	lines.push('### formOptions (Schicht B)');
	lines.push('');
	lines.push(
		'Hinweis: Die folgende Ersetzung belegt nur Fundstellen und Schlüssel, nicht die ' +
			'Zielform. Eine Ersetzung innerhalb der Modulkonstante würde die Sprache beim ' +
			'Modulladen einfrieren. Jede formOptions-Datei braucht einen strukturellen Umbau ' +
			'(Entwurf Abschnitt 2.3 und 4.1).'
	);
	lines.push('');
	for (const f of formOptionsFiles) {
		const diff = renderUnifiedDiff(f.file, f.before, f.after);
		if (diff) {
			lines.push('```diff');
			lines.push(diff);
			lines.push('```');
			lines.push('');
		}
	}

	lines.push('### Svelte-Markup (Schicht C)');
	lines.push('');
	for (const f of svelteFiles) {
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
	// Mensch eine zu enge Allowlist bemerken kann. Bereits übersetzte Stellen
	// (Aufrufe von Paraglide-Botschaftsfunktionen, SkipReason 'already-translated')
	// sind erledigte Arbeit, kein offener Fall — sie zählen weiterhin mit, stehen
	// aber nicht mehr einzeln in der Liste, sonst ertränkt eine dreistellige Zahl
	// von Fehlalarmen die wenigen Stellen, die wirklich von Hand zu prüfen sind.
	const alreadyTranslated = plan.skipped.filter((s) => s.reason === 'already-translated');
	// Genau wie `already-translated`: strukturell nichts zu übersetzen (kein
	// statischer Textteil mit mindestens zwei Buchstaben, siehe
	// `allowlist.ts` bei `attribute-no-static-text`) — kein offener Fall, der
	// den Blick auf die echten verstellen sollte.
	const noStaticText = plan.skipped.filter((s) => s.reason === 'attribute-no-static-text');
	const toReview = plan.skipped.filter(
		(s) => s.reason !== 'already-translated' && s.reason !== 'attribute-no-static-text'
	);

	lines.push('## Übersprungen — bitte durchsehen');
	lines.push('');
	if (alreadyTranslated.length > 0) {
		lines.push(`- bereits übersetzt: ${alreadyTranslated.length} Stellen (nicht aufgeführt)`);
	}
	if (noStaticText.length > 0) {
		lines.push(
			`- Attribut ohne statischen Text (reine Durchreichung): ${noStaticText.length} Stellen (nicht aufgeführt)`
		);
	}
	for (const s of toReview) {
		lines.push(`- ${s.file}:${s.line} (${s.aspect}) \`${s.text}\` — ${s.explanation}`);
	}
	lines.push('');

	return lines.join('\n');
}

/**
 * Zählt die übersprungenen Fundstellen je `SkipReason`, sortiert nach
 * Codepoint (derselbe Grund wie `sortByKey` in `plan.ts` — deterministisch
 * über Maschinen und Node-Builds hinweg).
 */
function countByReason(skipped: SkippedSite[]): Array<[string, number]> {
	const counts = new Map<string, number>();
	for (const s of skipped) {
		counts.set(s.reason, (counts.get(s.reason) ?? 0) + 1);
	}
	return [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}
