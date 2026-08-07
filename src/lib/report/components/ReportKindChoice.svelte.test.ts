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
		await screen.getByRole('button', { name: /Weiter/i }).click();
		expect(onchoose).not.toHaveBeenCalled();
	});
});

/**
 * UX-Review (2026-08-06, Punkt 1): Der Knopf trug `aria-disabled`, solange nichts
 * gewählt war — und sagte nicht, warum. Zwei Wege liefen damit ins Leere:
 *
 * - **Maus, vor der Hydration.** DaisyUI setzt an `.btn[aria-disabled=true]`
 *   ein `pointer-events: none` (verifiziert in `node_modules/daisyui/components/
 *   button.css`, 5.7.4). Der Klick erreichte das Element also gar nicht. Auf einer
 *   schlechten Mobilverbindung am Strand sind das Sekunden, in denen die Seite
 *   kaputt wirkt.
 * - **Tastatur, nach der Hydration.** `pointer-events` bremst keine
 *   Enter-Taste — der Submit lief, der Wächter in `submit()` stieg still aus,
 *   angesagt wurde nichts.
 *
 * Der Knopf ist deshalb immer freigegeben; die Sperre ist eine Fehlermeldung an
 * der Gruppe. `aria-invalid` und `aria-describedby` gehören dabei ans
 * `fieldset` mit `role="radiogroup"`, nicht an die einzelnen Radios — ARIA 1.2
 * kennt beide an `role="radio"` nicht (`design-system.md`, A11y-Minima).
 */
describe('ReportKindChoice — Sperre ohne Auswahl ist eine Meldung, kein toter Knopf', () => {
	it('gibt den Weiter-Knopf frei, auch ohne Auswahl', async () => {
		const screen = render(ReportKindChoice, { onchoose: vi.fn() });

		const weiter = screen.getByRole('button', { name: /Weiter/i });
		await expect.element(weiter).not.toHaveAttribute('aria-disabled', 'true');
		await expect.element(weiter).not.toBeDisabled();
	});

	it('meldet die fehlende Auswahl beim Bestätigen', async () => {
		const screen = render(ReportKindChoice, { onchoose: vi.fn() });

		await screen.getByRole('button', { name: /Weiter/i }).click();

		await expect.element(screen.getByRole('alert')).toHaveTextContent(/Bitte wählen Sie aus/i);
	});

	it('markiert die Radiogruppe als fehlerhaft und verweist auf die Meldung', async () => {
		const screen = render(ReportKindChoice, { onchoose: vi.fn() });

		await screen.getByRole('button', { name: /Weiter/i }).click();

		const gruppe = screen.getByRole('radiogroup', { name: /Was möchten Sie melden/i });
		await expect.element(gruppe).toHaveAttribute('aria-invalid', 'true');

		const beschreibung = (await gruppe.element()).getAttribute('aria-describedby');
		expect(beschreibung).not.toBeNull();
		expect(document.getElementById(beschreibung as string)?.textContent).toMatch(
			/Bitte wählen Sie aus/i
		);
	});

	it('trägt die Fehlermarkierung nicht schon vor dem ersten Versuch', async () => {
		const screen = render(ReportKindChoice, { onchoose: vi.fn() });

		const gruppe = screen.getByRole('radiogroup', { name: /Was möchten Sie melden/i });
		await expect.element(gruppe).not.toHaveAttribute('aria-invalid');
		expect(document.querySelector('[role="alert"]')).toBeNull();
	});

	it('nimmt die Meldung zurück, sobald etwas gewählt wird', async () => {
		const screen = render(ReportKindChoice, { onchoose: vi.fn() });

		await screen.getByRole('button', { name: /Weiter/i }).click();
		await screen.getByRole('radio', { name: /toten Tieres/i }).click();

		const gruppe = screen.getByRole('radiogroup', { name: /Was möchten Sie melden/i });
		await expect.element(gruppe).not.toHaveAttribute('aria-invalid');
		expect(document.querySelector('[role="alert"]')).toBeNull();
	});

	it('führt den Fokus zur Gruppe, statt ihn beim Knopf zu lassen', async () => {
		const screen = render(ReportKindChoice, { onchoose: vi.fn() });

		await screen.getByRole('button', { name: /Weiter/i }).click();

		const ersteOption = document.querySelector('input[type="radio"]');
		expect(document.activeElement).toBe(ersteOption);
	});
});

/**
 * UX-Review (2026-08-06, Punkt 1), zweite Hälfte: Ein freigegebener Submit-Knopf
 * heißt, dass ein Klick VOR der Hydration den Browser das Formular nativ
 * abschicken lässt — der `onsubmit`-Wächter hängt zu diesem Zeitpunkt noch nicht
 * am DOM. Genau dieser Weg soll etwas Sinnvolles tun statt eines
 * Leerlauf-Reloads: Die Radios heißen deshalb `meldung` und tragen die
 * deutschen Parameterwerte aus `reportKindToParam` — ein nativer GET-Submit
 * landet damit auf `/?meldung=totfund`, und `resolveReportKind` löst das schon
 * serverseitig in den richtigen Zweig auf (`+page.svelte`).
 *
 * Nicht abgedeckt bleibt dabei, dass ein nativer GET-Submit die übrigen
 * Query-Parameter (Kampagnen-Marker aus einem Museums-Link) ersetzt — der
 * JS-Pfad hält sie in `choose()` erhalten, der JS-lose kann es ohne versteckte
 * Felder nicht. Bewusst in Kauf genommen: bisher passierte auf diesem Weg
 * überhaupt nichts.
 */
describe('ReportKindChoice — der Submit trägt ohne JS bereits den Zweig', () => {
	it('benennt die Radios nach dem Query-Parameter der Seite', () => {
		render(ReportKindChoice, { onchoose: vi.fn() });

		const radios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
		expect(radios.map((radio) => radio.name)).toEqual(['meldung', 'meldung']);
		expect(radios.map((radio) => radio.value)).toEqual(['lebend', 'totfund']);
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
