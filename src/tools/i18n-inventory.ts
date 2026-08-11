/**
 * Inventarisiert noch nicht übersetzte Zeichenketten der Anwendung.
 *
 * Hintergrund: Die App bekommt Mehrsprachigkeit (DE/EN), die Infrastruktur (Paraglide
 * JS, Routing) steht bereits. Bevor die eigentliche Übersetzungs-Etappe geplant wird,
 * braucht es eine belastbare Zahl statt der bisherigen Grep-Schätzung
 * ("600–900 Botschaften"). Dieses Werkzeug **ersetzt nichts** — es findet,
 * kategorisiert und schlägt Schlüssel vor.
 *
 * Drei Quellen, mit unterschiedlicher Erkennungsstrategie:
 *
 * 1. Svelte-Markup — per `svelte/compiler`-AST (`parse()`), nicht per Regex. Nur ein
 *    echter Baum unterscheidet einen Markup-Kommentar (Begründungen stehen laut
 *    CLAUDE.md konventionsgemäß dort) zuverlässig von einem Textknoten: Ein
 *    `Comment`-Knoten trägt seinen Inhalt in `data` (einem String, kein Kindknoten) —
 *    die Traversierung steigt dort nie ab und erfasst ihn folglich nie als Text.
 *
 *    Hinweis zur Instrumentierung: `svelte/compiler` exportiert in Version 5.56.8 zwar
 *    weiterhin einen Namen `walk`, der ruft aber nur noch einen Hinweis auf
 *    `estree-walker` hervor (`walk()` … "no longer exports a walk utility"). Die
 *    Traversierung hier ist deshalb eine kleine handgeschriebene Rekursion über die
 *    bekannte Node-Struktur (`fragment`, `attributes`, `value`, plus generischer
 *    Fallback über alle Objekt-Felder für Block-Typen wie `IfBlock`/`EachBlock`) —
 *    fachlich dasselbe wie ein `walk()`, nur ohne die inzwischen entfernte Funktion.
 *
 * 2. `src/lib/report/formOptions/*.ts` — strikt auf `Record<Enum, string>`-Literale
 *    begrenzt (per TypeScript-Compiler-API, nicht Regex: robust gegenüber
 *    Formatierung, liefert exakte Zeilennummern). Objektschlüssel (z. B. die
 *    `speciesGroups`-Gruppennamen `Kleinwale`/`Großwale`/`Robben`) sind **bewusst
 *    ausgenommen** — das ist kein Bug, sondern die Grenze des strikten Musters, siehe
 *    `.superpowers/sdd/inventory-tool-report.md`.
 *
 * 3. `src/lib/form/validation/sightingSchema.ts` — `.label(...)`, `.meta({...})` und
 *    Validierungsmeldungen (`.required(...)`, `.max(...)`, …), ebenfalls per
 *    TypeScript-Compiler-API.
 *
 * Nichts hier verändert eine Datei. `runInventory()` liest nur.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, relative, sep } from 'node:path';
import { parse } from 'svelte/compiler';
import ts from 'typescript';
import { slugify } from './i18n-extract/slugify';

// Reiner Re-Export: `slugify` lebt seit Befund D in `i18n-extract/slugify.ts`
// (der neue Extraktor soll nicht an diesem 30-KB-Altwerkzeug hängen). Dieses
// Modul importiert und exportiert es unverändert weiter, damit sein eigener
// Test und seine CLI ohne Änderung laufen.
export { slugify };

/** Die drei Kategorien — `unklar` ist der sichere Default, nicht `uebersetzbar`. */
export type Category = 'uebersetzbar' | 'technisch' | 'unklar';

/** Woher ein Fund stammt. */
export type FindingSource = 'svelte-text' | 'svelte-attr' | 'form-options' | 'yup-schema';

export interface Finding {
	file: string;
	line: number;
	source: FindingSource;
	category: Category;
	rawText: string;
	/** Bei `svelte-attr`: der Attributname (`placeholder`, `title`, `aria-label`, `alt`). */
	attribute?: string;
	/** Bei `form-options`/`yup-schema`: der Feld-/Property-Kontext (z. B. `speciesLabels`, `latitude.meta.helpText`). */
	context?: string;
	keySuggestion: string;
	/** Enthält die Zeichenkette eine Ziffer — Hinweis auf mögliche ICU-Pluralform, vom Menschen zu entscheiden. */
	containsNumber: boolean;
	/** Kurzbegründung der Kategorisierung, für die menschliche Kontrolle. */
	reason: string;
}

