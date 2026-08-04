import { render } from 'vitest-browser-svelte';
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import BaseCheckbox from './BaseCheckbox.svelte';

/**
 * `BaseCheckbox` setzte seine Klasse hart auf `checkbox checkbox-primary` und
 * nahm `hasError`/`isValid` gar nicht erst als Props an — `FieldRenderer` reichte
 * beide über `checkboxProps` durch, in der Komponente fielen sie still weg. Ein
 * Feld mit Validierungsfehler sah damit aus wie ein fehlerfreies.
 *
 * Diese Datei sichert die Zustands-Optik ab, analog zu `BaseRadio.svelte.test.ts`.
 */
describe('BaseCheckbox', () => {
	function checkboxOf(container: HTMLElement): HTMLInputElement {
		const el = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
		if (!el) throw new Error('Kein Checkbox-Input gerendert');
		return el;
	}

	/**
	 * `checkbox-error`/`checkbox-success` **ersetzen** `checkbox-primary`, sie
	 * ergänzen es nicht: Alle drei setzen dieselbe DaisyUI-Variable
	 * (`--input-color`) auf derselben Ebene (`daisyui.l1.l2`) und mit derselben
	 * Spezifität. Stünden zwei am Element, entschiede die Reihenfolge im
	 * DaisyUI-Stylesheet, nicht die im `class`-Attribut.
	 */
	describe('Fehler-Optik', () => {
		it('nutzt checkbox-error statt checkbox-primary bei hasError', async () => {
			const screen = render(BaseCheckbox, { label: 'Totfund', hasError: true });

			const box = checkboxOf(screen.container);
			expect(box.classList.contains('checkbox-error')).toBe(true);
			expect(box.classList.contains('checkbox-primary')).toBe(false);
		});

		it('nutzt checkbox-success statt checkbox-primary bei isValid', async () => {
			const screen = render(BaseCheckbox, { label: 'Totfund', isValid: true });

			const box = checkboxOf(screen.container);
			expect(box.classList.contains('checkbox-success')).toBe(true);
			expect(box.classList.contains('checkbox-primary')).toBe(false);
		});

		it('bleibt ohne Zustand auf checkbox-primary', async () => {
			const screen = render(BaseCheckbox, { label: 'Totfund' });

			const box = checkboxOf(screen.container);
			expect(box.classList.contains('checkbox-primary')).toBe(true);
			expect(box.classList.contains('checkbox-error')).toBe(false);
			expect(box.classList.contains('checkbox-success')).toBe(false);
		});

		it('zeigt den Fehler-Zustand auch dann, wenn isValid gleichzeitig gesetzt ist', async () => {
			const screen = render(BaseCheckbox, {
				label: 'Totfund',
				hasError: true,
				isValid: true
			});

			const box = checkboxOf(screen.container);
			expect(box.classList.contains('checkbox-error')).toBe(true);
			expect(box.classList.contains('checkbox-success')).toBe(false);
		});

		/**
		 * Der Fehler-Zustand darf nicht am Häkchen hängen: Der wahrscheinlichste
		 * Fehlerfall einer Pflicht-Checkbox ist die **nicht** angehakte
		 * („muss zugestimmt werden"). `.checkbox` bezieht seinen Rahmen unbedingt
		 * aus `var(--input-color)` — anders als der Toggle, dessen Zustandsklassen
		 * nur unter `:checked` greifen (siehe `BaseToggle.svelte.test.ts`).
		 */
		it('trägt den Fehler-Zustand auch ohne Häkchen', async () => {
			const screen = render(BaseCheckbox, {
				label: 'Totfund',
				checked: false,
				hasError: true
			});

			const box = checkboxOf(screen.container);
			expect(box.checked).toBe(false);
			expect(box.classList.contains('checkbox-error')).toBe(true);
		});
	});

	/** Die Größen-Klasse darf durch den Zustands-Zweig nicht verloren gehen. */
	describe('Größen', () => {
		it('behält die Größen-Klasse neben dem Fehler-Zustand', async () => {
			const screen = render(BaseCheckbox, {
				label: 'Totfund',
				size: 'sm' as const,
				hasError: true
			});

			const box = checkboxOf(screen.container);
			expect(box.classList.contains('checkbox-sm')).toBe(true);
			expect(box.classList.contains('checkbox-error')).toBe(true);
		});
	});

	/**
	 * Anders als beim Radio sind `aria-invalid`/`aria-required` hier gültig:
	 * `role="checkbox"` unterstützt beide, `svelte-check` akzeptiert sie. Sie
	 * bleiben deshalb am Input — die Zustands-Klasse tritt daneben, nicht an
	 * ihre Stelle.
	 */
	describe('ARIA bleibt am Input', () => {
		it('setzt aria-invalid und behält daneben die Fehler-Optik', async () => {
			const screen = render(BaseCheckbox, {
				label: 'Totfund',
				hasError: true,
				'aria-invalid': true
			});

			const box = checkboxOf(screen.container);
			expect(box.getAttribute('aria-invalid')).toBe('true');
			expect(box.classList.contains('checkbox-error')).toBe(true);
		});

		it('setzt aria-required', async () => {
			const screen = render(BaseCheckbox, {
				label: 'Totfund',
				required: true,
				'aria-required': true
			});

			expect(checkboxOf(screen.container).getAttribute('aria-required')).toBe('true');
		});
	});

	describe('Beschriftung', () => {
		it('zeigt das Label', async () => {
			render(BaseCheckbox, { label: 'Totfund bestätigt' });

			await expect.element(page.getByText('Totfund bestätigt')).toBeVisible();
		});
	});
});
