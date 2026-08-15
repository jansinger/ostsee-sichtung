import { readFileSync } from 'node:fs';
import {
	expect,
	test,
	type APIRequestContext,
	type BrowserContext,
	type Page
} from '@playwright/test';
import { setupMapPage } from './fixtures/mapSetup';
import { MapPage } from './pages/MapPage';
import { seedAdminSession } from './helpers/adminSession';
import {
	BELOW_OPACITY_FLOOR,
	findOffenders,
	OUTLINE_STATUS_COLOR,
	RAW_ELEVATION,
	RAW_MOTION_DURATION,
	RAW_Z_INDEX,
	STATUS_AS_FOREGROUND,
	TAILWIND_PALETTE,
	type ScannedElement
} from './helpers/bannedClasses';
import { formatRatio, measureContrast } from './helpers/contrast';

/**
 * design-tokens.spec.ts — Kontrast-Vertrag des Design Systems
 *
 * Warum im Browser: oklch() und color-mix(in oklab, …) lassen sich erst nach
 * dem Gamut-Mapping nach sRGB als Kontrastwert lesen. Ein Test über die
 * CSS-Quelle würde eine Regression nicht bemerken — dieselbe Begründung wie
 * bei den bestehenden Tests in form-a11y.spec.ts.
 *
 * Warum gegen /styleguide: dort steht jede Token-Kombination genau einmal im
 * DOM. Ein Scan über die App würde ungenutzte Kombinationen verfehlen — und
 * genau die sind gefährlich, weil sie beim nächsten Einsatz sofort zuschlagen.
 *
 * Dieser Test hätte die beiden kritischen Befunde des Reviews am Tag ihrer
 * Entstehung gefunden: weißer Text auf warning (3,26:1) und auf secondary
 * (3,19:1).
 *
 * Damit er das auch in CI tut, muss er dort laufen: Bis zum `e2e`-Filter in
 * `.github/workflows/ci.yml` galt ein PR, der nur `e2e/` anfasste, als
 * Doc-Only — `needs-e2e` blieb false und dieser Scan wurde übersprungen. In
 * #636 und #641 wurde deshalb die Regel in `helpers/bannedClasses.ts`
 * verschärft, ohne dass ihre Reichweite je gegen die echten Routen lief;
 * grün war nur der Unit-Test der Regel.
 */

const AA_TEXT = 4.5;
const AA_GRAPHIC = 3;

/* Seit PR 2 aktiv: /styleguide existiert samt der Attribute
   data-token-surface / data-token-fg / data-token-icon, gegen die hier
   selektiert wird. Diese Gruppe ist damit der Kontrast-Vertrag und muss grün
   sein.

   Die Route ist über `dev`-Guard nur im Entwicklungsmodus erreichbar — das
   passt, weil `playwright.config.ts` in beiden Umgebungen einen Vite-Dev-Server
   startet (lokal `npm run dev`, in CI `vite dev --config vite.config.ci.ts`).
   Gegen einen Production-Build würde diese Gruppe in 404 laufen; dann ist der
   Guard die Ursache, nicht ein Token. */
test.describe('Design-Tokens — Kontrast', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/styleguide');
		// :focus und getComputedStyle brauchen ein fokussiertes Fenster.
		await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(true);
	});

	/* Vollton-Flächen mit ihrem *-content. Erwartung: ≥ 4,5:1 für Text.
	   info und success liegen knapp darüber (4,66 / 4,54) — sinkt einer der
	   Werte, ist das eine Regression und kein Rundungsfehler. */
	for (const token of [
		'primary',
		'secondary',
		'accent',
		'neutral',
		'info',
		'success',
		'warning',
		'error'
	]) {
		test(`${token}: *-content auf Vollton ≥ ${AA_TEXT}:1`, async ({ page }) => {
			const [measured] = await measureContrast(page, [
				{
					name: `text-${token}-content auf bg-${token}`,
					selector: `[data-token-surface="${token}"]`,
					backdrop: 'var(--color-base-100)'
				}
			]);
			expect(
				measured.ratio,
				`${measured.name}: ${formatRatio(measured.ratio)}:1 (${measured.foreground} auf ${measured.background})`
			).toBeGreaterThanOrEqual(AA_TEXT);
		});
	}

	/* Vordergrund-Varianten auf base-100 und base-200.
	   base-300 ist bewusst NICHT geprüft: alle -strong-Werte liegen dort bei
	   ~3,77:1. Das ist dieselbe Grenze wie bei error und in
	   design-system.md als Verbot festgehalten, nicht als Testfall. */
	for (const token of [
		'info-strong',
		'success-strong',
		'warning-strong',
		'secondary-strong',
		'accent-strong',
		'error'
	]) {
		for (const surface of ['base-100', 'base-200']) {
			test(`${token} als Textfarbe auf ${surface} ≥ ${AA_TEXT}:1`, async ({ page }) => {
				const [measured] = await measureContrast(page, [
					{
						name: `text-${token} auf ${surface}`,
						selector: `[data-token-fg="${token}-on-${surface}"]`,
						backdrop: `var(--color-${surface})`
					}
				]);
				expect(
					measured.ratio,
					`${measured.name}: ${formatRatio(measured.ratio)}:1`
				).toBeGreaterThanOrEqual(AA_TEXT);
			});
		}
	}

	/* `badge-soft` ist die eine Ausnahme in `OUTLINE_STATUS_COLOR`
	   (`helpers/bannedClasses.ts`): Als einziger Modifikator ohne Vollton-Fläche
	   darf es eine Statusfarbe tragen. Zulässig ist es aber nicht aus sich
	   heraus, sondern **nur** wegen des Overrides in `app.css`
	   (`color: base-content`, Tint 18 %) — DaisyUIs eigenes `.badge-soft` setzt
	   `color: var(--badge-color)` und läge damit bei denselben Werten wie
	   `btn-soft` (secondary 2,50, accent 1,50).

	   Eine Ausnahme, die an einem Override hängt, braucht ihren Anker dort, wo
	   der Override wirkt. Sonst passiert genau das, was diese Datei an mehreren
	   Stellen beschreibt: Der Klassen-Scan bliebe grün und behauptete eine
	   Zulässigkeit, deren Grundlage entfallen ist. Gemessen 12,55 bis 15,31:1
	   (2026-08-14). */
	for (const token of ['secondary', 'accent', 'warning', 'info', 'success']) {
		test(`badge-soft badge-${token}: Text ≥ ${AA_TEXT}:1`, async ({ page }) => {
			const [measured, ohneFarbe] = await measureContrast(page, [
				{
					name: `badge-soft badge-${token}`,
					className: `badge badge-soft badge-${token}`,
					backdrop: 'var(--color-base-100)'
				},
				{
					name: 'badge-soft ohne Farbklasse',
					className: 'badge badge-soft',
					backdrop: 'var(--color-base-100)'
				}
			]);

			/* Eigenprobe VOR der Schwelle: Hat die Farbklasse überhaupt gewirkt?
			   DaisyUI erzeugt `.badge-<farbe>` nur, wenn der Name vollständig im
			   Quelltext steht (daisyui.md). Verschwindet die letzte Fundstelle —
			   `badge-accent` hat derzeit zwei —, bleibt `--badge-color` ungesetzt,
			   und der Override greift auf seinen eigenen Fallback
			   `var(--badge-color, var(--color-base-content))` zurück. Gemessen
			   würde dann ein neutraler Tint mit rund 13:1: Der Test bliebe grün,
			   ohne die Farbe je angefasst zu haben. Deshalb wird zuerst verlangt,
			   dass sich die Fläche von der farblosen Probe unterscheidet. */
			expect(
				measured.background,
				`badge-soft badge-${token} misst dieselbe Fläche wie ein badge-soft ohne Farbklasse ` +
					`(${measured.background}). Die Klasse .badge-${token} steht damit nicht im generierten CSS — ` +
					'DaisyUI erzeugt sie nur, wenn der Name vollständig im Quelltext vorkommt. Der Test misst sonst nichts.'
			).not.toBe(ohneFarbe.background);

			expect(
				measured.ratio,
				`${measured.name}: ${formatRatio(measured.ratio)}:1 (${measured.foreground} auf ${measured.background}). ` +
					'Trägt der Badge-Soft-Override in app.css noch color: var(--color-base-content)? ' +
					'Ohne ihn ist badge-soft dieselbe Fehlerklasse wie btn-soft und gehört in FOREGROUND_MODIFIERS.'
			).toBeGreaterThanOrEqual(AA_TEXT);
		});
	}

	test('Deckkraft-Stufen: /60 ist die Untergrenze', async ({ page }) => {
		const measured = await measureContrast(
			page,
			['base-100', 'base-200'].map((surface) => ({
				name: `base-content/60 auf ${surface}`,
				selector: `[data-token-fg="fg-subtle-on-${surface}"]`,
				backdrop: `var(--color-${surface})`
			}))
		);
		for (const probe of measured) {
			expect(probe.ratio, `${probe.name}: ${formatRatio(probe.ratio)}:1`).toBeGreaterThanOrEqual(
				AA_TEXT
			);
		}
	});

	test('Icons in Statusfarbe erreichen 3:1', async ({ page }) => {
		const measured = await measureContrast(
			page,
			['info-strong', 'success-strong', 'warning-strong', 'error'].map((token) => ({
				name: `Icon in ${token}`,
				selector: `[data-token-icon="${token}"]`,
				backdrop: 'var(--color-base-100)'
			}))
		);
		for (const probe of measured) {
			expect(probe.ratio, `${probe.name}: ${formatRatio(probe.ratio)}:1`).toBeGreaterThanOrEqual(
				AA_GRAPHIC
			);
		}
	});
});

