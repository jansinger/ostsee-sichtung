/**
 * Persistenz der Spaltenauswahl (`columnVisibility` in `+page.svelte`) in
 * `localStorage`. Reine Parse-/Merge-/Serialisierungslogik ohne Zugriff auf
 * `window` — der Aufrufer entscheidet, wann und ob `localStorage` überhaupt
 * erreichbar ist (SSR-Guard bleibt in der Seite, nicht hier).
 *
 * Format ist versioniert (`{ v: 1, columns: {...} }`), damit ein künftiger
 * Formatwechsel den Altbestand gezielt verwerfen kann, statt ihn
 * misszuinterpretieren.
 */

export const COLUMN_PREFERENCES_STORAGE_KEY = 'admin.sichtungen.columns';
const CURRENT_VERSION = 1;

export interface ColumnPreferences {
	v: number;
	columns: Record<string, boolean>;
}

/**
 * Merged gespeicherte Werte mit den Defaults.
 *
 * - Unbekannte gespeicherte Schlüssel werden ignoriert — sonst würde ein
 *   entfernter alter Schlüssel im Objekt herumliegen.
 * - Im Default fehlende (= neue) Spalten erscheinen mit ihrem Default-Wert —
 *   sonst würde ein alter localStorage-Eintrag künftige Spalten dauerhaft
 *   verstecken, weil sie im gespeicherten Objekt schlicht nicht vorkamen.
 */
export function mergeColumnPreferences<T extends Record<string, boolean>>(
	defaults: T,
	stored: Record<string, boolean> | null | undefined
): T {
	if (!stored) return { ...defaults };
	const merged = { ...defaults };
	for (const key of Object.keys(defaults)) {
		if (typeof stored[key] === 'boolean') {
			merged[key as keyof T] = stored[key] as T[keyof T];
		}
	}
	return merged;
}

/**
 * Parst den rohen `localStorage`-Wert. Kaputtes JSON, eine fremde Version
 * oder ein Wert, der keine Spaltentabelle ist, fallen still auf die Defaults
 * zurück — ein Nutzer soll wegen eines defekten Eintrags nie eine leere
 * Tabelle sehen.
 */
export function loadColumnPreferences<T extends Record<string, boolean>>(
	raw: string | null,
	defaults: T
): T {
	if (!raw) return { ...defaults };

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { ...defaults };
	}

	if (
		typeof parsed !== 'object' ||
		parsed === null ||
		(parsed as Partial<ColumnPreferences>).v !== CURRENT_VERSION ||
		typeof (parsed as Partial<ColumnPreferences>).columns !== 'object' ||
		(parsed as Partial<ColumnPreferences>).columns === null
	) {
		return { ...defaults };
	}

	return mergeColumnPreferences(defaults, (parsed as ColumnPreferences).columns);
}

/** Serialisiert die aktuelle Auswahl in das versionierte Speicherformat. */
export function serializeColumnPreferences(columns: Record<string, boolean>): string {
	const preferences: ColumnPreferences = { v: CURRENT_VERSION, columns };
	return JSON.stringify(preferences);
}

/**
 * Prüft, ob die aktuelle Auswahl exakt dem kuratierten Default entspricht —
 * steuert den „Standard wiederherstellen"-Knopf im Spalten-Dropdown (nur aktiv
 * bei Abweichung).
 *
 * Schlüsselzahl **und** Werte müssen übereinstimmen. Der Schlüsselzahl-Vergleich
 * ist reine Verteidigung: `mergeColumnPreferences` (oben) baut sein Ergebnis
 * immer als `{ ...defaults }` und überschreibt darin nur Schlüssel, die in
 * `defaults` existieren — der zurückgegebene Schlüsselsatz ist damit immer
 * exakt der Default-Schlüsselsatz, nie mehr, nie weniger. Ein `current`, das
 * hier abweicht, kann also nur über einen anderen Aufrufpfad entstehen. Diese
 * Funktion prüft trotzdem beide Seiten, statt sich auf den einen bekannten
 * Aufrufer zu verlassen.
 */
export function isDefaultVisibility(
	current: Record<string, boolean>,
	defaults: Record<string, boolean>
): boolean {
	const currentKeys = Object.keys(current);
	const defaultKeys = Object.keys(defaults);
	if (currentKeys.length !== defaultKeys.length) return false;
	return defaultKeys.every((key) => current[key] === defaults[key]);
}
