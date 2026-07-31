import { expect, test } from '@playwright/test';
import { FormPage } from './pages/FormPage';

/**
 * Der Schritt-Stepper darf an keiner Breite abgeschnitten werden.
 *
 * DaisyUI gibt `.steps` ein `overflow: auto hidden` und `.step` ein
 * `grid-template-columns: auto`. Ein Titel, der breiter ist als sein Viertel
 * der Leiste, sprengt damit die Spalte und wird **still abgeschnitten** statt
 * umzubrechen — sichtbar als angeschnittene Beschriftung am Rand.
 *
 * Die Reserve war knapp: gemessen 137px Text in einer 156px-Spalte bei 768px
 * Breite. Im Feldmodus (`--text-support` 14px statt 13px) oder bei abweichender
 * Schriftdarstellung reicht das nicht. Der Override in `app.css`
 * (`minmax(0, 1fr)` + Umbruch) löst die Spalte vom Inhalt.
 *
 * Zusätzlich abgesichert: die Seite darf **nicht** horizontal scrollen. Der
 * Footer erzwang mit `md:grid md:grid-flow-col` eine nicht umbrechende Zeile
 * aus fünf Links; zwischen 768 und ~890px wurde das Dokument dadurch breiter
 * als der Viewport und schob den Stepper mit an.
 */
type StepperReport = {
	overlaps: string[];
	clipped: string[];
	ulScrolls: boolean;
	docScrolls: boolean;
} | null;

async function measure(page: import('@playwright/test').Page): Promise<StepperReport> {
	return page.evaluate(() => {
		const nav = document.querySelector('nav[aria-label="Formular-Schritte"]');
		const ul = nav?.querySelector('ul.steps');
		if (!nav || !ul || getComputedStyle(nav).display === 'none') return null;

		const items = [...ul.querySelectorAll('li')].map((li) => {
			const b = li.querySelector('.step-button') as HTMLElement;
			const r = b.getBoundingClientRect();
			return { label: b.textContent!.trim(), left: r.left, right: r.right, el: b };
		});

		const overlaps: string[] = [];
		for (let i = 1; i < items.length; i++) {
			if (items[i].left < items[i - 1].right - 0.5) {
				overlaps.push(`${items[i - 1].label} ⇄ ${items[i].label}`);
			}
		}

		return {
			overlaps,
			clipped: items.filter((i) => i.el.scrollWidth > i.el.clientWidth + 1).map((i) => i.label),
			ulScrolls: ul.scrollWidth > ul.clientWidth + 1,
			docScrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
		};
	});
}

// Ab `md` (768px) ist der Stepper sichtbar; darunter übernimmt
// StepProgressCompact im ortsfesten Balken.
for (const width of [768, 800, 820, 900, 1024, 1280]) {
	for (const density of ['default', 'field'] as const) {
		test(`Stepper bleibt lesbar bei ${width}px (${density})`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			const formPage = new FormPage(page);
			await formPage.goto();

			if (density === 'field') {
				await page.evaluate(() => document.documentElement.setAttribute('data-density', 'field'));
				// Ein Frame abwarten, damit die neuen Token-Werte angewendet sind.
				await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
			}

			const report = await measure(page);
			expect(report, 'Stepper muss ab 768px sichtbar sein').not.toBeNull();
			expect(report!.clipped, 'kein Titel darf abgeschnitten werden').toEqual([]);
			expect(report!.overlaps, 'Titel dürfen sich nicht überlappen').toEqual([]);
			expect(report!.ulScrolls, 'die Leiste darf nicht horizontal scrollen').toBe(false);
			expect(report!.docScrolls, 'die Seite darf nicht horizontal scrollen').toBe(false);
		});
	}
}

/**
 * Gegenprobe mit Biss: Die Fälle oben halten auch ohne den Override, weil die
 * heutigen Titel gerade noch passen — sie sichern nur, dass es so bleibt.
 * Dieser Test erzwingt den Ernstfall und schlägt ohne `minmax(0, 1fr)` fehl.
 */
test('ein überlanger Schritt-Titel bricht um statt abzuschneiden', async ({ page }) => {
	await page.setViewportSize({ width: 768, height: 900 });
	const formPage = new FormPage(page);
	await formPage.goto();

	await page.evaluate(() => {
		const b = document.querySelector('.step-button');
		if (b) b.textContent = 'Positionsangabe und Zeitpunkt der Beobachtung';
	});
	await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));

	const report = await measure(page);
	expect(report!.clipped, 'der lange Titel darf nicht abgeschnitten werden').toEqual([]);
	expect(report!.ulScrolls, 'die Leiste darf dadurch nicht scrollen').toBe(false);
	expect(report!.docScrolls, 'die Seite darf dadurch nicht scrollen').toBe(false);
});