/**
 * Kontrast an den Aufrufstellen, an denen axe aufgibt.
 *
 * **Warum diese Gruppe nicht gegen /styleguide läuft.** Die Gruppe oben misst
 * Token-Kombinationen; dort steht jede genau einmal, losgelöst von ihrem Ort.
 * Hier geht es um das Gegenteil: um Stellen, deren Kontrast **vom Ort abhängt**,
 * weil hinter dem Text etwas liegt, das die App nicht kennt — OSM-Kacheln.
 * Ein Messpunkt auf /styleguide könnte darüber nichts aussagen.
 *
 * **Wer diese Stellen benennt.** `axe-scan.spec.ts` legt sie unter `incomplete`
 * ab und deckelt ihre Zahl; die Begründung dort sagt ausdrücklich, dass der
 * Deckel eine Farbänderung *innerhalb* einer gelisteten Gruppe nicht bemerkt.
 * Diese Gruppe ist die andere Hälfte der dort benannten Arbeitsteilung: axe
 * zählt die unentscheidbaren Stellen, hier werden sie entschieden.
 *
 * **Zweistufig gemessen, und das ist der Kern.** `measureContrast` komponiert
 * die *eigene* Fläche eines Elements über den `backdrop`. Der Text sitzt hier
 * aber nicht auf seiner eigenen Fläche, sondern auf einer Platte darüber
 * (`h1`, Umschalter-Button, `.ol-attribution`) — der Text selbst ist
 * durchsichtig. Gemessen wird deshalb erst die **Platte** über der Kachel, und
 * ihr Ergebnis wird zum `backdrop` des Textes. Das ist nicht nur genauer,
 * sondern der eigentliche Wächter: Wird die Platte wieder durchscheinend,
 * dunkelt sie über der Kachel ein und der Text fällt durch — genau die
 * Regression, um die es geht.
 *
 * **Warum Schwarz als Kachel.** Die Vorgabe ist die dunkelste Stelle des
 * Bildes, nicht der Mittelwert. Im Startausschnitt ist die dunkelste Kachel
 * Ostseewasser (`rgb(170, 211, 223)`) und alles sähe grün aus; die Karte lässt
 * sich aber auf Land mit schwarzer Beschriftung schieben. Gemessen am
 * 2026-08-14 stand `text-base-content` auf der Glass-Platte des Titel-Badges
 * über einer Wasserkachel bei 12,25:1 und über einer schwarzen bei **1,07:1**.
 * Ein Wert aus dem Startausschnitt hätte diesen Befund verdeckt.
 */
const KACHEL_SCHLIMMSTENFALLS = 'rgb(0, 0, 0)';

test.describe('Design-Tokens — Kontrast über fremdem Bildmaterial', () => {
	/**
	 * Text auf einer Platte über der schlimmstenfalls schwarzen Kachel.
	 * Rückgabe ist der Textwert; die Platte steht in der Fehlermeldung, weil sie
	 * bei einem Fehlschlag die Ursache ist und nicht der Text.
	 */
	async function aufPlatte(
		page: Page,
		name: string,
		platteSelector: string,
		textSelector: string
	): Promise<{ ratio: number; meldung: string }> {
		const [platte] = await measureContrast(page, [
			{ name: `${name} — Platte`, selector: platteSelector, backdrop: KACHEL_SCHLIMMSTENFALLS }
		]);
		const [text] = await measureContrast(page, [
			{ name, selector: textSelector, backdrop: platte.background }
		]);
		return {
			ratio: text.ratio,
			meldung:
				`${name}: ${formatRatio(text.ratio)}:1 (${text.foreground} auf ${text.background}). ` +
				`Die Platte „${platteSelector}" misst über einer schwarzen Kachel ${platte.background}. ` +
				'Ist sie wieder durchscheinend (glass, /-Suffix), ist sie die Ursache — dann dort beheben, ' +
				'nicht die Schwelle senken.'
		};
	}

	test.beforeEach(async ({ page }) => {
		await setupMapPage(page);
	});

	/* Bis 2026-08-14 trugen Titel-Badge und die beiden Umschalter `glass`:
	   durchsichtiger Grund plus Weiß-Verlauf, dazu `text-base-content`. Über
	   heller See sah das gut aus (12,25:1), über dunklem Land waren es 1,07:1.
	   Ersetzt durch deckendes `bg-base-100` — ein Flächenbedarf, kein Schleier;
	   die Begründung steht im Markup dort. Gemessen seither 16,50:1, und zwar
	   unabhängig von der Kachel: Genau das ist die Aussage dieser Gruppe. */
	for (const fall of [
		{ name: 'Titel-Badge der Karte', platte: 'h1', text: 'h1 > span' },
		{
			name: 'FILTER-Umschalter',
			platte: 'button[aria-controls="filter-panel"]',
			text: 'button[aria-controls="filter-panel"] > div'
		},
		{
			name: 'LEGENDE-Umschalter',
			platte: 'button[aria-controls="legend-panel"]',
			text: 'button[aria-controls="legend-panel"] > div'
		}
	]) {
		test(`${fall.name}: Text über der dunkelsten Kachel ≥ ${AA_TEXT}:1`, async ({ page }) => {
			const { ratio, meldung } = await aufPlatte(page, fall.name, fall.platte, fall.text);
			expect(ratio, meldung).toBeGreaterThanOrEqual(AA_TEXT);
		});
	}

	/* Das Panel selbst trug den Fehler bis 2026-08-15 weiter — derselbe `glass`
	   wie zuvor Badge und Umschalter, nur eine Ebene tiefer und deshalb vom
	   axe-Scan nie gesehen: Ein geschlossenes Panel ist `inert`, axe überspringt
	   es, und geöffnet wird es dort nicht. Die Fläche ist `position: fixed` über
	   dem Karten-Canvas; über einer schwarzen Kachel misst `text-base-content`
	   darauf 1,07:1.

	   Gemessen wird das Panel im geöffneten Zustand — geschlossen steht es zwar
	   im DOM, aber `inert` und aus dem Sichtfeld geschoben; die Kachel darunter
	   wäre dann keine Aussage über das, was der Nutzer sieht. */
	test(`Filter-Panel: Überschrift über der dunkelsten Kachel ≥ ${AA_TEXT}:1`, async ({ page }) => {
		const mapPage = new MapPage(page);
		await mapPage.openFilter();
		await expect(mapPage.getFilterPanel()).toBeVisible();

		const { ratio, meldung } = await aufPlatte(
			page,
			'Filter-Panel',
			'#filter-panel',
			'#filter-title'
		);
		expect(ratio, meldung).toBeGreaterThanOrEqual(AA_TEXT);
	});

	/* Die Attribution ist fremdes Markup, aber ihre Platte und ihre Textfarben
	   sind es nicht: `.ol-attribution` bekommt Fläche und Farben in
	   `src/lib/map/mapStyles.css`. Der Link stand dort bis 2026-08-14 auf
	   OpenLayers' eigenem #666 und erreichte über der Startkachel 3,72:1, über
	   einer schwarzen 2,60:1 — der einzige echte Verstoß, den diese Untersuchung
	   zutage gefördert hat. Seither Fließtext 16,50:1 (base-content) und Link
	   9,24:1 (primary). */
	for (const fall of [
		{ name: 'Attribution — Fließtext', text: '.ol-attribution ul li' },
		{ name: 'Attribution — Link', text: '.ol-attribution ul li a' }
	]) {
		test(`${fall.name} über der dunkelsten Kachel ≥ ${AA_TEXT}:1`, async ({ page }) => {
			const { ratio, meldung } = await aufPlatte(page, fall.name, '.ol-attribution', fall.text);
			expect(ratio, meldung).toBeGreaterThanOrEqual(AA_TEXT);
		});
	}
});