export interface InventoryOptions {
	/** Repository-Wurzel (absoluter Pfad). */
	root: string;
	/** Admin-Bereich (`/admin`-Routen, `src/lib/components/admin/`) mit einbeziehen. Default: false. */
	includeAdmin?: boolean;
}

export interface InventorySummary {
	totalFindings: number;
	byCategory: Record<Category, number>;
	bySourceAndCategory: Record<FindingSource, Record<Category, number>>;
	byFile: Array<{ file: string; total: number; byCategory: Record<Category, number> }>;
	duplicateGroups: number;
}

export interface InventoryResult {
	findings: Finding[];
	summary: InventorySummary;
}

// ---------------------------------------------------------------------------
// Klassifikation
// ---------------------------------------------------------------------------

const TECHNICAL_PATTERNS: RegExp[] = [
	/^https?:\/\//i, // URL
	/^[a-z][a-z0-9.+-]*\/[a-z0-9.+-]+$/i, // MIME-Typ, z.B. image/jpeg (kein Leerzeichen erlaubt)
	/^[a-z][a-z0-9]*:[a-z0-9-]+$/, // Icon-Namensraum, z.B. lucide:map-pin, custom:porpoise
	/^[A-Z][A-Z0-9_]{1,}$/, // UPPER_SNAKE_CASE Enum-Wert
	/^[a-z0-9]+(-[a-z0-9]+)+$/, // kebab-case Identifier (Testid/Klassen-artig), mind. ein Bindestrich
	/\.(png|jpe?g|gif|svg|webp|avif|pdf|json|ts|tsx|js|mjs|css|mp4|webm)$/i, // Dateiendung
	/^-?\d+(\.\d+)?$/ // reine Zahl — nicht übersetzbar, aber auch kein Fließtext
];

/**
 * Erkennt Klassenlisten wie `"btn btn-primary"`: mehrere ausschließlich
 * kleingeschriebene, bindestrich-kompatible Tokens, von denen mindestens eines einen
 * Bindestrich trägt (Tailwind/DaisyUI-Utilities sind fast nie unbenutzt-kurz ohne
 * Bindestrich — reine Basisklassen wie `btn` oder `card` kommen aber häufig gemischt
 * mit Modifier-Klassen vor, siehe `daisyui.md`).
 *
 * Bewusst NICHT einfach "mehrere kleingeschriebene Wörter ohne Satzzeichen", weil das
 * jede alltägliche deutsche Kleinschreibungs-Phrase träfe. Das Hyphen-Erfordernis hält
 * die Regel eng auf Klassenlisten begrenzt.
 */
function looksLikeCssClassList(trimmed: string): boolean {
	const tokens = trimmed.split(/\s+/);
	if (tokens.length < 2) {
		return false;
	}
	const allTokensLookLikeClasses = tokens.every((token) =>
		/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(token)
	);
	const atLeastOneHyphenated = tokens.some((token) => token.includes('-'));
	return allTokensLookLikeClasses && atLeastOneHyphenated;
}

/**
 * Ein großgeschriebenes Einzelwort ohne weitere Satzzeichen — das deutsche
 * Substantiv-/Verb-Muster (`Schweinswal`, `Speichern`). Technische Einzelwort-Tokens
 * sind dagegen so gut wie nie TitleCase: Enum-Werte sind UPPER_SNAKE_CASE, Testids und
 * CSS-Klassen sind kleingeschrieben-mit-Bindestrich, Icon-Namen tragen einen
 * Doppelpunkt-Namensraum. Alle drei werden bereits vorher als technisch erkannt, das
 * hier ist also ein sicherer zweiter Schritt und kein Widerspruch dazu.
 */
function looksLikeCapitalizedGermanWord(trimmed: string): boolean {
	return /^[A-ZÄÖÜ][a-zäöüß]{2,}$/.test(trimmed);
}

/**
 * Deutsche Signalwörter — kommt eines davon vor, ist der Text mit hoher Sicherheit
 * natürliche Sprache. Bewusst kurz gehalten (Stoppwörter, keine Vollständigkeit
 * nötig): Ziel ist ein Signal, keine Grammatikprüfung.
 */
