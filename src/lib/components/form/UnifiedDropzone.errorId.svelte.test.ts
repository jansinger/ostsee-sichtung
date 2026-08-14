/**
 * Befund 2 (PR #682 Review): Die Dropzone erzeugte pro Instanz eine
 * eindeutige `inputId`, verwies in `aria-describedby` (Zeile 282) und am
 * Fehlerbereich selbst (Zeile 333) aber auf die feste Zeichenkette
 * `dropzone-errors`. Zwei Dropzones auf einer Seite ergaben damit doppelte
 * IDs, und ein Screenreader konnte das falsche Element verknüpfen.
 *
 * Dieser Test rendert zwei Instanzen gleichzeitig (wie z. B. Formularschritt
 * + Admin-Maske) und prüft, dass jede ihren eigenen Fehlerbereich per
 * `aria-describedby` referenziert.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import UnifiedDropzone from './UnifiedDropzone.svelte';

const CONFIG = {
	allowedTypes: ['image/jpeg', 'video/mp4'],
	maxFileSize: 1024,
	maxVideoFileSize: 2048,
	maxFiles: 5,
	accept: 'image/*,video/*'
};

function dispatchFileChange(input: HTMLInputElement, files: File[]) {
	Object.defineProperty(input, 'files', { value: files, writable: false, configurable: true });
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('UnifiedDropzone — Fehlerbereichs-ID bei mehreren Instanzen', () => {
	it('verknüpft aria-describedby mit einer eindeutigen ID, nicht mit einer festen Zeichenkette', async () => {
		await render(UnifiedDropzone, { config: CONFIG, files: [], onFilesAdded: vi.fn() });
		await render(UnifiedDropzone, { config: CONFIG, files: [], onFilesAdded: vi.fn() });

		const inputs = page.getByTestId('dropzone-input').all();
		expect(inputs.length).toBe(2);

		dispatchFileChange(inputs[0]!.element() as HTMLInputElement, [
			new File([new Uint8Array(5000)], 'gross-1.jpg', { type: 'image/jpeg' })
		]);
		dispatchFileChange(inputs[1]!.element() as HTMLInputElement, [
			new File([new Uint8Array(5000)], 'gross-2.jpg', { type: 'image/jpeg' })
		]);

		await expect.poll(() => page.getByTestId('dropzone-errors').all().length).toBe(2);

		const errorRegions = page.getByTestId('dropzone-errors').all();
		const errorIds = errorRegions.map((el) => (el.element() as HTMLElement).id);
		// Keine doppelten IDs im Dokument — sonst verweist aria-describedby auf
		// die erste Übereinstimmung, egal welches Element es meint.
		expect(new Set(errorIds).size).toBe(2);
		expect(errorIds[0]).not.toBe('dropzone-errors');
		expect(errorIds[1]).not.toBe('dropzone-errors');

		const describedByValues = inputs.map((input) =>
			(input.element() as HTMLInputElement).getAttribute('aria-describedby')
		);

		// Jedes Input verweist auf seinen EIGENEN Fehlerbereich.
		expect(describedByValues[0]).toBe(errorIds[0]);
		expect(describedByValues[1]).toBe(errorIds[1]);
		expect(describedByValues[0]).not.toBe(describedByValues[1]);
	});
});
