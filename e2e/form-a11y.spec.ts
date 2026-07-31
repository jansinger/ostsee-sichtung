import { test, expect, type Locator } from '@playwright/test';
import { FormPage } from './pages/FormPage';
import { fillStep1, fillStep2, expectCurrentStep } from './helpers/form-helpers';
import { formatRatio, measureContrast } from './helpers/contrast';

// ── Phase 5A: FormSteps Indicator ──────────────────────────────────────────

test.describe('FormSteps — Step-Indikator', () => {
	test('zeigt 4 Step-Indikatoren', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const steps = page.locator('.step-button');
		await expect(steps).toHaveCount(4);
	});

	test('aktueller Step hat aria-current="step"', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const activeStep = page.locator('[aria-current="step"]:visible');
		await expect(activeStep).toBeVisible();
		await expect(activeStep).toHaveAttribute('aria-label', /Position & Zeitpunkt/i);
	});

	test('Klick auf navigierbaren Step wechselt Step', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Navigate to Step 2
		await fillStep1(formPage);
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		// Click on Step 1 indicator (backward = always allowed)
		const step1Button = page.locator('.step-button').nth(0);
		await step1Button.click();
		await expectCurrentStep(page, /Position & Zeitpunkt/i);
	});
});

// ── Phase 5B: RequiredConsent ──────────────────────────────────────────────

test.describe('RequiredConsent — Datenschutz', () => {
	test('Consent-Block ist auf Step 4 sichtbar', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Navigate to Step 4
		await fillStep1(formPage);
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();

		// Fill Step 2 (sightingFrom = Land → boatDrive bleibt ausgeblendet, keine Pflicht)
		await formPage.selectSpecies(0);
		await formPage.fillTotalCount(2);
		await formPage.selectDistance(1);
		await formPage.selectSightingFrom(3);
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();

		// Skip Step 3
		await formPage.skipStep();
		await expectCurrentStep(page, /Kontaktdaten/i);

		// Privacy consent checkbox should be visible
		const consent = page.locator('[data-testid="field-privacyConsent"]');
		await expect(consent).toBeVisible();
	});

	test('Consent-Block ist auf Step 1 NICHT sichtbar', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Privacy consent should not be on Step 1
		const consent = page.locator('[data-testid="field-privacyConsent"]');
		await expect(consent).not.toBeVisible();
	});
});

// ── Phase 5C: Keyboard Navigation & Accessibility ──────────────────────────

test.describe('Accessibility — Keyboard Navigation', () => {
	test('Tab navigiert durch Formularfelder', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Tab into the form - should reach the date field
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');

		// Some focusable element should be focused
		const focused = page.locator(':focus');
		await expect(focused).toBeVisible();
	});

	test('Error-Messages haben role="alert"', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Step 1 ist mit fillStep1() valide → Navigation zu Step 2 gelingt ohne Fehler
		await fillStep1(formPage);
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		// Step 2 hat leere Pflichtfelder → erst der Klick auf "Weiter" löst die
		// Inline-Fehlermeldung aus (kein automatisches Erscheinen beim Betreten)
		await formPage.clickNext();

		// Inline validation error is shown above the Next button
		await page.locator('[role="alert"]').first().waitFor({ state: 'visible' });

		// Check role="alert" elements exist
		await expect(page.locator('[role="alert"]').first()).toBeVisible();
	});

	test('Formular hat korrekte aria-labels auf Navigation', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		/* Navigation should have aria-label.
		   `:visible` ist hier nicht Kosmetik: Seit PR 3 gibt es ZWEI Navigationen
		   mit diesem Label — den ausgeschriebenen Stepper ab `md` und den
		   kompakten im ortsfesten Balken darunter. CSS blendet immer genau eine
		   aus, Screenreader-Nutzende treffen also nie beide. Ohne den Filter
		   wäre das ein Strict-Mode-Verstoß und kein echter Befund. */
		const nav = page.locator('nav[aria-label="Formular-Schritte"]:visible');
		await expect(nav).toBeVisible();

		// Buttons should have aria-labels
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /Vorheriger Schritt/i })).toBeVisible();
	});
});

