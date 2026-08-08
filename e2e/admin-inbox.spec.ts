import { expect, test } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';

/**
 * admin-inbox.spec.ts — Rauchtest der Eingangsseite `/admin`.
 *
 * **Was hier bewusst NICHT geprüft wird: der Freigabe-Flow.** Die Datenbank ist
 * zwischen allen Worktrees geteilt (`docs/WORKTREES.md`); ein Klick auf
 * „Freigeben" oder „Ablehnen" veränderte echte, noch unbearbeitete Meldungen —
 * und `reset` stellte anschließend nicht den Zustand her, sondern einen
 * geschätzten. Die Verdict-Strecke ist deshalb dort abgedeckt, wo sie ohne
 * Fremdwirkung prüfbar ist: `src/routes/admin/inboxPage.server.test.ts`,
 * `inboxUndo.svelte.test.ts` und die Tests des Verify-Endpunkts. Hier bleiben
 * Navigation, Redirect und Rendern.
 *
 * **Alle Assertions sind zustandsunabhängig.** Wie viele Meldungen offen sind,
 * hängt am geteilten Bestand und schwankt zwischen zwei Läufen — geprüft wird
 * deshalb, dass Überschrift, Zähler und Sortier-Umschalter da sind, nicht
 * welche Zahl im Zähler steht. Der Umschalter steht außerhalb des
 * `{#if data.open.length === 0}`-Zweigs und ist damit auch bei leerem Eingang
 * bedienbar (`src/routes/admin/+page.svelte`).
 *
 * Zugang über `seedAdminSession` (dort steht, warum nicht über Auth0).
 */

