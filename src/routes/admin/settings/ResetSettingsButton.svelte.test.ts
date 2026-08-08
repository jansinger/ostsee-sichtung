/**
 * Der Reset-Button ist eine destruktive Aktion (X2 im Admin-Improvements-Spec):
 * ein Klick darf niemals sofort zurücksetzen, sondern muss erst den
 * Bestätigungsdialog öffnen. Erst "Endgültig zurücksetzen" löst den Callback aus,
 * "Abbrechen" und das Schließen des Dialogs nie.
 */
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import ResetSettingsButton from './ResetSettingsButton.svelte';

describe('ResetSettingsButton', () => {
	it('öffnet den Bestätigungsdialog statt sofort zurückzusetzen', async () => {
		const onReset = vi.fn();
		render(ResetSettingsButton, { onReset });

		await page.getByRole('button', { name: 'Zurücksetzen' }).click();

		await expect
			.element(page.getByRole('heading', { name: 'Einstellungen zurücksetzen' }))
			.toBeVisible();
		expect(onReset).not.toHaveBeenCalled();
	});

	it('löst den Reset erst beim Bestätigen aus', async () => {
		const onReset = vi.fn();
		render(ResetSettingsButton, { onReset });

		await page.getByRole('button', { name: 'Zurücksetzen' }).click();
		await page.getByRole('button', { name: 'Endgültig zurücksetzen' }).click();

		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it('bricht ohne Reset ab, wenn "Abbrechen" geklickt wird', async () => {
		const onReset = vi.fn();
		render(ResetSettingsButton, { onReset });

		await page.getByRole('button', { name: 'Zurücksetzen' }).click();
		await page.getByRole('button', { name: 'Abbrechen' }).click();

		expect(onReset).not.toHaveBeenCalled();
	});
});
