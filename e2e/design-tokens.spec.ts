import { readFileSync } from 'node:fs';
import {
	expect,
	test,
	type APIRequestContext,
	type BrowserContext,
	type Page
} from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';
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

		await page.getByRole('link', { name: 'Meldung' }).click();
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

   Die Regex NICHT aufweichen, um die Gruppe grün zu halten: sie wäre genau
   dann wertlos, wenn sie nur noch findet, was ohnehin konform ist. Eine neue
   Fundstelle gehört an der Aufrufstelle behoben — `text-*-strong` statt
   `text-*`, `/70` statt `/50`, Theme-Token statt Tailwind-Palette. */
test.describe('Design-Tokens — verbotene Kombinationen im DOM', () => {
	/* Ruhezustand-Scan. Hover-Zustände tauchen in getComputedStyle nicht auf
	   und sind hier deshalb nicht prüfbar — dafür gilt die Regel in
	   design-system.md („text-error nicht auf base-300").

	   Der Admin-Bereich ist seit 2026-07-29 dabei. Er war vorher ungedeckt,
	   nicht schmutzig: Eine Prüfung von Hand über alle sechs Routen fand null
	   Verstöße — aber eben von Hand. Der Zugang läuft über `seedAdminSession`
	   (dort steht, warum nicht über die Auth0-Oberfläche). */
	const ROUTES = [
		{ path: '/', auth: false, needsDb: false },
		{ path: '/map', auth: false, needsDb: false },
		{ path: '/about', auth: false, needsDb: false },
		{ path: '/admin', auth: true, needsDb: true },
		{ path: '/admin/statistics', auth: true, needsDb: true },
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
	const openRoute = async (
		{
			page,
			context,
			request,
			baseURL
		}: {
			page: Page;
			context: BrowserContext;
			request: APIRequestContext;
			baseURL: string | undefined;
		},
		route: (typeof ROUTES)[number]
	) => {
		/* Der E2E-Job in ci.yml startet keinen Postgres (`cp .env.example .env`,
		   kein services:-Block). Datengetriebene Admin-Seiten sind dort nicht
		   prüfbar. Das ausdrücklich zu überspringen ist ehrlicher als ein Scan
		   über eine Fehlerseite — und es steht im Report, statt still grün zu
		   sein. Wer die Routen auch in CI abdecken will, hängt einen
		   Postgres-Service in den Job; dann greift dieser Zweig nicht mehr. */
		if (route.needsDb && !(await databaseAvailable(request))) {
			test.skip(
				true,
				`${route.path} braucht eine Datenbank, und /api/map/sightings antwortet nicht — CI fährt E2E ohne Postgres. Die Route bleibt ungeprüft.`
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
					'Prüfe SESSION_SECRET und COOKIE_NAME in .env (siehe e2e/helpers/adminSession.ts).'
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
					'ADMIN_IDENTITY.roles in e2e/helpers/adminSession.ts muss die von requireUserRole geforderte Rolle enthalten.'
			);
		}
	};

	for (const route of ROUTES) {
		test(`${route.path}: keine Statusfarbe als Textfarbe`, async ({
			page,
			context,
			request,
			baseURL
		}) => {
			await openRoute({ page, context, request, baseURL }, route);
			const offenders = await page.evaluate(() => {
				/* getAttribute('class'), NICHT el.className: bei SVG-Elementen ist
				   className ein SVGAnimatedString, das als "[object SVGAnimatedString]"
				   stringifiziert — der Scan würde ausgerechnet die Icons verfehlen, für
				   die diese Regel gedacht ist (Icon.svelte rendert <svg class="…">). */
				const cls = (el: Element) => el.getAttribute('class') ?? '';
				const banned = /(^|\s)text-(info|success|warning|secondary|accent)(\s|$)/;
				return [...document.querySelectorAll('[class]')]
					.filter((el) => banned.test(cls(el)))
					.map((el) => `${el.tagName.toLowerCase()}.${cls(el)}`)
					.slice(0, 20);
			});
			expect(
				offenders,
				'Flächen-Statusfarben als Vordergrund verwenden — stattdessen text-*-strong'
			).toEqual([]);
		});

		test(`${route.path}: keine Textfarbe unter Deckkraft /60`, async ({
			page,
			context,
			request,
			baseURL
		}) => {
			await openRoute({ page, context, request, baseURL }, route);
			const offenders = await page.evaluate(() => {
				const cls = (el: Element) => el.getAttribute('class') ?? '';
				const banned = /(^|\s)(text-base-content\/(40|50)|opacity-(40|50))(\s|$)/;
				return [...document.querySelectorAll('[class]')]
					.filter((el) => banned.test(cls(el)) && (el.textContent ?? '').trim().length > 0)
					.map((el) => `${el.tagName.toLowerCase()}.${cls(el)}`)
					.slice(0, 20);
			});
			expect(offenders, '/40 und /50 sind dekorativ, nicht für Text').toEqual([]);
		});

		test(`${route.path}: keine Tailwind-Paletten-Farben`, async ({
			page,
			context,
			request,
			baseURL
		}) => {
			await openRoute({ page, context, request, baseURL }, route);
			const offenders = await page.evaluate(() => {
				const cls = (el: Element) => el.getAttribute('class') ?? '';
				const banned =
					/(^|\s)(bg|text|border)-(gray|slate|zinc|red|green|blue|yellow|amber|emerald|sky|indigo|orange)-\d{2,3}(\s|$)/;
				return [...document.querySelectorAll('[class]')]
					.filter((el) => banned.test(cls(el)))
					.map((el) => `${el.tagName.toLowerCase()}.${cls(el)}`)
					.slice(0, 20);
			});
			expect(offenders, 'Theme-Tokens statt Tailwind-Palette (daisyui.md)').toEqual([]);
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
