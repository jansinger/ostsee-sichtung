import { render } from 'vitest-browser-svelte';
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
