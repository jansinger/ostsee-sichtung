import { expect, test, type Page } from '@playwright/test';

/**
 * hover-transitions.spec.ts — Hover-Übergänge laufen in beide Richtungen
 *
 * Warum es diesen Test gibt: In `app.css` standen die `transition`-Angaben für
 * Karten- und Button-Hover INNERHALB der `:hover`-Regel. Eine solche Angabe
 * gilt nur, solange der Hover aktiv ist — und sie ist eine Kurzschreibweise,
 * ersetzt die Liste der übergehenden Eigenschaften also vollständig. Daraus
 * folgten zwei verschiedene Fehler, die man leicht für einen hält:
 *
 * - **Karte:** DaisyUI gibt `.card` nur `transition: outline .2s` mit. Der
 *   Schatten aus `.card:hover` hatte damit außerhalb des Hovers gar keinen
 *   Übergang — er fuhr weich hinein und sprang hart zurück.
 * - **Button:** DaisyUI gibt `.btn` bereits `color, background-color,
 *   border-color, box-shadow, transform` mit (0,2s). Das `transform` lief
 *   also schon immer in beide Richtungen. Die Kurzschreibweise im Hover
 *   ÜBERSCHRIEB diese Liste aber auf `transform` allein — Farb- und
 *   Schattenwechsel sprangen dadurch beim Betreten hinein und blendeten beim
 *   Verlassen aus. Also derselbe Bruch, nur andersherum und an anderen
 *   Eigenschaften.
 *
 * Warum die Wirkung gemessen wird und nicht die CSS-Quelle: Eine Assertion auf
 * den Regeltext wäre eine zweite Quelle neben `app.css` und würde mit ihr
 * altern. Gemessen wird stattdessen, ob der Browser für die fragliche
 * Eigenschaft überhaupt einen Übergang startet (`transitionstart`).
 *
 * Warum nicht `transition-duration` im Ruhezustand abgefragt wird: Der Wert ist
 * dank DaisyUI an beiden Elementen auch ohne Korrektur ungleich `0s` — die
 * Abfrage wäre grün, ohne etwas zu belegen. Entscheidend ist die
 * EIGENSCHAFTSLISTE, und die prüft man am ehrlichsten am gestarteten Übergang.
 *
 * Jeder Fall fährt zusätzlich die Gegenrichtung (Betreten) als Eigenprobe: Sie
 * belegt, dass die Messmechanik an diesem Element überhaupt anschlägt. Ohne
 * sie wäre ein Rot nicht von einem kaputten Test zu unterscheiden.
 */

/** Bewegung nicht abschalten — der reduced-motion-Block in app.css würde die
 *  Dauern auf 0,01 ms ziehen. Die Übergänge feuerten zwar weiterhin, der Test
 *  liefe aber am realen Verhalten vorbei. */
test.use({ reducedMotion: 'no-preference' });

/**
 * Setzt den Listener für `property` am ersten Treffer von `selector` und legt
 * sein Ergebnis als Versprechen an `window` ab. Diese Funktion **wartet nicht**
 * — ausgelesen wird das Ergebnis erst von `readTransitionWatch()`, und zwar
 * `true` bei gestartetem Übergang, `false` nach 1,5 s ohne einen.
 *
 * Die Zweiteilung ist der Punkt: Der Listener muss VOR der Mausbewegung stehen.
 * Würde eine einzige Funktion erst bewegen und dann horchen, läge dazwischen
 * ein Fenster, in dem der Übergang unbemerkt startet.
 */
async function armTransitionWatch(page: Page, selector: string, property: string): Promise<void> {
	await page.evaluate(
		([sel, prop]) => {
			const el = document.querySelector(sel);
			if (!el) throw new Error(`Element nicht gefunden: ${sel}`);
			(window as unknown as Record<string, unknown>).__transitionStarted = new Promise(
				(resolve) => {
					const onStart = (event: Event) => {
						if ((event as TransitionEvent).propertyName === prop) {
							el.removeEventListener('transitionstart', onStart);
							resolve(true);
						}
					};
					el.addEventListener('transitionstart', onStart);
					setTimeout(() => {
						el.removeEventListener('transitionstart', onStart);
						resolve(false);
					}, 1500);
				}
			);
		},
		[selector, property] as const
	);
}

