/**
 * bannedClasses.ts — die verbotenen Klassenkombinationen als Daten.
 *
 * **Warum eine eigene Datei.** Die drei Regeln standen vorher als
 * Regex-Literale in `page.evaluate()`-Callbacks in `design-tokens.spec.ts`. Das
 * hatte zwei Folgen: Sie waren nur über einen laufenden Browser prüfbar, und
 * niemand konnte sie an einem konstruierten Beispiel scharf stellen. Die
 * Deckkraft-Lücke (unten) ist genau daran über Monate unentdeckt geblieben —
 * gefunden wurde sie von Hand, nicht vom Test.
 *
 * Hier stehen die Regeln deshalb als reine Funktionen, prüfbar in Node
 * (`bannedClasses.test.ts`) und benutzt vom DOM-Scan. Der Browser sammelt nur
 * noch die Klassenlisten ein; gefiltert wird in Node mit **demselben** Code, den
 * der Unit-Test scharf stellt. Eine Regel, die eine Lücke hat, hat sie damit an
 * genau einer Stelle.
 *
 * **Die geschlossene Lücke.** Die Vorgängerversion verlangte hinter dem
 * Farbnamen ein Leerzeichen oder das Zeilenende (`(^|\s)text-success(\s|$)`).
 * Ein Deckkraft-Suffix schiebt sich dazwischen, `text-success/80` rutschte also
 * durch — und das ist keine Randnotiz: `text-success` misst auf `base-100`
 * 3,81:1, mit `/80` weniger. Eine Statusfarbe mit Deckkraft auf einem Tint
 * derselben Farbe ist die Fehlerklasse, für die die `*-content`-Regel überhaupt
 * existiert, nur eine Ebene tiefer.
 *
 * Statt die Grenzen um ein optionales Suffix zu erweitern, splittet dieses Modul
 * die Klassenliste vorher an Weißraum und prüft jede Klasse einzeln gegen ein
 * verankertes Muster. Das ist zu `(^|\s)…(\s|$)` gleichwertig, hat aber kein
 * Überlappungsproblem bei zwei Treffern in einer Liste und benennt in der
 * Fehlermeldung die konkrete Klasse statt der ganzen Zeile.
 *
 * Referenz für die Werte: `.claude/rules/design-system.md`.
 */

/**
 * Untergrenze der Deckkraft für Zeichen, die gelesen werden müssen.
 *
 * `base-content/60` misst 4,94:1 auf `base-100` und 4,62:1 auf `base-200`, `/50`
 * nur noch 3,54 bzw. 3,39:1 (`design-system.md`, im Browser gemessen). Der Wert
 * ist deshalb eine Schwelle und keine Aufzählung: Die Vorgängerversion kannte
 * nur die Literale `40` und `50` und hätte ein `/30` oder `/25` genauso
 * durchgelassen wie das `/80` oben.
 */
export const OPACITY_FLOOR = 60;

/** Ein Element, wie der DOM-Scan es aus dem Browser mitbringt. */
export interface ScannedElement {
	/** Kleingeschriebener Tag-Name, nur für die Fehlermeldung. */
	readonly tag: string;
	/**
	 * Der rohe `class`-Attributwert.
	 *
	 * Muss aus `getAttribute('class')` stammen, **nicht** aus `el.className`:
	 * bei SVG-Elementen ist `className` ein `SVGAnimatedString` und
	 * stringifiziert als `"[object SVGAnimatedString]"` — der Scan würde
	 * ausgerechnet die Icons verfehlen, für die die Statusfarben-Regel gedacht
	 * ist (`Icon.svelte` rendert `<svg class="…">`).
	 */
	readonly classes: string;
	/** Trägt das Element (oder ein Nachfahre) sichtbaren Text? */
	readonly hasText: boolean;
}

/** Eine verbotene Kombination, prüfbar an einer einzelnen Klasse. */
export interface BannedRule {
	/** Erscheint als Begründung in der Fehlermeldung des Tests. */
	readonly hint: string;
	/** Trifft auf **eine** Klasse zu (die Liste ist vorher gesplittet). */
	readonly offends: (className: string) => boolean;
	/**
	 * Nur Elemente mit Textinhalt prüfen.
	 *
	 * Die Deckkraft-Untergrenze gilt laut `design-system.md` für Zeichen, die
	 * gelesen werden müssen — ein dekoratives Leerzustands-Icon auf
	 * `opacity-50` ist zulässig, und die Heatmap-Zelle auf
	 * `text-base-content/30` in `admin/statistics` ist bei Intensität 0 leer.
	 */
	readonly textOnly?: boolean;
}

