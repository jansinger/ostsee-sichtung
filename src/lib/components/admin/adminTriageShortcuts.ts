/**
 * @fileoverview Tastatur-Triage des Admin-Bereichs (Spec B1 + Warteschlange).
 *
 * Zwei Flächen, ein Kopf: Der Eingang (`/admin`) und die Detailansicht
 * (`/admin/[id]?from=inbox`) beantworten dieselbe Frage — J/K blättert, A gibt
 * frei, R lehnt ab, U nimmt zurück, ? erklärt. Was sich unterscheidet, ist nur
 * die Ausführung: Im Eingang schiebt `focusNext` den Fokus, in der
 * Detailansicht navigiert es. Die Absicht ist dieselbe, deshalb steht sie
 * einmal hier und nicht zweimal in zwei Seiten.
 *
 * **Bewusst DOM-frei.** `resolveInboxShortcut` prüft das Ereignisziel per
 * Duck-Typing (`ShortcutTarget`) statt mit `instanceof HTMLElement`: So läuft
 * der Test im Node-Runner, und die Sperre lässt sich mit einem Objektliteral
 * durchspielen — mit `instanceof` wäre jeder Fall an einen echten Browser
 * gebunden.
 */

export type InboxShortcutAction =
	'focusNext' | 'focusPrevious' | 'approve' | 'reject' | 'undo' | 'toggleHelp' | 'closeHelp';

/**
 * Das Ereignisziel, soweit die Sperre es liest. `closest` ist optional, weil
 * `event.target` auch das `document` oder das `window` sein kann — beide haben
 * die Methode nicht.
 */
export interface ShortcutTarget {
	tagName?: string;
	isContentEditable?: boolean;
	closest?: (selector: string) => unknown;
}

export interface InboxShortcutEvent {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
	/**
	 * `EventTarget` steht mit im Typ, weil ein echtes `KeyboardEvent` genau den
	 * liefert — und `EventTarget` deklariert keine der drei Eigenschaften unten,
	 * wäre also mit `ShortcutTarget` allein nicht zuweisbar.
	 */
	target: EventTarget | ShortcutTarget | null;
}

/** Ein Eintrag der Hilfe — gleichzeitig die Quelle des Overlays und des Hinweises. */
export interface InboxShortcutHint {
	keys: string[];
	description: string;
}

/**
 * Reihenfolge wie im Arbeitsablauf: erst blättern, dann entscheiden, dann
 * korrigieren, zuletzt die Hilfe selbst.
 */
export const INBOX_SHORTCUTS: readonly InboxShortcutHint[] = [
	{ keys: ['J'], description: 'Nächste Meldung' },
	{ keys: ['K'], description: 'Vorherige Meldung' },
	{ keys: ['A'], description: 'Freigeben' },
	{ keys: ['R'], description: 'Ablehnen' },
	{ keys: ['U'], description: 'Letzte Entscheidung rückgängig' },
	{ keys: ['?'], description: 'Diese Übersicht ein- und ausblenden' },
	{ keys: ['Esc'], description: 'Übersicht schließen' }
];

const KEY_ACTIONS: Record<string, InboxShortcutAction> = {
	j: 'focusNext',
	k: 'focusPrevious',
	a: 'approve',
	r: 'reject',
	u: 'undo'
};

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** Wo eine Taste ein Zeichen ist und kein Befehl. */
function isTypingTarget(eventTarget: EventTarget | ShortcutTarget | null): boolean {
	if (!eventTarget) return false;
	const target = eventTarget as ShortcutTarget;
	if (target.tagName && TYPING_TAGS.has(target.tagName)) return true;
	if (target.isContentEditable) return true;
	return Boolean(target.closest?.('[contenteditable="true"]'));
}

/**
 * Steht der Fokus in einem Dialog? Dort darf kein Kürzel die Seite dahinter
 * bedienen — ein „a" im offenen Hilfe-Overlay würde sonst die Meldung
 * darunter freigeben.
 */
function isDialogTarget(eventTarget: EventTarget | ShortcutTarget | null): boolean {
	if (!eventTarget) return false;
	return Boolean((eventTarget as ShortcutTarget).closest?.('dialog, [role="dialog"]'));
}

export function resolveInboxShortcut(event: InboxShortcutEvent): InboxShortcutAction | null {
	// Strg/Cmd/Alt gehören dem Browser und dem System — Shift nicht, sonst wäre
	// „?" auf einer deutschen Tastatur gar nicht erreichbar.
	if (event.ctrlKey || event.metaKey || event.altKey) return null;
	// Escape schließt die Hilfe von überall, auch aus dem Overlay selbst.
	if (event.key === 'Escape') return 'closeHelp';
	if (isTypingTarget(event.target)) return null;
	/* „?" steht bewusst VOR der Dialog-Sperre: Es blendet die Übersicht auch
	   wieder aus, und im offenen Overlay liegt der Fokus im Dialog. Hinter der
	   Sperre wäre `toggleHelp` eine Einbahnstraße — der Name behauptete ein
	   Umschalten, das nie eintritt. */
	if (event.key === '?') return 'toggleHelp';
	if (isDialogTarget(event.target)) return null;
	return KEY_ACTIONS[event.key.toLowerCase()] ?? null;
}

/**
 * Die neue Fokusposition nach J (`delta = 1`) oder K (`delta = -1`).
 *
 * Ohne bisherige Position beginnt J oben und K unten — die Taste sagt damit
 * zugleich, aus welcher Richtung man in die Liste einsteigt. An den Enden wird
 * geklemmt und nicht umgelaufen: Ein Umlauf brächte beim Abarbeiten längst
 * Entschiedenes zurück ins Blickfeld.
 */
export function shiftFocusIndex(
	current: number | null,
	count: number,
	delta: 1 | -1
): number | null {
	if (count <= 0) return null;
	if (current === null) return delta === 1 ? 0 : count - 1;
	/* Ein Reload kann die Liste verkürzt haben; der gemerkte Index zeigt dann
	   hinter das Ende. Das Zurückholen an das Listenende ist die Bewegung dieses
	   Tastendrucks — ein zusätzlicher Schritt würde eine Karte überspringen, die
	   der Bearbeiter nie gesehen hat. */
	if (current > count - 1) return count - 1;
	return Math.min(Math.max(current + delta, 0), count - 1);
}

/**
 * Wohin der Fokus nach einer Entscheidung wandert: auf die nächste Karte, die
 * noch eine Entscheidung braucht.
 *
 * Gesucht wird ab `from` abwärts, danach aufwärts — die bearbeitete Karte
 * bleibt als Undo-Zeile stehen, ihre Position ist also besetzt, aber nicht mehr
 * bedienbar. Bleibt nichts übrig, gibt es keine Position; die Seite lässt den
 * Fokus dann auf der Undo-Schaltfläche, statt ihn an den Seitenanfang zu
 * verlieren.
 */
export function nextActionableIndex(actionable: readonly boolean[], from: number): number | null {
	for (let index = Math.max(from, 0); index < actionable.length; index++) {
		if (actionable[index]) return index;
	}
	for (let index = Math.min(from, actionable.length) - 1; index >= 0; index--) {
		if (actionable[index]) return index;
	}
	return null;
}
