import { expect, test, type Page } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';

/**
 * admin-table-verified-column.spec.ts — die Spalte „Geprüft" bricht nicht um.
 *
 * **Der Bug:** In der Sichtungstabelle stand die Beschriftung des Toggles als
 * „Ge-" / „prüft" auf zwei Zeilen. `BaseToggle` gibt seinem Label
 * `overflow-wrap: break-word` und `hyphens: auto` mit — im Formular richtig,
 * in einer Tabellenzelle fatal: Die Automatik darf die Spalte damit unter die
 * Wortbreite stauchen und trennt das Wort. Jede Zeile der Tabelle wurde davon
 * um eine Textzeile höher (gemessen 84px), und zwar auch die Zeilen, in denen
 * gar nichts umbrach — Tabellenzeilen sind so hoch wie ihre höchste Zelle.
 *
 * **Warum hier keine Zeilenhöhe steht:** Eine Assertion gegen „68px" wäre beim
 * nächsten Padding- oder Touch-Target-Wechsel rot, ohne dass etwas kaputt ist.
 * Geprüft wird die Ursache: Das Label belegt genau **eine** Zeilenbox.
 *
 * Die Gegenrichtung — dass `BaseToggle` selbst **keine** Umbruchsperre setzt —
 * steht als zweiter Test weiter unten in dieser Datei: Der naheliegende Fix
 * dort hätte lange Labels in der Bearbeitungsmaske aus dem Feld laufen lassen.
 * Die Regel gehört an die Aufrufstelle.
 *
 * Zugang über `seedAdminSession` (dort steht, warum nicht über Auth0).
 */

/**
 * Zählt die Zeilenboxen des reinen Beschriftungstextes.
 *
 * Nicht über die Höhe des `<span>`: Die hängt an `line-height`, Touch-Target
 * und Padding und wäre damit eine indirekte Messung. `Range.getClientRects()`
 * liefert pro Zeilenbox ein Rechteck — bei einem getrimmten Textknoten also
 * genau die gesuchte Zahl. Der Trim ist nötig, weil Svelte den Einzug des
 * Markups als Whitespace in den Textknoten schreibt.
 */
async function zaehleZeilenboxen(page: Page, selector: string): Promise<number> {
	return page.evaluate((sel) => {
		const label = document.querySelector(sel);
		if (!label) throw new Error(`Kein Element für ${sel} gefunden`);
		const textNode = [...label.childNodes].find(
			(n): n is Text => n.nodeType === Node.TEXT_NODE && n.textContent!.trim().length > 0
		);
		if (!textNode) throw new Error(`Kein Beschriftungstext in ${sel}`);

		const roh = textNode.textContent!;
		const start = roh.length - roh.trimStart().length;
		const ende = roh.trimEnd().length;

		const bereich = document.createRange();
		bereich.setStart(textNode, start);
		bereich.setEnd(textNode, ende);
		return bereich.getClientRects().length;
	}, selector);
}

test.describe('Admin-Sichtungstabelle — Spalte „Geprüft"', () => {
	test('die Toggle-Beschriftung steht auf einer Zeile', async ({ browser, baseURL }) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

		const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		try {
			await page.goto('/admin/sichtungen');
			await expect(page.getByRole('navigation', { name: 'Verwaltung' })).toBeVisible();

			/* Die Tabelle erscheint erst ab `md`; darunter rendert dieselbe Seite
			   Karten. Der Toggle der Karten-Ansicht heißt `verified-mobile-…` und
			   ist deshalb über das Namensmuster sicher ausgeschlossen. */
			const toggle = page.locator('table input[name^="verified-"]').first();
			await expect(toggle).toBeAttached();

			const zeilen = await zaehleZeilenboxen(page, 'table input[name^="verified-"] ~ span');

			expect(
				zeilen,
				'„Geprüft" wird in der Tabellenzelle getrennt und zieht jede Zeile der Tabelle auf'
			).toBe(1);
		} finally {
			await context.close();
		}
	});

	/**
	 * Gegenprobe zur Fix-Richtung. Der naheliegende Fix wäre gewesen,
	 * `whitespace-nowrap` in `BaseToggle` selbst zu setzen — dann kann kein
	 * Toggle-Label mehr umbrechen, auch nicht das der Bearbeitungsmaske
	 * („Position verfügbar", `sections/Location.svelte`) auf einem schmalen
	 * Gerät. Unterhalb `md` rendert dieselbe Admin-Seite statt der Tabelle
	 * Karten; deren Toggle ist derselbe Komponenten-Aufruf und damit der
	 * kurze Weg zu dieser Prüfung.
	 *
	 * Bewusst als E2E- und nicht als Komponententest: Die Client-Testumgebung
	 * lädt `app.css` nicht, dort bleibt `whitespace-nowrap` wirkungslos und
	 * die Assertion damit grün, egal was die Komponente setzt (nachgestellt).
	 */
	test('unterhalb der Tabellenbreite bleibt die Beschriftung umbruchfähig', async ({
		browser,
		baseURL
	}) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

		const context = await browser.newContext({ viewport: { width: 375, height: 800 } });
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		try {
			await page.goto('/admin/sichtungen');
			const label = page.locator('input[name^="verified-mobile-"] ~ span').first();
			await expect(label).toBeVisible();

			const whiteSpace = await label.evaluate((el) => getComputedStyle(el).whiteSpace);

			expect(
				whiteSpace,
				'Eine Umbruchsperre in BaseToggle selbst ließe lange Labels aus ihrem Feld laufen'
			).not.toBe('nowrap');
		} finally {
			await context.close();
		}
	});
});
