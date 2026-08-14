import { render } from 'vitest-browser-svelte';
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import BaseToggle from './BaseToggle.svelte';

/**
 * `BaseToggle` setzte seine Klasse hart auf `toggle toggle-primary` und nahm
 * `hasError`/`isValid` gar nicht erst als Props an — `FieldRenderer` reichte
 * beide über `toggleProps` durch, in der Komponente fielen sie still weg.
 *
 * Für die Klassen-Emission gilt dasselbe wie bei Radio und Checkbox. Dass die
 * Klasse im **ausgeschalteten** Zustand überhaupt Farbe trägt, ist dagegen
 * nicht DaisyUIs Verhalten, sondern kommt aus einem Override in `src/app.css`
 * — abgesichert in `e2e/form-a11y.spec.ts`, nicht hier (eine Klassenliste
 * belegt keine Optik).
 */
describe('BaseToggle', () => {
	function toggleOf(container: HTMLElement): HTMLInputElement {
		const el = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
		if (!el) throw new Error('Kein Toggle-Input gerendert');
		return el;
	}

	/**
	 * `toggle-error`/`toggle-success` **ersetzen** `toggle-primary`, sie ergänzen
	 * es nicht: Alle drei setzen dieselbe DaisyUI-Variable (`--input-color`) auf
	 * derselben Ebene (`daisyui.l1.l2`) und mit derselben Spezifität. Stünden
	 * zwei am Element, entschiede die Reihenfolge im DaisyUI-Stylesheet, nicht
	 * die im `class`-Attribut.
	 */
	describe('Fehler-Optik', () => {
		it('nutzt toggle-error statt toggle-primary bei hasError', async () => {
			const screen = await render(BaseToggle, { label: 'Totfund', hasError: true });

			const toggle = toggleOf(screen.container);
			expect(toggle.classList.contains('toggle-error')).toBe(true);
			expect(toggle.classList.contains('toggle-primary')).toBe(false);
		});

		it('nutzt toggle-success statt toggle-primary bei isValid', async () => {
			const screen = await render(BaseToggle, { label: 'Totfund', isValid: true });

			const toggle = toggleOf(screen.container);
			expect(toggle.classList.contains('toggle-success')).toBe(true);
			expect(toggle.classList.contains('toggle-primary')).toBe(false);
		});

		it('bleibt ohne Zustand auf toggle-primary', async () => {
			const screen = await render(BaseToggle, { label: 'Totfund' });

			const toggle = toggleOf(screen.container);
			expect(toggle.classList.contains('toggle-primary')).toBe(true);
			expect(toggle.classList.contains('toggle-error')).toBe(false);
			expect(toggle.classList.contains('toggle-success')).toBe(false);
		});

		it('zeigt den Fehler-Zustand auch dann, wenn isValid gleichzeitig gesetzt ist', async () => {
			const screen = await render(BaseToggle, {
				label: 'Totfund',
				hasError: true,
				isValid: true
			});

			const toggle = toggleOf(screen.container);
			expect(toggle.classList.contains('toggle-error')).toBe(true);
			expect(toggle.classList.contains('toggle-success')).toBe(false);
		});

		/**
		 * Der wahrscheinlichste Fehlerfall eines Pflicht-Toggles ist der
		 * **ausgeschaltete** („muss zugestimmt werden"). Die Klasse muss deshalb
		 * unabhängig von `checked` am Element stehen — dass sie dort auch Farbe
		 * trägt, leistet der `app.css`-Override.
		 */
		it('trägt den Fehler-Zustand auch im ausgeschalteten Zustand', async () => {
			const screen = await render(BaseToggle, {
				label: 'Totfund',
				checked: false,
				hasError: true
			});

			const toggle = toggleOf(screen.container);
			expect(toggle.checked).toBe(false);
			expect(toggle.classList.contains('toggle-error')).toBe(true);
		});
	});

	/** Die Größen-Klasse darf durch den Zustands-Zweig nicht verloren gehen. */
	describe('Größen', () => {
		it('behält die Größen-Klasse neben dem Fehler-Zustand', async () => {
			const screen = await render(BaseToggle, {
				label: 'Totfund',
				size: 'sm' as const,
				hasError: true
			});

			const toggle = toggleOf(screen.container);
			expect(toggle.classList.contains('toggle-sm')).toBe(true);
			expect(toggle.classList.contains('toggle-error')).toBe(true);
		});
	});

	/**
	 * Anders als beim Radio sind `aria-invalid`/`aria-required` hier gültig und
	 * `svelte-check` akzeptiert sie. Sie bleiben deshalb am Input — die
	 * Zustands-Klasse tritt daneben, nicht an ihre Stelle.
	 *
	 * Der Toggle ist eine gestylte Checkbox: `<input type="checkbox">` ohne
	 * `role`-Attribut, seine implizite Rolle ist damit `checkbox` — nicht
	 * `switch`. Für die Aussage oben ändert das nichts, beide Rollen
	 * unterstützen die zwei Attribute. Wer den Toggle später auf
	 * `role="switch"` umstellt (was `aria-checked` nach sich zöge), muss diese
	 * Zeilen deshalb nicht anfassen.
	 */
	describe('ARIA bleibt am Input', () => {
		it('setzt aria-invalid und behält daneben die Fehler-Optik', async () => {
			const screen = await render(BaseToggle, {
				label: 'Totfund',
				hasError: true,
				'aria-invalid': true
			});

			const toggle = toggleOf(screen.container);
			expect(toggle.getAttribute('aria-invalid')).toBe('true');
			expect(toggle.classList.contains('toggle-error')).toBe(true);
		});

		it('setzt aria-required', async () => {
			const screen = await render(BaseToggle, {
				label: 'Totfund',
				required: true,
				'aria-required': true
			});

			expect(toggleOf(screen.container).getAttribute('aria-required')).toBe('true');
		});
	});

	describe('Beschriftung', () => {
		it('zeigt das Label', async () => {
			await render(BaseToggle, { label: 'Totfund' });

			await expect.element(page.getByText('Totfund')).toBeVisible();
		});
	});
});
