import { render } from 'vitest-browser-svelte';
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import BaseRadio from './BaseRadio.svelte';
import { PUBLIC_BOAT_DRIVE_OPTIONS } from '$lib/report/formOptions/boatDrive';

/**
 * `BaseRadio` war bis zur Motorfrage (PR 4, 2026-08-04) ein nie ausgeführter
 * Codepfad — kein einziges Feld des Sichtungsformulars nutzte `type: 'radio'`.
 * Diese Datei sichert das Verhalten ab, auf das sich `FieldRenderer` verlässt.
 */
describe('BaseRadio', () => {
	const options = PUBLIC_BOAT_DRIVE_OPTIONS;

	describe('Optionsliste', () => {
		it('rendert einen Radio-Input pro Option', async () => {
			const screen = render(BaseRadio, { options, name: 'boatDrive' });

			expect(screen.container.querySelectorAll('input[type="radio"]')).toHaveLength(options.length);
			await expect.element(page.getByText('Motor lief', { exact: true })).toBeVisible();
			await expect.element(page.getByText('Motor lief nicht')).toBeVisible();
		});

		it('rendert gar nichts ohne Optionen', async () => {
			const screen = render(BaseRadio, { options: [], name: 'boatDrive' });

			expect(screen.container.querySelector('input[type="radio"]')).toBeNull();
		});

		it('bindet alle Optionen unter denselben name — sonst wäre es keine Gruppe', async () => {
			const screen = render(BaseRadio, { options, name: 'boatDrive' });

			const namen = [...screen.container.querySelectorAll('input[type="radio"]')].map((radio) =>
				radio.getAttribute('name')
			);
			expect(new Set(namen)).toEqual(new Set(['boatDrive']));
		});

		it('hängt den Optionswert an die data-testid, damit E2E die Optionen unterscheiden kann', async () => {
			render(BaseRadio, { options, name: 'boatDrive', 'data-testid': 'field-boatDrive' });

			await expect.element(page.getByTestId('field-boatDrive-1')).toBeInTheDocument();
			await expect.element(page.getByTestId('field-boatDrive-6')).toBeInTheDocument();
		});
	});

	describe('Auswahl', () => {
		it('markiert die Option, die dem übergebenen Wert entspricht', async () => {
			render(BaseRadio, { options, name: 'boatDrive', value: 6 });

			await expect.element(page.getByRole('radio', { name: 'Motor lief nicht' })).toBeChecked();
			await expect
				.element(page.getByRole('radio', { name: 'Motor lief', exact: true }))
				.not.toBeChecked();
		});

		it('markiert nichts, solange kein Wert gesetzt ist', async () => {
			const screen = render(BaseRadio, { options, name: 'boatDrive' });

			expect(screen.container.querySelector('input[type="radio"]:checked')).toBeNull();
		});
	});

	describe('Feld-Icon', () => {
		it('zeichnet kein Icon — das gehört einmal an die Legende, nicht in jede Optionszeile', async () => {
			// `icon` ist bewusst KEIN Prop von BaseRadio (mehr): Die Komponente gab
			// es innerhalb der `{#each options}`-Schleife aus, bei zwei Optionen
			// stand derselbe Blitz also zweimal untereinander. `FieldRenderer`
			// rendert es jetzt einmal in der Legende der Radiogruppe — so wie
			// BaseInput/BaseSelect es einmal am Feld zeigen.
			//
			// Der Cast hält genau den Rückfall fest: Wer den Prop wieder ergänzt
			// und pro Option ausgibt, lässt diesen Test scheitern.
			const screen = render(BaseRadio, {
				options,
				name: 'boatDrive',
				icon: 'lucide:zap'
			} as never);

			expect(screen.container.querySelectorAll('svg')).toHaveLength(0);
		});
	});
});
