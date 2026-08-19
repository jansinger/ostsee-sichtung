import { describe, expect, it } from 'vitest';
import { INBOX_SESSION_ENDE_ZIEL } from './inboxSessionEnde';

/**
 * @fileoverview Ziel der abgelaufenen-Sitzung-Navigation bleibt der Login-Weg
 *
 * Der Browser-Test (`inboxNeueMeldungen.svelte.test.ts`) mockt dieses Modul und
 * prüft nur, DASS `navigiereZuSessionEnde()` aufgerufen wird — nicht, wohin die
 * Konstante zeigt. Setzte jemand `INBOX_SESSION_ENDE_ZIEL` auf
 * `/api/auth/logout` zurück, bliebe dieser Mock grün: Er ersetzt die Funktion
 * ja gerade durch einen Spy, der die tatsächliche Zielkonstante nie liest.
 *
 * `/api/auth/logout` ist der ursprüngliche Befund: Er beendet zusätzlich zur
 * (bereits abgelaufenen) lokalen Sitzung die Auth0-SSO-Sitzung — jeder andere
 * offene Admin-Tab würde beim nächsten Klick mit abgemeldet, und der
 * Bearbeiter landet auf der öffentlichen Startseite statt zurück im Eingang.
 * `/api/auth/login?returnUrl=/admin` führt dagegen meist still durch (die
 * Auth0-Session ist ja noch gültig) und landet wieder im Admin-Eingang. Siehe
 * die ausführliche Begründung im Datei-Doc von `inboxSessionEnde.ts`.
 *
 * Läuft im Node-Projekt: Das Modul referenziert `window` nur im Funktionskörper
 * von `navigiereZuSessionEnde`, nicht auf Modulebene — der bloße Import ist in
 * Node unbedenklich.
 */
describe('INBOX_SESSION_ENDE_ZIEL', () => {
	it('zeigt auf den Login-Weg, nicht auf den Auth0-SSO-Logout', () => {
		expect(INBOX_SESSION_ENDE_ZIEL).toBe('/api/auth/login?returnUrl=/admin');
	});
});
