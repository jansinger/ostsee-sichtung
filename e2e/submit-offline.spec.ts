import { expect, test } from '@playwright/test';
import { expectCurrentStep, fillStep1, fillStep2, fillStep4 } from './helpers/form-helpers';
import { expectNoHorizontalOverflow } from './helpers/overflow';
import { FormPage } from './pages/FormPage';

/**
 * Ohne Verbindung wird das Absenden vorab gesperrt, statt den Versuch scheitern
 * zu lassen — ein Fehlschlag, den man vorhersehen kann, ist keine Fehlermeldung
 * wert. Der Nutzer sieht stattdessen den Grund und die Zusage, dass seine
 * Eingaben erhalten bleiben.
 */
test.describe('Absenden ohne Internetverbindung', () => {
	test('sperrt den Absenden-Button, nennt den Grund und behält die Eingaben', async ({
		page,
		context
	}) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Bis zum letzten Schritt durchfüllen
		await fillStep1(formPage);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		await fillStep2(formPage);
		await formPage.clickNext();
		await expectCurrentStep(page, /Weitere Informationen/i);

		await formPage.clickNext();
		await expectCurrentStep(page, /Kontakt/i);

		await fillStep4(formPage);

		// Netz abschalten — Chromium feuert dabei das `offline`-Ereignis.
		await context.setOffline(true);

		const status = page.locator('[data-testid="submit-status-offline"]');
		await expect(status).toBeVisible();
		await expect(status).toContainText('Keine Internetverbindung');
		await expect(status).toContainText('Eingaben bleiben vollständig gespeichert');

		// Der Knopf ist NICHT als deaktiviert ausgezeichnet: `aria-disabled` und
		// `btn-disabled` ziehen an einem DaisyUI-`.btn` ein `pointer-events: none`
		// nach sich, der Klick käme also gar nicht an und der Wächter könnte
		// nichts melden (design-system.md, „Der Vorbehalt"). Er trägt den Grund
		// stattdessen per `aria-describedby` und führt beim Klick dorthin.
		const submit = page.getByRole('button', { name: /Formular absenden/i });
		await expect(submit).not.toHaveAttribute('aria-disabled', 'true');
		await expect(submit).toHaveAttribute('aria-describedby', 'submit-status-offline');

		// Kein `force` nötig — und das ist die eigentliche Aussage: Der Klick
		// erreicht die Anwendung, statt an Playwrights Actionability-Prüfung zu
		// enden.
		await submit.click();

		// Immer noch auf dem Kontaktschritt — es wurde nichts abgeschickt.
		await expectCurrentStep(page, /Kontakt/i);
		await expect(status).toBeVisible();
		// Und der Klick blieb nicht folgenlos: Er führt zur Begründung. Unterhalb
		// `md` ist die Navigation ein ortsfester Balken, die Begründung kann also
		// weggescrollt sein, während der Knopf sichtbar bleibt.
		await expect(status).toBeFocused();

		// Zusage einlösen: Nach einem Neuladen sind die Eingaben noch da.
		// Erst wieder online gehen — ein Reload ohne Netz lädt das Dokument nicht.
		await context.setOffline(false);
		await page.reload();
		await page.locator('[data-testid="field-firstName"]').waitFor({ state: 'visible' });

		await expect(page.locator('[data-testid="field-firstName"]')).toHaveValue('Max');
		await expect(page.locator('[data-testid="field-email"]')).toHaveValue('max@example.com');
	});

	/**
	 * Regression: Das Abzeichen rendert online nichts — aber sein Wrapper stand
	 * dauerhaft im DOM und war in `.navbar-end` (`gap-2`) ein Flex-Item der
	 * Breite 0. Gemessen waren das 8px toter Abstand auf jeder Seite. Die
	 * Live-Region liegt jetzt `sr-only` und damit außerhalb des Flusses.
	 */
	test('kostet bei bestehender Verbindung keinen Platz in der Navbar', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const layout = await page.evaluate(() => {
			const end = document.querySelector('.navbar-end');
			if (!end) return null;
			return {
				inFlowChildren: [...end.children].filter(
					(el) => getComputedStyle(el).position !== 'absolute'
				).length,
				badgeVisible: !!document.querySelector('[data-testid^="connection-badge"]')
			};
		});

		expect(layout).not.toBeNull();
		expect(layout!.badgeVisible).toBe(false);
		// Menü (Desktop) + Dropdown (Mobil) + Sprachumschalter — kein viertes,
		// leeres Flex-Item. Der Umschalter (`LanguageSwitcher.svelte`) ist seit
		// `TRANSLATION_ROLLOUT_COMPLETE = true` (2026-08-13,
		// `$lib/i18n/translationRolloutStage.ts`) eingebunden, hier online, also
		// bei bestehender Verbindung (`!connection.isOffline`) sichtbar.
		expect(layout!.inFlowChildren).toBe(3);
	});

	/**
	 * Ehemalige Regression (Task 9, vor Etappe 0 der Mehrsprachigkeit): Der
	 * Sprachumschalter und das Offline-Abzeichen konkurrierten beide um Platz in
	 * `.navbar-end`. Gemessen (2026-08-10) lief die Navbar bei 320px — der
	 * schmalsten unterstützten Breite (`horizontal-overflow.spec.ts`) — nur dann
	 * über, wenn BEIDE gleichzeitig sichtbar waren: 231px Inhalt gegen 320px
	 * verfügbare Breite, davon 74px der Sprachumschalter. Die `!connection.isOffline`-
	 * Bedingung an der Einbindung des Umschalters (`PublicNavbar.svelte`) sorgt
	 * dafür, dass sich beide nie gleichzeitig um den Platz streiten: Der
	 * Umschalter ist seit `TRANSLATION_ROLLOUT_COMPLETE = true` (2026-08-13)
	 * zwar wieder in der Navbar, aber genau dann ausgeblendet, wenn das
	 * Offline-Abzeichen erscheint. Dieser Test prüft deshalb weiterhin nur die
	 * schwächere Aussage: das Offline-Abzeichen läuft für sich allein bei 320px
	 * nicht über.
	 */
	test('Offline-Abzeichen läuft bei 320px nicht über', async ({ page, context }) => {
		await page.setViewportSize({ width: 320, height: 800 });
		const formPage = new FormPage(page);
		await formPage.goto();

		await context.setOffline(true);
		// Zwei Instanzen sind offline gleichzeitig im DOM (Navbar + ortsfester
		// Schritt-Balken, siehe `ConnectionBadge.svelte`) — hier zählt die in der
		// Navbar.
		await expect(page.locator('header [data-testid="connection-badge-offline"]')).toBeVisible();

		await expectNoHorizontalOverflow(page, '320px · Navbar offline');
	});

	test('gibt das Absenden wieder frei, sobald die Verbindung zurück ist', async ({
		page,
		context
	}) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		await fillStep2(formPage);
		await formPage.clickNext();
		await formPage.clickNext();
		await expectCurrentStep(page, /Kontakt/i);

		await context.setOffline(true);
		await expect(page.locator('[data-testid="submit-status-offline"]')).toBeVisible();

		await context.setOffline(false);

		await expect(page.locator('[data-testid="submit-status-offline"]')).toBeHidden();
		// Der Knopf trägt den Verweis auf die Begründung nur, solange gesperrt ist —
		// ein `aria-disabled`-Vergleich wäre hier seit dem Umbau in BEIDEN
		// Zuständen erfüllt und damit keine Aussage mehr.
		await expect(page.getByRole('button', { name: /Formular absenden/i })).not.toHaveAttribute(
			'aria-describedby',
			'submit-status-offline'
		);
	});
});
