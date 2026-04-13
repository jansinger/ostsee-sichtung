import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import LoadingOverlay from './LoadingOverlay.svelte';

function getDialog(): HTMLElement {
	const dialog = document.querySelector('[aria-labelledby="loading-title"]');
	if (!(dialog instanceof HTMLElement)) {
		throw new Error('Loading dialog not found');
	}
	return dialog;
}

describe('LoadingOverlay', () => {
	it('rendert nichts wenn isVisible false ist', () => {
		render(LoadingOverlay, { isVisible: false, type: 'initial' });

		expect(document.querySelector('[aria-labelledby="loading-title"]')).toBeNull();
	});

	it('rendert Dialog mit ARIA-Attributen und Initial-Hinweis', () => {
		render(LoadingOverlay, { isVisible: true, type: 'initial' });

		const dialog = getDialog();
		expect(dialog.getAttribute('role')).toBe('dialog');
		expect(dialog.getAttribute('aria-modal')).toBe('true');
		expect(dialog.getAttribute('aria-labelledby')).toBe('loading-title');
		expect(document.body.textContent).toContain('Karte wird initialisiert...');
		expect(document.body.textContent).toContain('Verwenden Sie H für Tastaturkürzel');
	});

	it('zeigt den passenden Text für Filter-Ladevorgänge', () => {
		render(LoadingOverlay, { isVisible: true, type: 'filter' });

		expect(document.body.textContent).toContain('Filter werden angewendet...');
		expect(document.body.textContent).not.toContain('Verwenden Sie H für Tastaturkürzel');
	});
});