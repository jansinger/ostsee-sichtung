/**
 * Name des Cookies, über den die Paraglide-Laufzeit die gewählte Sprache persistiert.
 *
 * Der Wert ist kein eigener Entwurf, sondern der Default aus dem erzeugten
 * `src/lib/paraglide/runtime.js` (`export const cookieName = "PARAGLIDE_LOCALE"`,
 * gesetzt von `compiler-options.js` in `@inlang/paraglide-js`). `src/lib/paraglide`
 * liegt nicht im Repository (siehe `.gitignore`) und entsteht erst durch
 * `npm run i18n:compile` — ein späterer Task, der den Cookie lesen oder setzen muss,
 * darf den Namen deshalb nicht raten oder aus der generierten Datei re-exportieren,
 * die zum Bearbeitungszeitpunkt eventuell noch gar nicht existiert. Diese Konstante
 * ist die einzige verlässliche, versionierte Quelle dafür.
 */
export const LOCALE_COOKIE = 'PARAGLIDE_LOCALE';
