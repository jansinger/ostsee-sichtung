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

/**
 * `Object.assign(new Event('change'), { target: {...} })` — wie ursprünglich im
 * Task-Brief vorgesehen — scheitert im echten Browser (vitest-browser-svelte
 * läuft in echtem Chromium, nicht jsdom): `target` ist auf `Event.prototype`
 * ein Getter ohne Setter, ein ES-Modul läuft im Strict Mode, und die Zuweisung
 * wirft "Cannot set property target of #<Event> which has only a getter".
 * Stattdessen dasselbe Muster wie `UnifiedDropzone.svelte.test.ts`: `files` per
 * `Object.defineProperty` auf dem echten Input setzen und ein einfaches
 * `change`-Event dispatchen — der Browser befüllt `event.target` dann selbst.
 */
function dispatchFileChange(input: HTMLInputElement, files: File[]) {
	Object.defineProperty(input, 'files', { value: files, writable: false, configurable: true });
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('UnifiedDropzone — abgelehnte Dateien', () => {
	it('zeigt den Fehler dauerhaft an, nicht nur als Toast', async () => {
		render(UnifiedDropzone, { config: CONFIG, files: [], onFilesAdded: vi.fn() });

		const input = page.getByTestId('dropzone-input');
		dispatchFileChange(input.element() as HTMLInputElement, [
			new File([new Uint8Array(5000)], 'gross.jpg', { type: 'image/jpeg' })
		]);

		await expect.element(page.getByRole('alert')).toBeVisible();
		await expect.element(page.getByRole('alert')).toHaveTextContent(/gross\.jpg/);
	});

	it('räumt den Fehlerbereich, sobald eine gültige Datei folgt', async () => {
		render(UnifiedDropzone, { config: CONFIG, files: [], onFilesAdded: vi.fn() });

		const input = page.getByTestId('dropzone-input');
		dispatchFileChange(input.element() as HTMLInputElement, [
			new File([new Uint8Array(5000)], 'gross.jpg', { type: 'image/jpeg' })
		]);
		await expect.element(page.getByRole('alert')).toBeVisible();

		dispatchFileChange(input.element() as HTMLInputElement, [
			new File([new Uint8Array(100)], 'klein.jpg', { type: 'image/jpeg' })
		]);

		await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
	});
});
