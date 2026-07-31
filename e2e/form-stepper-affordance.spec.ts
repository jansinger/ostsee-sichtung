import { expect, test, type Locator, type Page } from '@playwright/test';
import { FormPage } from './pages/FormPage';

/**
 * Der Stepper am Seitenkopf ist seit jeher Navigation — man sah es ihm nur
 * nicht an. Gemessen im Ruhezustand auf Schritt 2 trugen erreichbarer und
 * aktueller Schritt dieselbe Farbe (`base-content`), denselben Schriftschnitt
 * (400) und denselben Cursor (`default`, aus Tailwinds Preflight). Der einzige
 * Schritt mit einem abweichenden Cursor war der **gesperrte**
 * (`not-allowed`) — das Zeigegerät meldete also ausschließlich, wo nichts
 * geht. Ein Hover-Zustand existierte nicht, und die Trefferfläche war 16px
 * hoch, also die nackte Textzeile.
 *
 * Genau daraus entstand der Wunsch des Deutschen Meeresmuseums nach einem
 * „Zurück-Button auch oberhalb" (Abschnitt B5 der Änderungswünsche; das
 * Dokument liegt seit #676 außerhalb dieses Repos). Die
 * Antwort ist kein zweites Bedienelement — das verstieße gegen die
 * Button-Hierarchie in `design-system.md` —, sondern die fehlende Affordanz.
 *
 * Dieser Test hält die drei Zustände auseinander. Er prüft NICHT, ob die
 * Navigation funktioniert (das tun `stepNavigation.test.ts` und
 * `form-field-mode.spec.ts`), sondern ob man ihr ansieht, dass es sie gibt.
 */

const STEP_BUTTON = 'nav[aria-label="Formular-Schritte"]:visible .step-button';

/**
 * Wartet, bis alle laufenden CSS-Transitions durch sind.
 *
 * Ohne das misst dieser Test sich selbst blind: Der Schrittwechsel färbt den
 * verlassenen Schritt in die Linkfarbe um, und zwar über
 * `--motion-instant` (120ms). Ein `getComputedStyle` unmittelbar danach liest
 * einen Zwischenwert. Beim Hover ist es schlimmer als ungenau — dort steht
 * sofort nach `.hover()` `oklab(0 0 0 / 0)`, also **Deckkraft 0**. Ein
 * Vergleich gegen den Ruhewert `rgba(0, 0, 0, 0)` wäre damit schon erfüllt,
 * ohne dass irgendetwas sichtbar geworden ist.
 *
 * Nur Transitions, nicht `getAnimations()` insgesamt: eine endlos laufende
 * Keyframe (Ladeanzeige) würde sonst nie fertig und der Test hinge.
 */
async function transitionsSettled(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const transitions = document
			.getAnimations()
			.filter((a) => typeof CSSTransition !== 'undefined' && a instanceof CSSTransition);
		await Promise.all(transitions.map((a) => a.finished.catch(() => undefined)));
	});
}

/** Bringt das Formular auf Schritt 2 — dort ist Schritt 1 erreichbar, 3 und 4 sind gesperrt. */
async function gotoStepTwo(page: Page): Promise<FormPage> {
	const formPage = new FormPage(page);
	await formPage.goto();
	await formPage.fillWaterway('Kieler Förde');
	await formPage.clickNext();
	await expect(page.locator(`${STEP_BUTTON}[aria-current="step"]`)).toHaveText(/Angaben zum Tier/);
	await transitionsSettled(page);
	return formPage;
}

async function style(el: Locator, prop: string): Promise<string> {
	return el.evaluate(
		(node, p) => getComputedStyle(node).getPropertyValue(p),
		prop
	) as Promise<string>;
}

/**
 * Deckkraft einer berechneten Farbe. Der Browser serialisiert je nach Herkunft
 * als `rgba(…)` oder als `oklab(… / a)` — beide Formen kommen an derselben
 * Eigenschaft vor, sobald ein `color-mix()` im Spiel ist.
 */
function alphaOf(color: string): number {
	const mitSchraegstrich = color.match(/\/\s*([\d.]+)\s*\)/);
	if (mitSchraegstrich) return Number(mitSchraegstrich[1]);
	const rgba = color.match(/^rgba?\(([^)]+)\)/);
	if (rgba) {
		const teile = rgba[1].split(',').map((s) => s.trim());
		return teile.length === 4 ? Number(teile[3]) : 1;
	}
	return 1;
}

