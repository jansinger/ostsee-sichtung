/**
 * @fileoverview Overflow-Menü der Zeilen-Aktionen (Tabelle + Kartenansicht).
 *
 * Browser-Test, weil die Zusagen im DOM liegen: Das Menü öffnet per Popover,
 * die Einträge feuern ihre Callbacks und schließen das Menü wieder, und die
 * Mail-Aktion existiert nur für Superadmins. Popover-API läuft im echten
 * Chromium — in jsdom gäbe es `showPopover` nicht.
 */
import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';
import SightingActionsMenu from './SightingActionsMenu.svelte';

function renderMenu(overrides: Partial<Parameters<typeof render>[1]> = {}) {
	const onspamcheck = vi.fn();
	const ontestemail = vi.fn();
	const ondelete = vi.fn();
	const screen = render(SightingActionsMenu, {
		menuId: 'aktionen-test-1',
		label: 'Weitere Aktionen zu Sichtung REF-1',
		isSuperAdmin: false,
		onspamcheck,
		ontestemail,
		ondelete,
		...overrides
	});
	return { screen, onspamcheck, ontestemail, ondelete };
}

describe('SightingActionsMenu', () => {
	it('öffnet das Menü über den benannten Auslöser', async () => {
		const { screen } = renderMenu();

		const trigger = screen.getByRole('button', { name: 'Weitere Aktionen zu Sichtung REF-1' });
		await trigger.click();

		await expect
			.element(screen.getByRole('button', { name: 'Spam-Check durchführen' }))
			.toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Eintrag löschen' })).toBeVisible();
	});

	it('feuert die Callbacks und schließt das Menü nach der Auswahl', async () => {
		const { screen, onspamcheck, ondelete } = renderMenu();

		await screen.getByRole('button', { name: 'Weitere Aktionen zu Sichtung REF-1' }).click();
		await screen.getByRole('button', { name: 'Spam-Check durchführen' }).click();
		expect(onspamcheck).toHaveBeenCalledOnce();
		/* `popovertargetaction="hide"` am Eintrag: nach der Auswahl ist das Menü zu.
		   Geprüft am Element statt per Locator — ein geschlossenes Popover ist für
		   `getByRole` nicht „unsichtbar", sondern gar nicht auffindbar. */
		const popover = screen.container.querySelector('[popover]');
		expect(popover?.matches(':popover-open')).toBe(false);

		await screen.getByRole('button', { name: 'Weitere Aktionen zu Sichtung REF-1' }).click();
		await screen.getByRole('button', { name: 'Eintrag löschen' }).click();
		expect(ondelete).toHaveBeenCalledOnce();
	});

	it('zeigt die Mail-Aktion nur für Superadmins', async () => {
		const { screen, ontestemail } = renderMenu({ isSuperAdmin: true });

		await screen.getByRole('button', { name: 'Weitere Aktionen zu Sichtung REF-1' }).click();
		const mail = screen.getByRole('button', { name: 'Benachrichtigung ans Team senden' });
		await expect.element(mail).toBeVisible();
		await mail.click();
		expect(ontestemail).toHaveBeenCalledOnce();
	});

	it('hat ohne Superadmin-Rolle keinen Mail-Eintrag', async () => {
		const { screen } = renderMenu();

		await screen.getByRole('button', { name: 'Weitere Aktionen zu Sichtung REF-1' }).click();
		expect(
			screen.container.querySelectorAll('[popover] li button').length,
			'nur Spam-Check und Löschen'
		).toBe(2);
	});
});
