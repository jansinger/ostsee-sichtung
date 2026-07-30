/**
 * Handgeschriebene Typdeklaration für import-legacy-inbox.js.
 *
 * `src/tools/**\/*.js` ist in tsconfig.json bewusst von der Typprüfung
 * ausgeschlossen — Tool-Skripte sind sonst nirgends importiert und würden nie
 * geprüft. Dieses Skript wird aber von import-legacy-inbox.test.ts importiert,
 * wodurch tsc es trotz Exclude transitiv in den Programmgraphen zieht und mit
 * `checkJs` gegen die vollen `strict`-Regeln prüft (implizite `any`s in den
 * JS-Parametern werden dann zu Fehlern). Diese Deklaration liefert stattdessen
 * bewusst lockere Typen für die beiden Test-Stellvertreter, ohne die
 * JS-Implementierung selbst mit Typannotationen zu verunreinigen.
 *
 * Methoden-Syntax (statt Funktionstyp-Eigenschaften) ist hier Absicht: Sie
 * schaltet TypeScripts bivariante Parameterprüfung ein, die in den Tests
 * verwendete engere Mock-Signaturen (z. B. `(daten: Record<string, unknown>)`
 * oder `()` ganz ohne Parameter) zulässt.
 */
export interface ImportOptions {
	datenVerzeichnis: string;
	mappe?(daten: unknown): unknown;
	speichere?(daten: unknown): Promise<{ id: number }>;
}

export function importiere(
	optionen: ImportOptions
): Promise<{ uebernommen: number; fehlgeschlagen: number }>;
