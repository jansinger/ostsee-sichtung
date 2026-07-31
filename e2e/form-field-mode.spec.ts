import { expect, test, type Page } from '@playwright/test';

/**
 * form-field-mode.spec.ts — Feldmodus und Breakpoint-Vertrag des Formulars
 *
 * Warum im Browser und nicht als Unit-Test: Alle drei Zusagen dieses PRs sind
 * Layout-Zusagen, die erst eine Engine einlöst — `position: sticky` gegen den
 * Viewport, `md:hidden` gegen eine Media Query, `--text-support` gegen die
 * Kaskade aus @theme und [data-density]. Über die CSS-Quelle wäre keine davon
 * prüfbar; über einen Snapshot wären sie prüfbar, aber nicht lesbar.
 *
 * Die Breite ist deshalb hier kein Detail, sondern der Testfall: 390px steht
 * für das Telefon an Deck, 800px für das Tablet. Der Vertrag aus
 * design-system.md sagt, dass `md` (768px) die Grenze ist — 800 liegt knapp
 * darüber und würde eine versehentlich stehengebliebene `sm:`-Umschaltung
 * (640px) nicht von einer korrekten `md:` unterscheiden. Dafür gibt es den
 * dritten Fall bei 700px: dort MUSS noch das kompakte Layout stehen.
 */

const PHONE = { width: 390, height: 844 };
const BETWEEN = { width: 700, height: 844 }; // zwischen sm (640) und md (768)
const TABLET = { width: 800, height: 844 };

/** Setzt den Schritt vor dem ersten Rendern — CURRENT_STEP liegt im sessionStorage. */
async function gotoStep(page: Page, step: number): Promise<void> {
	await page.addInitScript((s) => {
		sessionStorage.setItem('sichtungen_current_step', String(s));
	}, step);
	await page.goto('/');
	await page.waitForLoadState('networkidle');
}

const compactStepper = (page: Page) =>
	page.locator('.form-step-nav nav[aria-label="Formular-Schritte"]');
/* Beide Stepper tragen dasselbe `aria-label` — sie sind dieselbe Navigation in
   zwei Darstellungen, und wer die Seite bedient, trifft immer nur eine davon.
   Auseinandergehalten werden sie deshalb an ihrer Umgebung: der kompakte liegt
   im `.form-step-nav`-Balken, der ausgeschriebene bringt `.step-button` mit. */
const fullStepper = (page: Page) =>
	page.locator('nav[aria-label="Formular-Schritte"]').filter({ has: page.locator('.step-button') });

