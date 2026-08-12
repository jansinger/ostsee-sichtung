/**
 * Sammelt die Stellen in `sightingSchema.ts`, die zu Botschaften werden.
 *
 * Ergebnis sind Zeichen-Offsets, keine Textersetzungen: Wer den Diff baut
 * (`render.ts`), schneidet damit exakt das Literal samt Anführungszeichen aus.
 * Eine Ersetzung per Suchen-und-Ersetzen über den Rohtext wäre an den 19
 * Dubletten falsch.
 *
 * Was NICHT gesammelt wird, wird nicht verschwiegen: Jede übersprungene
 * Zeichenkette landet mit Grund in `skipped` und erscheint im Trockenlauf. Das
 * ist die einzige Stelle, an der ein Mensch eine zu enge Allowlist bemerken
 * kann.
 */
import { parse } from 'svelte/compiler';
import ts from 'typescript';
import {
	checkValue,
	isKnownNoMessageMethod,
	messageArgumentIndex,
	metaKeyDecision,
	type SkipReason
} from './allowlist';
import {
	formOptionsMessageKey,
	resolveFieldName,
	schemaMessageKey,
	svelteMessageKey
} from './messageKey';

export interface ExtractionSite {
	file: string;
	line: number;
	/** Zeichen-Offset des Literals, einschließlich Anführungszeichen. */
	start: number;
	end: number;
	text: string;
	key: string;
	aspect: string;
	field: string;
}

export interface SkippedSite {
	file: string;
	line: number;
	text: string;
	aspect: string;
	reason: SkipReason;
	explanation: string;
}

export interface CollectResult {
	sites: ExtractionSite[];
	skipped: SkippedSite[];
}

/**
 * Der lokale Name, unter dem `$lib/paraglide/messages` als Namespace
 * importiert ist (`import * as m from '$lib/paraglide/messages'` → `'m'`).
 *
 * `undefined`, wenn die Datei das Modul nicht (mehr) per Namespace-Import
 * bindet — dann kann auch kein Aufruf als Paraglide-Botschaftsaufruf gelten.
 * Bewusst kein Raten über den Bezeichner: Nur ein Namespace-Import aus genau
 * diesem Modulpfad zählt, kein benannter Import und kein anderes Modul, das
 * zufällig auch `m` heißt.
 */
function paraglideMessagesNamespace(sourceFile: ts.SourceFile): string | undefined {
	for (const statement of sourceFile.statements) {
		if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
			continue;
		}
		if (statement.moduleSpecifier.text !== '$lib/paraglide/messages') {
			continue;
		}
		const bindings = statement.importClause?.namedBindings;
		if (bindings && ts.isNamespaceImport(bindings)) {
			return bindings.name.text;
		}
	}
	return undefined;
}

/**
 * Ist `node` ein Aufruf `<messagesNamespace>.<schlüssel>(...)` — also genau
 * die Form, in der Schicht A und B umgebaute Stellen tatsächlich schreiben
 * (`m.sighting_latitude_meta_helptext({}, { locale })`,
 * `m.formoptions_species_harbor_porpoise({}, { locale })`)? Prüft nur den
 * Callee, nicht die Argumentliste — die Signatur ist nicht Teil der
 * Erkennung, nur die Herkunft aus dem Paraglide-Botschaftsmodul.
 */
function isParaglideMessageCall(
	node: ts.Node,
	messagesNamespace: string | undefined
): node is ts.CallExpression {
	if (messagesNamespace === undefined || !ts.isCallExpression(node)) {
		return false;
	}
	return (
		ts.isPropertyAccessExpression(node.expression) &&
		ts.isIdentifier(node.expression.expression) &&
		node.expression.expression.text === messagesNamespace
	);
}

