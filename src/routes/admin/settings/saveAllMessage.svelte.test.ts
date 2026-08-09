/**
 * @fileoverview „Alle Änderungen speichern" — die Zusammenfassung muss stehen
 * bleiben.
 *
 * **Der Befund (Review zu PR #811).** `saveAllChanges` setzt seit dem Fix am
 * Teilfehlschlag eine zusammenfassende Meldung. `saveConfig` plante pro Aufruf
 * aber weiterhin ein eigenes `setTimeout`, das dieselbe Variable nach fünf
 * Sekunden leert — geschrieben wurde die Zusammenfassung also in ein Feld, für
 * das bereits ein fremder Löschauftrag lief. Bei einem Bulk-Lauf verschwand sie
 * dadurch, obwohl sie bewusst ohne eigenen Timer stehen sollte; im Erfolgsfall
 * lief sie um die Dauer des Laufs zu früh ab.
 *
 * Es ist derselbe Fall wie beim Bulk-Verdict der Sichtungstabelle, wo
 * `submitVerdict(id, v, { silent: true })` genau deshalb existiert: Im Bulk
 * meldet der Einzelaufruf nicht, gemeldet wird einmal am Ende.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import SettingsPage from './+page.svelte';
import type { PageData } from './$types';

/**
 * Zwei aktive Schlüssel mit Textwert — beide erscheinen ohne Superadmin.
 *
 * `as unknown as PageData` wie in `statusColumn.svelte.test.ts`: Der echte
 * `PageData`-Typ zieht über das Layout `user`, `buildInfo`, `maintenanceConfig`
 * und vier weitere Felder mit, von denen diese Seite keines liest. Sie hier
 * auszufüllen wäre Attrappe ohne Aussage — der Cast sagt stattdessen, dass
 * bewusst nur der benutzte Ausschnitt gestellt wird. Kein `any`: Das
 * verlöre die Prüfung an der Aufrufstelle mit.
 */
const daten = () =>
	({
		groupedConfigs: {
			email: [
				{
					key: 'notification.email.sender',
					value: 'a@example.org',
					description: '',
					category: 'email'
				},
				{
					key: 'notification.email.cc',
					value: 'b@example.org',
					description: '',
					category: 'email'
				}
			]
		},
		isSuperAdmin: false,
		error: null
	}) as unknown as PageData;

/* Wie nebenan in `settingsMessagesAndEdits.svelte.test.ts`: `respondWith`
   überschreibt `globalThis.fetch` per Zuweisung, und `vi.restoreAllMocks()`
   nimmt eine Zuweisung nicht zurück. */
const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
	vi.useRealTimers();
	vi.restoreAllMocks();
});

/** Antwortet auf `PUT /api/config` je Aufruf abwechselnd mit Erfolg/Fehlschlag. */
function respondWith(...ok: boolean[]) {
	let aufruf = 0;
	globalThis.fetch = vi.fn(async () => {
		const erfolgreich = ok[aufruf++] ?? true;
		return { ok: erfolgreich, json: async () => ({}) };
	}) as unknown as typeof fetch;
}

async function beideFelderAendern() {
	const felder = page.getByRole('textbox').elements();
	for (const feld of felder.slice(0, 2)) {
		(feld as HTMLInputElement).value = `${(feld as HTMLInputElement).value}x`;
		feld.dispatchEvent(new Event('input', { bubbles: true }));
	}
}

describe('Einstellungen — „Alle Änderungen speichern"', () => {
	it('lässt die Teilfehlschlag-Meldung nach fünf Sekunden stehen', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		respondWith(true, false);
		render(SettingsPage, { data: daten() });

		await beideFelderAendern();
		await page.getByRole('button', { name: /Alle Änderungen speichern/ }).click();

		const meldung = page.getByText('1 von 2 Einstellungen gespeichert — 1 fehlgeschlagen');
		await expect.element(meldung).toBeVisible();

		/* Der Timer aus dem erfolgreichen Einzelaufruf läuft hier ab. Vorher nahm
		   er die Zusammenfassung mit — sie stand in derselben Variablen. */
		await vi.advanceTimersByTimeAsync(6000);
		await expect.element(meldung).toBeVisible();
	});

	it('zeigt nach vollem Erfolg die Zusammenfassung und nicht die Einzelmeldung', async () => {
		respondWith(true, true);
		render(SettingsPage, { data: daten() });

		await beideFelderAendern();
		await page.getByRole('button', { name: /Alle Änderungen speichern/ }).click();

		await expect.element(page.getByText('2 Einstellungen gespeichert')).toBeVisible();
		/* Die Einzelmeldung des letzten Schlüssels darf die Summe nicht ersetzen —
		   sie sagt über den Lauf als Ganzes nichts aus. */
		expect(page.getByText('notification.email.cc gespeichert').elements()).toHaveLength(0);
	});
});
