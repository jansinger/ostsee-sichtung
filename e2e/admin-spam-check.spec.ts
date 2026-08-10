import { expect, test, type Page } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';
import { deleteSighting, seedSighting } from './helpers/seedSighting';

/**
 * admin-spam-check.spec.ts — der Spam-Check widerspricht der Liste nicht mehr.
 *
 * **Der Befund:** `GET /api/sightings/[id]/spam-check` lieferte bis 2026-08 nur
 * eine Neuberechnung über den gespeicherten Datensatz. Tabelle und Eingang
 * zeigen dagegen die persistierte Spalte `spam_score`. Vier Indikatoren wiegen
 * je 2 Punkte und existieren **nur** im Moment des Absendens — Formular-Token
 * fehlt/ungültig, verdächtig schnell abgeschickt sowie die beiden
 * Duplikat-Signale (`docs/SPAM_DETECTION.md`). Ihre Eingangsdaten stehen
 * nirgends in der Zeile, die Neuberechnung kann sie also nicht rekonstruieren.
 *
 * Die Oberfläche zeigte damit „Spam 2" in der Spalte und „0" im Check daneben.
 * Beide Zahlen richtig, der Widerspruch unerklärbar — der Vergleichswert
 * fehlte. Seither liefert der Endpunkt `{ stored, recomputed }`, und beide
 * Anzeigestellen führen den **Erstbefund**; die Neuberechnung steht daneben,
 * benannt und mit dem Satz, der die Differenz erklärt.
 *
 * **Warum das ein E2E-Test sein muss:** Die Vergleichslogik selbst
 * (`getSpamDrift`) ist in `spamScorePresentation.test.ts` abgedeckt, die
 * Antwortform in `endpoint.test.ts` — beide gegen Mocks. Was keiner von beiden
 * sieht: ob die Zahl in der Tabellenspalte und die Zahl im Modal daneben
 * dieselbe Sichtung meinen und dieselbe Aussage treffen. Genau das war der
 * Befund, und er lebt zwischen den beiden Ebenen.
 *
 * **Warum eine eigens angelegte Sichtung:** Die Entwicklungs-DB ist über alle
 * Worktrees geteilt (`docs/WORKTREES.md`), ihr Inhalt ist keine
 * Testvoraussetzung. Der Bestand enthält zudem **keine** Zeile mit einem
 * Meldezeitpunkt-Indikator: Alle Scores dort stammen aus dem Backfill
 * (`spam:rescore`), der diese Signale nie hatte — nachgemessen am 2026-08-09
 * über alle 1.065 bewerteten Zeilen, null Abweichung zwischen gespeichertem und
 * nachgerechnetem Score. Der interessante Fall ist im Bestand also gar nicht
 * herstellbar und muss geseedet werden.
 */

/* Die geseedete Zeile ist so gebaut, dass die **Neuberechnung 0 ergibt** und
   die Differenz damit eindeutig aus dem Erstbefund stammt:
   - ohne Koordinaten → die Positionsprüfung bleibt stumm. Sie hinge sonst an
     `ostsee_geo`, und diese Spalte lässt sich nicht seeden: Ihr Default ist 0,
     was der Detektor als „weit außerhalb der Ostsee" liest (+2). Mit Position
     käme die Neuberechnung also selbst auf 2 und der Test wäre grün, ohne die
     Differenz je gesehen zu haben.
   - Tierart 0 (Schweinswal) → kein „unbekannte Tierart" (+1). Die Spalte hat
     denselben Default, der Wert steht hier trotzdem als Literal: Er ist eine
     Voraussetzung des Tests und keine Nebensache.
   - keine E-Mail → weder MX-Lookup noch Wegwerf-Domain. Das nimmt dem Test
     zugleich die einzige Abhängigkeit von DNS. */
const ERSTBEFUND_SCORE = 2;
const ERSTBEFUND_INDIKATOR = 'Formular verdächtig schnell abgeschickt';

/**
 * Gemeinsamer Präfix aller Zeilen dieses Specs — und zugleich der Suchbegriff,
 * über den die Tabelle sie findet.
 *
 * **Warum gesucht und nicht über das Sichtungsdatum nach oben sortiert**, wie
 * es der Docblock von `SeedSightingData.sightingDate` nahelegt: Eine Zeile mit
 * Datum in der Zukunft steht nicht nur weit oben, sie ist auch die **erste
 * offene** Zeile der Tabelle. `admin-sighting-status.spec.ts` greift sich genau
 * die (`tbody tr[data-sighting-id]`, erste Zeile bei `?verified=open`) und
 * schaltet ihren Status um. Lief dieser Spec daneben, räumte sein `afterEach`
 * die Zeile weg, während der andere sie noch bearbeitete — dessen `finally`
 * navigierte dann auf eine gelöschte Sichtung und lief in einen Timeout, 15 s
 * lang, in einer fremden Datei. Nachgestellt am 2026-08-09.
 *
 * Ein Sichtungsdatum in der Vergangenheit hält die Zeilen aus dieser Rolle
 * heraus; auffindbar bleiben sie über `?q=`.
 */