// ── Phase 5D: Fokus-Indikator auf Formularfeldern ──────────────────────────

/**
 * Schützt den Override `.input/.select/.textarea:focus` aus `src/app.css`
 * (3px-Outline in `--color-primary`, siehe `.claude/rules/daisyui.md`).
 *
 * Der Test muss im echten Browser laufen: DaisyUI setzt für dieselben Felder
 * ein eigenes `outline: 2px solid var(--input-color)` (= `--color-base-content`)
 * innerhalb von `@layer utilities`. Dass der projekteigene, ungelayerte Override
 * gewinnt, ergibt sich erst aus der vollständigen Kaskade des gebauten CSS —
 * ein Unit-Test über die CSS-Quelle würde eine Regression hier nicht bemerken.
 *
 * Achtung bei manueller Nachprüfung: `:focus` greift nur, wenn das Browser-
 * fenster den Fokus hat. Ein `getComputedStyle`-Sample aus einem unfokussierten
 * Fenster liefert stattdessen DaisyUIs 2px und `currentColor`
 * (= `--color-base-content`) und sieht fälschlich nach einem Bug aus.
 */
async function readFocusIndicator(field: Locator) {
	return field.evaluate((el) => {
		// `--color-primary` über ein Probe-Element auflösen, damit Soll- und
		// Ist-Farbe durch dieselbe Browser-Serialisierung laufen (oklch(...)).
		// Das Element hängt an `document.body` (die Variable kommt vom Theme-Root)
		// und ist layout-neutral — es darf das Formular-DOM nicht beeinflussen.
		const probe = document.createElement('span');
		probe.style.cssText =
			'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;color:var(--color-primary)';
		document.body.appendChild(probe);
		const primary = getComputedStyle(probe).color;
		probe.remove();

		const style = getComputedStyle(el);
		return {
			width: style.outlineWidth,
			style: style.outlineStyle,
			color: style.outlineColor,
			offset: style.outlineOffset,
			boxShadow: style.boxShadow,
			primary,
			focusVisible: el.matches(':focus-visible')
		};
	});
}

/**
 * Gepollt, weil `BaseSelect` und `BaseTextarea` `transition-all duration-200`
 * setzen: `outline-offset` wird dadurch mit-animiert und ist unmittelbar nach
 * dem Fokussieren noch `0px`. Ein einmaliges `getComputedStyle` würde je nach
 * Timing den Zwischenwert sehen.
 */
async function expectPrimaryFocusRing(field: Locator) {
	await expect
		.poll(async () => {
			const indicator = await readFocusIndicator(field);
			return {
				style: indicator.style,
				width: indicator.width,
				offset: indicator.offset,
				// Farbe muss `--color-primary` sein — nicht DaisyUIs `--color-base-content`
				colorIsPrimary: indicator.color === indicator.primary,
				// Zusätzlicher 4px-Ring aus demselben Regelblock; DaisyUIs
				// Fokus-Regel setzt an dieser Stelle einen 1px-Inset-Schatten.
				hasOuterRing: indicator.boxShadow.includes('0px 0px 0px 4px')
			};
		})
		.toEqual({
			style: 'solid',
			width: '3px',
			offset: '2px',
			colorIsPrimary: true,
			hasOuterRing: true
		});
}