test.describe('Stepper — erkennbar als Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1024, height: 900 });
	});

	test('der erreichbare Schritt sieht anders aus als der aktuelle', async ({ page }) => {
		await gotoStepTwo(page);
		const erreichbar = page.locator(`${STEP_BUTTON}[aria-disabled="false"]`).first();
		const aktuell = page.locator(`${STEP_BUTTON}[aria-current="step"]`);

		await expect(erreichbar).toHaveText(/Position & Zeitpunkt/);

		// Farbe UND Unterstreichung — zwei Kanäle, damit die Auszeichnung nicht
		// allein an der Farbe hängt (WCAG 1.4.1).
		expect(await style(erreichbar, 'color')).not.toBe(await style(aktuell, 'color'));
		expect(await style(erreichbar, 'text-decoration-line')).toBe('underline');
		expect(await style(aktuell, 'text-decoration-line')).toBe('none');

		// Der aktuelle Schritt ist Standort, kein Ziel: fetter, nicht unterstrichen.
		expect(Number(await style(aktuell, 'font-weight'))).toBeGreaterThan(
			Number(await style(erreichbar, 'font-weight'))
		);
	});

	test('das Zeigegerät meldet erreichbar und gesperrt unterschiedlich', async ({ page }) => {
		await gotoStepTwo(page);
		const erreichbar = page.locator(`${STEP_BUTTON}[aria-disabled="false"]`).first();
		const gesperrt = page.locator(`${STEP_BUTTON}[aria-disabled="true"]`).first();

		// Vor dieser Änderung stand hier zweimal `default` bzw. einmal
		// `not-allowed` — der Cursor zeigte nur, wo es NICHT weitergeht.
		expect(await style(erreichbar, 'cursor')).toBe('pointer');
		expect(await style(gesperrt, 'cursor')).toBe('not-allowed');
	});

	test('die Trefferfläche erfüllt das Mindestmaß aus --target-min', async ({ page }) => {
		await gotoStepTwo(page);
		const buttons = page.locator(STEP_BUTTON);
		const anzahl = await buttons.count();
		expect(anzahl).toBe(4);

		for (const density of ['default', 'field'] as const) {
			await page.evaluate((d) => document.documentElement.setAttribute('data-density', d), density);
			await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));

			// rem → px über die tatsächliche Root-Schriftgröße, nicht über eine
			// angenommene 16.
			const sollPx = await page.evaluate(() => {
				const root = getComputedStyle(document.documentElement);
				return parseFloat(root.getPropertyValue('--target-min')) * parseFloat(root.fontSize);
			});

			for (let i = 0; i < anzahl; i++) {
				const box = await buttons.nth(i).boundingBox();
				expect(box, `Schritt ${i + 1} muss sichtbar sein`).not.toBeNull();
				expect(
					box!.height,
					`Schritt ${i + 1} (${density}) muss --target-min hoch sein`
				).toBeGreaterThanOrEqual(sollPx - 0.5);
			}
		}
		await page.evaluate(() => document.documentElement.removeAttribute('data-density'));
	});

	test('der Hover hebt den erreichbaren Schritt hervor, den gesperrten nicht', async ({ page }) => {
		await gotoStepTwo(page);
		const erreichbar = page.locator(`${STEP_BUTTON}[aria-disabled="false"]`).first();
		const gesperrt = page.locator(`${STEP_BUTTON}[aria-disabled="true"]`).first();

		// Deckkraft statt Farb-String: `not.toBe()` auf der Serialisierung wäre
		// schon erfüllt, wenn aus `rgba(0, 0, 0, 0)` ein `oklab(0 0 0 / 0)` wird —
		// eine Fläche mit 0 % Deckkraft käme durch.
		expect(alphaOf(await style(erreichbar, 'background-color'))).toBe(0);
		await erreichbar.hover();
		await transitionsSettled(page);
		expect(alphaOf(await style(erreichbar, 'background-color'))).toBeGreaterThan(0);

		await gesperrt.hover({ force: true });
		await transitionsSettled(page);
		expect(alphaOf(await style(gesperrt, 'background-color'))).toBe(0);
	});

	test('die Schaltflächen benennen die Aktion, nicht nur den Schritt', async ({ page }) => {
		await gotoStepTwo(page);
		const buttons = page.locator(STEP_BUTTON);

		await expect(buttons.nth(0)).toHaveAttribute(
			'aria-label',
			'Zurück zu Schritt 1: Position & Zeitpunkt'
		);
		await expect(buttons.nth(1)).toHaveAttribute('aria-label', 'Schritt 2: Angaben zum Tier');
		await expect(buttons.nth(2)).toHaveAttribute(
			'aria-label',
			'Weiter zu Schritt 3: Weitere Informationen'
		);
	});

	test('die Sperre bleibt fokussierbar, begründet und wirksam', async ({ page }) => {
		await gotoStepTwo(page);
		const gesperrt = page.locator(`${STEP_BUTTON}[aria-disabled="true"]`).first();

		// `aria-disabled` statt `disabled` — sonst verlöre die Tastaturbedienung
		// den Fokus und der begründende `title` wäre unerreichbar
		// (design-system.md, „Gesperrte Schaltflächen").
		await expect(gesperrt).not.toHaveAttribute('disabled', /.*/);
		await expect(gesperrt).toHaveAttribute('title', /vorherigen Schritte/);
		await gesperrt.focus();
		await expect(gesperrt).toBeFocused();

		// `force`, weil Playwright `aria-disabled="true"` selbst als nicht
		// bedienbar wertet und ohne das gar nicht erst klickt — der Test würde
		// dann nur Playwrights eigene Prüfung bestätigen, nie die der Anwendung.
		await gesperrt.click({ force: true });
		await expect(page.locator(`${STEP_BUTTON}[aria-current="step"]`)).toHaveText(
			/Angaben zum Tier/
		);
	});

	test('ein Klick auf den erreichbaren Schritt geht zurück', async ({ page }) => {
		await gotoStepTwo(page);
		await page.locator(`${STEP_BUTTON}[aria-disabled="false"]`).first().click();
		await expect(page.locator(`${STEP_BUTTON}[aria-current="step"]`)).toHaveText(
			/Position & Zeitpunkt/
		);
	});
});