export function collectSchemaSites(
	source: string,
	relativeFilePath: string,
	taken: Set<string>
): CollectResult {
	const sourceFile = ts.createSourceFile(relativeFilePath, source, ts.ScriptTarget.Latest, true);
	const messagesNamespace = paraglideMessagesNamespace(sourceFile);
	const skipped: SkippedSite[] = [];

	/**
	 * Fundstellen ohne Schlüssel. Die Vergabe passiert erst nach dem Sortieren.
	 *
	 * `ts.forEachChild` besucht bei einer Aufrufkette `.max().label().meta()` den
	 * ÄUSSERSTEN Aufruf zuerst — die Funde entstehen also in umgekehrter
	 * Quelltextreihenfolge. Würden die Schlüssel dabei vergeben, hinge das
	 * Zählsuffix `_2` an der im Quelltext FRÜHEREN Stelle, und der Diff läse sich
	 * rückwärts. Deshalb zwei Durchgänge.
	 */
	const candidates: Array<Omit<ExtractionSite, 'key'>> = [];

	const lineOf = (node: ts.Node): number =>
		sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

	const addSite = (literal: ts.StringLiteralLike, aspect: string): void => {
		const check = checkValue(literal.text);
		if (!check.ok) {
			skipped.push({
				file: relativeFilePath,
				line: lineOf(literal),
				text: literal.text,
				aspect,
				reason: check.reason,
				explanation: check.explanation
			});
			return;
		}
		candidates.push({
			file: relativeFilePath,
			line: lineOf(literal),
			start: literal.getStart(sourceFile),
			end: literal.getEnd(),
			text: literal.text,
			aspect,
			field: resolveFieldName(literal, sourceFile) ?? 'unbekanntesFeld'
		});
	};

	const addSkip = (
		node: ts.Node,
		text: string,
		aspect: string,
		reason: SkipReason,
		explanation: string
	): void => {
		skipped.push({
			file: relativeFilePath,
			line: lineOf(node),
			text,
			aspect,
			reason,
			explanation
		});
	};

	const visit = (node: ts.Node): void => {
		if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
			const method = node.expression.name.text;

			if (method === 'label') {
				handlePositional(node, 0, 'label');
			} else if (method === 'meta') {
				handleMeta(node);
			} else if (method === 'test' && isTestObjectForm(node)) {
				handleTestObjectForm(node);
			} else {
				const index = messageArgumentIndex(method);
				if (index !== undefined) {
					if (method === 'test') {
						const nameArg = node.arguments[0];
						if (nameArg && ts.isStringLiteralLike(nameArg)) {
							addSkip(
								nameArg,
								nameArg.text,
								'test.name',
								'test-name-argument',
								'Argument 0 von .test() ist der Testname (errors[field].type)'
							);
						}
					}
					handlePositional(node, index, method);
				} else if (!isKnownNoMessageMethod(method)) {
					reportUnknownMethodLiterals(node, method);
				}
			}
		}
		ts.forEachChild(node, visit);
	};

	function handlePositional(node: ts.CallExpression, index: number, aspect: string): void {
		const arg = node.arguments[index];
		if (!arg) {
			return;
		}
		if (ts.isStringLiteralLike(arg)) {
			addSite(arg, aspect);
			return;
		}
		// Ein Ausdruck mit einem Literal darin (z.B. `other.spec.label ?? 'Rückfall'`,
		// sightingSchema.ts:1421). Ihn zu ersetzen änderte die Bedeutung des `??`.
		const inner = firstStringLiteralWithin(arg);
		if (inner) {
			addSkip(
				inner,
				inner.text,
				aspect,
				'non-literal-argument',
				'Argument ist ein Ausdruck, nicht ein Literal — von Hand zu entscheiden'
			);
		}
	}

	/**
	 * Die Aufgabe-4-Meldung: eine Methode, die weder eine bekannte
	 * Meldungsposition (`MESSAGE_ARGUMENT_INDEX`) noch eine bekannte
	 * Meldungsfreiheit (`NO_MESSAGE_METHOD_REASONS`) hat. Genau das war die
	 * Lücke, in der `.integer(message)` an vier Feldern verschwand — weder
	 * Fund noch Übersprungen.
	 *
	 * Meldet jedes DIREKTE String-Literal-Argument (keine verschachtelten
	 * Ausdrücke — dasselbe Prinzip wie `firstStringLiteralWithin` weiter unten:
	 * ein Literal aus einem Callback-Rumpf ist kein übergangenes
	 * Meldungsargument, sondern irgendein Vergleichstext im Prüfcode).
	 */
	function reportUnknownMethodLiterals(node: ts.CallExpression, method: string): void {
		for (const arg of node.arguments) {
			if (ts.isStringLiteralLike(arg)) {
				addSkip(
					arg,
					arg.text,
					method,
					'method-unknown',
					`.${method}(...) steht weder in MESSAGE_ARGUMENT_INDEX noch in ` +
						'NO_MESSAGE_METHOD_REASONS (allowlist.ts) — von Hand prüfen, ob dieses Argument ' +
						'eine Meldung trägt, und die passende Liste ergänzen'
				);
			}
		}
	}

	function handleMeta(node: ts.CallExpression): void {
		const arg = node.arguments[0];
		if (!arg) {
			// .meta() ohne Argument — nichts zu entscheiden, nichts zu melden.
			return;
		}
		if (!ts.isObjectLiteralExpression(arg)) {
			// z.B. `.meta(sightingFromTextBase.spec.meta ?? {})` (sightingSchema.ts:1422).
			// Die geschlossene Allowlist gilt nur für Objektliterale — hier kann sie gar
			// nicht prüfen, ob ein sprachlicher Schlüssel drinsteckt.
			addSkip(
				arg,
				arg.getText(sourceFile),
				'meta',
				'non-literal-argument',
				'meta(...) erhält kein Objektliteral, sondern einen Ausdruck — von Hand prüfen, ' +
					'ob die referenzierte(n) Quelle(n) sprachliche Schlüssel (helpText/placeholder/valueText) tragen'
			);
			return;
		}
		for (const prop of arg.properties) {
			if (ts.isSpreadAssignment(prop)) {
				// `{ ...base, type: 'x' }` — die gespreadeten Eigenschaften entziehen sich
				// der Schlüsselprüfung komplett.
				addSkip(
					prop,
					prop.getText(sourceFile),
					'meta',
					'non-literal-argument',
					'Spread in meta({...}) — von Hand prüfen, ob die gespreadete Quelle sprachliche ' +
						'meta-Schlüssel (helpText/placeholder/valueText) enthält'
				);
				continue;
			}
			if (ts.isShorthandPropertyAssignment(prop)) {
				// `{ helpText }` — derselbe erlaubte Schlüssel, aber ohne Literal-Initializer.
				const key = prop.name.getText(sourceFile);
				addSkip(
					prop,
					prop.getText(sourceFile),
					`meta.${key}`,
					'non-literal-argument',
					`meta.${key} steht als Kurzschreibweise ({ ${key} }) ohne Literal — von Hand prüfen, ` +
						`ob die referenzierte Variable ${key} sprachlich ist`
				);
				continue;
			}
			if (!ts.isPropertyAssignment(prop) || ts.isComputedPropertyName(prop.name)) {
				continue;
			}
			const key = prop.name.getText(sourceFile);
			const decision = metaKeyDecision(key);
			if (decision.kind === 'unknown') {
				throw new Error(
					`${relativeFilePath}:${lineOf(prop)} — ${decision.explanation}. ` +
						'Eintragen in TRANSLATABLE_META_KEYS oder META_DENY_REASONS (allowlist.ts), ' +
						'nicht raten.'
				);
			}
			if (decision.kind === 'skip') {
				if (ts.isStringLiteralLike(prop.initializer)) {
					addSkip(
						prop.initializer,
						prop.initializer.text,
						`meta.${key}`,
						decision.reason,
						decision.explanation
					);
				}
				continue;
			}
			if (ts.isStringLiteralLike(prop.initializer)) {
				addSite(prop.initializer, `meta.${key}`);
				continue;
			}
			if (isParaglideMessageCall(prop.initializer, messagesNamespace)) {
				// Schon umgebaut: `helpText: m.sighting_x_meta_helptext({}, { locale })` —
				// erledigte Arbeit, kein offener Fall (siehe SkipReason 'already-translated').
				addSkip(
					prop.initializer,
					prop.initializer.getText(sourceFile),
					`meta.${key}`,
					'already-translated',
					`meta.${key} ruft bereits eine Paraglide-Botschaftsfunktion auf — schon übersetzt`
				);
				continue;
			}
			// Erlaubter Schlüssel (z.B. helpText), aber der Wert ist kein Literal
			// (`{ helpText: someVar }`) — die Allowlist kann den Inhalt nicht prüfen.
			addSkip(
				prop.initializer,
				prop.initializer.getText(sourceFile),
				`meta.${key}`,
				'non-literal-argument',
				`meta.${key} ist ein sprachlicher Schlüssel, aber der Wert ist kein Literal — von Hand ` +
					'prüfen, ob der referenzierte Ausdruck einen Anzeigetext liefert'
			);
		}
	}

	function isTestObjectForm(node: ts.CallExpression): boolean {
		const arg = node.arguments[0];
		return arg !== undefined && ts.isObjectLiteralExpression(arg);
	}

	function handleTestObjectForm(node: ts.CallExpression): void {
		const arg = node.arguments[0];
		if (!arg || !ts.isObjectLiteralExpression(arg)) {
			return;
		}
		for (const prop of arg.properties) {
			if (ts.isSpreadAssignment(prop)) {
				// `{ ...base, message: 'x' }` — ob darin ein `message` steckt, entzieht
				// sich der Prüfung komplett.
				addSkip(
					prop,
					prop.getText(sourceFile),
					'test',
					'non-literal-argument',
					'Spread in der Objektform von .test({...}) — von Hand prüfen, ob die gespreadete ' +
						'Quelle eine message trägt'
				);
				continue;
			}
			if (ts.isShorthandPropertyAssignment(prop)) {
				// `{ message }` — derselbe erlaubte Schlüssel, aber ohne Literal-Initializer.
				const key = prop.name.getText(sourceFile);
				addSkip(
					prop,
					prop.getText(sourceFile),
					'test',
					'non-literal-argument',
					`test({ ${key} }) steht als Kurzschreibweise ohne Literal — von Hand prüfen, ob die ` +
						`referenzierte Variable ${key} sprachlich ist`
				);
				continue;
			}
			if (!ts.isPropertyAssignment(prop) || ts.isComputedPropertyName(prop.name)) {
				continue;
			}
			const key = prop.name.getText(sourceFile);
			if (key === 'name') {
				if (ts.isStringLiteralLike(prop.initializer)) {
					addSkip(
						prop.initializer,
						prop.initializer.text,
						'test.name',
						'test-name-argument',
						'name in der Objektform von .test() ist der Testname'
					);
				}
				continue;
			}
			if (key === 'message') {
				if (ts.isStringLiteralLike(prop.initializer)) {
					addSite(prop.initializer, 'test');
					continue;
				}
				if (isParaglideMessageCall(prop.initializer, messagesNamespace)) {
					// Schon umgebaut: `message: m.sighting_x_test({}, { locale })`.
					addSkip(
						prop.initializer,
						prop.initializer.getText(sourceFile),
						'test',
						'already-translated',
						'message in der Objektform von .test() ruft bereits eine Paraglide-Botschaftsfunktion ' +
							'auf — schon übersetzt'
					);
					continue;
				}
				// Erlaubter Schlüssel, aber der Wert ist kein Literal — von Hand zu prüfen.
				addSkip(
					prop.initializer,
					prop.initializer.getText(sourceFile),
					'test',
					'non-literal-argument',
					'message in der Objektform von .test() ist kein Literal — von Hand prüfen, ob der ' +
						'referenzierte Ausdruck einen Anzeigetext liefert'
				);
			}
		}
	}

	/**
	 * Das erste String-Literal in einem Ausdruck — für die Meldung „von Hand zu
	 * entscheiden".
	 *
	 * **Steigt nicht in Funktionsrümpfe ab.** Bei der zweiargumentigen Form
	 * `.test('name', (value) => …)` stünde an Position 1 eine Funktion; ein
	 * Literal aus deren Rumpf wäre kein „nicht ersetztes Argument", sondern
	 * irgendein Zeichenkettenvergleich im Prüfcode. Es zu melden füllte den
	 * Abschnitt „Übersprungen" mit Rauschen — genau den Abschnitt, den ein
	 * Mensch Zeile für Zeile lesen soll (Aufgabe 1.5, Schritt 10).
	 */
	function firstStringLiteralWithin(node: ts.Node): ts.StringLiteralLike | undefined {
		if (
			ts.isArrowFunction(node) ||
			ts.isFunctionExpression(node) ||
			ts.isFunctionDeclaration(node)
		) {
			return undefined;
		}
		let found: ts.StringLiteralLike | undefined;
		const walk = (n: ts.Node): void => {
			if (found) {
				return;
			}
			if (ts.isStringLiteralLike(n)) {
				found = n;
				return;
			}
			if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
				return;
			}
			ts.forEachChild(n, walk);
		};
		walk(node);
		return found;
	}

	visit(sourceFile);

	// Zweiter Durchgang: erst jetzt, in Quelltextreihenfolge, die Schlüssel.
	const sites: ExtractionSite[] = candidates
		.sort((a, b) => a.start - b.start)
		.map((candidate) => ({
			...candidate,
			key: schemaMessageKey(candidate.field, candidate.aspect, taken)
		}));

	skipped.sort((a, b) => a.line - b.line);
	return { sites, skipped };
}

