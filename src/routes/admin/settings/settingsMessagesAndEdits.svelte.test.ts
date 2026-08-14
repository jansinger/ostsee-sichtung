/**
 * @fileoverview Zwei Befunde des Admin-Reviews an der Einstellungsseite.
 *
 * **Befund 16 — das Emoji doppelt das Alert-Icon.** `saveMessage` und
 * `errorMessage` trugen ein vorangestelltes „✅"/„❌"/„ℹ️". Diese Strings landen
 * im Textknoten eines `alert-success`/`alert-error`, das laut Alert-Regel
 * (`design-system.md`) seine Bedeutung bereits über das Icon trägt — und über
 * genau eines. Screenreader lasen die Aussage damit zweimal, einmal davon als
 * „Häkchensymbol".
 *
 * **Befund 21 — die Eingabe stand im Loader-Datensatz.** `handleInputChange`
 * schrieb `config.value` direkt, also in ein Objekt aus `data.groupedConfigs`.
 * Beim Nachmessen war der Befund schlimmer als beschrieben, und zwar in beide
 * Richtungen:
 *
 * - **`data` wurde nie beschrieben.** `groupedConfigs` ist ein `$state`-Proxy,
 *   und Svelte 5 hält die Werte in eigenen Signalen statt sie ins Zielobjekt
 *   zurückzuschreiben. Der erste Test hier hält das fest — er war schon vor der
 *   Änderung grün und ist trotzdem die Zusage, um die es geht.
 * - **Dafür ging die Eingabe verloren.** Sie lebte im Proxy, und der
 *   „Alle Einstellungen anzeigen"-Toggle ersetzt ihn (`groupedConfigs =
 *   data.groupedConfigs`). Das Feld sprang auf den Wert des Loaders zurück,
 *   „1 Änderung" stand weiter da — und „Speichern" schrieb den **alten** Wert
 *   in die Datenbank. Der zweite Test war vor der Änderung rot.
 *
 * Der Toggle-Fall ist damit nicht nur die Stelle, an der ein naiver Umbau
 * Eingaben verlöre, sondern die, an der der Bestand sie schon verlor.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import SettingsPage from './+page.svelte';
import type { PageData } from './$types';

/**
 * `Extended_Pictographic` statt einer Aufzählung der drei entfernten Zeichen:
 * Die Aufzählung wäre eine Liste der bekannten Fälle, nicht die Regel — ein
 * neu ergänztes „⚠️" ginge durch.
 */
const EMOJI = /\p{Extended_Pictographic}/u;

/**
 * Ein aktiver Schlüssel und ein geplanter. `as unknown as PageData` wie in
 * `saveAllMessage.svelte.test.ts`: Der echte Typ zieht über das Layout `user`,
 * `buildInfo` und weitere Felder mit, von denen diese Seite keines liest.
 */
const daten = (isSuperAdmin = false) =>
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
					// Nicht in ACTIVE_CONFIG_KEYS — erscheint erst mit dem Toggle.
					key: 'notification.email.geplant',
					value: 'geplant@example.org',
					description: '',
					category: 'email'
				}
			]
		},
		isSuperAdmin,
		error: null
	}) as unknown as PageData;

/*
 * `respondWith` unten setzt `globalThis.fetch` per Zuweisung, nicht per
 * `vi.spyOn` — `vi.restoreAllMocks()` kennt deshalb kein Original, zu dem es
 * zurückkehren könnte, und ließe den Stub stehen. Die echte Referenz wird
 * hier festgehalten und zurückgeschrieben; gleiche Konstruktion und gleiche
 * Begründung wie in `sections/Location.svelte.test.ts`.
 */
const originalFetch = globalThis.fetch;

afterEach(async () => {
	globalThis.fetch = originalFetch;
	vi.restoreAllMocks();
});

function respondWith(ok: boolean) {
	globalThis.fetch = vi.fn(async () => ({
		ok,
		json: async () => ({})
	})) as unknown as typeof fetch;
}

/** Tippt in das erste Textfeld und löst das `input`-Event aus. */
async function ersteEinstellungAendern(wert: string) {
	const feld = page.getByRole('textbox').elements()[0] as HTMLInputElement;
	feld.value = wert;
	feld.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Einstellungen — Meldungen tragen kein Emoji (Befund 16)', () => {
	it('meldet den Erfolg ohne Häkchen-Emoji vor dem Text', async () => {
		respondWith(true);
		await render(SettingsPage, { data: daten() });

		await ersteEinstellungAendern('neu@example.org');
		await page.getByRole('button', { name: /Alle Änderungen speichern/ }).click();

		const alert = page.getByRole('status');
		await expect.element(alert).toBeVisible();
		expect(alert.element().textContent).not.toMatch(EMOJI);
	});

	it('meldet den Fehlschlag ohne Kreuz-Emoji vor dem Text', async () => {
		respondWith(false);
		await render(SettingsPage, { data: daten() });

		await ersteEinstellungAendern('neu@example.org');
		await page.getByRole('button', { name: /Alle Änderungen speichern/ }).click();

		const alert = page.getByRole('alert');
		await expect.element(alert).toBeVisible();
		expect(alert.element().textContent).not.toMatch(EMOJI);
	});
});

describe('Einstellungen — Eingaben stehen neben data, nicht darin (Befund 21)', () => {
	it('lässt die Loader-Daten unangetastet', async () => {
		const data = daten();
		await render(SettingsPage, { data });

		await ersteEinstellungAendern('neu@example.org');
		// Sichtbar geändert …
		await expect.element(page.getByText('notification.email.sender').first()).toBeVisible();
		expect(
			page.getByRole('button', { name: /Alle Änderungen speichern \(1\)/ }).elements()
		).toHaveLength(1);

		// … aber nicht im Datensatz des Loaders.
		const konfigs = (data as unknown as { groupedConfigs: Record<string, { value: string }[]> })
			.groupedConfigs;
		expect(konfigs.email?.[0]?.value).toBe('a@example.org');
	});

	it('behält die Eingabe über den „Alle Einstellungen anzeigen"-Toggle hinweg', async () => {
		await render(SettingsPage, { data: daten(true) });

		await ersteEinstellungAendern('neu@example.org');
		await page.getByRole('checkbox', { name: /Alle Einstellungen anzeigen/ }).click();

		/* Nach dem Umschalten rendert der `{#each}` über ein anderes Array — die
		   Eingabe muss trotzdem stehen. Vorher hing sie an der Objekt-Identität
		   der gefilterten Einträge und überlebte nur zufällig. */
		const felder = page.getByRole('textbox').elements() as HTMLInputElement[];
		expect(felder.map((feld) => feld.value)).toContain('neu@example.org');
	});
});
