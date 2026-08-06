import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, openAllDetails } from './helpers/overflow';
import { expectCurrentStep, fillStep1, fillStep2 } from './helpers/form-helpers';
import { FormPage } from './pages/FormPage';
import { SightingFromEnum } from '../src/lib/report/formOptions/sightingFrom';

/**
 * horizontal-overflow.spec.ts — das Dokument darf auf keiner Breite breiter
 * werden als das Fenster.
 *
 * Der Wächter stand bis zum 2026-08-04 in `footer-layout.spec.ts` und prüfte
 * genau eine Ansicht: Schritt 1 im Grundzustand, ab 360px. Damit hat er den
 * bisher einzigen echten Überlauf **nicht** gefunden — die Zeile
 * „GPS-Eingabeformat" in `LocationInput.svelte` lag hinter einem zugeklappten
 * `<details>` und hatte gar keine Layout-Box. Ein zugeklappter Bereich kann
 * nicht überlaufen; der Test war aus dem falschen Grund grün, bis die
 * Koordinateneingabe dauerhaft sichtbar wurde (8a4ef750). Auf 360px lief das
 * Dokument dann um 109px über.
 *
 * Daraus folgen die drei Erweiterungen:
 * - **alle vier Schritte**, nicht nur der erste,
 * - **aufgeklappte Bereiche** — jede Disclosure offen, dazu die Blöcke, die an
 *   Formularwerten hängen (Totfund, Motorfrage),
 * - **ab 320px**, der realistischen Untergrenze.
 *
 * Bei einem Befund nennt `expectNoHorizontalOverflow` das kleinste Element,
 * dessen Ausblenden den Überlauf beseitigt (Verfahren siehe
 * `helpers/overflow.ts`) — die nackte Pixelzahl von früher taugte zum
 * Diagnostizieren nicht.
 */

/* 320px ist die schmalste realistisch bediente Breite (iPhone SE 1. Gen. /
   Android-Kleingeräte), 890px die Breite, bei der der Vorgänger-Bug im Footer
   aufschlug. */
const BREITEN = [320, 360, 390, 640, 768, 890, 1024, 1280];

