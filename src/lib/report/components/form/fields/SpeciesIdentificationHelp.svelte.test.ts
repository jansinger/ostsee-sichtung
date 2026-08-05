import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SpeciesIdentificationHelp from './SpeciesIdentificationHelp.svelte';

/**
 * Die Hilfe hat zwei Aufrufkontexte: eingebettet im Formular (zugeklappt, unter
 * einem Toggle, Überschriften ab h4) und als eigenständige Seite
 * (`/bestimmungshilfe` — sofort sichtbar, Überschriften ab h2, weil die `h1` der
 * Route gehört). Beides hängt an derselben Prop, damit die sinnlose Kombination
 * „aufgeklappt, aber h4" gar nicht erst konstruierbar ist.
 */
describe('SpeciesIdentificationHelp', () => {
	function root(): HTMLElement {
		return document.body;
	}

	describe('variant="inline" (Default)', () => {
		it('startet zugeklappt und zeigt den Inhalt erst nach Klick', async () => {
			render(SpeciesIdentificationHelp);

			expect(root().textContent).not.toContain('Im Zweifel nicht raten');

			const toggle = root().querySelector('button[aria-expanded]') as HTMLButtonElement | null;
			expect(toggle).not.toBeNull();
			expect(toggle?.getAttribute('aria-expanded')).toBe('false');

			toggle?.click();
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(root().textContent).toContain('Im Zweifel nicht raten');
		});

		it('beginnt die Hierarchie bei h4 und rendert keine h1/h2', async () => {
			render(SpeciesIdentificationHelp);

			(root().querySelector('button[aria-expanded]') as HTMLButtonElement | null)?.click();
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(root().querySelectorAll('h1, h2')).toHaveLength(0);
			// h3 stammt ausschließlich aus dem Bild-Modal und ist ohne offenes Modal nicht da.
			expect(root().querySelectorAll('h4').length).toBeGreaterThan(0);
		});
	});

	describe('variant="page"', () => {
		it('zeigt den Inhalt ohne Klick und bietet keinen Toggle an', () => {
			render(SpeciesIdentificationHelp, { variant: 'page' });

			expect(root().textContent).toContain('Im Zweifel nicht raten');
			expect(root().textContent).toContain('Wal oder Robbe?');
			expect(root().querySelector('button[aria-expanded]')).toBeNull();
		});

		it('rendert keine eigene h1 — die gehört der Route', () => {
			render(SpeciesIdentificationHelp, { variant: 'page' });

			expect(root().querySelectorAll('h1')).toHaveLength(0);
		});

		it('beginnt die Hierarchie bei h2 und rendert keine h5/h6', () => {
			render(SpeciesIdentificationHelp, { variant: 'page' });

			expect(root().querySelectorAll('h2').length).toBeGreaterThan(0);
			expect(root().querySelectorAll('h5, h6')).toHaveLength(0);
		});

		/**
		 * `text-xs` ist 12px. Auf einer Seite, die per Suchmaschine gefunden und an
		 * Deck gelesen wird, liegt das unter der Typografie-Untergrenze
		 * (design-system.md: `support` = 13px).
		 */
		it('nutzt keine 12px-Schrift', () => {
			render(SpeciesIdentificationHelp, { variant: 'page' });

			const withXs = Array.from(root().querySelectorAll('[class*="text-xs"]'));
			expect(withXs).toHaveLength(0);
		});
	});

	/**
	 * WCAG 2.1 4.1.2: Ein modaler Dialog braucht einen zugänglichen Namen, sonst
	 * meldet der Screenreader beim Öffnen nur „Dialog". Der Name ist hier der
	 * Bildtitel — er steht bereits als Überschrift im Dialog und wird per
	 * `aria-labelledby` referenziert, statt ihn als `aria-label` zu doppeln.
	 */
	describe('Bild-Modal', () => {
		const TRIGGER_SELECTOR = 'button[aria-label$="in Originalgröße anzeigen"]';

		function imageDialogs(): HTMLDialogElement[] {
			return Array.from(
				document.querySelectorAll<HTMLDialogElement>('[data-testid="species-image-dialog"]')
			);
		}

		function firstImageDialog(): HTMLDialogElement {
			const dialog = imageDialogs()[0];
			if (!dialog) throw new Error('Bild-Modal nicht im DOM');
			return dialog;
		}

		/** Öffnet in jeder Instanz das erste Artfoto. */
		async function openFirstImageIn(dialog: HTMLDialogElement): Promise<HTMLButtonElement> {
			// Der Auslöser liegt neben dem Dialog im selben Render-Container — über
			// `document` gesucht träfe man bei zwei Instanzen immer die erste.
			const trigger = dialog.parentElement?.querySelector<HTMLButtonElement>(TRIGGER_SELECTOR);
			if (!trigger) throw new Error('Kein Bild-Auslöser in dieser Instanz');
			trigger.click();
			// Die Überschrift hängt an `modalImageSrc` und entsteht erst mit dem
			// nächsten Render — direkt nach dem Klick ist der Dialog noch leer.
			await new Promise((resolve) => setTimeout(resolve, 0));
			return trigger;
		}

		it('benennt den geöffneten Dialog über seine Überschrift', async () => {
			render(SpeciesIdentificationHelp, { variant: 'page' });

			const dialog = firstImageDialog();
			const trigger = await openFirstImageIn(dialog);

			const labelId = dialog.getAttribute('aria-labelledby');
			expect(labelId).toBeTruthy();

			const heading = dialog.querySelector(`#${CSS.escape(labelId as string)}`);
			expect(heading).not.toBeNull();

			// Erst auf Inhalt prüfen, dann vergleichen: `toContain('')` ginge sonst
			// immer durch und der Test bestünde auch bei namenlosem Dialog.
			const headingText = heading?.textContent?.trim() ?? '';
			expect(headingText.length).toBeGreaterThan(0);
			// Der Auslöser trägt denselben Bildtitel („<alt> in Originalgröße
			// anzeigen"): Name des Dialogs und Name des Auslösers gehören zusammen.
			expect(trigger.getAttribute('aria-label')).toContain(headingText);
		});

		it('nennt den geschlossenen Dialog keinen Titel, den es nicht gibt', () => {
			// Ohne Bild steht die Überschrift nicht im DOM. Ein dann gesetztes
			// `aria-labelledby` wäre ein ungültiger IDREF — DaisyUI blendet den
			// Dialog nur per `visibility` aus, er bleibt also stehen.
			render(SpeciesIdentificationHelp, { variant: 'page' });

			const dialog = firstImageDialog();

			expect(dialog.open).toBe(false);
			expect(dialog.hasAttribute('aria-labelledby')).toBe(false);
		});

		it('benennt zwei gleichzeitige Instanzen getrennt', async () => {
			// Die Hilfe steht im Formular am Tierart-Feld und zusätzlich als
			// eigenständige Seite. Eine feste ID wäre im DOM doppelt und machte
			// `aria-labelledby` unbrauchbar.
			render(SpeciesIdentificationHelp, { variant: 'page' });
			render(SpeciesIdentificationHelp, { variant: 'page' });

			const dialogs = imageDialogs();
			expect(dialogs).toHaveLength(2);
			for (const dialog of dialogs) await openFirstImageIn(dialog);

			const labels = dialogs.map((element) => element.getAttribute('aria-labelledby'));

			// Jeden Wert einzeln prüfen: `new Set(['id', null]).size` ist ebenfalls 2 —
			// eine Instanz ganz ohne Attribut käme sonst als „getrennt" durch.
			for (const label of labels) expect(label).toBeTruthy();
			expect(new Set(labels).size).toBe(2);
		});
	});

	/**
	 * Die zwölf Arten bleiben in beiden Varianten zugeklappt: aufgeklappt wären es
	 * zwölf Steckbriefe mit je ein bis zwei Fotos auf einer Seite.
	 */
	it('lässt die Arten-Akkordeons auch auf der Seite zugeklappt', () => {
		render(SpeciesIdentificationHelp, { variant: 'page' });

		const accordions = Array.from(root().querySelectorAll('details'));
		expect(accordions.length).toBeGreaterThan(0);
		expect(accordions.every((d) => !d.open)).toBe(true);
	});
});
