import { expect, test, type BrowserContext } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';
import { expectNoHorizontalOverflow } from './helpers/overflow';
import { deleteSighting, NEWEST_ROW_DATE, seedSighting } from './helpers/seedSighting';

/**
 * admin-table-mobile-reference-overflow.spec.ts — die Referenz-ID in der
 * Mobilkarte der Sichtungstabelle.
 *
 * **Der Befund:** In `src/routes/admin/sichtungen/+page.svelte` steht die
 * Referenz-ID als `<a class="link link-primary link-hover font-mono">` in einer
 * `flex flex-wrap items-center gap-2`-Zeile. `flex-wrap` bricht zwischen den
 * Flex-Items um, nicht *innerhalb* eines Items — und eine Referenz-ID ist ein
 * Wort ohne Umbruchgelegenheit. Der Link hielt damit rund 202px harte
 * Mindestbreite und drückte sie bis zum Seiten-Wrapper durch. Gemessen mit
 * `expectNoHorizontalOverflow` (`e2e/helpers/overflow.ts`) auf
 * `/admin/sichtungen`, Verursacher jeweils `a.font-mono`:
 *
 * | Breite | Überlauf vorher |
 * | ------ | --------------- |
 * | 320px  | 97px            |
 * | 375px  | 42px            |
 *
 * Der Fehler ist älter als der Status-Control-Fix aus
 * `admin-table-mobile-status-overflow.spec.ts` (dort per `git stash`
 * nachgestellt und als eigener Befund vermerkt).
 *
 * **Behoben mit `break-all`** und nicht mit `truncate`: Die Referenz-ID ist der
 * Schlüssel, über den eine Meldung wiedergefunden wird — abgeschnitten wäre sie
 * wertlos. Umbrochen belegt sie zwei Zeilen und bleibt vollständig lesbar.
 *
 * **Warum eine eigens angelegte Sichtung** statt des vorhandenen Bestands: Die
 * Entwicklungs-DB ist über alle Worktrees geteilt (`docs/WORKTREES.md`), ihr
 * Inhalt ist also keine Testvoraussetzung, auf die man sich stützen kann. Ohne
 * eine garantiert lange Referenz-ID auf Seite 1 wäre der Test grün, ohne etwas
 * geprüft zu haben. `?perPage=1` plus ein Sichtungsdatum in der Zukunft
 * (Default-Sortierung: `sichtungsdatum` absteigend) stellt sicher, dass genau
 * diese Zeile gerendert wird — der Überlauf-Befund kann damit auch keine fremde
 * Ursache haben.
 */

/* 28 Zeichen, plus die dreistellige Viewport-Breite pro Testfall = 31: die App
   vergibt Referenz-IDs als cuid2 (24–25 Zeichen, `@paralleldrive/cuid2`), die
   Spalte lässt 64 zu. Ein Wert etwas über dem realen Bestand prüft den Fix mit
   Reserve, ohne einen Fall zu konstruieren, den die Datenbank gar nicht
   zuließe. */
const LANGE_REFERENZ = 'e2erefa1b2c3d4e5f6g7h8i9j0k1';

test.describe('Admin-Sichtungstabelle — lange Referenz-ID in der Mobilkarte', () => {
	/* Nacheinander, weil `?perPage=1` genau eine Zeile rendert: Liefen beide
	   Breiten parallel, ständen zwei Test-Sichtungen mit demselben Datum an der
	   Spitze der Sortierung, und einer der beiden Läufe sähe die Zeile des
	   anderen. Beobachtet als fehlgeschlagene Sichtbarkeitszusicherung bei 375px,
	   während 320px grün war. */
	test.describe.configure({ mode: 'serial' });

	for (const width of [320, 375]) {
		test(`kein horizontaler Überlauf bei ${width}px`, async ({ browser, baseURL }) => {
			if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

			/* Eindeutig pro Testfall, obwohl die beiden Fälle seriell laufen: Bricht
			   einer ab, bevor er aufräumt, kollidiert der andere sonst mit der
			   liegengebliebenen Zeile statt sauber durchzulaufen. */
			const referenceId = `${LANGE_REFERENZ}${width}`;
			/* `NEWEST_ROW_DATE`: `?perPage=1` rendert genau die neueste Zeile, und
			   dieser Wert ist dafür reserviert — kein anderer Seed liegt darüber
			   (abgesichert in `helpers/seedSighting.test.ts`). */
			const sightingId = await seedSighting({
				referenceId,
				sightingDate: NEWEST_ROW_DATE
			});

			/* Der `try` beginnt unmittelbar nach dem Seed und nicht erst nach dem
			   Seitenaufbau: Wirft `seedAdminSession` oder `newContext` — fehlende
			   DATABASE_POSTGRES_URL, ausgelasteter Browser —, bliebe die Zeile sonst
			   in der geteilten Entwicklungs-DB liegen. `context` ist deshalb `let`
			   und im `finally` optional. */
			let context: BrowserContext | undefined;

			try {
				context = await browser.newContext({ viewport: { width, height: 900 } });
				await seedAdminSession(context, baseURL);
				const page = await context.newPage();

				await page.goto('/admin/sichtungen?perPage=1');
				await expect(page.getByRole('heading', { name: 'Sichtungen' })).toBeVisible();

				// Ohne diese Zusicherung könnte der Test an einer Seite ohne die
				// Test-Sichtung grün werden und würde nichts belegen.
				await expect(
					page.locator('.md\\:hidden').getByRole('link', { name: referenceId })
				).toBeVisible();

				await expectNoHorizontalOverflow(page, `/admin/sichtungen bei ${width}px (Mobilkarte)`);
			} finally {
				/* Eigenes try/finally, damit ein Fehler beim Schließen des Kontexts
				   nicht die Zeile in der geteilten Entwicklungs-DB stehen lässt. */
				try {
					await context?.close();
				} finally {
					await deleteSighting(sightingId);
				}
			}
		});
	}
});