const REFERENZ_PRAEFIX = 'e2e-spamdrift';

/**
 * Ein Datum aus dem Bestand statt aus der Zukunft (Begründung oben).
 *
 * Der genaue Wert ist gleichgültig, solange er plausibel und nicht der
 * neueste ist — gesucht wird über die Referenz-ID, nicht über die Sortierung.
 */
const BESTANDS_DATUM = new Date('2020-03-05T10:00:00.000Z');

/**
 * Je Test eine eigene Referenz-ID.
 *
 * Playwright fährt die Tests dieser Datei parallel. Mit einer gemeinsamen ID
 * standen zwei gleich benannte Zeilen zugleich in der Tabelle, `.first()` traf
 * die des jeweils anderen Tests — und dessen `afterEach` löschte sie mitten im
 * Lauf. Auch das am 2026-08-09 nachgestellt.
 */
const REFERENZ = {
	detail: `${REFERENZ_PRAEFIX}-detail`,
	tabelle: `${REFERENZ_PRAEFIX}-tabelle`,
	ohneBefund: `${REFERENZ_PRAEFIX}-ohne-befund`
} as const;

async function seedeSichtung(referenceId: string, mitErstbefund: boolean): Promise<number> {
	return seedSighting({
		referenceId,
		sightingDate: BESTANDS_DATUM,
		species: 0,
		totalCount: 1,
		latitude: null,
		longitude: null,
		...(mitErstbefund
			? { spamScore: ERSTBEFUND_SCORE, spamIndicators: [ERSTBEFUND_INDIKATOR] }
			: {})
	});
}

/**
 * Die Tabellenzeile einer geseedeten Sichtung — über `data-sighting-id` am
 * `<tr>` und nicht über den Link der Referenz-ID-Spalte: Die ist seit dem
 * 2026-08-09 standardmäßig abgeschaltet (`columns.ts`), der Link stand dann in
 * keiner Zeile mehr und der Locator fand nichts. Die Zeilen-Id hängt dagegen an
 * keiner Spaltenwahl.
 */
function zeileZu(page: Page, sichtungId: number) {
	return page.locator(`tbody tr[data-sighting-id="${sichtungId}"]`).first();
}

