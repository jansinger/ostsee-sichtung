import { expect, test, type Page } from '@playwright/test';

/**
 * `src/app.html` trug bis 2026-08-02 einen eigenen Satz SEO-Tags, und
 * `%sveltekit.head%` steht darunter. Jede Seite mit eigenem `<svelte:head>`
 * lieferte damit zwei `<title>`, zwei `description`, zwei `og:title` — welche
 * davon eine Suchmaschine nimmt, ist nicht garantiert. Die seitenspezifische
 * Fassung konnte still ignoriert werden.
 *
 * Der Scan unten ist der Wächter dagegen: Er prüft nicht, WAS in den Tags steht
 * (das tun die Seiten-Specs), sondern dass es jeden genau einmal gibt.
 */

/** Öffentlich erreichbare Seiten. Admin bleibt außen vor — nicht indexierbar. */
const PUBLIC_ROUTES = ['/', '/about', '/map', '/bestimmungshilfe', '/docs'] as const;

/**
 * Tags, die den Seiteninhalt beschreiben und deshalb pro Seite genau einmal
 * vorkommen müssen. `og:site_name`, `og:image` und `twitter:image` stehen
 * bewusst NICHT hier: die sind seitenunabhängig und gehören weiterhin global
 * in `app.html`.
 */
const UNIQUE_TAGS = [
	/* `head > title` und nicht `title`: Ein `<title>` in einem Inline-SVG ist ein
	   legitimer Zugänglichkeitstitel und darf nicht mitgezählt werden. */
	'head > title',
	'meta[name="description"]',
	'meta[name="keywords"]',
	'meta[property="og:type"]',
	'meta[property="og:title"]',
	'meta[property="og:description"]',
	'meta[name="twitter:card"]',
	'meta[name="twitter:title"]',
	'meta[name="twitter:description"]'
] as const;

/**
 * `expect(...).toHaveCount()` statt eines einmaligen `.count()`: Nur die
 * Assertion wiederholt sich, bis sie stimmt oder das Timeout greift.
 *
 * Das ist hier keine Stilfrage. `/map` trägt `export const ssr = false`
 * (`src/routes/map/+page.ts`) — der Server liefert einen leeren `<head>` aus,
 * Titel und Meta-Tags setzt erst die Hydration. Ein einmaliger `.count()`
 * unmittelbar nach `goto()` zählt dort null und meldet einen Verlust, den es
 * nicht gibt.
 */
async function expectExactlyOne(page: Page, selector: string, route: string): Promise<void> {
	await expect(page.locator(selector), `${route}: ${selector} muss genau 1× vorkommen`).toHaveCount(
		1
	);
}

test.describe('SEO-Meta — jede Seite beschreibt sich genau einmal', () => {
	for (const route of PUBLIC_ROUTES) {
		/*
		 * `toBe(1)` und nicht `toBeLessThanOrEqual(1)`: Die obere Grenze allein
		 * fängt nur die Dopplung, gegen die dieser Wächter ursprünglich gebaut
		 * wurde — nicht den Verlust. Genau da ist `/map` durchgerutscht: Die Route
		 * hatte nie eigene og:-Tags und lebte von der globalen Vorgabe in
		 * `app.html`; nach deren Entfernung stand sie ohne da, und ein „höchstens
		 * eins"-Test war dabei grün. Die exakte Zahl deckt beide Richtungen ab.
		 */
		test(`${route} trägt jeden Beschreibungs-Tag genau einmal`, async ({ page }) => {
			await page.goto(route);

			for (const selector of UNIQUE_TAGS) {
				await expectExactlyOne(page, selector, route);
			}
		});

		test(`${route} hat eine aussagekräftige Beschreibung`, async ({ page }) => {
			await page.goto(route);

			await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{40,}/);
			await expect(page.locator('head > title')).not.toBeEmpty();
		});
	}

	/**
	 * Der Titel muss die Seite unterscheiden — sonst sieht eine Trefferliste
	 * fünfmal gleich aus. Bis zum Umbau lieferte `app.html` allen Seiten
	 * zusätzlich denselben Titel „Ostsee-Tiere - Marine Tiere melden".
	 */
	test('die Seitentitel unterscheiden sich voneinander', async ({ page }) => {
		const titles: string[] = [];
		for (const route of PUBLIC_ROUTES) {
			await page.goto(route);
			titles.push(await page.title());
		}

		expect(new Set(titles).size, `Titel: ${titles.join(' | ')}`).toBe(PUBLIC_ROUTES.length);
	});
});