/**
 * Sammelt die Werte der `export const xLabels: Record<Enum, string>`-Literale.
 *
 * Bewusst dasselbe strenge Muster wie `analyzeFormOptionsSource`
 * (i18n-inventory.ts:518) — nicht mehr. Die drei Gruppennamen in `speciesGroups`
 * sind Objekt-SCHLÜSSEL und zugleich Anzeigetext; sie brauchen eine Trennung von
 * Schlüssel und Text, die ein Werkzeug nicht raten kann. Sie stehen deshalb in
 * Entwurf Abschnitt 5 als benannte Handarbeit, nicht hier.
 */
export function collectFormOptionsSites(
	source: string,
	relativeFilePath: string,
	taken: Set<string>
): CollectResult {
	const sourceFile = ts.createSourceFile(relativeFilePath, source, ts.ScriptTarget.Latest, true);
	const sites: ExtractionSite[] = [];
	const skipped: SkippedSite[] = [];
	const fileBaseName = relativeFilePath.replace(/^.*[/\\]/, '').replace(/\.ts$/, '');

	const lineOf = (node: ts.Node): number =>
		sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

	/**
	 * Alle String-Literale unterhalb von `node`, ohne in verschachtelte
	 * Funktionsrümpfe abzusteigen (Befund 1c: eine Zeichenkette im Rumpf einer
	 * Callback-Funktion gehört nicht zur `return`-Anweisung, die sie umschließt).
	 */
	function collectStringLiteralsWithin(node: ts.Node): ts.StringLiteralLike[] {
		const found: ts.StringLiteralLike[] = [];
		const walk = (n: ts.Node): void => {
			if (ts.isStringLiteralLike(n)) {
				found.push(n);
				return;
			}
			if (ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isFunctionDeclaration(n)) {
				return;
			}
			ts.forEachChild(n, walk);
		};
		walk(node);
		return found;
	}

	/**
	 * Befund 1a/1b: ein `export const`, dessen Initializer ein Objekt- oder
	 * Arrayliteral mit String-Literalen ist, aber das strenge
	 * `Record<Enum, string>`-Muster nicht trifft — z.B. `speciesIdentification`
	 * (Record mit Fremdtyp-Werten) oder `PUBLIC_BOAT_DRIVE_OPTIONS`
	 * (Array-Literal). Wird NICHT eingesammelt, nur gemeldet: Die Struktur ist
	 * zu uneinheitlich, um sie automatisch in Schlüssel und Text zu zerlegen.
	 */
	function reportUnmatchedExport(exportName: string, initializer: ts.Expression): void {
		if (!ts.isObjectLiteralExpression(initializer) && !ts.isArrayLiteralExpression(initializer)) {
			return;
		}
		const literals = collectStringLiteralsWithin(initializer);
		if (literals.length === 0) {
			return;
		}
		skipped.push({
			file: relativeFilePath,
			line: lineOf(initializer),
			text: exportName,
			aspect: 'export',
			reason: 'record-pattern-miss',
			explanation:
				`export const ${exportName} enthält ${literals.length} String-Literal(e), passt aber ` +
				'nicht auf das Muster `export const x: Record<Enum, string>` — von Hand prüfen, ob und ' +
				'wie hier extrahiert werden muss'
		});
	}

	/**
	 * Befund 1c: Rückfalltexte wie `'Nicht angegeben'` oder `'Unbekannt'` in den
	 * `getXLabel`-Funktionen. Gezielt String-Literale in `return`-Anweisungen
	 * exportierter Funktionen — nicht jede Zeichenkette im Modul, sonst würde
	 * der Übersprungen-Abschnitt mit Rauschen aus Vergleichs- und Hilfscode
	 * gefüllt.
	 */
	function reportReturnLiterals(fnName: string, body: ts.Node): void {
		const walk = (n: ts.Node): void => {
			if (ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isFunctionDeclaration(n)) {
				return;
			}
			if (ts.isReturnStatement(n) && n.expression) {
				for (const literal of collectStringLiteralsWithin(n.expression)) {
					skipped.push({
						file: relativeFilePath,
						line: lineOf(literal),
						text: literal.text,
						aspect: `${fnName} (return)`,
						reason: 'record-pattern-miss',
						explanation:
							`Rückfalltext in einer return-Anweisung der exportierten Funktion ${fnName} — ` +
							'vom Muster `export const x: Record<Enum, string>` nicht erfasst, von Hand prüfen'
					});
				}
			}
			ts.forEachChild(n, walk);
		};
		ts.forEachChild(body, walk);
	}

	const isExported = (node: ts.Node): boolean =>
		ts.canHaveModifiers(node) &&
		(ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

	const visit = (node: ts.Node): void => {
		if (ts.isVariableStatement(node)) {
			for (const decl of node.declarationList.declarations) {
				if (!decl.initializer) {
					continue;
				}
				if (
					isStringRecordDeclaration(decl, sourceFile) &&
					ts.isObjectLiteralExpression(decl.initializer)
				) {
					const recordName = decl.name.getText(sourceFile);
					for (const prop of decl.initializer.properties) {
						if (!ts.isPropertyAssignment(prop) || !ts.isStringLiteralLike(prop.initializer)) {
							continue;
						}
						const enumKey = ts.isComputedPropertyName(prop.name)
							? prop.name.expression.getText(sourceFile)
							: prop.name.getText(sourceFile);
						const line = lineOf(prop.initializer);
						const check = checkValue(prop.initializer.text);
						if (!check.ok) {
							skipped.push({
								file: relativeFilePath,
								line,
								text: prop.initializer.text,
								aspect: `${recordName}[${enumKey}]`,
								reason: check.reason,
								explanation: check.explanation
							});
							continue;
						}
						sites.push({
							file: relativeFilePath,
							line,
							start: prop.initializer.getStart(sourceFile),
							end: prop.initializer.getEnd(),
							text: prop.initializer.text,
							key: formOptionsMessageKey(fileBaseName, enumKey, taken),
							aspect: `${recordName}[${enumKey}]`,
							field: recordName
						});
					}
					continue;
				}
				if (isExported(node)) {
					reportUnmatchedExport(decl.name.getText(sourceFile), decl.initializer);
				}
			}
		}
		if (ts.isFunctionDeclaration(node) && isExported(node) && node.body) {
			reportReturnLiterals(node.name?.getText(sourceFile) ?? 'anonym', node.body);
		}
		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
	return { sites, skipped };
}

function isStringRecordDeclaration(
	decl: ts.VariableDeclaration,
	sourceFile: ts.SourceFile
): boolean {
	return (
		decl.type !== undefined &&
		ts.isTypeReferenceNode(decl.type) &&
		decl.type.typeName.getText(sourceFile) === 'Record' &&
		decl.type.typeArguments?.length === 2 &&
		decl.type.typeArguments[1]?.kind === ts.SyntaxKind.StringKeyword
	);
}

// ---------------------------------------------------------------------------
// collectSvelteSites — Aufgabe 2.2 ("Der Extraktor lernt Svelte")
// ---------------------------------------------------------------------------

/**
 * Sammelt Textknoten und Attributwerte aus Svelte-Markup, die zu Botschaften
 * werden können.
 *
 * Traversierung angelehnt an `analyzeSvelteSource` (i18n-inventory.ts:424) —
 * VORLAGE, nicht Import (siehe Dateikopf): `classifyText` von dort liegt an
 * belegten Stellen falsch, dieser Sammler entscheidet stattdessen rein
 * strukturell (siehe Tabelle in `docs/i18n/PLAN_ETAPPE2.md`, Aufgabe 2.2).
 * Derselbe Grund, aus dem `Comment`-Knoten nie als Text erfasst werden, gilt
 * hier unverändert: Ihr Inhalt steckt im String-Feld `data`, die Traversierung
 * steigt dort nie ab (`visitNode` gibt für `'Comment'` sofort zurück).
 */
const SVELTE_TARGET_ATTRIBUTES = new Set(['placeholder', 'title', 'aria-label', 'alt']);

/** Mindestens eine Buchstabengruppe — Unicode-bewusst (Umlaute zählen als Buchstaben). */
const LETTER_GROUP = /\p{L}/u;
const HAS_DIGIT = /\d/;

interface SvelteAstNode {
	type?: string;
	start?: number;
	end?: number;
	data?: string;
	name?: string;
	[key: string]: unknown;
}

function isSvelteNode(value: unknown): value is SvelteAstNode {
	return (
		typeof value === 'object' && value !== null && typeof (value as SvelteAstNode).type === 'string'
	);
}

export function collectSvelteSites(
	source: string,
	relativeFilePath: string,
	taken: Set<string>
): CollectResult {
	const skipped: SkippedSite[] = [];

	// Zweiter Durchgang wie in `collectSchemaSites` (siehe dortiger Kommentar):
	// Kandidaten sammeln, nach `start` sortieren, dann erst Schlüssel vergeben.
	// Anders als bei `ts.forEachChild` über Aufrufketten besucht ein Walk über
	// die Kind-Arrays des Svelte-AST ein Fragment bereits in Quelltextreihenfolge
	// — der Test „liefert Fundstellen in Quelltextreihenfolge" unten belegt das.
	// Der zweite Durchgang bleibt trotzdem stehen: Er ist unabhängig von dieser
	// Beobachtung immer korrekt, und sich auf eine unbewiesene Traversierungs-
	// Eigenschaft zu verlassen wäre genau der Fehler, den `collectSchemaSites`
	// einmal gemacht hat.
	const candidates: Array<Omit<ExtractionSite, 'key'>> = [];

	let ast: ReturnType<typeof parse>;
	try {
		ast = parse(source, { modern: true });
	} catch {
		// Nicht parsebares Markup wird übersprungen statt den ganzen Lauf
		// abzubrechen — dieselbe Grenze wie `analyzeSvelteSource`.
		return { sites: [], skipped: [] };
	}

	const lineOf = (offset: number): number => {
		let line = 1;
		for (let i = 0; i < offset && i < source.length; i++) {
			if (source[i] === '\n') {
				line++;
			}
		}
		return line;
	};

	const addSite = (
		start: number,
		end: number,
		text: string,
		aspect: string,
		elementName: string
	): void => {
		if (HAS_DIGIT.test(text)) {
			skipped.push({
				file: relativeFilePath,
				line: lineOf(start),
				text,
				aspect,
				reason: 'plural-candidate',
				explanation:
					'enthält eine Ziffer — möglicher ICU-Plural, menschliche Entscheidung (Aufgabe 2.4)'
			});
			return;
		}
		if (!LETTER_GROUP.test(text)) {
			skipped.push({
				file: relativeFilePath,
				line: lineOf(start),
				text,
				aspect,
				reason: 'no-letter-group',
				explanation: 'keine Buchstabengruppe — reine Satzzeichen, Symbole oder Zahlen'
			});
			return;
		}
		candidates.push({
			file: relativeFilePath,
			line: lineOf(start),
			start,
			end,
			text,
			aspect,
			field: elementName
		});
	};

	/** Attributwerte: `placeholder`/`title`/`aria-label`/`alt`, rein statisch. */
	function handleAttributes(attributes: unknown, elementName: string): void {
		if (!Array.isArray(attributes)) {
			return;
		}
		for (const attr of attributes) {
			if (!isSvelteNode(attr) || attr.type !== 'Attribute') {
				continue; // Spread-Attribute, Direktiven (`use:`, `on:`, …) — nicht unser Fall
			}
			const name = typeof attr.name === 'string' ? attr.name : '';
			if (!SVELTE_TARGET_ATTRIBUTES.has(name)) {
				continue;
			}
			const value = attr.value;
			if (value === true || value === undefined) {
				continue; // Bool-Shortcut (`disabled`) oder ohne Wert — kein Sprachtext
			}
			const start = typeof attr.start === 'number' ? attr.start : 0;
			const end = typeof attr.end === 'number' ? attr.end : 0;
			const parts: unknown[] = Array.isArray(value) ? value : [value];
			let text = '';
			let isDynamic = false;
			for (const part of parts) {
				if (isSvelteNode(part) && part.type === 'Text' && typeof part.data === 'string') {
					text += part.data;
				} else {
					isDynamic = true;
				}
			}
			if (isDynamic) {
				// Enthält mindestens einen `{ausdruck}`-Anteil — `attr={m.key()}` hätte
				// keinen Platz mehr dafür.
				skipped.push({
					file: relativeFilePath,
					line: lineOf(start),
					text: source.slice(start, end),
					aspect: name,
					reason: 'dynamic-attribute',
					explanation: `Attribut ${name} enthält einen dynamischen Anteil ({ausdruck}) — kein reines Literal`
				});
				continue;
			}
			const trimmed = text.trim();
			if (trimmed.length === 0) {
				continue; // z.B. `alt=""` — kein Fund, keine Meldung
			}
			addSite(start, end, trimmed, name, elementName);
		}
	}

	/** Geschwister eines Textknotens, ohne reine Formatierung (Whitespace/Kommentar). */
	function significantSiblings(siblings: SvelteAstNode[], self: SvelteAstNode): SvelteAstNode[] {
		return siblings.filter(
			(n) =>
				n !== self &&
				n.type !== 'Comment' &&
				!(n.type === 'Text' && typeof n.data === 'string' && n.data.trim() === '')
		);
	}

	/**
	 * Enthält dieser Teilbaum irgendwo einen Textknoten mit Buchstabengruppe?
	 * Icon-Komponenten (`<SaveIcon />`), `<svg>`, `<img>` oder ein leerer
	 * `<span>` haben keinen Text in ihrem Teilbaum — ein Geschwister ohne
	 * eigenen Text hat keine Wortstellung, die eine Übersetzung brechen könnte,
	 * und macht einen benachbarten Textknoten deshalb NICHT zum Satzfragment.
	 * `<strong>Meldung</strong>` dagegen enthält Text und bleibt fragmentbildend.
	 *
	 * Reine Text-Erkennung, nichts weiter: Ob ein Geschwister zusätzlich (oder
	 * stattdessen) DYNAMISCH ist — ein `{ausdruck}` oder ein Kontrollfluss-Block
	 * (`{#if}`/`{#each}`/`{#await}`/`{#key}`) —, entscheidet die eigenständige
	 * Funktion `nodeHasDynamicContent`. Die beiden Fragen sind unabhängig
	 * voneinander zu beantworten: `{#each admins as a}{a.name}{/each}` enthält
	 * keinen Textknoten (kein Treffer hier), ist aber dynamisch (Treffer dort).
	 */
	function nodeContainsLetterText(node: SvelteAstNode): boolean {
		if (node.type === 'Comment' || node.type === 'ExpressionTag') {
			return false;
		}
		if (node.type === 'Text') {
			const data = typeof node.data === 'string' ? node.data : '';
			return data.trim().length > 0 && LETTER_GROUP.test(data);
		}
		for (const [key, value] of Object.entries(node)) {
			if (key === 'start' || key === 'end' || key === 'loc' || key === 'name_loc') {
				continue;
			}
			if (isSvelteNode(value) && value.type === 'Fragment' && Array.isArray(value.nodes)) {
				const typed = value.nodes.filter(isSvelteNode);
				if (typed.some(nodeContainsLetterText)) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Die Svelte-AST-Knotentypen der vier Kontrollfluss-Blöcke. Jeder von ihnen
	 * wählt seinen sichtbaren Inhalt zur Laufzeit aus (Bedingung, Iteration,
	 * Promise-Zustand) — unabhängig davon, ob ein Zweig selbst wieder ein
	 * `{ausdruck}` enthält oder nur statischen Text trägt.
	 */
	const DYNAMIC_BLOCK_TYPES = new Set(['IfBlock', 'EachBlock', 'AwaitBlock', 'KeyBlock']);

	/**
	 * Ist `node` selbst ein dynamischer Ausdruck oder enthält er irgendwo in
	 * seinem Teilbaum einen — ein `ExpressionTag` (`{count}`) oder einen der
	 * vier Kontrollfluss-Blöcke (`{#if}`/`{#each}`/`{#await}`/`{#key}`)?
	 *
	 * **Der Befund, den diese Funktion schließt:** `nodeContainsLetterText` gab
	 * für `ExpressionTag` bislang `false` zurück, und die Traversierung stieg
	 * für Kontrollfluss-Blöcke zwar in ihre Fragmente ab (um Buchstabentext
	 * DARIN zu finden), erkannte den Block selbst aber nirgends als dynamisch.
	 * Für `<p>Admins: {#each admins as a}{a.name}{/each}</p>` bedeutete das:
	 * Das `EachBlock`-Geschwister wurde weder über `nodeContainsLetterText`
	 * (sein Fragment enthält nur ein `ExpressionTag`, keinen Textknoten) noch
	 * über den ursprünglichen `n.type === 'ExpressionTag'`-Vergleich (der Typ
	 * ist `EachBlock`, keine direkte Ausdrucks-Geschwisterschaft) erfasst — der
	 * Textknoten „Admins:" rutschte unbemerkt durch beide Regeln und wurde
	 * extrahiert, obwohl seine Fortsetzung zur Laufzeit entsteht.
	 *
	 * Ein Kontrollfluss-Block gilt HIER bereits durch seinen Typ als dynamisch,
	 * unabhängig davon, ob ein Zweig ein `ExpressionTag` enthält: Auch
	 * `{#if online}online{:else}offline{/if}` hat keinen literalen `{ausdruck}`
	 * in seinen Zweigen, wählt aber zur Laufzeit zwischen zwei Texten — dieselbe
	 * Abhilfe (eine ICU-Botschaft mit Parameter, hier ein `select`) gilt trotzdem.
	 */
	function nodeHasDynamicContent(node: SvelteAstNode): boolean {
		if (node.type === 'ExpressionTag' || DYNAMIC_BLOCK_TYPES.has(node.type ?? '')) {
			return true;
		}
		if (node.type === 'Comment' || node.type === 'Text') {
			return false;
		}
		for (const [key, value] of Object.entries(node)) {
			if (key === 'start' || key === 'end' || key === 'loc' || key === 'name_loc') {
				continue;
			}
			if (isSvelteNode(value) && value.type === 'Fragment' && Array.isArray(value.nodes)) {
				const typed = value.nodes.filter(isSvelteNode);
				if (typed.some(nodeHasDynamicContent)) {
					return true;
				}
			}
		}
		return false;
	}

	function handleText(
		node: SvelteAstNode,
		siblings: SvelteAstNode[],
		elementName: string,
		ancestorMixed: boolean
	): void {
		const data = typeof node.data === 'string' ? node.data : '';
		if (data.trim().length === 0) {
			return; // reine Einrückung/Zeilenumbruch zwischen Elementen — kein Fund
		}
		const start = typeof node.start === 'number' ? node.start : 0;
		const end = typeof node.end === 'number' ? node.end : 0;

		const others = significantSiblings(siblings, node);
		// Nur Geschwister, die selbst Text mit Buchstaben tragen oder dynamisch
		// sind (ein `{ausdruck}` oder ein Kontrollfluss-Block darunter — siehe
		// `nodeHasDynamicContent`), machen diesen Textknoten zum Fragment. Ein
		// Icon-Geschwister (`<SaveIcon />` neben "Speichern") hat weder Text noch
		// dynamischen Inhalt und bleibt deshalb außen vor.
		const fragmentCausingSiblings = others.filter(
			(n) => nodeHasDynamicContent(n) || nodeContainsLetterText(n)
		);
		if (fragmentCausingSiblings.length > 0) {
			// Fall 1 (Satzfragment) und Fall 2 (Interpolation) der Tabelle: Der
			// Textknoten ist nicht das einzige Kind seines Elements. Ist die
			// Geschwistergruppe dynamisch — ein `ExpressionTag` oder ein
			// Kontrollfluss-Block (`{#if}`/`{#each}`/`{#await}`/`{#key}`), gleich ob
			// direkt daneben oder eine Ebene darunter —, ist eine ICU-Botschaft mit
			// Parameter nötig (dieselbe Abhilfe für beide Formen, deshalb derselbe
			// Grund); sonst ist es rein statisch ausgezeichneter Text (z.B.
			// `<strong>`), dessen Wortstellung eine Übersetzung pro Teilknoten bricht.
			const hasExpressionSibling = fragmentCausingSiblings.some((n) => nodeHasDynamicContent(n));
			skipped.push({
				file: relativeFilePath,
				line: lineOf(start),
				text: data.trim(),
				aspect: 'text',
				reason: hasExpressionSibling ? 'interpolation' : 'sentence-fragment',
				explanation: hasExpressionSibling
					? 'Geschwister ist dynamisch ({ausdruck} oder ein {#if}/{#each}/{#await}/{#key}-Block, ' +
						'auch verschachtelt) — braucht eine ICU-Botschaft mit Parameter'
					: 'Textknoten hat Geschwister-Elemente — einzeln übersetzt bricht die Wortstellung ' +
						'in jeder Zielsprache (Handarbeit, Aufgabe 2.3)'
			});
			return;
		}

		if (ancestorMixed) {
			// Der Textknoten ist zwar selbst einziges Kind seines direkten
			// Elements (z.B. innerhalb von `<strong>`), aber ein VORFAHR hat
			// gemischten Inhalt — Textknoten mit Buchstaben UND Element-Kinder
			// im selben Fragment (z.B. das umschließende `<p>`). Die Regel „nur
			// direkte Geschwister prüfen" greift dort eine Ebene zu flach: Auf
			// Englisch steht das ausgezeichnete Wort an anderer Stelle im Satz
			// („Thank you for your report" vs. „Vielen Dank für Ihre Meldung"),
			// drei getrennte Botschaften ließen sich nicht zu einem korrekten
			// englischen Satz zusammensetzen (Auftrag, Diagnose).
			skipped.push({
				file: relativeFilePath,
				line: lineOf(start),
				text: data.trim(),
				aspect: 'text',
				reason: 'sentence-fragment',
				explanation:
					'ein Vorfahr-Element hat gemischten Inhalt (Text und Element-Kinder) — dieser ' +
					'Textknoten ist Teil eines Satzes, der zusammen mit den Geschwister-Elementen des ' +
					'Vorfahrs übersetzt werden muss (Handarbeit, Aufgabe 2.3)'
			});
			return;
		}

		// Einziges (bedeutsames) Kind, kein gemischter Vorfahr — aber die
		// Ersetzung soll die Einrückung drumherum nicht mit auffressen:
		// `<p>\n\tEin Text\n</p>` → nur "Ein Text" wird ersetzt, die
		// Zeilenumbrüche bleiben stehen.
		const leadingWs = data.length - data.trimStart().length;
		const trailingWs = data.length - data.trimEnd().length;
		addSite(start + leadingWs, end - trailingWs, data.trim(), 'text', elementName);
	}

	/**
	 * Hat dieses Fragment (eine Geschwistergruppe) gemischten Inhalt — mindestens
	 * einen Textknoten mit Buchstaben UND mindestens ein Element-/Ausdrucks-Kind?
	 * Whitespace-Text und Kommentare zählen für keine der beiden Seiten.
	 *
	 * Das ist die Definition aus dem Auftrag, wörtlich: „kein Vorfahr sowohl
	 * Textknoten mit Buchstaben ALS AUCH Element-Kinder besitzt". `<div><p>Text</p></div>`
	 * ist NICHT mixed — `div`s Fragment enthält nur das Element `p`, keinen Text;
	 * `<li>Nur Text</li>` ist NICHT mixed — `li`s Fragment enthält nur Text, kein
	 * Element. Erst `<p>Text <strong>x</strong></p>` ist mixed. Ein Element-Kind
	 * OHNE eigenen Text (Icon-Komponente, `<svg>`, leerer `<span>`) zählt dabei
	 * NICHT als „Element-Kind" im Sinne dieser Regel — `<h2><MapPin /> Titel</h2>`
	 * ist deshalb nicht mixed, siehe `nodeContainsLetterText`.
	 */
	function fragmentHasMixedContent(nodes: SvelteAstNode[]): boolean {
		let hasLetterText = false;
		let hasTranslationRelevantSibling = false;
		for (const n of nodes) {
			if (n.type === 'Comment') {
				continue;
			}
			if (n.type === 'Text') {
				const data = typeof n.data === 'string' ? n.data : '';
				if (data.trim().length > 0 && LETTER_GROUP.test(data)) {
					hasLetterText = true;
				}
				continue;
			}
			if (nodeHasDynamicContent(n) || nodeContainsLetterText(n)) {
				hasTranslationRelevantSibling = true;
			}
		}
		return hasLetterText && hasTranslationRelevantSibling;
	}

	function visitFragmentNodes(nodes: unknown, elementName: string, ancestorMixed: boolean): void {
		if (!Array.isArray(nodes)) {
			return;
		}
		const typed = nodes.filter(isSvelteNode);
		const disqualified = ancestorMixed || fragmentHasMixedContent(typed);
		for (const node of typed) {
			visitNode(node, typed, elementName, disqualified);
		}
	}

	function visitNode(
		node: SvelteAstNode,
		siblings: SvelteAstNode[],
		parentElementName: string,
		ancestorMixed: boolean
	): void {
		if (node.type === 'Comment') {
			return; // bewusst kein Abstieg — die Kommentar-Gegenprobe im Test belegt das
		}
		if (node.type === 'Text') {
			handleText(node, siblings, parentElementName, ancestorMixed);
			return;
		}
		if (node.type === 'ExpressionTag') {
			return; // reiner Ausdrucksknoten, kein Markup darunter zu besuchen
		}

		const elementName = typeof node.name === 'string' ? node.name : parentElementName;
		if (Array.isArray(node.attributes)) {
			handleAttributes(node.attributes, elementName);
		}

		// Generischer Abstieg über jedes Feld, dessen Wert selbst ein
		// `Fragment`-Knoten ist: `fragment` bei Elementen/Komponenten,
		// `consequent`/`alternate` bei `IfBlock`, `body`/`fallback` bei
		// `EachBlock`, `then`/`catch`/`pending` bei `AwaitBlock`, `fragment` bei
		// `SnippetBlock`, … Jedes gefundene Fragment liefert eine EIGENE
		// Geschwistergruppe — ein Textknoten im `then`-Zweig hat nichts mit einem
		// im `else`-Zweig zu tun. `ancestorMixed` reicht weiter: Ist DIESES Element
		// selbst Teil eines gemischten Vorfahren-Fragments, gilt das für jedes
		// Fragment darunter ebenfalls.
		for (const [key, value] of Object.entries(node)) {
			if (key === 'start' || key === 'end' || key === 'loc' || key === 'name_loc') {
				continue; // reine Positions-Metadaten, keine Kindknoten
			}
			if (isSvelteNode(value) && value.type === 'Fragment') {
				visitFragmentNodes(value.nodes, elementName, ancestorMixed);
			}
		}
	}

	visitFragmentNodes((ast.fragment as { nodes?: unknown }).nodes, relativeFilePath, false);

	const sites: ExtractionSite[] = candidates
		.sort((a, b) => a.start - b.start)
		.map((candidate) => ({
			...candidate,
			key: svelteMessageKey(relativeFilePath, candidate.aspect, candidate.text, taken)
		}));

	skipped.sort((a, b) => a.line - b.line);
	return { sites, skipped };
}
