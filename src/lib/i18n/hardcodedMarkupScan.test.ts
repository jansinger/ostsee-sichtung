import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';
import type { SourceHit } from '$lib/testing/sourceScan.testutil';
import { planExtraction } from '../../tools/i18n-extract/plan';

/**
 * Der Plan-Typ über `ReturnType` statt als Import: `ExtractionPlan` ist in
 * `plan.ts` bewusst modul-lokal, und ein Guard ist kein Grund, die
 * Schnittstelle des Werkzeugs zu erweitern.
 */
type ExtractionPlan = ReturnType<typeof planExtraction>;

/**
 * @fileoverview Hartcodierter Anzeigetext in Schicht C (Markup der 84
 * öffentlichen `.svelte`-Dateien) — das Gegenstück zu
 * `src/lib/form/validation/hardcodedStringScan.test.ts`, der nur Schicht A
 * (Yup-Schema) und Schicht B (Domänen-Labels) deckt.
 *
 * **Das Problem, gleich wie in Schicht A/B.** Paraglide meldet eine Botschaft
 * ohne englische Fassung als Build-Fehler. Was nie ein Schlüssel wurde, kann es
 * prinzipbedingt nicht melden: Ein `<p>Ein neuer Hinweis</p>`, das jemand in
 * drei Monaten schnell noch einfügt, fehlt in keiner Sprachdatei und bleibt
 * unter `/en` still deutsch.
 *
 * **Warum dieser Guard anders gebaut ist als der von Schicht A/B.** Dort war
 * die Regel „mehrwortiges Zeichenketten-Literal" ab Tag eins grün und
 * unabhängig vom Extraktor formulierbar. Im Markup trägt sie nicht: Ein
 * Textknoten ist kein Literal, und dieselbe Regel auf rohes Markup angewandt
 * wäre heute an 136 Stellen rot — den 78 Satzfragmenten und 58 Interpolationen,
 * die als **bewusst offene** Handarbeit von Aufgabe 2.3b anstehen
 * (`docs/i18n/ARBEITSPROTOKOLL_ETAPPE1.md`). Ein Guard, der ab Tag eins rot
 * ist, wird abgeschaltet und schützt danach nichts (Entwurf Abschnitt 7).
 *
 * Deshalb drei Zusicherungen statt einer:
 *
 * 1. **Kein mechanisch extrahierbarer Text mehr** (`Mechanisch`). Der
 *    Extraktor meldet für Schicht C seit Aufgabe 2.3a null Fundstellen. Ein
 *    neuer Textknoten oder ein neues `placeholder`/`title`/`aria-label`/`alt`
 *    mit deutschem Text erscheint dort sofort wieder — das ist der häufigste
 *    Rückfall und der einzige, der ohne Zählwerk auskommt.
 * 2. **Bestandszähler der offenen Handarbeit** (`Bestandszähler`). Was der
 *    Extraktor als „von Hand" verwirft, ist heute exakt beziffert. Der Zähler
 *    hält jede Kategorie einzeln fest: Wer einen deutschen Satz **neben** ein
 *    Inline-Element schreibt, hebt `sentence-fragment` von 78 auf 79, und der
 *    Test wird rot. Wer eine Welle der Handarbeit abarbeitet, senkt die Zahl
 *    hier bewusst — und sagt damit im Diff, was er gelöst hat. Genau das war
 *    in dieser Etappe viermal die Stelle, an der eine zu grobe Buchführung
 *    einen Verlust verdeckt hätte (Protokoll, „Die Buchführung, zum vierten
 *    Mal präzisiert").
 * 3. **Der unabhängige Zweitmechanismus** (`Attribute außerhalb der
 *    Extraktor-Liste`). Die Zusicherungen 1 und 2 stützen sich beide auf den
 *    Extraktor und teilen damit jede seiner blinden Stellen — genau der
 *    Fehler, den der Guard von Schicht A/B vermeidet (dort: `.integer()`, für
 *    den Extraktor unsichtbar). Die entsprechende blinde Stelle in Schicht C
 *    ist benannt und gemessen: Der Sammler betrachtet **nur** die vier
 *    Attribute `placeholder`/`title`/`aria-label`/`alt`
 *    (`SVELTE_TARGET_ATTRIBUTES` in `collect.ts`). Ein `description="…"` an
 *    einer eigenen Komponente oder ein `content="…"` in `<svelte:head>` ist
 *    für ihn nicht vorhanden. Dieser Teil des Guards prüft das mit eigener
 *    Regel — er meldete auf Anhieb 27 Stellen, die in keiner Zählung dieser
 *    Etappe je vorkamen.
 *
 * **Umfang.** Dieselben 84 Dateien, die der Extraktor scannt — die
 * Ausschlussliste (`isSveltePathInScope` in `plan.ts`) ist dort benannt und
 * begründet (Admin, Styleguide, `/docs`, `ApiDocumentation.svelte`). Sie wird
 * hier bewusst **nicht** kopiert: Zwei Listen für denselben Umfang altern
 * getrennt.
 *
 * **Was dieser Guard nicht deckt, und das ist ein offener Befund.** Der
 * Extraktor liest von einer `.svelte`-Datei nur das Markup, nie den
 * `<script>`-Block. Deutscher Anzeigetext, der dort in einer Konstante steht
 * und von dort ins Markup fließt (`const hint = 'Karte wird initialisiert…'`),
 * ist für alle drei Zusicherungen unsichtbar. Gemessen am 2026-08-12: 158
 * mehrwortige Literale in 35 der 84 Dateien, darunter neben Tailwind-Klassen
 * und englischen Logmeldungen auch echter Anzeigetext (die vier Titel und
 * Meldungen in `routes/+error.svelte`, `'Bitte wählen…'` in `BaseSelect.svelte`
 * und `FieldRenderer.svelte`, die Toasts in `DropzoneEnhanced.svelte`). Das ist
 * unerledigte Übersetzungsarbeit, kein Lücke dieses Guards — die Regel „zwei
 * Buchstabengruppen" kann dort nicht greifen, weil Tailwind-Klassenlisten sie
 * genauso erfüllen. Siehe `docs/i18n/ARBEITSPROTOKOLL_ETAPPE1.md`.
 *
 * Läuft im Node-Projekt (`npm run test:unit`, damit auch in `test:quick`).
 */

