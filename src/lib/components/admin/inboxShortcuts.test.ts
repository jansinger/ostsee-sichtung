import { describe, expect, it } from 'vitest';
import {
	INBOX_SHORTCUTS,
	nextActionableIndex,
	resolveInboxShortcut,
	shiftFocusIndex,
	type ShortcutTarget
} from './inboxShortcuts';

/**
 * @fileoverview Tastatur-Triage des Eingangs (Spec B1) — die Entscheidungen,
 * die ohne DOM prüfbar sind.
 *
 * Die drei Funktionen sind bewusst frei von `HTMLElement`-Prüfungen: Ein
 * `instanceof HTMLElement` in `resolveInboxShortcut` hätte diesen Test in den
 * Browser-Runner gezwungen (`*.svelte.test.ts`), obwohl es hier um eine
 * Tastenzuordnung geht und nicht um Rendern. Die Strecke „echte Taste →
 * fokussierte Karte" prüft `inboxShortcuts.svelte.test.ts` zusätzlich im
 * Browser.
 */

/** Ein Ereignis, wie es `svelte:window onkeydown` liefert — nur die Felder, die zählen. */
function taste(
	key: string,
	extra: Partial<{
		ctrlKey: boolean;
		metaKey: boolean;
		altKey: boolean;
		shiftKey: boolean;
		target: ShortcutTarget | null;
	}> = {}
) {
	return {
		key,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		shiftKey: false,
		target: null,
		...extra
	};
}

/** Ein Ziel ohne Vorfahren — `closest` findet nichts. */
function ziel(tagName: string, extra: Partial<ShortcutTarget> = {}): ShortcutTarget {
	return { tagName, isContentEditable: false, closest: () => null, ...extra };
}

/**
 * Ein Ziel innerhalb eines Dialogs. `closest` antwortet **selektorgenau** und
 * nicht auf alles: Ein Fixture, das jeden Selektor bejaht, gilt gleichzeitig als
 * contenteditable — und lässt damit die Dialog-Sperre richtig aussehen, obwohl
 * in Wahrheit die Eingabefeld-Sperre gegriffen hat.
 */
function zielImDialog(tagName = 'BUTTON'): ShortcutTarget {
	return {
		tagName,
		isContentEditable: false,
		closest: (selector: string) => (selector.includes('dialog') ? {} : null)
	};
}

describe('resolveInboxShortcut', () => {
	it.each([
		['j', 'focusNext'],
		['k', 'focusPrevious'],
		['a', 'approve'],
		['r', 'reject'],
		['u', 'undo'],
		['?', 'toggleHelp'],
		['Escape', 'closeHelp']
	] as const)('ordnet %s der Aktion %s zu', (key, aktion) => {
		expect(resolveInboxShortcut(taste(key))).toBe(aktion);
	});

	it('gilt auch für Großbuchstaben — Caps Lock ist keine andere Absicht', () => {
		expect(resolveInboxShortcut(taste('J'))).toBe('focusNext');
		expect(resolveInboxShortcut(taste('A'))).toBe('approve');
	});

	it('lässt unbelegte Tasten liegen', () => {
		expect(resolveInboxShortcut(taste('x'))).toBeNull();
		expect(resolveInboxShortcut(taste('Enter'))).toBeNull();
	});

	it.each(['ctrlKey', 'metaKey', 'altKey'] as const)(
		'greift nicht bei %s — das sind Browser- und Systembefehle',
		(modifikator) => {
			expect(resolveInboxShortcut(taste('a', { [modifikator]: true }))).toBeNull();
		}
	);

	it('greift bei Shift, weil ? ohne Shift nicht erreichbar ist', () => {
		expect(resolveInboxShortcut(taste('?', { shiftKey: true }))).toBe('toggleHelp');
	});

	it.each(['INPUT', 'TEXTAREA', 'SELECT'])('bleibt still, wenn %s fokussiert ist', (tagName) => {
		expect(resolveInboxShortcut(taste('a', { target: ziel(tagName) }))).toBeNull();
	});

	it('bleibt still in einem contenteditable-Bereich', () => {
		expect(
			resolveInboxShortcut(taste('j', { target: ziel('DIV', { isContentEditable: true }) }))
		).toBeNull();
	});

	it('bleibt still, wenn der Fokus in einem Dialog steht', () => {
		/* Der Hilfe-Overlay ist selbst ein Dialog: Ohne diese Sperre würde ein „a"
		   im offenen Overlay die Sichtung im Hintergrund freigeben. */
		expect(resolveInboxShortcut(taste('a', { target: zielImDialog() }))).toBeNull();
	});

	it('lässt ? aus einem Dialog durch — die Taste blendet die Hilfe auch aus', () => {
		/* Sonst wäre `toggleHelp` eine Einbahnstraße: Im offenen Overlay steht der
		   Fokus im Dialog, und die Sperre schluckte genau den Tastendruck, der es
		   wieder schließen soll. */
		expect(resolveInboxShortcut(taste('?', { target: zielImDialog() }))).toBe('toggleHelp');
	});

	it('lässt ? im Eingabefeld liegen — dort ist es ein Satzzeichen', () => {
		expect(resolveInboxShortcut(taste('?', { target: ziel('INPUT') }))).toBeNull();
	});

	it('lässt Escape auch aus einem Dialog und aus einem Eingabefeld durch', () => {
		expect(resolveInboxShortcut(taste('Escape', { target: zielImDialog() }))).toBe('closeHelp');
		expect(resolveInboxShortcut(taste('Escape', { target: ziel('INPUT') }))).toBe('closeHelp');
	});
});