/**
 * Die Gegenprobe: Stellen, die axe ebenfalls nicht entscheiden konnte, hinter
 * denen aber gar kein fremdes Bildmaterial liegt.
 *
 * axe meldet sie mit `messageKey: "bgImage"` — und das klingt nach einem Foto,
 * ist aber DaisyUIs `--depth`-Rausch-SVG, das an **jedem** `.btn` und `.badge`
 * als zweite Hintergrund-Ebene hängt. Die Fläche darunter ist eine deckende
 * Theme-Farbe. Die Einträge in `axe-scan.spec.ts` behaupteten bis zum
 * 2026-08-14 das Gegenteil („liegen über den Artfotos"); nachgesehen ist das
 * Artfoto ein **Geschwister** im Flex-Kopf, kein Untergrund, und einer der zehn
 * Knoten auf /bestimmungshilfe ist überhaupt kein Badge, sondern der
 * Rückweg-Knopf am Seitenende.
 *
 * Deshalb steht hier ein `backdrop` von Schwarz: Wäre die Fläche doch
 * durchscheinend, käme sie an der Schwelle heraus. So ist der Messwert zugleich
 * der Beleg, dass sie es nicht ist.
 */
test.describe('Design-Tokens — Kontrast auf deckenden Flächen unter axes bgImage', () => {
	test('Artbadges und Rückweg-Knopf auf /bestimmungshilfe', async ({ page }) => {
		await page.goto('/bestimmungshilfe');
		const gemessen = await measureContrast(page, [
			/* Gemessen 2026-08-14: 4,56 / 7,20 / 6,05 / 4,65 / 11,00. success und
			   info liegen konstruktionsbedingt knapp über der Schwelle — die harte
			   Grenze dazu steht in design-system.md („--color-info und
			   --color-success dürfen nie heller werden"). */
			{
				name: 'badge-success',
				selector: '.badge.badge-success',
				backdrop: KACHEL_SCHLIMMSTENFALLS
			},
			{ name: 'badge-error', selector: '.badge.badge-error', backdrop: KACHEL_SCHLIMMSTENFALLS },
			{
				name: 'badge-warning',
				selector: '.badge.badge-warning',
				backdrop: KACHEL_SCHLIMMSTENFALLS
			},
			{ name: 'badge-info', selector: '.badge.badge-info', backdrop: KACHEL_SCHLIMMSTENFALLS },
			{
				name: 'Rückweg-Knopf (btn-primary btn-lg)',
				selector: 'a.btn.btn-primary',
				backdrop: KACHEL_SCHLIMMSTENFALLS
			}
		]);
		for (const probe of gemessen) {
			expect(
				probe.ratio,
				`${probe.name}: ${formatRatio(probe.ratio)}:1 (${probe.foreground} auf ${probe.background}). ` +
					'Gemessen wird über Schwarz — kommt hier ein niedriger Wert heraus, ist die Fläche ' +
					'durchscheinend geworden und die Annahme „deckende Theme-Farbe" gilt nicht mehr.'
			).toBeGreaterThanOrEqual(AA_TEXT);
		}
	});

	test('Umschalter Karte/Liste auf /map', async ({ page }) => {
		await setupMapPage(page);
		/* Gemessen 2026-08-14: 11,00 (gedrückt, btn-primary) / 13,65 (nicht
		   gedrückt). Beide liegen mitten auf der Karte, ihre Fläche ist aber
		   deckend — die Kachel steht nicht hinter dem Text. */
		const gemessen = await measureContrast(page, [
			{
				name: 'Umschalter „Karte" (gedrückt)',
				selector: 'button[aria-pressed="true"].join-item',
				backdrop: KACHEL_SCHLIMMSTENFALLS
			},
			{
				name: 'Umschalter „Liste" (nicht gedrückt)',
				selector: 'button[aria-pressed="false"].join-item',
				backdrop: KACHEL_SCHLIMMSTENFALLS
			}
		]);
		for (const probe of gemessen) {
			expect(
				probe.ratio,
				`${probe.name}: ${formatRatio(probe.ratio)}:1 (${probe.foreground} auf ${probe.background})`
			).toBeGreaterThanOrEqual(AA_TEXT);
		}
	});
});

/**
 * Die Seite selbst — sie ist Entwickler-Werkzeug, aber ein bedienbares.
 *
 * Zwei Dinge sind hier keine Kosmetik:
 *
 * 1. Der Dichte-Umschalter schreibt auf `<html>`, also außerhalb der eigenen
 *    Komponente. Bleibt `data-density="field"` beim Verlassen der Route
 *    stehen, läuft die ganze App im Feldmodus weiter — mit 56-px-Zielen und
 *    14-px-Hilfetext, und ohne ein Bedienelement, das ihn zurücknimmt.
 * 2. Ein Umschalter ohne `aria-pressed` sagt Screenreader-Nutzenden nicht,
 *    welcher Modus aktiv ist; die Farbdifferenz `btn-primary`/`btn-outline`
 *    ist die einzige andere Anzeige.
 *
 * Gemessen wird im Browser aus demselben Grund wie oben in `form-a11y.spec.ts`:
 * `:focus-visible` und die aufgelösten Theme-Farben gibt es nur dort.
 */
