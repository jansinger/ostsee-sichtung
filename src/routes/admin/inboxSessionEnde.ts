/**
 * @fileoverview Ziel-URL, wenn der Inbox-Poller eine abgelaufene Sitzung meldet.
 *
 * Eigenes Modul statt eines Literals in `+page.svelte`: `window.location.assign`
 * lässt sich im Browser-Testprojekt nicht ohne Weiteres überschreiben — der Test
 * sichert deshalb die **Absicht** (dieses Ziel) statt der tatsächlichen Navigation.
 *
 * Login- statt Logout-Weg (Entscheidung Jan, 2026-08-19): `/api/auth/logout` zerstört
 * hier nichts, weil die Sitzung serverseitig bereits weg ist — es hängt aber trotzdem
 * einen Sprung zum Auth0-Logout an. Der beendet die **SSO-Sitzung** und meldet damit
 * jeden anderen offenen Admin-Tab gleich mit ab. `/api/auth/login` dagegen führt oft
 * still durch (Auth0-Session meist noch gültig) und landet wieder auf dem Eingang.
 * Der Sprung dorthin ist gefahrlos: Entscheidungen gehen sofort per PATCH raus, es
 * gibt keinen ungespeicherten Zustand, der beim Reload verloren ginge.
 */
export const INBOX_SESSION_ENDE_ZIEL = '/api/auth/login?returnUrl=/admin';

/**
 * Eigene Funktion statt `window.location.assign(...)` inline in `+page.svelte`:
 * `assign` lässt sich im Browser-Testprojekt nicht überschreiben (nicht
 * konfigurierbar) — die Verdrahtung mockt deshalb dieses Modul und prüft, DASS
 * mit dem richtigen Ziel navigiert wird, statt die Navigation selbst zu vollziehen.
 */
export function navigiereZuSessionEnde(): void {
	window.location.assign(INBOX_SESSION_ENDE_ZIEL);
}