const GERMAN_STOPWORDS = new Set([
	'der',
	'die',
	'das',
	'und',
	'oder',
	'ist',
	'sind',
	'für',
	'mit',
	'bei',
	'nicht',
	'sie',
	'wir',
	'ihre',
	'ihr',
	'bitte',
	'geben',
	'wählen',
	'wurde',
	'wird',
	'kann',
	'können',
	'haben',
	'hat',
	'ein',
	'eine',
	'einen',
	'einer',
	'zu',
	'auf',
	'von',
	'am',
	'im',
	'in',
	'an',
	'nach',
	'vor',
	'über',
	'unter',
	'wie',
	'was',
	'wenn',
	'dass',
	'ihrer',
	'ihren',
	'sich',
	'als',
	'nur',
	'noch',
	'schon',
	'auch',
	'um',
	'aus',
	'ohne',
	'werden',
	'diese',
	'dieser',
	'dieses'
]);

/**
 * Klassifiziert einen Rohtext. Gibt `null` zurück, wenn der Text nach dem Trimmen
 * leer ist (kein Fund).
 *
 * Reihenfolge der Entscheidung — je frueher ein Fall greift, desto sicherer:
 *  1. leer -> kein Fund
 *  2. technisches Muster (URL/MIME/Icon-Namensraum/Enum/kebab-Testid/Dateiendung/Zahl) -> `technisch`
 *  3. CSS-Klassenliste (mehrere Tokens, mind. eines mit Bindestrich) -> `technisch`
 *  4. eindeutiges deutsches Signal (Umlaut, Satzzeichen, Stoppwort, >=3 Wörter) -> `uebersetzbar`
 *  5. mindestens zwei Wörter mit Buchstaben, kein technisches Muster -> `uebersetzbar`
 *  6. großgeschriebenes Einzelwort ohne Satzzeichen (dt. Substantiv-/Verb-Muster) -> `uebersetzbar`
 *  7. alles andere (insbesondere ein kleingeschriebenes Einzelwort ohne Signal) -> `unklar`
 *
 * Der Default in Schritt 7 ist bewusst konservativ: Ein kleingeschriebenes Einzelwort
 * ohne Satzzeichen-Hinweis lässt sich von einem technischen Token (das nicht auf eines
 * der Muster in Schritt 2/3 passt, z.B. ein einzelnes Wort ohne Bindestrich) nicht
 * zuverlässig unterscheiden — lieber eine zu lange `unklar`-Liste als eine zu
 * optimistische `uebersetzbar`-Zahl (Auftrag).
 */
export function classifyText(raw: string): { category: Category; reason: string } | null {
	const trimmed = raw.trim();
	if (trimmed.length === 0) {
		return null;
	}

	for (const pattern of TECHNICAL_PATTERNS) {
		if (pattern.test(trimmed)) {
			return { category: 'technisch', reason: `passt auf technisches Muster ${pattern}` };
		}
	}
	if (looksLikeCssClassList(trimmed)) {
		return {
			category: 'technisch',
			reason: 'sieht wie eine CSS-Klassenliste aus (Tokens mit Bindestrich)'
		};
	}

	const words = trimmed.split(/\s+/).filter(Boolean);
	const hasLetters = /[a-zA-ZäöüßÄÖÜ]/.test(trimmed);
	const hasUmlaut = /[äöüßÄÖÜ]/.test(trimmed);
	const hasPunctuation = /[.,!?:;…]/.test(trimmed);
	const lowerWords = words.map((w) => w.toLowerCase().replace(/[.,!?:;…]/g, ''));
	const hasStopword = lowerWords.some((w) => GERMAN_STOPWORDS.has(w));

	if (hasUmlaut || hasPunctuation || hasStopword || words.length >= 3) {
		return {
			category: 'uebersetzbar',
			reason: 'deutsches Sprachsignal (Umlaut/Satzzeichen/Stoppwort/≥3 Wörter)'
		};
	}

	if (words.length >= 2 && hasLetters) {
		return { category: 'uebersetzbar', reason: 'mehrwortig, keine technische Signatur' };
	}

	if (words.length === 1 && looksLikeCapitalizedGermanWord(trimmed)) {
		return {
			category: 'uebersetzbar',
			reason: 'großgeschriebenes Einzelwort ohne Satzzeichen (deutsches Substantiv-/Verb-Muster)'
		};
	}

	return {
		category: 'unklar',
		reason: 'einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar'
	};
}