test.describe('Styleguide — Bedienung', () => {
	/* Anders als die Kontrastgruppe oben klickt diese hier — und ein Klick vor
	   der Hydration tut nichts, weil `onclick` dann noch nicht am Element
	   hängt. `networkidle` plus ein hydrationsabhängiges Element ist dasselbe
	   Muster wie in `FormPage.goto()`; hier dient `data-density` als Signal:
	   das Attribut entsteht erst durch den `$effect` der Seite.

	   Damit trägt `data-density` hier zwei Bedeutungen gleichzeitig: den
	   Dichte-Zustand und — über seine bloße Anwesenheit — das Hydrations-Signal.
	   Solange `tokens.css` nur `[data-density='field']` kennt, ist das
	   folgenlos, weil „comfortable" ein reiner Marker ohne Wirkung ist. Sobald
	   jemand `[data-density='comfortable']` stylt oder das Attribut in
	   `app.html` vorbelegt, koppelt dieser `beforeEach` an etwas, das er nie
	   prüfen wollte: er wartet dann auf einen Zustand, den schon das SSR-HTML
	   mitbringt, und klickt wieder gegen einen toten Button. In dem Fall
	   braucht die Hydration ein eigenes Signal — nicht dieses Attribut. */
	test.beforeEach(async ({ page }) => {
		await page.goto('/styleguide');
		await page.waitForLoadState('networkidle');
		await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(true);
		await expect
			.poll(() => page.evaluate(() => document.documentElement.dataset.density ?? null))
			.toBe('comfortable');
	});

	const densityAttribute = (page: Page) =>
		page.evaluate(() => document.documentElement.dataset.density ?? null);

	test('Dichte-Umschalter meldet seinen Zustand über aria-pressed', async ({ page }) => {
		const comfortable = page.getByRole('button', { name: /Normal/ });
		const field = page.getByRole('button', { name: /Feldmodus/ });

		await expect(comfortable).toHaveAttribute('aria-pressed', 'true');
		await expect(field).toHaveAttribute('aria-pressed', 'false');

		await field.click();

		await expect(comfortable).toHaveAttribute('aria-pressed', 'false');
		await expect(field).toHaveAttribute('aria-pressed', 'true');
	});

	test('Feldmodus schaltet data-density und nimmt es zurück', async ({ page }) => {
		await page.getByRole('button', { name: /Feldmodus/ }).click();
		await expect.poll(() => densityAttribute(page)).toBe('field');

		await page.getByRole('button', { name: /Normal/ }).click();
		await expect.poll(() => densityAttribute(page)).toBe('comfortable');
	});

	/* Der eigentliche Fallstrick: nicht der Umschalter, sondern das Verlassen
	   der Route. Deshalb per Klick auf die Navigation — ein `page.goto()` würde
	   das Dokument neu laden und den Feldmodus auch dann verlieren, wenn die
	   Aufräumfunktion fehlt. */
	test('Feldmodus überlebt die Route nicht', async ({ page }) => {
		await page.getByRole('button', { name: /Feldmodus/ }).click();
		await expect.poll(() => densityAttribute(page)).toBe('field');

		/* Auf den Header eingegrenzt: Seit der Footer-Neuordnung (2026-08-03)
		   führt auch die Gruppe „Navigation" im Footer einen Link „Meldung",
		   ein ungebundener Rollen-Selektor ist damit mehrdeutig. Gemeint ist
		   hier die TopBar — ein Klick im Footer würde erst dorthin scrollen. */
		await page.locator('header').getByRole('link', { name: 'Meldung' }).click();
		await expect(page).toHaveURL(/\/$/);

		await expect
			.poll(() => densityAttribute(page), {
				message: 'data-density bleibt nach dem Verlassen von /styleguide auf <html> stehen'
			})
			.toBeNull();
	});

	test('Tastatur-Fokus ist auf dem Umschalter sichtbar', async ({ page }) => {
		const field = page.getByRole('button', { name: /Feldmodus/ });
		// Fokus über die Tastatur setzen, damit :focus-visible greift.
		await field.focus();
		await page.keyboard.press('Shift+Tab');
		await page.keyboard.press('Tab');
		await expect(field).toBeFocused();

		await expect
			.poll(async () =>
				field.evaluate((el) => {
					const probe = document.createElement('span');
					probe.style.cssText =
						'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;color:var(--color-primary)';
					document.body.appendChild(probe);
					const primary = getComputedStyle(probe).color;
					probe.remove();

					const style = getComputedStyle(el);
					return {
						focusVisible: el.matches(':focus-visible'),
						style: style.outlineStyle,
						width: style.outlineWidth,
						colorIsPrimary: style.outlineColor === primary
					};
				})
			)
			.toEqual({ focusVisible: true, style: 'solid', width: '2px', colorIsPrimary: true });
	});

	/* Das Muster aus PR 1, an der Stelle geprüft, an der die Seite es zeigt:
	   die 44px trägt das Label, das Control bleibt auf --control-size (28px).
	   Im Feldmodus wächst nur das Label. */
	for (const control of ['checkbox', 'toggle', 'radio']) {
		test(`${control}: das Ziel ist das Label, nicht das Control`, async ({ page }) => {
			const label = page.locator(`[data-token-target="${control}"]`);
			const input = label.locator('input');

			expect((await label.boundingBox())?.height).toBeGreaterThanOrEqual(44);
			expect((await input.boundingBox())?.height).toBeCloseTo(28, 0);

			await page.getByRole('button', { name: /Feldmodus/ }).click();
			await expect.poll(async () => (await label.boundingBox())?.height).toBeGreaterThanOrEqual(56);
			expect((await input.boundingBox())?.height).toBeCloseTo(28, 0);
		});
	}
});

/* Seit PR 4 aktiver Guard — vorher `describe.fixme`, weil der Bestand die
   Befunde F2, F3 und F11 des Reviews an über 60 Stellen enthielt.

   Die Gruppe scannt den ausgelieferten DOM und meldet jede Aufrufstelle, die
   eine Flächen-Statusfarbe als Vordergrund verwendet, Text unter Deckkraft /60
   setzt oder eine Tailwind-Paletten-Farbe am Theme vorbei nutzt.

   Die drei Regeln stehen seit dem 2026-07-30 in `helpers/bannedClasses.ts` und
   nicht mehr als Regex-Literale in den `page.evaluate()`-Callbacks hier. Der
   Grund steht dort ausführlich; kurz: Sie waren so nur mit laufendem Browser
   prüfbar, und ein Scan über einen konformen Bestand belegt nichts über die
   Regel — genau daran ist die Deckkraft-Lücke (`text-success/80`) unentdeckt
   geblieben. `helpers/bannedClasses.test.ts` stellt sie jetzt an konstruierten
   Beispielen scharf.

   Die Regeln NICHT aufweichen, um die Gruppe grün zu halten: sie wären genau
   dann wertlos, wenn sie nur noch finden, was ohnehin konform ist. Eine neue
   Fundstelle gehört an der Aufrufstelle behoben — `text-*-strong` statt
   `text-*`, `/70` statt `/50`, Theme-Token statt Tailwind-Palette. Und bei
   dekorativen Icons und Zierelementen ist `base-content/70` die richtige
   Antwort, nicht ein mechanisches `-strong`: eine Statusfarbe, die keine
   Bedeutung trägt, gehört gar nicht dorthin. */