test.describe('Feldmodus — ortsfeste Schritt-Navigation', () => {
	test.use({ viewport: PHONE });

	test('Der Balken steht unten, ohne dass man scrollen muss', async ({ page }) => {
		await gotoStep(page, 0);
		const bar = page.locator('.form-step-nav');

		const geometrie = await bar.evaluate((el) => ({
			position: getComputedStyle(el).position,
			unten: Math.round(el.getBoundingClientRect().bottom),
			viewport: window.innerHeight,
			// Der Balken muss ÜBER dem Karteninhalt liegen, nicht darunter
			zIndex: getComputedStyle(el).zIndex
		}));

		expect(geometrie.position).toBe('sticky');
		expect(geometrie.unten).toBe(geometrie.viewport);
		expect(geometrie.zIndex).toBe('30'); // --layer-nav
	});

	/* Der Alert steht bewusst NICHT im stickyen Container.

	   Erst dort hineingenommen (dann wandert er mit), dann wieder heraus: bei
	   fünf gleichzeitig verletzten Regeln in Schritt 1 machte die <ul> den
	   Balken 390px hoch — 46 % eines 844px-Bildschirms, dauerhaft. Was im
	   Balken bleiben muss, ist die Zahl und ein Weg zurück zum Feld. */
	test('Der volle Alert steht im Fluss, nicht im Balken', async ({ page }) => {
		await gotoStep(page, 0);
		await page.getByRole('button', { name: 'Nächster Schritt' }).click();

		const alert = page.locator('.alert[role="alert"]').filter({ hasText: /Fahrwasser|Position/i });
		await expect(alert.first()).toBeVisible();
		expect(
			await page.locator('.form-step-nav .alert[role="alert"]').count(),
			'Der Alert gehört nicht in den ortsfesten Balken'
		).toBe(0);
	});

	test('Der Balken zeigt die Fehlerzahl und springt zum ersten Feld', async ({ page }) => {
		await gotoStep(page, 0);
		await page.getByRole('button', { name: 'Nächster Schritt' }).click();

		const sprung = page.locator('.form-step-nav').getByRole('button', { name: /fehlerhaften/i });
		await expect(sprung).toBeVisible();
		await expect(sprung).toContainText(/\d+ Fehler/);

		await sprung.click();
		/* scrollToFirstError bringt das erste Feld der fieldOrder ins Bild —
		   geprüft wird die Wirkung, nicht der Aufruf. */
		await expect
			.poll(() =>
				page.evaluate(() => {
					const feld = document.querySelector(
						'[data-field="waterway"], [data-testid="field-waterway"]'
					);
					if (!feld) return null;
					const r = feld.getBoundingClientRect();
					return r.top >= 0 && r.top <= window.innerHeight;
				})
			)
			.toBe(true);
	});

	/* Der eigentliche Regressionsschutz für die Höhe: Der Balken darf auch im
	   schlimmsten Fehlerfall nicht wieder zum halben Bildschirm werden. */
	test('Der Balken bleibt auch bei fünf Fehlern kompakt', async ({ page }) => {
		await page.addInitScript(() => {
			sessionStorage.setItem('sichtungen_current_step', '0');
			sessionStorage.setItem(
				'sichtungen_form_data',
				JSON.stringify({
					hasPosition: true,
					latitude: 10,
					longitude: 0,
					waterway: 'x'.repeat(300),
					sightingDate: '2099-01-01',
					sightingTime: ''
				})
			);
		});
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Nächster Schritt' }).click();
		await expect(
			page.locator('.form-step-nav').getByRole('button', { name: /fehlerhaften/i })
		).toBeVisible();

		const hoehe = await page
			.locator('.form-step-nav')
			.evaluate((el) => el.getBoundingClientRect().height);
		expect(hoehe, 'Der Balken frisst wieder den halben Bildschirm').toBeLessThanOrEqual(130);
	});

	test('Am Dokumentende verdeckt der Balken keinen Inhalt', async ({ page }) => {
		await gotoStep(page, 0);
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

		const ueberlappung = await page.evaluate(() => {
			const bar = document.querySelector('.form-step-nav');
			const davor = bar?.previousElementSibling;
			if (!bar || !davor) return null;
			return davor.getBoundingClientRect().bottom - bar.getBoundingClientRect().top;
		});

		expect(ueberlappung, 'Der Balken überlappt am Ende das Element darüber').toBeLessThanOrEqual(0);
	});

	test('scroll-padding hält Felder aus dem Balken heraus', async ({ page }) => {
		await gotoStep(page, 0);
		const padding = await page.evaluate(
			() => getComputedStyle(document.documentElement).scrollPaddingBottom
		);
		// 7.5rem = 120px — die gemessene Balkenhöhe im Normalfall
		expect(parseFloat(padding)).toBeGreaterThanOrEqual(120);
	});
});

test.describe('Kompakter Schritt-Stepper', () => {
	test.use({ viewport: PHONE });

	test('aria-current="step" steht genau einmal, am aktuellen Schritt', async ({ page }) => {
		await gotoStep(page, 2);
		const buttons = compactStepper(page).getByRole('button');

		await expect(buttons).toHaveCount(4);
		await expect(buttons.nth(2)).toHaveAttribute('aria-current', 'step');
		for (const index of [0, 1, 3]) {
			await expect(buttons.nth(index)).not.toHaveAttribute('aria-current', 'step');
		}
	});

	test('Klick-Navigation bleibt erhalten — zurück ist immer erlaubt', async ({ page }) => {
		await gotoStep(page, 2);
		await compactStepper(page).getByRole('button').first().click();

		await expect(compactStepper(page).getByRole('button').first()).toHaveAttribute(
			'aria-current',
			'step'
		);
		await expect(page.getByRole('heading', { name: 'Position & Zeitpunkt' })).toBeVisible();
	});

	test('Vorwärts bleibt gesperrt, solange der Schritt unvollständig ist', async ({ page }) => {
		await gotoStep(page, 0);
		const letzter = compactStepper(page).getByRole('button').last();

		await expect(letzter).toHaveAttribute('aria-disabled', 'true');
		/* `force`, weil Playwright `aria-disabled="true"` selbst als „nicht
		   bedienbar" wertet und gar nicht erst klickt. Ohne das Flag würde der
		   Test die Sperre der Anwendung nie erreichen und nur Playwrights
		   eigene Actionability-Prüfung bestätigen. Das Element ist bewusst
		   nicht `disabled`: ein deaktivierter Button ist nicht fokussierbar und
		   sein `title` („Bitte füllen Sie zuerst …") wäre per Tastatur nicht
		   erreichbar — dasselbe Muster wie im ausgeschriebenen Stepper. */
		await letzter.click({ force: true });
		await expect(compactStepper(page).getByRole('button').first()).toHaveAttribute(
			'aria-current',
			'step'
		);
	});

	test('Jedes Segment ist ein 44-px-Ziel — im Feldmodus 56', async ({ page }) => {
		await gotoStep(page, 0);
		const erstes = compactStepper(page).getByRole('button').first();
		expect((await erstes.boundingBox())?.height).toBeGreaterThanOrEqual(44);

		await page.evaluate(() => (document.documentElement.dataset.density = 'field'));
		await expect.poll(async () => (await erstes.boundingBox())?.height).toBeGreaterThanOrEqual(56);
	});
});