// ---------------------------------------------------------------------------
// Schlüsselvorschläge
// ---------------------------------------------------------------------------
// `slugify` ist ausgelagert — siehe Import und Re-Export oben.

/** Baut ein Pfad-Präfix aus einem relativen Dateipfad, z.B. `report/form/UploadNotice`. */
function pathPrefix(relativeFilePath: string): string {
	const withoutExt = relativeFilePath.replace(/\.[^.]+$/, '');
	const segments = withoutExt.split(sep).filter((s) => s !== 'src' && s !== 'lib');
	return segments.map((s) => slugify(s, 24)).join('_');
}

function suggestKeyForSvelte(
	relativeFilePath: string,
	contextSuffix: string,
	text: string
): string {
	const prefix = pathPrefix(relativeFilePath);
	const words = text.trim().split(/\s+/).slice(0, 5).join(' ');
	return [prefix, contextSuffix, slugify(words)].filter(Boolean).join('_');
}

// ---------------------------------------------------------------------------
// Svelte-Markup
// ---------------------------------------------------------------------------

/** Die einzigen Attribute, die per Auftrag erfasst werden — nutzersichtbar. */
const TARGET_ATTRIBUTES = new Set(['placeholder', 'title', 'aria-label', 'alt']);

/** Minimale Wortzahl für Textknoten (per Auftrag: "mindestens zwei Wörter"). */
const MIN_TEXT_NODE_WORDS = 2;

interface SvelteAstNode {
	type?: string;
	[key: string]: unknown;
}

function isAstNode(value: unknown): value is SvelteAstNode {
	return (
		typeof value === 'object' && value !== null && typeof (value as SvelteAstNode).type === 'string'
	);
}

/** Liest den reinen Text-Anteil eines Attributwerts. `null`, wenn nichts Statisches drinsteckt. */
function extractAttributeText(value: unknown): { text: string; isDynamic: boolean } | null {
	if (value === true || value === undefined) {
		return null; // boolshortcut-Attribut (`disabled`) oder rein dynamischer Ausdruck
	}
	const parts: unknown[] = Array.isArray(value) ? value : [value];
	let text = '';
	let isDynamic = false;
	for (const part of parts) {
		if (isAstNode(part) && part.type === 'Text' && typeof part.data === 'string') {
			text += part.data;
		} else {
			isDynamic = true;
		}
	}
	if (text.trim().length === 0) {
		return null;
	}
	return { text, isDynamic };
}

/**
 * Traversiert den Svelte-Fragment-AST und meldet Funde über `onText`/`onAttribute`.
 *
 * Bewusst kein generisches "besuche jedes Objekt" ohne Sonderfälle: `Comment`-Knoten
 * werden explizit NICHT betreten (ihr Inhalt steckt in einem String-Feld `data`, es
 * gibt für die Rekursion also ohnehin nichts abzusteigen — das ist der Mechanismus,
 * der Kommentare von Text unterscheidet). `Attribute`-Knoten werden einmalig
 * behandelt und ihr `value` danach nicht zusätzlich als generischer Text besucht.
 */
function walkFragment(
	node: unknown,
	onText: (data: string, line: number) => void,
	onAttribute: (name: string, text: string, isDynamic: boolean, line: number) => void
): void {
	if (Array.isArray(node)) {
		for (const item of node) {
			walkFragment(item, onText, onAttribute);
		}
		return;
	}
	if (!isAstNode(node)) {
		return;
	}

	if (node.type === 'Comment') {
		return; // bewusst kein Abstieg — siehe Kommentar oben an der Funktion
	}

	if (node.type === 'Text') {
		if (typeof node.data === 'string') {
			const line = lineOf(node);
			onText(node.data, line);
		}
		return;
	}

	if (node.type === 'Attribute') {
		const name = typeof node.name === 'string' ? node.name : '';
		if (TARGET_ATTRIBUTES.has(name)) {
			const extracted = extractAttributeText(node.value);
			if (extracted) {
				onAttribute(name, extracted.text, extracted.isDynamic, lineOf(node));
			}
		}
		return; // Attributwert nicht zusätzlich generisch durchlaufen
	}

	// Generischer Fallback: alle übrigen Knotentypen (RegularElement, Component,
	// IfBlock, EachBlock, AwaitBlock, KeyBlock, SnippetBlock, …) werden über ihre
	// Felder durchlaufen. Das deckt jeden Block-Typ ab, ohne dessen Feldnamen
	// (`consequent`/`alternate`/`body`/`pending`/…) einzeln aufzuzählen.
	for (const [key, value] of Object.entries(node)) {
		if (key === 'start' || key === 'end' || key === 'loc' || key === 'name_loc') {
			continue; // reine Positions-Metadaten, keine Kindknoten
		}
		if (value !== null && typeof value === 'object') {
			walkFragment(value, onText, onAttribute);
		}
	}
}

