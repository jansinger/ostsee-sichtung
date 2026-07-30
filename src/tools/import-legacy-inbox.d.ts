/**
 * Handgeschriebene Typdeklaration für import-legacy-inbox.js.
 *
 * `src/tools/**\/*.js` ist in tsconfig.json bewusst von der Typprüfung
 * ausgeschlossen — Tool-Skripte sind sonst nirgends importiert und würden nie
 * geprüft. Dieses Skript wird aber von import-legacy-inbox.test.ts importiert,
 * wodurch tsc es trotz Exclude transitiv in den Programmgraphen zieht und mit
 * `checkJs` gegen die vollen `strict`-Regeln prüft (implizite `any`s in den
 * JS-Parametern werden dann zu Fehlern). Diese Deklaration liefert stattdessen
 * bewusst lockere Typen für die Test-Stellvertreter, ohne die
 * JS-Implementierung selbst mit Typannotationen zu verunreinigen.
 *
 * Methoden-Syntax (statt Funktionstyp-Eigenschaften) ist hier Absicht: Sie
 * schaltet TypeScripts bivariante Parameterprüfung ein, die in den Tests
 * verwendete engere Mock-Signaturen (z. B. `(daten: Record<string, unknown>)`
 * oder `()` ganz ohne Parameter) zulässt.
 *
 * `speichere` gibt `{ id: number | undefined }` zurück — das ist die reale
 * Signatur von `saveSighting` (src/lib/server/db/sightingRepository.ts),
 * nicht die schmalere `{ id: number }`, die hier vorher stand. Der Aufrufer
 * in import-legacy-inbox.js behandelt den `undefined`-Fall inzwischen
 * explizit, statt sich auf eine engere Deklaration zu verlassen.
 */
export interface ImportOptions {
	datenVerzeichnis: string;
	mappe?(daten: unknown): unknown;
	speichere?(daten: unknown): Promise<{ id: number | undefined }>;
	/**
	 * Verschiebt eine übernommene Datei von posteingang/ nach importiert/.
	 * Default: `rename` aus `node:fs/promises`. Nur zum Testen des
	 * Verschiebe-Fehlerpfads gedacht — die Signatur entspricht `rename`.
	 */
	renameFile?(quelle: string, ziel: string): Promise<void>;
	/** Wartezeit zwischen Verschiebe-Versuchen in ms (Default: 50, Tests nutzen 0). */
	renameRetryDelayMs?: number;
}

/**
 * Beschreibt eine Sichtung, die bereits gespeichert wurde, deren Datei aber
 * trotz Wiederholungsversuchen nicht nach importiert/ verschoben werden
 * konnte. Tritt dieser Fall auf, bricht `importiere()` den Lauf ab (siehe
 * Kommentar im Quelltext) — ein Aufrufer muss das von einem gewöhnlichen
 * `fehlgeschlagen`-Zähler unterscheiden können, weil hier (anders als bei
 * `fehlgeschlagen`) die Sichtung bereits in der Datenbank existiert.
 */
export interface MoveFailure {
	file: string;
	sightingId: number;
	message: string;
}

export function importiere(
	optionen: ImportOptions
): Promise<{ uebernommen: number; fehlgeschlagen: number; moveFailure: MoveFailure | null }>;