function readTransitionWatch(page: Page): Promise<boolean> {
	return page.evaluate(
		() => (window as unknown as { __transitionStarted: Promise<boolean> }).__transitionStarted
	);
}

/** Vom Element weg — an eine Stelle, an der garantiert nichts Interaktives liegt. */
async function unhover(page: Page): Promise<void> {
	await page.mouse.move(2, 2);
}

/**
 * Element in den Blick holen und die Seite zur Ruhe kommen lassen.
 *
 * Ohne das Warten verlässt der Zeiger das Element direkt nach `hover()` wieder:
 * Die Seite lädt noch nach, das Layout verschiebt sich unter dem Zeiger, und
 * der Test misst dann den Verlassen-Übergang, während er den Betreten-Übergang
 * zu messen glaubt. Beobachtet auf /about — `mouseleave` kam dort keine 500 ms
 * nach `mouseenter`, ohne dass der Test die Maus bewegt hätte.
 */
async function settle(page: Page, selector: string): Promise<void> {
	await page.locator(selector).first().scrollIntoViewIfNeeded();
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(500);
}

test.describe('Hover-Übergänge', () => {
	test('Karte: der Schatten fährt weich hinein UND wieder heraus', async ({ page }) => {
		await page.goto('/about');
		// Bewusst eine Karte OHNE `transition-all`-Utility: Der Regelfall im
		// Bestand trägt keine, und genau der hing an `.card:hover`.
		const selektor = '.card:not(.transition-all)';
		const karte = page.locator(selektor).first();
		await settle(page, selektor);

		// Eigenprobe: Betreten startet einen Schatten-Übergang.
		await armTransitionWatch(page, selektor, 'box-shadow');
		await karte.hover();
		expect(await readTransitionWatch(page), 'Übergang beim Betreten').toBe(true);
		await page.waitForTimeout(400);

		// Der eigentliche Befund: Verlassen muss ihn ebenfalls starten.
		await armTransitionWatch(page, selektor, 'box-shadow');
		await unhover(page);
		expect(await readTransitionWatch(page), 'Übergang beim Verlassen').toBe(true);
	});

	test('Button: der Schatten hat beim Betreten überhaupt einen Übergang', async ({ page }) => {
		await page.goto('/about');
		const selektor = '.btn.transition-all';
		const knopf = page.locator(selektor).first();
		await settle(page, selektor);

		// Eigenprobe: das Anheben (transform) lief schon immer — DaisyUI bringt es mit.
		await armTransitionWatch(page, selektor, 'transform');
		await knopf.hover();
		expect(await readTransitionWatch(page), 'transform beim Betreten').toBe(true);
		await unhover(page);
		await page.waitForTimeout(400);

		// Der Befund: `hover:shadow-floating` sprang bisher hart hinein, weil die
		// Kurzschreibweise im Hover box-shadow aus der Liste warf.
		await armTransitionWatch(page, selektor, 'box-shadow');
		await knopf.hover();
		expect(await readTransitionWatch(page), 'box-shadow beim Betreten').toBe(true);
	});

	test('Button: das Anheben fährt auch beim Verlassen weich zurück', async ({ page }) => {
		await page.goto('/about');
		// Hier bewusst ein Button OHNE Utility: Er belegt, dass die Basisliste
		// von DaisyUI (color, background-color, border-color, box-shadow,
		// transform) erhalten bleibt. Ein `transition`-Kurzschreiber in app.css
		// kann sie ersatzlos verdrängen — genau das ist im Hover passiert.
		// Ein benannter Button statt `.btn:first` — die ersten Treffer auf der
		// Seite sind der Sprunglink (bis zum Fokus unsichtbar) und der
		// Burger-Knopf (oberhalb `lg` 0×0 groß); beide sind nicht hoverbar.
		const selektor = '.btn.btn-outline.btn-sm';
		const knopf = page.locator(selektor).first();
		await settle(page, selektor);

		await knopf.hover();
		await page.waitForTimeout(400);

		await armTransitionWatch(page, selektor, 'transform');
		await unhover(page);
		expect(await readTransitionWatch(page), 'transform beim Verlassen').toBe(true);
	});
});
