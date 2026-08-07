import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';
import type { SightingFormData } from '$lib/types';
import FormActions from './FormActions.svelte';

/**
 * Die Rückmeldung „Sie melden: … · [Ändern]" stand am Kopf von Schritt 1 und
 * ein zweites Mal in der Karte „Tierinformationen" auf Schritt 2. Oben kostete
 * sie genau den Platz, an dem er am knappsten ist — auf dem Telefon steht
 * dort bereits Titel, Schritt-Anzeige und Schritt-Überschrift, bevor das erste
 * Feld erscheint. Sie steht deshalb jetzt einmal in der Aktionszeile unten,
 * neben „Formular zurücksetzen": Beides sind Korrekturen an der Meldung als
 * Ganzes, keine Eingabe — und die Zeile gilt für alle vier Schritte, der
 * Korrekturweg ist damit sogar an zwei Stellen mehr erreichbar als vorher.
 */
function renderActions(
	overrides: Partial<SightingFormData> = {},
	onchangekind = vi.fn()
): ReturnType<typeof vi.fn> {
	renderWithFormContext(FormActions, { overrides, props: { onchangekind } });
	return onchangekind;
}

describe('FormActions — Rückmeldung steht neben „Zurücksetzen"', () => {
	it('zeigt die Rückmeldung zum gewählten Zweig in der Aktionszeile', async () => {
		renderActions({ isDead: false });

		await expect.element(page.getByText(/Sie melden/i)).toBeInTheDocument();
		await expect.element(page.getByText(/Beobachtung eines lebenden Tieres/i)).toBeInTheDocument();
	});

	it('behält den Zurücksetzen-Knopf', async () => {
		renderActions({ isDead: false });

		await expect.element(page.getByRole('button', { name: /zurücksetzen/i })).toBeInTheDocument();
	});

	// Beide Knöpfe stehen im selben Container — das ist die eigentliche
	// Aussage der Änderung. Ein Test, der nur „beide sind im DOM" prüft,
	// bliebe grün, wenn die Rückmeldung wieder nach oben wanderte.
	it('stellt beide Knöpfe in dieselbe Aktionszeile', () => {
		renderActions({ isDead: false });

		const zeile = document.querySelector('[data-testid="form-actions"]');
		expect(zeile).not.toBeNull();
		expect(zeile?.textContent).toContain('Sie melden');
		expect(zeile?.querySelector('button[data-testid="report-kind-change"]')).not.toBeNull();
		expect(zeile?.textContent).toContain('Formular zurücksetzen');
	});

	it('ruft onchangekind auf, wenn „Ändern" geklickt wird', async () => {
		const onchangekind = renderActions({ isDead: true });

		await page.getByRole('button', { name: /ändern/i }).click();

		expect(onchangekind).toHaveBeenCalledOnce();
	});
});
