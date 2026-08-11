/**
 * Feldnamen auflösen und Botschaftsschlüssel vergeben.
 *
 * Das Schlüsselschema stammt aus `i18n-inventory.ts`, damit
 * `docs/i18n-inventory.md` als Nachschlagewerk lesbar bleibt — mit einer
 * behobenen Schwäche: `findEnclosingFieldName` (i18n-inventory.ts:589) läuft zum
 * NÄCHSTEN umschließenden `PropertyAssignment` hoch. Innerhalb von
 * `.when('hasPosition', { is: true, then: … })` heißt der `then`, nicht
 * `latitude`. Im aktuellen Inventar erzeugt das 20 Schlüsselkollisionen, davon
 * `sighting_then_required` für sechs verschiedene Meldungen.
 *
 * `resolveFieldName` sucht deshalb nicht den nächsten, sondern den RICHTIGEN
 * Knoten: die Eigenschaft, die direkt in dem Objektliteral steht, das an
 * `.shape(…)` übergeben wird. Alles darunter (`then`, `otherwise`, `is`, `meta`)
 * wird übersprungen, ohne dass diese Namen aufgezählt werden müssen.
 */
import ts from 'typescript';
import { slugify } from '../i18n-inventory';

/**
 * Der Feldname zu einem Knoten, oder `undefined`, wenn er in keinem
 * `.shape(…)`-Objektliteral liegt.
 */
export function resolveFieldName(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
	let current: ts.Node | undefined = node;
	while (current) {
		if (
			ts.isPropertyAssignment(current) &&
			!ts.isComputedPropertyName(current.name) &&
			isShapeArgumentObject(current.parent)
		) {
			return current.name.getText(sourceFile);
		}
		current = current.parent;
	}
	return undefined;
}

/** Ist dieses Objektliteral das Argument eines `.shape(…)`-Aufrufs? */
function isShapeArgumentObject(node: ts.Node): boolean {
	if (!ts.isObjectLiteralExpression(node)) {
		return false;
	}
	const call = node.parent;
	return (
		call !== undefined &&
		ts.isCallExpression(call) &&
		ts.isPropertyAccessExpression(call.expression) &&
		call.expression.name.text === 'shape' &&
		call.arguments[0] === node
	);
}

/** Die Menge bereits vergebener Schlüssel eines Laufs. */
export function createKeyRegistry(): Set<string> {
	return new Set<string>();
}

export function schemaMessageKey(field: string, aspect: string, taken: Set<string>): string {
	return register(['sighting', slugify(field, 24), slugify(aspect, 24)].join('_'), taken);
}

export function formOptionsMessageKey(
	fileBaseName: string,
	enumKey: string,
	taken: Set<string>
): string {
	// `SpeciesEnum.HARBOR_PORPOISE` → `harbor_porpoise`: Das Enum-Präfix ist an
	// dieser Stelle redundant, der Dateiname trägt dieselbe Information.
	const bareKey = enumKey.replace(/^.*\./, '');
	return register(
		['formoptions', slugify(fileBaseName, 24), slugify(bareKey, 30)].join('_'),
		taken
	);
}

/**
 * Vergibt den Schlüssel und hängt bei Kollision ein Zählsuffix an.
 *
 * Kein Feld darf zwei Botschaften unter einem Schlüssel führen — das wäre die
 * stille Zusammenführung, die dieses Modul gerade verhindern soll.
 */
function register(base: string, taken: Set<string>): string {
	if (!taken.has(base)) {
		taken.add(base);
		return base;
	}
	let counter = 2;
	while (taken.has(`${base}_${counter}`)) {
		counter++;
	}
	const key = `${base}_${counter}`;
	taken.add(key);
	return key;
}
