/**
 * Ein- und Auspacken der Texte für DeepLs `tag_handling: 'xml'`.
 *
 * Zwei Dinge passieren hier, und die Reihenfolge ist der ganze Trick:
 *
 * 1. **Maskieren.** DeepL parst bei `tag_handling: 'xml'` den gesamten
 *    Quelltext als XML. Ein rohes `&`, `<` oder `>` ist damit kein Zeichen
 *    mehr, sondern ein Syntaxfehler — und er verwirft den kompletten Stapel
 *    von bis zu 50 Segmenten, nicht nur das schuldige.
 * 2. **Einhüllen.** Die `{…}`-Platzhalter kommen in ein `<x>`, das per
 *    `ignore_tags` unübersetzt bleibt.
 *
 * Maskieren muss zuerst laufen, Auspacken in genau umgekehrter Reihenfolge —
 * sonst maskiert Schritt 1 die Hülle aus Schritt 2 weg.
 */

const PLACEHOLDER = /\{[^}]+\}/g;

/** Maskiert XML-Sonderzeichen und hüllt anschließend die Platzhalter ein. */
export function schuetzePlatzhalter(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(PLACEHOLDER, (treffer) => `<x>${treffer}</x>`);
}

/** Nimmt Hülle und Maskierung zurück — `&amp;` zuletzt. */
export function entferneSchutz(text: string): string {
	return text
		.replace(/<x>(\{[^}]*\})<\/x>/g, '$1')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}