test.describe('Layout — horizontaler Überlauf', () => {
	/* Ein Lauf geht durch alle vier Schritte und baut dabei die Karte auf; die
	   30s des Projekt-Defaults reichen dafür auf einem kalten Dev-Server nicht. */
	test.setTimeout(90_000);

	for (const breite of BREITEN) {
		test(`kein Überlauf auf ${breite}px — alle Schritte, alles aufgeklappt`, async ({ page }) => {
			await page.setViewportSize({ width: breite, height: 900 });
			const formPage = new FormPage(page);
			/* Totfund über den Einstiegs-Zweig statt über den seit d7767383
			   entfallenen Schalter auf Schritt 2 (Begründung unten bei „Totfund-Block
			   und Motorfrage"). */
			await formPage.goto('totfund');

			// ── Schritt 1: Position & Zeitpunkt ────────────────────────────────
			await expectNoHorizontalOverflow(page, `${breite}px · Schritt 1`);

			/* Die Foto-Disclosure wird ausdrücklich einzeln erwartet: `openAllDetails`
			   arbeitet über alle `<details>` und bliebe still, wenn ausgerechnet
			   dieser Bereich verschwindet oder seine Test-ID verliert. */
			const fotoDisclosure = page.locator('[data-testid="photo-position-disclosure"]');
			await expect(fotoDisclosure).toBeAttached();

			await openAllDetails(page);
			await expect(fotoDisclosure).toHaveAttribute('open', '');
			// Ortsbeschreibung — ohne Koordinaten von Anfang an offen, hier nur belegt.
			await expect(page.locator('[data-testid="field-waterway"]')).toBeVisible();
			await expect(page.locator('[data-testid="photo-position-card"]')).toBeVisible();
			await expectNoHorizontalOverflow(page, `${breite}px · Schritt 1, alles aufgeklappt`);

			// ── Schritt 2: Angaben zum Tier ────────────────────────────────────
			await fillStep1(formPage);
			await formPage.clickNext();
			await expectCurrentStep(page, /Angaben zum Tier/i);

			await openAllDetails(page);
			await expectNoHorizontalOverflow(page, `${breite}px · Schritt 2`);

			/* Motorfrage ist an einen Formularwert gebunden, nicht an ein `<details>`
			   — sie existiert im Grundzustand gar nicht im DOM. Der Totfund-Block
			   dagegen steht hier bereits: anders als vor d7767383 hängt er nicht mehr
			   an einem Schalter auf diesem Schritt, sondern am Einstiegs-Zweig
			   (`formPage.goto('totfund')` oben) — der Schalter `[data-testid="field-
			   isDead"]` existiert im Bürgerformular nicht mehr, nur noch in der
			   Admin-Maske. */
			await formPage.selectSpecies(0); // Schweinswal
			await formPage.fillTotalCount(2);
			await formPage.selectDistance(1);
			await formPage.selectSightingFrom(SightingFromEnum.MOTORBOAT);
			await expect(page.locator('[data-testid="field-deadCondition"]')).toBeVisible();
			await expect(page.locator('[data-testid="field-boatDrive-1"]')).toBeVisible();
			await openAllDetails(page);
			await expectNoHorizontalOverflow(page, `${breite}px · Schritt 2, Totfund + Motorfrage`);

			/* `deadCondition` und `boatDrive` sind in dieser Kombination Pflicht
			   (Schema: `when('isDead')` bzw. `when('sightingFrom')`). Anders als vor
			   d7767383 lässt sich der Totfund-Zweig im Bürgerformular nicht mehr durch
			   Zurückschalten verlassen — für den Übergang zu Schritt 3 werden die
			   Felder deshalb jetzt tatsächlich befüllt statt den Schritt durch einen
			   gültigeren Zustand zu verlassen. */
			await page.locator('[data-testid="field-deadCondition"]').selectOption('1'); // Extrem frisch
			await formPage.selectBoatDrive(1); // Motor lief

			// ── Schritt 3: Weitere Informationen ───────────────────────────────
			await formPage.clickNext();
			await expectCurrentStep(page, /Weitere Informationen/i);

			await expectNoHorizontalOverflow(page, `${breite}px · Schritt 3`);
			await openAllDetails(page);
			await expectNoHorizontalOverflow(page, `${breite}px · Schritt 3, alles aufgeklappt`);

			// ── Schritt 4: Kontaktdaten ────────────────────────────────────────
			await formPage.clickNext();
			await expectCurrentStep(page, /Kontaktdaten/i);

			await expectNoHorizontalOverflow(page, `${breite}px · Schritt 4`);
			await openAllDetails(page);
			await expectNoHorizontalOverflow(page, `${breite}px · Schritt 4, alles aufgeklappt`);
		});
	}

	/**
	 * Dieselbe Prüfung ohne Silbentrennung.
	 *
	 * Die Feld-Beschriftungen tragen `hyphens: auto` (`FieldRenderer.svelte`,
	 * `BaseToggle.svelte`, …). Chromes Trennmuster kommen aus Wörterbüchern, die
	 * auf Headless-CI-Images fehlen können — dort ist `hyphens: auto` still
	 * wirkungslos und die Mindestbreite jedes Labels wächst auf sein längstes
	 * Wort. Ohne diesen Test wäre der Unterschied zwischen „hier grün" und „in CI
	 * rot" nicht sichtbar: Auf macOS trennt die Engine immer.
	 *
	 * Gemessen hat er sich bezahlt gemacht — mit dem damaligen `break-word` lief
	 * Schritt 3 auf 320px um 11px über, obwohl derselbe Zustand mit Trennung
	 * grün war.
	 */
	test('kein Überlauf auf 320px, auch ohne Silbentrennung', async ({ page }) => {
		const ohneTrennung = '* { hyphens: manual !important; -webkit-hyphens: manual !important; }';

		await page.setViewportSize({ width: 320, height: 900 });
		const formPage = new FormPage(page);
		await formPage.goto();

		/* Nach jedem Schrittwechsel neu: Der Schritt-Inhalt wird ausgetauscht, das
		   `<style>`-Tag bleibt zwar im `<head>`, aber ein zweiter Aufruf kostet
		   nichts und macht die Reihenfolge unabhängig von dieser Annahme. */
		await page.addStyleTag({ content: ohneTrennung });
		await openAllDetails(page);
		await expectNoHorizontalOverflow(page, '320px ohne Silbentrennung · Schritt 1');

		await fillStep1(formPage);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);
		await page.addStyleTag({ content: ohneTrennung });
		await openAllDetails(page);
		await expectNoHorizontalOverflow(page, '320px ohne Silbentrennung · Schritt 2');

		await fillStep2(formPage);
		await formPage.clickNext();
		await expectCurrentStep(page, /Weitere Informationen/i);
		await page.addStyleTag({ content: ohneTrennung });
		await openAllDetails(page);
		await expectNoHorizontalOverflow(page, '320px ohne Silbentrennung · Schritt 3');

		await formPage.clickNext();
		await expectCurrentStep(page, /Kontaktdaten/i);
		await page.addStyleTag({ content: ohneTrennung });
		await openAllDetails(page);
		await expectNoHorizontalOverflow(page, '320px ohne Silbentrennung · Schritt 4');
	});
});