test.describe('Design-Tokens — verbotene Kombinationen im DOM', () => {
	/** Belegt, dass die Seite wirklich Inhalt gerendert hat. */
	interface ContentProbe {
		/** Erscheint in der Fehlermeldung. */
		readonly what: string;
		readonly selector: string;
		readonly min: number;
	}

	interface ScanRoute {
		readonly path: string;
		readonly auth: boolean;
		readonly needsDb: boolean;
		readonly renders?: readonly ContentProbe[];
	}

	/* Die Fixtures, die beide Helfer unten brauchen. Als eigener Typ, weil die
	   Form sonst zweimal ausgeschrieben dasteht und beim Ergänzen einer Fixture
	   auseinanderlaufen kann. */
	type ScanFixtures = {
		page: Page;
		context: BrowserContext;
		request: APIRequestContext;
		baseURL: string | undefined;
	};

	/* Ruhezustand-Scan. Hover-Zustände tauchen in getComputedStyle nicht auf
	   und sind hier deshalb nicht prüfbar — dafür gilt die Regel in
	   design-system.md („text-error nicht auf base-300").

	   Der Admin-Bereich ist seit 2026-07-29 dabei. Er war vorher ungedeckt,
	   nicht schmutzig: Eine Prüfung von Hand über alle sechs Routen fand null
	   Verstöße — aber eben von Hand. Der Zugang läuft über `seedAdminSession`
	   (dort steht, warum nicht über die Auth0-Oberfläche). */
	const ROUTES: readonly ScanRoute[] = [
		{ path: '/', auth: false, needsDb: false },
		{ path: '/map', auth: false, needsDb: false },
		{ path: '/about', auth: false, needsDb: false },
		{ path: '/bestimmungshilfe', auth: false, needsDb: false },
		/* Die `renders`-Sonden sind für die beiden datengetriebenen Seiten keine
		   Zugabe, sondern der Kern ihrer Aussagekraft: Eine leere Tabelle liefert
		   ein DOM ohne eine einzige verbotene Kombination und wäre damit
		   vakuum-grün — genau wie es der Auth0-Redirect und die 403-Seite gewesen
		   wären, gegen die die Wächter unten stehen. Status < 500 ist dafür kein
		   Beleg. */
		{
			path: '/admin/sichtungen',
			auth: true,
			needsDb: true,
			renders: [
				/* Beide Layouts stehen gleichzeitig im DOM (`md:hidden` /
				   `hidden md:block` sind reines CSS); die Tabelle ist die mit den
				   Zebra-Streifen und den Statusbadges. Mehrere Zeilen, weil eine
				   einzelne Zeile kein Zebra ergibt. */
				{ what: 'Tabellenzeilen', selector: 'table.table-zebra tbody tr', min: 10 },
				/* Paginierung erscheint immer, aber mit einer Seite ist jede
				   Navigations-Schaltfläche deaktiviert. Erst ein bedienbares
				   „Nächste Seite" belegt, dass der Bestand über eine Seite
				   hinausgeht und die Muster im Ruhezustand messbar sind. */
				{
					what: 'Paginierung über mehr als eine Seite',
					selector: '.join button[title="Nächste Seite"]:not([disabled])',
					min: 1
				}
			]
		},
		{
			path: '/admin/statistics',
			auth: true,
			needsDb: true,
			renders: [
				/* `stat-value` trägt die Statusfarben-Muster dieser Seite
				   (text-secondary-strong, text-warning-strong, text-accent-strong,
				   text-info-strong) — ohne Zahlen dahinter ist der Scan blind. */
				{ what: 'Kennzahlen', selector: '.stat-value', min: 5 },
				/* Über die Kopfzeile selektiert und nicht über eine Klasse: die
				   Seite hat mehrere Tabellen, und `table` vs. `table-zebra` ist
				   Gestaltung, die sich ändern darf. Zwei Zeilen sind das Minimum,
				   damit die Entwicklungs-Spalte überhaupt rechnet — bei einem
				   einzigen Jahr bleibt sie leer. */
				{
					what: 'Jahreszeilen im Trend (mehrjährige Daten)',
					selector: 'table:has(thead th:text-is("Jahr")) tbody tr',
					min: 2
				},
				{
					what: 'Zeilen in der Artenverteilung',
					selector: 'table:has(thead th:text-is("Art")) tbody tr',
					min: 2
				}
			]
		},
		/* /admin/docs hat nur ein +page.ts und keinen Server-Load — die einzige
		   Admin-Route, die ohne Datenbank vollständig rendert. */
		{ path: '/admin/docs', auth: true, needsDb: false },
		/* +page.server.ts ruft ConfigRepository.getAll(). War zunächst als
		   needsDb: false markiert und wurde dadurch in drei von sechs Läufen
		   ohne Datenbank flaky — die Markierung ist keine Formalie, sondern
		   entscheidet, ob die Route sauber übersprungen wird oder in den
		   Navigations-Timeout läuft. */
		{ path: '/admin/settings', auth: true, needsDb: true }
	];

	/* Einmal pro Worker beantwortet, nicht pro Test: Steht eine Datenbank?
	   /api/map/sightings ist dafür der richtige Fühler — öffentlich (kein
	   requireUserRole) und geht direkt an `db`.

	   Der erste Anlauf hat das stattdessen am Status der Seite selbst
	   entschieden, und das war ein Rennen: Ohne Postgres liefert /admin nicht
	   zuverlässig 5xx, sondern hängt oft, bis Playwrights navigationTimeout
	   zuschlägt. Im CI-Lauf von #632 wurden daraus zwei `flaky` — beim ersten
	   Versuch Timeout, beim Retry der schnelle 500 und damit der Skip. Grün war
	   das nur, weil `retries: 1` Flaky nicht rot macht. Eine gebundene Sonde
	   vorab entscheidet dagegen für alle betroffenen Routen gleich, und der
	   Test navigiert gar nicht erst. */
	let databaseProbe: Promise<boolean> | undefined;
	const databaseAvailable = (request: APIRequestContext) => {
		databaseProbe ??= request
			.get('/api/map/sightings', { timeout: 10_000 })
			.then((response) => response.ok())
			.catch(() => false);
		return databaseProbe;
	};

	/* Öffnet die Route und stellt sicher, dass wirklich die Seite gemessen wird
	   und nicht eine Fehler- oder Login-Ausweichseite. Ohne diese Wächter wäre
	   der Scan auf den Admin-Routen wertlos: Sowohl der Auth0-Redirect als auch
	   die SvelteKit-Fehlerseite liefern ein DOM, in dem keine einzige verbotene
	   Kombination steht — die Prüfung meldete dann grün, ohne je die Seite
	   gesehen zu haben, um die es geht. */
	const openRoute = async ({ page, context, request, baseURL }: ScanFixtures, route: ScanRoute) => {
		/* Seit dem 2026-07-30 fährt der E2E-Job einen Postgres-Service samt
		   Migrationen und Seed (ci.yml, Job `e2e`). Dieser Zweig ist damit **nur
		   noch** der lokale Komfortpfad für einen Lauf ohne `npm run db:start`.

		   In CI ist er ausdrücklich ein Fehler und kein Skip: Ein übersprungener
		   Test in CI ist kein Test, und übersprungen wären ausgerechnet die zwei
		   datenreichsten Seiten — Datentabelle, Statusbadges, `stat-value`,
		   Paginierung. Dass die vier übrigen Routen sauber sind, sagt darüber
		   nichts. */
		if (route.needsDb && !(await databaseAvailable(request))) {
			if (process.env.CI) {
				throw new Error(
					`${route.path} braucht eine Datenbank, und /api/map/sightings antwortet nicht. ` +
						'In CI ist das ein Fehler: Der `e2e`-Job startet einen Postgres-Service, wendet die ' +
						'Migrationen an und legt Testdaten an (ci.yml). Schlägt die Sonde hier fehl, ist einer ' +
						'dieser Schritte kaputt — nicht die Route.'
				);
			}
			test.skip(
				true,
				`${route.path} braucht eine Datenbank, und /api/map/sightings antwortet nicht. Lokal: npm run db:start && npm run db:push. In CI wäre das ein harter Fehler.`
			);
		}

		if (route.auth) {
			if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');
			await seedAdminSession(context, baseURL);
		}

		const response = await page.goto(route.path);
		const status = response?.status() ?? 0;

		/* Backstop für den Fall, dass eine Route ohne needsDb-Markierung doch
		   serverseitig scheitert — dann ist die Markierung falsch, und das soll
		   auffallen statt zu einem Scan über die Fehlerseite zu führen. */
		if (status >= 500) {
			throw new Error(
				`${route.path} antwortet mit ${status}, obwohl die Datenbank erreichbar ist (oder die Route als needsDb: false markiert ist). Kein Skip — hier stimmt etwas anderes nicht.`
			);
		}

		if (!route.auth) return;

		if (!page.url().startsWith(baseURL ?? '')) {
			throw new Error(
				`${route.path} hat auf ${page.url()} umgeleitet — das Session-Cookie wurde nicht akzeptiert. ` +
					'Prüfe DATABASE_POSTGRES_URL und COOKIE_NAME in .env und ob die sessions-Tabelle ' +
					'migriert ist (siehe e2e/helpers/adminSession.ts).'
			);
		}

		/* 401/403 bleiben auf derselben URL und liefern Status < 500 — ohne diese
		   Prüfung würde der Scan die SvelteKit-Fehlerseite messen, dort nichts
		   finden und grün melden. Das ist kein Infrastrukturproblem wie die
		   fehlende Datenbank, sondern ein kaputtes Fixture: Cookie akzeptiert,
		   aber `roles` reicht nicht für requireUserRole. Deshalb hart. */
		if (status === 401 || status === 403) {
			throw new Error(
				`${route.path} antwortet mit ${status} — die Session gilt, aber die Rolle reicht nicht. ` +
					'Die roles-Spalte der Session-Zeile aus e2e/helpers/adminSession.ts muss die von requireUserRole geforderte Rolle enthalten.'
			);
		}
	};

	/* Trennt Ernten von Bewerten: Der Browser gibt nur Klassenlisten heraus,
	   gefiltert wird in Node mit den Regeln aus `helpers/bannedClasses.ts` — also
	   mit demselben Code, den `bannedClasses.test.ts` an konstruierten Beispielen
	   prüft. Vorher stand je Regel ein Regex-Literal in einem eigenen
	   `page.evaluate()`; drei Kopien einer Grenzbedingung sind drei Orte, an denen
	   sie schiefgehen kann. */
	const harvestClasses = (page: Page): Promise<ScannedElement[]> =>
		page.evaluate(() =>
			[...document.querySelectorAll('[class]')].map((el) => ({
				tag: el.tagName.toLowerCase(),
				/* getAttribute('class'), NICHT el.className: bei SVG-Elementen ist
				   className ein SVGAnimatedString, das als "[object SVGAnimatedString]"
				   stringifiziert — der Scan würde ausgerechnet die Icons verfehlen, für
				   die die Statusfarben-Regel gedacht ist (Icon.svelte rendert
				   <svg class="…">). */
				classes: el.getAttribute('class') ?? '',
				hasText: (el.textContent ?? '').trim().length > 0
			}))
		);

	const scanRoute = async (fixtures: ScanFixtures, route: ScanRoute): Promise<ScannedElement[]> => {
		await openRoute(fixtures, route);

		for (const probe of route.renders ?? []) {
			expect(
				await fixtures.page.locator(probe.selector).count(),
				`${route.path} rendert keine ${probe.what} (mindestens ${probe.min} erwartet, Selektor: ${probe.selector}). ` +
					'Der Scan hätte damit ein DOM ohne verbotene Kombination gemessen und wäre grün geworden, ohne die Seite gesehen zu haben. ' +
					'Prüfe den Seed (npm run db:seed:e2e) und den Server-Load der Route.'
			).toBeGreaterThanOrEqual(probe.min);
		}

		return harvestClasses(fixtures.page);
	};

	for (const route of ROUTES) {
		test(`${route.path}: keine Statusfarbe als Textfarbe`, async ({
			page,
			context,
			request,
			baseURL
		}) => {
			const elements = await scanRoute({ page, context, request, baseURL }, route);
			expect(findOffenders(STATUS_AS_FOREGROUND, elements), STATUS_AS_FOREGROUND.hint).toEqual([]);
		});

		/* Die Kombination, die der Test darüber strukturell nicht sehen kann:
		   `badge-outline` und `badge-secondary` sind einzeln zulässig, zusammen
		   drehen sie die Statusfarbe auf den Vordergrund (2,68:1). Gefunden hat
		   den Fall der axe-Scan (`e2e/axe-scan.spec.ts`) auf /about, nicht diese
		   Gruppe — Begründung an `OUTLINE_STATUS_COLOR` in `bannedClasses.ts`. */
		test(`${route.path}: keine Statusfarbe an einem Umriss-Bauteil`, async ({
			page,
			context,
			request,
			baseURL
		}) => {
			const elements = await scanRoute({ page, context, request, baseURL }, route);
			expect(findOffenders(OUTLINE_STATUS_COLOR, elements), OUTLINE_STATUS_COLOR.hint).toEqual([]);
		});

		test(`${route.path}: keine Textfarbe unter Deckkraft /60`, async ({
			page,
			context,
			request,
			baseURL
		}) => {
			const elements = await scanRoute({ page, context, request, baseURL }, route);
			expect(findOffenders(BELOW_OPACITY_FLOOR, elements), BELOW_OPACITY_FLOOR.hint).toEqual([]);
		});

		test(`${route.path}: keine Tailwind-Paletten-Farben`, async ({
			page,
			context,
			request,
			baseURL
		}) => {
			const elements = await scanRoute({ page, context, request, baseURL }, route);
			expect(findOffenders(TAILWIND_PALETTE, elements), TAILWIND_PALETTE.hint).toEqual([]);
		});

		/* ---------------------------------------------------------------- *
		 * Nicht-Farb-Tokens: Elevation, Z-Index, Motion.
		 *
		 * Die drei Regeln darüber decken ausschließlich Farbe ab.
		 * `design-system.md` schreibt Elevation, Z-Index und Bewegungsdauer
		 * genauso verbindlich aus Tokens vor — dafür gab es bis 2026-08-09
		 * keinen Wächter, und der Scan lief grün. Das ist die Sorte Lücke, die
		 * `bannedClasses.ts` an drei Stellen als Fehlerklasse beschreibt: Sie
		 * erzeugt Deckung, die es nicht gibt.
		 *
		 * Scharf gestellt wurden die Regeln in #811, aktiv sind sie seit dem
		 * Aufräum-Schritt, der den Bestand (118 rohe Schatten-Utilities in 26
		 * Dateien, 28 freie Z-Index- und 19 freie Dauer-Angaben) auf Tokens
		 * umgestellt hat. Dieselbe Reihenfolge wie bei der Farb-Gruppe, die bis
		 * PR #620 `fixme` war.
		 * ---------------------------------------------------------------- */
		test(`${route.path}: keine rohen Schatten-Utilities`, async ({
			page,
			context,
			request,
			baseURL
		}) => {
			const elements = await scanRoute({ page, context, request, baseURL }, route);
			expect(findOffenders(RAW_ELEVATION, elements), RAW_ELEVATION.hint).toEqual([]);
		});

		test(`${route.path}: keine freien Z-Index-Utilities`, async ({
			page,
			context,
			request,
			baseURL
		}) => {
			const elements = await scanRoute({ page, context, request, baseURL }, route);
			expect(findOffenders(RAW_Z_INDEX, elements), RAW_Z_INDEX.hint).toEqual([]);
		});

		test(`${route.path}: keine freien Übergangsdauern`, async ({
			page,
			context,
			request,
			baseURL
		}) => {
			const elements = await scanRoute({ page, context, request, baseURL }, route);
			expect(findOffenders(RAW_MOTION_DURATION, elements), RAW_MOTION_DURATION.hint).toEqual([]);
		});

		/* Überschrift trägt eine Größen-Utility und rendert trotzdem anders.

		   **Warum das ein eigener Test ist und nicht Teil des Klassen-Scans oben.**
		   Die drei Regeln darüber lesen Klassennamen und entscheiden daraus. Der
		   Fehler hier ist genau der, den man an der Klassenliste *nicht* sieht:
		   `class="… text-6xl …"` steht korrekt im Markup, und der Scan meldet zu
		   Recht nichts — die Utility greift nur nicht. Nachweisbar ist das erst am
		   berechneten Wert.

		   **Warum bei 375px.** Der gefundene Fall saß in einem
		   `@media (max-width: 768px)`. Unterhalb `md` greift außerdem keine
		   `md:`/`lg:`-Variante, die Basis-Utility ist dort also allein zuständig —
		   der Vergleich unten braucht deshalb keine Breakpoint-Auflösung.

		   **Was der Test wirklich prüft:** dass keine ungelayerte Element-Regel die
		   Utilities schlägt. Tailwind legt sie in `@layer utilities`, und eine
		   ungelayerte Regel gewinnt gegen jede gelayerte — unabhängig von der
		   Spezifität (dieselbe Mechanik wie beim Fokus-Override, `daisyui.md`). Ein
		   `h1 { font-size: … !important }` in einer beliebigen importierten CSS-Datei
		   schlägt damit jede Größenangabe im Markup, auf jeder Seite.

		   Gefunden wurde so `mapStyles.css`, das über `app.css` global importiert
		   wird und dessen Mobil-Block jede `h1` der Anwendung auf 20px zwang — auf
		   `/about` war der Seitentitel damit kleiner als jede Zwischenüberschrift.
		   Ein Test über die CSS-Quelle hätte das nicht gesehen: dort steht eine
		   plausible Regel in einer plausiblen Datei. */
		test(`${route.path}: Größen-Utilities an Überschriften greifen`, async ({
			page,
			context,
			request,
			baseURL
		}) => {
			await page.setViewportSize({ width: 375, height: 812 });
			await openRoute({ page, context, request, baseURL }, route);

			/* Vor dem Messen auf die Hydration warten — sonst misst der Test die
			   Einbettungs-Darstellung und nicht die, die ein Besucher sieht.

			   `+layout.svelte` rendert `<div class:iframe-mode={!isNotIFrame}>`, und
			   `isNotIFrame` ist eine Modulkonstante mit `browser && window === window.top`
			   (`src/lib/utils/client/isNotIFrame.ts`). Beim Server-Rendering steht sie
			   auf `false`, das Markup trägt also zunächst `.iframe-mode` — und der Block
			   dazu in `app.css` setzt `h1` auf `--text-title` und `h2` auf
			   `--text-section`, ungelayert und damit vor jeder Utility. Erst die
			   Hydration nimmt die Klasse weg.

			   Ohne dieses Warten meldet der Test jede Überschrift der Anwendung als
			   Verstoß und sieht dabei aus wie ein Produktfehler. Genau das ist beim
			   ersten Lauf passiert. */
			await page.waitForFunction(() => !document.querySelector('.iframe-mode'));

			const mismatches = await page.evaluate(() => {
				const root = getComputedStyle(document.documentElement);
				const remBase = parseFloat(root.fontSize) || 16;

				const toPx = (value: string): number | null => {
					const match = /^([\d.]+)(rem|px)$/.exec(value.trim());
					if (!match) return null;
					return Number(match[1]) * (match[2] === 'rem' ? remBase : 1);
				};

				const found: string[] = [];

				for (const el of document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
					/* Nur unpräfigierte Klassen: `md:text-3xl` greift bei 375px nicht.
					   Ob eine `text-*`-Klasse eine Größe ist, entscheidet nicht eine
					   gepflegte Liste, sondern das Theme selbst — `--text-6xl` existiert,
					   `--text-primary` (Farbe) und `--text-center` (Ausrichtung) nicht.
					   Damit deckt der Test auch die eigenen Rollen-Utilities ab
					   (`text-display`, `text-title`, …) ohne Zweitpflege. */
					const sizeUtilities = (el.getAttribute('class') ?? '')
						.split(/\s+/)
						.filter((name) => /^text-[a-z0-9]+$/.test(name))
						.filter((name) => root.getPropertyValue(`--${name}`).trim() !== '');

					/* Keine Größenangabe (z. B. nur `card-title`) — nichts zu prüfen.
					   Mehrere widersprechen sich; das ist ein eigener Fehler und gehört
					   nicht in diese Regel. */
					if (sizeUtilities.length !== 1) continue;

					const utility = sizeUtilities[0];
					const declared = toPx(root.getPropertyValue(`--${utility}`));
					const computed = toPx(getComputedStyle(el).fontSize);
					if (declared === null || computed === null) continue;

					if (Math.abs(declared - computed) > 0.5) {
						const label = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
						found.push(
							`<${el.tagName.toLowerCase()} class="${utility}"> „${label}" — ` +
								`erwartet ${declared}px, gerendert ${computed}px`
						);
					}
				}

				return found;
			});

			expect(
				mismatches,
				'Eine Überschrift rendert nicht in der Größe, die ihre Utility angibt. ' +
					'Ursache ist fast immer eine ungelayerte Element-Regel (oft mit !important) in einer ' +
					'global importierten CSS-Datei — sie schlägt jede Utility aus @layer utilities. ' +
					'Die Regel gehört auf ihren Kontext gescopt, nicht die Utility an der Aufrufstelle erhöht.'
			).toEqual([]);
		});
	}
});

