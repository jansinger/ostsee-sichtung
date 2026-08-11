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
import ts from 'typescript';
import {
	checkValue,
	isKnownNoMessageMethod,
	messageArgumentIndex,
	metaKeyDecision,
	type SkipReason
} from './allowlist';
import { formOptionsMessageKey, resolveFieldName, schemaMessageKey } from './messageKey';

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
