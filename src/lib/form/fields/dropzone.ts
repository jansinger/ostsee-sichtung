/**
 * Basis-Klassen für die Dropzone.
 *
 * Nutzt Theme-Tokens statt Tailwind-Grays: Das Projekt hat genau ein Theme
 * (`meeresmuseum`, siehe src/app.css) und keinen Dark Mode — `dark:`-Varianten
 * wären hier wirkungslos. Siehe .claude/rules/design-system.md.
 */
export const dropzoneBaseClass =
	'flex flex-col justify-center items-center w-full h-64 bg-base-200 rounded-lg border-2 border-base-300 border-dashed cursor-pointer hover:bg-base-300 hover:border-primary/50 transition-colors';