/** Was der Entwickler stattdessen tun soll — erscheint in jeder Fehlermeldung. */
const REMEDIATION = [
	'Hartcodierter Anzeigetext in Schicht C (Markup). Statt des Textes eine',
	'Paraglide-Botschaft benutzen:',
	'  npm run i18n:extract                # zeigt Fundstelle und Schlüsselvorschlag',
	'  npm run i18n:extract -- --write-messages',
	'  npm run i18n:compile',
	'  npm run i18n:extract -- --write-sources',
	'Im Markup steht danach {m.<schlüssel>()} bzw. attr={m.<schlüssel>()} — bei',
	'Attributen OHNE Anführungszeichen, sonst ist es eine Zeichenketten-',
	'Interpolation und nicht der Wert. Danach die E2E-Suite fahren: 290',
	'Selektoren greifen über sichtbaren deutschen Text, und test:quick enthält',
	'sie nicht.'
].join('\n');

/**
 * Der Extraktions-Plan, einmal je Testlauf.
 *
 * `planExtraction` liest 102 Dateien und parst 84 davon mit dem
 * Svelte-Compiler; drei Zusicherungen mit je eigenem Lauf wären dreimal
 * dieselbe Arbeit.
 */
let cachedPlan: ExtractionPlan | undefined;
function sveltePlan(): ExtractionPlan {
	cachedPlan ??= planExtraction(process.cwd());
	return cachedPlan;
}

/** Nur die `.svelte`-Dateien des Plans — Schicht A und B haben ihren eigenen Guard. */
function svelteFiles(): ExtractionPlan['files'] {
	return sveltePlan().files.filter((file) => file.file.endsWith('.svelte'));
}