/**
 * Unterhalb `md` übernimmt `StepProgressCompact.svelte` im ortsfesten Balken.
 * Dort steht „Zurück" als echter Button daneben, die Segmente brauchen also
 * keine eigene Link-Optik — wohl aber denselben Cursor-Vertrag.
 *
 * Der Anlass für diesen Block: `canNavigateToStep` liefert für den AKTUELLEN
 * Schritt `true` (`targetIndex <= currentStep`). Oben schließt das CSS ihn über
 * `:not([aria-current='step'])` aus; unten hing der Cursor an einer Utility, die
 * das nicht tat — der aktuelle Schritt gab sich damit als Navigationsziel aus,
 * obwohl ein Klick darauf nichts tut.
 */
test.describe('Kompakte Fortschrittsanzeige — derselbe Cursor-Vertrag', () => {
	const SEGMENT = 'nav[aria-label="Formular-Schritte"]:visible ol button';

	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
	});

	test('nur erreichbare Schritte außer dem aktuellen zeigen den Zeigefinger', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();
		await formPage.fillWaterway('Kieler Förde');
		await formPage.clickNext();
		await expect(page.locator(`${SEGMENT}[aria-current="step"]`)).toHaveAttribute(
			'aria-label',
			/Angaben zum Tier/
		);

		const segmente = page.locator(SEGMENT);
		await expect(segmente).toHaveCount(4);

		// Schritt 1: erreichbar, nicht aktuell → Ziel.
		expect(await style(segmente.nth(0), 'cursor')).toBe('pointer');
		// Schritt 2: aktuell → Standort, kein Ziel.
		expect(await style(segmente.nth(1), 'cursor')).not.toBe('pointer');
		// Schritt 3 und 4: gesperrt.
		expect(await style(segmente.nth(2), 'cursor')).toBe('not-allowed');
		expect(await style(segmente.nth(3), 'cursor')).toBe('not-allowed');
	});

	test('auf Schritt 1 ist kein Segment ein Ziel', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const segmente = page.locator(SEGMENT);
		// Der einzige erreichbare Schritt ist der aktuelle — es gibt nichts
		// anzuspringen, also darf auch nichts danach aussehen.
		expect(await style(segmente.nth(0), 'cursor')).not.toBe('pointer');
		expect(await style(segmente.nth(1), 'cursor')).toBe('not-allowed');
	});
});
