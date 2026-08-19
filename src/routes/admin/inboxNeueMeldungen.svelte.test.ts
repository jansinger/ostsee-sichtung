/**
 * @fileoverview Eingangsseite — Hinweis auf neu eingegangene Meldungen.
 *
 * Die Poll-Logik selbst ist im Node-Projekt geprüft
 * (`src/lib/components/admin/inboxPoller.test.ts`). Hier zählt allein die
 * Verdrahtung. Der Poller ist deshalb gemockt: Der Test kommt ohne echte Timer
 * aus und hängt an keiner Wartezeit.
 */
import { render } from 'vitest-browser-svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboxPollerOptions } from '$lib/components/admin/inboxPoller';
import type { PageData } from './$types';

const navigiereZuSessionEnde = vi.fn();
vi.mock('./inboxSessionEnde', () => ({ navigiereZuSessionEnde }));

const invalidateAll = vi.fn(() => Promise.resolve());
vi.mock('$app/navigation', () => ({
	goto: vi.fn(() => Promise.resolve()),
	invalidateAll
}));
vi.mock('$app/state', () => ({
	page: { url: new URL('https://localhost:4000/admin') }
}));

/* Der Mock hält fest, mit welchen Optionen die Seite den Poller gebaut hat —
   nur so kommt der Test an `onNeueMeldungen` heran, ohne zu warten. */
let letzteOptionen: InboxPollerOptions | null = null;
const start = vi.fn();
const stop = vi.fn();
vi.mock('$lib/components/admin/inboxPoller', () => ({
	createInboxPoller: (optionen: InboxPollerOptions) => {
		letzteOptionen = optionen;
		return { start, stop };
	}
}));

// Erst nach den Mocks importieren, sonst zieht die Seite die echten Module.
const AdminInbox = (await import('./+page.svelte')).default;

/* Leere Liste: Für den Hinweis ist gleichgültig, was darunter steht — so
   braucht dieser Test kein vollständiges Sichtungs-Fixture. */
function daten(maxOpenId: number): PageData {
	return {
		open: [],
		openTotal: 0,
		order: 'desc' as const,
		imagesBySighting: {},
		pendingPhotoAnnouncements: 0,
		duplicatesBySighting: {},
		reporterHistoryBySighting: {},
		maxOpenId
	} as unknown as PageData;
}

/** Wartet, bis der `$effect` der Seite den Poller gebaut hat. */
async function pollerOptionen(): Promise<InboxPollerOptions> {
	await vi.waitFor(() => expect(letzteOptionen).not.toBeNull());
	return letzteOptionen as InboxPollerOptions;
}

describe('Eingangsseite — Hinweis auf neue Meldungen', () => {
	beforeEach(() => {
		letzteOptionen = null;
		invalidateAll.mockClear();
		start.mockClear();
		stop.mockClear();
		navigiereZuSessionEnde.mockClear();
	});

	it('startet den Poller mit der Baseline aus dem Load', async () => {
		await render(AdminInbox, { data: daten(4711) });

		const optionen = await pollerOptionen();
		expect(optionen.baseline).toBe(4711);
		expect(start).toHaveBeenCalled();
	});

	it('zeigt ohne Meldung des Pollers keinen Hinweis', async () => {
		const screen = await render(AdminInbox, { data: daten(12) });
		await pollerOptionen();

		expect(screen.container.textContent).not.toContain('Neue Meldungen eingegangen');
	});

	it('zeigt den Hinweis, sobald der Poller meldet', async () => {
		const screen = await render(AdminInbox, { data: daten(12) });

		(await pollerOptionen()).onNeueMeldungen();

		await expect.element(screen.getByRole('button', { name: 'Neu laden' })).toBeInTheDocument();
		expect(screen.container.textContent).toContain('Neue Meldungen eingegangen');
	});

	it('meldet eine abgelaufene Sitzung über den Login-Weg des Eingangs, nicht über Logout', async () => {
		// Nicht der Logout-Weg (`/api/auth/logout`): Der zerstört serverseitig nichts
		// mehr (die Sitzung ist ja bereits weg), hängt aber den Auth0-SSO-Logout an —
		// alle anderen offenen Admin-Tabs würden mit abgemeldet. Der Login-Weg führt
		// oft still durch und landet zurück auf dem Eingang. Siehe inboxSessionEnde.ts.
		await render(AdminInbox, { data: daten(12) });
		(await pollerOptionen()).onSessionEnde();

		expect(navigiereZuSessionEnde).toHaveBeenCalledOnce();
	});

	it('lädt beim Klick neu und nimmt den Hinweis zurück', async () => {
		const screen = await render(AdminInbox, { data: daten(12) });
		(await pollerOptionen()).onNeueMeldungen();

		await screen.getByRole('button', { name: 'Neu laden' }).click();

		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(screen.container.textContent).not.toContain('Neue Meldungen eingegangen');
	});
});
