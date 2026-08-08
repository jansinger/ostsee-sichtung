/**
 * @fileoverview Der Zustand hinter „Rückgängig" in der Sichtungs-Detailansicht
 * (`src/routes/admin/[id]/+page.svelte`) — dieselbe letzte Entscheidung, die
 * sowohl der Toast-Knopf als auch die Taste `U` (Task 8) zurücknehmen kann.
 * Aus der Komponente gezogen, weil an genau dieser Verkopplung von State und
 * Timer zwei Fehler hingen:
 *
 * - **Verfall:** Die gemerkte Entscheidung "vergisst sich" nach `ms` von
 *   selbst — sonst nähme `U` auch Minuten später noch eine längst unsichtbare
 *   Entscheidung zurück. Ein neues `merken()` löst den alten Timer ab, statt
 *   zwei nebenläufige laufen zu lassen.
 * - **ID-gebundenes Vergessen:** `vergiss(id)` räumt die gemerkte Entscheidung
 *   nur, wenn `id` zu ihr passt. Ohne das nullte ein spät zurückkehrendes
 *   Undo (z. B. nach einer hängenden Anfrage) auch dann, wenn zwischenzeitlich
 *   längst eine neuere Entscheidung gemerkt wurde — sichtbar als Toast, dessen
 *   „Rückgängig"-Knopf danach still nichts mehr tut.
 *
 * Factory statt Modul-Singleton: reaktiver Zustand außerhalb einer Komponente
 * darf nicht modulglobal sein (SSR-Leck zwischen Requests, siehe
 * `architecture.md`) — jede Komponenteninstanz ruft `createUndoMemory()`
 * selbst auf und besitzt ihren eigenen State und Timer.
 */
import type { SightingVerdict } from './sightingVerdict';

export interface UndoEntry {
	id: number;
	href: string | null;
	verdict: SightingVerdict;
}

export interface UndoMemory {
	readonly current: UndoEntry | null;
	/** Merkt eine neue Entscheidung und startet den Verfalls-Timer neu. */
	merken(entry: UndoEntry): void;
	/**
	 * Räumt die gemerkte Entscheidung samt Timer — aber nur, wenn `id` zur
	 * aktuell gemerkten Entscheidung passt. Eine fremde `id` lässt den Eintrag
	 * unangetastet stehen.
	 */
	vergiss(id: number): void;
	/** Nur den Timer stoppen, ohne die Entscheidung zu vergessen — für `onDestroy`. */
	dispose(): void;
}

export function createUndoMemory(ms: number): UndoMemory {
	let entry = $state<UndoEntry | null>(null);
	let timer: ReturnType<typeof setTimeout> | null = null;

	function stoppeTimer(): void {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function merken(next: UndoEntry): void {
		stoppeTimer();
		entry = next;
		timer = setTimeout(() => {
			entry = null;
			timer = null;
		}, ms);
	}

	function vergiss(id: number): void {
		if (entry?.id !== id) return;
		stoppeTimer();
		entry = null;
	}

	function dispose(): void {
		stoppeTimer();
	}

	return {
		get current() {
			return entry;
		},
		merken,
		vergiss,
		dispose
	};
}
