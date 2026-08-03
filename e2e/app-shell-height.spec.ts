import { expect, test, type Page } from '@playwright/test';
import { mockMapSightingsSuccess } from './fixtures/mockApi';
import { seedAdminSession } from './helpers/adminSession';
import { MapPage } from './pages/MapPage';

/**
 * app-shell-height.spec.ts — die Karte muss unter *jedem* Header passen.
 *
 * **Der Bug:** `/map` setzte die Höhe des Karten-Containers als
 * `calc(100dvh - 4rem)` — also unter der Annahme, der Header sei genau 64px
 * hoch. Er ist es nie: einzeilig misst er 66px, und als Admin brach das
 * Menü zwischen 1024px und 1440px in eine zweite Zeile um (99px). Der
 * Container ragte damit 35px unter den Fensterrand, der „Karte/Liste"-
 * Umschalter und das Museums-Logo lagen außerhalb des sichtbaren Bereichs.
 * Der `MaintenanceBanner` steht zusätzlich zwischen Header und `<main>` und
 * kam in der Rechnung überhaupt nicht vor.
 *
 * **Warum hier keine Zahl steht:** Der Test misst den Header und leitet die
 * Erwartung daraus ab. Eine Assertion gegen „66px" würde beim nächsten
 * Padding-Wechsel rot, ohne dass etwas kaputt wäre — und, schlimmer, sie
 * würde grün bleiben, wenn Header und Container gemeinsam falsch liegen.
 * Geprüft wird die *Beziehung*: bündig unter dem Header, bündig am
 * Fensterrand.
 *
 * Die Admin-Variante ist der eigentliche Regressionsfall — sie ist die
 * einzige mit genug Menüpunkten, um einen Umbruch überhaupt auszulösen.
 * Zugang über `seedAdminSession` (dort steht, warum nicht über Auth0).
 */

/* 1px Toleranz: Sub-Pixel-Rundung von `getBoundingClientRect` gegen die
   ganzzahlige `innerHeight`. Größer darf sie nicht sein — der Bug lag bei
   2px im günstigsten und 35px im ungünstigsten Fall. */
const TOLERANZ = 1;

async function messeKartenGeometrie(page: Page) {
	return page.evaluate(() => {
		const header = document.querySelector('header');
		const container = document.querySelector('#map')?.parentElement;
		if (!header || !container) throw new Error('Header oder Karten-Container nicht gefunden');
		return {
			headerUnterkante: header.getBoundingClientRect().bottom,
			containerOberkante: container.getBoundingClientRect().top,
			containerUnterkante: container.getBoundingClientRect().bottom,
			fensterhoehe: window.innerHeight
		};
	});
}

test.describe('App-Shell — Kartenhöhe folgt dem Header', () => {
	test('anonym: Karte schließt bündig an den Header an und endet am Fensterrand', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await mockMapSightingsSuccess(page);
		const mapPage = new MapPage(page);
		await mapPage.goto();
		await mapPage.waitForLoad();

		const g = await messeKartenGeometrie(page);

		expect(Math.abs(g.containerOberkante - g.headerUnterkante)).toBeLessThanOrEqual(TOLERANZ);
		expect(g.containerUnterkante).toBeLessThanOrEqual(g.fensterhoehe + TOLERANZ);
	});

	test('als Admin bei 1280px: Karte ragt nicht unter den Fensterrand', async ({
		browser,
		baseURL
	}) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

		const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		try {
			await mockMapSightingsSuccess(page);
			const mapPage = new MapPage(page);
			await mapPage.goto();
			await mapPage.waitForLoad();

			const g = await messeKartenGeometrie(page);

			expect(Math.abs(g.containerOberkante - g.headerUnterkante)).toBeLessThanOrEqual(TOLERANZ);
			expect(g.containerUnterkante).toBeLessThanOrEqual(g.fensterhoehe + TOLERANZ);
		} finally {
			await context.close();
		}
	});
});