describe('Mechanisch — der Extraktor findet in Schicht C nichts mehr', () => {
	it('meldet für keine Markup-Datei eine extrahierbare Fundstelle', () => {
		const offenders = svelteFiles().flatMap((file) =>
			file.sites.map((site) => `${site.file}:${site.line} — ${site.text}`)
		);

		expect(offenders, `${offenders.length} Fund(e).\n\n${REMEDIATION}\n`).toEqual([]);
	});

	/* Selbsttest. Ein Guard, der über eine leere Dateimenge läuft, ist grün und
	   beweist nichts — das war der „stille Nullbefund" aus Aufgabe 1. */
	it('scannt die 84 Markup-Dateien im Umfang', () => {
		expect(svelteFiles()).toHaveLength(84);
	});
});

/**
 * Die Übersprungen-Kategorien der Markup-Dateien, exakt so wie sie heute
 * stehen — erhoben mit `npm run i18n:extract`, Stand 2026-08-12.
 *
 * **`already-translated` steht bewusst nicht hier.** Diese Kategorie zählt die
 * bereits ersetzten Stellen und wächst mit jeder Welle; ein Zähler darauf wäre
 * bei jeder Übersetzung rot und träfe keine Aussage über offene Arbeit
 * (Protokoll, Korrektur vom 2026-08-12 zu Aufgabe 2.3a).
 *
 * Wer eine Welle der Handarbeit abarbeitet, ändert hier die betroffene Zahl —
 * und nur die. Sinkt eine Zahl, ohne dass die Welle sie gelöst hat, ist eine
 * Stelle verschwunden statt übersetzt worden.
 */
const OPEN_SKIP_LEDGER: Readonly<Record<string, number>> = {
	/** Textknoten neben einem textbehafteten Geschwister — Muster A/C, Aufgabe 2.3b. */
	'sentence-fragment': 78,
	/** Textknoten neben einem dynamischen Ausdruck — braucht eine ICU-Botschaft mit Parameter. */
	interpolation: 58,
	/** Attributwert mit Ternary — die letzte Gruppe der Dreiteilung aus Aufgabe 2.3c. */
	'dynamic-attribute': 7,
	/** Reine Satzzeichen, Symbole, Zahlen — Struktur, wird nie übersetzt. */
	'no-letter-group': 44,
	/** Ziffern-Treffer; als Pluralarbeit falsch-positiv (Protokoll, Korrektur zu 2.3b). */
	'plural-candidate': 12,
	/** Attributwert ohne jeden statischen Text (`title={file.name}`) — nie Übersetzungsarbeit. */
	'attribute-no-static-text': 24
};

describe('Bestandszähler der offenen Handarbeit', () => {
	function openSkipCounts(): Record<string, number> {
		const counts: Record<string, number> = {};
		for (const skip of sveltePlan().skipped) {
			if (!skip.file.endsWith('.svelte')) continue;
			if (!(skip.reason in OPEN_SKIP_LEDGER)) continue;
			counts[skip.reason] = (counts[skip.reason] ?? 0) + 1;
		}
		return counts;
	}

	it('zählt jede offene Kategorie genau so, wie sie im Protokoll steht', () => {
		expect(openSkipCounts(), REMEDIATION).toEqual(OPEN_SKIP_LEDGER);
	});
});

/**
 * Attribute, deren Wert nie Anzeigetext ist — sie stünden sonst dauerhaft im
 * Bestandszähler unten und machten ihn unlesbar.
 *
 * Bewusst kurz gehalten. Jeder weitere Eintrag nimmt dem Guard Fläche; ein
 * Attribut, das echten Text trägt, gehört in den Zähler und dann übersetzt,
 * nicht auf diese Liste.
 */
function isNonTextAttribute(name: string): boolean {
	// Tailwind-Klassenlisten (`class`, aber auch durchgereichte Props wie
	// `containerClass`) und Inline-Stile erfüllen „Leerzeichen und zwei
	// Buchstabengruppen" mühelos, sind aber nie Text.
	if (name === 'class' || name === 'style' || /[Cc]lass$/.test(name)) return true;
	// `rel="noopener noreferrer"` — HTML-Linkbeziehungen, ein festes Vokabular.
	return name === 'rel';
}