function lineOf(node: SvelteAstNode): number {
	const start = node.start;
	// svelte/compiler liefert an den meisten Knoten nur einen Zeichen-Offset
	// (`start`), keine Zeile — die Zeile wird deshalb vom Aufrufer aus dem
	// Quelltext nachgerechnet (siehe `lineFromOffset`). `-1` markiert "unbekannt".
	return typeof start === 'number' ? start : -1;
}

/** Rechnet einen Zeichen-Offset in eine 1-basierte Zeilennummer um. */
function lineFromOffset(source: string, offset: number): number {
	if (offset < 0) {
		return 1;
	}
	let line = 1;
	for (let i = 0; i < offset && i < source.length; i++) {
		if (source[i] === '\n') {
			line++;
		}
	}
	return line;
}

export function analyzeSvelteSource(source: string, relativeFilePath: string): Finding[] {
	const findings: Finding[] = [];
	let ast: ReturnType<typeof parse>;
	try {
		ast = parse(source, { modern: true });
	} catch {
		// Nicht parsebares Markup wird übersprungen statt den ganzen Lauf abzubrechen —
		// wird im Bericht als Grenze dokumentiert.
		return findings;
	}

	walkFragment(
		ast.fragment,
		(data, offset) => {
			const words = data.trim().split(/\s+/).filter(Boolean);
			if (words.length < MIN_TEXT_NODE_WORDS) {
				return; // Auftrag: nur Textknoten mit mindestens zwei Wörtern
			}
			const classified = classifyText(data);
			if (!classified) {
				return;
			}
			findings.push({
				file: relativeFilePath,
				line: lineFromOffset(source, offset),
				source: 'svelte-text',
				category: classified.category,
				rawText: data.trim(),
				keySuggestion: suggestKeyForSvelte(relativeFilePath, 'text', data),
				containsNumber: /\d/.test(data),
				reason: classified.reason
			});
		},
		(attrName, text, isDynamic, offset) => {
			const effectiveText = isDynamic ? text : text;
			const classified = classifyText(effectiveText);
			if (!classified) {
				return;
			}
			const category: Category = isDynamic ? 'unklar' : classified.category;
			const reason = isDynamic
				? 'enthält dynamische Interpolation ({…}) — statischer Anteil allein nicht sicher beurteilbar'
				: classified.reason;
			findings.push({
				file: relativeFilePath,
				line: lineFromOffset(source, offset),
				source: 'svelte-attr',
				category,
				rawText: text.trim(),
				attribute: attrName,
				keySuggestion: suggestKeyForSvelte(relativeFilePath, attrName, text),
				containsNumber: /\d/.test(text),
				reason
			});
		}
	);

	return findings;
}

// ---------------------------------------------------------------------------
// formOptions: Record<Enum, string>
// ---------------------------------------------------------------------------

function getComputedOrLiteralKeyText(name: ts.PropertyName, sourceFile: ts.SourceFile): string {
	if (ts.isComputedPropertyName(name)) {
		return name.expression.getText(sourceFile);
	}
	return name.getText(sourceFile);
}

/**
 * Findet alle `export const x: Record<Enum, string> = { ... }`-Literale und liest
 * deren String-Werte aus. Bewusst **streng**: nur exakt diese Form. Objektschlüssel
 * (z.B. `speciesGroups`-Gruppennamen) sind damit ausgeschlossen — dokumentierte
 * Grenze, kein Bug.
 */