/**
 * Vollständigkeit: jede eigene Utility hat einen Vertreter auf /styleguide.
 *
 * **Warum es diesen Test gibt** — die Seite hat eine Doppelrolle, die man ihr
 * nicht ansieht. Sie ist Schaufenster *und* Lieferbedingung:
 *
 * Tailwind 4 erzeugt eine Utility nur, wenn ihr Klassenname als vollständiger
 * String im gescannten Quelltext steht (`daisyui.md`, „Content-Detection"). Von
 * den dreizehn projekteigenen Utilities haben sieben ihre **einzige**
 * Aufrufstelle auf /styleguide — für die ist diese Seite der Grund, warum die
 * Klasse überhaupt im ausgelieferten CSS landet. Der `@theme`-Kommentar in
 * `app.css` hält denselben Umstand für die dortige `@theme static`-Entscheidung
 * fest.
 *
 * Damit hängt das Token-Set an der Vollständigkeit einer Seite, die sonst
 * niemand prüft. Wer ein Farbfeld löscht, weil es „nur Demo" ist, entfernt
 * still eine Utility aus dem Build: `class="text-accent-strong"` bleibt in den
 * anderen Komponenten stehen und tut nichts mehr. Das ist derselbe Fehlerfall
 * wie `animate-in` in `design-system.md` („Keine toten Utility-Klassen") — nur
 * ohne die sichtbare Ursache, weil die Klasse ja korrekt geschrieben ist.
 *
 * Die Kontrast-Gruppe ganz oben fängt das nicht auf: Sie misst, was auf der
 * Seite steht. Verschwindet ein Feld, verschwindet sein Messpunkt mit — sie
 * misst dann eine Teilmenge und meldet weiter grün. Dieser Test prüft deshalb
 * nicht Werte, sondern dass der Messplatz vollständig ist.
 *
 * Maßgeblich ist `src/css/tokens.css` (Ebene 1, `daisyui.md`) und nicht der
 * `@theme`-Block: Ein Token, das dort deklariert ist, aber auf keiner Seite
 * vorkommt, ist genau der Fall, um den es geht.
 */