test.describe('Accessibility — Fokus-Indikator', () => {
	test('Text-Input zeigt bei Tastatur-Fokus den 3px-Primary-Ring', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const field = page.locator('[data-testid="field-waterway"]');
		// Shift+Tab und zurück → echter Tastatur-Fokus (setzt :focus-visible),
		// ohne die Tab-Stopps ab Seitenanfang abzählen zu müssen.
		await field.focus();
		await page.keyboard.press('Shift+Tab');
		await page.keyboard.press('Tab');
		await expect(field).toBeFocused();

		expect((await readFocusIndicator(field)).focusVisible).toBe(true);
		await expectPrimaryFocusRing(field);
	});

	test('Select zeigt denselben Fokus-Ring', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		const field = page.locator('[data-testid="field-species"]');
		await field.focus();
		await expect(field).toBeFocused();

		await expectPrimaryFocusRing(field);
	});

	test('Textarea zeigt denselben Fokus-Ring', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// `notes` steht auf Schritt 4 (Kontaktdaten), nicht auf "Beobachtungen".
		await fillStep1(formPage);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		await fillStep2(formPage);
		await formPage.clickNext();
		await expectCurrentStep(page, /Weitere Informationen/i);

		await formPage.skipStep();
		await expectCurrentStep(page, /Kontaktdaten/i);

		const field = page.locator('[data-testid="field-notes"]');
		await field.focus();
		await expect(field).toBeFocused();

		await expectPrimaryFocusRing(field);
	});
});

// ── Alert-Kontrast (Theme-Override in src/app.css) ─────────────────────────

/**
 * Schützt den Alert-Override `.alert-info/.alert-success/.alert-warning/
 * .alert-error` aus `src/app.css` gegen einen Rückfall auf die Statusfarbe als
 * Textfarbe.
 *
 * Warum im echten Browser und nicht über die CSS-Quelle: siehe die Erklärung in
 * `helpers/contrast.ts` — `oklch()` und `color-mix(in oklab, …)` werden erst
 * nach dem Gamut-Mapping nach sRGB als Kontrastwert lesbar.
 *
 * Der Fehler, den dieser Test verhindert, hatte alle vier Varianten zwischen
 * 2,45:1 und 3,84:1 gehalten (WCAG 1.4.3 verlangt 4,5:1 für Fließtext) — die
 * Statusfarbe stand als Text auf einem 12-%-Tint ihrer selbst.
 */
const ALERT_VARIANTS = ['alert-info', 'alert-success', 'alert-warning', 'alert-error'] as const;

test.describe('Accessibility — Alert-Kontrast', () => {
	test('alle vier Alert-Varianten erreichen WCAG AA (4,5:1)', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const measured = await measureContrast(
			page,
			ALERT_VARIANTS.map((variant) => ({
				name: variant,
				className: `alert ${variant}`,
				backdrop: 'var(--color-base-100)'
			}))
		);

		expect(measured).toHaveLength(ALERT_VARIANTS.length);
		for (const { name, ratio } of measured) {
			expect(ratio, `${name}: gemessen ${formatRatio(ratio)}:1`).toBeGreaterThanOrEqual(4.5);
		}
	});

	/**
	 * Der bleibende Fehlerbereich der Dropzone (`UnifiedDropzone.svelte`,
	 * `#dropzone-errors`) nutzt dieselbe `alert alert-error`-Klasse wie oben,
	 * ist aber eine eigene Aufrufstelle mit eigenem `text-error-strong`-Icon —
	 * ein neuer Ort, an dem der Soft-Tint-Fehler von oben (Statusfarbe als
	 * Fließtext) versehentlich wieder auftauchen könnte. Gemessen wird das
	 * echte, im Browser gerenderte Element (nicht nur eine Probe mit denselben
	 * Klassen), damit ein Wechsel der Aufrufstelle auf eine andere Klasse
	 * ebenfalls auffällt.
	 */
	test('der bleibende Fehlerbereich der Dropzone erreicht WCAG AA (4,5:1)', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		await fillStep2(formPage);
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();
		await expectCurrentStep(page, /Beobachtungen/i);

		// Grenze aus der Laufzeit-Konfiguration lesen statt eine feste Byte-Zahl zu
		// raten — dieselbe Quelle, die `videoUpload.spec.ts` schon nutzt.
		const configResponse = await page.request.get('/api/config/upload');
		expect(configResponse.ok()).toBe(true);
		const { maxFileSizeBytes } = await configResponse.json();

		const input = page.locator('[data-testid="dropzone-input"]');
		await input.waitFor({ state: 'attached' });
		await input.setInputFiles({
			name: 'zu-gross.jpg',
			mimeType: 'image/jpeg',
			buffer: Buffer.alloc(maxFileSizeBytes + 1)
		});

		const errorRegion = page.locator('#dropzone-errors');
		await expect(errorRegion).toBeVisible();

		const [measured] = await measureContrast(page, [
			{
				name: 'dropzone-errors',
				selector: '#dropzone-errors',
				backdrop: 'var(--color-base-100)'
			}
		]);

		expect(
			measured.ratio,
			`${measured.name}: gemessen ${formatRatio(measured.ratio)}:1`
		).toBeGreaterThanOrEqual(4.5);
	});
});

