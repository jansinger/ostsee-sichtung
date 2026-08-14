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

/* Das Browser-Test-Setup lädt src/app.css nicht — für die Touch-Target-Messung
   unten braucht es aber die zentrale `.menu`-Regel von dort (und DaisyUIs
   Menü-Styles). Explizit importieren, wie in FilterPanel.svelte.test.ts. */
import '../../../app.css';

async function renderMenu(overrides: Partial<Parameters<typeof render>[1]> = {}) {
	const onspamcheck = vi.fn();
	const ontestemail = vi.fn();
	const ondelete = vi.fn();
	const screen = await render(SightingActionsMenu, {
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
		const { screen } = await renderMenu();

		const trigger = screen.getByRole('button', { name: 'Weitere Aktionen zu Sichtung REF-1' });
		await trigger.click();

		await expect
			.element(screen.getByRole('button', { name: 'Spam-Check durchführen' }))
			.toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Eintrag löschen' })).toBeVisible();
	});

	it('feuert die Callbacks und schließt das Menü nach der Auswahl', async () => {
		const { screen, onspamcheck, ondelete } = await renderMenu();

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
		const { screen, ontestemail } = await renderMenu({ isSuperAdmin: true });

		await screen.getByRole('button', { name: 'Weitere Aktionen zu Sichtung REF-1' }).click();
		const mail = screen.getByRole('button', { name: 'Benachrichtigung ans Team senden' });
		await expect.element(mail).toBeVisible();
		await mail.click();
		expect(ontestemail).toHaveBeenCalledOnce();
	});

	it('jeder Menüeintrag erfüllt das 44px-Touch-Target (WCAG 2.5.5)', async () => {
		/* Misst die Wirkung im Browser, nicht die Existenz einer CSS-Regel: Der
		   Touch-Target-Block in app.css deckte nur `.btn` ab — die einfachen
		   Menüeinträge (Spam-Check, Mail) kamen mit DaisyUIs Menü-Padding nur
		   auf ~32px. Superadmin an, damit alle drei Einträge im DOM stehen. */
		const { screen } = await renderMenu({ isSuperAdmin: true });

		await screen.getByRole('button', { name: 'Weitere Aktionen zu Sichtung REF-1' }).click();
		const eintraege = screen.container.querySelectorAll('[popover] li > button');
		expect(eintraege.length).toBe(3);
		for (const eintrag of eintraege) {
			/* expect.poll: DaisyUI öffnet das Dropdown mit einer scale-Animation
			   (0.95 → 1, 200 ms). Eine Sofort-Messung per getBoundingClientRect
			   liefert mitten darin 41,8px (= 44 × 0,95) und wäre flaky — gepollt
			   wird deshalb bis zum Endzustand. */
			await expect
				.poll(() => eintrag.getBoundingClientRect().height, {
					message: `Touch-Target von „${eintrag.textContent?.trim()}"`
				})
				.toBeGreaterThanOrEqual(44);
		}
	});

	it('hat ohne Superadmin-Rolle keinen Mail-Eintrag', async () => {
		const { screen } = await renderMenu();

		await screen.getByRole('button', { name: 'Weitere Aktionen zu Sichtung REF-1' }).click();
		expect(
			screen.container.querySelectorAll('[popover] li button').length,
			'nur Spam-Check und Löschen'
		).toBe(2);
	});
});
