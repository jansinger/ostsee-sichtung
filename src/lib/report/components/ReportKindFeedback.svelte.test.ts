import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';
import type { SightingFormData } from '$lib/types';
import ReportKindFeedback from './ReportKindFeedback.svelte';

/**
 * B6 (Abschlussreview): Auf Schritt 1 fehlte ein Korrekturweg zurück zur
 * Einstiegsseite — die Rückmeldung „Sie melden: … · [Ändern]" stand nur auf
 * Schritt 2 (`sections/AnimalInfo.svelte`). Damit sie an zwei Stellen stehen
 * kann, ohne dass die Regel zweimal existiert, ist sie hierher ausgelagert.
 * Dieser Test deckt die Komponente isoliert ab; `AnimalInfo.svelte.test.ts`
 * und `Step1LocationTime.svelte.test.ts` prüfen die jeweilige Einbindung.
 */
function renderFeedback(
	overrides: Partial<SightingFormData> = {},
	onchangekind = vi.fn()
): ReturnType<typeof vi.fn> {
	renderWithFormContext(ReportKindFeedback, { overrides, props: { onchangekind } });
	return onchangekind;
}

describe('ReportKindFeedback — Wortlaut normalisiert isDead', () => {
	it('zeigt „Fund eines toten Tieres" bei einem Totfund', async () => {
		renderFeedback({ isDead: true });

		await expect.element(page.getByText(/Fund eines toten Tieres/i)).toBeInTheDocument();
	});

	it('zeigt „Beobachtung eines lebenden Tieres" bei einer Sichtung', async () => {
		renderFeedback({ isDead: false });

		await expect.element(page.getByText(/Beobachtung eines lebenden Tieres/i)).toBeInTheDocument();
	});

	// Derselbe Beleg wie in AnimalInfo.svelte.test.ts: '0' ist im JS truthy, ein
	// roher Ternär träfe hier die falsche Antwort. isDeadFinding normalisiert.
	it('behandelt den truthy String "0" korrekt als Sichtung', async () => {
		renderFeedback({ isDead: '0' as unknown as boolean });

		await expect.element(page.getByText(/Beobachtung eines lebenden Tieres/i)).toBeInTheDocument();
	});
});

describe('ReportKindFeedback — „Ändern" ruft das Callback auf', () => {
	it('ruft onchangekind beim Klick auf', async () => {
		const onchangekind = renderFeedback({ isDead: true });

		await page.getByRole('button', { name: /ändern/i }).click();

		expect(onchangekind).toHaveBeenCalledOnce();
	});
});

/**
 * Spec §7.5 schreibt „Sie melden: … **·** [Ändern]" — der Trennpunkt fehlte im
 * Markup. Er trägt keine Bedeutung und bekommt deshalb `aria-hidden="true"`
 * (Projektregel, siehe `design-system.md`, „*-Regel"-Abschnitt zu bedeutungslosen
 * Zeichen).
 */
describe('ReportKindFeedback — Trennpunkt aus Spec §7.5', () => {
	it('rendert einen Trennpunkt zwischen der Antwort und „Ändern"', () => {
		renderFeedback({ isDead: false });

		expect(document.body.textContent).toContain('·');
	});

	it('markiert den Trennpunkt als aria-hidden', () => {
		renderFeedback({ isDead: false });

		const dot = Array.from(document.querySelectorAll('[aria-hidden="true"]')).find((el) =>
			el.textContent?.includes('·')
		);
		expect(dot).toBeDefined();
	});
});