export function analyzeFormOptionsSource(source: string, relativeFilePath: string): Finding[] {
	const findings: Finding[] = [];
	const sourceFile = ts.createSourceFile(relativeFilePath, source, ts.ScriptTarget.Latest, true);

	function visit(node: ts.Node): void {
		if (ts.isVariableStatement(node)) {
			for (const decl of node.declarationList.declarations) {
				if (
					decl.type &&
					ts.isTypeReferenceNode(decl.type) &&
					decl.type.typeName.getText(sourceFile) === 'Record' &&
					decl.type.typeArguments &&
					decl.type.typeArguments.length === 2 &&
					decl.type.typeArguments[1]?.kind === ts.SyntaxKind.StringKeyword &&
					decl.initializer &&
					ts.isObjectLiteralExpression(decl.initializer)
				) {
					const recordName = decl.name.getText(sourceFile);
					for (const prop of decl.initializer.properties) {
						if (ts.isPropertyAssignment(prop) && ts.isStringLiteralLike(prop.initializer)) {
							const keyText = getComputedOrLiteralKeyText(prop.name, sourceFile);
							const line =
								sourceFile.getLineAndCharacterOfPosition(prop.initializer.getStart(sourceFile))
									.line + 1;
							const rawText = prop.initializer.text;
							const classified = classifyText(rawText);
							if (!classified) {
								continue;
							}
							findings.push({
								file: relativeFilePath,
								line,
								source: 'form-options',
								category: classified.category,
								rawText,
								context: `${recordName}[${keyText}]`,
								keySuggestion: [
									pathPrefix(relativeFilePath),
									slugify(keyText.replace(/^.*\./, ''), 30)
								].join('_'),
								containsNumber: /\d/.test(rawText),
								reason: classified.reason
							});
						}
					}
				}
			}
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return findings;
}

// ---------------------------------------------------------------------------
// sightingSchema.ts: .label(), .meta({...}), Validierungsmeldungen
// ---------------------------------------------------------------------------

const VALIDATION_METHODS_WITH_MESSAGES = new Set([
	'required',
	'min',
	'max',
	'matches',
	'oneOf',
	'test',
	'typeError',
	'email',
	'url'
]);

function findEnclosingFieldName(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
	let current: ts.Node | undefined = node.parent;
	while (current) {
		if (ts.isPropertyAssignment(current) && !ts.isComputedPropertyName(current.name)) {
			return current.name.getText(sourceFile);
		}
		current = current.parent;
	}
	return undefined;
}

export function analyzeSightingSchemaSource(source: string, relativeFilePath: string): Finding[] {
	const findings: Finding[] = [];
	const sourceFile = ts.createSourceFile(relativeFilePath, source, ts.ScriptTarget.Latest, true);

	function pushFinding(
		rawText: string,
		node: ts.Node,
		contextSuffix: string,
		fieldName: string | undefined
	): void {
		const classified = classifyText(rawText);
		if (!classified) {
			return;
		}
		const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
		const context = [fieldName ?? 'unbekanntesFeld', contextSuffix].join('.');
		findings.push({
			file: relativeFilePath,
			line,
			source: 'yup-schema',
			category: classified.category,
			rawText,
			context,
			keySuggestion: [
				'sighting',
				slugify(fieldName ?? 'feld', 24),
				slugify(contextSuffix, 16)
			].join('_'),
			containsNumber: /\d/.test(rawText),
			reason: classified.reason
		});
	}

	function visit(node: ts.Node): void {
		if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
			const methodName = node.expression.name.text;
			const fieldName = findEnclosingFieldName(node, sourceFile);

			if (methodName === 'label') {
				const arg = node.arguments[0];
				if (arg && ts.isStringLiteralLike(arg)) {
					pushFinding(arg.text, arg, 'label', fieldName);
				}
			} else if (methodName === 'meta') {
				const arg = node.arguments[0];
				if (arg && ts.isObjectLiteralExpression(arg)) {
					for (const prop of arg.properties) {
						if (ts.isPropertyAssignment(prop) && ts.isStringLiteralLike(prop.initializer)) {
							const metaKey = prop.name.getText(sourceFile);
							pushFinding(prop.initializer.text, prop.initializer, `meta.${metaKey}`, fieldName);
						}
					}
				}
			} else if (VALIDATION_METHODS_WITH_MESSAGES.has(methodName)) {
				for (const arg of node.arguments) {
					if (ts.isStringLiteralLike(arg)) {
						pushFinding(arg.text, arg, methodName, fieldName);
					}
				}
			}
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return findings;
}

// ---------------------------------------------------------------------------
// Orchestrierung
// ---------------------------------------------------------------------------

/** Minimal-Schnittstelle für Dateisuche — austauschbar für Tests. */
export interface FileSystemAdapter {
	listFiles(root: string): string[];
	readFile(path: string): string;
}

export const nodeFileSystemAdapter: FileSystemAdapter = {
	listFiles(root: string): string[] {
		const results: string[] = [];
		function walk(dir: string): void {
			for (const entry of readdirSync(dir)) {
				const full = `${dir}${sep}${entry}`;
				const stat = statSync(full);
				if (stat.isDirectory()) {
					if (entry === 'node_modules' || entry === '.svelte-kit') {
						continue;
					}
					walk(full);
				} else {
					results.push(full);
				}
			}
		}
		walk(root);
		return results;
	},
	readFile(path: string): string {
		return readFileSync(path, 'utf-8');
	}
};

function isAdminPath(relativeFilePath: string): boolean {
	const normalized = relativeFilePath.split(sep).join('/');
	return (
		normalized.startsWith('routes/admin/') ||
		normalized.includes('/routes/admin/') ||
		normalized.startsWith('lib/components/admin/') ||
		normalized.includes('/lib/components/admin/')
	);
}

/** Führt die vollständige Inventarisierung aus. Verändert keine Datei. */
export function runInventory(
	options: InventoryOptions,
	fs: FileSystemAdapter = nodeFileSystemAdapter
): InventoryResult {
	const findings: Finding[] = [];
	const includeAdmin = options.includeAdmin ?? false;

	const srcRoot = `${options.root}${sep}src`;
	const allFiles = fs.listFiles(srcRoot);

	for (const absolutePath of allFiles) {
		const relativeFilePath = relative(options.root, absolutePath);
		if (!includeAdmin && isAdminPath(relativeFilePath)) {
			continue;
		}
		const ext = extname(absolutePath);

		if (ext === '.svelte') {
			const source = fs.readFile(absolutePath);
			findings.push(...analyzeSvelteSource(source, relativeFilePath));
			continue;
		}

		const normalized = relativeFilePath.split(sep).join('/');
		const isFormOptionsFile =
			normalized.startsWith('src/lib/report/formOptions/') &&
			normalized.endsWith('.ts') &&
			!normalized.endsWith('.test.ts');
		const isSightingSchemaFile = normalized === 'src/lib/form/validation/sightingSchema.ts';

		if (isFormOptionsFile) {
			const source = fs.readFile(absolutePath);
			findings.push(...analyzeFormOptionsSource(source, relativeFilePath));
		} else if (isSightingSchemaFile) {
			const source = fs.readFile(absolutePath);
			findings.push(...analyzeSightingSchemaSource(source, relativeFilePath));
		}
	}

	markDuplicates(findings);

	return { findings, summary: summarize(findings) };
}

/**
 * Markiert Dubletten über den `reason`-Zusatz — führt sie NICHT zusammen (Auftrag:
 * "Speichern" an zwei Stellen kann in einer anderen Sprache auseinanderfallen).
 */
function markDuplicates(findings: Finding[]): void {
	const groups = new Map<string, Finding[]>();
	for (const finding of findings) {
		const key = `${finding.category}::${finding.rawText}`;
		const group = groups.get(key) ?? [];
		group.push(finding);
		groups.set(key, group);
	}
	for (const group of groups.values()) {
		if (group.length < 2) {
			continue;
		}
		for (const finding of group) {
			const others = group.filter((f) => f !== finding).map((f) => `${f.file}:${f.line}`);
			finding.reason = `${finding.reason} — Dublette, auch in: ${others.join(', ')}`;
		}
	}
}

function emptyCategoryCounts(): Record<Category, number> {
	return { uebersetzbar: 0, technisch: 0, unklar: 0 };
}

function summarize(findings: Finding[]): InventorySummary {
	const byCategory = emptyCategoryCounts();
	const bySourceAndCategory: Record<FindingSource, Record<Category, number>> = {
		'svelte-text': emptyCategoryCounts(),
		'svelte-attr': emptyCategoryCounts(),
		'form-options': emptyCategoryCounts(),
		'yup-schema': emptyCategoryCounts()
	};
	const byFileMap = new Map<string, { total: number; byCategory: Record<Category, number> }>();
	const duplicateKeys = new Set<string>();

	for (const finding of findings) {
		byCategory[finding.category]++;
		bySourceAndCategory[finding.source][finding.category]++;

		const fileEntry = byFileMap.get(finding.file) ?? {
			total: 0,
			byCategory: emptyCategoryCounts()
		};
		fileEntry.total++;
		fileEntry.byCategory[finding.category]++;
		byFileMap.set(finding.file, fileEntry);

		if (finding.reason.includes('Dublette')) {
			duplicateKeys.add(`${finding.category}::${finding.rawText}`);
		}
	}

	const byFile = Array.from(byFileMap.entries())
		.map(([file, data]) => ({ file, total: data.total, byCategory: data.byCategory }))
		.sort((a, b) => b.total - a.total);

	return {
		totalFindings: findings.length,
		byCategory,
		bySourceAndCategory,
		byFile,
		duplicateGroups: duplicateKeys.size
	};
}

// ---------------------------------------------------------------------------
// Berichts-Rendering
// ---------------------------------------------------------------------------

export function renderMarkdownReport(
	result: InventoryResult,
	generatedAt: Date = new Date()
): string {
	const { findings, summary } = result;
	const lines: string[] = [];

	lines.push('# i18n-Inventar — noch nicht übersetzte Zeichenketten');
	lines.push('');
	lines.push(`Erzeugt: ${generatedAt.toISOString()}`);
	lines.push('');
	lines.push(
		'Automatisch erzeugt von `src/tools/i18n-inventory.ts` — ersetzt nichts, schlägt nur vor.'
	);
	lines.push('');
	lines.push('## Gesamtzahlen');
	lines.push('');
	lines.push('| Kategorie | Anzahl |');
	lines.push('| --- | ---: |');
	lines.push(`| uebersetzbar | ${summary.byCategory.uebersetzbar} |`);
	lines.push(`| technisch | ${summary.byCategory.technisch} |`);
	lines.push(`| unklar | ${summary.byCategory.unklar} |`);
	lines.push(`| **gesamt** | **${summary.totalFindings}** |`);
	lines.push('');
	lines.push(
		`**uebersetzbar + unklar (die relevante Zahl für die Übersetzungsplanung): ${
			summary.byCategory.uebersetzbar + summary.byCategory.unklar
		}**`
	);
	lines.push('');
	lines.push(
		`Dubletten-Gruppen (identischer Rohtext an mehreren Stellen, nicht zusammengeführt): ${summary.duplicateGroups}`
	);
	lines.push('');

	lines.push('## Nach Quelle');
	lines.push('');
	lines.push('| Quelle | uebersetzbar | technisch | unklar |');
	lines.push('| --- | ---: | ---: | ---: |');
	for (const source of [
		'svelte-text',
		'svelte-attr',
		'form-options',
		'yup-schema'
	] as FindingSource[]) {
		const counts = summary.bySourceAndCategory[source];
		lines.push(`| ${source} | ${counts.uebersetzbar} | ${counts.technisch} | ${counts.unklar} |`);
	}
	lines.push('');

	lines.push('## Nach Datei');
	lines.push('');
	lines.push('| Datei | gesamt | uebersetzbar | technisch | unklar |');
	lines.push('| --- | ---: | ---: | ---: | ---: |');
	for (const entry of summary.byFile) {
		lines.push(
			`| ${entry.file} | ${entry.total} | ${entry.byCategory.uebersetzbar} | ${entry.byCategory.technisch} | ${entry.byCategory.unklar} |`
		);
	}
	lines.push('');

	lines.push('## Funde je Kategorie und Datei');
	lines.push('');
	for (const category of ['uebersetzbar', 'unklar', 'technisch'] as Category[]) {
		lines.push(`### ${category}`);
		lines.push('');
		const inCategory = findings.filter((f) => f.category === category);
		const byFile = new Map<string, Finding[]>();
		for (const finding of inCategory) {
			const group = byFile.get(finding.file) ?? [];
			group.push(finding);
			byFile.set(finding.file, group);
		}
		const sortedFiles = Array.from(byFile.keys()).sort();
		for (const file of sortedFiles) {
			lines.push(`#### ${file}`);
			lines.push('');
			for (const finding of byFile.get(file)!.sort((a, b) => a.line - b.line)) {
				const numberFlag = finding.containsNumber ? ' 🔢' : '';
				const attr = finding.attribute ? ` [${finding.attribute}]` : '';
				const ctx = finding.context ? ` (${finding.context})` : '';
				lines.push(
					`- L${finding.line}${attr}${ctx}: \`${finding.rawText}\`${numberFlag} → Schlüssel: \`${finding.keySuggestion}\``
				);
			}
			lines.push('');
		}
	}

	return lines.join('\n');
}
