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
import { checkValue, messageArgumentIndex, metaKeyDecision, type SkipReason } from './allowlist';
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

export function collectSchemaSites(
	source: string,
	relativeFilePath: string,
	taken: Set<string>
): CollectResult {
	const sourceFile = ts.createSourceFile(relativeFilePath, source, ts.ScriptTarget.Latest, true);
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

	const visit = (node: ts.Node): void => {
		if (ts.isVariableStatement(node)) {
			for (const decl of node.declarationList.declarations) {
				if (!isStringRecordDeclaration(decl, sourceFile) || !decl.initializer) {
					continue;
				}
				if (!ts.isObjectLiteralExpression(decl.initializer)) {
					continue;
				}
				const recordName = decl.name.getText(sourceFile);
				for (const prop of decl.initializer.properties) {
					if (!ts.isPropertyAssignment(prop) || !ts.isStringLiteralLike(prop.initializer)) {
						continue;
					}
					const enumKey = ts.isComputedPropertyName(prop.name)
						? prop.name.expression.getText(sourceFile)
						: prop.name.getText(sourceFile);
					const line =
						sourceFile.getLineAndCharacterOfPosition(prop.initializer.getStart(sourceFile)).line +
						1;
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
			}
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