test.describe('Admin-Eingangsseite', () => {
	test('zeigt Eingang mit Zähler und Sortier-Umschalter', async ({ browser, baseURL }) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

		const context = await browser.newContext();
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		try {
			/* Startrichtung explizit statt über den Default: Der Umschalter zeigt die
			   AKTUELLE Richtung an („Älteste zuerst" bei asc). Ohne festgelegte
			   Ausgangslage wüsste der Test nicht, welche Beschriftung er erwarten darf
			   — und die Assertion auf `order=desc` unten wäre bei einem künftig
			   umgedrehten Default still wirkungslos. `order` steht bewusst nicht in
			   TABELLEN_PARAMETER und löst deshalb keinen Redirect aus. */
			await page.goto('/admin?order=asc');

			/* Der Umschalter ist der einzige Client-Handler dieser Seite. Vor der
			   Hydration ist er ein sichtbarer, anklickbarer Knopf ohne `onclick` —
			   der Klick läuft ins Leere, die URL bleibt stehen, und der Fehler sieht
			   aus wie ein defekter Handler. Genau so ist dieser Test beim ersten Lauf
			   rot gewesen. `networkidle` ist dafür das im Projekt etablierte Signal
			   (`form-autosave.spec.ts`, `report-kind-choice.spec.ts`). */
			await page.waitForLoadState('networkidle');

			await expect(page.getByRole('heading', { name: /Eingang/ })).toBeVisible();

			/* Der Zähler, nicht irgendein „offen": `^\d+ offen$` trifft genau das
			   Badge in der Überschrift und weder „Keine offenen Sichtungen." des
			   Leerzustands noch die Nachlade-Zeile „… von N offenen Sichtungen
			   angezeigt". Eine Assertion auf eine konkrete Zahl wäre am geteilten
			   Bestand nicht haltbar. */
			await expect(page.getByText(/^\d+ offen$/)).toBeVisible();

			const umschalter = page.getByRole('button', { name: /zuerst/ });
			await expect(umschalter).toHaveText(/Älteste zuerst/);

			await umschalter.click();

			await expect(page).toHaveURL(/[?&]order=desc\b/);
			await expect(umschalter).toHaveText(/Neueste zuerst/);
		} finally {
			await context.close();
		}
	});

	test('leitet gemerkte Tabellen-URLs auf /admin/sichtungen weiter', async ({
		browser,
		baseURL
	}) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

		const context = await browser.newContext();
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		try {
			await page.goto('/admin?page=2&verified=0');

			/* Nicht gegen einen Query-String als Ganzes: Die Reihenfolge der
			   Parameter ist eine Eigenschaft von URLSearchParams.toString() und keine
			   Zusage der Weiterleitung. Geprüft wird, dass Ziel-Pfad und beide
			   Parameter ankommen. */
			const ziel = new URL(page.url());
			expect(ziel.pathname).toBe('/admin/sichtungen');
			expect(ziel.searchParams.get('page')).toBe('2');
			expect(ziel.searchParams.get('verified')).toBe('0');

			// Die Tabelle ist wirklich da und nicht nur die URL umgeschrieben.
			await expect(page.getByRole('navigation', { name: 'Verwaltung' })).toBeVisible();
		} finally {
			await context.close();
		}
	});

	test('Fokus-Ring liegt an der Karte, auch wenn eine Schaltfläche darin den Fokus hat', async ({
		browser,
		baseURL
	}) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

		/**
		 * Warum das ein E2E-Test ist und kein Komponententest: Die Zusage steckt in
		 * einer CSS-Regel (`.inbox-card:has(:global(:focus-visible))`), und der
		 * Browser-Runner der Unit-Tests liefert die Seite ohne Tailwind und ohne
		 * Svelte-Scoping-Klassen aus — dort ist keine Outline messbar.
		 *
		 * **Die Regel braucht ein `:global()` im `:has()`.** Ohne es hängt Svelte
		 * die Scope-Klasse der Seite an das Argument; die Schaltflächen liegen aber
		 * in `SightingInboxCard.svelte` und tragen eine andere Scope-Klasse — der
		 * Ring blieb dann aus, während A und R sehr wohl auf die Karte wirkten.
		 * Dieser Test ist rot, wenn das `:global()` fehlt (nachgestellt 2026-08-08).
		 *
		 * **Gemessen wird `outline-style`, nicht `outline-width`.** Ohne passende
		 * Regel rechnet der Browser `outline-width` auf den Initialwert `medium`
		 * — und der ist ausgerechnet `3px`. Eine Breiten-Assertion ist damit auch
		 * ohne jede Regel grün; genau so war die erste Fassung dieses Tests
		 * wirkungslos. `outline-style` steht ohne Regel auf `none`.
		 *
		 * Zustandsunabhängig: Es wird nur navigiert und fokussiert, nichts
		 * entschieden — die Datenbank ist zwischen den Worktrees geteilt.
		 */
		const context = await browser.newContext();
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		try {
			await page.goto('/admin?order=asc');
			await page.waitForLoadState('networkidle');

			const ersteKarte = page.locator('li.inbox-card').first();
			if ((await ersteKarte.count()) === 0) {
				// Leerer Eingang: Es gibt keine Karte, an der etwas zu messen wäre.
				test.skip(true, 'Kein offener Eingang im geteilten Bestand');
			}

			const ringStil = () => ersteKarte.evaluate((el) => getComputedStyle(el).outlineStyle);
			await expect.poll(ringStil).toBe('none');

			await page.keyboard.press('j');
			await expect.poll(ringStil).toBe('solid');

			/* Vier Tabs führen von der Karte über „Details", „Ablehnen" bis
			   „Freigeben" — der Ring muss die ganze Zeit an der Karte bleiben. */
			for (let schritt = 0; schritt < 4; schritt++) await page.keyboard.press('Tab');
			await expect(page.getByRole('button', { name: /Freigeben/ }).first()).toBeFocused();
			await expect.poll(ringStil).toBe('solid');
		} finally {
			await context.close();
		}
	});

	test('Navigation führt Eingang und Sichtungen als eigene Reiter', async ({
		browser,
		baseURL
	}) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

		const context = await browser.newContext();
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		try {
			await page.goto('/admin/sichtungen');
			const nav = page.getByRole('navigation', { name: 'Verwaltung' });

			await expect(nav.getByRole('link', { name: 'Eingang', exact: true })).toBeVisible();
			await expect(nav.getByRole('link', { name: 'Sichtungen', exact: true })).toHaveAttribute(
				'aria-current',
				'page'
			);

			/* Gegenrichtung: Auf `/admin` markiert dieselbe Navigation den Eingang.
			   Ohne diese Hälfte bliebe der Test grün, wenn `aria-current` an beiden
			   Einträgen gleichzeitig hinge. */
			await nav.getByRole('link', { name: 'Eingang', exact: true }).click();
			await expect(page).toHaveURL(/\/admin$/);
			await expect(nav.getByRole('link', { name: 'Eingang', exact: true })).toHaveAttribute(
				'aria-current',
				'page'
			);
			await expect(nav.getByRole('link', { name: 'Sichtungen', exact: true })).not.toHaveAttribute(
				'aria-current',
				'page'
			);
		} finally {
			await context.close();
		}
	});
});