// ── Kontrast von `text-error` als Button-Beschriftung ──────────────────────

/**
 * Schützt `--color-error` aus `src/app.css` gegen eine Aufhellung.
 *
 * Die kanonische destruktive Variante des Projekts ist
 * `btn btn-outline btn-error btn-sm min-h-11` (`design-system.md`,
 * Button-Hierarchie) — „Formular zurücksetzen", „Kontaktdaten löschen" und jeder
 * Entfernen-Button lösen zu dieser Farbe auf. `btn-sm` setzt `--fontsize: .75rem`
 * bei Gewicht 600; das ist **kein** „large text", die 3:1-Ausnahme aus WCAG 1.4.3
 * greift also nicht.
 *
 * Gemessen wird auf beiden Flächen, auf denen der Button real vorkommt:
 * `base-100` (Karten-Inhalt) und `base-200` (Seitenhintergrund). Mit dem alten
 * `oklch(0.55 0.18 25)` lagen die Werte bei 4,46:1 bzw. 3,69:1 — beide unter AA.
 */
const DESTRUCTIVE_BUTTON_CLASS = 'btn btn-outline btn-error btn-sm min-h-11';

test.describe('Accessibility — text-error auf Buttons', () => {
	test('destruktiver Button erreicht WCAG AA auf base-100 und base-200', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const measured = await measureContrast(page, [
			{
				name: 'btn-outline btn-error auf base-100',
				className: DESTRUCTIVE_BUTTON_CLASS,
				backdrop: 'var(--color-base-100)'
			},
			{
				name: 'btn-outline btn-error auf base-200',
				className: DESTRUCTIVE_BUTTON_CLASS,
				backdrop: 'var(--color-base-200)'
			}
		]);

		for (const { name, ratio } of measured) {
			expect(ratio, `${name}: gemessen ${formatRatio(ratio)}:1`).toBeGreaterThanOrEqual(4.5);
		}
	});

	test('der echte „Formular zurücksetzen"-Button erreicht WCAG AA', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Nicht nur eine Probe mit denselben Klassen: dieser Teil bemerkt auch,
		// wenn die Aufrufstelle in `FormActions.svelte` auf eine andere Variante
		// wechselt.
		const reset = page.getByRole('button', { name: /Formular zurücksetzen/i });
		await expect(reset).toBeVisible();

		const [onBase100, onBase200] = await measureContrast(page, [
			{
				name: 'Formular zurücksetzen auf base-100',
				selector: 'button.btn-error',
				backdrop: 'var(--color-base-100)'
			},
			{
				name: 'Formular zurücksetzen auf base-200',
				selector: 'button.btn-error',
				backdrop: 'var(--color-base-200)'
			}
		]);

		expect(
			onBase100.ratio,
			`${onBase100.name}: ${onBase100.foreground} auf ${onBase100.background} = ${formatRatio(onBase100.ratio)}:1`
		).toBeGreaterThanOrEqual(4.5);
		expect(
			onBase200.ratio,
			`${onBase200.name}: ${onBase200.foreground} auf ${onBase200.background} = ${formatRatio(onBase200.ratio)}:1`
		).toBeGreaterThanOrEqual(4.5);
	});
});

// ── Touch-Target der Hinweis-Buttons in der Feld-Pipeline ──────────────────