test.describe('Spam-Check — Erstbefund und Neuberechnung nebeneinander', () => {
	test('Detailansicht zeigt beide Befunde und erklärt die Differenz', async ({
		browser,
		baseURL
	}) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');
		const sichtungId = await seedeSichtung(REFERENZ.detail, true);
		const context = await browser.newContext();
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		try {
			await page.goto(`/admin/${sichtungId}`);
			await page.waitForLoadState('networkidle');
			await page.getByRole('button', { name: 'Spam-Check' }).click();

			const karte = page.locator('.card').filter({ hasText: 'Jetzt nachgerechnet' }).first();
			await expect(karte).toBeVisible();

			/* Der Erstbefund führt — es ist die Zahl, die auch in der Liste steht.
			   Wortlaut und Aufbau kommen aus `SpamFinding.svelte`, derselben
			   Komponente wie im Modal; die Zusicherungen hier und im Tabellentest
			   sind deshalb absichtlich gleich formuliert. */
			await expect(karte).toContainText('Beim Eingang');
			await expect(karte).toContainText(`Heuristik-Score: ${ERSTBEFUND_SCORE}`);
			await expect(karte).toContainText(ERSTBEFUND_INDIKATOR);

			// Die Neuberechnung steht daneben, benannt, und kommt hier auf 0.
			await expect(karte).toContainText('Jetzt nachgerechnet');
			await expect(karte).toContainText('Heuristik-Score: 0');

			/* Der eigentliche Fix: Die Differenz wird erklärt statt nur gezeigt.
			   Geprüft wird der Kern der Begründung und nicht der ganze Satz — sonst
			   bräuchte jede Umformulierung eine Teständerung, ohne dass sich am
			   Verhalten etwas ändert. */
			await expect(karte).toContainText('Niedriger als beim Eingang');
		} finally {
			/* Aufräumen im `finally`: Die Datenbank ist zwischen Worktrees geteilt
			   (`docs/WORKTREES.md`). Bliebe die Zeile nach einem gescheiterten
			   Assert stehen, liefe der nächste Lauf gegen zwei gleich benannte
			   Zeilen. Gleiche Konstruktion wie in admin-sighting-status.spec.ts. */
			await deleteSighting(sichtungId);
			await context.close();
		}
	});

	test('Tabellenspalte und Modal treffen dieselbe Aussage', async ({ browser, baseURL }) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');
		const sichtungId = await seedeSichtung(REFERENZ.tabelle, true);
		const context = await browser.newContext();
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		try {
			/* Gesucht statt sortiert (Begründung an `REFERENZ_PRAEFIX`). Der
			   Präfix und nicht die volle Referenz-ID: Bei genau einem Treffer, der
			   dem Suchbegriff exakt entspricht, leitet `+page.server.ts` auf die
			   Detailseite weiter — der Test käme nie an der Tabelle an. */
			await page.goto(`/admin/sichtungen?q=${REFERENZ_PRAEFIX}`);
			/* Vor der Hydration hängt an den Zeilen-Buttons kein Handler: Der Klick
			   landet, `checkSpam` läuft nie, und der Fehlschlag steht dann am
			   `.modal-box`, der „hidden" bleibt — als wäre das Modal kaputt. Genau so
			   ist dieser Test beim Schreiben einmal rot geworden. `networkidle` ist
			   dafür das im Projekt etablierte Signal (`admin-sighting-status.spec.ts`). */
			await page.waitForLoadState('networkidle');

			const zeile = zeileZu(page, sichtungId);
			await expect(zeile).toBeVisible();
			// Die Spalte zeigt den Erstbefund — unverändert, das war nie der Fehler.
			await expect(zeile).toContainText(String(ERSTBEFUND_SCORE));

			/* Seit 2026-08-10 steht der Spam-Check im Overflow-Menü der Zeile
			   (`SightingActionsMenu.svelte`) — erst öffnen, dann klicken. Der
			   Eintrag wird über `page` gesucht, nicht über `zeile`: Es gibt zwar
			   ein Menü pro Zeile, aber `popover="auto"` lässt nur eines offen,
			   und geschlossene Popover stehen nicht im Accessibility-Baum —
			   sichtbar ist also genau der Eintrag der gerade geöffneten Zeile. */
			await zeile.getByRole('button', { name: /^Weitere Aktionen zu Sichtung/ }).click();
			await page.getByRole('button', { name: 'Spam-Check durchführen' }).click();

			const modal = page.locator('.modal-box').filter({ hasText: 'Spam-Analyse' });
			await expect(modal).toBeVisible();

			/* Der Widerspruch, um den es geht: Vorher stand hier „Heuristik-Score: 0"
			   neben einer Spalte, die 2 zeigte. Jetzt nennt das Modal beide Zahlen und
			   ordnet sie zeitlich ein. */
			await expect(modal).toContainText('Beim Eingang');
			await expect(modal).toContainText(`Heuristik-Score: ${ERSTBEFUND_SCORE}`);
			await expect(modal).toContainText(ERSTBEFUND_INDIKATOR);
			await expect(modal).toContainText('Jetzt nachgerechnet');
			await expect(modal).toContainText('Niedriger als beim Eingang');
		} finally {
			await deleteSighting(sichtungId);
			await context.close();
		}
	});

	test('ohne Erstbefund behauptet die Detailansicht keinen Vergleich', async ({
		browser,
		baseURL
	}) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');
		const context = await browser.newContext();
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		/* `spam_score IS NULL` heißt „nie bewertet" und ist nicht dasselbe wie 0.
		   Eine Differenz dagegen zu bilden hieße, mit einer Null zu rechnen, die
		   keine ist — der Erklärsatz muss hier also ausbleiben. */
		const unbewertet = await seedeSichtung(REFERENZ.ohneBefund, false);

		try {
			await page.goto(`/admin/${unbewertet}`);
			await page.waitForLoadState('networkidle');
			await page.getByRole('button', { name: 'Spam-Check' }).click();

			const karte = page.locator('.card').filter({ hasText: 'Jetzt nachgerechnet' }).first();
			await expect(karte).toBeVisible();
			/* Kein Badge und keine Zahl — „nie bewertet" ist kein Prüfergebnis.
			   Die Beschreibung aus SPAM_RISK_PRESENTATION.unrated trägt den Fall. */
			await expect(karte).toContainText('Beim Eingang');
			await expect(karte).toContainText('Nie auf Spam geprüft');
			await expect(karte).not.toContainText('Heuristik-Score: null');
			await expect(karte).not.toContainText('Niedriger als beim Eingang');
			await expect(karte).not.toContainText('Höher als beim Eingang');
		} finally {
			await deleteSighting(unbewertet);
			await context.close();
		}
	});
});
