/**
 * Fokus-Management für die nicht-modalen Seitenpanels der Sichtungskarte (H5).
 *
 * Beim Öffnen wandert der Fokus auf die Panel-Überschrift (Screenreader sagen
 * damit den Kontext an), beim Schließen kehrt er zum Toggle-Button zurück.
 * Beide Funktionen warten einen Tick, damit `inert` am Panel bereits im DOM
 * angekommen ist, bevor der Fokus gesetzt wird.
 */
import { tick } from 'svelte';

/** Setzt den Fokus nach dem nächsten DOM-Update auf die Panel-Überschrift. */
export function focusPanelHeading(heading: HTMLElement | undefined): void {
	void tick().then(() => heading?.focus());
}

/**
 * Gibt den Fokus an den Toggle-Button zurück — aber nur, wenn er beim
 * Schließen im Panel lag oder durch das `inert`-Attribut bereits auf
 * `<body>` zurückgefallen ist. Lag der Fokus woanders (z. B. auf der Karte
 * beim Schließen per Tastaturkürzel), wird er nicht gestohlen.
 */
export function returnFocusToToggle(
	panel: HTMLElement | undefined,
	toggle: HTMLElement | undefined
): void {
	void tick().then(() => {
		const active = document.activeElement;
		if (active === null || active === document.body || (panel?.contains(active) ?? false)) {
			toggle?.focus();
		}
	});
}