/**
 * Projekt-Mindestmaß ist 44×44 px (`design-system.md`, A11y-Mindestanforderungen)
 * — das Formular wird an Deck einhändig auf dem Telefon ausgefüllt.
 *
 * Gemessen wird die **echte Trefferfläche**, nicht `getBoundingClientRect()`.
 * Der Hinweis-Button steht inline in einer Label-Zeile: Er ist über
 * `min-h-11 min-w-11` echte 44×44 px groß, ragt durch `-my-2.5` aber oben und
 * unten aus der 28 px hohen Zeile heraus (`FieldRenderer.svelte`). Ein Test
 * über die Box-Maße prüfte nur, wie groß das Element sich *nennt* — er würde
 * eine Lösung durchwinken, die 44 px misst, deren Ränder aber von einem
 * Nachbarn überdeckt sind oder ins Leere klicken. `elementFromPoint` prüft
 * stattdessen, was der Browser an den Rändern des 44-px-Quadrats tatsächlich
 * träfe, und bleibt damit gültig, wenn die 44 px später anders erzeugt werden.
 */
const MIN_TOUCH_TARGET = 44;

async function probeHitArea(page: import('@playwright/test').Page, selector: string) {
	return page.evaluate(
		({ selector, size }: { selector: string; size: number }) => {
			const buttons = Array.from(document.querySelectorAll<HTMLElement>(selector));
			const half = size / 2 - 1; // 1 px Sicherheitsabstand zum Rand des Quadrats
			return buttons.map((button) => {
				// `elementFromPoint` arbeitet nur im sichtbaren Viewport — die Felder
				// stehen weit unterhalb der Falz, also jeden Button erst zentrieren.
				button.scrollIntoView({ block: 'center' });
				const rect = button.getBoundingClientRect();
				const cx = rect.left + rect.width / 2;
				const cy = rect.top + rect.height / 2;
				const points: Array<[string, number, number]> = [
					['oben', cx, cy - half],
					['unten', cx, cy + half],
					['links', cx - half, cy],
					['rechts', cx + half, cy]
				];
				const misses = points
					.filter(([, x, y]) => {
						const hit = document.elementFromPoint(x, y);
						return !hit || !(hit === button || button.contains(hit));
					})
					.map(([edge]) => edge);
				return {
					label: (button.getAttribute('aria-label') ?? '').slice(0, 40),
					box: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
					misses
				};
			});
		},
		{ selector, size: MIN_TOUCH_TARGET }
	);
}

test.describe('Accessibility — Touch-Targets der Hinweis-Buttons', () => {
	test('jeder Hinweis-Button in FieldRenderer ist 44×44 px treffbar', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Schritt 1 rendert vier davon — genug, um die geteilte Pipeline zu prüfen.
		const buttons = page.locator('button[aria-label^="Hinweis:"]');
		expect(await buttons.count()).toBeGreaterThan(0);

		const probed = await probeHitArea(page, 'button[aria-label^="Hinweis:"]');
		for (const { label, box, misses } of probed) {
			expect(
				misses,
				`${label} (Box ${box}): ${MIN_TOUCH_TARGET}px-Quadrat nicht treffbar an ${misses.join(', ')}`
			).toEqual([]);
		}
	});

	test('die Label-Zeile bleibt kompakt (kein 44-px-Sprung)', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Gegenprobe zum Test darüber: Das vergrößerte Touch-Target darf die
		// Label-Zeile nicht auf Buttonhöhe aufblasen — sonst reißt es das Label
		// vom zugehörigen Feld weg. Gemessen vor der Änderung: 28 px.
		const rowHeights = await page.evaluate(() =>
			Array.from(document.querySelectorAll<HTMLElement>('button[aria-label^="Hinweis:"]')).map(
				(button) => Math.round(button.closest('label, legend')!.getBoundingClientRect().height)
			)
		);

		expect(rowHeights.length).toBeGreaterThan(0);
		for (const height of rowHeights) {
			expect(height, `Label-Zeile ist ${height}px hoch`).toBeLessThanOrEqual(32);
		}
	});
});
