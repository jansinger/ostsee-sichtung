/**
 * Geteilte Darstellungsvariante der Hinweis-Komponenten unter `info/`.
 *
 * Denselben Namen trägt die Prop an `SpeciesIdentificationHelp` — die drei
 * Komponenten erscheinen immer gemeinsam (eingebettet in der Formularhilfe oder
 * nebeneinander auf `/bestimmungshilfe`) und müssen deshalb dieselbe Sprache
 * sprechen.
 *
 * - `inline`: eingebettet in der zugeklappten Formularhilfe — h4, kompakte Schrift
 * - `page`: eigenständige Seite — h2, Fließtextgröße (die h1 gehört der Route)
 */
export type InfoVariant = 'inline' | 'page';

export type InfoStyles = {
	headingTag: 'h2' | 'h4';
	headingClass: string;
	bodyClass: string;
	iconWidth: string;
};

const INLINE: InfoStyles = {
	headingTag: 'h4',
	headingClass: 'font-semibold',
	bodyClass: 'mt-1 text-xs',
	iconWidth: '16'
};

const PAGE: InfoStyles = {
	headingTag: 'h2',
	headingClass: 'text-2xl font-bold',
	bodyClass: 'mt-1 text-base',
	iconWidth: '24'
};

/**
 * Die Klassennamen stehen hier ausgeschrieben und werden nicht zusammengesetzt:
 * Tailwind erzeugt eine Utility nur, wenn ihr Name als vollständiger String im
 * gescannten Quelltext steht (siehe .claude/rules/daisyui.md).
 */
export function infoStyles(variant: InfoVariant): InfoStyles {
	return variant === 'page' ? PAGE : INLINE;
}
