import { expect, test, type Page } from '@playwright/test';

/**
 * footer-layout.spec.ts — der Footer bricht auf schmalen Geräten wirklich um.
 *
 * **Der Bug:** `footer-center` ist in DaisyUI 5 auf *jedem* Breakpoint
 * `grid-auto-flow: column dense` — es gibt keine responsive Umschaltung. Die
 * drei Blöcke standen deshalb auch auf 390px nebeneinander, jeder rund 130px
 * breit, und die sechs Navigationslinks wurden darin zu einer sechszeiligen
 * Spalte gequetscht. Auf 1280px war es umgekehrt: dieselben sechs Links
 * zweizeilig im linken Drittel, während rechts Platz frei blieb.
 *
 * Ein früherer Anlauf (2026-07-30) hatte nur das `md:grid-flow-col` der
 * inneren `<nav>` entfernt. Das behob den horizontalen Überlauf, ließ die
 * äußere Spaltenanordnung aber unangetastet — sie kommt aus `footer-center`
 * selbst. Der Test greift deshalb die Anordnung der Blöcke ab, nicht die der
 * Links.
 */

const GRUPPEN = ['Navigation', 'Rechtliches', 'Projekt'] as const;

/** Oberkanten der Footer-Gruppen — gleiche Zahl = gleiche Zeile. */
async function gruppenZeilen(page: Page): Promise<number> {
	return page.evaluate(() => {
		const gruppen = document.querySelectorAll('footer nav');
		if (gruppen.length === 0) throw new Error('Keine Footer-Gruppen gefunden');
		return new Set(Array.from(gruppen).map((g) => Math.round(g.getBoundingClientRect().top))).size;
	});
}

test.describe('Footer — Anordnung', () => {
	test('auf 390px stehen die Gruppen untereinander', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');

		const footer = page.locator('footer');
		await expect(footer).toBeAttached();

		expect(await gruppenZeilen(page), 'Gruppen stehen nebeneinander statt untereinander').toBe(
			GRUPPEN.length
		);
	});

	test('ab 1024px stehen die Gruppen nebeneinander', async ({ page }) => {
		await page.setViewportSize({ width: 1024, height: 900 });
		await page.goto('/');
		await expect(page.locator('footer nav').first()).toBeAttached();

		expect(await gruppenZeilen(page), 'Gruppen stapeln sich, obwohl Platz da ist').toBe(1);
	});

	/* Der Auslöser des Vorgänger-Bugs: zwischen 768px und ~890px passte die
	   Linkzeile nicht mehr, das Dokument wurde breiter als der Viewport und die
	   ganze Seite ließ sich seitlich schieben — der Schritt-Stepper darüber
	   wurde mit angeschnitten. */
	test('das Dokument wird auf keiner Breite breiter als das Fenster', async ({ page }) => {
		for (const breite of [360, 390, 640, 768, 890, 1024, 1280]) {
			await page.setViewportSize({ width: breite, height: 900 });
			await page.goto('/');
			const ueberlauf = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(ueberlauf, `horizontaler Überlauf bei ${breite}px`).toBeLessThanOrEqual(0);
		}
	});

	test('die Pflichtangaben stehen in einer eigenen, benannten Gruppe', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/');

		for (const name of GRUPPEN) {
			await expect(page.getByRole('navigation', { name })).toBeVisible();
		}

		/* § 5 DDG und Art. 13 DSGVO: auffindbar, nicht als Platz 5 und 6 einer
		   Linkwurst. Verlinkt sind bewusst die Seiten des Betreibers — eine
		   zweite, separat zu pflegende Fassung derselben Rechtstexte würde nur
		   auseinanderlaufen. */
		const rechtliches = page.getByRole('navigation', { name: 'Rechtliches' });
		await expect(rechtliches.getByRole('link', { name: 'Impressum' })).toHaveAttribute(
			'href',
			/deutsches-meeresmuseum\.de\/impressum$/
		);
		await expect(rechtliches.getByRole('link', { name: 'Datenschutz' })).toHaveAttribute(
			'href',
			/deutsches-meeresmuseum\.de\/datenschutz$/
		);
	});
});
