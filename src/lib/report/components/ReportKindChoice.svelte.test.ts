import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import ReportKindChoice from './ReportKindChoice.svelte';

describe('ReportKindChoice', () => {
	it('stellt die Frage als Radiogruppe, nicht als zwei lose Buttons', async () => {
		const screen = render(ReportKindChoice, { onchoose: vi.fn() });
		const gruppe = screen.getByRole('radiogroup', { name: /Was möchten Sie melden/i });
		await expect.element(gruppe).toBeInTheDocument();
	});

	it('bietet beide Zweige an, lebendes Tier zuerst', async () => {
		const screen = render(ReportKindChoice, { onchoose: vi.fn() });
		await expect
			.element(screen.getByRole('radio', { name: /lebenden Tieres/i }))
			.toBeInTheDocument();
		await expect.element(screen.getByRole('radio', { name: /toten Tieres/i })).toBeInTheDocument();
	});

	it('meldet erst beim Bestätigen, nicht schon beim Auswählen', async () => {
		// Kein Auto-Advance: Wer per Pfeiltaste durch eine Radiogruppe geht,
		// wählt zwangsläufig die erste Option aus und würde sonst ungewollt
		// weitergeschickt (WCAG 3.2.2).
		const onchoose = vi.fn();
		const screen = render(ReportKindChoice, { onchoose });

		await screen.getByRole('radio', { name: /toten Tieres/i }).click();
		expect(onchoose).not.toHaveBeenCalled();

		await screen.getByRole('button', { name: /Weiter/i }).click();
		expect(onchoose).toHaveBeenCalledWith('dead');
	});

	it('lässt sich nicht ohne Auswahl bestätigen', async () => {
		const onchoose = vi.fn();
		const screen = render(ReportKindChoice, { onchoose });
		await screen.getByRole('button', { name: /Weiter/i }).click({ force: true });
		expect(onchoose).not.toHaveBeenCalled();
	});
});

/**
 * B7 (Abschlussreview, wichtig): „Ändern" ersetzte den gesamten Formularbaum
 * durch die Einstiegsseite — der auslösende Knopf verschwand, der Fokus fiel
 * auf `<body>`, angesagt wurde nichts. Das Formular macht es an jedem
 * Schrittwechsel bereits richtig (`scrollAndFocusStep` in
 * `form/StepNavigation.svelte`): Kopf des neuen Inhalts fokussieren, damit ein
 * Screenreader ihn ansagt.
 *
 * Fokussiert wird die `<legend>` „Was möchten Sie melden?", nicht die `<h1>`:
 * Die Überschrift ist im iframe bewusst ausgeblendet (Abschlussreview,
 * Politur — dieselbe Bedingung wie in `ModernReportForm.svelte`), die Legend
 * dagegen immer vorhanden. Ein Fokus auf ein bedingt fehlendes Element wäre im
 * iframe wirkungslos — genau der Fall, den dieser Test über `document.getElementById`
 * statt über die (im iframe unsichtbare) Rolle „heading" prüft.
 *
 * `autofocusHeading` ist bewusst `false` per Default: Beim allerersten
 * Seitenaufruf (keine vorherige Formularansicht) ist die Auswahlseite kein
 * „Wechsel" — ein Fokus-Sprung dorthin verschöbe für Tastaturnutzer nur den
 * ersten Tab-Stopp hinter die Navigation, ohne Nutzen. Der Fokus-Sprung gilt
 * ausschließlich dem Rücksprung aus dem Formular (Ändern, Reset, Browser-
 * Zurück) — `+page.svelte` setzt das Prop dafür gezielt.
 */
describe('ReportKindChoice — Fokus beim Rücksprung aus dem Formular (B7)', () => {
	it('fokussiert die Legend, wenn autofocusHeading gesetzt ist', async () => {
		vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

		render(ReportKindChoice, { onchoose: vi.fn(), autofocusHeading: true });
		await tick();

		const legend = document.getElementById('report-kind-legend');
		expect(legend).not.toBeNull();
		expect(document.activeElement).toBe(legend);
	});

	it('lässt den Fokus beim allerersten Aufruf unangetastet (kein Prop)', async () => {
		vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

		render(ReportKindChoice, { onchoose: vi.fn() });
		await tick();

		const legend = document.getElementById('report-kind-legend');
		expect(document.activeElement).not.toBe(legend);
	});
});

/**
 * Politur (Abschlussreview, nicht blockierend): `ModernReportForm.svelte`
 * unterdrückt seine `<h1>` bewusst im iframe (die Museumsseite trägt ihre
 * eigene Überschrift) — die Einstiegsseite tat das bisher nicht. Der
 * eingebettete Besucher sah „Meerestier melden" doppelt, und nach „Weiter"
 * verschwand der Titel wieder, was den Höhensprung im iframe vergrößerte.
 *
 * `window.top !== window` in dieser Testumgebung (Vitest Browser Mode rendert
 * jede Testdatei in einem eigenen iframe) — `isNotIFrame` ist hier immer
 * `false`, derselbe Zustand wie in `ModernReportForm.svelte.test.ts`, das aus
 * genau diesem Grund den umgekehrten Fall („Titel sichtbar, echtes
 * Top-Fenster") ebenfalls nicht unit-testet.
 */
describe('ReportKindChoice — Seitentitel im iframe unterdrückt (Politur)', () => {
	it('rendert die H1 „Meerestier melden" in dieser (iframe-artigen) Testumgebung nicht', () => {
		render(ReportKindChoice, { onchoose: vi.fn() });

		expect(document.querySelector('h1')).toBeNull();
	});
});