/* Kommentare vorher entfernen: tokens.css erklärt seine eigenen Tokens in
   Fließtext, „--text-*" kommt dort auch in Prosa vor. Ohne diesen Schritt
   zählte ein Kommentar als Deklaration. */
const TOKEN_NAMES = [
	...new Set(
		[
			...readFileSync(new URL('../src/css/tokens.css', import.meta.url), 'utf8')
				.replace(/\/\*[\s\S]*?\*\//g, '')
				.matchAll(/^\s*(--[\w-]+)\s*:/gm)
		].map((match) => match[1])
	)
];

const UTILITY_GROUPS = [
	{
		group: 'Statusfarbe als Vordergrund',
		/* --color-info-strong → text-info-strong. Nur die -strong-Varianten:
		   die Flächenfarben kommen aus dem DaisyUI-Theme, nicht von hier. */
		matches: (token: string) => /^--color-.+-strong$/.test(token),
		utility: (token: string) => `text-${token.slice('--color-'.length)}`
	},
	{
		group: 'Typografie-Rolle',
		/* --text-title → text-title. Die -lh-Zwillinge sind die Zeilenhöhe zum
		   jeweiligen Token und haben bewusst keine eigene Utility. */
		matches: (token: string) => token.startsWith('--text-') && !token.endsWith('-lh'),
		utility: (token: string) => token.slice(2)
	},
	{
		group: 'Elevation',
		/* Bewusst --shadow-* und nicht --elevation-*: die Utility heißt
		   `shadow-raised`, und --elevation-flat ist die Stufe „Rahmen statt
		   Schatten" (`none`) und hat gar keine. Die beiden Aliase in tokens.css
		   sind genau der Ort, an dem Utility-Name und Wert zusammenfinden —
		   der Kommentar dort begründet, warum es sie gibt. */
		matches: (token: string) => token.startsWith('--shadow-'),
		utility: (token: string) => token.slice(2)
	}
];

test.describe('Design-Tokens — Utilities haben einen Vertreter auf /styleguide', () => {
	const classesOnStyleguide = async (page: Page) => {
		await page.goto('/styleguide');
		/* getAttribute('class') aus demselben Grund wie im DOM-Scan oben:
		   el.className ist bei SVG ein SVGAnimatedString. */
		return new Set(
			await page.evaluate(() =>
				[...document.querySelectorAll('[class]')].flatMap((el) =>
					(el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
				)
			)
		);
	};

	for (const { group, matches, utility } of UTILITY_GROUPS) {
		const tokens = TOKEN_NAMES.filter(matches);

		/* Ohne diesen Fall wäre die Gruppe still wirkungslos, sobald sich das
		   Namensschema in tokens.css ändert: Eine leere Liste erzeugt keinen
		   einzigen Testfall — und keine Testfälle sind keine roten Testfälle. */
		test(`${group}: tokens.css liefert überhaupt Tokens`, () => {
			expect(
				tokens,
				`Kein Token in src/css/tokens.css passt auf die Gruppe „${group}". Entweder wurde das Namensschema geändert — dann gehört die Regel hier nachgezogen — oder die Tokens sind weg.`
			).not.toEqual([]);
		});

		for (const token of tokens) {
			test(`${group}: ${utility(token)} steht auf /styleguide`, async ({ page }) => {
				const classes = await classesOnStyleguide(page);
				expect(
					classes.has(utility(token)),
					`${token} ist in src/css/tokens.css deklariert, aber kein Element auf /styleguide trägt die Klasse "${utility(token)}". Für die sieben Utilities, deren einzige Aufrufstelle diese Seite ist, heißt das: Tailwind erzeugt sie nicht mehr, und jede Verwendung im Rest der App ist ab sofort wirkungslos.`
				).toBe(true);
			});
		}
	}
});

/**
 * Layer- und Motion-Utilities: greifen sie überhaupt?
 *
 * **Warum das ein eigener Test ist.** Der Klassen-Scan oben meldet `z-50` und
 * `duration-300` — er kann aber nicht sehen, ob `z-nav` und `duration-panel`
 * wirken. Beide Fehler sähen im DOM identisch aus, und der zweite ist der
 * schlechtere: Ein gemeldeter Verstoß ist sichtbar, eine tote Utility nicht.
 * Genau davor warnt `design-system.md` („Keine toten Utility-Klassen"), und
 * genau dieses Risiko ist beim Umstellen des Bestands entstanden — 47
 * Aufrufstellen hängen daran.
 *
 * Die neun stehen als `@utility` in `app.css`, weil Tailwind 4 für Z-Index und
 * Übergangsdauer keinen Theme-Namespace hat. Sie fallen deshalb nicht in die
 * UTILITY_GROUPS oben, die aus `tokens.css` ableiten und einen Vertreter auf
 * /styleguide verlangen — hier ist die Wirkung die bessere Frage als die
 * Anwesenheit.
 *
 * **Was dieser Test belegt — und was nicht.** Er belegt, dass die `@utility`
 * in `app.css` existiert und auf einen vorhandenen Token zeigt. Vorgeführt am
 * 2026-08-09: `@utility z-nav` aus `app.css` entfernt → dieser Test rot.
 *
 * Er belegt **nicht**, dass die Klasse eine Aufrufstelle in `src/` hat.
 * Tailwinds Content-Detection scannt das Projekt inklusive `e2e/` (`daisyui.md`:
 * kein `@source` nötig, weil unter dem Repo nichts ignoriert wird), und die neun
 * Namen stehen zwangsläufig als Literale in `helpers/bannedClasses.ts` — deren
 * `hint`-Strings müssen sie ja nennen. Gemessen: `duration-emphasis` kommt in
 * `src/` an keiner Stelle vor und steht trotzdem im Produktions-CSS, gehalten
 * allein von diesen Test-Strings.
 *
 * Der Klassenname wird hier trotzdem zur Laufzeit zusammengesetzt (`'z-' + stufe`).
 * Das ist keine Absicherung mehr, sondern nur noch Hygiene: Diese Datei soll
 * nicht die dritte Stelle sein, die eine Utility am Leben hält. Wer eine echte
 * Aufrufstellen-Garantie will, braucht dafür einen anderen Wächter — die
 * UTILITY_GROUPS oben sind der für die `@theme`-Utilities.
 */
test.describe('Design-Tokens — Layer- und Motion-Utilities wirken', () => {
	/** Stufe → erwarteter berechneter Wert. */
	const LAYERS = { base: '0', raised: '10', panel: '20', nav: '30', overlay: '40', skip: '50' };
	const DURATIONS = { instant: '0.12s', quick: '0.2s', panel: '0.3s', emphasis: '0.4s' };

	const computeWith = (page: Page, className: string, property: string) =>
		page.evaluate(
			([cls, prop]) => {
				const probe = document.createElement('div');
				probe.className = cls;
				probe.style.position = 'fixed';
				probe.style.transitionProperty = 'opacity';
				document.body.appendChild(probe);
				const value = getComputedStyle(probe).getPropertyValue(prop);
				probe.remove();
				return value;
			},
			[className, property]
		);

	test.beforeEach(async ({ page }) => {
		await page.goto('/styleguide');
	});

	for (const [step, expected] of Object.entries(LAYERS)) {
		test(`z-${step} setzt z-index auf ${expected}`, async ({ page }) => {
			expect(
				await computeWith(page, `z-${step}`, 'z-index'),
				`Die Utility z-${step} erzeugt keinen z-index. Sie steht als @utility in src/app.css und greift auf --layer-${step} in src/css/tokens.css zu — fehlt eines von beidem, ist die Klasse tot und jede Aufrufstelle wirkungslos.`
			).toBe(expected);
		});
	}

	for (const [step, expected] of Object.entries(DURATIONS)) {
		test(`duration-${step} setzt transition-duration auf ${expected}`, async ({ page }) => {
			expect(
				await computeWith(page, `duration-${step}`, 'transition-duration'),
				`Die Utility duration-${step} erzeugt keine transition-duration. Sie steht als @utility in src/app.css und greift auf --motion-${step} in src/css/tokens.css zu.`
			).toBe(expected);
		});
	}

	/* Die Kurve gehört laut design-system.md zur Stufe — sie soll an der
	   Aufrufstelle nicht getrennt gepflegt werden. `emphasis` fährt dabei
	   `linear`: betonte Bewegungen bringen ihren Verlauf in den Keyframe-Stops
	   mit, eine zweite Easing-Funktion böge dort jedes Segment einzeln.

	   **Auf `linear` geprüft und nicht auf „irgendetwas anderes als ease".**
	   Die erste Fassung dieses Tests verlangte nur `not.toBe(ease)` — damit
	   wäre auch der CSS-Default `ease` durchgegangen, den man bekommt, wenn die
	   Utility die Eigenschaft gar nicht setzt. Genau dieser Fall stand hier
	   kurzzeitig im Code: die Tabelle in design-system.md schreibt `linear`
	   vor, geliefert wurde `ease`, und der Test war grün. Eine Negativ-Assertion
	   trifft die Fehlklasse nicht, um die es geht. */
	test('jede Stufe bringt ihre Kurve mit — die drei Übergänge --motion-ease, emphasis linear', async ({
		page
	}) => {
		const ease = await page.evaluate(() =>
			getComputedStyle(document.documentElement).getPropertyValue('--motion-ease').trim()
		);
		expect(ease, '--motion-ease fehlt in tokens.css').not.toBe('');

		for (const step of ['instant', 'quick', 'panel']) {
			expect(
				await computeWith(page, `duration-${step}`, 'transition-timing-function'),
				`duration-${step} muss --motion-ease mitbringen (design-system.md).`
			).toBe(ease);
		}

		expect(
			await computeWith(page, 'duration-emphasis', 'transition-timing-function'),
			'duration-emphasis muss linear fahren (design-system.md). Wird die Eigenschaft nicht gesetzt, liefert CSS den Default `ease` — also genau die gebogene Kurve, die die Stufe ausschließen will.'
		).toBe('linear');
	});
});