/**
 * Statusfarben, die ausschließlich Flächenfarbe sind.
 *
 * `primary` und `error` fehlen bewusst: sie erreichen als Textfarbe 9,22:1 bzw.
 * 6,04:1 auf `base-100` und sind dort erlaubt (`design-system.md`,
 * „Statusfarben haben zwei Rollen"). Für Text gehört an die übrigen fünf ein
 * `-strong` — das Muster unten schließt es über die Verankerung aus.
 */
const SURFACE_ONLY_COLORS = ['info', 'success', 'warning', 'secondary', 'accent'] as const;

/** Optionales Tailwind-Deckkraft-Suffix, z. B. das `/80` in `text-success/80`. */
const OPACITY_SUFFIX = String.raw`(?:\/\d{1,3})?`;

const STATUS_AS_FOREGROUND_PATTERN = new RegExp(
	String.raw`^text-(?:${SURFACE_ONLY_COLORS.join('|')})${OPACITY_SUFFIX}$`
);

/**
 * Flächen-Statusfarbe als Vordergrund.
 *
 * Die Verankerung erledigt hier die Arbeit, die vorher ein `grep -v -- -strong`
 * tun sollte: `text-warning-strong` und `text-warning-content` passen nicht auf
 * `^text-warning(/\d+)?$` und werden deshalb nie gemeldet. Genau daran ist die
 * „32 Fundstellen"-Liste in `docs/DESIGN_SYSTEM.md` gescheitert — `grep -o`
 * schnitt das Suffix vor dem Filter ab.
 */
export const STATUS_AS_FOREGROUND: BannedRule = {
	hint: 'Flächen-Statusfarben als Vordergrund verwenden — stattdessen text-*-strong. Bei dekorativen Icons und Zierelementen ist text-base-content/70 die richtige Antwort, nicht -strong.',
	offends: (className) => STATUS_AS_FOREGROUND_PATTERN.test(className)
};

/**
 * `text-base-content/<n>` und `opacity-<n>` — der Zahlwert wird verglichen, nicht
 * aufgezählt.
 */
const OPACITY_BEARING_PATTERN = /^(?:text-base-content\/|opacity-)(\d{1,3})$/;

/** Textfarbe unter der Deckkraft-Untergrenze. */
export const BELOW_OPACITY_FLOOR: BannedRule = {
	hint: `Deckkraft unter /${OPACITY_FLOOR} ist dekorativ, nicht für Text — Sekundärtext gehört auf /70`,
	textOnly: true,
	offends: (className) => {
		const match = OPACITY_BEARING_PATTERN.exec(className);
		return match !== null && Number(match[1]) < OPACITY_FLOOR;
	}
};

/**
 * Tailwind-Paletten-Farben am Theme vorbei.
 *
 * Das Deckkraft-Suffix ist hier aus demselben Grund optional wie oben:
 * `bg-red-500/50` umgeht das Theme genauso vollständig wie `bg-red-500`.
 */
const TAILWIND_PALETTE_PATTERN = new RegExp(
	String.raw`^(?:bg|text|border)-(?:gray|slate|zinc|red|green|blue|yellow|amber|emerald|sky|indigo|orange)-\d{2,3}${OPACITY_SUFFIX}$`
);

/** Tailwind-Paletten-Farbe statt Theme-Token. */
export const TAILWIND_PALETTE: BannedRule = {
	hint: 'Theme-Tokens statt Tailwind-Palette (daisyui.md)',
	offends: (className) => TAILWIND_PALETTE_PATTERN.test(className)
};

/** Standardobergrenze für die Fundliste — mehr als 20 Zeilen liest niemand. */
const DEFAULT_LIMIT = 20;

/**
 * Meldet die Aufrufstellen, die gegen `rule` verstoßen.
 *
 * @returns Liste der Fundstellen (leer = konform), auf `limit` gekürzt.
 */
export function findOffenders(
	rule: BannedRule,
	elements: readonly ScannedElement[],
	limit = DEFAULT_LIMIT
): string[] {
	const offenders: string[] = [];

	for (const element of elements) {
		if (rule.textOnly && !element.hasText) continue;

		const offending = element.classes.split(/\s+/).filter((name) => name && rule.offends(name));
		if (offending.length === 0) continue;

		offenders.push(`<${element.tag}> ${offending.join(' ')} — in class="${element.classes}"`);
		if (offenders.length >= limit) break;
	}

	return offenders;
}