describe('shiftFocusIndex', () => {
	it('startet bei J auf der ersten Karte', () => {
		expect(shiftFocusIndex(null, 3, 1)).toBe(0);
	});

	it('startet bei K auf der letzten Karte', () => {
		expect(shiftFocusIndex(null, 3, -1)).toBe(2);
	});

	it('läuft an den Enden auf — kein Umlauf', () => {
		/* Ein Umlauf springt beim Abarbeiten unbemerkt zurück an den Anfang und
		   lässt schon Entschiedenes wieder wie Arbeit aussehen. */
		expect(shiftFocusIndex(2, 3, 1)).toBe(2);
		expect(shiftFocusIndex(0, 3, -1)).toBe(0);
	});

	it('bewegt sich innerhalb der Liste', () => {
		expect(shiftFocusIndex(0, 3, 1)).toBe(1);
		expect(shiftFocusIndex(2, 3, -1)).toBe(1);
	});

	it('ergibt bei leerer Liste keine Position', () => {
		expect(shiftFocusIndex(null, 0, 1)).toBeNull();
		expect(shiftFocusIndex(0, 0, -1)).toBeNull();
	});

	it('fängt eine Position ab, die die Liste nicht mehr hat', () => {
		// Nach einem Reload kann die Liste kürzer sein als der gemerkte Index.
		expect(shiftFocusIndex(9, 3, 1)).toBe(2);
		expect(shiftFocusIndex(9, 3, -1)).toBe(2);
	});
});

describe('nextActionableIndex', () => {
	it('nimmt die nächste noch offene Karte nach der bearbeiteten', () => {
		expect(nextActionableIndex([false, false, true, true], 1)).toBe(2);
	});

	it('geht zurück, wenn nach unten nichts mehr offen ist', () => {
		/* Die letzte Karte abzuarbeiten darf den Fokus nicht ins Nichts werfen —
		   sonst landet er beim nächsten Tab am Seitenanfang. */
		expect(nextActionableIndex([true, false, false], 1)).toBe(0);
	});

	it('bleibt stehen, wenn die Position selbst noch offen ist', () => {
		expect(nextActionableIndex([true, true], 0)).toBe(0);
	});

	it('ergibt keine Position, wenn alles erledigt ist', () => {
		expect(nextActionableIndex([false, false], 0)).toBeNull();
		expect(nextActionableIndex([], 0)).toBeNull();
	});
});

describe('INBOX_SHORTCUTS', () => {
	it('beschreibt jede belegte Taste — die Liste ist die Quelle des Overlays', () => {
		const belegt = INBOX_SHORTCUTS.flatMap((eintrag) => eintrag.keys);
		expect(belegt).toEqual(expect.arrayContaining(['J', 'K', 'A', 'R', 'U', '?']));
	});

	it('führt zu jeder Taste eine Erklärung', () => {
		for (const eintrag of INBOX_SHORTCUTS) {
			expect(eintrag.keys.length).toBeGreaterThan(0);
			expect(eintrag.description.length).toBeGreaterThan(0);
		}
	});
});