/** Eine Buchstabengruppe: mindestens zwei Buchstaben am Stück — wie in Schicht A/B. */
const LETTER_GROUP = /[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/gu;

/**
 * Trägt `value` Anzeigetext? Dieselbe Regel wie der Guard von Schicht A/B:
 * Leerzeichen und mindestens zwei Buchstabengruppen — **keine
 * Sprachheuristik**, damit auch ein versehentlich englischer Text auffällt.
 */
function looksLikeDisplayText(value: string): boolean {
	if (!/\s/.test(value)) return false;
	return (value.match(LETTER_GROUP)?.length ?? 0) >= 2;
}

/**
 * Statischer Anzeigetext in einem Attribut, das der Extraktor **nicht**
 * betrachtet.
 *
 * Eigene Traversierung statt `collectSvelteSites`: Der Zweck dieser
 * Zusicherung ist gerade, unabhängig von dessen Attributliste zu sein (siehe
 * Datei-Doc, Punkt 3). Geteilt wird nur der Parser.
 *
 * Exportiert, damit die Regel an konstruiertem Markup prüfbar ist — der
 * Guard soll nicht bloß über dem Bestand grün sein.
 */
export function findStaticTextAttributes(source: string): SourceHit[] {
	let ast: ReturnType<typeof parse>;
	try {
		ast = parse(source, { modern: true });
	} catch {
		// Nicht parsebares Markup übergeht der Extraktor ebenfalls, statt den
		// Lauf abzubrechen — svelte-check ist die Stelle, die das meldet.
		return [];
	}

	const hits: SourceHit[] = [];
	const extractorAttributes = new Set(['placeholder', 'title', 'aria-label', 'alt']);

	const visit = (node: unknown): void => {
		if (node === null || typeof node !== 'object') return;
		if (Array.isArray(node)) {
			node.forEach(visit);
			return;
		}

		const record = node as Record<string, unknown>;
		if (Array.isArray(record.attributes)) {
			for (const attribute of record.attributes as Array<Record<string, unknown>>) {
				if (attribute.type !== 'Attribute') continue;
				const name = String(attribute.name);
				if (extractorAttributes.has(name) || isNonTextAttribute(name)) continue;

				const value = attribute.value;
				if (!Array.isArray(value) || value.length !== 1) continue;
				const only = value[0] as Record<string, unknown>;
				if (only.type !== 'Text' || typeof only.data !== 'string') continue;
				if (!looksLikeDisplayText(only.data)) continue;

				const start = typeof attribute.start === 'number' ? attribute.start : 0;
				hits.push({
					line: source.slice(0, start).split('\n').length,
					text: `${name}="${only.data.replace(/\s+/g, ' ').trim()}"`
				});
			}
		}

		for (const [key, child] of Object.entries(record)) {
			if (key === 'parent') continue;
			if (child !== null && typeof child === 'object') visit(child);
		}
	};

	visit((ast as unknown as Record<string, unknown>).fragment);
	return hits.sort((a, b) => a.line - b.line);
}

/**
 * Statischer Anzeigetext in Attributen außerhalb der Extraktor-Liste, je Datei
 * — erhoben am 2026-08-12, zusammen mit diesem Guard.
 *
 * Zwei Gruppen, beide bewusst noch offen:
 *
 * **SEO-Metadaten (20× `content` in `<svelte:head>`).** Titel, Beschreibung
 * und Schlagwörter der fünf öffentlichen Seiten, dazu `noindex, nofollow` auf
 * der Wartungsseite (technisch, kein Text). Sie gehören zu Aufgabe 2.5
 * (`hreflang` und `og:locale`) — dort wird der Kopfbereich ohnehin je Route
 * angefasst, und eine übersetzte Beschreibung ohne `hreflang` bringt nichts.
 *
 * **Anzeigetext an Komponenten-Props (7×).** `description`, `label`,
 * `coordinatesHint`, `actionLabel` — echte Schicht-C-Fundstellen, die diese
 * Etappe nie gezählt hat, weil der Extraktor diese Attributnamen nicht kennt.
 * Sie sind Arbeit für die nächste Welle, nicht für 2.5.
 */
const ATTRIBUTE_LEDGER: Readonly<Record<string, number>> = {
	'src/lib/components/map/SightingsMapView.svelte': 2,
	'src/lib/components/weather/WeatherDataFetcher.svelte': 1,
	'src/lib/report/components/FormHelp.svelte': 1,
	'src/lib/report/components/form/position/PositionPanel.svelte': 2,
	'src/lib/report/components/sections/SightingDetails.svelte': 1,
	'src/routes/+page.svelte': 6,
	'src/routes/about/+page.svelte': 6,
	'src/routes/bestimmungshilfe/+page.svelte': 1,
	'src/routes/maintenance/+page.svelte': 1,
	'src/routes/map/+page.svelte': 6
};

describe('Attribute außerhalb der Extraktor-Liste', () => {
	function attributeCounts(): Record<string, number> {
		const counts: Record<string, number> = {};
		for (const file of svelteFiles()) {
			const hits = findStaticTextAttributes(file.before);
			if (hits.length > 0) counts[file.file] = hits.length;
		}
		return counts;
	}

	it('findet je Datei genau die verzeichneten Stellen', () => {
		expect(attributeCounts(), REMEDIATION).toEqual(ATTRIBUTE_LEDGER);
	});

	it('meldet ein deutsches Literal in einem Attribut, das der Extraktor nicht kennt', () => {
		const markup = '<Hinweis description="Für dieses Jahr liegen keine Meldungen vor." />';

		expect(findStaticTextAttributes(markup)).toEqual([
			{ line: 1, text: 'description="Für dieses Jahr liegen keine Meldungen vor."' }
		]);
	});

	it('meldet ein englisches Literal genauso — keine Sprachheuristik', () => {
		const markup = '<Hinweis description="No reports for this year." />';

		expect(findStaticTextAttributes(markup)).toHaveLength(1);
	});

	it.each([
		'<div class="flex items-center gap-2 border px-3" />',
		'<Map containerClass="relative min-h-0 w-full flex-1" />',
		'<div style="max-width: 40rem; margin: 0 auto" />',
		'<a rel="noopener noreferrer" href="/x">x</a>'
	])('lässt %s durch — Struktur, kein Anzeigetext', (markup) => {
		expect(findStaticTextAttributes(markup)).toEqual([]);
	});

	it('lässt die vier Attribute durch, die der Extraktor selbst prüft', () => {
		const markup = '<input placeholder="Bitte Tierart wählen" aria-label="Tierart auswählen" />';

		// Nicht etwa, weil sie unverdächtig wären — sondern weil Zusicherung 1
		// sie bereits meldet. Hier ein zweites Mal zu zählen ergäbe einen
		// Bestandszähler, der bei jeder Übersetzung an zwei Stellen zu pflegen
		// wäre.
		expect(findStaticTextAttributes(markup)).toEqual([]);
	});

	it('lässt einen Wert ohne zweite Buchstabengruppe durch', () => {
		// `h` ist ein einzelner Buchstabe und damit keine Gruppe — dieselbe
		// Zwei-Buchstaben-Regel wie in Schicht A/B, aus demselben Grund: Ein
		// Tastenkürzel oder eine Einheit ist kein Anzeigetext (Protokoll,
		// „LETTER_GROUP traf einen EINZELNEN Buchstaben").
		const markup = '<Feld einheit="km h" wert="12 %" />';

		expect(findStaticTextAttributes(markup)).toEqual([]);
	});

	it('lässt ein dynamisches Attribut durch — dort steht kein fester Text', () => {
		const markup = '<Hinweis description={fehlerText} />';

		expect(findStaticTextAttributes(markup)).toEqual([]);
	});
});