test.describe('Breakpoint-Vertrag — md, nicht sm', () => {
	test('bei 700px gilt noch das kompakte Layout', async ({ page }) => {
		await page.setViewportSize(BETWEEN);
		await gotoStep(page, 0);

		await expect(compactStepper(page)).toBeVisible();
		await expect(page.locator('.form-step-nav')).toHaveCSS('position', 'sticky');
	});

	test('bei 800px übernimmt der ausgeschriebene Stepper', async ({ page }) => {
		await page.setViewportSize(TABLET);
		await gotoStep(page, 0);

		await expect(compactStepper(page)).toBeHidden();
		await expect(fullStepper(page)).toBeVisible();
		await expect(page.locator('.form-step-nav')).toHaveCSS('position', 'static');
	});

	/* Der eigentliche Regressionsschutz: Eine zurückgebliebene `sm:`-Umschaltung
	   fiele bei 390 und 800 nicht auf, weil beide Breiten auf derselben Seite
	   der 640px-Grenze liegen wie der md-Vertrag es vorsieht. Sichtbar wird sie
	   nur dazwischen. Geprüft am Datum/Uhrzeit-Raster, das früher bei `sm`
	   zweispaltig wurde. */
	test('kein Formular-Element schaltet zwischen 640 und 768px um', async ({ page }) => {
		await gotoStep(page, 0);

		const messen = async (width: number) => {
			await page.setViewportSize({ width, height: 844 });
			await page.waitForTimeout(150);
			return page.evaluate(() =>
				[...document.querySelectorAll('#form-content [class*="grid-cols"]')].map(
					(el) => getComputedStyle(el).gridTemplateColumns.split(' ').length
				)
			);
		};

		expect(await messen(639), 'Spaltenzahl kippt zwischen 639px und 767px').toEqual(
			await messen(767)
		);
	});
});

test.describe('Hilfetexte im Feld', () => {
	test.use({ viewport: PHONE });

	/* 13px statt 12px, /70 statt /60 — beides steht in design-system.md
	   („Sekundärtext gehört auf /70, nicht auf /60") und ist genau der Text,
	   der bei Sonnenlicht an Deck als erstes unlesbar wird. */
	test('Hilfetext ist text-support und wächst im Feldmodus auf 14px', async ({ page }) => {
		await gotoStep(page, 0);
		const hilfetext = page.locator('#form-content [id$="-help"]').first();
		await expect(hilfetext).toBeVisible();

		const normal = await hilfetext.evaluate((el) =>
			parseFloat(getComputedStyle(el.querySelector('span') ?? el).fontSize)
		);
		expect(normal).toBeCloseTo(13, 0);

		await page.evaluate(() => (document.documentElement.dataset.density = 'field'));
		await expect
			.poll(() =>
				hilfetext.evaluate((el) =>
					parseFloat(getComputedStyle(el.querySelector('span') ?? el).fontSize)
				)
			)
			.toBeCloseTo(14, 0);
	});

	test('kein Hilfetext unter Deckkraft /70', async ({ page }) => {
		await gotoStep(page, 0);
		const zuBlass = await page.evaluate(() => {
			const cls = (el: Element) => el.getAttribute('class') ?? '';
			const verboten = /(^|\s)text-base-content\/(40|50|60)(\s|$)/;
			return [...document.querySelectorAll('#form-content [class]')]
				.filter((el) => verboten.test(cls(el)) && (el.textContent ?? '').trim().length > 0)
				.map((el) => `${el.tagName.toLowerCase()}.${cls(el)}`)
				.slice(0, 10);
		});
		expect(zuBlass, 'Hilfetext gehört auf /70 (design-system.md)').toEqual([]);
	});
});
