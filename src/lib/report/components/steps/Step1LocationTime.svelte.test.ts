import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';
import type { SightingFormData } from '$lib/types';
import Step1LocationTime from './Step1LocationTime.svelte';

/**
 * B6 (Abschlussreview, wichtig): Auf Schritt 1 gab es keinen Weg zurück zur
 * Einstiegsseite — genau dort merkt der Melder am ehesten, dass er falsch
 * abgebogen ist („Funddatum" statt „Datum und Uhrzeit"). Der einzige
 * Korrekturweg lag auf Schritt 2, unterhalb der Upload-Karte. Die Rückmeldung
 * „Sie melden: … · [Ändern]" (bisher nur in `sections/AnimalInfo.svelte`)
 * steht jetzt zusätzlich am Kopf von Schritt 1 — dieselbe Komponente
 * (`ReportKindFeedback.svelte`), damit die Regel nicht zweimal existiert.
 */
function renderStep1(
	overrides: Partial<SightingFormData> = {},
	onchangekind = vi.fn()
): ReturnType<typeof vi.fn> {
	renderWithFormContext(Step1LocationTime, { overrides, props: { onchangekind } });
	return onchangekind;
}

describe('Step1LocationTime — Rückmeldung zum gewählten Zweig (B6)', () => {
	it('zeigt die Rückmeldung „Sie melden" bereits auf Schritt 1', async () => {
		renderStep1({ isDead: false });

		await expect.element(page.getByText(/Sie melden/i)).toBeInTheDocument();
	});

	it('nennt den Totfund-Zweig korrekt', async () => {
		renderStep1({ isDead: true });

		await expect.element(page.getByText(/Fund eines toten Tieres/i)).toBeInTheDocument();
	});

	it('nennt den Lebend-Zweig korrekt', async () => {
		renderStep1({ isDead: false });

		await expect.element(page.getByText(/Beobachtung eines lebenden Tieres/i)).toBeInTheDocument();
	});

	it('ruft onchangekind auf, wenn „Ändern" auf Schritt 1 geklickt wird', async () => {
		const onchangekind = renderStep1({ isDead: false });

		await page.getByRole('button', { name: /ändern/i }).click();

		expect(onchangekind).toHaveBeenCalledOnce();
	});
});
